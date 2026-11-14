import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { callSettingsFor } from "@/calls/slots";
import { ukWhen } from "@/calls/time";
import { Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { withSession } from "@/db/context";
import { calls, leads } from "@/db/schema";
import { isDev } from "@/lib/dev-mailbox";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import { pretendHappened, runTimedNow, staffCancel, staffOutcome } from "./actions";


export default async function CallsPage({ params, searchParams }: PageProps<"/b/[slug]/calls">) {
  const { slug } = await params;
  const query = await searchParams;
  const { session, db, client, role } = await requireBrand(slug);
  const canManage = role === "owner" || role === "consultant";
  const settings = callSettingsFor(siteFor(client));
  const now = new Date();

  const rows = await withSession(db, session, (tx) =>
    tx
      .select({ call: calls, firstName: leads.firstName, lastName: leads.lastName, fitScore: leads.fitScore })
      .from(calls)
      .innerJoin(leads, eq(leads.id, calls.leadId))
      .orderBy(desc(calls.startsAt))
      .limit(300),
  );
  const name = (row: (typeof rows)[number]) => [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed lead";
  const upcoming = rows.filter((r) => r.call.status === "booked" && r.call.endsAt > now).reverse();
  const past = rows.filter((r) => !(r.call.status === "booked" && r.call.endsAt > now));
  const waiting = rows.filter((r) => r.call.status === "attended" && !r.call.outcome);
  const showed = rows.filter((r) => r.call.status === "attended").length;
  const noShows = rows.filter((r) => r.call.status === "no_show").length;
  const showRate = showed + noShows > 0 ? Math.round((showed / (showed + noShows)) * 100) : null;

  const statusText = (call: (typeof rows)[number]["call"]) => {
    if (call.status === "attended") {
      const result = call.outcome ? (call.goodCall ? " · good call" : " · not a good call") : " · how did it go?";
      return `Showed${call.durationMinutes ? ` (${call.durationMinutes} min)` : ""}${result}`;
    }
    if (call.status === "no_show") return "No-show";
    if (call.status === "cancelled") return "Cancelled";
    return "Waiting to hear from Zoom";
  };

  return (
    <div className="flex flex-col gap-10">
      {query.saved && <Notice kind="ok">Saved.</Notice>}
      {query.call === "cancelled" && <Notice kind="ok">Call cancelled. The lead and the consultant have been told.</Notice>}
      {query.call === "marked" && <Notice kind="ok">Call updated.</Notice>}
      {typeof query.ran === "string" && (
        <Notice kind="ok">
          Timed work run: {query.ran} thing{query.ran === "1" ? "" : "s"} done.{isDev && " Any emails are in the test mailbox."}
        </Notice>
      )}

      {waiting.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <p className="mb-1 font-semibold">
            {waiting.length} call{waiting.length === 1 ? "" : "s"} waiting for &quot;How did it go?&quot;
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {waiting.map((row) => (
              <li key={row.call.id}>
                <Link href={`/b/${slug}/leads/${row.call.leadId}#calls`} className="underline">
                  {name(row)}, {ukWhen(row.call.startsAt)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold">Upcoming calls</h2>
        <p className="mb-3 text-sm text-neutral-500">
          {settings.lengthMinutes}-minute calls on Zoom. Times are UK time. To book a call for a lead, open the lead.{role === "owner" && (
            <>
              {" "}
              <Link href={`/b/${slug}/settings/calls`} className="underline">
                Change the hours and call length
              </Link>
            </>
          )}
        </p>
        {upcoming.length === 0 ? (
          <p className="text-sm">No calls are booked.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2">When</th>
                  <th>Lead</th>
                  <th>Fit</th>
                  <th>Zoom</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((row) => (
                  <tr key={row.call.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="py-2">{ukWhen(row.call.startsAt)}</td>
                    <td>
                      <Link href={`/b/${slug}/leads/${row.call.leadId}`} className="font-medium underline">
                        {name(row)}
                      </Link>
                    </td>
                    <td>{row.fitScore ?? "—"}</td>
                    <td>
                      {row.call.meetingUrl && (
                        <a href={row.call.meetingUrl} target="_blank" className="underline">
                          Join
                        </a>
                      )}
                    </td>
                    <td className="text-right">
                      {canManage && (
                        <form action={staffCancel}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="callId" value={row.call.id} />
                          <button className={quietButtonClass}>Cancel</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Past calls</h2>
        <p className="mb-3 text-sm text-neutral-500">
          {showRate === null
            ? "The show rate appears here once calls have happened."
            : `Show rate: ${showRate}% (${showed} showed, ${noShows} did not).`}
        </p>
        {past.length === 0 ? (
          <p className="text-sm">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2">When</th>
                  <th>Lead</th>
                  <th>What happened</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {past.map((row) => (
                  <tr key={row.call.id} className="border-t border-neutral-200 align-top dark:border-neutral-800">
                    <td className="py-2">{ukWhen(row.call.startsAt)}</td>
                    <td>
                      <Link href={`/b/${slug}/leads/${row.call.leadId}`} className="font-medium underline">
                        {name(row)}
                      </Link>
                    </td>
                    <td>
                      {statusText(row.call)}
                      {row.call.transcript ? " · transcript saved" : ""}
                    </td>
                    <td className="py-1 text-right">
                      {canManage && row.call.status !== "cancelled" && (
                        <form action={staffOutcome} className="flex justify-end gap-2">
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="callId" value={row.call.id} />
                          {row.call.status !== "attended" && (
                            <button name="outcome" value="showed" className={quietButtonClass}>
                              Mark as showed
                            </button>
                          )}
                          {row.call.status !== "no_show" && (
                            <button name="outcome" value="no_show" className={quietButtonClass}>
                              Mark as no-show
                            </button>
                          )}
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isDev && canManage && (
        <section className="max-w-xl rounded-md border border-dashed border-neutral-400 p-4">
          <h2 className="mb-1 text-lg font-semibold">Testing tools (this computer only)</h2>
          <p className="mb-3 text-sm text-neutral-500">
            There is no Zoom account yet, so these stand in for time passing and for Zoom reporting back.
          </p>
          <form action={runTimedNow} className="mb-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="slug" value={slug} />
            <Field label="Send reminders as if this many hours have passed">
              <input name="hoursAhead" type="number" min={0} defaultValue={0} className={`${inputClass} w-32`} />
            </Field>
            <button className={quietButtonClass}>Run timed work</button>
          </form>
          {upcoming.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {upcoming.map((row) => (
                <li key={row.call.id}>
                  <form action={pretendHappened} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="callId" value={row.call.id} />
                    <span>
                      {name(row)}, {ukWhen(row.call.startsAt)}:
                    </span>
                    <button name="outcome" value="showed" className={quietButtonClass}>
                      Pretend this call has happened
                    </button>
                    <button name="outcome" value="no_show" className={quietButtonClass}>
                      Pretend they did not show
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
