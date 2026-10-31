(function () {
  'use strict';
  if (window.__FLIXTV_DEBUG_ACTIVE__) return;
  window.__FLIXTV_DEBUG_ACTIVE__ = true;

  var ENDPOINT = 'http://192.168.0.139:8787';
  var DEVICE_ID = 'webos-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  var sequence = 0;
  var connected = false;
  var queue = [];
  var sending = false;
  var MAX_QUEUE = 300;

  function redact(value) {
    return String(value == null ? '' : value)
      .replace(/([?&](?:api_key|key|token|access_token)=)[^&\s]*/gi, '$1[REDACTED]')
      .replace(/((?:TMDB_KEY|YT_KEY|API_KEY)\s*[:=]\s*)['"][^'"]+['"]/gi, '$1[REDACTED]');
  }
  function safeString(value) {
    try {
      if (value instanceof Error) return redact(value.stack || value.message);
      if (typeof value === 'string') return redact(value);
      if (value === null || typeof value !== 'object') return String(value);
      return redact(JSON.stringify(value));
    } catch (e) { return '[unserializable value]'; }
  }
  function entry(level, message, details) {
    return {
      id: DEVICE_ID,
      seq: ++sequence,
      level: level,
      message: safeString(message).slice(0, 5000),
      details: details || {},
      time: new Date().toISOString(),
      url: redact(location.href),
      userAgent: navigator.userAgent || 'unknown',
      readyState: document.readyState
    };
  }
  function transmit(item, path) {
    return new Promise(function (resolve, reject) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', ENDPOINT + path, true);
        xhr.timeout = 5000;
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4) return;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
        };
        xhr.onerror = function () { reject(new Error('Network error')); };
        xhr.ontimeout = function () { reject(new Error('Request timeout')); };
        xhr.send(JSON.stringify(item));
      } catch (e) { reject(e); }
    });
  }
  function flush() {
    if (sending || !connected || !queue.length) return;
    sending = true;
    var item = queue.shift();
    transmit(item, '/log').then(function () {
      sending = false;
      flush();
    }, function () {
      queue.unshift(item);
      sending = false;
    });
  }
  function log(level, message, details) {
    var item = entry(level, message, details);
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push(item);
    flush();
  }

  // Explicit handshake: server records this device as connected only after receiving it.
  var hello = entry('handshake', 'TV is requesting a debug connection', {
    protocol: 'FLIXTV-LAN-DEBUG/1',
    screen: (screen.width || 0) + 'x' + (screen.height || 0),
    language: navigator.language || '',
    platform: navigator.platform || ''
  });
  transmit(hello, '/hello').then(function (response) {
    connected = true;
    log('connected', 'PC <-> TV connection CONFIRMED by debug server', {serverResponse: response, deviceId: DEVICE_ID});
    flush();
    if (window.console && console.info) console.info('[FLIXTV DEBUG] PC connection confirmed');
  }).catch(function (error) {
    if (window.console && console.error) console.error('[FLIXTV DEBUG] PC connection FAILED: ' + error.message);
    // Retry handshake without blocking app startup.
    var attempts = 0;
    var retry = function () {
      attempts++;
      transmit(hello, '/hello').then(function (response) {
        connected = true;
        log('connected', 'PC <-> TV connection CONFIRMED by debug server', {serverResponse: response, deviceId: DEVICE_ID, attempts: attempts});
        flush();
      }).catch(function () {
        if (attempts < 5) setTimeout(retry, 2000 * attempts);
      });
    };
    setTimeout(retry, 1500);
  });

  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      try {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) parts.push(safeString(arguments[i]));
        log('console.' + level, parts.join(' '));
      } catch (e) {}
      if (original) return original.apply(console, arguments);
    };
  });

  window.addEventListener('error', function (event) {
    var target = event.target;
    log('uncaught-error', event.message || 'Resource load error', {
      file: redact(event.filename || (target && (target.src || target.href)) || ''),
      line: event.lineno || 0,
      column: event.colno || 0,
      stack: safeString(event.error || '')
    });
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    log('unhandled-rejection', safeString(event.reason));
  });

  window.addEventListener('online', function () { log('network', 'Browser online event'); });
  window.addEventListener('offline', function () { log('network', 'Browser offline event'); });
  window.addEventListener('load', function () {
    log('lifecycle', 'Window load event', {scripts: document.scripts.length});
    try {
      var resources = performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
      resources.slice(-80).forEach(function (r) {
        if (r.duration > 3000 || (r.transferSize === 0 && r.duration > 0)) {
          log('slow-resource', redact(r.name), {durationMs: Math.round(r.duration), transferSize: r.transferSize || 0});
        }
      });
    } catch (e) {}
  });

  // Observe app fetch failures without changing the returned response or blocking startup.
  if (window.fetch) {
    var nativeFetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '[request]';
      try {
        return nativeFetch.apply(this, args).then(function (response) {
          if (!response.ok) log('http-error', 'HTTP ' + response.status + ' ' + redact(url));
          return response;
        }, function (error) {
          log('fetch-error', redact(url), {error: safeString(error)});
          throw error;
        });
      } catch (error) {
        log('fetch-sync-error', redact(url), {error: safeString(error)});
        throw error;
      }
    };
  }

  // Keep a light heartbeat so the laptop can show whether the TV is still reachable.
  setInterval(function () {
    if (connected) transmit(entry('heartbeat', 'TV heartbeat'), '/heartbeat').catch(function () {
      connected = false;
      log('connection-lost', 'Heartbeat failed; PC connection may be lost');
    });
    else flush();
  }, 15000);

  log('startup', 'FLIXTV diagnostic logger initialized', {
    deviceId: DEVICE_ID,
    href: redact(location.href),
    viewport: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
    webOSBridge: typeof window.PalmServiceBridge === 'function'
  });
})();
