const PLAYER_SETTINGS = {
  player_font: "Poppins",
  player_bg_color: "000000",
  player_font_color: "ffffff",
  player_primary_color: "34cfeb",
  player_secondary_color: "6900e0",
  player_loader: "1",
  preferred_server: "0",
  player_sources_toggle_type: "2"
};

function validId(value) {
  return typeof value === "string" && /^(?:tt)?[0-9]{1,12}$/.test(value);
}

function validNumber(value, max) {
  if (typeof value !== "string" || !/^[0-9]{1,3}$/.test(value)) return false;
  return Number(value) >= 0 && Number(value) <= max;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method not allowed");
  }

  const videoId = typeof req.query.video_id === "string" ? req.query.video_id.trim() : "";
  const tmdb = typeof req.query.tmdb === "string" ? req.query.tmdb : "0";
  const season = typeof req.query.season === "string" ? req.query.season :
    (typeof req.query.s === "string" ? req.query.s : "0");
  const episode = typeof req.query.episode === "string" ? req.query.episode :
    (typeof req.query.e === "string" ? req.query.e : "0");

  if (!validId(videoId)) return res.status(400).send("Invalid or missing video_id");
  if (tmdb !== "0" && tmdb !== "1") return res.status(400).send("Invalid tmdb parameter");
  if (!validNumber(season, 100) || !validNumber(episode, 1000)) {
    return res.status(400).send("Invalid season or episode");
  }

  const params = new URLSearchParams({ video_id: videoId, tmdb, season, episode, ...PLAYER_SETTINGS });
  try {
    const upstream = await fetch("https://getsuperembed.link/?" + params.toString(), {
      method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000),
      headers: { "Accept": "text/plain, text/html;q=0.9, */*;q=0.8" }
    });
    if (!upstream.ok) return res.status(502).send("SuperEmbed request failed (" + upstream.status + ")");
    const playerUrlText = (await upstream.text()).trim();
    let playerUrl;
    try { playerUrl = new URL(playerUrlText); }
    catch (_) { return res.status(502).send(playerUrlText || "SuperEmbed returned an empty response"); }
    if (playerUrl.protocol !== "https:") return res.status(502).send("SuperEmbed returned an unsupported player URL");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "origin");
    return res.redirect(302, playerUrl.toString());
  } catch (error) {
    return res.status(504).send("SuperEmbed request timed out or failed");
  }
}
