import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import ical from "node-ical";
import type { Db } from "../db/context";
import { userCalendars } from "../db/schema";

/**
 * A person's own calendar, linked by its private read-only address (Google, Outlook and Apple all have one).
 * franOS reads it every few minutes and keeps only the busy times: never what an appointment is or who it is with.
 * The address works like a password, so it is stored sealed and never shown again.
 */

export type BusyTime = { startsAt: Date; endsAt: Date };
export type Fetcher = (address: string) => Promise<string>;

const DAY = 86_400_000;
/** How far ahead busy times are kept: longer than any booking page looks. */
const AHEAD_DAYS = 100;
/** A calendar is read again once its last reading is this old. */
export const REFRESH_MINUTES = 10;

// ---------- Sealing the address ----------

const key = () => createHash("sha256").update(`calendar|${process.env.BETTER_AUTH_SECRET ?? "franos-local"}`).digest();

export function seal(address: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(address, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url")).join(".");
}

export function unseal(sealed: string): string | null {
  try {
    const [iv, tag, body] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------- Reading a calendar ----------

/** Tidies a pasted address. Only a secure web address on a named site is accepted: never this server or a bare number. */
export function calendarAddress(pasted: string): string | null {
  const text = pasted.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const named = host.includes(".") && !/^[\d.]+$/.test(host) && !host.includes(":") && !host.endsWith(".local") && !host.endsWith(".internal");
  return url.protocol === "https:" && named && host !== "localhost" ? url.toString() : null;
}

/** Fetches the calendar file. Gives up after 15 seconds or 5 MB. */
export const fetchCalendar: Fetcher = async (address) => {
  const response = await fetch(address, { signal: AbortSignal.timeout(15_000), headers: { accept: "text/calendar, text/plain" }, cache: "no-store" });
  if (!response.ok) throw new Error(`The calendar answered ${response.status}`);
  const text = await response.text();
  if (text.length > 5_000_000) throw new Error("The calendar is too big to read");
  return text;
};

const marksFree = (event: Record<string, unknown>) =>
  String(event.transparency ?? "").toUpperCase() === "TRANSPARENT" ||
  Object.entries(event).some(([name, value]) => /busystatus/i.test(name) && String(value).toUpperCase() === "FREE");

/**
 * The busy times in a calendar file between two dates. Repeating appointments are laid out one by one.
 * Anything marked "free" or cancelled is left out. Returns null when the text is not a calendar at all.
 */
export function busyFromCalendar(text: string, from: Date, to: Date): BusyTime[] | null {
  if (!/BEGIN:VCALENDAR/i.test(text)) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = ical.sync.parseICS(text) as Record<string, unknown>;
  } catch {
    return null;
  }
  const busy: BusyTime[] = [];
  for (const item of Object.values(parsed)) {
    const event = item as Record<string, unknown> & { type?: string; status?: string };
    if (event.type !== "VEVENT" || String(event.status ?? "").toUpperCase() === "CANCELLED" || marksFree(event)) continue;
    try {
      for (const instance of ical.expandRecurringEvent(event as never, { from, to, expandOngoing: true })) {
        const startsAt = new Date(instance.start);
        const endsAt = new Date(instance.end ?? instance.start);
        if (endsAt > startsAt && endsAt > from && startsAt < to) busy.push({ startsAt, endsAt });
      }
    } catch {
      // One appointment that cannot be read does not stop the rest.
    }
  }
  busy.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  // Overlapping and back-to-back times become one, which keeps the list short.
  const merged: BusyTime[] = [];
  for (const time of busy) {
    const last = merged[merged.length - 1];
    if (last && time.startsAt <= last.endsAt) last.endsAt = new Date(Math.max(last.endsAt.getTime(), time.endsAt.getTime()));
    else merged.push({ ...time });
  }
  return merged.slice(0, 3000);
}

const stored = (busy: BusyTime[]) => busy.map((b) => ({ s: b.startsAt.toISOString(), e: b.endsAt.toISOString() }));
const window = (now: Date) => [new Date(now.getTime() - DAY), new Date(now.getTime() + AHEAD_DAYS * DAY)] as const;

// ---------- Linking, unlinking, keeping up to date ----------

export type LinkResult = { ok: true; busy: number } | { ok: false; reason: "address" | "fetch" | "calendar" };

/** Links a person's calendar. The address is read straight away, so a wrong one is refused and nothing is saved. */
export async function linkCalendar(admin: Db, userId: string, pasted: string, now: Date = new Date(), fetcher: Fetcher = fetchCalendar): Promise<LinkResult> {
  const address = calendarAddress(pasted);
  if (!address) return { ok: false, reason: "address" };
  let text: string;
  try {
    text = await fetcher(address);
  } catch {
    return { ok: false, reason: "fetch" };
  }
  const busy = busyFromCalendar(text, ...window(now));
  if (!busy) return { ok: false, reason: "calendar" };
  const values = { feed: seal(address), busy: stored(busy), checkedAt: now, lastError: null };
  await admin.insert(userCalendars).values({ userId, ...values }).onConflictDoUpdate({ target: userCalendars.userId, set: values });
  return { ok: true, busy: busy.length };
}

export async function unlinkCalendar(admin: Db, userId: string) {
  await admin.delete(userCalendars).where(eq(userCalendars.userId, userId));
}

/**
 * Reads again every linked calendar whose last reading is old. Run with the minute's timed work.
 * A calendar that cannot be read keeps its last known busy times, and the reason is kept for its owner to see.
 */
export async function refreshCalendars(admin: Db, now: Date = new Date(), fetcher: Fetcher = fetchCalendar): Promise<number> {
  const due = (await admin.select().from(userCalendars)).filter((c) => now.getTime() - c.checkedAt.getTime() >= REFRESH_MINUTES * 60_000);
  for (const calendar of due) {
    let update: { busy?: { s: string; e: string }[]; lastError: string | null };
    try {
      const address = unseal(calendar.feed);
      if (!address) throw new Error("The saved address can no longer be opened. Please link the calendar again.");
      const busy = busyFromCalendar(await fetcher(address), ...window(now));
      if (!busy) throw new Error("The address no longer leads to a calendar.");
      update = { busy: stored(busy), lastError: null };
    } catch (error) {
      update = { lastError: error instanceof Error ? error.message.slice(0, 200) : "The calendar could not be read." };
    }
    await admin.update(userCalendars).set({ ...update, checkedAt: now }).where(eq(userCalendars.userId, calendar.userId));
  }
  return due.length;
}

export type CalendarState = { linked: boolean; checkedAt?: Date; problem?: string; busy?: number };

/** Whether each of these people has a calendar linked. Never the address, never the appointments. */
export async function calendarStates(admin: Db, userIds: string[]): Promise<Map<string, CalendarState>> {
  const rows = userIds.length ? await admin.select().from(userCalendars).where(inArray(userCalendars.userId, userIds)) : [];
  return new Map(
    rows.map((row) => [row.userId, { linked: true, checkedAt: row.checkedAt, problem: row.lastError ?? undefined, busy: (row.busy as unknown[]).length }]),
  );
}
