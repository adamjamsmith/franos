import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "../src/db/context";
import * as schema from "../src/db/schema";

/** A fresh, empty database with every migration applied. Lives in memory and vanishes after the test. */
export async function freshDb() {
  const client = new PGlite();
  const admin = drizzle(client, { schema });
  await migrate(admin, { migrationsFolder: "./drizzle" });
  return { admin, db: admin as unknown as Db };
}

export type Admin = Awaited<ReturnType<typeof freshDb>>["admin"];

/** Two brands, each with people and one lead, plus an owner. Created with admin rights, outside the locks. */
export async function seedTwoBrands(admin: Admin) {
  const [refresh, oven] = await admin
    .insert(schema.clients)
    .values([
      { slug: "refresh-renovation", name: "Refresh Renovation", avatarType: "business_builder" },
      { slug: "oven-rescue", name: "Oven Rescue", avatarType: "sole_operator" },
    ])
    .returning();
  await admin.insert(schema.users).values([
    { id: "u_owner", email: "owner@example.test", name: "Owner", isOwner: true },
    { id: "u_mike", email: "mike@example.test", name: "Mike" },
    { id: "u_john", email: "john@example.test", name: "John" },
    { id: "u_charlie", email: "charlie@example.test", name: "Charlie" },
  ]);
  await admin.insert(schema.memberships).values([
    { userId: "u_mike", clientId: refresh.id, role: "consultant" },
    { userId: "u_john", clientId: refresh.id, role: "client" },
    { userId: "u_charlie", clientId: oven.id, role: "client" },
  ]);
  const [refreshLead, ovenLead] = await admin
    .insert(schema.leads)
    .values([
      { clientId: refresh.id, email: "sarah@example.test", firstName: "Sarah" },
      { clientId: oven.id, email: "paul@example.test", firstName: "Paul" },
    ])
    .returning();
  return { refresh, oven, refreshLead, ovenLead };
}
