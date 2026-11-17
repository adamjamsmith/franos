import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/context";
import { auditLog, calls, consents, emailSends, emails, jobs, leadEvents, leads } from "../src/db/schema";
import { applyRetention } from "../src/retention/retention";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let dropped: string[];
const provider = { dropRecording: async (id: string) => void dropped.push(id) };

const now = new Date("2028-06-01T09:00:00Z");
const ago = (months: number, days = 0) => {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - months);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};
const hourAfter = (date: Date) => new Date(date.getTime() + 3_600_000);

const lead = async (email: string, createdAt: Date, over: Partial<typeof leads.$inferInsert> = {}) =>
  (await admin.insert(leads).values({ clientId: seed.refresh.id, email, firstName: "Test", createdAt, ...over }).returning())[0];
const call = async (leadId: string, startsAt: Date, over: Partial<typeof calls.$inferInsert> = {}) =>
  (
    await admin
      .insert(calls)
      .values({ clientId: seed.refresh.id, leadId, startsAt, endsAt: hourAfter(startsAt), status: "attended", meetingId: `m-${startsAt.getTime()}`, transcript: "Hello", recordingUrl: "https://zoom.example/r", ...over })
      .returning()
  )[0];
const emailsOf = async () => (await admin.select({ email: leads.email }).from(leads)).map((l) => l.email).sort();
const actions = async () => (await admin.select().from(auditLog)).map((a) => a.action);

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
  // The two seeded leads are brand new at the time of these tests.
  await admin.update(leads).set({ createdAt: ago(1) });
  dropped = [];
});

describe("call recordings are kept 12 months", () => {
  it("clears the transcript and recording of a call over 12 months old, here and on Zoom, and keeps the call itself", async () => {
    const old = await call(seed.refreshLead.id, ago(12, 2));
    const recent = await call(seed.refreshLead.id, ago(11));
    expect(await applyRetention(db, provider, now)).toEqual({ recordingsCleared: 1, leadsDeleted: 0 });
    const [cleared] = await admin.select().from(calls).where(eq(calls.id, old.id));
    expect([cleared.transcript, cleared.recordingUrl, cleared.status]).toEqual([null, null, "attended"]);
    expect((await admin.select().from(calls).where(eq(calls.id, recent.id)))[0].transcript).toBe("Hello");
    expect(dropped).toEqual([old.meetingId]);
    expect(await actions()).toEqual(["retention.call_recording_cleared"]);
    // A second run finds nothing left to do.
    expect(await applyRetention(db, provider, now)).toEqual({ recordingsCleared: 0, leadsDeleted: 0 });
  });

  it("still clears our copy when Zoom cannot be reached", async () => {
    const old = await call(seed.refreshLead.id, ago(13));
    await applyRetention(db, { dropRecording: async () => Promise.reject(new Error("Zoom is down")) }, now);
    expect((await admin.select().from(calls).where(eq(calls.id, old.id)))[0].transcript).toBeNull();
  });
});

describe("leads are kept 2 years after the last contact", () => {
  it("deletes a lead with no contact for 2 years, and everything about them", async () => {
    const gone = await lead("gone@example.test", ago(30));
    const theirCall = await call(gone.id, ago(29));
    await admin.insert(leadEvents).values({ clientId: seed.refresh.id, leadId: gone.id, type: "signed_up", occurredAt: ago(30) });
    await admin.insert(consents).values({ clientId: seed.refresh.id, leadId: gone.id, kind: "marketing", wording: "I agree", granted: true, occurredAt: ago(30) });
    await admin.insert(jobs).values([
      { clientId: seed.refresh.id, type: "call_alert", payload: { leadId: gone.id }, runAt: now },
      { clientId: seed.refresh.id, type: "call_reminder", payload: { callId: theirCall.id }, runAt: now },
    ]);

    expect((await applyRetention(db, provider, now)).leadsDeleted).toBe(1);
    expect(await emailsOf()).toEqual(["paul@example.test", "sarah@example.test"]);
    for (const table of [calls, leadEvents, consents, jobs]) expect(await admin.select().from(table)).toEqual([]);
    expect(dropped).toContain(theirCall.meetingId);
    // The log records that a lead was removed, and nothing about who they were.
    const [entry] = (await admin.select().from(auditLog)).filter((a) => a.action === "retention.lead_deleted");
    expect([entry.target, entry.detail, entry.actorUserId]).toEqual([gone.id, {}, "system"]);
  });

  it("keeps a lead whose last contact of any kind is inside 2 years", async () => {
    const [email] = await admin.insert(emails).values({ clientId: seed.refresh.id, key: "seq-01", kind: "sequence", subject: "Hi", body: "Hi" }).returning();
    const emailed = await lead("emailed@example.test", ago(30));
    await admin.insert(emailSends).values({ clientId: seed.refresh.id, leadId: emailed.id, emailId: email.id, sentAt: ago(20) });
    const active = await lead("active@example.test", ago(30));
    await admin.insert(leadEvents).values({ clientId: seed.refresh.id, leadId: active.id, type: "page_view", occurredAt: ago(3) });
    const called = await lead("called@example.test", ago(30));
    await call(called.id, ago(23));
    const booked = await lead("booked@example.test", ago(30));
    await call(booked.id, new Date(now.getTime() + 86_400_000), { status: "booked", transcript: null, recordingUrl: null });
    await lead("closed@example.test", ago(30), { outcome: "not_interested", outcomeAt: ago(6) });
    await lead("justinside@example.test", ago(23, 28));

    expect((await applyRetention(db, provider, now)).leadsDeleted).toBe(0);
    expect(await emailsOf()).toHaveLength(8);
  });

  it("never deletes a signed lead, however long ago", async () => {
    await lead("franchisee@example.test", ago(60), { outcome: "signed", outcomeAt: ago(50) });
    await lead("notgoing@example.test", ago(60), { outcome: "not_interested", outcomeAt: ago(50) });
    expect((await applyRetention(db, provider, now)).leadsDeleted).toBe(1);
    expect(await emailsOf()).toContain("franchisee@example.test");
    expect(await emailsOf()).not.toContain("notgoing@example.test");
  });
});
