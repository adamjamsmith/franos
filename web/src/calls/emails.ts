import { escapeHtml, type Rendered, sign } from "../email/render";
import type { SiteContent } from "../site/config";

type Link = { label: string; url: string };

/** The shared look of every call email: brand at the top, plain paragraphs, one button, then plain links. */
export function layout(input: { brandName: string; site: SiteContent; footer: string; subject: string; paragraphs: string[]; links: Link[] }): Rendered {
  const [button, ...others] = input.links;
  const header = input.site.logoUrl
    ? `<img src="${escapeHtml(input.site.logoUrl)}" alt="${escapeHtml(input.brandName)}" height="36">`
    : `<strong style="font-size:18px">${escapeHtml(input.brandName)}</strong>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
<div style="margin:0 0 24px">${header}</div>
${input.paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
${button ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" target="_blank" style="background:${input.site.primaryColour};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;display:inline-block">${escapeHtml(button.label)}</a></p>` : ""}
${others.map((l) => `<p style="margin:0 0 8px"><a href="${escapeHtml(l.url)}" target="_blank" style="color:${input.site.primaryColour}">${escapeHtml(l.label)}</a></p>`).join("\n")}
<hr style="border:none;border-top:1px solid #dddddd;margin:24px 0">
<p style="font-size:12px;color:#666666;margin:0">${escapeHtml(input.footer)}</p>
</div>`;
  const text = [...input.paragraphs, ...input.links.map((l) => `${l.label}: ${l.url}`), "--", input.footer].join("\n\n");
  return { subject: input.subject, html, text, headers: {} };
}

/** The lead's own page for a call: its details, and where they change or cancel it. Signed, so it needs no login. */
export const manageLink = (baseUrl: string, slug: string, callId: string) =>
  `${baseUrl}/site/${slug}/call/${callId}?s=${sign(`call|${callId}`)}`;
export const calendarLink = (baseUrl: string, slug: string, callId: string) =>
  `${baseUrl}/site/${slug}/call/${callId}/calendar?s=${sign(`call|${callId}`)}`;

export type ReminderKind = "3days" | "day" | "12hours" | "hour" | "10min";
export type CallEmailKind = "confirmation" | "changed" | "cancelled" | `reminder_${ReminderKind}` | "missed";
/** The reminders before a call, and how long before it each one goes. */
export const REMINDERS: { kind: ReminderKind; hoursBefore: number }[] = [
  { kind: "3days", hoursBefore: 72 },
  { kind: "day", hoursBefore: 24 },
  { kind: "12hours", hoursBefore: 12 },
  { kind: "hour", hoursBefore: 1 },
  { kind: "10min", hoursBefore: 10 / 60 },
];
export type StaffEmailKind = "booked" | "changed" | "cancelled";

export type CallEmailInput = {
  baseUrl: string;
  slug: string;
  brandName: string;
  site: SiteContent;
  footer: string;
  callId: string;
  leadId: string;
  firstName: string | null;
  leadName: string;
  /** The call time as the lead reads it, in UK time. */
  when: string;
  minutes: number;
  joinUrl: string | null;
  /** Whether they have read the prospectus. Decides which version of the email they get. */
  readProspectus: boolean;
};

const RECORDED = "The call is recorded, so we have an accurate note of what was said.";

/**
 * What to read before the call. Two versions, as in today's franOS: someone who has read the
 * prospectus is pointed at Next steps and Questions; someone who has not is pointed at the prospectus first.
 */
function prep(input: CallEmailInput): { line: string; links: Link[] } {
  const page = (name: string) => `${input.baseUrl}/site/${input.slug}/${name}`;
  const after: Link[] = [
    { label: "Read your next steps", url: page("next-steps") },
    { label: "See the questions to ask us", url: page("questions") },
  ];
  return input.readProspectus
    ? { line: "Before we speak, have a look at your next steps and the questions worth asking us.", links: after }
    : {
        line: "Before we speak, please read the prospectus. It answers most questions and makes the call far more useful.",
        links: [{ label: "Read the prospectus", url: page("prospectus") }, ...after],
      };
}

/** An email to the lead about their own call. Sent even to someone who has unsubscribed from the other emails. */
export function leadCallEmail(kind: CallEmailKind, input: CallEmailInput): Rendered {
  const hi = `Hi ${input.firstName?.trim() || "there"},`;
  const manage: Link = { label: "Change or cancel the call", url: manageLink(input.baseUrl, input.slug, input.callId) };
  const calendar: Link = { label: "Add it to my calendar", url: calendarLink(input.baseUrl, input.slug, input.callId) };
  const join: Link[] = input.joinUrl ? [{ label: "Join the call on Zoom", url: input.joinUrl }] : [];
  const base = { brandName: input.brandName, site: input.site, footer: input.footer };
  const before = prep(input);

  switch (kind) {
    case "confirmation":
      return layout({
        ...base,
        subject: `Your call is booked: ${input.when}`,
        paragraphs: [
          hi,
          `Your call with ${input.brandName} is booked for ${input.when} (UK time). It takes about ${input.minutes} minutes and is on Zoom.`,
          "At the time of the call, use the Zoom link below. " + RECORDED,
          before.line,
        ],
        links: [calendar, ...join, ...before.links, manage],
      });
    case "changed":
      return layout({
        ...base,
        subject: `Your call has moved: ${input.when}`,
        paragraphs: [hi, `Your call with ${input.brandName} is now at ${input.when} (UK time). The Zoom link is the same. ${RECORDED}`, before.line],
        links: [calendar, ...join, ...before.links, manage],
      });
    case "cancelled":
      return layout({
        ...base,
        subject: "Your call has been cancelled",
        paragraphs: [hi, `Your call with ${input.brandName} on ${input.when} has been cancelled. You can pick another time whenever suits you.`],
        links: [{ label: "Pick another time", url: manage.url }],
      });
    case "reminder_3days":
    case "reminder_day":
    case "reminder_12hours":
    case "reminder_hour": {
      const subjects = {
        reminder_3days: `Your call is in 3 days: ${input.when}`,
        reminder_day: `Reminder: your call is tomorrow, ${input.when}`,
        reminder_12hours: "Your call is in 12 hours",
        reminder_hour: "Your call starts in 1 hour",
      };
      return layout({
        ...base,
        subject: subjects[kind],
        paragraphs: [hi, `A reminder that your call with ${input.brandName} is on ${input.when} (UK time). ${RECORDED}`, before.line],
        links: [...join, ...before.links, manage],
      });
    }
    case "reminder_10min":
      return layout({
        ...base,
        subject: "Starting in 10 minutes",
        paragraphs: [hi, `Your call with ${input.brandName} starts in 10 minutes. ${RECORDED}`],
        links: [...join, manage],
      });
    case "missed":
      return layout({
        ...base,
        subject: "Sorry we missed you",
        paragraphs: [hi, `We had a call booked for ${input.when} and did not manage to speak. No problem at all. Pick another time that suits you.`],
        links: [{ label: "Pick another time", url: manage.url }],
      });
  }
}

/** An email to the consultant about a booking. */
export function staffCallEmail(kind: StaffEmailKind, input: CallEmailInput): Rendered {
  const base = { brandName: input.brandName, site: input.site, footer: input.footer };
  const record = { label: `Open ${input.leadName}'s record`, url: `${input.baseUrl}/b/${input.slug}/leads/${input.leadId}` };
  const calendar = { label: "Add it to my calendar", url: calendarLink(input.baseUrl, input.slug, input.callId) };
  const join: Link[] = input.joinUrl ? [{ label: "Join the call on Zoom", url: input.joinUrl }] : [];
  if (kind === "cancelled") {
    return layout({
      ...base,
      subject: `Call cancelled: ${input.leadName}, ${input.when}`,
      paragraphs: [`The call with ${input.leadName} on ${input.when} has been cancelled. The time is free again.`],
      links: [record],
    });
  }
  return layout({
    ...base,
    subject: `${kind === "booked" ? "New call booked" : "Call moved"}: ${input.leadName}, ${input.when}`,
    paragraphs: [
      kind === "booked"
        ? `${input.leadName} has booked a call for ${input.when} (UK time), ${input.minutes} minutes.`
        : `The call with ${input.leadName} is now at ${input.when} (UK time).`,
    ],
    links: [record, calendar, ...join],
  });
}

/** "New good-fit lead, call now": sent to the consultant when a strong lead signs up. */
export function alertEmail(input: {
  baseUrl: string;
  slug: string;
  brandName: string;
  site: SiteContent;
  footer: string;
  leadId: string;
  leadName: string;
  phone: string | null;
  email: string;
  fitScore: number;
  answers: { question: string; answer: string }[];
}): Rendered {
  const digits = (input.phone ?? "").replace(/[^\d+]/g, "");
  return layout({
    brandName: input.brandName,
    site: input.site,
    footer: input.footer,
    subject: `New good-fit lead, call now: ${input.leadName} (Fit ${input.fitScore})`,
    paragraphs: [
      `${input.leadName} has just signed up for ${input.brandName} with a Fit score of ${input.fitScore} out of 100. Leads called in the first few minutes are far more likely to book.`,
      `Phone: ${input.phone ?? "not given"}\nEmail: ${input.email}`,
      input.answers.map((a) => `${a.question}\n${a.answer}`).join("\n\n"),
    ].filter(Boolean),
    links: [
      ...(digits ? [{ label: `Call ${input.phone}`, url: `tel:${digits}` }] : []),
      { label: `Open ${input.leadName}'s record`, url: `${input.baseUrl}/b/${input.slug}/leads/${input.leadId}` },
    ],
  });
}

/** A calendar file (.ics) for one call. Times are exact instants, so clock changes cannot shift them. */
export function calendarFile(input: { callId: string; title: string; startsAt: Date; endsAt: Date; joinUrl: string | null; now?: Date }): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const safe = (text: string) => text.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//franOS//Calls//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.callId}@franos`,
    `DTSTAMP:${stamp(input.now ?? new Date())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SUMMARY:${safe(input.title)}`,
    ...(input.joinUrl ? [`LOCATION:${safe(input.joinUrl)}`, `DESCRIPTION:${safe(`Join on Zoom: ${input.joinUrl}`)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** "How did the call go?": sent to the consultant an hour after a call with no answers yet. */
export function outcomeReminderEmail(input: {
  baseUrl: string;
  slug: string;
  brandName: string;
  site: SiteContent;
  footer: string;
  leadId: string;
  leadName: string;
  when: string;
}): Rendered {
  return layout({
    brandName: input.brandName,
    site: input.site,
    footer: input.footer,
    subject: `How did the call with ${input.leadName} go?`,
    paragraphs: [
      `You spoke to ${input.leadName} on ${input.when}. Six quick questions record how it went. It takes under a minute, and it is what tells us which leads and which ads are worth the money.`,
    ],
    links: [{ label: "Answer the six questions", url: `${input.baseUrl}/b/${input.slug}/leads/${input.leadId}#calls` }],
  });
}
