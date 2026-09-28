/* ==========================================================================
   HOUSE OF AGHA — MESSAGE STRIP MOTION (sections/hoa-message-strip.liquid)
   The line holds, erases letter by letter, pauses, then types itself back in,
   centred, on one repeating GSAP timeline (so it pauses with the tab and never
   drifts). Without GSAP or with prefers-reduced-motion it stays the full line.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(el) {
    if (el._hoaStripTl) { el._hoaStripTl.kill(); el._hoaStripTl = null; }
    var textEl = el.querySelector('[data-hoa-strip-text]');
    if (!textEl) return;
    var chars = Array.from(el._hoaStripFull || (el._hoaStripFull = textEl.textContent));
    var n = chars.length;
    textEl.textContent = chars.join('');
    el.classList.remove('is-animated', 'is-typing');
    if (reduceMotion || typeof window.gsap === 'undefined' || n < 2) return;

    var typeS = (parseFloat(el.dataset.typeMs) || 90) / 1000;
    var eraseS = typeS * 0.5;                       // erasing runs quicker than typing, as in the reference
    var holdS = (parseFloat(el.dataset.hold) || 2500) / 1000;
    var state = { c: n };
    var shown = n;
    var draw = function () {
      var c = Math.round(state.c);
      if (c === shown) return;
      shown = c;
      textEl.textContent = chars.slice(0, c).join('');
    };
    var busy = function (on) { return function () { el.classList.toggle('is-typing', on); }; };

    el.classList.add('is-animated');
    el._hoaStripTl = gsap.timeline({ repeat: -1 })
      .to(state, { c: 0, duration: n * eraseS, ease: 'none', onUpdate: draw, onStart: busy(true), onComplete: busy(false) }, holdS)
      .to(state, { c: n, duration: n * typeS, ease: 'none', onUpdate: draw, onStart: busy(true), onComplete: busy(false) }, '+=0.45');
  }

  function initAll(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-hoa-strip]'), init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // Theme Editor: re-run when the strip's settings change.
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
