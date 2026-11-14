import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { StaffBar } from "@/components/site/staff-bar";
import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";

export async function generateMetadata({ params }: LayoutProps<"/site/[slug]">): Promise<Metadata> {
  const brand = await publicBrand((await params).slug);
  return { title: `${brand.name} franchise`, robots: { index: false, follow: false } };
}

/** The frame around every public page for a brand: its name or logo, its colour, and the footer. */
export default async function SiteLayout({ children, params }: LayoutProps<"/site/[slug]">) {
  const { slug } = await params;
  const brand = await publicBrand(slug);
  const site = siteFor(brand);

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-white text-neutral-900"
      style={{ "--brand": site.primaryColour } as CSSProperties}
    >
      <StaffBar slug={slug} />
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-4">
          <Link href={`/site/${slug}`} className="text-lg font-semibold">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt={brand.name} className="h-9 w-auto" />
            ) : (
              brand.name
            )}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-neutral-200 text-sm text-neutral-500">
        <div className="mx-auto flex w-full max-w-5xl justify-between px-4 py-6">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          <Link href={`/site/${slug}/privacy`} className="underline">
            Privacy notice
          </Link>
        </div>
      </footer>
    </div>
  );
}
