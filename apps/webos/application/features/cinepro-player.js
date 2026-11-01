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
  var playbackToken = 0;
  var playbackTimer = null;
  var failedSources = Object.create(null);

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

  function clearPlaybackTimer() {
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      playbackTimer = null;
    }
  }

  function isSafeProxyUrl(value) {
    try {
      var parsed = new URL(value, baseUrl() + "/");
      var configured = new URL(baseUrl() + "/");
      return (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        parsed.origin === configured.origin &&
        parsed.pathname === "/v1/proxy" &&
        !parsed.username && !parsed.password;
    } catch (error) {
      return false;
    }
  }

  function markSourceFailed(source, reason) {
    var index = sources.indexOf(source);
    if (index < 0) return;
    if (failedSources[index] === "handling") return;
    failedSources[index] = "handling";
    console.warn("[CinePro] Source failed; skipping to next source:", {
      index: index,
      provider: source.provider && source.provider.name || "unknown",
      reason: reason || "playback error"
    });
    clearPlaybackTimer();
    if (hls) {
      try { hls.destroy(); } catch (error) {}
      hls = null;
    }
    try { video.pause(); } catch (error) {}
    video.removeAttribute("src");
    try { video.load(); } catch (error) {}
    var next = -1;
    for (var i = index + 1; i < sources.length; i++) {
      if (!failedSources[i]) { next = i; break; }
    }
    if (next < 0) {
      for (var j = 0; j < index; j++) {
        if (!failedSources[j]) { next = j; break; }
      }
    }
    if (next >= 0) {
      setStatus("Source failed. Trying " + (sources[next].provider && sources[next].provider.name || "next source") + "...");
      playSource(sources[next]);
    } else {
      setStatus("All returned sources failed. Try again later.");
      console.error("[CinePro] Playback exhausted all available sources.");
    }
  }

  function isValidSource(source) {
    try { return !!(source && source.url && isSafeProxyUrl(absoluteSource(source.url))); }
    catch (error) { return false; }
  }

  function playSource(source) {
    if (!source || !source.url) return;
    var sourceIndex = sources.indexOf(source);
    if (sourceIndex < 0 || failedSources[sourceIndex]) return;
    stopPlayback();
    clearPlaybackTimer();
    var token = ++playbackToken;
    var providerName = source.provider && source.provider.name || "source";
    console.info("[CinePro] Starting source:", {
      index: sourceIndex,
      provider: providerName,
      quality: source.quality || source.type || "Auto",
      streamType: source.type || "unknown"
    });

    var url;
    try {
      url = absoluteSource(source.url);
      if (!isSafeProxyUrl(url)) throw new Error("Source URL is not a trusted CinePro proxy endpoint.");
    } catch (error) {
      console.error("[CinePro] Source rejected:", {
        index: sourceIndex,
        provider: providerName,
        reason: error.message
      });
      markSourceFailed(source, error.message);
      return;
    }

    function armStartupTimeout() {
      clearPlaybackTimer();
      playbackTimer = setTimeout(function () {
        if (token !== playbackToken || !video.paused && video.readyState >= 2) return;
        console.warn("[CinePro] Playback startup timed out:", { index: sourceIndex, provider: providerName });
        markSourceFailed(source, "startup timeout");
      }, 25000);
    }

    video.onerror = function () {
      if (token !== playbackToken) return;
      var err = video.error;
      console.error("[CinePro] Video element error:", {
        code: err && err.code,
        message: err && err.message,
        networkState: video.networkState,
        readyState: video.readyState
      });
      markSourceFailed(source, "media element error " + (err && err.code || "unknown"));
    };
    video.onplaying = function () {
      if (token !== playbackToken) return;
      clearPlaybackTimer();
      setStatus("");
      console.info("[CinePro] Playback started:", { index: sourceIndex, provider: providerName });
    };
    video.onloadedmetadata = function () {
      if (token === playbackToken) console.info("[CinePro] Media metadata loaded:", {
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    armStartupTimeout();
    var nativeHls = video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL");
    if (nativeHls) {
      console.info("[CinePro] Using native HLS.");
      video.src = url;
      video.load();
      video.play().catch(function (error) {
        if (token !== playbackToken) return;
        console.warn("[CinePro] Native play rejected:", error && error.name);
        if (error && error.name !== "NotAllowedError") markSourceFailed(source, "native play rejected");
        else setStatus("Press Play to start this source.");
      });
    } else if (window.Hls && window.Hls.isSupported()) {
      console.info("[CinePro] Using hls.js.");
      hls = new window.Hls({
        enableWorker: false,
        capLevelToPlayerSize: true,
        startFragPrefetch: true,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 2,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 3,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 4000,
        nudgeMaxRetry: 2
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, function (event, data) {
        if (token !== playbackToken) return;
        console.info("[CinePro][HLS] Manifest parsed:", {
          levels: data && data.levels ? data.levels.length : 0,
          audioTracks: data && data.audioTracks ? data.audioTracks.length : 0,
          subtitleTracks: data && data.subtitleTracks ? data.subtitleTracks.length : 0
        });
        video.play().catch(function (error) {
          if (token !== playbackToken) return;
          console.warn("[CinePro][HLS] Play rejected:", error && error.name);
          if (error && error.name !== "NotAllowedError") markSourceFailed(source, "HLS play rejected");
          else setStatus("Press Play to start this source.");
        });
      });
      hls.on(window.Hls.Events.FRAG_BUFFERED, function (event, data) {
        if (token !== playbackToken) return;
        clearPlaybackTimer();
        console.info("[CinePro][HLS] Fragment buffered:", {
          sn: data && data.frag && data.frag.sn,
          level: data && data.frag && data.frag.level
        });
      });
      hls.on(window.Hls.Events.ERROR, function (event, data) {
        if (token !== playbackToken || !data) return;
        var response = data.response || {};
        console.error("[CinePro][HLS] Error:", {
          type: data.type,
          details: data.details,
          fatal: !!data.fatal,
          httpCode: response.code || null,
          reason: data.reason || null,
          message: data.error && data.error.message || null
        });
        if (!data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          try { hls.startLoad(); } catch (error) { markSourceFailed(source, "fatal network error"); }
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls.recoverMediaError(); } catch (error) { markSourceFailed(source, "fatal media error"); }
        } else {
          markSourceFailed(source, "fatal HLS error: " + data.details);
        }
      });
      hls.attachMedia(video);
      hls.loadSource(url);
    } else {
      console.info("[CinePro] HLS.js unavailable; attempting direct playback.");
      video.src = url;
      video.load();
      video.play().catch(function (error) {
        if (token !== playbackToken) return;
        console.warn("[CinePro] Direct play rejected:", error && error.name);
        if (error && error.name !== "NotAllowedError") markSourceFailed(source, "direct playback rejected");
        else setStatus("Press Play to start this source.");
      });
    }

    [].forEach.call(sourceList.querySelectorAll(".cinepro-source"), function (button) {
      button.classList.toggle("selected", Number(button.dataset.index) === sourceIndex);
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
    failedSources = Object.create(null);
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
        sources = Array.isArray(data.sources) ? data.sources.filter(isValidSource) : [];
        failedSources = Object.create(null);
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
    playbackToken++;
    clearPlaybackTimer();
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
