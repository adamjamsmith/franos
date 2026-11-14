import { notFound } from "next/navigation";
import { isDev } from "@/lib/dev-mailbox";

/** Where a meeting link leads while a stand-in plays the part of Zoom. Does not exist once the app is live. */
export default async function StandInZoomPage({ params }: PageProps<"/dev/zoom/[id]">) {
  if (!isDev) notFound();
  const { id } = await params;
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Stand-in for Zoom</h1>
      <p className="mb-2 text-neutral-600">
        This is where the Zoom meeting would open. Meeting number {id}.
      </p>
      <p className="text-sm text-neutral-500">
        There is no Zoom account connected yet. To finish this call for testing, open the Calls tab in franOS and
        press &quot;Pretend this call has happened&quot;.
      </p>
    </main>
  );
}
