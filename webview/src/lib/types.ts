export type LayoutMode = "compact" | "theater" | "mini";

export interface QueueItem {
  videoId: string;
  title?: string;
  url: string;
  addedAt: number;
}

export interface HistoryItem {
  videoId: string;
  title?: string;
  url: string;
  watchedAt: number;
  lastPosition: number;
}

export interface ClaudeTubeState {
  videoId: string | null;
  currentTime: number;
  volume: number;
  muted: boolean;
  layout: LayoutMode;
  playbackRate: number;
  miniOpacity: number;
  queue: QueueItem[];
  history: HistoryItem[];
  isPlaying: boolean;
  title?: string;
}

export type AgentAction =
  | { action: "play"; url?: string; videoId?: string }
  | { action: "enqueue"; url?: string; videoId?: string }
  | { action: "toggle" }
  | { action: "show" }
  | { action: "clearQueue" }
  | { action: "setLayout"; layout: LayoutMode }
  | { action: "setPlaybackRate"; rate: number };

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "stateChanged"; state: Partial<ClaudeTubeState> }
  | { type: "requestState" }
  | { type: "playUrl"; url: string }
  | { type: "playVideoId"; videoId: string }
  | { type: "enqueue"; url: string }
  | { type: "removeFromQueue"; videoId: string }
  | { type: "clearQueue" }
  | { type: "openExternal"; url: string }
  | { type: "showInfo"; message: string };

export type ExtensionToWebviewMessage =
  | { type: "init"; state: ClaudeTubeState; config: WebviewConfig }
  | { type: "play"; videoId: string; url?: string; title?: string }
  | { type: "enqueue"; videoId: string; url: string; title?: string }
  | { type: "togglePlay" }
  | { type: "clearQueue" }
  | { type: "setLayout"; layout: LayoutMode }
  | { type: "setPlaybackRate"; rate: number }
  | { type: "theme"; kind: "dark" | "light" | "highContrast" };

export interface WebviewConfig {
  autoplay: boolean;
  defaultLayout: LayoutMode;
  defaultPlaybackRate: number;
  miniOpacity: number;
}

export const DEFAULT_STATE: ClaudeTubeState = {
  videoId: null,
  currentTime: 0,
  volume: 80,
  muted: false,
  layout: "compact",
  playbackRate: 1,
  miniOpacity: 1,
  queue: [],
  history: [],
  isPlaying: false,
};
