# Streamgrabber Cloud Test

Isolated Railway test service. It does not modify FLIXTV runtime code.

## Endpoints
- GET /health
- POST /capture with JSON { "url": "https://...", "wait_seconds": 15, "click_play": false }
- Send the API token in the X-API-Key header.

The service detects HLS, DASH and subtitle request URLs with Chromium/Playwright. It does not download media or bypass DRM, authentication, paywalls, or other technical restrictions.

## Railway
- Dockerfile: tools/streamgrabber-cloud-test/Dockerfile
- Root directory: tools/streamgrabber-cloud-test
- Healthcheck: /health
- Required variable: API_TOKEN
