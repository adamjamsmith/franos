import { and, asc, desc, eq, gte, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { type Db, type Session, type Tx, withSession } from "../db/context";
import { emails, emailSends, leadEvents, leads } from "../db/schema";
import { siteFor } from "../site/config";
import { siteSession } from "../site/leads";
import { type Starter, starterEmails } from "./defaults";
import { type Candidate, candidatesFor, nextUp, pickToSend } from "./plan";
import {
  emailSettingsFor,
  nextStepFor,
  pathFrom,
  type Rendered,
  type RenderInput,
  renderEmail,
  signatureOk,
  ukTimeOnDay,
} from "./render";

type Brand = { id: string; slug: string; name: string; site: unknown };
export type Outgoing = Rendered & { to: string; fromName: string; fromAddress: string };
export type Deliver = (mail: Outgoing) => void | Promise<void>;

/** Leads with one of these outcomes get no more emails. */
const FINAL_OUTCOMES = ["signed", "not_interested"];

export const baseUrl = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/** Adds the starter emails a brand does not have yet. Owner only. Emails already there are left alone. */
export async function addStarterEmails(tx: Tx, clientId: string, set: Starter[] = starterEmails) {
  await tx
    .insert(emails)
    .values(set.map((e) => ({ ...e, clientId })))
    .onConflictDoNothing({ target: [emails.clientId, emails.key] });
}

async function nextStepForLead(tx: Tx, leadId: string) {
  const events = await tx
    .select({ type: leadEvents.type, data: leadEvents.data })
    .from(leadEvents)
    .where(eq(leadEvents.leadId, leadId));
  return nextStepFor(pathFrom(events));
}

/** Builds an email for a lead without sending it. Used by the preview and by sending, so the two always match. */
export async function buildEmail(
  tx: Tx,
  brand: Brand,
  email: RenderInput["email"],
  lead: { id: string; firstName: string | null },
  sendId: string,
  vars?: Record<string, string>,
  /** For an email that is about booking a call: its button says so, whatever else the lead has left to do. */
  pushCall = false,
): Promise<Rendered> {
  const site = siteFor(brand);
  return renderEmail({
    baseUrl: baseUrl(),
    slug: brand.slug,
    brandName: brand.name,
    site,
    settings: emailSettingsFor(brand.name, site),
    email,
    lead,
    nextStep: pushCall ? "call" : await nextStepForLead(tx, lead.id),
    sendId,
    vars,
  });
}

/** The events that decide which email a lead gets. Only these are loaded when sending. */
const PLAN_EVENTS = ["video_progress", "document_open", "document_download", "call_booked", "call_cancelled", "call_no_show", "call_no_show_undone"];

/**
 * Sends every email that is due for one brand. Safe to run as often as you like.
 *
 * No lead gets more than one email a day. For each lead the most relevant email goes:
 * a reaction to something they just did, else a nudge if they are stuck on a step, else the
 * next in the sequence (see plan.ts). The prospectus email goes at sign-up, whatever the hour.
 * Unsubscribed leads, and leads marked signed or not going ahead, get nothing.
 * Once the brand's daily limit is reached, everything but the prospectus email waits for the next day.
 */
export async function sendDueEmails(
  db: Db,
  brand: Brand,
  deliver: Deliver,
  now: Date = new Date(),
  onlyLeadId?: string,
): Promise<{ sent: number; held: number }> {
  const site = siteFor(brand);
  const settings = emailSettingsFor(brand.name, site);

  return withSession(db, siteSession(brand.id), async (tx) => {
    const active = await tx.select().from(emails).where(eq(emails.active, true)).orderBy(asc(emails.position));
    if (active.length === 0) return { sent: 0, held: 0 };

    const eligible = await tx
      .select()
      .from(leads)
      .where(
        and(
          isNull(leads.unsubscribedAt),
          eq(leads.qualified, true),
          or(isNull(leads.outcome), notInArray(leads.outcome, FINAL_OUTCOMES)),
          onlyLeadId ? eq(leads.id, onlyLeadId) : undefined,
        ),
      );
    if (eligible.length === 0) return { sent: 0, held: 0 };
    const ids = eligible.map((l) => l.id);

    const sends = await tx
      .select({ leadId: emailSends.leadId, emailId: emailSends.emailId, sentAt: emailSends.sentAt })
      .from(emailSends)
      .where(inArray(emailSends.leadId, ids));
    const events = await tx
      .select({ leadId: leadEvents.leadId, type: leadEvents.type, data: leadEvents.data, occurredAt: leadEvents.occurredAt })
      .from(leadEvents)
      .where(and(inArray(leadEvents.leadId, ids), inArray(leadEvents.type, PLAN_EVENTS)))
      .orderBy(asc(leadEvents.occurredAt), asc(leadEvents.id));
    const [{ sentToday }] = await tx
      .select({ sentToday: sql<number>`count(*)::int` })
      .from(emailSends)
      .where(gte(emailSends.sentAt, ukTimeOnDay(now, 0, "00:00")));

    type Lead = (typeof eligible)[number];
    const queue: { lead: Lead; pick: Candidate }[] = [];
    for (const lead of eligible) {
      const mine = sends.filter((s) => s.leadId === lead.id);
      const candidates = candidatesFor({
        emails: active,
        lead,
        sends: mine,
        events: events.filter((e) => e.leadId === lead.id),
        videos: site.videos,
        sendTime: settings.sendTime,
        now,
      });
      const pick = pickToSend(candidates, mine, now, settings.sendTime);
      if (pick) queue.push({ lead, pick });
    }
    // Prospectus emails first, then whoever has been waiting longest, so nobody is held back day after day.
    queue.sort(
      (a, b) =>
        Number(b.pick.email.kind === "prospectus") - Number(a.pick.email.kind === "prospectus") ||
        a.pick.dueAt.getTime() - b.pick.dueAt.getTime(),
    );

    let budget = settings.dailyLimit - sentToday;
    let sent = 0;
    let held = 0;
    for (const { lead, pick } of queue) {
      const email = active.find((e) => e.id === pick.email.id)!;
      if (email.kind !== "prospectus" && budget <= 0) {
        held++;
        continue;
      }
      const [send] = await tx
        .insert(emailSends)
        .values({ clientId: brand.id, leadId: lead.id, emailId: email.id, sentAt: now })
        .onConflictDoNothing({ target: [emailSends.clientId, emailSends.leadId, emailSends.emailId] })
        .returning({ id: emailSends.id });
      if (!send) continue; // another run got there first
      const rendered = await buildEmail(tx, brand, email, lead, send.id, pick.vars, pick.pushCall);
      await deliver({ ...rendered, to: lead.email, fromName: settings.fromName, fromAddress: settings.fromAddress });
      await tx.insert(leadEvents).values({
        clientId: brand.id,
        leadId: lead.id,
        type: "email_sent",
        data: { emailKey: email.key, subject: rendered.subject, kind: email.kind, reason: pick.reason },
        occurredAt: now,
      });
      budget--;
      sent++;
    }
    return { sent, held };
  });
}

/** What a lead will be emailed next and roughly when, for showing on their record. Null if nothing is coming. */
export async function nextEmailForLead(tx: Tx, brand: Brand, leadId: string, now: Date = new Date()) {
  const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
  if (!lead || !lead.qualified || lead.unsubscribedAt || FINAL_OUTCOMES.includes(lead.outcome ?? "")) return null;
  const site = siteFor(brand);
  const active = await tx.select().from(emails).where(eq(emails.active, true)).orderBy(asc(emails.position));
  const mine = await tx.select({ emailId: emailSends.emailId, sentAt: emailSends.sentAt }).from(emailSends).where(eq(emailSends.leadId, leadId));
  const events = await tx
    .select({ type: leadEvents.type, data: leadEvents.data, occurredAt: leadEvents.occurredAt })
    .from(leadEvents)
    .where(and(eq(leadEvents.leadId, leadId), inArray(leadEvents.type, PLAN_EVENTS)))
    .orderBy(asc(leadEvents.occurredAt), asc(leadEvents.id));
  const sendTime = emailSettingsFor(brand.name, site).sendTime;
  const candidates = candidatesFor({ emails: active, lead, sends: mine, events, videos: site.videos, sendTime, now });
  const next = nextUp(candidates, mine, now, sendTime);
  return next && { subject: next.candidate.email.subject, kind: next.candidate.email.kind, reason: next.candidate.reason, at: next.at };
}

/** Finds the send a tracked link or open marker belongs to, inside its own brand. */
async function sendWithEmail(tx: Tx, sendId: string) {
  const [row] = await tx
    .select({ send: emailSends, emailKey: emails.key })
    .from(emailSends)
    .innerJoin(emails, eq(emails.id, emailSends.emailId))
    .where(eq(emailSends.id, sendId));
  return row;
}

/** Records that an email was opened. Counted once. */
export async function recordOpen(db: Db, session: Session, sendId: string, signature: string) {
  if (!signatureOk(`open|${sendId}`, signature)) return false;
  await withSession(db, session, async (tx) => {
    const row = await sendWithEmail(tx, sendId);
    if (!row || row.send.openedAt) return;
    await tx.update(emailSends).set({ openedAt: new Date() }).where(eq(emailSends.id, sendId));
    await tx.insert(leadEvents).values({
      clientId: row.send.clientId,
      leadId: row.send.leadId,
      type: "email_open",
      data: { emailKey: row.emailKey },
    });
  });
  return true;
}

/**
 * Records a click on a link in an email and returns where to send the visitor.
 * The destination is part of what was signed, so a link cannot be changed to point anywhere else.
 */
export async function recordClick(
  db: Db,
  session: Session,
  slug: string,
  sendId: string,
  to: string,
  signature: string,
): Promise<{ leadId: string; to: string } | null> {
  if (!to.startsWith(`/site/${slug}/`) || to.includes("..") || to.includes("//")) return null;
  if (!signatureOk(`${sendId}|${to}`, signature)) return null;
  return withSession(db, session, async (tx) => {
    const row = await sendWithEmail(tx, sendId);
    if (!row) return null;
    await tx
      .update(emailSends)
      .set({ clicks: sql`${emailSends.clicks} + 1`, firstClickedAt: row.send.firstClickedAt ?? new Date() })
      .where(eq(emailSends.id, sendId));
    await tx.insert(leadEvents).values({
      clientId: row.send.clientId,
      leadId: row.send.leadId,
      type: "email_click",
      data: { emailKey: row.emailKey, to: to.replace(`/site/${slug}`, "") },
    });
    return { leadId: row.send.leadId, to };
  });
}

/** Stops all emails to a lead for good. */
export async function unsubscribe(db: Db, session: Session, leadId: string, signature: string) {
  if (!signatureOk(`unsubscribe|${leadId}`, signature)) return false;
  return withSession(db, session, async (tx) => {
    const [lead] = await tx.select({ id: leads.id, at: leads.unsubscribedAt }).from(leads).where(eq(leads.id, leadId));
    if (!lead) return false;
    if (lead.at) return true;
    await tx.update(leads).set({ unsubscribedAt: new Date() }).where(eq(leads.id, leadId));
    // Count the unsubscribe against the last email they were sent, so an email that puts people off shows up.
    const [last] = await tx.select({ id: emailSends.id }).from(emailSends).where(eq(emailSends.leadId, leadId)).orderBy(desc(emailSends.sentAt)).limit(1);
    if (last) await tx.update(emailSends).set({ unsubscribedAt: new Date() }).where(eq(emailSends.id, last.id));
    await tx.insert(leadEvents).values({ clientId: session.clientId!, leadId, type: "unsubscribed", data: {} });
    return true;
  });
}

/** Stand-in words for previewing an email whose wording names a franchisee, taken from the brand's first testimonial. */
export function sampleWords(site: { videos: { title: string; person?: string }[] }, trigger: string | null): { vars?: Record<string, string>; pushCall: boolean } {
  if (trigger !== "testimonial_watched") return { pushCall: false };
  const video = site.videos[0];
  return { vars: { person: video?.person?.trim() || "this franchisee", video_title: video?.title ?? "a franchisee's story" }, pushCall: true };
}
