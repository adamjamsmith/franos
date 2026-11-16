import { and, asc, eq, gt, gte, inArray, like, ne, sql } from "drizzle-orm";
import { type Db, type Session, type Tx, withSession } from "../db/context";
import { calls, jobs, leadEvents, leads, metaEvents } from "../db/schema";
import { emailSettingsFor } from "../email/render";
import { baseUrl, type Deliver } from "../email/send";
import { siteFor } from "../site/config";
import { siteSession } from "../site/leads";
import { busySessions } from "../sessions/busy";
import { type CallEmailKind, leadCallEmail, outcomeReminderEmail, type ReminderKind, REMINDERS, staffCallEmail, type StaffEmailKind } from "./emails";
import type { CallReport, MeetingProvider } from "./provider";
import { callSettingsFor, type DaySlots, isOpenSlot, openSlots } from "./slots";
import { ukWhen } from "./time";

/** Someone at the brand who is told about bookings: the consultant. */
export type Staff = { name: string; email: string };
/** The outside world a call touches: where emails go, the video-call service, and who to tell. */
export type CallDeps = { deliver: Deliver; provider: MeetingProvider; staff: Staff[] };
export type Brand = { id: string; slug: string; name: string; site: unknown };
export type Call = typeof calls.$inferSelect;
type Lead = typeof leads.$inferSelect;

const HOUR = 3_600_000;
const fullName = (lead: Lead) => [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;

// ---------- Reading ----------

/** Calls that block times: anything not cancelled, from yesterday onwards. */
async function busyCalls(tx: Tx, now: Date) {
  const booked = await tx
    .select({ id: calls.id, startsAt: calls.startsAt, endsAt: calls.endsAt })
    .from(calls)
    .where(and(ne(calls.status, "cancelled"), gte(calls.endsAt, new Date(now.getTime() - 24 * HOUR))));
  // A recording session in any brand blocks the time as well: the same person hosts it.
  return [...booked, ...(await busySessions(tx, now))];
}

/** The lead's booked call that has not finished yet, if they have one. */
export async function upcomingCall(tx: Tx, leadId: string, now: Date): Promise<Call | null> {
  const [call] = await tx
    .select()
    .from(calls)
    .where(and(eq(calls.leadId, leadId), eq(calls.status, "booked"), gt(calls.endsAt, now)))
    .orderBy(asc(calls.startsAt))
    .limit(1);
  return call ?? null;
}

/** The times on offer right now. A lead's own booked call does not block them, so they can move it. */
export async function slotsOnOffer(tx: Tx, brand: Brand, now: Date, forLeadId?: string): Promise<DaySlots[]> {
  const mine = forLeadId ? await upcomingCall(tx, forLeadId, now) : null;
  const busy = (await busyCalls(tx, now)).filter((b) => b.id !== mine?.id);
  return openSlots(callSettingsFor(siteFor(brand)), now, busy);
}

// ---------- Timed work for a call ----------

async function scheduleCallJobs(tx: Tx, call: Call, now: Date) {
  const start = call.startsAt.getTime();
  const key = (name: string) => `call-${call.id}-${name}-${start}`;
  const startsAt = call.startsAt.toISOString();
  const rows = REMINDERS.map((r) => ({
    type: "call_reminder",
    runAt: new Date(start - r.hoursBefore * HOUR),
    payload: { callId: call.id, kind: r.kind as string, startsAt },
    dedupeKey: key(r.kind),
  })).filter((row) => row.runAt > now); // a reminder whose time has already gone is not sent late
  // After the call, ask the video-call service what happened.
  rows.push({ type: "call_collect", runAt: new Date(call.endsAt.getTime() + 10 * 60_000), payload: { callId: call.id, kind: "collect", startsAt }, dedupeKey: key("collect") });
  await tx
    .insert(jobs)
    .values(rows.map((row) => ({ ...row, clientId: call.clientId })))
    .onConflictDoUpdate({
      target: [jobs.clientId, jobs.dedupeKey],
      set: { status: "pending", runAt: sql`excluded.run_at`, attempts: 0, lastError: null },
      // Only wakes a job that was cancelled (the call moved away and back). One that has run stays done.
      setWhere: eq(jobs.status, "cancelled"),
    });
}

async function cancelCallJobs(tx: Tx, callId: string) {
  await tx
    .update(jobs)
    .set({ status: "cancelled" })
    .where(and(eq(jobs.status, "pending"), like(jobs.dedupeKey, `call-${callId}-%`)));
}

// ---------- Telling people ----------

async function tell(
  tx: Tx,
  brand: Brand,
  deps: CallDeps,
  call: Call,
  lead: Lead,
  kinds: { lead?: CallEmailKind; staff?: StaffEmailKind },
  now: Date,
  /** The time to quote, when it is not the call's current time (a cancelled or missed call). */
  when: Date = call.startsAt,
) {
  const site = siteFor(brand);
  const settings = emailSettingsFor(brand.name, site);
  // Which version of the email: someone who has read the prospectus is pointed past it.
  const opened = await tx
    .select({ data: leadEvents.data })
    .from(leadEvents)
    .where(and(eq(leadEvents.leadId, lead.id), inArray(leadEvents.type, ["document_open", "document_download"])));
  const readProspectus = opened.some((e) => (e.data as { kind?: string }).kind === "prospectus");
  const input = {
    baseUrl: baseUrl(),
    slug: brand.slug,
    brandName: brand.name,
    site,
    footer: settings.footer,
    callId: call.id,
    leadId: lead.id,
    firstName: lead.firstName,
    leadName: fullName(lead),
    when: ukWhen(when),
    minutes: Math.round((call.endsAt.getTime() - call.startsAt.getTime()) / 60_000),
    joinUrl: call.meetingUrl,
    readProspectus,
  };
  const from = { fromName: settings.fromName, fromAddress: settings.fromAddress };
  // An address that bounced, or whose owner pressed "spam", gets nothing, not even emails about their own call.
  if (kinds.lead && !lead.emailBlockedAt) {
    const mail = leadCallEmail(kinds.lead, input);
    await deps.deliver({ ...mail, ...from, to: lead.email });
    await tx.insert(leadEvents).values({
      clientId: brand.id,
      leadId: lead.id,
      type: "call_email",
      data: { kind: kinds.lead, subject: mail.subject, callId: call.id },
      occurredAt: now,
    });
  }
  if (kinds.staff) {
    const mail = staffCallEmail(kinds.staff, input);
    for (const person of deps.staff) await deps.deliver({ ...mail, ...from, to: person.email });
  }
}

const isSlotClash = (error: unknown): boolean => {
  const e = error as { code?: string; message?: string; cause?: unknown } | null;
  if (!e) return false;
  return e.code === "23505" || Boolean(e.message?.includes("calls_slot")) || (e.cause ? isSlotClash(e.cause) : false);
};

// ---------- Booking, moving, cancelling ----------

export type BookResult =
  | { ok: true; callId: string; moved: boolean }
  /** lead: not a lead of this brand. time: not a time on offer. taken: someone else just took it. */
  | { ok: false; reason: "lead" | "time" | "taken" };

async function moveCall(tx: Tx, brand: Brand, deps: CallDeps, call: Call, lead: Lead, startsAt: Date, by: "lead" | "staff", now: Date) {
  const endsAt = new Date(startsAt.getTime() + (call.endsAt.getTime() - call.startsAt.getTime()));
  const [moved] = await tx.update(calls).set({ startsAt, endsAt }).where(eq(calls.id, call.id)).returning();
  await cancelCallJobs(tx, call.id);
  await scheduleCallJobs(tx, moved, now);
  if (moved.meetingId) await deps.provider.move(moved.meetingId, startsAt);
  await tx.insert(leadEvents).values({
    clientId: brand.id,
    leadId: lead.id,
    type: "call_rescheduled",
    data: { callId: call.id, from: call.startsAt.toISOString(), startsAt: startsAt.toISOString(), by },
    occurredAt: now,
  });
  await tell(tx, brand, deps, moved, lead, { lead: "changed", staff: "changed" }, now);
}

/**
 * Books a call for a lead at one of the times on offer.
 * A lead has one booked call at a time: picking a new time while one is booked moves it.
 * The first booking records the Schedule event for Meta. Later ones do not.
 */
export async function bookCall(
  db: Db,
  session: Session,
  brand: Brand,
  deps: CallDeps,
  input: {
    leadId: string;
    startsAt: Date;
    by: "lead" | "staff";
    now?: Date;
    /** The lead's own browser and address, when they booked on the public page. Passed to Meta with the Schedule event. */
    client?: { userAgent?: string; ip?: string; fbp?: string };
  },
): Promise<BookResult> {
  const now = input.now ?? new Date();
  try {
    return await withSession(db, session, async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, input.leadId));
      if (!lead) return { ok: false as const, reason: "lead" as const };

      const settings = callSettingsFor(siteFor(brand));
      const current = await upcomingCall(tx, lead.id, now);
      if (current && current.startsAt.getTime() === input.startsAt.getTime()) {
        return { ok: true as const, callId: current.id, moved: false };
      }
      const busy = (await busyCalls(tx, now)).filter((b) => b.id !== current?.id);
      if (!isOpenSlot(settings, now, busy, input.startsAt)) return { ok: false as const, reason: "time" as const };

      if (current) {
        if (current.startsAt <= now) return { ok: false as const, reason: "time" as const };
        await moveCall(tx, brand, deps, current, lead, input.startsAt, input.by, now);
        return { ok: true as const, callId: current.id, moved: true };
      }

      const endsAt = new Date(input.startsAt.getTime() + settings.lengthMinutes * 60_000);
      const [created] = await tx
        .insert(calls)
        .values({ clientId: brand.id, leadId: lead.id, startsAt: input.startsAt, endsAt, bookedBy: input.by })
        .onConflictDoNothing()
        .returning();
      if (!created) return { ok: false as const, reason: "taken" as const };

      const meeting = await deps.provider.create({
        topic: `${brand.name} call with ${fullName(lead)}`,
        startsAt: input.startsAt,
        minutes: settings.lengthMinutes,
      });
      const [call] = await tx
        .update(calls)
        .set({ meetingId: meeting.id, meetingUrl: meeting.joinUrl })
        .where(eq(calls.id, created.id))
        .returning();

      await tx.insert(leadEvents).values({
        clientId: brand.id,
        leadId: lead.id,
        type: "call_booked",
        data: { callId: call.id, startsAt: call.startsAt.toISOString(), by: input.by },
        occurredAt: now,
      });
      // One Schedule event per lead, however many calls they book.
      await tx
        .insert(metaEvents)
        .values({
          clientId: brand.id,
          leadId: lead.id,
          eventName: "Schedule",
          eventId: `schedule-${lead.id}`,
          payload: {
            callId: call.id,
            startsAt: call.startsAt.toISOString(),
            fitScore: lead.fitScore,
            // Only the lead's own browser counts. A call booked by staff is never passed off as a website visit.
            ...(input.by === "lead" && input.client?.userAgent ? { userAgent: input.client.userAgent.slice(0, 400) } : {}),
            ...(input.by === "lead" && input.client?.userAgent && input.client.ip ? { ip: input.client.ip.slice(0, 60) } : {}),
            ...(input.by === "lead" && input.client?.fbp ? { fbp: input.client.fbp.slice(0, 100) } : {}),
          },
        })
        .onConflictDoNothing({ target: [metaEvents.clientId, metaEvents.eventId] });
      await scheduleCallJobs(tx, call, now);
      await tell(tx, brand, deps, call, lead, { lead: "confirmation", staff: "booked" }, now);
      return { ok: true as const, callId: call.id, moved: false };
    });
  } catch (error) {
    // Two people pressed the same time at the same moment. The database let only one through.
    if (isSlotClash(error)) return { ok: false, reason: "taken" };
    throw error;
  }
}

/** Cancels a booked call, frees its time and stops its reminders. */
export async function cancelCall(
  db: Db,
  session: Session,
  brand: Brand,
  deps: CallDeps,
  input: { callId: string; by: "lead" | "staff"; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  return withSession(db, session, async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, input.callId));
    if (!call || call.status !== "booked") return false;
    const [lead] = await tx.select().from(leads).where(eq(leads.id, call.leadId));
    const [done] = await tx
      .update(calls)
      .set({ status: "cancelled", cancelledAt: now })
      .where(eq(calls.id, call.id))
      .returning({ id: calls.id });
    if (!done) return false; // this role is not allowed to change calls
    await cancelCallJobs(tx, call.id);
    if (call.meetingId) await deps.provider.cancel(call.meetingId);
    await tx.insert(leadEvents).values({
      clientId: brand.id,
      leadId: lead.id,
      type: "call_cancelled",
      data: { callId: call.id, startsAt: call.startsAt.toISOString(), by: input.by },
      occurredAt: now,
    });
    await tell(tx, brand, deps, call, lead, { lead: "cancelled", staff: "cancelled" }, now);
    return true;
  });
}

// ---------- After the call ----------

/**
 * Records what happened on a call: whether the lead showed, how long it ran, the recording and transcript.
 * Used when the video-call service reports in, and when the consultant sets or corrects it by hand.
 * A no-show gets the "pick another time" email, once.
 */
export async function finishCall(
  db: Db,
  session: Session,
  brand: Brand,
  deps: CallDeps,
  input: { callId: string; report: CallReport; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  return withSession(db, session, async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, input.callId));
    if (!call || call.status === "cancelled") return false;
    const [lead] = await tx.select().from(leads).where(eq(leads.id, call.leadId));
    const status = input.report.attended ? "attended" : "no_show";
    const [done] = await tx
      .update(calls)
      .set({
        status,
        durationMinutes: input.report.attended ? input.report.minutes : null,
        recordingUrl: input.report.recordingUrl ?? call.recordingUrl,
        transcript: input.report.transcript ?? call.transcript,
      })
      .where(eq(calls.id, call.id))
      .returning({ id: calls.id });
    if (!done) return false; // this role is not allowed to change calls
    await cancelCallJobs(tx, call.id);
    if (status === call.status) return true;

    const event = (type: string, data: Record<string, unknown> = {}) =>
      tx.insert(leadEvents).values({ clientId: brand.id, leadId: lead.id, type, data: { callId: call.id, ...data }, occurredAt: now });
    if (status === "attended") {
      // An hour from now, nudge the consultant if "How did it go?" is still unanswered.
      if (!call.outcome) {
        await tx
          .insert(jobs)
          .values({
            clientId: brand.id,
            type: "outcome_reminder",
            runAt: new Date(now.getTime() + HOUR),
            payload: { callId: call.id },
            dedupeKey: `outcome-${call.id}`,
          })
          .onConflictDoNothing({ target: [jobs.clientId, jobs.dedupeKey] });
      }
      if (call.status === "no_show") await event("call_no_show_undone");
      await event("call_attended", { minutes: input.report.minutes, transcript: Boolean(input.report.transcript ?? call.transcript) });
    } else {
      await event("call_no_show");
      const earlier = await tx
        .select({ data: leadEvents.data })
        .from(leadEvents)
        .where(and(eq(leadEvents.leadId, lead.id), eq(leadEvents.type, "call_email")));
      const alreadyTold = earlier.some((e) => {
        const data = e.data as Record<string, unknown>;
        return data.kind === "missed" && data.callId === call.id;
      });
      if (!alreadyTold) await tell(tx, brand, deps, call, lead, { lead: "missed" }, now);
    }
    return true;
  });
}

// ---------- Timed work handlers ----------

/** Sends a reminder, unless the call has since been moved or cancelled. */
export async function sendReminder(
  db: Db,
  brand: Brand,
  deps: CallDeps,
  input: { callId: string; kind: string; startsAt: string },
  now: Date = new Date(),
): Promise<boolean> {
  return withSession(db, siteSession(brand.id), async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, input.callId));
    if (!call || call.status !== "booked" || call.startsAt.toISOString() !== input.startsAt) return false;
    const [lead] = await tx.select().from(leads).where(eq(leads.id, call.leadId));
    const reminder = REMINDERS.find((r) => r.kind === input.kind);
    if (!reminder) return false;
    await tell(tx, brand, deps, call, lead, { lead: `reminder_${reminder.kind as ReminderKind}` }, now);
    return true;
  });
}

/** Asks the video-call service what happened on a call, and records it if there is an answer. */
export async function collectCall(db: Db, brand: Brand, deps: CallDeps, callId: string, now: Date = new Date()): Promise<boolean> {
  const call = await withSession(db, siteSession(brand.id), async (tx) => {
    const [row] = await tx.select().from(calls).where(eq(calls.id, callId));
    return row;
  });
  if (!call || call.status !== "booked" || !call.meetingId) return false;
  const report = await deps.provider.report(call.meetingId);
  if (!report) {
    if (deps.provider.waitsForCalls && now.getTime() < call.endsAt.getTime() + 3 * HOUR) {
      await withSession(db, siteSession(brand.id), (tx) =>
        tx.insert(jobs).values({
          clientId: brand.id,
          type: "call_collect",
          runAt: new Date(now.getTime() + 15 * 60_000),
          payload: { callId, kind: "collect", startsAt: call.startsAt.toISOString() },
          dedupeKey: `call-${callId}-collect-again-${now.getTime()}`,
        }),
      );
    }
    return false;
  }
  const done = await finishCall(db, siteSession(brand.id), brand, deps, { callId, report, now });
  if (done && report.attended) {
    if (report.transcript) await dropCallVideo(deps, call.meetingId);
    else if (deps.provider.waitsForCalls) await askForTranscriptLater(db, brand, call, now);
  }
  return done;
}

/**
 * A lead call keeps its transcript and nothing else: once the transcript is saved, the video is removed
 * from the video-call service. A failure here never undoes the call; the video simply stays where it is.
 */
async function dropCallVideo(deps: CallDeps, meetingId: string) {
  try {
    await deps.provider.dropVideo?.(meetingId);
  } catch (error) {
    console.error("Could not remove a call video from the video-call service", error);
  }
}

async function askForTranscriptLater(db: Db, brand: Brand, call: Call, now: Date) {
  if (now.getTime() >= call.endsAt.getTime() + 3 * HOUR) return;
  await withSession(db, siteSession(brand.id), (tx) =>
    tx.insert(jobs).values({
      clientId: brand.id,
      type: "call_transcript",
      runAt: new Date(now.getTime() + 15 * 60_000),
      payload: { callId: call.id },
      dedupeKey: `transcript-${call.id}-${now.getTime()}`,
    }),
  );
}

/** The transcript can take a while after a call. Asks again for it, saves it when it is there, then removes the video. */
export async function collectTranscript(db: Db, brand: Brand, deps: CallDeps, callId: string, now: Date = new Date()): Promise<boolean> {
  const call = await withSession(db, siteSession(brand.id), async (tx) => {
    const [row] = await tx.select().from(calls).where(eq(calls.id, callId));
    return row;
  });
  if (!call || call.status !== "attended" || !call.meetingId) return false;
  if (call.transcript) {
    await dropCallVideo(deps, call.meetingId);
    return true;
  }
  const report = await deps.provider.report(call.meetingId);
  if (!report?.transcript) {
    await askForTranscriptLater(db, brand, call, now);
    return false;
  }
  await withSession(db, siteSession(brand.id), (tx) =>
    tx
      .update(calls)
      .set({ transcript: report.transcript, recordingUrl: report.recordingUrl ?? call.recordingUrl })
      .where(eq(calls.id, call.id)),
  );
  await dropCallVideo(deps, call.meetingId);
  return true;
}

/** Reminds the consultant to answer "How did it go?", if the call still has no answers. Sent once. */
export async function sendOutcomeReminder(db: Db, brand: Brand, deps: CallDeps, callId: string): Promise<boolean> {
  return withSession(db, siteSession(brand.id), async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, callId));
    if (!call || call.status !== "attended" || call.outcome) return false;
    const [lead] = await tx.select().from(leads).where(eq(leads.id, call.leadId));
    const site = siteFor(brand);
    const settings = emailSettingsFor(brand.name, site);
    const mail = outcomeReminderEmail({
      baseUrl: baseUrl(),
      slug: brand.slug,
      brandName: brand.name,
      site,
      footer: settings.footer,
      leadId: lead.id,
      leadName: fullName(lead),
      when: ukWhen(call.startsAt),
    });
    for (const person of deps.staff) await deps.deliver({ ...mail, to: person.email, fromName: "franOS", fromAddress: settings.fromAddress });
    return deps.staff.length > 0;
  });
}
