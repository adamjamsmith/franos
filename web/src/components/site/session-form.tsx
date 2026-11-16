"use client";

import { useActionState } from "react";
import { bookFromLink, type SessionFormState } from "@/app/site/[slug]/session/actions";

type Day = { label: string; slots: { iso: string; label: string }[] };
type Props = { slug: string; kind: string; code: string; days: Day[]; consentWording: string; privacyLink: string };

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-[var(--brand)]";
const wrong = "border-red-500";
const label = "mb-1 block text-sm font-medium";
const hint = "mt-1 block text-sm text-red-700";

const PROBLEMS: Record<string, string> = {
  taken: "Sorry, someone has just taken that time. Please pick another.",
  time: "Please pick a time.",
};

/** The booking form for a recording session. A mistake keeps everything typed and marks what needs fixing. */
export function SessionForm({ slug, kind, code, days, consentWording, privacyLink }: Props) {
  const empty: SessionFormState = { values: { firstName: "", lastName: "", email: "", phone: "", startsAt: "", consent: false } };
  const [state, action, pending] = useActionState(bookFromLink, empty);
  const { values, problem } = state;
  const details = problem === "details";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="k" value={code} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={label}>First name</span>
          <input name="firstName" required defaultValue={values.firstName} autoComplete="given-name" className={`${input} ${details && !values.firstName ? wrong : ""}`} />
        </label>
        <label>
          <span className={label}>Last name</span>
          <input name="lastName" defaultValue={values.lastName} autoComplete="family-name" className={input} />
        </label>
      </div>
      <label>
        <span className={label}>Email</span>
        <input name="email" type="email" required defaultValue={values.email} autoComplete="email" className={`${input} ${details ? wrong : ""}`} />
        {details && <span className={hint}>Please check your name and email address.</span>}
      </label>
      <label>
        <span className={label}>Phone (optional)</span>
        <input name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" className={input} />
      </label>
      <label>
        <span className={label}>Day and time</span>
        <select name="startsAt" required defaultValue={values.startsAt} className={`${input} ${problem === "time" || problem === "taken" ? wrong : ""}`}>
          <option value="" disabled>
            Pick a time...
          </option>
          {days.map((day) => (
            <optgroup key={day.label} label={day.label}>
              {day.slots.map((slot) => (
                <option key={slot.iso} value={slot.iso}>
                  {day.label}, {slot.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {problem && PROBLEMS[problem] && <span className={hint}>{PROBLEMS[problem]}</span>}
        {days.length === 0 && <span className={hint}>There are no times on offer at the moment.</span>}
      </label>
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
  );
}
