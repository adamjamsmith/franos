import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, type Session, withSession } from "../src/db/context";
import { media } from "../src/db/schema";
import { fileSize, readFile, removeFile, saveFile, TooBig } from "../src/media/store";
import { cleanName, describeFile, mediaPath, sizeText } from "../src/media/types";
import { freshDb, seedTwoBrands } from "./helpers";

const brand = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const stream = (text: string) => new Blob([text]).stream() as ReadableStream<Uint8Array>;
const textOf = async (body: ReadableStream<Uint8Array>) => new Response(body).text();

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "franos-media-"));
  process.env.FRANOS_MEDIA_DIR = dir;
});
afterAll(async () => {
  delete process.env.FRANOS_MEDIA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("what can be uploaded", () => {
  it("goes by the file's ending: pictures, PDFs and videos", () => {
    expect(describeFile("Logo.PNG")).toMatchObject({ name: "Logo.PNG", extension: ".png", kind: "image", contentType: "image/png" });
    expect(describeFile("prospectus v2.pdf")).toMatchObject({ name: "prospectus-v2.pdf", kind: "document", contentType: "application/pdf" });
    expect(describeFile("ali.mp4")).toMatchObject({ kind: "video", contentType: "video/mp4" });
  });

  it("refuses anything else, including pictures that can carry scripts", () => {
    for (const name of ["logo.svg", "page.html", "run.exe", "notes.txt", "noending", "trick.png.js"]) {
      expect(describeFile(name)).toBeNull();
    }
  });

  it("cleans the name so it is safe in an address, and drops any folder in front of it", () => {
    expect(cleanName("C:\\Users\\me\\My Logo (final).png")).toBe("My-Logo-final.png");
    expect(cleanName("../../etc/passwd")).toBe("passwd");
    expect(cleanName("<script>.png")).toBe("script.png");
    expect(cleanName("")).toBe("file");
  });

  it("gives a file an address that works on any domain", () => {
    expect(mediaPath(fileId, "My-Logo.png")).toBe(`/media/${fileId}/My-Logo.png`);
  });

  it("writes sizes the way people read them", () => {
    expect(sizeText(900)).toBe("1 KB");
    expect(sizeText(340 * 1024)).toBe("340 KB");
    expect(sizeText(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(sizeText(48 * 1024 * 1024)).toBe("48 MB");
    expect(sizeText(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
  });
});

describe("keeping the files", () => {
  it("saves a file, reads it back whole or in part, and removes it", async () => {
    expect(await saveFile(brand, fileId, ".png", stream("0123456789"), 100)).toBe(10);
    expect(await fileSize(brand, fileId, ".png")).toBe(10);
    expect(await textOf(readFile(brand, fileId, ".png"))).toBe("0123456789");
    expect(await textOf(readFile(brand, fileId, ".png", { start: 2, end: 5 }))).toBe("2345");
    await removeFile(brand, fileId, ".png");
    expect(await fileSize(brand, fileId, ".png")).toBeNull();
  });

  it("stops a file that is too big, and leaves nothing behind", async () => {
    await expect(saveFile(brand, fileId, ".mp4", stream("x".repeat(500)), 100)).rejects.toBeInstanceOf(TooBig);
    expect(await fileSize(brand, fileId, ".mp4")).toBeNull();
    expect(await readdir(path.join(dir, brand))).toEqual([]);
  });

  it("refuses an empty file", async () => {
    await expect(saveFile(brand, fileId, ".png", stream(""), 100)).rejects.toThrow();
    expect(await fileSize(brand, fileId, ".png")).toBeNull();
  });

  it("only ever writes inside its own folder", async () => {
    await expect(saveFile("../outside", fileId, ".png", stream("x"), 100)).rejects.toThrow();
    await expect(saveFile(brand, "../../escape", ".png", stream("x"), 100)).rejects.toThrow();
    await expect(saveFile(brand, fileId, "/../x", stream("x"), 100)).rejects.toThrow();
  });
});

describe("who can see and change a brand's files", () => {
  let db: Db;
  let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
  const as = (role: Session["role"], clientId: string, userId = "u_owner"): Session => ({ userId, role, clientId });
  const row = (clientId: string, name: string) => ({ clientId, name, kind: "image", contentType: "image/png", extension: ".png", sizeBytes: 10 });

  beforeAll(async () => {
    const fresh = await freshDb();
    db = fresh.db;
    seed = await seedTwoBrands(fresh.admin);
    await withSession(db, as("owner", seed.refresh.id), (tx) => tx.insert(media).values(row(seed.refresh.id, "refresh.png")));
    await withSession(db, as("owner", seed.oven.id), (tx) => tx.insert(media).values(row(seed.oven.id, "oven.png")));
  });

  it("one brand never sees another brand's files", async () => {
    const seen = await withSession(db, as("consultant", seed.refresh.id, "u_mike"), (tx) => tx.select().from(media));
    expect(seen.map((f) => f.name)).toEqual(["refresh.png"]);
  });

  it("only an owner can add or remove a file", async () => {
    const mike = as("consultant", seed.refresh.id, "u_mike");
    await expect(withSession(db, mike, (tx) => tx.insert(media).values(row(seed.refresh.id, "sneaky.png")))).rejects.toThrow();
    await withSession(db, mike, (tx) => tx.delete(media).where(eq(media.name, "refresh.png")));
    expect(await withSession(db, mike, (tx) => tx.select().from(media))).toHaveLength(1);
  });

  it("an owner working in one brand cannot add a file to, or remove one from, another", async () => {
    const onRefresh = as("owner", seed.refresh.id);
    await expect(withSession(db, onRefresh, (tx) => tx.insert(media).values(row(seed.oven.id, "wrong-brand.png")))).rejects.toThrow();
    await withSession(db, onRefresh, (tx) => tx.delete(media).where(eq(media.name, "oven.png")));
    expect(await withSession(db, as("owner", seed.oven.id), (tx) => tx.select().from(media))).toHaveLength(1);
  });
});
