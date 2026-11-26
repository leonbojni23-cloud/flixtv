(function () {
  "use strict";

  var config = window.CONFIG || {};

  function request(endpoint, params) {
    params = params || {};
    var proxyBase = (window.KEYS || {}).TMDB_BASE_URL || "";
    var apiKey = config.TMDB_KEY || (window.KEYS || {}).TMDB_KEY || "";
    var query = [];

    if (!proxyBase) {
      if (!apiKey) throw new Error("TMDB API key is missing. Check keys.js.");
      query.push("api_key=" + encodeURIComponent(apiKey));
    }

    query.push("language=" + encodeURIComponent(config.LANG || "en-US"));
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (value !== null && value !== undefined && value !== "") {
        query.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
      }
    });

    var base = proxyBase
      ? proxyBase.replace(/\/$/, "") + "/"
      : "https://api.themoviedb.org/3/";
    var url = base + endpoint.replace(/^\/+/, "") + "?" + query.join("&");

    return fetch(url, { method: "GET", credentials: "same-origin" }).then(function (response) {
      return response.text().then(function (text) {
        var data;
        try { data = text ? JSON.parse(text) : {}; }
        catch (error) { throw new Error("TMDB returned invalid JSON (HTTP " + response.status + ")."); }
        if (!response.ok || data.success === false) {
          throw new Error(data.status_message || data.error || ("TMDB request failed: HTTP " + response.status));
        }
        return data;
      });
    });
  }

  window.TMDB = {
    getTrendingMovies: function () { return request("trending/movie/day"); },
    getPopularMovies: function () { return request("movie/popular"); },
    getTopRatedMovies: function () { return request("movie/top_rated"); },
    getTrendingSeries: function () { return request("trending/tv/day"); },
    getPopularSeries: function () { return request("tv/popular"); },
    getTopRatedSeries: function () { return request("tv/top_rated"); },
    search: function (query) { return request("search/multi", { query: query, include_adult: false }); },
    getMovie: function (id, append) { return request("movie/" + encodeURIComponent(id), { append_to_response: append || undefined }); },
    getSeries: function (id, append) { return request("tv/" + encodeURIComponent(id), { append_to_response: append || undefined }); },
    getSeason: function (id, season) { return request("tv/" + encodeURIComponent(id) + "/season/" + encodeURIComponent(season)); },
    getEpisode: function (id, season, episode) { return request("tv/" + encodeURIComponent(id) + "/season/" + encodeURIComponent(season) + "/episode/" + encodeURIComponent(episode)); },
    getTrendingAll: function () { return request("trending/all/day"); },
    getWatchProviders: function (type, id) {
      if (type !== "movie" && type !== "tv") return Promise.reject(new Error("Invalid media type: " + type));
      return request(type + "/" + encodeURIComponent(id) + "/watch/providers");
    },
    getMovieProviders: function () { return request("watch/providers/movie", { watch_region: config.REGION || "US" }); },
    getSeriesProviders: function () { return request("watch/providers/tv", { watch_region: config.REGION || "US" }); },
    discoverMovies: function (params) { return request("discover/movie", params); },
    discoverSeries: function (params) { return request("discover/tv", params); },
    getImage: function (path, size) { return path ? "https://image.tmdb.org/t/p/" + (size || "w500") + path : ""; },
    request: request
  };
})();