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
server = replaceOnce(server, "const API_HANDLERS = new Set([", [
  "const TEST_EVENT_LIMIT = 1200;",
  "let testEventSequence = 0;",
  "let testLastCpu = { at: process.hrtime.bigint(), usage: process.cpuUsage() };",
  "const testServerEvents = [];",
  "function pushTestServerEvent(item) {",
  "  const event = Object.assign({ id: ++testEventSequence, time: new Date().toISOString() }, item);",
  "  testServerEvents.push(event);",
  "  if (testServerEvents.length > TEST_EVENT_LIMIT) testServerEvents.splice(0, testServerEvents.length - TEST_EVENT_LIMIT);",
  "}",
  "",
  "const API_HANDLERS = new Set(["
].join("\n"), "server telemetry buffer");

const shellHandler = [
  "function serveAppShell(req, res, testMode) {",
  "  let html;",
  "  try { html = fs.readFileSync(path.join(WEB_ROOT, \"index.html\"), \"utf8\"); }",
  "  catch (_) { return sendJson(res, 500, { error: \"App shell not found\" }); }",
  "  if (testMode) {",
  "    html = html.replace(\"<head>\", \"<head>\\n<script>window.__FLIXTV_TEST_MODE__=true;</script>\\n<script src='/diagnostics.js?v=test-observability-2'></script>\\n<script src='/boot-guard.js?v=test-observability-2'></script>\");",
  "  }",
  "  res.statusCode = 200;",
  "  res.setHeader(\"Content-Type\", \"text/html; charset=utf-8\");",
  "  res.setHeader(\"X-Content-Type-Options\", \"nosniff\");",
  "  res.setHeader(\"Referrer-Policy\", \"origin\");",
  "  res.setHeader(\"Cache-Control\", \"no-store\");",
  "  res.setHeader(\"Content-Length\", Buffer.byteLength(html));",
  "  if (req.method === \"HEAD\") return res.end();",
  "  return res.end(html);",
  "}",
  "",
  "const server = http.createServer(async (req, res) => {"
].join("\n");
server = replaceOnce(server, "const server = http.createServer(async (req, res) => {", shellHandler, "test shell handler");

const requestTelemetry = [
  "  const pathname = parsed.pathname;",
  "  const isTestRoute = pathname === \"/test\" || pathname === \"/test/\";",
  "  if ((pathname === \"/\" || isTestRoute) && ![\"GET\", \"HEAD\"].includes(req.method)) {",
  "    res.setHeader(\"Allow\", \"GET, HEAD\");",
  "    return sendJson(res, 405, { error: \"Method not allowed\" });",
  "  }",
  "  if (pathname === \"/\" || isTestRoute) return serveAppShell(req, res, isTestRoute);",
  "",
  "  const testTagged = parsed.searchParams.get(\"__flxtv_test\") === \"1\";",
  "  const testStartedAt = process.hrtime.bigint();",
  "  if (testTagged && pathname !== \"/api/test-observability\") {",
  "    res.once(\"finish\", () => pushTestServerEvent({",
  "      category: \"server\", name: \"server.http\", method: req.method,",
  "      path: pathname, status: res.statusCode,",
  "      durationMs: +(Number(process.hrtime.bigint() - testStartedAt) / 1e6).toFixed(2),",
  "      responseBytes: Number(res.getHeader(\"content-length\")) || null,",
  "      level: res.statusCode >= 500 ? \"error\" : res.statusCode >= 400 ? \"warn\" : \"info\",",
  "      userAgent: String(req.headers[\"user-agent\"] || \"\").slice(0, 180)",
  "    }));",
  "  }",
  "",
  "  if (pathname === \"/api/test-observability\") {",
  "    if (req.method !== \"GET\" || !testTagged) return sendJson(res, 404, { error: \"Not found\" });",
  "    const after = Number(parsed.searchParams.get(\"after\")) || 0;",
  "    const usage = process.memoryUsage();",
  "    const cpuNowAt = process.hrtime.bigint();",
  "    const cpuNow = process.cpuUsage();",
  "    const cpuDelta = process.cpuUsage(testLastCpu.usage);",
  "    const cpuElapsedMicros = Number(cpuNowAt - testLastCpu.at) / 1000;",
  "    testLastCpu = { at: cpuNowAt, usage: cpuNow };",
  "    const cpuPercent = cpuElapsedMicros > 0 ? +((cpuDelta.user + cpuDelta.system) / cpuElapsedMicros * 100).toFixed(1) : 0;",
  "    return sendJson(res, 200, {",
  "      events: testServerEvents.filter(event => event.id > after),",
  "      server: { uptimeSec: Math.round(process.uptime()), pid: process.pid, cpuPercent: cpuPercent,",
  "        memoryMB: { rss: +(usage.rss / 1048576).toFixed(1), heapUsed: +(usage.heapUsed / 1048576).toFixed(1), heapTotal: +(usage.heapTotal / 1048576).toFixed(1), external: +(usage.external / 1048576).toFixed(1) },",
  "        eventBuffer: testServerEvents.length, capturedAt: new Date().toISOString() }",
  "    });",
  "  }",
  ""
].join("\n");
server = replaceOnce(server, "  const pathname = parsed.pathname;\n", requestTelemetry, "request telemetry and test API");
write("apps/web/server.js", server);

let app = read("apps/web/app.js");
app = replaceOnce(app,
  'if(location.pathname.replace(/\\/$/,"")==="/sports")openPage("sports",false);else if(location.pathname!=="/")resolveTitleRoute();else home();',
  'if(window.__FLIXTV_TEST_MODE__===true&&/^\\/test\\/?$/.test(location.pathname)){document.documentElement.classList.remove("deep-route-loading");home()}else if(location.pathname.replace(/\\/$/,"")==="/sports")openPage("sports",false);else if(location.pathname!=="/")resolveTitleRoute();else home();',
  "app test route bootstrap");
write("apps/web/app.js", app);

write("apps/web/diagnostics.js", read("tools/test-observability.js"));
console.log("Applied FLIXTV test-only observability overlay.");
