import { randomUUID } from "node:crypto";

export type Meeting = { id: string; joinUrl: string };

/** What the video-call service knows about a call after it has finished. */
export type CallReport = {
  /** Whether the lead joined. */
  attended: boolean;
  minutes: number;
  recordingUrl: string | null;
  transcript: string | null;
  /** Each person's own sound file, when the service makes them. */
  soundFiles?: SoundFile[];
};
export type SoundFile = { name: string; url: string };

/**
 * The video-call service (Zoom first, Google Meet later).
 * franOS only ever talks to it through these four things, so swapping the stand-in
 * for the real Zoom changes nothing else.
 */
export type MeetingProvider = {
  create(input: { topic: string; startsAt: Date; minutes: number }): Promise<Meeting>;
  move(meetingId: string, startsAt: Date): Promise<void>;
  cancel(meetingId: string): Promise<void>;
  /** What happened on the call, or null if the service has nothing to report yet. */
  report(meetingId: string): Promise<CallReport | null>;
  /** Removes the video of a finished call from the service, leaving its sound and transcript. Returns how many files went. */
  dropVideo?(meetingId: string): Promise<number>;
  /** Removes everything the service recorded for a meeting. */
  dropRecording?(meetingId: string): Promise<void>;
  /** True for a real service, where "nothing to report yet" means the call is still running and is worth asking about again. */
  waitsForCalls?: boolean;
};

const base = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * Stand-in for Zoom while there is no Zoom account. It hands out meeting links that open a
 * page inside franOS, and never has anything to report: a call is finished by hand with the
 * "pretend this call has happened" button.
 */
export const standInZoom: MeetingProvider = {
  async create() {
    const id = randomUUID().replace(/-/g, "").slice(0, 11);
    return { id, joinUrl: `${base()}/dev/zoom/${id}` };
  },
  async move() {},
  async cancel() {},
  async report() {
    return null;
  },
};

export const SAMPLE_TRANSCRIPT = `Consultant: Thanks for joining. Before we start, this call is being recorded. Is that OK?
Lead: Yes, that's fine.
Consultant: Great. Tell me what made you look at a franchise now.
Lead: I've managed teams for years and I want to build something of my own.
Consultant: And have you had a chance to read the prospectus?
Lead: I have. My main question is how long it takes to get the first jobs in.

(Sample transcript. Real transcripts come from Zoom once it is connected.)`;
