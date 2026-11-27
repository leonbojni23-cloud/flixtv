(function (w) {
  "use strict";
  var svg = function (path) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>'; };
  var I = w.Icons = {
    play: svg("M8 5v14l11-7z"),
    plus: svg("M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"),
    check: svg("M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"),
    info: svg("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"),
    search: svg("M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 9.5 16a6.5 6.5 0 0 0 4.2-1.6l.3.3v.8l5 5 1.5-1.5zM9.5 14a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"),
    user: svg("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3 0-8 1.5-8 4v2h16v-2c0-2.5-5-4-8-4z")
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
  var bg = function (m) { return "background:linear-gradient(160deg,hsl(" + (m.hue || 0) + ",55%,34%),hsl(" + ((m.hue || 0) + 40) % 360 + ",60%,11%))"; };
  var backdrop = function (m) { return m.backdrop ? "background:#000 url('" + esc(m.backdrop) + "') center/cover" : bg(m); };
  var card = function (m, o) {
    o = o || {};
    var progress = o.prog !== undefined ? o.prog : m.progress;
    return '<div class="card f' + (o.rank ? ' t10' : '') + (o.episode ? ' episode' : '') +
      '" data-act="' + (o.episode ? 'play' : 'open') + '" data-id="' + Number(m.id) + '" data-type="' + esc(m.type || 'movie') + '"' +
      (o.episode ? ' data-season="' + Number(o.season) + '" data-episode="' + Number(o.episode) + '"' : '') +
      (m.poster ? ' data-src="' + esc(m.poster) + '"' : '') + '>' +
      (o.rank ? '<b class="rank">' + o.rank + '</b>' : '') +
      '<div class="poster" style="' + bg(m) + '"><span class="pt">' + esc(o.episode ? ('S' + o.season + ' · E' + o.episode + '  ' + m.title) : m.title) +
      '</span><span class="pm">' + esc(m.year || '') + (m.genres && m.genres[0] ? ' · ' + esc(m.genres[0]) : '') + '</span>' +
      (progress !== null && progress !== undefined ? '<div class="bar"><i style="transform:scaleX(' + Math.max(0, Math.min(100, progress)) / 100 + ')"></i></div>' : '') +
      '</div></div>';
  };
  var rail = function (title, items, options) {
    options = options || function () { return {}; };
    return '<section class="sec"><h2>' + esc(title) + '</h2><div class="track" data-row data-rail>' +
      (items || []).map(function (item, i) { return card(item, options(item, i)); }).join("") +
      '</div></section>';
  };
  var listButton = function (m) {
    return '<button class="btn f" data-act="list" data-id="' + m.id + '" data-type="' + esc(m.type || 'movie') + '">' +
      (Store.inList(m.id, m.type) ? I.check + 'In My List' : I.plus + 'My List') + '</button>';
  };
  var hero = function (m, detail) {
    if (!m) return '<section class="hero"></section>';
    var isTV = m.type === "tv";
    return '<section class="hero' + (detail ? ' det' : '') + '"><div class="bd" style="' + backdrop(m) + '"></div><div class="hin">' +
      '<div class="eyebrow">' + (isTV ? 'SERIES' : 'FILM') + '</div><h1>' + esc(m.title) + '</h1>' +
      '<div class="meta"><span class="match">' + (m.match ? m.match + '% Match' : '') + '</span><span>' + esc(m.year || '') +
      '</span><span class="tag">' + esc(m.rating || '') + '</span><span>' + esc(m.len || '') + '</span></div>' +
      (detail && m.genres && m.genres.length ? '<div class="gen">' + esc(m.genres.join(', ')) + '</div>' : '') +
      '<p>' + esc(m.desc || '') + '</p><div class="btns" data-row>' +
      (isTV && detail ? '<button class="btn pri f" data-act="episodes">' + I.play + 'Episodes</button>' :
        '<button class="btn pri f" data-act="play" data-id="' + m.id + '" data-type="' + esc(m.type || 'movie') + '">' + I.play + 'Play</button>') +
      (detail ? listButton(m) : '<button class="btn f" data-act="open" data-id="' + m.id + '" data-type="' + esc(m.type || 'movie') + '">' + I.info + 'More Info</button>') +
      '</div></div></section>';
  };
  var catalog = function (tab, type) {
    return {
      tab: tab,
      load: function () { return Api.home(type); },
      view: function (data) {
        return '<div id="scroll">' + hero(data.hero) + data.rows.map(function (row) {
          return rail(row.title, row.items, function (item, i) {
            return { rank: row.kind === "top10" ? i + 1 : 0,
              prog: row.kind === "cont" ? Store.progressFor(item.id, item.type) : null };
          });
        }).join("") + '</div>';
      }
    };
  };
  var Screens = w.Screens = {
    home: catalog("home", null),
    movies: catalog("movies", "movie"),
    tv: catalog("tv", "tv"),
    err: function (error) {
      return '<div class="msg"><h2>Unable to load FLIXTV</h2><p>' + esc(error && error.message || "Please try again.") +
        '</p><div data-row><button class="btn pri f" data-act="retry">Try again</button></div></div>';
    },
    list: {
      tab: "list",
      load: function () { return Api.byIds(Store.get("list", [])); },
      view: function (items) {
        var html = '<div id="scroll"><h1 class="pt1">My List</h1>';
        if (!items.length) return html + '<div class="msg"><p>Your list is empty. Select “My List” on any title to save it here.</p><div data-row><button class="btn pri f" data-act="tab" data-t="home">Browse titles</button></div></div></div>';
        for (var i = 0; i < items.length; i += 7) html += '<section class="sec"><div class="grow" data-row>' +
          items.slice(i, i + 7).map(function (item) { return card(item, { prog: Store.progressFor(item.id, item.type) }); }).join("") + '</div></section>';
        return html + '</div>';
      }
    },
    details: {
      tab: null,
      load: function (params) {
        return Api.get(params.id, params.type).then(function (item) {
          var tasks = [Api.similar(item.id, item.type)];
          var firstSeason = item.type === "tv" ? (item.seasons || []).filter(function (s) { return s.season_number > 0; })[0] : null;
          tasks.push(firstSeason ? Api.season(item.id, firstSeason.season_number) : Promise.resolve([]));
          return Promise.all(tasks).then(function (data) {
            return { item: item, similar: data[0], episodes: data[1], season: firstSeason ? firstSeason.season_number : 1 };
          });
        });
      },
      view: function (data) {
        var html = '<div id="scroll">' + hero(data.item, true);
        if (data.item.type === "tv" && data.episodes.length) {
          html += '<section class="sec" id="episodes"><h2>Season ' + data.season + ' · Episodes</h2><div class="track" data-row data-rail>' +
            data.episodes.map(function (episode) { return card(episode, { episode: episode.episode, season: data.season }); }).join("") +
            '</div></section>';
        }
        if (data.similar.length) html += rail("More Like This", data.similar.slice(0, 12), function () { return {}; });
        return html + '</div>';
      }
    },
    search: {
      tab: "search", timer: 0, query: "",
      load: function () { return Api.search(""); },
      view: function (items) {
        this.query = "";
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var keyboard = function (row) {
          return '<div class="krow" data-row>' + chars.slice(row * 12, row * 12 + 12).split("").map(function (c) {
            return '<button class="key f" data-act="key" data-k="' + c + '">' + c + '</button>';
          }).join("") + '</div>';
        };
        return '<div id="scroll" data-fixed><div class="qv"><span id="qv" class="ph">Search titles or genres</span></div>' +
          keyboard(0) + keyboard(1) + keyboard(2) +
          '<div class="krow" data-row><button class="key w f" data-act="key" data-k=" ">Space</button>' +
          '<button class="key w f" data-act="key" data-k="del">Delete</button><button class="key w f" data-act="key" data-k="clr">Clear</button></div>' +
          '<section class="sec"><h2 id="rt">Search results</h2><div class="track" data-row data-rail id="res">' +
          items.map(function (item) { return card(item, {}); }).join("") + '</div></section></div>';
      },
      key: function (key) {
        this.query = key === "del" ? this.query.slice(0, -1) : key === "clr" ? "" : (this.query + key).slice(0, 32);
        var query = this.query, value = document.getElementById("qv");
        value.textContent = query || "Search titles or genres";
        value.className = query ? "" : "ph";
        clearTimeout(this.timer);
        this.timer = setTimeout(function () {
          Api.search(query).then(function (items) {
            var results = document.getElementById("res");
            if (query !== Screens.search.query || !results) return;
            results.innerHTML = items.map(function (item) { return card(item, {}); }).join("");
            results._off = 0; results.style.transform = "";
            document.getElementById("rt").textContent = query ? (items.length ? 'Results for “' + query + '”' : "No results") : "Search results";
            Nav.rescan();
          }).catch(function () {});
        }, 250);
      },
      destroy: function () { clearTimeout(this.timer); }
    }
  };
})(window);
