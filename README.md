# FLIXTV

FLIXTV is a lightweight movie and TV catalogue for LG webOS, desktop browsers, and mobile browsers.

## Versions

- `apps/webos/application`: LG webOS TV app.
- `apps/web`: responsive web app for desktop and mobile, deployed through GitHub Pages.
- The catalogue and title metadata are powered by TMDB.
- Playback opens the title's YapGrid embed. FLIXTV does not host video files.

## Mobile / web

The public web app is deployed at:

`https://leonbojni23-cloud.github.io/flixtv/`

On first open, choose Settings and enter your TMDB v3 API key. The key is saved in local storage on that browser only; it is not stored in this repository. On iPhone or Android, use the browser's Add to Home Screen option for an app-like shortcut.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys `apps/web` on pushes to `main`.

If Pages has not been enabled yet, open the repository's **Settings → Pages** and select **GitHub Actions** under Build and deployment. Then rerun the latest workflow from the Actions tab.

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## LG webOS

The TV app uses the same TMDB catalogue and YapGrid embed player. Configure your TMDB key in the local, gitignored `apps/webos/application/keys.js` file. Never commit private API keys.

For webOS packaging, use the webOS CLI tools documented in `apps/webos/application/README.md`.
