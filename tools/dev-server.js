"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const APP_ROOT = path.resolve(__dirname, "../usr/palm/applications/com.boring.tvhome");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method Not Allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "Bad Request");
  }

  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(APP_ROOT, "." + pathname);

  if (!filePath.startsWith(APP_ROOT + path.sep) && filePath !== path.join(APP_ROOT, "index.html")) {
    return send(res, 403, "Forbidden");
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) return send(res, 404, "Not Found");

    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });

    if (req.method === "HEAD") return res.end();
    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) send(res, 500, "Internal Server Error");
      else res.destroy();
    });
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log("FLIXTV desktop preview");
  console.log("  Local:   http://" + HOST + ":" + PORT);
  console.log("  TV UI:   use 1920 × 1080 for the closest preview");
  console.log("  Keys:    arrows, Enter, Escape / Backspace");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
