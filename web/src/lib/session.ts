import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminDb, appDb } from "../db";
import type { Role, Session } from "../db/context";
import { clients, memberships } from "../db/schema";
import { getAuth } from "./auth";

/** The signed-in person, at any stage of login. Null if nobody is signed in. */
export async function currentLogin() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/**
 * The signed-in person, fully through both login steps.
 * Anyone part-way through is sent to the step they still need.
 */
export async function requireUser() {
  const login = await currentLogin();
  if (!login) redirect("/login");
  if (!login.user.twoFactorEnabled) redirect("/two-step/setup");
  if (!login.session.twoStepVerifiedAt) redirect("/two-step");
  return login;
}

/**
 * The signed-in person working in one brand.
 * Works out their role there (or shows "not found" if they have no access),
 * and returns the session that every database call for this brand must use.
 */
export async function requireBrand(slug: string) {
  const login = await requireUser();
  const admin = await adminDb();
  const [client] = await admin.select().from(clients).where(eq(clients.slug, slug));
  if (!client) notFound();

  let role: Role;
  if (login.user.isOwner) {
    role = "owner";
  } else {
    const [membership] = await admin
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, login.user.id), eq(memberships.clientId, client.id)));
    if (!membership) notFound();
    role = membership.role as Role;
  }

  const session: Session = { userId: login.user.id, role, clientId: client.id };
  return { user: login.user, client, role, session, db: await appDb() };
}

/**
 * Like requireBrand, but for places where not being logged in is normal (the public pages).
 * Returns nothing instead of sending the visitor to the login page.
 */
export async function brandAccess(slug: string) {
  const login = await currentLogin();
  if (!login || !login.user.twoFactorEnabled || !login.session.twoStepVerifiedAt) return null;
  const admin = await adminDb();
  const [client] = await admin.select().from(clients).where(eq(clients.slug, slug));
  if (!client) return null;
  let role: Role = "owner";
  if (!login.user.isOwner) {
    const [membership] = await admin
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, login.user.id), eq(memberships.clientId, client.id)));
    if (!membership) return null;
    role = membership.role as Role;
  }
  const session: Session = { userId: login.user.id, role, clientId: client.id };
  return { user: login.user, client, role, session, db: await appDb() };
}
