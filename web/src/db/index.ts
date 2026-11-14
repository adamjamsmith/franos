import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./context";
import * as schema from "./schema";

/**
 * The database connection.
 * On this computer it is a local database stored in the `.data` folder.
 * When the app moves to AWS this file switches to Neon; nothing else changes.
 */
type Holder = { db: ReturnType<typeof drizzle<typeof schema>>; ready: Promise<void> };
const globalHolder = globalThis as unknown as { __franosDb?: Holder };

function open(): Holder {
  if (!globalHolder.__franosDb) {
    const dir = process.env.FRANOS_PGLITE_DIR ?? ".data/pg";
    mkdirSync(dir, { recursive: true });
    const db = drizzle(new PGlite(dir), { schema });
    const ready = migrate(db, { migrationsFolder: "./drizzle" });
    // If start-up fails, forget this attempt so the next request tries again with a clear error.
    ready.catch(() => delete globalHolder.__franosDb);
    globalHolder.__franosDb = { db, ready };
  }
  return globalHolder.__franosDb;
}

/** Full-access connection. Used only by the login library and by trusted lookups; never for brand data. */
export async function adminDb() {
  const holder = open();
  await holder.ready;
  return holder.db;
}

/** The connection used with `withSession`, which applies the per-brand locks. */
export async function appDb(): Promise<Db> {
  return (await adminDb()) as unknown as Db;
}
