import { sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;

/** `site` is the public pages acting for one brand: no person is signed in. */
export type Role = "owner" | "client" | "consultant" | "site";

export type Session = {
  userId: string;
  role: Role;
  /** The brand being worked in. Only an owner may leave this empty, and then only the brand list is visible. */
  clientId: string | null;
};

/**
 * Runs `fn` as the restricted app role, scoped to one user, role and brand.
 * Every database call the app makes on behalf of a person goes through here,
 * so the database itself refuses to return another brand's rows.
 */
export async function withSession<T>(db: Db, session: Session, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (session.role !== "owner" && !session.clientId) {
    throw new Error("A brand must be selected for this role");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role franos_app`);
    await tx.execute(sql`select
      set_config('app.user_id', ${session.userId}, true),
      set_config('app.role', ${session.role}, true),
      set_config('app.client_id', ${session.clientId ?? ""}, true)`);
    return fn(tx);
  });
}

/** Runs `fn` as the jobs runner, which can see the jobs table for every brand and nothing else. */
export async function withWorker<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role franos_worker`);
    return fn(tx);
  });
}

/**
 * Runs `fn` as the app role for one person with no brand chosen.
 * The only thing visible is that person's own record and their own list of brands.
 */
export async function withUserOnly<T>(db: Db, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role franos_app`);
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
