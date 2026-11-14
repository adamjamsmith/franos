import { and, eq } from "drizzle-orm";
import { type Db, type Session, withSession } from "../db/context";
import { consents, leadEvents, leads, metaEvents } from "../db/schema";
import { bump } from "./track";
import { formFor, scoreFit, siteFor } from "./config";

type Brand = { id: string; name: string; site: unknown; form: unknown };

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postcode: string;
  why: string;
  answers: Record<string, string>;
  consent: boolean;
  whatsapp: boolean;
  utm: Record<string, string>;
  /** A hidden field real people never fill in. */
  honeypot: string;
};

export type SignUpResult =
  | { ok: true; leadId: string; isNew: boolean; fitScore: number }
  | { ok: false; reason: "spam" | "consent" | "details" | "answers" };

/** The session the public pages use: one brand, no person. */
export const siteSession = (clientId: string): Session => ({ userId: "site", role: "site", clientId });

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];

/**
 * Records a sign-up from the public form.
 * One lead per email per brand: signing up again updates the lead and adds to its timeline.
 */
export async function registerLead(db: Db, brand: Brand, input: SignUpInput): Promise<SignUpResult> {
  if (input.honeypot.trim() !== "") return { ok: false, reason: "spam" };
  if (!input.consent) return { ok: false, reason: "consent" };
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  if (!firstName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || input.phone.replace(/\D/g, "").length < 10) {
    return { ok: false, reason: "details" };
  }

  const form = formFor(brand);
  const answers: Record<string, string> = {};
  for (const q of form.questions) {
    const value = input.answers[q.id];
    if (!q.options.some((o) => o.value === value)) return { ok: false, reason: "answers" };
    answers[q.id] = value;
  }
  if (input.why.trim()) answers.why = input.why.trim().slice(0, 2000);

  const { score, detail } = scoreFit(form, answers);
  const utm = Object.fromEntries(
    UTM_KEYS.filter((k) => input.utm[k]).map((k) => [k, String(input.utm[k]).slice(0, 200)]),
  );
  const site = siteFor(brand);
  const values = {
    firstName,
    lastName: input.lastName.trim() || null,
    phone: input.phone.trim(),
    postcode: input.postcode.trim() || null,
    answers,
    fitScore: score,
    fitDetail: detail,
    whatsappOptIn: input.whatsapp,
  };

  return withSession(db, siteSession(brand.id), async (tx) => {
    const [existing] = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.clientId, brand.id), eq(leads.email, email)));

    let leadId: string;
    if (existing) {
      leadId = existing.id;
      // Keep the ad that first brought them in.
      await tx.update(leads).set(values).where(eq(leads.id, leadId));
    } else {
      const [created] = await tx
        .insert(leads)
        .values({ clientId: brand.id, email, utm, ...values })
        .returning({ id: leads.id });
      leadId = created.id;
    }

    await tx.insert(consents).values({
      clientId: brand.id,
      leadId,
      kind: "contact_recording_meta",
      wording: site.consentWording,
      granted: true,
    });
    if (input.whatsapp) {
      await tx.insert(consents).values({
        clientId: brand.id,
        leadId,
        kind: "whatsapp",
        wording: site.whatsappWording,
        granted: true,
      });
    }
    await tx.insert(leadEvents).values({
      clientId: brand.id,
      leadId,
      type: existing ? "signed_up_again" : "signed_up",
      data: { fitScore: score, utm },
    });
    // One Lead event per lead, however many times they submit the form.
    await tx
      .insert(metaEvents)
      .values({
        clientId: brand.id,
        leadId,
        eventName: "Lead",
        eventId: `lead-${leadId}`,
        payload: { fitScore: score, utm },
      })
      .onConflictDoNothing({ target: [metaEvents.clientId, metaEvents.eventId] });
    await bump(tx, brand.id, "form_submit");

    return { ok: true as const, leadId, isNew: !existing, fitScore: score };
  });
}
