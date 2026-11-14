import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { type Db, withWorker } from "../db/context";
import { jobs } from "../db/schema";

export type Job = typeof jobs.$inferSelect;
export type JobHandler = (job: Job) => Promise<void>;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

/**
 * Runs every job that is due. Called once a minute.
 * Safe to call from two places at once: each job is claimed by exactly one caller.
 */
export async function runDueJobs(
  db: Db,
  handlers: Record<string, JobHandler>,
  now: Date = new Date(),
  batchSize = 50,
): Promise<{ done: number; failed: number; retried: number }> {
  const claimed = await withWorker(db, async (tx) => {
    const due = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.status, "pending"), lte(jobs.runAt, now)))
      .orderBy(asc(jobs.runAt))
      .limit(batchSize)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];
    return tx
      .update(jobs)
      .set({ status: "running", lockedAt: now })
      .where(
        inArray(
          jobs.id,
          due.map((j) => j.id),
        ),
      )
      .returning();
  });

  const result = { done: 0, failed: 0, retried: 0 };
  for (const job of claimed) {
    const attempts = job.attempts + 1;
    try {
      const handler = handlers[job.type];
      if (!handler) throw new Error(`No handler for job type "${job.type}"`);
      await handler(job);
      await withWorker(db, (tx) =>
        tx.update(jobs).set({ status: "done", attempts, lockedAt: null, lastError: null }).where(eq(jobs.id, job.id)),
      );
      result.done++;
    } catch (err) {
      const lastError = err instanceof Error ? err.message : String(err);
      const giveUp = attempts >= MAX_ATTEMPTS;
      await withWorker(db, (tx) =>
        tx
          .update(jobs)
          .set({
            status: giveUp ? "failed" : "pending",
            attempts,
            lastError,
            lockedAt: null,
            runAt: giveUp ? job.runAt : new Date(now.getTime() + RETRY_DELAY_MS),
          })
          .where(eq(jobs.id, job.id)),
      );
      if (giveUp) result.failed++;
      else result.retried++;
    }
  }
  return result;
}
