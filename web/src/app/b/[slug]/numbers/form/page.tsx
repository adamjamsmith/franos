import { sql } from "drizzle-orm";
import { withSession } from "@/db/context";
import { siteStats } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { formFor } from "@/site/config";

/** How far visitors get through the sign-up form. Counts only: nobody is identified and nothing typed is stored. */
export default async function FormStatsPage({ params }: PageProps<"/b/[slug]/numbers/form">) {
  const { slug } = await params;
  const { session, db, client } = await requireBrand(slug);
  const rows = await withSession(db, session, (tx) =>
    tx
      .select({ key: siteStats.key, total: sql<number>`sum(${siteStats.count})::int` })
      .from(siteStats)
      .where(sql`${siteStats.day} >= to_char(current_date - 30, 'YYYY-MM-DD')`)
      .groupBy(siteStats.key),
  );
  const count = (key: string) => rows.find((r) => r.key === key)?.total ?? 0;

  const steps = [
    { label: "Saw the form", n: count("form_view") },
    { label: "Started filling it in", n: count("form_start") },
    ...formFor(client).questions.map((q) => ({ label: `Reached: ${q.label}`, n: count(`form_q:${q.id}`) })),
    { label: "Sent the form", n: count("form_submit") },
  ];
  const top = Math.max(1, steps[0].n);

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Form drop-off</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Last 30 days. Shows how far visitors get through the sign-up form, so you can see which question loses people.
      </p>
      <table className="w-full text-left text-sm">
        <thead className="text-neutral-500">
          <tr>
            <th className="py-2">Step</th>
            <th className="text-right">Visitors</th>
            <th className="text-right">Of those who saw it</th>
            <th className="text-right">Lost at this step</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => {
            const lost = i === 0 ? 0 : Math.max(0, steps[i - 1].n - step.n);
            return (
              <tr key={step.label} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-2">{step.label}</td>
                <td className="text-right">{step.n}</td>
                <td className="text-right">{Math.round((step.n / top) * 100)}%</td>
                <td className="text-right">{lost || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
