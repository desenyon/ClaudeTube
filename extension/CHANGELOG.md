# Changelog

## 2.0.0

### Added
- Status bar now-playing indicator
- Agent status file (`.claudetube/status.json`) for read-back by Claude
- Video metadata via YouTube oEmbed (titles + thumbnails)
- Thumbnails in queue and history
- Playlist URL support
- Shuffle and repeat modes (off / one / all)
- Skip next, keyboard shortcuts in sidebar (Space, Shift+N)
- Clickable YouTube links in editor open in ClaudeTube
- Context menu: Play URL at Cursor
- History search
- Theme sync (dark / light / high contrast)
- New agent actions: `next`, `skip`, `mute`, `seek`
- CI workflow (build, lint, test, package)

### Improved
- Redesigned sidebar UI with cards, loading states, and polish
- Security validation for new agent actions
- History limit increased to 50 videos

## 1.0.0

- Initial release: sidebar player, queue, history, agent inbox
