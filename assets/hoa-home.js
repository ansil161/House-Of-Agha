/* ==========================================================================
   HOUSE OF AGHA — HOMEPAGE MOTION
   One controller for the homepage sections (sections/hoa-*.liquid).

   Hierarchy of motion
     Hero ............ strongest: word rise, slow crossfading campaign, drift on scroll
     Editorial ....... controlled: word-by-word statement, floating details, pinned chapters
     Product ......... subtle: staggered reveals, hover image swap, tab filtering
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
        // The fragrance chapters are only dark while pinned (desktop); on mobile they sit on paper.
        if (d.hasAttribute('data-hoa-frag') && !d.classList.contains('is-pinned')) return false;
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
  /* 03 Signature fragrances: pinned chapters                            */
  /* ------------------------------------------------------------------ */
  function initFragrances(mm) {
    var sec = document.querySelector('[data-hoa-frag]');
    if (!sec) return;
    var stage = sec.querySelector('[data-hoa-frag-stage]');
    var items = sec.querySelectorAll('[data-hoa-frag-item]');
    var dots = sec.querySelectorAll('[data-hoa-frag-go]');
    var bg = sec.querySelector('[data-hoa-frag-bg]');
    var n = items.length;
    if (!n) return;
    var active = 0;

    function setActive(i, instant) {
      i = Math.max(0, Math.min(n - 1, i));
      if (i === active && !instant) return;
      var prev = active;
      active = i;
      items.forEach(function (it, k) {
        it.classList.toggle('is-active', k === i);
        it.classList.toggle('was-active', k === prev && k !== i);
      });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      if (bg) bg.style.backgroundColor = items[i].dataset.tint || '';

      if (!hasGsap() || reduceMotion || instant) return;
      var vis = items[i].querySelector('.hoa-frag__visual');
      var img = vis && vis.querySelector('img');
      gsap.killTweensOf([vis, img]);
      gsap.fromTo(vis, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut',
        onComplete: function () { items.forEach(function (it, k) { if (k !== active) it.classList.remove('was-active'); }); } });
      if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'expo.out' });
    }

    if (bg) bg.style.backgroundColor = items[0].dataset.tint || '';

    if (!hasGsap()) return;

    mm.add('(min-width: 900px)', function () {
      sec.classList.add('is-pinned');
      var st = ScrollTrigger.create({
        trigger: sec,
        start: 'top top',
        end: function () { return '+=' + (window.innerHeight * 0.75 * (n - 1)); },
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        refreshPriority: 2,   // pins refresh top-down: fragrances (2) before testimonials (1) before everything else
        invalidateOnRefresh: true,
        snap: reduceMotion ? false : { snapTo: 1 / (n - 1), duration: { min: 0.3, max: 0.8 }, delay: 0.12, ease: 'power2.inOut' },
        onUpdate: function (self) { setActive(Math.round(self.progress * (n - 1))); }
      });
      var onDot = function (e) {
        var i = parseInt(e.currentTarget.dataset.hoaFragGo, 10);
        var y = st.start + (st.end - st.start) * (i / (n - 1)) + 1;
        if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: 'smooth' });
      };
      dots.forEach(function (d) { d.addEventListener('click', onDot); });
      return function () {
        sec.classList.remove('is-pinned');
        dots.forEach(function (d) { d.removeEventListener('click', onDot); });
        setActive(0, true);
      };
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
        initHero();
        initManifesto();
        initParallax(mm);
        initFragrances(mm);
      });
    } else {
      initHero();
      initFragrances({ add: function () {} });
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
