module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const manifest = String(req.body?.manifest || "");
  const route = String(req.body?.path || "manifest.json").replace(/^\/+/, "");
  let base;
  try { base = new URL(manifest); } catch (_) { return res.status(400).json({ error: "Manifest URL e pavlefshme" }); }
  const allowedHosts = new Set(["sports.highfly.to", "sportsfree.highfly.to", "sportsfree-us2.highfly.to"]);
  const parts = base.pathname.split("/").filter(Boolean);
  if (base.protocol !== "https:" || !allowedHosts.has(base.hostname) || parts.length !== 2 || parts[1] !== "manifest.json" || base.search || base.hash) {
    return res.status(400).json({ error: "Përdor vetëm manifest URL zyrtare Sports Streams" });
  }
  if (route.includes("..") || route.includes("\\") || !/^(manifest\.json|(?:catalog|meta|stream)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.:-]+\.json)$/.test(route)) {
    return res.status(400).json({ error: "Kërkesë e palejuar" });
  }
  const upstreamUrl = new URL(route, base.origin + "/" + parts[0] + "/");
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
