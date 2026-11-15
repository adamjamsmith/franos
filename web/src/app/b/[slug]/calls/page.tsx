import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { isMonth, monthGrid, monthLabel, monthOf, shiftMonth } from "@/calls/month";
import { toClock, ukMinutes, ukWhen } from "@/calls/time";
import { LeadPanel } from "@/components/lead-panel";
import { Notice } from "@/components/ui";
import { withSession } from "@/db/context";
import { calls, leads } from "@/db/schema";
import { ukDay } from "@/email/render";
import { isDev } from "@/lib/dev-mailbox";
import { requireBrand } from "@/lib/session";
import { runTimedNow } from "./actions";

const line = "border-neutral-300 dark:border-neutral-700";
const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const navButton = `rounded-md border px-2.5 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 ${line}`;
const chosen = "bg-neutral-900 text-white hover:!bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:!bg-white";
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Every call, as a month calendar that can be paged through or as a list. Each call is coloured by
 * where it stands; clicking one opens the lead in a pop-up, where the call is managed.
 */
export default async function CallsPage({ params, searchParams }: PageProps<"/b/[slug]/calls">) {
  const { slug } = await params;
  const query = await searchParams;
  const access = await requireBrand(slug);
  const { session, db, role } = access;
  const canManage = role === "owner" || role === "consultant";
  const now = new Date();
  const today = ukDay(now);
  const month = isMonth(query.month) ? query.month : monthOf(now);
  const listView = query.view === "list";
  const here = listView ? `/b/${slug}/calls?view=list` : `/b/${slug}/calls?month=${month}`;

  const rows = await withSession(db, session, (tx) =>
    tx
      .select({ call: calls, firstName: leads.firstName, lastName: leads.lastName })
      .from(calls)
      .innerJoin(leads, eq(leads.id, calls.leadId))
      .orderBy(asc(calls.startsAt))
      .limit(2000),
  );
  const name = (row: (typeof rows)[number]) => [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed lead";
  const byDay = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = ukDay(row.call.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }
  // The list: what is coming up first, soonest at the top, then what has been, most recent first.
  const upcoming = rows.filter((r) => r.call.status === "booked" && r.call.endsAt > now);
  const past = rows.filter((r) => !(r.call.status === "booked" && r.call.endsAt > now)).reverse();
  const waiting = rows.filter((r) => r.call.status === "attended" && !r.call.outcome);
  const showed = rows.filter((r) => r.call.status === "attended").length;
  const noShows = rows.filter((r) => r.call.status === "no_show").length;
  const showRate = showed + noShows > 0 ? Math.round((showed / (showed + noShows)) * 100) : null;

  /** How a call looks on the calendar, and what it says when the mouse rests on it. */
  const look = (call: (typeof rows)[number]["call"]): { colour: string; says: string } => {
    if (call.status === "cancelled") return { colour: "text-neutral-500 line-through", says: "Cancelled" };
    if (call.status === "no_show") return { colour: "bg-red-500/20", says: "No-show" };
    if (call.status === "attended") {
      if (!call.outcome) return { colour: "bg-amber-500/20", says: "Attended, outcome needed" };
      return call.goodCall ? { colour: "bg-green-500/20", says: "Good call" } : { colour: "bg-red-500/20", says: "Not a good call" };
    }
    return call.endsAt > now
      ? { colour: "bg-neutral-200 dark:bg-neutral-800", says: "Booked" }
      : { colour: "bg-amber-500/20", says: "Waiting to hear whether it happened" };
  };

  const openId = typeof query.lead === "string" && /^[0-9a-f-]{36}$/i.test(query.lead) ? query.lead : null;
  const panel = openId ? await LeadPanel({ slug, leadId: openId, base: `${here}&lead=${openId}`, query, access }) : null;

  return (
    <div className="flex flex-col gap-4">
      {typeof query.ran === "string" && (
        <Notice kind="ok">
          Timed work run: {query.ran} thing{query.ran === "1" ? "" : "s"} done.{isDev && " Any emails are in the test mailbox."}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-semibold">{listView ? "All calls" : monthLabel(month)}</h2>
        {!listView && (
          <>
            <Link href={`/b/${slug}/calls?month=${shiftMonth(month, -1)}`} scroll={false} aria-label="Previous month" className={navButton}>
              ‹
            </Link>
            <Link href={`/b/${slug}/calls`} scroll={false} className={navButton}>
              Today
            </Link>
            <Link href={`/b/${slug}/calls?month=${shiftMonth(month, 1)}`} scroll={false} aria-label="Next month" className={navButton}>
              ›
            </Link>
          </>
        )}
        <span className="ml-2 flex">
          <Link href={`/b/${slug}/calls?month=${month}`} scroll={false} aria-current={listView ? undefined : "page"} className={`${navButton} rounded-r-none ${listView ? "" : chosen}`}>
            Calendar
          </Link>
          <Link href={`/b/${slug}/calls?view=list`} scroll={false} aria-current={listView ? "page" : undefined} className={`${navButton} -ml-px rounded-l-none ${listView ? chosen : ""}`}>
            List
          </Link>
        </span>
        <span className={`${small} ml-auto`}>
          {showRate === null ? "No calls have happened yet" : `Show rate ${showRate}% · ${showed} attended · ${noShows} no-show`}
        </span>
      </div>

      {waiting.length > 0 && (
        <p className="rounded-md bg-amber-500/15 px-3 py-2 text-sm">
          <span className="font-medium">Outcome needed:</span>{" "}
          {waiting.map((row, i) => (
            <span key={row.call.id}>
              {i > 0 && " · "}
              <Link href={`${here}&lead=${row.call.leadId}`} scroll={false} className="underline">
                {name(row)}
              </Link>
            </span>
          ))}
        </p>
      )}

      {listView ? (
        <div className={`overflow-hidden rounded-md border text-sm ${line}`}>
          {rows.length === 0 && <p className={`${small} px-3 py-2`}>No calls.</p>}
          {[...upcoming, ...past].map((row) => {
            const { colour, says } = look(row.call);
            return (
              <Link
                key={row.call.id}
                href={`${here}&lead=${row.call.leadId}`}
                scroll={false}
                className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t px-3 py-2 first:border-t-0 hover:bg-neutral-100 dark:hover:bg-neutral-900 ${line}`}
              >
                <span className="w-64 shrink-0 tabular-nums">{ukWhen(row.call.startsAt)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{name(row)}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs ${colour}`}>{says}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={`overflow-hidden rounded-md border ${line}`}>
          <div className={`grid grid-cols-7 border-b ${line}`}>
            {weekdays.map((day) => (
              <p key={day} className={`${small} px-2 py-1.5`}>
                {day}
              </p>
            ))}
          </div>
          {monthGrid(month).map((week) => (
            <div key={week[0].key} className={`grid grid-cols-7 border-t first:border-t-0 ${line}`}>
              {week.map((day, index) => (
                <div key={day.key} className={`min-h-24 min-w-0 p-1.5 ${index > 0 ? `border-l ${line}` : ""} ${day.inMonth ? "" : "bg-neutral-100 dark:bg-neutral-900"}`}>
                  <p
                    className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      day.key === today
                        ? "bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900"
                        : day.inMonth
                          ? "text-neutral-600 dark:text-neutral-300"
                          : "text-neutral-400 dark:text-neutral-600"
                    }`}
                  >
                    {day.day}
                  </p>
                  <div className="flex flex-col gap-1">
                    {(byDay.get(day.key) ?? []).map((row) => {
                      const { colour, says } = look(row.call);
                      return (
                        <Link
                          key={row.call.id}
                          href={`${here}&lead=${row.call.leadId}`}
                          scroll={false}
                          title={`${name(row)} · ${ukWhen(row.call.startsAt)} · ${says}`}
                          className={`block truncate rounded px-1.5 py-0.5 text-xs hover:ring-1 hover:ring-neutral-900 dark:hover:ring-white ${colour}`}
                        >
                          <span className="tabular-nums text-neutral-600 dark:text-neutral-300">{toClock(ukMinutes(row.call.startsAt))}</span> {name(row)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {isDev && canManage && (
        <form action={runTimedNow} className={`flex flex-wrap items-center gap-2 ${small}`}>
          <input type="hidden" name="slug" value={slug} />
          <span>Testing only: send reminders as if</span>
          <input name="hoursAhead" type="number" min={0} defaultValue={0} aria-label="Hours ahead" className={`w-16 rounded-md border bg-transparent px-2 py-1 text-xs ${line}`} />
          <span>hours have passed</span>
          <button className={navButton}>Run</button>
        </form>
      )}

      {panel && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-3 sm:p-6">
          <Link href={here} scroll={false} aria-label="Close" className="fixed inset-0 cursor-default" />
          <div className="relative mx-auto w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl sm:p-6 dark:bg-neutral-950">
            <Link
              href={here}
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
