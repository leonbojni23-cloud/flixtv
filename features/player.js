// features/player.js
// Native HTML5 player for The Boring TV.
// Resolver integration is intentionally isolated in services/vidfast-resolver.js.

(function () {
  'use strict';

  var TV = window.TV;
  if (!TV) {
    console.error('TV API is not available. Load features/player.js after app.js.');
    return;
  }

  var root = document.getElementById('player-view');
  if (!root) return;

  root.innerHTML =
    '<video id="tv-video" playsinline preload="metadata"></video>' +
    '<div id="tv-player-overlay">' +
      '<div class="tv-player-top">' +
        '<span id="tv-player-title"></span>' +
        '<span id="tv-player-status">Preparing stream…</span>' +
      '</div>' +
      '<div id="tv-player-error" hidden></div>' +
      '<div class="tv-player-bottom">' +
        '<div class="tv-player-controls">' +
          '<button type="button" class="tvp-btn" data-action="play">Play / Pause</button>' +
          '<button type="button" class="tvp-btn" data-action="back">Back</button>' +
        '</div>' +
        '<div class="tv-player-progress">' +
          '<span id="tv-player-current">00:00</span>' +
          '<input id="tv-player-seek" type="range" min="0" max="1000" value="0" aria-label="Seek">' +
          '<span id="tv-player-duration">00:00</span>' +
        '</div>' +
      '</div>' +
    '</div>';

  var video = root.querySelector('#tv-video');
  var title = root.querySelector('#tv-player-title');
  var status = root.querySelector('#tv-player-status');
  var errorBox = root.querySelector('#tv-player-error');
  var seek = root.querySelector('#tv-player-seek');
  var current = root.querySelector('#tv-player-current');
  var duration = root.querySelector('#tv-player-duration');
  var activeItem = null;
  var seekChanging = false;

  function time(value) {
    if (!isFinite(value) || value < 0) return '00:00';
    var seconds = Math.floor(value);
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return h
      ? String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
      : String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function message(text, isError) {
    status.textContent = text || '';
    errorBox.hidden = !isError;
    errorBox.textContent = isError ? text : '';
  }

  function playPause() {
    if (video.paused) {
      var promise = video.play();
      if (promise && promise.catch) {
        promise.catch(function (err) {
          message('Playback could not start: ' + (err.message || err), true);
        });
      }
    } else {
      video.pause();
    }
  }

  function close() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    root.hidden = true;
    document.body.classList.remove('player-open');
    activeItem = null;
    message('Preparing stream…', false);
    if (TV.view() === 'vidfast-player') TV.closeView();
  }

  function playSource(source) {
    if (!source || !source.url) {
      message('Resolver did not return a playable stream URL.', true);
      return;
    }
    if (source.type && source.type !== 'hls' && source.type !== 'mp4') {
      message('Unsupported stream type: ' + source.type, true);
      return;
    }
    video.src = source.url;
    if (source.type === 'hls' && !video.canPlayType('application/vnd.apple.mpegurl')) {
      message('This webOS browser does not report native HLS support for this stream.', true);
      return;
    }
    message('Loading stream…', false);
    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(function (err) {
      message('Playback blocked or unsupported: ' + (err.message || err), true);
    });
  }

  function open(item, request) {
    activeItem = item || {};
    root.hidden = false;
    document.body.classList.add('player-open');
    title.textContent = activeItem.title || 'The Boring TV';
    message('Resolving stream…', false);
    if (TV.view() !== 'vidfast-player') {
      TV.openView('vidfast-player', { item: activeItem, request: request || {} });
    } else {
      resolveAndPlay(request || {});
    }
  }

  function resolveAndPlay(request) {
    if (!window.VidFastResolver || typeof window.VidFastResolver.resolve !== 'function') {
      message('VidFast resolver is not connected yet. Add the authorized VidFast API details to services/vidfast-resolver.js.', true);
      return;
    }
    window.VidFastResolver.resolve(request)
      .then(playSource)
      .catch(function (err) {
        console.error('[TVPlayer] Resolver failed:', err);
        message('Could not resolve stream: ' + (err.message || err), true);
      });
  }

  video.addEventListener('loadedmetadata', function () {
    duration.textContent = time(video.duration);
    message('Ready', false);
  });
  video.addEventListener('timeupdate', function () {
    current.textContent = time(video.currentTime);
    if (!seekChanging && isFinite(video.duration) && video.duration > 0) {
      seek.value = String(Math.round(video.currentTime / video.duration * 1000));
    }
  });
  video.addEventListener('waiting', function () { message('Buffering…', false); });
  video.addEventListener('playing', function () { message('Playing', false); });
  video.addEventListener('error', function () {
    var err = video.error;
    message('Video error' + (err ? ' (' + err.code + ')' : '') + '. Check stream format, CORS and required request headers.', true);
  });
  seek.addEventListener('input', function () { seekChanging = true; });
  seek.addEventListener('change', function () {
    if (isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Number(seek.value) / 1000 * video.duration;
    }
    seekChanging = false;
  });
  root.querySelector('[data-action="play"]').addEventListener('click', playPause);
  root.querySelector('[data-action="back"]').addEventListener('click', close);

  TV.addView('vidfast-player', {
    nav: function () {
      return [[].slice.call(root.querySelectorAll('.tvp-btn'))];
    },
    show: function (arg) {
      root.hidden = false;
      document.body.classList.add('player-open');
      if (arg && arg.item) {
        activeItem = arg.item;
        title.textContent = activeItem.title || 'The Boring TV';
      }
      resolveAndPlay(arg && arg.request ? arg.request : {});
    },
    hide: function () {
      video.pause();
      video.removeAttribute('src');
      video.load();
      root.hidden = true;
      document.body.classList.remove('player-open');
    },
    back: close
  });

  window.TVPlayer = {
    open: open,
    close: close,
    playSource: playSource,
    getVideo: function () { return video; }
  };
})();
