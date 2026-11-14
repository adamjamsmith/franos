import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { type Db, type Session, withSession, withUserOnly, withWorker } from "../src/db/context";
import {
  auditLog,
  clients,
  consents,
  jobs,
  leadEvents,
  leads,
  memberships,
  sessions,
  twoFactors,
  users,
  verifications,
} from "../src/db/schema";
import { freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let mike: Session; // consultant, Refresh Renovation
let john: Session; // client, Refresh Renovation
let charlie: Session; // client, Oven Rescue
let ownerOnRefresh: Session;
let ownerOnOven: Session;
let ownerNoBrand: Session;

beforeAll(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  seed = await seedTwoBrands(fresh.admin);
  mike = { userId: "u_mike", role: "consultant", clientId: seed.refresh.id };
  john = { userId: "u_john", role: "client", clientId: seed.refresh.id };
  charlie = { userId: "u_charlie", role: "client", clientId: seed.oven.id };
  ownerOnRefresh = { userId: "u_owner", role: "owner", clientId: seed.refresh.id };
  ownerOnOven = { userId: "u_owner", role: "owner", clientId: seed.oven.id };
  ownerNoBrand = { userId: "u_owner", role: "owner", clientId: null };
});

describe("one brand cannot see another brand's data", () => {
  it("a consultant sees only their own brand's leads", async () => {
    const rows = await withSession(db, mike, (tx) => tx.select().from(leads));
    expect(rows.map((r) => r.email)).toEqual(["sarah@example.test"]);
  });

  it("asking for another brand's lead by its id returns nothing", async () => {
    const rows = await withSession(db, mike, (tx) => tx.select().from(leads).where(eq(leads.id, seed.ovenLead.id)));
    expect(rows).toEqual([]);
  });

  it("a consultant cannot change another brand's lead", async () => {
    const changed = await withSession(db, mike, (tx) =>
      tx.update(leads).set({ firstName: "Hacked" }).where(eq(leads.id, seed.ovenLead.id)).returning(),
    );
    expect(changed).toEqual([]);
    const still = await withSession(db, charlie, (tx) => tx.select().from(leads));
    expect(still[0].firstName).toBe("Paul");
  });

  it("a lead cannot be added to, or moved into, another brand", async () => {
    await expect(
      withSession(db, mike, (tx) => tx.insert(leads).values({ clientId: seed.oven.id, email: "x@example.test" })),
    ).rejects.toThrow();
    await expect(
      withSession(db, mike, (tx) =>
        tx.update(leads).set({ clientId: seed.oven.id }).where(eq(leads.id, seed.refreshLead.id)),
      ),
    ).rejects.toThrow();
  });

  it("events, consents and jobs cannot be attached to another brand's lead", async () => {
    await expect(
      withSession(db, mike, (tx) =>
        tx.insert(leadEvents).values({ clientId: seed.refresh.id, leadId: seed.ovenLead.id, type: "page_view" }),
      ),
    ).rejects.toThrow();
    await expect(
      withSession(db, mike, (tx) =>
        tx.insert(consents).values({
          clientId: seed.oven.id,
          leadId: seed.ovenLead.id,
          kind: "contact",
          wording: "x",
          granted: true,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      withSession(db, mike, (tx) => tx.insert(jobs).values({ clientId: seed.oven.id, type: "x", runAt: new Date() })),
    ).rejects.toThrow();
  });

  it("people in one brand cannot see people or memberships in another", async () => {
    const people = await withSession(db, mike, (tx) => tx.select().from(users));
    expect(people.map((p) => p.id).sort()).toEqual(["u_john", "u_mike"]);
    const members = await withSession(db, mike, (tx) => tx.select().from(memberships));
    expect(members.every((m) => m.clientId === seed.refresh.id)).toBe(true);
  });

  it("a non-owner sees only their own brand in the brand list", async () => {
    const brands = await withSession(db, mike, (tx) => tx.select().from(clients));
    expect(brands.map((b) => b.slug)).toEqual(["refresh-renovation"]);
  });

  it("a non-owner must have a brand selected", async () => {
    await expect(
      withSession(db, { userId: "u_mike", role: "consultant", clientId: null }, (tx) => tx.select().from(leads)),
    ).rejects.toThrow("A brand must be selected");
  });
});

describe("the owner can switch between brands", () => {
  it("sees every brand in the list, with no brand selected", async () => {
    const brands = await withSession(db, ownerNoBrand, (tx) => tx.select().from(clients));
    expect(brands.map((b) => b.slug).sort()).toEqual(["oven-rescue", "refresh-renovation"]);
  });

  it("sees no leads until a brand is selected", async () => {
    const rows = await withSession(db, ownerNoBrand, (tx) => tx.select().from(leads));
    expect(rows).toEqual([]);
  });

  it("sees only the selected brand's leads, and the other brand's after switching", async () => {
    const a = await withSession(db, ownerOnRefresh, (tx) => tx.select().from(leads));
    const b = await withSession(db, ownerOnOven, (tx) => tx.select().from(leads));
    expect(a.map((r) => r.email)).toEqual(["sarah@example.test"]);
    expect(b.map((r) => r.email)).toEqual(["paul@example.test"]);
  });

  it("can add a new brand; nobody else can", async () => {
    const [added] = await withSession(db, ownerNoBrand, (tx) =>
      tx.insert(clients).values({ slug: "leather-hero", name: "Leather Hero", avatarType: "sole_operator" }).returning(),
    );
    expect(added.name).toBe("Leather Hero");
    await expect(
      withSession(db, john, (tx) => tx.insert(clients).values({ slug: "x", name: "X", avatarType: "sole_operator" })),
    ).rejects.toThrow();
  });
});

describe("what each role may do inside its own brand", () => {
  it("a consultant cannot delete a lead; the brand's client can", async () => {
    const [temp] = await withSession(db, mike, (tx) =>
      tx.insert(leads).values({ clientId: seed.refresh.id, email: "temp@example.test" }).returning(),
    );
    const byMike = await withSession(db, mike, (tx) => tx.delete(leads).where(eq(leads.id, temp.id)).returning());
    expect(byMike).toEqual([]);
    const byJohn = await withSession(db, john, (tx) => tx.delete(leads).where(eq(leads.id, temp.id)).returning());
    expect(byJohn).toHaveLength(1);
  });

  it("history cannot be edited or removed", async () => {
    await withSession(db, mike, (tx) =>
      tx.insert(leadEvents).values({ clientId: seed.refresh.id, leadId: seed.refreshLead.id, type: "page_view" }),
    );
    await expect(withSession(db, john, (tx) => tx.update(leadEvents).set({ type: "changed" }))).rejects.toThrow();
    await expect(withSession(db, john, (tx) => tx.delete(leadEvents))).rejects.toThrow();
  });

  it("anyone can add to the audit log; a consultant cannot read it; nobody can change it", async () => {
    await withSession(db, mike, (tx) =>
      tx.insert(auditLog).values({ clientId: seed.refresh.id, actorUserId: "u_mike", action: "lead.viewed" }),
    );
    const mikeSees = await withSession(db, mike, (tx) => tx.select().from(auditLog));
    const johnSees = await withSession(db, john, (tx) => tx.select().from(auditLog));
    const charlieSees = await withSession(db, charlie, (tx) => tx.select().from(auditLog));
    expect(mikeSees).toEqual([]);
    expect(johnSees).toHaveLength(1);
    expect(charlieSees).toEqual([]);
    await expect(withSession(db, john, (tx) => tx.delete(auditLog))).rejects.toThrow();
  });

  it("a brand's client can add a consultant to their own brand only", async () => {
    await withSession(db, john, (tx) =>
      tx.insert(users).values({ id: "u_new", email: "new@example.test", name: "New Consultant" }),
    );
    await withSession(db, john, (tx) =>
      tx.insert(memberships).values({ userId: "u_new", clientId: seed.refresh.id, role: "consultant" }),
    );
    await expect(
      withSession(db, john, (tx) =>
        tx.insert(memberships).values({ userId: "u_new", clientId: seed.oven.id, role: "consultant" }),
      ),
    ).rejects.toThrow();
  });
});

describe("the jobs runner's access", () => {
  it("can see jobs for every brand but no leads or people", async () => {
    await expect(withWorker(db, (tx) => tx.select().from(leads))).rejects.toThrow();
    await expect(withWorker(db, (tx) => tx.select().from(users))).rejects.toThrow();
    const rows = await withWorker(db, (tx) => tx.select().from(jobs));
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("login data is out of reach", () => {
  it("the app role cannot read sessions, login codes or two-step secrets", async () => {
    await expect(withSession(db, ownerOnRefresh, (tx) => tx.select().from(sessions))).rejects.toThrow();
    await expect(withSession(db, ownerOnRefresh, (tx) => tx.select().from(verifications))).rejects.toThrow();
    await expect(withSession(db, ownerOnRefresh, (tx) => tx.select().from(twoFactors))).rejects.toThrow();
  });

  it("with no brand chosen, a person sees only their own record and their own brands", async () => {
    const people = await withUserOnly(db, "u_mike", (tx) => tx.select().from(users));
    const mine = await withUserOnly(db, "u_mike", (tx) => tx.select().from(memberships));
    const allLeads = await withUserOnly(db, "u_mike", (tx) => tx.select().from(leads));
    expect(people.map((p) => p.id)).toEqual(["u_mike"]);
    expect(mine.map((m) => m.clientId)).toEqual([seed.refresh.id]);
    expect(allLeads).toEqual([]);
  });
});

describe("the lock is in the database, not only in the app", () => {
  it("with the app role and no brand set, raw SQL returns no leads", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`set local role franos_app`);
      return tx.select().from(leads);
    });
    expect(rows).toEqual([]);
  });
});
