!function(){
  "use strict";

  var tv = window.TV;
  if (!tv) {
    console.error("[SuperEmbed] TV API is not available. Load app.js first.");
    return;
  }

  var view = document.getElementById("player-view");
  var frame = document.getElementById("superembed-frame");
  var loading = document.getElementById("player-loading");
  var back = document.getElementById("player-back");
  var currentUrl = "";
  var loadTimer = null;
  var controlsTimer = null;

  if (!view || !frame) {
    console.error("[SuperEmbed] Player elements are missing from index.html.");
    return;
  }

  function validInteger(value, minimum) {
    var number = Number(value);
    return Number.isInteger(number) && number >= minimum;
  }

  function buildUrl(item, request) {
    item = item || {};
    request = request || {};

    var tmdb = item.tmdb || {};
    var id = request.tmdbId || tmdb.id || item.tmdbId || item.id;
    var type = request.type || tmdb.type || item.media_type || item.type || "movie";

    if (!/^[0-9]+$/.test(String(id == null ? "" : id)) || Number(id) < 1) {
      throw new Error("Missing or invalid TMDB ID.");
    }

    var params = new URLSearchParams();
    params.set("video_id", String(id));
    params.set("tmdb", "1");

    if (type === "tv" || type === "series") {
      var season = request.season !== undefined ? request.season : item.season;
      var episode = request.episode !== undefined ? request.episode : item.episode;
      if (!validInteger(season, 0)) throw new Error("Invalid season number.");
      if (!validInteger(episode, 1)) throw new Error("Invalid episode number.");
      params.set("s", String(Number(season)));
      params.set("e", String(Number(episode)));
    }

    return "https://multiembed.mov/?" + params.toString();
  }

  function setLoading(show, message) {
    if (!loading) return;
    if (message) loading.textContent = message;
    loading.hidden = !show;
  }

  function hideControls() {
    controlsTimer = null;
    if (view.hidden) return;
    view.classList.add("player-controls-hidden");
    view.classList.remove("player-controls-visible");
  }

  function showControls() {
    if (view.hidden) return;
    view.classList.remove("player-controls-hidden");
    view.classList.add("player-controls-visible");
    if (controlsTimer !== null) window.clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(hideControls, 4500);
  }

  function requestFullscreen() {
    var fn = view.requestFullscreen || view.webkitRequestFullscreen || view.webkitRequestFullScreen;
    if (!fn) return;
    try {
      var result = fn.call(view);
      if (result && typeof result.catch === "function") result.catch(function() {});
    } catch (error) {
      console.warn("[SuperEmbed] Native fullscreen unavailable; using viewport fullscreen.");
    }
  }

  function openPlayer(payload) {
    var url = payload && payload.url;
    if (typeof url !== "string" || url.indexOf("https://multiembed.mov/?") !== 0) {
      tv.toast("Invalid SuperEmbed player URL.");
      return false;
    }

    currentUrl = url;
    view.hidden = false;
    document.body.classList.add("player-open");
    view.classList.remove("player-controls-hidden");
    view.classList.add("player-controls-visible");
    setLoading(true, "Loading SuperEmbed player...");
    showControls();
    requestFullscreen();

    if (frame.src !== url) frame.src = url;
    if (loadTimer !== null) window.clearTimeout(loadTimer);
    loadTimer = window.setTimeout(function() {
      loadTimer = null;
      setLoading(false);
    }, 20000);

    console.info("[SuperEmbed] Opening:", url);
    return true;
  }

  function closePlayer() {
    if (loadTimer !== null) window.clearTimeout(loadTimer);
    if (controlsTimer !== null) window.clearTimeout(controlsTimer);
    loadTimer = null;
    controlsTimer = null;

    view.classList.remove("player-controls-hidden", "player-controls-visible");
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      try {
        var result = exit.call(document);
        if (result && typeof result.catch === "function") result.catch(function() {});
      } catch (error) {
        console.warn("[SuperEmbed] Could not exit native fullscreen.");
      }
    }

    setLoading(false);
    frame.src = "about:blank";
    currentUrl = "";
    view.hidden = true;
    document.body.classList.remove("player-open");
  }

  frame.addEventListener("load", function() {
    if (currentUrl && !view.hidden) {
      if (loadTimer !== null) window.clearTimeout(loadTimer);
      loadTimer = null;
      setLoading(false);
      console.info("[SuperEmbed] Player frame loaded.");
    }
  });

  view.addEventListener("mousemove", showControls, false);
  view.addEventListener("pointermove", showControls, false);
  view.addEventListener("touchstart", showControls, { passive: true });
  document.addEventListener("keydown", function() {
    if (!view.hidden) showControls();
  }, true);

  if (back) {
    back.onok = function() { tv.closeView(); };
    back.addEventListener("click", function() { tv.closeView(); });
  }

  tv.addView("superembed-player", {
    nav: function() { return back ? [[back]] : []; },
    show: function(payload) { openPlayer(payload || {}); },
    hide: closePlayer,
    back: function() { tv.closeView(); }
  });

  window.TVPlayer = {
    open: function(item, request) {
      var url;
      try {
        url = buildUrl(item, request);
      } catch (error) {
        console.error("[SuperEmbed] URL error:", error);
        tv.toast(error.message || "Could not open SuperEmbed.");
        return false;
      }

      var payload = { item: item || null, request: request || {}, url: url };
      if (item && typeof tv.remember === "function") tv.remember(item);

      if (tv.view() === "superembed-player") return openPlayer(payload);
      tv.openView("superembed-player", payload);
      return true;
    },
    close: function() {
      if (tv.view() === "superembed-player") tv.closeView();
      else closePlayer();
    },
    buildUrl: buildUrl,
    getCurrentUrl: function() { return currentUrl; }
  };

  console.log("[SuperEmbed] Player initialized.");
}();
