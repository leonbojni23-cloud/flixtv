module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const text = String(req.query.text || "").trim();
  if (!text) return res.status(400).json({ error: "Missing text" });
  if (text.length > 5000) return res.status(413).json({ error: "Text too long" });

  try {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=sq&dt=t&q=" + encodeURIComponent(text);
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error("Translation service unavailable");
    const data = await upstream.json();
    const translated = (data[0] || []).map(part => part[0] || "").join("");
    if (!translated) throw new Error("Empty translation");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ translated });
  } catch (_) {
    return res.status(502).json({ error: "Translation failed" });
  }
};
