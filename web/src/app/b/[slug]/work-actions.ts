"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { OutcomeFormState } from "@/components/outcome-form";
import { withSession } from "@/db/context";
import { adSpend, auditLog, clients } from "@/db/schema";
import { backWith } from "@/lib/back";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import { addNote, type Answer, closeLead, markSigned, type NextMove, NEXT_MOVES, reopenLead, saveOutcome, setClosing } from "@/work/outcomes";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const answer = (value: string): Answer | null => (value === "yes" || value === "no" || value === "unsure" ? value : null);

/** Owners and consultants work the leads. The client role only reads. */
async function staffOnly(form: FormData) {
  const brand = await requireBrand(text(form, "slug"));
  if (brand.role !== "owner" && brand.role !== "consultant") redirect(`/b/${brand.client.slug}/board`);
  return brand;
}

const OUTCOME_FIELDS = ["budget", "authority", "need", "timing", "rightPerson", "next", "reason", "notes"];

/**
 * Saves the answers to "How did it go?" for one call.
 * If something is missing, it hands back everything already chosen, so nothing has to be done twice.
 */
export async function answerOutcome(_previous: OutcomeFormState, form: FormData): Promise<OutcomeFormState> {
  const { session, client, db } = await staffOnly(form);
  const callId = text(form, "callId");
  const leadId = text(form, "leadId");
  if (!isId(callId) || !isId(leadId)) redirect(`/b/${client.slug}/board`);
  const values = Object.fromEntries(OUTCOME_FIELDS.map((key) => [key, text(form, key)]));
  const fail = (error: string): OutcomeFormState => ({ error, values });

  const budget = answer(values.budget);
  const authority = answer(values.authority);
  const need = answer(values.need);
  const timing = answer(values.timing);
  const right = values.rightPerson;
  const next = values.next;
  if (!budget || !authority || !need || !timing || (right !== "yes" && right !== "no") || !(next in NEXT_MOVES)) {
    return fail("Please answer all six questions. What you have chosen so far is still here.");
  }
  const result = await saveOutcome(db, session, client, {
    callId,
    answers: { budget, authority, need, timing, rightPerson: right === "yes", next: next as NextMove, notes: values.notes },
    reason: values.reason,
  });
  if (!result.ok) {
    return fail(result.reason === "reason" ? "Pick a reason for not going ahead. Everything else is still here." : "That call could not be updated.");
  }
  await withSession(db, session, (tx) =>
    tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "call.outcome_answered", target: callId, detail: { good: result.good } }),
  );
  redirect(backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, result.good ? "work=good" : "work=saved"));
}

export async function signLead(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const leadId = text(form, "leadId");
  if (isId(leadId) && (await markSigned(db, session, client, { leadId }))) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "lead.signed", target: leadId }),
    );
  }
  redirect(backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, "work=signed"));
}

export async function endLead(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const leadId = text(form, "leadId");
  const reason = text(form, "reason");
  const done = isId(leadId) && (await closeLead(db, session, client, { leadId, reason, note: text(form, "note") }));
  if (done) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "lead.not_going_ahead", target: leadId, detail: { reason } }),
    );
  }
  redirect(backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, done ? "work=ended" : "work=reason"));
}

export async function reopen(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const leadId = text(form, "leadId");
  if (isId(leadId) && (await reopenLead(db, session, client, { leadId }))) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "lead.reopened", target: leadId }),
    );
  }
  redirect(text(form, "back") === "board" ? `/b/${client.slug}/board?closed=1` : backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, "work=reopened"));
}

const pounds = (value: string) => {
  const n = Number(value.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? n : null;
};

/** Ad spend for one month, typed in by the owner. */
export async function saveSpend(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  const month = text(form, "month");
  const amount = pounds(text(form, "amount"));
  if (role !== "owner" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || amount === null) redirect(`/b/${client.slug}/numbers?problem=spend`);
  const amountPence = Math.round(amount * 100);
  await withSession(db, session, async (tx) => {
    await tx
      .insert(adSpend)
      .values({ clientId: client.id, month, amountPence })
      .onConflictDoUpdate({ target: [adSpend.clientId, adSpend.month], set: { amountPence } });
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "spend.saved", detail: { month, amountPence } });
  });
  redirect(`/b/${client.slug}/numbers?saved=1`);
}

/** The franchise fee, used as the value of the Signed event. */
export async function saveFee(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  const fee = pounds(text(form, "fee"));
  if (role !== "owner" || fee === null) redirect(`/b/${client.slug}/settings?problem=fee`);
  await withSession(db, session, async (tx) => {
    await tx.update(clients).set({ site: { ...siteFor(client), franchiseFee: fee } }).where(eq(clients.id, client.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "fee.saved", detail: { fee } });
  });
  redirect(`/b/${client.slug}/settings?saved=1`);
}

/** Moves a lead into Closing, or back to Interested. */
export async function moveClosing(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const leadId = text(form, "leadId");
  const closing = text(form, "closing") === "yes";
  if (isId(leadId) && (await setClosing(db, session, client, { leadId, closing }))) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: closing ? "lead.closing" : "lead.out_of_closing", target: leadId }),
    );
  }
  redirect(backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, `work=${closing ? "closing" : "notclosing"}`));
}

/** Adds a note to the lead's activity. */
export async function saveNote(form: FormData) {
  const { session, client, db, user } = await staffOnly(form);
  const leadId = text(form, "leadId");
  const done = isId(leadId) && (await addNote(db, session, client, { leadId, text: text(form, "note"), byName: user.name }));
  redirect(backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, `work=${done ? "noted" : "nonote"}`));
}
