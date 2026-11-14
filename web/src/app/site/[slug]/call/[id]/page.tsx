import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { slotsOnOffer, upcomingCall } from "@/calls/calls";
import { ukWhen } from "@/calls/time";
import { bookingProblems, calendarDays, callPath, personName } from "@/components/site/booking";
import { BookingCalendar } from "@/components/site/booking-calendar";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { calls, leads } from "@/db/schema";
import { sign, signatureOk } from "@/email/render";
import { publicBrand } from "@/site/brand";
import { siteSession } from "@/site/leads";
import { cancelMine, pickTime } from "../../actions";

const notices: Record<string, string> = {
  booked: "Your call is booked. We have emailed you the details.",
  moved: "Your call has been moved. We have emailed you the new time.",
  cancelled: "Your call has been cancelled.",
};

/**
 * A lead's own page for one call: the details, and where they change or cancel it.
 * Reached from the signed link in their emails, so it needs no login and cannot be guessed.
 */
export default async function CallPage({ params, searchParams }: PageProps<"/site/[slug]/call/[id]">) {
  const { slug, id } = await params;
  const query = await searchParams;
  const signature = typeof query.s === "string" ? query.s : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !signatureOk(`call|${id}`, signature)) notFound();
  const brand = await publicBrand(slug);
  const now = new Date();

  const found = await withSession(await appDb(), siteSession(brand.id), async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, id));
    if (!call) return null;
    const [lead] = await tx
      .select({ firstName: leads.firstName, lastName: leads.lastName, email: leads.email })
      .from(leads)
      .where(eq(leads.id, call.leadId));
    return {
      call,
      firstName: lead?.firstName ?? "",
      person: { name: lead ? personName(lead) : "", email: lead?.email ?? "" },
      current: await upcomingCall(tx, call.leadId, now),
      days: await slotsOnOffer(tx, brand, now, call.leadId),
    };
  });
  if (!found) notFound();
  const { call, current } = found;
  // The time they already have is not offered back to them.
  const days = found.days
    .map((d) => ({ ...d, slots: d.slots.filter((slot) => slot.getTime() !== current?.startsAt.getTime()) }))
    .filter((d) => d.slots.length > 0);
  const live = call.status === "booked" && call.endsAt > now;
  const minutes = Math.round((call.endsAt.getTime() - call.startsAt.getTime()) / 60_000);
  const done = typeof query.done === "string" ? notices[query.done] : undefined;
  const problem = typeof query.problem === "string" ? bookingProblems[query.problem] : undefined;

  const picker = (
    <BookingCalendar
      action={pickTime}
      hidden={{ slug, callId: call.id, s: signature }}
      days={calendarDays(days)}
      minutes={minutes}
      person={found.person}
      confirmLabel={live ? "Move call" : "Book call"}
      formLink={`/site/${slug}#sign-up`}
    />
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {done && <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-green-900">{done}</p>}
      {problem && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-900">{problem}</p>}

      {live ? (
        <>
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              {found.firstName ? `${found.firstName}, your call is booked` : "Your call is booked"}
            </h1>
            <p className="mt-2 text-xl">{ukWhen(call.startsAt)} (UK time)</p>
            <p className="mt-1 text-neutral-600">
              About {minutes} minutes, on Zoom. The call is recorded, so we have an accurate note of what was said.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {call.meetingUrl && (
              <a href={call.meetingUrl} target="_blank" className="rounded-md bg-[var(--brand)] px-4 py-2.5 font-semibold text-white hover:opacity-90">
                Join the call on Zoom
              </a>
            )}
            <a
              href={`/site/${slug}/call/${call.id}/calendar?s=${sign(`call|${call.id}`)}`}
              className="rounded-md border border-neutral-300 px-4 py-2.5 font-semibold hover:bg-neutral-50"
            >
              Add it to my calendar
            </a>
          </div>
          {/* Changing the time stays out of the way until asked for: it opens when "Change the time" is pressed. */}
          <details open={Boolean(problem)} className="text-sm">
            <summary className="cursor-pointer list-none text-neutral-600 underline [&::-webkit-details-marker]:hidden">Change the time</summary>
            <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 text-base shadow-sm sm:p-6">
              <p className="mb-5 text-sm text-neutral-600">Pick a new day and time and your call moves to it.</p>
              {picker}
            </section>
          </details>
          <form action={cancelMine}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="callId" value={call.id} />
            <input type="hidden" name="s" value={signature} />
            <button className="text-sm text-neutral-600 underline">Cancel this call</button>
          </form>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-bold leading-tight">
              {call.status === "cancelled" ? "This call was cancelled" : call.status === "no_show" ? "Sorry we missed you" : "This call has passed"}
            </h1>
            <p className="mt-2 text-neutral-600">It was for {ukWhen(call.startsAt)}.</p>
          </div>
          {current ? (
            <p>
              You have a call booked for <strong>{ukWhen(current.startsAt)}</strong>.{" "}
              <Link href={callPath(slug, current.id)} className="underline">
                See the details
              </Link>
            </p>
          ) : (
            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">Pick another time</h2>
              <p className="mb-5 text-sm text-neutral-600">Pick a day and a time for a call on Zoom.</p>
              {picker}
            </section>
          )}
        </>
      )}
    </div>
  );
}
