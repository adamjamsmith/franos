import type { Db } from "../db/context";
import type { JobHandler } from "../jobs/runner";
import { sendHeldAlert } from "./alert";
import { type Brand, type CallDeps, collectCall, sendOutcomeReminder, sendReminder } from "./calls";

/**
 * What the jobs runner does for each kind of timed call work.
 * `load` finds the brand a job belongs to and how to reach the outside world for it.
 */
export function callJobHandlers(
  db: Db,
  load: (clientId: string) => Promise<{ brand: Brand; deps: CallDeps } | null>,
  now: () => Date = () => new Date(),
): Record<string, JobHandler> {
  const withBrand =
    (work: (brand: Brand, deps: CallDeps, payload: Record<string, string>) => Promise<unknown>): JobHandler =>
    async (job) => {
      const found = await load(job.clientId);
      if (!found) throw new Error("The brand for this job no longer exists");
      await work(found.brand, found.deps, job.payload as Record<string, string>);
    };
  return {
    call_reminder: withBrand((brand, deps, p) =>
      sendReminder(db, brand, deps, { callId: p.callId, kind: p.kind, startsAt: p.startsAt }, now()),
    ),
    call_collect: withBrand((brand, deps, p) => collectCall(db, brand, deps, p.callId, now())),
    outcome_reminder: withBrand((brand, deps, p) => sendOutcomeReminder(db, brand, deps, p.callId)),
    call_alert: withBrand((brand, deps, p) => sendHeldAlert(db, brand, deps, p.leadId, now())),
  };
}
