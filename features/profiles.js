// profiles feature - uses window.TV (see README "Feature files"). Loads BEFORE app.js.
// Profile list lives in raw localStorage (`profiles`, `profile`); everything else goes through TV.store, namespaced by prefix.
(function () {
  // Movies: US PG or lower. TV discover ignores certification, so both are limited to Family/Kids genres and drop horror/thriller/crime/war.
  var KIDS_Q = '&certification_country=US&certification.lte=PG&include_adult=false&with_genres=10751%7C10762&without_genres=27,53,80,10768';
  var KIDS_HIDE = ['com.webos.app.browser', 'com.zee5.app', 'com.webos.app.discovery', 'com.palm.app.settings'];
  var COLORS = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995', '#c58af9', '#ff8bcb', '#78d9ec', '#fcad70'];
  var NAMES = ['Mom', 'Dad', 'Kids', 'Guest', 'Grandma', 'Grandpa', 'Friend', 'Me'];

  var list;
  try { list = JSON.parse(localStorage.profiles || '[]'); } catch (e) { list = []; }
  // id 'default' keeps prefix '' so settings/history saved before profiles existed stay with it
  if (!list.length) list = [{id: 'default', name: (window.CONFIG && CONFIG.NAME) || 'Me', color: COLORS[0], kids: false, hideApps: []}];
  function save() { localStorage.profiles = JSON.stringify(list); }
  function byId(id) { return list.filter(function (p) { return p.id === id; })[0]; }
  function prefix(p) { return p.id === 'default' ? '' : p.id + '.'; }
  save();
  var cur = byId(localStorage.profile) || list[0];
  window.TV_PROFILE = {prefix: prefix(cur), name: cur.name, color: cur.color, extraQ: cur.kids ? KIDS_Q : '', hideApps: cur.hideApps || []};

  window.addEventListener('tvready', function () {
    var TV = window.TV, quick = TV.onAvatar;
    var box = document.createElement('div'); box.id = 'prof'; box.hidden = true; document.body.appendChild(box);
    var mode = 'pick', draft = null, rows = [];

    function btn(cls, html, onok) { var e = TV.el('span', cls + ' f', html); e.onok = onok; return e; }
    function av(p) { return '<span class="pav" style="background:' + p.color + '">' + TV.esc(p.name.charAt(0).toUpperCase()) + '</span>'; }
    function chips(opts, val, set) {
      var row = TV.el('div', 'prow');
      opts.forEach(function (o) {
        var c = btn('pchip' + (o[0] === val ? ' on' : ''), o[1], function () { set(o[0]); render(); TV.rebuild(); });
        row.appendChild(c);
      });
      return row;
    }

    function names() { return NAMES.indexOf(draft.name) < 0 ? [draft.name].concat(NAMES) : NAMES; }
    function render() {
      box.innerHTML = ''; rows = [];
      if (mode === 'form') return renderForm();
      var head = TV.el('div', 'phead');
      var backBtn = btn('pbtn pback', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>BACK</span>', back);
      var qs = btn('pbtn', 'Quick settings', function () { TV.closeView(); quick(); });
      head.appendChild(backBtn); head.appendChild(qs); box.appendChild(head);
      rows.push([backBtn, qs]);
      box.appendChild(TV.el('h1', 'ptitle', mode === 'edit' ? 'Choose a profile to edit' : 'Who’s watching?'));
      var strip = TV.el('div', 'pstrip'), avs = [];
      list.forEach(function (p) {
        var e = btn('pcard' + (p.id === cur.id ? ' cur' : ''), av(p) + '<b>' + TV.esc(p.name) + '</b>' + (p.kids ? '<i>Kids</i>' : ''), function () {
          if (mode === 'edit') { draft = Object.assign({}, p); mode = 'form'; render(); return TV.rebuild(0, Math.max(0, names().indexOf(p.name))); }
          if (p.id === cur.id) return TV.closeView();
          localStorage.profile = p.id; location.reload();
        });
        strip.appendChild(e); avs.push(e);
      });
      var add = btn('pcard', '<span class="pav padd">+</span><b>Add profile</b>', function () {
        draft = {id: '', name: NAMES.filter(function (n) { return !list.some(function (p) { return p.name === n; }); })[0] || 'Guest',
          color: COLORS[list.length % COLORS.length], kids: false};
        mode = 'form'; render(); TV.rebuild(0, names().indexOf(draft.name));
      });
      strip.appendChild(add); avs.push(add);
      box.appendChild(strip); rows.push(avs);
      var foot = TV.el('div', 'pfoot'), ed = btn('pbtn', mode === 'edit' ? 'Done' : 'Edit profiles', function () { mode = mode === 'edit' ? 'pick' : 'edit'; render(); TV.rebuild(1, 0); });
      foot.appendChild(ed); box.appendChild(foot); rows.push([ed]);
    }

    function renderForm() {
      box.appendChild(TV.el('h1', 'ptitle', draft.id ? 'Edit profile' : 'Add profile'));
      box.appendChild(TV.el('div', 'pprev', av(draft)));
      [['Name', chips(names().map(function (n) { return [n, TV.esc(n)]; }), draft.name, function (v) { draft.name = v; })],
       ['Colour', chips(COLORS.map(function (c) { return [c, '<span class="pdot" style="background:' + c + '"></span>']; }), draft.color, function (v) { draft.color = v; })],
       ['Kids profile', chips([[true, 'On'], [false, 'Off']], draft.kids, function (v) { draft.kids = v; })]
      ].forEach(function (r) {
        box.appendChild(TV.el('div', 'plabel', r[0] + (r[0] === 'Kids profile' ? '<small>Family-friendly titles only; hides Browser, ZEE5, Apps Store and Settings</small>' : '')));
        box.appendChild(r[1]); rows.push([].slice.call(r[1].children));
      });
      var act = TV.el('div', 'prow pacts'), a = [];
      a.push(btn('pbtn', 'Save', function () {
        var p = byId(draft.id);
        if (!p) { p = {id: 'p' + Date.now().toString(36)}; list.push(p); }
        var kidsChanged = p.kids !== draft.kids;
        p.name = draft.name; p.color = draft.color; p.kids = draft.kids;
        if (kidsChanged || !p.hideApps) p.hideApps = p.kids ? KIDS_HIDE.slice() : [];
        save();
        if (p.id === cur.id) return location.reload(); // current profile's avatar/filters changed
        mode = 'pick'; render(); TV.rebuild(1, list.indexOf(p));
      }));
      if (draft.id && list.length > 1) a.push(btn('pbtn pdel', 'Delete', function () {
        list = list.filter(function (p) { return p.id !== draft.id; }); save();
        var pre = prefix(draft);
        if (pre) Object.keys(localStorage).forEach(function (k) { if (k.indexOf(pre) === 0) localStorage.removeItem(k); });
        if (draft.id === cur.id) { localStorage.profile = list[0].id; return location.reload(); }
        mode = 'pick'; render(); TV.rebuild(1, 0);
      }));
      a.push(btn('pbtn', 'Cancel', back));
      a.forEach(function (e) { act.appendChild(e); }); box.appendChild(act); rows.push(a);
    }

    function back() {
      if (mode === 'pick') return TV.closeView();
      mode = mode === 'form' ? 'edit' : 'pick'; render(); TV.rebuild(1, 0);
    }

    TV.addView('profiles', {
      nav: function () { return rows; },
      show: function () { mode = 'pick'; box.hidden = false; document.body.classList.add('profiles-open'); render(); },
      hide: function () { box.hidden = true; document.body.classList.remove('profiles-open'); },
      back: back
    });
    function openSwitcher() { TV.openView('profiles'); TV.rebuild(1, 0); }
    TV.onAvatar = openSwitcher;
    TV.addSetting({key: 'askProfile', title: 'Ask who’s watching at start', opts: [[true, 'On'], [false, 'Off']]}, false);
    if (TV.S.askProfile && list.length > 1) openSwitcher();
  });
})();
