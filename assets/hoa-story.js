/* ==========================================================================
   HOUSE OF AGHA — SCROLL STORY (Home + About, 2026-10-07)
   Section entrances after the hero, to the client's reference video (an editorial Framer
   site): each section has its own choreography instead of one fade-up everywhere, some
   played once as the section arrives (~78% of the viewport), some tied to the scroll.

   Runs after hoa-home.js / hoa-about.js (script order in layout/theme.liquid). Elements it
   animates are taken out of the generic CSS reveal ([data-hoa-reveal]) first, so the two
   systems never fight. The hero, the scroll film and the Signature carousel keep their own
   motion; About's pinned Charminar, letters, arches and tile entrances are untouched.
   Only transform, opacity and clip-path are animated. With reduced motion nothing here
   runs and every element shows in place.

   HOME
     The House    plate window opens + photo settles (scrub), small plate trails,
                  label rule draws, principles slide in from the left, mandala grows in
     Collection   heading words rise through a mask (cards: hoa-home.js initCollection)
     Discover     heading words; tiles reveal upward one by one, photos settle, names follow
     Testimonials band widens to full width (scrub); heading words; photo opens (scrub);
                  quote row slides in from the right; rating panel lifts
     World        heading words; tiles open from inset windows in turn; quotes follow
     Reels        heading words (cards: hoa-reels.js initMotion, fan-out / wave)
   ABOUT
     Heritage + Hyderabad copy   words go from faint to ink with the scroll (scrub)
     Philosophy                  each photo settles from a slight zoom (scrub)
     Closing card                widens to full width, photo settles (scrub)
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var isHome = body.classList.contains('hoa-home');
  var isAbout = body.classList.contains('hoa-about');
  if (!isHome && !isAbout) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = null;
  var EASE = 'expo.out';

  function hasGsap() { return typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Take an element out of the CSS reveal (hoa-home.css: [data-hoa-reveal]) so GSAP owns it.
  function claim(el) {
    if (!el) return el;
    el.removeAttribute('data-hoa-reveal');
    el.classList.add('hoa-is-in');
    return el;
  }

  // Masked words: <span class="hs-wm"><span class="hs-w">word</span></span>; keeps child
  // elements (em, strong) and splits inside them. Once per element.
  function maskWords(el) {
    if (el._hsMasked) return el._hsMasked;
    var out = [];
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { if (!n.classList.contains('hoa-sr')) walk(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var m = document.createElement('span'); m.className = 'hs-wm';
          var w = document.createElement('span'); w.className = 'hs-w'; w.textContent = part;
          m.appendChild(w); frag.appendChild(m); out.push(w);
        });
        node.replaceChild(frag, n);
      });
    };
    walk(el);
    el._hsMasked = out;
    return out;
  }

  // Plain word spans (no mask) for the faint-to-ink reading effect.
  function inkWords(el) {
    if (el._hsInk) return el._hsInk;
    var out = [];
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { if (n.tagName !== 'BR' && !n.classList.contains('hoa-sr')) walk(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span'); w.className = 'hs-ink'; w.textContent = part;
          frag.appendChild(w); out.push(w);
        });
        node.replaceChild(frag, n);
      });
    };
    walk(el);
    el._hsInk = out;
    return out;
  }

  function radiusOf(el) { return (el && getComputedStyle(el).borderTopLeftRadius) || '0px'; }

  // A heading whose words rise through a mask, once, as it reaches ~80% of the viewport.
  function riseHeading(h, delay) {
    if (!h) return null;
    claim(h);
    var words = maskWords(h);
    if (!words.length) return null;
    return gsap.from(words, {
      yPercent: 115, duration: 1.15, ease: EASE, stagger: 0.055, delay: delay || 0,
      scrollTrigger: { trigger: h, start: 'top 82%', once: true }
    });
  }

  // Section head label / side copy: a short lift after the heading starts.
  function liftOnce(els, trigger, opts) {
    els = els.filter(Boolean);
    if (!els.length) return;
    els.forEach(claim);
    gsap.from(els, Object.assign({
      y: 22, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: trigger || els[0], start: 'top 84%', once: true }
    }, opts || {}));
  }

  /* ------------------------------------------------------------------ HOME */

  function homeManifesto() {
    var sec = $('[data-hoa-manifesto]');
    if (!sec) return;

    // label: the pill fades, its rule draws from the left
    var meta = claim($('.hoa-manifesto__meta', sec));
    if (meta) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: meta, start: 'top 85%', once: true } });
      tl.from($('.hoa-manifesto__tag', meta), { autoAlpha: 0, x: -14, duration: 0.8, ease: 'power3.out' })
        .from($('.hoa-manifesto__rule', meta), { scaleX: 0, duration: 1.2, ease: 'power2.inOut' }, 0.15);
    }

    // supporting line + button follow the statement
    var foot = claim($('.hoa-manifesto__foot', sec));
    if (foot) gsap.from(foot.children, { y: 18, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: foot, start: 'top 88%', once: true } });

    // principles: each slides in from the left, a beat apart
    var notes = claim($('.hoa-manifesto__notes', sec));
    if (notes) {
      var items = $$('.hoa-manifesto__note', notes);
      gsap.set(items, { transition: 'none' });
      gsap.fromTo(items, { x: -36, autoAlpha: 0 }, {
        x: 0, autoAlpha: 1, duration: 1.1, ease: EASE, stagger: 0.13,
        scrollTrigger: { trigger: notes, start: 'top 88%', once: true }
      });
    }

    // the large plate: its window opens and the photo settles, with the scroll
    var main = claim($('.hoa-manifesto__plate--main', sec));
    if (main) {
      var shell = $('.hoa-manifesto__shell', main);
      var r = radiusOf(shell);
      var st = { trigger: main, start: 'top 92%', end: 'top 30%', scrub: 0.8 };
      // ends past the plate's edges: its shell drifts a few % on its own parallax (data-hoa-speed)
      gsap.fromTo(main, { clipPath: 'inset(14% 12% 14% 12% round ' + r + ')' }, { clipPath: 'inset(-12% -12% -12% -12% round ' + r + ')', ease: 'none', scrollTrigger: st });
      var img = $('.hoa-manifesto__core img', main);
      if (img) gsap.fromTo(img, { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: Object.assign({}, st) });
    }
    // the small plate trails in after it
    var sub = claim($('.hoa-manifesto__plate--sub', sec));
    if (sub) gsap.fromTo(sub, { y: 90, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: sub, start: 'top 100%', end: 'top 55%', scrub: 0.8 } });

    // the mandala grows into place
    var mandala = $('.hoa-manifesto__mandala', sec);
    if (mandala) gsap.fromTo(mandala, { scale: 0.82, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 90%', end: 'top 20%', scrub: 1 } });
  }

  function homeCollection() {
    var sec = $('[data-hoa-collection]');
    if (!sec) return;
    var head = $('.hoa-collection__head', sec);
    liftOnce([$('.hoa-eyebrow', head)], head);
    riseHeading($('.hoa-collection__title', sec), 0.1);
  }

  function homeDiscover() {
    var sec = $('[data-hoa-families]');
    if (!sec) return;
    liftOnce([$('.hoa-eyebrow', sec)], $('.hoa-eyebrow', sec));
    riseHeading($('.hoa-h2', sec), 0.08);
    liftOnce([$('.hoa-section-head__side', sec)], $('.hoa-h2', sec), { delay: 0.35 });

    var tiles = $$('.hoa-family', sec).map(claim);
    if (!tiles.length) return;
    var tl = gsap.timeline({ scrollTrigger: { trigger: tiles[0], start: 'top 80%', once: true } });
    tiles.forEach(function (t, i) {
      var media = $('.hoa-family__media', t);
      var img = media && $('img', media);
      var r = radiusOf(media);
      var at = i * 0.14;
      if (media) tl.fromTo(media, { clipPath: 'inset(100% 0% 0% 0% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', duration: 1.3, ease: 'power3.inOut', clearProps: 'clipPath' }, at);
      if (img) {
        gsap.set(img, { transition: 'none' });
        tl.fromTo(img, { scale: 1.28 }, { scale: 1, duration: 1.6, ease: EASE, clearProps: 'transform,transition' }, at + 0.1);
      }
      var rest = Array.prototype.slice.call(t.children).filter(function (c) { return c !== media; });
      if (rest.length) tl.from(rest, { y: 16, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06 }, at + 0.55);
    });
  }

  function homeVoices() {
    var sec = $('[data-hoa-voices]');
    if (!sec) return;

    // the band widens from an inset panel to full width as it arrives
    gsap.fromTo(sec, { clipPath: 'inset(0% 3.5% 0% 3.5% round 40px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 25%', scrub: 0.6 }
    });

    riseHeading($('.hoa-voices__title', sec));
    var arrows = claim($('.hoa-voices__arrows', sec));
    if (arrows) gsap.from(arrows.children, { scale: 0.6, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.08, scrollTrigger: { trigger: arrows, start: 'top 85%', once: true }, delay: 0.35 });

    var viewport = $('.hoa-voices__viewport', sec);
    if (viewport) gsap.from(viewport, { x: 120, autoAlpha: 0, duration: 1.4, ease: EASE, scrollTrigger: { trigger: viewport, start: 'top 90%', once: true }, delay: 0.2 });

    var visual = claim($('.hoa-voices__visual', sec));
    if (visual) {
      var r = radiusOf(visual);
      var st = { trigger: visual, start: 'top 95%', end: 'top 35%', scrub: 0.8 };
      gsap.fromTo(visual, { clipPath: 'inset(10% 8% 10% 8% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', ease: 'none', scrollTrigger: st });
      $$('.hoa-voices__photo', visual).forEach(function (p) {
        gsap.fromTo(p, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: Object.assign({}, st) });
      });
      var panels = $$('.hoa-voices__score', visual);
      if (panels.length) gsap.from(panels, { y: 40, autoAlpha: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: visual, start: 'top 55%', once: true } });
    }
  }

  function homeWorld() {
    var sec = $('[data-hoa-world]');
    if (!sec) return;
    liftOnce([$('.hoa-eyebrow', sec)], $('.hoa-eyebrow', sec));
    riseHeading($('.hoa-h2', sec), 0.08);
    liftOnce([$('.hoa-section-head__side', sec)], $('.hoa-h2', sec), { delay: 0.35 });

    var tiles = $$('.hoa-tile', sec).map(claim);
    if (tiles.length) {
      var r = radiusOf(tiles[0]);
      gsap.fromTo(tiles, { clipPath: 'inset(16% 14% 16% 14% round ' + r + ')', autoAlpha: 0 }, {
        clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', autoAlpha: 1, duration: 1.5, ease: 'power3.inOut', stagger: 0.15,
        clearProps: 'clipPath',
        scrollTrigger: { trigger: tiles[0], start: 'top 82%', once: true }
      });
    }
    var quotes = $$('.hoa-quote, .hoa-quotes', sec).filter(function (q) { return !q.parentElement.closest('.hoa-quotes'); }).map(claim);
    $$('.hoa-quotes .hoa-quote', sec).forEach(claim);
    if (quotes.length) gsap.from(quotes, { y: 30, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: quotes[0], start: 'top 88%', once: true } });
  }

  function homeReelsHeads() {
    $$('[data-hoa-reels]').forEach(function (root) {
      if (root.classList.contains('hoa-reels--product')) return;
      var head = $('.hoa-reels__head', root) || root;
      var h = $('.hoa-h2', head);
      var intro = h && h.parentNode;
      if (intro && intro.hasAttribute('data-hoa-reveal')) claim(intro);
      var eyebrow = intro && $('.hoa-eyebrow', intro);
      if (eyebrow) gsap.from(eyebrow, { y: 14, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: intro, start: 'top 85%', once: true } });
      riseHeading(h, 0.08);
      var sub = intro && $('.hoa-reels__sub', intro);
      if (sub) gsap.from(sub, { y: 18, autoAlpha: 0, duration: 1, ease: 'power3.out', delay: 0.4, scrollTrigger: { trigger: intro, start: 'top 85%', once: true } });
      var nav = $('.hoa-reels__nav', root);
      if (nav) liftOnce([nav], nav, { delay: 0.3 });
    });
  }

  /* ----------------------------------------------------------------- ABOUT */

  // Copy that reads in: each word goes from faint to ink as the reader scrolls through it.
  function inkRead(el) {
    if (!el) return;
    var words = inkWords(el);
    if (!words.length) return;
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 50%', scrub: 0.6 }
    });
  }

  function aboutStory() {
    inkRead($('.hoa-hc__text'));
    inkRead($('.hoa-ab-hyd__text'));

    // Philosophy photos settle from a slight zoom while they pass
    $$('[data-hoa-bd-tile]').forEach(function (t) {
      var wrap = $('.hoa-bd-tile__img', t);
      if (!wrap) return;
      gsap.fromTo(wrap, { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'top 30%', scrub: 0.8 } });
    });

    // Closing card widens to full width, its photo settles
    var cta = $('[data-hoa-ab-cta]');
    if (cta) {
      var r = radiusOf(cta);
      var st = { trigger: cta, start: 'top bottom', end: 'top 30%', scrub: 0.7 };
      gsap.fromTo(cta, { clipPath: 'inset(4% 5% 4% 5% round ' + r + ')' }, { clipPath: 'inset(0% 0% 0% 0% round ' + r + ')', ease: 'none', scrollTrigger: st });
      var img = $('.hoa-ab-cta__img img', cta);
      if (img) gsap.fromTo(img, { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: Object.assign({}, st) });
    }
  }

  /* ------------------------------------------------------------- lifecycle */
  function init() {
    if (reduceMotion || !hasGsap()) return;
    gsap.registerPlugin(ScrollTrigger);
    ctx = gsap.context(function () {
      if (isHome) {
        homeManifesto();
        homeCollection();
        homeDiscover();
        homeVoices();
        homeWorld();
        homeReelsHeads();
      }
      if (isAbout) aboutStory();
    });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  function destroy() { if (ctx) { ctx.revert(); ctx = null; } }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', function () { destroy(); init(); });
  document.addEventListener('shopify:section:unload', function () { destroy(); });
})();
