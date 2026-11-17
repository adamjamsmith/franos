import { and, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import type { MeetingProvider } from "../calls/provider";
import type { Db } from "../db/context";
import { auditLog, calls, consents, emailSends, jobs, leadEvents, leads, metaEvents } from "../db/schema";

/**
 * How long things are kept (decision 111, and what the privacy notice promises):
 *  - a lead-call recording and transcript: 12 months after the call;
 *  - a lead and everything about them: 2 years after the last contact.
 * "Last contact" is the latest of: when they signed up, anything on their journey, any email sent to them,
 * any call, and when their outcome was set. A lead with a call still to come always has contact ahead.
 * A signed lead is never deleted here: they are a franchisee now, and that record is the brand's to keep.
 * Recording sessions (testimonials, interviews) are not on a timer: they are reviewed by hand every 12 months.
 */
export const KEEP_CALL_RECORDINGS_MONTHS = 12;
export const KEEP_LEADS_MONTHS = 24;
/** The most leads removed in one run, so one run never holds the database for long. The rest follow on the next. */
const BATCH = 200;
/** Who the audit log names for work franOS does on its own. */
const SYSTEM = "system";

const monthsBefore = (now: Date, months: number) => {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
};

export type RetentionResult = { recordingsCleared: number; leadsDeleted: number };

/** Clears old call recordings and transcripts, then deletes leads past their keeping time. Safe to run as often as you like. */
export async function applyRetention(admin: Db, provider: Pick<MeetingProvider, "dropRecording">, now: Date = new Date()): Promise<RetentionResult> {
  // ---- Call recordings and transcripts, 12 months after the call.
  const oldCalls = await admin
    .select({ id: calls.id, clientId: calls.clientId, meetingId: calls.meetingId })
    .from(calls)
    .where(and(lt(calls.endsAt, monthsBefore(now, KEEP_CALL_RECORDINGS_MONTHS)), or(isNotNull(calls.transcript), isNotNull(calls.recordingUrl))))
    .limit(BATCH);
  for (const call of oldCalls) {
    // Anything still on the video-call service goes too. If that fails, our own copy is still cleared.
    if (call.meetingId && provider.dropRecording) await provider.dropRecording(call.meetingId).catch(() => {});
    await admin.update(calls).set({ transcript: null, recordingUrl: null }).where(eq(calls.id, call.id));
    await admin.insert(auditLog).values({ clientId: call.clientId, actorUserId: SYSTEM, action: "retention.call_recording_cleared", target: call.id });
  }

  // ---- Leads, 2 years after the last contact.
  const cutoff = monthsBefore(now, KEEP_LEADS_MONTHS).toISOString();
  const found = await admin.execute(sql`
    select l.id, l.client_id from leads l
    where coalesce(l.outcome, '') <> 'signed'
      and greatest(
        l.created_at,
        coalesce(l.outcome_at, l.created_at),
        coalesce((select max(e.occurred_at) from lead_events e where e.lead_id = l.id), l.created_at),
        coalesce((select max(s.sent_at) from email_sends s where s.lead_id = l.id), l.created_at),
        coalesce((select max(c.ends_at) from calls c where c.lead_id = l.id), l.created_at)
      ) < ${cutoff}::timestamptz
    limit ${BATCH}`);
  const expired = ((found as { rows?: Record<string, unknown>[] }).rows ?? []).map((row) => ({ id: String(row.id), clientId: String(row.client_id) }));
  for (const lead of expired) {
    await admin.transaction(async (tx) => {
      const theirCalls = await tx.select({ id: calls.id, meetingId: calls.meetingId }).from(calls).where(eq(calls.leadId, lead.id));
      for (const call of theirCalls) {
        if (call.meetingId && provider.dropRecording) await provider.dropRecording(call.meetingId).catch(() => {});
      }
      const callIds = theirCalls.map((c) => c.id);
      await tx.delete(jobs).where(sql`${jobs.payload} ->> 'leadId' = ${lead.id}`);
      if (callIds.length) await tx.delete(jobs).where(inArray(sql`${jobs.payload} ->> 'callId'`, callIds));
      await tx.delete(calls).where(eq(calls.leadId, lead.id));
      await tx.delete(emailSends).where(eq(emailSends.leadId, lead.id));
      await tx.delete(metaEvents).where(eq(metaEvents.leadId, lead.id));
      await tx.delete(consents).where(eq(consents.leadId, lead.id));
      await tx.delete(leadEvents).where(eq(leadEvents.leadId, lead.id));
      await tx.delete(leads).where(eq(leads.id, lead.id));
      // The log keeps that a lead was removed and when, and nothing about who they were.
      await tx.insert(auditLog).values({ clientId: lead.clientId, actorUserId: SYSTEM, action: "retention.lead_deleted", target: lead.id });
    });
  }
  return { recordingsCleared: oldCalls.length, leadsDeleted: expired.length };
}

// Once a few hours is plenty: the keeping times are measured in months.
let lastRun = 0;
export async function applyRetentionWhenDue(admin: () => Promise<Db>, provider: Pick<MeetingProvider, "dropRecording">, now: Date = new Date()) {
  if (now.getTime() - lastRun < 6 * 3_600_000) return null;
  lastRun = now.getTime();
  return applyRetention(await admin(), provider, now);
}
