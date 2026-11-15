import { asc } from "drizzle-orm";
import { adminDb, appDb } from "../db";
import { clients } from "../db/schema";
import { sendDueMetaEvents } from "./send";

/**
 * The Meta access token franOS was started with (see scripts/dev-zoom.mjs). It is never in a file.
 * Null means "no Meta here": events are recorded and nothing is sent.
 */
export const metaToken = () => process.env.FRANOS_META_TOKEN?.trim() || null;

/** Sends every brand's waiting Meta events. Run once a minute. */
export async function sendMetaForAllBrands(now: Date = new Date()) {
  const token = metaToken();
  if (!token) return;
  const brands = await (await adminDb()).select().from(clients).orderBy(asc(clients.name));
  const db = await appDb();
  for (const brand of brands) {
    try {
      const run = await sendDueMetaEvents(db, brand, token, fetch, now);
      if (run.sent + run.tested + run.failed > 0) {
        console.log(`Meta, ${brand.name}: ${run.sent} sent for real, ${run.tested} sent as tests, ${run.failed} refused`);
      }
    } catch (error) {
      console.error(`Meta run failed for ${brand.name}`, error);
    }
  }
}
