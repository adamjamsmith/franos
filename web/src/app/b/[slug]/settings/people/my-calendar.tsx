import type { CalendarState } from "@/calendars/calendars";
import { ukWhen } from "@/calls/time";
import { buttonClass, Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { linkMyCalendar, unlinkMyCalendar } from "./calendar-actions";

const problems: Record<string, string> = {
  address: "That is not a calendar address. It should start with https:// or webcal://.",
  fetch: "franOS could not open that address. Check it was copied in full.",
  calendar: "That address opened, but it is not a calendar. Copy the one that ends in .ics.",
};

/** The signed-in person's own calendar: link it once and the booking pages stop offering times they are busy. */
export function MyCalendar({ slug, state, result }: { slug: string; state: CalendarState; result?: string }) {
  return (
    <div className="rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-semibold">Your calendar</h3>
        {state.linked ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900 dark:bg-green-950 dark:text-green-200">Linked</span>
        ) : (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Not linked</span>
        )}
      </div>
      <p className="mb-3 text-sm text-neutral-500">
        Link your own calendar and the booking pages stop offering any time you are busy. franOS reads the times only, never what an appointment is.
      </p>
      {result === "linked" && <Notice kind="ok">Linked. Times you are busy are no longer offered.</Notice>}
      {result === "unlinked" && <Notice kind="ok">Unlinked.</Notice>}
      {result && problems[result] && <Notice>{problems[result]}</Notice>}
      {state.linked && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>
            Last read {state.checkedAt ? ukWhen(state.checkedAt) : "never"} · {state.busy ?? 0} busy times ahead
          </span>
          <form action={unlinkMyCalendar}>
            <input type="hidden" name="slug" value={slug} />
            <button className={quietButtonClass}>Unlink</button>
          </form>
        </div>
      )}
      {state.problem && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Last reading failed: {state.problem} The last known busy times are still used.</p>}
      <form action={linkMyCalendar} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="slug" value={slug} />
        <Field label={state.linked ? "Replace with a new private address" : "Your calendar's private address"}>
          <input name="address" type="password" required autoComplete="off" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" className={inputClass} />
        </Field>
        <button className={`${buttonClass} self-start`}>{state.linked ? "Replace" : "Link calendar"}</button>
      </form>
      <details className="mt-3 text-sm text-neutral-500">
        <summary className="cursor-pointer">Where to find the address</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong>Google:</strong> calendar.google.com, the cog, Settings. Click your calendar on the left, scroll to &quot;Secret address in iCal format&quot; and copy it.
          </li>
          <li>
            <strong>Outlook:</strong> the cog, Calendar, Shared calendars. Under &quot;Publish a calendar&quot; pick your calendar and &quot;Can view when I&apos;m busy&quot;, press Publish and copy the ICS link.
          </li>
          <li>The address works like a password: paste it here only. It is stored sealed and never shown again.</li>
        </ul>
      </details>
    </div>
  );
}
