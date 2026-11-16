"use client";

import { useState } from "react";

export type CalendarDay = { day: string; label: string; slots: { iso: string; label: string }[] };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const pad = (n: number) => String(n).padStart(2, "0");

type Props = {
  days: CalendarDay[];
  /** The chosen day, as YYYY-MM-DD, and the chosen time, as an ISO date. Empty when nothing is chosen yet. */
  day: string;
  time: string;
  onDay: (day: string) => void;
  onTime: (iso: string) => void;
  /** Pressed on the button that appears beside the chosen time. */
  onNext: () => void;
  nextLabel?: string;
};

/**
 * The month on the left and that day's times on the right. Days with a free time are tinted and can be pressed.
 * Choosing a time shows a button beside it to carry on. Shared by the call calendar and the session calendar.
 */
export function SlotPicker({ days, day: chosenDay, time, onDay, onTime, onNext, nextLabel = "Next" }: Props) {
  const [month, setMonth] = useState((chosenDay || days[0]?.day || "").slice(0, 7));
  if (days.length === 0) return null;

  const byDay = new Map(days.map((d) => [d.day, d]));
  const day = byDay.get(chosenDay) ?? days[0];
  const firstMonth = days[0].day.slice(0, 7);
  const lastMonth = days[days.length - 1].day.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const blanks = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const shiftMonth = (by: number) => {
    const next = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
    setMonth(`${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`);
  };
  const arrow = "flex h-9 w-9 items-center justify-center rounded-full text-xl text-[var(--brand)] hover:bg-neutral-100 disabled:text-neutral-300 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      <div className="w-full max-w-sm shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold">
            {MONTHS[monthNumber - 1]} {year}
          </p>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => shiftMonth(-1)} className={arrow}>
              ‹
            </button>
            <button type="button" aria-label="Next month" disabled={month >= lastMonth} onClick={() => shiftMonth(1)} className={arrow}>
              ›
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS.map((name) => (
            <span key={name} className="pb-1 text-[11px] font-medium tracking-wide text-neutral-500">
              {name}
            </span>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const key = `${month}-${pad(i + 1)}`;
            const open = byDay.has(key);
            const chosen = key === day.day;
            return (
              <div key={key} className="flex justify-center">
                <button
                  type="button"
                  disabled={!open}
                  aria-pressed={chosen}
                  aria-label={open ? byDay.get(key)!.label : undefined}
                  onClick={() => onDay(key)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${
                    chosen
                      ? "bg-[var(--brand)] font-bold text-white"
                      : open
                        ? "bg-[color-mix(in_srgb,var(--brand)_14%,white)] font-bold text-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_26%,white)]"
                        : "text-neutral-400"
                  }`}
                >
                  {i + 1}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-neutral-600">Times shown are UK time</p>
      </div>

      <div className="min-w-0 flex-1 md:max-w-xs">
        <p className="mb-3 text-base font-medium">{day.label}</p>
        <div className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1">
          {day.slots.map((s) =>
            s.iso === time ? (
              <div key={s.iso} className="flex gap-2">
                <span className="flex flex-1 items-center justify-center rounded-md bg-neutral-600 py-3 text-base font-bold text-white">{s.label}</span>
                <button type="button" onClick={onNext} className="flex-1 rounded-md bg-[var(--brand)] py-3 text-base font-bold text-white hover:opacity-90">
                  {nextLabel}
                </button>
              </div>
            ) : (
              <button
                key={s.iso}
                type="button"
                onClick={() => onTime(s.iso)}
                className="rounded-md border border-[var(--brand)] bg-white py-3 text-base font-bold text-[var(--brand)] hover:border-2"
              >
                {s.label}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
