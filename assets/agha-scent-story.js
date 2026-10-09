/* ==========================================================================
   HOUSE OF AGHA — SCENT STORY (sections/agha-scent-story.liquid)
   - Rows reveal once on entering (cards rise, photos settle; phone: the text above them too).
   - Whichever row crosses the middle of the screen becomes the active text block (desktop stack).
   - Closing line reveals line by line.
   - Optional lagging dot cursor, fine pointers only, inside the section.
   IntersectionObserver only, no libraries. Guards itself so several sections can share it.
   ========================================================================== */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(root) {
    if (root.__ss) return;
    root.__ss = true;
    root.classList.add('ss--js');

    var texts = root.querySelectorAll('[data-ss-text]');
    var rows = root.querySelectorAll('[data-ss-row]');
    var close = root.querySelector('[data-ss-close]');
    var active = 0;

    function setActive(i) {
      if (i === active || !texts[i]) return;
      for (var k = 0; k < texts.length; k++) texts[k].classList.remove('is-leaving');
      texts[active].classList.remove('is-active');
      texts[active].classList.add('is-leaving');
      texts[i].classList.add('is-active');
      active = i;
    }

    // one-shot reveals
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        reveal.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    rows.forEach(function (r) { reveal.observe(r); });
    if (close) reveal.observe(close);

    // a zero-height band across the middle of the viewport: the row inside it owns the text
    var centre = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(parseInt(e.target.getAttribute('data-ss-row'), 10) || 0);
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    rows.forEach(function (r) { centre.observe(r); });

    if (root.hasAttribute('data-ss-cursor')) cursor(root);
  }

  function cursor(root) {
    var dot = root.querySelector('[data-ss-dot]');
    if (!dot || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var x = 0, y = 0, cx = 0, cy = 0, s = 1, ts = 1, raf = 0, inside = false;

    function tick() {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      s += (ts - s) * 0.2;
      dot.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0) scale(' + s.toFixed(3) + ')';
      var settled = Math.abs(x - cx) < 0.1 && Math.abs(y - cy) < 0.1 && Math.abs(ts - s) < 0.01;
      raf = settled ? 0 : requestAnimationFrame(tick);
    }
    function wake() { if (!raf) raf = requestAnimationFrame(tick); }

    root.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!inside) { inside = true; cx = x; cy = y; dot.classList.add('is-on'); }
      ts = e.target.closest('a, button, [data-ss-card]') ? 3 : 1;
      wake();
    });
    root.addEventListener('pointerleave', function () { inside = false; dot.classList.remove('is-on'); });
  }

  function boot() { document.querySelectorAll('[data-ss]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  // theme editor: re-init a section after it is re-rendered
  document.addEventListener('shopify:section:load', boot);
})();
