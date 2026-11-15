import { asc } from "drizzle-orm";
import { callSettingsFor } from "@/calls/slots";
import { buttonClass, Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { withSession } from "@/db/context";
import { adSpend, calls, leads } from "@/db/schema";
import { ukDay, ukTimeOnDay } from "@/email/render";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import { computeNumbers, costEach, type Counts, periods, share, showRate, TOO_FEW } from "@/work/numbers";
import { saveSpend } from "../work-actions";

const money = (pence: number | null) =>
  pence === null ? "—" : `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: pence >= 10_000 ? 0 : 2 })}`;
const percent = (value: number | null) => (value === null ? "—" : `${value}%`);
const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
/** Midnight UK time at the start of a given UK day. */
const startOfUkDay = (day: string) => ukTimeOnDay(new Date(`${day}T12:00:00Z`), 0, "00:00");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (month: string) => `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

/** Whether the brand is on target: counts, what each one cost, and where the good calls come from. */
export default async function NumbersPage({ params, searchParams }: PageProps<"/b/[slug]/numbers">) {
  const { slug } = await params;
  const query = await searchParams;
  const { session, db, client, role } = await requireBrand(slug);
  const now = new Date();
  const site = siteFor(client);
  const target = client.targetCostPerSigningPence;

  const { allLeads, allCalls, spendRows } = await withSession(db, session, async (tx) => ({
    allLeads: await tx.select().from(leads),
    allCalls: await tx.select().from(calls),
    spendRows: await tx.select().from(adSpend).orderBy(asc(adSpend.month)),
  }));
  const spendByMonth = Object.fromEntries(spendRows.map((row) => [row.month, row.amountPence]));

  const choices = periods(now, client.createdAt);
  const custom = isDay(query.from) && isDay(query.to) && query.from <= query.to;
  const chosen = custom
    ? { key: "custom", label: "Chosen dates", from: startOfUkDay(query.from as string), to: ukTimeOnDay(startOfUkDay(query.to as string), 1, "00:00") }
    : (choices.find((p) => p.key === query.period) ?? choices[0]);
  const n = computeNumbers({
    leads: allLeads,
    calls: allCalls,
    spendByMonth,
    from: chosen.from,
    to: chosen.to,
    goodFitFrom: callSettingsFor(site).alertFit,
  });
  const t = n.totals;
  const lastDay = ukDay(new Date(chosen.to.getTime() - 3_600_000));
  const signingCost = costEach(n.spendPence, t.signed);
  const few = (count: number) => (count > 0 && count < TOO_FEW ? " (too few to judge yet)" : "");

  const lines: { label: string; count: number; note?: string; from?: number; fromLabel?: string }[] = [
    { label: "Leads", count: t.leads, note: n.notQualified > 0 ? `${n.notQualified} more filled in the form but didn't qualify` : undefined },
    { label: "Calls booked", count: t.booked, from: t.leads, fromLabel: "of leads" },
    {
      label: "Calls that happened",
      count: t.happened,
      note: showRate(t) === null ? undefined : `Show rate ${showRate(t)}% (${t.noShows} did not show)${few(t.happened + t.noShows)}`,
    },
    { label: "Good calls", count: t.good, from: t.happened, fromLabel: "of calls that happened" },
    { label: "Signed", count: t.signed, from: t.good, fromLabel: "of good calls" },
  ];
  const adRow = (label: string, c: Counts) => (
    <tr key={label} className="border-t border-neutral-200 dark:border-neutral-800">
      <td className="py-2 pr-3">{label}</td>
      <td className="text-right">{c.leads}</td>
      <td className="text-right">{c.booked}</td>
      <td className="text-right">{c.happened}</td>
      <td className="text-right">{c.good}</td>
      <td className="text-right">{c.signed}</td>
    </tr>
  );
  const breakdownHead = (first: string) => (
    <thead className="text-neutral-500">
      <tr>
        <th className="py-2">{first}</th>
        <th className="text-right">Leads</th>
        <th className="text-right">Booked</th>
        <th className="text-right">Happened</th>
        <th className="text-right">Good calls</th>
        <th className="text-right">Signed</th>
      </tr>
    </thead>
  );

  return (
    <div className="flex flex-col gap-10">
      {query.saved && <Notice kind="ok">Saved.</Notice>}
      {query.problem === "spend" && <Notice>Enter the month and an amount in pounds, for example 4000.</Notice>}
      {query.problem === "fee" && <Notice>Enter the franchise fee in pounds, for example 35000.</Notice>}

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {choices.map((p) => (
            <a
              key={p.key}
              href={`/b/${slug}/numbers?period=${p.key}`}
              className={`${quietButtonClass} ${!custom && chosen.key === p.key ? "border-neutral-900 font-semibold dark:border-neutral-100" : ""}`}
            >
              {p.label}
            </a>
          ))}
          <form className="flex flex-wrap items-center gap-2">
            <input type="date" name="from" defaultValue={custom ? (query.from as string) : ukDay(chosen.from)} className={`${inputClass} w-40 py-1`} />
            <span>to</span>
            <input type="date" name="to" defaultValue={custom ? (query.to as string) : lastDay} className={`${inputClass} w-40 py-1`} />
            <button className={quietButtonClass}>Show</button>
          </form>
        </div>

        <div
          className={`mb-4 rounded-md border px-4 py-3 ${
            signingCost === null || !target
              ? "border-neutral-300 dark:border-neutral-700"
              : signingCost <= target
                ? "border-green-300 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
                : "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          }`}
        >
          <p className="text-sm">Cost per signing, {chosen.label.toLowerCase()}</p>
          <p className="text-2xl font-semibold">
            {money(signingCost)}
            <span className="text-base font-normal"> against a target of {target ? money(target) : "none set (add one in Settings)"}</span>
          </p>
          <p className="text-sm">
            {t.signed === 0
              ? `Nobody has signed in this period yet. Spend so far: ${money(n.spendPence)}.`
              : `${t.signed} signed on ${money(n.spendPence)} of ad spend.${few(t.signed)}`}
            {!n.hasSpend && " No ad spend has been typed in for this period, so costs show as £0."}
          </p>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-2"></th>
              <th className="text-right">Count</th>
              <th className="text-right">Cost each</th>
              <th className="pl-4">From the line before</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.label} className="border-t border-neutral-200 align-top dark:border-neutral-800">
                <td className="py-2 font-medium">{line.label}</td>
                <td className="text-right">{line.count}</td>
                <td className="text-right">{money(costEach(n.spendPence, line.count))}</td>
                <td className="pl-4 text-neutral-600 dark:text-neutral-400">
                  {line.note ?? (line.from === undefined ? "" : `${percent(share(line.count, line.from))} ${line.fromLabel}${few(line.from)}`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">By ad</h2>
        <p className="mb-2 text-sm text-neutral-500">Which ads bring good calls, not only leads. The ad is taken from the link the lead arrived on.</p>
        {n.byAd.length === 0 ? (
          <p className="text-sm">Nothing in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              {breakdownHead("Ad")}
              <tbody>{n.byAd.map((row) => adRow(row.notQualified > 0 ? `${row.ad} · ${row.notQualified} didn't qualify` : row.ad, row.counts))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">By Fit score</h2>
        <p className="mb-2 text-sm text-neutral-500">Whether the leads the form scores highly are the ones who turn into good calls.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            {breakdownHead("Leads with")}
            <tbody>
              {adRow(`Fit ${callSettingsFor(site).alertFit} or more`, n.goodFit)}
              {adRow(`Fit under ${callSettingsFor(site).alertFit}`, n.otherFit)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-xl">
        <h2 className="mb-1 text-lg font-semibold">Ad spend</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Typed in per month until the ad account is connected. franOS spreads each month evenly over its days to work
          out costs for any period.
        </p>
        {spendRows.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {spendRows.map((row) => (
              <li key={row.id}>
                {monthName(row.month)}: <span className="font-medium">{money(row.amountPence)}</span>
              </li>
            ))}
          </ul>
        )}
        {role === "owner" && (
          <form action={saveSpend} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="slug" value={slug} />
            <Field label="Month">
              <input name="month" type="month" required defaultValue={ukDay(now).slice(0, 7)} className={`${inputClass} w-44`} />
            </Field>
            <Field label="Spend (£)">
              <input name="amount" inputMode="decimal" required placeholder="4000" className={`${inputClass} w-32`} />
            </Field>
            <button className={buttonClass}>Save spend</button>
          </form>
        )}
      </section>
    </div>
  );
}
