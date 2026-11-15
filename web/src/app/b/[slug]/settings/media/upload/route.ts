import { NextResponse } from "next/server";
import { withSession } from "@/db/context";
import { auditLog, media } from "@/db/schema";
import { brandAccess } from "@/lib/session";
import { removeFile, saveFile, TooBig } from "@/media/store";
import { describeFile, sizeText } from "@/media/types";

const problem = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Takes one uploaded file for a brand. The file arrives as the body of the request and is written
 * straight to storage as it comes in, so a large video never has to fit in memory.
 * Owner only, and only from franOS's own pages.
 */
export async function POST(request: Request, context: RouteContext<"/b/[slug]/settings/media/upload">) {
  const { slug } = await context.params;
  const access = await brandAccess(slug);
  if (!access || access.role !== "owner") return problem(403, "Only the owner can add files.");

  const origin = request.headers.get("origin");
  let sameSite = false;
  try {
    sameSite = Boolean(origin) && new URL(origin as string).host === request.headers.get("host");
  } catch {
    sameSite = false;
  }
  if (!sameSite) return problem(403, "Uploads are only accepted from franOS itself.");

  let rawName = "";
  try {
    rawName = decodeURIComponent(request.headers.get("x-file-name") ?? "");
  } catch {
    rawName = "";
  }
  const file = describeFile(rawName);
  if (!file) return problem(415, "That kind of file cannot be added. Use a picture (PNG, JPG, WebP, GIF), a PDF, or a video (MP4, WebM, MOV).");
  if (!request.body) return problem(400, "No file arrived.");
  const tooBig = `${file.name} is too big. The most for this kind of file is ${sizeText(file.maxBytes)}.`;
  if (Number(request.headers.get("content-length") ?? 0) > file.maxBytes) return problem(413, tooBig);

  const { session, client, db } = access;
  const id = crypto.randomUUID();
  let sizeBytes: number;
  try {
    sizeBytes = await saveFile(client.id, id, file.extension, request.body, file.maxBytes);
  } catch (error) {
    if (error instanceof TooBig) return problem(413, tooBig);
    console.error("Could not save an uploaded file", error);
    return problem(500, `${file.name} could not be saved. Please try again.`);
  }

  try {
    await withSession(db, session, async (tx) => {
      await tx.insert(media).values({ id, clientId: client.id, name: file.name, kind: file.kind, contentType: file.contentType, extension: file.extension, sizeBytes });
      await tx.insert(auditLog).values({ clientId: client.id, actorUserId: session.userId, action: "media.added", target: id });
    });
  } catch (error) {
    // Never leave a file behind with no record of it.
    await removeFile(client.id, id, file.extension);
    console.error("Could not record an uploaded file", error);
    return problem(500, `${file.name} could not be saved. Please try again.`);
  }
  return NextResponse.json({ ok: true, id });
}
