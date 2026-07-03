import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ClaudeTubeState,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "./types";
import { parseYouTubeUrl, buildYouTubeUrl } from "./parseYouTubeUrl";
import {
  isAllowedYouTubeHttpUrl,
  isWebviewMessage,
  sanitizeClipboardText,
  sanitizeInfoMessage,
} from "./security";
import { StateStore } from "./state";
import { fetchVideoMetadata } from "./metadata";
import { StatusWriter } from "./statusWriter";

export class ClaudeTubeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "claudetube.player";
  private view: vscode.WebviewView | undefined;
  private lastDuration = 0;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly stateStore: StateStore,
    private readonly statusWriter: StatusWriter,
    private readonly onStateChange?: (state: ClaudeTubeState) => void
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

    void this.pushInitState();
    this.sendTheme(vscode.window.activeColorTheme.kind);
  }

  async sendMessage(message: ExtensionToWebviewMessage): Promise<void> {
    await this.view?.webview.postMessage(message);
  }

  async play(
    videoId: string | null,
    url: string,
    options?: { title?: string; thumbnailUrl?: string; playlistId?: string | null }
  ): Promise<void> {
    await this.stateStore.updateState({
      videoId,
      playlistId: options?.playlistId ?? null,
      title: options?.title,
      thumbnailUrl: options?.thumbnailUrl,
      isPlaying: true,
    });
    if (videoId) {
      await this.sendMessage({
        type: "play",
        videoId,
        playlistId: options?.playlistId,
        url,
        title: options?.title,
        thumbnailUrl: options?.thumbnailUrl,
      });
    }
    this.syncExternalState();
  }

  async enqueue(
    videoId: string,
    url: string,
    title?: string,
    thumbnailUrl?: string
  ): Promise<void> {
    const state = this.stateStore.getState();
    const queue = [
      ...state.queue,
      { videoId, url, title, thumbnailUrl, addedAt: Date.now() },
    ];
    await this.stateStore.updateState({ queue });
    await this.sendMessage({ type: "enqueue", videoId, url, title, thumbnailUrl });
    this.syncExternalState();
  }

  async togglePlay(): Promise<void> {
    const state = this.stateStore.getState();
    await this.stateStore.updateState({ isPlaying: !state.isPlaying });
    await this.sendMessage({ type: "togglePlay" });
    this.syncExternalState();
  }

  async next(): Promise<void> {
    await this.sendMessage({ type: "next" });
  }

  async clearQueue(): Promise<void> {
    await this.stateStore.updateState({ queue: [] });
    await this.sendMessage({ type: "clearQueue" });
    this.syncExternalState();
  }

  sendTheme(kind: vscode.ColorThemeKind): void {
    const theme =
      kind === vscode.ColorThemeKind.Light
        ? "light"
        : kind === vscode.ColorThemeKind.HighContrast
          ? "highContrast"
          : "dark";
    void this.sendMessage({ type: "theme", kind: theme });
  }

  private syncExternalState(): void {
    const state = this.stateStore.getState();
    this.statusWriter.write(state, this.lastDuration);
    this.onStateChange?.(state);
  }

  private async pushInitState(): Promise<void> {
    const state = this.mergeConfigDefaults(this.stateStore.getState());
    await this.sendMessage({
      type: "init",
      state,
      config: this.stateStore.getConfig(),
    });
    this.syncExternalState();
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

  private async handleWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
    if (!isWebviewMessage(message)) {
      return;
    }

    switch (message.type) {
      case "ready":
      case "requestState":
        await this.pushInitState();
        break;
      case "stateChanged": {
        const next = await this.stateStore.updateState(message.state);
        if (typeof message.state.currentTime === "number") {
          this.lastDuration = message.state.currentTime;
        }
        this.syncExternalState();
        if (next.videoId && !next.title && message.state.videoId) {
          void this.enrichMetadata(next.videoId, next.playlistId ? buildYouTubeUrl(next.videoId, undefined, next.playlistId) : undefined);
        }
        break;
      }
      case "requestMetadata":
        await this.enrichMetadata(message.videoId, message.url);
        break;
      case "openExternal":
        if (isAllowedYouTubeHttpUrl(message.url)) {
          await vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      case "copyToClipboard":
        await vscode.env.clipboard.writeText(sanitizeClipboardText(message.text));
        void vscode.window.showInformationMessage("ClaudeTube: copied to clipboard");
        break;
      case "showInfo":
        void vscode.window.showInformationMessage(sanitizeInfoMessage(message.message));
        break;
      case "playUrl": {
        const parsed = parseYouTubeUrl(message.url);
        if (parsed) {
          await this.playFromParsed(parsed);
        }
        break;
      }
      case "enqueue": {
        const parsed = parseYouTubeUrl(message.url);
        if (parsed?.videoId) {
          const meta = await fetchVideoMetadata(parsed.videoId, parsed.url);
          await this.enqueue(parsed.videoId, parsed.url, meta.title, meta.thumbnailUrl);
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

  async playFromParsed(parsed: ReturnType<typeof parseYouTubeUrl>): Promise<void> {
    if (!parsed) {
      return;
    }
    if (parsed.videoId) {
      const meta = await fetchVideoMetadata(parsed.videoId, parsed.url);
      await this.play(parsed.videoId, parsed.url, {
        title: meta.title,
        thumbnailUrl: meta.thumbnailUrl,
        playlistId: parsed.playlistId ?? null,
      });
      return;
    }
    if (parsed.playlistId) {
      await this.stateStore.updateState({
        videoId: null,
        playlistId: parsed.playlistId,
        title: "Playlist",
        isPlaying: true,
      });
      await this.sendMessage({
        type: "play",
        videoId: "",
        playlistId: parsed.playlistId,
        url: parsed.url,
        title: "Playlist",
      });
      this.syncExternalState();
    }
  }

  private async enrichMetadata(videoId: string, url?: string): Promise<void> {
    const meta = await fetchVideoMetadata(videoId, url);
    await this.stateStore.updateState({
      title: meta.title,
      thumbnailUrl: meta.thumbnailUrl,
    });
    await this.sendMessage({
      type: "metadata",
      videoId,
      title: meta.title,
      thumbnailUrl: meta.thumbnailUrl,
    });
    this.syncExternalState();
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
      `connect-src https://www.youtube.com https://s.ytimg.com https://i.ytimg.com`,
    ].join("; ");

    return html.replace(
      "<head>",
      `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
    );
  }
}
