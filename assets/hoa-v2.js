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
