const ALLOWED_ID = /^tt\d{5,12}$/;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.APISH_KEY;
  if (!key) return res.status(503).json({ error: "APISH_KEY is not configured" });

  const id = String(req.query.id || "").trim();
  if (!ALLOWED_ID.test(id)) return res.status(400).json({ error: "Invalid IMDb title ID" });

  try {
    const url = new URL("https://api.api.sh/imdb/v1/title/videos");
    url.searchParams.set("id", id);
    url.searchParams.set("limit", "25");
    const upstream = await fetch(url, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(15000)
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: upstream.status === 404 ? "No IMDb videos found" : "IMDb video provider unavailable"
      });
    }

    const videos = (Array.isArray(body.videos) ? body.videos : [])
      .filter(video => video && Array.isArray(video.playback))
      .map(video => ({
        id: video.id || "",
        title: video.title || "",
        type: video.type || "",
        thumbnail: video.thumbnail || "",
        duration_seconds: Number(video.duration_seconds) || 0,
        playback: video.playback
          .filter(source => source && source.url && ["MP4", "M3U8"].includes(String(source.format || "").toUpperCase()))
          .map(source => ({ url: source.url, format: String(source.format).toUpperCase(), quality: source.quality || "" }))
      }))
      .filter(video => video.playback.length);

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ id, title: body.title || "", videos });
  } catch (_) {
    return res.status(502).json({ error: "IMDb video request failed" });
  }
};
