"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { speedAlert } from "@/calls/alert";
import { bookCall, cancelCall } from "@/calls/calls";
import { appCallDeps } from "@/calls/run";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { calls } from "@/db/schema";
import { sign, signatureOk } from "@/email/render";
import { deliverMail } from "@/email/deliver";
import { sendDueEmails } from "@/email/send";
import { knownLeadId, publicBrand, rememberLead } from "@/site/brand";
import { formFor } from "@/site/config";
import { registerLead, siteSession } from "@/site/leads";
import { type SignUpState, validEmail, validPhone } from "@/site/signup-state";
import { passesTurnstile } from "@/site/spam";

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

/** The visitor's browser and address, as their request reports them. */
async function visitor() {
  const sent = await headers();
  const ip = (sent.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return { userAgent: sent.get("user-agent") ?? "", ip: /^[0-9a-f.:]+$/i.test(ip) ? ip : "" };
}

const KEPT = ["firstName", "lastName", "email", "phone", "postcode", "why", "consent", "whatsapp"];

/**
 * The public sign-up form. If something is wrong it hands back what was typed and which
 * boxes to mark, so the visitor fixes only the mistake.
 */
export async function submitSignUp(_previous: SignUpState, form: FormData): Promise<SignUpState> {
  const slug = text(form, "slug");
  const brand = await publicBrand(slug);
  const questions = formFor(brand).questions;

  const values: Record<string, string> = {};
  for (const key of [...KEPT, ...questions.map((q) => `q_${q.id}`)]) values[key] = text(form, key);
  const fail = (message: string, wrong: string[] = []): SignUpState => ({ message, wrong, values });

  const wrong: string[] = [];
  if (!text(form, "firstName").trim()) wrong.push("firstName");
  if (!validEmail(text(form, "email"))) wrong.push("email");
  if (!validPhone(text(form, "phone"))) wrong.push("phone");
  for (const q of questions) {
    if (!q.options.some((o) => o.value === text(form, `q_${q.id}`))) wrong.push(`q_${q.id}`);
  }
  if (form.get("consent") !== "on") wrong.push("consent");
  if (wrong.length > 0) {
    return fail(wrong.length === 1 ? "One thing needs fixing. It is marked in red below." : "A few things need fixing. They are marked in red below.", wrong);
  }

  if (!(await passesTurnstile(text(form, "cf-turnstile-response")))) {
    return fail("We could not confirm you are a person. Please try again.");
  }

  const answers: Record<string, string> = {};
  for (const q of questions) answers[q.id] = text(form, `q_${q.id}`);
  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign", "term", "content"]) utm[key] = text(form, `utm_${key}`);

  const result = await registerLead(await appDb(), brand, {
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    postcode: text(form, "postcode"),
    why: text(form, "why"),
    answers,
    consent: form.get("consent") === "on",
    whatsapp: form.get("whatsapp") === "on",
    utm,
    honeypot: text(form, "company_website"),
    client: await visitor(),
  });
  if (!result.ok) {
    const reasons = {
      spam: fail("We could not confirm you are a person. Please try again."),
      consent: fail("One thing needs fixing. It is marked in red below.", ["consent"]),
      details: fail("Please check your name, email address and mobile number.", ["firstName", "email", "phone"]),
      answers: fail("Please answer every question."),
    };
    return reasons[result.reason];
  }

  // Missed a must-have: a plain thank-you, and nothing else. No thank-you page, no emails, no booking.
  if (!result.qualified) return { message: "", wrong: [], values: {}, thanks: true };

  // Send the prospectus email straight away. A problem here must never stop the sign-up itself.
  try {
    await sendDueEmails(await appDb(), brand, deliverMail, new Date(), result.leadId);
  } catch (error) {
    console.error("Could not send the prospectus email", error);
  }
  // Tell the consultant about a good-fit lead. Only the first time they sign up.
  if (result.isNew) {
    try {
      await speedAlert(await appDb(), brand, await appCallDeps(brand), result.leadId);
    } catch (error) {
      console.error("Could not send the speed-to-lead alert", error);
    }
  }
  await rememberLead(slug, result.leadId);
  redirect(`/site/${slug}/thank-you`);
}

const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const callPage = (slug: string, callId: string) => `/site/${slug}/call/${callId}?s=${sign(`call|${callId}`)}`;

/** The lead a signed call link belongs to. Nothing is returned unless the signature is right. */
async function leadOfCall(brandId: string, callId: string, signature: string): Promise<string | null> {
  if (!isId(callId) || !signatureOk(`call|${callId}`, signature)) return null;
  const [call] = await withSession(await appDb(), siteSession(brandId), (tx) =>
    tx.select({ leadId: calls.leadId }).from(calls).where(eq(calls.id, callId)),
  );
  return call?.leadId ?? null;
}

/**
 * A lead picks a time. They are known either from their browser (they filled in the form here)
 * or from the signed link to one of their calls. Picking a time while a call is booked moves it.
 */
export async function pickTime(form: FormData) {
  const slug = text(form, "slug");
  const brand = await publicBrand(slug);
  const callId = text(form, "callId");
  const fromCall = callId ? await leadOfCall(brand.id, callId, text(form, "s")) : null;
  const leadId = fromCall ?? (await knownLeadId(slug));
  if (!leadId) redirect(`/site/${slug}#sign-up`);

  const from = text(form, "from");
  const back = (reason: string) =>
    redirect(
      fromCall
        ? `${callPage(slug, callId)}&problem=${reason}`
        : `/site/${slug}/${from === "prospectus" ? "prospectus" : "thank-you"}?booking=${reason}#book`,
    );
  const startsAt = new Date(text(form, "startsAt"));
  if (Number.isNaN(startsAt.getTime())) return back("time");

  const result = await bookCall(await appDb(), siteSession(brand.id), brand, await appCallDeps(brand), { leadId, startsAt, by: "lead", client: await visitor() });
  if (!result.ok) return back(result.reason === "taken" ? "taken" : "time");
  await rememberLead(slug, leadId);
  redirect(`${callPage(slug, result.callId)}&done=${result.moved ? "moved" : "booked"}`);
}

/** A lead cancels their call from the signed link in their emails. */
export async function cancelMine(form: FormData) {
  const slug = text(form, "slug");
  const brand = await publicBrand(slug);
  const callId = text(form, "callId");
  if (!(await leadOfCall(brand.id, callId, text(form, "s")))) redirect(`/site/${slug}`);
  await cancelCall(await appDb(), siteSession(brand.id), brand, await appCallDeps(brand), { callId, by: "lead" });
  redirect(`${callPage(slug, callId)}&done=cancelled`);
}
