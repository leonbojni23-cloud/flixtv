# FLIXTV for LG webOS

A dedicated 1920×1080 LG webOS TV application built with HTML, CSS and vanilla JavaScript.

## Current webOS build

- App ID: `com.boring.tvhome` (kept stable so an existing FLIXTV installation can be upgraded)
- Version: `0.27.0`
- UI: the new CineVault-based Netflix-style interface, rebranded as FLIXTV
- Catalogue: TMDB API
- Playback: CineSRC embed player
- Remote: arrow keys, OK/Enter, Backspace, Escape and webOS Back key (461)
- No React, framework runtime or build step

## Configure TMDB

1. Copy `keys.example.js` to `keys.js`.
2. Add your TMDB v3 API key to `keys.js`.
3. Never commit `keys.js`. It is excluded by `.gitignore`.

## Preview

Serve this directory over HTTP and open it in a desktop browser. Use arrow keys and Enter to test remote navigation. A desktop preview is useful for UI iteration but does not replace testing on the physical LG TV.

## Package and install

With LG webOS TV CLI installed:

```bash
cd apps/webos/application
ares-package . -o ../../../releases --no-minify
ares-install --device mytv ../../../releases/com.boring.tvhome_0.27.0_all.ipk
ares-launch --device mytv com.boring.tvhome
```

If your CLI device profile has a different name, replace `mytv` with that profile.

## Notes

- Movies open CineSRC using the TMDB movie ID.
- TV series details load the first regular season and render its episode cards. Select an episode to play it.
- My List and Continue Watching data are stored locally on the TV.
- The app is not yet certified by a physical-device test. Verify remote focus, player behavior, memory use and playback on the target LG webOS TV before treating this build as production-ready.
