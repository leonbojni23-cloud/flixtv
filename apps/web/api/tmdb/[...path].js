module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "https://leonbojni23-cloud.github.io",
    "https://flixtv-web.vercel.app"
  ];
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "TMDB service is not configured" });

  const parts = Array.isArray(req.query.path) ? req.query.path : [];
  const path = "/" + parts.map(part => encodeURIComponent(part)).join("/");
  const allowed = /^\/(trending|movie|tv|search|discover|genre|configuration)(\/|$)/;
  if (!allowed.test(path)) return res.status(404).json({ error: "TMDB endpoint not allowed" });

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path" || key === "api_key" || key === "apiKey") continue;
    if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)));
    else if (value !== undefined) params.set(key, String(value));
  }
  params.set("api_key", apiKey);
  if (!params.has("language")) params.set("language", "en-US");

  try {
    const response = await fetch("https://api.themoviedb.org/3" + path + "?" + params.toString(), {
      headers: { Accept: "application/json" }
    });
    const body = await response.text();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    return res.status(response.status).send(body);
  } catch (error) {
    return res.status(502).json({ error: "TMDB upstream request failed" });
  }
};
