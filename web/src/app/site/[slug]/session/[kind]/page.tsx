import { notFound } from "next/navigation";
import { calendarDays } from "@/components/site/booking";
import { SessionForm } from "@/components/site/session-form";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { emailSettingsFor } from "@/email/render";
import { bookingCodeOk, isSessionKind, KIND_SAYS, sessionConsentWording, sessionSettingsFor, sessionSlots } from "@/sessions/sessions";
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
  if (!isSessionKind(kind) || typeof code !== "string" || !bookingCodeOk(brand.id, kind, code)) notFound();

  const days = await withSession(await appDb(), siteSession(brand.id), (tx) => sessionSlots(tx, brand, new Date()));
  const minutes = sessionSettingsFor(brand).lengthMinutes;
  const wording = sessionConsentWording(brand.name, emailSettingsFor(brand.name, siteFor(brand)).fromAddress);

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="mb-1 text-2xl font-bold">Book your session with {brand.name}</h1>
      <p className="mb-5 text-neutral-700">
        This is {KIND_SAYS[kind]}. It is on Zoom, takes about {minutes} minutes and is recorded on video.
      </p>
      <SessionForm slug={slug} kind={kind} code={code} days={calendarDays(days)} consentWording={wording} privacyLink={`/site/${slug}/privacy`} />
    </div>
  );
}
