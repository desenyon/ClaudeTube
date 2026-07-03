import * as vscode from "vscode";
import { AgentInboxWatcher, writeAgentInboxExample } from "./agentInbox";
import { ClaudeTubeViewProvider } from "./ClaudeTubeViewProvider";
import { parseYouTubeUrl, resolveVideoInput, extractYouTubeUrls } from "./parseYouTubeUrl";
import { showClaudeTubePanel, StateStore } from "./state";
import type { AgentAction, ClaudeTubeState } from "./types";
import { clampPlaybackRate } from "./security";
import { fetchVideoMetadata } from "./metadata";
import { StatusWriter, formatStatusBarLabel } from "./statusWriter";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const stateStore = new StateStore(context);
  const statusWriter = new StatusWriter();
  context.subscriptions.push(statusWriter);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = "claudetube.show";
  statusBar.tooltip = "ClaudeTube — click to open player";
  context.subscriptions.push(statusBar);

  const updateStatusBar = (state: ClaudeTubeState): void => {
    statusBar.text = formatStatusBarLabel(state);
    statusBar.show();
  };

  const provider = new ClaudeTubeViewProvider(
    context.extensionUri,
    stateStore,
    statusWriter,
    updateStatusBar
  );

  updateStatusBar(stateStore.getState());

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ClaudeTubeViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      provider.sendTheme(theme.kind);
    })
  );

  const handleAgentAction = async (action: AgentAction): Promise<void> => {
    switch (action.action) {
      case "play": {
        const parsed = resolveVideoInput(action.url, action.videoId);
        if (!parsed) {
          void vscode.window.showErrorMessage("ClaudeTube: invalid play request");
          return;
        }
        await showClaudeTubePanel();
        await provider.playFromParsed(parsed);
        break;
      }
      case "enqueue": {
        const parsed = resolveVideoInput(action.url, action.videoId);
        if (!parsed?.videoId) {
          void vscode.window.showErrorMessage("ClaudeTube: invalid enqueue request");
          return;
        }
        const meta = await fetchVideoMetadata(parsed.videoId, parsed.url);
        await provider.enqueue(
          parsed.videoId,
          parsed.url,
          action.title ?? meta.title,
          meta.thumbnailUrl
        );
        break;
      }
      case "toggle":
        await provider.togglePlay();
        break;
      case "show":
        await showClaudeTubePanel();
        break;
      case "clearQueue":
        await provider.clearQueue();
        break;
      case "next":
      case "skip":
        await provider.next();
        break;
      case "mute": {
        const state = stateStore.getState();
        const muted = !state.muted;
        await stateStore.updateState({ muted });
        await provider.sendMessage({ type: "setMuted", muted });
        break;
      }
      case "seek":
        await stateStore.updateState({ currentTime: action.seconds });
        await provider.sendMessage({ type: "seek", seconds: action.seconds });
        break;
      case "setLayout":
        if (action.layout === "compact" || action.layout === "theater" || action.layout === "mini") {
          await provider.sendMessage({ type: "setLayout", layout: action.layout });
          await stateStore.updateState({ layout: action.layout });
        }
        break;
      case "setPlaybackRate": {
        const rate = clampPlaybackRate(action.rate);
        if (rate === null) {
          return;
        }
        await provider.sendMessage({ type: "setPlaybackRate", rate });
        await stateStore.updateState({ playbackRate: rate });
        break;
      }
      default:
        break;
    }
  };

  const inboxWatcher = new AgentInboxWatcher(handleAgentAction);
  inboxWatcher.start();
  context.subscriptions.push(inboxWatcher);

  if (vscode.workspace.workspaceFolders?.[0]) {
    writeAgentInboxExample(vscode.workspace.workspaceFolders[0].uri.fsPath);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("claudetube.show", async () => {
      await showClaudeTubePanel();
    }),

    vscode.commands.registerCommand("claudetube.playUrl", async (url?: string) => {
      const input =
        url ??
        (await vscode.window.showInputBox({
          prompt: "YouTube URL or video ID",
          placeHolder: "https://www.youtube.com/watch?v=...",
        }));

      if (!input) {
        return;
      }

      const parsed = parseYouTubeUrl(input);
      if (!parsed) {
        void vscode.window.showErrorMessage("ClaudeTube: invalid YouTube URL");
        return;
      }

      await showClaudeTubePanel();
      await provider.playFromParsed(parsed);
    }),

    vscode.commands.registerCommand("claudetube.playUrlAtCursor", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const text = editor.document.getText(editor.selection);
      const urls = extractYouTubeUrls(text);
      const input = urls[0] ?? text.trim();
      const parsed = parseYouTubeUrl(input);
      if (!parsed) {
        void vscode.window.showErrorMessage("ClaudeTube: no valid YouTube URL in selection");
        return;
      }
      await showClaudeTubePanel();
      await provider.playFromParsed(parsed);
    }),

    vscode.commands.registerCommand("claudetube.playVideoId", async (videoId?: string) => {
      const input =
        videoId ??
        (await vscode.window.showInputBox({
          prompt: "YouTube video ID",
          placeHolder: "dQw4w9WgXcQ",
        }));

      if (!input) {
        return;
      }

      const parsed = parseYouTubeUrl(input);
      if (!parsed) {
        void vscode.window.showErrorMessage("ClaudeTube: invalid video ID");
        return;
      }

      await showClaudeTubePanel();
      await provider.playFromParsed(parsed);
    }),

    vscode.commands.registerCommand("claudetube.enqueue", async (url?: string) => {
      const input =
        url ??
        (await vscode.window.showInputBox({
          prompt: "YouTube URL to queue",
        }));

      if (!input) {
        return;
      }

      const parsed = parseYouTubeUrl(input);
      if (!parsed?.videoId) {
        void vscode.window.showErrorMessage("ClaudeTube: invalid YouTube URL");
        return;
      }

      const meta = await fetchVideoMetadata(parsed.videoId, parsed.url);
      await provider.enqueue(parsed.videoId, parsed.url, meta.title, meta.thumbnailUrl);
      void vscode.window.showInformationMessage("ClaudeTube: added to queue");
    }),

    vscode.commands.registerCommand("claudetube.togglePlay", async () => {
      await provider.togglePlay();
    }),

    vscode.commands.registerCommand("claudetube.next", async () => {
      await provider.next();
    }),

    vscode.commands.registerCommand("claudetube.clearQueue", async () => {
      await provider.clearQueue();
      void vscode.window.showInformationMessage("ClaudeTube: queue cleared");
    }),

    vscode.commands.registerCommand("claudetube.copyCurrentUrl", async () => {
      const state = stateStore.getState();
      if (!state.videoId) {
        void vscode.window.showWarningMessage("ClaudeTube: nothing playing");
        return;
      }
      const url = `https://www.youtube.com/watch?v=${state.videoId}`;
      await vscode.env.clipboard.writeText(url);
      void vscode.window.showInformationMessage("ClaudeTube: URL copied");
    })
  );

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        void handleUriCommand(uri, handleAgentAction);
      },
    }),

    vscode.languages.registerDocumentLinkProvider(
      { scheme: "file" },
      {
        provideDocumentLinks(document) {
          const links: vscode.DocumentLink[] = [];
          const text = document.getText();
          for (const url of extractYouTubeUrls(text)) {
            const index = text.indexOf(url);
            if (index === -1) {
              continue;
            }
            const start = document.positionAt(index);
            const end = document.positionAt(index + url.length);
            const link = new vscode.DocumentLink(
              new vscode.Range(start, end),
              vscode.Uri.parse(`command:claudetube.playUrl?${encodeURIComponent(JSON.stringify([url]))}`)
            );
            link.tooltip = "Play in ClaudeTube";
            links.push(link);
          }
          return links;
        },
      }
    )
  );
}

export function deactivate(): void {
  // no-op
}

async function handleUriCommand(
  uri: vscode.Uri,
  onAction: (action: AgentAction) => Promise<void>
): Promise<void> {
  const path = uri.path.replace(/^\//, "");
  const params = new URLSearchParams(uri.query);

  if (path === "play") {
    const url = params.get("url") ?? undefined;
    const videoId = params.get("v") ?? params.get("videoId") ?? undefined;
    await onAction({ action: "play", url, videoId });
    return;
  }

  if (path === "enqueue") {
    const url = params.get("url") ?? undefined;
    const videoId = params.get("v") ?? params.get("videoId") ?? undefined;
    await onAction({ action: "enqueue", url, videoId });
  }
}
