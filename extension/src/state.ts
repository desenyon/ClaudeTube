import * as vscode from "vscode";
import type { ClaudeTubeState, WebviewConfig } from "./types";
import { DEFAULT_STATE } from "./types";

const STATE_KEY = "claudetube.state";

export class StateStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getState(): ClaudeTubeState {
    const stored = this.context.globalState.get<Partial<ClaudeTubeState>>(STATE_KEY, {});
    return {
      ...DEFAULT_STATE,
      ...stored,
      queue: stored.queue ?? [],
      history: stored.history ?? [],
      playlistId: stored.playlistId ?? null,
      shuffle: stored.shuffle ?? false,
      repeat: stored.repeat ?? "off",
    };
  }

  async updateState(partial: Partial<ClaudeTubeState>): Promise<ClaudeTubeState> {
    const next = { ...this.getState(), ...partial };
    await this.context.globalState.update(STATE_KEY, next);
    return next;
  }

  getConfig(): WebviewConfig {
    const config = vscode.workspace.getConfiguration("claudetube");
    return {
      autoplay: config.get<boolean>("autoplay", true),
      defaultLayout: config.get("defaultLayout", "compact"),
      defaultPlaybackRate: config.get<number>("defaultPlaybackRate", 1),
      miniOpacity: config.get<number>("miniOpacity", 1),
    };
  }
}

export async function showClaudeTubePanel(): Promise<void> {
  await vscode.commands.executeCommand("workbench.view.extension.claudetube");
  await vscode.commands.executeCommand("claudetube.player.focus");
}
