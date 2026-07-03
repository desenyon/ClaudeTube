export type LayoutMode = "compact" | "theater" | "mini";
export type RepeatMode = "off" | "one" | "all";

export interface QueueItem {
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  url: string;
  addedAt: number;
}

export interface HistoryItem {
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  url: string;
  watchedAt: number;
  lastPosition: number;
}

export interface ClaudeTubeState {
  videoId: string | null;
  playlistId: string | null;
  currentTime: number;
  volume: number;
  muted: boolean;
  layout: LayoutMode;
  playbackRate: number;
  miniOpacity: number;
  queue: QueueItem[];
  history: HistoryItem[];
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  title?: string;
  thumbnailUrl?: string;
}

export type AgentAction =
  | { action: "play"; url?: string; videoId?: string; title?: string }
  | { action: "enqueue"; url?: string; videoId?: string; title?: string }
  | { action: "toggle" }
  | { action: "show" }
  | { action: "clearQueue" }
  | { action: "next" }
  | { action: "skip" }
  | { action: "mute" }
  | { action: "seek"; seconds: number }
  | { action: "setLayout"; layout: LayoutMode }
  | { action: "setPlaybackRate"; rate: number };

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "stateChanged"; state: Partial<ClaudeTubeState> }
  | { type: "requestState" }
  | { type: "requestMetadata"; videoId: string; url: string }
  | { type: "playUrl"; url: string }
  | { type: "enqueue"; url: string }
  | { type: "removeFromQueue"; videoId: string }
  | { type: "clearQueue" }
  | { type: "openExternal"; url: string }
  | { type: "copyToClipboard"; text: string }
  | { type: "showInfo"; message: string };

export type ExtensionToWebviewMessage =
  | { type: "init"; state: ClaudeTubeState; config: WebviewConfig }
  | { type: "play"; videoId: string; playlistId?: string | null; url?: string; title?: string; thumbnailUrl?: string }
  | { type: "enqueue"; videoId: string; url: string; title?: string; thumbnailUrl?: string }
  | { type: "togglePlay" }
  | { type: "next" }
  | { type: "seek"; seconds: number }
  | { type: "setMuted"; muted: boolean }
  | { type: "clearQueue" }
  | { type: "setLayout"; layout: LayoutMode }
  | { type: "setPlaybackRate"; rate: number }
  | { type: "metadata"; videoId: string; title?: string; thumbnailUrl?: string }
  | { type: "theme"; kind: "dark" | "light" | "highContrast" };

export interface WebviewConfig {
  autoplay: boolean;
  defaultLayout: LayoutMode;
  defaultPlaybackRate: number;
  miniOpacity: number;
}

export const DEFAULT_STATE: ClaudeTubeState = {
  videoId: null,
  playlistId: null,
  currentTime: 0,
  volume: 80,
  muted: false,
  layout: "compact",
  playbackRate: 1,
  miniOpacity: 1,
  queue: [],
  history: [],
  isPlaying: false,
  shuffle: false,
  repeat: "off",
};

export interface ParsedYouTubeUrl {
  videoId: string | null;
  playlistId?: string;
  url: string;
  startSeconds?: number;
  isPlaylistOnly?: boolean;
}

export interface VideoMetadata {
  title: string;
  thumbnailUrl: string;
  authorName?: string;
}

export interface ClaudeTubeStatus {
  updatedAt: number;
  videoId: string | null;
  playlistId: string | null;
  title?: string;
  isPlaying: boolean;
  currentTime: number;
  duration?: number;
  queueLength: number;
  layout: LayoutMode;
  playbackRate: number;
  url?: string;
}
