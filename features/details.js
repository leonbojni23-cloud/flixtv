
// features/details.js
// TMDB details, movie/series navigation, YapGrid player and watchlist.
// Compatible with the existing window.TV API and LG webOS remote navigation.

(function () {
  'use strict';

  var TV = window.TV;

  if (!TV) {
    console.error('TV API is not available. Check index.html script order.');
    return;
  }

  var esc = TV.esc;
  var box = TV.el('div');

  var stack = [];
  var cache = {};
  var origin = null;
  var currentSeason = null;
  var currentItem = null;
  var requestToken = 0;

  box.id = 'details';
  box.hidden = true;
  document.body.appendChild(box);

  // ---------- HELPERS ----------

  function isSeries(it) {
    return it && it.tmdb &&
      (it.tmdb.type === 'tv' || it.tmdb.type === 'series');
  }

  function validItem(it) {
    return !!(
      it &&
      it.tmdb &&
      it.tmdb.id &&
      (it.tmdb.type === 'movie' || isSeries(it))
    );
  }

  function image(path, size) {
    if (!path) return '';
    return 'https://image.tmdb.org/t/p/' + (size || 'w1280') + path;
  }

  function year(date) {
    return date ? String(date).slice(0, 4) : '';
  }

  function formatRuntime(minutes) {
    if (!minutes) return '';

    var h = Math.floor(minutes / 60);
    var m = minutes % 60;

    return h ? h + 'h ' + m + 'm' : m + 'm';
  }

  function typePath(it) {
    return isSeries(it) ? 'tv' : 'movie';
  }

  function itemKey(it) {
    return typePath(it) + '/' + it.tmdb.id;
  }

  function makeButton(label, callback, extraClass) {
    var b = TV.el(
      'span',
      'dbtn f' + (extraClass ? ' ' + extraClass : ''),
      esc(label)
    );

    b.onok = callback;
    return b;
  }

  function makeMessage(message) {
    return TV.el('p', 'dmessage', esc(message));
  }

  function request(path, append) {
    var q = append
      ? '&append_to_response=' + encodeURIComponent(append)
      : '';

    return TV.tmdb(path, q);
  }

  // ---------- WATCHLIST ----------

  var list = TV.store('watchlist') || [];

  function sameItem(a, b) {
    return !!(
      a &&
      b &&
      a.tmdb &&
      b.tmdb &&
      String(a.tmdb.id) === String(b.tmdb.id) &&
      typePath(a) === typePath(b)
    );
  }

  function inList(it) {
    return list.some(function (x) {
      return sameItem(x, it);
    });
  }

  function toggleWatchlist(it) {
    if (!validItem(it)) {
      TV.toast('This title cannot be added to the watchlist');
      return false;
    }

    var had = inList(it);

    list = list.filter(function (x) {
      return !sameItem(x, it);
    });

    if (!had) {
      list.unshift({
        title: it.title,
        sub: it.sub,
        meta: it.meta,
        img: it.img,
        bg: it.bg,
        blur: it.blur,
        src: 'TMDB',
        tmdb: {
          id: it.tmdb.id,
          type: typePath(it)
        }
      });
    }

    TV.store('watchlist', list);

    TV.toast(
      had
        ? 'Removed from your watchlist'
        : 'Added to your watchlist'
    );

    TV.refresh();

    return !had;
  }

  TV.addRow(function () {
    return list.length
      ? {
          title: 'My watchlist',
          items: list
        }
      : null;
  });

  // ---------- TMDB DETAILS ----------

  function loadDetails(it) {
    var key = itemKey(it);

    if (cache[key]) {
      return Promise.resolve(cache[key]);
    }

    var path = typePath(it) + '/' + it.tmdb.id;

    return request(
      path,
      'credits,videos,recommendations,watch/providers'
    ).then(function (data) {
      cache[key] = data;
      return data;
    });
  }

  function loadSeason(seriesId, seasonNumber) {
    var key = 'season/' + seriesId + '/' + seasonNumber;

    if (cache[key]) {
      return Promise.resolve(cache[key]);
    }

    return request(
      'tv/' + seriesId + '/season/' + seasonNumber
    ).then(function (data) {
      cache[key] = data;
      return data;
    });
  }

  // ---------- YAPGRID PLAYER ----------

  // YapGrid iframe is managed by features/yapgrid-embed.js.
  // This file sends the selected movie or episode to that module.

  function openPlayer(item, requestData) {
    if (
      !window.TVPlayer ||
      typeof window.TVPlayer.open !== 'function'
    ) {
      TV.toast('YapGrid player module is not loaded');

      console.error(
        'Load features/yapgrid-embed.js after app.js and before details.js'
      );

      return false;
    }

    return window.TVPlayer.open(item, requestData);
  }

  // ---------- RENDER DETAILS ----------

  function render(it, data) {
    box.classList.remove('episode-browser');
    var isTv = isSeries(it);
    box.classList.toggle('movie-details', !isTv);
    currentItem = it;

    var backdrop = data && data.backdrop_path
      ? image(data.backdrop_path, 'w1280')
      : it.bg || '';

    var title = data
      ? (data.title || data.name || it.title)
      : it.title;

    var overview = data
      ? (data.overview || it.sub || '')
      : (it.sub || '');

    var date = data
      ? (data.release_date || data.first_air_date || '')
      : '';

    var runtimeMinutes = data && data.runtime
      ? data.runtime
      : (isTv && data && data.episode_run_time && data.episode_run_time.length
          ? data.episode_run_time[0]
          : 0);
    var runtime = runtimeMinutes ? formatRuntime(runtimeMinutes) : '';

    var seasons = data && data.number_of_seasons
      ? data.number_of_seasons +
        (data.number_of_seasons === 1 ? ' season' : ' seasons') +
        (data.number_of_episodes ? ' · ' + data.number_of_episodes + ' episodes' : '')
      : '';

    var genres = data && data.genres
      ? data.genres.slice(0, 3).map(function (g) {
          return g.name;
        }).join(', ')
      : '';

    var rating = data && data.vote_average
      ? '★ ' + Number(data.vote_average).toFixed(1)
      : '';

    var status = data && data.status ? data.status : '';
    var language = data && data.original_language
      ? data.original_language.toUpperCase()
      : '';
    var voteCount = data && data.vote_count
      ? Number(data.vote_count).toLocaleString() + ' votes'
      : '';
    var companies = data && data.production_companies
      ? data.production_companies.slice(0, 2).map(function (company) { return company.name; }).join(', ')
      : '';
    var meta = [
      year(date),
      isTv ? seasons : runtime,
      rating,
      voteCount,
      status,
      language,
      genres
    ].filter(Boolean).join('  ·  ');

    var cast = data && data.credits && data.credits.cast
      ? data.credits.cast.slice(0, 12)
      : [];
    var directors = data && data.credits && data.credits.crew
      ? data.credits.crew.filter(function (person) {
          return person.job === 'Director' || person.job === 'Executive Producer' ||
            (isTv && person.job === 'Creator');
        }).slice(0, 3).map(function (person) { return person.name; })
      : [];
    var creators = isTv && data && data.created_by
      ? data.created_by.map(function (person) { return person.name; }).slice(0, 3)
      : [];
    var creatorsText = creators.length ? creators.join(', ') : directors.join(', ');

    box.innerHTML =
      '<img class="dbg" alt="" decoding="async"' +
        (backdrop
          ? ' src="' + esc(backdrop) + '"'
          : '') +
      '>' +
      '<div class="dshade"></div>' +
      '<button type="button" class="dback f" aria-label="Back to previous screen">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span>BACK</span>' +
      '</button>' +
      '<div class="dbody">' +
        '<div class="dsrc">TMDB</div>' +
        '<h1>' + esc(title) + '</h1>' +
        '<div class="dmeta">' +
          esc(meta || it.meta || '') +
        '</div>' +
        '<p class="dsub">' + esc(overview) + '</p>' +
        (creatorsText ? '<div class="dcredits"><b>' + (isTv ? 'Created by' : 'Directed by') +
          ':</b> ' + esc(creatorsText) + '</div>' : '') +
        (companies ? '<div class="dcompanies"><b>Production:</b> ' + esc(companies) + '</div>' : '') +
        (cast.length ? '<section class="dcast-section"><h3>CAST</h3><div class="dcast-grid">' +
          cast.map(function (person) {
            var portrait = person.profile_path ? image(person.profile_path, 'w185') : '';
            return '<div class="dcast-person">' +
              (portrait ? '<img src="' + esc(portrait) + '" alt="" loading="lazy" decoding="async">' :
                '<div class="dcast-placeholder">' + esc((person.name || '?').charAt(0)) + '</div>') +
              '<b>' + esc(person.name || '') + '</b><span>' + esc(person.character || '') + '</span></div>';
          }).join('') + '</div></section>' : '') +
        '<div class="dbtns"></div>' +
        '<div class="dextra"></div>' +
        '<div class="dseasons"></div>' +
        '<div class="depisodes"></div>' +
      '</div>';

    var buttons = box.querySelector('.dbtns');
    var extra = box.querySelector('.dextra');

    if (isTv) {
      buttons.appendChild(
        makeButton(
          'Choose episode',
          function () {
            showSeasons(it, data);
          },
          'primary'
        )
      );
    } else {
      buttons.appendChild(
        makeButton(
          '▶ Play movie',
          function () {
            openPlayer(it, {
              type: 'movie',
              tmdbId: it.tmdb.id
            });
          },
          'primary'
        )
      );
    }

    var watchButton = makeButton(
      inList(it)
        ? '✓ In watchlist'
        : '＋ Watchlist',
      function () {
        var added = toggleWatchlist(it);

        watchButton.textContent = added
          ? '✓ In watchlist'
          : '＋ Watchlist';
      }
    );

    buttons.appendChild(watchButton);

    if (data) {
      var providers = data['watch/providers'] || {};
      var results = providers.results || {};

      var region = TV.C && TV.C.REGION
        ? TV.C.REGION
        : 'US';

      var local = results[region] || {};
      var providerNames = [];

      (local.flatrate || [])
        .concat(local.free || [], local.ads || [])
        .forEach(function (provider) {
          if (
            provider.provider_name &&
            providerNames.indexOf(provider.provider_name) < 0
          ) {
            providerNames.push(provider.provider_name);
          }
        });

      if (providerNames.length) {
        extra.textContent =
          'Available on: ' + providerNames.join(', ');
      } else {
        extra.textContent =
          'Streaming availability is not listed for ' +
          region + '.';
      }

      var trailer = ((data.videos || {}).results || [])
        .filter(function (v) {
          return v.site === 'YouTube' &&
            (v.type === 'Trailer' || v.type === 'Teaser');
        })[0];

      if (trailer) {
        buttons.appendChild(
          makeButton('▶ Trailer', function () {
            TV.launch('youtube.leanback.v4', {
              contentTarget:
                'https://www.youtube.com/tv?v=' +
                trailer.key
            });
          })
        );
      }
    }

    renderRecommendations(it, data);
  }

  // ---------- SEASONS AND EPISODES ----------

  function showSeasons(it, data) {
    if (!isSeries(it) || !data) return;

    currentSeason = null;

    var seasonBox = box.querySelector('.dseasons');
    var episodeBox = box.querySelector('.depisodes');

    seasonBox.innerHTML = '';
    episodeBox.innerHTML = '';

    // Episode browsing is a dedicated Netflix-style state.
    var recommendations = box.querySelector('.dmore');
    if (recommendations) recommendations.style.display = 'none';
    box.classList.add('episode-browser');

    seasonBox.appendChild(
      TV.el('h3', 'dsection-title', 'SEASONS')
    );

    var available = (data.seasons || []).filter(function (season) {
      return season.season_number >= 0;
    });

    if (!available.length) {
      seasonBox.appendChild(
        makeMessage('No seasons found.')
      );

      TV.rebuild(0, 0);
      return;
    }

    var row = TV.el('div', 'dseason-list');

    available.forEach(function (season) {
      var label = season.name ||
        ('Season ' + season.season_number);

      var seasonButton = makeButton(label, function () {
        selectSeason(it, season);
      });
      seasonButton.dataset.season = season.season_number;
      row.appendChild(seasonButton);
    });

    seasonBox.appendChild(row);
    // Open Season 1 immediately (or the first available non-special season),
    // while keeping every season selector visible for manual switching.
    var firstSeason = available.filter(function (season) {
      return season.season_number === 1;
    })[0] || available.filter(function (season) {
      return season.season_number > 0;
    })[0] || available[0];
    if (firstSeason) selectSeason(it, firstSeason);
    TV.rebuild(0, 0);
  }

  function selectSeason(it, season) {
    currentSeason = season.season_number;

    var seasonButtons = box.querySelectorAll('.dseason-list .dbtn');
    [].forEach.call(seasonButtons, function (button) {
      button.classList.toggle('selected', Number(button.dataset.season) === currentSeason);
    });

    var episodeBox = box.querySelector('.depisodes');
    episodeBox.innerHTML = '';

    episodeBox.appendChild(
      TV.el(
        'h3',
        'dsection-title',
        'EPISODES'
      )
    );
    var seasonCaption = TV.el('p', 'dseason-caption',
      esc(season.name || ('Season ' + currentSeason)));
    episodeBox.appendChild(seasonCaption);

    episodeBox.appendChild(
      makeMessage('Loading episodes...')
    );

    var selectedIndex = 0;
    [].forEach.call(seasonButtons, function (button, index) {
      if (Number(button.dataset.season) === currentSeason) selectedIndex = index;
    });
    TV.rebuild(2, selectedIndex);

    var token = ++requestToken;

    loadSeason(it.tmdb.id, currentSeason)
      .then(function (data) {
        if (
          token !== requestToken ||
          TV.view() !== 'details'
        ) {
          return;
        }

        episodeBox.innerHTML = '';

        episodeBox.appendChild(
          TV.el(
            'h3',
            '',
            esc(data.name || ('Season ' + currentSeason))
          )
        );

        var episodes = data.episodes || [];

        if (!episodes.length) {
          episodeBox.appendChild(
            makeMessage('No episodes found.')
          );

          TV.rebuild(0, 0);
          return;
        }

        var episodeStrip = TV.el('div', 'dep-strip');

        episodes.forEach(function (episode) {
          var number = episode.episode_number;
          var name = episode.name || ('Episode ' + number);
          var card = TV.el('div', 'dep-card f');
          var still = episode.still_path
            ? image(episode.still_path, 'w500')
            : (it.bg || '');
          var runtime = episode.runtime
            ? episode.runtime + ' min'
            : '';
          var summary = episode.overview || 'No episode description available.';

          card.innerHTML =
            '<div class="dep-image">' +
              (still
                ? '<img src="' + esc(still) + '" alt="" loading="lazy" decoding="async">'
                : '<div class="dep-image-placeholder"></div>') +
              '<span class="dep-number">EPISODE ' + esc(number) + '</span>' +
              '<span class="dep-play">▶</span>' +
            '</div>' +
            '<div class="dep-info">' +
              '<div class="dep-title">' + esc(name) + '</div>' +
              '<div class="dep-meta">' +
                esc(runtime || ('Episode ' + number)) +
              '</div>' +
              '<p class="dep-overview">' + esc(summary) + '</p>' +
            '</div>';

          card.onok = function () {
            playEpisode(it, currentSeason, number, episode);
          };
          card.onclick = card.onok;
          episodeStrip.appendChild(card);
        });

        episodeBox.appendChild(episodeStrip);

        TV.rebuild(3, 0);
      })
      .catch(function (error) {
        console.error('Could not load season:', error);

        if (token !== requestToken) return;

        episodeBox.innerHTML = '';

        episodeBox.appendChild(
          makeMessage(
            'Could not load episodes. Check your connection.'
          )
        );

        TV.rebuild(0, 0);
      });
  }

  function playEpisode(it, seasonNumber, episodeNumber, episode) {
    var episodeItem = {
      title: it.title + ' · ' +
        'S' + seasonNumber + 'E' + episodeNumber +
        (episode && episode.name
          ? ' · ' + episode.name
          : ''),
      seriesTitle: it.title,
      sub: episode && episode.overview
        ? episode.overview
        : '',
      img: it.img || it.poster || '',
      bg: it.bg || '',
      blur: it.blur || it.img || '',
      src: 'FLIXTV',
      tmdb: {
        id: it.tmdb.id,
        type: 'tv'
      },
      season: seasonNumber,
      episode: episodeNumber
    };

    openPlayer(episodeItem, {
      type: 'tv',
      tmdbId: it.tmdb.id,
      season: seasonNumber,
      episode: episodeNumber
    });
  }

  // ---------- RECOMMENDATIONS ----------

  function renderRecommendations(it, data) {
    if (!data) return;

    var recommendations = data.recommendations &&
      data.recommendations.results
      ? data.recommendations.results
      : [];

    recommendations = recommendations.filter(function (item) {
      return item &&
        item.id &&
        (item.backdrop_path || item.poster_path);
    }).slice(0, 15);

    if (!recommendations.length) return;

    var section = TV.el('section', 'dmore');

    section.appendChild(
      TV.el('h3', '', 'More like this')
    );

    var strip = TV.el('div', 'strip');

    recommendations.forEach(function (item) {
      var mapped = TV.fromTmdb(item);

      if (!mapped.tmdb) {
        mapped.tmdb = {
          id: item.id,
          type: isSeries(it) ? 'tv' : 'movie'
        };
      }

      mapped.tmdb.type = isSeries(it) ? 'tv' : 'movie';
      mapped.src = 'Recommended';

      strip.appendChild(TV.card(mapped));
    });

    section.appendChild(strip);
    // On movie pages, recommendations belong after the details and controls
    // inside the same vertical scroll area, never over the action buttons.
    var movieBody = box.classList.contains('movie-details')
      ? box.querySelector('.dbody')
      : null;
    (movieBody || box).appendChild(section);
  }

  // ---------- DETAILS VIEW ----------

  function show(it) {
    if (!validItem(it)) {
      TV.toast('This title has no valid TMDB ID');
      return;
    }

    stack.push(it);
    currentItem = it;
    currentSeason = null;

    requestToken++;

    box.hidden = false;
    render(it, null);

    var token = requestToken;

    loadDetails(it)
      .then(function (data) {
        if (token !== requestToken) return;
        if (TV.view() !== 'details') return;
        if (stack[stack.length - 1] !== it) return;

        render(it, data);
        TV.rebuild(0, 0);
      })
      .catch(function (error) {
        console.error('TMDB details error:', error);

        if (token !== requestToken) return;

        TV.toast('Could not load title details');
      });
  }

  function hide() {
    requestToken++;

    stack.pop();

    var previous = stack[stack.length - 1];

    if (previous) {
      var key = itemKey(previous);
      render(previous, cache[key] || null);
    } else {
      box.hidden = true;
      box.innerHTML = '';
      currentItem = null;
      currentSeason = null;
    }
  }

  TV.addView('details', {
    nav: function () {
      var rows = [];

      var backButton = box.querySelector('.dback');

      if (backButton) {
        backButton.onok = function () {
          TV.closeView();
        };
        backButton.onclick = function () {
          TV.closeView();
        };
        rows.push([backButton]);
      }

      var buttons = box.querySelectorAll('.dbtns .f');

      if (buttons.length) {
        rows.push([].slice.call(buttons));
      }

      var seasons = box.querySelector('.dseasons');

      if (seasons) {
        var seasonButtons = seasons.querySelectorAll('.f');

        if (seasonButtons.length) {
          rows.push([].slice.call(seasonButtons));
        }
      }

      var episodes = box.querySelector('.depisodes');

      if (episodes) {
        var episodeButtons = episodes.querySelectorAll('.f');

        if (episodeButtons.length) {
          rows.push([].slice.call(episodeButtons));
        }
      }

      var strip = box.querySelector('.dmore .strip');

      if (strip) {
        var cards = strip.querySelectorAll('.f');

        if (cards.length) {
          rows.push([].slice.call(cards));
        }
      }

      return rows;
    },

    show: show,
    hide: hide,

    onFocus: function (element, position) {
      if (
        element.parentNode &&
        (element.parentNode.classList.contains('strip') ||
         element.parentNode.classList.contains('dep-strip') ||
         element.parentNode.classList.contains('dseason-list'))
      ) {
        element.parentNode.style.transform =
          'translateX(' +
          -Math.max(
            0,
            element.offsetLeft - (position.c ? 40 : 0)
          ) +
          'px)';
      }
    },

    back: function () {
      var cameFromHome =
        stack.length === 1 && origin;

      TV.closeView();

      if (!cameFromHome || TV.view() !== 'home') {
        return;
      }

      var sections = [].slice.call(
        document.querySelectorAll('#rows .row')
      );

      for (var i = 0; i < sections.length; i++) {
        var heading = sections[i].querySelector('h3');

        if (
          heading &&
          heading.textContent === origin.row
        ) {
          TV.rebuild(2 + i, origin.col);
          return;
        }
      }
    }
  });

  // ---------- TITLE SELECTION ----------

  function openDetails(it) {
    if (!validItem(it)) {
      TV.toast('This title is missing its TMDB ID');
      return;
    }

    if (TV.view() !== 'details') {
      var focused = document.querySelector('#rows .focus');
      var row = focused && focused.closest('.row');

      origin = row
        ? {
            row: row.querySelector('h3')
              ? row.querySelector('h3').textContent
              : '',
            col: focused.parentNode
              ? [].indexOf.call(
                  focused.parentNode.children,
                  focused
                )
              : 0
          }
        : null;
    }

    TV.openView('details', it);
  }

  TV.itemOk = openDetails;

})();
