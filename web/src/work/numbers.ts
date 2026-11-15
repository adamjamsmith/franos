import { ukDay, ukTimeOnDay } from "../email/render";

/** Below this many, a percentage or a cost is too shaky to act on. */
export const TOO_FEW = 10;

type LeadRow = {
  id: string;
  createdAt: Date;
  fitScore: number | null;
  utm: unknown;
  outcome: string | null;
  outcomeAt: Date | null;
  /** False for someone who missed a must-have answer. They are not counted as leads. */
  qualified?: boolean;
};
type CallRow = { leadId: string; createdAt: Date; startsAt: Date; status: string; goodCall: boolean | null };

export type Counts = { leads: number; booked: number; happened: number; noShows: number; good: number; signed: number };
export type Numbers = {
  totals: Counts;
  spendPence: number;
  /** Whether any spend has been typed in for the months this period touches. */
  hasSpend: boolean;
  byAd: { ad: string; counts: Counts; notQualified: number }[];
  /** People who completed the form in the period but missed a must-have answer. */
  notQualified: number;
  goodFit: Counts;
  otherFit: Counts;
};

const empty = (): Counts => ({ leads: 0, booked: 0, happened: 0, noShows: 0, good: 0, signed: 0 });

/**
 * The spend that falls inside a period. Spend is typed in per month, so each month's figure
 * is spread evenly over its days and the days inside the period are added up.
 */
export function spendBetween(spendByMonth: Record<string, number>, from: Date, to: Date): { pence: number; hasSpend: boolean } {
  let pence = 0;
  let hasSpend = false;
  // Walk the UK days from `from` up to, but not including, `to`.
  for (let d = 0; d < 800; d++) {
    const dayStart = ukTimeOnDay(from, d, "00:00");
    if (dayStart >= to) break;
    const month = ukDay(ukTimeOnDay(from, d, "12:00")).slice(0, 7);
    const amount = spendByMonth[month];
    if (amount === undefined) continue;
    hasSpend = true;
    const [year, monthNumber] = month.split("-").map(Number);
    pence += amount / new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  }
  return { pence: Math.round(pence), hasSpend };
}

/**
 * The numbers for a period, from `from` up to (not including) `to`.
 * Each line is counted by when it happened: a lead by when they signed up, a booking by when it
 * was made, a call by when it took place, a signing by when it was marked.
 */
export function computeNumbers(input: {
  leads: LeadRow[];
  calls: CallRow[];
  spendByMonth: Record<string, number>;
  from: Date;
  to: Date;
  /** Fit score that counts as a good fit. */
  goodFitFrom: number;
}): Numbers {
  const { from, to } = input;
  const inPeriod = (date: Date | null) => Boolean(date && date >= from && date < to);
  const leadById = new Map(input.leads.map((l) => [l.id, l]));
  const adOf = (lead: LeadRow) => {
    const utm = (lead.utm ?? {}) as Record<string, string>;
    return utm.content || utm.campaign || "No ad recorded";
  };

  const totals = empty();
  const goodFit = empty();
  const otherFit = empty();
  const ads = new Map<string, Counts>();
  const add = (lead: LeadRow | undefined, key: keyof Counts) => {
    if (!lead) return;
    totals[key]++;
    ((lead.fitScore ?? 0) >= input.goodFitFrom ? goodFit : otherFit)[key]++;
    const ad = adOf(lead);
    if (!ads.has(ad)) ads.set(ad, empty());
    ads.get(ad)![key]++;
  };

  let notQualified = 0;
  const notQualifiedByAd = new Map<string, number>();
  for (const lead of input.leads) {
    if (lead.qualified === false) {
      if (!inPeriod(lead.createdAt)) continue;
      notQualified++;
      const ad = adOf(lead);
      if (!ads.has(ad)) ads.set(ad, empty());
      notQualifiedByAd.set(ad, (notQualifiedByAd.get(ad) ?? 0) + 1);
      continue;
    }
    if (inPeriod(lead.createdAt)) add(lead, "leads");
    if (lead.outcome === "signed" && inPeriod(lead.outcomeAt)) add(lead, "signed");
  }
  for (const call of input.calls) {
    const lead = leadById.get(call.leadId);
    if (inPeriod(call.createdAt)) add(lead, "booked");
    if (!inPeriod(call.startsAt)) continue;
    if (call.status === "attended") add(lead, "happened");
    if (call.status === "no_show") add(lead, "noShows");
    if (call.status === "attended" && call.goodCall) add(lead, "good");
  }

  const spend = spendBetween(input.spendByMonth, from, to);
  return {
    totals,
    spendPence: spend.pence,
    hasSpend: spend.hasSpend,
    byAd: [...ads.entries()].map(([ad, counts]) => ({ ad, counts, notQualified: notQualifiedByAd.get(ad) ?? 0 })).sort((a, b) => b.counts.leads - a.counts.leads),
    notQualified,
    goodFit,
    otherFit,
  };
}

/** Pence per one of something, or null when there are none to divide by. */
export const costEach = (spendPence: number, count: number) => (count > 0 ? Math.round(spendPence / count) : null);
/** One count as a percentage of another, or null when there is nothing to compare with. */
export const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);
export const showRate = (c: Counts) => share(c.happened, c.happened + c.noShows);

export type Period = { key: string; label: string; from: Date; to: Date };

/** The periods on offer, in UK time. `to` is the start of the day after the last day. */
export function periods(now: Date, launch: Date): Period[] {
  const today = ukDay(now);
  const [year, month, day] = today.split("-").map(Number);
  const startOfMonth = ukTimeOnDay(now, -(day - 1), "00:00");
  const daysLastMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const tomorrow = ukTimeOnDay(now, 1, "00:00");
  return [
    { key: "this-month", label: "This month", from: startOfMonth, to: tomorrow },
    { key: "last-month", label: "Last month", from: ukTimeOnDay(now, -(day - 1) - daysLastMonth, "00:00"), to: startOfMonth },
    { key: "30-days", label: "Last 30 days", from: ukTimeOnDay(now, -29, "00:00"), to: tomorrow },
    { key: "all", label: "Since the start", from: ukTimeOnDay(launch, 0, "00:00"), to: tomorrow },
  ];
}
