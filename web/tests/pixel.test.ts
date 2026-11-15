import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/context";
import { leads } from "../src/db/schema";
import { browserId, clickCode, coversCookies } from "../src/meta/click";
import { pixelFor } from "../src/meta/pixel";
import { metaEvent } from "../src/meta/send";
import { defaultSite } from "../src/site/config";
import { registerLead, type SignUpInput } from "../src/site/leads";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

const site = (meta: Record<string, unknown>) => ({ ...defaultSite("Acme"), meta });
const lead = { leadId: "lead-1", agreedToCookies: true, staff: false };

describe("when Meta's pixel may load", () => {
  const ready = site({ datasetId: "12345", testCode: "TEST1" });

  it("loads for a lead who agreed to cookies, on a brand with a dataset and a test code or live", () => {
    expect(pixelFor(ready, lead)).toEqual({ datasetId: "12345", leadId: "lead-1" });
    expect(pixelFor(site({ datasetId: "12345", live: true, liveFrom: "2026-12-16T00:00:00Z" }), lead)).toEqual({ datasetId: "12345", leadId: "lead-1" });
  });

  it("never loads for a new visitor, who has not been asked", () => {
    expect(pixelFor(ready, { ...lead, leadId: null })).toBeNull();
  });

  it("never loads for a lead whose consent did not cover cookies", () => {
    expect(pixelFor(ready, { ...lead, agreedToCookies: false })).toBeNull();
  });

  it("never loads for the team", () => {
    expect(pixelFor(ready, { ...lead, staff: true })).toBeNull();
  });

  it("never loads for a brand with no dataset, or with a dataset but neither a test code nor live", () => {
    expect(pixelFor(site({}), lead)).toBeNull();
    expect(pixelFor(site({ datasetId: "12345" }), lead)).toBeNull();
  });

  it("reads the consent wording for cookies, and the default wording covers them", () => {
    expect(coversCookies(defaultSite("Acme").consentWording)).toBe(true);
    expect(coversCookies("I agree to Acme contacting me, and to my details being shared with Meta to measure advertising.")).toBe(false);
    expect(coversCookies("We use a Cookie to measure adverts")).toBe(true);
  });
});

describe("the ad's click code", () => {
  const at = new Date("2026-12-17T10:00:00Z");

  it("is kept in the form Meta wants it back", () => {
    expect(clickCode("IwAR0abcDEF_123-xyz", at)).toBe(`fb.1.${at.getTime()}.IwAR0abcDEF_123-xyz`);
  });

  it("is ignored when missing or not a click code", () => {
    for (const value of ["", undefined, null, "short", "has spaces in it", "<script>alert(1)</script>", "a".repeat(600)]) expect(clickCode(value, at)).toBeNull();
  });

  it("recognises Meta's own browser cookie and nothing else", () => {
    expect(browserId("fb.1.1794736800000.1234567890")).toBe("fb.1.1794736800000.1234567890");
    for (const value of ["", undefined, "fb.1.x.y", "anything", "fb.1.1794736800000.12'; drop"]) expect(browserId(value)).toBeNull();
  });
});

describe("what Meta is sent about where a lead came from", () => {
  const person = { id: "lead-1", email: "dana@example.test", phone: null, firstName: "Dana", lastName: null, postcode: null };
  const event = (payload: Record<string, unknown> = {}) => ({ eventName: "Schedule", eventId: "schedule-lead-1", payload, createdAt: new Date("2026-12-17T10:00:00Z") });

  it("sends the click code kept at sign-up with every later event", () => {
    const data = metaEvent(event(), { ...person, utm: { content: "Ad 1", fbc: "fb.1.1794736800000.IwAR0abc" } }, "p").user_data;
    expect(data.fbc).toBe("fb.1.1794736800000.IwAR0abc");
  });

  it("sends Meta's browser cookie when the booking carried one", () => {
    expect(metaEvent(event({ fbp: "fb.1.1794736800000.1234567890" }), person, "p").user_data.fbp).toBe("fb.1.1794736800000.1234567890");
  });

  it("leaves both out when there is nothing to send", () => {
    const data = metaEvent(event(), { ...person, utm: { content: "Ad 1" } }, "p").user_data;
    expect(data).not.toHaveProperty("fbc");
    expect(data).not.toHaveProperty("fbp");
  });
});

describe("signing up from an ad", () => {
  let db: Db;
  let admin: Admin;
  let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
  const signUp = (email: string, clickId?: string): SignUpInput => ({
    firstName: "Dana",
    lastName: "Test",
    email,
    phone: "07456 100101",
    postcode: "M1 1AA",
    why: "",
    answers: { timing: "0-3", role: "senior", experience: "business", money: "yes", team: "team", property: "landlord" },
    consent: true,
    whatsapp: false,
    utm: { content: "Ad 1" },
    honeypot: "",
    clickId,
  });
  const utmOf = async (leadId: string) => (await admin.select({ utm: leads.utm }).from(leads).where(eq(leads.id, leadId)))[0].utm as Record<string, string>;

  beforeEach(async () => {
    const fresh = await freshDb();
    db = fresh.db;
    admin = fresh.admin;
    seed = await seedTwoBrands(admin);
  });

  it("keeps the click code with the lead, beside the ad's name", async () => {
    const result = await registerLead(db, seed.refresh, signUp("dana@example.test", "IwAR0abcDEF_123-xyz"));
    if (!result.ok) throw new Error("sign-up failed");
    const utm = await utmOf(result.leadId);
    expect(utm.content).toBe("Ad 1");
    expect(utm.fbc).toMatch(/^fb\.1\.\d+\.IwAR0abcDEF_123-xyz$/);
  });

  it("keeps nothing extra for someone who did not come from an ad", async () => {
    const result = await registerLead(db, seed.refresh, signUp("erin@example.test"));
    if (!result.ok) throw new Error("sign-up failed");
    expect(await utmOf(result.leadId)).toEqual({ content: "Ad 1" });
  });
});
