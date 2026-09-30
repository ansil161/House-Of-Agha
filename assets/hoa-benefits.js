/* House of Agha · PDP benefits marquee (sections/hoa-fragrance-benefits.liquid)
   The benefit list is repeated until one group is wider than the screen, then that group is
   duplicated once; the track slides left by exactly one group width and repeats, so the loop has
   no seam or gap. GSAP drives it when the page has GSAP (hover eases the speed down), otherwise a
   CSS transform animation does (hover pauses). It stops while off screen. With reduced motion it
   doesn't move and nothing is duplicated: the row is simply scrollable. */
(function () {
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(root) {
    if (root.dataset.bnfReady) return;
    root.dataset.bnfReady = '1';
    var viewport = root.querySelector('[data-hoa-bnf-viewport]');
    var track = root.querySelector('[data-hoa-bnf-track]');
    if (!viewport || !track) return;
    var originals = Array.prototype.slice.call(track.children);
    if (!originals.length) return;

    reveal(root);
    if (REDUCED) return;

    var baseDuration = Math.max(10, +root.dataset.duration || 42);
    var hover = root.dataset.hover || 'slow';
    var tween = null, visible = true, lastWidth = 0;

    function clear() {
      Array.prototype.slice.call(track.querySelectorAll('[data-hoa-bnf-clone]')).forEach(function (n) { n.remove(); });
    }
    function clone(node) {
      var c = node.cloneNode(true);
      c.setAttribute('data-hoa-bnf-clone', '');
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('data-shopify-editor-block');
      return c;
    }

    function build() {
      var vw = viewport.clientWidth;
      if (!vw || vw === lastWidth) return;
      lastWidth = vw;
      if (tween) { tween.kill(); tween = null; }
      track.style.transform = '';
      clear();

      // 1) one group at least as wide as the screen
      var setWidth = track.scrollWidth, copies = 1;
      if (!setWidth) return;
      while (setWidth * copies < vw) {
        originals.forEach(function (n) { track.appendChild(clone(n)); });
        copies++;
      }
      // 2) the group twice, so sliding one group width lands on an identical frame
      var group = Array.prototype.slice.call(track.children);
      group.forEach(function (n) { track.appendChild(clone(n)); });
      // exact (sub-pixel) distance between the two identical groups: scrollWidth rounds, which shows as a twitch
      var groupWidth = track.children[group.length].getBoundingClientRect().left - track.children[0].getBoundingClientRect().left;

      var duration = baseDuration * copies; // same reading speed however many copies were needed
      if (window.gsap) {
        root.classList.remove('is-css');
        tween = window.gsap.fromTo(track, { x: 0 }, { x: -groupWidth, duration: duration, ease: 'none', repeat: -1, paused: !visible });
      } else {
        root.classList.add('is-css');
        root.style.setProperty('--bnf-shift', -groupWidth + 'px');
        root.style.setProperty('--bnf-duration', duration + 's');
      }
    }

    function setSpeed(scale) {
      if (tween) window.gsap.to(tween, { timeScale: scale, duration: 0.7, ease: 'power2.out', overwrite: true });
      else root.classList.toggle('is-paused', scale < 1);
    }
    if (hover !== 'none' && window.matchMedia && matchMedia('(hover: hover)').matches) {
      var slow = hover === 'pause' ? 0.0001 : 0.3;
      root.addEventListener('mouseenter', function () { setSpeed(slow); });
      root.addEventListener('mouseleave', function () { setSpeed(1); });
    }

    // Only animate while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        root.classList.toggle('is-offscreen', !visible);
        if (tween) { if (visible) tween.play(); else tween.pause(); }
      }).observe(root);
    }

    var t = null;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 200); }, { passive: true });
    // Web fonts change item widths: rebuild once they are ready
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastWidth = 0; build(); });
    build();
  }

  // Subtle entrance (opacity + 8px) the first time the strip is seen. Always ends visible.
  function reveal(root) {
    if (REDUCED || !('IntersectionObserver' in window)) return;
    root.classList.add('is-armed');
    var show = function () { root.classList.add('is-in'); };
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { show(); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(root);
    setTimeout(show, 4000); // never leave it hidden
  }

  function initAll() { document.querySelectorAll('[data-hoa-bnf]').forEach(init); }
  window.HOA_BNF = { init: initAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
})();
