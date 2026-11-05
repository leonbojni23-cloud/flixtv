/* FLIXTV M3U8 extractor. Finds playlist URLs exposed in HTML/JS/JSON source.
 * It does not bypass authentication, anti-bot challenges, DRM, or access controls.
 */
(() => {
  "use strict";
  function normalize(source) {
    return String(source || "")
      .replace(/\\u002f/gi, "/")
      .replace(/\\\//g, "/")
      .replace(/&amp;/gi, "&");
  }

  function extract(source, baseUrl) {
    const text = normalize(source);
    const found = new Map();
    const patterns = [
      /https?:\/\/[^\s"'<>]+?\.m3u8(?:\?[^\s"'<>]*)?/gi,
      /(?:^|["'\s=:])((?:\.\/|\/)[^"'\s<>]+?\.m3u8(?:\?[^"'\s<>]*)?)/gi
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        const candidate = (match[1] || match[0]).replace(/^["'\s=:]+/, "").replace(/[),;]+$/, "");
        try {
          const absolute = new URL(candidate, baseUrl || location.href);
          if (absolute.protocol === "https:" && /\.m3u8$/i.test(absolute.pathname)) {
            found.set(absolute.href, { url: absolute.href, host: absolute.host });
          }
        } catch (_) {}
      }
    }
    return [...found.values()];
  }

  async function fromUrl(pageUrl) {
    const url = new URL(pageUrl);
    if (url.protocol !== "https:") throw new Error("Për siguri, burimi duhet të jetë HTTPS.");
    const response = await fetch(url.href, { method: "GET", mode: "cors", credentials: "omit", redirect: "follow" });
    if (!response.ok) throw new Error("Faqja u përgjigj me HTTP " + response.status + ".");
    const type = response.headers.get("content-type") || "";
    if (!/text\/html|javascript|json|text\/plain/i.test(type)) {
      throw new Error("Burimi nuk duket si HTML/JS/JSON (Content-Type: " + type + ").");
    }
    const source = await response.text();
    return { candidates: extract(source, response.url), sourceLength: source.length, finalUrl: response.url };
  }

  window.FlixM3U8Extractor = { extract, fromUrl };
})();