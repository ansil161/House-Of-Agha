/* PDP editorial sections (Why we are better, Review summary).
   Adds .is-in when a section scrolls into view; CSS does the animating. The rating number counts up.
   Self-contained: no dependency on pdp.js or GSAP, and a no-op when reduced motion is requested
   (CSS only hides things under .pdx-js, which is only set when motion is allowed). */
(() => {
  if (window.__pdxEditorial) return;
  window.__pdxEditorial = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const countUp = (el) => {
    const target = parseFloat(el.dataset.pdxCount);
    if (!isFinite(target) || reduce.matches) return;
    const dec = (el.dataset.pdxCount.split('.')[1] || '').length;
    const t0 = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(tick);
  };

  const reveal = (section) => {
    section.classList.add('is-in');
    section.querySelectorAll('[data-pdx-in]').forEach((el) => el.classList.add('is-in'));
    section.querySelectorAll('[data-pdx-count]').forEach(countUp);
  };

  const init = () => {
    const sections = document.querySelectorAll('.pdx:not([data-pdx-ready]), .pdp-craft:not([data-pdx-ready])');
    if (!sections.length) return;
    sections.forEach((s) => s.setAttribute('data-pdx-ready', ''));
    if (reduce.matches || !('IntersectionObserver' in window)) { sections.forEach(reveal); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    sections.forEach((s) => io.observe(s));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Theme editor: re-run when a section is added / re-rendered.
  document.addEventListener('shopify:section:load', init);
})();
