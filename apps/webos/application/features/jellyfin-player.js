(function () {
  "use strict";

  var TV = window.TV;
  var CONFIG = window.CONFIG || {};
  var view = document.getElementById("player-view");
  var video = document.getElementById("jellyfin-video");
  var loading = document.getElementById("player-loading");
  var back = document.getElementById("player-back");
  var sourceList = document.getElementById("jellyfin-sources");
  var status = document.getElementById("jellyfin-status");
  var hls = null;
  var requestToken = 0;
  var playbackToken = 0;
  var playbackTimer = null;
  var currentItem = null;
  var currentRequest = null;
  var sources = [];

  if (!TV || !view || !video || !sourceList || !back) {
    console.error("[Jellyfin] Player mount or FLIXTV API is missing.");
    return;
  }

  function serverUrl() {
    return String(CONFIG.JELLYFIN_URL || "").trim().replace(/\/+$/, "");
  }

  function apiKey() {
    return String(CONFIG.JELLYFIN_API_KEY || "").trim();
  }

  function headers() {
    return { "X-Emby-Token": apiKey(), "Accept": "application/json" };
  }

  function setStatus(message, busy) {
    if (status) status.textContent = message || "";
    if (loading) {
      loading.hidden = !busy;
      loading.textContent = message || "";
    }
  }

  function clearTimer() {
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      playbackTimer = null;
    }
  }

  function stopPlayback() {
    clearTimer();
    if (hls) {
      try { hls.destroy(); } catch (error) {}
      hls = null;
    }
    try { video.pause(); } catch (error) {}
    video.removeAttribute("src");
    while (video.firstChild) video.removeChild(video.firstChild);
    try { video.load(); } catch (error) {}
  }

  function requestJson(path, token) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, 20000);
    return fetch(serverUrl() + path, {
      method: "GET",
      headers: headers(),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) {
          var message = response.status === 401 || response.status === 403
            ? "Jellyfin API key is invalid or not authorized."
            : (data.message || data.error || "Jellyfin request failed (" + response.status + ").");
          throw new Error(message);
        }
        return data;
      });
    }).finally(function () {
      clearTimeout(timer);
    });
  }

  function encode(value) {
    return encodeURIComponent(String(value));
  }

  function findItems(tmdbId, type, token) {
    var itemType = type === "tv" || type === "series" ? "Series" : "Movie";
    var query = "?Recursive=true&IncludeItemTypes=" + itemType +
      "&AnyProviderIdEquals=" + encode("Tmdb." + tmdbId) +
      "&Fields=ProviderIds,MediaSources,MediaStreams&Limit=10";
    return requestJson("/Items" + query, token).then(function (data) {
      if (token !== requestToken) throw new Error("Playback request was replaced.");
      return data.Items || [];
    });
  }

  function getEpisode(seriesId, season, episode, token) {
    var query = "?Season=" + encode(season) +
      "&Fields=ProviderIds,MediaSources,MediaStreams&UserData=false";
    return requestJson("/Shows/" + encode(seriesId) + "/Episodes" + query, token).then(function (data) {
      if (token !== requestToken) throw new Error("Playback request was replaced.");
      var items = data.Items || [];
      for (var i = 0; i < items.length; i++) {
        if (Number(items[i].IndexNumber) === Number(episode)) return items[i];
      }
      throw new Error("This episode was not found in your Jellyfin library.");
    });
  }

  function streamUrl(item, mediaSource) {
    var sourceId = mediaSource && mediaSource.Id || item.Id;
    return serverUrl() + "/Videos/" + encode(item.Id) + "/master.m3u8?MediaSourceId=" +
      encode(sourceId) + "&api_key=" + encode(apiKey());
  }

  function labelFor(source, index) {
    var parts = [];
    if (source.Name) parts.push(source.Name);
    if (source.Container) parts.push(String(source.Container).toUpperCase());
    if (source.Size) parts.push((source.Size / 1073741824).toFixed(1) + " GB");
    return parts.join(" · ") || "Version " + (index + 1);
  }

  function renderSources() {
    sourceList.innerHTML = "";
    sources.forEach(function (source, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "jellyfin-source f" + (index === 0 ? " selected" : "");
      button.innerHTML = "<b>" + String(source.label).replace(/[&<>"]/g, "") + "</b>";
      button.onok = function () { playSource(index); };
      button.onclick = button.onok;
      sourceList.appendChild(button);
    });
    if (!sources.length) sourceList.innerHTML = '<p class="jellyfin-empty">No playable versions found.</p>';
  }

  function playSource(index) {
    var source = sources[index];
    if (!source || !source.url) return;
    stopPlayback();
    var token = ++playbackToken;
    setStatus("Starting Jellyfin stream...", true);

    video.onerror = function () {
      if (token !== playbackToken) return;
      var error = video.error;
      console.error("[Jellyfin] Video error", {
        code: error && error.code,
        networkState: video.networkState,
        readyState: video.readyState
      });
      setStatus("Jellyfin could not play this version. Check codec support or server transcoding.", false);
    };
    video.onplaying = function () {
      if (token !== playbackToken) return;
      clearTimer();
      setStatus("", false);
    };
    video.onloadedmetadata = function () {
      if (token === playbackToken) clearTimer();
    };

    playbackTimer = setTimeout(function () {
      if (token !== playbackToken || video.readyState >= 2) return;
      setStatus("Stream startup timed out. Check the Jellyfin server and transcoding settings.", false);
    }, 30000);

    var nativeHls = video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL");
    if (nativeHls) {
      video.src = source.url;
      video.load();
      video.play().catch(function (error) {
        if (token === playbackToken && error && error.name !== "NotAllowedError") {
          setStatus("Playback could not start: " + error.message, false);
        }
      });
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({
        enableWorker: false,
        capLevelToPlayerSize: true,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 20000,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 3
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
        if (token !== playbackToken) return;
        video.play().catch(function (error) {
          if (token === playbackToken && error && error.name !== "NotAllowedError") {
            setStatus("Playback could not start: " + error.message, false);
          }
        });
      });
      hls.on(window.Hls.Events.ERROR, function (event, data) {
        if (token !== playbackToken || !data || !data.fatal) return;
        console.error("[Jellyfin][HLS] Fatal playback error", {
          type: data.type,
          details: data.details,
          code: data.response && data.response.code
        });
        setStatus("Jellyfin stream error: " + (data.details || data.type || "unknown"), false);
      });
      hls.loadSource(source.url);
      hls.attachMedia(video);
    } else {
      video.src = source.url;
      video.load();
      video.play().catch(function (error) {
        if (token === playbackToken && error && error.name !== "NotAllowedError") {
          setStatus("Playback could not start: " + error.message, false);
        }
      });
    }

    [].forEach.call(sourceList.querySelectorAll(".jellyfin-source"), function (button, i) {
      button.classList.toggle("selected", i === index);
    });
  }

  function loadItem(request) {
    var token = ++requestToken;
    sources = [];
    renderSources();
    playbackToken++;
    stopPlayback();

    if (!serverUrl() || !apiKey()) {
      setStatus("Configure JELLYFIN_URL and JELLYFIN_API_KEY in keys.js first.", false);
      return;
    }
    if (!/^https?:\/\//i.test(serverUrl())) {
      setStatus("Jellyfin address must start with http:// or https://.", false);
      return;
    }

    var tmdbId = String(request.tmdbId || currentItem && currentItem.tmdb && currentItem.tmdb.id || "");
    if (!/^\d{1,20}$/.test(tmdbId)) {
      setStatus("This title has no valid TMDB ID.", false);
      return;
    }

    setStatus("Searching your Jellyfin library...", true);
    findItems(tmdbId, request.type || "movie", token).then(function (items) {
      if (token !== requestToken || TV.view() !== "jellyfin-player") return;
      if (!items.length) throw new Error("This title was not found in your Jellyfin library.");
      var itemPromise;
      if (request.type === "tv" || request.type === "series") {
        var season = Number(request.season);
        var episode = Number(request.episode);
        if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) {
          throw new Error("Invalid season or episode number.");
        }
        itemPromise = getEpisode(items[0].Id, season, episode, token);
      } else {
        itemPromise = Promise.resolve(items[0]);
      }
      return itemPromise;
    }).then(function (item) {
      if (!item || token !== requestToken || TV.view() !== "jellyfin-player") return;
      var media = Array.isArray(item.MediaSources) ? item.MediaSources : [];
      if (!media.length) media = [{ Id: item.Id, Name: item.Name, Container: item.Container, Size: item.Size }];
      sources = media.map(function (source, index) {
        return { label: labelFor(source, index), url: streamUrl(item, source) };
      });
      renderSources();
      if (!sources.length) throw new Error("Jellyfin returned no playable media sources.");
      setStatus("Found " + sources.length + " version(s) in Jellyfin.", false);
      playSource(0);
      TV.rebuild(1, 0);
    }).catch(function (error) {
      if (token !== requestToken || TV.view() !== "jellyfin-player") return;
      console.error("[Jellyfin] Library lookup failed:", error);
      setStatus(error.name === "AbortError"
        ? "Jellyfin request timed out. Check the server address."
        : (error.message || "Could not connect to Jellyfin."), false);
    });
  }

  function cleanup() {
    requestToken++;
    playbackToken++;
    stopPlayback();
    currentItem = null;
    currentRequest = null;
    sources = [];
    sourceList.innerHTML = "";
    setStatus("", false);
    view.hidden = true;
    document.body.classList.remove("player-open");
    if (document.fullscreenElement && document.exitFullscreen) {
      try { document.exitFullscreen().catch(function () {}); } catch (error) {}
    }
  }

  function closeView() {
    if (TV.view() === "jellyfin-player") TV.closeView();
    else cleanup();
  }

  TV.addView("jellyfin-player", {
    nav: function () {
      var rows = [[back]];
      var buttons = sourceList.querySelectorAll(".f");
      if (buttons.length) rows.push([].slice.call(buttons));
      return rows;
    },
    show: function (payload) {
      currentItem = payload && payload.item || null;
      currentRequest = payload && payload.request || {};
      view.hidden = false;
      document.body.classList.add("player-open");
      back.onok = closeView;
      back.onclick = closeView;
      loadItem(currentRequest);
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
      TV.openView("jellyfin-player", { item: item, request: currentRequest });
      return true;
    },
    close: closeView
  };

  console.log("[Jellyfin] FLIXTV player initialized.");
})();
