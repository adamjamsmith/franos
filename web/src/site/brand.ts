import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { adminDb } from "../db";
import { clients } from "../db/schema";

/** Finds the brand a public page belongs to. Shows "not found" for an unknown address. */
export async function publicBrand(slug: string) {
  const db = await adminDb();
  const [brand] = await db.select().from(clients).where(eq(clients.slug, slug));
  if (!brand) notFound();
  return brand;
}

/**
 * After someone signs up, their browser holds a signed note of which lead they are,
 * so later page views and video plays go on their timeline. It is set only after the
 * consent tick, and cannot be forged or swapped for another lead's.
 */
const cookieName = (slug: string) => `franos_lead_${slug}`;
const sign = (leadId: string) =>
  createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update(leadId)
    .digest("hex");

const previewName = (slug: string) => `franos_preview_${slug}`;

export async function rememberLead(slug: string, leadId: string) {
  // A real sign-up or email click ends any staff preview.
  (await cookies()).delete(previewName(slug));
  (await cookies()).set(cookieName(slug), `${leadId}.${sign(leadId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
}

export async function knownLeadId(slug: string): Promise<string | null> {
  const value = (await cookies()).get(cookieName(slug))?.value;
  if (!value) return null;
  const [leadId, signature] = value.split(".");
  if (!leadId || !signature) return null;
  const expected = Buffer.from(sign(leadId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? leadId : null;
}

/** Makes this browser a brand-new visitor again. */
export async function forgetLead(slug: string) {
  const jar = await cookies();
  jar.delete(cookieName(slug));
  jar.delete(previewName(slug));
}

/**
 * Staff looking at the pages as one of their leads. The marker stops their page views and
 * video plays being added to that lead's record.
 */
export async function previewAs(slug: string, leadId: string) {
  await rememberLead(slug, leadId);
  (await cookies()).set(previewName(slug), "1", { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
}

export async function isPreview(slug: string): Promise<boolean> {
  return (await cookies()).get(previewName(slug))?.value === "1";
}
