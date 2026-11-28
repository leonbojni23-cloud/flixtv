# FLIXTV CineVault webOS 0.28.0 preview

## What this build changes

- Keeps the uploaded CineVault interface, layout, styles, navigation and TV-focused screen structure.
- Replaces the sample/fake title catalogue with live TMDB movie and TV data.
- Uses TMDB for Home, Movies, TV Shows, New & Popular, search, title details, similar titles and TV season/episode data.
- Replaces the placeholder player with BingeAPI iframe playback. Movie URL: `/embed/movie/{tmdb_id}`. TV URL: `/embed/tv/{tmdb_id}/{season}/{episode}`.
- Requests Albanian subtitles first (`sub_lang=alb`) and enables the BingeAPI OpenSubtitles fallback (`sub_os=1`).
- Saves player progress from BingeAPI time/duration events and handles play/pause/seek TV-remote keys.

## Railway Preview configuration

Railway Preview serves the app through `apps/webos/preview/server.js`. That server injects `/preview-config.js`, which points TMDB requests to `/api/tmdb`. The server uses the `TMDB_API_KEY` Railway variable, so no API key is stored in this ZIP or committed to GitHub.

For a standalone LG webOS package outside Railway Preview, copy `keys.example.js` to `keys.js` and add a TMDB API key locally. Do not commit `keys.js`.

## Apply from GitHub Codespaces

1. Upload `FLIXTV-CineVault-TMDB-BingeAPI-0.28.0.zip` into the FLIXTV Codespaces workspace root.
2. Extract this ZIP into the workspace root so `apply-cinevault-preview.sh` is available.
3. Run:

```bash
bash apply-cinevault-preview.sh FLIXTV-CineVault-TMDB-BingeAPI-0.28.0.zip
```

The script checks out `webos-cinevault-rebuild`, applies only `apps/webos/application`, `package.json` and this note, runs `npm run check:webos`, then commits and pushes that branch. It does not edit `main` or `apps/web`.

## Verification performed

- `npm run check:webos` passes for all webOS JavaScript files in this package.
- A mocked TMDB smoke test verified movie/TV catalogue rows, title details, season/episode mapping, BingeAPI embed URL generation and forward/back remote seeking.
- BingeAPI route and postMessage formats were checked against its published documentation.
- Real playback still needs to be tested in the live browser preview and on the target LG TV. TMDB-backed catalogue requests also require a valid `TMDB_API_KEY` variable on Railway Preview.
