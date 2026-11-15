import { nextStepFor, pathFrom } from "../email/render";

/**
 * The progress meter at the top of a lead: how well they fit, how interested they are, what they
 * have watched, and a timeline of the steps with how many times each has happened and when.
 */

type LeadLike = { fitScore: number | null; qualified?: boolean; outcome: string | null; outcomeAt: Date | null };
type EventLike = { type: string; data: unknown; occurredAt: Date };
type CallLike = { startsAt: Date; endsAt: Date; status: string; outcome: unknown; goodCall: boolean | null };

/** done = green, part = amber (waiting on us), missed = red, todo = nothing yet. */
export type BoxState = "done" | "part" | "missed" | "todo";
/** `status` is the main line (a count or a word); `when` is the small line under it (a date), empty if there is none. */
export type MeterBox = { key: string; label: string; state: BoxState; status: string; when: string; next: boolean };
export type InterestWord = "Cold" | "Warming" | "Warm" | "Hot";
export type Meter = {
  fit: { score: number | null; band: "good" | "middle" | "low" };
  /** How many of the four things a lead does themselves are done: prospectus, booking a call, Next steps, Questions. */
  interest: { done: number; of: number; word: InterestWord };
  /** How far through the introduction video they got (0 to 100), and how many testimonials they watched at least half of. */
  watched: { video: number; testimonials: number };
  /** Prospectus, Booking, Next steps, Questions, Call. */
  timeline: MeterBox[];
};

const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const dayAndTime = (date: Date) =>
  `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" })}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function meterFor(input: { lead: LeadLike; events: EventLike[]; calls: CallLike[]; now: Date; goodFitFrom: number }): Meter {
  const { lead, events, calls, now } = input;
  const path = pathFrom(events);
  const dataOf = (e: EventLike) => (e.data ?? {}) as Record<string, unknown>;
  const box = (key: string, label: string, state: BoxState, status: string, when = ""): MeterBox => ({ key, label, state, status, when, next: false });

  const reading = (key: string, label: string, kind: string): MeterBox => {
    const times = events.filter((e) => (e.type === "document_open" || e.type === "document_download") && dataOf(e).kind === kind).map((e) => e.occurredAt.getTime());
    return box(key, label, times.length > 0 ? "done" : "todo", plural(times.length, "open", "opens"), times.length > 0 ? `Last ${day(new Date(Math.max(...times)))}` : "");
  };

  const live = calls.filter((c) => c.status !== "cancelled").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = live.find((c) => c.status === "booked" && c.endsAt > now);
  const attended = live.filter((c) => c.status === "attended");
  const lastPast = live.filter((c) => c.status !== "booked" || c.endsAt <= now).at(-1);

  // Every call they booked that was not cancelled, including ones that have happened or were missed.
  const booking = box(
    "booking",
    "Booking",
    upcoming || attended.length > 0 ? "done" : "todo",
    `${live.length} booked`,
    upcoming ? dayAndTime(upcoming.startsAt) : lastPast ? `Last ${day(lastPast.startsAt)}` : "",
  );

  const lastAttended = attended.at(-1);
  const call = attended.some((c) => c.goodCall)
    ? box("call", "Call", "done", "Good call", day(lastAttended!.startsAt))
    : attended.some((c) => !c.outcome)
      ? box("call", "Call", "part", "Attended", "Outcome needed")
      : lastAttended
        ? box("call", "Call", "missed", "Not a good call", day(lastAttended.startsAt))
        : !upcoming && lastPast?.status === "no_show"
          ? box("call", "Call", "missed", "No-show", day(lastPast.startsAt))
          : upcoming
            ? box("call", "Call", "todo", "Due")
            : box("call", "Call", "todo", "Not yet");

  const timeline = [reading("prospectus", "Prospectus", "prospectus"), booking, reading("next-steps", "Next steps", "next-steps"), reading("questions", "Questions", "questions"), call];

  // One box is marked as the next step, unless the lead has ended or never qualified.
  if (!lead.outcome && lead.qualified !== false) {
    const step = nextStepFor(path);
    const key = step === "call" ? "booking" : step === "done" ? (call.state === "done" ? null : "call") : step;
    const target = timeline.find((b) => b.key === key);
    if (target) target.next = true;
  }

  const furthest = new Map<string, number>();
  for (const e of events) {
    if (e.type !== "video_progress") continue;
    const { videoId, percent } = dataOf(e);
    if (typeof videoId !== "string" || typeof percent !== "number") continue;
    furthest.set(videoId, Math.max(furthest.get(videoId) ?? 0, percent));
  }
  const watched = {
    video: Math.min(100, Math.round(furthest.get("vsl") ?? 0)),
    testimonials: [...furthest.entries()].filter(([id, percent]) => id !== "vsl" && percent >= 50).length,
  };

  const done = [path.prospectus, path.call, path["next-steps"], path.questions].filter(Boolean).length;
  const both = path.prospectus && path.call;
  const word: InterestWord = done === 0 ? "Cold" : both && (path["next-steps"] || path.questions) ? "Hot" : both ? "Warm" : "Warming";
  const score = lead.fitScore;

  return {
    fit: { score, band: score === null ? "low" : score >= input.goodFitFrom ? "good" : score >= 40 ? "middle" : "low" },
    interest: { done, of: 4, word },
    watched,
    timeline,
  };
}
