import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailSettings, SiteContent } from "../site/config";

/** A signature that proves a link was made by franOS and has not been altered. */
export function sign(value: string): string {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "franos-local")
    .update(value)
    .digest("hex")
    .slice(0, 32);
}
export function signatureOk(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---------- The path ----------

export type PathStep = "video" | "prospectus" | "call" | "next-steps" | "questions";
export type Path = Record<PathStep, boolean>;
export type NextStep = "prospectus" | "call" | "next-steps" | "questions" | "done";

type EventLike = { type: string; data: unknown };

/** Works out what a lead has done so far from their timeline. */
export function pathFrom(events: EventLike[]): Path {
  const path: Path = { video: false, prospectus: false, call: false, "next-steps": false, questions: false };
  let calls = 0;
  for (const event of events) {
    const data = (event.data ?? {}) as Record<string, unknown>;
    if (event.type === "video_progress" && data.videoId === "vsl") path.video = true;
    if (event.type === "document_open" || event.type === "document_download") {
      if (data.kind === "prospectus") path.prospectus = true;
      if (data.kind === "next-steps") path["next-steps"] = true;
      if (data.kind === "questions") path.questions = true;
    }
    // A call counts while it is booked or was attended. Cancelling it, or not turning up, takes the tick away.
    if (event.type === "call_booked" || event.type === "call_no_show_undone") calls++;
    if (event.type === "call_cancelled" || event.type === "call_no_show") calls--;
  }
  path.call = calls > 0;
  return path;
}

/** The one step this lead should be pushed towards next. */
export function nextStepFor(path: Path): NextStep {
  if (!path.prospectus) return "prospectus";
  if (!path.call) return "call";
  if (!path["next-steps"]) return "next-steps";
  if (!path.questions) return "questions";
  return "done";
}

const NEXT_STEP_BLOCK: Record<NextStep, { button: string; page: string; ps: string } | null> = {
  prospectus: { button: "Read the prospectus", page: "prospectus", ps: "PS. If you have not read the prospectus yet, start there. It answers most questions." },
  call: { button: "Schedule a call", page: "thank-you#book", ps: "PS. The next step is a short call. Pick a time that suits you." },
  "next-steps": { button: "Read your next steps", page: "next-steps", ps: "PS. Your next steps are set out for you. They take a few minutes to read." },
  questions: { button: "See the questions to ask us", page: "questions", ps: "PS. We have listed the questions worth asking us before you decide." },
  done: null,
};

// ---------- Rendering ----------

export function emailSettingsFor(brandName: string, site: SiteContent): EmailSettings {
  return {
    fromName: `The ${brandName} team`,
    fromAddress: "hello@example.test",
    footer: `${brandName}. Company details go here.`,
    sendTime: "09:20",
    dailyLimit: 50,
    ...(site.email ?? {}),
  };
}

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type RenderInput = {
  baseUrl: string;
  slug: string;
  brandName: string;
  site: SiteContent;
  settings: EmailSettings;
  email: {
    key: string;
    subject: string;
    body: string;
    layout?: string | null;
    preview?: string | null;
    headline?: string | null;
    imageUrl?: string | null;
    videoId?: string | null;
    quote?: string | null;
    quoteBy?: string | null;
    showPs?: boolean | null;
  };
  lead: { id: string; firstName: string | null };
  nextStep: NextStep;
  /** The id of the send this email belongs to. Links and the open marker are tied to it. */
  sendId: string;
  /** Extra words for the wording, such as {person} in "Want to talk to {person}?". */
  vars?: Record<string, string>;
};

export type Rendered = { subject: string; html: string; text: string; headers: Record<string, string> };

/** A link that passes through franOS so the click is recorded. Only this brand's own pages can be linked. */
export function trackedLink(input: Pick<RenderInput, "baseUrl" | "slug" | "sendId">, page: string): string {
  const to = `/site/${input.slug}/${page}`;
  return `${input.baseUrl}/l/${input.sendId}?to=${encodeURIComponent(to)}&s=${sign(`${input.sendId}|${to}`)}`;
}

export const unsubscribeLink = (baseUrl: string, leadId: string) =>
  `${baseUrl}/u/${leadId}?s=${sign(`unsubscribe|${leadId}`)}`;

/** The looks an email can have. The first four are the styled template; "personal" reads as typed by the consultant. */
export const LAYOUTS = {
  header: "Header (the standard styled email)",
  video: "Header + video (thumbnail with a watch button under the headline)",
  owner: "Header + owner photo (a large photo under the headline)",
  plain: "No header (styled, without the logo bar)",
  personal: "Personal (plain text, as if typed by the consultant)",
} as const;
export type Layout = keyof typeof LAYOUTS;
export const isLayout = (value: string): value is Layout => value in LAYOUTS;

const font = "font-family:Arial,Helvetica,sans-serif";
const para = "margin:0 0 14px;font-size:16px;line-height:1.5;color:#1a1a1a";

/**
 * Turns the wording into paragraphs. A blank line starts a new paragraph. Lines starting "- " become
 * a bullet list. `[words](page:prospectus)` becomes a tracked link to one of the brand's pages.
 */
function bodyBlocks(text: string, input: RenderInput, colour: string): { html: string; text: string } {
  const linkPattern = /\[([^\]]+)\]\(page:([a-z0-9\-/#]+)\)/gi;
  const inline = (raw: string) => {
    let html = "";
    let plain = "";
    let last = 0;
    for (const match of raw.matchAll(linkPattern)) {
      const before = raw.slice(last, match.index);
      const url = trackedLink(input, match[2]);
      html += `${escapeHtml(before)}<a href="${escapeHtml(url)}" target="_blank" style="color:${colour}">${escapeHtml(match[1])}</a>`;
      plain += `${before}${match[1]} (${url})`;
      last = match.index + match[0].length;
    }
    return { html: html + escapeHtml(raw.slice(last)), text: plain + raw.slice(last) };
  };

  const html: string[] = [];
  const plain: string[] = [];
  for (const raw of text.split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.every((l) => l.startsWith("- "))) {
      const items = lines.map((l) => inline(l.slice(2)));
      html.push(`<ul style="margin:0 0 14px;padding-left:22px;font-size:16px;line-height:1.5;color:#1a1a1a">${items.map((i) => `<li style="margin-bottom:5px">${i.html}</li>`).join("")}</ul>`);
      plain.push(items.map((i) => `- ${i.text}`).join("\n"));
    } else {
      const part = inline(block);
      html.push(`<p style="${para}">${part.html.replace(/\n/g, "<br>")}</p>`);
      plain.push(part.text);
    }
  }
  return { html: html.join("\n"), text: plain.join("\n\n") };
}

/**
 * Builds an email for one lead, in the email's layout.
 *
 * Whatever the layout, the call to action follows the lead: the header button, the big button and the
 * P.S. all point at the one step they have not done yet (or at a call, for an email that is about one).
 * `{first_name}` and `{brand}` are filled in, and `[words](page:prospectus)` becomes a tracked link.
 */
export function renderEmail(input: RenderInput): Rendered {
  const { email, settings, site } = input;
  const colour = site.primaryColour;
  const layout: Layout = isLayout(email.layout ?? "") ? (email.layout as Layout) : "header";
  const firstName = input.lead.firstName?.trim() || "there";
  const merge = (text: string) => {
    let out = text.replaceAll("{first_name}", firstName).replaceAll("{brand}", input.brandName);
    for (const [key, value] of Object.entries(input.vars ?? {})) out = out.replaceAll(`{${key}}`, value);
    return out;
  };
  const body = bodyBlocks(merge(email.body), input, colour);
  const block = NEXT_STEP_BLOCK[input.nextStep];
  const stepUrl = block ? trackedLink(input, block.page) : "";
  const unsubscribe = unsubscribeLink(input.baseUrl, input.lead.id);
  const openMarker = `<img src="${escapeHtml(`${input.baseUrl}/o/${input.sendId}?s=${sign(`open|${input.sendId}`)}`)}" width="1" height="1" alt="" style="display:none">`;
  const preview = email.preview ? merge(email.preview) : "";
  const preheader = preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>` : "";
  const signer = settings.signatureName?.trim() ?? "";
  const headers = {
    // Mail apps post to this address when the person presses their own "unsubscribe" button.
    "List-Unsubscribe": `<${input.baseUrl}/api/unsubscribe/${input.lead.id}?s=${sign(`unsubscribe|${input.lead.id}`)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  const subject = merge(email.subject);
  const closing = block ? `${block.button}: ${stepUrl}\n\n${block.ps}` : "PS. If you have any questions, just reply to this email.";

  // ----- Personal: plain text, as if typed by the consultant. No logo, no boxes, a link in place of a button. -----
  if (layout === "personal") {
    const signOff = signer ? `<p style="${para}">${escapeHtml(signer)}<br>${escapeHtml(input.brandName)}${settings.signaturePhone ? `<br>${escapeHtml(settings.signaturePhone)}` : ""}</p>` : "";
    const step = block
      ? `<p style="${para}"><a href="${escapeHtml(stepUrl)}" target="_blank" style="color:${colour};font-weight:bold">${escapeHtml(block.button)}</a></p>`
      : `<p style="${para}">If you have any questions, just reply to this email.</p>`;
    const html = `${preheader}<div style="${font};max-width:600px;padding:16px">
${body.html}
${step}
${signOff}
<p style="font-size:11px;color:#888888;margin:24px 0 0">${escapeHtml(settings.footer)} · <a href="${escapeHtml(unsubscribe)}" target="_blank" style="color:#888888">Unsubscribe</a></p>
${openMarker}
</div>`;
    const text = [body.text, block ? `${block.button}: ${stepUrl}` : "If you have any questions, just reply to this email.", signer ? `${signer}\n${input.brandName}` : "", `--\n${settings.footer}\nUnsubscribe: ${unsubscribe}`]
      .filter(Boolean)
      .join("\n\n");
    return { subject, html, text, headers };
  }

  // ----- The styled template -----
  const button = (label: string, url: string, big: boolean) =>
    `<a href="${escapeHtml(url)}" target="_blank" style="background:${colour};color:#ffffff;text-decoration:none;font-weight:bold;display:inline-block;border-radius:10px;white-space:nowrap;${big ? "font-size:17px;padding:13px 30px" : "font-size:15px;padding:9px 18px"}">${escapeHtml(label)}</a>`;
  const logo = site.logoUrl
    ? `<img src="${escapeHtml(site.logoUrl)}" alt="${escapeHtml(input.brandName)}" height="40" style="display:block;height:40px;width:auto;border:0">`
    : `<strong style="font-size:18px;color:#1a1a1a">${escapeHtml(input.brandName)}</strong>`;
  const headerBar =
    layout === "plain"
      ? ""
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #eeeeee"><tr><td style="padding:12px 20px">${logo}</td><td align="right" style="padding:12px 20px">${block ? button(block.button, stepUrl, false) : ""}</td></tr></table>`;
  const headline = email.headline?.trim() ? `<h1 style="margin:0;padding:18px 24px 8px;font-size:26px;line-height:1.25;color:#1a1a1a">${escapeHtml(merge(email.headline))}</h1>` : "";

  // What sits under the headline: a video thumbnail with a watch button, a large owner photo, or an image above the wording.
  const image = email.imageUrl?.trim() ?? "";
  const video = email.videoId ? site.videos.find((v) => v.id === email.videoId) : undefined;
  let hero = "";
  let heroText = "";
  if (layout === "video" && video) {
    const watchUrl = trackedLink(input, `video/${video.id}`);
    const watchLabel = `▶ Watch ${video.person?.trim() ? `${video.person.trim()}'s Full Story` : "the Video"}`;
    const thumb = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(video.title)}" width="600" style="display:block;width:100%;height:auto;border:0">`
      : `<div style="background:${colour};color:#ffffff;text-align:center;padding:70px 20px;font-size:20px;font-weight:bold">▶&nbsp; ${escapeHtml(video.title)}</div>`;
    hero = `<a href="${escapeHtml(watchUrl)}" target="_blank" style="text-decoration:none">${thumb}</a><p style="margin:0;padding:14px 0;text-align:center">${button(watchLabel, watchUrl, false)}</p>`;
    heroText = `${watchLabel}: ${watchUrl}`;
  } else if (image) {
    const picture = `<img src="${escapeHtml(image)}" alt="" width="600" style="display:block;width:100%;height:auto;border:0${layout === "owner" ? "" : ";border-radius:8px"}">`;
    hero = layout === "owner" ? picture : `<div style="padding:8px 24px 0">${picture}</div>`;
  }

  const quote = email.quote?.trim()
    ? `<div style="margin:6px 0 18px;border-left:4px solid ${colour};padding-left:12px"><p style="margin:0 0 4px;font-size:16px;line-height:1.45;font-weight:bold;font-style:italic;color:${colour}">“${escapeHtml(merge(email.quote))}”</p>${email.quoteBy?.trim() ? `<p style="margin:0;font-size:13px;color:#444444">– ${escapeHtml(email.quoteBy)}</p>` : ""}</div>`
    : "";
  const bigButton = block ? `<p style="margin:18px 0;text-align:center">${button(block.button, stepUrl, true)}</p>` : "";
  const ps = email.showPs === false ? "" : `<p style="${para}">${escapeHtml(block ? block.ps : "PS. If you have any questions, just reply to this email.")}</p>`;
  const signature = signer
    ? `<p style="margin:14px 0 4px;font-size:14px;line-height:1.5;color:#1a1a1a"><strong>${escapeHtml(signer)},</strong><br>${escapeHtml(input.brandName)}${settings.signaturePhone ? `<br><span style="color:${colour};font-weight:bold">P:</span> ${escapeHtml(settings.signaturePhone)}` : ""}${settings.signatureEmail ? `<br><span style="color:${colour};font-weight:bold">E:</span> ${escapeHtml(settings.signatureEmail)}` : ""}${settings.signatureWebsite ? `<br>${escapeHtml(settings.signatureWebsite)}` : ""}</p>`
    : "";
  // "Have you watched it yet?": shown when the brand has an introduction video.
  const videoUrl = site.vslUrl ? trackedLink(input, "thank-you") : "";
  const videoBox = videoUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f3;border-top:1px solid #e2e8e2"><tr>${settings.videoBoxImage ? `<td width="200" style="padding:16px 0 16px 24px"><a href="${escapeHtml(videoUrl)}" target="_blank"><img src="${escapeHtml(settings.videoBoxImage)}" alt="Watch the video" width="184" style="display:block;width:184px;height:auto;border:0;border-radius:6px"></a></td>` : ""}<td style="padding:16px 24px"><p style="margin:0 0 4px;font-size:17px;font-weight:bold;color:#1a1a1a">Have you watched it yet?</p><p style="margin:0 0 10px;font-size:14px;color:#333333">${escapeHtml(settings.videoBoxText?.trim() || `How a ${input.brandName} business works`)}</p>${button("▶  Watch the Video", videoUrl, false)}</td></tr></table>`
    : "";

  const html = `${preheader}<div style="background:#eef1ee;padding:16px 0;${font}">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
${headerBar}
${headline}
${hero}
<div style="padding:14px 24px 6px">
${body.html}
${quote}
${bigButton}
${ps}
${signature}
</div>
${videoBox}
<div style="background:#f1f2ec;padding:14px 24px;text-align:center;font-size:12px;line-height:1.5;color:#555555">${escapeHtml(settings.footer)}<br><a href="${escapeHtml(unsubscribe)}" target="_blank" style="color:#555555">Unsubscribe</a></div>
</div>
${openMarker}
</div>`;

  const text = [
    email.headline?.trim() ? merge(email.headline) : "",
    heroText,
    body.text,
    email.quote?.trim() ? `"${merge(email.quote)}"${email.quoteBy?.trim() ? ` – ${email.quoteBy}` : ""}` : "",
    email.showPs === false && block ? `${block.button}: ${stepUrl}` : closing,
    signer ? `${signer}\n${input.brandName}` : "",
    `--\n${settings.footer}\nUnsubscribe: ${unsubscribe}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject, html, text, headers };
}

// ---------- UK time ----------

const ukFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function ukParts(date: Date) {
  const parts = Object.fromEntries(ukFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour, minute: +parts.minute };
}

/** The UK calendar day an instant falls on, as YYYY-MM-DD. */
export function ukDay(date: Date): string {
  const p = ukParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The instant of a given UK wall-clock time on the UK day `daysAfter` days after `from`. Handles clock changes. */
export function ukTimeOnDay(from: Date, daysAfter: number, time: string): Date {
  const start = ukParts(from);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(start.year, start.month - 1, start.day + daysAfter, hour, minute));
  // `guess` treats the UK time as if it were UTC. Shift it by however far UK time is from UTC on that day.
  const seen = ukParts(guess);
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
  return new Date(guess.getTime() - (seenAsUtc - guess.getTime()));
}
