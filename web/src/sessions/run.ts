import { eq } from "drizzle-orm";
import { meetingProvider } from "../calls/run";
import { adminDb } from "../db";
import type { Db } from "../db/context";
import { users } from "../db/schema";
import { deliverMail } from "../email/deliver";
import type { JobHandler } from "../jobs/runner";
import { type Brand, collectSession, sendSessionReminder, type SessionDeps } from "./sessions";

/** How sessions reach the outside world. The owners host them, so the owners are told about bookings. */
export async function appSessionDeps(): Promise<SessionDeps> {
  const hosts = await (await adminDb()).select({ name: users.name, email: users.email }).from(users).where(eq(users.isOwner, true));
  return { deliver: deliverMail, provider: meetingProvider(), hosts };
}

/** What the jobs runner does for each kind of timed session work. */
export function sessionJobHandlers(
  db: Db,
  load: (clientId: string) => Promise<{ brand: Brand; deps: SessionDeps } | null>,
  now: () => Date = () => new Date(),
): Record<string, JobHandler> {
  const withBrand =
    (work: (brand: Brand, deps: SessionDeps, payload: Record<string, string>) => Promise<unknown>): JobHandler =>
    async (job) => {
      const found = await load(job.clientId);
      if (!found) throw new Error("The brand for this job no longer exists");
      await work(found.brand, found.deps, job.payload as Record<string, string>);
    };
  return {
    session_reminder: withBrand((brand, deps, p) => sendSessionReminder(db, brand, deps, { sessionId: p.sessionId, kind: p.kind, startsAt: p.startsAt })),
    session_collect: withBrand((brand, deps, p) => collectSession(db, brand, deps, p.sessionId, now())),
  };
}
