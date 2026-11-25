"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const WEB_ROOT = __dirname;
const API_ROOT = path.join(WEB_ROOT, "api");
const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";
const MAX_BODY = 1024 * 1024;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
  ".srt": "text/plain; charset=utf-8"
};

const TEST_EVENT_LIMIT = 1200;
let testEventSequence = 0;
const testServerEvents = [];
function pushTestServerEvent(item) {
  const event = Object.assign({ id: ++testEventSequence, time: new Date().toISOString() }, item);
  testServerEvents.push(event);
  if (testServerEvents.length > TEST_EVENT_LIMIT) testServerEvents.splice(0, testServerEvents.length - TEST_EVENT_LIMIT);
}

const API_HANDLERS = new Set([
  "tmdb.js",
  "tmdb-image.js",
  "translate.js",
  "imdb-videos.js",
  "streams.js",
  "subtitles.js",
  "sports.js",
  "pwa-icon.js"
]);

function sendJson(res, status, payload) {
  if (res.writableEnded) return;
  res.statusCode = status;
  if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function createApiResponse(res) {
  return {
    get statusCode() { return res.statusCode; },
    set statusCode(value) { res.statusCode = value; },
    setHeader(name, value) { res.setHeader(name, value); return this; },
    getHeader(name) { return res.getHeader(name); },
    hasHeader(name) { return res.hasHeader(name); },
    status(code) { res.statusCode = code; return this; },
    json(payload) { sendJson(res, res.statusCode || 200, payload); return this; },
    send(payload) {
      if (res.writableEnded) return this;
      if (payload !== undefined && !res.hasHeader("Content-Type") && typeof payload === "string") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      }
      res.end(payload);
      return this;
    },
    end(payload) { if (!res.writableEnded) res.end(payload); return this; }
  };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Request body too large"), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  const type = String(req.headers["content-type"] || "");
  if (type.includes("application/json")) {
    try { return JSON.parse(raw); } catch (_) { throw Object.assign(new Error("Invalid JSON body"), { status: 400 }); }
  }
  return raw;
}

function queryObject(searchParams) {
  const query = {};
  for (const [key, value] of searchParams) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      if (!Array.isArray(query[key])) query[key] = [query[key]];
      query[key].push(value);
    } else query[key] = value;
  }
  return query;
}

async function handleApi(req, res, pathname, searchParams) {
  const file = path.basename(pathname);
  if (!API_HANDLERS.has(file)) return sendJson(res, 404, { error: "API endpoint not found" });
  let handler;
  try {
    handler = require(path.join(API_ROOT, file));
  } catch (error) {
    console.error("[FLIXTV] API module load failed:", file, error.message);
    return sendJson(res, 500, { error: "API endpoint could not be loaded" });
  }

  try {
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};
    const apiReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: queryObject(searchParams),
      body
    };
    await handler(apiReq, createApiResponse(res));
    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error("[FLIXTV] API request failed:", file, error.message);
    if (!res.headersSent) sendJson(res, Number(error.status) || 500, { error: error.status === 413 ? "Request body too large" : "Internal API error" });
    else if (!res.writableEnded) res.end();
  }
}

function safeStaticPath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch (_) { return null; }
  if (decoded.includes("\0") || decoded.includes("\\") || decoded.split("/").includes("..")) return null;
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(WEB_ROOT, relative || "index.html");
  return resolved.startsWith(WEB_ROOT + path.sep) || resolved === path.join(WEB_ROOT, "index.html") ? resolved : null;
}

function serveFile(req, res, filePath) {
  let stat;
  try { stat = fs.statSync(filePath); } catch (_) { return false; }
  if (!stat.isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "origin");
  if (/\.[a-f0-9]{8,}\./i.test(path.basename(filePath))) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  else if ([".html", ".js", ".css", ".json", ".webmanifest"].includes(ext)) res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  else res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Content-Length", stat.size);
  if (req.method === "HEAD") { res.end(); return true; }
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => { if (!res.headersSent) sendJson(res, 500, { error: "File read failed" }); else res.destroy(); });
  stream.pipe(res);
  return true;
}

function serveAppShell(req, res, testMode) {
  let html;
  try { html = fs.readFileSync(path.join(WEB_ROOT, "index.html"), "utf8"); }
  catch (_) { return sendJson(res, 500, { error: "App shell not found" }); }
  if (testMode) {
    html = html.replace("<head>", "<head>\n<script>window.__FLIXTV_TEST_MODE__=true;</script>\n<script src='/diagnostics.js?v=test-observability-2'></script>\n<script src='/boot-guard.js?v=test-observability-2'></script>");
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", Buffer.byteLength(html));
  if (req.method === "HEAD") return res.end();
  return res.end(html);
}

const server = http.createServer(async (req, res) => {
  let parsed;
  try { parsed = new URL(req.url, "http://localhost"); } catch (_) { return sendJson(res, 400, { error: "Invalid URL" }); }
  const pathname = parsed.pathname;
  const isTestRoute = pathname === "/test" || pathname === "/test/";
  if ((pathname === "/" || isTestRoute) && !["GET", "HEAD"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  if (pathname === "/" || isTestRoute) return serveAppShell(req, res, isTestRoute);

  const testTagged = parsed.searchParams.get("__flxtv_test") === "1";
  const testStartedAt = process.hrtime.bigint();
  if (testTagged && pathname !== "/api/test-observability") {
    res.once("finish", () => pushTestServerEvent({
      category: "server", name: "server.http", method: req.method,
      path: pathname, status: res.statusCode,
      durationMs: +(Number(process.hrtime.bigint() - testStartedAt) / 1e6).toFixed(2),
      responseBytes: Number(res.getHeader("content-length")) || null,
      level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      userAgent: String(req.headers["user-agent"] || "").slice(0, 180)
    }));
  }

  if (pathname === "/api/test-observability") {
    if (req.method !== "GET" || !testTagged) return sendJson(res, 404, { error: "Not found" });
    const after = Number(parsed.searchParams.get("after")) || 0;
    const usage = process.memoryUsage();
    return sendJson(res, 200, {
      events: testServerEvents.filter(event => event.id > after),
      server: { uptimeSec: Math.round(process.uptime()), pid: process.pid,
        memoryMB: { rss: +(usage.rss / 1048576).toFixed(1), heapUsed: +(usage.heapUsed / 1048576).toFixed(1), heapTotal: +(usage.heapTotal / 1048576).toFixed(1), external: +(usage.external / 1048576).toFixed(1) },
        eventBuffer: testServerEvents.length, capturedAt: new Date().toISOString() }
    });
  }

  if (pathname === "/health" || pathname === "/healthz") {
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 200, { ok: true, service: "flixtv-web" });
  }

  if (pathname.startsWith("/api/")) return handleApi(req, res, pathname, parsed.searchParams);
  if (!["GET", "HEAD"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (pathname === "/flixtv-home-icon-v4.png" || pathname === "/apple-touch-icon.png") {
    return handleApi(req, res, "/api/pwa-icon.js", parsed.searchParams);
  }

  const target = safeStaticPath(pathname);
  if (!target) return sendJson(res, 400, { error: "Invalid path" });
  if (serveFile(req, res, target)) return;

  // Vercel-style client routes are served by the same app shell.
  if (pathname === "/" || pathname.startsWith("/browse/") || pathname === "/library" ||
      pathname === "/search" || pathname === "/streamimdb-sandbox" ||
      pathname === "/daddylive" || !path.extname(pathname)) {
    return serveFile(req, res, path.join(WEB_ROOT, "index.html")) || sendJson(res, 404, { error: "App shell not found" });
  }

  return sendJson(res, 404, { error: "Not found" });
});

server.requestTimeout = 35000;
server.headersTimeout = 40000;
server.listen(PORT, HOST, () => {
  console.log("[FLIXTV] web server listening on " + HOST + ":" + PORT);
});
