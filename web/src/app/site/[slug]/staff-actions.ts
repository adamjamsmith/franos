"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { withSession } from "@/db/context";
import { leads } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { forgetLead, previewAs } from "@/site/brand";

/**
 * Lets someone logged in to franOS see a brand's public pages as one of its leads, or as a new visitor.
 * Only for people with access to the brand, and only for that brand's own leads.
 */
export async function viewAs(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const leadId = String(form.get("leadId") ?? "");
  const { session, db } = await requireBrand(slug);

  if (/^[0-9a-f-]{36}$/i.test(leadId)) {
    const [lead] = await withSession(db, session, (tx) => tx.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)));
    if (lead) await previewAs(slug, lead.id);
  } else {
    await forgetLead(slug);
  }

  // Stay on the page they were looking at, as long as it is one of this brand's public pages.
  let back = `/site/${slug}/thank-you`;
  try {
    const from = new URL((await headers()).get("referer") ?? "").pathname;
    if (from === `/site/${slug}` || (from.startsWith(`/site/${slug}/`) && !from.includes("/call/"))) back = from;
  } catch {
    // no usable page to go back to: the thank-you page is a good place to land
  }
  redirect(back);
}
