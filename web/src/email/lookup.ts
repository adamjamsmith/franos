import { eq } from "drizzle-orm";
import { adminDb } from "../db";
import { clients, emailSends, leads } from "../db/schema";

const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Links in emails carry only an id. These find which brand the id belongs to, so the
 * rest of the work can run inside that brand's locks. They return nothing else.
 */
export async function brandOfSend(sendId: string) {
  if (!isId(sendId)) return null;
  const [row] = await (await adminDb())
    .select({ id: clients.id, slug: clients.slug })
    .from(emailSends)
    .innerJoin(clients, eq(clients.id, emailSends.clientId))
    .where(eq(emailSends.id, sendId));
  return row ?? null;
}

export async function brandOfLead(leadId: string) {
  if (!isId(leadId)) return null;
  const [row] = await (await adminDb())
    .select({ id: clients.id, slug: clients.slug, name: clients.name })
    .from(leads)
    .innerJoin(clients, eq(clients.id, leads.clientId))
    .where(eq(leads.id, leadId));
  return row ?? null;
}
