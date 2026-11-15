import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MetaPixel } from "@/components/site/meta-pixel";
import { StaffBar } from "@/components/site/staff-bar";
import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";

export async function generateMetadata({ params }: LayoutProps<"/site/[slug]">): Promise<Metadata> {
  const brand = await publicBrand((await params).slug);
  return { title: `${brand.name} franchise`, robots: { index: false, follow: false } };
}

/**
 * The frame around every public page for a brand. There is no header: the page starts with its own content.
 * The background is a light tint of the brand's colour, the footer a slightly deeper one, and the boxes on the page are white.
 */
export default async function SiteLayout({ children, params }: LayoutProps<"/site/[slug]">) {
  const { slug } = await params;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);
  const colours = {
    "--brand": site.primaryColour,
    "--brand-light": `color-mix(in srgb, ${site.primaryColour} 7%, white)`,
    "--brand-soft": `color-mix(in srgb, ${site.primaryColour} 16%, white)`,
  } as CSSProperties;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--brand-light)] text-neutral-900" style={colours}>
      <StaffBar slug={slug} />
      <MetaPixel slug={slug} brand={brand} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
      <footer className="bg-[var(--brand-soft)] text-sm text-neutral-700">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-8">
          <Link href={`/site/${slug}`} className="self-start font-semibold text-neutral-900">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt={brand.name} className="h-8 w-auto" />
            ) : (
              brand.name
            )}
          </Link>
          {site.companyAddress && <p className="whitespace-pre-line">{site.companyAddress}</p>}
          {site.earningsNote && <p className="text-xs">{site.earningsNote}</p>}
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href={`/site/${slug}/privacy`} className="underline">
              Privacy notice
            </Link>
            <Link href={`/site/${slug}/terms`} className="underline">
              Terms and conditions
            </Link>
          </p>
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
