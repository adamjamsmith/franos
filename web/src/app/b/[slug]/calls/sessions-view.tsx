import type { ReactNode } from "react";
import type { SoundFile } from "@/calls/provider";
import { ukTime, ukWhen } from "@/calls/time";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyLink } from "@/components/copy-link";
import { BOOKABLE_KINDS, bookingPath, hasPermission, KIND_LABELS, personName, type RecordingSession, SESSION_KINDS, type SessionKind, sessionPath } from "@/sessions/sessions";
import { ownerAddSession, ownerCancelSession, ownerDeleteSession } from "./session-actions";

const line = "border-neutral-300 dark:border-neutral-700";
const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const icon = "flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";
// Boxes follow the screen: white on light, near-black on dark, including the lists that drop down from them.
const box = `h-8 w-full min-w-0 rounded-md border bg-white px-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 dark:[color-scheme:dark] dark:focus:border-white ${line}`;
const card = `rounded-md border ${line}`;
const heading = "text-sm font-semibold";

/** "Wed 18 Nov, 10:30am": short enough for one line of the table. Always UK time. */
const shortDay = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" });
const shortWhen = (date: Date) => `${shortDay.format(date).replace(",", "")}, ${ukTime(date)}`;

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const Field = ({ label, className, children }: { label: string; className?: string; children: ReactNode }) => (
  <label className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}>
    <span className={small}>{label}</span>
    {children}
  </label>
);

const STATES: Record<string, { says: string; colour: string }> = {
  booked: { says: "Booked", colour: "bg-sky-500/20" },
  happened: { says: "Recorded", colour: "bg-green-500/20" },
  no_show: { says: "Did not happen", colour: "bg-red-500/20" },
  needs_look: { says: "Recording missing", colour: "bg-amber-500/20" },
  cancelled: { says: "Cancelled", colour: "text-neutral-500 line-through" },
};
export const sessionState = (session: RecordingSession, now: Date) =>
  session.status === "booked" && session.endsAt <= now ? { says: "Waiting for the recording", colour: "bg-amber-500/20" } : (STATES[session.status] ?? STATES.booked);

const PROBLEMS: Record<string, string> = {
  details: "A first name and a real email address are needed.",
  time: "That date and time is not valid, or has already passed.",
  taken: "That time clashes with another session or a call.",
};

/** What each booking link is called on its copy button. */
const LINK_NAMES: Record<(typeof BOOKABLE_KINDS)[number], string> = {
  testimonial: "Franchisee testimonial",
  franchisor: "Franchisor interview",
  other: "General recording",
};

/**
 * The owner's screen for recorded sessions. Two ways to book one, side by side: send a link and let the person
 * pick a time, or book it yourself when the time is already agreed. Under them, every session and its recording.
 */
export function SessionsView({ brand, sessions, now, problem, done }: { brand: { id: string; slug: string }; sessions: RecordingSession[]; now: Date; problem?: string; done?: string }) {
  const upcoming = sessions.filter((s) => s.status === "booked" && s.endsAt > now);
  const past = sessions.filter((s) => !(s.status === "booked" && s.endsAt > now)).reverse();

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Sessions</h2>

      <div className="flex flex-col gap-4">
        <section className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 ${card}`}>
          <span className="mr-1">
            <span className={`block ${heading}`}>Send a link</span>
            <span className={small}>Click to copy. They pick the time.</span>
          </span>
          {BOOKABLE_KINDS.map((kind) => (
            <CopyLink key={kind} path={bookingPath(brand, kind)} label={`Copy the ${LINK_NAMES[kind].toLowerCase()} booking link`} text={LINK_NAMES[kind]} />
          ))}
          <a href={`/b/${brand.slug}/settings/sessions`} className={`ml-auto underline ${small}`}>
            Times on offer
          </a>
        </section>

        <section className={card}>
          <header className={`flex items-baseline justify-between gap-3 border-b px-3 py-2 ${line}`}>
            <h3 className={heading}>Book it yourself</h3>
            <span className={small}>The time is already agreed</span>
          </header>
          <form action={ownerAddSession} className="grid grid-cols-2 gap-x-3 gap-y-2.5 p-3 sm:grid-cols-6">
            <input type="hidden" name="slug" value={brand.slug} />
            <Field label="What it is" className="col-span-2 sm:col-span-3">
              <select name="kind" defaultValue="franchisor" className={box}>
                {SESSION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Keep" className="col-span-2 sm:col-span-3">
              <select name="keep" defaultValue="video" className={box}>
                <option value="video">Video, sound and transcript</option>
                <option value="transcript">Transcript and sound only</option>
              </select>
            </Field>
            <Field label="First name" className="sm:col-span-2">
              <input name="firstName" required autoComplete="off" className={box} />
            </Field>
            <Field label="Last name" className="sm:col-span-2">
              <input name="lastName" autoComplete="off" className={box} />
            </Field>
            <Field label="Their email" className="col-span-2 sm:col-span-2">
              <input name="email" type="email" required autoComplete="off" className={box} />
            </Field>
            <Field label="Date" className="sm:col-span-2">
              <input name="date" type="date" required className={box} />
            </Field>
            <Field label="Time (UK)" className="sm:col-span-2">
              <input name="time" type="time" required step={300} className={box} />
            </Field>
            <Field label="Length" className="col-span-2 sm:col-span-2">
              <select name="minutes" defaultValue="60" className={box}>
                {[30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </Field>
            <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-6">
              <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-xs font-semibold text-white hover:opacity-90 dark:bg-white dark:text-neutral-900">
                <Svg>
                  <path d="M12 5v14M5 12h14" />
                </Svg>
                Book session
              </button>
              {problem && PROBLEMS[problem] && <span className="text-xs text-red-600 dark:text-red-400">{PROBLEMS[problem]}</span>}
              {done === "booked" && <span className="text-xs text-green-700 dark:text-green-400">Booked. The Zoom link is on its row below.</span>}
            </div>
          </form>
        </section>
      </div>

      <section className={`overflow-hidden text-sm ${card}`}>
        <div className={`hidden items-center gap-x-3 border-b px-3 py-1.5 sm:flex ${small} ${line}`}>
          <span className="w-40 shrink-0">When</span>
          <span className="min-w-0 flex-1">Who</span>
          <span className="w-32 shrink-0">What</span>
          <span className="w-20 shrink-0">Keeps</span>
          <span className="w-40 shrink-0">Status</span>
          <span className="w-28 shrink-0" />
        </div>
        {sessions.length === 0 && <p className={`${small} px-3 py-2.5`}>No sessions yet.</p>}
        {[...upcoming, ...past].map((session) => {
          const state = sessionState(session, now);
          const sounds = (session.soundFiles ?? []) as SoundFile[];
          const isUpcoming = session.status === "booked" && session.endsAt > now;
          const hidden = (
            <>
              <input type="hidden" name="slug" value={brand.slug} />
              <input type="hidden" name="sessionId" value={session.id} />
            </>
          );
          return (
            <details key={session.id} className={`group border-t first:border-t-0 ${line}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                <span className="w-40 shrink-0 tabular-nums" title={ukWhen(session.startsAt)}>{shortWhen(session.startsAt)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{personName(session)}</span>
                <span className={`${small} w-32 shrink-0`}>{KIND_LABELS[session.kind as SessionKind]}</span>
                <span className={`${small} w-20 shrink-0`}>{session.keepVideo ? "Video" : "Transcript"}</span>
                <span className="flex w-40 shrink-0 flex-wrap items-center gap-1">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${state.colour}`}>{state.says}</span>
                  {!hasPermission(session) && session.status !== "cancelled" && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs">No permission yet</span>}
                </span>
                <span className="flex w-28 shrink-0 items-center justify-end">
                  {session.recordingUrl && (
                    <a href={session.recordingUrl} target="_blank" aria-label="Open the recording" title="Open the recording" className={icon}>
                      <Svg>
                        <path d="M8 5.500v13l11-6.500z" />
                      </Svg>
                    </a>
                  )}
                  {isUpcoming && (
                    <>
                      {session.meetingUrl && <CopyLink url={session.meetingUrl} label="Copy the Zoom link to send them" />}
                      <a href={sessionPath(brand.slug, session.id)} target="_blank" aria-label="Open their page, to move it" title="Open their page, to move it" className={icon}>
                        <Svg>
                          <rect x="4" y="5" width="16" height="15" rx="2" />
                          <path d="M4 10h16M8 3v4M16 3v4" />
                        </Svg>
                      </a>
                      <form action={ownerCancelSession}>
                        {hidden}
                        <ConfirmButton question={`Cancel the session with ${personName(session)}? They will be emailed.`} label="Cancel the session" className={icon}>
                          <Svg>
                            <path d="M6 6l12 12M18 6L6 18" />
                          </Svg>
                        </ConfirmButton>
                      </form>
                    </>
                  )}
                  <form action={ownerDeleteSession}>
                    {hidden}
                    <ConfirmButton question={`Delete the session with ${personName(session)} and everything recorded for it? This cannot be undone.`} label="Delete the session and its recording" className={icon}>
                      <Svg>
                        <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />
                      </Svg>
                    </ConfirmButton>
                  </form>
                </span>
              </summary>
              <div className={`flex flex-col gap-2 border-t px-3 py-2 ${line}`}>
                <p className={small}>
                  {session.email}
                  {session.location ? ` · ${session.location}` : ""}
                  {session.phone ? ` · ${session.phone}` : ""}
                  {session.durationMinutes ? ` · ran ${session.durationMinutes} min` : ""}
                </p>
                {isUpcoming && session.meetingUrl && (
                  <p className="flex flex-wrap items-center gap-2 text-xs">
                    <a href={session.meetingUrl} target="_blank" className="underline">
                      Start on Zoom
                    </a>
                    <CopyLink url={session.meetingUrl} label="Copy the Zoom link to send them" text="Copy Zoom link" />
                    <CopyLink path={sessionPath(brand.slug, session.id)} label="Copy the link to their own page" text="Copy their page link" />
                  </p>
                )}
                {sounds.length > 0 && (
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {sounds.map((file) => (
                      <a key={file.url} href={file.url} target="_blank" className="underline">
                        {file.name}
                      </a>
                    ))}
                  </p>
                )}
                {session.transcript && <p className="max-h-80 overflow-y-auto whitespace-pre-line text-xs text-neutral-700 dark:text-neutral-300">{session.transcript}</p>}
                <p className={small}>{hasPermission(session) ? `Agreed ${ukWhen(session.consentAt)}: ${session.consentWording}` : "They have not ticked the permission box on their page yet."}</p>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
