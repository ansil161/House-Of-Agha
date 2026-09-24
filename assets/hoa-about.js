/* ==========================================================================
   HOUSE OF AGHA · ABOUT PAGE MOTION (sections/hoa-about-*.liquid)

   Each animation has one job:
     Opening bento ... headline rises line by line, then the tiles assemble in
                       reading order (hierarchy); photos drift inside their tiles
                       while scrolling (depth, subtle).
     Stacking cards .. cards stick under the header; the card underneath recedes
                       as the next one arrives (storytelling, one idea at a time).
     Seven worlds .... the section pins and one canvas pans sideways; each world
                       comes into focus at the centre (storytelling). Wide screens;
                       phones get a stacked version, reduced motion a static one.
     Closing card .... grows from slightly inset to full size before the shop
                       button (emphasis).

   Without GSAP, or with prefers-reduced-motion, the page is static and complete:
   initial states are only ever set from JS, never from CSS.
   Theme Editor safe: rebuilt on shopify:section:load / unload.
   ========================================================================== */
(function () {
  'use strict';

  var mm = null;
  var lenis = null;
  var hasGsap = function () { return typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'; };

  function initLenis() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenis || reduce || !fine || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    window.hoaLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Hand in-page anchors (hero button to #worlds) to Lenis so they glide.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
    // Pause while the theme locks the page (cart drawer, mobile menu).
    new MutationObserver(function () {
      if (document.body.style.overflow === 'hidden') lenis.stop(); else lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['style'] });
  }

  /* ---------------- 03 The seven worlds ----------------
     Wide (768px+, motion allowed): the section pins; vertical scroll pans one continuous
     canvas sideways. Each world comes into focus as it nears the centre (scrubbed against
     the pan via containerAnimation), the counter rolls and the section takes a faint tint
     from the world in focus. The pan distance is measured, never fixed.
     Phones (motion allowed): the worlds stack; each settles into view and drives a sticky
     counter. Reduced motion: nothing here runs, the static stack from the CSS is shown.
     Everything is created inside the shared gsap.matchMedia (mm), so destroy() / resize
     tear it down cleanly and Theme Editor reloads never leave duplicate ScrollTriggers. */
  function initSevenWorlds() {
    var scope = function () { return document.querySelector('[data-hoa-ab-worlds]'); };

    function parts(section) {
      return {
        pin: section.querySelector('[data-hoa-ab-pin]'),
        track: section.querySelector('[data-hoa-ab-track]'),
        worlds: gsap.utils.toArray('[data-hoa-ab-world]', section),
        roll: section.querySelector('[data-hoa-ab-roll]'),
        bar: section.querySelector('[data-hoa-ab-bar]')
      };
    }

    /* The elements of one world that animate */
    function bits(w) {
      return {
        media: w.querySelector('[data-hoa-ab-media]'),
        img: w.querySelector('.hoa-ab-world__img'),
        title: w.querySelector('[data-hoa-ab-title]'),
        meta: gsap.utils.toArray('[data-hoa-ab-meta]', w)
      };
    }

    /* Wide screens: pinned horizontal canvas */
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', function () {
      var section = scope();
      if (!section) return;
      var p = parts(section);
      if (!p.pin || !p.track || !p.worlds.length) return;
      var n = p.worlds.length;
      var centers = [];
      var active = -1;
      var setBar = p.bar ? gsap.quickSetter(p.bar, 'scaleX') : function () {};
      section.classList.add('is-panning');

      // Pad the canvas so the first and last world can sit exactly at the centre.
      // Reads layout, so it only runs on (re)measure, never per frame.
      var measure = function () {
        var first = p.worlds[0];
        var last = p.worlds[n - 1];
        p.track.style.paddingLeft = Math.max(0, (window.innerWidth - first.offsetWidth) / 2) + 'px';
        p.track.style.paddingRight = Math.max(0, (window.innerWidth - last.offsetWidth) / 2) + 'px';
        centers = p.worlds.map(function (w) { return w.offsetLeft + w.offsetWidth / 2; });
      };
      var distance = function () { measure(); return Math.max(0, p.track.scrollWidth - window.innerWidth); };

      var setActive = function (i) {
        if (i === active) return;
        active = i;
        p.worlds.forEach(function (w, k) { w.classList.toggle('is-active', k === i); });
        var tint = p.worlds[i].getAttribute('data-tint');
        if (tint) p.pin.style.setProperty('--tint', tint);
        if (p.roll) gsap.to(p.roll, { yPercent: -(100 / n) * i, duration: 0.7, ease: 'power3.out', overwrite: true });
      };

      var sync = function () {
        var x = gsap.getProperty(p.track, 'x');
        var mid = window.innerWidth / 2;
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < n; i++) {
          var d = Math.abs(centers[i] + x - mid);
          if (d < bestD) { bestD = d; best = i; }
        }
        setActive(best);
      };

      var pan = gsap.to(p.track, {
        x: function () { return -distance(); },
        ease: 'none',
        onUpdate: sync,
        scrollTrigger: {
          trigger: p.pin,
          start: 'top top',
          end: function () { return '+=' + distance(); },
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: function () { sync(); },
          onUpdate: function (self) { setBar(self.progress); }
        }
      });

      // Focus: each world eases in as it nears the centre, holds, then steps back.
      p.worlds.forEach(function (w) {
        var b = bits(w);
        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: w, containerAnimation: pan, start: 'left 92%', end: 'right 8%', scrub: true }
        });
        tl.fromTo(b.media, { opacity: 0.35, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4 }, 0)
          .fromTo(b.media, { opacity: 1, scale: 1 }, { opacity: 0.35, scale: 0.92, duration: 0.4, immediateRender: false }, 0.6)
          .fromTo(b.title, { opacity: 0.3, y: 44 }, { opacity: 1, y: 0, duration: 0.4 }, 0)
          .fromTo(b.title, { opacity: 1, y: 0 }, { opacity: 0.3, y: -28, duration: 0.4, immediateRender: false }, 0.6)
          .fromTo(b.meta, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04 }, 0.1)
          .fromTo(b.meta, { opacity: 1 }, { opacity: 0, duration: 0.25, immediateRender: false }, 0.68);
        if (b.img) tl.fromTo(b.img, { xPercent: -5 }, { xPercent: 5, duration: 1 }, 0);
      });

      return function () {
        section.classList.remove('is-panning');
        p.track.style.paddingLeft = '';
        p.track.style.paddingRight = '';
        p.pin.style.removeProperty('--tint');
        p.worlds.forEach(function (w) { w.classList.remove('is-active'); });
      };
    });

    /* Phones: stacked worlds that settle into view, with a sticky counter */
    mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', function () {
      var section = scope();
      if (!section) return;
      var p = parts(section);
      if (!p.worlds.length) return;
      var n = p.worlds.length;
      var setBar = p.bar ? gsap.quickSetter(p.bar, 'scaleX') : function () {};
      section.classList.add('is-scrolly');

      p.worlds.forEach(function (w, i) {
        var b = bits(w);
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: w, start: 'top 88%', end: 'top 38%', scrub: true }
        })
          .fromTo(b.media, { opacity: 0.4, scale: 0.94 }, { opacity: 1, scale: 1 }, 0)
          .fromTo(b.title, { opacity: 0.3, y: 32 }, { opacity: 1, y: 0 }, 0)
          .fromTo(b.meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.05 }, 0.15);

        ScrollTrigger.create({
          trigger: w,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: function (self) {
            if (!self.isActive) return;
            if (p.roll) gsap.to(p.roll, { yPercent: -(100 / n) * i, duration: 0.6, ease: 'power3.out', overwrite: true });
            setBar(n > 1 ? i / (n - 1) : 1);
            var tint = w.getAttribute('data-tint');
            if (tint) p.pin.style.setProperty('--tint', tint);
          }
        });
      });

      return function () {
        section.classList.remove('is-scrolly');
        p.pin.style.removeProperty('--tint');
      };
    });
  }

  function build() {
    if (!hasGsap()) return;
    gsap.registerPlugin(ScrollTrigger);
    initLenis();

    mm = gsap.matchMedia();

    /* 03 The seven worlds. Created first: ScrollTrigger lays triggers out in creation
       order, so the pin spacing must exist before the triggers further down the page. */
    initSevenWorlds();

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var ease = 'expo.out';

      /* 01 Opening bento */
      var hero = document.querySelector('[data-hoa-ab-hero]');
      if (hero) {
        gsap.timeline({ defaults: { ease: ease } })
          .from(hero.querySelectorAll('[data-hoa-ab-rise]'), { yPercent: 110, duration: 1.3, stagger: 0.1 }, 0.05)
          .from(hero.querySelectorAll('[data-hoa-ab-line]'), { y: 20, opacity: 0, duration: 1, stagger: 0.08 }, 0.3)
          .from(hero.querySelectorAll('[data-hoa-ab-tile]'), {
            y: 70, scale: 0.94, opacity: 0, duration: 1.4, stagger: 0.09, transformOrigin: '50% 100%'
          }, 0.35);
      }

      // Photos drift a little inside their tiles and cards (the frames stay put).
      gsap.utils.toArray('[data-hoa-ab-parallax]').forEach(function (el) {
        gsap.fromTo(el, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* Headings rise in once */
      var ups = gsap.utils.toArray('[data-hoa-ab-up]');
      gsap.set(ups, { opacity: 0, y: 40 });
      ScrollTrigger.batch(ups, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: ease, stagger: 0.1, overwrite: true }); }
      });

      /* 04 Closing card grows to full size */
      var cta = document.querySelector('[data-hoa-ab-cta]');
      if (cta) {
        gsap.fromTo(cta, { scale: 0.9, borderRadius: 48 }, {
          scale: 1, borderRadius: 24, ease: 'none',
          scrollTrigger: { trigger: cta, start: 'top bottom', end: 'top 35%', scrub: 0.8 }
        });
      }
    });

    /* 02 Stacking cards: only where the cards are sticky (see CSS, 760px+) */
    mm.add('(min-width: 760px) and (prefers-reduced-motion: no-preference)', function () {
      var cards = gsap.utils.toArray('[data-hoa-ab-card]');
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        if (!next) return;
        gsap.to(card, {
          scale: 0.93,
          filter: 'brightness(0.86)',
          ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true }
        });
      });
    });

    // Images change heights and pan width once decoded.
    window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
  }

  function destroy() {
    if (mm) { mm.revert(); mm = null; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  document.addEventListener('shopify:section:load', function () { destroy(); build(); });
  document.addEventListener('shopify:section:unload', destroy);
  document.addEventListener('shopify:section:reorder', function () { destroy(); build(); });
})();
