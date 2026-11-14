import Link from "next/link";
import { notFound } from "next/navigation";
import { Beacon, TrackedVideo } from "@/components/site/track";
import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";

/** One testimonial video, with the others listed underneath. */
export default async function VideoPage({ params }: PageProps<"/site/[slug]/video/[id]">) {
  const { slug, id } = await params;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);
  const video = site.videos.find((v) => v.id === id);
  if (!video) notFound();
  const others = site.videos.filter((v) => v.id !== id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Beacon slug={slug} event={{ type: "page_view", path: `/video/${id}` }} />
      <h1 className="text-2xl font-bold">
        {video.title}
        {video.person ? `, ${video.person}` : ""}
      </h1>
      <TrackedVideo slug={slug} videoId={video.id} src={video.url} title={video.title} />
      <Link
        href={`/site/${slug}/prospectus`}
        className="self-start rounded-md bg-[var(--brand)] px-5 py-3 font-semibold text-white hover:opacity-90"
      >
        Read the prospectus
      </Link>
      {others.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">More from our franchisees</h2>
          <ul className="flex flex-col gap-1">
            {others.map((v) => (
              <li key={v.id}>
                <Link href={`/site/${slug}/video/${v.id}`} className="underline">
                  {v.title}
                  {v.person ? `, ${v.person}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
