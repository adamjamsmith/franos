import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/context";
import { leads, metaEvents } from "../src/db/schema";
import { defaultSite } from "../src/site/config";
import { metaEvent, metaSettingsFor, scramble, sendDueMetaEvents, tidyEmail, tidyPhone } from "../src/meta/send";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

const site = (meta: Record<string, unknown>) => ({ ...defaultSite("Acme"), meta });

describe("a brand's link to Meta", () => {
  it("needs a dataset id; without one there is no link", () => {
    expect(metaSettingsFor(site({}))).toBeNull();
    expect(metaSettingsFor(site({ datasetId: "not-a-number" }))).toBeNull();
    expect(metaSettingsFor(site({ datasetId: "1460912712859932", testCode: " TEST1 " }))).toEqual({ datasetId: "1460912712859932", testCode: "TEST1", live: false, liveFrom: null });
  });

  it("is only live with both the switch and the moment it was switched on", () => {
    expect(metaSettingsFor(site({ datasetId: "12345", live: true }))!.live).toBe(false);
    expect(metaSettingsFor(site({ datasetId: "12345", live: true, liveFrom: "nonsense" }))!.live).toBe(false);
    expect(metaSettingsFor(site({ datasetId: "12345", liveFrom: "2026-12-16T00:00:00Z" }))!.live).toBe(false);
    expect(metaSettingsFor(site({ datasetId: "12345", live: true, liveFrom: "2026-12-16T00:00:00Z" }))!.live).toBe(true);
  });
});

describe("what Meta is sent about a person", () => {
  const lead = { id: "lead-1", email: " Dana@Example.Test ", phone: "07456 100101", firstName: "Dana", lastName: "Test", postcode: "M1 1AA" };
  const event = (over: Record<string, unknown> = {}) => ({ eventName: "Lead", eventId: "lead-lead-1", payload: {}, createdAt: new Date("2026-11-15T10:00:00Z"), ...over });

  it("tidies details the way Meta specifies before scrambling them", () => {
    expect(tidyEmail(" Dana@Example.Test ")).toBe("dana@example.test");
    expect(tidyPhone("07456 100101")).toBe("447456100101");
    expect(tidyPhone("+44 7456 100101")).toBe("447456100101");
    expect(tidyPhone("0044 7456 100101")).toBe("447456100101");
  });

  it("never includes the email, phone, name or postcode in the clear", () => {
    const sent = JSON.stringify(metaEvent(event(), lead, "https://x.test/site/acme"));
    for (const secret of ["dana", "Dana", "example.test", "7456", "Test\"", "M1"]) expect(sent).not.toContain(secret);
    const data = metaEvent(event(), lead, "https://x.test/site/acme").user_data;
    expect(data.em).toEqual([scramble("dana@example.test")]);
    expect(data.ph).toEqual([scramble("447456100101")]);
    expect(data.fn).toEqual([scramble("dana")]);
    expect(data.zp).toEqual([scramble("m11aa")]);
    expect(data.country).toEqual([scramble("gb")]);
  });

  it("uses the same id every time, so Meta counts an event once", () => {
    expect(metaEvent(event(), lead, "p").event_id).toBe("lead-lead-1");
    expect(metaEvent(event(), lead, "p").event_time).toBe(1794736800);
  });

  it("is a website event when the visitor's browser is known, and a system event otherwise", () => {
    const withBrowser = metaEvent(event({ payload: { userAgent: "Mozilla/5.0", ip: "203.0.113.9" } }), lead, "https://x.test/site/acme");
    expect(withBrowser).toMatchObject({ action_source: "website", event_source_url: "https://x.test/site/acme" });
    expect(withBrowser.user_data).toMatchObject({ client_user_agent: "Mozilla/5.0", client_ip_address: "203.0.113.9" });
    const without = metaEvent(event(), lead, "https://x.test/site/acme");
    expect(without.action_source).toBe("system_generated");
    expect(without).not.toHaveProperty("event_source_url");
  });

  it("names the events as Meta knows them, and gives a signing its value", () => {
    expect(metaEvent(event({ eventName: "Schedule" }), lead, "p").event_name).toBe("Schedule");
    expect(metaEvent(event({ eventName: "GoodCall" }), lead, "p").event_name).toBe("SubmitApplication");
    expect(metaEvent(event({ eventName: "Signed", payload: { value: 35000, currency: "GBP" } }), lead, "p")).toMatchObject({ event_name: "Purchase", custom_data: { value: 35000, currency: "GBP" } });
    expect(metaEvent(event(), lead, "p")).not.toHaveProperty("custom_data");
  });

  it("leaves out a detail the lead never gave", () => {
    const data = metaEvent(event(), { ...lead, phone: null, postcode: "" }, "p").user_data;
    expect(data.ph).toBeUndefined();
    expect(data.zp).toBeUndefined();
  });
});

describe("sending to Meta", () => {
  let db: Db;
  let admin: Admin;
  let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
  type Sent = { url: string; body: Record<string, unknown>; auth: string };

  const pretendMeta = (answer: { status?: number; json?: unknown } = { json: { events_received: 1 } }) => {
    const sent: Sent[] = [];
    const fake = (async (input: string | URL | Request, init?: RequestInit) => {
      sent.push({ url: String(input), body: JSON.parse(String(init?.body)), auth: (init?.headers as Record<string, string>).Authorization });
      return new Response(JSON.stringify(answer.json ?? {}), { status: answer.status ?? 200 });
    }) as typeof globalThis.fetch;
    return { fetch: fake, sent };
  };
  const brand = (meta: Record<string, unknown>) => ({ ...seed.refresh, site: { meta } });
  const record = (eventName: string, createdAt = new Date("2026-11-15T10:00:00Z")) =>
    admin.insert(metaEvents).values({ clientId: seed.refresh.id, leadId: seed.refreshLead.id, eventName, eventId: `${eventName}-${seed.refreshLead.id}`, createdAt });
  const stored = () => admin.select().from(metaEvents).where(eq(metaEvents.clientId, seed.refresh.id));

  beforeEach(async () => {
    const fresh = await freshDb();
    db = fresh.db;
    admin = fresh.admin;
    seed = await seedTwoBrands(admin);
    await admin.update(leads).set({ phone: "07456 100101" }).where(eq(leads.id, seed.refreshLead.id));
  });

  it("sends nothing without a dataset, without a token, or without a test code while not live", async () => {
    await record("Lead");
    const meta = pretendMeta();
    expect(await sendDueMetaEvents(db, brand({}), "token", meta.fetch)).toMatchObject({ sent: 0, tested: 0 });
    expect(await sendDueMetaEvents(db, brand({ datasetId: "12345", testCode: "TEST1" }), null, meta.fetch)).toMatchObject({ sent: 0, tested: 0 });
    expect(await sendDueMetaEvents(db, brand({ datasetId: "12345" }), "token", meta.fetch)).toMatchObject({ sent: 0, tested: 0, held: 1 });
    expect(meta.sent).toHaveLength(0);
  });

  it("while not live, sends each event once as a test and never as a real one", async () => {
    await record("Lead");
    await record("Schedule");
    const meta = pretendMeta();
    const settings = brand({ datasetId: "1460912712859932", testCode: "TEST39448" });
    expect(await sendDueMetaEvents(db, settings, "token", meta.fetch)).toMatchObject({ sent: 0, tested: 2, failed: 0 });
    expect(meta.sent).toHaveLength(2);
    expect(meta.sent.every((s) => s.body.test_event_code === "TEST39448")).toBe(true);
    expect(meta.sent[0].url).toBe("https://graph.facebook.com/v22.0/1460912712859932/events");
    expect(meta.sent[0].auth).toBe("Bearer token");
    // Still waiting, so it can be sent for real later; but not sent as a test twice.
    expect((await stored()).every((e) => e.status === "logged")).toBe(true);
    expect(await sendDueMetaEvents(db, settings, "token", meta.fetch)).toMatchObject({ tested: 0, held: 2 });
    expect(meta.sent).toHaveLength(2);
  });

  it("once live, sends without a test code, only events from the moment it went live, and marks them sent", async () => {
    await record("Lead", new Date("2026-12-01T10:00:00Z")); // a test lead from before launch
    await record("Schedule", new Date("2026-12-17T10:00:00Z"));
    const meta = pretendMeta();
    const live = brand({ datasetId: "12345", testCode: "TEST1", live: true, liveFrom: "2026-12-16T00:00:00Z" });
    expect(await sendDueMetaEvents(db, live, "token", meta.fetch)).toMatchObject({ sent: 1, tested: 0, held: 1 });
    expect(meta.sent).toHaveLength(1);
    expect(meta.sent[0].body).not.toHaveProperty("test_event_code");
    const rows = await stored();
    expect(rows.find((e) => e.eventName === "Schedule")!.status).toBe("sent");
    expect(rows.find((e) => e.eventName === "Lead")!.status).toBe("logged");
    await sendDueMetaEvents(db, live, "token", meta.fetch);
    expect(meta.sent).toHaveLength(1);
  });

  it("keeps a refused test waiting to try again, and marks a refused real send as failed", async () => {
    await record("Lead", new Date("2026-12-17T10:00:00Z"));
    const refused = pretendMeta({ status: 400, json: { error: { message: "Invalid parameter" } } });
    expect(await sendDueMetaEvents(db, brand({ datasetId: "12345", testCode: "TEST1" }), "token", refused.fetch)).toMatchObject({ failed: 1, tested: 0 });
    expect((await stored())[0]).toMatchObject({ status: "logged", payload: { metaError: "Invalid parameter" } });
    expect(await sendDueMetaEvents(db, brand({ datasetId: "12345", live: true, liveFrom: "2026-12-16T00:00:00Z" }), "token", refused.fetch)).toMatchObject({ failed: 1 });
    expect((await stored())[0].status).toBe("failed");
  });

  it("only ever sends its own brand's events", async () => {
    await admin.insert(metaEvents).values({ clientId: seed.oven.id, leadId: seed.ovenLead.id, eventName: "Lead", eventId: "lead-oven" });
    const meta = pretendMeta();
    expect(await sendDueMetaEvents(db, brand({ datasetId: "12345", testCode: "TEST1" }), "token", meta.fetch)).toMatchObject({ tested: 0, held: 0 });
    expect(meta.sent).toHaveLength(0);
  });
});
