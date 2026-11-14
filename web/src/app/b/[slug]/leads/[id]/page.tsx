import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadPanel } from "@/components/lead-panel";
import { requireBrand } from "@/lib/session";

/** One lead on its own page. The same panel opens as a pop-up from the board. */
export default async function LeadPage({ params, searchParams }: PageProps<"/b/[slug]/leads/[id]">) {
  const { slug, id } = await params;
  const query = await searchParams;
  const access = await requireBrand(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const panel = await LeadPanel({ slug, leadId: id, base: `/b/${slug}/leads/${id}`, query, access });
  if (!panel) notFound();
  return (
    <section className="flex flex-col gap-4">
      <Link href={`/b/${slug}`} className="text-sm underline">
        Back to leads
      </Link>
      {panel}
    </section>
  );
}
