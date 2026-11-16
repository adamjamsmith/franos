import { and, asc, eq, like, sql } from "drizzle-orm";
import type { MeetingProvider, SoundFile } from "../calls/provider";
import { callSettingsFor, type DaySlots, isOpenSlot, openSlots } from "../calls/slots";
import { toClock, ukMinutes, ukWhen } from "../calls/time";
import { type Db, type Session, type Tx, withSession } from "../db/context";
import { jobs, recordingSessions } from "../db/schema";
import { emailSettingsFor, sign, signatureOk, ukDay } from "../email/render";
import { baseUrl, type Deliver } from "../email/send";
import { type CallSettings, type SessionHours, siteFor } from "../site/config";
import { siteSession } from "../site/leads";
import { busyCallTimes, busySessions } from "./busy";
import { hostSessionEmail, type SessionEmailKind, sessionEmail } from "./emails";

/**
 * Recording sessions: a booked, recorded video call with someone who is not a lead. A franchisee giving a
 * testimonial, the franchisor being interviewed, or anything else worth recording for a brand.
 * Unlike a lead call, the whole recording is kept: video, sound, a sound file per person and the transcript.
 */
export const SESSION_KINDS = ["testimonial", "franchisor", "other", "meeting"] as const;
/** The kinds someone can book for themselves from a link. A meeting is only ever set up by the owner. */
export const BOOKABLE_KINDS = ["testimonial", "franchisor", "other"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
export const isSessionKind = (value: string): value is SessionKind => (SESSION_KINDS as readonly string[]).includes(value);
export const isBookableKind = (value: string): value is (typeof BOOKABLE_KINDS)[number] => (BOOKABLE_KINDS as readonly string[]).includes(value);
export const KIND_LABELS: Record<SessionKind, string> = { testimonial: "Testimonial", franchisor: "Franchisor interview", other: "Recording", meeting: "Meeting" };
/** How the session is described to the person booking it. */
export const KIND_SAYS: Record<SessionKind, string> = {
  testimonial: "a recorded conversation about your experience as a franchisee",
  franchisor: "a recorded interview about the franchise",
  other: "a recorded video session",
  meeting: "a recorded working meeting",
};

export type RecordingSession = typeof recordingSessions.$inferSelect;
export type Brand = { id: string; slug: string; name: string; site: unknown };
/** The person who runs the sessions and is told about bookings. */
export type Host = { name: string; email: string };
export type SessionDeps = { deliver: Deliver; provider: MeetingProvider; hosts: Host[] };

const HOUR = 3_600_000;
export const personName = (s: Pick<RecordingSession, "firstName" | "lastName">) => [s.firstName, s.lastName].filter(Boolean).join(" ");

type LinkKind = "testimonial" | "franchisor" | "other";
const WIDE_OPEN: SessionHours = { days: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "20:00", lengthMinutes: 60, gapMinutes: 0, windowDays: 60, noticeHours: 0 };
/**
 * The standard hours for each booking link. A testimonial keeps to working hours with a day's notice.
 * A franchisor interview or a general recording is wide open: any day, early to late, no notice.
 */
export const SESSION_HOURS: Record<LinkKind, SessionHours> = {
  testimonial: { days: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "17:00", lengthMinutes: 60, gapMinutes: 30, windowDays: 21, noticeHours: 24 },
  franchisor: WIDE_OPEN,
  other: WIDE_OPEN,
};

/**
 * When one booking link offers sessions: the owner's own settings for that link, over its standard hours.
 * The days off set for the brand's calls count for sessions too. A meeting has no link, so it moves by the general recording's hours.
 */
export function sessionSettingsFor(brand: Brand, kind: string = "testimonial"): CallSettings {
  const site = siteFor(brand);
  const link: LinkKind = kind === "testimonial" || kind === "franchisor" ? kind : "other";
  return { ...callSettingsFor(site), ...SESSION_HOURS[link], ...(site.sessions?.[link] ?? {}) };
}

/** The permission a person ticks before booking. Saved word for word with the session. */
export function sessionConsentWording(brandName: string, contactEmail: string): string {
  return `I agree to this Zoom session being recorded (video, sound and a written transcript), and to ${brandName} and Franchise Right using the recording, my name and what I say in adverts and other marketing for the franchise, including paid adverts on social media. I can withdraw this at any time by emailing ${contactEmail}; adverts will be taken down, but that cannot undo what has already been seen.`;
}

/** What is saved in place of the permission when the owner books a session for someone. They tick the box on their own page. */
export const PERMISSION_PENDING = "Not given yet. Booked by the owner.";
/** A working meeting is recorded for notes only and never used in marketing, so there is no permission box to tick. */
export const PERMISSION_NOT_NEEDED = "Not needed. A working meeting, recorded for notes only.";
export const hasPermission = (s: Pick<RecordingSession, "consentWording">) => s.consentWording !== PERMISSION_PENDING;

/** Reads a date and time typed in as UK time ("2026-11-16T16:00"). */
export function ukLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  // The UK is either on UTC or an hour ahead of it. Keep whichever reads back as the time typed.
  for (const candidate of [new Date(guess), new Date(guess - HOUR)]) {
    if (`${ukDay(candidate)}T${toClock(ukMinutes(candidate))}` === value) return candidate;
  }
  return null;
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
export async function sessionSlots(tx: Tx, brand: Brand, now: Date, kind: string, movingId?: string): Promise<DaySlots[]> {
  const busy = (await busyForSessions(tx, now)).filter((b) => b.id !== movingId);
  return openSlots(sessionSettingsFor(brand, kind), now, busy);
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
    agreed: hasPermission(session),
    notesOnly: session.consentWording === PERMISSION_NOT_NEEDED,
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
  phone?: string;
  /** The franchise location they run. A testimonial is not booked without it. */
  location?: string;
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
  const location = (input.location ?? "").trim();
  if (!firstName || !emailLooksRight(email)) return { ok: false, reason: "details" };
  if (input.kind === "testimonial" && !location) return { ok: false, reason: "details" };
  if (!input.consent || !input.consentWording.trim()) return { ok: false, reason: "consent" };
  try {
    const session = await withSession(db, siteSession(brand.id), async (tx) => {
      const settings = sessionSettingsFor(brand, input.kind);
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
          phone: (input.phone ?? "").trim() || null,
          location: location || null,
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

/**
 * The owner books a session for someone, at any time they like: today, out of hours, at short notice.
 * Only a clash with another session or a lead call is refused. The person is emailed the invitation and
 * ticks the permission box on their own page.
 */
export async function addSession(
  db: Db,
  session: Session,
  brand: Brand,
  deps: SessionDeps,
  input: { kind: SessionKind; firstName: string; lastName: string; email: string; startsAt: Date; minutes?: number; /** Left out, a meeting keeps the transcript only and everything else keeps its video. */ keepVideo?: boolean; now?: Date },
): Promise<SessionResult> {
  const now = input.now ?? new Date();
  const firstName = input.firstName.trim();
  const email = input.email.trim().toLowerCase();
  if (!firstName || !emailLooksRight(email)) return { ok: false, reason: "details" };
  const minutes = Math.min(240, Math.max(15, input.minutes ?? sessionSettingsFor(brand, input.kind).lengthMinutes));
  const endsAt = new Date(input.startsAt.getTime() + minutes * 60_000);
  if (endsAt <= now) return { ok: false, reason: "time" };
  try {
    const saved = await withSession(db, session, async (tx) => {
      const busy = await busyForSessions(tx, now);
      if (busy.some((b) => input.startsAt < b.endsAt && endsAt > b.startsAt)) return "taken" as const;
      const [created] = await tx
        .insert(recordingSessions)
        .values({
          clientId: brand.id,
          kind: input.kind,
          firstName,
          lastName: input.lastName.trim(),
          email,
          startsAt: input.startsAt,
          endsAt,
          consentWording: input.kind === "meeting" ? PERMISSION_NOT_NEEDED : PERMISSION_PENDING,
          consentAt: now,
          keepVideo: input.keepVideo ?? input.kind !== "meeting",
        })
        .returning();
      const meeting = await deps.provider.create({
        topic: `${brand.name} ${KIND_LABELS[input.kind].toLowerCase()} with ${personName(created)}`,
        startsAt: input.startsAt,
        minutes,
      });
      const [row] = await tx.update(recordingSessions).set({ meetingId: meeting.id, meetingUrl: meeting.joinUrl }).where(eq(recordingSessions.id, created.id)).returning();
      await scheduleJobs(tx, row, now);
      return row;
    });
    if (saved === "taken") return { ok: false, reason: "taken" };
    await tell(brand, deps, saved, "confirmation");
    return { ok: true, sessionId: saved.id };
  } catch (error) {
    if (isSlotClash(error)) return { ok: false, reason: "taken" };
    throw error;
  }
}

/** The person ticks the permission box on their own page, for a session the owner booked for them. */
export async function givePermission(db: Db, brand: Brand, input: { sessionId: string; wording: string; now?: Date }): Promise<boolean> {
  const done = await withSession(db, siteSession(brand.id), (tx) =>
    tx
      .update(recordingSessions)
      .set({ consentWording: input.wording.trim(), consentAt: input.now ?? new Date() })
      .where(and(eq(recordingSessions.id, input.sessionId), eq(recordingSessions.consentWording, PERMISSION_PENDING)))
      .returning({ id: recordingSessions.id }),
  );
  return done.length > 0;
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
      if (!isOpenSlot(sessionSettingsFor(brand, current.kind), now, busy, input.startsAt)) return "time" as const;
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
    // Transcript only: now that the transcript is saved, the video goes. A failure leaves the video where it is.
    if (!session.keepVideo) {
      try {
        await deps.provider.dropVideo?.(session.meetingId);
      } catch (error) {
        console.error("Could not remove a session video from the video-call service", error);
      }
    }
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
