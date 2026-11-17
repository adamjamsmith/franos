"use server";

import { redirect } from "next/navigation";
import { linkCalendar, unlinkCalendar } from "@/calendars/calendars";
import { adminDb } from "@/db";
import { requireBrand } from "@/lib/session";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** The person signed in links their own calendar. Nobody can link or see anyone else's. */
export async function linkMyCalendar(form: FormData) {
  const { session, client } = await requireBrand(text(form, "slug"));
  const result = await linkCalendar(await adminDb(), session.userId, text(form, "address"));
  redirect(`/b/${client.slug}/settings/people?calendar=${result.ok ? "linked" : result.reason}`);
}

export async function unlinkMyCalendar(form: FormData) {
  const { session, client } = await requireBrand(text(form, "slug"));
  await unlinkCalendar(await adminDb(), session.userId);
  redirect(`/b/${client.slug}/settings/people?calendar=unlinked`);
}
