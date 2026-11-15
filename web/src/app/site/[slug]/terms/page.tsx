import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";

export default async function TermsPage({ params }: PageProps<"/site/[slug]/terms">) {
  const { slug } = await params;
  const brand = await publicBrand(slug);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Terms and conditions</h1>
      <p className="whitespace-pre-line text-neutral-800">{siteFor(brand).termsText}</p>
    </div>
  );
}
