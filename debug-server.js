const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '0.0.0.0';
const PORT = 8787;
const LOG_FILE = path.join(__dirname, 'flixtv-debug.log');
const devices = new Map();

function write(level, message, data) {
  const line = '[' + new Date().toISOString() + '] [' + level + '] ' + message +
    (data ? ' | ' + JSON.stringify(data) : '');
  console.log(line);
  fs.appendFile(LOG_FILE, line + '\n', function (err) {
    if (err) console.error('Could not write log file:', err.message);
  });
}
function reply(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && req.url === '/health') {
    return reply(res, 200, {ok: true, service: 'FLIXTV Debug Receiver', port: PORT, connectedDevices: devices.size});
  }
  if (req.method !== 'POST' || !['/hello', '/log', '/heartbeat'].includes(req.url)) {
    return reply(res, 404, {ok: false, error: 'Not found'});
  }
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 128 * 1024) req.destroy();
  });
  req.on('end', () => {
    let item;
    try { item = JSON.parse(body || '{}'); }
    catch (_) { return reply(res, 400, {ok: false, error: 'Invalid JSON'}); }

    const id = String(item.id || 'unknown-device');
    if (req.url === '/hello') {
      devices.set(id, {lastSeen: Date.now(), userAgent: item.userAgent || '', address: req.socket.remoteAddress});
      write('TV-CONNECTED', 'HANDSHAKE CONFIRMED: PC <-> TV', {
        deviceId: id, ip: req.socket.remoteAddress, userAgent: item.userAgent || '',
        screen: item.details && item.details.screen || 'unknown'
      });
      return reply(res, 200, {ok: true, connected: true, deviceId: id, message: 'PC-TV connection confirmed'});
    }
    if (req.url === '/heartbeat') {
      devices.set(id, {lastSeen: Date.now(), userAgent: item.userAgent || '', address: req.socket.remoteAddress});
      return reply(res, 200, {ok: true, heartbeat: true});
    }
    devices.set(id, {lastSeen: Date.now(), userAgent: item.userAgent || '', address: req.socket.remoteAddress});
    write(String(item.level || 'LOG').toUpperCase(), String(item.message || ''), {
      deviceId: id, seq: item.seq || 0, url: item.url || '', details: item.details || {}
    });
    return reply(res, 200, {ok: true});
  });
});
server.listen(PORT, HOST, () => {
  write('SERVER', 'FLIXTV Debug Receiver listening', {url: 'http://192.168.0.139:' + PORT, health: '/health', logFile: LOG_FILE});
});
