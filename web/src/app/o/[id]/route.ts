import { appDb } from "@/db";
import { brandOfSend } from "@/email/lookup";
import { recordOpen } from "@/email/send";
import { siteSession } from "@/site/leads";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** The invisible marker in each email. Loading it records that the email was opened. */
export async function GET(request: Request, { params }: RouteContext<"/o/[id]">) {
  const { id } = await params;
  const brand = await brandOfSend(id);
  if (brand) {
    await recordOpen(await appDb(), siteSession(brand.id), id, new URL(request.url).searchParams.get("s") ?? "");
  }
  return new Response(PIXEL, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
