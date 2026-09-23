/* ==========================================================================
   HOUSE OF AGHA · ABOUT PAGE MOTION (sections/hoa-about-*.liquid)

   Each animation has one job:
     Opening ......... headline rises line by line, the portrait uncovers upward,
                       then drifts gently as the page scrolls away (hierarchy).
     Statement ....... words brighten in reading order with scroll (storytelling).
     Fragrances ...... the section pins and the row pans sideways, so all seven
                       are seen in sequence (storytelling). Desktop only.
     How we work ..... cells rise in once as they enter (hierarchy).
     Closing ......... the framed photo opens to full width (emphasis before CTA).

   Without GSAP, or with prefers-reduced-motion, the page is static and complete:
   initial states are only ever set from JS, never from CSS.
   Theme Editor safe: rebuilt on shopify:section:load / unload.
   ========================================================================== */
(function () {
  'use strict';

  var mm = null;
  var lenis = null;
  var hasGsap = function () { return typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'; };

  /* Wrap every word of the statement in a span, keeping <em> runs intact. */
  function splitWords(el) {
    if (el.dataset.hoaAbSplit) return el.querySelectorAll('.hoa-ab-w');
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (piece) {
            if (!piece) return;
            if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(piece)); return; }
            var span = document.createElement('span');
            span.className = 'hoa-ab-w';
            span.textContent = piece;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    el.dataset.hoaAbSplit = '1';
    return el.querySelectorAll('.hoa-ab-w');
  }

  function initLenis() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenis || reduce || !fine || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    window.hoaLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Hand anchor links (hero button to #worlds) to Lenis so they glide.
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

      /* 01 Opening */
      var hero = document.querySelector('[data-hoa-ab-hero]');
      if (hero) {
        var tl = gsap.timeline({ defaults: { ease: ease } });
        tl.from(hero.querySelectorAll('[data-hoa-ab-rise]'), { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.1)
          .from(hero.querySelectorAll('[data-hoa-ab-line]'), { y: 24, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.35)
          .fromTo(hero.querySelector('[data-hoa-ab-clip]'),
            { clipPath: 'inset(100% 0% 0% 0% round 2px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 2px)', duration: 1.6, ease: 'expo.inOut' }, 0)
          .from(hero.querySelector('[data-hoa-ab-drift]'), { scale: 1.18, duration: 2, ease: 'expo.out' }, 0.2)
          .from(hero.querySelector('[data-hoa-ab-float]'), { y: 60, opacity: 0, duration: 1.3 }, 0.8);

        gsap.to(hero.querySelector('[data-hoa-ab-drift]'), {
          yPercent: 7, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
        gsap.to(hero.querySelector('[data-hoa-ab-float]'), {
          y: -90, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
      }

      /* 02 Statement */
      document.querySelectorAll('[data-hoa-ab-words]').forEach(function (el) {
        gsap.fromTo(splitWords(el), { opacity: 0.16 }, {
          opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 48%', scrub: 0.6 }
        });
      });

      /* 04 + 05 Rise-in once */
      var ups = gsap.utils.toArray('[data-hoa-ab-up]');
      gsap.set(ups, { opacity: 0, y: 48 });
      ScrollTrigger.batch(ups, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: ease, stagger: 0.1, overwrite: true });
        }
      });

      /* 05 Closing frame opens */
      var closing = document.querySelector('[data-hoa-ab-closing]');
      if (closing) {
        var zoom = closing.querySelector('[data-hoa-ab-zoom]');
        gsap.fromTo(zoom,
          { clipPath: 'inset(0% 9% 0% 9% round 2px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 2px)', ease: 'none',
            scrollTrigger: { trigger: closing, start: 'top 92%', end: 'top 20%', scrub: 0.8 } });
        gsap.fromTo(zoom.querySelector('img'), { scale: 1.2 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: closing, start: 'top bottom', end: 'bottom 60%', scrub: 0.8 }
        });
      }
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
