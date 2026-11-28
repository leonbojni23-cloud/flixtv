(function (w) {
  "use strict";
  var keys = w.KEYS || {};
  var existing = w.FLIX_CONFIG || {};
  w.FLIX_CONFIG = {
    TMDB_BASE_URL: existing.TMDB_BASE_URL || keys.TMDB_BASE_URL || "https://api.themoviedb.org/3",
    TMDB_KEY: existing.TMDB_KEY || keys.TMDB_KEY || "",
    LANGUAGE: existing.LANGUAGE || "en-US",
    REGION: existing.REGION || "AL"
  };
})(window);
