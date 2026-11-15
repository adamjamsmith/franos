import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { media } from "@/db/schema";
import { fileSize, readFile } from "@/media/store";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves an uploaded file to anyone with its address: these are the pictures, videos and PDFs on a
 * brand's public pages and in its emails. The id in the address is what finds the file; the name
 * after it is only there to make the address readable. Videos are sent in the pieces the player asks for.
 */
export async function GET(request: Request, context: RouteContext<"/media/[id]/[name]">) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();
  const [file] = await (await adminDb()).select().from(media).where(eq(media.id, id));
  if (!file) return notFound();
  const size = await fileSize(file.clientId, file.id, file.extension);
  if (size === null) return notFound();

  const headers = new Headers({
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    // The address never changes what it points to, so browsers may keep the file.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${file.name.replace(/[^A-Za-z0-9._ -]/g, "")}"`,
  });

  const asked = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (asked && (asked[1] || asked[2])) {
    // "bytes=100-" is from byte 100 to the end; "bytes=-500" is the last 500 bytes.
    const start = asked[1] ? Number(asked[1]) : Math.max(0, size - Number(asked[2]));
    const end = asked[1] && asked[2] ? Math.min(Number(asked[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(readFile(file.clientId, file.id, file.extension, { start, end }), { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new Response(readFile(file.clientId, file.id, file.extension), { headers });
}
