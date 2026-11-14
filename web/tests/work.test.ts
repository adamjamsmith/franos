import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { placeholderEmails } from "../src/email/defaults";
import { bookCall, type CallDeps, finishCall } from "../src/calls/calls";
import { callJobHandlers } from "../src/calls/jobs";
import type { MeetingProvider } from "../src/calls/provider";
import { type Db, withSession } from "../src/db/context";
import { adSpend, calls, clients, leadEvents, leads, metaEvents } from "../src/db/schema";
import { addStarterEmails, type Outgoing, sendDueEmails } from "../src/email/send";
import { runDueJobs } from "../src/jobs/runner";
import { registerLead, type SignUpInput, siteSession } from "../src/site/leads";
import { computeNumbers, costEach, share, showRate, spendBetween } from "../src/work/numbers";
import { addNote, closeLead, isGoodCall, markSigned, type OutcomeAnswers, reopenLead, saveOutcome, setClosing } from "../src/work/outcomes";
import { nextAction, placeLead } from "../src/work/stage";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let outbox: Outgoing[];
let deps: CallDeps;

const mike = { name: "Mike", email: "mike@example.test" };
const goodFit = { timing: "0-3", role: "senior", experience: "business", money: "yes", team: "team", property: "landlord" };
const signUp = (email: string, utm: Record<string, string> = {}): SignUpInput => ({
  firstName: "Dana",
  lastName: "Test",
  email,
  phone: "07456 100101",
  postcode: "M1 1AA",
  why: "",
  answers: goodFit,
  consent: true,
  whatsapp: false,
  utm,
  honeypot: "",
});
async function newLead(email: string) {
  const result = await registerLead(db, seed.refresh, signUp(email));
  if (!result.ok) throw new Error("sign-up failed");
  return result.leadId;
}

// Monday 2 March 2026, 8:00am UK time (winter, so UK time = UTC).
const now = new Date("2026-03-02T08:00:00Z");
const at = (iso: string) => new Date(iso);
const tue10 = at("2026-03-03T10:00:00Z");
const afterCall = at("2026-03-03T10:40:00Z");
const as = (role: "owner" | "consultant" | "client", clientId = seed.refresh.id) => ({
  userId: role === "owner" ? "u_owner" : role === "consultant" ? "u_mike" : "u_john",
  role,
  clientId,
});

/** A lead who booked a call for Tuesday 10am and showed up. Returns the lead and the call. */
async function leadWhoShowed(email: string) {
  const leadId = await newLead(email);
  const booked = await bookCall(db, siteSession(seed.refresh.id), seed.refresh, deps, { leadId, startsAt: tue10, by: "lead", now });
  if (!booked.ok) throw new Error("booking failed");
  await finishCall(db, as("consultant"), seed.refresh, deps, {
    callId: booked.callId,
    report: { attended: true, minutes: 28, recordingUrl: null, transcript: null },
    now: afterCall,
  });
  return { leadId, callId: booked.callId };
}

const allYes: OutcomeAnswers = { budget: "yes", authority: "yes", need: "yes", timing: "yes", rightPerson: true, next: "second_call", notes: "" };
const save = (callId: string, answers: OutcomeAnswers, reason?: string, session = as("consultant")) =>
  saveOutcome(db, session, seed.refresh, { callId, answers, reason, now: afterCall });
const leadRow = async (leadId: string) => (await admin.select().from(leads).where(eq(leads.id, leadId)))[0];
const eventTypes = async (leadId: string) =>
  (await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)).orderBy(leadEvents.id)).map((e) => e.type);
const metaNames = async (leadId: string) =>
  (await admin.select().from(metaEvents).where(eq(metaEvents.leadId, leadId))).map((e) => e.eventName).sort();

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
  outbox = [];
  let n = 0;
  const provider: MeetingProvider = {
    create: async () => ({ id: `m${++n}`, joinUrl: `https://zoom.example/m${n}` }),
    move: async () => {},
    cancel: async () => {},
    report: async () => null,
  };
  deps = { deliver: (mail) => void outbox.push(mail), provider, staff: [mike] };
});

describe("a good call", () => {
  it("needs budget, authority, need and timing all yes, and the kind of person we want", () => {
    expect(isGoodCall(allYes)).toBe(true);
    expect(isGoodCall({ ...allYes, budget: "unsure" })).toBe(false);
    expect(isGoodCall({ ...allYes, authority: "no" })).toBe(false);
    expect(isGoodCall({ ...allYes, need: "unsure" })).toBe(false);
    expect(isGoodCall({ ...allYes, timing: "no" })).toBe(false);
    expect(isGoodCall({ ...allYes, rightPerson: false })).toBe(false);
  });

  it("is worked out and saved with the answers, and records one Good call event per lead", async () => {
    const { leadId, callId } = await leadWhoShowed("dana@example.test");
    expect(await save(callId, allYes)).toEqual({ ok: true, good: true });
    const [call] = await admin.select().from(calls).where(eq(calls.id, callId));
    expect(call.goodCall).toBe(true);
    expect(call.outcome).toMatchObject({ budget: "yes", next: "second_call", byUserId: "u_mike" });

    await save(callId, allYes);
    const events = await admin.select().from(metaEvents).where(eq(metaEvents.leadId, leadId));
    expect(events.map((e) => e.eventName).sort()).toEqual(["GoodCall", "Lead", "Schedule"]);
    expect(events.every((e) => e.status === "logged")).toBe(true); // recorded only; nothing is sent to Meta
  });

  it("can be corrected, and the correction is kept on the timeline", async () => {
    const { leadId, callId } = await leadWhoShowed("dana@example.test");
    await save(callId, { ...allYes, budget: "unsure" });
    expect((await admin.select().from(calls).where(eq(calls.id, callId)))[0].goodCall).toBe(false);
    expect(await metaNames(leadId)).not.toContain("GoodCall");

    await save(callId, allYes);
    expect((await admin.select().from(calls).where(eq(calls.id, callId)))[0].goodCall).toBe(true);
    const outcomes = (await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId))).filter((e) => e.type === "call_outcome");
    expect(outcomes.map((e) => (e.data as { corrected: boolean; good: boolean }).corrected)).toEqual([false, true]);
    expect(outcomes.map((e) => (e.data as { good: boolean }).good)).toEqual([false, true]);
  });

  it("can only be recorded for a call the lead showed up to", async () => {
    const leadId = await newLead("dana@example.test");
    const booked = await bookCall(db, siteSession(seed.refresh.id), seed.refresh, deps, { leadId, startsAt: tue10, by: "lead", now });
    if (!booked.ok) throw new Error("booking failed");
    expect(await save(booked.callId, allYes)).toEqual({ ok: false, reason: "call" });
  });
});

describe("how a lead ends", () => {
  it("signed: stops their emails and records one Signed event with the franchise fee", async () => {
    await withSession(db, as("owner"), (tx) => addStarterEmails(tx, seed.refresh.id, placeholderEmails));
    await admin.update(leads).set({ outcome: "not_interested" }).where(eq(leads.id, seed.refreshLead.id));
    await admin.update(clients).set({ site: { franchiseFee: 35000 } }).where(eq(clients.id, seed.refresh.id));
    const [brand] = await admin.select().from(clients).where(eq(clients.id, seed.refresh.id));
    const leadId = await newLead("dana@example.test");

    expect(await markSigned(db, as("consultant"), brand, { leadId, now: afterCall })).toBe(true);
    await markSigned(db, as("consultant"), brand, { leadId, now: afterCall });
    expect(await leadRow(leadId)).toMatchObject({ outcome: "signed", outcomeAt: afterCall });
    const signed = (await admin.select().from(metaEvents).where(eq(metaEvents.leadId, leadId))).filter((e) => e.eventName === "Signed");
    expect(signed).toHaveLength(1);
    expect(signed[0].payload).toEqual({ value: 35000, currency: "GBP" });
    expect((await sendDueEmails(db, brand, deps.deliver, at("2026-03-10T10:00:00Z"))).sent).toBe(0);
  });

  it("not going ahead: needs a reason from the list, and can be reopened", async () => {
    const leadId = await newLead("dana@example.test");
    expect(await closeLead(db, as("consultant"), seed.refresh, { leadId, reason: "made up", now })).toBe(false);
    expect((await leadRow(leadId)).outcome).toBeNull();

    expect(await closeLead(db, as("consultant"), seed.refresh, { leadId, reason: "partner", note: "Wife not keen", now })).toBe(true);
    expect(await leadRow(leadId)).toMatchObject({ outcome: "not_interested", outcomeReason: "partner", outcomeNote: "Wife not keen" });
    expect(placeLead(await leadRow(leadId), [], now, 70).stage).toBe("closed");

    expect(await reopenLead(db, as("consultant"), seed.refresh, { leadId, now })).toBe(true);
    expect(await leadRow(leadId)).toMatchObject({ outcome: null, outcomeReason: null });
    expect(placeLead(await leadRow(leadId), [], now, 70).stage).toBe("goodfit");
    expect(await eventTypes(leadId)).toEqual(["signed_up", "not_going_ahead", "reopened"]);
    expect(await reopenLead(db, as("consultant"), seed.refresh, { leadId, now })).toBe(false);
  });

  it("'Not going ahead' as the answer after a call closes the lead, and needs a reason", async () => {
    const { leadId, callId } = await leadWhoShowed("dana@example.test");
    const answers: OutcomeAnswers = { ...allYes, budget: "no", next: "not_going_ahead", notes: "No funds" };
    expect(await save(callId, answers)).toEqual({ ok: false, reason: "reason" });
    expect((await leadRow(leadId)).outcome).toBeNull();
    expect(await save(callId, answers, "money")).toEqual({ ok: true, good: false });
    expect(await leadRow(leadId)).toMatchObject({ outcome: "not_interested", outcomeReason: "money" });
  });
});

describe("the opportunity board", () => {
  const call = (status: string, startsAt: Date, extra: { goodCall?: boolean; outcome?: unknown } = {}) => ({
    status,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 30 * 60_000),
    goodCall: extra.goodCall ?? null,
    outcome: extra.outcome ?? null,
  });
  const good = { outcome: null, closingAt: null, fitScore: 85 };
  const poor = { outcome: null, closingAt: null, fitScore: 40 };
  const later = at("2026-03-05T12:00:00Z");
  const place = (lead: typeof good | { outcome: string | null; closingAt: Date | null; fitScore: number }, calls: ReturnType<typeof call>[], when = later) =>
    placeLead(lead, calls, when, 70);

  it("only holds opportunities: a low-fit lead with no call is not on it", () => {
    expect(place(poor, []).stage).toBe("lead");
    expect(place(good, []).stage).toBe("goodfit");
    // Booking a call makes anyone an opportunity, whatever their Fit score.
    expect(place(poor, [call("booked", tue10)], now)).toMatchObject({ stage: "scheduled", nextCall: tue10 });
  });

  it("moves an opportunity along as things happen", () => {
    expect(place(good, [call("booked", tue10)], now).stage).toBe("scheduled");
    expect(place(good, [call("attended", tue10)])).toMatchObject({ stage: "interested", waitingForOutcome: true, goodCall: false });
    expect(place(good, [call("attended", tue10, { outcome: {}, goodCall: true })])).toMatchObject({ stage: "interested", waitingForOutcome: false, goodCall: true });
    expect(place({ ...good, closingAt: later }, [call("attended", tue10, { outcome: {} })]).stage).toBe("closing");
    expect(place({ ...good, outcome: "signed", closingAt: later }, []).stage).toBe("signed");
    expect(place({ ...good, outcome: "not_interested" }, [call("booked", tue10)], now).stage).toBe("closed");
  });

  it("labels a missed call, and drops the label once they rebook", () => {
    expect(place(good, [call("no_show", tue10)])).toMatchObject({ stage: "goodfit", missedCall: true });
    expect(place(poor, [call("no_show", tue10)])).toMatchObject({ stage: "lead", missedCall: true });
    const rebooked = [call("no_show", tue10), call("booked", at("2026-03-06T10:00:00Z"))];
    expect(place(good, rebooked)).toMatchObject({ stage: "scheduled", missedCall: false });
    // A cancelled call counts for nothing.
    expect(place(good, [call("cancelled", tue10)])).toMatchObject({ stage: "goodfit", missedCall: false });
  });

  it("says the one thing to do next", () => {
    expect(nextAction(place(good, []))).toContain("Call them now");
    expect(nextAction(place(good, [call("attended", tue10)]))).toContain("how the call went");
    expect(nextAction(place(good, [call("no_show", tue10)]))).toContain("missed their call");
    expect(nextAction(place({ ...good, closingAt: later }, [call("attended", tue10, { outcome: {} })]))).toContain("Follow up");
  });

  it("moves a lead into Closing and back by hand, and keeps notes on their activity", async () => {
    const leadId = await newLead("dana@example.test");
    expect(await setClosing(db, as("consultant"), seed.refresh, { leadId, closing: true, now })).toBe(true);
    expect(await setClosing(db, as("consultant"), seed.refresh, { leadId, closing: true, now })).toBe(false);
    expect(placeLead(await leadRow(leadId), [], now, 70).stage).toBe("closing");
    expect(await setClosing(db, as("consultant"), seed.refresh, { leadId, closing: false, now })).toBe(true);
    expect(placeLead(await leadRow(leadId), [], now, 70).stage).toBe("goodfit");

    expect(await addNote(db, as("consultant"), seed.refresh, { leadId, text: "  Rang, left a voicemail  ", byName: "Mike", now })).toBe(true);
    expect(await addNote(db, as("consultant"), seed.refresh, { leadId, text: "   ", byName: "Mike", now })).toBe(false);
    expect(await addNote(db, as("owner", seed.oven.id), seed.oven, { leadId, text: "Wrong brand", byName: "X", now })).toBe(false);
    const notes = (await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId))).filter((e) => e.type === "note");
    expect(notes.map((e) => e.data)).toEqual([{ text: "Rang, left a voicemail", by: "Mike" }]);
    expect(await eventTypes(leadId)).toEqual(["signed_up", "moved_to_closing", "moved_out_of_closing", "note"]);
  });
});

describe("the reminder to answer 'How did it go?'", () => {
  const handlers = (when: Date) =>
    callJobHandlers(db, async (clientId) => (clientId === seed.refresh.id ? { brand: seed.refresh, deps } : null), () => when);
  const reminders = () => outbox.filter((m) => m.subject.startsWith("How did the call"));
  const anHourOn = at("2026-03-03T11:40:00Z");

  it("goes to the consultant once, an hour after a call with no answers", async () => {
    await leadWhoShowed("dana@example.test");
    await runDueJobs(db, handlers(at("2026-03-03T11:39:00Z")), at("2026-03-03T11:39:00Z"));
    expect(reminders()).toHaveLength(0);
    await runDueJobs(db, handlers(anHourOn), anHourOn);
    await runDueJobs(db, handlers(at("2026-03-03T11:41:00Z")), at("2026-03-03T11:41:00Z"));
    expect(reminders()).toHaveLength(1);
    expect(reminders()[0].to).toBe(mike.email);
    expect(reminders()[0].subject).toBe("How did the call with Dana Test go?");
  });

  it("is not sent once the answers are in", async () => {
    const { callId } = await leadWhoShowed("dana@example.test");
    await save(callId, allYes);
    await runDueJobs(db, handlers(anHourOn), anHourOn);
    expect(reminders()).toHaveLength(0);
  });
});

describe("the numbers", () => {
  const march = at("2026-03-01T00:00:00Z");
  const april = at("2026-04-01T00:00:00Z");
  const lead = (id: string, day: string, extra: Partial<{ fitScore: number; ad: string; signedOn: string }> = {}) => ({
    id,
    createdAt: at(`${day}T12:00:00Z`),
    fitScore: extra.fitScore ?? 80,
    utm: extra.ad ? { content: extra.ad } : {},
    outcome: extra.signedOn ? "signed" : null,
    outcomeAt: extra.signedOn ? at(`${extra.signedOn}T12:00:00Z`) : null,
  });
  const call = (leadId: string, bookedOn: string, heldOn: string, status: string, goodCall = false) => ({
    leadId,
    createdAt: at(`${bookedOn}T12:00:00Z`),
    startsAt: at(`${heldOn}T10:00:00Z`),
    status,
    goodCall,
  });

  // Counted by hand: 5 leads in March (one more in February), 4 bookings made in March,
  // 2 calls happened and 1 no-show in March, 1 good call, 1 signing.
  const input = {
    leads: [
      lead("a", "2026-03-02", { ad: "Ali video", signedOn: "2026-03-20" }),
      lead("b", "2026-03-03", { ad: "Ali video" }),
      lead("c", "2026-03-04", { ad: "Carousel", fitScore: 40 }),
      lead("d", "2026-03-10", { ad: "Carousel", fitScore: 40 }),
      lead("e", "2026-03-30"),
      lead("f", "2026-02-20", { ad: "Ali video" }),
    ],
    calls: [
      call("a", "2026-03-02", "2026-03-05", "attended", true),
      call("b", "2026-03-03", "2026-03-06", "attended"),
      call("c", "2026-03-04", "2026-03-09", "no_show"),
      call("e", "2026-03-30", "2026-04-02", "booked"), // booked in March, held in April
      call("f", "2026-02-21", "2026-02-25", "attended", true), // all in February
    ],
    spendByMonth: { "2026-03": 400_000 },
    from: march,
    to: april,
    goodFitFrom: 70,
  };

  it("match a period counted by hand", () => {
    const n = computeNumbers(input);
    expect(n.totals).toEqual({ leads: 5, booked: 4, happened: 2, noShows: 1, good: 1, signed: 1 });
    expect(n.spendPence).toBe(400_000);
    expect(costEach(n.spendPence, n.totals.leads)).toBe(80_000); // £800 a lead
    expect(costEach(n.spendPence, n.totals.signed)).toBe(400_000); // £4,000 a signing
    expect(costEach(n.spendPence, 0)).toBeNull();
    expect(showRate(n.totals)).toBe(67);
    expect(share(n.totals.booked, n.totals.leads)).toBe(80);
  });

  it("break down by ad and by fit, and each breakdown adds up to the totals", () => {
    const n = computeNumbers(input);
    expect(n.byAd).toEqual([
      { ad: "Ali video", counts: { leads: 2, booked: 2, happened: 2, noShows: 0, good: 1, signed: 1 } },
      { ad: "Carousel", counts: { leads: 2, booked: 1, happened: 0, noShows: 1, good: 0, signed: 0 } },
      { ad: "No ad recorded", counts: { leads: 1, booked: 1, happened: 0, noShows: 0, good: 0, signed: 0 } },
    ]);
    for (const key of ["leads", "booked", "happened", "noShows", "good", "signed"] as const) {
      expect(n.byAd.reduce((sum, row) => sum + row.counts[key], 0)).toBe(n.totals[key]);
      expect(n.goodFit[key] + n.otherFit[key]).toBe(n.totals[key]);
    }
    expect(n.goodFit.leads).toBe(3);
    expect(n.otherFit.leads).toBe(2);
  });

  it("spread a month's spend over its days", () => {
    const spend = { "2026-03": 310_000, "2026-04": 300_000 };
    // Midnight on 1 April in UK summer time is 11pm on 31 March in UTC.
    expect(spendBetween(spend, march, at("2026-03-31T23:00:00Z")).pence).toBe(310_000);
    // 1 to 10 March is 10 of 31 days.
    expect(spendBetween(spend, march, at("2026-03-11T00:00:00Z")).pence).toBe(100_000);
    // The last 2 days of March and the first 3 of April (after the clocks change on 29 March).
    expect(spendBetween(spend, at("2026-03-29T23:00:00Z"), at("2026-04-03T23:00:00Z")).pence).toBe(2 * 10_000 + 3 * 10_000);
    // A month with nothing typed in counts as no spend, and says so.
    expect(spendBetween({}, march, at("2026-03-31T23:00:00Z"))).toEqual({ pence: 0, hasSpend: false });
  });
});

describe("who can do what", () => {
  it("lets a consultant answer outcomes and end leads, but the client role only read", async () => {
    const { leadId, callId } = await leadWhoShowed("dana@example.test");
    expect(await save(callId, allYes, undefined, as("client"))).toEqual({ ok: false, reason: "call" });
    expect((await admin.select().from(calls).where(eq(calls.id, callId)))[0].outcome).toBeNull();
    expect(await save(callId, allYes)).toEqual({ ok: true, good: true });
    const seen = await withSession(db, as("client"), (tx) => tx.select().from(calls));
    expect(seen[0].goodCall).toBe(true);
    expect(leadId).toBeTruthy();
  });

  it("lets only an owner type in ad spend", async () => {
    const row = { clientId: seed.refresh.id, month: "2026-03", amountPence: 400_000 };
    await expect(withSession(db, as("consultant"), (tx) => tx.insert(adSpend).values(row))).rejects.toThrow();
    await expect(withSession(db, as("client"), (tx) => tx.insert(adSpend).values(row))).rejects.toThrow();
    await withSession(db, as("owner"), (tx) => tx.insert(adSpend).values(row));
    expect(await withSession(db, as("client"), (tx) => tx.select().from(adSpend))).toHaveLength(1);
  });

  it("keeps one brand's outcomes and spend invisible to another", async () => {
    const { leadId, callId } = await leadWhoShowed("dana@example.test");
    await withSession(db, as("owner"), (tx) => tx.insert(adSpend).values({ clientId: seed.refresh.id, month: "2026-03", amountPence: 400_000 }));
    const oven = as("owner", seed.oven.id);
    const [ovenBrand] = await admin.select().from(clients).where(eq(clients.id, seed.oven.id));

    expect(await withSession(db, oven, (tx) => tx.select().from(adSpend))).toHaveLength(0);
    expect(await saveOutcome(db, oven, ovenBrand, { callId, answers: allYes, now })).toEqual({ ok: false, reason: "call" });
    expect(await markSigned(db, oven, ovenBrand, { leadId, now })).toBe(false);
    expect(await closeLead(db, oven, ovenBrand, { leadId, reason: "money", now })).toBe(false);
    expect((await leadRow(leadId)).outcome).toBeNull();
  });
});
