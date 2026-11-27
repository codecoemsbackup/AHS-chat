import { apiRequest } from "@/lib/queryClient";
import type { GifResult } from "@/components/MessageInput";

export interface GifAttachment {
  attachmentUrl: string;
  attachmentName: string;
  attachmentMimeType: string;
  attachmentSize: number;
}

function isGifProviderUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (
        url.hostname === "media.tenor.com" ||
        url.hostname === "media.giphy.com" ||
        /^media\d+\.giphy\.com$/i.test(url.hostname)
      );
  } catch {
    return false;
  }
}

export async function resolveGifAttachment(gif: GifResult): Promise<GifAttachment | null> {
  if (
    /^\/uploads\/[a-z]+\/[^/?#]+$/.test(gif.url) &&
    gif.attachmentName &&
    gif.attachmentMimeType === "image/gif" &&
    gif.attachmentSize
  ) {
    return {
      attachmentUrl: gif.url,
      attachmentName: gif.attachmentName,
      attachmentMimeType: gif.attachmentMimeType,
      attachmentSize: gif.attachmentSize,
    };
  }

  if (!isGifProviderUrl(gif.url)) return null;

  const uploaded = await apiRequest("/api/gifs/import", "POST", { url: gif.url });
  return {
    attachmentUrl: uploaded.url,
    attachmentName: uploaded.originalName,
    attachmentMimeType: uploaded.mimeType,
    attachmentSize: uploaded.size,
  };
}
