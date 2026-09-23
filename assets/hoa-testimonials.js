/* ==========================================================================
   HOUSE OF AGHA — TESTIMONIALS MOTION (isolated module)
   sections/hoa-testimonials.liquid

   One master timeline per breakpoint, scrubbed by a single pinned ScrollTrigger:
     Phase 1  first card rises in from below-left, fades and scales up, turning slightly
     Phase 2  the next card arrives on another trajectory while the first keeps settling
     Phase 3  the rest follow, each on its own path, overlapping the statement
     Phase 4  every card comes to rest in the final composition and drifts gently
     Phase 5  cards lift away, the statement lines part, the pin releases

   Desktop/tablet: free overlap around the giant statement.
   Mobile: a readable deck — one card in front, the previous one receding.
   Reduced motion / no GSAP: nothing runs; the section is a static editorial layout.

   Architecture: gsap.context + gsap.matchMedia per section instance (WeakMap guard),
   reverted on shopify:section:unload, so reloading a section never duplicates triggers.
   No scroll listeners of its own — ScrollTrigger drives everything (Lenis, if present,
   already feeds ScrollTrigger from assets/hoa-home.js).
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-voices]';
  var instances = new WeakMap();

  /* Per-card choreography (desktop). Offsets are in vw / vh from the resting spot. */
  var PATHS = [
    { x: -10, y: 95,  r: -9, s: 0.86, rest: -3,   drift: -7,  exit: -105 },
    { x: 12,  y: 112, r: 8,  s: 0.84, rest: 2.5,  drift: -4,  exit: -120 },
    { x: -4,  y: 128, r: 6,  s: 0.88, rest: 1.5,  drift: -10, exit: -95 },
    { x: 15,  y: 104, r: -7, s: 0.86, rest: -2,   drift: -6,  exit: -115 },
    { x: -13, y: 120, r: 7,  s: 0.84, rest: 2,    drift: -9,  exit: -100 },
    { x: 7,   y: 134, r: -6, s: 0.88, rest: -1.5, drift: -5,  exit: -125 },
    { x: 0,   y: 116, r: 4,  s: 0.86, rest: -1,   drift: -8,  exit: -110 }
  ];

  var vw = function (v) { return function () { return window.innerWidth * v / 100; }; };
  var vh = function (v) { return function () { return window.innerHeight * v / 100; }; };

  function visibleCards(section) {
    return Array.prototype.slice.call(section.querySelectorAll('[data-hoa-voice]'))
      .filter(function (el) { return window.getComputedStyle(el).display !== 'none'; });
  }

  /* ---------------- Desktop + tablet ---------------- */
  function buildDesktop(section, stage, lines, intro, isTablet) {
    var cards = visibleCards(section);
    var n = cards.length;
    if (!n) return;
    var travel = isTablet ? 0.7 : 1;           // tablet: shorter movement distances
    var gap = 0.95;                              // arrival spacing between cards
    var enterDur = 3.2;                          // each card's flight
    var settleEnd = 0.2 + (n - 1) * gap + enterDur;
    var exitAt = settleEnd + 0.7;                // brief hold on the finished composition

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + window.innerHeight * (isTablet ? 2.8 : 3.4); },
        pin: stage,
        refreshPriority: 1,   // below the fragrance pin (2), above ordinary triggers (0)
        scrub: 0.9,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    // The statement composes itself very slightly as the first cards arrive.
    if (lines[0]) tl.fromTo(lines[0], { x: vw(-3 * travel) }, { x: 0, duration: 3, ease: 'power2.out' }, 0);
    if (lines[2]) tl.fromTo(lines[2], { x: vw(3 * travel) }, { x: 0, duration: 3, ease: 'power2.out' }, 0);

    cards.forEach(function (card, i) {
      var p = PATHS[i % PATHS.length];
      var at = 0.2 + i * gap;
      // Phases 1–3: flight in. power3.out keeps the card travelling (and overlapping)
      // long after it becomes readable, so earlier cards are still settling as new ones arrive.
      tl.fromTo(card,
        { x: vw(p.x * travel), y: vh(p.y * travel), rotation: p.r, scale: p.s },
        { x: 0, y: 0, rotation: p.rest, scale: 1, duration: enterDur, ease: 'power3.out', immediateRender: true },
        at);
      tl.fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'power1.out', immediateRender: true }, at);
      // Phase 4: once at rest, a slow parallax drift so the composition never feels frozen.
      tl.to(card, { y: vh(p.drift * travel), duration: exitAt - (at + enterDur), ease: 'none' }, at + enterDur);
      // Phase 5: lift away on individual paths.
      tl.to(card, {
        y: vh(p.exit * travel),
        rotation: p.rest * 2.2,
        autoAlpha: 0,
        duration: 2.2,
        ease: 'power2.in'
      }, exitAt + i * 0.1);
    });

    // Phase 5: the statement parts and the stage clears before release.
    var partX = [-38, 26, 48];
    lines.forEach(function (line, i) {
      tl.to(line, { xPercent: partX[i % partX.length], scale: 1.08, autoAlpha: 0, duration: 2.4, ease: 'power2.in' }, exitAt + 0.5 + i * 0.12);
    });
    if (intro) tl.to(intro, { autoAlpha: 0, y: -20, duration: 1.2, ease: 'power1.in' }, exitAt + 0.3);
  }

  /* ---------------- Mobile: readable deck ---------------- */
  function buildMobile(section, stage, lines, intro) {
    var cards = visibleCards(section);
    var n = cards.length;
    if (!n) return;
    var step = 1;

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + window.innerHeight * (0.7 * n + 0.8); },
        pin: stage,
        refreshPriority: 1,   // below the fragrance pin (2), above ordinary triggers (0)
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    cards.forEach(function (card, i) {
      var at = i * step;
      var side = i % 2 ? 1 : -1;
      // Arrive: rises from below on a slight diagonal, opaque early so it cleanly covers the card behind.
      tl.fromTo(card,
        { y: vh(62), x: vw(side * 6), rotation: side * 6, scale: 0.94 },
        { y: 0, x: 0, rotation: side * 1.2, scale: 1, duration: 0.9, ease: 'power3.out', immediateRender: true },
        at);
      tl.fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out', immediateRender: true }, at);
      // A physical deck: the next card lands on top and this one steps back (still opaque, only its
      // top edge peeks out); it only fades once a third card arrives. Two cards at most, one readable.
      if (i < n - 1) {
        tl.to(card, { y: vh(-3.5), scale: 0.95, duration: 0.8, ease: 'power2.out' }, at + step);
        tl.to(card, { y: vh(-7), autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, at + step * 2);
      }
    });

    var exitAt = (n - 1) * step + 1.3;
    tl.to(cards[n - 1], { y: vh(-40), autoAlpha: 0, duration: 0.9, ease: 'power2.in' }, exitAt);
    var partX = [-30, 20, 36];
    lines.forEach(function (line, i) {
      tl.to(line, { xPercent: partX[i % partX.length], autoAlpha: 0, duration: 1, ease: 'power2.in' }, exitAt + 0.15 + i * 0.08);
    });
    if (intro) tl.to(intro, { autoAlpha: 0, duration: 0.6 }, exitAt);
  }

  /* ---------------- Lifecycle ---------------- */
  function init(section) {
    if (!section || instances.has(section)) return;
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    var stage = section.querySelector('[data-hoa-voices-stage]');
    var lines = Array.prototype.slice.call(section.querySelectorAll('[data-hoa-voices-line]'));
    var intro = section.querySelector('[data-hoa-voices-intro]');
    if (!stage) return;

    var ctx = gsap.context(function () {
      var mm = gsap.matchMedia();
      mm.add({
        desktop: '(min-width: 1101px) and (prefers-reduced-motion: no-preference)',
        tablet: '(min-width: 768px) and (max-width: 1100px) and (prefers-reduced-motion: no-preference)',
        mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)'
      }, function (context) {
        var c = context.conditions;
        section.classList.add('is-animated');    // switch CSS to the stage layout before measuring
        gsap.set(section.querySelectorAll('[data-hoa-voice]'), { xPercent: -50, yPercent: -50 }); // centre each card on its spot
        if (c.mobile) buildMobile(section, stage, lines, intro);
        else buildDesktop(section, stage, lines, intro, !!c.tablet);
        return function () { section.classList.remove('is-animated'); };
      });
    }, section);

    instances.set(section, ctx);
    // Triggers from assets/hoa-home.js were created first; sort by refreshPriority so the
    // pins are measured top-down, then re-measure everything once.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }

  function destroy(section) {
    var ctx = instances.get(section);
    if (!ctx) return;
    ctx.revert();
    instances.delete(section);
    section.classList.remove('is-animated');
  }

  function initAll() { document.querySelectorAll(SELECTOR).forEach(init); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  var fromEvent = function (e) {
    var t = e.target;
    return t && t.matches && t.matches(SELECTOR) ? t : t && t.querySelector ? t.querySelector(SELECTOR) : null;
  };
  document.addEventListener('shopify:section:load', function (e) { var el = fromEvent(e); if (el) init(el); });
  document.addEventListener('shopify:section:unload', function (e) { var el = fromEvent(e); if (el) destroy(el); });
})();
