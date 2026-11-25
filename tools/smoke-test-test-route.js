"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "../apps/web");
const port = 19000 + (process.pid % 10000);
const base = "http://127.0.0.1:" + port;
const child = spawn(process.execPath, ["server.js"], {
  cwd: webRoot,
  env: Object.assign({}, process.env, { PORT: String(port) }),
  stdio: ["ignore", "pipe", "pipe"]
});
let stderr = "";
child.stderr.on("data", chunk => { stderr += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error("FLIXTV test server exited early: " + stderr);
    try {
      const response = await fetch(base + "/health");
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("FLIXTV test server did not become ready: " + stderr);
}

(async () => {
  try {
    await waitForServer();

    const rootResponse = await fetch(base + "/");
    assert.equal(rootResponse.status, 200, "main app shell must respond");
    const rootHtml = await rootResponse.text();
    assert.ok(!rootHtml.includes("/diagnostics.js"), "main app must not load diagnostics");
    assert.ok(!rootHtml.includes("/boot-guard.js"), "main app must not load test boot guard");
    assert.ok(rootHtml.includes("https://img.youtube.com"), "CSP must allow YouTube thumbnail images");

    const translationPost = await fetch(base + "/api/translate.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(translationPost.status, 400, "translation API must parse JSON POST bodies");

    const testResponse = await fetch(base + "/test");
    assert.equal(testResponse.status, 200, "/test must serve the app shell");
    const testHtml = await testResponse.text();
    assert.ok(testHtml.includes("window.__FLIXTV_TEST_MODE__=true"), "/test mode marker missing");
    assert.ok(testHtml.includes("/diagnostics.js"), "/test diagnostics script missing");
    assert.ok(testHtml.includes("/boot-guard.js"), "/test boot guard missing");

    const apiResponse = await fetch(base + "/api/__test_missing__?__flxtv_test=1&__flxtv_session=smoke-session-a");
    assert.equal(apiResponse.status, 404, "test-tagged unknown API should return 404");

    const ownResponse = await fetch(base + "/api/test-observability?__flxtv_test=1&__flxtv_session=smoke-session-a&after=0");
    assert.equal(ownResponse.status, 200, "test telemetry endpoint must respond");
    const own = await ownResponse.json();
    assert.ok(own.events.some(event => event.path === "/api/__test_missing__"), "server request event was not captured");
    assert.ok(typeof own.server.cpuPercent === "number", "server CPU metric missing");
    assert.ok(typeof own.server.memoryMB.rss === "number", "server memory metric missing");

    const otherResponse = await fetch(base + "/api/test-observability?__flxtv_test=1&__flxtv_session=smoke-session-b&after=0");
    const other = await otherResponse.json();
    assert.equal(other.events.length, 0, "server telemetry leaked across browser sessions");

    console.log("FLIXTV /test observability smoke test passed.");
  } finally {
    child.kill("SIGTERM");
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
