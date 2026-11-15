"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import type { Question } from "@/site/config";
import { emptySignUp, type SignUpState } from "@/site/signup-state";
import { track } from "./track";

const inputBase = "w-full rounded-md border bg-white px-3 py-2.5 text-base text-neutral-900 outline-none";
const inputOk = `${inputBase} border-neutral-300 focus:border-[var(--brand)]`;
const inputWrong = `${inputBase} border-2 border-red-600 bg-red-50 focus:border-red-700`;
const label = "flex flex-col gap-1 text-sm font-medium text-neutral-800";
const hint = "text-sm font-normal text-red-700";

type Props = {
  slug: string;
  action: (state: SignUpState, form: FormData) => Promise<SignUpState>;
  questions: Question[];
  consentWording: string;
  whatsappWording: string;
  utm: Record<string, string>;
  turnstileSiteKey: string;
};

/**
 * The sign-up form. It reports how far a visitor gets (seen, started, each question reached)
 * so drop-off can be measured. It never reports what was typed.
 * If something is wrong, everything typed stays in place and the wrong boxes turn red.
 */
export function SignUpForm({ slug, action, questions, consentWording, whatsappWording, utm, turnstileSiteKey }: Props) {
  const [state, submit, pending] = useActionState(action, emptySignUp);
  const formRef = useRef<HTMLFormElement>(null);
  const thanksRef = useRef<HTMLDivElement>(null);
  const reported = useRef(new Set<string>());
  const once = (key: string, send: () => void) => {
    if (reported.current.has(key)) return;
    reported.current.add(key);
    send();
  };

  useEffect(() => {
    once("view", () => track(slug, { type: "form_view" }));
  });
  // After a failed attempt, take the visitor to the first box that needs fixing.
  useEffect(() => {
    if (state.wrong.length === 0) return;
    const first = formRef.current?.querySelector<HTMLElement>("[data-wrong='true']");
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
    first?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
  }, [state]);

  // The thank-you box is much shorter than the form it replaces, so bring it into view.
  useEffect(() => {
    if (state.thanks) thanksRef.current?.scrollIntoView({ block: "center" });
  }, [state.thanks]);

  const started = () => once("start", () => track(slug, { type: "form_start" }));
  const reachedQuestion = (id: string) => {
    started();
    once(`q:${id}`, () => track(slug, { type: "form_question", questionId: id }));
  };

  const wrong = (name: string) => state.wrong.includes(name);
  const value = (name: string) => state.values[name] ?? "";
  const field = (name: string, text: string, problem: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className={label} data-wrong={wrong(name)}>
      {text}
      <input name={name} required defaultValue={value(name)} aria-invalid={wrong(name)} className={wrong(name) ? inputWrong : inputOk} {...props} />
      {wrong(name) && <span className={hint}>{problem}</span>}
    </label>
  );

  if (state.thanks) {
    return (
      <div ref={thanksRef} role="status" className="rounded-md border border-neutral-300 bg-white px-4 py-8 text-center text-lg font-medium text-neutral-900">
        Thanks for your interest.
      </div>
    );
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-4" onInput={started}>
      <input type="hidden" name="slug" value={slug} />
      {Object.entries(utm).map(([key, v]) => (
        <input key={key} type="hidden" name={`utm_${key}`} value={v} />
      ))}
      {/* A trap for spam robots. People never see or fill this in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.message && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("firstName", "First name", "Please enter your first name.", { autoComplete: "given-name" })}
        {field("lastName", "Last name", "Please enter your last name.", { autoComplete: "family-name" })}
      </div>
      {field("email", "Email address", "This does not look like an email address. Please check it.", { type: "email", autoComplete: "email" })}
      {field("phone", "Mobile number", "This does not look like a phone number. Please check it.", { type: "tel", autoComplete: "tel" })}
      {field("postcode", "Postcode or town", "Please enter your postcode or town.", { autoComplete: "postal-code" })}

      {questions.map((q) => {
        const name = `q_${q.id}`;
        return (
          <fieldset key={q.id} className="flex flex-col gap-2" data-wrong={wrong(name)} onFocus={() => reachedQuestion(q.id)}>
            <legend className="mb-1 text-sm font-medium text-neutral-800">{q.label}</legend>
            {q.options.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2.5 text-sm text-neutral-900 has-[:checked]:border-[var(--brand)] has-[:checked]:ring-1 has-[:checked]:ring-[var(--brand)] ${
                  wrong(name) ? "border-2 border-red-600" : "border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  required
                  defaultChecked={value(name) === o.value}
                  className="h-5 w-5 shrink-0 accent-[var(--brand)]"
                  onChange={() => reachedQuestion(q.id)}
                />
                {o.label}
              </label>
            ))}
            {wrong(name) && <span className={hint}>Please pick one.</span>}
          </fieldset>
        );
      })}

      <label className={label}>
        Why are you looking at a franchise now? (optional)
        <textarea name="why" rows={3} defaultValue={value("why")} className={inputOk} />
      </label>

      <div data-wrong={wrong("consent")} className={wrong("consent") ? "rounded-md border-2 border-red-600 bg-red-50 p-2" : ""}>
        <label className="flex items-start gap-3 text-xs leading-relaxed text-neutral-700">
          <input type="checkbox" name="consent" required defaultChecked={value("consent") === "on"} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {consentWording}{" "}
            <a href={`/site/${slug}/privacy`} target="_blank" className="underline">
              Privacy notice
            </a>
          </span>
        </label>
        {wrong("consent") && <span className={`${hint} mt-1 block`}>Please tick this box to agree before sending the form.</span>}
      </div>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-neutral-700">
        <input type="checkbox" name="whatsapp" defaultChecked={value("whatsapp") === "on"} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{whatsappWording}</span>
      </label>

      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      )}

      <button
        disabled={pending}
        className="rounded-md bg-[var(--brand)] px-5 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send me the prospectus"}
      </button>
    </form>
  );
}
