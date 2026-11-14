"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export type CalendarDay = { day: string; label: string; slots: { iso: string; label: string }[] };

type Props = {
  action: (form: FormData) => void;
  /** Sent along with the chosen time: which brand, which page, and (when changing a call) which call. */
  hidden: Record<string, string>;
  days: CalendarDay[];
  minutes: number;
  person: { name: string; email: string };
  /** The wording on the last button: "Book call" for a new call, "Move call" when changing one. */
  confirmLabel: string;
  /** Where "Not you?" leads: the sign-up form. */
  formLink: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const pad = (n: number) => String(n).padStart(2, "0");

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-full bg-[var(--brand)] px-6 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "One moment..." : label}
    </button>
  );
}

/**
 * The booking calendar. Pick a day in the month on the left, pick a time on the right and press Next.
 * The details to confirm then take the calendar's place, in the same box on the same page.
 * Nothing is booked until the last button, which leads to the confirmation page.
 */
export function BookingCalendar({ action, hidden, days, minutes, person, confirmLabel, formLink }: Props) {
  const [selectedDay, setSelectedDay] = useState(days[0]?.day ?? "");
  const [month, setMonth] = useState((days[0]?.day ?? "").slice(0, 7));
  const [time, setTime] = useState("");
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLFormElement>(null);

  // When the details open, bring them into view, which matters most on a phone.
  useEffect(() => {
    if (confirming) confirmRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [confirming, time]);

  if (days.length === 0) {
    return <p className="text-sm text-neutral-600">No times are free in the next few days. Reply to any of our emails and we will find one.</p>;
  }

  const byDay = new Map(days.map((d) => [d.day, d]));
  const day = byDay.get(selectedDay) ?? days[0];
  const slot = day.slots.find((s) => s.iso === time);
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
  const readOnlyInput = "w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2.5 text-base text-neutral-700";

  return (
    <div className="flex flex-col gap-6">
      <div className={`${confirming && slot ? "hidden" : "flex"} flex-col gap-6 md:flex-row md:gap-8`}>
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
                    onClick={() => {
                      setSelectedDay(key);
                      setTime("");
                      setConfirming(false);
                    }}
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
                  {!confirming && (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      className="flex-1 rounded-md bg-[var(--brand)] py-3 text-base font-bold text-white hover:opacity-90"
                    >
                      Next
                    </button>
                  )}
                </div>
              ) : (
                <button
                  key={s.iso}
                  type="button"
                  onClick={() => setTime(s.iso)}
                  className="rounded-md border border-[var(--brand)] bg-white py-3 text-base font-bold text-[var(--brand)] hover:border-2"
                >
                  {s.label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {confirming && slot && (
        <form ref={confirmRef} action={action} className="flex flex-col gap-4">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input type="hidden" name="startsAt" value={slot.iso} />
          <div>
            <p className="text-sm font-medium text-neutral-600">Confirm your details</p>
            <p className="text-lg font-semibold">
              {day.label} at {slot.label}
            </p>
            <p className="text-sm text-neutral-600">
              UK time. {minutes} minutes, on Zoom. The call is recorded, so we have an accurate note of what was said.
            </p>
          </div>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              Name
              <input value={person.name} readOnly className={readOnlyInput} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              Email address
              <input value={person.email} readOnly className={readOnlyInput} />
            </label>
          </div>
          <p className="text-xs text-neutral-600">
            We will email the details to this address. Not you?{" "}
            <a href={formLink} className="underline">
              Fill in the form
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ConfirmButton label={confirmLabel} />
            <button type="button" onClick={() => setConfirming(false)} className="px-3 py-2 text-sm font-medium text-neutral-700 underline">
              Back to the calendar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
