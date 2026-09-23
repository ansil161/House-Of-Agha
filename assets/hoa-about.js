/* ==========================================================================
   HOUSE OF AGHA · ABOUT PAGE MOTION (sections/hoa-about-*.liquid)

   Each animation has one job:
     Opening bento ... headline rises line by line, then the tiles assemble in
                       reading order (hierarchy); photos drift inside their tiles
                       while scrolling (depth, subtle).
     Stacking cards .. cards stick under the header; the card underneath recedes
                       as the next one arrives (storytelling, one idea at a time).
     Fragrances ...... the section pins and the row pans sideways so all seven
                       are seen in sequence (storytelling). Desktop only.
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

  function build() {
    if (!hasGsap()) return;
    gsap.registerPlugin(ScrollTrigger);
    initLenis();

    mm = gsap.matchMedia();

    /* 03 Fragrances: pinned horizontal pan, wide screens only.
       Created first: ScrollTrigger lays triggers out in creation order, so the
       pin spacing must exist before the triggers further down the page. */
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
      var section = document.querySelector('[data-hoa-ab-worlds]');
      if (!section) return;
      var pin = section.querySelector('[data-hoa-ab-pin]');
      var track = section.querySelector('[data-hoa-ab-track]');
      section.classList.add('is-panning');
      var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };

      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: function () { return '+=' + distance(); },
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
      return function () { section.classList.remove('is-panning'); };
    });

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
})();
