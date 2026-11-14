import { and, eq } from "drizzle-orm";
import { adminDb, appDb } from "../db";
import { clients, memberships, users } from "../db/schema";
import { mailboxDeliver } from "../email/deliver";
import { runDueJobs } from "../jobs/runner";
import type { Brand, CallDeps, Staff } from "./calls";
import { callJobHandlers } from "./jobs";
import { standInZoom } from "./provider";

/**
 * Who is told about a brand's bookings and good-fit leads: its consultants.
 * A brand with no consultant yet falls back to the owners, so nothing goes unseen.
 * A trusted lookup that returns names and email addresses only.
 */
export async function staffFor(clientId: string): Promise<Staff[]> {
  const db = await adminDb();
  const consultants = await db
    .select({ name: users.name, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.clientId, clientId), eq(memberships.role, "consultant")));
  if (consultants.length > 0) return consultants;
  return db.select({ name: users.name, email: users.email }).from(users).where(eq(users.isOwner, true));
}

/**
 * How calls reach the outside world while franOS runs on this computer: emails go to the
 * test mailbox and a stand-in plays the part of Zoom. On AWS these become Amazon SES and Zoom.
 */
export async function appCallDeps(brand: Pick<Brand, "id">): Promise<CallDeps> {
  return { deliver: mailboxDeliver, provider: standInZoom, staff: await staffFor(brand.id) };
}

/** Runs every piece of timed work that is due: reminders, held alerts, collecting finished calls. Run once a minute. */
export async function runTimedWork(now: Date = new Date()) {
  const db = await appDb();
  const handlers = callJobHandlers(
    db,
    async (clientId) => {
      const [brand] = await (await adminDb()).select().from(clients).where(eq(clients.id, clientId));
      return brand ? { brand, deps: await appCallDeps(brand) } : null;
    },
    () => now,
  );
  return runDueJobs(db, handlers, now);
}
