"use strict";

const RESOLVE_TIMEOUT_MS = 20000;
const NAVIGATION_TIMEOUT_MS = 45000;
const CINESRC_ORIGIN = "https://cinesrc.st";

function sendError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function validId(value) {
  return /^(?:tt\\d{7,10}|\\d{1,12})$/i.test(String(value || ""));
}

function buildEmbedUrl(type, id, season, episode) {
  const params = new URLSearchParams({
    autoplay: "true",
    muted: "false",
    controls: "true",
    autonext: "true",
    autoskip: "false",
    color: "#34cfeb",
    back: "close"
  });

  if (type === "tv") {
    params.set("s", season);
    params.set("e", episode);
  }

  return CINESRC_ORIGIN + "/embed/" + type + "/" + encodeURIComponent(id) + "?" + params.toString();
}

function isHlsResponse(response) {
  const url = response.url();
  if (!url || !url.startsWith("https://")) return false;

  const headers = response.headers ? response.headers() : {};
  const contentType = String(headers["content-type"] || "").toLowerCase();
  let pathname = "";

  try {
    pathname = new URL(url).pathname;
  } catch (_) {
    return false;
  }

  return /\\.m3u8$/i.test(pathname) ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegurl") ||
    contentType.includes("audio/mpegurl");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "Method not allowed");
  }

  const expectedKey = String(process.env.CINESRC_RESOLVER_KEY || "");
  const suppliedKey = String(req.headers["x-cinesrc-resolver-key"] || "");
  if (!expectedKey || suppliedKey !== expectedKey) {
    return sendError(res, expectedKey ? 401 : 503, expectedKey ? "Unauthorized" : "CineSRC resolver is not configured");
  }

  const type = String(req.query.type || "movie").toLowerCase();
  const id = String(req.query.tmdbId || "");
  const season = String(req.query.season || "");
  const episode = String(req.query.episode || "");

  if (!["movie", "tv"].includes(type)) return sendError(res, 400, "type must be movie or tv");
  if (!validId(id)) return sendError(res, 400, "Invalid TMDB or IMDb ID");

  if (type === "tv" &&
      (!/^\\d{1,3}$/.test(season) || !/^\\d{1,3}$/.test(episode) ||
       Number(season) < 1 || Number(episode) < 1)) {
    return sendError(res, 400, "TV requests require valid season and episode");
  }

  const packUrl = String(process.env.CHROMIUM_PACK_URL || "").trim();
  if (!packUrl || !/^https:\\/\\//i.test(packUrl)) {
    return sendError(res, 503, "CHROMIUM_PACK_URL must be configured with an HTTPS Chromium pack URL");
  }

  let browser;
  let page;
  let timeoutId;

  try {
    // chromium-min is ESM-only in current releases; load it dynamically from this CommonJS API.
    const chromiumModule = await import("@sparticuz/chromium-min");
    const puppeteerModule = await import("puppeteer-core");
    const chromium = chromiumModule.default || chromiumModule;
    const puppeteer = puppeteerModule.default || puppeteerModule;

    const executablePath = await chromium.executablePath(packUrl);
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: "shell"
    });

    page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36");

    let capturedUrl = "";
    let resolveHls;
    const hlsPromise = new Promise(resolve => { resolveHls = resolve; });

    page.on("response", response => {
      if (capturedUrl || !isHlsResponse(response)) return;
      const status = response.status();
      if (status < 200 || status >= 300) return;

      capturedUrl = response.url();
      resolveHls(capturedUrl);
    });

    const embedUrl = buildEmbedUrl(type, id, season, episode);
    await page.goto(embedUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timed out waiting for an HLS playlist")), RESOLVE_TIMEOUT_MS);
    });

    const m3u8 = await Promise.race([hlsPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    timeoutId = null;

    return res.status(200).json({
      ok: true,
      provider: "CineSRC",
      type,
      tmdbId: id,
      season: type === "tv" ? Number(season) : null,
      episode: type === "tv" ? Number(episode) : null,
      m3u8
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    const message = error && error.message ? error.message : "CineSRC resolution failed";
    const timedOut = /timed out|timeout/i.test(message);
    console.error("[CineSRC resolver]", timedOut ? "HLS capture timed out" : message);

    return sendError(res, timedOut ? 504 : 502, timedOut
      ? "CineSRC did not expose an HLS playlist within the allowed time"
      : "CineSRC resolver failed");
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
};
