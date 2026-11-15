import { BookingSection } from "@/components/site/booking";
import { PageColumn, ProofImages, Testimonials } from "@/components/site/page-blocks";
import { Beacon, TrackedVideo } from "@/components/site/track";
import { knownLeadId, publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";
import { ctaFor } from "@/site/cta";
import { leadProgress } from "@/site/progress";

/** After sign-up: the text, the introduction video with the calendar under it, then the testimonials and proof images. */
export default async function ThankYouPage({ params, searchParams }: PageProps<"/site/[slug]/thank-you">) {
  const { slug } = await params;
  const { booking } = await searchParams;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);

  const leadId = await knownLeadId(slug);
  const progress = await leadProgress(brand.id, leadId);
  const heading = site.thankYouHeading.replace("{first_name}", progress?.firstName ?? "").replace(/^Thanks, \./, "Thanks.");
  const cta = ctaFor(slug, progress, { book: "#book" });

  return (
    <PageColumn>
      <Beacon slug={slug} event={{ type: "page_view", path: "/thank-you" }} />
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{heading}</h1>
        {site.thankYouText && <p className="text-neutral-700">{site.thankYouText}</p>}
      </header>
      <div className="flex flex-col gap-4">
        {site.vslUrl && <TrackedVideo slug={slug} videoId="vsl" src={site.vslUrl} title="Introduction" />}
        <BookingSection brand={brand} leadId={progress ? leadId : null} from="thank-you" problem={typeof booking === "string" ? booking : undefined} />
      </div>
      <Testimonials slug={slug} videos={site.videos} cta={cta} />
      <ProofImages images={site.proofImages} cta={cta} />
    </PageColumn>
  );
}
