import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { callSettingsFor } from "@/calls/slots";
import { ukWhen } from "@/calls/time";
import { LeadPanel } from "@/components/lead-panel";
import { quietButtonClass } from "@/components/ui";
import { withSession } from "@/db/context";
import { calls, leads } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import { REASONS } from "@/work/outcomes";
import { nextAction, placeLead, STAGES } from "@/work/stage";
import { reopen } from "../work-actions";

const daysAgo = (date: Date, now: Date) => {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/**
 * The opportunity board: leads worth working, in the column that matches where the sale stands.
 * A lead joins it by scoring well on the form or by booking a call. Clicking a card opens the
 * lead in a pop-up over the board.
 */
export default async function BoardPage({ params, searchParams }: PageProps<"/b/[slug]/board">) {
  const { slug } = await params;
  const query = await searchParams;
  const access = await requireBrand(slug);
  const { session, db, role, client } = access;
  const canManage = role === "owner" || role === "consultant";
  const now = new Date();
  const goodFitFrom = callSettingsFor(siteFor(client)).alertFit;

  const { allLeads, allCalls } = await withSession(db, session, async (tx) => ({
    allLeads: await tx.select().from(leads).where(eq(leads.qualified, true)).orderBy(desc(leads.fitScore), desc(leads.createdAt)).limit(2000),
    allCalls: await tx.select().from(calls),
  }));
  const callsOf = new Map<string, typeof allCalls>();
  for (const call of allCalls) callsOf.set(call.leadId, [...(callsOf.get(call.leadId) ?? []), call]);

  const cards = allLeads.map((lead) => ({
    lead,
    name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    placed: placeLead(lead, callsOf.get(lead.id) ?? [], now, goodFitFrom),
  }));
  const waiting = cards.filter((c) => c.placed.waitingForOutcome && c.placed.stage !== "closed");
  const closed = cards.filter((c) => c.placed.stage === "closed");
  const notYet = cards.filter((c) => c.placed.stage === "lead").length;

  if (query.closed) {
    return (
      <section>
        <Link href={`/b/${slug}/board`} className="text-sm underline">
          Back to the board
        </Link>
        <h2 className="mb-3 mt-2 text-lg font-semibold">Not going ahead ({closed.length})</h2>
        {closed.length === 0 && <p className="text-sm">Nobody yet.</p>}
        <ul className="flex flex-col text-sm">
          {closed.map(({ lead, name }) => (
            <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-2 dark:border-neutral-800">
              <span>
                <Link href={`/b/${slug}/leads/${lead.id}`} className="font-medium underline">
                  {name}
                </Link>{" "}
                · Fit {lead.fitScore ?? "—"} · {REASONS[lead.outcomeReason ?? ""] ?? "No reason recorded"}
                {lead.outcomeNote ? ` · ${lead.outcomeNote}` : ""}
              </span>
              {canManage && (
                <form action={reopen}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="back" value="board" />
                  <button className={quietButtonClass}>Reopen</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const openId = typeof query.lead === "string" && /^[0-9a-f-]{36}$/i.test(query.lead) ? query.lead : null;
  const panel = openId ? await LeadPanel({ slug, leadId: openId, base: `/b/${slug}/board?lead=${openId}`, query, access }) : null;

  return (
    <div className="flex flex-col gap-5">
      {waiting.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <span className="font-semibold">
            {waiting.length} call{waiting.length === 1 ? "" : "s"} waiting for &quot;How did it go?&quot;:
          </span>{" "}
          {waiting.map(({ lead, name }, i) => (
            <span key={lead.id}>
              {i > 0 && ", "}
              <Link href={`/b/${slug}/board?lead=${lead.id}`} scroll={false} className="underline">
                {name}
              </Link>
            </span>
          ))}
        </section>
      )}

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <div className="grid min-w-[44rem] grid-cols-5 gap-2 md:min-w-0">
          {STAGES.map((stage) => {
            const inColumn = cards.filter((c) => c.placed.stage === stage.key);
            return (
              <section key={stage.key} className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-900">
                <h2 className="px-1 text-sm font-semibold" title={stage.meaning}>
                  {stage.label} <span className="font-normal text-neutral-500">{inColumn.length}</span>
                </h2>
                <p className="mb-2 px-1 text-[11px] leading-snug text-neutral-500">{stage.meaning}</p>
                <ul className="flex flex-col gap-2">
                  {inColumn.map(({ lead, name, placed }) => (
                    <li key={lead.id}>
                      <Link
                        href={`/b/${slug}/board?lead=${lead.id}`}
                        scroll={false}
                        className="block rounded-md border border-neutral-300 bg-white p-2 text-sm hover:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-300"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-medium">{name}</span>
                          <span className="shrink-0 rounded bg-neutral-200 px-1.5 text-xs font-semibold text-neutral-800">{lead.fitScore ?? "—"}</span>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {placed.missedCall && <span className="rounded bg-red-100 px-1.5 text-xs font-medium text-red-900">Missed call</span>}
                          {placed.waitingForOutcome && <span className="rounded bg-amber-100 px-1.5 text-xs font-medium text-amber-900">How did it go?</span>}
                          {placed.goodCall && <span className="rounded bg-green-100 px-1.5 text-xs font-medium text-green-900">Good call</span>}
                        </span>
                        {placed.nextCall && <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">Call: {ukWhen(placed.nextCall)}</span>}
                        {stage.key !== "signed" && <span className="mt-1 block text-xs text-neutral-500">{nextAction(placed)}</span>}
                        <span className="mt-1 block text-xs text-neutral-400">
                          {stage.key === "signed" && lead.outcomeAt
                            ? `Signed ${daysAgo(lead.outcomeAt, now)}`
                            : placed.lastCall && placed.lastCall <= now
                              ? `Last call ${daysAgo(placed.lastCall, now)}`
                              : `Signed up ${daysAgo(lead.createdAt, now)}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {inColumn.length === 0 && <li className="px-1 text-xs text-neutral-400">Nobody here.</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-neutral-500">
        Only opportunities are shown: leads with a Fit score of {goodFitFrom} or more, and anyone who has booked a call.{" "}
        <Link href={`/b/${slug}`} className="underline">
          {notYet} other lead{notYet === 1 ? "" : "s"}
        </Link>{" "}
        · {" "}
        <Link href={`/b/${slug}/board?closed=1`} className="underline">
          Not going ahead ({closed.length})
        </Link>
      </p>

      {panel && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-3 sm:p-6">
          <Link href={`/b/${slug}/board`} scroll={false} aria-label="Close" className="fixed inset-0 cursor-default" />
          <div className="relative mx-auto w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl sm:p-6 dark:bg-neutral-950">
            <Link
              href={`/b/${slug}/board`}
              scroll={false}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              ×
            </Link>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}
