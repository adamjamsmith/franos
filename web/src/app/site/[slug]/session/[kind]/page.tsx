import { notFound } from "next/navigation";
import { calendarDays } from "@/components/site/booking";
import { SessionForm } from "@/components/site/session-form";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { emailSettingsFor } from "@/email/render";
import { bookingCodeOk, isBookableKind, KIND_LABELS, KIND_SAYS, sessionConsentWording, sessionSettingsFor, sessionSlots } from "@/sessions/sessions";
import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";
import { siteSession } from "@/site/leads";

/**
 * Where someone books a recording session, from a link they were sent. The code in the link is what opens it:
 * without the right code the page does not exist.
 */
export default async function SessionBookingPage({ params, searchParams }: PageProps<"/site/[slug]/session/[kind]">) {
  const { slug, kind } = await params;
  const code = (await searchParams).k;
  const brand = await publicBrand(slug);
  if (!isBookableKind(kind) || typeof code !== "string" || !bookingCodeOk(brand.id, kind, code)) notFound();

  const days = await withSession(await appDb(), siteSession(brand.id), (tx) => sessionSlots(tx, brand, new Date(), kind));
  const minutes = sessionSettingsFor(brand, kind).lengthMinutes;
  const wording = sessionConsentWording(brand.name, emailSettingsFor(brand.name, siteFor(brand)).fromAddress);

  return (
    <SessionForm
      slug={slug}
      kind={kind}
      code={code}
      days={calendarDays(days)}
      brandName={brand.name}
      logoUrl={siteFor(brand).logoUrl}
      title={KIND_LABELS[kind]}
      says={KIND_SAYS[kind]}
      minutes={minutes}
      askLocation={kind === "testimonial"}
      consentWording={wording}
      privacyLink={`/site/${slug}/privacy`}
    />
  );
}
