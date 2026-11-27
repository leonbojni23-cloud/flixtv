(function (w) {
  "use strict";
  var IMG = "https://image.tmdb.org/t/p/";
  var GENRES = {
    28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",
    18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",
    9648:"Mystery",10749:"Romance",878:"Sci-Fi",10770:"TV Movie",53:"Thriller",
    10752:"War",37:"Western",10759:"Action & Adventure",10762:"Kids",10763:"News",
    10764:"Reality",10765:"Sci-Fi & Fantasy",10766:"Soap",10767:"Talk",10768:"War & Politics"
  };
  function list(data) { return (data && data.results ? data.results : []).filter(function (x) { return x && x.media_type !== "person" && (x.poster_path || x.backdrop_path); }); }
  function fromTMDB(t) {
    var type = t.media_type || (t.name && !t.title ? "tv" : "movie");
    var date = t.release_date || t.first_air_date || "";
    var genres = (t.genres || []).map(function (g) { return g.name; });
    if (!genres.length) genres = (t.genre_ids || []).map(function (id) { return GENRES[id]; }).filter(Boolean);
    var runtime = t.runtime || (t.episode_run_time && t.episode_run_time[0]) || 0;
    return {
      id: Number(t.id), type: type, title: t.title || t.name || "Untitled",
      year: date ? String(date).slice(0, 4) : "",
      mins: runtime ? runtime * 60 : 0,
      len: runtime ? Math.floor(runtime / 60) + "h " + (runtime % 60) + "m" : (t.number_of_seasons ? t.number_of_seasons + " Seasons" : ""),
      rating: t.vote_average ? "★ " + Number(t.vote_average).toFixed(1) : "",
      match: Math.round(Number(t.vote_average || 0) * 10),
      genres: genres, hue: Number(t.id || 0) % 360,
      desc: t.overview || "No description available.",
      poster: t.poster_path ? IMG + "w342" + t.poster_path : "",
      backdrop: t.backdrop_path ? IMG + "w1280" + t.backdrop_path : "",
      seasonCount: Number(t.number_of_seasons || 0),
      seasons: t.seasons || [],
      tmdb: { id: Number(t.id), type: type }
    };
  }
  function mapResults(p) { return p.then(function (data) { return list(data).map(fromTMDB); }); }
  function take(items, n) { return (items || []).slice(0, n); }
  var Api = {
    fromTMDB: fromTMDB,
    home: function (type) {
      var requests;
      if (type === "movie") {
        requests = [TMDB.getTrendingMovies(), TMDB.getPopularMovies(), TMDB.getTopRatedMovies()];
      } else if (type === "tv") {
        requests = [TMDB.getTrendingSeries(), TMDB.getPopularSeries(), TMDB.getTopRatedSeries()];
      } else {
        requests = [TMDB.getTrendingAll(), TMDB.getPopularMovies(), TMDB.getPopularSeries(), TMDB.getTopRatedMovies()];
      }
      return Promise.all(requests).then(function (data) {
        var trending = list(data[0]).map(fromTMDB);
        var popularMovies = list(data[1]).map(function (x) { if (!x.media_type) x.media_type = type === "tv" ? "tv" : "movie"; return fromTMDB(x); });
        var popularTV = type === "tv" ? popularMovies : type === "movie" ? [] : list(data[2]).map(function (x) { if (!x.media_type) x.media_type = "tv"; return fromTMDB(x); });
        var topRated = list(data[type ? 2 : 3]).map(function (x) { if (!x.media_type) x.media_type = type || "movie"; return fromTMDB(x); });
        var rows = [];
        var recent = Store.get("recent", []).filter(function (x) { return x && Store.progressFor(x.id, x.type) !== null; }).map(function (x) {
          var item = x.item || x;
          return Object.assign({}, item, { progress: Store.progressFor(x.id, x.type) });
        });
        if (recent.length) rows.push({ title: "Continue Watching", kind: "cont", items: take(recent, 12) });
        if (trending.length) rows.push({ title: "Trending Now", items: take(trending, 16) });
        if (popularMovies.length && type !== "tv") rows.push({ title: "Popular Movies", items: take(popularMovies, 16) });
        if (topRated.length) rows.push({ title: type === "tv" ? "Top Rated Series" : "Top Rated Movies", kind: "top10", items: take(topRated, 10) });
        if (popularTV.length && type !== "movie") rows.push({ title: "Popular TV Shows", items: take(popularTV, 16) });
        if (!type && popularMovies.length) rows.push({ title: "Recommended For You", items: take(popularMovies.slice().reverse(), 12) });
        return { hero: trending[0] || popularMovies[0] || popularTV[0], rows: rows };
      });
    },
    get: function (id, type) {
      type = type === "tv" || type === "series" ? "tv" : "movie";
      return (type === "tv" ? TMDB.getSeries(id) : TMDB.getMovie(id)).then(fromTMDB);
    },
    similar: function (id, type) {
      type = type === "tv" || type === "series" ? "tv" : "movie";
      return (type === "tv" ? TMDB.getSeries(id, "similar") : TMDB.getMovie(id, "similar"))
        .then(function (data) { return list(data.similar || {}).map(fromTMDB); });
    },
    season: function (id, season) {
      return TMDB.getSeason(id, season).then(function (data) {
        return (data.episodes || []).map(function (episode) {
          var item = fromTMDB({ id: episode.id, name: episode.name, overview: episode.overview,
            still_path: episode.still_path, vote_average: episode.vote_average,
            air_date: episode.air_date, media_type: "tv" });
          item.id = Number(id);
          item.episodeId = Number(episode.id);
          item.title = episode.name || "Episode " + episode.episode_number;
          item.episode = Number(episode.episode_number);
          item.season = Number(season);
          item.backdrop = episode.still_path ? IMG + "w780" + episode.still_path : "";
          item.poster = episode.still_path ? IMG + "w342" + episode.still_path : "";
          item.year = episode.air_date ? episode.air_date.slice(0, 4) : "";
          item.desc = episode.overview || "";
          item.type = "tv";
          item.tmdb = { id: Number(id), type: "tv" };
          return item;
        });
      });
    },
    byIds: function (ids) {
      return Promise.all((ids || []).map(function (entry) {
        var id = typeof entry === "object" ? entry.id : entry;
        var type = typeof entry === "object" ? entry.type : "movie";
        return Api.get(id, type).catch(function () { return null; });
      })).then(function (items) { return items.filter(Boolean); });
    },
    search: function (query) {
      if (!query) return Promise.resolve([]);
      return TMDB.search(query).then(function (data) {
        return list(data).filter(function (x) { return x.media_type === "movie" || x.media_type === "tv"; }).slice(0, 24).map(fromTMDB);
      });
    }
  };
  w.Api = Api;
})(window);
