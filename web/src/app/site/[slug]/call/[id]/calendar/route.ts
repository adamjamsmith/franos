import { and, eq } from "drizzle-orm";
import { calendarFile } from "@/calls/emails";
import { adminDb, appDb } from "@/db";
import { withSession } from "@/db/context";
import { calls, clients } from "@/db/schema";
import { signatureOk } from "@/email/render";
import { siteSession } from "@/site/leads";

/** The "add to my calendar" file for one call. Needs the same signed link as the call's page. */
export async function GET(request: Request, { params }: RouteContext<"/site/[slug]/call/[id]/calendar">) {
  const { slug, id } = await params;
  const signature = new URL(request.url).searchParams.get("s") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !signatureOk(`call|${id}`, signature)) return new Response(null, { status: 404 });
  const [brand] = await (await adminDb()).select().from(clients).where(eq(clients.slug, slug));
  if (!brand) return new Response(null, { status: 404 });
  const [call] = await withSession(await appDb(), siteSession(brand.id), (tx) =>
    tx.select().from(calls).where(and(eq(calls.id, id))),
  );
  if (!call || call.status === "cancelled") return new Response(null, { status: 404 });

  const file = calendarFile({
    callId: call.id,
    title: `${brand.name} franchise call`,
    startsAt: call.startsAt,
    endsAt: call.endsAt,
    joinUrl: call.meetingUrl,
  });
  return new Response(file, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="call.ics"' },
  });
}
