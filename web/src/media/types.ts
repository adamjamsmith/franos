/**
 * What can be uploaded, decided by the file's ending and nothing else. The type a browser claims is
 * never trusted, and SVG pictures are left out because they can carry scripts.
 */
export type MediaKind = "image" | "video" | "document";
type Allowed = { kind: MediaKind; contentType: string; maxBytes: number };

const MB = 1024 * 1024;
const IMAGE_MAX = 25 * MB;
const DOCUMENT_MAX = 50 * MB;
const VIDEO_MAX = 2000 * MB;

const ALLOWED: Record<string, Allowed> = {
  ".png": { kind: "image", contentType: "image/png", maxBytes: IMAGE_MAX },
  ".jpg": { kind: "image", contentType: "image/jpeg", maxBytes: IMAGE_MAX },
  ".jpeg": { kind: "image", contentType: "image/jpeg", maxBytes: IMAGE_MAX },
  ".webp": { kind: "image", contentType: "image/webp", maxBytes: IMAGE_MAX },
  ".gif": { kind: "image", contentType: "image/gif", maxBytes: IMAGE_MAX },
  ".pdf": { kind: "document", contentType: "application/pdf", maxBytes: DOCUMENT_MAX },
  ".mp4": { kind: "video", contentType: "video/mp4", maxBytes: VIDEO_MAX },
  ".webm": { kind: "video", contentType: "video/webm", maxBytes: VIDEO_MAX },
  ".mov": { kind: "video", contentType: "video/quicktime", maxBytes: VIDEO_MAX },
};

export const ACCEPT = Object.keys(ALLOWED).join(",");

/** The file's name with anything odd taken out, so it is safe in an address and on screen. */
export function cleanName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "").trim();
  const safe = base.replace(/[^A-Za-z0-9._ -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[.-]+/, "");
  return safe.slice(-120) || "file";
}

/** What a file is, from its name. Null if that kind of file cannot be uploaded. */
export function describeFile(name: string): ({ name: string; extension: string } & Allowed) | null {
  const clean = cleanName(name);
  const dot = clean.lastIndexOf(".");
  const extension = dot < 0 ? "" : clean.slice(dot).toLowerCase();
  const allowed = ALLOWED[extension];
  return allowed ? { name: clean, extension, ...allowed } : null;
}

/** The address a file is served at. Starts with "/", so it works on any domain franOS runs on. */
export const mediaPath = (id: string, name: string) => `/media/${id}/${encodeURIComponent(name)}`;

export function sizeText(bytes: number): string {
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes >= 10 * MB ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
