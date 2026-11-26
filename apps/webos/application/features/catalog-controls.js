/* Lightweight genre browser for webOS. Loads only after the user opens it. */
(function () {
  "use strict";
  var tv = window.TV;
  if (!tv) return;

  var genres = {
    movies: [
      ["Aksion",28],["Aventurë",12],["Animacion",16],["Komedi",35],
      ["Krim",80],["Dokumentar",99],["Dramë",18],["Familjar",10751],
      ["Fantazi",14],["Histori",36],["Horror",27],["Muzikë",10402],
      ["Mister",9648],["Romancë",10749],["Fantashkencë",878],["Thriller",53],
      ["Luftë",10752],["Western",37]
    ],
    series: [
      ["Aksion dhe aventurë",10759],["Animacion",16],["Komedi",35],
      ["Krim",80],["Dokumentar",99],["Dramë",18],["Familjar",10751],
      ["Fëmijë",10762],["Mister",9648],["News",10763],["Reality",10764],
      ["Fantashkencë dhe fantazi",10765],["Soap",10766],["Talk",10767],
      ["Luftë dhe politikë",10768],["Western",37]
    ]
  };

  var root = document.createElement("section");
  root.id = "genre-browser";
  root.hidden = true;
  root.innerHTML = '<div class="genre-shell"><div class="genre-head"><div><small>FLIXTV COLLECTION</small><h2>Zgjidh zhanrin</h2><p id="genre-caption">Shfleto sipas kategorisë</p></div><button id="genre-back" class="genre-back f" type="button">← Kthehu</button></div><div id="genre-options" class="genre-options"></div><h3 id="genre-results-title" class="genre-results-title">Zgjidh një zhanër</h3><div id="genre-results" class="genre-results"></div></div>';
  document.body.appendChild(root);

  var trigger = document.createElement("span");
  trigger.id = "genre-trigger";
  trigger.className = "tab f genre-trigger";
  trigger.textContent = "Zhanri";
  trigger.hidden = true;
  trigger.onok = function () {
    var active = document.querySelector("#top .tab.cur");
    var type = active && active.dataset.tab === "series" ? "series" : "movies";
    tv.openView("genres", { type: type });
  };
  var nav = document.querySelector("#top .catalog-nav");
  var seriesTab = nav && nav.querySelector('[data-tab="series"]');
  if (seriesTab) seriesTab.insertAdjacentElement("afterend", trigger);

  var currentType = "movies";
  var currentRows = [];
  var requestId = 0;
  var back = root.querySelector("#genre-back");
  var options = root.querySelector("#genre-options");
  var results = root.querySelector("#genre-results");
  var title = root.querySelector("#genre-results-title");
  var caption = root.querySelector("#genre-caption");

  function updateTrigger() {
    var active = document.querySelector("#top .tab.cur");
    var page = active && active.dataset.tab;
    trigger.hidden = page !== "movies" && page !== "series";
  }
  var observer = new MutationObserver(updateTrigger);
  var tabs = document.querySelector("#top .catalog-nav");
  if (tabs) observer.observe(tabs, { attributes: true, subtree: true, attributeFilter: ["class"] });
  updateTrigger();

  function groups() {
    var rows = [[back]];
    if (options.children.length) rows.push([].slice.call(options.children));
    for (var i = 0; i < currentRows.length; i += 6) rows.push(currentRows.slice(i, i + 6));
    return rows;
  }

  function renderOptions() {
    options.innerHTML = "";
    genres[currentType].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "genre-chip f";
      button.textContent = item[0];
      button.onok = function () { loadGenre(item); };
      options.appendChild(button);
    });
  }

  function loadGenre(item) {
    var id = ++requestId;
    title.textContent = item[0];
    results.innerHTML = '<div class="genre-loading">Po ngarkohen titujt…</div>';
    currentRows = [];
    tv.rebuild(1, 0);
    var endpoint = currentType === "series" ? "discover/tv" : "discover/movie";
    var query = "&with_genres=" + item[1] + "&sort_by=popularity.desc&vote_count.gte=10&include_adult=false";
    tv.tmdb(endpoint, query).then(function (data) {
      if (id !== requestId || tv.view() !== "genres") return;
      var items = (data.results || []).filter(function (entry) {
        return entry.poster_path || entry.backdrop_path;
      }).map(function (entry) {
        return tv.fromTmdb(entry);
      });
      results.innerHTML = "";
      if (!items.length) {
        results.innerHTML = '<div class="genre-loading">Nuk u gjetën tituj për këtë zhanër.</div>';
        tv.rebuild(1, 0);
        return;
      }
      items.forEach(function (entry) {
        var card = tv.card(entry);
        results.appendChild(card);
        currentRows.push(card);
      });
      title.textContent = item[0] + " · " + items.length + " tituj";
      tv.rebuild(2, 0);
    }).catch(function (error) {
      if (id !== requestId || tv.view() !== "genres") return;
      console.error("Genre catalog failed:", error);
      results.innerHTML = '<div class="genre-loading">Nuk u ngarkua ky zhanër. Kontrollo lidhjen.</div>';
      tv.rebuild(1, 0);
    });
  }

  back.onok = function () { tv.closeView(); };
  tv.addView("genres", {
    nav: groups,
    show: function (payload) {
      currentType = payload && payload.type === "series" ? "series" : "movies";
      requestId++;
      root.hidden = false;
      caption.textContent = currentType === "series" ? "Zhanret e serialeve" : "Zhanret e filmave";
      title.textContent = "Zgjidh një zhanër";
      results.innerHTML = "";
      currentRows = [];
      renderOptions();
    },
    hide: function () {
      requestId++;
      root.hidden = true;
    },
    back: function () { tv.closeView(); }
  });
})();
