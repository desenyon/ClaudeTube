import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { AgentAction } from "./types";
import { validateInboxPayload } from "./security";

const INBOX_RELATIVE = ".claudetube/inbox.json";
const PROCESSED_RELATIVE = ".claudetube/inbox.processed.json";

export class AgentInboxWatcher implements vscode.Disposable {
  private watchers: vscode.FileSystemWatcher[] = [];
  private processing = false;

  constructor(
    private readonly onAction: (action: AgentAction) => Promise<void>
  ) {}

  start(): void {
    const enabled = vscode.workspace
      .getConfiguration("claudetube")
      .get<boolean>("agentInboxEnabled", true);

    if (!enabled) {
      return;
    }

    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const folder of folders) {
      const pattern = new vscode.RelativePattern(folder, INBOX_RELATIVE);
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidCreate(() => void this.processInbox(folder.uri.fsPath));
      watcher.onDidChange(() => void this.processInbox(folder.uri.fsPath));
      this.watchers.push(watcher);
      void this.processInbox(folder.uri.fsPath);
    }

    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      for (const folder of event.added) {
        const pattern = new vscode.RelativePattern(folder, INBOX_RELATIVE);
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate(() => void this.processInbox(folder.uri.fsPath));
        watcher.onDidChange(() => void this.processInbox(folder.uri.fsPath));
        this.watchers.push(watcher);
      }
    });
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
  }

  private async processInbox(workspaceRoot: string): Promise<void> {
    if (this.processing) {
      return;
    }

    const inboxPath = path.join(workspaceRoot, INBOX_RELATIVE);
    if (!fs.existsSync(inboxPath)) {
      return;
    }

    this.processing = true;
    try {
      const raw = fs.readFileSync(inboxPath, "utf8").trim();
      if (!raw) {
        return;
      }

      const actions = validateInboxPayload(raw);

      for (const item of actions) {
        await this.onAction(item);
      }

      const processedPath = path.join(workspaceRoot, PROCESSED_RELATIVE);
      fs.mkdirSync(path.dirname(processedPath), { recursive: true });
      fs.writeFileSync(
        processedPath,
        JSON.stringify({ processedAt: Date.now(), actions }, null, 2)
      );
      fs.writeFileSync(inboxPath, "");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`ClaudeTube agent inbox error: ${message}`);
    } finally {
      this.processing = false;
    }
  }
}

export function writeAgentInboxExample(workspaceRoot: string): void {
  const dir = path.join(workspaceRoot, ".claudetube");
  const examplePath = path.join(dir, "inbox.example.json");
  if (fs.existsSync(examplePath)) {
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    examplePath,
    JSON.stringify(
      [
        { action: "play", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { action: "enqueue", url: "https://youtu.be/VIDEO_ID" },
        { action: "toggle" },
        { action: "setLayout", layout: "mini" },
        { action: "setPlaybackRate", rate: 1.5 },
      ],
      null,
      2
    )
  );
}
