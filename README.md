# FLIXTV

FLIXTV is a streaming catalogue with separate implementations for LG webOS and responsive web/mobile.

## Applications

- `apps/webos/application`: dedicated LG webOS Smart TV application (HTML, CSS, vanilla JavaScript).
- `apps/webos/preview`: isolated preview server for testing the TV interface in a browser.
- `apps/web`: responsive desktop, mobile and PWA application.

The webOS and web applications are separate. Changes to the webOS app do not alter the responsive web/PWA interface.

## Catalogue and playback

- TMDB provides catalogue metadata, artwork, search and title details.
- The LG webOS app uses the CineSRC embed player.
- FLIXTV does not host video files.

## Mobile / web

The public web app is deployed at:

`https://leonbojni23-cloud.github.io/flixtv/`

On first open, choose Settings and enter your TMDB v3 API key. The key is saved in local storage on that browser only; it is not stored in this repository. On iPhone or Android, use the browser's Add to Home Screen option for an app-like shortcut.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys `apps/web` on pushes to `main`.

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## LG webOS setup

See `apps/webos/application/README.md` for TMDB key setup, browser preview, IPK packaging and installation instructions. Keep `keys.js` local and never commit API keys.
