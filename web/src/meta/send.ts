import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { type Db, withSession } from "../db/context";
import { leads, metaEvents } from "../db/schema";
import { siteFor, type SiteContent } from "../site/config";
import { siteSession } from "../site/leads";

/**
 * Sending franOS's events to Meta (the Conversions API), so Meta can learn who signs up, books and signs.
 *
 * The rule this file enforces: nothing real reaches Meta until a brand has been switched to live, which
 * only happens at go-live with Adam's approval. Until then every event carries the brand's test code,
 * so it shows in Meta's "Test events" tab and nowhere else. With no test code and not live, nothing is sent.
 */

type Fetch = typeof fetch;
type Brand = { id: string; slug: string; name: string; site: unknown };

const GRAPH = "https://graph.facebook.com/v22.0";

/** What Meta calls each of franOS's events. */
export const META_NAMES: Record<string, string> = {
  Lead: "Lead",
  Schedule: "Schedule",
  GoodCall: "SubmitApplication",
  Signed: "Purchase",
};

export type MetaSettings = { datasetId: string; testCode: string; live: boolean; liveFrom: Date | null };

export function metaSettingsFor(site: SiteContent): MetaSettings | null {
  const meta = site.meta ?? {};
  const datasetId = (meta.datasetId ?? "").trim();
  if (!/^\d{5,20}$/.test(datasetId)) return null;
  const liveFrom = meta.liveFrom ? new Date(meta.liveFrom) : null;
  const validFrom = liveFrom && !Number.isNaN(liveFrom.getTime()) ? liveFrom : null;
  // Live needs both the switch and the moment it was switched on: events from before then are test leads.
  return { datasetId, testCode: (meta.testCode ?? "").trim(), live: meta.live === true && validFrom !== null, liveFrom: validFrom };
}

/** Meta never receives a person's details in the clear: each is tidied the way Meta specifies, then scrambled. */
export const scramble = (value: string) => createHash("sha256").update(value).digest("hex");
export const tidyEmail = (email: string) => email.trim().toLowerCase();
/** Digits only, with the country code: a UK "07456 100101" becomes "447456100101". */
export function tidyPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `44${digits.slice(1)}`;
  return digits;
}

type LeadLike = { id: string; email: string; phone: string | null; firstName: string | null; lastName: string | null; postcode: string | null };
type EventLike = { eventName: string; eventId: string; payload: unknown; createdAt: Date };

/** One event, in the shape Meta expects. */
export function metaEvent(event: EventLike, lead: LeadLike, page: string) {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const hashed = (value: string | null | undefined, tidy: (v: string) => string = (v) => v.trim().toLowerCase()) => {
    const clean = value ? tidy(value) : "";
    return clean ? [scramble(clean)] : undefined;
  };
  // Meta only accepts a "website" event with the visitor's browser details. Without them it is sent as coming from our system.
  const browser = typeof payload.userAgent === "string" && payload.userAgent ? payload.userAgent : null;
  const value = typeof payload.value === "number" ? payload.value : null;
  return {
    event_name: META_NAMES[event.eventName] ?? event.eventName,
    event_time: Math.floor(event.createdAt.getTime() / 1000),
    // The same id every time, so Meta counts an event once even if it is sent twice.
    event_id: event.eventId,
    action_source: browser ? "website" : "system_generated",
    ...(browser ? { event_source_url: page } : {}),
    user_data: {
      em: hashed(lead.email, tidyEmail),
      ph: hashed(lead.phone, tidyPhone),
      fn: hashed(lead.firstName),
      ln: hashed(lead.lastName),
      zp: hashed(lead.postcode, (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "")),
      country: [scramble("gb")],
      external_id: [scramble(lead.id)],
      ...(browser ? { client_user_agent: browser } : {}),
      ...(typeof payload.ip === "string" && payload.ip ? { client_ip_address: payload.ip } : {}),
    },
    ...(value !== null ? { custom_data: { value, currency: typeof payload.currency === "string" ? payload.currency : "GBP" } } : {}),
  };
}

export type MetaRun = { sent: number; tested: number; failed: number; held: number };

/**
 * Sends a brand's waiting events.
 * - Live: events from the moment the brand went live are sent for real and marked sent.
 * - Not live, with a test code: each event is sent once as a test and stays marked as waiting.
 * - Otherwise: nothing leaves franOS.
 */
export async function sendDueMetaEvents(db: Db, brand: Brand, token: string | null, send: Fetch = fetch, now: Date = new Date()): Promise<MetaRun> {
  const run: MetaRun = { sent: 0, tested: 0, failed: 0, held: 0 };
  const settings = metaSettingsFor(siteFor(brand));
  if (!settings || !token) return run;

  return withSession(db, siteSession(brand.id), async (tx) => {
    const waiting = await tx.select().from(metaEvents).where(eq(metaEvents.status, "logged")).orderBy(asc(metaEvents.createdAt)).limit(100);
    const due = waiting.filter((event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      if (settings.live) return event.createdAt >= settings.liveFrom!;
      return settings.testCode !== "" && !payload.testedAt;
    });
    run.held = waiting.length - due.length;
    if (due.length === 0) return run;

    const people = await tx.select().from(leads).where(inArray(leads.id, [...new Set(due.map((e) => e.leadId))]));
    const personOf = new Map(people.map((p) => [p.id, p]));
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

    for (const event of due) {
      const lead = personOf.get(event.leadId);
      if (!lead) continue;
      const body = {
        data: [metaEvent(event, lead, `${base}/site/${brand.slug}`)],
        ...(settings.live ? {} : { test_event_code: settings.testCode }),
      };
      let ok = false;
      let problem = "";
      try {
        const response = await send(`${GRAPH}/${settings.datasetId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const answer = (await response.json().catch(() => ({}))) as { events_received?: number; error?: { message?: string } };
        ok = response.ok && (answer.events_received ?? 0) > 0;
        problem = answer.error?.message ?? (ok ? "" : `Meta answered ${response.status}`);
      } catch (error) {
        problem = error instanceof Error ? error.message : String(error);
      }

      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const mine = and(eq(metaEvents.id, event.id), eq(metaEvents.clientId, brand.id));
      if (!ok) {
        run.failed++;
        // A failed test is tried again next time; a failed real send is marked so it is seen.
        await tx
          .update(metaEvents)
          .set(settings.live ? { status: "failed", payload: { ...payload, metaError: problem.slice(0, 300) } } : { payload: { ...payload, metaError: problem.slice(0, 300) } })
          .where(mine);
      } else if (settings.live) {
        run.sent++;
        await tx.update(metaEvents).set({ status: "sent", payload: { ...payload, sentAt: now.toISOString(), metaError: undefined } }).where(mine);
      } else {
        run.tested++;
        await tx.update(metaEvents).set({ payload: { ...payload, testedAt: now.toISOString(), metaError: undefined } }).where(mine);
      }
    }
    return run;
  });
}
