"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withSession } from "@/db/context";
import { auditLog, clients, leads } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { type FormConfig, fullFormFor, scoreFit } from "@/site/config";
import { answerCounts, mergeEdited } from "@/site/form-edit";

/**
 * Saves the form as edited on the Form settings screen, then works out every lead's Fit score again.
 * Hands back the form as saved, so the screen shows exactly what is stored.
 */
export async function saveFormEdit(slug: string, edited: FormConfig): Promise<FormConfig> {
  const { session, client, db, role } = await requireBrand(slug);
  const current = fullFormFor(client);
  if (role !== "owner") return current;

  const saved = await withSession(db, session, async (tx) => {
    const rows = await tx.select({ id: leads.id, answers: leads.answers }).from(leads);
    const next = mergeEdited(current, edited, new Set(answerCounts(rows.map((r) => r.answers)).keys()));
    await tx.update(clients).set({ form: next }).where(eq(clients.id, client.id));
    for (const row of rows) {
      const { score, detail } = scoreFit(next, (row.answers ?? {}) as Record<string, string>);
      await tx.update(leads).set({ fitScore: score, fitDetail: detail }).where(eq(leads.id, row.id));
    }
    await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "form.updated" });
    return next;
  });

  revalidatePath(`/b/${client.slug}`, "layout");
  revalidatePath(`/site/${client.slug}`, "layout");
  return saved;
}
