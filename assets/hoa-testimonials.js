/* ==========================================================================
   HOUSE OF AGHA — TESTIMONIALS MARQUEE (isolated module)
   sections/hoa-testimonials.liquid

   The glide itself is pure CSS (assets/hoa-home.css, hoa-voices-marquee keyframes):
   the track holds the boxes twice and slides left by one copy, forever, with no
   clicking. This file only:
     - sets --vc-dur so the speed stays the same (SPEED px/s) whatever the box count
       or screen width, recalculated on resize
     - adds .is-paused while the section is off screen or the tab is hidden, so the
       animation does not burn frames nobody sees

   Per-instance state in a WeakMap; torn down on shopify:section:unload.
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-voices]';
  var SPEED = 45; // px per second
  var instances = new WeakMap();

  function init(section) {
    if (instances.has(section)) return;
    var track = section.querySelector('[data-hoa-voices-track]');
    var group = track && track.querySelector('.hoa-voices__group');
    if (!group) return;
    var onScreen = true;

    function setSpeed() {
      var w = group.getBoundingClientRect().width;
      if (w) section.style.setProperty('--vc-dur', (w / SPEED).toFixed(2) + 's');
    }
    function update() {
      section.classList.toggle('is-paused', !onScreen || document.hidden);
    }

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      update();
    }) : null;
    if (io) io.observe(section);

    var ro = 'ResizeObserver' in window ? new ResizeObserver(setSpeed) : null;
    if (ro) ro.observe(group);
    document.addEventListener('visibilitychange', update);

    setSpeed();
    update();

    instances.set(section, function destroy() {
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', update);
      section.classList.remove('is-paused');
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
