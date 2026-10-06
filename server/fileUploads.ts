import path from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { uploads } from "@shared/schema";
import { db } from "./db";

export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
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
  const key = `${directory}/${fileName}`;
  await db.insert(uploads).values({
    key,
    mimeType,
    originalName: safeOriginalName,
    size: buffer.length,
    data: buffer,
  });

  return {
    url: `/uploads/${key}`,
    mimeType,
    size: buffer.length,
    originalName: safeOriginalName,
  };
}

export async function getUpload(key: string) {
  const [upload] = await db.select().from(uploads).where(eq(uploads.key, key)).limit(1);
  return upload;
}

export async function removeUpload(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/")) return;
  const key = url.slice("/uploads/".length);
  if (!/^(avatars|files)\/[\w-]+\.[a-z0-9]+$/i.test(key)) return;
  await db.delete(uploads).where(eq(uploads.key, key));
}
