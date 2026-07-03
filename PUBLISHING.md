# Publishing ClaudeTube

Based on the [official VS Code publishing docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Checklist (Marketplace requirements)

| Requirement | Status |
|-------------|--------|
| `publisher` in `package.json` | `desenyon` |
| Unique extension `name` | `claudetube` → ID `desenyon.claudetube` |
| PNG icon ≥128×128 (no SVG) | `extension/media/icon.png` |
| `LICENSE` in extension root | `extension/LICENSE` |
| `README.md` in extension root | `extension/README.md` |
| `CHANGELOG.md` in extension root | `extension/CHANGELOG.md` |
| `galleryBanner.color` | `#1e1e1e` |
| `pricing: "Free"` | set |
| `keywords` ≤ 30 | 6 |
| HTTPS image URLs in README | yes |

## GitHub Releases

Tag push triggers [.github/workflows/release.yml](.github/workflows/release.yml):

```bash
git tag -a v2.0.0 -m "ClaudeTube v2.0.0"
git push origin v2.0.0
```

Latest release: https://github.com/desenyon/ClaudeTube/releases

---

## Visual Studio Marketplace

### Step 1 — Create a Personal Access Token

1. Go to https://dev.azure.com/ (create an org if needed)
2. User settings → **Personal access tokens** → **New Token**
3. **Organizations:** `All accessible organizations` (required — a single org causes 403)
4. **Scopes:** Show all scopes → **Marketplace** → **Manage**
5. Copy the token

> **Note:** Global PATs retire **December 1, 2026**. For long-term CI, Microsoft recommends [Entra ID workload identity federation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace) with `vsce publish --azure-credential`.

### Step 2 — Create publisher

1. https://marketplace.visualstudio.com/manage
2. **Create publisher**
3. **ID:** `desenyon` (must match `package.json`, cannot change later)
4. **Name:** display name shown in Marketplace

### Step 3 — Login with vsce

```bash
cd extension
npx vsce login desenyon
# paste PAT when prompted
```

Expected output:
```
The Personal Access Token verification succeeded for the publisher 'desenyon'.
```

### Step 4 — Publish

**Option A — CLI (recommended)**

```bash
# from repo root
npm run build
cd extension
npx vsce publish --no-dependencies
```

**Option B — Manual upload**

```bash
npm run package
```

Upload `extension/claudetube-2.0.0.vsix` at https://marketplace.visualstudio.com/manage/publishers/

**Option C — GitHub Actions (automated)**

```bash
gh secret set VSCE_PAT --repo desenyon/ClaudeTube
# paste PAT, then push a new tag or re-run Release workflow
```

### After publish

- Marketplace URL: https://marketplace.visualstudio.com/items?itemName=desenyon.claudetube
- Install in Cursor/VS Code: search **ClaudeTube** in Extensions

### Troubleshooting (from docs)

| Error | Fix |
|-------|-----|
| 403 / 401 on publish | PAT must use **All accessible organizations** + **Marketplace (Manage)** scope |
| SVG icon rejected | Use PNG only (`media/icon.png`) |
| Extension name exists | Names are unique and permanent once published |

---

## Local install (without Marketplace)

```bash
# Cursor
"/Applications/Cursor.app/Contents/Resources/app/bin/cursor" --install-extension extension/claudetube-2.0.0.vsix
```

Or: Extensions → `...` → **Install from VSIX**
