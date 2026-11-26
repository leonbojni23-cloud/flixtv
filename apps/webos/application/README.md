# FLIXTV for LG webOS

FLIXTV is a lightweight 1920×1080 streaming interface designed for LG webOS televisions and Magic Remote navigation.

## Current build

- App ID: `com.boring.tvhome` (kept stable so existing installs can update)
- Version: `0.26.0`
- Main UI: HTML, CSS and JavaScript, no build step
- Catalog: TMDB
- Playback: BingeAPI iframe
- Default subtitle language: English, with OpenSubtitles fallback
- Target: LG webOS 10.x and newer Chromium-based webOS browsers

## TV performance strategy

- Home makes one TMDB request for trending titles.
- Movies and Series are fetched only when their tab is opened. Hidden pages are not preloaded.
- The home screen renders at most eight movie cards and eight series cards.
- Movies and Series render at most eight cards each; Search shows at most twelve results.
- Images use lazy loading and asynchronous decoding.
- Hero rotation, weather polling, YouTube trends, streaming-service discovery and background prefetch are disabled.
- The background uses one static, dimmed and blurred hero image. No WebGL, smoke simulation or continuous decorative animation.
- The player hides and inerts the rest of the application while playback is active.

## Playback

The player uses:

- Movies: `https://bingeapi.st/embed/movie/{tmdbId}`
- Episodes: `https://bingeapi.st/embed/tv/{tmdbId}/{season}/{episode}`
- `autoplay=1`
- `sub_lang=eng`
- `sub_os=1`
- Dark player theme with FLIXTV red controls

The iframe intentionally has no `sandbox` attribute because BingeAPI's documentation says sandbox blocks scripts required by the player. The iframe fills the complete 1920×1080 player surface, so playback opens in an immersive full-screen app view. Native video fullscreen remains controlled by the embedded player and webOS browser permissions.

## Setup and local preview

1. Copy `keys.example.js` to `keys.js` and add a TMDB API key. Keep `keys.js` out of Git.
2. Open the application directory through a local HTTP server, or use the repository's webOS development workflow.
3. Use the arrow keys and OK/Enter to navigate. Back/Escape returns to the previous screen.

## Package for LG webOS

From `apps/webos/application`:

```bash
ares-package . -o /tmp --no-minify
ares-install --device tv /tmp/com.boring.tvhome_*.ipk
ares-launch --device tv com.boring.tvhome
```

The package metadata and app manifest must keep the same version number.

## Important limitations

- Autoplay depends on webOS and the embedded player allowing playback after the user's OK action.
- The player surface is full-screen, but a native video fullscreen transition is controlled by BingeAPI inside its cross-origin iframe.
- The exact performance and remote-key behaviour must still be verified on the physical LG TV. Desktop browser preview is not a substitute for device testing.
