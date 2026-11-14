import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { withSession } from "@/db/context";
import { leads } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { formFor } from "@/site/config";

export default async function LeadsPage({ params, searchParams }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const { session, db, client } = await requireBrand(slug);
  const byFit = sort === "fit";
  const rows = await withSession(db, session, (tx) =>
    tx
      .select()
      .from(leads)
      .orderBy(...(byFit ? [sql`${leads.fitScore} desc nulls last`] : []), desc(leads.createdAt))
      .limit(500),
  );
  const timing = formFor(client).questions.find((q) => q.id === "timing");
  const timingLabel = (value: unknown) => timing?.options.find((o) => o.value === value)?.label ?? "—";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Leads ({rows.length})</h2>
        <div className="flex gap-3 text-sm">
          <Link href={`/b/${slug}`} className={byFit ? "underline" : "font-semibold"}>
            Newest first
          </Link>
          <Link href={`/b/${slug}?sort=fit`} className={byFit ? "font-semibold" : "underline"}>
            Best fit first
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No leads yet. Open the{" "}
          <Link href={`/site/${slug}`} className="underline" target="_blank">
            public page
          </Link>{" "}
          and sign up as a test lead.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-2">Name</th>
                <th>Fit</th>
                <th>Wants to start</th>
                <th>Ad</th>
                <th>Signed up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => {
                const answers = lead.answers as Record<string, string>;
                const utm = lead.utm as Record<string, string>;
                return (
                  <tr key={lead.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="py-2">
                      <Link href={`/b/${slug}/leads/${lead.id}`} className="font-medium underline">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}
                      </Link>
                    </td>
                    <td>{lead.fitScore ?? "—"}</td>
                    <td>{timingLabel(answers.timing)}</td>
                    <td>{utm.content ?? utm.campaign ?? "—"}</td>
                    <td>{lead.createdAt.toLocaleDateString("en-GB")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
