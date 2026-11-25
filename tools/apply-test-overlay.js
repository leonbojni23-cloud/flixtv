"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function write(file, value) { fs.writeFileSync(path.join(root, file), value); }
function replaceOnce(source, from, to, label) {
  const index = source.indexOf(from);
  if (index < 0) throw new Error("FLIXTV test overlay could not find anchor: " + label);
  if (source.indexOf(from, index + from.length) >= 0) throw new Error("FLIXTV test overlay found duplicate anchor: " + label);
  return source.slice(0, index) + to + source.slice(index + from.length);
}
let html = read("apps/web/index.html");
html = html.replace(/\s*<script src="\/diagnostics\.js[^"]*"><\/script>/, "");
html = html.replace(/\s*<script src="\/boot-guard\.js[^"]*"><\/script>/, "");
write("apps/web/index.html", html);

let server = read("apps/web/server.js");
server = replaceOnce(server,
  "const API_HANDLERS = new Set([",
  "const TEST_EVENT_LIMIT = 1200;\nlet testEventSequence = 0;\nconst testServerEvents = [];\nfunction pushTestServerEvent(item) {\n  const event = Object.assign({ id: ++testEventSequence, time: new Date().toISOString() }, item);\n  testServerEvents.push(event);\n  if (testServerEvents.length > TEST_EVENT_LIMIT) testServerEvents.splice(0, testServerEvents.length - TEST_EVENT_LIMIT);\n}\n\nconst API_HANDLERS = new Set([",
  "server telemetry buffer");
server = replaceOnce(server,
  "const server = http.createServer(async (req, res) => {",
  "function serveAppShell(req, res, testMode) {\n  let html;\n  try { html = fs.readFileSync(path.join(WEB_ROOT, \\"index.html\\"), \\"utf8\\"); }\n  catch (_) { return sendJson(res, 500, { error: \\"App shell not found\\" }); }\n  if (testMode) {\n    html = html.replace(\\"<head>\\", \\"<head>\\\\n<script>window.__FLIXTV_TEST_MODE__=true;</script>\\\\n<script src=\\\\\\"/diagnostics.js?v=test-observability-2\\\\\\"></script>\\\\n<script src=\\\\\\"/boot-guard.js?v=test-observability-2\\\\\\"></script>\\");\n  }\n  res.statusCode = 200;\n  res.setHeader(\\"Content-Type\\", \\"text/html; charset=utf-8\\");\n  res.setHeader(\\"X-Content-Type-Options\\", \\"nosniff\\");\n  res.setHeader(\\"Referrer-Policy\\", \\"origin\\");\n  res.setHeader(\\"Cache-Control\\", \\"no-store\\");\n  res.setHeader(\\"Content-Length\\", Buffer.byteLength(html));\n  if (req.method === \\"HEAD\\") return res.end();\n  return res.end(html);\n}\n\nconst server = http.createServer(async (req, res) => {",
  "test shell handler");
server = replaceOnce(server,
  "  const pathname = parsed.pathname;\n",
  "  const pathname = parsed.pathname;\n  const isTestRoute = pathname === \\"/test\\" || pathname === \\"/test/\\";\n  if (pathname === \\"/\\" || isTestRoute) return serveAppShell(req, res, isTestRoute);\n\n  const testTagged = parsed.searchParams.get(\\"__flxtv_test\\") === \\"1\\";\n  const testStartedAt = process.hrtime.bigint();\n  if (testTagged && pathname !== \\"/api/test-observability\\") {\n    res.once(\\"finish\\", () => pushTestServerEvent({\n      category: \\"server\\", name: \\"server.http\\", method: req.method,\n      path: pathname, status: res.statusCode,\n      durationMs: Number(process.hrtime.bigint() - testStartedAt) / 1e6,\n      responseBytes: Number(res.getHeader(\\"content-length\\")) || null,\n      level: res.statusCode >= 500 ? \\"error\\" : res.statusCode >= 400 ? \\"warn\\" : \\"info\\",\n      userAgent: String(req.headers[\\"user-agent\\"] || \\"\\").slice(0, 180)\n    }));\n  }\n\n  if (pathname === \\"/api/test-observability\\") {\n    if (req.method !== \\"GET\\" || !testTagged) return sendJson(res, 404, { error: \\"Not found\\" });\n    const after = Number(parsed.searchParams.get(\\"after\\")) || 0;\n    const usage = process.memoryUsage();\n    return sendJson(res, 200, {\n      events: testServerEvents.filter(event => event.id > after),\n      server: { uptimeSec: Math.round(process.uptime()), pid: process.pid,\n        memoryMB: { rss: +(usage.rss / 1048576).toFixed(1), heapUsed: +(usage.heapUsed / 1048576).toFixed(1), heapTotal: +(usage.heapTotal / 1048576).toFixed(1), external: +(usage.external / 1048576).toFixed(1) },\n        eventBuffer: testServerEvents.length, capturedAt: new Date().toISOString() }\n    });\n  }\n",
  "request telemetry and test API");
write("apps/web/server.js", server);

let app = read("apps/web/app.js");
app = replaceOnce(app,
  'if(location.pathname.replace(/\\/$/,"")==="/sports")openPage("sports",false);else if(location.pathname!=="/")resolveTitleRoute();else home();',
  'if(window.__FLIXTV_TEST_MODE__===true&&/^\\/test\\/?$/.test(location.pathname)){document.documentElement.classList.remove("deep-route-loading");home()}else if(location.pathname.replace(/\\/$/,"")==="/sports")openPage("sports",false);else if(location.pathname!=="/")resolveTitleRoute();else home();',
  "app test route bootstrap");
write("apps/web/app.js", app);

write("apps/web/diagnostics.js", read("tools/test-observability.js"));
console.log("Applied FLIXTV test-only observability overlay.");
