import { and, eq, sql } from "drizzle-orm";
import { type Db, type Session, type Tx, withSession } from "../db/context";
import { leadEvents, leads, siteStats } from "../db/schema";

const today = () => new Date().toISOString().slice(0, 10);

/** Adds one to an anonymous daily count for a brand. */
export async function bump(tx: Tx, clientId: string, key: string, day: string = today()) {
  await tx
    .insert(siteStats)
    .values({ clientId, day, key, count: 1 })
    .onConflictDoUpdate({
      target: [siteStats.clientId, siteStats.day, siteStats.key],
      set: { count: sql`${siteStats.count} + 1` },
    });
}

/** What the public pages are allowed to report. Anything else is ignored. */
export type TrackEvent =
  | { type: "page_view"; path: string }
  | { type: "form_view" }
  | { type: "form_start" }
  | { type: "form_question"; questionId: string }
  | { type: "video_progress"; videoId: string; percent: number; seconds: number }
  | { type: "document_open"; kind: string }
  | { type: "document_download"; kind: string };

const clean = (value: unknown, max = 100) =>
  String(value ?? "")
    .replace(/[^\w\-/.]/g, "")
    .slice(0, max);

/** Checks an incoming report and returns it in a safe shape, or null if it is not one we accept. */
export function parseTrackEvent(raw: unknown): TrackEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  switch (r.type) {
    case "page_view":
      return { type: "page_view", path: clean(r.path, 200) || "/" };
    case "form_view":
    case "form_start":
      return { type: r.type };
    case "form_question":
      return r.questionId ? { type: "form_question", questionId: clean(r.questionId, 40) } : null;
    case "video_progress": {
      const percent = Math.round(Number(r.percent));
      const seconds = Math.round(Number(r.seconds));
      if (!r.videoId || !Number.isFinite(percent) || !Number.isFinite(seconds)) return null;
      return {
        type: "video_progress",
        videoId: clean(r.videoId, 40),
        percent: Math.min(100, Math.max(0, percent)),
        seconds: Math.max(0, seconds),
      };
    }
    case "document_open":
    case "document_download":
      return r.kind ? { type: r.type, kind: clean(r.kind, 40) } : null;
    default:
      return null;
  }
}

/**
 * Records something that happened on the public pages.
 * With a known lead it goes on their timeline. Without one it only adds to an anonymous count.
 * Form progress is always anonymous: nothing typed is ever stored.
 */
export async function recordEvent(db: Db, session: Session, leadId: string | null, event: TrackEvent) {
  const clientId = session.clientId!;
  await withSession(db, session, async (tx) => {
    if (event.type === "form_view" || event.type === "form_start") return bump(tx, clientId, event.type);
    if (event.type === "form_question") return bump(tx, clientId, `form_q:${event.questionId}`);

    if (leadId) {
      // The lead id comes from the visitor's browser, so confirm it belongs to this brand before using it.
      const [lead] = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.clientId, clientId)));
      if (lead) {
        const { type, ...data } = event;
        await tx.insert(leadEvents).values({ clientId, leadId, type, data });
        return;
      }
    }
    if (event.type === "page_view") return bump(tx, clientId, `page:${event.path}`);
    if (event.type === "video_progress" && event.percent === 0) return bump(tx, clientId, `video_play:${event.videoId}`);
  });
}
