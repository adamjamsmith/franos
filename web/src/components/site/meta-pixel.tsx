import { and, eq } from "drizzle-orm";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { consents } from "@/db/schema";
import { brandAccess } from "@/lib/session";
import { coversCookies, pixelFor } from "@/meta/pixel";
import { isPreview, knownLeadId } from "@/site/brand";
import { siteFor } from "@/site/config";
import { siteSession } from "@/site/leads";
import { PixelClient } from "./pixel-client";

/**
 * Meta's pixel, for leads who agreed to cookies when they signed up, and nobody else.
 * A new visitor, a lead who signed up under wording that did not mention cookies, and anyone from the team
 * get nothing: no script and no cookies.
 */
export async function MetaPixel({ slug, brand }: { slug: string; brand: { id: string; name: string; site: unknown } }) {
  const leadId = await knownLeadId(slug);
  if (!leadId) return null;
  const site = siteFor(brand);
  // Cheapest checks first: most brands and most visitors stop here.
  if (!pixelFor(site, { leadId, agreedToCookies: true, staff: false })) return null;
  const staff = (await isPreview(slug)) || Boolean(await brandAccess(slug));
  if (staff) return null;

  const ticked = await withSession(await appDb(), siteSession(brand.id), (tx) =>
    tx
      .select({ wording: consents.wording })
      .from(consents)
      .where(and(eq(consents.leadId, leadId), eq(consents.granted, true))),
  );
  const plan = pixelFor(site, { leadId, agreedToCookies: ticked.some((c) => coversCookies(c.wording)), staff });
  return plan ? <PixelClient datasetId={plan.datasetId} leadId={plan.leadId} /> : null;
}
