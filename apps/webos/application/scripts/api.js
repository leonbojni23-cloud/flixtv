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

  function config() { return w.FLIX_CONFIG || {}; }
  function request(path, params) {
    var cfg = config();
    var base = String(cfg.TMDB_BASE_URL || "https://api.themoviedb.org/3").replace(/\/+$/, "");
    var query = Object.assign({}, params || {});
    query.language = query.language || cfg.LANGUAGE || "en-US";
    if (cfg.TMDB_KEY) query.api_key = cfg.TMDB_KEY;
    var qs = Object.keys(query).filter(function (key) {
      return query[key] !== undefined && query[key] !== null && query[key] !== "";
    }).map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(query[key]);
    }).join("&");
    return fetch(base + "/" + String(path).replace(/^\/+/, "") + "?" + qs).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || data.success === false) {
          throw new Error(data.status_message || "TMDB request failed: " + response.status);
        }
        return data;
      });
    });
  }
  function resultList(data) { return data && Array.isArray(data.results) ? data.results : []; }
  function mapTitle(t, forcedType) {
    var type = forcedType || t.media_type || (t.name && !t.title ? "tv" : "movie");
    var date = t.release_date || t.first_air_date || "";
    var genres = (t.genres || []).map(function (g) { return g.name; });
    if (!genres.length) genres = (t.genre_ids || []).map(function (id) { return GENRES[id]; }).filter(Boolean);
    var runtime = Number(t.runtime || (t.episode_run_time && t.episode_run_time[0]) || 0);
    var seasons = (t.seasons || []).filter(function (season) { return Number(season.season_number) > 0; });
    var firstSeason = seasons.length ? Number(seasons[0].season_number) : 1;
    var ratingValue = Number(t.vote_average || 0);
    return {
      id: Number(t.id),
      title: t.title || t.name || "Untitled",
      type: type === "tv" ? "tv" : "movie",
      year: date ? String(date).slice(0, 4) : "",
      mins: runtime,
      len: type === "tv" ? (Number(t.number_of_seasons || seasons.length || 0) + " Seasons") : (runtime ? Math.floor(runtime / 60) + "h " + runtime % 60 + "m" : ""),
      rating: ratingValue ? ratingValue.toFixed(1) + "/10" : "NR",
      match: Math.round(ratingValue * 10),
      genres: genres,
      cast: (t.credits && t.credits.cast ? t.credits.cast.slice(0, 5).map(function (person) { return person.name; }) : []),
      orig: false,
      hue: Number(t.id || 0) % 360,
      desc: t.overview || "No description available.",
      poster: t.poster_path ? IMG + "w342" + t.poster_path : null,
      backdrop: t.backdrop_path ? IMG + "w1280" + t.backdrop_path : null,
      added: date ? Number(String(date).replace(/-/g, "")) : 0,
      firstSeasonNumber: firstSeason,
      seasons: seasons,
      tmdb: { id: Number(t.id), type: type === "tv" ? "tv" : "movie" }
    };
  }
  function mapped(data, forcedType) { return resultList(data).map(function (item) { return mapTitle(item, forcedType); }); }
  function unique(items) {
    var seen = {};
    return items.filter(function (item) {
      var key = item.type + ":" + item.id;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function take(items, count) { return (items || []).slice(0, count); }
  function progressKey(item) { return item.type + ":" + item.id; }

  var Api = {
    fromTMDB: mapTitle,
    home: function (type, only) {
      var calls;
      if (type === "movie") {
        calls = [request("trending/movie/day"), request("movie/popular"), request("movie/top_rated"), request("movie/now_playing"), request("movie/upcoming")];
      } else if (type === "tv") {
        calls = [request("trending/tv/day"), request("tv/popular"), request("tv/top_rated"), request("tv/on_the_air"), request("tv/airing_today")];
      } else {
        calls = [request("trending/movie/day"), request("movie/popular"), request("movie/top_rated"), request("tv/popular"), request("movie/upcoming")];
      }
      return Promise.all(calls).then(function (data) {
        var trending = mapped(data[0], type || "movie");
        var popular = mapped(data[1], type || "movie");
        var top = mapped(data[2], type || "movie").sort(function (a, b) { return b.match - a.match; });
        var other = type ? mapped(data[3], type) : mapped(data[3], "tv");
        var fresh = mapped(data[4], type === "tv" ? "tv" : "movie");
        var movies = type === "tv" ? [] : (type === "movie" ? popular : popular);
        var tv = type === "movie" ? [] : (type === "tv" ? popular : other);
        var rows = [];
        var recent = Store.get("recent", []).map(function (item) {
          var key = progressKey(item);
          var p = Store.progress()[key];
          return p == null ? null : Object.assign({}, item, { progress: p });
        }).filter(function (item) { return item && (!type || item.type === type); });
        if (recent.length) rows.push({ title: "Continue Watching", kind: "cont", items: recent });
        if (trending.length) rows.push({ title: "Trending Now", items: take(unique(trending), 30) });
        if (movies.length) rows.push({ title: "Popular Movies", items: take(unique(movies), 30) });
        if (top.length) rows.push({ title: type === "tv" ? "Top 10 TV Shows" : "Top 10 Movies", kind: "top10", items: take(unique(top), 10) });
        if (tv.length) rows.push({ title: "Popular TV Shows", items: take(unique(tv), 30) });
        if (type === "movie" && other.length) rows.push({ title: "Now Playing", items: take(unique(other), 30) });
        if (type === "tv" && other.length) rows.push({ title: "On the Air", items: take(unique(other), 30) });
        if (fresh.length) rows.push({ title: type === "tv" ? "Airing Today" : "Coming Soon", items: take(unique(fresh), 30) });
        if (!type && movies.length) rows.push({ title: "Recommended For You", items: take(unique(popular.slice().reverse()), 20) });
        if (only) rows = rows.filter(function (row) { return only.indexOf(row.title) > -1; });
        var hero = trending[0] || top[0] || popular[0] || other[0];
        return { hero: hero, rows: rows };
      });
    },
    get: function (id, type) {
      type = type === "tv" || type === "series" ? "tv" : "movie";
      var path = type + "/" + encodeURIComponent(id);
      return request(path, { append_to_response: "credits,similar" }).then(function (data) { return mapTitle(data, type); });
    },
    similar: function (id, type) {
      type = type === "tv" || type === "series" ? "tv" : "movie";
      return request(type + "/" + encodeURIComponent(id) + "/similar").then(function (data) { return mapped(data, type); });
    },
    season: function (id, seasonNumber) {
      return request("tv/" + encodeURIComponent(id) + "/season/" + encodeURIComponent(seasonNumber)).then(function (data) {
        return (data.episodes || []).map(function (episode) {
          var date = episode.air_date || "";
          return {
            id: Number(id), type: "tv", title: "E" + episode.episode_number + " · " + (episode.name || "Episode " + episode.episode_number),
            year: date.slice(0, 4), mins: Number(episode.runtime || 0), len: "S" + seasonNumber + " · E" + episode.episode_number,
            rating: episode.vote_average ? Number(episode.vote_average).toFixed(1) + "/10" : "NR",
            match: Math.round(Number(episode.vote_average || 0) * 10), genres: ["Episode"], cast: [], orig: false,
            hue: Number(id) % 360, desc: episode.overview || "", poster: episode.still_path ? IMG + "w342" + episode.still_path : null,
            backdrop: episode.still_path ? IMG + "w1280" + episode.still_path : null,
            season: Number(seasonNumber), episode: Number(episode.episode_number), mediaType: "episode"
          };
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
      if (!query) return Api.home("movie").then(function (data) { return take(data.rows[0] ? data.rows[0].items : [], 12); });
      return request("search/multi", { query: query, include_adult: false }).then(function (data) {
        return mapped(data).filter(function (item) { return item.type === "movie" || item.type === "tv"; }).slice(0, 24);
      });
    }
  };
  w.Api = Api;
})(window);
