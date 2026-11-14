import { eq } from "drizzle-orm";
import Link from "next/link";
import { pickTime } from "@/app/site/[slug]/actions";
import { slotsOnOffer, upcomingCall } from "@/calls/calls";
import { callSettingsFor, type DaySlots } from "@/calls/slots";
import { ukDate, ukTime, ukWhen } from "@/calls/time";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { leads } from "@/db/schema";
import { sign } from "@/email/render";
import { siteFor } from "@/site/config";
import { siteSession } from "@/site/leads";
import { BookingCalendar, type CalendarDay } from "./booking-calendar";

type Brand = { id: string; slug: string; name: string; site: unknown };

/** The lead's own page for one call. The signature in the address is what lets them in without a login. */
export const callPath = (slug: string, callId: string) => `/site/${slug}/call/${callId}?s=${sign(`call|${callId}`)}`;

export const bookingProblems: Record<string, string> = {
  taken: "Sorry, someone has just taken that time. Please pick another.",
  time: "That time is no longer available. Please pick another.",
};

/** The times on offer, worded for the calendar. The wording is made here so every browser shows UK time. */
export const calendarDays = (days: DaySlots[]): CalendarDay[] =>
  days.map((d) => ({ day: d.day, label: ukDate(d.slots[0]), slots: d.slots.map((s) => ({ iso: s.toISOString(), label: ukTime(s) })) }));

export const personName = (lead: { firstName: string | null; lastName: string | null }) =>
  [lead.firstName, lead.lastName].filter(Boolean).join(" ");

/**
 * "Schedule a call", as shown on the thank-you and prospectus pages.
 * Someone franOS knows picks a day and time, then confirms. Anyone else is sent to the form first.
 */
export async function BookingSection({
  brand,
  leadId,
  from,
  problem,
}: {
  brand: Brand;
  leadId: string | null;
  from: "thank-you" | "prospectus";
  problem?: string;
}) {
  const slug = brand.slug;
  const now = new Date();
  const minutes = callSettingsFor(siteFor(brand)).lengthMinutes;
  const found = leadId
    ? await withSession(await appDb(), siteSession(brand.id), async (tx) => {
        const [lead] = await tx
          .select({ firstName: leads.firstName, lastName: leads.lastName, email: leads.email })
          .from(leads)
          .where(eq(leads.id, leadId));
        if (!lead) return null;
        return { lead, current: await upcomingCall(tx, leadId, now), days: await slotsOnOffer(tx, brand, now, leadId) };
      })
    : null;

  return (
    <section id="book" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-1 text-xl font-semibold">Schedule a call</h2>
      {!found ? (
        <p className="text-sm text-neutral-600">
          To schedule a call,{" "}
          <Link href={`/site/${slug}#sign-up`} className="underline">
            fill in the short form first
          </Link>
          . It takes a couple of minutes.
        </p>
      ) : found.current ? (
        <p className="text-neutral-700">
          Your call is booked for <strong>{ukWhen(found.current.startsAt)}</strong>.{" "}
          <Link href={callPath(slug, found.current.id)} className="underline">
            See the details, or change it
          </Link>
        </p>
      ) : (
        <>
          <p className="mb-5 text-sm text-neutral-600">Pick a day and a time for a {minutes}-minute call on Zoom.</p>
          {problem && bookingProblems[problem] && (
            <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{bookingProblems[problem]}</p>
          )}
          <BookingCalendar
            action={pickTime}
            hidden={{ slug, from }}
            days={calendarDays(found.days)}
            minutes={minutes}
            person={{ name: personName(found.lead), email: found.lead.email }}
            confirmLabel="Book call"
            formLink={`/site/${slug}#sign-up`}
          />
        </>
      )}
    </section>
  );
}
