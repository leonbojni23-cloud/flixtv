(function (window) {
  "use strict";
  var config = window.CONFIG || {};
  function request(path, params) {
    var key = config.TMDB_KEY;
    if (!key) return Promise.reject(new Error("TMDB API key is missing. Copy keys.example.js to keys.js and add your TMDB key."));
    var query = ["api_key=" + encodeURIComponent(key), "language=" + encodeURIComponent(config.LANG || "en-US")];
    Object.keys(params || {}).forEach(function (name) {
      var value = params[name];
      if (value !== undefined && value !== null && value !== "") query.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
    });
    return fetch("https://api.themoviedb.org/3/" + String(path).replace(/^\/+/, "") + "?" + query.join("&"))
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || data.success === false) throw new Error(data.status_message || "TMDB request failed: " + response.status);
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
    getTrendingAll: function () { return request("trending/all/day"); },
    search: function (query) { return request("search/multi", { query: query, include_adult: false }); },
    getMovie: function (id, append) { return request("movie/" + encodeURIComponent(id), { append_to_response: append || undefined }); },
    getSeries: function (id, append) { return request("tv/" + encodeURIComponent(id), { append_to_response: append || undefined }); },
    getSeason: function (id, season) { return request("tv/" + encodeURIComponent(id) + "/season/" + encodeURIComponent(season)); },
    getImage: function (path, size) { return path ? "https://image.tmdb.org/t/p/" + (size || "w500") + path : ""; },
    request: request
  };
})(window);
