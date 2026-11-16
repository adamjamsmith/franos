"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auditLog, clients } from "@/db/schema";
import { withSession } from "@/db/context";
import { requireBrand } from "@/lib/session";
import { appSessionDeps } from "@/sessions/run";
import { addSession, cancelSession, deleteSession, isBookableKind, isSessionKind, sessionSettingsFor, ukLocal } from "@/sessions/sessions";
import { siteFor } from "@/site/config";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Recording sessions are the owner's. Nobody else sees or changes them. */
async function ownerOnly(form: FormData) {
  const brand = await requireBrand(text(form, "slug"));
  if (brand.role !== "owner") redirect(`/b/${brand.client.slug}/board`);
  return brand;
}

/** The owner books a session for someone, at any time. A problem comes back in the address so the form can say what went wrong. */
export async function ownerAddSession(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const back = (problem: string) => redirect(`/b/${client.slug}/sessions?problem=${problem}`);
  const kind = text(form, "kind");
  const startsAt = ukLocal(`${text(form, "date")}T${text(form, "time").slice(0, 5)}`);
  if (!isSessionKind(kind) || !startsAt) return back("time");
  const result = await addSession(db, session, client, await appSessionDeps(), {
    kind,
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    email: text(form, "email"),
    startsAt,
    minutes: Number(text(form, "minutes")) || undefined,
    keepVideo: text(form, "keep") === "video" ? true : text(form, "keep") === "transcript" ? false : undefined,
  });
  if (!result.ok) return back(result.reason);
  redirect(`/b/${client.slug}/sessions?done=booked`);
}

export async function ownerCancelSession(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const sessionId = text(form, "sessionId");
  if (isId(sessionId)) await cancelSession(db, session, client, await appSessionDeps(), { sessionId });
  redirect(`/b/${client.slug}/sessions`);
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
  redirect(`/b/${client.slug}/sessions`);
}

/** The owner sets when the booking links offer sessions. Anything typed wrong keeps what was there before. */
export async function saveSessionSettings(form: FormData) {
  const { session, client, db } = await ownerOnly(form);
  const kind = text(form, "kind");
  if (!isBookableKind(kind)) redirect(`/b/${client.slug}/settings/sessions`);
  const current = sessionSettingsFor(client, kind);
  const time = (key: "startTime" | "endTime") => (/^([01]\d|2[0-3]):[0-5]\d$/.test(text(form, key)) ? text(form, key) : current[key]);
  const whole = (key: "lengthMinutes" | "gapMinutes" | "windowDays" | "noticeHours", min: number, max: number) => {
    const n = Number(text(form, key));
    return Number.isInteger(n) && n >= min && n <= max ? n : current[key];
  };
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => form.get(`day_${d}`) === "on");
  const startTime = time("startTime");
  const endTime = time("endTime");
  const hours = {
    days: days.length > 0 ? days : current.days,
    startTime: startTime < endTime ? startTime : current.startTime,
    endTime: startTime < endTime ? endTime : current.endTime,
    lengthMinutes: whole("lengthMinutes", 15, 240),
    gapMinutes: whole("gapMinutes", 0, 180),
    windowDays: whole("windowDays", 1, 90),
    noticeHours: whole("noticeHours", 0, 168),
  };
  await withSession(db, session, async (tx) => {
    const site = siteFor(client);
    await tx.update(clients).set({ site: { ...site, sessions: { ...(site.sessions ?? {}), [kind]: hours } } }).where(eq(clients.id, client.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "sessions.settings_updated" });
  });
  redirect(`/b/${client.slug}/settings/sessions?saved=${kind}`);
}
