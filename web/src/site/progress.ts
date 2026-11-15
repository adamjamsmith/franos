import { asc, eq } from "drizzle-orm";
import { appDb } from "../db";
import { withSession } from "../db/context";
import { leadEvents, leads } from "../db/schema";
import { pathFrom } from "../email/render";
import { siteSession } from "./leads";

/**
 * What the visitor has done so far, if franOS knows who they are: their first name, whether they
 * have read the prospectus, and whether they have a call. Null for someone who has not signed up.
 */
export async function leadProgress(brandId: string, leadId: string | null): Promise<{ firstName: string; prospectus: boolean; call: boolean } | null> {
  if (!leadId) return null;
  return withSession(await appDb(), siteSession(brandId), async (tx) => {
    const [lead] = await tx.select({ firstName: leads.firstName }).from(leads).where(eq(leads.id, leadId));
    if (!lead) return null;
    const events = await tx
      .select({ type: leadEvents.type, data: leadEvents.data })
      .from(leadEvents)
      .where(eq(leadEvents.leadId, leadId))
      .orderBy(asc(leadEvents.occurredAt), asc(leadEvents.id));
    const path = pathFrom(events);
    return { firstName: lead.firstName ?? "", prospectus: path.prospectus, call: path.call };
  });
}
