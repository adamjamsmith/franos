import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/context";
import { jobs } from "../src/db/schema";
import { runDueJobs } from "../src/jobs/runner";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let clientId: string;

const now = new Date("2026-12-16T09:20:00Z");
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);

async function addJob(values: Partial<typeof jobs.$inferInsert> = {}) {
  const [job] = await admin
    .insert(jobs)
    .values({ clientId, type: "send_email", runAt: minutes(-1), ...values })
    .returning();
  return job;
}
const reload = async (id: string) => (await admin.select().from(jobs).where(eq(jobs.id, id)))[0];

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  clientId = (await seedTwoBrands(admin)).refresh.id;
});

describe("timed jobs", () => {
  it("runs a due job exactly once", async () => {
    const job = await addJob();
    let runs = 0;
    const handlers = { send_email: async () => void runs++ };
    expect(await runDueJobs(db, handlers, now)).toEqual({ done: 1, failed: 0, retried: 0 });
    expect(await runDueJobs(db, handlers, minutes(1))).toEqual({ done: 0, failed: 0, retried: 0 });
    expect(runs).toBe(1);
    expect((await reload(job.id)).status).toBe("done");
  });

  it("does not run a job before its time, then runs it when due", async () => {
    await addJob({ runAt: minutes(1) });
    let runs = 0;
    const handlers = { send_email: async () => void runs++ };
    await runDueJobs(db, handlers, now);
    expect(runs).toBe(0);
    await runDueJobs(db, handlers, minutes(1));
    expect(runs).toBe(1);
  });

  it("does not run a cancelled job", async () => {
    await addJob({ status: "cancelled" });
    let runs = 0;
    await runDueJobs(db, { send_email: async () => void runs++ }, now);
    expect(runs).toBe(0);
  });

  it("two runners at the same moment do not both run the same job", async () => {
    for (let i = 0; i < 5; i++) await addJob();
    let runs = 0;
    const handlers = { send_email: async () => void runs++ };
    const [a, b] = await Promise.all([runDueJobs(db, handlers, now), runDueJobs(db, handlers, now)]);
    expect(a.done + b.done).toBe(5);
    expect(runs).toBe(5);
  });

  it("retries a failing job later, then gives up after three tries and keeps the error", async () => {
    const job = await addJob();
    const handlers = {
      send_email: async () => {
        throw new Error("mail server down");
      },
    };
    expect(await runDueJobs(db, handlers, now)).toEqual({ done: 0, failed: 0, retried: 1 });
    expect(await runDueJobs(db, handlers, minutes(1))).toEqual({ done: 0, failed: 0, retried: 0 });
    expect(await runDueJobs(db, handlers, minutes(5))).toEqual({ done: 0, failed: 0, retried: 1 });
    expect(await runDueJobs(db, handlers, minutes(10))).toEqual({ done: 0, failed: 1, retried: 0 });
    const final = await reload(job.id);
    expect(final.status).toBe("failed");
    expect(final.attempts).toBe(3);
    expect(final.lastError).toBe("mail server down");
  });

  it("fails clearly when a job type has no handler", async () => {
    const job = await addJob({ type: "unknown_type" });
    await runDueJobs(db, {}, now);
    expect((await reload(job.id)).lastError).toContain("No handler");
  });

  it("the same job cannot be queued twice for one brand", async () => {
    await addJob({ dedupeKey: "lead-1:email-3" });
    await expect(addJob({ dedupeKey: "lead-1:email-3" })).rejects.toThrow();
  });
});
