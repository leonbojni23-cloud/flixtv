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

    if (frame.getAttribute('src') !== url) {
      frame.src = url;
    } else {
      setLoading(false);
    }

    startLoadTimeout();
    console.log('[YapGrid] Opening player:', url);
    return true;
  }

  function stop() {
    clearLoadTimeout();
    setLoading(false);
    frame.src = 'about:blank';
    currentUrl = '';
    playerView.hidden = true;
    document.body.classList.remove('player-open');
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
  frame.removeAttribute('sandbox');

  TV.addView('yapgrid-player', {
    nav: function () {
      return [];
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
