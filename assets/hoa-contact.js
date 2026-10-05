/* House of Agha · Contact page: blocks fade up once as they enter the viewport
   (sections/hoa-contact.liquid, [data-hoa-ct-in]). Without JS everything is simply shown. */
(function () {
  'use strict';
  var root = document.querySelector('.hoa-ct');
  if (!root || root._hoaCt) return;
  root._hoaCt = true;
  var els = root.querySelectorAll('[data-hoa-ct-in]');
  if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  root.classList.add('is-js');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
