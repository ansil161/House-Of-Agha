/* House of Agha — Home V2 motion + small interactions (sections/hoa-v2-*.liquid).
   Restrained by design: one hero entrance, slow layered parallax, quiet reveals.
   GSAP + ScrollTrigger (loaded by the layout) drive the hero; reveals use IntersectionObserver.
   Lenis smooth scrolling is started by hoa-home.js on the homepage templates. */
(function () {
  if (window.__hoaV2) return;
  window.__hoaV2 = true;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var hasGsap = function () { return typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'; };

  // Same contract as hoa-home.js: start entrances when the Drop preloader begins to open.
  function afterPreloader(cb) {
    if (!root.classList.contains('pl-on') || window.hoaPreloaderRevealed) { cb(); return; }
    var done = false;
    var go = function () { if (done) return; done = true; document.removeEventListener('pl:reveal', go); cb(); };
    document.addEventListener('pl:reveal', go);
    setTimeout(go, 8000);
  }

  /* ---------------------------------------------------------- navigation */
  function initNav() {
    var header = $('[data-hoa-header]');
    if (!header) return;
    var update = function () { header.classList.toggle('v2-solid', window.scrollY > 24); };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------------------------------------------------------------- hero */
  function initHero() {
    var hero = $('[data-v2-hero]');
    if (!hero) return;
    var names = $$('[data-v2-slide-name]', hero);
    var bottles = $$('[data-v2-slide-bottle]', hero);
    var infos = $$('[data-v2-slide-info]', hero);
    var picks = $$('[data-v2-slide-pick]', hero);
    var shelf = $('[data-v2-hero-shelf]', hero);
    var n = picks.length;
    var cur = 0;
    var playing = false;
    var holds = { hover: false, focus: false, away: false };
    hero.style.setProperty('--v2-hero-dur', (parseFloat(hero.getAttribute('data-interval')) || 5) + 's');

    /* ---- switching: old element leaves, new one enters; parked ones carry neither class ---- */
    function swap(list, i) {
      list.forEach(function (el) { el.classList.remove('is-leaving'); });
      if (list[cur]) { list[cur].classList.remove('is-active'); list[cur].classList.add('is-leaving'); }
      if (list[i]) list[i].classList.add('is-active');
    }
    function go(i) {
      i = (i + n) % n;
      if (i === cur) return;
      swap(names, i); swap(bottles, i); swap(infos, i);
      picks[cur].classList.remove('is-active'); picks[cur].setAttribute('aria-pressed', 'false');
      picks[i].classList.add('is-active'); picks[i].setAttribute('aria-pressed', 'true');
      infos.forEach(function (el, k) { el.setAttribute('tabindex', k === i ? '0' : '-1'); el.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      hero.style.setProperty('--v2-tint', picks[i].getAttribute('data-tint'));
      cur = i;
    }
    picks.forEach(function (p, k) { p.addEventListener('click', function () { go(k); }); });

    /* ---- autoplay: the active tick's fill animation is the clock, so bar and slide never drift ---- */
    function syncPause() { hero.classList.toggle('is-paused', holds.hover || holds.focus || holds.away); }
    if (shelf) shelf.addEventListener('animationend', function (e) {
      if (playing && e.animationName === 'v2-hero-tick') go(cur + 1);
    });
    [shelf, $('.v2-hero__info', hero)].forEach(function (el) {
      if (!el) return;
      el.addEventListener('mouseenter', function () { holds.hover = true; syncPause(); });
      el.addEventListener('mouseleave', function () { holds.hover = false; syncPause(); });
    });
    hero.addEventListener('focusin', function () { holds.focus = true; syncPause(); });
    hero.addEventListener('focusout', function () { holds.focus = false; syncPause(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { holds.away = !es[0].isIntersecting; syncPause(); }, { threshold: 0.25 }).observe(hero);
    }

    /* ---- each name is sized to fill the stage width (long names smaller, short ones huge) ---- */
    var namesBox = $('.v2-hero__names', hero);
    function fit() {
      var w = namesBox.clientWidth * 0.94;
      var h = namesBox.clientHeight;
      names.forEach(function (el) {
        el.style.setProperty('--fit', '100px');
        var tw = 0;
        $$('.v2-hero__ch', el).forEach(function (c) { tw += c.offsetWidth; });
        var px = Math.min(100 * w / Math.max(tw, 1), h * 0.46, 420);
        el.style.setProperty('--fit', px.toFixed(1) + 'px');
      });
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fit, 150); });

    /* ---- pointer depth: name drifts against the pointer, bottle with it (desktop pointers only) ---- */
    var tilts = $$('[data-v2-hero-tilt]', hero);
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
      var tick = function () {
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
        tilts.forEach(function (el) {
          var k = parseFloat(el.getAttribute('data-v2-hero-tilt')) * 16;
          el.style.translate = (cx * k).toFixed(2) + 'px ' + (cy * k * 0.5).toFixed(2) + 'px';
        });
        raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(tick) : 0;
      };
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width * 2 - 1;
        ty = (e.clientY - r.top) / r.height * 2 - 1;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
    }

    /* ---- entrance after the preloader, then autoplay + scroll hand-off ---- */
    afterPreloader(function () {
      hero.classList.add('is-in');
      if (reduce || n < 2) return;
      setTimeout(function () { playing = true; hero.classList.add('is-playing'); }, 1400);
      if (!hasGsap()) return;
      var gsap = window.gsap;
      gsap.matchMedia().add('(min-width: 768px)', function () {
        var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
        tl.to('[data-v2-hero-names]', { yPercent: -16, ease: 'none' }, 0)
          .to('[data-v2-hero-bottles]', { y: -50, ease: 'none' }, 0);
      });
    });
  }

  /* ------------------------------------------- reveals (IntersectionObserver) */
  function splitWords(el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'v2-w';
            var inner = document.createElement('span'); inner.textContent = part;
            inner.style.setProperty('--v2-i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }

  function initReveals() {
    if (reduce || !('IntersectionObserver' in window)) return;
    root.classList.add('v2-motion');
    $$('[data-v2-lines]').forEach(splitWords);
    $$('[data-v2-stagger]').forEach(function (g) { $$(':scope > *', g).forEach(function (c, k) { c.style.setProperty('--v2-i', k); }); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    $$('[data-v2-reveal], [data-v2-lines], [data-v2-stagger]').forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------- slow image drift (a handful only) */
  function initDrift() {
    if (reduce || !hasGsap()) return;
    var gsap = window.gsap;
    gsap.matchMedia().add('(min-width: 768px)', function () {
      $$('[data-v2-drift]').forEach(function (el) {
        gsap.fromTo(el, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      });
    });
  }

  /* ------------------------------------------------------ 03 signature index */
  function initSignature() {
    $$('[data-v2-sig]').forEach(function (sec) {
      var items = $$('[data-v2-sig-item]', sec);
      var set = function (it) { items.forEach(function (x) { x.classList.toggle('is-active', x === it); }); };
      items.forEach(function (it) {
        var row = $('.v2-sig__row', it);
        row.addEventListener('mouseenter', function () { set(it); });
        row.addEventListener('focus', function () { set(it); });
      });
    });
  }

  /* ---------------------------------------------------- 04 discover your scent */
  function initFinder() {
    $$('[data-v2-find]').forEach(function (sec) {
      var picks = $$('[data-v2-find-pick]', sec);
      var results = $$('[data-v2-find-result]', sec);
      var hint = $('[data-v2-find-hint]', sec);
      picks.forEach(function (a) {
        a.setAttribute('role', 'button');
        a.setAttribute('aria-pressed', 'false');
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var k = a.getAttribute('data-v2-find-pick');
          sec.classList.add('has-pick');
          picks.forEach(function (p) { var on = p === a; p.classList.toggle('is-active', on); p.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          if (hint) hint.hidden = true;
          results.forEach(function (r) {
            var on = r.getAttribute('data-v2-find-result') === k;
            r.hidden = !on;
            r.classList.remove('is-in');
            if (on) { void r.offsetWidth; r.classList.add('is-in'); }
          });
        });
      });
    });
  }

  /* -------------------------------------------------------- 08 customer stories */
  function initVoices() {
    $$('[data-v2-voices]').forEach(function (sec) {
      var quotes = $$('[data-v2-voice]', sec);
      var btns = $$('[data-v2-voice-btn]', sec);
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-v2-voice-btn');
          quotes.forEach(function (q) { q.classList.toggle('is-active', q.getAttribute('data-v2-voice') === k); });
          btns.forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        });
      });
    });
  }

  /* --------------------------------------------- 02 the turn (3D bottle story) */
  // Ring data per bottle (bands: [top, height, radius] in px of the 760px-tall label texture
  // assets/hoa-bottle-3d-NAME.webp), from the old product-card 3D turn (assets/hoa-card-3d.js, git 0e61d6d).
  var TEX_H = 760;
  var BOTTLES = {"oud-fury":{"w":289,"cx":144.5,"bands":[[1,3,74],[4,3,87],[7,167,91],[174,5,84],[179,4,80],[183,2,76],[185,3,72],[188,13,57],[201,7,98],[208,4,121],[212,3,135],[215,521,143],[736,7,136],[743,2,129],[745,4,123],[749,10,109]]},"agha-blue":{"w":285,"cx":142.5,"bands":[[1,5,74],[6,2,81],[8,2,85],[10,164,90],[174,8,84],[182,5,80],[187,4,76],[191,4,72],[195,22,124],[217,2,132],[219,529,141],[748,5,130],[753,3,113],[756,3,76]]},"dark-paradise":{"w":291,"cx":145.5,"bands":[[1,3,77],[4,3,88],[7,171,92],[178,5,86],[183,3,82],[186,2,78],[188,4,74],[192,5,51],[197,10,100],[207,2,121],[209,4,137],[213,531,144],[744,3,132],[747,2,125],[749,2,117],[751,8,109]]},"maha":{"w":291,"cx":145.5,"bands":[[1,5,84],[6,161,92],[167,7,86],[174,6,82],[180,3,78],[183,2,74],[185,3,71],[188,20,86],[208,3,104],[211,2,114],[213,2,125],[215,2,136],[217,533,144],[750,9,135]]},"sea-smoke":{"w":290,"cx":145,"bands":[[1,5,82.5],[6,168,89.5],[174,6,83.5],[180,4,79.5],[184,4,75.5],[188,2,71.5],[190,19,93.5],[209,4,122.5],[213,2,133.5],[215,8,141.5],[223,518,143.5],[741,6,136.5],[747,3,129.5],[750,2,121.5],[752,7,110.5]]},"tobacco-enigma":{"w":289,"cx":144.5,"bands":[[1,3,76],[4,6,87],[10,157,88],[167,8,84],[175,5,80],[180,5,76],[185,3,72],[188,19,101],[207,3,120],[210,2,134],[212,11,142],[223,516,143],[739,6,137],[745,5,131],[750,2,116],[752,7,106]]},"shamamah":{"w":289,"cx":144.5,"bands":[[1,5,15],[6,3,23],[9,2,29],[11,2,34],[13,2,39],[15,2,45],[17,2,50],[19,3,58],[22,2,65],[24,2,73],[26,6,83],[32,11,91],[43,11,100],[54,13,110],[67,102,122],[169,13,110],[182,12,100],[194,11,90],[205,7,81],[212,6,73],[218,5,66],[223,4,60],[227,79,55],[306,2,64],[308,4,73],[312,11,81],[323,7,90],[330,13,104],[343,4,135],[347,412,143]]}};

  // Rebuilds the flat cut-out as a turnable object: stacked rings, each a circle of thin vertical
  // strips textured with the label photo unrolled round the ring. Straight on it matches the photo.
  function buildBottle(wrap, onReady) {
    var d = BOTTLES[wrap.getAttribute('data-bottle')], url = wrap.getAttribute('data-tex');
    if (!d || !url) return;
    // CSS custom properties resolve relative url()s against the stylesheet that uses them, so pass absolute ones
    url = new URL(url, location.href).href;
    var flat = wrap.querySelector('img');
    if (flat) wrap.style.setProperty('--mask', 'url("' + new URL(flat.getAttribute('src'), location.href).href + '")');
    var im = new Image();
    im.onload = function () {
      var obj = document.createElement('span');
      obj.className = 'v2-turn__3d';
      obj.setAttribute('aria-hidden', 'true');
      obj.style.cssText = 'width:' + d.w + 'px;height:' + TEX_H + 'px;left:calc(50% - ' + d.cx + 'px);transform-origin:' + d.cx + 'px 0';
      var html = '';
      d.bands.forEach(function (b) {
        var y0 = b[0], h = b[1], R = b[2], n = h < 8 ? 16 : 28;
        var w = 2 * R * Math.tan(Math.PI / n);
        for (var k = 0; k < n; k++) {
          html += '<i style="left:' + (d.cx - w / 2 - 1.5).toFixed(2) + 'px;top:' + y0 + 'px;width:' + (w + 3).toFixed(2) + 'px;height:' + (h + 0.5) + 'px;' +
            'background-size:' + (n * w).toFixed(2) + 'px ' + TEX_H + 'px;background-position:' + (-(k - 0.5 + n / 2) * w + 1.5).toFixed(2) + 'px ' + -y0 + 'px;' +
            'transform:rotateY(' + (360 * k / n).toFixed(3) + 'deg) translateZ(' + R + 'px)"></i>';
        }
      });
      obj.innerHTML = html;
      obj.style.setProperty('--tex', 'url("' + url + '")');
      wrap.appendChild(obj);
      wrap.classList.add('is-3d');
      onReady(obj);
    };
    im.src = url;
  }

  function initTurn() {
    $$('[data-v2-turn]').forEach(function (sec) {
      if (reduce || !hasGsap()) return;
      var gsap = window.gsap;
      var wrap = $('[data-v2-turn-bottle]', sec);
      var flat = $('.v2-turn__flat', sec);
      var shade = $('.v2-turn__shade', sec);
      var cards = $$('[data-v2-turn-card]', sec);
      var n = cards.length;
      sec.classList.add('is-scrub');

      var obj = null, s = 1;
      var rot = { ry: 0 };
      var size = function () { s = wrap.clientHeight / TEX_H; apply(); };
      var apply = function () {
        if (obj) obj.style.transform = 'scale(' + s.toFixed(4) + ') rotateY(' + rot.ry.toFixed(2) + 'deg)';
        else flat.style.transform = 'rotateY(' + rot.ry.toFixed(2) + 'deg)';
        // the fixed light shows while turning and fades out as the label comes back to the front
        var m = ((rot.ry % 360) + 360) % 360, off = Math.min(m, 360 - m) / 180;
        shade.style.opacity = obj ? Math.min(1, off * 5) * 0.85 : 0;
      };
      buildBottle(wrap, function (o) { obj = o; size(); });
      window.addEventListener('resize', size);

      // Scenes: the number stands huge behind the bottle. Its digits rise as hairline outlines, a
      // photograph floods up inside them, the words come in along the bottom; then it all leaves upward.
      var scenes = cards.map(function (card) {
        return {
          card: card,
          lines: $$('.v2-big__layer--line [data-v2-d]', card),
          fills: $$('.v2-big__layer--fill [data-v2-d]', card),
          fill: $('[data-v2-big-fill]', card),
          rule: $('[data-v2-rule]', card),
          subs: $$('[data-v2-turn-sub]', card)
        };
      });

      // Entry (as the hero leaves): the bottle comes down into the stage already turning.
      gsap.fromTo(rot, { ry: -140 }, { ry: 0, ease: 'none', onUpdate: apply,
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: 0.6 } });
      gsap.fromTo(wrap, { yPercent: -40, scale: 0.86 }, { yPercent: 2, scale: 1, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: 0.6 } });

      // Story (while the stage is held): one full turn of the bottle per scene.
      gsap.matchMedia().add({ phone: '(max-width: 860px)', wide: '(min-width: 861px)' }, function (ctx) {
        var phone = ctx.conditions.phone;
        var tl = gsap.timeline({ defaults: { ease: 'none' },
          scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
        var head = $('[data-v2-turn-head]', sec);
        if (head) tl.fromTo(head, { yPercent: 0, autoAlpha: 1 }, { yPercent: -70, autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, 0);

        scenes.forEach(function (sc, k) {
          var at = k + 0.3;
          tl.fromTo(rot, { ry: 360 * k }, { ry: 360 * (k + 1), duration: 1, ease: 'power1.inOut', onUpdate: apply }, k);
          tl.set(sc.card, { autoAlpha: 1 }, at - 0.01);

          // 1. the outlines rise out of their baselines, one digit after another
          tl.fromTo(sc.lines, { yPercent: 105 }, { yPercent: 0, duration: 0.3, stagger: 0.06, ease: 'power3.out' }, at);
          tl.fromTo(sc.fills, { yPercent: 105 }, { yPercent: 0, duration: 0.3, stagger: 0.06, ease: 'power3.out' }, at);
          // 2. the photograph floods up inside them, and keeps drifting while the scene is held
          if (sc.fill) tl.fromTo(sc.fill, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.36, ease: 'power2.inOut' }, at + 0.2);
          tl.fromTo(sc.fills, { backgroundPositionY: '78%' }, { backgroundPositionY: '30%', duration: 1 }, at);
          // 3. the hairline draws across, the words rise above it
          if (sc.rule) tl.fromTo(sc.rule, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, at + 0.14);
          tl.fromTo(sc.subs, { yPercent: 110 }, { yPercent: 0, duration: 0.28, stagger: 0.05, ease: 'power3.out' }, at + 0.3);

          // out: everything leaves upward, gone before the next number rises
          if (k < n - 1) {
            var out = k + 1.04;
            tl.to(sc.lines.concat(sc.fills), { yPercent: -105, duration: 0.24, stagger: 0.03, ease: 'power2.in' }, out);
            tl.to(sc.subs, { yPercent: -110, duration: 0.2, ease: 'power2.in' }, out);
            if (sc.rule) tl.to(sc.rule, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.24, ease: 'power2.in' }, out);
            tl.set(sc.card, { autoAlpha: 0 }, out + 0.27);
          }
        });
        tl.to({}, { duration: 0.2 }, n + 0.3);
        return function () { gsap.set(cards, { clearProps: 'all' }); };
      });
    });
  }

  /* ---------------------------------------- 01 hero, "The Object" (2026-10-12) */
  // sections/hoa-v2-object-hero.liquid. ONE bottle: the CSS 3D bottle (buildBottle) is built first, so the
  // bottle that rises in is the same element the visitor then turns; it is never swapped.
  // The 3D logo (hoa-crest.js, profile v2) is told when to move through window.AGHA_HERO + 'agha:hero'.
  function initObjectHero() {
    var hero = $('[data-v2-ohero]');
    if (!hero) return;
    var wrap = $('[data-v2-ohero-bottle]', hero);
    var flat = $('.v2-turn__flat', wrap);
    var shade = $('.v2-turn__shade', wrap);
    var hint = $('[data-v2-ohero-hint]', hero);
    var HINT_KEY = 'agha-bottle-turned';
    var obj = null, s = 1;
    var ry = 0, target = 0, vel = 0;                 // degrees; vel in deg/s (the flick)
    var raf = 0, last = 0, drag = null;

    function apply() {
      var t = 'rotateY(' + ry.toFixed(2) + 'deg)';
      if (obj) obj.style.transform = 'scale(' + s.toFixed(4) + ') ' + t;
      else flat.style.transform = t;
      // the fixed light shows while it is turned away and fades as the label comes back to the front
      var m = ((ry % 360) + 360) % 360, off = Math.min(m, 360 - m) / 180;
      shade.style.opacity = obj ? Math.min(1, off * 5) * 0.85 : 0;
    }
    function size() { s = wrap.clientHeight / TEX_H; apply(); }
    window.addEventListener('resize', size);

    // tells the logo its next move (it may load before or after this; it reads the stamps either way)
    function signal(k) {
      var h = window.AGHA_HERO = window.AGHA_HERO || {};
      if (!h[k]) h[k] = performance.now();
      try { document.dispatchEvent(new CustomEvent('agha:hero')); } catch (_) {}
    }
    function showAll() { hero.classList.add('is-live', 'is-in', 'is-ready'); signal('appear'); signal('home'); showHint(); }
    function showHint() {
      var done = false;
      try { done = localStorage.getItem(HINT_KEY) === '1'; } catch (_) {}
      if (hint && !done) hint.classList.add('is-shown');
    }

    var built = new Promise(function (res) {
      buildBottle(wrap, function (o) { obj = o; size(); res(); });
      setTimeout(res, 2500);                         // a slow texture: enter with the flat cut-out, it turns flat
    });
    var logoReady = new Promise(function (res) {
      if (window.__aghaLogoReady || !document.querySelector('[data-hoa-logo3d]')) { res(); return; }
      document.addEventListener('agha:logo-ready', res, { once: true });
      setTimeout(res, 2200);                         // no WebGL / slow CDN: the bottle does not wait for it
    });

    /* ---- the opening: logo -> bottle rises in -> logo to its place -> copy -> live ---- */
    afterPreloader(function () {
      if (reduce || !hasGsap()) { built.then(showAll); return; }
      var gsap = window.gsap;
      Promise.all([built, logoReady]).then(function () {
        signal('appear');                            // 1. the logo, alone, at the centre
        var turn = { v: -64 };
        gsap.set(wrap, { yPercent: 62, scale: 0.8, autoAlpha: 0 });
        hero.classList.add('is-live');
        var tl = gsap.timeline({ delay: 0.8 });
        // 2. the bottle comes up from below, turning to face you, and settles
        tl.to(wrap, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, 0)
          .to(wrap, { yPercent: 0, scale: 1, duration: 1.9, ease: 'expo.out' }, 0)
          .to(turn, { v: 0, duration: 2.1, ease: 'power3.out', onUpdate: function () { ry = target = turn.v; apply(); } }, 0)
          // 3. as it rises, the logo glides out of its way to rest beside the shoulder
          .call(function () { signal('home'); }, null, 0.25)
          // 4. the copy comes up
          .call(function () { hero.classList.add('is-in'); }, null, 1.2)
          // 5. live: the bottle can be turned
          .call(function () { hero.classList.add('is-ready'); showHint(); }, null, 2.1);

        tl.call(function () { hero.classList.add('is-settled'); }, null, 3.4);   // CSS reveal transitions done
      });
    });

    /* ---- Stage A: leaving the hero (scrubbed, not pinned) ----
       The copy rises, dissolves and blurs, headline first, buttons last; the bottle (with its logo spot)
       lifts out through the top faster than the page, turning a few degrees. fromTo + immediateRender
       false, so the opening's own pre-state is never overwritten before the visitor scrolls. */
    if (!reduce && hasGsap()) {
      var gsap = window.gsap;
      var lift = $('[data-v2-ohero-lift]', hero);
      var outs = [$('.v2-ohero__title', hero), $('.v2-ohero__line', hero), $('.v2-ohero__ctas', hero)];
      var exit = gsap.timeline({ defaults: { ease: 'none', immediateRender: false },
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
      // every tween starts at 0 (one that starts later would, scrolled back to the top, restore the
      // opening's hidden pre-state); the 0.08 stagger lives in each tween's ease instead
      outs.forEach(function (el, k) {
        var off = k * 0.08, dur = 0.76 + off, o = off / dur;
        if (el) exit.fromTo(el, { y: 0, autoAlpha: 1, filter: 'blur(0px)' }, { y: function () { return -0.18 * window.innerHeight; }, autoAlpha: 0, filter: 'blur(6px)', duration: dur,
          ease: function (p) { return p <= o ? 0 : (p - o) / (1 - o); } }, 0);
      });
      exit.fromTo($('.v2-ohero__caption', hero), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5 }, 0)
        .fromTo(lift, { y: 0, rotation: 0 }, { y: function () { return -1.2 * wrap.offsetHeight; }, rotation: -3, duration: 1, transformOrigin: '50% 60%' }, 0);
    }

    /* ---- turning: a sideways drag anywhere on the hero (not on its links) ---- */
    var DEG_PER_PX = 0.42;
    function loop(now) {
      raf = 0;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (!drag && !reduce) {                        // the flick carries on and dies away
        target += vel * dt;
        vel *= Math.exp(-3.4 * dt);
        if (Math.abs(vel) < 1.5) vel = 0;
      }
      ry += (target - ry) * (1 - Math.exp(-16 * dt));   // damped follow: refined, never jerky
      if (Math.abs(target - ry) < 0.02) ry = target;
      apply();
      if (drag || vel || ry !== target) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

    hero.addEventListener('pointerdown', function (e) {
      if (!hero.classList.contains('is-ready') || e.button > 0) return;
      if (e.target.closest('a, button, input, select, textarea, .hoa-logo3d')) return;
      drag = { id: e.pointerId, x: e.clientX, t: performance.now(), moved: false };
      vel = 0;
      if (e.pointerType === 'mouse') e.preventDefault();       // no text selection while turning
    });
    hero.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var now = performance.now(), dx = e.clientX - drag.x;
      if (!dx) return;
      if (!drag.moved) {
        drag.moved = true;
        hero.classList.add('is-turning');
        try { hero.setPointerCapture(e.pointerId); } catch (_) {}
        if (hint) hint.classList.remove('is-shown');
        try { localStorage.setItem(HINT_KEY, '1'); } catch (_) {}
      }
      target += dx * DEG_PER_PX;
      var dts = Math.max(8, now - drag.t) / 1000;
      vel = vel * 0.6 + (dx * DEG_PER_PX / dts) * 0.4;
      drag.x = e.clientX; drag.t = now;
      kick();
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (performance.now() - drag.t > 120) vel = 0;           // held still before letting go: no flick
      vel = Math.max(-540, Math.min(540, vel));
      drag = null;
      hero.classList.remove('is-turning');
      kick();
    }
    hero.addEventListener('pointerup', release);
    hero.addEventListener('pointercancel', release);           // a vertical swipe became a scroll
    hero.addEventListener('lostpointercapture', release);
  }

  /* ------------------------------- 02 story paragraph, Stage B (2026-10-12) */
  // sections/hoa-v2-story.liquid. Normal flow, never pinned: one scrubbed timeline takes the words, in
  // reading order, from faded + blurred to sharp, so the reveal front travels down with the scroll. The
  // pill photos are words in that sequence (they also grow a little). Rail labels sit beside the lines.
  function splitWords(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'v2-story__w';
            w.textContent = t;
            frag.appendChild(w);
            out.push(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          if (n.hasAttribute('data-v2-story-pill')) { n.classList.add('v2-story__w'); out.push(n); }
          else walk(n);
        }
      });
    })(el);
    return out;
  }
  function initStory() {
    $$('[data-v2-story]').forEach(function (sec) {
      var text = $('[data-v2-story-text]', sec);
      var rail = $('[data-v2-story-rail]', sec);
      var marks = $$('[data-v2-story-mark]', sec);
      if (!text) return;
      root.classList.add('v2-story-js');
      var words = splitWords(text);
      var STEP = 0.1, DUR = 0.6;

      // each label beside a line: spread over the paragraph's lines, top to bottom
      var markAt = [];
      function place() {
        if (!rail || !words.length) return;
        var lines = [];
        words.forEach(function (w, i) {
          var top = w.offsetTop;
          if (!lines.length || Math.abs(top - lines[lines.length - 1].top) > 4) lines.push({ top: top, i: i, h: w.offsetHeight });
        });
        var tr = text.getBoundingClientRect(), rr = rail.parentNode.getBoundingClientRect();
        rail.style.top = (tr.top - rr.top) + 'px';
        rail.style.bottom = 'auto';
        rail.style.height = tr.height + 'px';
        marks.forEach(function (m, k) {
          var L = lines[Math.round(k * (lines.length - 1) / Math.max(1, marks.length - 1))] || lines[0];
          m.style.top = (L.top + L.h / 2 - m.offsetHeight / 2) + 'px';
          markAt[k] = L.i;
        });
      }
      place();
      if (reduce || !hasGsap()) return;
      var gsap = window.gsap;

      var tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: text, start: 'top 85%', end: 'bottom 55%', scrub: 0.8, invalidateOnRefresh: true } });
      words.forEach(function (w, i) {
        var pill = w.hasAttribute('data-v2-story-pill');
        tl.fromTo(w, { opacity: 0.08, filter: 'blur(5px)', y: 10, scale: pill ? 0.7 : 1 },
          { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1, duration: DUR, ease: 'power2.out' }, i * STEP);
      });
      marks.forEach(function (m, k) {
        tl.fromTo(m, { opacity: 0, x: -8 }, { opacity: 0.35, x: 0, duration: DUR, ease: 'power2.out' }, (markAt[k] || 0) * STEP);
      });
      var t;
      window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(place, 150); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(); window.ScrollTrigger.refresh(); });
    });
  }

  /* ---------------------------------- 03 "Born in ice", Stage C (2026-10-12) */
  // sections/hoa-v2-place.liquid. C1 (as it scrolls in, not pinned): the photo card rises a little faster
  // than the section, its photo settles and warms up, the headline rises to the centre over it.
  // C2 (pinned, +160%): a short hold so the lock-up reads, then the headline splits apart and dissolves
  // while the card opens out to the full screen (clip-path), so nothing is re-laid out.
  function initPlace() {
    if (reduce || !hasGsap()) return;
    var gsap = window.gsap;
    $$('[data-v2-place]').forEach(function (sec) {
      var frame = $('[data-v2-place-frame]', sec);
      var img = $('[data-v2-place-img]', sec);
      var a = $('[data-v2-place-a]', sec), b = $('[data-v2-place-b]', sec);
      gsap.matchMedia().add({ phone: '(max-width: 767px)', wide: '(min-width: 768px)' }, function (ctx) {
        // the resting card as insets of the screen (%, as the CSS): 24vw x 62vh, phones 64vw x 56vh.
        // The clip is written from one number (open: 0 = card, 1 = full screen): the browser shortens
        // equal insets ("19% 38%"), which would scramble a plain string tween.
        var IY = ctx.conditions.phone ? 22 : 19, IX = ctx.conditions.phone ? 18 : 38;
        var clip = { open: 0 };
        var setClip = function () {
          var k = 1 - clip.open, y = (IY * k).toFixed(3) + '%', x = (IX * k).toFixed(3) + '%';
          frame.style.clipPath = 'inset(' + y + ' ' + x + ' ' + y + ' ' + x + ' round ' + (10 * k).toFixed(2) + 'px)';
        };
        var split = ctx.conditions.phone ? 0.2 : 0.22;          // x vw each word travels
        setClip();

        // C1: entering
        var c1 = gsap.timeline({ defaults: { ease: 'none' },
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: 0.8, invalidateOnRefresh: true } });
        c1.fromTo(frame, { yPercent: 50 }, { yPercent: 0 }, 0)          // 50% of the screen = 120% of the 62vh card's own rise
          .fromTo(img, { scale: 1.25, filter: 'saturate(0.7) brightness(1.08)' }, { scale: 1.1, filter: 'saturate(1) brightness(1)' }, 0)
          .fromTo([a, b], { y: function () { return 0.14 * window.innerHeight; } }, { y: 0 }, 0);

        // C2: held
        var c2 = gsap.timeline({ defaults: { ease: 'none' },
          scrollTrigger: { trigger: sec, start: 'top top', end: '+=160%', pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
        c2.to({}, { duration: 0.25 })                                    // the breath
          .to(a, { x: function () { return -split * window.innerWidth; }, duration: 0.75, ease: 'power1.inOut' }, 0.25)
          .to(b, { x: function () { return split * window.innerWidth; }, duration: 0.75, ease: 'power1.inOut' }, 0.25)
          .to([a, b], { opacity: 0.15, filter: 'blur(3px)', duration: 0.45, ease: 'power1.in' }, 0.55)
          .fromTo(clip, { open: 0 }, { open: 1, duration: 0.75, ease: 'power2.inOut', onUpdate: setClip }, 0.25)
          .to(img, { scale: 1, duration: 0.75, ease: 'power2.inOut' }, 0.25);
        return function () { gsap.set([frame, img, a, b], { clearProps: 'all' }); frame.style.clipPath = ''; };
      });
    });
    // late fonts/photos change heights: re-measure every trigger once
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); }, { once: true });
  }

  /* ------------------------------------------------- two worlds (diptych) */
  // Entrance, once, as the diptych arrives: the photos open softly (left, then right), then the copy
  // in reading order across both panels: labels, titles, mood lines, fragrances, and the link last.
  // Afterwards each photo drifts a few percent with the scroll. Phones and portrait tablets (stacked): each panel enters on its own.
  function initWorlds() {
    if (reduce || !hasGsap()) return;
    var gsap = window.gsap;
    $$('[data-v2-worlds]').forEach(function (sec) {
      var panels = $$('[data-v2-world]', sec);
      var enter = function (list, trigger) {
        var media = list.map(function (p) { return $('.v2-world__media', p); });
        var imgs = list.map(function (p) { return $('[data-v2-world-img]', p); });
        var rows = [];   // step k of every panel enters together: rows[k] = [panel0 step k, panel1 step k]
        list.forEach(function (p) {
          $$('[data-v2-world-step]', p).forEach(function (el, k) { (rows[k] = rows[k] || []).push(el); });
        });
        var steps = rows.reduce(function (a, r) { return a.concat(r); }, []);
        gsap.set(media, { clipPath: 'inset(0% 0% 100% 0%)' });
        gsap.set(imgs, { scale: 1.14 });
        gsap.set(steps, { autoAlpha: 0, y: 18 });
        var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
        tl.to(media, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power3.inOut', stagger: 0.18, clearProps: 'clipPath' }, 0)
          .to(imgs, { scale: 1, duration: 2.4, ease: 'power3.out', stagger: 0.18 }, 0.1);
        rows.forEach(function (r, k) {
          tl.to(r, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 0.95 + k * 0.16);
        });
        ScrollTrigger.create({ trigger: trigger, start: 'top 72%', once: true, onEnter: function () { tl.play(); } });
        return imgs;
      };
      var drift = function (imgs) {
        imgs.forEach(function (img) {
          gsap.fromTo(img, { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
        });
      };
      var ScrollTrigger = window.ScrollTrigger;
      var mm = gsap.matchMedia();
      mm.add('(min-width: 768px) and (orientation: landscape), (min-width: 1025px)', function () { drift(enter(panels, sec)); });
      mm.add('(max-width: 767px), (max-width: 1024px) and (orientation: portrait)', function () { panels.forEach(function (p) { enter([p], p); }); });
    });
  }

  function init() {
    initNav();
    initHero();
    initObjectHero();
    initStory();
    initPlace();
    initTurn();
    initWorlds();
    initReveals();
    initDrift();
    initSignature();
    initFinder();
    initVoices();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
