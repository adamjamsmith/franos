import type { ReactNode } from "react";
import type { SoundFile } from "@/calls/provider";
import { ukWhen } from "@/calls/time";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyLink } from "@/components/copy-link";
import { bookingPath, KIND_LABELS, personName, type RecordingSession, SESSION_KINDS, type SessionKind, sessionPath } from "@/sessions/sessions";
import { ownerCancelSession, ownerDeleteSession } from "./session-actions";

const line = "border-neutral-300 dark:border-neutral-700";
const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const icon = "flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const STATES: Record<string, { says: string; colour: string }> = {
  booked: { says: "Booked", colour: "bg-sky-500/20" },
  happened: { says: "Happened", colour: "bg-green-500/20" },
  no_show: { says: "Did not happen", colour: "bg-red-500/20" },
  needs_look: { says: "Needs a look", colour: "bg-amber-500/20" },
  cancelled: { says: "Cancelled", colour: "text-neutral-500 line-through" },
};
export const sessionState = (session: RecordingSession, now: Date) =>
  session.status === "booked" && session.endsAt <= now ? { says: "Waiting for the recording", colour: "bg-amber-500/20" } : (STATES[session.status] ?? STATES.booked);

/** The owner's list of recording sessions for a brand: the booking links to share, then every session in a tight table. */
export function SessionsView({ brand, sessions, now }: { brand: { id: string; slug: string }; sessions: RecordingSession[]; now: Date }) {
  const upcoming = sessions.filter((s) => s.status === "booked" && s.endsAt > now);
  const past = sessions.filter((s) => !(s.status === "booked" && s.endsAt > now)).reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md border px-3 py-1.5 text-sm ${line}`}>
        {SESSION_KINDS.map((kind) => (
          <span key={kind} className="flex items-center gap-1">
            {KIND_LABELS[kind]}
            <CopyLink path={bookingPath(brand, kind)} label={KIND_LABELS[kind].toLowerCase()} />
          </span>
        ))}
      </div>

      <div className={`overflow-hidden rounded-md border text-sm ${line}`}>
        {sessions.length === 0 && <p className={`${small} px-3 py-2`}>No sessions.</p>}
        {[...upcoming, ...past].map((session) => {
          const state = sessionState(session, now);
          const sounds = (session.soundFiles ?? []) as SoundFile[];
          const hidden = (
            <>
              <input type="hidden" name="slug" value={brand.slug} />
              <input type="hidden" name="sessionId" value={session.id} />
            </>
          );
          return (
            <details key={session.id} className={`group border-t first:border-t-0 ${line}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                <span className="w-60 shrink-0 tabular-nums">{ukWhen(session.startsAt)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{personName(session)}</span>
                <span className={`${small} w-32`}>{KIND_LABELS[session.kind as SessionKind]}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs ${state.colour}`}>{state.says}</span>
                <span className="flex items-center">
                  {session.recordingUrl && (
                    <a href={session.recordingUrl} target="_blank" aria-label="Open the recording" title="Open the recording" className={icon}>
                      <Svg>
                        <path d="M8 5.500v13l11-6.500z" />
                      </Svg>
                    </a>
                  )}
                  {session.status === "booked" && session.endsAt > now && (
                    <>
                      {session.meetingUrl && (
                        <a href={session.meetingUrl} target="_blank" aria-label="Join on Zoom" title="Join on Zoom" className={icon}>
                          <Svg>
                            <rect x="3" y="7" width="12" height="10" rx="2" />
                            <path d="M15 11l6-3v8l-6-3" />
                          </Svg>
                        </a>
                      )}
                      <a href={sessionPath(brand.slug, session.id)} target="_blank" aria-label="Move the session" title="Move the session" className={icon}>
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
                  {session.phone ? ` · ${session.phone}` : ""}
                  {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
                </p>
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
                <p className={small}>
                  Agreed {ukWhen(session.consentAt)}: {session.consentWording}
                </p>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
