import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ClaudeTubeState,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "./types";
import { parseYouTubeUrl } from "./parseYouTubeUrl";
import {
  isAllowedYouTubeHttpUrl,
  isWebviewMessage,
  sanitizeInfoMessage,
} from "./security";
import { StateStore } from "./state";

export class ClaudeTubeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "claudetube.player";
  private view: vscode.WebviewView | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly stateStore: StateStore
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
      await this.handleWebviewMessage(message);
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
    });
  }

  async sendMessage(message: ExtensionToWebviewMessage): Promise<void> {
    await this.view?.webview.postMessage(message);
  }

  async play(videoId: string, url: string, title?: string): Promise<void> {
    await this.stateStore.updateState({ videoId, title, isPlaying: true });
    await this.sendMessage({ type: "play", videoId, url, title });
  }

  async enqueue(videoId: string, url: string, title?: string): Promise<void> {
    const state = this.stateStore.getState();
    const queue = [
      ...state.queue,
      { videoId, url, title, addedAt: Date.now() },
    ];
    await this.stateStore.updateState({ queue });
    await this.sendMessage({ type: "enqueue", videoId, url, title });
  }

  async togglePlay(): Promise<void> {
    const state = this.stateStore.getState();
    await this.stateStore.updateState({ isPlaying: !state.isPlaying });
    await this.sendMessage({ type: "togglePlay" });
  }

  async clearQueue(): Promise<void> {
    await this.stateStore.updateState({ queue: [] });
    await this.sendMessage({ type: "clearQueue" });
  }

  private async pushInitState(): Promise<void> {
    const state = this.mergeConfigDefaults(this.stateStore.getState());
    await this.sendMessage({
      type: "init",
      state,
      config: this.stateStore.getConfig(),
    });
  }

  private mergeConfigDefaults(state: ClaudeTubeState): ClaudeTubeState {
    const config = this.stateStore.getConfig();
    return {
      ...state,
      layout: state.layout ?? config.defaultLayout,
      playbackRate: state.playbackRate || config.defaultPlaybackRate,
      miniOpacity: state.miniOpacity || config.miniOpacity,
    };
  }

  private async handleWebviewMessage(
    message: WebviewToExtensionMessage
  ): Promise<void> {
    if (!isWebviewMessage(message)) {
      return;
    }

    switch (message.type) {
      case "ready":
      case "requestState":
        await this.pushInitState();
        break;
      case "stateChanged":
        await this.stateStore.updateState(message.state);
        break;
      case "openExternal":
        if (isAllowedYouTubeHttpUrl(message.url)) {
          await vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      case "showInfo":
        void vscode.window.showInformationMessage(sanitizeInfoMessage(message.message));
        break;
      case "playUrl": {
        const parsed = parseYouTubeUrl(message.url);
        if (parsed) {
          await this.play(parsed.videoId, parsed.url);
        }
        break;
      }
      case "enqueue": {
        const parsed = parseYouTubeUrl(message.url);
        if (parsed) {
          await this.enqueue(parsed.videoId, parsed.url);
        }
        break;
      }
      case "clearQueue":
        await this.clearQueue();
        break;
      default:
        break;
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const mediaPath = path.join(this.extensionUri.fsPath, "media", "index.html");
    if (!fs.existsSync(mediaPath)) {
      return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:16px;">
        <p>ClaudeTube webview not built yet.</p>
        <p>Run <code>npm run build</code> in the project root.</p>
      </body></html>`;
    }

    const html = fs.readFileSync(mediaPath, "utf8");
    const cspSource = webview.cspSource;
    const csp = [
      `default-src 'none'`,
      `img-src ${cspSource} https: data:`,
      `style-src ${cspSource} 'unsafe-inline'`,
      `script-src ${cspSource} 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com`,
      `frame-src https://www.youtube.com https://www.youtube-nocookie.com`,
      `font-src ${cspSource}`,
      `connect-src https://www.youtube.com https://s.ytimg.com`,
    ].join("; ");

    return html.replace(
      "<head>",
      `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
    );
  }
}
