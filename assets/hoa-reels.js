/* ==========================================================================
   HOUSE OF AGHA — SHOPPABLE FILMS
   sections/hoa-reels.liquid

   Carousel: a native scroll-snap track (touch momentum, no scrollbar). The
   arrows and mouse-drag release use a short GSAP tween of scrollLeft; snapping
   is switched off while a tween runs so the two never fight.

   Video: each <video> carries data-src/data-src-webm and preload="none".
   Sources attach only once a card is within ~one card of the visible track.
   A film plays when it is visible in the carousel AND on the page, and pauses
   otherwise, so at most a handful ever run. Sound is opt-in per card and only
   one card can be unmuted at a time.

   Cart: the bag button is a real Shopify product form. It is enhanced to post
   to /cart/add.js and open the theme's bag drawer (mirrors assets/pdp.js);
   if JS fails the native form post still works.

   Motion: GSAP entrance stagger only, skipped under prefers-reduced-motion
   (films also do not autoplay then; the visitor presses play).
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-reels]';
  var instances = new WeakMap();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = function () { return typeof AghaStore !== 'undefined' ? AghaStore : window.AghaStore; };

  function attachSources(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = 'true';
    if (video.dataset.srcWebm) {
      var webm = document.createElement('source');
      webm.src = video.dataset.srcWebm;
      webm.type = 'video/webm';
      video.appendChild(webm);
    }
    if (video.dataset.src) {
      var mp4 = document.createElement('source');
      mp4.src = video.dataset.src;
      mp4.type = 'video/mp4';
      video.appendChild(mp4);
    }
    video.load();
  }

  /* ---------------- Videos ---------------- */
  function initVideos(root, track) {
    var reels = Array.prototype.slice.call(root.querySelectorAll('[data-hoa-reel]'));
    var state = new Map(); // reel -> { video, near, inTrack, inPage, userPaused }
    var cleanups = [];
    var liveEl = root.querySelector('[data-hoa-reels-live]');

    function setPlaying(reel, playing) {
      reel.classList.toggle('is-playing', playing);
      var btn = reel.querySelector('[data-hoa-reel-play]');
      if (btn) btn.setAttribute('aria-label', playing ? 'Pause film' : 'Play film');
    }

    function sync(reel) {
      var st = state.get(reel);
      if (!st) return;
      var video = st.video;
      if (st.near) attachSources(video);
      var shouldPlay = st.inTrack && st.inPage && !st.userPaused && !reduceMotion;
      if (shouldPlay && video.paused) {
        attachSources(video);
        var req = video.play();
        if (req && req.catch) req.catch(function () { setPlaying(reel, false); });
      } else if (!shouldPlay && !video.paused) {
        video.pause();
      }
    }

    reels.forEach(function (reel) {
      var video = reel.querySelector('[data-hoa-reel-video]');
      if (!video) return;
      var st = { video: video, near: false, inTrack: false, inPage: false, userPaused: reduceMotion };
      state.set(reel, st);

      var onPlaying = function () { setPlaying(reel, true); };
      var onPause = function () { setPlaying(reel, false); };
      video.addEventListener('playing', onPlaying);
      video.addEventListener('pause', onPause);
      cleanups.push(function () {
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('pause', onPause);
      });

      var playBtn = reel.querySelector('[data-hoa-reel-play]');
      if (playBtn) {
        var onPlayBtn = function () {
          if (video.paused) { st.userPaused = false; st.inTrack = st.inPage = true; sync(reel); }
          else { st.userPaused = true; video.pause(); }
        };
        playBtn.addEventListener('click', onPlayBtn);
        cleanups.push(function () { playBtn.removeEventListener('click', onPlayBtn); });
      }

      var soundBtn = reel.querySelector('[data-hoa-reel-sound]');
      if (soundBtn) {
        var onSound = function () {
          var turningOn = video.muted;
          state.forEach(function (other, otherReel) {
            other.video.muted = true;
            var b = otherReel.querySelector('[data-hoa-reel-sound]');
            if (b) { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Turn sound on'); }
            otherReel.classList.remove('has-sound');
          });
          if (turningOn) {
            video.muted = false;
            soundBtn.setAttribute('aria-pressed', 'true');
            soundBtn.setAttribute('aria-label', 'Turn sound off');
            reel.classList.add('has-sound');
            if (video.paused) { st.userPaused = false; st.inTrack = st.inPage = true; sync(reel); }
          }
        };
        soundBtn.addEventListener('click', onSound);
        cleanups.push(function () { soundBtn.removeEventListener('click', onSound); });
      }
    });

    if (!state.size) return function () {};

    if ('IntersectionObserver' in window) {
      // Horizontal: visible inside the carousel viewport.
      var ioTrack = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var st = state.get(e.target);
          if (!st) return;
          st.inTrack = e.isIntersecting && e.intersectionRatio >= 0.6;
          sync(e.target);
        });
      }, { root: track, threshold: [0, 0.6] });
      // Preload: within roughly one card either side of the carousel.
      var ioNear = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var st = state.get(e.target);
          if (!st) return;
          st.near = e.isIntersecting;
          sync(e.target);
        });
      }, { root: track, rootMargin: '0px 320px 0px 320px', threshold: 0 });
      // Vertical: visible on the page.
      var ioPage = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var st = state.get(e.target);
          if (!st) return;
          st.inPage = e.isIntersecting && e.intersectionRatio >= 0.4;
          sync(e.target);
        });
      }, { threshold: [0, 0.4] });

      state.forEach(function (st, reel) { ioTrack.observe(reel); ioNear.observe(reel); ioPage.observe(reel); });
      cleanups.push(function () { ioTrack.disconnect(); ioNear.disconnect(); ioPage.disconnect(); });
    }

    var onVis = function () {
      if (document.hidden) state.forEach(function (st) { if (!st.video.paused) st.video.pause(); });
      else state.forEach(function (st, reel) { sync(reel); });
    };
    document.addEventListener('visibilitychange', onVis);
    cleanups.push(function () { document.removeEventListener('visibilitychange', onVis); });

    return function destroy() {
      cleanups.forEach(function (fn) { fn(); });
      state.forEach(function (st) { st.video.pause(); });
    };
  }

  /* ---------------- Carousel ---------------- */
  function initCarousel(root, track) {
    var prev = root.querySelector('[data-hoa-reels-prev]');
    var next = root.querySelector('[data-hoa-reels-next]');
    var cleanups = [];
    var tween = null;

    function cardStep() {
      var card = track.querySelector('[data-hoa-reel]');
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function scrollToX(x) {
      var max = track.scrollWidth - track.clientWidth;
      x = Math.max(0, Math.min(max, x));
      if (tween) tween.kill();
      if (reduceMotion || typeof window.gsap === 'undefined') { track.scrollLeft = x; return; }
      track.classList.add('is-tweening');
      tween = gsap.to(track, {
        scrollLeft: x, duration: 0.85, ease: 'power3.inOut',
        onComplete: function () { track.classList.remove('is-tweening'); tween = null; },
        onInterrupt: function () { track.classList.remove('is-tweening'); }
      });
    }

    function nearestIndexX() {
      var step = cardStep();
      return Math.round(track.scrollLeft / step) * step;
    }

    function updateArrows() {
      var max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
      var hidden = max <= 2;
      var nav = root.querySelector('.hoa-reels__arrows');
      if (nav) nav.hidden = hidden;
    }

    var raf = 0;
    var onScroll = function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; updateArrows(); });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateArrows);
    cleanups.push(function () {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateArrows);
      if (raf) cancelAnimationFrame(raf);
    });

    var onPrev = function () { scrollToX(nearestIndexX() - cardStep() * (window.innerWidth > 1100 ? 2 : 1)); };
    var onNext = function () { scrollToX(nearestIndexX() + cardStep() * (window.innerWidth > 1100 ? 2 : 1)); };
    if (prev) prev.addEventListener('click', onPrev);
    if (next) next.addEventListener('click', onNext);
    cleanups.push(function () {
      if (prev) prev.removeEventListener('click', onPrev);
      if (next) next.removeEventListener('click', onNext);
    });

    var onKey = function (e) {
      if (e.target !== track) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
    };
    track.addEventListener('keydown', onKey);
    cleanups.push(function () { track.removeEventListener('keydown', onKey); });

    // Mouse drag (touch and pen already scroll natively).
    var drag = null;
    var moved = false;
    var onDown = function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.target.closest('button, input, form')) return;
      if (tween) tween.kill();
      drag = { x: e.clientX, left: track.scrollLeft };
      moved = false;
    };
    var onMove = function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
      if (moved) track.scrollLeft = drag.left - dx;
    };
    var onUp = function () {
      if (!drag) return;
      var wasMoved = moved;
      drag = null;
      if (wasMoved) {
        track.classList.remove('is-dragging');
        scrollToX(nearestIndexX());
      }
    };
    var onClickCapture = function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    };
    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
    track.addEventListener('click', onClickCapture, true);
    cleanups.push(function () {
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
      track.removeEventListener('pointercancel', onUp);
      track.removeEventListener('click', onClickCapture, true);
    });

    updateArrows();
    return function destroy() {
      if (tween) tween.kill();
      cleanups.forEach(function (fn) { fn(); });
    };
  }

  /* ---------------- Add to bag ---------------- */
  function initCart(root) {
    var live = root.querySelector('[data-hoa-reels-live]');
    var onSubmit = function (e) {
      var form = e.target.closest && e.target.closest('.hoa-reel__form');
      if (!form || !root.contains(form)) return;
      var btn = form.querySelector('.hoa-reel__add');
      if (!btn || !window.fetch) return; // native post as the fallback
      e.preventDefault();
      if (btn.classList.contains('is-loading')) return;
      btn.classList.add('is-loading');
      var rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

      fetch(rootUrl + 'cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: new FormData(form)
      }).then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (err) { throw new Error(err.description || 'We couldn’t add this to your bag.'); });
        btn.classList.remove('is-loading');
        btn.classList.add('is-added');
        if (live) live.textContent = (btn.dataset.title || 'Fragrance') + ' added to your bag';
        var bag = store();
        if (bag) {
          bag.cart.push({
            id: btn.dataset.title + '-' + Date.now(),
            title: btn.dataset.title,
            price: btn.dataset.price,
            image: btn.dataset.image,
            size: btn.dataset.size
          });
          bag.updateCartUI();
          setTimeout(function () { bag.toggleCartDrawer(true); }, 350);
        }
        setTimeout(function () { btn.classList.remove('is-added'); }, 2200);
      }).catch(function (err) {
        btn.classList.remove('is-loading');
        var bag = store();
        if (bag && bag.showToast) bag.showToast(err.message);
        else if (live) live.textContent = err.message;
      });
    };
    root.addEventListener('submit', onSubmit);
    return function destroy() { root.removeEventListener('submit', onSubmit); };
  }

  /* ---------------- Motion ---------------- */
  function initMotion(root) {
    if (reduceMotion || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return null;
    gsap.registerPlugin(ScrollTrigger);
    var cards = root.querySelectorAll('[data-hoa-reel]');
    if (!cards.length) return null;
    return gsap.context(function () {
      gsap.set(cards, { autoAlpha: 0, y: 44 });
      ScrollTrigger.batch(cards, {
        start: 'top 92%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true });
        }
      });
    }, root);
  }

  /* ---------------- Lifecycle ---------------- */
  function init(root) {
    if (!root || instances.has(root)) return;
    var track = root.querySelector('[data-hoa-reels-track]');
    if (!track) return;
    instances.set(root, {
      videos: initVideos(root, track),
      carousel: initCarousel(root, track),
      cart: initCart(root),
      motion: initMotion(root)
    });
  }

  function destroy(root) {
    var inst = instances.get(root);
    if (!inst) return;
    ['videos', 'carousel', 'cart'].forEach(function (k) { if (inst[k]) inst[k](); });
    if (inst.motion) inst.motion.revert();
    instances.delete(root);
  }

  function initAll() { document.querySelectorAll(SELECTOR).forEach(init); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  var fromEvent = function (e) {
    var t = e.target;
    return t && t.matches && t.matches(SELECTOR) ? t : t && t.querySelector ? t.querySelector(SELECTOR) : null;
  };
  document.addEventListener('shopify:section:load', function (e) { var el = fromEvent(e); if (el) init(el); });
  document.addEventListener('shopify:section:unload', function (e) { var el = fromEvent(e); if (el) destroy(el); });
})();
