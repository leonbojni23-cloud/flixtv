"use strict";

const TIMEOUT_MS = 28000;

function sendError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function validId(value) {
  return /^(?:tt\\d{7,10}|\\d{1,12})$/i.test(String(value || ""));
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
  if (!validId(tmdbId)) return sendError(res, 400, "Invalid TMDB or IMDb ID");
  if (type === "tv" && (!/^\\d{1,3}$/.test(season) || !/^\\d{1,3}$/.test(episode) || Number(season) < 1 || Number(episode) < 1)) {
    return sendError(res, 400, "TV requests require valid season and episode");
  }

  const resolverBase = String(process.env.STREAMIMDB_RESOLVER_URL || "").replace(/\\/$/, "");
  if (!resolverBase) {
    return sendError(res, 503, "StreamIMDb resolver is not configured");
  }

  const params = new URLSearchParams({ tmdbId, type });
  if (type === "tv") {
    params.set("season", season);
    params.set("episode", episode);
  }

  try {
    const response = await fetch(resolverBase + "/v1/resolve?" + params.toString(), {
      headers: {
        Accept: "application/json",
        "X-Resolver-Key": String(process.env.STREAMIMDB_RESOLVER_API_KEY || "")
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || !payload.ok || !Array.isArray(payload.streams) || !payload.streams.length) {
      const message = payload && (payload.detail || payload.error);
      return sendError(res, response.status >= 400 && response.status < 500 ? response.status : 502, message || "StreamIMDb resolution failed");
    }

    const stream = payload.streams.find(item => item && typeof item.url === "string" && /^https:\\/\\//i.test(item.url));
    if (!stream) return sendError(res, 502, "Resolver returned no valid HTTPS stream");

    return res.status(200).json({
      ok: true,
      provider: payload.provider || "StreamIMDb",
      type,
      tmdbId,
      title: payload.title || "",
      stream: {
        url: stream.url,
        format: stream.format || "hls",
        headers: stream.headers || {},
        expiresAt: stream.expiresAt || null
      },
      subtitles: Array.isArray(payload.subtitles) ? payload.subtitles : [],
      resolutionMethod: payload.resolutionMethod || "unknown"
    });
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return sendError(res, 502, timedOut ? "StreamIMDb resolver timed out" : "Could not reach StreamIMDb resolver");
  }
};
