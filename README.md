# FLIXTV

FLIXTV is organized as a monorepo for the LG webOS application, desktop preview, backend services, and shared media modules.

## Repository structure

```text
flixtv/
├── apps/
│   ├── web/                 # Desktop/browser preview documentation
│   └── webos/
│       ├── application/     # LG webOS app source, UI, assets, features and service
│       └── package/         # webOS package metadata
├── services/
│   └── media-api/           # Backend API scaffold
├── packages/
│   ├── catalog/             # TMDB/catalog module scaffold
│   ├── providers/            # Authorized provider adapters scaffold
│   ├── player/               # Playback abstractions scaffold
│   ├── subtitles/            # Subtitle handling scaffold
│   └── shared/               # Shared types and utilities scaffold
├── tests/
├── tools/
│   └── dev-server.js        # Lightweight desktop preview server
├── releases/                # Versioned installable IPK packages
├── docker-compose.yml
├── package.json
└── README.md
```

## Development

Requirements: Node.js 18 or newer.

- `npm run dev` starts the browser preview at http://localhost:3000.
- `npm run check` runs JavaScript syntax checks.
- Set the browser viewport to 1920×1080 and use arrow keys, Enter and Escape.

For a populated catalog, copy `apps/webos/application/keys.example.js` to `keys.js` and add your TMDB key. The local key file is gitignored and must never be committed.

## LG webOS application

The webOS app source is in `apps/webos/application`. Its app-side service scripts are kept in `apps/webos/application/service`, next to the app files they are packaged with. Package metadata is in `apps/webos/package`.

The installable package from version 0.25.0 is archived under `releases/0.25.0/`. Loose internal IPK archive components are not kept at the repository root.

## Architecture status

The repository boundaries are in place, but the backend and shared catalog/provider/player/subtitle packages are scaffolds, not implemented services. The current TMDB adapter remains inside the webOS app until it can be extracted behind a tested interface without breaking the runtime.
