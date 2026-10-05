/* House of Agha · Shop page head: crossfades the background photos
   (sections/hoa-shop-hero.liquid, [data-hoa-shop-slides]) every data-interval seconds.
   Pauses while the tab is hidden or the head is off screen; holds still with reduced motion. */
(function () {
  'use strict';
  var box = document.querySelector('[data-hoa-shop-slides]');
  if (!box || box._hoaSlides) return;
  box._hoaSlides = true;
  var slides = Array.prototype.slice.call(box.querySelectorAll('.hoa-shop-head__slide'));
  if (slides.length < 2) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var every = Math.max(2, parseFloat(box.getAttribute('data-interval')) || 5) * 1000;
  var idx = 0;
  var timer = null;
  var visible = true;

  // Load the next photo ahead of time so each change is a clean crossfade
  function warm(i) {
    var img = slides[i].querySelector('img');
    if (img && img.loading === 'lazy') img.loading = 'eager';
  }

  function next() {
    var n = (idx + 1) % slides.length;
    var img = slides[n].querySelector('img');
    // wait for the photo if it is still loading, rather than fading in a blank
    if (img && !img.complete) { img.addEventListener('load', next, { once: true }); return; }
    slides[idx].classList.remove('is-on');
    slides[n].classList.add('is-on');
    idx = n;
    warm((idx + 1) % slides.length);
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (visible && !document.hidden) timer = setTimeout(next, every);
  }

  warm(1);
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(box);
  }
  schedule();
})();
