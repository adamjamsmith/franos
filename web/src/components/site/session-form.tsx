"use client";

import { useActionState, useState } from "react";
import { bookFromLink, type SessionFormState } from "@/app/site/[slug]/session/actions";
import { SlotPicker, type CalendarDay } from "./slot-picker";

type Props = {
  slug: string;
  kind: string;
  code: string;
  days: CalendarDay[];
  brandName: string;
  logoUrl: string;
  /** "Testimonial", "Franchisor interview"... and the sentence that says what it is. */
  title: string;
  says: string;
  minutes: number;
  /** Testimonials ask which franchise location the person runs. */
  askLocation: boolean;
  consentWording: string;
  privacyLink: string;
};

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-[var(--brand)]";
const wrong = "border-red-500";
const label = "mb-1 block text-sm font-semibold";
const hint = "mt-1 block text-sm text-red-700";

const SLOT_PROBLEMS: Record<string, string> = {
  taken: "Sorry, someone has just taken that time. Please pick another.",
  time: "That time is no longer available. Please pick another.",
};

function Fact({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0">
        <path d={path} />
      </svg>
      <span>{children}</span>
    </li>
  );
}

const CLOCK = "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7.500V12l3 2";
const CAMERA = "M3 8a2 2 0 012-2h8.500a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM15.500 10.500l5.500-3v9l-5.500-3";
const DIARY = "M4 6.500h16v13.500H4zM4 10.500h16M8 4v4M16 4v4";
const GLOBE = "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.500 2.700 2.500 15.300 0 18M12 3c-2.500 2.700-2.500 15.300 0 18";

/**
 * Booking a recording session from a link, laid out like a booking calendar: what it is on the left,
 * the month and the day's times on the right. Choosing a time and pressing Next swaps the calendar for
 * the details to fill in. A mistake keeps everything typed and marks what needs fixing.
 */
export function SessionForm({ slug, kind, code, days, brandName, logoUrl, title, says, minutes, askLocation, consentWording, privacyLink }: Props) {
  const empty: SessionFormState = { values: { firstName: "", lastName: "", email: "", location: "", startsAt: "", consent: false } };
  const [state, action, pending] = useActionState(bookFromLink, empty);
  const { values, problem } = state;
  const details = problem === "details";

  const find = (iso: string) => days.find((d) => d.slots.some((s) => s.iso === iso));
  const [day, setDay] = useState(find(values.startsAt)?.day ?? days[0]?.day ?? "");
  const [time, setTime] = useState(values.startsAt);
  const [step, setStep] = useState<"time" | "details">(values.startsAt ? "details" : "time");

  // After the server answers: a problem with the details keeps the time; a time that has gone sends them back to the calendar.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    const kept = find(values.startsAt);
    setTime(kept ? values.startsAt : "");
    setStep(kept ? "details" : "time");
    if (kept) setDay(kept.day);
  }

  const chosenDay = days.find((d) => d.day === day) ?? days[0];
  const slot = chosenDay?.slots.find((s) => s.iso === time);
  const onDetails = step === "details" && slot;

  return (
    <div data-plain className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:flex-row">
      <aside className="border-b border-neutral-200 p-6 md:w-72 md:shrink-0 md:border-b-0 md:border-r">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={brandName} className="mb-5 h-9 w-auto" />
        ) : (
          <p className="mb-1 text-sm font-semibold text-neutral-600">{brandName}</p>
        )}
        <h1 className="mb-4 text-2xl font-bold">{title}</h1>
        <ul className="flex flex-col gap-3 text-sm font-medium text-neutral-700">
          <Fact path={CLOCK}>{minutes} min</Fact>
          <Fact path={CAMERA}>On Zoom, recorded on video</Fact>
          {onDetails && (
            <Fact path={DIARY}>
              {slot.label}, {chosenDay.label}
            </Fact>
          )}
          <Fact path={GLOBE}>UK time</Fact>
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-neutral-600">This is {says}.</p>
      </aside>

      <div className="min-w-0 flex-1 p-6">
        {!onDetails ? (
          <>
            <h2 className="mb-5 text-xl font-bold">Select a date and time</h2>
            {problem && SLOT_PROBLEMS[problem] && (
              <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{SLOT_PROBLEMS[problem]}</p>
            )}
            {days.length === 0 ? (
              <p className="text-sm text-neutral-600">There are no times on offer at the moment. Reply to the message this link came in and we will find one.</p>
            ) : (
              <SlotPicker
                days={days}
                day={chosenDay.day}
                time={time}
                onDay={(key) => {
                  setDay(key);
                  setTime("");
                }}
                onTime={setTime}
                onNext={() => setStep("details")}
              />
            )}
          </>
        ) : (
          <form action={action} className="flex max-w-md flex-col gap-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="k" value={code} />
            <input type="hidden" name="startsAt" value={slot.iso} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Back to the calendar"
                onClick={() => setStep("time")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-xl text-[var(--brand)] hover:bg-neutral-100"
              >
                ‹
              </button>
              <h2 className="text-xl font-bold">Enter your details</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={label}>First name</span>
                <input name="firstName" required defaultValue={values.firstName} autoComplete="given-name" className={`${input} ${details && !values.firstName ? wrong : ""}`} />
              </label>
              <label>
                <span className={label}>Last name</span>
                <input name="lastName" required defaultValue={values.lastName} autoComplete="family-name" className={`${input} ${details && !values.lastName ? wrong : ""}`} />
              </label>
            </div>
            <label>
              <span className={label}>Email</span>
              <input name="email" type="email" required defaultValue={values.email} autoComplete="email" className={`${input} ${details ? wrong : ""}`} />
            </label>
            {askLocation && (
              <label>
                <span className={label}>Franchise location</span>
                <input name="location" required defaultValue={values.location} placeholder="The area your franchise covers" className={`${input} ${details && !values.location ? wrong : ""}`} />
              </label>
            )}
            {details && <span className={hint}>Please check the boxes marked in red.</span>}
            <div>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-neutral-800">
                <input type="checkbox" name="consent" required defaultChecked={values.consent} className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  {consentWording}{" "}
                  <a href={privacyLink} target="_blank" className="underline">
                    Privacy notice
                  </a>
                </span>
              </label>
              {problem === "consent" && <span className={hint}>Please tick this box to agree before booking.</span>}
            </div>
            <button disabled={pending} className="self-start rounded-full bg-[var(--brand)] px-6 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {pending ? "One moment..." : "Book session"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
