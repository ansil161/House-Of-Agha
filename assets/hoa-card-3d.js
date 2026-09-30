/* ==========================================================================
   HOUSE OF AGHA — product card hover: a real 3D turn of the bottle
   The card's twin bottle (.hoa-pc__spin, see hoa-card.css) is a flat cut-out, so turning it
   makes it go paper-thin. This rebuilds it as a turnable object: stacked rings (cap, collar,
   shoulder, body …), each a circle of thin vertical strips, textured with the bottle's front
   photo unrolled round the ring (assets/hoa-bottle-3d-NAME.webp; the back repeats the front).
   Seen straight on it matches the photo; as it turns, the label wraps round and the bottle keeps
   its full width. The CSS spin then turns this object instead of the flat image.
   Built once per card as it nears the viewport (hover-capable screens), so the very first hover
   already turns; a card hovered before that is built on the spot and still plays the turn.
   Without JS (or before a texture has loaded) the flat cut-out turns instead.
   Ring data (bands: [top, height, radius] in px of the 760px-tall texture) comes from the
   same cut-outs; regenerate both together.
   ========================================================================== */
(function () {
  var H = 760;
  var DATA = {"oud-fury":{"w":289,"cx":144.5,"bands":[[1,3,74],[4,3,87],[7,167,91],[174,5,84],[179,4,80],[183,2,76],[185,3,72],[188,13,57],[201,7,98],[208,4,121],[212,3,135],[215,521,143],[736,7,136],[743,2,129],[745,4,123],[749,10,109]]},"agha-blue":{"w":285,"cx":142.5,"bands":[[1,5,74],[6,2,81],[8,2,85],[10,164,90],[174,8,84],[182,5,80],[187,4,76],[191,4,72],[195,22,124],[217,2,132],[219,529,141],[748,5,130],[753,3,113],[756,3,76]]},"dark-paradise":{"w":291,"cx":145.5,"bands":[[1,3,77],[4,3,88],[7,171,92],[178,5,86],[183,3,82],[186,2,78],[188,4,74],[192,5,51],[197,10,100],[207,2,121],[209,4,137],[213,531,144],[744,3,132],[747,2,125],[749,2,117],[751,8,109]]},"maha":{"w":291,"cx":145.5,"bands":[[1,5,84],[6,161,92],[167,7,86],[174,6,82],[180,3,78],[183,2,74],[185,3,71],[188,20,86],[208,3,104],[211,2,114],[213,2,125],[215,2,136],[217,533,144],[750,9,135]]},"sea-smoke":{"w":290,"cx":145,"bands":[[1,5,82.5],[6,168,89.5],[174,6,83.5],[180,4,79.5],[184,4,75.5],[188,2,71.5],[190,19,93.5],[209,4,122.5],[213,2,133.5],[215,8,141.5],[223,518,143.5],[741,6,136.5],[747,3,129.5],[750,2,121.5],[752,7,110.5]]},"tobacco-enigma":{"w":289,"cx":144.5,"bands":[[1,3,76],[4,6,87],[10,157,88],[167,8,84],[175,5,80],[180,5,76],[185,3,72],[188,19,101],[207,3,120],[210,2,134],[212,11,142],[223,516,143],[739,6,137],[745,5,131],[750,2,116],[752,7,106]]},"shamamah":{"w":289,"cx":144.5,"bands":[[1,5,15],[6,3,23],[9,2,29],[11,2,34],[13,2,39],[15,2,45],[17,2,50],[19,3,58],[22,2,65],[24,2,73],[26,6,83],[32,11,91],[43,11,100],[54,13,110],[67,102,122],[169,13,110],[182,12,100],[194,11,90],[205,7,81],[212,6,73],[218,5,66],[223,4,60],[227,79,55],[306,2,64],[308,4,73],[312,11,81],[323,7,90],[330,13,104],[343,4,135],[347,412,143]]}};

  function texFor(spin) {
    var img = spin.querySelector('img');
    return img ? (img.currentSrc || img.src).replace('hoa-bottle-', 'hoa-bottle-3d-') : '';
  }
  var loaded = {};
  function preload(url, done) {
    if (loaded[url] === true) return done && done();
    if (!loaded[url]) {
      var im = new Image();
      loaded[url] = [];
      im.onload = function () { var q = loaded[url]; loaded[url] = true; q.forEach(function (f) { f(); }); };
      im.src = url;
    }
    if (done) loaded[url].push(done);
  }

  function build(spin) {
    if (spin.hoa3d) return;
    var d = DATA[spin.parentNode.getAttribute('data-bottle')], url = texFor(spin);
    if (!d || !url) return;
    spin.hoa3d = true;
    preload(url, function () {
      var obj = document.createElement('span');
      obj.className = 'hoa-pc__3d';
      obj.setAttribute('aria-hidden', 'true');
      obj.style.cssText = 'width:' + d.w + 'px;height:' + H + 'px;left:calc(50% - ' + d.cx + 'px);transform-origin:' + d.cx + 'px 0';
      var html = '';
      d.bands.forEach(function (b) {
        var y0 = b[0], h = b[1], R = b[2], n = h < 8 ? 16 : 28;
        var w = 2 * R * Math.tan(Math.PI / n);              // strip width for a ring of radius R
        for (var k = 0; k < n; k++) {
          html += '<i style="left:' + (d.cx - w / 2 - 1.5).toFixed(2) + 'px;top:' + y0 + 'px;width:' + (w + 3).toFixed(2) + 'px;height:' + (h + 0.5) + 'px;' +
            'background-size:' + (n * w).toFixed(2) + 'px ' + H + 'px;background-position:' + (-(k - 0.5 + n / 2) * w + 1.5).toFixed(2) + 'px ' + -y0 + 'px;' +
            'transform:rotateY(' + (360 * k / n).toFixed(3) + 'deg) translateZ(' + R + 'px)"></i>';
        }
      });
      obj.innerHTML = html;
      obj.style.setProperty('--tex', 'url("' + url + '")');
      // Scale it BEFORE it enters the page: set afterwards, the change was animated, so the first
      // hover showed the bottle shrinking from full texture size instead of turning.
      if (spin.clientHeight) obj.style.setProperty('--s', (spin.clientHeight / H).toFixed(4));
      // Enter at rest (front, no transition). If the card is already hovered, dropping the class a
      // frame later lets that same hover play the full turn.
      obj.classList.add('is-arming');
      spin.appendChild(obj);
      spin.style.setProperty('--mask', 'url("' + (spin.querySelector('img').currentSrc || spin.querySelector('img').src) + '")');
      spin.classList.add('is-3d');
      void obj.offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(function () { obj.classList.remove('is-arming'); }); });
    });
  }
  function size(spin) {
    var obj = spin.querySelector('.hoa-pc__3d');
    if (obj && spin.clientHeight) obj.style.setProperty('--s', (spin.clientHeight / H).toFixed(4));
  }

  function onEnter(e) {
    var card = e.target.closest && e.target.closest('.hoa-pc');
    var spin = card && card.querySelector('.hoa-pc__spin');
    if (!spin) return;
    if (spin.hoa3d) size(spin); else build(spin);
  }
  document.addEventListener('pointerover', onEnter, { passive: true });
  document.addEventListener('focusin', onEnter);

  var canHover = window.matchMedia('(hover: hover)');
  // build (or on touch just preload) the 3D bottle for cards coming into view (JS-painted cards arrive later, so re-scan on DOM changes)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (canHover.matches) build(en.target);
        else { var url = texFor(en.target); if (url) preload(url); }
      });
    }, { rootMargin: '300px 0px' });
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var scan = function () {
      document.querySelectorAll('.hoa-pc__spin').forEach(function (s) {
        if (seen && seen.has(s)) return;
        if (seen) seen.add(s);
        io.observe(s);
      });
    };
    scan();
    var t = 0;   // debounced: the message strip's typewriter mutates the DOM constantly
    if ('MutationObserver' in window) new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 400); }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
