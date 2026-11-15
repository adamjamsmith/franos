import { and, eq } from "drizzle-orm";
import { adminDb, appDb } from "../db";
import { clients, memberships, users } from "../db/schema";
import { mailboxDeliver } from "../email/deliver";
import { runDueJobs } from "../jobs/runner";
import type { Brand, CallDeps, Staff } from "./calls";
import { callJobHandlers } from "./jobs";
import { type MeetingProvider, standInZoom } from "./provider";
import { zoomCredentialsFromEnv, zoomProvider } from "./zoom";

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

// One Zoom connection for the whole app, so its hourly pass is fetched once and shared.
let zoom: MeetingProvider | null | undefined;

/** The real Zoom when franOS was started with its codes (see scripts/dev-zoom.mjs); otherwise the stand-in. */
export function meetingProvider(): MeetingProvider {
  if (zoom === undefined) {
    const credentials = zoomCredentialsFromEnv();
    zoom = credentials ? zoomProvider(credentials, { host: process.env.FRANOS_ZOOM_HOST }) : null;
  }
  return zoom ?? standInZoom;
}

/**
 * How calls reach the outside world while franOS runs on this computer: emails go to the
 * test mailbox, and meetings are either real Zoom meetings or the stand-in's. On AWS the
 * emails become Amazon SES.
 */
export async function appCallDeps(brand: Pick<Brand, "id">): Promise<CallDeps> {
  return { deliver: mailboxDeliver, provider: meetingProvider(), staff: await staffFor(brand.id) };
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
