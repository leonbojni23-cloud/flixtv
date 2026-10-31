(function () {
  'use strict';
  var endpoint = 'http://192.168.0.139:8787/log';
  var originalFetch = window.fetch && window.fetch.bind(window);
  function redact(value) {
    return String(value == null ? '' : value)
      .replace(/([?&](?:api_key|key|token|access_token)=)[^&\s]*/gi, '$1[REDACTED]')
      .replace(/(TMDB_KEY|YT_KEY|API_KEY)(\s*[:=]\s*)['"][^'"]+['"]/gi, '$1$2[REDACTED]');
  }
  function send(level, message, details) {
    if (!originalFetch) return;
    try {
      originalFetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({
          level: level, message: redact(message).slice(0, 4000),
          details: details || {}, timestamp: new Date().toISOString()
        })
      }).catch(function () {});
    } catch (e) {}
  }
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var nativeLog = console[level];
    console[level] = function () {
      try {
        var message = Array.prototype.map.call(arguments, function (item) {
          if (item && item.stack) return item.stack;
          if (typeof item === 'object') {
            try { return JSON.stringify(item); } catch (e) { return '[object]'; }
          }
          return String(item);
        }).join(' ');
        send(level, message);
      } catch (e) {}
      if (nativeLog) return nativeLog.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (event) {
    send('error', event.message || 'Resource or JavaScript error', {
      file: redact(event.filename || (event.target && event.target.src) || ''),
      line: event.lineno || 0,
      stack: redact(event.error && event.error.stack || '')
    });
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    send('rejection', reason && (reason.stack || reason.message) || String(reason));
  });
  if (originalFetch) window.fetch = function (input, options) {
    var url = typeof input === 'string' ? input : input && input.url || '';
    return originalFetch(input, options).then(function (response) {
      if (!response.ok) send('http-error', 'HTTP ' + response.status + ' ' + redact(url));
      return response;
    }, function (error) {
      send('fetch-error', redact(url) + ' ' + redact(error && error.message || error));
      throw error;
    });
  };
  send('startup', 'FLIXTV logger active');
})();
