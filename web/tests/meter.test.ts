import { describe, expect, it } from "vitest";
import { meterFor } from "../src/work/meter";

const now = new Date("2026-11-15T12:00:00Z");
const at = (iso: string) => new Date(iso);
const lead = (over: Record<string, unknown> = {}) => ({ fitScore: 58, qualified: true, outcome: null, outcomeAt: null, ...over });
const opened = (kind: string, iso: string) => ({ type: "document_open", data: { kind }, occurredAt: at(iso) });
const watchedTo = (videoId: string, percent: number) => ({ type: "video_progress", data: { videoId, percent, seconds: 10 }, occurredAt: at("2026-11-09T10:00:00Z") });
const bookedEvent = { type: "call_booked", data: {}, occurredAt: at("2026-11-10T09:00:00Z") };
const call = (status: string, startsIso: string, over: Record<string, unknown> = {}) => ({
  startsAt: at(startsIso),
  endsAt: new Date(at(startsIso).getTime() + 30 * 60_000),
  status,
  outcome: null,
  goodCall: null,
  ...over,
});
const meter = (over: Partial<Parameters<typeof meterFor>[0]> = {}) => meterFor({ lead: lead(), events: [], calls: [], now, goodFitFrom: 70, ...over });
type M = ReturnType<typeof meterFor>;
const box = (m: M, key: string) => m.timeline.find((b) => b.key === key)!;
const next = (m: M) => m.timeline.find((b) => b.next)?.key ?? null;

describe("the lead progress meter", () => {
  it("is five boxes: Prospectus, Booking, Next steps, Questions, Call", () => {
    expect(meter().timeline.map((b) => b.label)).toEqual(["Prospectus", "Booking", "Next steps", "Questions", "Call"]);
  });

  it("a brand-new lead is Cold, everything at nought, and the prospectus is next", () => {
    const m = meter();
    expect(m.interest).toEqual({ done: 0, of: 4, word: "Cold" });
    expect(m.timeline.map((b) => b.status)).toEqual(["0 opens", "0 booked", "0 opens", "0 opens", "Not yet"]);
    expect(m.timeline.every((b) => b.state === "todo" && b.when === "")).toBe(true);
    expect(m.watched).toEqual({ video: 0, testimonials: 0 });
    expect(next(m)).toBe("prospectus");
  });

  it("bands the Fit score: good from the brand's threshold, middle from 40, low below", () => {
    expect(meter({ lead: lead({ fitScore: 70 }) }).fit.band).toBe("good");
    expect(meter().fit.band).toBe("middle");
    expect(meter({ lead: lead({ fitScore: 39 }) }).fit.band).toBe("low");
    expect(meter({ lead: lead({ fitScore: null }) }).fit).toEqual({ score: null, band: "low" });
  });

  it("counts opens and shows when the last one was", () => {
    const m = meter({ events: [opened("prospectus", "2026-11-10T10:00:00Z"), opened("prospectus", "2026-11-12T10:00:00Z"), opened("questions", "2026-11-13T10:00:00Z")] });
    expect(box(m, "prospectus")).toMatchObject({ state: "done", status: "2 opens", when: "Last 12 Nov" });
    expect(box(m, "questions")).toMatchObject({ state: "done", status: "1 open", when: "Last 13 Nov" });
    expect(box(m, "next-steps")).toMatchObject({ state: "todo", status: "0 opens", when: "" });
    expect(m.interest).toMatchObject({ done: 2, word: "Warming" });
    expect(next(m)).toBe("booking");
  });

  it("a booked call shows on Booking with its date and time, and as due on Call", () => {
    const m = meter({ events: [opened("prospectus", "2026-11-10T10:00:00Z"), bookedEvent], calls: [call("booked", "2026-11-17T10:00:00Z")] });
    expect(box(m, "booking")).toMatchObject({ state: "done", status: "1 booked", when: "Tue 17 Nov, 10:00" });
    expect(box(m, "call")).toMatchObject({ state: "todo", status: "Due", when: "" });
    expect(m.interest).toMatchObject({ done: 2, word: "Warm" });
    expect(next(m)).toBe("next-steps");
  });

  it("counts every call that was not cancelled", () => {
    const m = meter({
      events: [bookedEvent],
      calls: [call("attended", "2026-11-12T10:00:00Z", { outcome: { budget: "yes" }, goodCall: true }), call("cancelled", "2026-11-13T10:00:00Z"), call("booked", "2026-11-17T10:00:00Z")],
    });
    expect(box(m, "booking")).toMatchObject({ status: "2 booked", when: "Tue 17 Nov, 10:00" });
    expect(box(m, "call")).toMatchObject({ state: "done", status: "Good call", when: "12 Nov" });
  });

  it("the Call box follows the call: attended, good call, not a good call, no-show", () => {
    const events = [bookedEvent];
    expect(box(meter({ events, calls: [call("attended", "2026-11-12T10:00:00Z")] }), "call")).toMatchObject({ state: "part", status: "Attended", when: "Outcome needed" });
    expect(box(meter({ events, calls: [call("attended", "2026-11-12T10:00:00Z", { outcome: { budget: "no" }, goodCall: false })] }), "call")).toMatchObject({ state: "missed", status: "Not a good call" });

    const missed = meter({ events: [bookedEvent, { type: "call_no_show", data: {}, occurredAt: at("2026-11-12T11:00:00Z") }], calls: [call("no_show", "2026-11-12T10:00:00Z")] });
    expect(box(missed, "call")).toMatchObject({ state: "missed", status: "No-show", when: "12 Nov" });
    expect(box(missed, "booking")).toMatchObject({ state: "todo", status: "1 booked", when: "Last 12 Nov" });
    expect(missed.interest.done).toBe(0);
  });

  it("is Hot once they have read the prospectus, booked a call and read Next steps or Questions", () => {
    const m = meter({ events: [opened("prospectus", "2026-11-10T10:00:00Z"), bookedEvent, opened("questions", "2026-11-13T10:00:00Z")], calls: [call("booked", "2026-11-17T10:00:00Z")] });
    expect(m.interest).toEqual({ done: 3, of: 4, word: "Hot" });
    expect(next(m)).toBe("next-steps");
  });

  it("without a call they are only Warming, however much they have read", () => {
    const m = meter({ events: [opened("prospectus", "2026-11-10T10:00:00Z"), opened("next-steps", "2026-11-11T10:00:00Z"), opened("questions", "2026-11-12T10:00:00Z")] });
    expect(m.interest).toMatchObject({ done: 3, word: "Warming" });
  });

  it("when everything the lead does is done, the next box is Call, until it is a good call", () => {
    const events = [opened("prospectus", "2026-11-10T10:00:00Z"), bookedEvent, opened("next-steps", "2026-11-13T10:00:00Z"), opened("questions", "2026-11-13T11:00:00Z")];
    expect(next(meter({ events, calls: [call("booked", "2026-11-17T10:00:00Z")] }))).toBe("call");
    expect(next(meter({ events, calls: [call("attended", "2026-11-12T10:00:00Z", { outcome: { budget: "yes" }, goodCall: true })] }))).toBeNull();
  });

  it("shows how far through the introduction video they got, and how many testimonials they watched half of", () => {
    const m = meter({ events: [watchedTo("vsl", 25), watchedTo("vsl", 75), watchedTo("vt1", 80), watchedTo("vt2", 30), watchedTo("vt3", 50)] });
    expect(m.watched).toEqual({ video: 75, testimonials: 2 });
  });

  it("a lead who has ended, or who didn't qualify, has no next step", () => {
    expect(next(meter({ lead: lead({ outcome: "signed", outcomeAt: at("2026-11-14T10:00:00Z") }) }))).toBeNull();
    expect(next(meter({ lead: lead({ outcome: "not_interested" }) }))).toBeNull();
    expect(next(meter({ lead: lead({ qualified: false }) }))).toBeNull();
  });
});
