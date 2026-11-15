import type { ReactNode } from "react";
import { submitSignUp } from "@/app/site/[slug]/actions";
import { formFor, type ProofImage, siteFor, type Video } from "@/site/config";
import type { Cta } from "@/site/cta";
import { turnstileSiteKey } from "@/site/spam";
import { SignUpForm } from "./signup-form";
import { TrackedVideo } from "./track";

/**
 * The blocks every public page is built from. The homepage, the thank-you page and the video pages
 * share one layout: their own block on top, then the testimonials, then the proof images.
 */

/** The single centred column all three pages use. */
export function PageColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">{children}</div>;
}

/** The button repeated down the page. It always asks for the visitor's next step. */
export function CtaButton({ cta }: { cta: Cta }) {
  return (
    <a href={cta.href} className="mx-auto rounded-md bg-[var(--brand)] px-6 py-3 text-center font-semibold text-white hover:opacity-90">
      {cta.label}
    </a>
  );
}

/** Each testimonial: its title, the video, then the button. */
export function Testimonials({ slug, videos, cta }: { slug: string; videos: Video[]; cta: Cta }) {
  return (
    <>
      {videos.map((video) => (
        <section key={video.id} className="flex flex-col gap-4">
          <h2 className="text-center text-xl font-semibold leading-snug">
            {video.title}
            {video.person ? `, ${video.person}` : ""}
          </h2>
          <TrackedVideo slug={slug} videoId={video.id} src={video.url} title={video.title} />
          <CtaButton cta={cta} />
        </section>
      ))}
    </>
  );
}

/** Placeholder boxes come in different shapes, like the mix of screenshots and photos they stand in for. */
const shapes = ["aspect-[4/3]", "aspect-square", "aspect-[3/4]", "aspect-video", "aspect-[4/5]", "aspect-[3/2]", "aspect-[9/16]"];

/** A box that says what picture will go there. */
export function PlaceholderBox({ label, shape }: { label: string; shape: string }) {
  return (
    <div className={`flex ${shape} w-full items-center justify-center rounded-lg border border-dashed border-neutral-400 bg-white/70 p-3 text-center text-sm text-neutral-500`}>
      {label}
    </div>
  );
}

/** Proof images in two columns of mixed shapes, then the button. Nothing at all if the brand has none. */
export function ProofImages({ images, cta }: { images: ProofImage[]; cta: Cta }) {
  if (images.length === 0) return null;
  return (
    <section className="flex flex-col gap-6">
      <div className="columns-2 gap-3 sm:columns-3">
        {images.map((image, index) => (
          <figure key={`${image.url}|${image.caption ?? ""}|${index}`} className="mb-3 break-inside-avoid">
            {image.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.caption ?? ""} loading="lazy" className="w-full rounded-lg border border-neutral-200 bg-white" />
                {image.caption && <figcaption className="mt-1 text-center text-xs text-neutral-600">{image.caption}</figcaption>}
              </>
            ) : (
              <PlaceholderBox label={image.caption || "Proof image"} shape={shapes[index % shapes.length]} />
            )}
          </figure>
        ))}
      </div>
      <CtaButton cta={cta} />
    </section>
  );
}

/** The sign-up form in its box, headed "Download the prospectus". */
export function SignUpCard({ brand, utm = {}, clickId = "" }: { brand: { slug: string; name: string; site: unknown; form: unknown }; utm?: Record<string, string>; clickId?: string }) {
  const site = siteFor(brand);
  return (
    <section id="sign-up" className="scroll-mt-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-center text-xl font-semibold">Download the prospectus</h2>
      <SignUpForm
        slug={brand.slug}
        action={submitSignUp}
        questions={formFor(brand).questions}
        consentWording={site.consentWording}
        whatsappWording={site.whatsappWording}
        utm={utm}
        clickId={clickId}
        turnstileSiteKey={turnstileSiteKey()}
      />
    </section>
  );
}
