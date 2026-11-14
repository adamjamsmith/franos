"use client";

import { useActionState } from "react";
import { buttonClass, inputClass } from "@/components/ui";

export type OutcomeFormState = { error: string; values: Record<string, string> };

type Props = {
  action: (state: OutcomeFormState, form: FormData) => Promise<OutcomeFormState>;
  slug: string;
  leadId: string;
  callId: string;
  /** Where to land after saving: the page or pop-up this form is shown in. */
  back: string;
  /** What was saved before, if anything: the starting point for a correction. */
  initial: Record<string, string>;
  isCorrection: boolean;
  bant: { key: string; label: string; question: string }[];
  answers: Record<string, string>;
  nextMoves: Record<string, string>;
  reasons: Record<string, string>;
  requirements: string[];
};

const radio =
  "flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 has-[:checked]:border-neutral-900 has-[:checked]:font-semibold dark:border-neutral-700 dark:has-[:checked]:border-neutral-100";

/**
 * The six questions after a call. If something is missing when it is saved, everything already
 * chosen and typed stays in place and a message says what to fix.
 */
export function OutcomeForm({ action, slug, leadId, callId, back, initial, isCorrection, bant, answers, nextMoves, reasons, requirements }: Props) {
  const [state, submit, pending] = useActionState(action, { error: "", values: initial });
  const value = (name: string) => state.values[name] ?? "";
  const reasonMissing = state.error !== "" && value("next") === "not_going_ahead" && !value("reason");

  return (
    <form action={submit} className="flex flex-col gap-3 text-sm">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="callId" value={callId} />
      <input type="hidden" name="back" value={back} />
      {state.error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </p>
      )}
      {bant.map((b) => (
        <fieldset key={b.key}>
          <legend className="mb-1">
            <span className="font-medium">{b.label}:</span> {b.question}
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(answers).map(([key, label]) => (
              <label key={key} className={radio}>
                <input type="radio" name={b.key} value={key} required defaultChecked={value(b.key) === key} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend className="mb-1 font-medium">Are they the kind of person we want?</legend>
        {requirements.length > 0 && <p className="mb-1 text-xs text-neutral-500">We want someone who: {requirements.join("; ").toLowerCase()}.</p>}
        <div className="flex flex-wrap gap-2">
          {["yes", "no"].map((key) => (
            <label key={key} className={radio}>
              <input type="radio" name="rightPerson" value={key} required defaultChecked={value("rightPerson") === key} />
              {key === "yes" ? "Yes" : "No"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 font-medium">
          What happens next?
          <select name="next" required defaultValue={value("next")} key={`next-${value("next")}`} className={`${inputClass} w-56`}>
            <option value="" disabled>
              Pick one
            </option>
            {Object.entries(nextMoves).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-medium">
          If not going ahead, why?
          <select
            name="reason"
            defaultValue={value("reason")}
            key={`reason-${value("reason")}`}
            className={`${inputClass} w-72 ${reasonMissing ? "border-2 border-red-600" : ""}`}
          >
            <option value="">Only needed for &quot;Not going ahead&quot;</option>
            {Object.entries(reasons).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 font-medium">
        Notes
        <textarea name="notes" rows={2} defaultValue={value("notes")} className={inputClass} />
      </label>
      <button disabled={pending} className={`${buttonClass} self-start disabled:opacity-60`}>
        {pending ? "Saving..." : isCorrection ? "Save the correction" : "Save how it went"}
      </button>
    </form>
  );
}
