/* ==========================================================================
   HOUSE OF AGHA — TESTIMONIALS (sections/agha-testimonials.liquid)
   - Cards fade up once when the grid enters view (stagger comes from each card's --d).
   - Edge fade: while the grid slides under the header, its top melts into the background.
   - Optional column drift (desktop): outer columns and the middle one move in opposite directions.
   IntersectionObserver + one rAF scroll loop that only runs while the section is on screen.
   Guards itself so several sections can share it.
   ========================================================================== */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)');
  var DRIFT = 22; // px each way

  function headerBottom() {
    var h = document.querySelector('.hoa-header');
    if (!h) return 0;
    var r = h.getBoundingClientRect();
    return r.bottom > 0 ? r.bottom : 0;
  }

  function init(root) {
    if (root.__at) return;
    root.__at = true;
    root.classList.add('at--js');

    var grid = root.querySelector('[data-at-grid]');
    var cards = root.querySelectorAll('[data-at-card]');
    if (!grid) return;

    new IntersectionObserver(function (entries, io) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        root.classList.add('is-in');
        io.disconnect();
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }).observe(grid);

    if (reduce) return;
    root.classList.add('at--fade');

    var drift = root.hasAttribute('data-at-drift');
    var cols = [];   // column index per card, measured from layout
    var raf = 0, visible = false;

    function measure() {
      var left = grid.getBoundingClientRect().left;
      var w = grid.clientWidth / 3;
      cols = Array.prototype.map.call(cards, function (c) {
        c.style.removeProperty('--at-y');
        return Math.round((c.getBoundingClientRect().left - left) / w);
      });
    }

    function frame() {
      raf = 0;
      var r = grid.getBoundingClientRect();
      root.style.setProperty('--at-cut', Math.round(headerBottom() - r.top) + 'px');

      if (!drift) return;
      if (!desktop.matches) {
        for (var k = 0; k < cards.length; k++) cards[k].style.removeProperty('--at-y');
        return;
      }
      // -1 when the grid enters at the bottom, +1 when it leaves at the top
      var vh = window.innerHeight;
      var p = Math.max(-1, Math.min(1, ((vh - r.top) / (vh + r.height)) * 2 - 1));
      for (var i = 0; i < cards.length; i++) {
        var dir = cols[i] === 1 ? 1 : -1;
        cards[i].style.setProperty('--at-y', (p * DRIFT * dir).toFixed(1) + 'px');
      }
    }
    function request() { if (visible && !raf) raf = requestAnimationFrame(frame); }

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) request();
    }, { rootMargin: '120px 0px' }).observe(root);

    measure();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', function () { measure(); request(); });
    request();
  }

  function boot() { document.querySelectorAll('[data-at]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('shopify:section:load', boot);
})();
