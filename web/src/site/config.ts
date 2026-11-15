/**
 * What each brand can set for its public pages and sign-up form.
 * Stored on the brand (clients.site and clients.form); anything not set falls back to the defaults here.
 */

/** `offerChat: false` keeps a testimonial out of the "Want to talk to this person?" email. */
export type Video = { id: string; title: string; person?: string; url: string; offerChat?: boolean };
export type DocKind = "prospectus" | "next-steps" | "questions";

/** Who a brand's emails come from, when they go, and how many may go in a day. */
export type EmailSettings = {
  fromName: string;
  fromAddress: string;
  /** The company's registered details, shown at the bottom of every email. */
  footer: string;
  /** UK time of day for sequence emails, as HH:MM. */
  sendTime: string;
  /** Most emails per day, for warming up a new email domain. */
  dailyLimit: number;
  /** Who signs the emails: the consultant. Left empty, emails have no signature. */
  signatureName?: string;
  signaturePhone?: string;
  signatureEmail?: string;
  signatureWebsite?: string;
  /** The "Have you watched it yet?" box: its picture and the line under the heading. */
  videoBoxImage?: string;
  videoBoxText?: string;
};

/** When calls can be booked, and when the consultant is told about a good-fit lead. */
export type CallSettings = {
  /** Days of the week calls are taken: 0 is Sunday, 1 is Monday, and so on. */
  days: number[];
  /** Working hours in UK time, as HH:MM. */
  startTime: string;
  endTime: string;
  lengthMinutes: number;
  gapMinutes: number;
  /** How many days ahead a lead can book. */
  windowDays: number;
  /** The shortest notice a lead can give, in hours. */
  noticeHours: number;
  /** Single days with no calls, as YYYY-MM-DD. */
  daysOff: string[];
  /** A new lead with this Fit score or more triggers the "call now" alert. */
  alertFit: number;
  /** Alerts are only sent between these UK times. Outside them the alert waits. */
  alertFrom: string;
  alertTo: string;
};

export type SiteContent = {
  email?: Partial<EmailSettings>;
  calls?: Partial<CallSettings>;
  /** The franchise fee in pounds. Used as the value of the Signed event. */
  franchiseFee?: number;
  primaryColour: string;
  logoUrl: string;
  headline: string;
  subheadline: string;
  /** Stated plainly on the landing page, to put off people who are not a fit. */
  requirements: string[];
  thankYouHeading: string;
  thankYouText: string;
  vslUrl: string;
  videos: Video[];
  documents: Record<DocKind, { title: string; url: string }>;
  consentWording: string;
  whatsappWording: string;
  privacyText: string;
};

/** How good an answer is for this brand. Great counts 2, OK counts 1, Poor counts 0. */
export type Mark = "great" | "ok" | "poor";
export const MARKS: { value: Mark; label: string; points: number }[] = [
  { value: "great", label: "Great", points: 2 },
  { value: "ok", label: "OK", points: 1 },
  { value: "poor", label: "Poor", points: 0 },
];
const MARK_POINTS: Record<Mark, number> = { great: 2, ok: 1, poor: 0 };

/**
 * `mustHave`: a lead has to pick one of the question's must-have answers to qualify.
 * `removed`: in the bin. Kept so answers already given still read properly, and so it can be restored.
 */
export type Option = { value: string; label: string; mark: Mark; mustHave?: boolean; removed?: boolean };
/** `scored: false` means the question is asked for information only and does not count towards the Fit score. */
export type Question = { id: string; label: string; scored: boolean; options: Option[]; removed?: boolean };
export type FormConfig = { questions: Question[] };

export const DOC_KINDS: DocKind[] = ["prospectus", "next-steps", "questions"];

export function defaultSite(brandName: string): SiteContent {
  return {
    primaryColour: "#1f6f4a",
    logoUrl: "",
    headline: `Build your own ${brandName} business`,
    subheadline: "Placeholder wording. Replace this with the brand's own headline in Settings.",
    requirements: [
      "You have run a business, or managed a team or budget",
      "You have the investment and six months of living costs",
      "You want to build and lead a team",
    ],
    thankYouHeading: "Thanks, {first_name}. Here is what to watch first",
    thankYouText: "Watch this short video on how the franchise works, then schedule a call.",
    vslUrl: "/placeholder.mp4",
    videos: [{ id: "vt1", title: "Placeholder testimonial", person: "A franchisee", url: "/placeholder.mp4" }],
    documents: {
      prospectus: { title: "Franchise prospectus", url: "/placeholder-prospectus.pdf" },
      "next-steps": { title: "Next steps", url: "/placeholder-prospectus.pdf" },
      questions: { title: "Questions to ask us", url: "/placeholder-prospectus.pdf" },
    },
    consentWording: `I agree to ${brandName} contacting me by email and phone about this franchise, to calls being recorded and analysed, and to my details being shared with Meta to measure advertising. See the privacy notice.`,
    whatsappWording: "You can also message me on WhatsApp.",
    privacyText: "Placeholder privacy notice. The final wording is added after the legal check.",
  };
}

/** Refresh Renovation's questions, from its avatar card. Timing is asked by every brand. */
export function defaultForm(): FormConfig {
  return {
    questions: [
      {
        id: "timing",
        label: "When would you like to start?",
        scored: true,
        options: [
          { value: "0-3", label: "In the next 3 months", mark: "great" },
          { value: "3-6", label: "In 3 to 6 months", mark: "ok" },
          { value: "6-12", label: "In 6 to 12 months", mark: "ok" },
          { value: "looking", label: "Just looking", mark: "poor" },
        ],
      },
      {
        id: "role",
        label: "What do you do now?",
        scored: false,
        options: [
          { value: "owner", label: "Own or run a business", mark: "ok" },
          { value: "senior", label: "Senior manager or director", mark: "ok" },
          { value: "manager", label: "Manager", mark: "ok" },
          { value: "employed", label: "Employed, not managing", mark: "ok" },
          { value: "trade", label: "Self-employed trade", mark: "ok" },
          { value: "not-working", label: "Not working at the moment", mark: "ok" },
        ],
      },
      {
        id: "experience",
        label: "Have you run a business, or managed a team or budget?",
        scored: true,
        options: [
          { value: "business", label: "Yes, I have run a business", mark: "great" },
          { value: "managed", label: "Yes, I have managed a team or budget", mark: "ok" },
          { value: "no", label: "No", mark: "poor" },
        ],
      },
      {
        id: "money",
        label: "Do you have the investment plus six months of living costs available?",
        scored: true,
        options: [
          { value: "yes", label: "Yes", mark: "great" },
          { value: "most", label: "Most of it, I would need some funding", mark: "ok" },
          { value: "no", label: "No, I would need full funding", mark: "poor" },
        ],
      },
      {
        id: "team",
        label: "Would you build a team, or do the work yourself?",
        scored: true,
        options: [
          { value: "team", label: "Build and manage a team", mark: "great" },
          { value: "unsure", label: "Not sure yet", mark: "ok" },
          { value: "self", label: "Do the work myself", mark: "poor" },
        ],
      },
      {
        id: "property",
        label: "What is your connection to property?",
        scored: true,
        options: [
          { value: "landlord", label: "Landlord or property investor", mark: "great" },
          { value: "renovated", label: "I have renovated my own home", mark: "great" },
          { value: "interested", label: "Interested in homes and design", mark: "ok" },
          { value: "none", label: "None", mark: "poor" },
        ],
      },
    ],
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function siteFor(client: { name: string; site: unknown }): SiteContent {
  const base = defaultSite(client.name);
  if (!isObject(client.site)) return base;
  const saved = client.site as Partial<SiteContent>;
  return { ...base, ...saved, documents: { ...base.documents, ...(saved.documents ?? {}) } };
}

const isMark = (v: unknown): v is Mark => v === "great" || v === "ok" || v === "poor";

/** Reads a saved question. Forms saved before marks existed carried points: the top becomes Great, zero Poor, the rest OK. */
function readQuestion(raw: unknown): Question | null {
  if (!isObject(raw) || typeof raw.id !== "string" || !Array.isArray(raw.options)) return null;
  const rawOptions = raw.options.filter(isObject).filter((o) => typeof o.value === "string");
  const points = rawOptions.map((o) => (typeof o.points === "number" ? o.points : 0));
  const top = Math.max(0, ...points);
  const options: Option[] = rawOptions.map((o, i) => ({
    value: String(o.value),
    label: typeof o.label === "string" ? o.label : "",
    mark: isMark(o.mark) ? o.mark : top === 0 ? "ok" : points[i] === top ? "great" : points[i] === 0 ? "poor" : "ok",
    ...(o.mustHave === true ? { mustHave: true } : {}),
    ...(o.removed === true ? { removed: true } : {}),
  }));
  const hasMarks = rawOptions.some((o) => isMark(o.mark));
  return {
    id: raw.id,
    label: typeof raw.label === "string" ? raw.label : "",
    scored: typeof raw.scored === "boolean" ? raw.scored : hasMarks || top > 0,
    options,
    ...(raw.removed === true ? { removed: true } : {}),
  };
}

/** Everything saved for the brand's form, including what is in the bin. For the Form settings screen and for scoring. */
export function fullFormFor(client: { form: unknown }): FormConfig {
  const saved = readForm(client.form);
  return saved.questions.length === 0 ? defaultForm() : saved;
}

/** Reads a form from storage or from the settings screen. Anything malformed is dropped. */
export function readForm(raw: unknown): FormConfig {
  if (!isObject(raw) || !Array.isArray(raw.questions)) return { questions: [] };
  return { questions: raw.questions.map(readQuestion).filter((q): q is Question => q !== null) };
}

/** The answers a visitor can pick: not in the bin, and with wording. */
export const liveOptions = (q: Question) => q.options.filter((o) => !o.removed && o.label.trim() !== "");
/** A question is on the public form once it has wording and at least two answers to pick from. */
export const onForm = (q: Question) => !q.removed && q.label.trim() !== "" && liveOptions(q).length >= 2;

/** The form as visitors see it: only the questions and answers that are live. */
export function formFor(client: { form: unknown }): FormConfig {
  return {
    questions: fullFormFor(client)
      .questions.filter(onForm)
      .map((q) => ({ ...q, options: liveOptions(q) })),
  };
}

export type FitLine = { questionId: string; question: string; answer: string; points: number; max: number };

/**
 * The Fit score: how closely the answers match the brand's avatar. 0 to 100.
 * Each answer is Great (2), OK (1) or Poor (0); every scored question counts the same.
 * A question the lead was never asked is left out, so adding a question does not pull old leads down.
 * Pass the full form (bin included), so an answer that was later binned still counts as it was marked.
 * Never uses age or gender.
 */
export function scoreFit(form: FormConfig, answers: Record<string, string>): { score: number; detail: FitLine[] } {
  const detail: FitLine[] = [];
  for (const q of form.questions) {
    if (q.removed || !q.scored || answers[q.id] === undefined) continue;
    const chosen = q.options.find((o) => o.value === answers[q.id]);
    detail.push({
      questionId: q.id,
      question: q.label,
      answer: chosen?.label ?? "Not answered",
      points: chosen ? MARK_POINTS[chosen.mark] : 0,
      max: 2,
    });
  }
  const available = detail.reduce((sum, line) => sum + line.max, 0);
  const earned = detail.reduce((sum, line) => sum + line.points, 0);
  return { score: available === 0 ? 0 : Math.round((earned / available) * 100), detail };
}

/** True unless the answers miss a must-have: a live question with must-have answers where the lead picked another one. */
export function qualifies(form: FormConfig, answers: Record<string, string>): boolean {
  for (const q of form.questions) {
    if (!onForm(q)) continue;
    const live = liveOptions(q);
    if (!live.some((o) => o.mustHave)) continue;
    if (!live.find((o) => o.value === answers[q.id])?.mustHave) return false;
  }
  return true;
}
