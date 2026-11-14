import { and, eq } from "drizzle-orm";
import { type Db, type Tx, withSession } from "../db/context";
import { jobs, leadEvents, leads } from "../db/schema";
import { emailSettingsFor, ukTimeOnDay } from "../email/render";
import { baseUrl } from "../email/send";
import { type FitLine, siteFor } from "../site/config";
import { siteSession } from "../site/leads";
import type { Brand, CallDeps } from "./calls";
import { alertEmail } from "./emails";
import { callSettingsFor } from "./slots";
import { toMinutes, ukMinutes } from "./time";

async function alreadyAlerted(tx: Tx, leadId: string) {
  const rows = await tx
    .select({ id: leadEvents.id })
    .from(leadEvents)
    .where(and(eq(leadEvents.leadId, leadId), eq(leadEvents.type, "speed_alert")))
    .limit(1);
  return rows.length > 0;
}

async function sendAlertTx(tx: Tx, brand: Brand, deps: CallDeps, leadId: string, now: Date): Promise<boolean> {
  const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
  if (!lead || (await alreadyAlerted(tx, leadId))) return false;
  const site = siteFor(brand);
  const settings = emailSettingsFor(brand.name, site);
  const mail = alertEmail({
    baseUrl: baseUrl(),
    slug: brand.slug,
    brandName: brand.name,
    site,
    footer: settings.footer,
    leadId: lead.id,
    leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    phone: lead.phone,
    email: lead.email,
    fitScore: lead.fitScore ?? 0,
    answers: (lead.fitDetail as FitLine[]).map((line) => ({ question: line.question, answer: line.answer })),
  });
  for (const person of deps.staff) {
    await deps.deliver({ ...mail, to: person.email, fromName: "franOS", fromAddress: settings.fromAddress });
  }
  await tx.insert(leadEvents).values({
    clientId: brand.id,
    leadId: lead.id,
    type: "speed_alert",
    data: { toldPeople: deps.staff.length },
    occurredAt: now,
  });
  return true;
}

/**
 * The speed-to-lead alert. Call it once when a new lead signs up.
 * A lead with a good Fit score triggers "call now" to the consultant: straight away inside
 * the alert hours, or at the start of the next alert hours if they signed up outside them.
 */
export async function speedAlert(db: Db, brand: Brand, deps: CallDeps, leadId: string, now: Date = new Date()): Promise<"sent" | "waiting" | "none"> {
  const settings = callSettingsFor(siteFor(brand));
  return withSession(db, siteSession(brand.id), async (tx) => {
    const [lead] = await tx.select({ fitScore: leads.fitScore }).from(leads).where(eq(leads.id, leadId));
    if (!lead || (lead.fitScore ?? 0) < settings.alertFit) return "none";
    if (await alreadyAlerted(tx, leadId)) return "none";

    const clock = ukMinutes(now);
    const from = toMinutes(settings.alertFrom);
    if (clock >= from && clock < toMinutes(settings.alertTo)) {
      return (await sendAlertTx(tx, brand, deps, leadId, now)) ? "sent" : "none";
    }
    await tx
      .insert(jobs)
      .values({
        clientId: brand.id,
        type: "call_alert",
        runAt: ukTimeOnDay(now, clock < from ? 0 : 1, settings.alertFrom),
        payload: { leadId },
        dedupeKey: `alert-${leadId}`,
      })
      .onConflictDoNothing({ target: [jobs.clientId, jobs.dedupeKey] });
    return "waiting";
  });
}

/** Sends an alert that was held back overnight. */
export async function sendHeldAlert(db: Db, brand: Brand, deps: CallDeps, leadId: string, now: Date = new Date()) {
  return withSession(db, siteSession(brand.id), (tx) => sendAlertTx(tx, brand, deps, leadId, now));
}
