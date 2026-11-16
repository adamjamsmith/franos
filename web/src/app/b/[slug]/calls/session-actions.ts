"use server";

import { redirect } from "next/navigation";
import { auditLog } from "@/db/schema";
import { withSession } from "@/db/context";
import { requireBrand } from "@/lib/session";
import { appSessionDeps } from "@/sessions/run";
import { cancelSession, deleteSession } from "@/sessions/sessions";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Recording sessions are the owner's. Nobody else sees or changes them. */
async function ownerOnly(form: FormData) {
  const brand = await requireBrand(text(form, "slug"));
  if (brand.role !== "owner") redirect(`/b/${brand.client.slug}/calls`);
  return brand;
}

export async function ownerCancelSession(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const sessionId = text(form, "sessionId");
  if (isId(sessionId)) await cancelSession(db, session, client, await appSessionDeps(), { sessionId });
  redirect(`/b/${client.slug}/calls?view=sessions`);
}

/** Deletes a session and everything recorded for it. Kept in the audit log, without the person's details. */
export async function ownerDeleteSession(form: FormData) {
  const { session, client, db, user } = await ownerOnly(form);
  const sessionId = text(form, "sessionId");
  if (isId(sessionId) && (await deleteSession(db, session, await appSessionDeps(), sessionId))) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: user.id, action: "session.deleted", target: sessionId }),
    );
  }
  redirect(`/b/${client.slug}/calls?view=sessions`);
}
