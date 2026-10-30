// features/yapgrid-embed.js
// YapGrid iframe player integration for The Boring TV.
// Exposes window.TVPlayer.open(item, request) for features/details.js.

(function () {
  'use strict';

  var TV = window.TV;
  if (!TV) {
    console.error('[YapGrid] TV API is not available. Load app.js first.');
    return;
  }

  var playerView = document.getElementById('player-view');
  var frame = document.getElementById('yapgrid-frame');
  var loading = document.getElementById('player-loading');
  var backButton = document.getElementById('player-back');
  var currentUrl = '';
  var loadTimeout = null;

  if (!playerView || !frame) {
    console.error('[YapGrid] Missing player view or iframe in index.html.');
    return;
  }

  function validId(value) {
    return /^\d+$/.test(String(value == null ? '' : value)) &&
      Number(value) > 0;
  }

  function validNumber(value, minimum) {
    var number = Number(value);
    return Number.isInteger(number) && number >= minimum;
  }

  function buildUrl(item, request) {
    item = item || {};
    request = request || {};

    var tmdb = item.tmdb || {};
    var id = request.tmdbId || tmdb.id || item.tmdbId || item.id;
    var type = request.type || tmdb.type || item.media_type || item.type || 'movie';

    if (!validId(id)) {
      throw new Error('Missing or invalid TMDB ID.');
    }

    var path = '/embed/movie/' + encodeURIComponent(String(id));

    if (type === 'tv' || type === 'series') {
      var seasonValue = request.season !== undefined ? request.season : item.season;
      var episodeValue = request.episode !== undefined ? request.episode : item.episode;

      if (!validNumber(seasonValue, 0)) {
        throw new Error('Invalid season number.');
      }
      if (!validNumber(episodeValue, 1)) {
        throw new Error('Invalid episode number.');
      }

      path = '/embed/tv/' + encodeURIComponent(String(id)) +
        '/' + Number(seasonValue) + '/' + Number(episodeValue);
    }

    // YapGrid documents lang=en as the preferred/default subtitle language.
    // It does not expose a documented force-captions-on parameter.
    return 'https://yapgrid.com' + path + '?autoplay=1&lang=en';
  }

  function setLoading(value) {
    if (loading) loading.hidden = !value;
  }

  function clearLoadTimeout() {
    if (loadTimeout !== null) {
      window.clearTimeout(loadTimeout);
      loadTimeout = null;
    }
  }

  function startLoadTimeout() {
    clearLoadTimeout();
    loadTimeout = window.setTimeout(function () {
      loadTimeout = null;
      setLoading(false);
      console.warn('[YapGrid] Player load indicator hidden after timeout.');
    }, 20000);
  }

  function load(args) {
    var url = args && args.url;
    if (!url || url.indexOf('https://yapgrid.com/embed/') !== 0) {
      TV.toast('Invalid YapGrid player URL.');
      return false;
    }

    currentUrl = url;
    setLoading(true);
    playerView.hidden = false;
    document.body.classList.add('player-open');

    // The player view already fills the entire TV viewport. Request native
    // fullscreen where the browser supports it; CSS remains the fallback.
    requestNativeFullscreen();

    if (frame.getAttribute('src') !== url) {
      frame.src = url;
    } else {
      setLoading(false);
    }

    startLoadTimeout();
    console.log('[YapGrid] Opening player:', url);
    return true;
  }

  function requestNativeFullscreen() {
    var request = playerView.requestFullscreen ||
      playerView.webkitRequestFullscreen ||
      playerView.webkitRequestFullScreen;

    if (!request) return;

    try {
      var result = request.call(playerView);
      if (result && typeof result.catch === 'function') {
        result.catch(function () {
          // Some TV browsers disallow scripted fullscreen. The fixed player
          // view still occupies the full viewport in that case.
        });
      }
    } catch (error) {
      console.warn('[YapGrid] Native fullscreen unavailable; using viewport fullscreen.');
    }
  }

  function stop() {
    clearLoadTimeout();
    exitNativeFullscreen();
    setLoading(false);
    frame.src = 'about:blank';
    currentUrl = '';
    playerView.hidden = true;
    document.body.classList.remove('player-open');
  }

  function exitNativeFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) return;

    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exit) return;

    try {
      var result = exit.call(document);
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (error) {
      console.warn('[YapGrid] Could not exit native fullscreen.');
    }
  }

  function open(item, request) {
    var url;

    try {
      url = buildUrl(item, request);
    } catch (error) {
      console.error('[YapGrid] URL error:', error);
      TV.toast(error.message || 'Could not open YapGrid.');
      return false;
    }

    var args = { item: item || null, request: request || {}, url: url };

    if (TV.view() === 'yapgrid-player') {
      return load(args);
    }

    TV.openView('yapgrid-player', args);
    return true;
  }

  frame.addEventListener('load', function () {
    if (!currentUrl || frame.getAttribute('src') === 'about:blank') return;
    clearLoadTimeout();
    setLoading(false);
    console.log('[YapGrid] Player iframe loaded.');
  });

  frame.setAttribute(
    'allow',
    'autoplay; fullscreen; encrypted-media; picture-in-picture'
  );
  frame.setAttribute('allowfullscreen', '');
  frame.setAttribute('referrerpolicy', 'origin');
  // Block pop-up windows and top-level navigation from the embedded player.
  // The iframe remains cross-origin, so allow-same-origin does not grant access to this app.
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');

  if (backButton) {
    backButton.onok = function () {
      TV.closeView();
    };
    backButton.addEventListener('click', function () {
      TV.closeView();
    });
  }

  TV.addView('yapgrid-player', {
    nav: function () {
      return backButton ? [[backButton]] : [];
    },
    show: function (args) {
      load(args || {});
    },
    hide: stop,
    back: function () {
      TV.closeView();
    }
  });

  window.TVPlayer = {
    open: open,
    close: function () {
      if (TV.view() === 'yapgrid-player') {
        TV.closeView();
      } else {
        stop();
      }
    },
    buildUrl: buildUrl,
    getCurrentUrl: function () {
      return currentUrl;
    }
  };

  console.log('[YapGrid] Player initialized.');
})();
