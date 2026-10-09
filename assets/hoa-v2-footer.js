/* House of Agha — Home V2 footer "The Clearing" (sections/hoa-v2-footer.liquid).
   1. Curtain reveal: when the footer fits the viewport on a wide screen (and motion is allowed),
      the wrapper takes the footer's height and the footer is fixed underneath the page, so the
      last section lifts off it. Re-checked on resize (ResizeObserver); otherwise it stays static.
   2. Back to top: uses the page's Lenis instance when there is one. */
(function () {
  if (window.__hoaV2Foot) return;
  window.__hoaV2Foot = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initCurtain(curtain) {
    var foot = curtain.querySelector('[data-v2-foot]');
    if (!foot || reduce) return;
    var fit = function () {
      var h = foot.offsetHeight;
      var on = window.innerWidth >= 900 && h <= window.innerHeight;
      curtain.style.setProperty('--foot-h', h + 'px');
      curtain.classList.toggle('is-reveal', on);
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(foot);
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
  }

  function initTop(foot) {
    var link = foot.querySelector('[data-v2-foot-top]');
    if (!link) return;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.hoaLenis && !reduce) window.hoaLenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var target = document.querySelector('main, [role="main"]') || document.body;   // move focus back up for keyboard users
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  function init() {
    document.querySelectorAll('[data-v2-foot-curtain]').forEach(initCurtain);
    document.querySelectorAll('[data-v2-foot]').forEach(initTop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
