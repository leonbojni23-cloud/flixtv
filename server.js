// Same-origin app server + narrow proxy to the authorized VidFast resolver.
// Node.js 18+; no third-party dependencies required.
'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PORT = Number(process.env.APP_PORT || 5500);
const RESOLVER_ORIGIN = (process.env.RESOLVER_ORIGIN || 'http://127.0.0.1:3001').replace(/\/$/, '');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function proxy(req, res, pathname, search) {
  const target = new URL(RESOLVER_ORIGIN + pathname + search);
  const transport = target.protocol === 'https:' ? https : http;
  const upstream = transport.request(target, {
    method: req.method,
    headers: { 'Accept': req.headers.accept || '*/*', 'User-Agent': 'TheBoringTV/1.0' }
  }, (upstreamRes) => {
    const headers = { 'Cache-Control': 'no-store' };
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((key) => {
      if (upstreamRes.headers[key]) headers[key] = upstreamRes.headers[key];
    });
    res.writeHead(upstreamRes.statusCode || 502, headers);
    upstreamRes.pipe(res);
  });
  upstream.on('error', (error) => {
    if (!res.headersSent) send(res, 502, 'Resolver service unavailable: ' + error.message);
    else res.destroy(error);
  });
  req.pipe(upstream);
}

function serveStatic(req, res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch (_) { return send(res, 400, 'Bad path'); }
  if (decoded === '/') decoded = '/index.html';
  const file = path.resolve(ROOT, '.' + decoded);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/resolve' || url.pathname === '/api/hls' || url.pathname === '/api/sniff') {
    return proxy(req, res, url.pathname, url.search);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  serveStatic(req, res, url.pathname);
}).listen(PORT, '0.0.0.0', () => {
  console.log('The Boring TV: http://localhost:' + PORT);
  console.log('VidFast resolver bridge: ' + RESOLVER_ORIGIN);
});
