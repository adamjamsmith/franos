import { eq } from "drizzle-orm";
import { adminDb, appDb } from "@/db";
import { clients } from "@/db/schema";
import { isPreview, knownLeadId } from "@/site/brand";
import { siteSession } from "@/site/leads";
import { parseTrackEvent, recordEvent } from "@/site/track";

/** Receives activity reports from the public pages: page views, form progress, video progress. */
export async function POST(request: Request) {
  let body: { slug?: unknown; event?: unknown };
  try {
    body = JSON.parse((await request.text()).slice(0, 2000));
  } catch {
    return new Response(null, { status: 400 });
  }
  const event = parseTrackEvent(body.event);
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!event || !slug) return new Response(null, { status: 400 });

  // Staff looking at the pages as a lead: nothing goes on that lead record or into the counts.
  if (await isPreview(slug)) return new Response(null, { status: 204 });

  const [brand] = await (await adminDb()).select({ id: clients.id }).from(clients).where(eq(clients.slug, slug));
  if (!brand) return new Response(null, { status: 404 });

  await recordEvent(await appDb(), siteSession(brand.id), await knownLeadId(slug), event);
  return new Response(null, { status: 204 });
}
