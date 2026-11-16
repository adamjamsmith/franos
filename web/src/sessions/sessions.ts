import { and, asc, eq, like, sql } from "drizzle-orm";
import type { MeetingProvider, SoundFile } from "../calls/provider";
import { callSettingsFor, type DaySlots, isOpenSlot, openSlots } from "../calls/slots";
import { ukWhen } from "../calls/time";
import { type Db, type Session, type Tx, withSession } from "../db/context";
import { jobs, recordingSessions } from "../db/schema";
import { emailSettingsFor, sign, signatureOk } from "../email/render";
import { baseUrl, type Deliver } from "../email/send";
import { type CallSettings, siteFor } from "../site/config";
import { siteSession } from "../site/leads";
import { busyCallTimes, busySessions } from "./busy";
import { hostSessionEmail, type SessionEmailKind, sessionEmail } from "./emails";

/**
 * Recording sessions: a booked, recorded video call with someone who is not a lead. A franchisee giving a
 * testimonial, the franchisor being interviewed, or anything else worth recording for a brand.
 * Unlike a lead call, the whole recording is kept: video, sound, a sound file per person and the transcript.
 */
export const SESSION_KINDS = ["testimonial", "franchisor", "other"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
export const isSessionKind = (value: string): value is SessionKind => (SESSION_KINDS as readonly string[]).includes(value);
export const KIND_LABELS: Record<SessionKind, string> = { testimonial: "Testimonial", franchisor: "Franchisor interview", other: "Recording" };
/** How the session is described to the person booking it. */
export const KIND_SAYS: Record<SessionKind, string> = {
  testimonial: "a recorded conversation about your experience as a franchisee",
  franchisor: "a recorded interview about the franchise",
  other: "a recorded video session",
};

export type RecordingSession = typeof recordingSessions.$inferSelect;
export type Brand = { id: string; slug: string; name: string; site: unknown };
/** The person who runs the sessions and is told about bookings. */
export type Host = { name: string; email: string };
export type SessionDeps = { deliver: Deliver; provider: MeetingProvider; hosts: Host[] };

const HOUR = 3_600_000;
export const personName = (s: Pick<RecordingSession, "firstName" | "lastName">) => [s.firstName, s.lastName].filter(Boolean).join(" ");

/** When sessions are on offer. The days off set for the brand's calls count for sessions too. */
export function sessionSettingsFor(brand: Brand): CallSettings {
  const calls = callSettingsFor(siteFor(brand));
  return { ...calls, days: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "17:00", lengthMinutes: 60, gapMinutes: 30, windowDays: 21, noticeHours: 24 };
}

/** The permission a person ticks before booking. Saved word for word with the session. */
export function sessionConsentWording(brandName: string, contactEmail: string): string {
  return `I agree to this Zoom session being recorded (video, sound and a written transcript), and to ${brandName} and Franchise Right using the recording, my name and what I say in adverts and other marketing for the franchise, including paid adverts on social media. I can withdraw this at any time by emailing ${contactEmail}; adverts will be taken down, but that cannot undo what has already been seen.`;
}

// ---------- Links ----------

/** The code in a booking link. Without it the booking page does not open, so the link cannot be guessed from the brand name. */
export const bookingCode = (brandId: string, kind: SessionKind) => sign(`session-link|${brandId}|${kind}`);
export const bookingCodeOk = (brandId: string, kind: SessionKind, code: string) => signatureOk(`session-link|${brandId}|${kind}`, code);
export const bookingPath = (brand: Pick<Brand, "id" | "slug">, kind: SessionKind) => `/site/${brand.slug}/session/${kind}?k=${bookingCode(brand.id, kind)}`;
/** The page for one booked session: its details, and where the person moves or cancels it. Signed, so it needs no login. */
export const sessionPath = (slug: string, sessionId: string) => `/site/${slug}/session/booked/${sessionId}?s=${sign(`session|${sessionId}`)}`;
export const sessionLinkOk = (sessionId: string, signature: string) => signatureOk(`session|${sessionId}`, signature);

// ---------- Times ----------

/** Everything that blocks a session: every session and every lead call, in every brand. One person hosts them all. */
async function busyForSessions(tx: Tx, now: Date) {
  return [...(await busySessions(tx, now)), ...(await busyCallTimes(tx, now))];
}

/** The times on offer for a session. A session being moved does not block its own time. */
export async function sessionSlots(tx: Tx, brand: Brand, now: Date, movingId?: string): Promise<DaySlots[]> {
  const busy = (await busyForSessions(tx, now)).filter((b) => b.id !== movingId);
  return openSlots(sessionSettingsFor(brand), now, busy);
}

// ---------- Timed work ----------

const REMINDERS: { kind: "day" | "hour"; hoursBefore: number }[] = [
  { kind: "day", hoursBefore: 24 },
  { kind: "hour", hoursBefore: 1 },
];

async function scheduleJobs(tx: Tx, session: RecordingSession, now: Date) {
  const start = session.startsAt.getTime();
  const key = (name: string) => `session-${session.id}-${name}-${start}`;
  const startsAt = session.startsAt.toISOString();
  const rows = REMINDERS.map((r) => ({
    type: "session_reminder",
    runAt: new Date(start - r.hoursBefore * HOUR),
    payload: { sessionId: session.id, kind: r.kind as string, startsAt },
    dedupeKey: key(r.kind),
  })).filter((row) => row.runAt > now);
  rows.push({ type: "session_collect", runAt: new Date(session.endsAt.getTime() + 10 * 60_000), payload: { sessionId: session.id, kind: "collect", startsAt }, dedupeKey: key("collect") });
  await tx
    .insert(jobs)
    .values(rows.map((row) => ({ ...row, clientId: session.clientId })))
    .onConflictDoUpdate({
      target: [jobs.clientId, jobs.dedupeKey],
      set: { status: "pending", runAt: sql`excluded.run_at`, attempts: 0, lastError: null },
      setWhere: eq(jobs.status, "cancelled"),
    });
}

const cancelJobs = (tx: Tx, sessionId: string) =>
  tx
    .update(jobs)
    .set({ status: "cancelled" })
    .where(and(eq(jobs.status, "pending"), like(jobs.dedupeKey, `session-${sessionId}-%`)));

// ---------- Telling people ----------

async function tell(brand: Brand, deps: SessionDeps, session: RecordingSession, kind: SessionEmailKind, options: { host?: boolean } = {}) {
  const site = siteFor(brand);
  const settings = emailSettingsFor(brand.name, site);
  const input = {
    baseUrl: baseUrl(),
    slug: brand.slug,
    brandName: brand.name,
    site,
    footer: settings.footer,
    sessionId: session.id,
    kind: session.kind as SessionKind,
    firstName: session.firstName,
    personName: personName(session),
    when: ukWhen(session.startsAt),
    minutes: Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60_000),
    joinUrl: session.meetingUrl,
  };
  const from = { fromName: settings.fromName, fromAddress: settings.fromAddress };
  await deps.deliver({ ...sessionEmail(kind, input), ...from, to: session.email });
  if (options.host && (kind === "confirmation" || kind === "changed" || kind === "cancelled")) {
    const mail = hostSessionEmail(kind, input);
    for (const host of deps.hosts) await deps.deliver({ ...mail, ...from, to: host.email });
  }
}

const isSlotClash = (error: unknown): boolean => {
  const e = error as { code?: string; message?: string; cause?: unknown } | null;
  if (!e) return false;
  return e.code === "23505" || Boolean(e.message?.includes("recording_sessions_slot")) || (e.cause ? isSlotClash(e.cause) : false);
};

// ---------- Booking, moving, cancelling ----------

export type SessionInput = {
  kind: SessionKind;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Whether the permission box was ticked. Nothing is booked without it. */
  consent: boolean;
  /** The permission wording as it was shown on the page. */
  consentWording: string;
  startsAt: Date;
  now?: Date;
};
export type SessionResult =
  | { ok: true; sessionId: string }
  /** details: a name or email is missing or wrong. consent: the box was not ticked. time: not on offer. taken: someone just took it. */
  | { ok: false; reason: "details" | "consent" | "time" | "taken" };

const emailLooksRight = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Books a recording session from a booking link. Creates the meeting, set to record, and tells the person and the host. */
export async function bookSession(db: Db, brand: Brand, deps: SessionDeps, input: SessionInput): Promise<SessionResult> {
  const now = input.now ?? new Date();
  const firstName = input.firstName.trim();
  const email = input.email.trim().toLowerCase();
  if (!firstName || !emailLooksRight(email)) return { ok: false, reason: "details" };
  if (!input.consent || !input.consentWording.trim()) return { ok: false, reason: "consent" };
  try {
    const session = await withSession(db, siteSession(brand.id), async (tx) => {
      const settings = sessionSettingsFor(brand);
      if (!isOpenSlot(settings, now, await busyForSessions(tx, now), input.startsAt)) return "time" as const;
      const endsAt = new Date(input.startsAt.getTime() + settings.lengthMinutes * 60_000);
      const [created] = await tx
        .insert(recordingSessions)
        .values({
          clientId: brand.id,
          kind: input.kind,
          firstName,
          lastName: input.lastName.trim(),
          email,
          phone: input.phone.trim() || null,
          startsAt: input.startsAt,
          endsAt,
          consentWording: input.consentWording.trim(),
          consentAt: now,
        })
        .returning();
      const meeting = await deps.provider.create({
        topic: `${brand.name} ${KIND_LABELS[input.kind].toLowerCase()} with ${personName(created)}`,
        startsAt: input.startsAt,
        minutes: settings.lengthMinutes,
      });
      const [saved] = await tx
        .update(recordingSessions)
        .set({ meetingId: meeting.id, meetingUrl: meeting.joinUrl })
        .where(eq(recordingSessions.id, created.id))
        .returning();
      await scheduleJobs(tx, saved, now);
      return saved;
    });
    if (session === "time") return { ok: false, reason: "time" };
    await tell(brand, deps, session, "confirmation", { host: true });
    return { ok: true, sessionId: session.id };
  } catch (error) {
    if (isSlotClash(error)) return { ok: false, reason: "taken" };
    throw error;
  }
}

/** Moves a booked session to another time on offer. */
export async function moveSession(db: Db, session: Session, brand: Brand, deps: SessionDeps, input: { sessionId: string; startsAt: Date; now?: Date }): Promise<SessionResult> {
  const now = input.now ?? new Date();
  try {
    const result = await withSession(db, session, async (tx) => {
      const [current] = await tx.select().from(recordingSessions).where(eq(recordingSessions.id, input.sessionId));
      if (!current || current.status !== "booked" || current.startsAt <= now) return "time" as const;
      if (current.startsAt.getTime() === input.startsAt.getTime()) return { saved: current, moved: false };
      const busy = (await busyForSessions(tx, now)).filter((b) => b.id !== current.id);
      if (!isOpenSlot(sessionSettingsFor(brand), now, busy, input.startsAt)) return "time" as const;
      const endsAt = new Date(input.startsAt.getTime() + (current.endsAt.getTime() - current.startsAt.getTime()));
      const [saved] = await tx.update(recordingSessions).set({ startsAt: input.startsAt, endsAt }).where(eq(recordingSessions.id, current.id)).returning();
      await cancelJobs(tx, current.id);
      await scheduleJobs(tx, saved, now);
      if (saved.meetingId) await deps.provider.move(saved.meetingId, input.startsAt);
      return { saved, moved: true };
    });
    if (result === "time") return { ok: false, reason: "time" };
    if (result.moved) await tell(brand, deps, result.saved, "changed", { host: true });
    return { ok: true, sessionId: result.saved.id };
  } catch (error) {
    if (isSlotClash(error)) return { ok: false, reason: "taken" };
    throw error;
  }
}

/** Cancels a booked session, frees its time and stops its reminders. */
export async function cancelSession(db: Db, session: Session, brand: Brand, deps: SessionDeps, input: { sessionId: string; now?: Date }): Promise<boolean> {
  const now = input.now ?? new Date();
  const cancelled = await withSession(db, session, async (tx) => {
    const [current] = await tx.select().from(recordingSessions).where(eq(recordingSessions.id, input.sessionId));
    if (!current || current.status !== "booked") return null;
    const [done] = await tx.update(recordingSessions).set({ status: "cancelled", cancelledAt: now }).where(eq(recordingSessions.id, current.id)).returning();
    if (!done) return null;
    await cancelJobs(tx, current.id);
    if (current.meetingId) await deps.provider.cancel(current.meetingId);
    return done;
  });
  if (!cancelled) return false;
  await tell(brand, deps, cancelled, "cancelled", { host: true });
  return true;
}

/**
 * Deletes a session for good: its record here, and everything the video-call service recorded for it.
 * Used when the person withdraws their permission or asks. If the recording cannot be removed, nothing is deleted.
 */
export async function deleteSession(db: Db, session: Session, deps: SessionDeps, sessionId: string): Promise<boolean> {
  return withSession(db, session, async (tx) => {
    const [current] = await tx.select().from(recordingSessions).where(eq(recordingSessions.id, sessionId));
    if (!current) return false;
    await cancelJobs(tx, current.id);
    const gone = await tx.delete(recordingSessions).where(eq(recordingSessions.id, current.id)).returning({ id: recordingSessions.id });
    if (gone.length === 0) return false; // this role is not allowed to delete sessions
    if (current.meetingId) {
      if (current.status === "booked") await deps.provider.cancel(current.meetingId);
      else await deps.provider.dropRecording?.(current.meetingId);
    }
    return true;
  });
}

// ---------- Timed work handlers ----------

export async function sendSessionReminder(db: Db, brand: Brand, deps: SessionDeps, input: { sessionId: string; kind: string; startsAt: string }): Promise<boolean> {
  const session = await withSession(db, siteSession(brand.id), async (tx) => {
    const [row] = await tx.select().from(recordingSessions).where(eq(recordingSessions.id, input.sessionId));
    return row;
  });
  if (!session || session.status !== "booked" || session.startsAt.toISOString() !== input.startsAt) return false;
  if (input.kind !== "day" && input.kind !== "hour") return false;
  await tell(brand, deps, session, `reminder_${input.kind}`);
  return true;
}

/**
 * Asks the video-call service what happened on a session and saves it. The recording can take a while to be
 * ready, so this asks again every 15 minutes for 3 hours, then marks the session as needing a look.
 */
export async function collectSession(db: Db, brand: Brand, deps: SessionDeps, sessionId: string, now: Date = new Date()): Promise<boolean> {
  const site = siteSession(brand.id);
  const session = await withSession(db, site, async (tx) => {
    const [row] = await tx.select().from(recordingSessions).where(eq(recordingSessions.id, sessionId));
    return row;
  });
  if (!session || session.status !== "booked" || !session.meetingId) return false;
  const save = (values: Partial<RecordingSession>) => withSession(db, site, (tx) => tx.update(recordingSessions).set(values).where(eq(recordingSessions.id, session.id)));

  const report = await deps.provider.report(session.meetingId);
  if (report && !report.attended) {
    await save({ status: "no_show" });
    return true;
  }
  const found = report ? { durationMinutes: report.minutes, recordingUrl: report.recordingUrl, transcript: report.transcript, soundFiles: (report.soundFiles ?? []) as SoundFile[] } : null;
  if (found && found.recordingUrl && found.transcript) {
    await save({ status: "happened", ...found });
    return true;
  }
  if (deps.provider.waitsForCalls && now.getTime() < session.endsAt.getTime() + 3 * HOUR) {
    await withSession(db, site, (tx) =>
      tx.insert(jobs).values({
        clientId: brand.id,
        type: "session_collect",
        runAt: new Date(now.getTime() + 15 * 60_000),
        payload: { sessionId, kind: "collect", startsAt: session.startsAt.toISOString() },
        dedupeKey: `session-${sessionId}-collect-again-${now.getTime()}`,
      }),
    );
    return false;
  }
  // It happened, but the recording never arrived in full. Someone should look.
  if (found) {
    await save({ status: "needs_look", ...found });
    return true;
  }
  if (deps.provider.waitsForCalls) await save({ status: "needs_look" });
  return false;
}

/** The sessions of the brand in view, soonest first. */
export const listSessions = (tx: Tx) => tx.select().from(recordingSessions).orderBy(asc(recordingSessions.startsAt)).limit(1000);
