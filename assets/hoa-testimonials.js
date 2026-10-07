/* ==========================================================================
   HOUSE OF AGHA — TESTIMONIALS (isolated module)
   sections/hoa-testimonials.liquid (redesigned 2026-10-07)

   1. Quote row: glides left on its own, continuously and very smoothly (one rAF loop,
      transform only, sub-pixel). The cards are printed twice, so when the row has moved
      by one copy it wraps back without a seam. The arrows glide it one card back or
      forward (eased), then the drift carries on. Pointer / touch drag moves it by hand.
      The drift holds while the pointer is over the row, while it has focus, and while the
      section is off screen or the tab is hidden. No drift with reduced motion.
   2. Photo slides: crossfade every data-interval ms (3 s), each with its own rating panel.
      Same holds (off screen, hidden tab); no auto-advance with reduced motion.
   Per-instance state in a WeakMap; torn down on shopify:section:unload.
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-voices]';
  var instances = new WeakMap();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function init(section) {
    if (instances.has(section)) return;
    var viewport = section.querySelector('[data-hoa-voices-viewport]');
    var track = section.querySelector('[data-hoa-voices-track]');
    var group = track && track.querySelector('.hoa-voices__group');
    var prev = section.querySelector('[data-hoa-voices-prev]');
    var next = section.querySelector('[data-hoa-voices-next]');
    var slides = Array.prototype.slice.call(section.querySelectorAll('[data-hoa-voices-slide]'));
    if (!viewport || !track || !group) return;

    var SPEED = parseFloat(section.getAttribute('data-speed')) || 30;   // px per second
    var INTERVAL = parseInt(section.getAttribute('data-interval'), 10) || 3000;

    var offset = 0;          // px the row has moved left
    var loopW = 0;           // width of one copy of the cards (incl. its trailing gap)
    var onScreen = true;
    var hover = false;
    var focus = false;
    var drag = null;
    var nudge = null;        // { from, to, t0, dur }
    var last = 0;
    var raf = 0;

    function measure() {
      var gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      loopW = group.getBoundingClientRect().width + gap;
    }
    function wrap(x) { return loopW ? ((x % loopW) + loopW) % loopW : x; }
    function paint() { track.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px,0,0)'; }
    function cardStep() {
      var card = group.querySelector('.hoa-voice');
      var gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : viewport.clientWidth * 0.8;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (!onScreen || document.hidden) return;
      if (nudge) {
        var p = Math.min(1, (now - nudge.t0) / nudge.dur);
        offset = wrap(nudge.from + (nudge.to - nudge.from) * easeInOut(p));
        if (p >= 1) nudge = null;
      } else if (!drag && !hover && !focus && !reduceMotion) {
        offset = wrap(offset + SPEED * dt / 1000);
      }
      paint();
    }

    function go(dir) {
      // from/to stay unwrapped; frame() wraps the painted value, so the glide never jumps
      nudge = { from: offset, to: offset + dir * cardStep(), t0: performance.now(), dur: reduceMotion ? 1 : 650 };
    }
    var onPrev = function () { go(-1); };
    var onNext = function () { go(1); };

    // hand drag (mouse, pen, touch); a short tap still clicks through
    var onDown = function (e) {
      if (e.button != null && e.button !== 0) return;
      drag = { x: e.clientX, start: offset, moved: false, id: e.pointerId };
      nudge = null;
    };
    var onMove = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; try { viewport.setPointerCapture(e.pointerId); } catch (err) {} viewport.classList.add('is-dragging'); }
      if (drag.moved) { offset = wrap(drag.start - dx); paint(); }
    };
    var onUp = function (e) {
      if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
      viewport.classList.remove('is-dragging');
      drag = null;
      last = 0;
    };
    var onEnter = function (e) { if (e.pointerType === 'mouse') hover = true; };
    var onLeave = function () { hover = false; last = 0; };
    var onFocusIn = function () { focus = true; };
    var onFocusOut = function () { focus = false; };

    // photo slides
    var current = 0;
    var timer = null;
    function show(i) {
      if (!slides.length) return;
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var on = k === current;
        s.classList.toggle('is-active', on);
        if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
      });
    }
    function startSlides() {
      stopSlides();
      if (reduceMotion || slides.length < 2) return;
      timer = setInterval(function () {
        if (!onScreen || document.hidden) return;
        show(current + 1);
      }, INTERVAL);
    }
    function stopSlides() { if (timer) { clearInterval(timer); timer = null; } }
    // warm the next photos so each crossfade lands on a loaded image
    slides.forEach(function (s) { var im = s.querySelector('img'); if (im) im.loading = 'eager'; });

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      last = 0;
    }, { rootMargin: '100px 0px' }) : null;
    if (io) io.observe(section);
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { measure(); offset = wrap(offset); paint(); }) : null;
    if (ro) ro.observe(group);

    if (prev) prev.addEventListener('click', onPrev);
    if (next) next.addEventListener('click', onNext);
    viewport.addEventListener('pointerdown', onDown);
    viewport.addEventListener('pointermove', onMove);
    viewport.addEventListener('pointerup', onUp);
    viewport.addEventListener('pointercancel', onUp);
    viewport.addEventListener('pointerenter', onEnter);
    viewport.addEventListener('pointerleave', onLeave);
    section.addEventListener('focusin', onFocusIn);
    section.addEventListener('focusout', onFocusOut);

    measure();
    paint();
    raf = requestAnimationFrame(frame);
    startSlides();

    instances.set(section, function destroy() {
      cancelAnimationFrame(raf);
      stopSlides();
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      if (prev) prev.removeEventListener('click', onPrev);
      if (next) next.removeEventListener('click', onNext);
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointermove', onMove);
      viewport.removeEventListener('pointerup', onUp);
      viewport.removeEventListener('pointercancel', onUp);
      viewport.removeEventListener('pointerenter', onEnter);
      viewport.removeEventListener('pointerleave', onLeave);
      section.removeEventListener('focusin', onFocusIn);
      section.removeEventListener('focusout', onFocusOut);
      track.style.transform = '';
    });
  }

  function destroy(section) {
    var d = instances.get(section);
    if (d) { d(); instances.delete(section); }
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
