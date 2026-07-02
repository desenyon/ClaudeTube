import type { AgentAction, LayoutMode } from "./types";

const ALLOWED_ACTIONS = new Set([
  "play",
  "enqueue",
  "toggle",
  "show",
  "clearQueue",
  "setLayout",
  "setPlaybackRate",
]);

const ALLOWED_LAYOUTS = new Set<LayoutMode>(["compact", "theater", "mini"]);

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const MAX_INFO_MESSAGE_LENGTH = 240;
const MAX_INBOX_BYTES = 64 * 1024;
const MAX_INBOX_ACTIONS = 20;

export function clampPlaybackRate(rate: number): number | null {
  if (!Number.isFinite(rate)) {
    return null;
  }
  const clamped = Math.min(2, Math.max(0.25, rate));
  return clamped;
}

export function isAllowedYouTubeHttpUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" && YOUTUBE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function sanitizeInfoMessage(message: string): string {
  return message.replace(/[\r\n]+/g, " ").trim().slice(0, MAX_INFO_MESSAGE_LENGTH);
}

export function isAgentAction(value: unknown): value is AgentAction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const action = record.action;
  if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
    return false;
  }

  switch (action) {
    case "play":
    case "enqueue": {
      const hasUrl = typeof record.url === "string" && record.url.length > 0;
      const hasVideoId =
        typeof record.videoId === "string" &&
        /^[a-zA-Z0-9_-]{11}$/.test(record.videoId);
      if (!hasUrl && !hasVideoId) {
        return false;
      }
      if (hasUrl && !isAllowedYouTubeHttpUrl(record.url as string)) {
        if (!/^[a-zA-Z0-9_-]{11}$/.test(record.url as string)) {
          return false;
        }
      }
      if (
        record.title !== undefined &&
        (typeof record.title !== "string" || record.title.length > 200)
      ) {
        return false;
      }
      return true;
    }
    case "toggle":
    case "show":
    case "clearQueue":
      return true;
    case "setLayout":
      return (
        typeof record.layout === "string" &&
        ALLOWED_LAYOUTS.has(record.layout as LayoutMode)
      );
    case "setPlaybackRate": {
      const rate = Number(record.rate);
      return Number.isFinite(rate) && rate >= 0.25 && rate <= 2;
    }
    default:
      return false;
  }
}

export function validateInboxPayload(raw: string): AgentAction[] {
  if (Buffer.byteLength(raw, "utf8") > MAX_INBOX_BYTES) {
    throw new Error("Inbox payload exceeds size limit");
  }

  const payload = JSON.parse(raw) as unknown;
  const actions = Array.isArray(payload) ? payload : [payload];

  if (actions.length > MAX_INBOX_ACTIONS) {
    throw new Error("Too many inbox actions");
  }

  const valid: AgentAction[] = [];
  for (const item of actions) {
    if (isAgentAction(item)) {
      valid.push(item);
    }
  }
  return valid;
}

export function isWebviewMessage(value: unknown): value is { type: string } {
  return Boolean(value && typeof value === "object" && typeof (value as { type?: unknown }).type === "string");
}
