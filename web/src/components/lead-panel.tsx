import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { pretendHappened, staffBook, staffCancel, staffOutcome } from "@/app/b/[slug]/calls/actions";
import { endLead, moveClosing, reopen, saveNote, signLead } from "@/app/b/[slug]/work-actions";
import { slotsOnOffer } from "@/calls/calls";
import { callSettingsFor } from "@/calls/slots";
import { ukDate, ukTime, ukWhen } from "@/calls/time";
import { OutcomeBlock } from "@/components/outcome";
import { buttonClass, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { type Db, type Role, type Session, withSession } from "@/db/context";
import { calls, consents, leadEvents, leads } from "@/db/schema";
import { nextStepFor, pathFrom } from "@/email/render";
import { nextEmailForLead } from "@/email/send";
import { isDev } from "@/lib/dev-mailbox";
import { type FitLine, formFor, siteFor } from "@/site/config";
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
      return `Showed up for the call${data.minutes ? ` (${data.minutes} minutes)` : ""}`;
    case "call_no_show":
      return "Did not show up for the call";
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
};

/**
 * Everything about one lead, in three tabs: the opportunity (what to do and where it stands),
 * the form they filled in, and the activity so far. The same panel is used on the lead's own
 * page and in the pop-up over the board, so there is one place to change anything.
 * Returns null if the lead does not exist in this brand.
 */
export async function LeadPanel({ slug, leadId, base, query, access }: Props) {
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
  const form = formFor(client);
  const answers = lead.answers as Record<string, string>;
  const fit = lead.fitDetail as FitLine[];
  const utm = lead.utm as Record<string, string>;
  const placed = placeLead(lead, leadCalls, now, callSettingsFor(site).alertFit);
  const path = pathFrom(events);
  const next = nextStepFor(path);
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
      ? `Showed${c.durationMinutes ? ` (${c.durationMinutes} minutes)` : ""}`
      : c.status === "no_show"
        ? "No-show"
        : c.status === "cancelled"
          ? "Cancelled"
          : c.endsAt > now
            ? "Booked"
            : "Waiting to hear from Zoom";
  const pathSteps = [
    { label: "Introduction video", done: path.video },
    { label: "Prospectus", done: path.prospectus },
    { label: "Call", done: path.call },
    { label: "Next steps", done: path["next-steps"] },
    { label: "Questions", done: path.questions },
  ];
  const nextNames = { prospectus: "read the prospectus", call: "schedule a call", "next-steps": "read Next steps", questions: "read Questions", done: "nothing, every step is done" };
  const stagePill =
    placed.stage === "signed"
      ? "bg-green-100 text-green-900"
      : placed.stage === "closed"
        ? "bg-neutral-200 text-neutral-700"
        : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900";
  const heading = "mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500";

  const noteForm = canManage && (
    <form action={saveNote} className="flex flex-wrap items-start gap-2">
      {hidden}
      <textarea name="note" rows={1} required placeholder="Add a note: a call made, a message left, anything worth remembering" className={`${inputClass} min-w-64 flex-1 text-sm`} />
      <button className={quietButtonClass}>Add note</button>
    </form>
  );

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <h2 className="text-2xl font-semibold">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stagePill}`}>{STAGE_NAMES[placed.stage]}</span>
          <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">Fit {lead.fitScore ?? "—"}</span>
          {placed.goodCall && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">Good call</span>}
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
      </header>

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
          <section className="rounded-lg bg-neutral-100 p-3 dark:bg-neutral-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Do next</p>
            <p className="text-base font-medium">{nextAction(placed)}</p>
            {placed.nextCall && <p className="text-sm text-neutral-600 dark:text-neutral-400">Call on {ukWhen(placed.nextCall)}.</p>}
          </section>

          <section>
            <h3 className={heading}>Calls</h3>
            {leadCalls.length === 0 && <p className="mb-3 text-sm text-neutral-500">No calls yet.</p>}
            <ul className="flex flex-col gap-3 text-sm">
              {leadCalls.map((c) => (
                <li key={c.id} className="rounded-md border border-neutral-300 p-3 dark:border-neutral-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      <span className="font-medium">{ukWhen(c.startsAt)}</span> · {callStatus(c)}
                      {c.status === "booked" && c.meetingUrl && (
                        <>
                          {" · "}
                          <a href={c.meetingUrl} target="_blank" className="underline">
                            Join on Zoom
                          </a>
                        </>
                      )}
                      {c.recordingUrl && (
                        <>
                          {" · "}
                          <a href={c.recordingUrl} target="_blank" className="underline">
                            Recording
                          </a>
                        </>
                      )}
                    </p>
                    {canManage && c.status !== "cancelled" && (
                      <div className="flex flex-wrap gap-2">
                        {c.status === "booked" && (
                          <form action={staffCancel}>
                            {hidden}
                            <input type="hidden" name="callId" value={c.id} />
                            <button className={quietButtonClass}>Cancel call</button>
                          </form>
                        )}
                        {c.startsAt <= now && (
                          <form action={staffOutcome} className="flex gap-2">
                            {hidden}
                            <input type="hidden" name="callId" value={c.id} />
                            {c.status !== "attended" && (
                              <button name="outcome" value="showed" className={quietButtonClass}>
                                Mark as showed
                              </button>
                            )}
                            {c.status !== "no_show" && (
                              <button name="outcome" value="no_show" className={quietButtonClass}>
                                Mark as no-show
                              </button>
                            )}
                          </form>
                        )}
                        {isDev && c.status === "booked" && (
                          <form action={pretendHappened} className="flex gap-2">
                            {hidden}
                            <input type="hidden" name="callId" value={c.id} />
                            <button name="outcome" value="showed" className={quietButtonClass}>
                              Pretend this call has happened
                            </button>
                            <button name="outcome" value="no_show" className={quietButtonClass}>
                              Pretend they did not show
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                  {c.transcript && (
                    <details className="mt-2">
                      <summary className="cursor-pointer underline">Read the transcript</summary>
                      <p className="mt-2 whitespace-pre-line text-neutral-700 dark:text-neutral-300">{c.transcript}</p>
                    </details>
                  )}
                  {c.status === "attended" && (
                    <div className="mt-3">
                      <OutcomeBlock slug={slug} leadId={lead.id} call={c} canManage={canManage} requirements={site.requirements} back={here} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {canManage && !lead.outcome && (
              <form action={staffBook} className="mt-3 flex flex-wrap items-end gap-2 text-sm">
                {hidden}
                <select name="startsAt" required defaultValue="" aria-label={booked ? "Move the booked call to" : "Book a call"} className={`${inputClass} w-64`}>
                  <option value="" disabled>
                    {booked ? "Move the booked call to..." : "Book a call for..."}
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
                <button className={quietButtonClass}>{booked ? "Move call" : "Book call"}</button>
              </form>
            )}
          </section>

          <section>
            <h3 className={heading}>What they have seen</h3>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {pathSteps.map((step) => (
                <li key={step.label} className={step.done ? "" : "text-neutral-500"}>
                  {step.done ? "✓" : "○"} {step.label}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              The emails are pushing them to: {nextNames[next]}.{lead.unsubscribedAt ? " They have unsubscribed from the emails." : ""}
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {nextEmail
                ? `Next email: "${nextEmail.subject.replaceAll("{first_name}", lead.firstName ?? "").replaceAll("{brand}", client.name)}", ${nextEmailWhen(nextEmail.at, now)}${nextEmail.kind === "reaction" || nextEmail.kind === "nudge" ? ` (${nextEmail.kind === "reaction" ? "a reaction" : "a nudge"}: ${nextEmail.reason})` : ""}.`
                : "No more emails are lined up for this lead."}
            </p>
          </section>

          <section>
            <h3 className={heading}>Notes</h3>
            {noteForm}
            {notes.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {notes.slice(0, 3).map((n) => {
                  const data = n.data as { text?: string; by?: string };
                  return (
                    <li key={n.id}>
                      <span className="text-neutral-500">
                        {when(n.occurredAt)}
                        {data.by ? `, ${data.by}` : ""}:
                      </span>{" "}
                      <span className="whitespace-pre-line">{data.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {notes.length === 0 && !canManage && <p className="text-sm text-neutral-500">No notes yet.</p>}
          </section>

          <section className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            {lead.outcome ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p>
                  {lead.outcome === "signed" ? "Signed" : "Not going ahead"}
                  {lead.outcomeAt ? ` on ${lead.outcomeAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  {lead.outcome !== "signed" && `: ${REASONS[lead.outcomeReason ?? ""] ?? "no reason recorded"}`}
                  {lead.outcomeNote ? ` (${lead.outcomeNote})` : ""}. Their emails have stopped.
                </p>
                {canManage && (
                  <form action={reopen}>
                    {hidden}
                    <button className={quietButtonClass}>Reopen</button>
                  </form>
                )}
              </div>
            ) : (
              canManage && (
                <div className="flex flex-wrap items-start gap-3 text-sm">
                  {placed.stage === "interested" && (
                    <form action={moveClosing}>
                      {hidden}
                      <input type="hidden" name="closing" value="yes" />
                      <button className={buttonClass}>Move to Closing</button>
                    </form>
                  )}
                  {placed.stage === "closing" && (
                    <form action={moveClosing}>
                      {hidden}
                      <input type="hidden" name="closing" value="no" />
                      <button className={quietButtonClass}>Move back to Interested</button>
                    </form>
                  )}
                  <form action={signLead}>
                    {hidden}
                    <button className={placed.stage === "closing" ? buttonClass : quietButtonClass}>Mark as signed</button>
                  </form>
                  <details open={query.work === "reason"}>
                    <summary className={`${quietButtonClass} inline-block cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Not going ahead...</summary>
                    <form action={endLead} className="mt-2 flex flex-wrap items-center gap-2">
                      {hidden}
                      <select name="reason" required defaultValue="" aria-label="Reason" className={`${inputClass} w-64`}>
                        <option value="" disabled>
                          Pick a reason
                        </option>
                        {Object.entries(REASONS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input name="note" placeholder="Note (optional)" className={`${inputClass} w-52`} />
                      <button className={quietButtonClass}>Confirm</button>
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
          {noteForm}
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
