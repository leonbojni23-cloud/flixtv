# FLIXTV

FLIXTV is being organized as a monorepo so the desktop preview, LG webOS app, backend services, and shared packages have clear boundaries.

## Repository layout

```text
flixtv/
├── apps/
│   ├── web/                 # Desktop/browser preview
│   └── webos/               # LG webOS application
├── services/
│   └── media-api/           # Backend API
├── packages/
│   ├── catalog/             # TMDB catalog integration
│   ├── providers/           # Authorized media providers
│   ├── player/              # Playback logic and player adapters
│   ├── subtitles/           # Subtitle loading and synchronization
│   └── shared/              # Shared utilities and types
├── tests/
├── tools/
├── docker-compose.yml
└── package.json
```

## Current migration status

The folders above establish the target monorepo layout. The existing production webOS application is still preserved at `usr/palm/applications/com.boring.tvhome` while its assets and runtime dependencies are migrated. This avoids breaking the current LG TV package or desktop preview during the reorganization.

- Desktop preview: `npm run dev`
- Syntax checks: `npm run check`
- Desktop preview URL: `http://localhost:3000`

Backend, provider integrations, and Docker services are scaffolding targets; they are not represented as implemented until their code and tests exist.
