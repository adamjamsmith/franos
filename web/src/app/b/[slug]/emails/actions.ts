"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { withSession } from "@/db/context";
import { auditLog, clients, emails, emailSends, leads } from "@/db/schema";
import { mailboxDeliver } from "@/email/deliver";
import { emailSettingsFor, isLayout } from "@/email/render";
import { addStarterEmails, buildEmail, sampleWords, sendDueEmails } from "@/email/send";
import { isDev } from "@/lib/dev-mailbox";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const SAMPLE_ID = "00000000-0000-0000-0000-000000000000";

async function ownerOnly(form: FormData) {
  const brand = await requireBrand(text(form, "slug"));
  if (brand.role !== "owner") redirect(`/b/${brand.client.slug}/emails`);
  return brand;
}

export async function addStarters(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  await withSession(db, session, (tx) => addStarterEmails(tx, client.id));
  redirect(`/b/${client.slug}/emails`);
}

export async function saveEmail(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const id = text(form, "id");
  const day = Number(text(form, "dayOffset"));
  await withSession(db, session, async (tx) => {
    await tx
      .update(emails)
      .set({
        subject: text(form, "subject") || "(no subject)",
        body: String(form.get("body") ?? ""),
        name: text(form, "name") || null,
        layout: isLayout(text(form, "layout")) ? text(form, "layout") : "header",
        preview: text(form, "preview") || null,
        headline: text(form, "headline") || null,
        imageUrl: text(form, "imageUrl") || null,
        videoId: text(form, "videoId") || null,
        quote: text(form, "quote") || null,
        quoteBy: text(form, "quoteBy") || null,
        showPs: form.get("showPs") === "on",
        // Only nudges have a day number. Leaving it out keeps whatever is there.
        ...(form.has("dayOffset") && Number.isInteger(day) && day >= 0 ? { dayOffset: day } : {}),
        active: form.get("active") === "on",
      })
      .where(eq(emails.id, id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "email.updated", target: id });
  });
  redirect(`/b/${client.slug}/emails/${id}?saved=1`);
}

export async function saveEmailSettings(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const site = siteFor(client);
  const current = emailSettingsFor(client.name, site);
  const limit = Number(text(form, "dailyLimit"));
  const time = text(form, "sendTime");
  const email = {
    fromName: text(form, "fromName") || current.fromName,
    fromAddress: text(form, "fromAddress") || current.fromAddress,
    footer: text(form, "footer") || current.footer,
    sendTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : current.sendTime,
    dailyLimit: Number.isInteger(limit) && limit >= 0 ? limit : current.dailyLimit,
    signatureName: text(form, "signatureName"),
    signaturePhone: text(form, "signaturePhone"),
    signatureEmail: text(form, "signatureEmail"),
    signatureWebsite: text(form, "signatureWebsite"),
    videoBoxImage: text(form, "videoBoxImage"),
    videoBoxText: text(form, "videoBoxText"),
  };
  await withSession(db, session, async (tx) => {
    await tx.update(clients).set({ site: { ...site, email } }).where(eq(clients.id, client.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "email.settings_updated" });
  });
  redirect(`/b/${client.slug}/settings/emails?saved=1`);
}

/** Sends whatever is due right now. On this computer it can also pretend that some days have passed, for testing. */
export async function sendNow(form: FormData) {
  const { client, db } = await ownerOnly(form);
  const days = isDev ? Number(text(form, "daysAhead")) || 0 : 0;
  const minutes = isDev ? Number(text(form, "minutesAhead")) || 0 : 0;
  const now = new Date(Date.now() + days * 86_400_000 + minutes * 60_000);
  const { sent, held } = await sendDueEmails(db, client, mailboxDeliver, now);
  redirect(`/b/${client.slug}/emails?sent=${sent}&held=${held}`);
}

/** Sends one email to the test mailbox as a chosen lead would get it. Nothing is recorded against the lead. */
export async function sendTest(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const id = text(form, "id");
  const leadId = text(form, "leadId");
  const rendered = await withSession(db, session, async (tx) => {
    const [email] = await tx.select().from(emails).where(eq(emails.id, id));
    const [lead] = leadId
      ? await tx.select().from(leads).where(and(eq(leads.id, leadId)))
      : [];
    if (!email) return null;
    const sample = sampleWords(siteFor(client), email.trigger);
    return buildEmail(tx, client, email, lead ?? { id: SAMPLE_ID, firstName: "Sam" }, SAMPLE_ID, sample.vars, sample.pushCall);
  });
  if (rendered) {
    const settings = emailSettingsFor(client.name, siteFor(client));
    await mailboxDeliver({
      ...rendered,
      subject: `[Test] ${rendered.subject}`,
      to: "test mailbox",
      fromName: settings.fromName,
      fromAddress: settings.fromAddress,
    });
  }
  redirect(`/b/${client.slug}/emails/${id}?tested=1${leadId ? `&lead=${leadId}` : ""}`);
}

/** Adds a blank email to the end of the sequence and opens it for editing. */
export async function addSequenceEmail(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const id = await withSession(db, session, async (tx) => {
    const existing = await tx.select().from(emails).where(eq(emails.kind, "sequence")).orderBy(asc(emails.position));
    const last = existing.at(-1);
    const [created] = await tx
      .insert(emails)
      .values({
        clientId: client.id,
        key: `seq-${Date.now().toString(36)}`,
        kind: "sequence",
        position: (last?.position ?? 0) + 1,
        subject: "New email",
        body: "Hi {first_name},\n\nWrite the email here.",
        active: false,
      })
      .returning({ id: emails.id });
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "email.added", target: created.id });
    return created.id;
  });
  redirect(`/b/${client.slug}/emails/${id}?added=1`);
}

/** Moves a sequence email one place earlier or later. The sequence goes one a day in order, so this is all there is to set. */
export async function moveEmail(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const id = text(form, "id");
  const up = text(form, "direction") === "up";
  await withSession(db, session, async (tx) => {
    const sequence = await tx.select().from(emails).where(eq(emails.kind, "sequence")).orderBy(asc(emails.position));
    const index = sequence.findIndex((e) => e.id === id);
    const other = sequence[up ? index - 1 : index + 1];
    if (index < 0 || !other) return;
    const mine = sequence[index];
    await tx.update(emails).set({ position: other.position }).where(eq(emails.id, mine.id));
    await tx.update(emails).set({ position: mine.position }).where(eq(emails.id, other.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "email.moved", target: id });
  });
  redirect(`/b/${client.slug}/emails`);
}

/** Deletes a sequence email that has never been sent. One that has been sent can only be switched off. */
export async function deleteEmail(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const id = text(form, "id");
  const deleted = await withSession(db, session, async (tx) => {
    const [email] = await tx.select().from(emails).where(eq(emails.id, id));
    const [{ sent }] = await tx.select({ sent: sql<number>`count(*)::int` }).from(emailSends).where(eq(emailSends.emailId, id));
    if (!email || email.kind !== "sequence" || sent > 0) return false;
    await tx.delete(emails).where(eq(emails.id, id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "email.deleted", target: id, detail: { subject: email.subject } });
    return true;
  });
  redirect(`/b/${client.slug}/emails${deleted ? "?deleted=1" : ""}`);
}
