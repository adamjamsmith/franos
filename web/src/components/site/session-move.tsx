"use client";

import { useRef, useState } from "react";
import { SlotPicker, type CalendarDay } from "./slot-picker";

/** Moving a booked session: the same calendar, opened by a button. Pressing "Move" beside a time moves it. */
export function SessionMove({ action, hidden, days }: { action: (form: FormData) => void; hidden: Record<string, string>; days: CalendarDay[] }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(days[0]?.day ?? "");
  const [time, setTime] = useState("");
  const form = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start rounded-full border border-neutral-400 px-5 py-2.5 font-semibold hover:bg-neutral-100">
        Move it to another time
      </button>
    );
  }
  return (
    <form ref={form} action={action} className="flex flex-col gap-4">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="startsAt" value={time} />
      <p className="text-base font-semibold">Pick the new date and time</p>
      {days.length === 0 ? (
        <p className="text-sm text-neutral-600">There are no other times on offer at the moment.</p>
      ) : (
        <SlotPicker
          days={days}
          day={day}
          time={time}
          onDay={(key) => {
            setDay(key);
            setTime("");
          }}
          onTime={setTime}
          onNext={() => form.current?.requestSubmit()}
          nextLabel="Move"
        />
      )}
    </form>
  );
}
