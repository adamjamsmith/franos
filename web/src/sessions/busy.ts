import { sql } from "drizzle-orm";
import type { Busy } from "../calls/slots";
import type { Tx } from "../db/context";

/**
 * Times that are taken, across every brand. The database hands back times only, never whose they are,
 * so a booking in one brand can avoid a clash in another without seeing anything of the other brand.
 */
const HOUR = 3_600_000;
const since = (now: Date) => new Date(now.getTime() - 24 * HOUR).toISOString();
const times = (result: unknown): (Busy & { id: string })[] => {
  const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
  return rows.map((row) => ({ id: String(row.id), startsAt: new Date(row.starts_at as string), endsAt: new Date(row.ends_at as string) }));
};

/** Every recording session that blocks a time. */
export async function busySessions(tx: Tx, now: Date) {
  return times(await tx.execute(sql`select id, starts_at, ends_at from session_busy_times(${since(now)}::timestamptz)`));
}

/** Every lead call that blocks a time. */
export async function busyCallTimes(tx: Tx, now: Date) {
  return times(await tx.execute(sql`select id, starts_at, ends_at from call_busy_times(${since(now)}::timestamptz)`));
}

/**
 * Busy times from people's own linked calendars: the owners' for a recording session, this brand's consultants'
 * for a lead call (the owners' when the brand has no consultant). Times only. They have no id, so nothing can un-block them.
 */
export async function busyCalendarTimes(tx: Tx, hosts: "owners" | "consultants") {
  const result = await tx.execute(sql`select starts_at, ends_at from calendar_busy_times(${hosts})`);
  const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
  return rows.map((row) => ({ id: "calendar", startsAt: new Date(row.starts_at as string), endsAt: new Date(row.ends_at as string) }));
}
