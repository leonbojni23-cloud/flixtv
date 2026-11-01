# FLIXTV

FLIXTV is a monorepo for the LG webOS application, desktop preview, and playback services.

## Repository structure

```text
flixtv/
├── apps/web/                 # Desktop/browser preview documentation
├── apps/webos/
│   ├── application/          # FLIXTV UI, TMDB catalog, CinePro player and webOS service
│   └── package/              # webOS package metadata
├── services/                 # Backend service scaffolds
├── packages/                 # Shared module scaffolds
├── tests/
├── tools/dev-server.js       # Lightweight desktop preview server
├── releases/                 # Versioned IPK packages
├── docker-compose.yml        # CinePro Core service
└── package.json
```

## Desktop development

Requirements: Node.js 18+ for the FLIXTV preview, Docker Desktop with Docker Compose for CinePro Core.

1. Copy `.env.example` to `.env` and set `TMDB_API_KEY`.
2. Copy `apps/webos/application/keys.example.js` to `keys.js`.
3. Add your TMDB key to `keys.js`. For desktop preview, leave `CINEPRO_URL` as `http://127.0.0.1:3001`.
4. Start CinePro Core: `docker compose up -d cinepro-core`.
5. Start FLIXTV: `npm run dev`.
6. Open http://localhost:3000.

Useful commands:

- `npm run check` runs JavaScript syntax checks.
- `npm run cinepro:logs` follows CinePro Core logs.
- `npm run cinepro:down` stops CinePro Core.

## LG webOS

The app source is in `apps/webos/application`. To connect a TV to CinePro Core running on a computer, set `CINEPRO_URL` in the local, gitignored `keys.js` to the computer's LAN address, for example `http://192.168.1.20:3001`. Do not use `127.0.0.1` on the TV unless CinePro is running on the TV itself.

The FLIXTV interface and title-detail screens remain unchanged. The CinePro player receives the existing TMDB movie or episode ID, requests sources from CinePro Core, and presents the returned sources and subtitles in the existing full-screen player view. HLS playback uses native browser support when available and HLS.js otherwise.

YapGrid's old player file is retained as an unused fallback during testing; FLIXTV's default Play actions now open CinePro.

## CinePro requirements and limitations

CinePro Core is built and run as a separate Docker service on port 3001. It needs a TMDB API key. Its API is exposed to the local network by Docker; do not expose this personal-use instance directly to the public internet. The upstream project documents personal/home use and is licensed under PolyForm Noncommercial 1.0.0. Review the upstream license before distributing FLIXTV with CinePro or using it for anything commercial: https://github.com/cinepro-org/core/blob/main/LICENSE.

## LG webOS application and releases

The webOS app's service scripts remain under `apps/webos/application/service`, alongside the files they are packaged with. Package metadata is in `apps/webos/package`. The archived 0.25.0 IPK is under `releases/0.25.0/`.

## Architecture status

CinePro Core is an external service, not copied into the FLIXTV repository. The FLIXTV CinePro adapter/player is implemented in `apps/webos/application/features/cinepro-player.js`. The other shared catalog/provider/player/subtitle package directories remain scaffolds.
