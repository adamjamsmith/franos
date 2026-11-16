"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SlotPicker, type CalendarDay } from "./slot-picker";

export type { CalendarDay };

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

  const day = days.find((d) => d.day === selectedDay) ?? days[0];
  const slot = day.slots.find((s) => s.iso === time);
  const readOnlyInput = "w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2.5 text-base text-neutral-700";

  return (
    <div className="flex flex-col gap-6">
      <div className={confirming && slot ? "hidden" : ""}>
        <SlotPicker
          days={days}
          day={day.day}
          time={time}
          onDay={(key) => {
            setSelectedDay(key);
            setTime("");
            setConfirming(false);
          }}
          onTime={setTime}
          onNext={() => setConfirming(true)}
        />
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
