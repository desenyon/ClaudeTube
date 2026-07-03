import type { ParsedYouTubeUrl } from "./types";

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

export function isValidPlaylistId(value: string): boolean {
  return PLAYLIST_ID_PATTERN.test(value) && value.startsWith("PL") && value.length >= 13;
}

export function buildYouTubeUrl(
  videoId: string | null,
  startSeconds?: number,
  playlistId?: string
): string {
  if (playlistId && !videoId) {
    return `https://www.youtube.com/playlist?list=${playlistId}`;
  }
  const base = `https://www.youtube.com/watch?v=${videoId ?? ""}`;
  const params = new URLSearchParams();
  if (playlistId) {
    params.set("list", playlistId);
  }
  if (startSeconds && startSeconds > 0) {
    params.set("t", `${Math.floor(startSeconds)}s`);
  }
  const query = params.toString();
  return query ? `${base}&${query}` : base;
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidVideoId(trimmed)) {
    return { videoId: trimmed, url: buildYouTubeUrl(trimmed) };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || !YOUTUBE_HOSTS.has(parsed.hostname)) {
    return null;
  }

  let videoId: string | null = null;
  let playlistId: string | undefined;
  let startSeconds: number | undefined;

  const listParam = parsed.searchParams.get("list") ?? undefined;
  if (listParam && isValidPlaylistId(listParam)) {
    playlistId = listParam;
  }

  if (parsed.hostname.includes("youtu.be")) {
    videoId = parsed.pathname.replace(/^\//, "").split("/")[0] || null;
  } else if (parsed.pathname === "/watch") {
    videoId = parsed.searchParams.get("v");
  } else if (parsed.pathname.startsWith("/embed/")) {
    videoId = parsed.pathname.split("/")[2] ?? null;
  } else if (parsed.pathname.startsWith("/shorts/")) {
    videoId = parsed.pathname.split("/")[2] ?? null;
  } else if (parsed.pathname.startsWith("/live/")) {
    videoId = parsed.pathname.split("/")[2] ?? null;
  } else if (parsed.pathname === "/playlist" && playlistId) {
    return {
      videoId: null,
      playlistId,
      url: buildYouTubeUrl(null, undefined, playlistId),
      isPlaylistOnly: true,
    };
  }

  const tParam = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
  if (tParam) {
    startSeconds = parseTimeParam(tParam);
  }

  if (videoId && !isValidVideoId(videoId)) {
    videoId = null;
  }

  if (!videoId && !playlistId) {
    return null;
  }

  return {
    videoId,
    playlistId,
    url: buildYouTubeUrl(videoId, startSeconds, playlistId),
    startSeconds,
    isPlaylistOnly: !videoId && Boolean(playlistId),
  };
}

function parseTimeParam(value: string): number | undefined {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!match) {
    return undefined;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : undefined;
}

export function resolveVideoInput(
  url?: string,
  videoId?: string
): ParsedYouTubeUrl | null {
  if (url) {
    return parseYouTubeUrl(url);
  }
  if (videoId && isValidVideoId(videoId)) {
    return { videoId, url: buildYouTubeUrl(videoId) };
  }
  return null;
}

export function extractYouTubeUrls(text: string): string[] {
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s]+|embed\/[^\s]+|shorts\/[^\s]+|live\/[^\s]+|playlist\?[^\s]+)|youtu\.be\/[^\s]+)/gi;
  return [...new Set(text.match(urlPattern) ?? [])];
}

export function thumbnailUrlForVideo(videoId: string, quality: "default" | "mq" | "hq" = "mq"): string {
  const map = { default: "default", mq: "mqdefault", hq: "hqdefault" };
  return `https://i.ytimg.com/vi/${videoId}/${map[quality]}.jpg`;
}
