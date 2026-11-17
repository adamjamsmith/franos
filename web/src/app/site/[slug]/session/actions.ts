"use server";

import { redirect } from "next/navigation";
import { appDb } from "@/db";
import { emailSettingsFor } from "@/email/render";
import { appSessionDeps } from "@/sessions/run";
import { bookingCodeOk, bookSession, cancelSession, giveGuestPermission, givePermission, guestLinkOk, guestPath, isBookableKind, moveSession, sessionConsentWording, sessionLinkOk, sessionPath } from "@/sessions/sessions";
import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";
import { siteSession } from "@/site/leads";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export type SessionFormState = {
  problem?: "details" | "guests" | "consent" | "time" | "taken";
  values: { firstName: string; lastName: string; email: string; location: string; guests: string; startsAt: string; consent: boolean };
};

/** Books a session from a booking link. On a problem, everything typed is handed back so nothing is lost. */
export async function bookFromLink(_: SessionFormState, form: FormData): Promise<SessionFormState> {
  const slug = text(form, "slug");
  const kind = text(form, "kind");
  const brand = await publicBrand(slug);
  if (!isBookableKind(kind) || !bookingCodeOk(brand.id, kind, text(form, "k"))) redirect(`/site/${slug}`);

  const values = {
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    email: text(form, "email"),
    location: text(form, "location"),
    guests: text(form, "guests"),
    startsAt: text(form, "startsAt"),
    consent: form.get("consent") === "on",
  };
  const startsAt = new Date(values.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { problem: "time", values };

  const result = await bookSession(await appDb(), brand, await appSessionDeps(), {
    kind,
    ...values,
    consentWording: sessionConsentWording(brand.name, emailSettingsFor(brand.name, siteFor(brand)).fromAddress),
    startsAt,
  });
  if (!result.ok) {
    const keepTime = result.reason === "details" || result.reason === "guests" || result.reason === "consent";
    return { problem: result.reason, values: keepTime ? values : { ...values, startsAt: "" } };
  }
  redirect(`${sessionPath(slug, result.sessionId)}&done=booked`);
}

async function mine(form: FormData) {
  const slug = text(form, "slug");
  const sessionId = text(form, "sessionId");
  const brand = await publicBrand(slug);
  if (!isId(sessionId) || !sessionLinkOk(sessionId, text(form, "s"))) redirect(`/site/${slug}`);
  return { slug, sessionId, brand };
}

/** The person moves their own session, from the signed link in their emails. */
export async function moveMine(form: FormData) {
  const { slug, sessionId, brand } = await mine(form);
  const startsAt = new Date(text(form, "startsAt"));
  if (Number.isNaN(startsAt.getTime())) redirect(`${sessionPath(slug, sessionId)}&problem=time`);
  const result = await moveSession(await appDb(), siteSession(brand.id), brand, await appSessionDeps(), { sessionId, startsAt });
  const outcome = result.ok ? "done=moved" : `problem=${result.reason === "taken" ? "taken" : "time"}`;
  redirect(`${sessionPath(slug, sessionId)}&${outcome}`);
}

/** The person ticks the permission box for a session the owner booked for them. */
export async function agreeMine(form: FormData) {
  const { slug, sessionId, brand } = await mine(form);
  if (form.get("consent") === "on") {
    const wording = sessionConsentWording(brand.name, emailSettingsFor(brand.name, siteFor(brand)).fromAddress);
    await givePermission(await appDb(), brand, { sessionId, wording });
  }
  redirect(`${sessionPath(slug, sessionId)}&done=agreed`);
}

/** A guest ticks the permission box on their own page, from the signed link in their emails. */
export async function agreeGuest(form: FormData) {
  const slug = text(form, "slug");
  const sessionId = text(form, "sessionId");
  const guestId = text(form, "g");
  const brand = await publicBrand(slug);
  if (!isId(sessionId) || !isId(guestId) || !guestLinkOk(sessionId, guestId, text(form, "gs"))) redirect(`/site/${slug}`);
  if (form.get("consent") === "on") {
    const wording = sessionConsentWording(brand.name, emailSettingsFor(brand.name, siteFor(brand)).fromAddress);
    await giveGuestPermission(await appDb(), brand, { sessionId, guestId, wording });
  }
  redirect(`${guestPath(slug, sessionId, guestId)}&done=agreed`);
}

/** The person cancels their own session. */
export async function cancelMine(form: FormData) {
  const { slug, sessionId, brand } = await mine(form);
  await cancelSession(await appDb(), siteSession(brand.id), brand, await appSessionDeps(), { sessionId });
  redirect(`${sessionPath(slug, sessionId)}&done=cancelled`);
}
