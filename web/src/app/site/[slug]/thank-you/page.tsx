import { eq } from "drizzle-orm";
import Link from "next/link";
import { BookingSection } from "@/components/site/booking";
import { Beacon, TrackedVideo } from "@/components/site/track";
import { appDb } from "@/db";
import { withSession } from "@/db/context";
import { leads } from "@/db/schema";
import { knownLeadId, publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";
import { siteSession } from "@/site/leads";

/** After sign-up: the text, the introduction video, then schedule a call. */
export default async function ThankYouPage({ params, searchParams }: PageProps<"/site/[slug]/thank-you">) {
  const { slug } = await params;
  const { booking } = await searchParams;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);

  const leadId = await knownLeadId(slug);
  let firstName = "";
  if (leadId) {
    const [lead] = await withSession(await appDb(), siteSession(brand.id), (tx) =>
      tx.select({ firstName: leads.firstName }).from(leads).where(eq(leads.id, leadId)),
    );
    firstName = lead?.firstName ?? "";
  }
  const heading = site.thankYouHeading.replace("{first_name}", firstName).replace(/^Thanks, \./, "Thanks.");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Beacon slug={slug} event={{ type: "page_view", path: "/thank-you" }} />
      <h1 className="text-3xl font-bold leading-tight">{heading}</h1>
      <p className="text-lg text-neutral-700">{site.thankYouText}</p>
      {site.vslUrl && <TrackedVideo slug={slug} videoId="vsl" src={site.vslUrl} title="Introduction" />}
      <BookingSection brand={brand} leadId={leadId} from="thank-you" problem={typeof booking === "string" ? booking : undefined} />
      {site.videos.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Hear from our franchisees</h2>
          <ul className="flex flex-col gap-1">
            {site.videos.map((video) => (
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
    </div>
  );
}
