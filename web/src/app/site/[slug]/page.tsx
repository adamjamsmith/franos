import Link from "next/link";
import { SignUpForm } from "@/components/site/signup-form";
import { Beacon, TrackedVideo } from "@/components/site/track";
import { publicBrand } from "@/site/brand";
import { formFor, siteFor } from "@/site/config";
import { turnstileSiteKey } from "@/site/spam";
import { submitSignUp } from "./actions";

/** The landing page: who this is for, the testimonials, and the sign-up form. */
export default async function LandingPage({ params, searchParams }: PageProps<"/site/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);
  const form = formFor(brand);

  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign", "term", "content"]) {
    const value = query[`utm_${key}`];
    if (typeof value === "string" && value) utm[key] = value;
  }
  const [firstVideo, ...otherVideos] = site.videos;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
      <Beacon slug={slug} event={{ type: "page_view", path: "/" }} />
      <section className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{site.headline}</h1>
        <p className="text-lg text-neutral-700">{site.subheadline}</p>
        {firstVideo && (
          <div>
            <TrackedVideo slug={slug} videoId={firstVideo.id} src={firstVideo.url} title={firstVideo.title} />
            <p className="mt-2 text-sm text-neutral-600">
              {firstVideo.title}
              {firstVideo.person ? `, ${firstVideo.person}` : ""}
            </p>
          </div>
        )}
        {site.requirements.length > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">This is for you if</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-neutral-800">
              {site.requirements.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {otherVideos.length > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">Hear from our franchisees</h2>
            <ul className="flex flex-col gap-1">
              {otherVideos.map((video) => (
                <li key={video.id}>
                  <Link href={`/site/${slug}/video/${video.id}`} className="underline">
                    {video.title}
                    {video.person ? `, ${video.person}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section id="sign-up" className="h-fit rounded-xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
        <h2 className="mb-1 text-xl font-semibold">Get the prospectus</h2>
        <p className="mb-4 text-sm text-neutral-600">Answer a few questions and we will send you the full details.</p>
        <SignUpForm
          slug={slug}
          action={submitSignUp}
          questions={form.questions}
          consentWording={site.consentWording}
          whatsappWording={site.whatsappWording}
          utm={utm}
          turnstileSiteKey={turnstileSiteKey()}
        />
      </section>
    </div>
  );
}
