import * as vscode from "vscode";
import { AgentInboxWatcher, writeAgentInboxExample } from "./agentInbox";
import { ClaudeTubeViewProvider } from "./ClaudeTubeViewProvider";
import { parseYouTubeUrl, resolveVideoInput } from "./parseYouTubeUrl";
import { showClaudeTubePanel, StateStore } from "./state";
import type { AgentAction } from "./types";
import { clampPlaybackRate } from "./security";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const stateStore = new StateStore(context);
  const provider = new ClaudeTubeViewProvider(context.extensionUri, stateStore);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ClaudeTubeViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
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
        await provider.play(parsed.videoId, parsed.url, action.title);
        break;
      }
      case "enqueue": {
        const parsed = resolveVideoInput(action.url, action.videoId);
        if (!parsed) {
          void vscode.window.showErrorMessage("ClaudeTube: invalid enqueue request");
          return;
        }
        await provider.enqueue(parsed.videoId, parsed.url, action.title);
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
        await provider.sendMessage({
          type: "setPlaybackRate",
          rate,
        });
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
      await provider.play(parsed.videoId, parsed.url);
    }),

    vscode.commands.registerCommand(
      "claudetube.playVideoId",
      async (videoId?: string) => {
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
        await provider.play(parsed.videoId, parsed.url);
      }
    ),

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
      if (!parsed) {
        void vscode.window.showErrorMessage("ClaudeTube: invalid YouTube URL");
        return;
      }

      await provider.enqueue(parsed.videoId, parsed.url);
      void vscode.window.showInformationMessage("ClaudeTube: added to queue");
    }),

    vscode.commands.registerCommand("claudetube.togglePlay", async () => {
      await provider.togglePlay();
    }),

    vscode.commands.registerCommand("claudetube.clearQueue", async () => {
      await provider.clearQueue();
      void vscode.window.showInformationMessage("ClaudeTube: queue cleared");
    })
  );

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        void handleUriCommand(uri, handleAgentAction);
      },
    })
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
