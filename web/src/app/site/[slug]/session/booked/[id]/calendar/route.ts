import { eq } from "drizzle-orm";
import { calendarFile } from "@/calls/emails";
import { adminDb, appDb } from "@/db";
import { withSession } from "@/db/context";
import { clients, recordingSessions } from "@/db/schema";
import { KIND_LABELS, sessionLinkOk, type SessionKind } from "@/sessions/sessions";
import { siteSession } from "@/site/leads";

/** The "add to my calendar" file for one session. Needs the same signed link as the session page. */
export async function GET(request: Request, { params }: RouteContext<"/site/[slug]/session/booked/[id]/calendar">) {
  const { slug, id } = await params;
  const signature = new URL(request.url).searchParams.get("s") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !sessionLinkOk(id, signature)) return new Response(null, { status: 404 });
  const [brand] = await (await adminDb()).select().from(clients).where(eq(clients.slug, slug));
  if (!brand) return new Response(null, { status: 404 });
  const [session] = await withSession(await appDb(), siteSession(brand.id), (tx) => tx.select().from(recordingSessions).where(eq(recordingSessions.id, id)));
  if (!session || session.status === "cancelled") return new Response(null, { status: 404 });

  const file = calendarFile({
    callId: session.id,
    title: `${brand.name} ${KIND_LABELS[session.kind as SessionKind].toLowerCase()}`,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    joinUrl: session.meetingUrl,
  });
  return new Response(file, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="session.ics"' },
  });
}
