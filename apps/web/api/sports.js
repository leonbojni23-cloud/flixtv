module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const manifest = String(process.env.SPORTS_STREAMS_MANIFEST_URL || req.body?.manifest || "");
  const route = String(req.body?.path || "manifest.json").replace(/^\/+/, "");
  let base;
  try { base = new URL(manifest); } catch (_) { return res.status(400).json({ error: "Manifest URL e pavlefshme" }); }
  const allowedHosts = new Set(["sports.highfly.to", "sportsfree.highfly.to", "sportsfree-us2.highfly.to"]);
  const parts = base.pathname.split("/").filter(Boolean);
  if (base.protocol !== "https:" || !allowedHosts.has(base.hostname) || parts.length !== 2 || parts[1] !== "manifest.json" || base.search || base.hash) {
    return res.status(400).json({ error: "Përdor vetëm manifest URL zyrtare Sports Streams" });
  }
  let safeRoute;
  try {
    const segments = route.split("/");
    if (segments.length === 1 && segments[0] === "manifest.json") {
      safeRoute = "manifest.json";
    } else if (segments.length === 3 && ["catalog", "meta", "stream"].includes(segments[0])) {
      const decoded = segments.map(decodeURIComponent);
      if (decoded.some((part, index) => index > 0 && (!part || part === "." || part === ".." || /[\\/\x00-\x1f]/.test(part) || !/^[a-zA-Z0-9_.:@+-]+$/.test(part)))) throw new Error("Invalid route");
      if (!decoded[2].endsWith(".json")) throw new Error("Invalid route");
      safeRoute = [decoded[0], ...decoded.slice(1).map(encodeURIComponent)].join("/");
    } else throw new Error("Invalid route");
  } catch (_) {
    return res.status(400).json({ error: "Kërkesë e palejuar" });
  }
  const upstreamUrl = new URL(safeRoute, base.origin + "/" + parts[0] + "/");
  try {
    const upstream = await fetch(upstreamUrl.toString(), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    const body = await upstream.text();
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.setHeader("Cache-Control", route === "manifest.json" ? "no-store" : "s-maxage=30, stale-while-revalidate=60");
    return res.status(upstream.status).send(body);
  } catch (_) {
    return res.status(502).json({ error: "Sports Streams nuk u përgjigj. Provo përsëri." });
  }
};
