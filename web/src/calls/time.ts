/** Dates and times as a lead in the UK reads them. */
const zone = "Europe/London";
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long", day: "numeric", month: "long" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true });
const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "Tuesday 17 November" */
export const ukDate = (date: Date) => dateFormat.format(date).replace(",", "");
/** "10:00am" */
export const ukTime = (date: Date) => timeFormat.format(date).replace(/\s/g, "").toLowerCase();
/** "Tuesday 17 November at 10:00am" */
export const ukWhen = (date: Date) => `${ukDate(date)} at ${ukTime(date)}`;

/** Minutes since midnight, UK time. */
export function ukMinutes(date: Date): number {
  const parts = Object.fromEntries(clockFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};
export const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
