import { ukDay } from "../email/render";

/** A month on the calls calendar, as "2026-11". */
export const isMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** The month a moment falls in, by the UK calendar. */
export const monthOf = (date: Date) => ukDay(date).slice(0, 7);

/** The month `by` months later (or earlier, if negative). */
export function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split("-").map(Number);
  const moved = new Date(Date.UTC(year, m - 1 + by, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "November 2026" */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** `key` is the day as "2026-11-17", the same form `ukDay` gives, so calls can be matched to it. */
export type MonthDay = { key: string; day: number; inMonth: boolean };

/** The weeks of a month, Monday to Sunday, padded with the days of the months either side. */
export function monthGrid(month: string): MonthDay[][] {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // days of the week before the 1st, with Monday first
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: MonthDay[][] = [];
  for (let i = 0; i < cells; i++) {
    const date = new Date(Date.UTC(year, m - 1, 1 - lead + i));
    if (i % 7 === 0) weeks.push([]);
    weeks.at(-1)!.push({ key: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === m - 1 });
  }
  return weeks;
}
