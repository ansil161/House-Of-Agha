/* ==========================================================================
   HOUSE OF AGHA · ABOUT 05 · PHILOSOPHY · "MORE THAN JUST FRAGRANCE" (2026-10-13)
   sections/hoa-about-philosophy.liquid, styles in assets/hoa-philosophy.css.
   Ordinary scroll: nothing pinned, nothing hijacked. Each move runs once unless noted.
     Header ..... eyebrow, headline lines, the short line and the link rise and fade in
                  (staggered).
     Photos ..... round crops open from their centre (circle mask), the others and the
                  bottle rise into their shape (inset mask). Phones: a plain fade.
     Bottle ..... drifts a few percent inside its capsule while the section passes (scrub,
                  700px+ only).
     Stories .... number, title and copy follow their photo in a short stagger.
     Film ....... the centre pour film loops while on screen, SOUND ON by default (from the
                  visitor's first click/tap/key if the browser needs one); the speaker button
                  mutes / unmutes; reduced motion keeps its poster frame.
   No GSAP or prefers-reduced-motion: everything is simply shown. Start states are only ever set here, never in CSS.
   ========================================================================== */
(function () {
  'use strict';

  var ctx = null, mm = null;

  function init() {
    var root = document.querySelector('[data-hoa-ph]');
    if (!root) return;
    var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var stories = Array.prototype.slice.call(root.querySelectorAll('[data-hoa-ph-story]'));

    // the pour film. SOUND ON by default (client, 2026-10-13). Browsers only allow sound after
    // the visitor has clicked / tapped / pressed a key on the page, so: try to play with sound;
    // if the browser refuses, play muted and switch the sound on at the first such gesture.
    // The speaker button mutes / unmutes; once the visitor mutes, it stays muted.
    // Reduced motion: no autoplay, poster frame only. Paused while off screen.
    var video = root.querySelector('[data-hoa-ph-video]');
    var sound = root.querySelector('[data-hoa-ph-sound]');
    var offs = [];
    if (video) {
      var wantSound = true;                                // until the visitor mutes it
      var showState = function () {
        if (!sound) return;
        var on = !video.muted;
        sound.setAttribute('aria-pressed', on ? 'true' : 'false');
        sound.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
      };
      var start = function () {
        video.muted = !wantSound;
        var p = video.play();
        if (p && p.catch) p.catch(function () {            // sound refused: play muted for now
          video.muted = true;
          showState();
          var q = video.play(); if (q && q.catch) q.catch(function () {});
        });
        showState();
      };
      // first gesture anywhere on the page: the sound may now play
      var onGesture = function () {
        if (!wantSound || !video.muted) return;
        video.muted = false;
        if (!video.paused || visible) { var p = video.play(); if (p && p.catch) p.catch(function () { video.muted = true; showState(); }); }
        showState();
      };
      ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { document.addEventListener(t, onGesture, { passive: true }); });
      offs.push(function () { ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { document.removeEventListener(t, onGesture); }); });

      var visible = false;
      if (reduce) { video.removeAttribute('autoplay'); video.pause(); }
      else if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else video.pause(); });
        }, { rootMargin: '100px' });
        io.observe(video);
        offs.push(function () { io.disconnect(); });
      } else start();

      if (sound) {
        sound.hidden = false;
        sound.addEventListener('click', function (e) {
          e.stopPropagation();                               // this click is the choice, not the "first gesture"
          wantSound = video.muted;                           // muted -> turn on; playing sound -> turn off
          video.muted = !wantSound;
          if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
          showState();
        });
      }
      showState();
    }
    root._hoaPhOff = function () { offs.forEach(function (f) { f(); }); };

    if (!hasGsap || reduce) return;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    ctx = gsap.context(function () {
      var ins = root.querySelectorAll('[data-hoa-ph-in]');
      var bottle = root.querySelector('[data-hoa-ph-bottle]');
      var drift = root.querySelector('[data-hoa-ph-drift]');

      // header: rise in
      gsap.from(ins, { y: 22, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, clearProps: 'transform,opacity',
        scrollTrigger: { trigger: root, start: 'top 80%', once: true } });

      mm = gsap.matchMedia();

      // tablets and up: shaped masks and the bottle's drift
      mm.add('(min-width: 700px)', function () {
        root.querySelectorAll('[data-hoa-ph-mask]').forEach(function (m) {
          var circle = m.getAttribute('data-hoa-ph-mask') === 'circle';
          var img = m.querySelector('img');
          var story = m.closest('[data-hoa-ph-story]');
          var tl = gsap.timeline({ scrollTrigger: { trigger: m, start: 'top 85%', once: true } });
          tl.fromTo(m, { clipPath: circle ? 'circle(0% at 50% 50%)' : 'inset(100% 0% 0% 0%)' },
            { clipPath: circle ? 'circle(71% at 50% 50%)' : 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' }, 0);
          if (img) tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' }, 0.1);
          var text = story && story.querySelector('[data-hoa-ph-text]');
          if (text) tl.from(text.children, { y: 18, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform,opacity' }, 0.45);
        });
        if (drift && bottle) {
          gsap.fromTo(drift, { yPercent: -4 }, { yPercent: 4, ease: 'none',
            scrollTrigger: { trigger: bottle, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
        }
      });

      // phones: plain fades, no clipping or drift
      mm.add('(max-width: 699px)', function () {
        stories.concat(bottle ? [bottle] : []).forEach(function (el) {
          gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });
      });
    }, root);
  }

  function destroy() {
    var root = document.querySelector('[data-hoa-ph]');
    if (root && root._hoaPhOff) { root._hoaPhOff(); root._hoaPhOff = null; }
    if (mm) { mm.revert(); mm = null; }
    if (ctx) { ctx.revert(); ctx = null; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('shopify:section:load', function (e) { if (e.target.querySelector('[data-hoa-ph]')) { destroy(); init(); } });
  document.addEventListener('shopify:section:unload', function (e) { if (e.target.querySelector('[data-hoa-ph]')) destroy(); });
})();
