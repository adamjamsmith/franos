import type { CallReport, Meeting, MeetingProvider } from "./provider";

/**
 * The real Zoom, through a Server-to-Server OAuth app on Franchise Right's own Zoom account.
 * The app's three codes never live in a file: they are kept in the AWS secret store and handed
 * to franOS when it starts (see scripts/dev-zoom.mjs for how that happens on this computer).
 */
export type ZoomCredentials = { accountId: string; clientId: string; clientSecret: string };
type Fetch = typeof fetch;

const API = "https://api.zoom.us/v2";

/** Reads the codes franOS was started with. Null means "no Zoom here": the stand-in is used instead. */
export function zoomCredentialsFromEnv(env: Record<string, string | undefined> = process.env): ZoomCredentials | null {
  const raw = env.FRANOS_ZOOM_CREDENTIALS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ZoomCredentials>;
    const accountId = parsed.accountId?.trim();
    const clientId = parsed.clientId?.trim();
    const clientSecret = parsed.clientSecret?.trim();
    return accountId && clientId && clientSecret ? { accountId, clientId, clientSecret } : null;
  } catch {
    return null;
  }
}

/** Zoom wants a time as UTC, to the second, ending in Z. */
const zoomTime = (date: Date) => `${date.toISOString().slice(0, 19)}Z`;

/** Turns Zoom's caption file (WebVTT) into plain "Speaker: words" lines. */
export function transcriptFromVtt(vtt: string): string {
  const lines: string[] = [];
  for (const block of vtt.replace(/\r/g, "").split(/\n\n+/)) {
    const rows = block.split("\n").filter((row) => row.trim() !== "");
    const timing = rows.findIndex((row) => row.includes("-->"));
    if (timing < 0) continue;
    const said = rows.slice(timing + 1).join(" ").trim();
    if (said) lines.push(said);
  }
  return lines.join("\n");
}

export class ZoomError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`Zoom said no (${status}): ${message}`);
  }
}

/**
 * @param host the Zoom user the meetings are created for: an email address on the account, or "me" for the account owner.
 */
export function zoomProvider(credentials: ZoomCredentials, options: { host?: string; fetch?: Fetch; now?: () => number } = {}): MeetingProvider {
  const send = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const host = encodeURIComponent(options.host ?? "me");
  let token: { value: string; expiresAt: number } | null = null;

  // Zoom's pass lasts an hour. It is kept in memory only and fetched again a few minutes before it runs out.
  async function pass(): Promise<string> {
    if (token && token.expiresAt - now() > 5 * 60_000) return token.value;
    const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
    const response = await send("https://zoom.us/oauth/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "account_credentials", account_id: credentials.accountId }).toString(),
    });
    const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; reason?: string; error?: string };
    if (!response.ok || !body.access_token) throw new ZoomError(response.status, body.reason ?? body.error ?? "could not sign in");
    token = { value: body.access_token, expiresAt: now() + (body.expires_in ?? 3600) * 1000 };
    return token.value;
  }

  /** Calls Zoom. Returns null when Zoom answers "not found", so callers can treat that as an ordinary answer. */
  async function call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const response = await send(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await pass()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 404) return null;
    if (response.status === 204) return {} as T;
    const data = (await response.json().catch(() => ({}))) as T & { message?: string };
    if (!response.ok) throw new ZoomError(response.status, data.message ?? "request failed");
    return data;
  }

  type ZoomMeeting = { id: number; join_url: string; status?: string };
  type PastMeeting = { duration?: number; participants_count?: number };
  type RecordingFile = { id?: string; file_type?: string; recording_type?: string; download_url?: string; play_url?: string; file_name?: string; status?: string };
  type Recordings = { share_url?: string; recording_files?: RecordingFile[]; participant_audio_files?: RecordingFile[] };

  // A Zoom meeting's id is all digits. Calls booked while the stand-in was in use carry made-up ids that
  // Zoom has never heard of; those are left alone, so they are never mistaken for a missed call.
  const isZoomId = (meetingId: string) => /^\d+$/.test(meetingId);

  return {
    waitsForCalls: true,

    async create({ topic, startsAt, minutes }): Promise<Meeting> {
      const meeting = await call<ZoomMeeting>("POST", `/users/${host}/meetings`, {
        topic,
        type: 2, // a scheduled meeting
        start_time: zoomTime(startsAt),
        duration: minutes,
        timezone: "Europe/London",
        settings: {
          // Records by itself, so no call is lost because someone forgot to press a button.
          auto_recording: "cloud",
          // The lead should never be left outside: no waiting room, and they can arrive first.
          join_before_host: true,
          waiting_room: false,
          host_video: true,
          participant_video: true,
          mute_upon_entry: false,
        },
      });
      if (!meeting) throw new ZoomError(404, "the host was not found on the Zoom account");
      return { id: String(meeting.id), joinUrl: meeting.join_url };
    },

    async move(meetingId, startsAt) {
      if (!isZoomId(meetingId)) return;
      await call("PATCH", `/meetings/${meetingId}`, { start_time: zoomTime(startsAt), timezone: "Europe/London" });
    },

    // A meeting Zoom no longer has is already cancelled, so "not found" is fine here.
    async cancel(meetingId) {
      if (!isZoomId(meetingId)) return;
      await call("DELETE", `/meetings/${meetingId}`);
    },

    async report(meetingId): Promise<CallReport | null> {
      if (!isZoomId(meetingId)) return null;
      const meeting = await call<ZoomMeeting>("GET", `/meetings/${meetingId}`);
      // Still running: ask again later.
      if (meeting?.status === "started") return null;

      const past = await call<PastMeeting>("GET", `/past_meetings/${meetingId}`);
      // Nobody ever opened the meeting.
      if (!past) return { attended: false, minutes: 0, recordingUrl: null, transcript: null };
      // The call happened if someone besides the host was there.
      const attended = (past.participants_count ?? 0) >= 2;
      if (!attended) return { attended: false, minutes: 0, recordingUrl: null, transcript: null };

      // The recording and transcript can take a while to appear, and need a paid Zoom plan. Their absence is not an error.
      let recordingUrl: string | null = null;
      let transcript: string | null = null;
      let soundFiles: { name: string; url: string }[] = [];
      try {
        const recordings = await call<Recordings>("GET", `/meetings/${meetingId}/recordings`);
        recordingUrl = recordings?.share_url ?? null;
        soundFiles = (recordings?.participant_audio_files ?? []).flatMap((file, index) => {
          const url = file.play_url ?? file.download_url;
          return url ? [{ name: file.file_name?.trim() || `Person ${index + 1}`, url }] : [];
        });
        const captions = recordings?.recording_files?.find((file) => file.file_type === "TRANSCRIPT" && file.download_url);
        if (captions?.download_url) {
          const file = await send(captions.download_url, { headers: { Authorization: `Bearer ${await pass()}` } });
          if (file.ok) transcript = transcriptFromVtt(await file.text()) || null;
        }
      } catch (error) {
        if (!(error instanceof ZoomError)) throw error;
      }
      return { attended: true, minutes: Math.max(1, Math.round(past.duration ?? 0)), recordingUrl, transcript, soundFiles };
    },

    // Goes to Zoom's bin, where it can be got back for 30 days. Needs the app to be allowed to delete recordings.
    async dropVideo(meetingId) {
      if (!isZoomId(meetingId)) return 0;
      const recordings = await call<Recordings>("GET", `/meetings/${meetingId}/recordings`);
      const videos = (recordings?.recording_files ?? []).filter((file) => file.file_type === "MP4" && file.id);
      for (const file of videos) await call("DELETE", `/meetings/${meetingId}/recordings/${file.id}?action=trash`);
      return videos.length;
    },

    async dropRecording(meetingId) {
      if (!isZoomId(meetingId)) return;
      await call("DELETE", `/meetings/${meetingId}/recordings?action=trash`);
    },
  };
}
