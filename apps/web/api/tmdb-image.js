const IMAGE_HOST = "https://image.tmdb.org";
const IMAGE_PATH_PATTERN = /^\/t\/p\/(?:w\d+|h\d+|original)\/[A-Za-z0-9/_-]+\.(?:jpe?g|png|webp)$/i;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Cache-Control");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawPath = typeof req.query.path === "string" ? req.query.path : "";
  if (
    !rawPath ||
    rawPath.length > 512 ||
    rawPath.includes("..") ||
    !IMAGE_PATH_PATTERN.test(rawPath)
  ) {
    return res.status(400).json({ error: "Unsupported TMDB image path" });
  }

  try {
    const upstream = await fetch(IMAGE_HOST + rawPath, {
      method: "GET",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(upstream.status).json({ error: "TMDB image unavailable" });
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({ error: "TMDB returned a non-image response" });
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("Content-Length", String(bytes.length));
    return res.send(bytes);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "TMDB image proxy request failed" });
  }
};
