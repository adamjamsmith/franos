import { appDb } from "@/db";
import { brandOfSend } from "@/email/lookup";
import { recordClick } from "@/email/send";
import { rememberLead } from "@/site/brand";
import { siteSession } from "@/site/leads";

/** A link in an email. Records the click, remembers who the visitor is, and sends them on to the page. */
export async function GET(request: Request, { params }: RouteContext<"/l/[id]">) {
  const { id } = await params;
  const url = new URL(request.url);
  const brand = await brandOfSend(id);
  const result =
    brand &&
    (await recordClick(
      await appDb(),
      siteSession(brand.id),
      brand.slug,
      id,
      url.searchParams.get("to") ?? "",
      url.searchParams.get("s") ?? "",
    ));
  if (!brand || !result) return new Response("This link is not valid.", { status: 404 });

  await rememberLead(brand.slug, result.leadId);
  return Response.redirect(new URL(result.to, url.origin), 302);
}
