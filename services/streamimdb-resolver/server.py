from __future__ import annotations

import asyncio
import os
import re
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from streamgrabber.detector import capture_streams
from streamgrabber.models import DEFAULT_USER_AGENT
from streamgrabber.resolver import streamimdb_url
from streamgrabber.vaplayer import episode_info

IMDB_ID_RE = re.compile(r"^(?:tt\d{7,10}|\d{1,12})$", re.I)
DEFAULT_REFERER = "https://nextgencloudfabric.com/"
CAPTURE_TIMEOUT_MS = int(os.getenv("CAPTURE_TIMEOUT_MS", "20000"))

app = FastAPI(title="FLIXTV StreamIMDb Resolver", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


def _valid_stream_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
    except Exception:
        return False


def _safe_headers(headers: dict[str, str] | None, fallback_referer: str) -> dict[str, str]:
    source = headers or {}
    result: dict[str, str] = {"User-Agent": DEFAULT_USER_AGENT}
    for key in ("Referer", "Origin"):
        value = next((v for k, v in source.items() if k.lower() == key.lower()), None)
        if value and value.startswith("https://"):
            result[key] = value
    result.setdefault("Referer", fallback_referer)
    return result


def _resolve_sync(media_id: str, media_type: str, season: int | None, episode: int | None) -> dict[str, Any]:
    info = None
    try:
        info = episode_info(media_id, media_type, season, episode)
    except Exception:
        # The browser-capture fallback is safe for movies. For TV, the episode
        # selector must be resolved explicitly; silently returning the default
        # episode would be incorrect.
        if media_type == "tv":
            raise

    streams = [
        url for url in (info.stream_urls if info else [])
        if isinstance(url, str) and _valid_stream_url(url)
    ]

    if streams:
        return {
            "title": info.title,
            "streams": [
                {
                    "url": url,
                    "format": "hls" if ".m3u8" in url.lower() else "auto",
                    "headers": _safe_headers(None, DEFAULT_REFERER),
                    "expiresAt": None,
                }
                for url in streams
            ],
            "subtitles": info.default_subs,
            "season": info.season if media_type == "tv" else None,
            "episode": info.episode if media_type == "tv" else None,
            "resolutionMethod": "streamdata-api",
        }

    if media_type == "tv":
        raise RuntimeError("The StreamIMDb episode API returned no playable URL")

    embed_url = streamimdb_url(media_id, media_type)
    captures = asyncio.run(
        capture_streams(
            embed_url,
            timeout_ms=CAPTURE_TIMEOUT_MS,
            headless=True,
            user_agent=DEFAULT_USER_AGENT,
        )
    )
    hls = [item for item in captures if item.kind == "hls" and _valid_stream_url(item.url)]
    subtitles = [
        {
            "url": item.url,
            "format": item.kind,
            "language": None,
            "headers": _safe_headers(item.headers, item.source_url or embed_url),
        }
        for item in captures
        if item.kind in {"vtt", "srt"}
    ]

    if not hls:
        raise HTTPException(status_code=404, detail="No HLS stream was detected for this title")

    return {
        "title": next((item.page_title for item in hls if item.page_title), ""),
        "streams": [
            {
                "url": item.url,
                "format": "hls",
                "headers": _safe_headers(item.headers, item.source_url or embed_url),
                "expiresAt": None,
            }
            for item in hls
        ],
        "subtitles": subtitles,
        "season": season,
        "episode": episode,
        "resolutionMethod": "playwright-network-capture",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"ok": "true", "service": "streamimdb-resolver"}


@app.get("/v1/resolve")
async def resolve(
    tmdbId: str = Query(..., min_length=1, max_length=16),
    type: str = Query("movie", pattern="^(movie|tv)$"),
    season: int | None = Query(None, ge=1, le=100),
    episode: int | None = Query(None, ge=1, le=500),
    x_resolver_key: str | None = Header(None),
) -> dict[str, Any]:
    expected_key = os.getenv("RESOLVER_API_KEY", "")
    if not expected_key or x_resolver_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    media_id = tmdbId.strip()
    if not IMDB_ID_RE.fullmatch(media_id):
        raise HTTPException(status_code=400, detail="tmdbId must be a numeric TMDB ID or IMDb ID such as tt1234567")
    if type == "tv" and (season is None or episode is None):
        raise HTTPException(status_code=400, detail="TV resolution requires season and episode")
    if type == "movie" and (season is not None or episode is not None):
        raise HTTPException(status_code=400, detail="Season and episode are only valid for TV titles")

    try:
        result = await asyncio.to_thread(_resolve_sync, media_id, type, season, episode)
    except HTTPException:
        raise
    except Exception as exc:
        # Avoid returning upstream exception details or signed URLs to clients.
        raise HTTPException(status_code=502, detail="StreamIMDb resolution failed") from exc

    if not result.get("streams"):
        raise HTTPException(status_code=404, detail="No playable stream was returned")

    return {
        "ok": True,
        "provider": "StreamIMDb",
        "tmdbId": media_id,
        "type": type,
        **result,
    }
