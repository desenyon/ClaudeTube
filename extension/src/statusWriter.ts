import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ClaudeTubeState, ClaudeTubeStatus } from "./types";
import { buildYouTubeUrl } from "./parseYouTubeUrl";

const STATUS_RELATIVE = ".claudetube/status.json";

export class StatusWriter implements vscode.Disposable {
  private writeTimer: ReturnType<typeof setTimeout> | undefined;

  write(state: ClaudeTubeState, duration?: number): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(() => {
      void this.flush(state, duration);
    }, 400);
  }

  dispose(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
  }

  private async flush(state: ClaudeTubeState, duration?: number): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return;
    }

    const status: ClaudeTubeStatus = {
      updatedAt: Date.now(),
      videoId: state.videoId,
      playlistId: state.playlistId,
      title: state.title,
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      duration,
      queueLength: state.queue.length,
      layout: state.layout,
      playbackRate: state.playbackRate,
      url: state.videoId ? buildYouTubeUrl(state.videoId, state.currentTime, state.playlistId ?? undefined) : undefined,
    };

    const statusPath = path.join(folder.uri.fsPath, STATUS_RELATIVE);
    try {
      fs.mkdirSync(path.dirname(statusPath), { recursive: true });
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    } catch {
      // Non-fatal: status file is optional telemetry for agents
    }
  }
}

export function formatStatusBarLabel(state: ClaudeTubeState): string {
  if (!state.videoId) {
    return "ClaudeTube";
  }
  const icon = state.isPlaying ? "$(play)" : "$(debug-pause)";
  const title = state.title ?? state.videoId;
  const short = title.length > 28 ? `${title.slice(0, 28)}…` : title;
  return `${icon} ${short}`;
}
