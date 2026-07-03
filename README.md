<p align="center">
  <img src="extension/media/icon.svg" width="80" alt="ClaudeTube" />
</p>

<h1 align="center">ClaudeTube</h1>

<p align="center">
  <strong>YouTube in your Cursor sidebar. Zero tab switching. Agent-controlled.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://github.com/desenyon/ClaudeTube/actions"><img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white" alt="CI" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node" /></a>
  <a href="https://cursor.com"><img src="https://img.shields.io/badge/built%20for-Cursor-000000" alt="Cursor" /></a>
  <img src="https://img.shields.io/badge/version-2.0.0-0078d4" alt="Version" />
</p>

<p align="center">
  Watch tutorials, talks, and music while you code with Claude — embedded in a sidebar, with queue, thumbnails, status bar, and full agent API.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="#agent-integration">Agent API</a> ·
  <a href="#development">Development</a>
</p>

---

## Quick start

```bash
git clone https://github.com/desenyon/ClaudeTube.git
cd ClaudeTube
npm install
npm run build
npm run package
```

**Install:** Cursor → Extensions → `...` → **Install from VSIX** → `extension/claudetube-extension-2.0.0.vsix`

**Use:** Reload window → click **ClaudeTube** in the activity bar → paste a URL → **Play**

Or press **F5** to develop with the Extension Development Host.

---

## Features

### Player
- Sidebar YouTube player (IFrame API) with **Compact**, **Theater**, and **Mini** layouts
- Paste any URL: watch, youtu.be, Shorts, live, or **playlist**
- Auto-fetch **titles and thumbnails** (oEmbed)
- Resume position, seek, speed (0.5x–2x), volume, mute
- **Shuffle** and **repeat** (off / one / all)
- Loading states and embed-fallback to browser

### Queue & history
- Queue with auto-advance, skip, and manual next
- **50-video history** with search and resume
- Thumbnail previews in lists

### IDE integration
- **Status bar** now-playing indicator
- **Click YouTube links** in editor to play
- Context menu: **Play URL at Cursor**
- Theme-aware UI (dark / light / high contrast)

### Agent-ready
- Write commands to `.claudetube/inbox.json`
- Read state from `.claudetube/status.json`
- Shell script + Cursor rule included

```
┌────────────────────────────────────────────────────────────────┐
│  Cursor                                                        │
│  ┌──────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │ Explorer │  │  Code + Claude chat  │  │   ClaudeTube    │  │
│  │          │  │                      │  │  ┌───────────┐  │  │
│  │          │  │                      │  │  │  ▶ Video  │  │  │
│  │          │  │                      │  │  └───────────┘  │  │
│  └──────────┘  └──────────────────────┘  │  Now playing…   │  │
│  Status bar: ▶ Tutorial title…          └─────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+Y` | Toggle play/pause |
| `Cmd+Shift+0` | Show ClaudeTube sidebar |
| `Cmd+Shift+.` | Play next in queue |
| `Space` | Play/pause (when sidebar focused) |
| `Shift+N` | Skip to next |

---

## Agent integration

### Send commands

```json
{ "action": "play", "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

```bash
./scripts/claudetube-agent.sh play "https://www.youtube.com/watch?v=VIDEO_ID"
./scripts/claudetube-agent.sh next
./scripts/claudetube-agent.sh seek 120
./scripts/claudetube-agent.sh layout mini
```

### Read status

```json
// .claudetube/status.json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "isPlaying": true,
  "currentTime": 42,
  "queueLength": 3,
  "layout": "mini"
}
```

<details>
<summary><strong>All inbox actions</strong></summary>

| Action | Payload |
|--------|---------|
| Play | `{ "action": "play", "url": "..." }` |
| Enqueue | `{ "action": "enqueue", "url": "..." }` |
| Next | `{ "action": "next" }` |
| Toggle | `{ "action": "toggle" }` |
| Mute | `{ "action": "mute" }` |
| Seek | `{ "action": "seek", "seconds": 120 }` |
| Show | `{ "action": "show" }` |
| Clear queue | `{ "action": "clearQueue" }` |
| Layout | `{ "action": "setLayout", "layout": "mini" }` |
| Speed | `{ "action": "setPlaybackRate", "rate": 1.5 }` |

</details>

---

## Commands

| Command | Description |
|---------|-------------|
| ClaudeTube: Play URL | Play from palette or argument |
| ClaudeTube: Play URL at Cursor | Play selected YouTube link |
| ClaudeTube: Add to Queue | Queue without interrupting |
| ClaudeTube: Play Next in Queue | Skip to next |
| ClaudeTube: Toggle Play/Pause | Toggle playback |
| ClaudeTube: Copy Current Video URL | Copy to clipboard |
| ClaudeTube: Show Player | Focus sidebar |

---

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `claudetube.defaultLayout` | `compact` | Default layout |
| `claudetube.defaultPlaybackRate` | `1` | Default speed |
| `claudetube.miniOpacity` | `1` | Mini player opacity |
| `claudetube.autoplay` | `true` | Autoplay new videos |
| `claudetube.agentInboxEnabled` | `true` | Watch agent inbox |
| `claudetube.showStatusBar` | `true` | Status bar indicator |

---

## Development

```bash
npm run build      # Build webview + extension
npm run watch      # Watch mode
npm test           # Unit + security tests
npm run package    # Create .vsix
```

### Project structure

```
ClaudeTube/
├── extension/          # VS Code / Cursor extension host
├── webview/            # React sidebar UI
├── scripts/            # Agent CLI
├── .github/workflows/  # CI
└── .cursor/rules/      # Agent rules for Cursor
```

---

## Security

- HTTPS-only YouTube URLs
- Validated agent inbox (size limits, action allowlist)
- Safe external URL opening (YouTube hosts only)
- Sanitized webview messages

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) — [desenyon](https://github.com/desenyon)
