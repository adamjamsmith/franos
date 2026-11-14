import { toMinutes, ukMinutes } from "../calls/time";
import type { Video } from "../site/config";
import { pathFrom, ukDay, ukTimeOnDay } from "./render";

/**
 * Deciding which email a lead gets, and when.
 *
 * The rule: no lead gets more than one email a day. Each day the most relevant one goes:
 * a reaction to something they just did, else a nudge if they have been stuck on a step,
 * else the next email in the sequence. Emails about a booked call are separate and not decided here.
 */

export type PlanEmail = { id: string; key: string; kind: string; trigger: string | null; position: number; dayOffset: number; subject: string };
export type PlanEvent = { type: string; data: unknown; occurredAt: Date };
export type PlanSend = { emailId: string; sentAt: Date };
export type Candidate = {
  email: PlanEmail;
  /** The earliest moment this email may go. */
  dueAt: Date;
  /** Why this lead is getting it, in plain words. Shown on their activity. */
  reason: string;
  /** Extra words that can be dropped into the wording, such as the franchisee's name. */
  vars?: Record<string, string>;
  /** Set when the email is about booking a call, so its button says so whatever else the lead has left to do. */
  pushCall?: boolean;
};

/** How long after the lead does something before the reaction goes. */
export const REACTION_DELAY_MS = 10 * 60_000;
/** A reaction that could not go within this long is dropped: it would no longer read as a reaction. */
const REACTION_FRESH_MS = 2 * 86_400_000;
/** Reactions, nudges and sequence emails only go between these UK times. */
export const DAY_STARTS = "08:00";
const DAY_STARTS_MIN = 8 * 60;
const DAY_ENDS_MIN = 21 * 60;

const later = (a: Date, b: Date) => (a > b ? a : b);

/**
 * Every email this lead could be sent next, most important first, each with the earliest time it may go.
 * `emails` are the brand's switched-on emails in order. `events` are the lead's, oldest first.
 */
export function candidatesFor(input: {
  emails: PlanEmail[];
  lead: { createdAt: Date };
  sends: PlanSend[];
  events: PlanEvent[];
  videos: Video[];
  sendTime: string;
  now: Date;
}): Candidate[] {
  const { emails, lead, sends, events, sendTime, now } = input;
  const sentAt = new Map(sends.map((s) => [s.emailId, s.sentAt]));
  const unsent = (e: PlanEmail) => !sentAt.has(e.id);

  const prospectusEmail = emails.find((e) => e.kind === "prospectus" && unsent(e));
  if (prospectusEmail) return [{ email: prospectusEmail, dueAt: lead.createdAt, reason: "signed up" }];

  const path = pathFrom(events);
  const readAt = events.find((e) => {
    const data = (e.data ?? {}) as Record<string, unknown>;
    return (e.type === "document_open" || e.type === "document_download") && data.kind === "prospectus";
  })?.occurredAt;
  const fresh = (at: Date) => now.getTime() - at.getTime() <= REACTION_FRESH_MS;
  const found: Candidate[] = [];

  // Reactions: they just did something. Not for a lead who already has, or has had, a call.
  if (!path.call) {
    const readReaction = emails.find((e) => e.kind === "reaction" && e.trigger === "prospectus_read" && unsent(e));
    if (readReaction && readAt && fresh(readAt)) {
      found.push({ email: readReaction, dueAt: new Date(readAt.getTime() + REACTION_DELAY_MS), reason: "read the prospectus" });
    }
    const watchReaction = emails.find((e) => e.kind === "reaction" && e.trigger === "testimonial_watched" && unsent(e));
    if (watchReaction) {
      for (const event of events) {
        const data = (event.data ?? {}) as Record<string, unknown>;
        if (event.type !== "video_progress" || data.videoId === "vsl" || Number(data.percent) < 50) continue;
        const video = input.videos.find((v) => v.id === data.videoId);
        if (!video || video.offerChat === false) continue;
        if (fresh(event.occurredAt)) {
          const person = video.person?.trim() || "this franchisee";
          found.push({
            email: watchReaction,
            dueAt: new Date(event.occurredAt.getTime() + REACTION_DELAY_MS),
            reason: `watched "${video.title}"`,
            vars: { person, video_title: video.title },
            pushCall: true,
          });
        }
        break; // only the first testimonial they watched half of counts
      }
    }
  }

  // Nudges: they are stuck on a step. Each step's nudges go in order, spaced as their day numbers say.
  const nudge = (trigger: string, anchor: Date, reason: string) => {
    const set = emails.filter((e) => e.kind === "nudge" && e.trigger === trigger).sort((a, b) => a.dayOffset - b.dayOffset);
    const index = set.findIndex(unsent);
    if (index < 0) return;
    let dueAt = ukTimeOnDay(anchor, set[index].dayOffset, sendTime);
    const before = index > 0 ? sentAt.get(set[index - 1].id) : undefined;
    if (before) dueAt = later(dueAt, ukTimeOnDay(before, Math.max(1, set[index].dayOffset - set[index - 1].dayOffset), sendTime));
    found.push({ email: set[index], dueAt, reason });
  };
  if (!readAt) nudge("no_prospectus", lead.createdAt, "has not opened the prospectus");
  else if (!path.call) nudge("no_call", readAt, "has not booked a call");

  // The sequence: one a day, in the order shown on the Emails tab. The first goes the day after sign-up.
  // If one went late (a reaction or nudge took its day), the next still follows a day behind it.
  const sequence = emails.filter((e) => e.kind === "sequence").sort((a, b) => a.position - b.position);
  const index = sequence.findIndex(unsent);
  if (index >= 0) {
    let dueAt = ukTimeOnDay(lead.createdAt, index + 1, sendTime);
    const before = index > 0 ? sentAt.get(sequence[index - 1].id) : undefined;
    if (before) dueAt = later(dueAt, ukTimeOnDay(before, 1, sendTime));
    found.push({ email: sequence[index], dueAt, reason: "next in the sequence" });
  }
  return found;
}

const hadEmailToday = (sends: PlanSend[], now: Date) => sends.some((s) => ukDay(s.sentAt) === ukDay(now));
const inSendingHours = (now: Date) => ukMinutes(now) >= DAY_STARTS_MIN && ukMinutes(now) < DAY_ENDS_MIN;

/**
 * The email to send this lead right now, if any.
 * A reaction can go at any time of day. A nudge or sequence email waits for the brand's send time,
 * so one that is overdue goes at the usual time and not first thing in the morning.
 */
export function pickToSend(candidates: Candidate[], sends: PlanSend[], now: Date, sendTime: string): Candidate | null {
  const first = candidates[0];
  if (!first) return null;
  // The prospectus email is what they asked for: it goes at once, whatever the hour.
  if (first.email.kind === "prospectus") return first.dueAt <= now ? first : null;
  if (hadEmailToday(sends, now) || !inSendingHours(now)) return null;
  const pastSendTime = ukMinutes(now) >= toMinutes(sendTime);
  return candidates.find((c) => c.dueAt <= now && (c.email.kind === "reaction" || pastSendTime)) ?? null;
}

/** The email this lead will get next and roughly when, for showing on their record. */
export function nextUp(candidates: Candidate[], sends: PlanSend[], now: Date, sendTime: string): { candidate: Candidate; at: Date } | null {
  if (candidates.length === 0) return null;
  if (candidates[0].email.kind === "prospectus") return { candidate: candidates[0], at: later(candidates[0].dueAt, now) };
  // The first moment anything may go: now, or tomorrow morning if they have already had today's email.
  const earliest = hadEmailToday(sends, now) ? ukTimeOnDay(now, 1, DAY_STARTS) : now;
  const intoHours = (at: Date) => {
    const minutes = ukMinutes(at);
    if (minutes < DAY_STARTS_MIN) return ukTimeOnDay(at, 0, DAY_STARTS);
    if (minutes >= DAY_ENDS_MIN) return ukTimeOnDay(at, 1, DAY_STARTS);
    return at;
  };
  let best: { candidate: Candidate; at: Date } | null = null;
  for (const candidate of candidates) {
    let at = later(candidate.dueAt, earliest);
    // Nudges and sequence emails go at the brand's send time, not before.
    if (candidate.email.kind !== "reaction" && ukMinutes(at) < toMinutes(sendTime)) at = ukTimeOnDay(at, 0, sendTime);
    at = intoHours(at);
    if (!best || at < best.at) best = { candidate, at };
  }
  return best;
}
