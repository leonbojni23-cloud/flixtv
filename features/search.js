// search feature - uses window.TV (see README "Feature files").
// Search tab: on-screen keyboard -> TMDB search/multi -> cards with "where to watch" in your region.
(function () {
  var TV = window.TV, esc = TV.esc;
  var KEYS = ['abcdefghijklm', 'nopqrstuvwxyz', '1234567890'];
  var q = '', seq = 0, timer, where = {}; // where: 'tv/123' -> label html (cache)

  var root = TV.el('div', '', '<button id="sxclose" class="f" type="button" aria-label="Back">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>BACK</span></button>' +
    '<div class="sq"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>' +
    '<span id="sqText"></span><i class="caret"></i></div><div id="skb"></div><div id="syt"></div><h3 id="sresTitle"></h3><div id="sres" class="strip"></div>');
  root.id = 'search'; root.hidden = true;
  document.body.appendChild(root);
  var $ = function (id) { return document.getElementById(id); };

  // keyboard: 3 character rows + [space, backspace, clear]
  KEYS.forEach(function (row, i) {
    var r = TV.el('div', 'skrow');
    row.split('').forEach(function (ch) { r.appendChild(key(ch, ch, function () { type(ch); })); });
    if (i === 2) {
      r.appendChild(key('Space', 'wide', function () { type(' '); }));
      r.appendChild(key('&#9003;', 'wide', back1));
      r.appendChild(key('Clear', 'wide', function () { setQ(''); }));
    }
    $('skb').appendChild(r);
  });
  function key(label, cls, fn) { var k = TV.el('span', 'skey f' + (cls.length > 1 ? ' ' + cls : ''), label); k.onok = fn; return k; }
  var yt = TV.el('span', 'schip f');
  yt.onok = function () { TV.launch('youtube.leanback.v4', {contentTarget: 'https://www.youtube.com/tv#/search?q=' + encodeURIComponent(q.trim())}); };
  $('syt').appendChild(yt);
  $('sxclose').onok = function () { TV.closeView(); };

  function type(ch) { if (q.length < 40) setQ(q + ch); }
  function back1() { setQ(q.slice(0, -1)); }
  function setQ(v) {
    q = v;
    $('sqText').textContent = q || 'Search movies & shows';
    $('sqText').className = q ? '' : 'ph';
    yt.innerHTML = '<b>&#9654;</b> Search YouTube' + (q.trim() ? ' for “' + esc(q.trim()) + '”' : '');
    clearTimeout(timer);
    timer = setTimeout(run, 350);
  }

  function run() {
    var s = q.trim(), my = ++seq;
    var req = s.length < 2 ? TV.tmdb('trending/all/day') : TV.tmdb('search/multi', '&include_adult=false&query=' + encodeURIComponent(s));
    $('sresTitle').textContent = s.length < 2 ? 'Trending searches' : 'Searching…';
    req.then(function (r) {
      if (my !== seq) return; // a newer query won
      var list = r.results.filter(function (m) { return m.media_type !== 'person' && (m.poster_path || m.backdrop_path); }).slice(0, 20);
      $('sresTitle').textContent = s.length < 2 ? 'Trending searches' : list.length ? 'Results for “' + s + '”' : 'No results for “' + s + '”';
      show(list);
    }).catch(function () { if (my === seq) { $('sresTitle').textContent = 'Search failed, check the connection'; show([]); } });
  }

  function show(list) {
    var strip = $('sres'); strip.innerHTML = ''; strip.style.transform = '';
    list.forEach(function (m, i) {
      var it = TV.fromTmdb(m);
      // Search selection always opens the in-app title details first; it must not
      // jump straight to an external streaming app.
      var c = TV.card(it), w = TV.el('div', 'swhere');
      c.onok = function () { TV.itemOk(it); };
      c.onclick = c.onok;
      c.appendChild(w);
      strip.appendChild(c);
      if (i < 8) watch(it.tmdb, w); // ponytail: providers for first 8 only, the rest show nothing
    });
    if (TV.view() === 'search') TV.rebuild();
  }

  // "Where can I watch it": your services first, then other streamers, else rent/buy.
  function watch(t, w) {
    var k = t.type + '/' + t.id;
    if (where[k] != null) { w.innerHTML = where[k]; return; }
    w.innerHTML = '<span class="dim">Checking where to watch…</span>';
    TV.tmdb(k + '/watch/providers').then(function (r) {
      var reg = (r && r.results && r.results[TV.C.REGION]) || {}, mine = [], other = [];
      (reg.flatrate || []).concat(reg.free || [], reg.ads || []).forEach(function (p) {
        var s = TV.svcFor(p.provider_name), name = s ? s.name : p.provider_name.replace(/ (Amazon|Apple TV) Channel$/, '');
        if (s && TV.S.services.indexOf(s.name) >= 0) { if (mine.indexOf(name) < 0) mine.push(name); }
        else if (other.indexOf(name) < 0 && mine.indexOf(name) < 0) other.push(name);
      });
      var rent = (reg.rent || reg.buy || [])[0];
      var html = mine.length ? '<b>' + esc(mine.join(' · ')) + '</b>' + (other.length ? '<span class="dim"> · ' + esc(other[0]) + '</span>' : '') :
        other.length ? '<span>' + esc(other.slice(0, 2).join(' · ')) + '</span>' :
        rent ? '<span class="dim">' + (reg.rent ? 'Rent' : 'Buy') + ': ' + esc(rent.provider_name) + '</span>' :
        '<span class="dim">Not streaming in ' + TV.C.REGION + '</span>';
      w.innerHTML = where[k] = html;
    }).catch(function () { w.innerHTML = ''; });
  }

  TV.addView('search', {
    nav: function () {
      return [[$('sxclose')]].concat([].slice.call(root.querySelectorAll('.skrow')).map(function (r) { return [].slice.call(r.children); }))
        .concat([[yt], [].slice.call($('sres').children)]);
    },
    show: function () { root.hidden = false; if (!$('sres').children.length) setQ(q); TV.rebuild(1, 0); }, // start on the keyboard, not the close button
    hide: function () { root.hidden = true; },
    // Physical keyboard (desktop testing / USB keyboards). Backspace deletes while there's text, else it's Back.
    keydown: function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
      if (ev.key && ev.key.length === 1 && /[\w ]/.test(ev.key)) type(ev.key.toLowerCase());
      else if (ev.keyCode === 8 && q) back1();
      else return false;
      return true;
    },
    onFocus: function (e, pos) {
      if (e.parentNode && e.parentNode.id === 'sres') e.parentNode.style.transform = 'translateX(' + -Math.max(0, e.offsetLeft - (pos.c ? 40 : 0)) + 'px)';
    }
  });
  TV.addTab('Search', 'search');
})();
