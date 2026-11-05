/* FLIXTV M3U8 extractor.
 * Extracts playlist URLs exposed in page HTML/source supplied by the user.
 * It does not bypass authentication, anti-bot challenges, DRM, or access controls.
 */
(() => {
  "use strict";
  const decodeText = value => {
    let text = String(value || "");
    for (let i = 0; i < 2; i++) {
      try { text = decodeURIComponent(text.replace(/\\u002[fF]/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&")); }
      catch (_) { break; }
    }
    return text.replace(/\\u002[fF]/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  };

  function extract(source, baseUrl) {
    const text = decodeText(source);
    const found = new Map();
    const patterns = [
      /https?:\\?\/\\?\/[^\\s"'<>\\]+?\\?\.m3u8(?:\\?[^\\s"'<>\\]*)?/gi,
      /(?:https?:)?\\?\/\\?\/[^\\s"'<>\\]+?\\?\.m3u8(?:\\?[^\\s"'<>\\]*)?/gi,
      /(?:^|["'\s=:])((?:\.\\/|\\/)?[^"'\s<>]+?\.m3u8(?:\\?[^"'\s<>]*)?)/gi
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        let candidate = (match[1] || match[0]).replace(/^["'\s=:]+/, "").replace(/[),;]+$/, "");
        candidate = candidate.replace(/\\\//g, "/");
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
    if (!/text\\/html|javascript|json|text\\/plain/i.test(type)) {
      throw new Error("Burimi nuk duket si HTML/JS/JSON (Content-Type: " + type + ").");
    }
    const source = await response.text();
    return { candidates: extract(source, response.url), sourceLength: source.length, finalUrl: response.url };
  }

  window.FlixM3U8Extractor = { extract, fromUrl };
})();