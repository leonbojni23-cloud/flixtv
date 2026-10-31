const http = require('http');
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'flixtv-debug.log');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || req.url !== '/log') { res.writeHead(404); return res.end(); }
  let data = '';
  req.on('data', part => { data += part; if (data.length > 65536) req.destroy(); });
  req.on('end', () => {
    try {
      const entry = JSON.parse(data);
      const line = '[' + new Date().toISOString() + '] [' + String(entry.level || 'log').toUpperCase() + '] ' + String(entry.message || '');
      console.log(line);
      fs.appendFile(file, line + '\n', () => {});
      res.writeHead(200); res.end('ok');
    } catch (e) { res.writeHead(400); res.end('invalid log'); }
  });
}).listen(8787, '0.0.0.0', () => console.log('FLIXTV logs: http://192.168.0.139:8787/log'));
