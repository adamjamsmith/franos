import { redirect } from "next/navigation";

/** People moved into Settings. Old links still work. */
export default async function OldPeoplePage({ params }: PageProps<"/b/[slug]/people">) {
  redirect(`/b/${(await params).slug}/settings/people`);
}
