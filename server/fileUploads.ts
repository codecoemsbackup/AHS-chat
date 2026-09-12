import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

const AVATAR_MIME_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

export interface SavedUpload {
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
}

function decodeDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== "string") {
    throw new Error("Choose a file to upload");
  }

  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new Error("The selected file could not be read");
  }

  const mimeType = match[1].toLowerCase();
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error("That file type is not supported");
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  return { buffer, mimeType, extension };
}

export async function saveUpload(
  dataUrl: unknown,
  originalName: unknown,
  options: { kind: "avatar" | "attachment"; maxBytes: number },
): Promise<SavedUpload> {
  const { buffer, mimeType, extension } = decodeDataUrl(dataUrl);
  if (options.kind === "avatar" && !AVATAR_MIME_TYPES.has(mimeType)) {
    throw new Error("Profile pictures must be PNG, JPG, GIF, or WEBP images");
  }
  if (buffer.length === 0 || buffer.length > options.maxBytes) {
    const maxMegabytes = Math.round(options.maxBytes / (1024 * 1024));
    throw new Error(`Files must be smaller than ${maxMegabytes} MB`);
  }

  const safeOriginalName =
    typeof originalName === "string" && originalName.trim()
      ? path.basename(originalName).replace(/[^\w.\- ]/g, "_").slice(0, 120)
      : `upload.${extension}`;
  const directory = options.kind === "avatar" ? "avatars" : "files";
  const fileName = `${randomUUID()}.${extension}`;
  const directoryPath = path.join(UPLOAD_ROOT, directory);
  await mkdir(directoryPath, { recursive: true });
  await writeFile(path.join(directoryPath, fileName), buffer, { flag: "wx" });

  return {
    url: `/uploads/${directory}/${fileName}`,
    mimeType,
    size: buffer.length,
    originalName: safeOriginalName,
  };
}

export async function removeLocalUpload(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/")) return;
  const filePath = path.resolve(UPLOAD_ROOT, url.slice("/uploads/".length));
  if (!filePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) return;
  await unlink(filePath).catch(() => undefined);
}