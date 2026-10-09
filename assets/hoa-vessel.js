/* ==========================================================================
   HOUSE OF AGHA — THE VESSEL (home "The House", sections/hoa-manifesto.liquid)
   One fragrance, Agha Blue. The section pins. Scroll condenses the ice cave into the real
   bottle: the silhouette mask (hoa-vessel-mask.png, 430 × 1104 units) shrinks from "the
   body covers the screen" to the slot on a geometric scale so the zoom feels even, the
   bottle photo fades in over it and the cave keeps glowing through its glass, with
   caustics, a reflection on still water and a cold halo arriving at the end (CSS).
   On the way the statement wakes word by word (it is rendered twice, ink below and white
   masked to the silhouette above, so its colour follows the glass edge exactly).
   Writes CSS vars only (hoa-vessel.css); no GSAP. Lenis scrolls the window, so plain
   scroll events are enough. Reduced motion: no pin, the finished bottle.
   ========================================================================== */
(function () {
  'use strict';

  // the silhouette, in the cut-out's own pixels (all bottles share it)
  var FW = 430, FH = 1104;
  var BODY = { x0: 13, x1: 417, y0: 330, y1: 1087 };
  var CREST_Y = 470;                                  // the printed crest, where the 3D logo lands
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function span(v, a, b) { return clamp01((v - a) / (b - a)); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  // wrap each word of the statement in a span, keeping <em> and the underlined place
  function splitWords(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'hoa-vessel__w';
            w.textContent = part;
            frag.appendChild(w);
            out.push(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(el);
    return out;
  }

  function Vessel(sec) {
    var track = sec.querySelector('[data-vessel-track]');
    var stage = sec.querySelector('[data-vessel-stage]');
    var layout = sec.querySelector('[data-vessel-layout]') || sec;     // the ink copy (the white one is a mirror)
    var slot = layout.querySelector('[data-vessel-slot]');
    var seal = sec.querySelector('[data-vessel-seal]');
    var words = Array.prototype.slice.call(sec.querySelectorAll('[data-vessel-words]'));
    var sceneImg = sec.querySelector('.hoa-vessel__scene img');
    if (!track || !stage || !slot) return null;

    var live = !reduceMotion;
    // one list per copy (ink + white), woken together
    var wordSets = live ? words.map(splitWords) : [];
    var geo = null, raf = 0, closed = null;
    var style = sec.style;

    function rel(r, st) { return { x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height }; }

    function measure() {
      var st = stage.getBoundingClientRect();
      var sl = rel(slot.getBoundingClientRect(), st);
      var w = st.width, h = st.height;
      var uf = sl.h / FH;
      geo = {
        w: w, h: h, sl: sl, uf: uf,
        u0: Math.max(1.25 * w / (BODY.x1 - BODY.x0), 1.25 * h / (BODY.y1 - BODY.y0)),
        run: Math.max(1, track.offsetHeight - h)
      };
      // finished-bottle boxes: floor shadow, halo
      style.setProperty('--bx', (sl.x + BODY.x0 * uf).toFixed(1) + 'px');
      style.setProperty('--bw', ((BODY.x1 - BODY.x0) * uf).toFixed(1) + 'px');
      style.setProperty('--bb', (sl.y + BODY.y1 * uf).toFixed(1) + 'px');
      // the photo at its own ratio, covering a box 140% of the stage; condensed, it is
      // just taller than the bottle's body
      var ar = sceneImg && sceneImg.naturalWidth ? sceneImg.naturalWidth / sceneImg.naturalHeight : 16 / 9;
      var iw = Math.max(w * 1.4, h * ar), ih = iw / ar;
      style.setProperty('--iw', iw.toFixed(1) + 'px');
      style.setProperty('--ih', ih.toFixed(1) + 'px');
      style.setProperty('--ks', Math.min(1, (BODY.y1 - BODY.y0) * uf * 1.12 / ih).toFixed(4));
      // the 3D logo lands on the printed crest, at the end of the pin
      if (seal) {
        seal.style.transform = 'translate3d(' + (sl.x + sl.w / 2).toFixed(1) + 'px,' + (geo.run + sl.y + CREST_Y * uf).toFixed(1) + 'px,0)';
        seal.dataset.size = Math.round(Math.min(sl.w * 0.55, 120));
      }
    }

    function progress() {
      if (!live) return 1;
      return clamp01(-track.getBoundingClientRect().top / geo.run);
    }

    function paint() {
      raf = 0;
      if (!geo) measure();
      var p = progress();
      var e = live ? easeInOut(span(p, 0.1, 0.8)) : 1;
      var u = geo.u0 * Math.pow(geo.uf / geo.u0, e);
      var bodyCy = (BODY.y0 + BODY.y1) / 2;
      var ay = bodyCy + (FH / 2 - bodyCy) * e;            // body centre → bottle centre
      var tx = geo.w / 2 + (geo.sl.x + geo.sl.w / 2 - geo.w / 2) * e;
      var ty = geo.h / 2 + (geo.sl.y + geo.sl.h / 2 - geo.h / 2) * e;
      var mx = tx - (FW / 2) * u, my = ty - ay * u;
      style.setProperty('--u', u.toFixed(5));
      style.setProperty('--mw', (FW * u).toFixed(2) + 'px');
      style.setProperty('--mh', (FH * u).toFixed(2) + 'px');
      style.setProperty('--mx', mx.toFixed(2) + 'px');
      style.setProperty('--my', my.toFixed(2) + 'px');
      style.setProperty('--pe', e.toFixed(4));
      style.setProperty('--pc', live ? smooth(span(p, 0.74, 0.97)).toFixed(4) : '1');

      // words wake one by one through the first two thirds of the pin
      wordSets.forEach(function (set) {
        var pw = span(p, 0.0, 0.62) * (set.length + 2);
        for (var i = 0; i < set.length; i++) set[i].style.setProperty('--w', clamp01(pw - i).toFixed(2));
      });

      sec.classList.toggle('is-near', e > 0.38);
      var isClosed = !live || p > 0.9;
      if (isClosed !== closed) {
        closed = isClosed;
        sec.classList.toggle('is-closed', closed);
      }
      sec.classList.add('is-ready');
    }
    function request() { if (!raf) raf = requestAnimationFrame(paint); }

    function onResize() { measure(); request(); }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    if (sceneImg && !sceneImg.complete) sceneImg.addEventListener('load', onResize, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

    measure();
    paint();
    return { refresh: onResize };
  }

  window.HOAVessel = window.HOAVessel || {};

  function init() {
    var sec = document.querySelector('[data-hoa-vessel]');
    if (!sec || sec._vessel) return;
    sec._vessel = Vessel(sec);
    window.HOAVessel.refresh = sec._vessel ? sec._vessel.refresh : function () {};
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', function (e) {
    if (e.target && e.target.querySelector('[data-hoa-vessel]')) init();
  });
})();
