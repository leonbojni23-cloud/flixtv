"use strict";

const VIX_BASE = "https://vixsrc.to";
const TIMEOUT_MS = 10000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

function sendError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function validId(value) {
  return /^\\d{1,10}$/.test(String(value || ""));
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch (_) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return sendError(res, 405, "Method not allowed");
  }

  const type = String(req.query.type || "").toLowerCase();
  const tmdbId = String(req.query.tmdbId || "");
  const season = String(req.query.season || "");
  const episode = String(req.query.episode || "");

  if (!["movie", "tv"].includes(type)) return sendError(res, 400, "type must be movie or tv");
  if (!validId(tmdbId)) return sendError(res, 400, "Invalid TMDB ID");
  if (type === "tv" && (!validId(season) || !validId(episode) || Number(season) < 1 || Number(episode) < 1)) {
    return sendError(res, 400, "TV requests require valid season and episode");
  }

  const apiUrl = type === "tv"
    ? `${VIX_BASE}/api/tv/${tmdbId}/${season}/${episode}`
    : `${VIX_BASE}/api/movie/${tmdbId}`;

  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": VIX_BASE,
    "Origin": VIX_BASE
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!apiResponse.ok) return sendError(res, 502, "VixSrc source unavailable");

    const apiData = await apiResponse.json().catch(() => null);
    if (!apiData || typeof apiData.src !== "string" || !apiData.src.startsWith("/")) {
      return sendError(res, 404, "No stream found");
    }

    const embedUrl = new URL(apiData.src, VIX_BASE);
    if (embedUrl.origin !== VIX_BASE) return sendError(res, 502, "Invalid provider response");

    const embedResponse = await fetch(embedUrl, {
      headers: { ...headers, "Accept": "text/html,application/xhtml+xml,*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!embedResponse.ok) return sendError(res, 502, "VixSrc embed unavailable");

    const html = await embedResponse.text();
    const token = html.match(/token["']\\s*:\\s*["']([^"']+)/)?.[1];
    const expires = html.match(/expires["']\\s*:\\s*["']([^"']+)/)?.[1];
    const playlist = html.match(/url\\s*:\\s*["']([^"']+)/)?.[1];

    if (!token || !expires || !playlist || !/^\\d+$/.test(expires)) {
      return sendError(res, 502, "VixSrc stream data missing");
    }
    if (Number(expires) * 1000 - 60000 <= Date.now()) {
      return sendError(res, 502, "VixSrc stream token expired");
    }
    if (!validHttpsUrl(playlist)) return sendError(res, 502, "Invalid stream URL");

    const separator = playlist.includes("?") ? "&" : "?";
    const language = String(process.env.VIXSRC_LANG || "en").slice(0, 8);
    const streamUrl = `${playlist}${separator}token=${encodeURIComponent(token)}&expires=${encodeURIComponent(expires)}&h=1&lang=${encodeURIComponent(language)}`;

    return res.status(200).json({
      ok: true,
      provider: "VixSrc",
      type,
      tmdbId,
      stream: {
        url: streamUrl,
        format: "hls",
        quality: "auto",
        expiresAt: Number(expires) * 1000
      },
      attribution: null
    });
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return sendError(res, 502, timedOut ? "VixSrc request timed out" : "Stream resolution failed");
  }
};
