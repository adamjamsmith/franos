import { redirect } from "next/navigation";

/** Form drop-off moved inside Numbers. Old links still work. */
export default async function OldFormStatsPage({ params }: PageProps<"/b/[slug]/form-stats">) {
  redirect(`/b/${(await params).slug}/numbers/form`);
}
