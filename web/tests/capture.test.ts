import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, withSession } from "../src/db/context";
import { auditLog, clients, consents, leadEvents, leads, memberships, metaEvents, siteStats, users } from "../src/db/schema";
import { defaultForm, scoreFit, siteFor } from "../src/site/config";
import { registerLead, type SignUpInput, siteSession } from "../src/site/leads";
import { parseTrackEvent, recordEvent } from "../src/site/track";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;

const ideal = { timing: "0-3", role: "senior", experience: "business", money: "yes", team: "team", property: "landlord" };

const signUp = (over: Partial<SignUpInput> = {}): SignUpInput => ({
  firstName: "Dana",
  lastName: "Test",
  email: "dana@example.test",
  phone: "07456 100101",
  postcode: "M1 1AA",
  why: "",
  answers: ideal,
  consent: true,
  whatsapp: false,
  utm: {},
  honeypot: "",
  ...over,
});

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
});

describe("Fit score", () => {
  const form = defaultForm();
  const cases: [string, Record<string, string>, number][] = [
    ["ideal", ideal, 100],
    ["manager with most of the money, starting in 3-6 months", { ...ideal, timing: "3-6", experience: "managed", money: "most", property: "interested" }, 70],
    ["ready now but no experience and needs full funding", { ...ideal, experience: "no", money: "no" }, 50],
    ["wants to do the work themselves, 6-12 months", { ...ideal, timing: "6-12", team: "self", property: "none" }, 55],
    ["just looking, unsure, some experience", { timing: "looking", role: "employed", experience: "managed", money: "most", team: "unsure", property: "none" }, 40],
    ["no fit at all", { timing: "looking", role: "employed", experience: "no", money: "no", team: "self", property: "none" }, 0],
  ];
  it.each(cases)("%s", (_name, answers, expected) => {
    expect(scoreFit(form, answers).score).toBe(expected);
  });

  it("explains itself, and ignores questions that carry no points", () => {
    const { detail } = scoreFit(form, ideal);
    expect(detail.map((d) => d.questionId)).toEqual(["timing", "experience", "money", "team", "property"]);
    expect(detail[0]).toMatchObject({ answer: "In the next 3 months", points: 25, max: 25 });
  });
});

describe("signing up", () => {
  it("creates the lead in the right brand only, with answers, score and the ad", async () => {
    const result = await registerLead(db, seed.refresh, signUp({ utm: { source: "facebook", content: "Ali Ad 1", junk: "x" } }));
    expect(result).toMatchObject({ ok: true, isNew: true, fitScore: 100 });
    const inRefresh = await withSession(db, siteSession(seed.refresh.id), (tx) => tx.select().from(leads).where(eq(leads.email, "dana@example.test")));
    const inOven = await withSession(db, siteSession(seed.oven.id), (tx) => tx.select().from(leads).where(eq(leads.email, "dana@example.test")));
    expect(inRefresh).toHaveLength(1);
    expect(inOven).toHaveLength(0);
    expect(inRefresh[0]).toMatchObject({ firstName: "Dana", fitScore: 100, utm: { source: "facebook", content: "Ali Ad 1" } });
  });

  it("saves the exact consent wording that was shown", async () => {
    const result = await registerLead(db, seed.refresh, signUp({ whatsapp: true }));
    if (!result.ok) throw new Error("expected ok");
    const rows = await admin.select().from(consents).where(eq(consents.leadId, result.leadId));
    const site = siteFor(seed.refresh);
    expect(rows.find((r) => r.kind === "contact_recording_meta")?.wording).toBe(site.consentWording);
    expect(rows.find((r) => r.kind === "whatsapp")?.wording).toBe(site.whatsappWording);
  });

  it("is refused without the consent tick, with bad details, with a missing answer, or when the spam trap is filled", async () => {
    expect(await registerLead(db, seed.refresh, signUp({ consent: false }))).toEqual({ ok: false, reason: "consent" });
    expect(await registerLead(db, seed.refresh, signUp({ email: "not-an-email" }))).toEqual({ ok: false, reason: "details" });
    expect(await registerLead(db, seed.refresh, signUp({ phone: "123" }))).toEqual({ ok: false, reason: "details" });
    expect(await registerLead(db, seed.refresh, signUp({ answers: { ...ideal, money: "made-up" } }))).toEqual({ ok: false, reason: "answers" });
    expect(await registerLead(db, seed.refresh, signUp({ honeypot: "I am a bot" }))).toEqual({ ok: false, reason: "spam" });
    expect(await admin.select().from(leads).where(eq(leads.email, "dana@example.test"))).toHaveLength(0);
  });

  it("the same email twice updates one lead, keeps the first ad, and logs one Lead event", async () => {
    const first = await registerLead(db, seed.refresh, signUp({ utm: { content: "Ad A" } }));
    const second = await registerLead(db, seed.refresh, signUp({ email: " DANA@example.test ", answers: { ...ideal, timing: "3-6" }, utm: { content: "Ad B" } }));
    if (!first.ok || !second.ok) throw new Error("expected ok");
    expect(second).toMatchObject({ leadId: first.leadId, isNew: false, fitScore: 90 });
    const rows = await admin.select().from(leads).where(eq(leads.email, "dana@example.test"));
    expect(rows).toHaveLength(1);
    expect(rows[0].utm).toEqual({ content: "Ad A" });
    const meta = await admin.select().from(metaEvents).where(eq(metaEvents.leadId, first.leadId));
    expect(meta.map((m) => m.eventName)).toEqual(["Lead"]);
    const events = await admin.select().from(leadEvents).where(eq(leadEvents.leadId, first.leadId));
    expect(events.map((e) => e.type)).toEqual(["signed_up", "signed_up_again"]);
  });

  it("the same email can sign up to two different brands as two separate leads", async () => {
    await registerLead(db, seed.refresh, signUp());
    await registerLead(db, seed.oven, signUp());
    expect(await admin.select().from(leads).where(eq(leads.email, "dana@example.test"))).toHaveLength(2);
  });
});

describe("tracking", () => {
  it("puts video, page and document activity on the right lead's timeline", async () => {
    const result = await registerLead(db, seed.refresh, signUp());
    if (!result.ok) throw new Error("expected ok");
    const session = siteSession(seed.refresh.id);
    await recordEvent(db, session, result.leadId, { type: "video_progress", videoId: "vt1", percent: 50, seconds: 45 });
    await recordEvent(db, session, result.leadId, { type: "page_view", path: "/prospectus" });
    await recordEvent(db, session, result.leadId, { type: "document_download", kind: "prospectus" });
    const events = await admin.select().from(leadEvents).where(eq(leadEvents.leadId, result.leadId));
    expect(events.map((e) => e.type)).toEqual(["signed_up", "video_progress", "page_view", "document_download"]);
    expect(events[1].data).toEqual({ videoId: "vt1", percent: 50, seconds: 45 });
  });

  it("a lead id from another brand is not accepted", async () => {
    await recordEvent(db, siteSession(seed.refresh.id), seed.ovenLead.id, { type: "page_view", path: "/thank-you" });
    expect(await admin.select().from(leadEvents).where(eq(leadEvents.leadId, seed.ovenLead.id))).toHaveLength(0);
    const counts = await admin.select().from(siteStats).where(eq(siteStats.clientId, seed.refresh.id));
    expect(counts.map((c) => [c.key, c.count])).toEqual([["page:/thank-you", 1]]);
  });

  it("form drop-off counts match a scripted run of visitors, with nothing typed stored", async () => {
    const session = siteSession(seed.refresh.id);
    const visitor = async (reached: string[], submits: boolean, n: number) => {
      await recordEvent(db, session, null, { type: "form_view" });
      if (reached.length) await recordEvent(db, session, null, { type: "form_start" });
      for (const questionId of reached) await recordEvent(db, session, null, { type: "form_question", questionId });
      if (submits) await registerLead(db, seed.refresh, signUp({ email: `v${n}@example.test` }));
    };
    let n = 0;
    for (let i = 0; i < 4; i++) await visitor([], false, n++); // looked and left
    for (let i = 0; i < 3; i++) await visitor(["timing"], false, n++); // left at the second question
    for (let i = 0; i < 2; i++) await visitor(["timing", "role", "experience", "money"], false, n++); // left at funding
    for (let i = 0; i < 1; i++) await visitor(["timing", "role", "experience", "money", "team", "property"], true, n++);

    const rows = await withSession(db, session, (tx) => tx.select().from(siteStats));
    const counts = Object.fromEntries(rows.map((r) => [r.key, r.count]));
    expect(counts).toEqual({
      form_view: 10,
      form_start: 6,
      "form_q:timing": 6,
      "form_q:role": 3,
      "form_q:experience": 3,
      "form_q:money": 3,
      "form_q:team": 1,
      "form_q:property": 1,
      form_submit: 1,
    });
    expect(await admin.select().from(leadEvents)).toHaveLength(1); // only the one sign-up
  });

  it("only accepts the reports it knows, and trims what it is sent", () => {
    expect(parseTrackEvent({ type: "delete_everything" })).toBeNull();
    expect(parseTrackEvent("page_view")).toBeNull();
    expect(parseTrackEvent({ type: "video_progress", videoId: "vt1", percent: 250, seconds: -4 })).toEqual({ type: "video_progress", videoId: "vt1", percent: 100, seconds: 0 });
    expect(parseTrackEvent({ type: "page_view", path: "/thank-you?<script>" })).toEqual({ type: "page_view", path: "/thank-youscript" });
  });
});

describe("the public pages' access", () => {
  it("cannot read people, memberships or the audit log, or change a brand", async () => {
    const session = siteSession(seed.refresh.id);
    expect(await withSession(db, session, (tx) => tx.select().from(users))).toEqual([]);
    expect(await withSession(db, session, (tx) => tx.select().from(memberships))).toEqual([]);
    expect(await withSession(db, session, (tx) => tx.select().from(auditLog))).toEqual([]);
    const changed = await withSession(db, session, (tx) => tx.update(clients).set({ name: "Hacked" }).returning());
    expect(changed).toEqual([]);
    await expect(
      withSession(db, session, (tx) => tx.insert(auditLog).values({ clientId: seed.refresh.id, actorUserId: "site", action: "x" })),
    ).rejects.toThrow();
  });

  it("cannot delete leads, and sees only its own brand's counts and Meta log", async () => {
    await registerLead(db, seed.oven, signUp());
    const session = siteSession(seed.refresh.id);
    expect(await withSession(db, session, (tx) => tx.delete(leads).returning())).toEqual([]);
    expect(await withSession(db, session, (tx) => tx.select().from(metaEvents))).toEqual([]);
    expect(await withSession(db, session, (tx) => tx.select().from(siteStats))).toEqual([]);
  });
});
