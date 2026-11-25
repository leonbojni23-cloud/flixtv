(function () {
"use strict";
if (window.__FLIXTV_TEST_MODE__ !== true || window.__FLIXTV_OBSERVABILITY__) return;
window.__FLIXTV_OBSERVABILITY__ = true;

const VERSION = "2.0.0";
const MAX_EVENTS = 3000;
const MAX_NETWORK = 1800;
const STORE_KEY = "flxtv:test-observability:v2";
const startedAt = performance.now();
const nativeConsole = {};
["log","info","warn","error","debug","table","group","groupEnd"].forEach(function (name) {
  nativeConsole[name] = console[name] ? console[name].bind(console) : function () {};
});
const events = [];
const network = [];
const samples = [];
let sequence = 0;
let panel = null;
let activeTab = "overview";
let filterText = "";
let renderQueued = false;
let persistTimer = 0;
let serverCursor = 0;
let serverState = null;
let lastServerErrorAt = 0;
let fpsFrames = 0;
let fpsStarted = performance.now();
let fps = 0;
let longTasks = 0;
let cls = 0;
let lcp = null;
let inp = null;
let lastInteraction = null;
let lastCpu = null;
let lastMetricsAt = performance.now();
let latestMetrics = {};
let mediaObserved = new WeakSet();
let requestCount = 0;
let failedRequests = 0;

function redactString(value) {
  return String(value)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]")
    .replace(/([?&](?:api_key|apikey|token|access_token|auth|signature|sig|secret|password|key)=)[^&#\s]*/gi, "$1[REDACTED]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g, "[REDACTED]");
}
function cleanUrl(value) {
  try {
    const u = new URL(value instanceof Request ? value.url : String(value || ""), location.href);
    Array.from(u.searchParams.keys()).forEach(function (key) {
      if (/token|key|auth|secret|password|session|signature|^sig$|api.?key/i.test(key)) u.searchParams.set(key, "[REDACTED]");
    });
    u.username = ""; u.password = "";
    return u.origin === location.origin ? u.pathname + u.search : u.origin + u.pathname + u.search;
  } catch (_) { return redactString(value || "").slice(0, 500); }
}
function safe(value, depth) {
  depth = depth || 0;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value).slice(0, 1800);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return String(value);
  if (value instanceof Error) return { name: value.name, message: redactString(value.message), stack: redactString(value.stack || "").slice(0, 4500) };
  if (value instanceof Request) return { method: value.method, url: cleanUrl(value.url) };
  if (value instanceof Response) return { status: value.status, ok: value.ok, type: value.type, url: cleanUrl(value.url) };
  if (typeof Element !== "undefined" && value instanceof Element) return {
    tag: value.tagName, id: value.id || "", className: typeof value.className === "string" ? value.className.slice(0, 240) : "",
    role: value.getAttribute("role") || "", ariaLabel: value.getAttribute("aria-label") || ""
  };
  if (typeof value === "function") return "[Function " + (value.name || "anonymous") + "]";
  if (typeof value !== "object") return String(value);
  if (depth > 4) return Object.prototype.toString.call(value);
  if (Array.isArray(value)) return value.slice(0, 35).map(function (x) { return safe(x, depth + 1); });
  const out = {};
  Object.keys(value).slice(0, 45).forEach(function (key) {
    if (/authorization|cookie|password|token|secret|api.?key|credential/i.test(key)) out[key] = "[REDACTED]";
    else { try { out[key] = safe(value[key], depth + 1); } catch (_) { out[key] = "[unreadable]"; } }
  });
  return out;
}
function record(category, name, detail, level) {
  const item = {
    id: ++sequence, time: new Date().toISOString(),
    elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
    category: category || "event", name: name || "unknown", level: level || "info",
    detail: safe(detail || {})
  };
  events.push(item);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  if (panel) scheduleRender();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 300);
  return item;
}
function recordNetwork(item) {
  item.id = ++sequence;
  item.time = item.time || new Date().toISOString();
  network.push(safe(item));
  if (item.phase === "request" || item.phase === "resource") requestCount++;
  if ((item.phase === "response" && (Number(item.status) >= 400 || Number(item.status) === 0)) || item.phase === "error" || item.error) failedRequests++;
  if (network.length > MAX_NETWORK) network.splice(0, network.length - MAX_NETWORK);
  if (panel) scheduleRender();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 300);
}
function persist() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({
      events: events.slice(-650), network: network.slice(-400), sequence: sequence,
      savedAt: new Date().toISOString()
    }));
  } catch (_) {}
}
try {
  const old = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
  if (old && Array.isArray(old.events)) events.push.apply(events, old.events.slice(-650));
  if (old && Array.isArray(old.network)) network.push.apply(network, old.network.slice(-400));
  sequence = Math.max(Number(old && old.sequence) || 0, events.reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, 0));
} catch (_) {}

function snapshot() {
  const nav = performance.getEntriesByType("navigation")[0];
  const memory = performance.memory ? {
    usedMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
    totalMB: +(performance.memory.totalJSHeapSize / 1048576).toFixed(1),
    limitMB: +(performance.memory.jsHeapSizeLimit / 1048576).toFixed(1)
  } : null;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const player = document.getElementById("player-modal");
  return {
    app: "FLIXTV", observabilityVersion: VERSION, mode: "test-only", capturedAt: new Date().toISOString(),
    url: cleanUrl(location.href), route: location.pathname, userAgent: navigator.userAgent,
    platform: navigator.platform, language: navigator.language, online: navigator.onLine,
    visibility: document.visibilityState, readyState: document.readyState,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, screenWidth: screen.width, screenHeight: screen.height },
    hardwareConcurrency: navigator.hardwareConcurrency || null, deviceMemoryGB: navigator.deviceMemory || null,
    connection: connection ? { effectiveType: connection.effectiveType, downlink: connection.downlink, rtt: connection.rtt, saveData: connection.saveData } : null,
    memory: memory, fps: fps, cls: +cls.toFixed(4), lcpMs: lcp, inpMs: inp,
    navigation: nav ? {
      type: nav.type, redirectMs: Math.round(nav.redirectEnd - nav.redirectStart),
      dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      connectMs: Math.round(nav.connectEnd - nav.connectStart),
      ttfbMs: Math.round(nav.responseStart - nav.requestStart),
      domReadyMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd), transferBytes: nav.transferSize || 0
    } : null,
    player: { exists: !!player, open: !!(player && player.classList.contains("open")), iframe: !!document.getElementById("cinesrc-frame"), video: !!document.getElementById("resolved-video") },
    counts: { events: events.length, requests: requestCount, failedRequests: failedRequests, longTasks: longTasks }
  };
}
function metrics() {
  const mem = performance.memory;
  const now = performance.now();
  const nav = performance.getEntriesByType("navigation")[0];
  const durations = network.map(function (n) { return Number(n.durationMs) || 0; }).filter(function (x) { return x > 0; }).sort(function (a,b) { return a-b; });
  const percentile = durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] : 0;
  latestMetrics = {
    uptimeSec: Math.round((now - startedAt) / 1000),
    fps: fps,
    heapUsedMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
    heapLimitMB: mem ? +(mem.jsHeapSizeLimit / 1048576).toFixed(1) : null,
    requests: requestCount, failures: failedRequests,
    requestFailureRate: requestCount ? +(failedRequests / requestCount * 100).toFixed(1) : 0,
    p95RequestMs: Math.round(percentile), longTasks: longTasks,
    cls: +cls.toFixed(4), lcpMs: lcp, inpMs: inp,
    domReadyMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadMs: nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null,
    events: events.length
  };
  samples.push({ time: new Date().toISOString(), metrics: latestMetrics });
  if (samples.length > 300) samples.shift();
  lastMetricsAt = now;
  if (panel && activeTab === "overview") scheduleRender();
  return latestMetrics;
}

function patchConsole() {
  ["log","info","warn","error","debug","table"].forEach(function (method) {
    const original = console[method] ? console[method].bind(console) : nativeConsole.log;
    console[method] = function () {
      const args = Array.prototype.slice.call(arguments, 0, 12).map(function (x) { return safe(x); });
      record("console", "console." + method, { args: args }, method === "error" ? "error" : method === "warn" ? "warn" : "debug");
      return original.apply(null, arguments);
    };
  });
}
patchConsole();

function markTestRequest(input, init) {
  let url;
  try { url = new URL(input instanceof Request ? input.url : String(input), location.href); } catch (_) { return { input: input, init: init, url: cleanUrl(input) }; }
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/") || url.pathname === "/api/test-observability") {
    return { input: input, init: init, url: cleanUrl(url.href) };
  }
  url.searchParams.set("__flxtv_test", "1");
  try {
    if (input instanceof Request) return { input: new Request(url.href, input), init: init, url: cleanUrl(url.href) };
    return { input: url.href, init: init, url: cleanUrl(url.href) };
  } catch (_) { return { input: input, init: init, url: cleanUrl(url.href) }; }
}
if (window.fetch) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const marked = markTestRequest(input, init);
    const method = String((init && init.method) || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const started = performance.now();
    const entry = { time: new Date().toISOString(), method: method, url: marked.url, transport: "fetch" };
    recordNetwork(Object.assign({ phase: "request" }, entry));
    try {
      const response = await originalFetch(marked.input, marked.init);
      const duration = +(performance.now() - started).toFixed(2);
      const result = Object.assign({}, entry, {
        phase: "response", status: response.status, ok: response.ok, type: response.type,
        redirected: response.redirected, responseUrl: cleanUrl(response.url), durationMs: duration,
        contentType: response.headers.get("content-type") || "",
        contentLength: Number(response.headers.get("content-length")) || null
      });
      recordNetwork(result);
      record("network", "fetch.response", result, response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "debug");
      return response;
    } catch (error) {
      const result = Object.assign({}, entry, { phase: "error", durationMs: +(performance.now() - started).toFixed(2), error: safe(error) });
      recordNetwork(result);
      record("network", "fetch.error", result, "error");
      throw error;
    }
  };
}
if (window.XMLHttpRequest) {
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open, originalSend = proto.send;
  proto.open = function (method, url) {
    let target = url;
    try {
      const u = new URL(String(url), location.href);
      if (u.origin === location.origin && u.pathname.startsWith("/api/") && u.pathname !== "/api/test-observability") {
        u.searchParams.set("__flxtv_test", "1"); target = u.href;
      }
    } catch (_) {}
    this.__flxObs = { method: String(method || "GET").toUpperCase(), url: cleanUrl(target) };
    return originalOpen.apply(this, [method, target].concat(Array.prototype.slice.call(arguments, 2)));
  };
  proto.send = function () {
    const xhr = this, meta = this.__flxObs || { method: "GET", url: "[unknown]" }, start = performance.now();
    recordNetwork(Object.assign({ phase: "request", transport: "xhr", time: new Date().toISOString() }, meta));
    xhr.addEventListener("loadend", function () {
      const result = Object.assign({ phase: "response", transport: "xhr", status: xhr.status, ok: xhr.status >= 200 && xhr.status < 400,
        durationMs: +(performance.now() - start).toFixed(2), responseType: xhr.responseType || "" }, meta);
      recordNetwork(result);
      record("network", "xhr.response", result, xhr.status >= 500 ? "error" : xhr.status >= 400 || xhr.status === 0 ? "warn" : "debug");
    }, { once: true });
    xhr.addEventListener("error", function () { record("network", "xhr.error", meta, "error"); }, { once: true });
    return originalSend.apply(this, arguments);
  };
}

window.addEventListener("error", function (event) {
  const resource = event.target && event.target !== window;
  record("errors", resource ? "resource.error" : "javascript.error", resource
    ? { tag: event.target.tagName, url: cleanUrl(event.target.src || event.target.href || ""), html: String(event.target.outerHTML || "").slice(0, 400) }
    : { message: event.message, file: cleanUrl(event.filename), line: event.lineno, column: event.colno, error: safe(event.error) }, "error");
}, true);
window.addEventListener("unhandledrejection", function (event) {
  record("errors", "promise.unhandledrejection", { reason: safe(event.reason) }, "error");
});
window.addEventListener("rejectionhandled", function (event) {
  record("errors", "promise.rejectionhandled", { reason: safe(event.reason) }, "warn");
});
window.addEventListener("securitypolicyviolation", function (event) {
  record("security", "csp.violation", { directive: event.effectiveDirective, blockedURI: cleanUrl(event.blockedURI), sourceFile: cleanUrl(event.sourceFile), line: event.lineNumber, disposition: event.disposition }, "warn");
});
["online","offline","focus","blur","pageshow","pagehide","visibilitychange","orientationchange","resize"].forEach(function (name) {
  const target = name === "visibilitychange" ? document : window;
  target.addEventListener(name, function (event) {
    record("lifecycle", name, { state: document.visibilityState, online: navigator.onLine, width: innerWidth, height: innerHeight,
      orientation: screen.orientation ? screen.orientation.type : "", persisted: event && event.persisted });
  }, { passive: true });
});

function describeTarget(target) {
  if (!target || !target.closest) return null;
  const el = target.closest("button,a,[role='button'],input,select,textarea,[data-page],[data-bf-page],[tabindex]");
  if (!el) return null;
  return {
    tag: el.tagName, id: el.id || "", className: typeof el.className === "string" ? el.className.slice(0, 180) : "",
    role: el.getAttribute("role") || "", type: el.getAttribute("type") || "",
    label: (el.getAttribute("aria-label") || el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
    page: el.dataset ? (el.dataset.page || el.dataset.bfPage || "") : "",
    disabled: !!el.disabled, href: el.tagName === "A" ? cleanUrl(el.href) : ""
  };
}
document.addEventListener("click", function (event) {
  const target = describeTarget(event.target);
  if (target) record("ui", "ui.click", { target: target, x: event.clientX, y: event.clientY, trusted: event.isTrusted }, "debug");
}, true);
["input","change","submit","keydown"].forEach(function (name) {
  document.addEventListener(name, function (event) {
    const target = describeTarget(event.target);
    if (!target) return;
    record("ui", "ui." + name, { target: target, key: name === "keydown" ? event.key : undefined, trusted: event.isTrusted }, "debug");
  }, true);
});

function observeMedia(root) {
  const nodes = [];
  if (root && root.matches && root.matches("video,audio,iframe")) nodes.push(root);
  if (root && root.querySelectorAll) nodes.push.apply(nodes, root.querySelectorAll("video,audio,iframe"));
  nodes.forEach(function (node) {
    if (mediaObserved.has(node)) return;
    mediaObserved.add(node);
    const isFrame = node.tagName === "IFRAME";
    ["load","error"].concat(isFrame ? [] : ["play","playing","pause","waiting","stalled","seeking","seeked","ended","loadedmetadata","canplay","timeupdate","volumechange","ratechange","emptied","abort"]).forEach(function (name) {
      node.addEventListener(name, function () {
        record("media", "media." + name, {
          tag: node.tagName, id: node.id || "", src: cleanUrl(node.currentSrc || node.src || ""),
          currentTime: Number.isFinite(node.currentTime) ? +node.currentTime.toFixed(2) : null,
          duration: Number.isFinite(node.duration) ? +node.duration.toFixed(2) : null,
          readyState: node.readyState, networkState: node.networkState, paused: node.paused, muted: node.muted
        }, name === "error" || name === "stalled" ? "warn" : "debug");
      }, { passive: true });
    });
  });
}
observeMedia(document);
if (window.MutationObserver) {
  new MutationObserver(function (recordsList) {
    recordsList.forEach(function (r) { r.addedNodes.forEach(observeMedia); });
  }).observe(document.documentElement, { childList: true, subtree: true });
}

if (window.PerformanceObserver) {
  function observe(type, callback) {
    try { new PerformanceObserver(function (list) { list.getEntries().forEach(callback); }).observe({ type: type, buffered: true }); } catch (_) {}
  }
  observe("resource", function (entry) {
    if (entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest") return;
    const item = {
      phase: "resource", transport: "resource-timing", method: entry.initiatorType || "resource",
      url: cleanUrl(entry.name), durationMs: +entry.duration.toFixed(2),
      transferBytes: entry.transferSize || 0, encodedBytes: entry.encodedBodySize || 0,
      decodedBytes: entry.decodedBodySize || 0, protocol: entry.nextHopProtocol || ""
    };
    recordNetwork(item);
  });
  observe("longtask", function (entry) {
    longTasks++;
    record("performance", "performance.longtask", { durationMs: +entry.duration.toFixed(2), startMs: +entry.startTime.toFixed(2), name: entry.name }, "warn");
  });
  observe("largest-contentful-paint", function (entry) {
    lcp = Math.round(entry.startTime);
    record("performance", "webvital.lcp", { valueMs: lcp, element: entry.element ? safe(entry.element) : null }, "info");
  });
  observe("layout-shift", function (entry) {
    if (!entry.hadRecentInput) cls += entry.value;
    record("performance", "webvital.layout-shift", { value: entry.value, cumulative: +cls.toFixed(4), hadRecentInput: entry.hadRecentInput }, entry.value > 0.1 ? "warn" : "debug");
  });
  observe("event", function (entry) {
    if (entry.interactionId) {
      inp = Math.max(inp || 0, Math.round(entry.duration));
      record("performance", "webvital.interaction", { name: entry.name, durationMs: Math.round(entry.duration), interactionId: entry.interactionId }, entry.duration > 200 ? "warn" : "debug");
    }
  });
  observe("paint", function (entry) {
    record("performance", "paint." + entry.name, { startMs: Math.round(entry.startTime) }, "info");
  });
}
function frameLoop(now) {
  fpsFrames++;
  if (now - fpsStarted >= 1000) {
    fps = Math.round(fpsFrames * 1000 / (now - fpsStarted));
    fpsFrames = 0; fpsStarted = now;
  }
  requestAnimationFrame(frameLoop);
}
requestAnimationFrame(frameLoop);

async function pollServer() {
  if (document.hidden) return;
  try {
    const url = "/api/test-observability?__flxtv_test=1&after=" + encodeURIComponent(serverCursor);
    const response = await nativeFetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Server telemetry endpoint returned " + response.status);
    const data = await response.json();
    serverState = data.server || null;
    (data.events || []).forEach(function (item) {
      serverCursor = Math.max(serverCursor, Number(item.id) || 0);
      record("server", item.name || "server.http", item, item.level || "info");
    });
    if (panel) scheduleRender();
  } catch (error) {
    if (!serverState && Date.now() - lastServerErrorAt > 15000) { lastServerErrorAt = Date.now(); record("server", "server.telemetry.unavailable", { message: error.message }, "warn"); }
  }
}
const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
if (nativeFetch) {
  pollServer();
  setInterval(pollServer, 1800);
}

function makeTextExport() {
  const data = {
    app: "FLIXTV", mode: "test-only", version: VERSION, exportedAt: new Date().toISOString(),
    snapshot: snapshot(), liveMetrics: metrics(), server: serverState,
    events: events, network: network, performanceSamples: samples
  };
  return [
    "FLIXTV TEST OBSERVABILITY EXPORT",
    "Exported: " + data.exportedAt,
    "Version: " + VERSION,
    "",
    "=== SNAPSHOT ===", JSON.stringify(data.snapshot, null, 2),
    "",
    "=== LIVE METRICS ===", JSON.stringify(data.liveMetrics, null, 2),
    "",
    "=== SERVER ===", JSON.stringify(data.server, null, 2),
    "",
    "=== EVENTS (" + events.length + ") ===", JSON.stringify(data.events, null, 2),
    "",
    "=== NETWORK (" + network.length + ") ===", JSON.stringify(data.network, null, 2),
    "",
    "=== PERFORMANCE SAMPLES (" + samples.length + ") ===", JSON.stringify(data.performanceSamples, null, 2)
  ].join("\n");
}
function downloadText() {
  const blob = new Blob([makeTextExport()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "flixtv-test-observability-" + new Date().toISOString().replace(/[:.]/g, "-") + ".txt";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  record("developer", "export.txt", { events: events.length, network: network.length });
}
async function copyAll() {
  const text = makeTextExport();
  try {
    await navigator.clipboard.writeText(text);
    record("developer", "copy.all.success", { chars: text.length });
    const button = panel && panel.querySelector("[data-action='copy']");
    if (button) { button.textContent = "Copied"; setTimeout(function () { if (button.isConnected) button.textContent = "Copy all"; }, 1400); }
  } catch (error) {
    record("developer", "copy.all.failed", { message: error.message }, "warn");
    const area = document.createElement("textarea");
    area.value = text; area.style.cssText = "position:fixed;opacity:0;left:-9999px;top:0";
    document.body.appendChild(area); area.select();
    try { document.execCommand("copy"); } catch (_) {}
    area.remove();
  }
}
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(function () { renderQueued = false; renderPanel(); });
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function metricCard(label, value, hint) {
  const card = el("article", "obs-metric");
  card.append(el("span", "obs-metric-label", label), el("strong", "obs-metric-value", value === null || value === undefined ? "n/a" : String(value)), el("small", "obs-metric-hint", hint || ""));
  return card;
}
function renderOverview(host) {
  const m = metrics();
  const grid = el("div", "obs-metric-grid");
  grid.append(
    metricCard("FPS", m.fps, "Frame rate"),
    metricCard("JS heap", m.heapUsedMB === null ? "n/a" : m.heapUsedMB + " MB", m.heapLimitMB === null ? "Memory API unavailable" : "Limit " + m.heapLimitMB + " MB"),
    metricCard("Requests", m.requests, "Tracked fetch / XHR / resources"),
    metricCard("Failed", m.failures, m.requestFailureRate + "% failure rate"),
    metricCard("P95 latency", m.p95RequestMs + " ms", "Recent request sample"),
    metricCard("Long tasks", m.longTasks, "Main-thread tasks > 50 ms"),
    metricCard("CLS", m.cls, "Cumulative layout shift"),
    metricCard("LCP", m.lcpMs === null ? "pending" : m.lcpMs + " ms", "Largest contentful paint"),
    metricCard("INP", m.inpMs === null ? "pending" : m.inpMs + " ms", "Observed interaction latency"),
    metricCard("Uptime", m.uptimeSec + " s", "This page session"),
    metricCard("Events", m.events, "Captured browser events"),
    metricCard("Server CPU", serverState && serverState.cpuPercent !== undefined ? serverState.cpuPercent + "%" : "n/a", "Node process CPU sample"),
    metricCard("Server RSS", serverState && serverState.memoryMB ? serverState.memoryMB.rss + " MB" : "n/a", "Railway container process"),
    metricCard("Server heap", serverState && serverState.memoryMB ? serverState.memoryMB.heapUsed + " MB" : "n/a", "Node.js heap used"),
    metricCard("Server", serverState ? "Connected" : "Waiting", serverState ? "Railway process metrics" : "Waiting for server samples")
  );
  host.append(grid);
  const s = snapshot();
  const info = el("pre", "obs-pre", JSON.stringify({
    device: { viewport: s.viewport, platform: s.platform, hardwareConcurrency: s.hardwareConcurrency, deviceMemoryGB: s.deviceMemoryGB, connection: s.connection },
    navigation: s.navigation, player: s.player, server: serverState
  }, null, 2));
  host.append(el("h3", "obs-section-title", "Runtime snapshot"), info);
}
function renderList(host, list, type) {
  const q = filterText.toLowerCase();
  const items = list.slice().reverse().filter(function (item) {
    return !q || JSON.stringify(item).toLowerCase().indexOf(q) >= 0;
  }).slice(0, 450);
  if (!items.length) { host.append(el("div", "obs-empty", "No records captured yet.")); return; }
  const wrap = el("div", "obs-record-list");
  items.forEach(function (item) {
    const row = el("article", "obs-record " + (item.level || (item.status >= 400 ? "warn" : "info")));
    const top = el("div", "obs-record-top");
    const time = item.time || item.t || "";
    const title = item.name || item.type || item.phase || "event";
    top.append(el("time", "", time), el("strong", "", title), el("span", "obs-badge", item.level || (item.status ? "HTTP " + item.status : type)));
    const detail = el("pre", "obs-record-detail", JSON.stringify(item.detail || item, null, 2));
    row.append(top, detail);
    wrap.append(row);
  });
  host.append(wrap);
}
function renderPanel() {
  if (!panel || !panel.isConnected) return;
  const content = panel.querySelector("[data-content]");
  if (!content) return;
  content.replaceChildren();
  const source = activeTab === "network" ? network :
    activeTab === "errors" ? events.filter(function (x) { return x.category === "errors" || x.level === "error" || x.level === "warn"; }) :
    activeTab === "performance" ? events.filter(function (x) { return x.category === "performance"; }) :
    activeTab === "console" ? events.filter(function (x) { return x.category === "console"; }) :
    activeTab === "events" ? events : [];
  if (activeTab === "overview") renderOverview(content);
  else renderList(content, source, activeTab);
  const status = panel.querySelector("[data-status]");
  if (status) status.textContent = "LIVE · " + events.length + " events · " + network.length + " network records";
}
function openPanel() {
  if (panel) { panel.remove(); panel = null; return; }
  panel = el("section", "obs-panel");
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "FLIXTV Developer observability");
  const header = el("header", "obs-header");
  const brand = el("div", "obs-brand");
  brand.append(el("strong", "", "FLIXTV"), el("span", "", "DEVELOPER"));
  const status = el("span", "obs-status", "LIVE"); status.dataset.status = "";
  const actions = el("div", "obs-actions");
  const copy = el("button", "obs-action", "Copy all"); copy.dataset.action = "copy"; copy.onclick = copyAll;
  const exportButton = el("button", "obs-action obs-primary", "Export all .txt"); exportButton.onclick = downloadText;
  const clear = el("button", "obs-action", "Clear"); clear.onclick = function () {
    events.length = 0; network.length = 0; samples.length = 0; requestCount = 0; failedRequests = 0; sequence = 0; serverCursor = 0;
    try { sessionStorage.removeItem(STORE_KEY); } catch (_) {}
    record("developer", "logs.cleared", {}, "warn"); renderPanel();
  };
  const close = el("button", "obs-close", "×"); close.setAttribute("aria-label", "Close developer panel"); close.onclick = function () { panel.remove(); panel = null; };
  actions.append(copy, exportButton, clear, close);
  header.append(brand, status, actions);
  const tabs = el("nav", "obs-tabs");
  [["overview","Overview"],["network","Network"],["errors","Errors"],["performance","Performance"],["events","Events"],["console","Console"]].forEach(function (pair) {
    const b = el("button", "obs-tab" + (pair[0] === activeTab ? " active" : ""), pair[1]);
    b.dataset.tab = pair[0]; b.onclick = function () {
      activeTab = pair[0]; tabs.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x.dataset.tab === activeTab); }); renderPanel();
    };
    tabs.append(b);
  });
  const tools = el("div", "obs-tools");
  const search = el("input", "obs-search"); search.type = "search"; search.placeholder = "Filter logs, endpoints, errors…";
  search.value = filterText; search.oninput = function () { filterText = search.value; renderPanel(); };
  const refresh = el("button", "obs-action", "Refresh snapshot"); refresh.onclick = function () { record("developer", "snapshot.manual", snapshot()); renderPanel(); };
  tools.append(search, refresh);
  const content = el("main", "obs-content"); content.dataset.content = "";
  panel.append(header, tabs, tools, content);
  document.body.append(panel);
  renderPanel();
}
function addStyles() {
  if (document.getElementById("flxtv-observability-style")) return;
  const style = document.createElement("style"); style.id = "flxtv-observability-style";
  style.textContent = [
    ".obs-dev-button{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483646;border:1px solid #ffffff35;border-radius:999px;padding:11px 16px;background:rgba(15,20,29,.92);backdrop-filter:blur(18px);color:#fff;font:700 12px/1 system-ui;letter-spacing:.5px;box-shadow:0 8px 30px #0008}",
    ".obs-panel{position:fixed;inset:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);z-index:2147483647;background:#080b12f7;color:#edf2fb;display:flex;flex-direction:column;font:13px/1.45 system-ui,-apple-system,sans-serif;border:1px solid #ffffff24;box-sizing:border-box}",
    ".obs-header{display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid #ffffff18;flex-wrap:wrap}",
    ".obs-brand{display:flex;align-items:center;gap:10px}.obs-brand strong{font-size:18px;letter-spacing:1px}.obs-brand span{font-size:10px;color:#ff536f;font-weight:800;letter-spacing:1.5px}",
    ".obs-status{color:#74e5a4;font:700 10px ui-monospace,monospace;margin-right:auto}.obs-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}",
    ".obs-action,.obs-close{border:1px solid #ffffff2b;border-radius:8px;padding:8px 11px;background:#ffffff0b;color:#f4f6fb;font:600 11px system-ui}.obs-primary{background:#e50936;border-color:#e50936}.obs-close{font-size:20px;line-height:15px;padding:7px 10px}",
    ".obs-tabs{display:flex;gap:5px;padding:8px 12px;border-bottom:1px solid #ffffff18;overflow-x:auto}.obs-tab{border:0;border-radius:8px;background:transparent;color:#aab4c6;padding:9px 13px;white-space:nowrap;font:600 12px system-ui}.obs-tab.active{background:#ffffff17;color:#fff}",
    ".obs-tools{display:flex;gap:8px;padding:9px 12px;border-bottom:1px solid #ffffff18}.obs-search{flex:1;min-width:0;border:1px solid #ffffff25;border-radius:8px;background:#ffffff0a;color:#fff;padding:9px 11px;font:12px system-ui}",
    ".obs-content{overflow:auto;overscroll-behavior:contain;padding:12px;flex:1;min-height:0}.obs-metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px}.obs-metric{padding:13px;border:1px solid #ffffff18;border-radius:11px;background:linear-gradient(145deg,#ffffff0c,#ffffff04);display:grid;gap:4px}.obs-metric-label{color:#9ba8bb;font-size:11px}.obs-metric-value{font-size:22px;font-weight:750;letter-spacing:-.5px}.obs-metric-hint{color:#738096;font-size:10px}",
    ".obs-section-title{font-size:13px;margin:18px 0 8px}.obs-pre,.obs-record-detail{white-space:pre-wrap;overflow-wrap:anywhere;background:#ffffff08;border:1px solid #ffffff12;border-radius:9px;padding:10px;color:#b8c5d8;font:10px/1.5 ui-monospace,SFMono-Regular,monospace}",
    ".obs-record-list{display:grid;gap:7px}.obs-record{border:1px solid #ffffff19;border-left:3px solid #64748b;border-radius:8px;background:#ffffff06;padding:9px}.obs-record.error{border-left-color:#ff5c72}.obs-record.warn{border-left-color:#ffbd66}.obs-record.debug{border-left-color:#64748b}.obs-record-top{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.obs-record-top time{color:#7d8ba0;font:10px ui-monospace,monospace}.obs-record-top strong{font-size:12px}.obs-badge{margin-left:auto;color:#9eabc0;font:9px ui-monospace,monospace;text-transform:uppercase}.obs-record-detail{margin:8px 0 0;font-size:10px}.obs-empty{padding:35px;text-align:center;color:#8793a7}",
    "@media(max-width:600px){.obs-header{gap:8px;padding:9px}.obs-brand strong{font-size:15px}.obs-actions{width:100%}.obs-actions .obs-action{flex:1}.obs-close{flex:0 0 auto}.obs-content{padding:9px}.obs-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.obs-metric-value{font-size:19px}}"
  ].join("");
  document.head.appendChild(style);
}
function installButton() {
  if (document.querySelector(".obs-dev-button")) return;
  const button = el("button", "obs-dev-button", "DEVELOPER");
  button.type = "button"; button.setAttribute("aria-label", "Open developer observability panel");
  button.addEventListener("click", openPanel);
  document.body.appendChild(button);
}
function install() {
  addStyles(); installButton();
  record("system", "observability.started", { version: VERSION, snapshot: snapshot(), privacy: "No request bodies, response bodies, cookies, auth headers or input values are stored." });
  record("system", "app.route", { route: location.pathname, testMode: window.__FLIXTV_TEST_MODE__ });
  setInterval(metrics, 2000);
  document.addEventListener("keydown", function (event) {
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "d") openPanel();
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();

window.FlixDiagnostics = {
  open: openPanel,
  log: function (name, detail, level) { return record("app", name, detail, level || "info"); },
  snapshot: snapshot,
  export: makeTextExport,
  getData: function () { return { snapshot: snapshot(), events: events.slice(), network: network.slice(), samples: samples.slice(), server: serverState }; }
};
})();