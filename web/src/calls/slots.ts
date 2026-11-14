import { ukDay, ukTimeOnDay } from "../email/render";
import type { CallSettings, SiteContent } from "../site/config";
import { toClock, toMinutes } from "./time";

export function callSettingsFor(site: SiteContent): CallSettings {
  return {
    days: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    lengthMinutes: 30,
    gapMinutes: 30,
    windowDays: 7,
    noticeHours: 2,
    daysOff: [],
    alertFit: 70,
    alertFrom: "08:00",
    alertTo: "20:00",
    ...(site.calls ?? {}),
  };
}

export type Busy = { startsAt: Date; endsAt: Date };
export type DaySlots = { day: string; slots: Date[] };

/**
 * The times a lead can book, grouped by UK day.
 * A time is offered only if it is inside the working hours, far enough ahead to give the
 * shortest notice, inside the booking window, and clear of every other call and its gap.
 */
export function openSlots(settings: CallSettings, now: Date, busy: Busy[]): DaySlots[] {
  const length = Math.max(5, settings.lengthMinutes);
  const step = length + Math.max(0, settings.gapMinutes);
  const gapMs = Math.max(0, settings.gapMinutes) * 60_000;
  const lengthMs = length * 60_000;
  const earliest = now.getTime() + settings.noticeHours * 3_600_000;
  const latest = now.getTime() + settings.windowDays * 86_400_000;
  const first = toMinutes(settings.startTime);
  const last = toMinutes(settings.endTime);

  const days: DaySlots[] = [];
  for (let d = 0; d <= settings.windowDays; d++) {
    const day = ukDay(ukTimeOnDay(now, d, "12:00"));
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (!settings.days.includes(weekday) || settings.daysOff.includes(day)) continue;

    const slots: Date[] = [];
    for (let m = first; m + length <= last; m += step) {
      const start = ukTimeOnDay(now, d, toClock(m));
      const t = start.getTime();
      if (t < earliest || t > latest) continue;
      if (busy.some((b) => t < b.endsAt.getTime() + gapMs && t + lengthMs + gapMs > b.startsAt.getTime())) continue;
      slots.push(start);
    }
    if (slots.length > 0) days.push({ day, slots });
  }
  return days;
}

export const isOpenSlot = (settings: CallSettings, now: Date, busy: Busy[], startsAt: Date) =>
  openSlots(settings, now, busy).some((d) => d.slots.some((s) => s.getTime() === startsAt.getTime()));
