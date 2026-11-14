import { publicBrand } from "@/site/brand";
import { siteFor } from "@/site/config";

export default async function PrivacyPage({ params }: PageProps<"/site/[slug]/privacy">) {
  const { slug } = await params;
  const brand = await publicBrand(slug);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Privacy notice</h1>
      <p className="whitespace-pre-line text-neutral-800">{siteFor(brand).privacyText}</p>
    </div>
  );
}
