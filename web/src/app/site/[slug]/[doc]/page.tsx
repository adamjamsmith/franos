import { notFound } from "next/navigation";
import { BookingSection } from "@/components/site/booking";
import { Beacon } from "@/components/site/track";
import { knownLeadId, publicBrand } from "@/site/brand";
import { DOC_KINDS, type DocKind, siteFor } from "@/site/config";

/** The prospectus, next steps and questions pages: the document on the page, with a download button. */
export default async function DocumentPage({ params, searchParams }: PageProps<"/site/[slug]/[doc]">) {
  const { slug, doc } = await params;
  const { booking } = await searchParams;
  if (!DOC_KINDS.includes(doc as DocKind)) notFound();
  const kind = doc as DocKind;
  const brand = await publicBrand(slug);
  const document = siteFor(brand).documents[kind];
  if (!document?.url) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Beacon slug={slug} event={{ type: "document_open", kind }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{document.title}</h1>
        <a
          href={`/site/${slug}/download/${kind}`}
          className="rounded-md bg-[var(--brand)] px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          Download to your phone or computer
        </a>
      </div>
      <iframe src={document.url} title={document.title} className="h-[85vh] w-full rounded-lg border border-neutral-200" />
      {kind === "prospectus" && (
        <BookingSection
          brand={brand}
          leadId={await knownLeadId(slug)}
          from="prospectus"
          problem={typeof booking === "string" ? booking : undefined}
        />
      )}
    </div>
  );
}
