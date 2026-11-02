const ALLOWED_PREFIXES = ["/trending/", "/movie/", "/tv/", "/search/", "/discover/"];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
  }

  const rawPath = typeof req.query.path === "string" ? req.query.path : "";
  const pathname = "/" + rawPath.replace(/^\/+/, "");
  if (
    !ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes("..")
  ) {
    return res.status(400).json({ error: "Unsupported endpoint" });
  }

  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(req.query || {})) {
    if (name === "path" || name === "api_key" || value == null) continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(name, String(item)));
    else params.set(name, String(value));
  }
  params.set("api_key", key);
  if (!params.has("language")) params.set("language", "en-US");

  if (!pathname.startsWith("/search/")) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  }

  try {
    const upstream = await fetch(
      "https://api.themoviedb.org/3" + pathname + "?" + params.toString()
    );
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.send(await upstream.text());
  } catch (error) {
    return res.status(502).json({ error: "TMDB upstream request failed" });
  }
};
