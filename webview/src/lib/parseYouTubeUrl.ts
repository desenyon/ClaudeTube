const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export interface ParsedYouTubeUrl {
  videoId: string;
  url: string;
  startSeconds?: number;
}

export function isValidVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

export function buildYouTubeUrl(videoId: string, startSeconds?: number): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  if (startSeconds && startSeconds > 0) {
    return `${base}&t=${Math.floor(startSeconds)}s`;
  }
  return base;
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidVideoId(trimmed)) {
    const url = buildYouTubeUrl(trimmed);
    return { videoId: trimmed, url };
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
  let startSeconds: number | undefined;

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
  }

  const tParam = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
  if (tParam) {
    startSeconds = parseTimeParam(tParam);
  }

  if (!videoId || !isValidVideoId(videoId)) {
    return null;
  }

  return {
    videoId,
    url: buildYouTubeUrl(videoId, startSeconds),
    startSeconds,
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

export function extractYouTubeUrls(text: string): string[] {
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s]+|embed\/[^\s]+|shorts\/[^\s]+|live\/[^\s]+)|youtu\.be\/[^\s]+)/gi;
  return [...new Set(text.match(urlPattern) ?? [])];
}
