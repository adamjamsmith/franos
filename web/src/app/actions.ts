"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, gte, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb, appDb } from "@/db";
import { withSession } from "@/db/context";
import { auditLog, clients, memberships, sessions, users } from "@/db/schema";
import { addStarterEmails } from "@/email/send";
import { getAuth } from "@/lib/auth";
import { currentLogin, requireBrand, requireUser } from "@/lib/session";
import { type SiteContent, siteFor, type Video } from "@/site/config";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const emailOf = (form: FormData) => text(form, "email").toLowerCase();

/** First run only: creates the Owner account when nobody exists yet. */
export async function createFirstOwner(form: FormData) {
  const db = await adminDb();
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n > 0) redirect("/login");
  const name = text(form, "name");
  const email = emailOf(form);
  if (!name || !email.includes("@")) redirect("/setup?error=1");
  await db.insert(users).values({ id: randomUUID(), name, email, isOwner: true });
  const auth = await getAuth();
  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  redirect(`/login?email=${encodeURIComponent(email)}`);
}

/** Login step 1: send a code to the email address. Always looks the same, whether or not the address is known. */
export async function sendLoginCode(form: FormData) {
  const email = emailOf(form);
  if (!email.includes("@")) redirect("/login?error=email");
  const auth = await getAuth();
  try {
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  } catch {
    // Unknown addresses fail silently so the page never reveals who has an account.
  }
  redirect(`/login?email=${encodeURIComponent(email)}`);
}

/** Login step 1b: check the emailed code. */
export async function checkLoginCode(form: FormData) {
  const email = emailOf(form);
  const otp = text(form, "code");
  const auth = await getAuth();
  try {
    await auth.api.signInEmailOTP({ body: { email, otp }, headers: await headers() });
  } catch {
    redirect(`/login?email=${encodeURIComponent(email)}&error=code`);
  }
  redirect("/brands");
}

/** Login step 2: check the authenticator-app code and unlock this session. Also completes first-time setup. */
export async function checkTwoStepCode(form: FormData) {
  const login = await currentLogin();
  if (!login) redirect("/login");
  const back = text(form, "back") === "setup" ? "/two-step/setup" : "/two-step";
  const auth = await getAuth();
  // Checking the code can replace the session with a new one (it does on first-time setup).
  // So unlock the session the library hands back, plus any session it created for this person during the check.
  const startedAt = new Date(Date.now() - 1000);
  let token: string;
  try {
    const result = await auth.api.verifyTOTP({
      body: { code: text(form, "code").replace(/\s/g, "") },
      headers: await headers(),
    });
    token = result.token;
  } catch {
    redirect(`${back}?error=1`);
  }
  const db = await adminDb();
  await db
    .update(sessions)
    .set({ twoStepVerifiedAt: new Date() })
    .where(
      and(eq(sessions.userId, login.user.id), or(eq(sessions.token, token), gte(sessions.createdAt, startedAt))),
    );
  redirect(back === "/two-step/setup" ? "/two-step/codes" : "/brands");
}

export async function signOut() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Owner only: add a new franchise opportunity. */
export async function createBrand(form: FormData) {
  const login = await requireUser();
  if (!login.user.isOwner) redirect("/brands");
  const name = text(form, "name");
  const avatarType = text(form, "avatarType");
  const pounds = Number(text(form, "targetCost"));
  const slug = slugify(name);
  if (!name || !slug) redirect("/brands?error=name");

  const db = await appDb();
  try {
    await withSession(db, { userId: login.user.id, role: "owner", clientId: null }, async (tx) => {
      const [brand] = await tx
        .insert(clients)
        .values({
          name,
          slug,
          avatarType,
          targetCostPerSigningPence: Number.isFinite(pounds) && pounds > 0 ? Math.round(pounds * 100) : null,
        })
        .returning();
      // The audit line belongs to the new brand, so switch into it for this one insert.
      await tx.execute(sql`select set_config('app.client_id', ${brand.id}, true)`);
      await tx.insert(auditLog).values({ clientId: brand.id, actorUserId: login.user.id, action: "brand.created" });
      await addStarterEmails(tx, brand.id);
    });
  } catch {
    redirect("/brands?error=exists");
  }
  redirect(`/b/${slug}`);
}

/** Owner only: change a brand's settings. */
export async function updateBrand(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  if (role !== "owner") redirect(`/b/${client.slug}/settings`);
  const pounds = Number(text(form, "targetCost"));
  await withSession(db, session, async (tx) => {
    await tx
      .update(clients)
      .set({
        name: text(form, "name") || client.name,
        avatarType: text(form, "avatarType") || client.avatarType,
        domain: text(form, "domain") || null,
        targetCostPerSigningPence: Number.isFinite(pounds) && pounds > 0 ? Math.round(pounds * 100) : null,
      })
      .where(eq(clients.id, client.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "brand.updated" });
  });
  redirect(`/b/${client.slug}/settings?saved=1`);
}

/** Owner or the brand's client: give someone access to this brand. */
export async function addPerson(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  const base = `/b/${client.slug}/settings/people`;
  if (role === "consultant") redirect(base);
  const name = text(form, "name");
  const email = emailOf(form);
  const newRole = text(form, "role") === "client" ? "client" : "consultant";
  if (!name || !email.includes("@")) redirect(`${base}?error=details`);

  // Someone may already have a login from another brand. That lookup is outside any one brand, so it uses the trusted connection.
  const admin = await adminDb();
  const [existing] = await admin.select({ id: users.id }).from(users).where(eq(users.email, email));
  try {
    await withSession(db, session, async (tx) => {
      const userId = existing?.id ?? randomUUID();
      if (!existing) await tx.insert(users).values({ id: userId, name, email });
      await tx.insert(memberships).values({ userId, clientId: client.id, role: newRole });
      await tx.insert(auditLog).values({
        clientId: client.id,
        actorUserId: session.userId,
        action: "person.added",
        target: userId,
        detail: { role: newRole },
      });
    });
  } catch {
    redirect(`${base}?error=exists`);
  }
  redirect(`${base}?added=1`);
}

/** Owner or the brand's client: remove someone's access to this brand. */
export async function removePerson(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  const base = `/b/${client.slug}/settings/people`;
  if (role === "consultant") redirect(base);
  const userId = text(form, "userId");
  await withSession(db, session, async (tx) => {
    await tx.delete(memberships).where(and(eq(memberships.userId, userId), eq(memberships.clientId, client.id)));
    await tx.insert(auditLog).values({
      clientId: client.id,
      actorUserId: session.userId,
      action: "person.removed",
      target: userId,
    });
  });
  redirect(base);
}

/** Owner only: change the wording, videos and documents on a brand's public pages. */
export async function updateSiteContent(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  if (role !== "owner") redirect(`/b/${client.slug}/settings`);
  const current = siteFor(client);
  const lines = (key: string) =>
    text(form, key)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const videos: Video[] = lines("videos").flatMap((line, i) => {
    const [title, person, url, chat] = line.split("|").map((part) => part.trim());
    if (!title || !url) return [];
    // A fourth part of "no chat" keeps this franchisee out of the "Want to talk to this person?" email.
    const offerChat = chat && /^no/i.test(chat) ? false : undefined;
    return [{ id: `vt${i + 1}`, title, person: person || undefined, url, ...(offerChat === false ? { offerChat } : {}) }];
  });
  const proofImages = lines("proofImages").flatMap((line) => {
    // A line with a caption and no address is a placeholder box.
    const [url, caption] = line.split("|").map((part) => part.trim());
    return url || caption ? [{ url: url ?? "", ...(caption ? { caption } : {}) }] : [];
  });
  const colour = text(form, "primaryColour");
  const site: SiteContent = {
    ...current,
    primaryColour: /^#[0-9a-f]{6}$/i.test(colour) ? colour : current.primaryColour,
    logoUrl: text(form, "logoUrl"),
    headline: text(form, "headline") || current.headline,
    ticks: lines("ticks"),
    prospectusImage: text(form, "prospectusImage"),
    requirements: lines("requirements"),
    thankYouHeading: text(form, "thankYouHeading") || current.thankYouHeading,
    thankYouText: text(form, "thankYouText"),
    vslUrl: text(form, "vslUrl"),
    videos,
    proofImages,
    documents: {
      prospectus: { ...current.documents.prospectus, url: text(form, "doc_prospectus") },
      "next-steps": { ...current.documents["next-steps"], url: text(form, "doc_next-steps") },
      questions: { ...current.documents.questions, url: text(form, "doc_questions") },
    },
    consentWording: text(form, "consentWording") || current.consentWording,
    whatsappWording: text(form, "whatsappWording") || current.whatsappWording,
    privacyText: text(form, "privacyText"),
    termsText: text(form, "termsText"),
    companyAddress: text(form, "companyAddress"),
    earningsNote: text(form, "earningsNote"),
  };

  await withSession(db, session, async (tx) => {
    await tx.update(clients).set({ site }).where(eq(clients.id, client.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "site.updated" });
  });
  redirect(`/b/${client.slug}/settings?saved=1`);
}
