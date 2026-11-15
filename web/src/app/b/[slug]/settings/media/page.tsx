import { desc } from "drizzle-orm";
import { MediaManager } from "@/components/media-manager";
import { withSession } from "@/db/context";
import { media } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { mediaPath, sizeText } from "@/media/types";
import { deleteMedia } from "./actions";

/** The brand's pictures, videos and PDFs. Add files here, then copy a file's address into the box that needs it. */
export default async function MediaSettingsPage({ params }: PageProps<"/b/[slug]/settings/media">) {
  const { slug } = await params;
  const { session, db, role } = await requireBrand(slug);
  const rows = await withSession(db, session, (tx) => tx.select().from(media).orderBy(desc(media.createdAt)));

  return (
    <MediaManager
      slug={slug}
      canChange={role === "owner"}
      remove={deleteMedia}
      files={rows.map((file) => ({
        id: file.id,
        name: file.name,
        kind: file.kind as "image" | "video" | "document",
        size: sizeText(file.sizeBytes),
        path: mediaPath(file.id, file.name),
      }))}
    />
  );
}
