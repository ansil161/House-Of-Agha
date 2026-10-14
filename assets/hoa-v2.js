/* House of Agha — hoa-v2.js: motion for the two home sections that came from the former Home V2
   (sections/hoa-photo-hero.liquid "The Photo" hero and sections/hoa-v2-worlds.liquid "Two worlds").
   Home V2 itself was removed on 2026-10-14; the V2-only sections and their code are gone.
   GSAP + ScrollTrigger (loaded by the layout) drive the motion; reveals use IntersectionObserver.
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

  /* ----------------------------------------- 01 hero, "The Photo" (2026-10-12) */
  // sections/hoa-photo-hero.liquid (V1 home): the photo comes up, the 3D logo (hoa-crest.js, profile photo) appears
  // in the stone on its left, a little larger, and settles. On scroll the photo eases back slightly.
  function initPhotoHero() {
    var hero = $('[data-v2-phero]');
    if (!hero) return;
    var img = $('.v2-phero__img', hero);
    function signal(k) {
      var h = window.AGHA_HERO = window.AGHA_HERO || {};
      if (!h[k]) h[k] = performance.now();
      try { document.dispatchEvent(new CustomEvent('agha:hero')); } catch (_) {}
    }
    var shown = false;
    function show() {
      if (shown) return;
      shown = true;
      hero.classList.add('is-in');
      if (reduce) { signal('appear'); signal('home'); return; }
      setTimeout(function () { signal('appear'); }, 500);
      setTimeout(function () { signal('home'); }, 1700);
    }
    afterPreloader(function () {
      if (!img || img.complete) { show(); return; }
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
      setTimeout(show, 1800);                        // a slow photo: the logo does not wait for it
    });
    if (!reduce && hasGsap() && img) {
      window.gsap.to($('.v2-phero__media', hero), { yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    }
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
    initPhotoHero();
    initWorlds();
    initReveals();
    initDrift();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
