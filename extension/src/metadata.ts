import * as https from "node:https";
import type { VideoMetadata } from "./types";
import { isAllowedYouTubeHttpUrl } from "./security";
import { buildYouTubeUrl, thumbnailUrlForVideo } from "./parseYouTubeUrl";

const metadataCache = new Map<string, VideoMetadata>();

function fetchJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 8000 }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>);
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

export async function fetchVideoMetadata(
  videoId: string,
  url?: string
): Promise<VideoMetadata> {
  const cached = metadataCache.get(videoId);
  if (cached) {
    return cached;
  }

  const watchUrl = url && isAllowedYouTubeHttpUrl(url) ? url : buildYouTubeUrl(videoId);
  const fallback: VideoMetadata = {
    title: videoId,
    thumbnailUrl: thumbnailUrlForVideo(videoId),
  };

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const data = await fetchJson(oembedUrl);
    const title = typeof data.title === "string" ? data.title.slice(0, 200) : videoId;
    const thumbnailUrl =
      typeof data.thumbnail_url === "string" ? data.thumbnail_url : fallback.thumbnailUrl;
    const authorName = typeof data.author_name === "string" ? data.author_name : undefined;

    const metadata: VideoMetadata = { title, thumbnailUrl, authorName };
    metadataCache.set(videoId, metadata);
    return metadata;
  } catch {
    metadataCache.set(videoId, fallback);
    return fallback;
  }
}

export function clearMetadataCache(): void {
  metadataCache.clear();
}
