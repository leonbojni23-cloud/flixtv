(function () {
  "use strict";

  var TV = window.TV;
  var CONFIG = window.CONFIG || {};
  var view = document.getElementById("player-view");
  var video = document.getElementById("cinepro-video");
  var loading = document.getElementById("player-loading");
  var back = document.getElementById("player-back");
  var sourceList = document.getElementById("cinepro-sources");
  var status = document.getElementById("cinepro-status");
  var subtitleList = document.getElementById("cinepro-subtitles");
  var hls = null;
  var currentItem = null;
  var currentRequest = null;
  var sources = [];
  var subtitles = [];
  var focused = 0;
  var requestToken = 0;

  if (!TV || !view || !video || !sourceList || !back) {
    console.error("[CinePro] Player mount or FLIXTV API is missing.");
    return;
  }

  function baseUrl() {
    return String(CONFIG.CINEPRO_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
  }

  function safe(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function setStatus(message) {
    if (status) status.textContent = message || "";
    if (loading) {
      var busy = /^(Finding streams|Loading )/.test(message || "");
      loading.hidden = !busy;
      loading.textContent = message || "";
    }
  }

  function stopPlayback() {
    if (hls) {
      try { hls.destroy(); } catch (error) {}
      hls = null;
    }
    try { video.pause(); } catch (error) {}
    video.removeAttribute("src");
    while (video.firstChild) video.removeChild(video.firstChild);
    try { video.load(); } catch (error) {}
  }

  function absoluteSource(url) {
    var parsed = new URL(url, baseUrl() + "/");
    var configured = new URL(baseUrl() + "/");

    // CinePro may generate proxy links using its internal container port
    // (localhost:3000). In FLIXTV, the public host port is configured via
    // CINEPRO_URL (for this setup: localhost:3001). Rewrite only CinePro
    // proxy endpoints, never provider URLs.
    if (
      parsed.pathname.indexOf("/v1/proxy") === 0 &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === "3000"
    ) {
      parsed.protocol = configured.protocol;
      parsed.host = configured.host;
    }

    return parsed.toString();
  }

  function playSource(source) {
    if (!source || !source.url) return;
    stopPlayback();
    var providerName = source.provider && source.provider.name || "source";
    console.info("[CinePro] Playing source:", {
      provider: providerName,
      quality: source.quality || source.type || "Auto",
      streamType: source.type || "unknown"
    });
    setStatus("Loading " + providerName + " · " + (source.quality || source.type || "Auto"));
    var url;
    try { url = absoluteSource(source.url); }
    catch (error) {
      console.error("[CinePro] Invalid stream URL:", error.message);
      setStatus("Invalid stream URL.");
      return;
    }

    video.onerror = function () {
      console.error("[CinePro] Video element error:", {
        code: video.error && video.error.code,
        message: video.error && video.error.message,
        networkState: video.networkState,
        readyState: video.readyState
      });
    };

    var nativeHls = video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL");
    if (nativeHls) {
      console.info("[CinePro] Using native HLS playback.");
      video.src = url;
      video.load();
      video.play().then(function () { setStatus(""); }).catch(function (error) {
        console.warn("[CinePro] Native playback rejected:", error && error.name, error && error.message);
        setStatus("Press Play to start this source.");
      });
    } else if (window.Hls && window.Hls.isSupported()) {
      console.info("[CinePro] Using hls.js playback.");
      hls = new window.Hls({ enableWorker: false, capLevelToPlayerSize: true });

      // Register listeners before loading so early manifest/network errors are not missed.
      hls.on(window.Hls.Events.MEDIA_ATTACHED, function () {
        console.info("[CinePro][HLS] Media attached.");
      });
      hls.on(window.Hls.Events.MANIFEST_LOADING, function () {
        console.info("[CinePro][HLS] Manifest loading.");
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, function (event, data) {
        console.info("[CinePro][HLS] Manifest parsed:", {
          levels: data && data.levels ? data.levels.length : 0,
          audioTracks: data && data.audioTracks ? data.audioTracks.length : 0,
          subtitleTracks: data && data.subtitleTracks ? data.subtitleTracks.length : 0
        });
        video.play().then(function () { setStatus(""); }).catch(function (error) {
          console.warn("[CinePro][HLS] Playback rejected:", error && error.name, error && error.message);
          setStatus("Press Play to start this source.");
        });
      });
      hls.on(window.Hls.Events.LEVEL_LOADED, function (event, data) {
        console.info("[CinePro][HLS] Level loaded:", {
          level: data && data.level,
          fragments: data && data.details && data.details.fragments ? data.details.fragments.length : 0,
          live: !!(data && data.details && data.details.live)
        });
      });
      hls.on(window.Hls.Events.KEY_LOADING, function () {
        console.info("[CinePro][HLS] Encryption key loading.");
      });
      hls.on(window.Hls.Events.KEY_LOADED, function () {
        console.info("[CinePro][HLS] Encryption key loaded.");
      });
      hls.on(window.Hls.Events.FRAG_LOADED, function (event, data) {
        console.info("[CinePro][HLS] Fragment loaded:", {
          level: data && data.frag && data.frag.level,
          sn: data && data.frag && data.frag.sn,
          bytes: data && data.payload ? data.payload.byteLength : null
        });
      });
      hls.on(window.Hls.Events.ERROR, function (event, data) {
        var response = data && data.response || {};
        console.error("[CinePro][HLS] Error:", {
          type: data && data.type,
          details: data && data.details,
          fatal: !!(data && data.fatal),
          httpCode: response.code || null,
          reason: data && data.reason || null,
          errorMessage: data && data.error && data.error.message || null
        });
        if (data && data.fatal) setStatus("This source could not be played. Try another source.");
      });

      hls.attachMedia(video);
      hls.loadSource(url);
    } else {
      console.info("[CinePro] HLS.js unavailable; using direct video playback.");
      video.src = url;
      video.load();
      video.play().then(function () { setStatus(""); }).catch(function (error) {
        console.warn("[CinePro] Direct playback rejected:", error && error.name, error && error.message);
        setStatus("This TV/browser cannot play this stream format. Try another source.");
      });
    }

    [].forEach.call(sourceList.querySelectorAll(".cinepro-source"), function (button) {
      button.classList.toggle("selected", Number(button.dataset.index) === sources.indexOf(source));
    });
  }

  function renderSources() {
    sourceList.innerHTML = "";
    sources.forEach(function (source, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cinepro-source f" + (index === 0 ? " selected" : "");
      button.dataset.index = String(index);
      button.innerHTML = "<b>" + safe(source.provider && source.provider.name || "Source " + (index + 1)) +
        "</b><span>" + safe(source.quality || source.type || "Auto") + "</span>";
      button.onok = function () { playSource(source); };
      button.onclick = button.onok;
      sourceList.appendChild(button);
    });
    if (!sources.length) sourceList.innerHTML = '<p class="cinepro-empty">No playable sources were returned.</p>';
  }

  function renderSubtitles() {
    subtitleList.innerHTML = "";
    if (!subtitles.length) {
      subtitleList.hidden = true;
      return;
    }
    subtitleList.hidden = false;
    var label = document.createElement("span");
    label.className = "cinepro-subtitle-label";
    label.textContent = "Subtitles";
    subtitleList.appendChild(label);
    subtitles.forEach(function (track) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cinepro-source f";
      button.textContent = track.label || track.language || track.format || "Subtitle";
      button.onok = function () {
        [].forEach.call(video.querySelectorAll("track"), function (node) { node.remove(); });
        if (track.url) {
          var node = document.createElement("track");
          node.kind = "subtitles";
          node.label = track.label || track.language || "Subtitle";
          node.srclang = track.language || "en";
          node.src = absoluteSource(track.url);
          node.default = true;
          video.appendChild(node);
          [].forEach.call(video.textTracks, function (textTrack) { textTrack.mode = "showing"; });
        }
      };
      button.onclick = button.onok;
      subtitleList.appendChild(button);
    });
  }

  function endpoint(request) {
    var id = String(request.tmdbId || currentItem && currentItem.tmdb && currentItem.tmdb.id || "");
    if (!/^\d{1,20}$/.test(id)) throw new Error("Missing or invalid TMDB ID.");
    if (request.type === "tv" || request.type === "series") {
      var season = Number(request.season);
      var episode = Number(request.episode);
      if (!Number.isInteger(season) || season < 0 || season > 99) throw new Error("Invalid season number.");
      if (!Number.isInteger(episode) || episode < 1 || episode > 9999) throw new Error("Invalid episode number.");
      return "/v1/tv/" + id + "/seasons/" + season + "/episodes/" + episode;
    }
    return "/v1/movies/" + id;
  }

  function loadSources(request) {
    var token = ++requestToken;
    sources = [];
    subtitles = [];
    renderSources();
    renderSubtitles();
    stopPlayback();
    setStatus("Finding streams with CinePro...");
    var url;
    try { url = baseUrl() + endpoint(request); }
    catch (error) { setStatus(error.message); return; }

    fetch(url, { method: "GET", headers: { "Accept": "application/json" } })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            var message = data && data.error && data.error.message || "CinePro request failed (" + response.status + ").";
            throw new Error(message);
          }
          return data;
        });
      })
      .then(function (data) {
        if (token !== requestToken || TV.view() !== "cinepro-player") return;
        sources = Array.isArray(data.sources) ? data.sources.filter(function (source) { return source && source.url; }) : [];
        subtitles = Array.isArray(data.subtitles) ? data.subtitles.filter(function (track) { return track && track.url; }) : [];
        renderSources();
        renderSubtitles();
        if (!sources.length) {
          setStatus("CinePro found no playable sources for this title.");
          return;
        }
        setStatus(sources.length + " sources found. Select one to play.");
        playSource(sources[0]);
        TV.rebuild(1, 0);
      })
      .catch(function (error) {
        if (token !== requestToken || TV.view() !== "cinepro-player") return;
        console.error("[CinePro] Source lookup failed:", error);
        setStatus(error.message || "Could not connect to CinePro Core. Check its address and that the service is running.");
      });
  }

  function cleanup() {
    requestToken++;
    stopPlayback();
    currentItem = null;
    currentRequest = null;
    sources = [];
    subtitles = [];
    sourceList.innerHTML = "";
    subtitleList.innerHTML = "";
    setStatus("");
    view.hidden = true;
    document.body.classList.remove("player-open");
    if (document.fullscreenElement && document.exitFullscreen) {
      try { document.exitFullscreen().catch(function () {}); } catch (error) {}
    }
  }

  function closeView() {
    if (TV.view() === "cinepro-player") TV.closeView();
    else cleanup();
  }

  TV.addView("cinepro-player", {
    nav: function () {
      var rows = [[back]];
      var sourceButtons = sourceList.querySelectorAll(".f");
      if (sourceButtons.length) rows.push([].slice.call(sourceButtons));
      var subtitleButtons = subtitleList.querySelectorAll(".f");
      if (subtitleButtons.length) rows.push([].slice.call(subtitleButtons));
      return rows;
    },
    show: function (payload) {
      currentItem = payload && payload.item || null;
      currentRequest = payload && payload.request || {};
      view.hidden = false;
      document.body.classList.add("player-open");
      back.onok = closeView;
      back.onclick = closeView;
      loadSources(currentRequest);
    },
    hide: cleanup,
    back: closeView,
    keydown: function (event) {
      if (event.keyCode === 461 || event.keyCode === 27 || event.keyCode === 8) {
        closeView();
        return true;
      }
      return false;
    }
  });

  window.TVPlayer = {
    open: function (item, request) {
      if (!item || !item.tmdb || !item.tmdb.id) {
        TV.toast("This title has no TMDB ID.");
        return false;
      }
      currentItem = item;
      currentRequest = request || {};
      try { endpoint(currentRequest); }
      catch (error) { TV.toast(error.message); return false; }
      TV.openView("cinepro-player", { item: item, request: currentRequest });
      return true;
    },
    close: closeView
  };

  console.log("[CinePro] FLIXTV player initialized.");
})();
