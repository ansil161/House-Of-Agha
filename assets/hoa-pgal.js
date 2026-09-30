/* House of Agha · PDP campaign gallery (sections/hoa-pdp-gallery.liquid)
   Every `data-interval` seconds the row slides one photo left; after the last photo
   it glides back to the first. It keeps going under the mouse (user request); it only
   holds while a finger is on it and while off screen. With reduced motion it still
   advances on the timer, but jumps instead of gliding. */
(function () {
  function init(root) {
    if (root.dataset.pgalReady) return;
    root.dataset.pgalReady = '1';
    var vp = root.querySelector('[data-hoa-pgal-viewport]');
    if (!vp) return;
    var items = vp.querySelectorAll('.hoa-pgal__item');
    if (items.length < 2) return;
    var how = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    var delay = Math.max(2, +root.dataset.interval || 3) * 1000;
    var held = false, visible = true, timer = null;

    function next() {
      var max = vp.scrollWidth - vp.clientWidth;
      if (vp.scrollLeft >= max - 4) { vp.scrollTo({ left: 0, behavior: how }); return; }
      var base = items[0].offsetLeft;
      for (var i = 0; i < items.length; i++) {
        var x = items[i].offsetLeft - base;
        if (x > vp.scrollLeft + 4) { vp.scrollTo({ left: Math.min(x, max), behavior: how }); return; }
      }
    }
    function stop() { clearInterval(timer); timer = null; }
    function start() { stop(); if (!held && visible && !document.hidden) timer = setInterval(next, delay); }

    vp.addEventListener('touchstart', function () { held = true; stop(); }, { passive: true });
    vp.addEventListener('touchend', function () { held = false; start(); }, { passive: true });
    document.addEventListener('visibilitychange', start);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }, { threshold: 0.25 }).observe(root);
    }
    start();
  }
  function boot() { document.querySelectorAll('[data-hoa-pgal]').forEach(init); }
  window.HOA_PGAL = { init: boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
