"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withSession } from "@/db/context";
import { auditLog, media } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { removeFile } from "@/media/store";

/** Owner only: removes an uploaded file for good. Anything still pointing at its address will show nothing. */
export async function deleteMedia(form: FormData) {
  const { session, client, db, role } = await requireBrand(String(form.get("slug") ?? ""));
  const id = String(form.get("id") ?? "");
  if (role !== "owner" || !/^[0-9a-f-]{36}$/i.test(id)) return;

  const removed = await withSession(db, session, async (tx) => {
    const [file] = await tx.select().from(media).where(eq(media.id, id));
    if (!file) return null;
    await tx.delete(media).where(eq(media.id, id));
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "media.removed", target: id });
    return file;
  });
  if (removed) await removeFile(removed.clientId, removed.id, removed.extension);
  revalidatePath(`/b/${client.slug}/settings/media`);
}
