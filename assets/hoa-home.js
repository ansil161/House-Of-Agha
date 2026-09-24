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
      var locked = document.body.style.overflow === 'hidden' || root.classList.contains('hoa-menu-open');
      if (locked) lenis.stop(); else lenis.start();
    };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });

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
  function initHero() {
    var hero = document.querySelector('[data-hoa-hero]');
    if (!hero) return;
    var slides = hero.querySelectorAll('[data-hoa-slide]');
    var dots = hero.querySelectorAll('[data-hoa-dot]');
    var interval = parseInt(hero.dataset.interval, 10) || 7000;
    var current = 0;
    var visible = true;

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
    function schedule() {
      clearTimeout(heroTimer);
      if (reduceMotion || slides.length < 2 || !visible || document.hidden) return;
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
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(hero.querySelector('[data-hoa-hero-media]'), { scale: 1.12, duration: 2.6, ease: 'power3.out' }, 0)
      .from(words, { yPercent: 110, duration: 1.6, stagger: 0.12 }, 0.25)
      .from(fades, { autoAlpha: 0, y: 18, duration: 1.2, stagger: 0.08 }, 0.8);

    // Scroll: the frame drifts back and dims as the House takes over.
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to(hero.querySelector('[data-hoa-hero-media]'), { yPercent: 18, ease: 'none' }, 0)
      .to(hero.querySelector('.hoa-hero__content'), { yPercent: -12, autoAlpha: 0.2, ease: 'none' }, 0);
  }

  /* ------------------------------------------------------------------ */
  /* 02 The House: word-by-word statement + floating details             */
  /* ------------------------------------------------------------------ */
  function splitWords(el) {
    if (el.dataset.hoaSplit) return el.querySelectorAll('.hoa-word');
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.className = 'hoa-word';
            span.textContent = part;
            frag.appendChild(span);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    el.dataset.hoaSplit = 'true';
    return el.querySelectorAll('.hoa-word');
  }

  function initManifesto() {
    var sec = document.querySelector('[data-hoa-manifesto]');
    if (!sec) return;
    var text = sec.querySelector('[data-hoa-words]');
    if (!text) return;
    if (!hasGsap() || reduceMotion) return;
    var words = splitWords(text);
    gsap.to(words, {
      opacity: 1,
      ease: 'none',
      stagger: 0.08,
      scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 }
    });
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
  /* 06 The Collection: tabs                                             */
  /* ------------------------------------------------------------------ */
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
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });

    // Product reveal: a restrained stagger as the grid enters.
    if (hasGsap() && !reduceMotion) {
      ScrollTrigger.batch(cards, {
        start: 'top 90%',
        once: true,
        onEnter: function (batch) {
          gsap.fromTo(batch, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' });
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
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */
  function init() {
    initLenis();
    initReveals();
    initCollection();

    if (hasGsap()) {
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(function () {
        var mm = gsap.matchMedia();
        initFragrances();
        initHero();
        initManifesto();
        initParallax(mm);
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
