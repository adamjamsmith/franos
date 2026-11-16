import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const clientId = () =>
  uuid("client_id")
    .notNull()
    .references(() => clients.id);

/** A brand / franchise opportunity. One row per client of Franchise Right. */
export const clients = pgTable(
  "clients",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    avatarType: text("avatar_type").notNull(),
    targetCostPerSigningPence: integer("target_cost_per_signing_pence"),
    domain: text("domain").unique(),
    brand: jsonb("brand").notNull().default({}),
    /** Page wording, videos and documents for the public pages. Shape: SiteContent in src/site/config.ts. */
    site: jsonb("site").notNull().default({}),
    /** Sign-up form questions and Fit points. Shape: FormConfig in src/site/config.ts. */
    form: jsonb("form").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [check("clients_avatar_type", sql`${t.avatarType} in ('sole_operator', 'business_builder')`)],
);

/**
 * People who log in. `isOwner` marks Franchise Right staff with access to every brand.
 * Property names on this and the next four tables are fixed by the login library (Better Auth).
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  isOwner: boolean("is_owner").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: userId(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  /** Set when the two-step code has been entered for this login. Without it the session opens nothing. */
  twoStepVerifiedAt: timestamp("two_step_verified_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: userId(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const twoFactors = pgTable("two_factors", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: userId(),
  verified: boolean("verified").default(true),
  failedVerificationCount: integer("failed_verification_count").default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

/** Which brands a non-owner user can work in, and as what. */
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    clientId: clientId(),
    role: text("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("memberships_user_client").on(t.userId, t.clientId),
    check("memberships_role", sql`${t.role} in ('client', 'consultant')`),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: id(),
    clientId: clientId(),
    email: text("email").notNull(),
    phone: text("phone"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    postcode: text("postcode"),
    /** The form answers, keyed by question id. */
    answers: jsonb("answers").notNull().default({}),
    fitScore: integer("fit_score"),
    /** How the Fit score was reached: one line per question. */
    fitDetail: jsonb("fit_detail").notNull().default([]),
    /** The ad they came from: source, medium, campaign, term (ad set), content (ad). */
    utm: jsonb("utm").notNull().default({}),
    whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
    /**
     * False when they completed the form but missed a must-have answer ("Didn't qualify").
     * Set once, at their first sign-up: they get no emails, no booking and no Meta Lead event, and are kept off the board.
     */
    qualified: boolean("qualified").notNull().default(true),
    /** Set when the lead unsubscribes. They are never emailed again by this brand. */
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    /**
     * Set when their address bounced for good or they marked an email as spam (reported by Amazon).
     * Nothing at all is emailed to them again, call emails included.
     */
    emailBlockedAt: timestamp("email_blocked_at", { withTimezone: true }),
    /** "bounce" or "complaint". */
    emailBlockedReason: text("email_blocked_reason"),
    /** How the lead ended: "signed" or "not_interested" (shown as Not going ahead). Empty while they are open. */
    outcome: text("outcome"),
    /** Why they are not going ahead: one of a fixed list, the same for every brand. */
    outcomeReason: text("outcome_reason"),
    outcomeNote: text("outcome_note"),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }),
    /** Set when the consultant moves the lead to Closing: more than interested, needs regular follow-up. */
    closingAt: timestamp("closing_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("leads_client_email").on(t.clientId, t.email),
    // Lets child tables point at (id, client_id) so a child row can never belong to a different client than its lead.
    unique("leads_id_client").on(t.id, t.clientId),
  ],
);

/** Everything a lead does or that happens to them, timestamped. The journey. */
export const leadEvents = pgTable(
  "lead_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    clientId: clientId(),
    leadId: uuid("lead_id").notNull(),
    type: text("type").notNull(),
    data: jsonb("data").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ columns: [t.leadId, t.clientId], foreignColumns: [leads.id, leads.clientId] }),
    index("lead_events_lead_time").on(t.leadId, t.occurredAt),
  ],
);

/** What a lead agreed to: the exact wording shown and when. */
export const consents = pgTable(
  "consents",
  {
    id: id(),
    clientId: clientId(),
    leadId: uuid("lead_id").notNull(),
    kind: text("kind").notNull(),
    wording: text("wording").notNull(),
    granted: boolean("granted").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [foreignKey({ columns: [t.leadId, t.clientId], foreignColumns: [leads.id, leads.clientId] })],
);

/** Timed work: "send this email on Tuesday at 9:20". Checked every minute by the runner. */
export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    clientId: clientId(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    dedupeKey: text("dedupe_key"),
    createdAt: createdAt(),
  },
  (t) => [
    check("jobs_status", sql`${t.status} in ('pending', 'running', 'done', 'failed', 'cancelled')`),
    unique("jobs_client_dedupe").on(t.clientId, t.dedupeKey),
    index("jobs_due").on(t.status, t.runAt),
  ],
);

/** Who did what, and when. Rows are only ever added. */
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  clientId: clientId(),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  detail: jsonb("detail").notNull().default({}),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Anonymous daily counts: page views and how far visitors get through the form.
 * No visitor is identified and nothing they typed is stored.
 */
export const siteStats = pgTable(
  "site_stats",
  {
    clientId: clientId(),
    day: text("day").notNull(),
    key: text("key").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [unique("site_stats_client_day_key").on(t.clientId, t.day, t.key)],
);

/** Events for Meta (Lead, Schedule and so on). Logged here first; sent from the server once a brand's Meta details are set. */
export const metaEvents = pgTable(
  "meta_events",
  {
    id: id(),
    clientId: clientId(),
    leadId: uuid("lead_id").notNull(),
    eventName: text("event_name").notNull(),
    /** Stops the same event being recorded twice. */
    eventId: text("event_id").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status").notNull().default("logged"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.leadId, t.clientId], foreignColumns: [leads.id, leads.clientId] }),
    unique("meta_events_client_event").on(t.clientId, t.eventId),
    check("meta_events_status", sql`${t.status} in ('logged', 'sent', 'failed')`),
  ],
);

/**
 * A brand's emails. Four kinds:
 * - prospectus: sent at sign-up
 * - sequence: the story, on a timetable
 * - reaction: sent because the lead just did something (see `trigger`)
 * - nudge: sent because the lead has been stuck on a step for some days (see `trigger`)
 */
export const emails = pgTable(
  "emails",
  {
    id: id(),
    clientId: clientId(),
    /** Short fixed name, such as "prospectus" or "seq-03". */
    key: text("key").notNull(),
    /** What the email is called on the Emails tab, such as "Funding" or "VT1 Short". Falls back to the subject. */
    name: text("name"),
    /** How it looks: header, video, owner, plain or personal. See LAYOUTS in src/email/render.ts. */
    layout: text("layout").notNull().default("header"),
    /** The line shown after the subject in the inbox. */
    preview: text("preview"),
    headline: text("headline"),
    /** An image above the wording, the owner photo, or the video thumbnail, depending on the layout. */
    imageUrl: text("image_url"),
    /** For the video layout: which of the brand's testimonials to link to. */
    videoId: text("video_id"),
    quote: text("quote"),
    quoteBy: text("quote_by"),
    showPs: boolean("show_ps").notNull().default(true),
    kind: text("kind").notNull(),
    position: integer("position").notNull().default(0),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    /** What sets off a reaction or nudge: prospectus_read, testimonial_watched, no_prospectus or no_call. */
    trigger: text("trigger"),
    /** Sequence: days after sign-up. Nudge: days stuck on the step. Ignored for the others. */
    dayOffset: integer("day_offset").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    unique("emails_client_key").on(t.clientId, t.key),
    unique("emails_id_client").on(t.id, t.clientId),
    check("emails_kind", sql`${t.kind} in ('prospectus', 'sequence', 'reaction', 'nudge')`),
  ],
);

/** One row per email sent to a lead. A lead can only ever get each email once. */
export const emailSends = pgTable(
  "email_sends",
  {
    id: id(),
    clientId: clientId(),
    leadId: uuid("lead_id").notNull(),
    emailId: uuid("email_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    firstClickedAt: timestamp("first_clicked_at", { withTimezone: true }),
    clicks: integer("clicks").notNull().default(0),
    /** Set if the lead unsubscribed and this was the last email they had been sent. */
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (t) => [
    foreignKey({ columns: [t.leadId, t.clientId], foreignColumns: [leads.id, leads.clientId] }),
    foreignKey({ columns: [t.emailId, t.clientId], foreignColumns: [emails.id, emails.clientId] }),
    unique("email_sends_once").on(t.clientId, t.leadId, t.emailId),
    index("email_sends_sent").on(t.clientId, t.sentAt),
  ],
);

/** A call between a lead and the brand's consultant: booked, then showed or did not. */
export const calls = pgTable(
  "calls",
  {
    id: id(),
    clientId: clientId(),
    leadId: uuid("lead_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("booked"),
    /** Who made the booking: the lead on the public page, or someone in franOS. */
    bookedBy: text("booked_by").notNull().default("lead"),
    meetingId: text("meeting_id"),
    meetingUrl: text("meeting_url"),
    /** Filled in after the call, from the video-call service. */
    durationMinutes: integer("duration_minutes"),
    recordingUrl: text("recording_url"),
    transcript: text("transcript"),
    /** The consultant's answers to "How did it go?". Shape: CallOutcome in src/work/outcomes.ts. */
    outcome: jsonb("outcome"),
    /** Worked out from the answers: budget, authority, need and timing all yes, and the kind of person we want. */
    goodCall: boolean("good_call"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.leadId, t.clientId], foreignColumns: [leads.id, leads.clientId] }),
    check("calls_status", sql`${t.status} in ('booked', 'cancelled', 'attended', 'no_show')`),
    check("calls_booked_by", sql`${t.bookedBy} in ('lead', 'staff')`),
    // One call per start time per brand. This is what stops two leads getting the same time.
    uniqueIndex("calls_slot")
      .on(t.clientId, t.startsAt)
      .where(sql`${t.status} <> 'cancelled'`),
    index("calls_lead").on(t.leadId, t.startsAt),
  ],
);

/**
 * A recorded session with someone who is not a lead: a franchisee giving a testimonial, the franchisor
 * being interviewed, or anything else worth recording for a brand. Booked from a shared link.
 */
export const recordingSessions = pgTable(
  "recording_sessions",
  {
    id: id(),
    clientId: clientId(),
    kind: text("kind").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    email: text("email").notNull(),
    phone: text("phone"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("booked"),
    meetingId: text("meeting_id"),
    meetingUrl: text("meeting_url"),
    /** Filled in after the session, from the video-call service. */
    durationMinutes: integer("duration_minutes"),
    recordingUrl: text("recording_url"),
    transcript: text("transcript"),
    /** Each person's own sound file. Shape: { name, url }[]. */
    soundFiles: jsonb("sound_files").notNull().default([]),
    /** The permission the person ticked, word for word, and when. This is the permission held for any advert made from the session. */
    consentWording: text("consent_wording").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("recording_sessions_kind", sql`${t.kind} in ('testimonial', 'franchisor', 'other')`),
    check("recording_sessions_status", sql`${t.status} in ('booked', 'cancelled', 'happened', 'no_show', 'needs_look')`),
    // One session per start time across every brand: the same person hosts them all.
    uniqueIndex("recording_sessions_slot")
      .on(t.startsAt)
      .where(sql`${t.status} <> 'cancelled'`),
    index("recording_sessions_client").on(t.clientId, t.startsAt),
  ],
);

/** What a brand spent on ads in a month, typed in until the ad account is connected. */
export const adSpend = pgTable(
  "ad_spend",
  {
    id: id(),
    clientId: clientId(),
    /** The month, as YYYY-MM. */
    month: text("month").notNull(),
    amountPence: integer("amount_pence").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("ad_spend_client_month").on(t.clientId, t.month)],
);

/**
 * A file a brand has uploaded: an image, a video or a PDF, for its public pages and emails.
 * This is the record; the file itself is kept by the media store (src/media/store.ts) under the same id.
 */
export const media = pgTable(
  "media",
  {
    id: id(),
    clientId: clientId(),
    /** The file's name as it was uploaded, shown in the list and used in its address. */
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    contentType: text("content_type").notNull(),
    /** The ending the file is stored under, with its dot: ".png". */
    extension: text("extension").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [check("media_kind", sql`${t.kind} in ('image', 'video', 'document')`)],
);
