<p align="center">
  <img src="extension/media/icon.svg" width="72" alt="ClaudeTube" />
</p>

<h1 align="center">ClaudeTube</h1>

<p align="center">
  <strong>YouTube in your Cursor sidebar. Zero tab switching.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node" /></a>
  <a href="https://cursor.com"><img src="https://img.shields.io/badge/built%20for-Cursor-000000" alt="Built for Cursor" /></a>
</p>

<p align="center">
  Watch tutorials, talks, and lo-fi beats while you code with Claude — embedded in a sidebar panel, controlled by keyboard shortcuts, and drivable by your agent.
</p>

---

## Why ClaudeTube?

You're pair-programming with Claude. A video would help. But switching to a browser tab breaks flow.

ClaudeTube keeps YouTube inside Cursor:

- **Sidebar player** — always visible beside your editor
- **Paste and play** — any YouTube URL, short link, Shorts, or live stream
- **Queue and history** — line up tutorials, resume where you left off
- **Agent-ready** — Claude can start videos for you via a simple inbox file

```
┌──────────────────────────────────────────────────────────────┐
│  Cursor                                                      │
│  ┌────────────┐  ┌─────────────────────┐  ┌──────────────┐ │
│  │  Explorer  │  │  Your code + Claude │  │  ClaudeTube  │ │
│  │            │  │                     │  │  ┌──────────┐  │ │
│  │            │  │                     │  │  │ ▶ Video  │  │ │
│  │            │  │                     │  │  └──────────┘  │ │
│  └────────────┘  └─────────────────────┘  │  [url bar]   │ │
│                                             └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Features

| | |
|---|---|
| **Layouts** | Compact, Theater, and Mini (with opacity control) |
| **Playback** | Speed 0.5x–2x, seek, volume, mute |
| **Queue** | Add videos, auto-advance on end |
| **History** | Last 30 videos with resume position |
| **Shortcuts** | `Cmd+Shift+Y` play/pause, `Cmd+Shift+0` focus player |
| **Agent API** | Inbox file, shell script, and palette commands |

## Quick start

### Install from source

```bash
git clone https://github.com/desenyon/ClaudeTube.git
cd ClaudeTube
npm install
npm run build
npm run package
```

Install the VSIX: **Cursor → Extensions → `...` → Install from VSIX** → select `extension/claudetube-extension-1.0.0.vsix`

Reload the window, click the **ClaudeTube** icon in the activity bar, paste a URL, hit **Play**.

### Develop

```bash
npm run watch   # rebuild on change
```

Press **F5** in Cursor to launch the Extension Development Host.

## Agent integration

Claude can control playback by writing to `.claudetube/inbox.json`:

```json
{ "action": "play", "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

Or use the helper script:

```bash
./scripts/claudetube-agent.sh play "https://www.youtube.com/watch?v=VIDEO_ID"
./scripts/claudetube-agent.sh layout mini
./scripts/claudetube-agent.sh speed 1.5
```

<details>
<summary><strong>All inbox actions</strong></summary>

| Action | Payload |
|--------|---------|
| Play | `{ "action": "play", "url": "..." }` |
| Enqueue | `{ "action": "enqueue", "url": "..." }` |
| Toggle | `{ "action": "toggle" }` |
| Show sidebar | `{ "action": "show" }` |
| Clear queue | `{ "action": "clearQueue" }` |
| Set layout | `{ "action": "setLayout", "layout": "mini" }` |
| Set speed | `{ "action": "setPlaybackRate", "rate": 1.5 }` |

</details>

## Commands

| Command | Description |
|---------|-------------|
| `ClaudeTube: Play URL` | Play a YouTube URL or video ID |
| `ClaudeTube: Add to Queue` | Queue without interrupting playback |
| `ClaudeTube: Toggle Play/Pause` | Toggle playback |
| `ClaudeTube: Show Player` | Focus the sidebar |
| `ClaudeTube: Clear Queue` | Empty the queue |

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `claudetube.defaultLayout` | `compact` | Default player layout |
| `claudetube.defaultPlaybackRate` | `1` | Default playback speed |
| `claudetube.miniOpacity` | `1` | Mini player opacity |
| `claudetube.autoplay` | `true` | Autoplay when loading a video |
| `claudetube.agentInboxEnabled` | `true` | Watch `.claudetube/inbox.json` |

## Project structure

```
ClaudeTube/
├── extension/       # VS Code / Cursor extension host
├── webview/         # React sidebar UI
├── scripts/         # Agent CLI helper
└── .cursor/rules/   # Cursor agent integration rules
```

## Scripts

```bash
npm run build      # Build webview + extension
npm run watch      # Watch mode for development
npm run test       # Run unit + security tests
npm run package    # Build and create .vsix
```

## Notes

- Some videos block embedding — use **Open in browser** in the player UI.
- Playback state persists in extension global storage.
- Agent inbox is workspace-scoped: `.claudetube/inbox.json`.

## License

[MIT](LICENSE)
