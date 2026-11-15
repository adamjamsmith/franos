import { notFound } from "next/navigation";
import { BookingSection } from "@/components/site/booking";
import { PageColumn, ProofImages, SignUpCard, Testimonials } from "@/components/site/page-blocks";
import { Beacon, TrackedVideo } from "@/components/site/track";
import { knownLeadId, publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";
import { ctaFor } from "@/site/cta";
import { leadProgress } from "@/site/progress";

/**
 * One video on its own page, laid out like the thank-you page: the video with the calendar under it,
 * then the other testimonials and the proof images. A visitor who has not signed up gets the form
 * where the calendar would be, because only people who have filled it in can book.
 */
export default async function VideoPage({ params, searchParams }: PageProps<"/site/[slug]/video/[id]">) {
  const { slug, id } = await params;
  const { booking } = await searchParams;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);
  const video = site.videos.find((v) => v.id === id);
  if (!video) notFound();

  const leadId = await knownLeadId(slug);
  const progress = await leadProgress(brand.id, leadId);
  const cta = ctaFor(slug, progress, { signUp: "#sign-up", book: "#book" });

  return (
    <PageColumn>
      <Beacon slug={slug} event={{ type: "page_view", path: `/video/${id}` }} />
      <h1 className="text-center text-2xl font-bold leading-tight sm:text-3xl">
        {video.title}
        {video.person ? `, ${video.person}` : ""}
      </h1>
      <div className="flex flex-col gap-4">
        <TrackedVideo slug={slug} videoId={video.id} src={video.url} title={video.title} />
        {progress ? (
          <BookingSection brand={brand} leadId={leadId} from="thank-you" problem={typeof booking === "string" ? booking : undefined} />
        ) : (
          <SignUpCard brand={brand} />
        )}
      </div>
      <Testimonials slug={slug} videos={site.videos.filter((v) => v.id !== id)} cta={cta} />
      <ProofImages images={site.proofImages} cta={cta} />
    </PageColumn>
  );
}
