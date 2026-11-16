import { describe, expect, it } from "vitest";
import { transcriptFromVtt, zoomCredentialsFromEnv, ZoomError, zoomProvider } from "../src/calls/zoom";

const credentials = { accountId: "acc", clientId: "id", clientSecret: "secret" };
type Sent = { url: string; method: string; headers: Record<string, string>; body: string | undefined };

/** A pretend Zoom: answers each "METHOD path" from a table and keeps a note of everything it was sent. */
function pretendZoom(answers: Record<string, { status?: number; json?: unknown; text?: string }>) {
  const sent: Sent[] = [];
  const fake = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    sent.push({ url, method, headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body as string | undefined });
    const key = `${method} ${url.replace("https://api.zoom.us/v2", "")}`;
    const answer = url === "https://zoom.us/oauth/token" ? { json: { access_token: "pass-1", expires_in: 3600 } } : answers[key];
    if (!answer) return new Response(JSON.stringify({ message: `no answer set for ${key}` }), { status: 500 });
    if (answer.status === 204) return new Response(null, { status: 204 });
    return new Response(answer.text ?? JSON.stringify(answer.json ?? {}), { status: answer.status ?? 200 });
  }) as typeof globalThis.fetch;
  return { fetch: fake, sent, calls: () => sent.filter((s) => s.url !== "https://zoom.us/oauth/token") };
}

describe("the Zoom codes", () => {
  it("are read from what franOS was started with, trimmed", () => {
    expect(zoomCredentialsFromEnv({ FRANOS_ZOOM_CREDENTIALS: '{"accountId":" a ","clientId":"b","clientSecret":"c"}' })).toEqual({ accountId: "a", clientId: "b", clientSecret: "c" });
  });

  it("mean 'no Zoom here' when missing, incomplete or not valid", () => {
    expect(zoomCredentialsFromEnv({})).toBeNull();
    expect(zoomCredentialsFromEnv({ FRANOS_ZOOM_CREDENTIALS: '{"accountId":"a","clientId":"b","clientSecret":""}' })).toBeNull();
    expect(zoomCredentialsFromEnv({ FRANOS_ZOOM_CREDENTIALS: "not json" })).toBeNull();
  });
});

describe("the real Zoom", () => {
  it("signs in with the account's codes and reuses the pass until it is nearly out", async () => {
    let time = 0;
    const zoom = pretendZoom({ "DELETE /meetings/1": { status: 204 } });
    const provider = zoomProvider(credentials, { fetch: zoom.fetch, now: () => time });
    await provider.cancel("1");
    await provider.cancel("1");
    const signIns = () => zoom.sent.filter((s) => s.url === "https://zoom.us/oauth/token");
    expect(signIns()).toHaveLength(1);
    expect(signIns()[0].headers.Authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(signIns()[0].body).toBe("grant_type=account_credentials&account_id=acc");
    expect(zoom.calls()[0].headers.Authorization).toBe("Bearer pass-1");

    time = 56 * 60_000; // under five minutes left
    await provider.cancel("1");
    expect(signIns()).toHaveLength(2);
  });

  it("creates a meeting that records by itself and never leaves the lead waiting outside", async () => {
    const zoom = pretendZoom({ "POST /users/me/meetings": { status: 201, json: { id: 81234567890, join_url: "https://zoom.us/j/81234567890" } } });
    const meeting = await zoomProvider(credentials, { fetch: zoom.fetch }).create({ topic: "Acme call with Dana Test", startsAt: new Date("2026-11-17T10:00:00Z"), minutes: 30 });
    expect(meeting).toEqual({ id: "81234567890", joinUrl: "https://zoom.us/j/81234567890" });
    const body = JSON.parse(zoom.calls()[0].body!);
    expect(body).toMatchObject({ topic: "Acme call with Dana Test", type: 2, start_time: "2026-11-17T10:00:00Z", duration: 30, timezone: "Europe/London" });
    expect(body.settings).toMatchObject({ auto_recording: "cloud", join_before_host: true, waiting_room: false });
  });

  it("creates the meeting for a named host when one is given", async () => {
    const zoom = pretendZoom({ "POST /users/mike%40example.test/meetings": { json: { id: 5, join_url: "https://zoom.us/j/5" } } });
    await zoomProvider(credentials, { fetch: zoom.fetch, host: "mike@example.test" }).create({ topic: "t", startsAt: new Date("2026-11-17T10:00:00Z"), minutes: 30 });
    expect(zoom.calls()[0].url).toBe("https://api.zoom.us/v2/users/mike%40example.test/meetings");
  });

  it("moves a meeting, and treats cancelling one Zoom no longer has as done", async () => {
    const zoom = pretendZoom({ "PATCH /meetings/9": { status: 204 }, "DELETE /meetings/9": { status: 404, json: { message: "Meeting does not exist" } } });
    const provider = zoomProvider(credentials, { fetch: zoom.fetch });
    await provider.move("9", new Date("2026-11-18T09:00:00Z"));
    expect(JSON.parse(zoom.calls()[0].body!)).toEqual({ start_time: "2026-11-18T09:00:00Z", timezone: "Europe/London" });
    await expect(provider.cancel("9")).resolves.toBeUndefined();
  });

  it("says so when Zoom refuses", async () => {
    const zoom = pretendZoom({ "POST /users/me/meetings": { status: 400, json: { message: "Invalid start time" } } });
    await expect(zoomProvider(credentials, { fetch: zoom.fetch }).create({ topic: "t", startsAt: new Date(), minutes: 30 })).rejects.toBeInstanceOf(ZoomError);
  });

  describe("reporting on a call afterwards", () => {
    const report = (answers: Parameters<typeof pretendZoom>[0]) => zoomProvider(credentials, { fetch: pretendZoom(answers).fetch }).report("7");

    it("has nothing to say while the meeting is still running", async () => {
      expect(await report({ "GET /meetings/7": { json: { id: 7, join_url: "x", status: "started" } } })).toBeNull();
    });

    it("is a no-show when nobody ever opened the meeting", async () => {
      expect(await report({ "GET /meetings/7": { json: { id: 7, join_url: "x", status: "waiting" } }, "GET /past_meetings/7": { status: 404 } })).toEqual({ attended: false, minutes: 0, recordingUrl: null, transcript: null });
    });

    it("is a no-show when only one person was there", async () => {
      expect(await report({ "GET /meetings/7": { json: { id: 7, join_url: "x" } }, "GET /past_meetings/7": { json: { duration: 12, participants_count: 1 } } })).toMatchObject({ attended: false });
    });

    it("is attended, with its length, when two people were there, even with no recording yet", async () => {
      expect(
        await report({ "GET /meetings/7": { json: { id: 7, join_url: "x" } }, "GET /past_meetings/7": { json: { duration: 27, participants_count: 2 } }, "GET /meetings/7/recordings": { status: 404 } }),
      ).toEqual({ attended: true, minutes: 27, recordingUrl: null, transcript: null, soundFiles: [] });
    });

    it("brings back the recording link and the transcript when Zoom has them", async () => {
      const zoom = pretendZoom({
        "GET /meetings/7": { json: { id: 7, join_url: "x" } },
        "GET /past_meetings/7": { json: { duration: 27, participants_count: 3 } },
        "GET /meetings/7/recordings": { json: { share_url: "https://zoom.us/rec/share/abc", recording_files: [{ file_type: "MP4", download_url: "https://zoom.us/rec/download/video" }, { file_type: "TRANSCRIPT", download_url: "https://zoom.us/rec/download/captions" }] } },
        "GET https://zoom.us/rec/download/captions": { text: "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nMike: Thanks for joining.\n\n2\n00:00:03.500 --> 00:00:05.000\nDana: Happy to be here." },
      });
      const result = await zoomProvider(credentials, { fetch: zoom.fetch }).report("7");
      expect(result).toEqual({ attended: true, minutes: 27, recordingUrl: "https://zoom.us/rec/share/abc", transcript: "Mike: Thanks for joining.\nDana: Happy to be here.", soundFiles: [] });
      expect(zoom.sent.at(-1)!.headers.Authorization).toBe("Bearer pass-1");
    });

    it("still reports the call when the plan has no cloud recording", async () => {
      expect(
        await report({ "GET /meetings/7": { json: { id: 7, join_url: "x" } }, "GET /past_meetings/7": { json: { duration: 20, participants_count: 2 } }, "GET /meetings/7/recordings": { status: 400, json: { message: "Cloud recording is not available on this plan" } } }),
      ).toEqual({ attended: true, minutes: 20, recordingUrl: null, transcript: null, soundFiles: [] });
    });
  });

  it("leaves alone a call that was booked with the stand-in, whose made-up id Zoom has never heard of", async () => {
    const zoom = pretendZoom({});
    const provider = zoomProvider(credentials, { fetch: zoom.fetch });
    await provider.move("3f9a1c0b7de", new Date("2026-11-18T09:00:00Z"));
    await provider.cancel("3f9a1c0b7de");
    expect(await provider.report("3f9a1c0b7de")).toBeNull();
    expect(zoom.sent).toHaveLength(0);
  });

  it("turns Zoom's caption file into plain lines", () => {
    expect(transcriptFromVtt("WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:03.000\r\nMike: Hello\r\nthere.\r\n\r\n2\r\n00:00:04.000 --> 00:00:05.000\r\nDana: Hi.\r\n")).toBe("Mike: Hello there.\nDana: Hi.");
    expect(transcriptFromVtt("WEBVTT")).toBe("");
  });
});
