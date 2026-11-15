import { PageColumn, PlaceholderBox, ProofImages, SignUpCard, Testimonials } from "@/components/site/page-blocks";
import { Beacon } from "@/components/site/track";
import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";

/** The homepage: the headline and three ticks beside a picture of the prospectus, the form, then the testimonials and proof images. */
export default async function LandingPage({ params, searchParams }: PageProps<"/site/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);

  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign", "term", "content"]) {
    const value = query[`utm_${key}`];
    if (typeof value === "string" && value) utm[key] = value;
  }
  // On the homepage every button goes to the form, whoever is looking.
  const cta = { label: "Download the prospectus", href: "#sign-up" };

  return (
    <PageColumn>
      <Beacon slug={slug} event={{ type: "page_view", path: "/" }} />
      <header className="grid items-center gap-6 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{site.headline}</h1>
          {site.ticks.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-neutral-800">
              {site.ticks.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-600 text-[11px] font-bold text-white">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mx-auto w-40 sm:w-full">
          {site.prospectusImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.prospectusImage} alt="The franchise prospectus" className="w-full" />
          ) : (
            <PlaceholderBox label="Picture of the prospectus" shape="aspect-[3/4]" />
          )}
        </div>
      </header>
      <SignUpCard brand={brand} utm={utm} />
      <Testimonials slug={slug} videos={site.videos} cta={cta} />
      <ProofImages images={site.proofImages} cta={cta} />
    </PageColumn>
  );
}
