from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
import time
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from playwright.async_api import async_playwright

app = FastAPI(title="Streamgrabber Cloud Test", version="0.1.0")

MEDIA_SUFFIXES = {".m3u8": "hls", ".mpd": "dash", ".vtt": "vtt", ".srt": "srt"}


def media_kind(url: str, content_type: str = "") -> str | None:
    lower = url.lower().split("#", 1)[0]
    for suffix, kind in MEDIA_SUFFIXES.items():
        if suffix in lower:
            return kind
    ct = content_type.lower()
    if "mpegurl" in ct: return "hls"
    if "dash+xml" in ct: return "dash"
    if "text/vtt" in ct: return "vtt"
    if "subrip" in ct: return "srt"
    return None


async def is_public_host(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_global
    except ValueError:
        pass
    try:
        records = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
        addresses = {record[4][0].split("%", 1)[0] for record in records}
        return bool(addresses) and all(ipaddress.ip_address(addr).is_global for addr in addresses)
    except Exception:
        return False


class CaptureRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)
    wait_seconds: int = Field(default=15, ge=3, le=30)
    click_play: bool = False


@app.get("/health")
async def health():
    return {"status": "ok", "service": "streamgrabber-cloud-test"}


@app.post("/capture")
async def capture(payload: CaptureRequest, x_api_key: str | None = Header(default=None)):
    expected = os.getenv("API_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="API_TOKEN is not configured")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")

    parsed = urlparse(payload.url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Only public HTTP/HTTPS page URLs are accepted")
    if not await is_public_host(parsed.hostname):
        raise HTTPException(status_code=400, detail="Target host is not publicly routable")

    captures: dict[str, dict] = {}
    request_headers: dict[str, dict[str, str]] = {}
    started = time.monotonic()

    async def guard_route(route):
        parsed_request = urlparse(route.request.url)
        if parsed_request.scheme in {"data", "blob", "about"}:
            await route.continue_()
            return
        if parsed_request.scheme not in {"http", "https"} or not parsed_request.hostname:
            await route.abort()
            return
        if await is_public_host(parsed_request.hostname):
            await route.continue_()
        else:
            await route.abort()

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ))
        await context.route("**/*", guard_route)
        page = await context.new_page()

        def on_request(request):
            request_headers[request.url] = dict(request.headers)
            kind = media_kind(request.url)
            if kind:
                captures[request.url] = {
                    "url": request.url, "type": kind,
                    "request_headers": dict(request.headers),
                    "source_frame": request.frame.url if request.frame else None,
                }

        async def on_response(response):
            kind = media_kind(response.url, response.headers.get("content-type", ""))
            if kind:
                item = captures.setdefault(response.url, {
                    "url": response.url, "type": kind,
                    "request_headers": request_headers.get(response.url, {}),
                    "source_frame": response.request.frame.url if response.request.frame else None,
                })
                item["response_status"] = response.status
                item["content_type"] = response.headers.get("content-type")

        page.on("request", on_request)
        page.on("response", lambda response: asyncio.create_task(on_response(response)))

        try:
            await page.goto(payload.url, wait_until="domcontentloaded", timeout=30000)
            if payload.click_play:
                for selector in (
                    "button[aria-label*='play' i]", "[title*='play' i]",
                    "button:has-text('Play')", ".vjs-big-play-button",
                    ".plyr__control--overlaid",
                ):
                    try:
                        locator = page.locator(selector).first
                        if await locator.count() and await locator.is_visible():
                            await locator.click(timeout=1200)
                            break
                    except Exception:
                        continue
            await page.wait_for_timeout(payload.wait_seconds * 1000)
            title = await page.title()
            navigation_error = None
        except Exception as exc:
            title = ""
            navigation_error = str(exc)[:500]
        await browser.close()

    ordered = sorted(captures.values(), key=lambda item: (item["type"] not in {"hls", "dash"}, item["url"]))
    return {
        "page_url": payload.url, "page_title": title,
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "count": len(ordered), "streams": ordered,
        "navigation_error": navigation_error,
        "note": "Detection only. No stream download, DRM handling, authentication bypass, or ad-removal guarantee.",
    }
