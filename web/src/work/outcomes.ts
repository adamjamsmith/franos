import { and, eq } from "drizzle-orm";
import { type Db, type Session, type Tx, withSession } from "../db/context";
import { calls, jobs, leadEvents, leads, metaEvents } from "../db/schema";
import { siteFor } from "../site/config";

type Brand = { id: string; slug: string; name: string; site: unknown };

export type Answer = "yes" | "no" | "unsure";
export type NextMove = "second_call" | "next_steps" | "thinking" | "not_going_ahead";

/** The consultant's answers to "How did it go?" after a call. */
export type CallOutcome = {
  budget: Answer;
  authority: Answer;
  need: Answer;
  timing: Answer;
  /** Are they the kind of person we want, judged against the avatar card? */
  rightPerson: boolean;
  next: NextMove;
  notes: string;
  byUserId: string;
  at: string;
};
export type OutcomeAnswers = Omit<CallOutcome, "byUserId" | "at">;

export const BANT: { key: "budget" | "authority" | "need" | "timing"; label: string; question: string }[] = [
  { key: "budget", label: "Budget", question: "Do they have the money?" },
  { key: "authority", label: "Authority", question: "Can they decide, and is their partner on board?" },
  { key: "need", label: "Need", question: "Do they have a real reason to do this?" },
  { key: "timing", label: "Timing", question: "Do they want to start soon?" },
];
export const ANSWERS: Record<Answer, string> = { yes: "Yes", no: "No", unsure: "Not sure" };
export const NEXT_MOVES: Record<NextMove, string> = {
  second_call: "Second call",
  next_steps: "Sent next steps",
  thinking: "They are thinking",
  not_going_ahead: "Not going ahead",
};
/** Why a lead is not going ahead. The same list for every brand, so brands can be compared. */
export const REASONS: Record<string, string> = {
  money: "Does not have the money",
  timing: "Not the right time",
  partner: "Partner or family not on board",
  not_right: "Not right for us (our decision)",
  elsewhere: "Chose another franchise or business",
  quiet: "Went quiet",
  other: "Other",
};

/**
 * A good call: budget, authority, need and timing are all yes, and they are the kind of person we want.
 * franOS works this out; nobody ticks "good call" directly, so it means the same thing every time.
 */
export const isGoodCall = (o: Pick<CallOutcome, "budget" | "authority" | "need" | "timing" | "rightPerson">) =>
  o.budget === "yes" && o.authority === "yes" && o.need === "yes" && o.timing === "yes" && o.rightPerson;

const event = (tx: Tx, clientId: string, leadId: string, type: string, data: Record<string, unknown>, now: Date) =>
  tx.insert(leadEvents).values({ clientId, leadId, type, data, occurredAt: now });

async function closeLeadTx(tx: Tx, brand: Brand, leadId: string, reason: string, note: string, now: Date) {
  const [done] = await tx
    .update(leads)
    .set({ outcome: "not_interested", outcomeReason: reason, outcomeNote: note.slice(0, 1000) || null, outcomeAt: now })
    .where(eq(leads.id, leadId))
    .returning({ id: leads.id });
  if (!done) return false;
  await event(tx, brand.id, leadId, "not_going_ahead", { reason, note: note.slice(0, 1000) }, now);
  return true;
}

export type SaveOutcomeResult = { ok: true; good: boolean } | { ok: false; reason: "call" | "reason" };

/**
 * Saves the answers to "How did it go?" for a call the lead showed up to.
 * Saving again corrects the earlier answers; both are kept on the timeline.
 * The first good call for a lead records a Good call event for Meta.
 */
export async function saveOutcome(
  db: Db,
  session: Session,
  brand: Brand,
  input: { callId: string; answers: OutcomeAnswers; reason?: string; now?: Date },
): Promise<SaveOutcomeResult> {
  const now = input.now ?? new Date();
  const { answers } = input;
  if (answers.next === "not_going_ahead" && !REASONS[input.reason ?? ""]) return { ok: false, reason: "reason" };
  const good = isGoodCall(answers);

  return withSession(db, session, async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, input.callId));
    if (!call || call.status !== "attended") return { ok: false as const, reason: "call" as const };
    const outcome: CallOutcome = { ...answers, notes: answers.notes.slice(0, 4000), byUserId: session.userId, at: now.toISOString() };
    const [done] = await tx.update(calls).set({ outcome, goodCall: good }).where(eq(calls.id, call.id)).returning({ id: calls.id });
    if (!done) return { ok: false as const, reason: "call" as const }; // this role cannot change calls

    await event(
      tx,
      brand.id,
      call.leadId,
      "call_outcome",
      { callId: call.id, good, budget: answers.budget, authority: answers.authority, need: answers.need, timing: answers.timing, rightPerson: answers.rightPerson, next: answers.next, corrected: Boolean(call.outcome) },
      now,
    );
    // The answers are in, so the reminder to give them is no longer needed.
    await tx
      .update(jobs)
      .set({ status: "cancelled" })
      .where(and(eq(jobs.status, "pending"), eq(jobs.dedupeKey, `outcome-${call.id}`)));
    if (good) {
      await tx
        .insert(metaEvents)
        .values({ clientId: brand.id, leadId: call.leadId, eventName: "GoodCall", eventId: `goodcall-${call.leadId}`, payload: { callId: call.id } })
        .onConflictDoNothing({ target: [metaEvents.clientId, metaEvents.eventId] });
    }
    if (answers.next === "not_going_ahead") await closeLeadTx(tx, brand, call.leadId, input.reason!, answers.notes, now);
    return { ok: true as const, good };
  });
}

/** Marks a lead as signed. Their emails stop, and one Signed event is recorded for Meta with the franchise fee as its value. */
export async function markSigned(db: Db, session: Session, brand: Brand, input: { leadId: string; now?: Date }): Promise<boolean> {
  const now = input.now ?? new Date();
  return withSession(db, session, async (tx) => {
    const [done] = await tx
      .update(leads)
      .set({ outcome: "signed", outcomeReason: null, outcomeNote: null, outcomeAt: now })
      .where(eq(leads.id, input.leadId))
      .returning({ id: leads.id });
    if (!done) return false;
    await event(tx, brand.id, input.leadId, "signed", {}, now);
    const fee = siteFor(brand).franchiseFee;
    await tx
      .insert(metaEvents)
      .values({
        clientId: brand.id,
        leadId: input.leadId,
        eventName: "Signed",
        eventId: `signed-${input.leadId}`,
        payload: fee ? { value: fee, currency: "GBP" } : {},
      })
      .onConflictDoNothing({ target: [metaEvents.clientId, metaEvents.eventId] });
    return true;
  });
}

/** Marks a lead as not going ahead, with one reason from the fixed list. Their emails stop. */
export async function closeLead(
  db: Db,
  session: Session,
  brand: Brand,
  input: { leadId: string; reason: string; note?: string; now?: Date },
): Promise<boolean> {
  if (!REASONS[input.reason]) return false;
  return withSession(db, session, (tx) => closeLeadTx(tx, brand, input.leadId, input.reason, input.note ?? "", input.now ?? new Date()));
}

/** Puts a lead that had ended back on the board. */
export async function reopenLead(db: Db, session: Session, brand: Brand, input: { leadId: string; now?: Date }): Promise<boolean> {
  const now = input.now ?? new Date();
  return withSession(db, session, async (tx) => {
    const [lead] = await tx.select({ outcome: leads.outcome }).from(leads).where(eq(leads.id, input.leadId));
    if (!lead?.outcome) return false;
    await tx.update(leads).set({ outcome: null, outcomeReason: null, outcomeNote: null, outcomeAt: null }).where(eq(leads.id, input.leadId));
    await event(tx, brand.id, input.leadId, "reopened", { was: lead.outcome }, now);
    return true;
  });
}

/** Moves a lead into Closing (more than interested, needs regular follow-up), or back out of it. */
export async function setClosing(db: Db, session: Session, brand: Brand, input: { leadId: string; closing: boolean; now?: Date }): Promise<boolean> {
  const now = input.now ?? new Date();
  return withSession(db, session, async (tx) => {
    const [lead] = await tx.select({ closingAt: leads.closingAt }).from(leads).where(eq(leads.id, input.leadId));
    if (!lead || Boolean(lead.closingAt) === input.closing) return false;
    await tx.update(leads).set({ closingAt: input.closing ? now : null }).where(eq(leads.id, input.leadId));
    await event(tx, brand.id, input.leadId, input.closing ? "moved_to_closing" : "moved_out_of_closing", {}, now);
    return true;
  });
}

/** Adds a note to a lead's activity: a phone call made, a message left, anything worth remembering. */
export async function addNote(
  db: Db,
  session: Session,
  brand: Brand,
  input: { leadId: string; text: string; byName: string; now?: Date },
): Promise<boolean> {
  const text = input.text.trim().slice(0, 4000);
  if (!text) return false;
  return withSession(db, session, async (tx) => {
    const [lead] = await tx.select({ id: leads.id }).from(leads).where(eq(leads.id, input.leadId));
    if (!lead) return false;
    await event(tx, brand.id, input.leadId, "note", { text, by: input.byName }, input.now ?? new Date());
    return true;
  });
}
