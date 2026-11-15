import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleLocal } from "drizzle-orm/pglite";
import { migrate as migrateLocal } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import type { Db } from "./context";
import * as schema from "./schema";

/**
 * The database connection.
 * - Given a database address (FRANOS_DATABASE_URL), it is the hosted Postgres database on Neon.
 *   The address holds a password, so it is only ever handed over in memory, never kept in a file.
 * - Without one, it is a local database stored in the `.data` folder on this computer.
 * Everything else in franOS is the same either way.
 */
type Connection = ReturnType<typeof drizzleLocal<typeof schema>>;
type Holder = { db: Connection; ready: Promise<void> };
const globalHolder = globalThis as unknown as { __franosDb?: Holder };

function open(): Holder {
  if (!globalHolder.__franosDb) {
    const address = process.env.FRANOS_DATABASE_URL ?? "";
    let db: Connection;
    let ready: Promise<void>;
    if (address) {
      const pool = new Pool({ connectionString: address, max: 10 });
      // A dropped idle connection must not bring franOS down; the pool opens a new one.
      pool.on("error", (error) => console.error("Database connection dropped", error.message));
      const hosted = drizzlePostgres(pool, { schema });
      ready = migratePostgres(hosted, { migrationsFolder: "./drizzle" });
      // Both kinds of connection are used in exactly the same way.
      db = hosted as unknown as Connection;
    } else {
      const dir = process.env.FRANOS_PGLITE_DIR ?? ".data/pg";
      mkdirSync(dir, { recursive: true });
      db = drizzleLocal(new PGlite(dir), { schema });
      ready = migrateLocal(db, { migrationsFolder: "./drizzle" });
    }
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
