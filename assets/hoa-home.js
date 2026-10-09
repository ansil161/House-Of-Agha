/* ==========================================================================
   HOUSE OF AGHA — HOMEPAGE MOTION
   One controller for the homepage sections (sections/hoa-*.liquid).

   Hierarchy of motion
     Hero ............ strongest: word rise, slow crossfading campaign, drift on scroll
     Editorial ....... controlled: word-by-word statement, floating details
     Product ......... subtle: coverflow carousel, staggered reveals, hover image swap, tab filtering
     Content ......... restrained: fade-up once

   Smooth scrolling uses Lenis (desktop pointers only) wired into ScrollTrigger.
   Everything degrades: without GSAP the page is a static, fully readable layout;
   with prefers-reduced-motion there is no smoothing, no parallax and no autoplay.
   Theme Editor safe: rebuilt on shopify:section:load / unload.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = function () { return typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'; };

  var ctx = null;
  var lenis = null;
  var heroTimer = null;
  var cleanups = [];

  root.classList.add('hoa-js');

  /* ------------------------------------------------------------------ */
  /* Smooth scroll                                                       */
  /* ------------------------------------------------------------------ */
  function initLenis() {
    if (lenis || reduceMotion || !finePointer || typeof window.Lenis === 'undefined' || !hasGsap()) return;
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    window.hoaLenis = lenis; // exposed for other modules and debugging (e.g. hoaLenis.scrollTo(y, { immediate: true }))
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Pause smoothing whenever the theme locks the page (cart drawer, menu, modals).
    var sync = function () {
      var locked = document.body.style.overflow === 'hidden' || root.classList.contains('hoa-menu-open') || root.classList.contains('pl-on');
      if (locked) lenis.stop(); else lenis.start();
    };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    sync(); // the preloader may still be up when Lenis starts

    // In-page anchors glide instead of jumping.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a) return;
      var url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      var target = document.querySelector(url.hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      history.replaceState(null, '', url.hash);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Header: transparent over the hero, light over dark sections         */
  /* ------------------------------------------------------------------ */
  function initHeader() {
    var header = document.querySelector('[data-hoa-header]');
    if (!header) return;
    var hero = document.querySelector('[data-hoa-hero]');
    var darks = Array.prototype.slice.call(document.querySelectorAll('[data-header-theme="dark"]'));
    var h = function () { return header.offsetHeight || 72; };

    var update = function () {
      var y = h() / 2;
      var overHero = hero && hero.getBoundingClientRect().bottom > y;
      header.classList.toggle('is-transparent', !!overHero && !root.classList.contains('hoa-menu-open'));
      var overDark = darks.some(function (d) {
        var r = d.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      header.classList.toggle('is-dark', overDark);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    cleanups.push(function () {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      header.classList.remove('is-transparent', 'is-dark');
    });
  }

  /* ------------------------------------------------------------------ */
  /* 01 Hero                                                             */
  /* ------------------------------------------------------------------ */
  // Runs cb as soon as the Drop preloader (snippets/preloader.liquid) starts opening onto the page,
  // so entrances are seen rather than played behind the overlay. Immediate when there is no preloader.
  function afterPreloader(cb) {
    if (!root.classList.contains('pl-on') || window.hoaPreloaderRevealed) { cb(); return; }
    var done = false;
    var go = function () {
      if (done) return; done = true;
      document.removeEventListener('pl:reveal', go); clearTimeout(t); cb();
    };
    document.addEventListener('pl:reveal', go);
    var t = setTimeout(go, 10000); // never leave the hero parked if the preloader stalls
    cleanups.push(function () { document.removeEventListener('pl:reveal', go); clearTimeout(t); });
  }

  function initHero() {
    var hero = document.querySelector('[data-hoa-hero]');
    if (!hero) return;
    var slides = hero.querySelectorAll('[data-hoa-slide]');
    var dots = hero.querySelectorAll('[data-hoa-dot]');
    var interval = parseInt(hero.dataset.interval, 10) || 7000;
    var current = 0;
    var visible = true;
    // Static hero (section setting, on by default): first slide only, no timer, no entrance,
    // no scroll drift. The scroll-driven film below it (sections/hoa-sequence.liquid) carries the motion.
    if (hero.hasAttribute('data-hoa-hero-static')) {
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === 0); });
      return;
    }

    function show(i) {
      if (!slides.length) return;
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === current); });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === current);
        d.classList.toggle('is-done', k < current);
        var bar = d.querySelector('i');
        if (!bar) return;
        bar.style.transition = 'none';
        bar.style.transform = k < current ? 'scaleX(1)' : 'scaleX(0)';
        if (k === current && !reduceMotion) {
          void bar.offsetWidth;
          bar.style.transition = 'transform ' + interval + 'ms linear';
          bar.style.transform = 'scaleX(1)';
        }
      });
    }
    // While the bottle journey runs, the first slide's bottle is the one that travels:
    // never auto-advance to another fragrance's bottle (see initHeroBottleJourney).
    var locked = heroLiftActive();
    function schedule() {
      clearTimeout(heroTimer);
      if (reduceMotion || locked || slides.length < 2 || !visible || document.hidden) return;
      heroTimer = setTimeout(function () { show(current + 1); schedule(); }, interval);
    }
    dots.forEach(function (d) {
      d.addEventListener('click', function () { show(parseInt(d.dataset.hoaDot, 10)); schedule(); });
    });
    var onVis = function () { schedule(); };
    document.addEventListener('visibilitychange', onVis);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; schedule(); }, { threshold: 0.1 });
      io.observe(hero);
      cleanups.push(function () { io.disconnect(); });
    }
    cleanups.push(function () { clearTimeout(heroTimer); document.removeEventListener('visibilitychange', onVis); });
    show(0);
    schedule();

    if (!hasGsap() || reduceMotion) return;

    // Entrance: words rise out of their masks, supporting copy follows.
    var words = hero.querySelectorAll('[data-hoa-hero-word]');
    var fades = hero.querySelectorAll('[data-hoa-hero-fade]');
    // Built paused (from-states applied now, so nothing flashes) and played as the preloader opens.
    var intro = gsap.timeline({ defaults: { ease: 'expo.out' }, paused: true })
      .from(hero.querySelector('[data-hoa-hero-media]'), { scale: 1.12, duration: 2.6, ease: 'power3.out' }, 0)
      .from(words, { yPercent: 110, duration: 1.6, stagger: 0.12 }, 0.25)
      .from(fades, { autoAlpha: 0, y: 18, duration: 1.2, stagger: 0.08 }, 0.8);
    afterPreloader(function () { intro.play(); });

    // Scroll: the frame drifts back and dims as the House takes over.
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to(hero.querySelector('[data-hoa-hero-media]'), { yPercent: 18, ease: 'none' }, 0)
      .to(hero.querySelector('.hoa-hero__content'), { yPercent: -12, autoAlpha: 0.2, ease: 'none' }, 0);
  }

  /* ------------------------------------------------------------------ */
  /* Parallax helpers: [data-hoa-speed] on desktop, [data-hoa-parallax]  */
  /* ------------------------------------------------------------------ */
  function initParallax(mm) {
    mm.add('(min-width: 961px) and (prefers-reduced-motion: no-preference)', function () {
      gsap.utils.toArray('[data-hoa-speed]').forEach(function (el) {
        var speed = parseFloat(el.dataset.hoaSpeed) || 0;
        var sec = el.closest('section') || el;
        gsap.fromTo(el, { yPercent: -speed * 100 }, {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
      gsap.utils.toArray('[data-hoa-parallax]').forEach(function (tile) {
        var img = tile.querySelector('img');
        if (!img) return;
        gsap.fromTo(img, { yPercent: -6 }, {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 03 Signature fragrances: full-width showroom carousel               */
  /* ------------------------------------------------------------------ */
  function initFragrances() {
    var sec = document.querySelector('[data-hoa-cf]');
    if (!sec) return;
    var track = sec.querySelector('[data-hoa-cf-track]');
    var stage = sec.querySelector('[data-hoa-cf-stage]');
    var cards = Array.prototype.slice.call(sec.querySelectorAll('[data-hoa-cf-card]'));
    var infos = Array.prototype.slice.call(sec.querySelectorAll('[data-hoa-cf-info]'));
    var prev = sec.querySelector('[data-hoa-cf-prev]');
    var next = sec.querySelector('[data-hoa-cf-next]');
    var n = cards.length;
    if (!n || !track) return;
    var active = 0;
    var animated = hasGsap() && !reduceMotion;
    var SIDE = 0.72;          // scale of the neighbouring bottles
    var DURATION = 0.9;
    var EASE = 'power3.inOut';
    var step = 0;

    // Shortest signed distance from the active bottle, so the carousel loops.
    function offset(k, a) {
      var o = ((k - a) % n + n) % n;
      return o > n / 2 ? o - n : o;
    }

    // Distance between bottle centres: wide on desktop, tight enough on a phone
    // that the neighbours stay partly in view.
    function measure() {
      var w = stage.clientWidth;
      var cw = cards[0].offsetWidth;
      step = w < 700 ? cw * 0.84 : Math.max(w * 0.3, cw * 0.92);
    }

    function pose(o) {
      var c = Math.max(-2, Math.min(2, o));
      var a = Math.abs(c);
      return { x: c * step, scale: a === 0 ? 1 : SIDE, autoAlpha: a <= 1 ? 1 : 0, zIndex: 10 - a };
    }

    function place(el, p) {
      if (hasGsap()) {
        gsap.set(el, { xPercent: -50, x: p.x, scale: p.scale, autoAlpha: p.autoAlpha, zIndex: p.zIndex });
      } else {
        el.style.transform = 'translateX(calc(-50% + ' + p.x + 'px)) scale(' + p.scale + ')';
        el.style.opacity = p.autoAlpha;
        el.style.visibility = p.autoAlpha ? 'visible' : 'hidden';
        el.style.zIndex = p.zIndex;
      }
    }

    function flags() {
      cards.forEach(function (c, k) {
        var on = k === active;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-hidden', on ? 'false' : 'true');
        c.tabIndex = on ? 0 : -1;
      });
    }

    function showInfo(from, to) {
      infos.forEach(function (el, k) {
        var btn = el.querySelector('a');
        if (btn) btn.tabIndex = k === to ? 0 : -1;
      });
      gsap_kill(infos);
      if (!animated || from === to) {
        infos.forEach(function (el, k) { el.classList.toggle('is-active', k === to); });
        return;
      }
      infos.forEach(function (el, k) { if (k !== from && k !== to) el.classList.remove('is-active'); });
      var out = infos[from], inn = infos[to];
      out.classList.add('is-active');
      inn.classList.add('is-active');
      gsap.to(out, { autoAlpha: 0, y: -8, duration: 0.3, ease: 'power2.in',
        onComplete: function () { out.classList.remove('is-active'); gsap.set(out, { clearProps: 'opacity,visibility,transform' }); } });
      gsap.fromTo(inn, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, delay: 0.35, ease: 'power3.out',
        onComplete: function () { gsap.set(inn, { clearProps: 'opacity,visibility,transform' }); } });
    }
    function gsap_kill(list) {
      if (!hasGsap()) return;
      list.forEach(function (el) { gsap.killTweensOf(el); gsap.set(el, { clearProps: 'opacity,visibility,transform' }); });
    }

    function go(delta) {
      var from = active;
      var to = ((active + delta) % n + n) % n;
      if (to === from) return;
      active = to;
      flags();
      cards.forEach(function (c, k) {
        var target = pose(offset(k, active));
        // A bottle wrapping round the far side is repositioned unseen; the rest travel.
        var wraps = Math.abs(offset(k, active) - offset(k, from)) > 1;
        if (!animated || wraps) { place(c, target); return; }
        gsap.to(c, { x: target.x, scale: target.scale, autoAlpha: target.autoAlpha, zIndex: target.zIndex,
          duration: DURATION, ease: EASE, overwrite: 'auto' });
      });
      showInfo(from, to);
    }

    function layout() {
      measure();
      cards.forEach(function (c, k) { place(c, pose(offset(k, active))); });
    }

    var onPrev = function () { go(-1); };
    var onNext = function () { go(1); };
    if (prev) prev.addEventListener('click', onPrev);
    if (next) next.addEventListener('click', onNext);

    // A click on a side bottle brings it to the centre instead of following its link.
    var suppressClick = false;
    var onCardClick = function (e) {
      var k = cards.indexOf(e.currentTarget);
      if (suppressClick || k !== active) e.preventDefault();
      if (!suppressClick && k !== active) go(offset(k, active) < 0 ? -1 : 1);
      suppressClick = false;
    };
    cards.forEach(function (c) { c.addEventListener('click', onCardClick); });

    var onKey = function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
    };
    sec.addEventListener('keydown', onKey);

    // Swipe / drag: a decisive horizontal move steps the carousel once.
    var startX = 0, startY = 0, dx = 0, dragging = false, pid = null;
    var onDown = function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      pid = e.pointerId; startX = e.clientX; startY = e.clientY; dx = 0; dragging = false;
    };
    var onMove = function (e) {
      if (e.pointerId !== pid) return;
      dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - startY)) {
        dragging = true;
        track.classList.add('is-dragging');
      }
    };
    var onUp = function (e) {
      if (e.pointerId !== pid) return;
      pid = null;
      track.classList.remove('is-dragging');
      if (!dragging) return;
      dragging = false;
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      var threshold = Math.min(70, track.offsetWidth * 0.12);
      if (dx <= -threshold) onNext(); else if (dx >= threshold) onPrev();
    };
    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);

    layout();
    flags();
    showInfo(active, active);

    var lastW = stage.clientWidth;
    var ro = null;
    var onResize = function () {
      if (stage.clientWidth === lastW) return;
      lastW = stage.clientWidth;
      layout();
    };
    if ('ResizeObserver' in window) { ro = new ResizeObserver(onResize); ro.observe(stage); }
    else window.addEventListener('resize', onResize);

    // Entrance: heading first, then the bottles settle (centre last to land), then the details.
    if (animated && window.ScrollTrigger) {
      var head = sec.querySelector('[data-hoa-cf-head]');
      var pics = cards.map(function (c) { return c.querySelector('img'); });
      var side = pics.filter(function (_, k) { return Math.abs(offset(k, active)) === 1; });
      var arrows = [prev, next].filter(Boolean);
      var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      tl.from(head, { autoAlpha: 0, y: 24, duration: 0.9 }, 0)
        .from(side, { autoAlpha: 0, scale: 0.9, duration: 1.1 }, 0.15)
        .from(pics[active], { autoAlpha: 0, scale: 0.94, duration: 1.2 }, 0.25)
        .from(arrows, { autoAlpha: 0, duration: 0.8 }, 0.6)
        .from(infos[active], { autoAlpha: 0, y: 16, duration: 0.9 }, 0.7);
      tl.progress(0.0001).pause();
      ScrollTrigger.create({ trigger: sec, start: 'top 75%', once: true, onEnter: function () { tl.play(); } });
    }

    cleanups.push(function () {
      if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
      if (prev) prev.removeEventListener('click', onPrev);
      if (next) next.removeEventListener('click', onNext);
      cards.forEach(function (c) { c.removeEventListener('click', onCardClick); });
      sec.removeEventListener('keydown', onKey);
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
      track.removeEventListener('pointercancel', onUp);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero → Signature Fragrances: ONE bottle, first screen to carousel    */
  /* The travelling element is [data-hoa-hero-bottle]: the hero photo's  */
  /* own bottle, cut from that frame and resting in place over the       */
  /* painted-out backdrop (sections/hoa-hero.liquid). Nothing is swapped */
  /* or duplicated; the same node is transformed the whole way.          */
  /*   A  lift    inside the photo it eases forward past the wood chip   */
  /*              standing in front of it (chip overlay fades, it grows) */
  /*   B  travel  moved into #main-content so it can cross section edges */
  /*              it flies on a slight arc, turning gently, to the card  */
  /*   C  dock    reparented into the first card's product footprint     */
  /* Scroll-scrubbed by hand (no gsap scrub fighting the reparenting),   */
  /* fully reversible on scroll up.                                      */
  /* ------------------------------------------------------------------ */
  function heroLiftActive() {
    return hasGsap() && !reduceMotion && !document.querySelector('[data-hoa-hero-static]') &&
      !!document.querySelector('[data-hoa-hero] [data-hoa-hero-bottle]') &&
      !!document.querySelector('[data-hoa-cf] [data-hoa-cf-card][data-index="0"]');
  }

  function initHeroBottleJourney() {
    if (!heroLiftActive()) return;
    var heroEl = document.querySelector('[data-hoa-hero]');
    var slot = heroEl.querySelector('[data-hoa-hero-bottle-slot]');
    var bottle = heroEl.querySelector('[data-hoa-hero-bottle]');
    var chip = heroEl.querySelector('[data-hoa-hero-chip]');
    var veil = heroEl.querySelector('.hoa-hero__veil');
    var card = document.querySelector('[data-hoa-cf] [data-hoa-cf-card][data-index="0"]');
    var pic = card.querySelector('.hoa-cf__pic') || card;
    var nativeImg = pic.querySelector('img');
    var img = bottle.querySelector('img');
    var main = document.getElementById('main-content');
    if (!slot || !img || !main) return;

    // The card's own photo steps aside; the hero bottle lands in its footprint.
    var dock = document.createElement('span');
    dock.className = 'hoa-cf__dock';
    pic.appendChild(dock);
    pic.classList.add('hoa-cf__pic--lift');
    var dockAlt = nativeImg ? nativeImg.alt : '';

    var LIFT = 0.1;   // stage A length, as a share of the hero's height of scroll
    var GROW = 0.06;  // stage A: how far the bottle comes forward
    var ARC = 0.05;   // stage B: sideways bow of the flight, share of viewport width
    var LAND = 0.85;  // stage B: share of the flight after which the bottle sits locked on the dock
    var easeA = gsap.parseEase('power1.inOut');
    var easeB = gsap.parseEase('sine.inOut');
    var lerp = function (x, y, t) { return x + (y - x) * t; };

    var mode = 'rest';  // rest | fly | dock
    var split = 0.1;    // progress where A hands over to B (set on refresh)
    var boxA = null;    // bottle box (main coords) at the handover

    function rel(r) {
      var mr = main.getBoundingClientRect();
      return { top: r.top - mr.top, left: r.left - mr.left, width: r.width, height: r.height };
    }

    // The bottle at the end of stage A (grown about its base), in main coords.
    function liftedBox() {
      var r = rel(slot.getBoundingClientRect());
      var w = r.width * (1 + GROW), h = r.height * (1 + GROW);
      return { top: r.top + r.height - h, left: r.left - (w - r.width) / 2, width: w, height: h };
    }

    // Hero copy lying over the resting bottle (e.g. the headline on phones) would be
    // jumped over when the bottle leaves the photo, so it recedes during stage A instead.
    // filter: opacity() leaves the entrance / scroll tweens' own opacity alone.
    var copy = Array.prototype.slice.call(heroEl.querySelectorAll('.hoa-hero__eyebrow, .hoa-hero__word, .hoa-hero__lede, .hoa-hero__cta'));
    var overlapping = [];
    function findOverlaps() {
      copy.forEach(function (el) { el.style.filter = ''; });
      var b = liftedBox();
      overlapping = copy.filter(function (el) {
        var range = document.createRange();
        range.selectNodeContents(el);   // the text's own extent, not the full-width block
        var r = rel(range.getBoundingClientRect());
        return r.left < b.left + b.width && r.left + r.width > b.left && r.top < b.top + b.height && r.top + r.height > b.top;
      });
    }
    function fadeCopy(q) {
      overlapping.forEach(function (el) { el.style.filter = q > 0 ? 'opacity(' + (1 - q).toFixed(3) + ')' : ''; });
    }

    // At rest the hero veil shades the bottle. Carry that exact shading onto it as it
    // leaves the veil (read from the live CSS, so desktop and mobile both match).
    function captureVeil(box) {
      var bg = veil ? getComputedStyle(veil).backgroundImage : '';
      var re = /rgba?\(([^)]+)\)\s*([\d.]+)%/g, m, stops = [];
      while ((m = re.exec(bg))) {
        var c = m[1].split(',').map(parseFloat);
        stops.push({ at: parseFloat(m[2]) / 100, rgb: c.slice(0, 3).join(','), a: c.length > 3 ? c[3] : 1 });
      }
      var alphaAt = function (y) {
        if (!stops.length || y < 0 || y > 1) return 0;
        for (var i = 1; i < stops.length; i++) {
          if (y <= stops[i].at) return lerp(stops[i - 1].a, stops[i].a, (y - stops[i - 1].at) / ((stops[i].at - stops[i - 1].at) || 1));
        }
        return stops[stops.length - 1].a;
      };
      var hr = rel(heroEl.getBoundingClientRect());
      var rgb = stops.length ? stops[0].rgb : '12,10,8';
      var g = [];
      for (var k = 0; k <= 6; k++) {
        var y = (box.top + box.height * k / 6 - hr.top) / hr.height;
        g.push('rgba(' + rgb + ',' + alphaAt(y).toFixed(3) + ') ' + Math.round(k / 6 * 100) + '%');
      }
      bottle.style.setProperty('--hoa-lift-veil', 'linear-gradient(180deg,' + g.join(',') + ')');
      bottle.style.setProperty('--hoa-lift-mask', 'url("' + (img.currentSrc || img.src) + '")');
    }

    function place(parent) {
      if (bottle.parentNode !== parent) parent.appendChild(bottle);
    }
    function toRest() {
      if (mode === 'rest') return;
      place(slot);
      bottle.classList.remove('hoa-bottle-journey');
      gsap.set(bottle, { clearProps: 'top,left,width,height,transform' });
      img.alt = '';
      mode = 'rest';
    }
    function toFly() {
      if (mode === 'fly') return;
      if (mode === 'rest') {
        gsap.set(bottle, { clearProps: 'transform' });
        boxA = liftedBox();
        captureVeil(boxA);
      }
      place(main);
      bottle.classList.add('hoa-bottle-journey');
      img.alt = '';
      mode = 'fly';
    }
    function toDock() {
      if (mode === 'dock') return;
      place(dock);
      bottle.classList.remove('hoa-bottle-journey');
      gsap.set(bottle, { clearProps: 'top,left,width,height,transform' });
      img.alt = dockAlt;
      mode = 'dock';
    }

    function render(p) {
      if (p < split) {
        // A: still part of the photo, coming forward past the chip.
        toRest();
        var q = easeA(Math.max(0, p) / split);
        gsap.set(bottle, { scale: 1 + GROW * q, transformOrigin: '50% 100%' });
        if (chip) chip.style.opacity = String(1 - q);
        fadeCopy(q);
        return;
      }
      if (chip) chip.style.opacity = '0';
      fadeCopy(1);
      if (p >= 1) { toDock(); return; }
      // B: the same node, free of the hero, flies to the card.
      toFly();
      // Its centre moves linearly with the scroll, so it holds its place on screen
      // instead of scrolling away; only the size eases. The flight completes at LAND of
      // the stretch (position, size, arc and tilt together); from there to the dock
      // handover it is set onto the dock's live box every frame, so it rides locked to
      // the card instead of the card scrolling up to meet a bottle that is still a few
      // pixels off (it used to close the last gap only at progress 1, then snap).
      var t = (p - split) / (1 - split);
      var f = Math.min(1, t / LAND);
      var e = easeB(f);
      var d = rel(dock.getBoundingClientRect());
      var w = lerp(boxA.width, d.width, e), h = lerp(boxA.height, d.height, e);
      var cx = lerp(boxA.left + boxA.width / 2, d.left + d.width / 2, f) + Math.sin(Math.PI * f) * ARC * window.innerWidth;
      var cy = lerp(boxA.top + boxA.height / 2, d.top + d.height / 2, f);
      gsap.set(bottle, {
        top: cy - h / 2,
        left: cx - w / 2,
        width: w,
        height: h,
        rotation: Math.sin(Math.PI * 2 * f) * -6 * (1 - f)
      });
      bottle.style.setProperty('--hoa-lift-veil-o', String(Math.max(0, 1 - t / 0.3)));
    }

    var st = ScrollTrigger.create({
      trigger: heroEl,
      start: 'top top',
      endTrigger: dock,
      end: 'center 55%',
      onUpdate: function (self) { render(self.progress); },
      onRefresh: function (self) {
        split = Math.min(0.4, Math.max(0.02, heroEl.offsetHeight * LIFT / ((self.end - self.start) || 1)));
        // Layout changed: re-measure the handover against it.
        if (mode === 'fly') toRest();
        findOverlaps();
        render(self.progress);
      }
    });

    cleanups.push(function () {
      st.kill();
      toRest();
      gsap.set(bottle, { clearProps: 'all' });
      ['--hoa-lift-veil', '--hoa-lift-veil-o', '--hoa-lift-mask'].forEach(function (n) { bottle.style.removeProperty(n); });
      if (chip) chip.style.opacity = '';
      copy.forEach(function (el) { el.style.filter = ''; });
      pic.classList.remove('hoa-cf__pic--lift');
      dock.remove();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 06 The Collection: tabs                                             */
  /* ------------------------------------------------------------------ */
  /* Campaign tile: span whatever is left of its row, so the grid never ends on an empty
     column (one product short of a row = span 2, a full row = span all). Phones stack. */
  function fitFeature(sec) {
    var tile = sec && sec.querySelector('[data-hoa-feature]');
    var grid = tile && tile.parentNode;
    if (!tile) return;
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    if (cols < 2) { tile.style.gridColumn = ''; return; }
    var n = Array.prototype.filter.call(grid.children, function (c) {
      return c !== tile && c.offsetParent !== null;
    }).length;
    var left = cols - (n % cols);
    tile.style.gridColumn = 'span ' + left;
  }

  /* Campaign tile slides: turn every N seconds (default 3), following the clock so every
     visitor sees the same slide; preload the next photo, then a 0.45s cross-fade. */
  function initFeature() {
    var sec = document.querySelector('[data-hoa-collection]');
    var fig = sec && sec.querySelector('[data-hoa-feature]');
    if (!fig) return;
    fitFeature(sec);
    var onResize = function () { fitFeature(sec); };
    window.addEventListener('resize', onResize, { passive: true });

    var slides = Array.prototype.slice.call(fig.querySelectorAll('template[data-hoa-feature-slide]'));
    if (slides.length < 2 || !fig.hasAttribute('data-hoa-feature-seconds')) return;
    var period = Math.max(3, parseFloat(fig.getAttribute('data-hoa-feature-seconds')) || 3) * 1000;
    var current = 0;
    var timer = 0;
    var slotNow = function () { return Math.floor(Date.now() / period) % slides.length; };

    function render(i) {
      Array.prototype.slice.call(fig.children).forEach(function (c) { if (c.tagName !== 'TEMPLATE') fig.removeChild(c); });
      fig.insertBefore(slides[i].content.cloneNode(true), fig.firstChild);
      current = i;
    }
    function show(i, animate) {
      if (i === current) return;
      if (!animate || reduceMotion) { render(i); return; }
      var go = function () {
        fig.classList.add('is-swapping');
        setTimeout(function () { render(i); requestAnimationFrame(function () { fig.classList.remove('is-swapping'); }); }, 450);
      };
      var probe = slides[i].content.querySelector('img');
      if (!probe) { go(); return; }
      var pre = new Image();
      pre.onload = pre.onerror = go;
      if (probe.srcset) { pre.sizes = probe.sizes; pre.srcset = probe.srcset; }
      pre.src = probe.src;
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(function () { show(slotNow(), true); schedule(); }, period - (Date.now() % period) + 50);
    }
    show(slotNow(), false);
    schedule();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearTimeout(timer); } else { show(slotNow(), true); schedule(); }
    });
  }

  function initCollection() {
    var sec = document.querySelector('[data-hoa-collection]');
    if (!sec) return;
    var tabs = sec.querySelectorAll('[data-hoa-filter]');
    var cards = sec.querySelectorAll('[data-hoa-card]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var f = tab.dataset.hoaFilter;
        tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
        var shown = [];
        cards.forEach(function (c) {
          var fam = c.dataset.family || '';
          var match = f === 'all' || fam === 'all' || fam.indexOf(f) !== -1;
          c.classList.toggle('is-hidden', !match);
          if (match) shown.push(c);
        });
        if (hasGsap() && !reduceMotion) {
          gsap.fromTo(shown, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', overwrite: true });
        }
        fitFeature(sec);
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });

    // Product reveal (scroll story, 2026-10-07): the cards assemble, rising from slightly
    // smaller and lower, a short beat apart, as the grid enters.
    if (hasGsap() && !reduceMotion) {
      ScrollTrigger.batch(cards, {
        start: 'top 90%',
        once: true,
        onEnter: function (batch) {
          gsap.fromTo(batch, { autoAlpha: 0, y: 64, scale: 0.92, transformOrigin: '50% 100%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.3, stagger: 0.07, ease: 'expo.out', clearProps: 'transform' });
        }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Generic reveal (once)                                               */
  /* ------------------------------------------------------------------ */
  function initReveals() {
    var els = document.querySelectorAll('[data-hoa-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('hoa-is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('hoa-is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });
    cleanups.push(function () { io.disconnect(); });
  }

  /* ------------------------------------------------------------------ */
  /* World of Agha video tiles: muted loop only while on screen          */
  /* ------------------------------------------------------------------ */
  function initTileVideos() {
    var vids = Array.prototype.slice.call(document.querySelectorAll('[data-hoa-tile-video]'));
    if (!vids.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // poster only
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (v.preload === 'none') v.preload = 'auto';
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) { io.observe(v); });
    cleanups.push(function () { io.disconnect(); });
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */
  function init() {
    initLenis();
    initReveals();
    initCollection();
    initFeature();
    initTileVideos();

    if (hasGsap()) {
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(function () {
        var mm = gsap.matchMedia();
        initFragrances();
        initHero();
        initParallax(mm);
        initHeroBottleJourney();
      });
    } else {
      initFragrances();
      initHero();
    }
    initHeader();

    window.addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  }

  function destroy() {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
    if (ctx) { ctx.revert(); ctx = null; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('shopify:section:load', function () { destroy(); init(); });
  document.addEventListener('shopify:section:unload', function () { destroy(); });
})();
