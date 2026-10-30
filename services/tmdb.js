
(function () {
  'use strict';

  var CONFIG = window.CONFIG || {};
  var API_BASE = 'https://api.themoviedb.org/3/';
  var IMAGE_BASE = 'https://image.tmdb.org/t/p/';

  function getApiKey() {
    var key = CONFIG.TMDB_KEY;

    if (!key) {
      throw new Error('TMDB API key is missing. Check keys.js.');
    }

    return key;
  }

  function request(path, params) {
    var query = [];
    var key = getApiKey();

    params = params || {};

    query.push('api_key=' + encodeURIComponent(key));
    query.push('language=' + encodeURIComponent(CONFIG.LANG || 'en-US'));

    Object.keys(params).forEach(function (name) {
      var value = params[name];

      if (value !== undefined && value !== null && value !== '') {
        query.push(
          encodeURIComponent(name) + '=' + encodeURIComponent(value)
        );
      }
    });

    var url = API_BASE + path.replace(/^\/+/, '') + '?' + query.join('&');

    return fetch(url).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || data.success === false) {
          throw new Error(
            data.status_message || 'TMDB request failed: ' + response.status
          );
        }

        return data;
      });
    });
  }

  function getTrendingMovies() {
    return request('trending/movie/day');
  }

  function getPopularMovies() {
    return request('movie/popular');
  }

  function getTopRatedMovies() {
    return request('movie/top_rated');
  }

  function getTrendingSeries() {
    return request('trending/tv/day');
  }

  function getPopularSeries() {
    return request('tv/popular');
  }

  function getTopRatedSeries() {
    return request('tv/top_rated');
  }

  function search(query) {
    return request('search/multi', {
      query: query,
      include_adult: false
    });
  }

  function getMovie(id, appendToResponse) {
    return request('movie/' + encodeURIComponent(id), {
      append_to_response: appendToResponse || undefined
    });
  }

  function getSeries(id, appendToResponse) {
    return request('tv/' + encodeURIComponent(id), {
      append_to_response: appendToResponse || undefined
    });
  }

  function getSeason(seriesId, seasonNumber) {
    return request(
      'tv/' + encodeURIComponent(seriesId) +
      '/season/' + encodeURIComponent(seasonNumber)
    );
  }

  function getEpisode(seriesId, seasonNumber, episodeNumber) {
    return request(
      'tv/' + encodeURIComponent(seriesId) +
      '/season/' + encodeURIComponent(seasonNumber) +
      '/episode/' + encodeURIComponent(episodeNumber)
    );
  }

  // Additional functions needed by the existing application.

  function getTrendingAll() {
    return request('trending/all/day');
  }

  function getWatchProviders(type, id) {
    if (type !== 'movie' && type !== 'tv') {
      return Promise.reject(new Error('Invalid media type: ' + type));
    }

    return request(
      type + '/' + encodeURIComponent(id) + '/watch/providers'
    );
  }

  function getMovieProviders() {
    return request('watch/providers/movie', {
      watch_region: CONFIG.REGION || 'US'
    });
  }

  function getSeriesProviders() {
    return request('watch/providers/tv', {
      watch_region: CONFIG.REGION || 'US'
    });
  }

  function discoverMovies(params) {
    return request('discover/movie', params);
  }

  function discoverSeries(params) {
    return request('discover/tv', params);
  }

  function getImage(path, size) {
    if (!path) return '';

    return IMAGE_BASE + (size || 'w500') + path;
  }

  window.TMDB = {
    getTrendingMovies: getTrendingMovies,
    getPopularMovies: getPopularMovies,
    getTopRatedMovies: getTopRatedMovies,

    getTrendingSeries: getTrendingSeries,
    getPopularSeries: getPopularSeries,
    getTopRatedSeries: getTopRatedSeries,

    search: search,

    getMovie: getMovie,
    getSeries: getSeries,

    getSeason: getSeason,
    getEpisode: getEpisode,

    getTrendingAll: getTrendingAll,
    getWatchProviders: getWatchProviders,
    getMovieProviders: getMovieProviders,
    getSeriesProviders: getSeriesProviders,

    discoverMovies: discoverMovies,
    discoverSeries: discoverSeries,

    getImage: getImage,
    request: request
  };

})();
