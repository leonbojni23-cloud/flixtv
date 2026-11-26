# KROMA visual integration for FLIXTV

Status: discovery complete; implementation not yet started.
Target branch: `kroma-ui-integration`.
Production branch `main` is intentionally untouched.

## Product contract

- KROMA is the visual reference: preserve its deep-charcoal/amber palette, typography, spacing, hero composition, navigation, media rails/cards, detail layout, focus treatment and motion as closely as possible.
- FLIXTV remains the product: TMDB is the catalogue source; FLIXTV's CineSRC resolver, iframe controller, subtitle behavior, playback state and progress persistence remain the playback system.
- No KROMA media server, local-library scan, KROMA account/session, or KROMA server API is required.

## Findings verified from source

### FLIXTV
- The current web client is a vanilla JavaScript application, not a React/Vite app.
- The web entry is `apps/web/index.html`; it loads `style.css`, `boredflix-parity.css`, and `apps/web/app.js`.
- The root quality check runs `node --check` on the current JavaScript entry points.
- The current CineSRC bridge is in `apps/web/player/cinesrc-controller.js` and exposes `window.FlixCineSRC`. It opens and controls the existing iframe, tracks readiness, autoplay and playback state.

### KROMA
- KROMA's visual system lives in `@kromatv/ui`; its TV screens live in `@kromatv/tv`.
- The home screen is composed from KROMA-specific providers for connection, recommendations, continue-watching, watched state and My List.
- Recommendations are fetched through `client.media.homeCards()`; movie detail and playback also depend on KROMA media-client types and KROMA's playback backend.
- The webOS shell mounts the complete TV application with `mountTv()`.
- KROMA's UI package is React Native-first and consumed inside a Bun workspace. It depends on workspace packages including `@kromatv/core`, `@kromatv/client`, `@kromatv/i18n` and `@kromatv/spatial-nav`. It is not a drop-in CSS/component library for FLIXTV's current vanilla-JS runtime.

## Integration decision

Do not mount KROMA's complete `TvApp` inside FLIXTV. That would also pull in its server connection/auth/catalogue model and KROMA playback engine, which conflicts with the product contract.

Instead, port the visual system into a FLIXTV-owned presentation layer and keep the existing data/playback services behind explicit adapters:

1. Extract the exact KROMA design tokens and visual rules from `packages/ui` (palette, type, radii, spacing, shadows, focus and motion).
2. Rebuild the KROMA screen structure in FLIXTV's existing runtime, starting with Home, navigation, hero and media rails.
3. Map TMDB results into a small FLIXTV view-model shape. The UI must not call TMDB directly.
4. Map play actions to the existing FLIXTV playback entry point and `window.FlixCineSRC`; never route through KROMA's browser playback backend.
5. Port detail, browse/search, My List and Continue Watching after the Home screen is visually and functionally validated.
6. Add a dedicated visual test route/screenshot baseline before replacing any existing page.
7. Keep this work on `kroma-ui-integration`; merge to `main` only after manual checks on iOS Safari/PWA, desktop and the target LG webOS device.

## Non-negotiable acceptance checks

- TMDB movie/show results render in KROMA-styled rails and details.
- Selecting Play calls FLIXTV's existing CineSRC/player flow.
- Continue Watching and My List keep FLIXTV's current persistence behavior.
- No requests to a KROMA server are required.
- No duplicate app shell, duplicate navigation handlers, or competing player overlays.
- Existing FLIXTV route behavior, iOS safe areas and PWA behavior remain intact.
- The experimental branch passes the repository's `npm run check` (or the equivalent root check command) before any deployment.

## Licensing note

KROMA identifies its project and UI package as AGPL-3.0-or-later. Any direct reuse or modification of KROMA source needs to preserve the applicable notices and be reviewed for AGPL obligations, especially if FLIXTV is distributed or offered as a network service. This note is not legal advice. Prefer a clean implementation of the visual specification unless the project owner has deliberately accepted the obligations of copying KROMA source.

## Current implementation state

This commit records the verified architecture and the safe integration boundary only. It does not yet change the FLIXTV UI or playback code.
