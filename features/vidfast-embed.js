
// features/vidfast-embed.js
// Original VidFast iframe player integration for The Boring TV.
// Exposes window.TVPlayer.open(item, request) for features/details.js.

(function () {
  'use strict';

  var TV = window.TV;

  if (!TV) {
    console.error(
      '[VidFast] TV API is not available. Load app.js before vidfast-embed.js.'
    );
    return;
  }

  var playerView = document.getElementById('player-view');
  var frame = document.getElementById('vidfast-frame');
  var loading = document.getElementById('player-loading');

  if (!playerView || !frame) {
    console.error(
      '[VidFast] Missing #player-view or #vidfast-frame in index.html.'
    );
    return;
  }

  var currentItem = null;
  var currentRequest = null;
  var currentUrl = '';
  var loadTimeout = null;

  var VIDFAST_ORIGIN = 'https://vidfast.vc';

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  function validId(id) {
    return (
      id !== undefined &&
      id !== null &&
      String(id).trim() !== ''
    );
  }

  function validNumber(value, minimum) {
    var number = Number(value);

    return (
      Number.isInteger(number) &&
      number >= minimum
    );
  }

  // --------------------------------------------------
  // URL BUILDER
  // Supports the data structure used by details.js:
  // item.tmdb.id
  // request.tmdbId
  // --------------------------------------------------

  function buildUrl(item, request) {
    item = item || {};
    request = request || {};

    var tmdb = item.tmdb || {};

    var id =
      request.tmdbId ||
      tmdb.id ||
      item.tmdbId ||
      item.id;

    var type =
      request.type ||
      tmdb.type ||
      item.media_type ||
      item.type ||
      'movie';

    if (!validId(id)) {
      throw new Error('[VidFast] Missing TMDB ID.');
    }

    id = encodeURIComponent(String(id));

    if (type === 'tv' || type === 'series') {
      var seasonValue =
        request.season !== undefined
          ? request.season
          : item.season;

      var episodeValue =
        request.episode !== undefined
          ? request.episode
          : item.episode;

      if (!validNumber(seasonValue, 0)) {
        throw new Error('[VidFast] Invalid season number.');
      }

      if (!validNumber(episodeValue, 1)) {
        throw new Error('[VidFast] Invalid episode number.');
      }

      var season = Number(seasonValue);
      var episode = Number(episodeValue);

      return (
        VIDFAST_ORIGIN +
        '/tv/' + id +
        '/' + season +
        '/' + episode +
        '?autoPlay=true'
      );
    }

    return (
      VIDFAST_ORIGIN +
      '/movie/' + id +
      '?autoPlay=true'
    );
  }

  // --------------------------------------------------
  // PLAYER UI
  // --------------------------------------------------

  function setLoading(isLoading) {
    if (!loading) return;

    loading.hidden = !isLoading;
  }

  function showPlayerView() {
    playerView.hidden = false;
    document.body.classList.add('player-open');
  }

  function hidePlayerView() {
    playerView.hidden = true;
    document.body.classList.remove('player-open');
  }

  // --------------------------------------------------
  // TIMEOUT MANAGEMENT
  // --------------------------------------------------

  function clearLoadTimeout() {
    if (loadTimeout !== null) {
      window.clearTimeout(loadTimeout);
      loadTimeout = null;
    }
  }

  function startLoadTimeout() {
    clearLoadTimeout();

    loadTimeout = window.setTimeout(function () {
      setLoading(false);
      loadTimeout = null;

      console.warn(
        '[VidFast] Loading indicator hidden after timeout.'
      );
    }, 12000);
  }

  // --------------------------------------------------
  // OPEN PLAYER
  // --------------------------------------------------

  function open(item, request) {
    var url;

    try {
      url = buildUrl(item, request);
    } catch (error) {
      console.error('[VidFast] URL error:', error);

      TV.toast(
        error.message || 'Could not open VidFast.'
      );

      return false;
    }

    currentItem = item || null;
    currentRequest = request || null;
    currentUrl = url;

    clearLoadTimeout();

    setLoading(true);
    showPlayerView();

    console.log('[VidFast] Opening player:', url);

    // Reload only when the URL changes.
    if (frame.src !== url) {
      frame.src = url;
    } else {
      // If the same URL is already loaded, do not leave
      // the loading indicator active indefinitely.
      setLoading(false);
    }

    startLoadTimeout();

    return true;
  }

  // --------------------------------------------------
  // CLOSE PLAYER
  // --------------------------------------------------

  function close() {
    clearLoadTimeout();

    setLoading(false);

    // Stop playback and release the iframe.
    frame.src = 'about:blank';

    currentItem = null;
    currentRequest = null;
    currentUrl = '';

    hidePlayerView();

    console.log('[VidFast] Player closed.');
  }

  // --------------------------------------------------
  // IFRAME EVENTS
  // --------------------------------------------------

  function onFrameLoad() {
    if (!currentUrl) return;

    if (frame.src === 'about:blank') return;

    clearLoadTimeout();
    setLoading(false);

    console.log('[VidFast] Player loaded.');
  }

  frame.addEventListener('load', onFrameLoad);

  // --------------------------------------------------
  // IFRAME PERMISSIONS
  // --------------------------------------------------

  // Do not use sandbox here.
  // VidFast may require browser capabilities that sandbox
  // restrictions can break, including playback behavior.

  frame.removeAttribute('sandbox');

  frame.setAttribute(
    'allow',
    'autoplay; fullscreen; encrypted-media; picture-in-picture'
  );

  frame.setAttribute('referrerpolicy', 'origin');

  // The allow attribute already declares fullscreen permission.
  frame.removeAttribute('allowfullscreen');

  // --------------------------------------------------
  // TV VIEW MANAGER
  // --------------------------------------------------

  if (typeof TV.addView === 'function') {
    TV.addView('vidfast-player', {
      show: function (args) {
        if (args && args.url) {
          var preparedUrl = String(args.url);

          if (
            preparedUrl.indexOf(VIDFAST_ORIGIN + '/') !== 0
          ) {
            console.error(
              '[VidFast] Rejected unexpected player URL:',
              preparedUrl
            );

            TV.toast('Invalid VidFast URL.');
            return;
          }

          currentItem = args.item || null;
          currentRequest = null;
          currentUrl = preparedUrl;

          clearLoadTimeout();

          setLoading(true);
          showPlayerView();

          if (frame.src !== currentUrl) {
            frame.src = currentUrl;
          }

          startLoadTimeout();

          return;
        }

        if (args && args.item) {
          open(args.item, args.request || {});
        }
      },

      hide: close,

      back: function () {
        if (typeof TV.closeView === 'function') {
          TV.closeView();
        } else {
          close();
        }
      },

      nav: function () {
        // Keep focus inside the embedded player.
        return [];
      }
    });
  }

  // --------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------

  window.TVPlayer = {
    open: open,
    close: close,
    buildUrl: buildUrl,

    getCurrentItem: function () {
      return currentItem;
    },

    getCurrentRequest: function () {
      return currentRequest;
    },

    getCurrentUrl: function () {
      return currentUrl;
    }
  };

  console.log('[VidFast] Player initialized.');

})();
