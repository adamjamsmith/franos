import { layout } from "../calls/emails";
import { type Rendered, sign } from "../email/render";
import type { SiteContent } from "../site/config";
import type { SessionKind } from "./sessions";

/** Emails about a recording session. Same look as the call emails. None of them is marketing: the person is not a lead. */
export type SessionEmailKind = "confirmation" | "changed" | "cancelled" | "reminder_day" | "reminder_hour";

export type SessionEmailInput = {
  baseUrl: string;
  slug: string;
  brandName: string;
  site: SiteContent;
  footer: string;
  sessionId: string;
  kind: SessionKind;
  firstName: string;
  personName: string;
  /** The session time as the person reads it, in UK time. */
  when: string;
  minutes: number;
  joinUrl: string | null;
};

const RECORDED = "The session is recorded on video, as you agreed when you booked.";
const LABELS: Record<SessionKind, string> = { testimonial: "testimonial", franchisor: "interview", other: "recording session" };

export const sessionManageLink = (baseUrl: string, slug: string, sessionId: string) =>
  `${baseUrl}/site/${slug}/session/booked/${sessionId}?s=${sign(`session|${sessionId}`)}`;
export const sessionCalendarLink = (baseUrl: string, slug: string, sessionId: string) =>
  `${baseUrl}/site/${slug}/session/booked/${sessionId}/calendar?s=${sign(`session|${sessionId}`)}`;

export function sessionEmail(kind: SessionEmailKind, input: SessionEmailInput): Rendered {
  const hi = `Hi ${input.firstName.trim() || "there"},`;
  const what = LABELS[input.kind];
  const manage = { label: "Change or cancel the session", url: sessionManageLink(input.baseUrl, input.slug, input.sessionId) };
  const join = input.joinUrl ? [{ label: "Join on Zoom", url: input.joinUrl }] : [];
  const calendar = { label: "Add it to my calendar", url: sessionCalendarLink(input.baseUrl, input.slug, input.sessionId) };
  const base = { brandName: input.brandName, site: input.site, footer: input.footer };
  switch (kind) {
    case "confirmation":
      return layout({
        ...base,
        subject: `Your ${what} is booked: ${input.when}`,
        paragraphs: [hi, `Your ${what} with ${input.brandName} is booked for ${input.when}. It is on Zoom and takes about ${input.minutes} minutes.`, RECORDED, "Somewhere quiet with good light on your face works best."],
        links: [...join, calendar, manage],
      });
    case "changed":
      return layout({
        ...base,
        subject: `Your ${what} has moved: ${input.when}`,
        paragraphs: [hi, `Your ${what} with ${input.brandName} is now at ${input.when}.`, RECORDED],
        links: [...join, calendar, manage],
      });
    case "cancelled":
      return layout({
        ...base,
        subject: `Your ${what} has been cancelled`,
        paragraphs: [hi, `Your ${what} with ${input.brandName} on ${input.when} has been cancelled.`],
        links: [],
      });
    case "reminder_day":
      return layout({
        ...base,
        subject: `Tomorrow: your ${what} with ${input.brandName}`,
        paragraphs: [hi, `A reminder that your ${what} is on ${input.when}.`, RECORDED],
        links: [...join, manage],
      });
    case "reminder_hour":
      return layout({
        ...base,
        subject: `In an hour: your ${what} with ${input.brandName}`,
        paragraphs: [hi, `Your ${what} starts at ${input.when}.`, RECORDED],
        links: [...join, manage],
      });
  }
}

/** A note to the person who runs the sessions. */
export function hostSessionEmail(kind: "confirmation" | "changed" | "cancelled", input: SessionEmailInput): Rendered {
  const what = LABELS[input.kind];
  const said = { confirmation: "booked", changed: "moved", cancelled: "cancelled" }[kind];
  return layout({
    brandName: input.brandName,
    site: input.site,
    footer: input.footer,
    subject: `${input.brandName} ${what} ${said}: ${input.personName}, ${input.when}`,
    paragraphs: [`${input.personName} has ${said} a ${what} for ${input.brandName}: ${input.when}.`],
    links: kind === "cancelled" ? [] : [{ label: "Open Sessions", url: `${input.baseUrl}/b/${input.slug}/calls?view=sessions` }],
  });
}
