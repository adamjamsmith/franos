import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ukWhen } from "@/calls/time";
import { calendarDays } from "@/components/site/booking";
import { SessionMove } from "@/components/site/session-move";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { recordingSessions } from "@/db/schema";
import { sign } from "@/email/render";
import { emailSettingsFor } from "@/email/render";
import { hasPermission, KIND_LABELS, sessionConsentWording, sessionLinkOk, sessionSlots, type SessionKind } from "@/sessions/sessions";
import { siteFor } from "@/site/config";
import { publicBrand } from "@/site/brand";
import { siteSession } from "@/site/leads";
import { agreeMine, cancelMine, moveMine } from "../../actions";

const notices: Record<string, string> = {
  booked: "Your session is booked. We have emailed you the details.",
  moved: "Your session has been moved. We have emailed you the new time.",
  cancelled: "Your session has been cancelled.",
  agreed: "Thank you. That is saved.",
};
const problems: Record<string, string> = {
  taken: "Sorry, someone has just taken that time. Please pick another.",
  time: "That time is no longer available. Please pick another.",
};

/**
 * The page for one booked session: its details, and where the person moves or cancels it.
 * Reached from the signed link in their emails, so it needs no login and cannot be guessed.
 */
export default async function BookedSessionPage({ params, searchParams }: PageProps<"/site/[slug]/session/booked/[id]">) {
  const { slug, id } = await params;
  const query = await searchParams;
  const signature = typeof query.s === "string" ? query.s : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !sessionLinkOk(id, signature)) notFound();
  const brand = await publicBrand(slug);
  const now = new Date();

  const found = await withSession(await appDb(), siteSession(brand.id), async (tx) => {
    const [session] = await tx.select().from(recordingSessions).where(eq(recordingSessions.id, id));
    if (!session) return null;
    const open = session.status === "booked" && session.startsAt > now;
    return { session, open, days: open ? await sessionSlots(tx, brand, now, session.kind, session.id) : [] };
  });
  if (!found) notFound();
  const { session, open, days } = found;
  const done = typeof query.done === "string" ? notices[query.done] : undefined;
  const problem = typeof query.problem === "string" ? problems[query.problem] : undefined;
  const hidden = (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="sessionId" value={session.id} />
      <input type="hidden" name="s" value={signature} />
    </>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      {done && <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">{done}</p>}
      {problem && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{problem}</p>}
      <div>
        <h1 className="mb-1 text-2xl font-bold">
          {KIND_LABELS[session.kind as SessionKind]} with {brand.name}
        </h1>
        {session.status === "cancelled" ? (
          <p className="text-neutral-700">This session was cancelled.</p>
        ) : (
          <p className="text-neutral-700">
            <strong>{ukWhen(session.startsAt)}</strong>, on Zoom. It is recorded on video.
          </p>
        )}
      </div>

      {session.status !== "cancelled" && !hasPermission(session) && (
        <form action={agreeMine} className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          {hidden}
          <label className="flex items-start gap-3 text-sm leading-relaxed text-neutral-800">
            <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {sessionConsentWording(brand.name, emailSettingsFor(brand.name, siteFor(brand)).fromAddress)}{" "}
              <a href={`/site/${slug}/privacy`} target="_blank" className="underline">
                Privacy notice
              </a>
            </span>
          </label>
          <button className="self-start rounded-full bg-[var(--brand)] px-5 py-2.5 font-semibold text-white hover:opacity-90">I agree</button>
        </form>
      )}

      {open && (
        <>
          <p className="flex flex-wrap gap-x-5 gap-y-2">
            {session.meetingUrl && (
              <a href={session.meetingUrl} target="_blank" className="rounded-full bg-[var(--brand)] px-5 py-2.5 font-semibold text-white hover:opacity-90">
                Join on Zoom
              </a>
            )}
            <a href={`/site/${slug}/session/booked/${session.id}/calendar?s=${sign(`session|${session.id}`)}`} className="self-center underline">
              Add it to my calendar
            </a>
          </p>
          <div className="border-t border-neutral-200 pt-4">
            <SessionMove action={moveMine} hidden={{ slug, sessionId: session.id, s: signature }} days={calendarDays(days)} />
          </div>
          <form action={cancelMine}>
            {hidden}
            <button className="text-sm text-neutral-600 underline">Cancel this session</button>
          </form>
        </>
      )}
    </div>
  );
}
