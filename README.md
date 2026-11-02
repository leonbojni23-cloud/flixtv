# FLIXTV

FLIXTV is a monorepo for the LG webOS application, desktop preview, and Jellyfin-backed playback.

## Repository structure

```text
flixtv/
├── apps/web/                 # Desktop/browser preview documentation
├── apps/webos/
│   ├── application/          # FLIXTV UI, TMDB catalog, Jellyfin player and webOS service
│   └── package/              # webOS package metadata
├── services/                 # Backend service scaffolds
├── packages/                 # Shared module scaffolds
├── tests/
├── tools/dev-server.js       # Lightweight desktop preview server
├── releases/                 # Versioned IPK packages
└── docker-compose.yml        # Optional Jellyfin server
```

## Desktop development

Requirements: Node.js 18+ for the FLIXTV preview. Jellyfin can run on another computer, NAS, or the optional Docker setup below.

1. Copy `apps/webos/application/keys.example.js` to `apps/webos/application/keys.js`.
2. Set `TMDB_KEY`, `JELLYFIN_URL`, and `JELLYFIN_API_KEY` in `keys.js`.
3. Start FLIXTV with `npm run dev`.
4. Open http://localhost:3000.

Useful command: `npm run check` runs JavaScript syntax checks.

## Connect an existing Jellyfin server

1. In Jellyfin Dashboard, create an API key under **API Keys**.
2. Set `JELLYFIN_URL` to the server address reachable by the device, for example `http://192.168.1.20:8096`.
3. Set `JELLYFIN_API_KEY` to the generated key.
4. For webOS, use the computer/NAS LAN address, not `localhost` or `127.0.0.1`.
5. Allow FLIXTV's origin in Jellyfin's CORS/network settings if the browser blocks API requests.

Example:

```js
window.KEYS = {
  TMDB_KEY: "your-tmdb-key",
  YT_KEY: "",
  JELLYFIN_URL: "http://192.168.1.20:8096",
  JELLYFIN_API_KEY: "your-jellyfin-api-key"
};
```

FLIXTV keeps TMDB for catalog, artwork, and title details. When Play is selected, it searches the Jellyfin library using the title's TMDB provider ID. Movies are matched to a movie item; episodes are matched by series TMDB ID, season number, and episode number. Playback is delivered by Jellyfin's HLS endpoint, with native HLS used when available and hls.js as the fallback.

**Important:** Jellyfin must contain the title and have its TMDB provider IDs correctly identified. A TMDB catalogue result does not mean the title exists in your Jellyfin library. The API key is stored in local `keys.js` and is included in the playback URL because the HTML video element cannot attach Jellyfin authorization headers. Do not publish that file or expose the key.

## Optional Jellyfin Docker server

The repository's `docker-compose.yml` starts a Jellyfin server on port 8096. Put your media files in `./media` (or adjust the media volume), then run:

```bash
docker compose up -d jellyfin
```

Complete Jellyfin's first-run setup at `http://localhost:8096`, add the `/media` library, create an API key, and configure FLIXTV as described above. If you already have a Jellyfin server, you do not need this Docker service.

## LG webOS application and releases

The webOS app source is in `apps/webos/application`; package metadata is in `apps/webos/package`. The archived 0.25.0 IPK is under `releases/0.25.0/`.

## Architecture status

Jellyfin is the playback server. The FLIXTV Jellyfin adapter is implemented in `apps/webos/application/features/jellyfin-player.js`. The catalogue remains powered by TMDB; Jellyfin is responsible for matching library items and delivering the video stream.


## Mobile and desktop web version

A responsive browser version is available in `apps/web`. It uses the TMDB API for the catalogue and YapGrid for embedded playback. The TMDB API key is entered in the web app settings and stored only in the current browser's local storage.

GitHub Pages deployment is configured through `.github/workflows/pages.yml`. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source. After the workflow finishes, open:

`https://leonbojni23-cloud.github.io/flixtv/`

On a phone, open the same address in Safari or Chrome. You can use the browser's **Add to Home Screen** option to install it like an app.
