import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { callSettingsFor } from "@/calls/slots";
import { Notice } from "@/components/ui";
import { withSession } from "@/db/context";
import { adSpend, calls, leads, siteStats } from "@/db/schema";
import { ukDay, ukTimeOnDay } from "@/email/render";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import { computeNumbers, costEach, type Counts, periods, share, showRate, TOO_FEW } from "@/work/numbers";
import { saveSpend } from "../work-actions";

const money = (pence: number | null) =>
  pence === null ? "—" : `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: pence >= 10_000 ? 0 : 2 })}`;
const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
/** Midnight UK time at the start of a given UK day. */
const startOfUkDay = (day: string) => ukTimeOnDay(new Date(`${day}T12:00:00Z`), 0, "00:00");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (month: string) => `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

const line = "border-neutral-300 dark:border-neutral-700";
const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const navButton = `rounded-md border px-2.5 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 ${line}`;
const chosenStyle = "bg-neutral-900 text-white hover:!bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:!bg-white";
const dateBox = `rounded-md border bg-transparent px-2 py-1 text-xs outline-none dark:[color-scheme:dark] ${line}`;
const table = `overflow-hidden rounded-md border text-sm ${line}`;
const kpiRow = `grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] items-center gap-x-3 border-t px-3 first:border-t-0 ${line}`;
const splitRow = `grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-baseline gap-x-3 border-t px-3 py-2 first:border-t-0 ${line}`;
const number = "text-right tabular-nums";

/**
 * The four numbers that matter, top to bottom: leads, booked calls, good calls, signed.
 * Each has how many, what each one cost, and what share of the step before it turned into.
 */
export default async function NumbersPage({ params, searchParams }: PageProps<"/b/[slug]/numbers">) {
  const { slug } = await params;
  const query = await searchParams;
  const { session, db, client, role } = await requireBrand(slug);
  const now = new Date();
  const goodFitFrom = callSettingsFor(siteFor(client)).alertFit;
  const target = client.targetCostPerSigningPence;

  const choices = periods(now, client.createdAt);
  const custom = isDay(query.from) && isDay(query.to) && query.from <= query.to;
  const chosen = custom
    ? { key: "custom", label: "Chosen dates", from: startOfUkDay(query.from as string), to: ukTimeOnDay(startOfUkDay(query.to as string), 1, "00:00") }
    : (choices.find((p) => p.key === query.period) ?? choices[0]);
  const firstDay = ukDay(chosen.from);
  const lastDay = ukDay(new Date(chosen.to.getTime() - 3_600_000));

  const { allLeads, allCalls, spendRows, sawForm } = await withSession(db, session, async (tx) => ({
    allLeads: await tx.select().from(leads),
    allCalls: await tx.select().from(calls),
    spendRows: await tx.select().from(adSpend).orderBy(asc(adSpend.month)),
    // How many times the sign-up form was seen in the period: what leads are a share of.
    sawForm:
      (
        await tx
          .select({ total: sql<number>`coalesce(sum(${siteStats.count}), 0)::int` })
          .from(siteStats)
          .where(and(eq(siteStats.key, "form_view"), gte(siteStats.day, firstDay), lte(siteStats.day, lastDay)))
      )[0]?.total ?? 0,
  }));
  const n = computeNumbers({
    leads: allLeads,
    calls: allCalls,
    spendByMonth: Object.fromEntries(spendRows.map((row) => [row.month, row.amountPence])),
    from: chosen.from,
    to: chosen.to,
    goodFitFrom,
  });
  const t = n.totals;
  // With no spend typed in, a cost of £0 would be wrong, so no cost is shown at all.
  const cost = (count: number) => (n.hasSpend ? costEach(n.spendPence, count) : null);
  const signingCost = cost(t.signed);
  const onTarget = signingCost === null || !target ? "" : signingCost <= target ? "bg-green-500/20" : "bg-red-500/20";
  const shown = showRate(t);

  const kpis: { name: string; under?: string; count: number; from: number; of: string; costStyle?: string; costUnder?: string }[] = [
    { name: "Leads", under: n.notQualified > 0 ? `${n.notQualified} more didn't qualify` : undefined, count: t.leads, from: sawForm, of: "who saw the form" },
    { name: "Booked", under: shown === null ? undefined : `${shown}% attended`, count: t.booked, from: t.leads, of: "of leads" },
    { name: "Good calls", count: t.good, from: t.booked, of: "of booked" },
    { name: "Signed", count: t.signed, from: t.good, of: "of good calls", costStyle: onTarget, costUnder: target ? `Target ${money(target)}` : "No target set" },
  ];
  const split = (label: string, c: Counts) => (
    <div key={label} className={splitRow}>
      <span className="truncate">{label}</span>
      <span className={number}>{c.leads}</span>
      <span className={number}>{c.booked}</span>
      <span className={number}>{c.good}</span>
      <span className={number}>{c.signed}</span>
    </div>
  );
  const splitHead = (first: string) => (
    <div className={`${splitRow} !py-1.5 ${small}`}>
      <span>{first}</span>
      <span className="text-right">Leads</span>
      <span className="text-right">Booked</span>
      <span className="text-right">Good calls</span>
      <span className="text-right">Signed</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {query.saved && <Notice kind="ok">Saved.</Notice>}
      {query.problem === "spend" && <Notice>Enter the month and an amount in pounds, for example 4000.</Notice>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex">
          {choices.map((p, index) => (
            <a
              key={p.key}
              href={`/b/${slug}/numbers?period=${p.key}`}
              className={`${navButton} ${index > 0 ? "-ml-px rounded-l-none" : ""} ${index < choices.length - 1 ? "rounded-r-none" : ""} ${!custom && chosen.key === p.key ? chosenStyle : ""}`}
            >
              {p.label}
            </a>
          ))}
        </span>
        <form className="flex items-center gap-1.5">
          <input type="date" name="from" defaultValue={firstDay} aria-label="From" className={dateBox} />
          <span className={small}>to</span>
          <input type="date" name="to" defaultValue={lastDay} aria-label="To" className={dateBox} />
          <button className={`${navButton} ${custom ? chosenStyle : ""}`}>Show</button>
        </form>
        <span className={`${small} ml-auto`}>{n.hasSpend ? `Ad spend ${money(n.spendPence)}` : "No ad spend entered for these dates"}</span>
      </div>

      <div className={table}>
        <div className={`${kpiRow} py-1.5 ${small}`}>
          <span />
          <span className="text-right">Number</span>
          <span className="text-right">Cost each</span>
          <span className="text-right">Conversion</span>
        </div>
        {kpis.map((kpi) => {
          const rate = share(kpi.count, kpi.from);
          const tooFew = kpi.from > 0 && kpi.from < TOO_FEW;
          return (
            <div key={kpi.name} className={`${kpiRow} py-2.5`}>
              <div>
                <p className="font-medium">{kpi.name}</p>
                {kpi.under && <p className={small}>{kpi.under}</p>}
              </div>
              <p className={`${number} text-lg font-semibold`}>{kpi.count}</p>
              <div className={`-my-1 rounded px-2 py-1 text-right ${kpi.costStyle ?? ""}`}>
                <p className="text-lg font-semibold tabular-nums">{money(cost(kpi.count))}</p>
                {kpi.costUnder && <p className={small}>{kpi.costUnder}</p>}
              </div>
              <div className="text-right" title={tooFew ? "Too few to judge yet" : undefined}>
                <p className={`text-lg font-semibold tabular-nums ${tooFew ? "text-neutral-500" : ""}`}>{rate === null ? "—" : `${rate}%`}</p>
                <p className={small}>
                  {kpi.from} {kpi.of}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <section>
        <p className={`${small} mb-1`}>By ad</p>
        <div className={table}>
          {splitHead("Ad")}
          {n.byAd.length === 0 && <p className={`${small} px-3 py-2`}>Nothing in these dates.</p>}
          {n.byAd.map((row) => split(row.notQualified > 0 ? `${row.ad} · ${row.notQualified} didn't qualify` : row.ad, row.counts))}
        </div>
      </section>

      <section>
        <p className={`${small} mb-1`}>By Fit score</p>
        <div className={table}>
          {splitHead("Fit")}
          {split(`${goodFitFrom} or more`, n.goodFit)}
          {split(`Under ${goodFitFrom}`, n.otherFit)}
        </div>
      </section>

      <section className="max-w-sm">
        <p className={`${small} mb-1`}>Ad spend by month</p>
        <div className={table}>
          {role === "owner" && (
            <form action={saveSpend} className={`flex items-center gap-2 border-t bg-neutral-100 pl-3 first:border-t-0 dark:bg-neutral-900 ${line}`}>
              <input type="hidden" name="slug" value={slug} />
              <input name="month" type="month" required defaultValue={ukDay(now).slice(0, 7)} aria-label="Month" className="min-w-0 flex-1 bg-transparent py-2 outline-none dark:[color-scheme:dark]" />
              <input name="amount" inputMode="decimal" required placeholder="Spend (£)" aria-label="Spend in pounds" className="w-28 bg-transparent py-2 text-right outline-none placeholder:text-neutral-400" />
              <button aria-label="Save spend" title="Save spend" className={`self-stretch border-l px-3 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${line}`}>
                +
              </button>
            </form>
          )}
          {spendRows
            .slice()
            .reverse()
            .map((row) => (
              <div key={row.id} className={`flex justify-between border-t px-3 py-2 first:border-t-0 ${line}`}>
                <span>{monthName(row.month)}</span>
                <span className="tabular-nums">{money(row.amountPence)}</span>
              </div>
            ))}
          {spendRows.length === 0 && role !== "owner" && <p className={`${small} px-3 py-2`}>None entered.</p>}
        </div>
      </section>
    </div>
  );
}
