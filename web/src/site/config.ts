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

export type Option = { value: string; label: string; points: number };
export type Question = { id: string; label: string; options: Option[] };
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
        options: [
          { value: "0-3", label: "In the next 3 months", points: 25 },
          { value: "3-6", label: "In 3 to 6 months", points: 15 },
          { value: "6-12", label: "In 6 to 12 months", points: 5 },
          { value: "looking", label: "Just looking", points: 0 },
        ],
      },
      {
        id: "role",
        label: "What do you do now?",
        options: [
          { value: "owner", label: "Own or run a business", points: 0 },
          { value: "senior", label: "Senior manager or director", points: 0 },
          { value: "manager", label: "Manager", points: 0 },
          { value: "employed", label: "Employed, not managing", points: 0 },
          { value: "trade", label: "Self-employed trade", points: 0 },
          { value: "not-working", label: "Not working at the moment", points: 0 },
        ],
      },
      {
        id: "experience",
        label: "Have you run a business, or managed a team or budget?",
        options: [
          { value: "business", label: "Yes, I have run a business", points: 25 },
          { value: "managed", label: "Yes, I have managed a team or budget", points: 20 },
          { value: "no", label: "No", points: 0 },
        ],
      },
      {
        id: "money",
        label: "Do you have the investment plus six months of living costs available?",
        options: [
          { value: "yes", label: "Yes", points: 25 },
          { value: "most", label: "Most of it, I would need some funding", points: 15 },
          { value: "no", label: "No, I would need full funding", points: 0 },
        ],
      },
      {
        id: "team",
        label: "Would you build a team, or do the work yourself?",
        options: [
          { value: "team", label: "Build and manage a team", points: 15 },
          { value: "unsure", label: "Not sure yet", points: 5 },
          { value: "self", label: "Do the work myself", points: 0 },
        ],
      },
      {
        id: "property",
        label: "What is your connection to property?",
        options: [
          { value: "landlord", label: "Landlord or property investor", points: 10 },
          { value: "renovated", label: "I have renovated my own home", points: 10 },
          { value: "interested", label: "Interested in homes and design", points: 5 },
          { value: "none", label: "None", points: 0 },
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

export function formFor(client: { form: unknown }): FormConfig {
  const saved = client.form as Partial<FormConfig> | null;
  return saved && Array.isArray(saved.questions) && saved.questions.length > 0
    ? { questions: saved.questions }
    : defaultForm();
}

export type FitLine = { questionId: string; question: string; answer: string; points: number; max: number };

/**
 * The Fit score: how closely the answers match the brand's avatar. 0 to 100.
 * Each answer carries points; the score is the points earned as a share of the points available.
 * Never uses age or gender.
 */
export function scoreFit(form: FormConfig, answers: Record<string, string>): { score: number; detail: FitLine[] } {
  const detail: FitLine[] = [];
  for (const q of form.questions) {
    const max = Math.max(0, ...q.options.map((o) => o.points));
    if (max === 0) continue;
    const chosen = q.options.find((o) => o.value === answers[q.id]);
    detail.push({
      questionId: q.id,
      question: q.label,
      answer: chosen?.label ?? "Not answered",
      points: chosen?.points ?? 0,
      max,
    });
  }
  const available = detail.reduce((sum, line) => sum + line.max, 0);
  const earned = detail.reduce((sum, line) => sum + line.points, 0);
  return { score: available === 0 ? 0 : Math.round((earned / available) * 100), detail };
}
