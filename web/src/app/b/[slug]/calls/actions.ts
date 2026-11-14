"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { bookCall, cancelCall, finishCall } from "@/calls/calls";
import { SAMPLE_TRANSCRIPT } from "@/calls/provider";
import { appCallDeps, runTimedWork } from "@/calls/run";
import { callSettingsFor } from "@/calls/slots";
import { withSession } from "@/db/context";
import { auditLog, calls, clients } from "@/db/schema";
import { isDev } from "@/lib/dev-mailbox";
import { backWith } from "@/lib/back";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Owners and consultants manage calls. The client role only reads them. */
async function staffOnly(form: FormData) {
  const brand = await requireBrand(text(form, "slug"));
  if (brand.role !== "owner" && brand.role !== "consultant") redirect(`/b/${brand.client.slug}/calls`);
  return brand;
}

/** Where to go back to: wherever the button was pressed (a lead, the board), otherwise the Calls tab. */
const backTo = (slug: string, form: FormData, param: string) => backWith(form, slug, `/b/${slug}/calls`, param);

export async function staffBook(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const leadId = text(form, "leadId");
  const startsAt = new Date(text(form, "startsAt"));
  if (!isId(leadId) || Number.isNaN(startsAt.getTime())) redirect(`/b/${client.slug}/calls`);
  const result = await bookCall(db, session, client, await appCallDeps(client), { leadId, startsAt, by: "staff" });
  if (result.ok) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: result.moved ? "call.moved" : "call.booked", target: result.callId }),
    );
  }
  redirect(backWith(form, client.slug, `/b/${client.slug}/leads/${leadId}`, `call=${result.ok ? (result.moved ? "moved" : "booked") : result.reason}`));
}

export async function staffCancel(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const callId = text(form, "callId");
  if (isId(callId) && (await cancelCall(db, session, client, await appCallDeps(client), { callId, by: "staff" }))) {
    await withSession(db, session, (tx) =>
      tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "call.cancelled", target: callId }),
    );
  }
  redirect(backTo(client.slug, form, "call=cancelled"));
}

/** Sets, or corrects, whether the lead showed up. */
export async function staffOutcome(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const callId = text(form, "callId");
  const attended = text(form, "outcome") === "showed";
  if (isId(callId)) {
    const [call] = await withSession(db, session, (tx) => tx.select().from(calls).where(eq(calls.id, callId)));
    if (call) {
      const minutes = call.durationMinutes ?? Math.round((call.endsAt.getTime() - call.startsAt.getTime()) / 60_000);
      await finishCall(db, session, client, await appCallDeps(client), {
        callId,
        report: { attended, minutes, recordingUrl: null, transcript: null },
      });
      await withSession(db, session, (tx) =>
        tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "call.outcome", target: callId, detail: { attended } }),
      );
    }
  }
  redirect(backTo(client.slug, form, "call=marked"));
}

/** Testing only: finishes a call as the real Zoom would, with a sample recording and transcript. */
export async function pretendHappened(form: FormData) {
  const { session, client, db } = await staffOnly(form);
  const callId = text(form, "callId");
  if (isDev && isId(callId)) {
    const attended = text(form, "outcome") === "showed";
    await finishCall(db, session, client, await appCallDeps(client), {
      callId,
      report: attended
        ? { attended: true, minutes: 27, recordingUrl: "/placeholder.mp4", transcript: SAMPLE_TRANSCRIPT }
        : { attended: false, minutes: 0, recordingUrl: null, transcript: null },
    });
  }
  redirect(backTo(client.slug, form, "call=marked"));
}

/** Runs the timed work that is due. On this computer it can also pretend that some hours have passed. */
export async function runTimedNow(form: FormData) {
  const { client } = await staffOnly(form);
  const hours = isDev ? Number(text(form, "hoursAhead")) || 0 : 0;
  const result = await runTimedWork(new Date(Date.now() + hours * 3_600_000));
  redirect(`/b/${client.slug}/calls?ran=${result.done}`);
}

export async function saveCallSettings(form: FormData) {
  const { session, client, db, role } = await requireBrand(text(form, "slug"));
  if (role !== "owner") redirect(`/b/${client.slug}/calls`);
  const site = siteFor(client);
  const current = callSettingsFor(site);
  const time = (key: "startTime" | "endTime" | "alertFrom" | "alertTo") =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(text(form, key)) ? text(form, key) : current[key];
  const whole = (key: "lengthMinutes" | "gapMinutes" | "windowDays" | "noticeHours" | "alertFit", min: number, max: number) => {
    const n = Number(text(form, key));
    return Number.isInteger(n) && n >= min && n <= max ? n : current[key];
  };
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => form.get(`day_${d}`) === "on");
  const startTime = time("startTime");
  const endTime = time("endTime");
  const callSettings = {
    days: days.length > 0 ? days : current.days,
    startTime: startTime < endTime ? startTime : current.startTime,
    endTime: startTime < endTime ? endTime : current.endTime,
    lengthMinutes: whole("lengthMinutes", 10, 180),
    gapMinutes: whole("gapMinutes", 0, 180),
    windowDays: whole("windowDays", 1, 60),
    noticeHours: whole("noticeHours", 0, 168),
    daysOff: text(form, "daysOff")
      .split(/[\s,]+/)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    alertFit: whole("alertFit", 0, 100),
    alertFrom: time("alertFrom"),
    alertTo: time("alertTo"),
  };
  await withSession(db, session, async (tx) => {
    await tx.update(clients).set({ site: { ...site, calls: callSettings } }).where(eq(clients.id, client.id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "calls.settings_updated" });
  });
  redirect(`/b/${client.slug}/settings/calls?saved=1`);
}
