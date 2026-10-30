// ambient feature - uses window.TV (see README "Feature files").
// Screensaver: after S.ambient minutes without input, a Ken-Burns slideshow of backdrops with clock + title.
(function () {
  var TV = window.TV;
  TV.addSetting({key: 'ambient', title: 'Ambient mode', hint: 'Slideshow when idle',
    opts: [[0, 'Off'], [2, '2 min'], [5, '5 min'], [10, '10 min']]}, 5);

  var root = TV.el('div', '', '<img alt=""><img alt=""><div class="amb-clock"><b></b><span></span></div>' +
    '<div class="amb-title"><b></b><span></span></div>');
  root.id = 'ambient'; root.hidden = true;
  document.body.appendChild(root);
  var imgs = root.querySelectorAll('img'), clock = root.querySelector('.amb-clock'), cap = root.querySelector('.amb-title');

  var on = false, cur, shownAt = 0, last = Date.now(), list = [], idx = 0, flip = 0, slideT, tickT, pre;

  // Everything the home screen has rendered: hero + cards (they carry .item), w1280 backdrops only.
  function collect() {
    var seen = {}, out = TV.heroItems().concat([].map.call(document.querySelectorAll('.card'), function (c) { return c.item; }));
    out = out.filter(function (it) {
      if (!it || !it.bg || it.src === 'YouTube' || seen[it.title]) return false;
      return (seen[it.title] = true);
    });
    for (var i = out.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = out[i]; out[i] = out[j]; out[j] = t; }
    return out;
  }
  function tick() {
    var d = new Date(), h = d.getHours();
    clock.firstChild.textContent = (TV.S.clock24 ? ('0' + h).slice(-2) : h % 12 || 12) + ':' + ('0' + d.getMinutes()).slice(-2);
    clock.lastChild.textContent = d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  }
  function slide() {
    var it = list[idx % list.length], img = imgs[flip], old = imgs[1 - flip];
    img.onload = function () {
      if (!on) return;
      img.className = ''; void img.offsetWidth; // restart the Ken-Burns animation
      img.className = 'on kb' + (idx % 4);
      old.classList.remove('on');
      cur = it; cap.firstChild.textContent = it.title;
      cap.lastChild.textContent = it.svc ? 'On ' + it.svc.name : it.src || '';
      flip = 1 - flip; idx++;
      var next = list[idx % list.length]; pre = new Image(); pre.src = next.bg; // preload only the next one
      slideT = setTimeout(slide, 12000);
    };
    img.onerror = function () { idx++; slideT = setTimeout(slide, 500); };
    img.src = it.bg;
  }
  function show() {
    if (on) return;
    list = collect(); if (!list.length) return;
    on = true; cur = null; shownAt = Date.now(); idx = 0;
    tick(); tickT = setInterval(tick, 10000);
    root.hidden = false; void root.offsetWidth; root.classList.add('show');
    slide();
  }
  function hide() {
    if (!on) return;
    on = false; clearTimeout(slideT); clearInterval(tickT);
    root.classList.remove('show');
    setTimeout(function () { if (!on) { root.hidden = true; imgs[0].className = imgs[1].className = ''; } }, 600);
  }
  TV.ambientNow = show;

  // Input tracking (capture phase on window runs before the core's document listeners).
  function input(ev) {
    last = Date.now();
    if (!on) return;
    if (ev.type === 'mousemove' && last - shownAt < 800) return; // ignore the jitter right as it appears
    ev.stopImmediatePropagation(); ev.preventDefault();
    hide();
    if (ev.type === 'keydown' && ev.keyCode === 13 && cur) TV.itemOk(cur); // OK opens the shown title
  }
  ['keydown', 'keyup', 'click', 'mousedown', 'mouseup', 'wheel', 'mousemove'].forEach(function (t) {
    window.addEventListener(t, input, {capture: true, passive: false});
  });
  setInterval(function () {
    if (+TV.S.ambient && document.visibilityState === 'visible' && Date.now() - last > TV.S.ambient * 60000) show();
  }, 10000);
  document.addEventListener('visibilitychange', function () { last = Date.now(); if (document.visibilityState !== 'visible') hide(); });
})();
