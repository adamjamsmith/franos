import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { placeholderEmails } from "../src/email/defaults";
import { speedAlert } from "../src/calls/alert";
import { bookCall, type CallDeps, cancelCall, finishCall, slotsOnOffer } from "../src/calls/calls";
import { calendarFile, manageLink } from "../src/calls/emails";
import { callJobHandlers } from "../src/calls/jobs";
import type { CallReport, MeetingProvider } from "../src/calls/provider";
import { callSettingsFor, openSlots } from "../src/calls/slots";
import { ukTime, ukWhen } from "../src/calls/time";
import { type Db, withSession } from "../src/db/context";
import { calls, clients, jobs, leadEvents, leads, metaEvents } from "../src/db/schema";
import { nextStepFor, pathFrom, signatureOk } from "../src/email/render";
import { addStarterEmails, type Outgoing, sendDueEmails } from "../src/email/send";
import { runDueJobs } from "../src/jobs/runner";
import { defaultSite } from "../src/site/config";
import { registerLead, type SignUpInput, siteSession } from "../src/site/leads";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let outbox: Outgoing[];
let reports: Record<string, CallReport>;
let meetings: string[];
let deps: CallDeps;

const mike = { name: "Mike", email: "mike@example.test" };
const goodFit = { timing: "0-3", role: "senior", experience: "business", money: "yes", team: "team", property: "landlord" };
const poorFit = { timing: "looking", role: "employed", experience: "no", money: "no", team: "self", property: "none" };
const signUp = (email: string, answers = goodFit): SignUpInput => ({
  firstName: "Dana",
  lastName: "Test",
  email,
  phone: "07456 100101",
  postcode: "M1 1AA",
  why: "",
  answers,
  consent: true,
  whatsapp: false,
  utm: {},
  honeypot: "",
});
async function newLead(email: string, answers = goodFit, brand = seed.refresh) {
  const result = await registerLead(db, brand, signUp(email, answers));
  if (!result.ok) throw new Error("sign-up failed");
  return result.leadId;
}

// Monday 2 March 2026, 8:00am UK time (winter, so UK time = UTC).
const now = new Date("2026-03-02T08:00:00Z");
const at = (iso: string) => new Date(iso);
const tue10 = at("2026-03-03T10:00:00Z");
const tue11 = at("2026-03-03T11:00:00Z");
const wed14 = at("2026-03-04T14:00:00Z");

const site = () => siteSession(seed.refresh.id);
const as = (role: "owner" | "consultant" | "client", clientId = seed.refresh.id) => ({
  userId: role === "owner" ? "u_owner" : role === "consultant" ? "u_mike" : "u_john",
  role,
  clientId,
});
const book = (leadId: string, startsAt: Date, when = now) =>
  bookCall(db, site(), seed.refresh, deps, { leadId, startsAt, by: "lead", now: when });
const callsOf = (leadId: string) => admin.select().from(calls).where(eq(calls.leadId, leadId));
const eventsOf = async (leadId: string) =>
  (await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)).orderBy(leadEvents.id)).map((e) => e.type);
const pendingJobs = async () =>
  (await admin.select().from(jobs).where(eq(jobs.status, "pending"))).map((j) => `${j.type}:${(j.payload as { kind?: string }).kind ?? ""}`).sort();
const subjectsTo = (email: string) => outbox.filter((m) => m.to === email).map((m) => m.subject);
const handlers = (when: Date) =>
  callJobHandlers(db, async (clientId) => (clientId === seed.refresh.id ? { brand: seed.refresh, deps } : null), () => when);

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
  outbox = [];
  reports = {};
  meetings = [];
  const provider: MeetingProvider = {
    async create() {
      const id = `m${meetings.length + 1}`;
      meetings.push(`create ${id}`);
      return { id, joinUrl: `https://zoom.example/${id}` };
    },
    async move(id) {
      meetings.push(`move ${id}`);
    },
    async cancel(id) {
      meetings.push(`cancel ${id}`);
    },
    async report(id) {
      return reports[id] ?? null;
    },
  };
  deps = { deliver: (mail) => void outbox.push(mail), provider, staff: [mike] };
});

describe("the times on offer", () => {
  const settings = callSettingsFor(defaultSite("Refresh Renovation"));
  const times = (day: { slots: Date[] }) => day.slots.map(ukTime);

  it("offers working hours only, on working days, inside the window and the notice period", () => {
    const days = openSlots(settings, now, []);
    // Monday to Friday of this week. Next Monday starts after the 7-day window closes at 8am.
    expect(days.map((d) => d.day)).toEqual(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"]);
    // Today: 2 hours' notice from 8am rules out 9am.
    expect(times(days[0])).toEqual(["10:00am", "11:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm"]);
    // A full day: one call an hour (30 minutes plus a 30-minute gap), the last ending by 5pm.
    expect(times(days[1])).toEqual(["9:00am", "10:00am", "11:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm"]);
  });

  it("does not offer a taken time, or one that would run into another call's gap", () => {
    const taken = openSlots(settings, now, [{ startsAt: tue10, endsAt: at("2026-03-03T10:30:00Z") }]);
    expect(times(taken[1])).not.toContain("10:00am");
    expect(times(taken[1])).toContain("9:00am");
    expect(times(taken[1])).toContain("11:00am");
    // A call at an odd time (10:45 to 11:15) blocks 10am's gap, 11am itself and nothing else.
    const odd = openSlots(settings, now, [{ startsAt: at("2026-03-03T10:45:00Z"), endsAt: at("2026-03-03T11:15:00Z") }]);
    expect(times(odd[1])).toEqual(["9:00am", "12:00pm", "1:00pm", "2:00pm", "3:00pm", "4:00pm"]);
  });

  it("leaves out days off", () => {
    const days = openSlots({ ...settings, daysOff: ["2026-03-04"] }, now, []);
    expect(days.map((d) => d.day)).not.toContain("2026-03-04");
  });

  it("keeps 9am at 9am UK time across the clock change", () => {
    // Friday 27 March 2026. The clocks go forward on Sunday 29 March.
    const days = openSlots(settings, at("2026-03-27T08:00:00Z"), []);
    const monday = days.find((d) => d.day === "2026-03-30")!;
    expect(monday.slots[0].toISOString()).toBe("2026-03-30T08:00:00.000Z");
    expect(ukTime(monday.slots[0])).toBe("9:00am");
  });
});

describe("booking a call", () => {
  it("books the call, makes the Zoom meeting, tells the lead and the consultant, and sets the reminders", async () => {
    const leadId = await newLead("dana@example.test");
    const result = await book(leadId, tue10);
    expect(result).toMatchObject({ ok: true, moved: false });

    const [call] = await callsOf(leadId);
    expect(call).toMatchObject({ status: "booked", bookedBy: "lead", meetingId: "m1", meetingUrl: "https://zoom.example/m1" });
    expect(call.endsAt.toISOString()).toBe("2026-03-03T10:30:00.000Z");

    expect(subjectsTo("dana@example.test")).toEqual(["Your call is booked: Tuesday 3 March at 10:00am"]);
    expect(subjectsTo(mike.email)).toEqual(["New call booked: Dana Test, Tuesday 3 March at 10:00am"]);
    const confirmation = outbox.find((m) => m.to === "dana@example.test")!;
    expect(confirmation.html).toContain("https://zoom.example/m1");
    expect(confirmation.text).toContain("recorded");
    expect(confirmation.text).toContain("/calendar?s=");

    expect(await eventsOf(leadId)).toEqual(["signed_up", "call_booked", "call_email"]);
    expect(await pendingJobs()).toEqual(["call_collect:collect", "call_reminder:10min", "call_reminder:12hours", "call_reminder:day", "call_reminder:hour"]);
  });

  it("refuses a time that is not on offer", async () => {
    const leadId = await newLead("dana@example.test");
    for (const time of ["2026-03-03T09:30:00Z", "2026-03-07T10:00:00Z", "2026-03-02T09:00:00Z", "2026-03-20T10:00:00Z"]) {
      expect(await book(leadId, at(time))).toEqual({ ok: false, reason: "time" });
    }
    expect(await callsOf(leadId)).toHaveLength(0);
    expect(outbox).toHaveLength(0);
  });

  it("gives a time to one lead only", async () => {
    const first = await newLead("first@example.test");
    const second = await newLead("second@example.test");
    expect((await book(first, tue10)).ok).toBe(true);
    expect(await book(second, tue10)).toEqual({ ok: false, reason: "time" });
    // And if two bookings slipped through the check at the same moment, the database itself refuses the second.
    await expect(
      admin.insert(calls).values({ clientId: seed.refresh.id, leadId: second, startsAt: tue10, endsAt: tue11 }),
    ).rejects.toThrow();
    const offered = await withSession(db, site(), (tx) => slotsOnOffer(tx, seed.refresh, now));
    expect(offered[1].slots.map(ukTime)).not.toContain("10:00am");
  });

  it("only lets a lead of this brand book", async () => {
    expect(await book(seed.ovenLead.id, tue10)).toEqual({ ok: false, reason: "lead" });
    expect(await book("00000000-0000-0000-0000-000000000000", tue10)).toEqual({ ok: false, reason: "lead" });
  });

  it("records one Schedule event per lead, however many calls they book", async () => {
    const leadId = await newLead("dana@example.test");
    const first = await book(leadId, tue10);
    if (!first.ok) throw new Error("booking failed");
    await cancelCall(db, site(), seed.refresh, deps, { callId: first.callId, by: "lead", now });
    await book(leadId, wed14);
    const events = await admin.select().from(metaEvents).where(eq(metaEvents.leadId, leadId));
    expect(events.map((e) => e.eventName).sort()).toEqual(["Lead", "Schedule"]);
    expect(events.every((e) => e.status === "logged")).toBe(true); // recorded only; nothing is sent to Meta
  });

  it("ticks the call on the path and moves the next step on", async () => {
    const leadId = await newLead("dana@example.test");
    await admin.insert(leadEvents).values({ clientId: seed.refresh.id, leadId, type: "document_open", data: { kind: "prospectus" } });
    const path = async () => pathFrom(await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)));
    expect(nextStepFor(await path())).toBe("call");
    const booked = await book(leadId, tue10);
    expect(nextStepFor(await path())).toBe("next-steps");
    if (booked.ok) await cancelCall(db, site(), seed.refresh, deps, { callId: booked.callId, by: "lead", now });
    expect(nextStepFor(await path())).toBe("call");
  });
});

describe("changing and cancelling", () => {
  it("moves the call when the lead picks a new time, and moves the reminders with it", async () => {
    const leadId = await newLead("dana@example.test");
    await book(leadId, tue10);
    outbox = [];
    expect(await book(leadId, wed14)).toMatchObject({ ok: true, moved: true });

    const all = await callsOf(leadId);
    expect(all).toHaveLength(1);
    expect(all[0].startsAt.toISOString()).toBe(wed14.toISOString());
    expect(meetings).toEqual(["create m1", "move m1"]);
    expect(subjectsTo("dana@example.test")).toEqual(["Your call has moved: Wednesday 4 March at 2:00pm"]);
    expect(subjectsTo(mike.email)).toEqual(["Call moved: Dana Test, Wednesday 4 March at 2:00pm"]);

    const all_jobs = await admin.select().from(jobs);
    const live = all_jobs.filter((j) => j.status === "pending");
    expect(live.every((j) => (j.payload as { startsAt: string }).startsAt === wed14.toISOString())).toBe(true);
    expect(live).toHaveLength(5); // four reminders still to come, plus collecting the call afterwards
    expect(all_jobs.filter((j) => j.status === "cancelled")).toHaveLength(5);
    // The old time is free again for someone else.
    const other = await newLead("other@example.test");
    expect((await book(other, tue10)).ok).toBe(true);
  });

  it("sends a reminder for a call moved away and back to its first time", async () => {
    const leadId = await newLead("dana@example.test");
    await book(leadId, tue10);
    await book(leadId, wed14);
    await book(leadId, tue10);
    expect(await pendingJobs()).toEqual(["call_collect:collect", "call_reminder:10min", "call_reminder:12hours", "call_reminder:day", "call_reminder:hour"]);
  });

  it("cancels: frees the time, stops the reminders and tells both sides", async () => {
    const leadId = await newLead("dana@example.test");
    const booked = await book(leadId, tue10);
    if (!booked.ok) throw new Error("booking failed");
    outbox = [];
    expect(await cancelCall(db, site(), seed.refresh, deps, { callId: booked.callId, by: "lead", now })).toBe(true);
    expect(await cancelCall(db, site(), seed.refresh, deps, { callId: booked.callId, by: "lead", now })).toBe(false);

    expect((await callsOf(leadId))[0].status).toBe("cancelled");
    expect(await pendingJobs()).toEqual([]);
    expect(meetings).toContain("cancel m1");
    expect(subjectsTo("dana@example.test")).toEqual(["Your call has been cancelled"]);
    expect(subjectsTo(mike.email)).toEqual(["Call cancelled: Dana Test, Tuesday 3 March at 10:00am"]);
    const offered = await withSession(db, site(), (tx) => slotsOnOffer(tx, seed.refresh, now));
    expect(offered[1].slots.map(ukTime)).toContain("10:00am");
  });

  it("signs the lead's change and cancel link, so it cannot be pointed at another call", () => {
    const link = new URL(manageLink("http://localhost:3000", "refresh-renovation", "call-a"));
    const signature = link.searchParams.get("s")!;
    expect(signatureOk("call|call-a", signature)).toBe(true);
    expect(signatureOk("call|call-b", signature)).toBe(false);
  });
});

describe("reminders", () => {
  it("go 3 days, 1 day, 12 hours, 1 hour and 10 minutes before, once each", async () => {
    const leadId = await newLead("dana@example.test");
    const friday = at("2026-03-06T14:00:00Z"); // four days ahead, so every reminder is still to come
    await book(leadId, friday);
    outbox = [];
    const run = (iso: string) => runDueJobs(db, handlers(at(iso)), at(iso));

    await run("2026-03-03T13:59:00Z");
    expect(outbox).toHaveLength(0);
    // Run a minute before, on, and a minute after each reminder's time.
    for (const time of ["2026-03-03T14:00", "2026-03-05T14:00", "2026-03-06T02:00", "2026-03-06T13:00", "2026-03-06T13:50"]) {
      const on = at(`${time}:00Z`).getTime();
      for (const offset of [-60_000, 0, 60_000]) await run(new Date(on + offset).toISOString());
    }
    expect(subjectsTo("dana@example.test")).toEqual([
      "Your call is in 3 days: Friday 6 March at 2:00pm",
      "Reminder: your call is tomorrow, Friday 6 March at 2:00pm",
      "Your call is in 12 hours",
      "Your call starts in 1 hour",
      "Starting in 10 minutes",
    ]);
    expect(outbox.every((m) => m.text.includes("recorded"))).toBe(true);
    expect(outbox.every((m) => m.html.includes("https://zoom.example/m1"))).toBe(true);
  });

  it("come in two versions: pointing at the prospectus if they have not read it, past it if they have", async () => {
    const unread = await newLead("unread@example.test");
    const read = await newLead("read@example.test");
    await admin.insert(leadEvents).values({ clientId: seed.refresh.id, leadId: read, type: "document_open", data: { kind: "prospectus" } });
    await book(unread, tue10);
    await book(read, tue11);

    const confirmation = (email: string) => outbox.find((m) => m.to === email && m.subject.startsWith("Your call is booked"))!;
    expect(confirmation("unread@example.test").text).toContain("please read the prospectus");
    expect(confirmation("unread@example.test").html).toContain("/site/refresh-renovation/prospectus");
    expect(confirmation("read@example.test").text).not.toContain("Read the prospectus");
    expect(confirmation("read@example.test").text).toContain("next steps and the questions worth asking");
    for (const mail of [confirmation("unread@example.test"), confirmation("read@example.test")]) {
      expect(mail.html).toContain("/site/refresh-renovation/next-steps");
      expect(mail.html).toContain("/site/refresh-renovation/questions");
    }

    // The 10-minute email is only about joining.
    outbox = [];
    await runDueJobs(db, handlers(at("2026-03-03T09:50:00Z")), at("2026-03-03T09:50:00Z"));
    const last = outbox.filter((m) => m.to === "unread@example.test").at(-1)!;
    expect(last.subject).toBe("Starting in 10 minutes");
    expect(last.text).not.toContain("prospectus");
  });

  it("skips a reminder whose time has already passed when the call is booked", async () => {
    const leadId = await newLead("dana@example.test");
    await book(leadId, at("2026-03-02T12:00:00Z")); // today: the day-before reminder would be in the past
    expect(await pendingJobs()).toEqual(["call_collect:collect", "call_reminder:10min", "call_reminder:hour"]);
  });

  it("are not sent for a cancelled call", async () => {
    const leadId = await newLead("dana@example.test");
    const booked = await book(leadId, wed14);
    if (!booked.ok) throw new Error("booking failed");
    // Even if a reminder job were still waiting, the reminder itself checks the call first.
    await admin.update(calls).set({ status: "cancelled" }).where(eq(calls.id, booked.callId));
    outbox = [];
    await runDueJobs(db, handlers(at("2026-03-04T13:00:00Z")), at("2026-03-04T13:00:00Z"));
    expect(outbox).toHaveLength(0);
  });

  it("still reach a lead who unsubscribed from the sequence emails", async () => {
    await withSession(db, as("owner"), (tx) => addStarterEmails(tx, seed.refresh.id, placeholderEmails));
    await admin.update(leads).set({ outcome: "not_interested" }).where(eq(leads.id, seed.refreshLead.id));
    const leadId = await newLead("dana@example.test");
    await admin.update(leads).set({ unsubscribedAt: now }).where(eq(leads.id, leadId));

    await book(leadId, wed14);
    await runDueJobs(db, handlers(at("2026-03-03T14:00:00Z")), at("2026-03-03T14:00:00Z"));
    expect(subjectsTo("dana@example.test")).toEqual([
      "Your call is booked: Wednesday 4 March at 2:00pm",
      "Reminder: your call is tomorrow, Wednesday 4 March at 2:00pm",
    ]);
    // The sequence itself stays off.
    const sequence = await sendDueEmails(db, seed.refresh, deps.deliver, at("2026-03-05T10:00:00Z"));
    expect(sequence.sent).toBe(0);
  });
});

describe("after the call", () => {
  const showed: CallReport = { attended: true, minutes: 28, recordingUrl: "https://zoom.example/rec.mp4", transcript: "Hello." };
  const missed: CallReport = { attended: false, minutes: 0, recordingUrl: null, transcript: null };

  it("collects attendance, the recording and the transcript from the video-call service", async () => {
    const leadId = await newLead("dana@example.test");
    await book(leadId, tue10);
    const afterCall = at("2026-03-03T10:40:00Z");
    // Nothing to report yet: the call stays as booked.
    await runDueJobs(db, handlers(afterCall), afterCall);
    expect((await callsOf(leadId))[0].status).toBe("booked");

    reports.m1 = showed;
    await admin.update(jobs).set({ status: "pending" }).where(and(eq(jobs.type, "call_collect")));
    await runDueJobs(db, handlers(afterCall), afterCall);
    expect((await callsOf(leadId))[0]).toMatchObject({
      status: "attended",
      durationMinutes: 28,
      recordingUrl: "https://zoom.example/rec.mp4",
      transcript: "Hello.",
    });
    expect(await eventsOf(leadId)).toContain("call_attended");
  });

  it("marks a no-show, sends 'pick another time' once, and unticks the call", async () => {
    const leadId = await newLead("dana@example.test");
    const booked = await book(leadId, tue10);
    if (!booked.ok) throw new Error("booking failed");
    outbox = [];
    const finish = (report: CallReport) =>
      finishCall(db, as("consultant"), seed.refresh, deps, { callId: booked.callId, report, now: at("2026-03-03T11:00:00Z") });

    await finish(missed);
    await finish(missed);
    expect(subjectsTo("dana@example.test")).toEqual(["Sorry we missed you"]);
    const path = async () => pathFrom(await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId)));
    expect((await path()).call).toBe(false);

    // The consultant corrects it: the lead did turn up.
    await finish(showed);
    expect((await callsOf(leadId))[0].status).toBe("attended");
    expect((await path()).call).toBe(true);
    // And back again does not send a second "missed you" email.
    await finish(missed);
    expect(subjectsTo("dana@example.test")).toEqual(["Sorry we missed you"]);
  });
});

describe("the speed-to-lead alert", () => {
  const alerts = () => outbox.filter((m) => m.subject.startsWith("New good-fit lead"));

  it("tells the consultant at once about a good-fit lead, with a tap-to-call number", async () => {
    const leadId = await newLead("dana@example.test");
    expect(await speedAlert(db, seed.refresh, deps, leadId, at("2026-03-02T10:00:00Z"))).toBe("sent");
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0].to).toBe(mike.email);
    expect(alerts()[0].subject).toBe("New good-fit lead, call now: Dana Test (Fit 100)");
    expect(alerts()[0].html).toContain('href="tel:07456100101"');
    expect(alerts()[0].html).toContain(`/b/refresh-renovation/leads/${leadId}`);
    // Never twice for the same lead.
    expect(await speedAlert(db, seed.refresh, deps, leadId, at("2026-03-02T10:05:00Z"))).toBe("none");
    expect(alerts()).toHaveLength(1);
  });

  it("sends nothing for a low-fit lead", async () => {
    const leadId = await newLead("low@example.test", poorFit);
    expect(await speedAlert(db, seed.refresh, deps, leadId, at("2026-03-02T10:00:00Z"))).toBe("none");
    expect(alerts()).toHaveLength(0);
  });

  it("holds an alert outside alert hours until 8am", async () => {
    const leadId = await newLead("dana@example.test");
    const lateEvening = at("2026-03-02T22:30:00Z");
    expect(await speedAlert(db, seed.refresh, deps, leadId, lateEvening)).toBe("waiting");
    expect(alerts()).toHaveLength(0);

    await runDueJobs(db, handlers(at("2026-03-03T07:59:00Z")), at("2026-03-03T07:59:00Z"));
    expect(alerts()).toHaveLength(0);
    await runDueJobs(db, handlers(at("2026-03-03T08:00:00Z")), at("2026-03-03T08:00:00Z"));
    await runDueJobs(db, handlers(at("2026-03-03T08:01:00Z")), at("2026-03-03T08:01:00Z"));
    expect(alerts()).toHaveLength(1);

    // In the small hours it waits for 8am the same day.
    const early = await newLead("early@example.test");
    await speedAlert(db, seed.refresh, deps, early, at("2026-03-04T03:00:00Z"));
    const [held] = await admin.select().from(jobs).where(eq(jobs.dedupeKey, `alert-${early}`));
    expect(held.runAt.toISOString()).toBe("2026-03-04T08:00:00.000Z");
  });
});

describe("who can see and change calls", () => {
  it("keeps one brand's calls invisible to another", async () => {
    const leadId = await newLead("dana@example.test");
    const booked = await book(leadId, tue10);
    if (!booked.ok) throw new Error("booking failed");
    const seenByOven = await withSession(db, as("owner", seed.oven.id), (tx) => tx.select().from(calls));
    expect(seenByOven).toHaveLength(0);
    // Another brand cannot cancel it either.
    const [oven] = await admin.select().from(clients).where(eq(clients.id, seed.oven.id));
    expect(await cancelCall(db, siteSession(oven.id), oven, deps, { callId: booked.callId, by: "staff", now })).toBe(false);
    expect((await callsOf(leadId))[0].status).toBe("booked");
    // The other brand's times are untouched by this booking.
    const ovenSlots = await withSession(db, siteSession(oven.id), (tx) => slotsOnOffer(tx, oven, now));
    expect(ovenSlots[1].slots.map(ukTime)).toContain("10:00am");
  });

  it("lets a consultant manage calls, and the client role only read them", async () => {
    const leadId = await newLead("dana@example.test");
    const other = await newLead("other@example.test");
    const booked = await bookCall(db, as("consultant"), seed.refresh, deps, { leadId, startsAt: tue10, by: "staff", now });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;

    const seenByClient = await withSession(db, as("client"), (tx) => tx.select().from(calls));
    expect(seenByClient).toHaveLength(1);
    expect(await cancelCall(db, as("client"), seed.refresh, deps, { callId: booked.callId, by: "staff", now })).toBe(false);
    await expect(bookCall(db, as("client"), seed.refresh, deps, { leadId: other, startsAt: tue11, by: "staff", now })).rejects.toThrow();
    expect((await callsOf(leadId))[0].status).toBe("booked");

    expect(await cancelCall(db, as("consultant"), seed.refresh, deps, { callId: booked.callId, by: "staff", now })).toBe(true);
  });
});

describe("the calendar file", () => {
  it("carries the exact start and end, and the Zoom link", () => {
    const summer = at("2026-06-10T09:00:00Z"); // 10am UK summer time
    const file = calendarFile({
      callId: "abc",
      title: "Refresh Renovation call",
      startsAt: summer,
      endsAt: at("2026-06-10T09:30:00Z"),
      joinUrl: "https://zoom.example/m1",
      now,
    });
    expect(file).toContain("DTSTART:20260610T090000Z");
    expect(file).toContain("DTEND:20260610T093000Z");
    expect(file).toContain("LOCATION:https://zoom.example/m1");
    expect(file.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ukWhen(summer)).toBe("Wednesday 10 June at 10:00am");
  });
});
