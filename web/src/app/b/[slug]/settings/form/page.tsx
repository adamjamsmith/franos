import { FormEditor } from "@/components/form-editor";
import { withSession } from "@/db/context";
import { leads } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { fullFormFor } from "@/site/config";
import { answerCounts } from "@/site/form-edit";
import { saveFormEdit } from "./actions";

/** The sign-up form's questions: wording, order, how good each answer is, and which answers are must-haves. */
export default async function FormSettingsPage({ params }: PageProps<"/b/[slug]/settings/form">) {
  const { slug } = await params;
  const { client, role, session, db } = await requireBrand(slug);
  if (role !== "owner") return <p className="text-sm text-neutral-500">Only the owner can change the form.</p>;

  const rows = await withSession(db, session, (tx) => tx.select({ answers: leads.answers }).from(leads));
  const picked = Object.fromEntries(answerCounts(rows.map((r) => r.answers)));
  return <FormEditor slug={slug} initial={fullFormFor(client)} picked={picked} save={saveFormEdit} />;
}
