(function (w) {
  "use strict";
  var view = document.getElementById("player-view");
  var frame = document.getElementById("player-frame");
  var loading = document.getElementById("player-loading");
  var back = document.getElementById("player-back");
  var current = null, timer = 0;
  function paramsFor(item, request) {
    var params = ["autoplay=true", "muted=false", "controls=true", "autonext=true",
      "autoskip=false", "color=%23e50914", "back=close"];
    var resume = Number((request && request.resumeTime) || 0);
    if (resume > 5) params.push("t=" + Math.floor(resume));
    return params.join("&");
  }
  function buildUrl(item, request) {
    request = request || {};
    var id = Number(item && item.id), type = item && item.type || "movie";
    if (!Number.isInteger(id) || id < 1) throw new Error("Invalid TMDB title ID.");
    var query = paramsFor(item, request);
    if (type === "tv") {
      var season = Number(request.season), episode = Number(request.episode);
      if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1)
        throw new Error("Open the series details and select an episode first.");
      return "https://cinesrc.st/embed/tv/" + id + "?s=" + season + "&e=" + episode + "&" + query;
    }
    return "https://cinesrc.st/embed/movie/" + id + "?" + query;
  }
  function setLoading(show, message) {
    if (!loading) return;
    if (message) loading.textContent = message;
    loading.hidden = !show;
  }
  function open(item, request) {
    var url;
    try { url = buildUrl(item, request); }
    catch (error) { if (w.App) w.App.toast(error.message); return false; }
    current = { item: item, request: request || {}, url: url };
    Store.remember(item);
    if (Store.progressFor(item.id, item.type) === null) Store.setProgress(item.id, item.type, 1);
    view.hidden = false;
    document.body.classList.add("player-open");
    setLoading(true, "Po ngarkohet CineSRC…");
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = 0; setLoading(false); }, 25000);
    frame.src = url;
    if (back && back.focus) back.focus();
    return true;
  }
  function close() {
    if (timer) clearTimeout(timer);
    timer = 0;
    setLoading(false);
    frame.src = "about:blank";
    view.hidden = true;
    document.body.classList.remove("player-open");
    current = null;
    var active = Nav && Nav.cur && Nav.cur();
    if (active && active.focus) active.focus();
  }
  frame.addEventListener("load", function () {
    if (!view.hidden && current) {
      if (timer) clearTimeout(timer);
      timer = 0;
      setLoading(false);
    }
  });

  w.addEventListener("message", function (event) {
    if (!current || event.origin !== "https://cinesrc.st" || event.source !== frame.contentWindow) return;
    var data = event.data || {};
    if (typeof data !== "object") return;
    var currentTime = Number(data.currentTime !== undefined ? data.currentTime : data.time);
    var duration = Number(data.duration);
    if (isFinite(currentTime) && isFinite(duration) && duration > 0 && currentTime >= 0) {
      Store.setProgress(current.item.id, current.item.type, Math.min(96, Math.round(currentTime / duration * 100)));
    }
  });
  function onBack(event) {
    if (view.hidden) return;
    var code = event.keyCode || event.which;
    if (code === 461 || code === 8 || code === 27) {
      event.preventDefault(); event.stopPropagation(); close();
    }
  }
  document.addEventListener("keydown", onBack, true);
  if (back) {
    back.addEventListener("click", close);
    back.onok = close;
  }
  w.Player = {
    open: open, close: close,
    isOpen: function () { return !!(view && !view.hidden); },
    buildUrl: buildUrl,
    current: function () { return current; }
  };
})(window);
