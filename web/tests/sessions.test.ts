import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { bookCall, type CallDeps, slotsOnOffer } from "../src/calls/calls";
import { callJobHandlers } from "../src/calls/jobs";
import type { CallReport, MeetingProvider } from "../src/calls/provider";
import { ukTime } from "../src/calls/time";
import { zoomProvider } from "../src/calls/zoom";
import { type Db, withSession } from "../src/db/context";
import { calls, jobs, metaEvents, recordingSessions } from "../src/db/schema";
import type { Outgoing } from "../src/email/send";
import { runDueJobs } from "../src/jobs/runner";
import { sessionJobHandlers } from "../src/sessions/run";
import {
  addSession,
  bookingCode,
  bookingCodeOk,
  bookSession,
  cancelSession,
  deleteSession,
  giveGuestPermission,
  givePermission,
  guestAgreed,
  guestLinkOk,
  guestPath,
  guestsOf,
  hasPermission,
  isBookableKind,
  listSessions,
  moveSession,
  PERMISSION_PENDING,
  readGuests,
  sessionConsentWording,
  sessionSettingsFor,
  type SessionDeps,
  type SessionInput,
  sessionLinkOk,
  sessionPath,
  sessionSlots,
  ukLocal,
} from "../src/sessions/sessions";
import { siteSession } from "../src/site/leads";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let outbox: Outgoing[];
let reports: Record<string, CallReport>;
let meetings: string[];
let provider: MeetingProvider;
let deps: SessionDeps;
let callDeps: CallDeps;

const adam = { name: "Adam", email: "owner@example.test" };
// Monday 2 March 2026, 8:00am UK time (winter, so UK time = UTC).
const now = new Date("2026-03-02T08:00:00Z");
const at = (iso: string) => new Date(iso);
const wed9 = at("2026-03-04T09:00:00Z");
const wed1030 = at("2026-03-04T10:30:00Z");
const thu9 = at("2026-03-05T09:00:00Z");
const wording = sessionConsentWording("Refresh Renovation", "hello@example.test");

const owner = (clientId = seed.refresh.id) => ({ userId: "u_owner", role: "owner" as const, clientId });
const consultant = () => ({ userId: "u_mike", role: "consultant" as const, clientId: seed.refresh.id });
const input = (startsAt: Date, over: Partial<SessionInput> = {}): SessionInput => ({
  kind: "testimonial",
  firstName: "Ali",
  lastName: "Khan",
  email: "Ali@Example.test",
  location: "Nottingham",
  consent: true,
  consentWording: wording,
  startsAt,
  now,
  ...over,
});
const book = (startsAt: Date, over: Partial<SessionInput> = {}, brand = seed.refresh) => bookSession(db, brand, deps, input(startsAt, over));
const all = () => admin.select().from(recordingSessions);
const one = async (id: string) => (await admin.select().from(recordingSessions).where(eq(recordingSessions.id, id)))[0];
const pendingJobs = async () =>
  (await admin.select().from(jobs).where(eq(jobs.status, "pending"))).map((j) => `${j.type}:${(j.payload as { kind?: string }).kind ?? ""}`).sort();
const subjectsTo = (email: string) => outbox.filter((m) => m.to === email).map((m) => m.subject);
const run = (when: Date) =>
  runDueJobs(
    db,
    {
      ...callJobHandlers(db, async () => ({ brand: seed.refresh, deps: callDeps }), () => when),
      ...sessionJobHandlers(db, async () => ({ brand: seed.refresh, deps }), () => when),
    },
    when,
  );
const happened = (over: Partial<CallReport> = {}): CallReport => ({
  attended: true,
  minutes: 42,
  recordingUrl: "https://zoom.example/rec/1",
  transcript: "Adam: How did you start?\nAli: With one van.",
  soundFiles: [
    { name: "Audio only - Adam", url: "https://zoom.example/a1" },
    { name: "Audio only - Ali", url: "https://zoom.example/a2" },
  ],
  ...over,
});

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
  outbox = [];
  reports = {};
  meetings = [];
  provider = {
    waitsForCalls: true,
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
    async dropVideo(id) {
      meetings.push(`drop video ${id}`);
      return 1;
    },
    async dropRecording(id) {
      meetings.push(`drop recording ${id}`);
    },
  };
  deps = { deliver: (mail) => void outbox.push(mail), provider, hosts: [adam] };
  callDeps = { deliver: (mail) => void outbox.push(mail), provider, staff: [{ name: "Mike", email: "mike@example.test" }] };
});

describe("the booking link", () => {
  it("carries a code that belongs to one brand and one kind of session", () => {
    const code = bookingCode(seed.refresh.id, "testimonial");
    expect(bookingCodeOk(seed.refresh.id, "testimonial", code)).toBe(true);
    expect(bookingCodeOk(seed.refresh.id, "franchisor", code)).toBe(false);
    expect(bookingCodeOk(seed.oven.id, "testimonial", code)).toBe(false);
    expect(bookingCodeOk(seed.refresh.id, "testimonial", "made-up")).toBe(false);
  });

  it("gives each booked session its own signed page", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    const signature = new URL(`https://x${sessionPath("refresh-renovation", result.sessionId)}`).searchParams.get("s")!;
    expect(sessionLinkOk(result.sessionId, signature)).toBe(true);
    expect(sessionLinkOk("00000000-0000-4000-8000-000000000000", signature)).toBe(false);
  });
});

describe("booking a session", () => {
  it("offers hour-long sessions on weekdays, with a day's notice", async () => {
    const days = await withSession(db, siteSession(seed.refresh.id), (tx) => sessionSlots(tx, seed.refresh, now, "testimonial"));
    expect(days[0].day).toBe("2026-03-03"); // nothing today: a day's notice
    expect(days[0].slots.map(ukTime)).toEqual(["9:00am", "10:30am", "12:00pm", "1:30pm", "3:00pm"]);
  });

  it("creates the meeting, saves the permission word for word, and tells the person and the host", async () => {
    const result = await book(wed9);
    expect(result.ok).toBe(true);
    const [session] = await all();
    expect(session).toMatchObject({ kind: "testimonial", firstName: "Ali", email: "ali@example.test", status: "booked", meetingId: "m1", consentWording: wording });
    expect(session.consentAt).toEqual(now);
    expect(session.endsAt).toEqual(at("2026-03-04T10:00:00Z"));
    expect(meetings).toEqual(["create m1"]);
    expect(subjectsTo("ali@example.test")).toEqual(["Your testimonial is booked: Wednesday 4 March at 9:00am"]);
    expect(subjectsTo(adam.email)).toEqual(["Refresh Renovation testimonial booked: Ali Khan, Wednesday 4 March at 9:00am"]);
    expect(outbox[0].text).toContain("recorded on video");
    expect(await pendingJobs()).toEqual(["session_collect:collect", "session_reminder:day", "session_reminder:hour"]);
  });

  it("books nothing without the permission tick, a name or a real email address", async () => {
    expect(await book(wed9, { consent: false })).toEqual({ ok: false, reason: "consent" });
    expect(await book(wed9, { firstName: " " })).toEqual({ ok: false, reason: "details" });
    expect(await book(wed9, { email: "not an email" })).toEqual({ ok: false, reason: "details" });
    expect(await all()).toHaveLength(0);
    expect(meetings).toEqual([]);
  });

  it("gives each link its own hours: the owner's settings over the standard ones", () => {
    expect(sessionSettingsFor(seed.refresh)).toMatchObject({ days: [1, 2, 3, 4, 5], startTime: "09:00", lengthMinutes: 60, noticeHours: 24 });
    expect(sessionSettingsFor(seed.refresh, "franchisor")).toMatchObject({ days: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "20:00", noticeHours: 0 });
    const own = { ...seed.refresh, site: { sessions: { testimonial: { days: [2, 4], startTime: "10:00", lengthMinutes: 45 } } } };
    expect(sessionSettingsFor(own, "testimonial")).toMatchObject({ days: [2, 4], startTime: "10:00", endTime: "17:00", lengthMinutes: 45, noticeHours: 24 });
    expect(sessionSettingsFor(own, "other")).toMatchObject({ days: [0, 1, 2, 3, 4, 5, 6], noticeHours: 0 });
  });

  it("lets a franchisor interview be booked at no notice, outside testimonial hours", async () => {
    const saturdayEvening = at("2026-03-07T18:00:00Z");
    expect(await book(saturdayEvening)).toEqual({ ok: false, reason: "time" });
    expect((await book(saturdayEvening, { kind: "franchisor" })).ok).toBe(true);
  });

  it("asks a franchisee for their franchise location, and nobody else", async () => {
    expect(await book(wed9, { location: " " })).toEqual({ ok: false, reason: "details" });
    const testimonial = await book(wed9, { location: " Nottingham " });
    expect(testimonial.ok && (await one(testimonial.sessionId)).location).toBe("Nottingham");
    const interview = await book(thu9, { kind: "franchisor", location: "" });
    expect(interview.ok && (await one(interview.sessionId)).location).toBeNull();
  });

  it("keeps the booking when the confirmation email cannot be sent", async () => {
    deps = { ...deps, deliver: () => Promise.reject(new Error("Email address is not verified")) };
    expect((await book(wed9)).ok).toBe(true);
    expect(await admin.select().from(recordingSessions)).toHaveLength(1);
  });

  it("refuses a time that is not on offer", async () => {
    expect(await book(at("2026-03-04T09:15:00Z"))).toEqual({ ok: false, reason: "time" });
    expect(await book(at("2026-03-02T15:00:00Z"))).toEqual({ ok: false, reason: "time" }); // under a day's notice
  });

  it("never creates a lead or a Meta event", async () => {
    await book(wed9);
    expect(await admin.select().from(metaEvents)).toHaveLength(0);
  });
});

describe("one person hosts everything", () => {
  it("does not offer a time taken by a session in another brand", async () => {
    await book(wed9, {}, seed.oven);
    expect(await book(wed9)).toEqual({ ok: false, reason: "time" });
    const days = await withSession(db, siteSession(seed.refresh.id), (tx) => sessionSlots(tx, seed.refresh, now, "testimonial"));
    expect(days.find((d) => d.day === "2026-03-04")!.slots.map(ukTime)).not.toContain("9:00am");
  });

  it("does not offer a session time that clashes with a lead call, in any brand", async () => {
    const booked = await bookCall(db, siteSession(seed.oven.id), seed.oven, callDeps, { leadId: seed.ovenLead.id, startsAt: at("2026-03-04T11:00:00Z"), by: "lead", now });
    expect(booked.ok).toBe(true);
    // 10:30 to 11:30 would run into the 11:00 call.
    expect(await book(wed1030)).toEqual({ ok: false, reason: "time" });
    expect((await book(wed9)).ok).toBe(true);
  });

  it("does not offer a lead a call time that clashes with a session", async () => {
    await book(wed9); // 9:00 to 10:00, with half an hour clear either side
    const days = await withSession(db, siteSession(seed.oven.id), (tx) => slotsOnOffer(tx, seed.oven, now));
    const wednesday = days.find((d) => d.day === "2026-03-04")!.slots.map(ukTime);
    expect(wednesday).not.toContain("9:00am");
    expect(wednesday).not.toContain("10:00am");
    expect(wednesday).toContain("11:00am");
    const clash = await bookCall(db, siteSession(seed.oven.id), seed.oven, callDeps, { leadId: seed.ovenLead.id, startsAt: wed9, by: "lead", now });
    expect(clash).toEqual({ ok: false, reason: "time" });
  });
});

describe("moving and cancelling", () => {
  it("moves the session, the meeting and the reminders, and tells both people", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    outbox = [];
    const moved = await moveSession(db, siteSession(seed.refresh.id), seed.refresh, deps, { sessionId: result.sessionId, startsAt: thu9, now });
    expect(moved.ok).toBe(true);
    expect((await one(result.sessionId)).startsAt).toEqual(thu9);
    expect(meetings).toEqual(["create m1", "move m1"]);
    expect(subjectsTo("ali@example.test")).toEqual(["Your testimonial has moved: Thursday 5 March at 9:00am"]);
    expect(subjectsTo(adam.email)).toHaveLength(1);
    expect(await pendingJobs()).toEqual(["session_collect:collect", "session_reminder:day", "session_reminder:hour"]);
  });

  it("cancels the session and the meeting, frees the time and stops the reminders", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    expect(await cancelSession(db, owner(), seed.refresh, deps, { sessionId: result.sessionId, now })).toBe(true);
    expect((await one(result.sessionId)).status).toBe("cancelled");
    expect(meetings).toEqual(["create m1", "cancel m1"]);
    expect(await pendingJobs()).toEqual([]);
    expect((await book(wed9)).ok).toBe(true);
  });
});

describe("reminders", () => {
  it("go the day before and an hour before, each saying the session is recorded", async () => {
    await book(wed9);
    outbox = [];
    await run(at("2026-03-03T09:00:00Z"));
    await run(at("2026-03-04T08:00:00Z"));
    expect(subjectsTo("ali@example.test")).toEqual(["Tomorrow: your testimonial with Refresh Renovation", "In an hour: your testimonial with Refresh Renovation"]);
    expect(outbox.every((mail) => mail.text.includes("recorded on video"))).toBe(true);
  });
});

describe("after the session", () => {
  const afterEnd = at("2026-03-04T10:10:00Z");

  it("saves the recording link, the transcript and each sound file, and keeps the video", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    reports.m1 = happened();
    await run(afterEnd);
    const session = await one(result.sessionId);
    expect(session).toMatchObject({ status: "happened", durationMinutes: 42, recordingUrl: "https://zoom.example/rec/1" });
    expect(session.transcript).toContain("one van");
    expect(session.soundFiles).toEqual(happened().soundFiles);
    expect(meetings).toEqual(["create m1"]); // nothing removed from the video-call service
  });

  it("marks a session nobody joined as not having happened", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    reports.m1 = { attended: false, minutes: 0, recordingUrl: null, transcript: null };
    await run(afterEnd);
    expect((await one(result.sessionId)).status).toBe("no_show");
  });

  it("keeps asking while the recording is not ready, then marks the session as needing a look", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    reports.m1 = happened({ recordingUrl: null, transcript: null, soundFiles: [] });
    await run(afterEnd);
    expect((await one(result.sessionId)).status).toBe("booked");
    expect(await pendingJobs()).toEqual(["session_collect:collect"]);

    reports.m1 = happened();
    await run(at("2026-03-04T10:25:00Z"));
    expect((await one(result.sessionId)).status).toBe("happened");
  });

  it("gives up after three hours and asks for a look", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    reports.m1 = happened({ transcript: null });
    await run(afterEnd);
    await admin.update(jobs).set({ runAt: at("2026-03-04T13:05:00Z") }).where(eq(jobs.status, "pending"));
    await run(at("2026-03-04T13:05:00Z"));
    expect(await one(result.sessionId)).toMatchObject({ status: "needs_look", recordingUrl: "https://zoom.example/rec/1", transcript: null });
    expect(await pendingJobs()).toEqual([]);
  });
});

describe("who can see and delete sessions", () => {
  it("shows them to the owner in their own brand only, and to nobody else in the team", async () => {
    await book(wed9);
    await book(thu9, { firstName: "Paul" }, seed.oven);
    const seen = (session: Parameters<typeof withSession>[1]) => withSession(db, session, (tx) => listSessions(tx));
    expect((await seen(owner())).map((s) => s.firstName)).toEqual(["Ali"]);
    expect((await seen(owner(seed.oven.id))).map((s) => s.firstName)).toEqual(["Paul"]);
    expect(await seen(consultant())).toEqual([]);
    expect(await seen({ userId: "u_john", role: "client", clientId: seed.refresh.id })).toEqual([]);
  });

  it("deletes the session and everything recorded for it", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    reports.m1 = happened();
    await run(at("2026-03-04T10:10:00Z"));
    expect(await deleteSession(db, owner(), deps, result.sessionId)).toBe(true);
    expect(await all()).toHaveLength(0);
    expect(meetings).toEqual(["create m1", "drop recording m1"]);
  });

  it("does not let the public pages or the consultant delete one", async () => {
    const result = await book(wed9);
    if (!result.ok) throw new Error("not booked");
    expect(await deleteSession(db, siteSession(seed.refresh.id), deps, result.sessionId)).toBe(false);
    expect(await deleteSession(db, consultant(), deps, result.sessionId)).toBe(false);
    expect(await all()).toHaveLength(1);
    expect(meetings).toEqual(["create m1"]);
  });
});

describe("a lead call keeps its transcript and nothing else", () => {
  const callAt = at("2026-03-03T10:00:00Z");
  const afterCall = at("2026-03-03T10:40:00Z");
  const theCall = async () => (await admin.select().from(calls))[0];
  const bookLeadCall = () => bookCall(db, siteSession(seed.refresh.id), seed.refresh, callDeps, { leadId: seed.refreshLead.id, startsAt: callAt, by: "lead", now });

  it("removes the video once the transcript is saved", async () => {
    await bookLeadCall();
    reports.m1 = happened({ soundFiles: [] });
    await run(afterCall);
    expect(await theCall()).toMatchObject({ status: "attended" });
    expect((await theCall()).transcript).toContain("one van");
    expect(meetings).toEqual(["create m1", "drop video m1"]);
  });

  it("leaves the video alone until the transcript has arrived, and asks again for it", async () => {
    await bookLeadCall();
    reports.m1 = happened({ transcript: null, soundFiles: [] });
    await run(afterCall);
    expect(await theCall()).toMatchObject({ status: "attended", transcript: null });
    expect(meetings).toEqual(["create m1"]);

    reports.m1 = happened({ soundFiles: [] });
    await run(at("2026-03-03T10:55:00Z"));
    expect((await theCall()).transcript).toContain("one van");
    expect(meetings).toEqual(["create m1", "drop video m1"]);
  });

  it("still counts the call if the video cannot be removed", async () => {
    provider.dropVideo = async () => {
      throw new Error("not allowed");
    };
    await bookLeadCall();
    reports.m1 = happened({ soundFiles: [] });
    await run(afterCall);
    expect(await theCall()).toMatchObject({ status: "attended" });
  });
});

describe("a session the owner books for someone", () => {
  const today4pm = at("2026-03-02T16:00:00Z");
  const add = (startsAt: Date, over: Partial<Parameters<typeof addSession>[4]> = {}) =>
    addSession(db, owner(), seed.refresh, deps, { kind: "franchisor", firstName: "John", lastName: "English", email: "john.e@example.test", startsAt, now, ...over });

  it("can be today, at any time, and invites the person to agree on their own page", async () => {
    const result = await add(today4pm, { minutes: 90 });
    if (!result.ok) throw new Error("not added");
    const session = await one(result.sessionId);
    expect(session).toMatchObject({ kind: "franchisor", status: "booked", meetingId: "m1", consentWording: PERMISSION_PENDING });
    expect(session.endsAt).toEqual(at("2026-03-02T17:30:00Z"));
    expect(hasPermission(session)).toBe(false);
    expect(subjectsTo("john.e@example.test")).toEqual(["Your interview is booked: Monday 2 March at 4:00pm"]);
    expect(outbox[0].text).toContain("tick the box to agree");
    expect(subjectsTo(adam.email)).toEqual([]); // the owner booked it, so is not told
  });

  it("saves the permission, word for word, when the person ticks the box", async () => {
    const result = await add(today4pm);
    if (!result.ok) throw new Error("not added");
    const later = at("2026-03-02T15:55:00Z");
    expect(await givePermission(db, seed.refresh, { sessionId: result.sessionId, wording, now: later })).toBe(true);
    const session = await one(result.sessionId);
    expect(session.consentWording).toBe(wording);
    expect(session.consentAt).toEqual(later);
    // It cannot be overwritten afterwards.
    expect(await givePermission(db, seed.refresh, { sessionId: result.sessionId, wording: "something else", now: later })).toBe(false);
  });

  it("is refused when it clashes with another session or a lead call, or has already passed", async () => {
    await add(today4pm);
    expect(await add(at("2026-03-02T16:30:00Z"), { email: "other@example.test" })).toEqual({ ok: false, reason: "taken" });
    expect(await add(at("2026-03-02T06:00:00Z"))).toEqual({ ok: false, reason: "time" });
    expect(await add(at("2026-03-02T12:00:00Z"), { firstName: "" })).toEqual({ ok: false, reason: "details" });
  });

  it("cannot be added by the consultant", async () => {
    await expect(addSession(db, consultant(), seed.refresh, deps, { kind: "other", firstName: "X", lastName: "", email: "x@example.test", startsAt: today4pm, now })).rejects.toThrow();
    expect(await all()).toHaveLength(0);
  });

  it("keeps only the transcript of a working meeting, and asks for no permission", async () => {
    const result = await add(today4pm, { kind: "meeting", firstName: "Mike", email: "mike@example.test" });
    if (!result.ok) throw new Error("not added");
    const booked = await one(result.sessionId);
    expect(booked).toMatchObject({ kind: "meeting", keepVideo: false });
    expect(hasPermission(booked)).toBe(true);
    expect(outbox[0].subject).toBe("Your meeting is booked: Monday 2 March at 4:00pm");
    expect(outbox[0].text).toContain("so we have notes of what was said");
    expect(outbox[0].text).not.toContain("tick the box");

    reports.m1 = happened();
    await run(at("2026-03-02T17:10:00Z"));
    expect(await one(result.sessionId)).toMatchObject({ status: "happened" });
    expect((await one(result.sessionId)).transcript).toContain("one van");
    expect(meetings).toEqual(["create m1", "drop video m1"]);
  });

  it("lets the owner choose either way: a meeting with its video, or an interview without", async () => {
    const withVideo = await add(today4pm, { kind: "meeting", keepVideo: true });
    const without = await add(at("2026-03-03T16:00:00Z"), { keepVideo: false });
    if (!withVideo.ok || !without.ok) throw new Error("not added");
    expect((await one(withVideo.sessionId)).keepVideo).toBe(true);
    expect((await one(without.sessionId)).keepVideo).toBe(false);
  });

  it("has no booking link for a meeting", () => {
    expect(isBookableKind("meeting")).toBe(false);
    expect(isBookableKind("testimonial")).toBe(true);
  });

  it("reads a typed date and time as UK time, winter and summer", () => {
    expect(ukLocal("2026-03-02T16:00")).toEqual(at("2026-03-02T16:00:00Z"));
    expect(ukLocal("2026-07-01T16:00")).toEqual(at("2026-07-01T15:00:00Z"));
    expect(ukLocal("not a date")).toBeNull();
  });
});

describe("the real Zoom, tidying up", () => {
  const credentials = { accountId: "acc", clientId: "id", clientSecret: "secret" };
  function pretendZoom(answers: Record<string, { status?: number; json?: unknown }>) {
    const sent: string[] = [];
    const fake = (async (request: string | URL | Request, init?: RequestInit) => {
      const url = String(request);
      if (url === "https://zoom.us/oauth/token") return new Response(JSON.stringify({ access_token: "pass", expires_in: 3600 }));
      const key = `${init?.method ?? "GET"} ${url.replace("https://api.zoom.us/v2", "")}`;
      sent.push(key);
      const answer = answers[key];
      if (!answer) return new Response(JSON.stringify({ message: `no answer set for ${key}` }), { status: 500 });
      if (answer.status === 204) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(answer.json ?? {}), { status: answer.status ?? 200 });
    }) as typeof globalThis.fetch;
    return { fetch: fake, sent };
  }
  const recordings = {
    share_url: "https://zoom.us/rec/share/abc",
    recording_files: [
      { id: "v1", file_type: "MP4", recording_type: "shared_screen_with_speaker_view" },
      { id: "a1", file_type: "M4A", recording_type: "audio_only" },
      { id: "t1", file_type: "TRANSCRIPT" },
    ],
    participant_audio_files: [
      { id: "p1", file_name: "Audio only - Adam", play_url: "https://zoom.us/rec/play/p1" },
      { id: "p2", file_name: "Audio only - Ali", download_url: "https://zoom.us/rec/download/p2" },
    ],
  };

  it("removes only the video of a call, to the bin", async () => {
    const zoom = pretendZoom({ "GET /meetings/123/recordings": { json: recordings }, "DELETE /meetings/123/recordings/v1?action=trash": { status: 204 } });
    expect(await zoomProvider(credentials, { fetch: zoom.fetch }).dropVideo!("123")).toBe(1);
    expect(zoom.sent).toEqual(["GET /meetings/123/recordings", "DELETE /meetings/123/recordings/v1?action=trash"]);
  });

  it("removes a whole recording when a session is deleted", async () => {
    const zoom = pretendZoom({ "DELETE /meetings/123/recordings?action=trash": { status: 204 } });
    await zoomProvider(credentials, { fetch: zoom.fetch }).dropRecording!("123");
    expect(zoom.sent).toEqual(["DELETE /meetings/123/recordings?action=trash"]);
  });

  it("reports each person's own sound file", async () => {
    const zoom = pretendZoom({
      "GET /meetings/123": { json: { id: 123, status: "waiting" } },
      "GET /past_meetings/123": { json: { duration: 40, participants_count: 2 } },
      "GET /meetings/123/recordings": { json: recordings },
    });
    const report = await zoomProvider(credentials, { fetch: zoom.fetch }).report("123");
    expect(report?.soundFiles).toEqual([
      { name: "Audio only - Adam", url: "https://zoom.us/rec/play/p1" },
      { name: "Audio only - Ali", url: "https://zoom.us/rec/download/p2" },
    ]);
  });
});

describe("guests", () => {
  const today4pm = at("2026-03-02T16:00:00Z");
  const sam = "sam@example.test";
  const jo = "jo@example.test";

  it("reads the guests box, leaving out the person booking and anything typed twice", () => {
    expect(readGuests("", "ali@example.test")).toEqual([]);
    expect(readGuests(" Sam@Example.test, jo@example.test\nsam@example.test; ali@example.test ", "ali@example.test")?.map((g) => g.email)).toEqual([sam, jo]);
    expect(readGuests("sam@example.test, not an email", "ali@example.test")).toBeNull();
    expect(readGuests(Array.from({ length: 6 }, (_, i) => `g${i}@example.test`).join(","), "ali@example.test")).toBeNull();
  });

  it("books nothing when a guest's email address is wrong", async () => {
    expect(await book(wed9, { guests: "sam@example" })).toEqual({ ok: false, reason: "guests" });
    expect(await all()).toHaveLength(0);
    expect(meetings).toEqual([]);
  });

  it("invites each guest from a booking link, with a page of their own that cannot move or cancel", async () => {
    const result = await book(wed9, { guests: `${sam}, ${jo}` });
    if (!result.ok) throw new Error("not booked");
    const session = await one(result.sessionId);
    const [guest] = guestsOf(session);
    expect(guestsOf(session).map((g) => g.email)).toEqual([sam, jo]);
    expect(subjectsTo(sam)).toEqual(["You are invited to a testimonial: Wednesday 4 March at 9:00am"]);
    expect(subjectsTo(jo)).toHaveLength(1);
    const mail = outbox.find((m) => m.to === sam);
    expect(mail?.text).toContain("Ali Khan has added you");
    expect(mail?.text).toContain("https://zoom.example/m1");
    expect(mail?.text).toContain("tick the box to agree");
    // Their link is their own: it is not the booker's, which could move or cancel the session.
    expect(mail?.text).toContain(`g=${guest.id}`);
    expect(mail?.text).not.toContain(sessionPath("refresh", session.id).split("?")[1]);
    const signature = new URL(`https://x${guestPath("refresh", session.id, guest.id)}`).searchParams.get("gs") ?? "";
    expect(guestLinkOk(session.id, guest.id, signature)).toBe(true);
    expect(guestLinkOk(session.id, guestsOf(session)[1].id, signature)).toBe(false);
    expect(sessionLinkOk(session.id, signature)).toBe(false);
  });

  it("holds each guest's own permission, word for word, and never the booker's for them", async () => {
    const result = await book(wed9, { guests: `${sam}, ${jo}` });
    if (!result.ok) throw new Error("not booked");
    const [first, second] = guestsOf(await one(result.sessionId));
    expect(guestAgreed(await one(result.sessionId), first)).toBe(false);
    const later = at("2026-03-03T12:00:00Z");
    expect(await giveGuestPermission(db, seed.refresh, { sessionId: result.sessionId, guestId: first.id, wording, now: later })).toBe(true);
    const after = guestsOf(await one(result.sessionId));
    expect(after[0]).toMatchObject({ email: sam, consentWording: wording, consentAt: later.toISOString() });
    expect(after[1].consentWording).toBeUndefined();
    expect(guestAgreed(await one(result.sessionId), after[1])).toBe(false);
    // It cannot be overwritten, and nobody who is not a guest can agree.
    expect(await giveGuestPermission(db, seed.refresh, { sessionId: result.sessionId, guestId: first.id, wording: "something else" })).toBe(false);
    expect(await giveGuestPermission(db, seed.refresh, { sessionId: result.sessionId, guestId: "00000000-0000-4000-8000-000000000000", wording })).toBe(false);
    expect(guestsOf(await one(result.sessionId))[0].consentWording).toBe(wording);
    // Another brand's pages cannot reach the session.
    expect(await giveGuestPermission(db, seed.oven, { sessionId: result.sessionId, guestId: second.id, wording })).toBe(false);
  });

  it("tells guests when the session moves or is cancelled, and reminds them", async () => {
    const result = await book(wed9, { guests: sam });
    if (!result.ok) throw new Error("not booked");
    await run(at("2026-03-03T09:00:00Z"));
    expect(subjectsTo(sam)).toContain("Tomorrow: your testimonial with Refresh Renovation");
    await moveSession(db, siteSession(seed.refresh.id), seed.refresh, deps, { sessionId: result.sessionId, startsAt: at("2026-03-06T09:00:00Z"), now: at("2026-03-03T09:05:00Z") });
    expect(subjectsTo(sam)).toContain("The testimonial you were invited to has moved: Friday 6 March at 9:00am");
    expect(subjectsTo("ali@example.test")).toContain("Your testimonial has moved: Friday 6 March at 9:00am");
    await cancelSession(db, siteSession(seed.refresh.id), seed.refresh, deps, { sessionId: result.sessionId, now: at("2026-03-03T09:10:00Z") });
    expect(subjectsTo(sam)).toContain("The testimonial you were invited to has been cancelled");
    // A cancelled session takes no more permissions.
    const [guest] = guestsOf(await one(result.sessionId));
    expect(await giveGuestPermission(db, seed.refresh, { sessionId: result.sessionId, guestId: guest.id, wording })).toBe(false);
  });

  it("still tells everyone else when one guest's email cannot be sent", async () => {
    deps = { ...deps, deliver: (mail) => (mail.to === sam ? Promise.reject(new Error("bounced")) : void outbox.push(mail)) };
    const result = await book(wed9, { guests: `${sam}, ${jo}` });
    expect(result.ok).toBe(true);
    expect(subjectsTo("ali@example.test")).toHaveLength(1);
    expect(subjectsTo(jo)).toHaveLength(1);
    expect(subjectsTo(adam.email)).toHaveLength(1);
  });

  it("lets the owner add guests to a session they book, and asks a meeting's guests for no permission", async () => {
    const add = (over: Partial<Parameters<typeof addSession>[4]>) =>
      addSession(db, owner(), seed.refresh, deps, { kind: "franchisor", firstName: "John", lastName: "English", email: "john.e@example.test", startsAt: today4pm, now, ...over });
    expect(await add({ guests: "nope" })).toEqual({ ok: false, reason: "guests" });
    const interview = await add({ guests: sam });
    if (!interview.ok) throw new Error("not added");
    const [guest] = guestsOf(await one(interview.sessionId));
    expect(guestAgreed(await one(interview.sessionId), guest)).toBe(false);
    expect(outbox.find((m) => m.to === sam)?.text).toContain("tick the box to agree");

    const meeting = await add({ kind: "meeting", guests: jo, startsAt: at("2026-03-02T18:00:00Z") });
    if (!meeting.ok) throw new Error("not added");
    const [guestAtMeeting] = guestsOf(await one(meeting.sessionId));
    expect(guestAgreed(await one(meeting.sessionId), guestAtMeeting)).toBe(true);
    const mail = outbox.find((m) => m.to === jo);
    expect(mail?.text).toContain("recorded, so we have notes");
    expect(mail?.text).not.toContain("tick the box");
  });
});
