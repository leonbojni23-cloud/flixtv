# FLIXTV StreamIMDb Resolver

HTTP wrapper around the MIT-licensed Streamgrabber capture and StreamIMDb/VaPlayer metadata modules.

## Endpoints

- `GET /health`
- `GET /v1/resolve?tmdbId=278&type=movie`
- `GET /v1/resolve?tmdbId=12345&type=tv&season=1&episode=2`

The resolver first uses the project's existing StreamIMDb/VaPlayer episode metadata function. If it returns no valid HTTPS stream URLs, it opens the corresponding StreamIMDb embed in Playwright and captures HLS and subtitle network requests.

The API returns stream URLs, a limited set of playback headers, subtitle tracks, and the resolution method. It does not download or re-host media. Set a strong `RESOLVER_API_KEY` environment variable; every resolve request must provide it in `X-Resolver-Key`. FLIXTV's Vercel function sends the matching `STREAMIMDB_RESOLVER_API_KEY` secret.

## Run locally

From the repository root:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r services/streamimdb-resolver/requirements.txt
python -m playwright install chromium
PYTHONPATH=services/streamimdb-resolver uvicorn server:app --host 0.0.0.0 --port 8000
```

On Windows PowerShell, activate the venv with `.venv\\Scripts\\Activate.ps1`.

## Deploy

Build the Dockerfile from the repository root. Configure `RESOLVER_API_KEY` with a long random secret, and configure `CORS_ORIGINS` to the exact FLIXTV web origin(s), separated by commas. `CAPTURE_TIMEOUT_MS` defaults to 20000. In Vercel, set `STREAMIMDB_RESOLVER_URL` to the deployed service base URL and `STREAMIMDB_RESOLVER_API_KEY` to the same secret.

Only use this resolver with streams and services you are authorized to access. Signed stream URLs may expire; resolve again when playback fails due to expiry.
