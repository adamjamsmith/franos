import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { pretendHappened, staffBook, staffCancel, staffOutcome } from "@/app/b/[slug]/calls/actions";
import { endLead, moveClosing, reopen, saveNote, signLead } from "@/app/b/[slug]/work-actions";
import { slotsOnOffer } from "@/calls/calls";
import { callSettingsFor } from "@/calls/slots";
import { ukDate, ukTime, ukWhen } from "@/calls/time";
import { OutcomeBlock } from "@/components/outcome";
import { inputClass, Notice } from "@/components/ui";
import { type Db, type Role, type Session, withSession } from "@/db/context";
import { calls, consents, leadEvents, leads } from "@/db/schema";
import { nextEmailForLead } from "@/email/send";
import { isDev } from "@/lib/dev-mailbox";
import { type FitLine, fullFormFor, siteFor } from "@/site/config";
import { meterFor } from "@/work/meter";
import { LeadMeter } from "./lead-meter";
import { NEXT_MOVES, type NextMove, REASONS } from "@/work/outcomes";
import { nextAction, placeLead, STAGE_NAMES } from "@/work/stage";

/** "today at 9:20am", "tomorrow at 8:00am" or "on Friday 20 November at 9:20am". */
function nextEmailWhen(at: Date, now: Date): string {
  if (at.getTime() - now.getTime() < 60_000) return "within the next minute";
  if (ukDate(at) === ukDate(now)) return `today at ${ukTime(at)}`;
  if (ukDate(at) === ukDate(new Date(now.getTime() + 86_400_000))) return `tomorrow at ${ukTime(at)}`;
  return `on ${ukDate(at)} at ${ukTime(at)}`;
}

const docNames: Record<string, string> = { prospectus: "the prospectus", "next-steps": "Next steps", questions: "Questions" };
const callTime = (data: Record<string, unknown>) => (data.startsAt ? ukWhen(new Date(String(data.startsAt))) : "a time");

/** Turns a recorded event into a plain sentence for the activity list. */
function describe(type: string, data: Record<string, unknown>, videoTitle: (id: string) => string): string {
  switch (type) {
    case "signed_up":
      return `Signed up (Fit ${data.fitScore})`;
    case "signed_up_again":
      return `Filled in the form again (Fit ${data.fitScore})`;
    case "page_view":
      return `Opened the page ${data.path}`;
    case "video_progress":
      return Number(data.percent) === 0
        ? `Started watching "${videoTitle(String(data.videoId))}"`
        : `Watched ${data.percent}% of "${videoTitle(String(data.videoId))}"`;
    case "document_open":
      return `Opened ${docNames[String(data.kind)] ?? data.kind}`;
    case "document_download":
      return `Downloaded ${docNames[String(data.kind)] ?? data.kind}`;
    case "email_sent":
      return `Email sent: "${data.subject}"${data.reason && data.reason !== "next in the sequence" && data.reason !== "signed up" ? ` (because they ${String(data.reason).replace(/^has /, "have ")})` : ""}`;
    case "email_open":
      return `Opened the email (${data.emailKey})`;
    case "email_click":
      return `Clicked a link in the email (${data.emailKey}) to ${data.to}`;
    case "unsubscribed":
      return "Unsubscribed from emails";
    case "call_booked":
      return `Call booked for ${callTime(data)}${data.by === "staff" ? " (booked by the team)" : ""}`;
    case "call_rescheduled":
      return `Call moved to ${callTime(data)}${data.by === "staff" ? " (moved by the team)" : ""}`;
    case "call_cancelled":
      return `Call for ${callTime(data)} cancelled${data.by === "staff" ? " by the team" : " by the lead"}`;
    case "call_email":
      return `Call email sent: "${data.subject}"`;
    case "call_attended":
      return `Attended the call${data.minutes ? ` (${data.minutes} minutes)` : ""}`;
    case "call_no_show":
      return "No-show for the call";
    case "call_no_show_undone":
      return "No-show corrected: the lead did show up";
    case "speed_alert":
      return "The consultant was told to call this lead now";
    case "call_outcome":
      return `${data.corrected ? "Call answers corrected" : "How the call went was recorded"}: ${data.good ? "a good call" : "not a good call"}. Next: ${NEXT_MOVES[data.next as NextMove] ?? data.next}`;
    case "signed":
      return "Marked as signed";
    case "not_going_ahead":
      return `Marked as not going ahead: ${REASONS[String(data.reason)] ?? data.reason}${data.note ? ` (${data.note})` : ""}`;
    case "reopened":
      return "Reopened";
    case "moved_to_closing":
      return "Moved to Closing";
    case "moved_out_of_closing":
      return "Moved back out of Closing";
    case "note":
      return `Note${data.by ? ` from ${data.by}` : ""}: ${data.text}`;
    default:
      return type;
  }
}

const notices: Record<string, { kind: "ok" | "error"; text: string }> = {
  "call=booked": { kind: "ok", text: "Call booked. The lead and the consultant have been emailed." },
  "call=moved": { kind: "ok", text: "Call moved. The lead and the consultant have been emailed." },
  "call=cancelled": { kind: "ok", text: "Call cancelled. The lead and the consultant have been told." },
  "call=marked": { kind: "ok", text: "Call updated." },
  "call=time": { kind: "error", text: "That time is not available. Pick another." },
  "call=taken": { kind: "error", text: "Someone has just taken that time. Pick another." },
  "work=good": { kind: "ok", text: "Saved. franOS has recorded this as a good call." },
  "work=saved": { kind: "ok", text: "Saved. This was not recorded as a good call." },
  "work=signed": { kind: "ok", text: "Marked as signed. Their emails have stopped." },
  "work=ended": { kind: "ok", text: "Marked as not going ahead. Their emails have stopped." },
  "work=reopened": { kind: "ok", text: "Reopened." },
  "work=closing": { kind: "ok", text: "Moved to Closing." },
  "work=notclosing": { kind: "ok", text: "Moved back to Interested." },
  "work=noted": { kind: "ok", text: "Note added." },
  "work=nonote": { kind: "error", text: "Type something in the note first." },
  "work=reason": { kind: "error", text: "Pick a reason for not going ahead." },
};

const TABS = [
  { key: "opportunity", label: "Opportunity" },
  { key: "form", label: "Form" },
  { key: "activity", label: "Activity" },
] as const;
type Tab = (typeof TABS)[number]["key"];

type Props = {
  slug: string;
  leadId: string;
  /** The address this panel is shown at, without the tab: its own page, or the board with the pop-up open. */
  base: string;
  query: Record<string, string | string[] | undefined>;
  access: { session: Session; db: Db; role: Role; client: { id: string; slug: string; name: string; site: unknown; form: unknown } };
  /** Show only the top part (name, contact details, the meter) with a "View contact" button that goes here. */
  brief?: { viewHref: string };
};

/**
 * Everything about one lead, in three tabs: the opportunity (what to do and where it stands),
 * the form they filled in, and the activity so far. The same panel is used on the lead's own
 * page and in the pop-up over the board, so there is one place to change anything.
 * Returns null if the lead does not exist in this brand.
 */
export async function LeadPanel({ slug, leadId, base, query, access, brief }: Props) {
  const { session, db, role, client } = access;
  const canManage = role === "owner" || role === "consultant";
  const now = new Date();
  const tab: Tab = TABS.some((t) => t.key === query.tab) ? (query.tab as Tab) : "opportunity";
  const join = base.includes("?") ? "&" : "?";
  const here = `${base}${join}tab=${tab}`;

  const found = await withSession(db, session, async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return null;
    return {
      lead,
      events: await tx.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)).orderBy(desc(leadEvents.occurredAt), desc(leadEvents.id)).limit(500),
      consent: await tx.select().from(consents).where(eq(consents.leadId, leadId)).orderBy(desc(consents.occurredAt)),
      leadCalls: await tx.select().from(calls).where(eq(calls.leadId, leadId)).orderBy(desc(calls.startsAt)),
      days: canManage ? await slotsOnOffer(tx, client, now, leadId) : [],
      nextEmail: await nextEmailForLead(tx, client, leadId, now),
    };
  });
  if (!found) return null;
  const { lead, events, consent, leadCalls, days, nextEmail } = found;

  const site = siteFor(client);
  // The full form, so an answer that was later binned still shows its wording.
  const form = { questions: fullFormFor(client).questions.filter((q) => !q.removed) };
  const answers = lead.answers as Record<string, string>;
  const fit = lead.fitDetail as FitLine[];
  const utm = lead.utm as Record<string, string>;
  const goodFitFrom = callSettingsFor(site).alertFit;
  const placed = placeLead(lead, leadCalls, now, goodFitFrom);
  const meter = meterFor({ lead, events, calls: leadCalls, now, goodFitFrom });
  const booked = leadCalls.find((c) => c.status === "booked" && c.endsAt > now);
  const notes = events.filter((e) => e.type === "note");
  const noticeKey = typeof query.call === "string" ? `call=${query.call}` : typeof query.work === "string" ? `work=${query.work}` : "";
  const notice = notices[noticeKey];
  const videoTitle = (videoId: string) =>
    videoId === "vsl" ? "the introduction video" : (site.videos.find((v) => v.id === videoId)?.title ?? videoId);
  const when = (date: Date) => date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const phoneDigits = (lead.phone ?? "").replace(/[^\d+]/g, "");
  const hidden = (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="leadId" value={lead.id} />
      <input type="hidden" name="back" value={here} />
    </>
  );
  const callStatus = (c: (typeof leadCalls)[number]) =>
    c.status === "attended"
      ? `Attended${c.durationMinutes ? ` (${c.durationMinutes} minutes)` : ""}`
      : c.status === "no_show"
        ? "No-show"
        : c.status === "cancelled"
          ? "Cancelled"
          : c.endsAt > now
            ? "Booked"
            : "Waiting to hear from Zoom";
  const stagePill =
    placed.stage === "signed"
      ? "bg-green-100 text-green-900"
      : placed.stage === "closed"
        ? "bg-neutral-200 text-neutral-700"
        : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900";
  const heading = "mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500";

  // The Opportunity tab is a set of tight tables, in the same style as the meter above it.
  const edge = "border-neutral-300 dark:border-neutral-700";
  const table = `overflow-hidden rounded-md border text-sm ${edge}`;
  const row = `border-t px-3 py-2 first:border-t-0 ${edge}`;
  const entryRow = `${row} flex items-center gap-2 bg-neutral-100 !py-0 !pr-0 dark:bg-neutral-900`;
  const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
  const sectionName = `${small} mb-1`;
  const act = "text-xs text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100";
  const plus = `self-stretch border-l px-3 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${edge}`;
  const pill = "rounded-md border px-2.5 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 " + edge;
  const nextEmailText = lead.unsubscribedAt
    ? "Unsubscribed. No emails."
    : nextEmail
      ? `"${nextEmail.subject.replaceAll("{first_name}", lead.firstName ?? "").replaceAll("{brand}", client.name)}" · ${nextEmailWhen(nextEmail.at, now)}${nextEmail.kind === "reaction" || nextEmail.kind === "nudge" ? ` · ${nextEmail.kind === "reaction" ? "reaction" : "nudge"}: ${nextEmail.reason}` : ""}`
      : "None lined up.";
  // The "Add a note" row, used on the Opportunity and Activity tabs.
  const noteEntry = canManage && (
    <form action={saveNote} className={entryRow}>
      {hidden}
      <textarea name="note" rows={1} required placeholder="Add a note..." aria-label="Add a note" className="min-w-0 flex-1 resize-none bg-transparent py-2 outline-none placeholder:text-neutral-400" />
      <button className={plus} aria-label="Add note" title="Add note">
        +
      </button>
    </form>
  );

  const header = (
    <header>
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <h2 className="text-2xl font-semibold">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stagePill}`}>{STAGE_NAMES[placed.stage]}</span>
        {!lead.qualified && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900" title="They missed a must-have answer on the form. No emails, no booking.">
            Didn&apos;t qualify
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {phoneDigits ? (
          <a href={`tel:${phoneDigits}`} className="underline">
            {lead.phone}
          </a>
        ) : (
          "No phone"
        )}{" "}
        ·{" "}
        <a href={`mailto:${lead.email}`} className="underline">
          {lead.email}
        </a>
        {lead.postcode ? ` · ${lead.postcode}` : ""}
        {lead.whatsappOptIn ? " · WhatsApp OK" : ""}
      </p>
      <div className="mt-3">
        <LeadMeter meter={meter} />
      </div>
    </header>
  );

  // The brief box: who they are and where they stand, with one button through to everything else.
  if (brief) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Link href={brief.viewHref} scroll={false} className={`self-start ${pill} !px-3 !py-1.5 !text-sm`}>
          View lead
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}

      <nav className="flex gap-1 border-b border-neutral-300 text-sm font-medium dark:border-neutral-700">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`${base}${join}tab=${t.key}`}
            scroll={false}
            className={`-mb-px border-b-2 px-3 py-2 ${tab === t.key ? "border-neutral-900 dark:border-neutral-100" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      {tab === "opportunity" && (
        <>
          <section>
            <p className={sectionName}>Next</p>
            <div className={table}>
              <div className={row}>
                <span className="font-medium">{nextAction(placed)}</span>
              </div>
            </div>
          </section>

          <section>
            <p className={sectionName}>Calls</p>
            <div className={table}>
              {leadCalls.map((c) => (
                <div key={c.id} className={row}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-medium">{ukWhen(c.startsAt)}</span>
                    <span className={small}>{callStatus(c)}</span>
                    {c.status === "booked" && c.meetingUrl && (
                      <a href={c.meetingUrl} target="_blank" className={act}>
                        Join
                      </a>
                    )}
                    {c.recordingUrl && (
                      <a href={c.recordingUrl} target="_blank" className={act}>
                        Recording
                      </a>
                    )}
                    {canManage && c.status !== "cancelled" && (
                      <span className="ml-auto flex flex-wrap items-baseline gap-x-3">
                        {c.status === "booked" && (
                          <form action={staffCancel}>
                            {hidden}
                            <input type="hidden" name="callId" value={c.id} />
                            <button className={act}>Cancel</button>
                          </form>
                        )}
                        {c.startsAt <= now && (
                          <form action={staffOutcome} className="flex items-baseline gap-x-3">
                            {hidden}
                            <input type="hidden" name="callId" value={c.id} />
                            {c.status !== "attended" && (
                              <button name="outcome" value="showed" className={act}>
                                Attended
                              </button>
                            )}
                            {c.status !== "no_show" && (
                              <button name="outcome" value="no_show" className={act}>
                                No-show
                              </button>
                            )}
                          </form>
                        )}
                        {isDev && c.status === "booked" && (
                          <form action={pretendHappened} className="flex items-baseline gap-x-3">
                            {hidden}
                            <input type="hidden" name="callId" value={c.id} />
                            <button name="outcome" value="showed" className={act} title="Testing only: pretend this call has happened">
                              Test: happened
                            </button>
                            <button name="outcome" value="no_show" className={act} title="Testing only: pretend they did not show">
                              Test: no-show
                            </button>
                          </form>
                        )}
                      </span>
                    )}
                  </div>
                  {c.status === "attended" && (
                    <div className="mt-2">
                      <OutcomeBlock slug={slug} leadId={lead.id} call={c} canManage={canManage} requirements={site.requirements} back={here} />
                    </div>
                  )}
                  {c.transcript && (
                    <details className="mt-1">
                      <summary className={`${act} cursor-pointer`}>Transcript</summary>
                      <p className="mt-2 whitespace-pre-line text-neutral-700 dark:text-neutral-300">{c.transcript}</p>
                    </details>
                  )}
                </div>
              ))}
              {canManage && !lead.outcome ? (
                <form action={staffBook} className={entryRow}>
                  {hidden}
                  <select
                    name="startsAt"
                    required
                    defaultValue=""
                    aria-label={booked ? "Move the booked call to" : "Book a call"}
                    className="min-w-0 flex-1 cursor-pointer bg-transparent py-2 outline-none dark:[color-scheme:dark]"
                  >
                    <option value="" disabled>
                      {booked ? "Move the call to..." : "Book a call..."}
                    </option>
                    {days.map((day) => (
                      <optgroup key={day.day} label={ukDate(day.slots[0])}>
                        {day.slots.map((slot) => (
                          <option key={slot.toISOString()} value={slot.toISOString()}>
                            {ukDate(slot)}, {ukTime(slot)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button className={plus} aria-label={booked ? "Move call" : "Book call"} title={booked ? "Move call" : "Book call"}>
                    +
                  </button>
                </form>
              ) : (
                leadCalls.length === 0 && <div className={`${row} ${small}`}>No calls.</div>
              )}
            </div>
          </section>

          <section>
            <p className={sectionName}>Next email</p>
            <div className={table}>
              <div className={row}>{nextEmailText}</div>
            </div>
          </section>

          <section>
            <p className={sectionName}>Notes</p>
            <div className={table}>
              {noteEntry}
              {notes.slice(0, 3).map((n) => {
                const data = n.data as { text?: string; by?: string };
                return (
                  <div key={n.id} className={row}>
                    <p className="whitespace-pre-line">{data.text}</p>
                    <p className={small}>
                      {when(n.occurredAt)}
                      {data.by ? ` · ${data.by}` : ""}
                    </p>
                  </div>
                );
              })}
              {notes.length === 0 && !canManage && <div className={`${row} ${small}`}>No notes.</div>}
            </div>
          </section>

          <section>
            {lead.outcome ? (
              <div className={table}>
                <div className={`${row} flex flex-wrap items-baseline justify-between gap-x-3`}>
                  <span>
                    <span className="font-medium">{lead.outcome === "signed" ? "Signed" : "Not going ahead"}</span>
                    {lead.outcomeAt ? ` · ${lead.outcomeAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                    {lead.outcome !== "signed" && ` · ${REASONS[lead.outcomeReason ?? ""] ?? "no reason recorded"}`}
                    {lead.outcomeNote ? ` · ${lead.outcomeNote}` : ""}
                  </span>
                  {canManage && (
                    <form action={reopen}>
                      {hidden}
                      <button className={act}>Reopen</button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              canManage && (
                <div className="flex flex-wrap items-start gap-2">
                  {placed.stage === "interested" && (
                    <form action={moveClosing}>
                      {hidden}
                      <input type="hidden" name="closing" value="yes" />
                      <button className={pill}>Move to Closing</button>
                    </form>
                  )}
                  {placed.stage === "closing" && (
                    <form action={moveClosing}>
                      {hidden}
                      <input type="hidden" name="closing" value="no" />
                      <button className={pill}>Back to Interested</button>
                    </form>
                  )}
                  <form action={signLead}>
                    {hidden}
                    <button className={pill}>Signed</button>
                  </form>
                  <details open={query.work === "reason"}>
                    <summary className={`${pill} inline-block cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Not going ahead</summary>
                    <form action={endLead} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {hidden}
                      <select name="reason" required defaultValue="" aria-label="Reason" className={`${inputClass} w-56 !py-1.5 text-sm dark:[color-scheme:dark]`}>
                        <option value="" disabled>
                          Reason...
                        </option>
                        {Object.entries(REASONS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input name="note" placeholder="Note (optional)" className={`${inputClass} w-48 !py-1.5 text-sm`} />
                      <button className={pill}>Confirm</button>
                    </form>
                  </details>
                </div>
              )
            )}
          </section>
        </>
      )}

      {tab === "form" && (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Signed up {when(lead.createdAt)}
            {utm.content || utm.campaign ? ` · Ad: ${[utm.campaign, utm.term, utm.content].filter(Boolean).join(" / ")}` : " · No ad recorded"}
          </p>
          <section>
            <h3 className={heading}>Fit score: {lead.fitScore ?? "—"} out of 100</h3>
            <table className="w-full text-left text-sm">
              <tbody>
                {fit.map((line) => (
                  <tr key={line.questionId} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="py-2 pr-3">
                      <p className="text-neutral-500">{line.question}</p>
                      <p>{line.answer}</p>
                    </td>
                    <td className="whitespace-nowrap text-right align-top">
                      {line.points} of {line.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3 className={heading}>Other answers</h3>
            <dl className="flex flex-col gap-2 text-sm">
              {form.questions
                .filter((q) => !fit.some((line) => line.questionId === q.id))
                .map((q) => (
                  <div key={q.id}>
                    <dt className="text-neutral-500">{q.label}</dt>
                    <dd>{q.options.find((o) => o.value === answers[q.id])?.label ?? "—"}</dd>
                  </div>
                ))}
              <div>
                <dt className="text-neutral-500">Why are you looking at a franchise now?</dt>
                <dd className="whitespace-pre-line">{answers.why || "—"}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3 className={heading}>Consent</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {consent.map((c) => (
                <li key={c.id}>
                  <p className="text-neutral-500">Agreed {when(c.occurredAt)}</p>
                  <p>{c.wording}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {tab === "activity" && (
        <>
          {noteEntry && <div className={table}>{noteEntry}</div>}
          <ul className="flex flex-col text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex gap-4 border-t border-neutral-200 py-2 dark:border-neutral-800">
                <span className="w-28 shrink-0 text-neutral-500">{when(event.occurredAt)}</span>
                <span className="whitespace-pre-line">{describe(event.type, event.data as Record<string, unknown>, videoTitle)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
