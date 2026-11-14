import { eq } from "drizzle-orm";
import { adminDb, appDb } from "@/db";
import { clients } from "@/db/schema";
import { isPreview, knownLeadId } from "@/site/brand";
import { DOC_KINDS, type DocKind, siteFor } from "@/site/config";
import { siteSession } from "@/site/leads";
import { recordEvent } from "@/site/track";

/** Records the download on the lead's timeline, then hands over the file. */
export async function GET(request: Request, { params }: RouteContext<"/site/[slug]/download/[kind]">) {
  const { slug, kind } = await params;
  if (!DOC_KINDS.includes(kind as DocKind)) return new Response(null, { status: 404 });
  const [brand] = await (await adminDb()).select().from(clients).where(eq(clients.slug, slug));
  const document = brand && siteFor(brand).documents[kind as DocKind];
  if (!brand || !document?.url) return new Response(null, { status: 404 });

  if (!(await isPreview(slug))) {
    await recordEvent(await appDb(), siteSession(brand.id), await knownLeadId(slug), { type: "document_download", kind });
  }
  return Response.redirect(new URL(document.url, request.url), 302);
}
