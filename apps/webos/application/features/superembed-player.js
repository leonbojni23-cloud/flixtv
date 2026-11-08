!function(){
  "use strict";

  var tv = window.TV;
  if (!tv) {
    console.error("[VidZee] TV API is not available. Load app.js first.");
    return;
  }

  var view = document.getElementById("player-view");
  var frame = document.getElementById("cinesrc-frame");
  var loading = document.getElementById("player-loading");
  var back = document.getElementById("player-back");
  var currentUrl = "";
  var loadTimer = null;
  var controlsTimer = null;
  var openedAt = 0;
  var readyAt = 0;
  var LAST_SERVER_KEY = "flixtv.vidzee.lastserver";

  function getLastServer() {
    try { return localStorage.getItem(LAST_SERVER_KEY) || ""; }
    catch (error) { return ""; }
  }

  function onCineSrcMessage(event) {
    if (event.origin !== "https://player.vidzee.wtf") return;
    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;

    if (data.type === "vidzee:sourceused" && data.sourceId != null) {
      try { localStorage.setItem(LAST_SERVER_KEY, String(data.sourceId)); } catch (error) {}
      console.info("[VidZee] Server selected:", String(data.sourceId), "after", openedAt ? Date.now() - openedAt : 0, "ms");
      return;
    }

    if (data.type === "vidzee:ready") {
      readyAt = Date.now();
      console.info("[VidZee] Ready after", openedAt ? readyAt - openedAt : 0, "ms");
    } else if (data.type === "vidzee:play") {
      console.info("[VidZee] Playback started after", openedAt ? Date.now() - openedAt : 0, "ms");
    } else if (data.type === "vidzee:loadedmetadata") {
      console.info("[VidZee] Media metadata loaded after", openedAt ? Date.now() - openedAt : 0, "ms");
    } else if (data.type === "vidzee:error") {
      console.warn("[VidZee] Player error:", data.error || data);
    }
  }

  window.addEventListener("message", onCineSrcMessage, false);

  if (!view || !frame) {
    console.error("[VidZee] Player elements are missing from index.html.");
    return;
  }

  function validInteger(value, minimum) {
    var number = Number(value);
    return Number.isInteger(number) && number >= minimum;
  }

  // Build the VidZee embed URL from the selected TMDB movie or episode.
  function buildUrl(item, request) {
    item = item || {};
    request = request || {};

    var tmdb = item.tmdb || {};
    var id = request.tmdbId || tmdb.id || item.tmdbId || item.id;
    var type = request.type || tmdb.type || item.media_type || item.type || "movie";

    if (!/^[0-9]+$/.test(String(id == null ? "" : id)) || Number(id) < 1) {
      throw new Error("Missing or invalid TMDB ID.");
    }

    if (type === "tv" || type === "series") {
      var season = request.season !== undefined ? request.season : item.season;
      var episode = request.episode !== undefined ? request.episode : item.episode;
      if (!validInteger(season, 0)) throw new Error("Invalid season number.");
      if (!validInteger(episode, 1)) throw new Error("Invalid episode number.");
      return "https://player.vidzee.wtf/embed/tv/" +
        encodeURIComponent(String(id)) + "/" +
        encodeURIComponent(String(Number(season))) + "/" +
        encodeURIComponent(String(Number(episode)));
    }

    return "https://player.vidzee.wtf/embed/movie/" + encodeURIComponent(String(id));
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

  function openPlayer(payload) {
    var url = payload && payload.url;
    if (typeof url !== "string" || url.indexOf("https://player.vidzee.wtf/embed/") !== 0) {
      tv.toast("Invalid VidZee player URL.");
      return false;
    }

    currentUrl = url;
    openedAt = Date.now();
    readyAt = 0;
    view.hidden = false;
    document.body.classList.add("player-open");
    view.classList.remove("player-controls-hidden");
    view.classList.add("player-controls-visible");
    setLoading(true, "Loading VidZee player...");
    showControls();

    if (frame.src !== url) frame.src = url;
    if (loadTimer !== null) window.clearTimeout(loadTimer);
    loadTimer = window.setTimeout(function() {
      loadTimer = null;
      setLoading(false);
    }, 20000);

    console.info("[VidZee] Opening:", url);
    return true;
  }

  function closePlayer() {
    if (loadTimer !== null) window.clearTimeout(loadTimer);
    if (controlsTimer !== null) window.clearTimeout(controlsTimer);
    loadTimer = null;
    controlsTimer = null;

    view.classList.remove("player-controls-hidden", "player-controls-visible");
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
      console.info("[VidZee] iframe document loaded after", openedAt ? Date.now() - openedAt : 0, "ms");
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

  tv.addView("cinesrc-player", {
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
        console.error("[VidZee] URL error:", error);
        tv.toast(error.message || "Could not open VidZee.");
        return false;
      }

      var payload = { item: item || null, request: request || {}, url: url };
      if (item && typeof tv.remember === "function") tv.remember(item);

      if (tv.view() === "cinesrc-player") return openPlayer(payload);
      tv.openView("cinesrc-player", payload);
      return true;
    },
    close: function() {
      if (tv.view() === "cinesrc-player") tv.closeView();
      else closePlayer();
    },
    buildUrl: buildUrl,
    getCurrentUrl: function() { return currentUrl; }
  };

  console.log("[VidZee] Player initialized.");
}();
