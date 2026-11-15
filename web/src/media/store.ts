import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Where uploaded files are kept.
 * On this computer it is a folder beside the local database (never in version history).
 * When franOS moves to AWS this file switches to Amazon's file storage; nothing else changes.
 */
const root = () => path.resolve(process.env.FRANOS_MEDIA_DIR ?? ".data/media");
const isId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

function fileFor(clientId: string, id: string, extension: string): string {
  if (!isId(clientId) || !isId(id) || !/^\.[a-z0-9]{2,5}$/.test(extension)) throw new Error("Not a media file");
  return path.join(root(), clientId, `${id}${extension}`);
}

export class TooBig extends Error {}

/**
 * Saves an upload as it arrives, without holding it in memory, and stops if it grows past `maxBytes`.
 * It is written under a temporary name and only given its real name once complete, so a half-finished
 * upload is never served. Returns the size in bytes.
 */
export async function saveFile(clientId: string, id: string, extension: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number> {
  const target = fileFor(clientId, id, extension);
  const partial = `${target}.part`;
  await mkdir(path.dirname(target), { recursive: true });
  let size = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      size += chunk.length;
      done(size > maxBytes ? new TooBig() : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]), counter, createWriteStream(partial));
    if (size === 0) throw new Error("Empty file");
    await rename(partial, target);
    return size;
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}

export async function removeFile(clientId: string, id: string, extension: string): Promise<void> {
  await rm(fileFor(clientId, id, extension), { force: true });
}

/** The file's size, or null if it is not there. */
export async function fileSize(clientId: string, id: string, extension: string): Promise<number | null> {
  try {
    return (await stat(fileFor(clientId, id, extension))).size;
  } catch {
    return null;
  }
}

/** Reads the file, or just the bytes from `start` to `end` (both included), as a video player asks for. */
export function readFile(clientId: string, id: string, extension: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(fileFor(clientId, id, extension), range)) as ReadableStream<Uint8Array>;
}
