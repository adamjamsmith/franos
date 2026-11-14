import { appDb } from "@/db";
import { brandOfLead } from "@/email/lookup";
import { unsubscribe } from "@/email/send";
import { siteSession } from "@/site/leads";

/**
 * One-click unsubscribe. Mail apps such as Gmail post here when the person presses the app's own
 * "unsubscribe" button. No login and no confirmation.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/unsubscribe/[id]">) {
  const { id } = await params;
  const signature = new URL(request.url).searchParams.get("s") ?? "";
  const brand = await brandOfLead(id);
  const done = brand && (await unsubscribe(await appDb(), siteSession(brand.id), id, signature));
  return new Response(done ? "Unsubscribed" : "Not found", { status: done ? 200 : 404 });
}

/** A person opening the address in a browser is sent to the page with the button. */
export async function GET(request: Request, { params }: RouteContext<"/api/unsubscribe/[id]">) {
  const { id } = await params;
  const url = new URL(request.url);
  return Response.redirect(new URL(`/u/${id}?s=${url.searchParams.get("s") ?? ""}`, url.origin), 302);
}
