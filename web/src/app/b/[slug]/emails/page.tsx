import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  buttonClass,
  Field,
  inputClass,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { withSession } from "@/db/context";
import { emails, emailSends, leadEvents } from "@/db/schema";
import { starterEmails } from "@/email/defaults";
import { emailSettingsFor } from "@/email/render";
import { isDev } from "@/lib/dev-mailbox";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import {
  addSequenceEmail,
  addStarters,
  deleteEmail,
  moveEmail,
  sendNow,
} from "./actions";

/** When a reaction or nudge goes, in plain words. */
function whenSent(email: {
  kind: string;
  trigger: string | null;
  dayOffset: number;
}): string {
  if (email.kind === "prospectus") return "At sign-up";
  if (email.kind === "sequence") return `Day ${email.dayOffset}`;
  if (email.trigger === "prospectus_read")
    return "10 minutes after they read the prospectus";
  if (email.trigger === "testimonial_watched")
    return "10 minutes after they watch half a testimonial";
  if (email.trigger === "no_prospectus")
    return `${email.dayOffset} days after sign-up, prospectus not opened`;
  if (email.trigger === "no_call")
    return `${email.dayOffset} days after reading the prospectus, no call booked`;
  return "";
}

const CALL_EMAILS = [
  { kind: "confirmation", name: "Your call is booked", when: "When a call is booked" },
  { kind: "reminder_3days", name: "Your call is in 3 days", when: "3 days before the call" },
  { kind: "reminder_day", name: "Reminder: your call is tomorrow", when: "The day before the call" },
  { kind: "reminder_12hours", name: "Your call is in 12 hours", when: "12 hours before the call" },
  { kind: "reminder_hour", name: "Your call starts in 1 hour", when: "1 hour before the call" },
  { kind: "reminder_10min", name: "Starting in 10 minutes", when: "10 minutes before the call" },
  { kind: "changed", name: "Your call has moved", when: "When a call is moved" },
  { kind: "cancelled", name: "Your call has been cancelled", when: "When a call is cancelled" },
];

export default async function EmailsPage({
  params,
  searchParams,
}: PageProps<"/b/[slug]/emails">) {
  const { slug } = await params;
  const query = await searchParams;
  const { session, db, client, role } = await requireBrand(slug);
  const isOwner = role === "owner";
  const settings = emailSettingsFor(client.name, siteFor(client));

  const { rows, callCounts } = await withSession(db, session, async (tx) => ({
    rows: await tx
      .select({
        email: emails,
        sent: sql<number>`count(${emailSends.id})::int`,
        opened: sql<number>`count(${emailSends.openedAt})::int`,
        clicked: sql<number>`count(${emailSends.firstClickedAt})::int`,
        unsubscribed: sql<number>`count(${emailSends.unsubscribedAt})::int`,
      })
      .from(emails)
      .leftJoin(emailSends, eq(emailSends.emailId, emails.id))
      .groupBy(emails.id)
      .orderBy(asc(emails.position)),
    callCounts: await tx
      .select({
        kind: sql<string>`${leadEvents.data}->>'kind'`,
        sent: sql<number>`count(*)::int`,
      })
      .from(leadEvents)
      .where(eq(leadEvents.type, "call_email"))
      .groupBy(sql`${leadEvents.data}->>'kind'`),
  }));
  type Row = (typeof rows)[number];
  const of = (kind: string) => rows.filter((r) => r.email.kind === kind);
  const sequence = of("sequence");
  const callSent = (kind: string) =>
    callCounts.find((c) => c.kind === kind)?.sent ?? 0;
  const missing = starterEmails.filter(
    (s) => !rows.some((r) => r.email.key === s.key),
  );
  const missingNew = rows.length > 0 && missing.length > 0;

  // The same column widths in every folder, so the numbers line up down the page.
  const head = (
    <>
      <colgroup>
        <col className="w-[24%]" />
        <col className="w-[27%]" />
        <col className="w-[5%]" />
        <col className="w-[6%]" />
        <col className="w-[7%]" />
        <col className="w-[7%]" />
        <col className="w-[6%]" />
        <col className="w-[18%]" />
      </colgroup>
      <thead className="text-xs text-neutral-500">
        <tr>
          <th className="py-1 font-normal">Email</th>
          <th className="font-normal">When it is sent</th>
          <th className="font-normal">On</th>
          <th className="text-right font-normal">Sent</th>
          <th className="text-right font-normal">Opened</th>
          <th className="text-right font-normal">Clicked</th>
          <th className="text-right font-normal">Unsub</th>
          <th></th>
        </tr>
      </thead>
    </>
  );
  const line = (row: Row, extra?: ReactNode, when?: string) => (
    <tr
      key={row.email.id}
      className="border-t border-neutral-200 dark:border-neutral-800"
    >
      <td className="py-2 pr-3">
        <Link
          href={`/b/${slug}/emails/${row.email.id}`}
          className="font-medium underline"
        >
          {row.email.name ?? row.email.subject}
        </Link>
        {row.email.name && <span className="block truncate text-xs text-neutral-500">{row.email.subject}</span>}
      </td>
      <td className="pr-3 text-neutral-600 dark:text-neutral-400">
        {when ?? whenSent(row.email)}
      </td>
      <td>{row.email.active ? "Yes" : "Off"}</td>
      <td className="text-right">{row.sent}</td>
      <td className="text-right">{row.opened}</td>
      <td className="text-right">{row.clicked}</td>
      <td
        className={`text-right ${row.unsubscribed > 0 ? "font-semibold text-red-700" : ""}`}
      >
        {row.unsubscribed}
      </td>
      <td className="pl-2 text-right">{extra}</td>
    </tr>
  );
  const fixedLine = (name: string, when: string, sent: number) => (
    <tr
      key={name}
      className="border-t border-neutral-200 dark:border-neutral-800"
    >
      <td className="py-2 pr-3 font-medium">{name}</td>
      <td className="pr-3 text-neutral-600 dark:text-neutral-400">{when}</td>
      <td>Yes</td>
      <td className="text-right">{sent}</td>
      <td className="text-right text-neutral-400">—</td>
      <td className="text-right text-neutral-400">—</td>
      <td className="text-right text-neutral-400">—</td>
      <td></td>
    </tr>
  );
  const folder = (
    title: string,
    note: string,
    count: number,
    body: ReactNode,
    open = true,
    action?: ReactNode,
  ) => (
    <details
      open={open}
      className="rounded-lg border border-neutral-300 dark:border-neutral-700"
    >
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 px-3 py-2">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-neutral-500">{note}</span>
        <span className="ml-auto text-sm text-neutral-500">
          {count} email{count === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full min-w-[46rem] table-fixed text-left text-sm">
          {head}
          <tbody>{body}</tbody>
        </table>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </details>
  );
  const moveButtons = (row: Row, index: number) =>
    isOwner && (
      <form action={moveEmail} className="flex justify-end gap-1">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={row.email.id} />
        <button
          name="direction"
          value="up"
          disabled={index === 0}
          aria-label="Move earlier"
          className={`${quietButtonClass} px-2 py-0.5 disabled:opacity-30`}
        >
          ↑
        </button>
        <button
          name="direction"
          value="down"
          disabled={index === sequence.length - 1}
          aria-label="Move later"
          className={`${quietButtonClass} px-2 py-0.5 disabled:opacity-30`}
        >
          ↓
        </button>
        {row.sent === 0 && (
          <button
            formAction={deleteEmail}
            aria-label="Delete"
            className={`${quietButtonClass} px-2 py-0.5`}
          >
            Delete
          </button>
        )}
      </form>
    );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Emails</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <strong>One email a day per lead.</strong> Each day the most
            relevant one goes: a reaction to something they just did, otherwise
            a nudge if they are stuck, otherwise the next in the sequence. Every
            email ends with the one step that lead has not done yet.{isOwner && (
              <>
                {" "}
                <Link href={`/b/${slug}/settings/emails`} className="underline">
                  Sender, signature and send time
                </Link>
              </>
            )}
          </p>
        </div>
        {typeof query.sent === "string" && (
          <Notice kind="ok">
            Sent {query.sent} email{query.sent === "1" ? "" : "s"}
            {query.held && query.held !== "0"
              ? `, and held ${query.held} back for the daily limit`
              : ""}
            .{isDev && " Find them in the test mailbox."}
          </Notice>
        )}
        {query.saved && <Notice kind="ok">Saved.</Notice>}
        {query.deleted && <Notice kind="ok">Email deleted.</Notice>}

        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm">This brand has no emails yet.</p>
            {isOwner && (
              <form action={addStarters}>
                <input type="hidden" name="slug" value={slug} />
                <button className={buttonClass}>Add the starter emails</button>
              </form>
            )}
          </div>
        ) : (
          <>
            {missingNew && isOwner && (
              <form
                action={addStarters}
                className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
              >
                <input type="hidden" name="slug" value={slug} />
                <span>
                  This brand is missing {missing.length} of the starter emails
                  (the named sequence, reactions or nudges). Adding them
                  changes nothing that is already here.
                </span>
                <button className={quietButtonClass}>
                  Add the missing starter emails
                </button>
              </form>
            )}
            {folder(
              "When they sign up",
              "Sent at once, whatever the time.",
              of("prospectus").length,
              of("prospectus").map((r) => line(r)),
            )}
            {folder(
              "The sequence",
              `The story: one a day in this order, at ${settings.sendTime} UK time.`,
              sequence.length,
              sequence.map((r, i) => line(r, moveButtons(r, i), r.email.active ? `Day ${sequence.filter((x, j) => j <= i && x.email.active).length}` : "Not sent while switched off")),
              true,
              isOwner && (
                <form action={addSequenceEmail}>
                  <input type="hidden" name="slug" value={slug} />
                  <button className={quietButtonClass}>+ Add an email</button>
                </form>
              ),
            )}
            {folder(
              "Reactions",
              "When they do something. Sent once each.",
              of("reaction").length + 1,
              <>
                {of("reaction").map((r) => line(r))}
                {fixedLine(
                  "Sorry we missed you",
                  "After a missed call",
                  callSent("missed"),
                )}
              </>,
            )}
            {folder(
              "Nudges",
              "When they are stuck on a step. Two at most per step.",
              of("nudge").length,
              of("nudge").map((r) => line(r)),
            )}
            {folder(
              "Call emails",
              "About a call they have booked, outside the one-a-day rule. Each points at the prospectus if they have not read it, otherwise at Next steps and Questions.",
              CALL_EMAILS.length,
              CALL_EMAILS.map((c) =>
                fixedLine(c.name, c.when, callSent(c.kind)),
              ),
              false,
              <p className="text-xs text-neutral-500">
                The wording of call emails and &quot;Sorry we missed you&quot;
                is fixed for now.
              </p>,
            )}
          </>
        )}
        {isDev && (
          <p className="text-sm">
            <a href="/dev/mailbox" target="_blank" className="underline">
              Open the test mailbox
            </a>
          </p>
        )}
      </section>

      {isOwner && rows.length > 0 && (
        <section className="max-w-xl">
          <h2 className="mb-1 text-lg font-semibold">Send due emails now</h2>
          <p className="mb-3 text-sm text-neutral-500">
            franOS checks every minute by itself. This runs the same check
            straight away.
          </p>
          <form action={sendNow} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="slug" value={slug} />
            {isDev && (
              <>
                <Field label="Pretend this many days have passed (testing only)">
                  <input
                    name="daysAhead"
                    type="number"
                    min={0}
                    defaultValue={0}
                    className={`${inputClass} w-32`}
                  />
                </Field>
                <Field label="and this many minutes">
                  <input
                    name="minutesAhead"
                    type="number"
                    min={0}
                    defaultValue={0}
                    className={`${inputClass} w-32`}
                  />
                </Field>
              </>
            )}
            <button className={quietButtonClass}>Send due emails</button>
          </form>
          {isDev && (
            <p className="mt-2 text-xs text-neutral-500">
              Each press sends a lead one email at most, for the pretend day.
              Nothing goes between 9pm and 8am, so test in the daytime or add
              days.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
