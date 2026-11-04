module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const source = String(req.query.text || "").trim();
  if (!source) return res.status(400).json({ error: "Missing text" });
  if (source.length > 5000) return res.status(413).json({ error: "Text too long" });

  const translateWithGoogle = async () => {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=sq&dt=t&q=" + encodeURIComponent(source);
    const upstream = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) throw new Error("Google translation unavailable");
    const data = await upstream.json();
    const translated = (data[0] || []).map(part => part[0] || "").join("").trim();
    if (!translated) throw new Error("Google returned an empty translation");
    return translated;
  };

  const translateWithMemory = async () => {
    // MyMemory has a short per-request limit, so split long synopses at word boundaries.
    const words = source.split(/\s+/);
    const chunks = [];
    let chunk = "";
    for (const word of words) {
      if (chunk && (chunk + " " + word).length > 430) {
        chunks.push(chunk);
        chunk = word;
      } else {
        chunk += (chunk ? " " : "") + word;
      }
    }
    if (chunk) chunks.push(chunk);
    const translated = [];
    for (const part of chunks) {
      const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(part) + "&langpair=en|sq";
      const upstream = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!upstream.ok) throw new Error("Fallback translation unavailable");
      const data = await upstream.json();
      const value = String(data.responseData?.translatedText || "").trim();
      if (!value || Number(data.responseStatus) !== 200) throw new Error("Fallback translation failed");
      translated.push(value);
    }
    return translated.join(" ");
  };

  try {
    let translated;
    try {
      translated = await translateWithGoogle();
    } catch (_) {
      translated = await translateWithMemory();
    }
    if (!translated) throw new Error("No translation returned");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ translated, language: "sq" });
  } catch (error) {
    console.error("Synopsis translation failed:", error.message);
    return res.status(502).json({ error: "Translation services unavailable" });
  }
};
