/* ==========================================================================
   HOUSE OF AGHA — INSTAGRAM REELS
   sections/hoa-reels.liquid

   Carousel: a native scroll-snap track (touch momentum, no scrollbar). The
   arrows and mouse-drag release use a short GSAP tween of scrollLeft; snapping
   is switched off while a tween runs so the two never fight.

   Video: each <video> carries data-src/data-src-webm and preload="none".
   Sources attach only once a card is within ~one card of the visible track.
   A film plays when it is visible in the carousel AND on the page, and pauses
   otherwise, so at most a handful ever run. Sound is opt-in per card and only
   one card can be unmuted at a time.

   Motion: GSAP entrance stagger only, skipped under prefers-reduced-motion
   (films also do not autoplay then; the visitor presses play).
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-reels]';
  var instances = new WeakMap();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      if (btn) btn.setAttribute('aria-label', playing ? 'Pause reel' : 'Play reel');
    }

    function sync(reel) {
      var st = state.get(reel);
      if (!st) return;
      var video = st.video;
      if (st.near) attachSources(video);
      var shouldPlay = st.inTrack && st.inPage && !st.userPaused && !st.hold && !reduceMotion;
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

    // The full-screen viewer holds the inline films while it is open
    root._hoaHold = function (on) {
      state.forEach(function (st, reel) { st.hold = on; if (on) st.video.pause(); else sync(reel); });
    };

    if (!state.size) return function () {};

    if ('IntersectionObserver' in window) {
      // A track that does not scroll (single product reel) has nothing to clip against: observe the page instead.
      var ioRoot = track.classList.contains('hoa-reels__track') && getComputedStyle(track).overflowX === 'visible' ? null : track;
      // Horizontal: visible inside the carousel viewport.
      var ioTrack = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var st = state.get(e.target);
          if (!st) return;
          st.inTrack = e.isIntersecting && e.intersectionRatio >= 0.6;
          sync(e.target);
        });
      }, { root: ioRoot, threshold: [0, 0.6] });
      // Preload: within roughly one card either side of the carousel.
      var ioNear = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var st = state.get(e.target);
          if (!st) return;
          st.near = e.isIntersecting;
          sync(e.target);
        });
      }, { root: ioRoot, rootMargin: '0px 320px 0px 320px', threshold: 0 });
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

  /* ---------------- Shop: add to bag + full-screen viewer (product page) ---------------- */
  var isShopify = Boolean(window.Shopify && window.Shopify.routes);

  function addToBag(btn) {
    if (!btn || btn.disabled || btn.getAttribute('aria-busy') === 'true') return;
    var d = btn.dataset;
    var label = btn.querySelector('span') || btn;
    var original = btn._hoaLabel || label.textContent;
    btn._hoaLabel = original;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');

    // Mirror into the theme's bag drawer, as the PDP buy button does
    var mirror = function () {
      if (typeof AghaStore === 'undefined') return;
      if (!isShopify && window.HOA && window.HOA.ready && window.HOA.product(d.handle)) AghaStore.addToCart(window.HOA.makeItem(d.handle));
      else AghaStore.addToCart({ id: d.handle + '-' + Date.now(), handle: d.handle, title: d.title, price: d.price, compare: d.compare, image: d.image, size: 'Eau de Parfum' });
    };
    var finish = function (ok) {
      btn.removeAttribute('aria-busy');
      btn.classList.remove('is-loading');
      if (!ok) return;
      btn.classList.add('is-added');
      label.textContent = 'Added ✓';
      clearTimeout(btn._hoaT);
      btn._hoaT = setTimeout(function () { btn.classList.remove('is-added'); label.textContent = original; }, 1800);
    };

    if (isShopify && d.variant) {
      fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(d.variant), quantity: 1 }] })
      }).then(function (r) {
        if (!r.ok) throw new Error('add failed');
        mirror();
        finish(true);
      }).catch(function () {
        finish(false);
        if (typeof AghaStore !== 'undefined' && AghaStore.showToast) AghaStore.showToast('We could not add this to your bag.');
      });
    } else {
      mirror();
      setTimeout(function () { finish(true); }, 350);
    }
  }
  // One delegated listener serves every card and the viewer's copy of it
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-hoa-reel-add]');
    if (btn) { e.preventDefault(); addToBag(btn); }
  });

  var ICON_PREV = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5L8 12L15 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var ICON_SOUND = '<svg class="hoa-reelview__i-on" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5V14.5H8L13 18.5V5.5L8 9.5H4Z" fill="currentColor"/><path d="M16 9C17.2 10.1 17.2 13.9 16 15M18.6 6.6C21.1 9 21.1 15 18.6 17.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
    '<svg class="hoa-reelview__i-off" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5V14.5H8L13 18.5V5.5L8 9.5H4Z" fill="currentColor"/><path d="M16.5 9.5L21 14.5M21 9.5L16.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  var viewer = null;
  function buildViewer() {
    if (viewer) return viewer;
    var dlg = document.createElement('dialog');
    dlg.className = 'hoa-reelview';
    dlg.setAttribute('aria-label', 'Product film');
    dlg.innerHTML =
      '<div class="hoa-reelview__inner">' +
        '<button type="button" class="hoa-reelview__close" data-rv-close aria-label="Close film">' + ICON_CLOSE + '</button>' +
        '<button type="button" class="hoa-reelview__nav hoa-reelview__nav--prev" data-rv-step="-1" aria-label="Previous film">' + ICON_PREV + '</button>' +
        '<div class="hoa-reelview__col">' +
          '<figure class="hoa-reelview__stage">' +
            '<video class="hoa-reelview__video" data-rv-video playsinline loop preload="auto"></video>' +
            '<button type="button" class="hoa-reelview__toggle" data-rv-toggle aria-label="Pause film"><span class="hoa-reelview__play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5V18.5L19 12L8 5.5Z" fill="currentColor"/></svg></span></button>' +
            '<button type="button" class="hoa-reelview__sound" data-rv-sound aria-pressed="true" aria-label="Mute">' + ICON_SOUND + '</button>' +
            '<span class="hoa-reelview__count" data-rv-count></span>' +
            '<span class="hoa-reelview__bar" aria-hidden="true"><i data-rv-bar></i></span>' +
          '</figure>' +
          '<div class="hoa-reelview__shop" data-rv-shop></div>' +
        '</div>' +
        '<button type="button" class="hoa-reelview__nav hoa-reelview__nav--next" data-rv-step="1" aria-label="Next film">' + ICON_NEXT + '</button>' +
      '</div>';
    document.body.appendChild(dlg);

    var video = dlg.querySelector('[data-rv-video]');
    var shop = dlg.querySelector('[data-rv-shop]');
    var count = dlg.querySelector('[data-rv-count]');
    var bar = dlg.querySelector('[data-rv-bar]');
    var soundBtn = dlg.querySelector('[data-rv-sound]');
    var toggle = dlg.querySelector('[data-rv-toggle]');
    var v = { dlg: dlg, list: [], index: 0, root: null, opener: null, muted: false };

    var setMuted = function (m) {
      v.muted = m;
      video.muted = m;
      soundBtn.setAttribute('aria-pressed', String(!m));
      soundBtn.setAttribute('aria-label', m ? 'Turn sound on' : 'Mute');
      dlg.classList.toggle('is-muted', m);
    };
    var play = function () {
      var req = video.play();
      // Sound-on autoplay can be refused; fall back to muted rather than a frozen frame
      if (req && req.catch) req.catch(function () { setMuted(true); var r2 = video.play(); if (r2 && r2.catch) r2.catch(function () {}); });
    };

    v.show = function (i) {
      var n = v.list.length;
      if (!n) return;
      v.index = (i + n) % n;
      var reel = v.list[v.index];
      var src = reel.querySelector('[data-hoa-reel-video]');
      var poster = reel.querySelector('img');
      video.innerHTML = '';
      if (src && src.dataset.srcWebm) { var w = document.createElement('source'); w.src = src.dataset.srcWebm; w.type = 'video/webm'; video.appendChild(w); }
      if (src && src.dataset.src) { var m = document.createElement('source'); m.src = src.dataset.src; m.type = 'video/mp4'; video.appendChild(m); }
      video.poster = poster ? (poster.currentSrc || poster.src || '') : '';
      video.setAttribute('aria-label', (src && src.getAttribute('aria-label')) || 'Product film');
      video.load();
      setMuted(v.muted);
      play();
      var strip = reel.querySelector('[data-hoa-reel-shop]');
      shop.innerHTML = strip ? strip.innerHTML : '';
      shop.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });
      // A fresh copy: never carry the card's momentary Adding / Added state
      shop.querySelectorAll('[data-hoa-reel-add]').forEach(function (b) {
        b.classList.remove('is-added', 'is-loading');
        b.removeAttribute('aria-busy');
        var s = b.querySelector('span');
        if (s && !b.disabled) s.textContent = 'Add to bag';
      });
      shop.hidden = !strip;
      count.textContent = (v.index + 1) + ' / ' + n;
      dlg.querySelectorAll('[data-rv-step]').forEach(function (b) { b.hidden = n < 2; });
      bar.style.transform = 'scaleX(0)';
    };

    video.addEventListener('timeupdate', function () {
      if (video.duration) bar.style.transform = 'scaleX(' + (video.currentTime / video.duration) + ')';
    });
    video.addEventListener('play', function () { dlg.classList.remove('is-paused'); toggle.setAttribute('aria-label', 'Pause film'); });
    video.addEventListener('pause', function () { dlg.classList.add('is-paused'); toggle.setAttribute('aria-label', 'Play film'); });
    toggle.addEventListener('click', function () { if (video.paused) play(); else video.pause(); });
    soundBtn.addEventListener('click', function () { setMuted(!v.muted); if (video.paused) play(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-rv-close]')) { dlg.close(); return; }
      var step = e.target.closest('[data-rv-step]');
      if (step) v.show(v.index + Number(step.dataset.rvStep));
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); v.show(v.index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); v.show(v.index - 1); }
    });
    // Swipe left / right between films on touch screens
    var sx = null;
    dlg.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50 && v.list.length > 1) v.show(v.index + (dx < 0 ? 1 : -1));
    });
    dlg.addEventListener('close', function () {
      video.pause();
      video.innerHTML = '';
      video.removeAttribute('poster');
      video.load();
      document.documentElement.classList.remove('hoa-reelview-open');
      if (v.root && v.root._hoaHold) v.root._hoaHold(false);
      if (v.opener && v.opener.focus) v.opener.focus({ preventScroll: true });
    });
    viewer = v;
    return v;
  }

  function initViewer(root, track) {
    var onOpen = function (e) {
      var btn = e.target.closest && e.target.closest('[data-hoa-reel-open]');
      if (!btn || !root.contains(btn)) return;
      e.preventDefault();
      var v = buildViewer();
      v.root = root;
      v.opener = btn;
      v.list = Array.prototype.slice.call(root.querySelectorAll('[data-hoa-reel]')).filter(function (r) { return r.querySelector('[data-hoa-reel-open]'); });
      if (root._hoaHold) root._hoaHold(true);
      v.muted = false;
      document.documentElement.classList.add('hoa-reelview-open');
      if (typeof v.dlg.showModal === 'function') v.dlg.showModal(); else v.dlg.setAttribute('open', '');
      v.show(Math.max(0, v.list.indexOf(btn.closest('[data-hoa-reel]'))));
    };
    track.addEventListener('click', onOpen);
    return function () { track.removeEventListener('click', onOpen); };
  }

  /* ---------------- Motion ---------------- */
  function initMotion(root) {
    // Product page: one card, no entrance stagger (a late-built page can leave ScrollTrigger positions stale).
    if (root.classList.contains('hoa-reels--product')) return null;
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
      viewer: initViewer(root, track),
      motion: initMotion(root)
    });
  }

  function destroy(root) {
    var inst = instances.get(root);
    if (!inst) return;
    ['videos', 'carousel', 'viewer'].forEach(function (k) { if (inst[k]) inst[k](); });
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
