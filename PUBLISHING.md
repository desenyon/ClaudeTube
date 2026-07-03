# Publishing ClaudeTube

## GitHub Releases

Automatic on tag push (`v*`):

```bash
git tag -a v2.0.0 -m "ClaudeTube v2.0.0"
git push origin v2.0.0
```

The [Release workflow](.github/workflows/release.yml) builds the VSIX and creates a GitHub Release.

## Visual Studio Marketplace

### One-time setup

1. **Create a publisher** (if needed): https://marketplace.visualstudio.com/manage/createpublisher  
   - Publisher ID: `desenyon` (must match `extension/package.json`)

2. **Create a Personal Access Token**: https://dev.azure.com/  
   - User Settings → Personal access tokens → New Token  
   - Organization: **All accessible organizations**  
   - Scopes: **Marketplace** → **Manage**

3. **Add the token to GitHub** (for automated releases):

```bash
gh secret set VSCE_PAT --repo desenyon/ClaudeTube
# paste your Azure DevOps PAT when prompted
```

4. **Re-run the Release workflow** or push a new tag — it will publish to the Marketplace automatically.

### Manual publish

```bash
npm run build
npm run package
cd extension
npx vsce publish --no-dependencies -p YOUR_AZURE_DEVOPS_PAT
```

### Install from Marketplace

After publishing, search **ClaudeTube** in Cursor/VS Code Extensions, or visit:

https://marketplace.visualstudio.com/items?itemName=desenyon.claudetube
