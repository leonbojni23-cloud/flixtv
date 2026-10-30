// Static app server for The Boring TV. The player is embedded directly from YapGrid.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PORT = Number(process.env.APP_PORT || 5500);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch (_) { return send(res, 400, 'Bad path'); }

  if (decoded === '/') decoded = '/index.html';
  const file = path.resolve(ROOT, '.' + decoded);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }
  serveStatic(req, res, url.pathname);
}).listen(PORT, '0.0.0.0', () => {
  console.log('The Boring TV: http://localhost:' + PORT);
});
