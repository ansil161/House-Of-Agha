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

  // Every hoa-reels section prints its own <script> tag; run once, or each
  // button gets two click handlers that undo each other (pause → play, unmute → mute).
  if (window.__hoaReelsLoaded) return;
  window.__hoaReelsLoaded = true;

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

  // The viewer's bag icon mirrors the header count; the badge hides at zero
  function syncBagCount() {
    var head = document.querySelector('.hoa-header .cart-count');
    document.querySelectorAll('.hoa-rvp__count').forEach(function (c) {
      if (head) c.textContent = head.textContent;
      c.hidden = !c.textContent || c.textContent.trim() === '0';
    });
  }

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
      syncBagCount();
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
        '<div class="hoa-reelview__card">' +
          '<figure class="hoa-reelview__stage">' +
            '<video class="hoa-reelview__video" data-rv-video playsinline loop preload="auto"></video>' +
            '<button type="button" class="hoa-reelview__toggle" data-rv-toggle aria-label="Pause film"><span class="hoa-reelview__play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5V18.5L19 12L8 5.5Z" fill="currentColor"/></svg></span></button>' +
            '<button type="button" class="hoa-reelview__sound" data-rv-sound aria-pressed="true" aria-label="Mute">' + ICON_SOUND + '</button>' +
            '<span class="hoa-reelview__count" data-rv-count></span>' +
            '<span class="hoa-reelview__bar" aria-hidden="true"><i data-rv-bar></i></span>' +
            '<div class="hoa-reelview__photo" data-rv-photo hidden><img alt="" data-rv-photo-img>' +
              '<button type="button" class="hoa-reelview__photo-back" data-rv-photo-back><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5.5V18.5L19 12L8 5.5Z" fill="currentColor"/></svg><span>Back to film</span></button></div>' +
          '</figure>' +
          '<div class="hoa-reelview__panel" data-rv-shop></div>' +
        '</div>' +
        '<button type="button" class="hoa-reelview__nav hoa-reelview__nav--next" data-rv-step="1" aria-label="Next film">' + ICON_NEXT + '</button>' +
      '</div>';
    document.body.appendChild(dlg);

    var video = dlg.querySelector('[data-rv-video]');
    var shop = dlg.querySelector('[data-rv-shop]');
    var count = dlg.querySelector('[data-rv-count]');
    var bar = dlg.querySelector('[data-rv-bar]');
    var soundBtn = dlg.querySelector('[data-rv-sound]');
    // Thumbnails open their photo large over the film (the film pauses); "Back to film" or a
    // new film closes it. Each thumbnail is a button for keyboard and screen readers.
    var photo = dlg.querySelector('[data-rv-photo]');
    var photoImg = dlg.querySelector('[data-rv-photo-img]');
    var photoWasPlaying = false;
    var markShots = function () {
      shop.querySelectorAll('.hoa-rvp__shot').forEach(function (f, i) {
        var im = f.querySelector('img');
        f.setAttribute('role', 'button');
        f.setAttribute('tabindex', '0');
        f.setAttribute('aria-label', 'View photo ' + (i + 1) + (im && im.alt ? ': ' + im.alt : ''));
      });
    };
    var showPhoto = function (fig) {
      var im = fig.querySelector('img');
      if (!im) return;
      if (photo.hidden) photoWasPlaying = !video.paused;
      video.pause();
      photoImg.src = im.currentSrc || im.src;
      photoImg.alt = im.alt || '';
      photo.hidden = false;
      dlg.classList.add('is-photo');
      shop.querySelectorAll('.hoa-rvp__shot').forEach(function (f) { f.classList.toggle('is-current', f === fig); f.setAttribute('aria-pressed', String(f === fig)); });
    };
    var hidePhoto = function (resume) {
      if (photo.hidden) return;
      photo.hidden = true;
      dlg.classList.remove('is-photo');
      photoImg.removeAttribute('src');
      shop.querySelectorAll('.hoa-rvp__shot').forEach(function (f) { f.classList.remove('is-current'); f.setAttribute('aria-pressed', 'false'); });
      if (resume && photoWasPlaying) play();
    };
    // Auto-scrolling photo row (2026-10-07): steps one thumbnail every 2.6 s, wraps to the start
    // at the end. Holds while the pointer is over it, a finger is on it, focus is inside it or a
    // photo is open large; never runs with reduced motion or when there is nothing to scroll.
    var galTimer = null;
    var galHold = false;
    var stopGallery = function () { if (galTimer) { clearInterval(galTimer); galTimer = null; } };
    var startGallery = function () {
      stopGallery();
      if (reduceMotion) return;
      var gal = shop.querySelector('[data-rvp-gallery]');
      if (!gal) return;
      galHold = false;
      ['pointerenter', 'touchstart', 'focusin'].forEach(function (t) { gal.addEventListener(t, function () { galHold = true; }, { passive: true }); });
      gal.addEventListener('pointerleave', function () { galHold = false; });
      gal.addEventListener('focusout', function () { galHold = false; });
      gal.addEventListener('touchend', function () { setTimeout(function () { galHold = false; }, 4000); }, { passive: true });
      galTimer = setInterval(function () {
        if (galHold || !photo.hidden || !dlg.open || document.hidden) return;
        var max = gal.scrollWidth - gal.clientWidth;
        if (max < 4) return;
        var first = gal.querySelector('.hoa-rvp__shot');
        var step = first ? first.getBoundingClientRect().width + 8 : gal.clientWidth * 0.5;
        var next = gal.scrollLeft >= max - 4 ? 0 : Math.min(max, gal.scrollLeft + step);
        gal.scrollTo({ left: next, behavior: 'smooth' });
      }, 2600);
    };
    var toggle = dlg.querySelector('[data-rv-toggle]');
    var v = { dlg: dlg, list: [], index: 0, root: null, opener: null, muted: false };

    // Preview fallback for the product panel: Shopify renders the description and the notes
    // (custom.*_notes metafields) in the Liquid; without them, fill both from the local catalogue
    // (AGHA_PRODUCTS in assets/theme.js) and window.AGHA_DEV_NOTES, so the space under the
    // photos holds the product's story and its notes as small ingredient icons.
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    // Fragrance-note line icons (24px, 1.3 stroke), injected once as an SVG sprite so the Liquid
    // panel (sections/hoa-reels.liquid: <use href="#hoa-ni-…">) and this fallback share one set.
    var NOTE_ICONS = {
      bergamot: '<circle cx="12" cy="13.5" r="6.5"/><path d="M12 7v13M5.5 13.5h13M7.4 8.9l9.2 9.2M16.6 8.9l-9.2 9.2"/><path d="M12 7c.4-2.2 1.9-3.6 4.2-4-.2 2.3-1.8 3.7-4.2 4z"/>',
      saffron: '<path d="M12 21v-7"/><path d="M12 14c-3.6-.6-5.6-3.4-5.2-7.6 2.6.7 4.4 2.6 5.2 5.2.8-2.6 2.6-4.5 5.2-5.2.4 4.2-1.6 7-5.2 7.6z"/><path d="M12 11.5V5M10.2 11.8 8.6 4.8M13.8 11.8l1.6-7"/>',
      pepper: '<circle cx="8.5" cy="9" r="3"/><circle cx="15.5" cy="9.5" r="3"/><circle cx="12" cy="15.5" r="3"/><path d="M8 8.2l.9.6M15 8.7l.9.6M11.5 14.7l.9.6"/>',
      rose: '<path d="M12 4.5c3.1 0 5 2 5 4.5 0 3.2-3 5.4-5 5.4S7 12.2 7 9c0-2.5 1.9-4.5 5-4.5z"/><path d="M10.1 8.2c.7-1.1 3.1-1.2 3.8.2.6 1.2-.5 2.4-1.8 2.3"/><path d="M12 14.4V21M12 18.2c-2.4-.2-3.9-1.5-4.4-3.2 2.2 0 3.7 1 4.4 3.2z"/>',
      jasmine: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2c-1.6-2.2-1.6-4.6 0-6.7 1.6 2.1 1.6 4.5 0 6.7zM13.7 11.4c1.6-2.2 3.9-3 6.4-2.1-.8 2.5-2.7 4-5.4 4zM13.1 13.5c2.6.8 4.1 2.8 4 5.4-2.6.1-4.6-1.4-5.4-4zM10.9 13.5c-.8 2.6-2.8 4.1-5.4 4-.1-2.6 1.4-4.6 4-5.4zM10.3 11.4C7.6 11.4 5.7 9.9 4.9 7.4c2.5-.9 4.8-.1 6.4 2.1z"/>',
      oud: '<path d="M5 17.5c1.8-6.2 6-10.3 14-11.5-1 7.2-5.2 11.3-11.6 13.2z"/><path d="M8.2 16.4c2.2-3.2 5-5.8 8.6-7.8M10.4 18c1.6-1.8 3.2-3.1 5.2-4.2"/>',
      musk: '<path d="M12 3.5c3.2 4.2 5.5 7.4 5.5 10.4a5.5 5.5 0 0 1-11 0c0-3 2.3-6.2 5.5-10.4z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.4"/>',
      amber: '<path d="M5 12.8c0-3.4 3-5.8 7-5.8s7 2.2 7 5.4-2.6 5.3-7 5.3-7-1.6-7-4.9z"/><path d="M9 11.2c.8-1 2-1.6 3.4-1.6"/><path d="M3 20.6c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/>',
      sandalwood: '<path d="M4 9.5l11-4 5 3.2v6.8l-11 4-5-3.2z"/><path d="M4 9.5l5 3.2 11-4M9 12.7v6.8"/><ellipse cx="6.5" cy="14.6" rx="1.3" ry="2.1"/>',
      iris: '<path d="M12 21v-8"/><path d="M12 13c-1.8-1.4-2.4-4.4 0-8.5 2.4 4.1 1.8 7.1 0 8.5zM12 12.5c-2-.2-5.4.4-7 3 3 1.2 5.6.3 7-3zM12 12.5c2-.2 5.4.4 7 3-3 1.2-5.6.3-7-3z"/>',
      cardamom: '<path d="M12 3.5c3 2.4 4.4 5.4 4.4 8.6S15 18.2 12 20.5c-3-2.3-4.4-5.2-4.4-8.4S9 5.9 12 3.5z"/><path d="M12 6.5v11M9.4 9.5c1.6.6 3.6.6 5.2 0M9.4 14.6c1.6.6 3.6.6 5.2 0"/>',
      leaf: '<path d="M5 19c0-8 5-13.5 14-14-.5 9-6 14-14 14z"/><path d="M5 19c3.5-4.5 6.5-7.5 10-10"/>'
    };
    var noteKey = function (name) {
      var n = name.toLowerCase();
      if (n.indexOf('pepper') > -1) return 'pepper';
      if (n.indexOf('oud') > -1 || n.indexOf('agar') > -1) return 'oud';
      if (n.indexOf('rose') > -1) return 'rose';
      if (n.indexOf('iris') > -1 || n.indexOf('orris') > -1) return 'iris';
      if (n.indexOf('musk') > -1) return 'musk';
      if (n.indexOf('sandal') > -1) return 'sandalwood';
      if (n.indexOf('amber') > -1) return 'amber';
      if (n.indexOf('bergamot') > -1 || n.indexOf('citrus') > -1 || n.indexOf('mandarin') > -1 || n.indexOf('lemon') > -1) return 'bergamot';
      if (n.indexOf('saffron') > -1) return 'saffron';
      if (n.indexOf('jasmin') > -1) return 'jasmine';
      if (n.indexOf('cardamom') > -1) return 'cardamom';
      return 'leaf';
    };
    (function injectNoteSprite() {
      if (document.getElementById('hoa-note-icons')) return;
      var sym = Object.keys(NOTE_ICONS).map(function (k) {
        return '<symbol id="hoa-ni-' + k + '" viewBox="0 0 24 24">' + NOTE_ICONS[k] + '</symbol>';
      }).join('');
      document.body.insertAdjacentHTML('beforeend', '<svg id="hoa-note-icons" width="0" height="0" style="position:absolute" aria-hidden="true">' + sym + '</svg>');
    })();
    // Notes show the ingredient photo (assets/note-<key>.jpg, user 2026-10-09); "leaf" has no photo
    // and keeps its line icon. base = the theme's asset folder (data-rvp-note-base on the panel).
    var noteIcon = function (key, base) {
      if (key !== 'leaf') return '<span class="hoa-rvp__note-icon hoa-rvp__note-icon--photo" aria-hidden="true"><img src="' + esc((base || '/assets/') + 'note-' + key + '.jpg') + '" alt="" width="64" height="64" loading="lazy" decoding="async"></span>';
      return '<span class="hoa-rvp__note-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><use href="#hoa-ni-' + key + '"/></svg></span>';
    };

    // Offer in the panel (window.HOA, assets/hoa-commerce.js). User, 2026-10-06: only the welcome
    // offer (no tiers / shipping), as a coupon ticket, and the price shown AFTER the offer the way the
    // product page sets a sale price out.
    var fillOffers = function (body, handle) {
      var H = window.HOA;
      if (!H || !H.ready || body.querySelector('[data-rvp-offers]')) return;
      var p = H.product(handle);
      if (!p) return;
      var money = H.money;
      var welcome = H.coupon && H.coupon.primary();
      var pct = welcome && welcome.type === 'percent' ? +welcome.value : 0;
      // The price after the offer, set out like the product page's price block:
      // the price you pay, the MRP struck through, "You save", "% off", taxes.
      var mrp = p.regularPrice;
      var final = pct ? Math.round(p.price * (100 - pct) / 100) : p.price;
      var save = mrp - final;
      var off = mrp ? Math.round(save / mrp * 100) : 0;
      var priceEl = body.querySelector('.hoa-rvp__price');
      if (priceEl) {
        priceEl.className = 'hoa-rvp__price hoa-rvp__price--offer';
        priceEl.innerHTML =
          '<span class="hoa-rvp__amount">' + money(final) + '</span>' +
          (save > 0 ? '<s class="hoa-rvp__mrp"><span class="hoa-sr">MRP </span>' + money(mrp) + '</s>' : '') +
          '<span class="hoa-rvp__price-note">' +
            (save > 0 ? '<span class="hoa-rvp__savings">You save ' + money(save) + '</span><span class="hoa-rvp__pct">' + off + '% off</span>' : '') +
            '<span class="hoa-rvp__tax">Inclusive of all taxes</span>' +
          '</span>' +
          (pct ? '<span class="hoa-rvp__with">Price with code <b>' + esc(welcome.code) + '</b> on your first order</span>' : '');
      }
      if (!welcome) return;
      // The welcome offer as a coupon ticket: a dark stub with the discount, a perforated
      // tear line with notches, and the code to tap (copies it and applies it to the bag).
      var big = pct ? '<b>' + pct + '%</b><small>OFF</small>' : '<b>' + esc(welcome.code) + '</b>';
      var html =
        '<section class="hoa-rvp__offers" data-rvp-offers aria-label="' + esc(welcome.label) + '">' +
          '<div class="hoa-rvp__ticket">' +
            '<span class="hoa-rvp__stub" aria-hidden="true">' + big + '</span>' +
            '<span class="hoa-rvp__ticket-body">' +
              '<span class="hoa-rvp__ticket-label">' + esc(welcome.label) + '</span>' +
              '<span class="hoa-rvp__ticket-title">' + (pct ? 'Extra ' + pct + '% off your first order' : esc(welcome.description)) + '</span>' +
              '<button type="button" class="hoa-rvp__code" data-rvp-code="' + esc(welcome.code) + '" aria-label="Copy and apply code ' + esc(welcome.code) + '">' +
                '<span class="hoa-rvp__code-text">' + esc(welcome.code) + '</span><em data-rvp-code-act>Tap to copy</em>' +
              '</button>' +
            '</span>' +
          '</div>' +
        '</section>';
      var anchor = priceEl || body.querySelector('.hoa-rvp__name');
      if (anchor) anchor.insertAdjacentHTML('afterend', html); else body.insertAdjacentHTML('afterbegin', html);
    };

    var fillPanel = function (panel) {
      var body = panel.querySelector('[data-rvp-handle]');
      if (!body) return;
      var handle = body.getAttribute('data-rvp-handle');
      fillOffers(body, handle);
      var products = typeof AGHA_PRODUCTS !== 'undefined' ? AGHA_PRODUCTS : null;
      var p = products && products[handle];
      var story = window.AGHA_STORIES && window.AGHA_STORIES[handle];
      if (!body.querySelector('.hoa-rvp__desc') && ((story && story.length) || (p && p.description))) {
        var paras = story && story.length ? story : [p.description];
        body.insertAdjacentHTML('beforeend',
          '<div class="hoa-rvp__desc"><h4>Description</h4><div class="hoa-rvp__text hoa-rvp__text--story" data-rvp-text>' +
          paras.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' +
          '<button type="button" class="hoa-rvp__more-text" data-rvp-more hidden>Read more</button></div>');
      }
      var mock = window.AGHA_DEV_NOTES && window.AGHA_DEV_NOTES[handle];
      var real = p && p.notes;
      var tiers = [
        ['Top', real && real.top ? real.top.split(',') : mock && mock.topNotes],
        ['Heart', real && real.heart ? real.heart.split(',') : mock && mock.heartNotes],
        ['Base', real && real.base ? real.base.split(',') : mock && mock.baseNotes]
      ].filter(function (t) { return t[1] && t[1].length; });
      if (!body.querySelector('[data-rvp-notes]') && tiers.length) {
        body.insertAdjacentHTML('beforeend', '<div class="hoa-rvp__notes" data-rvp-notes><h4>Fragrance notes</h4>' +
          tiers.map(function (t) {
            return '<div class="hoa-rvp__tier"><span class="hoa-rvp__tier-label">' + t[0] + '</span><ul class="hoa-rvp__note-list" role="list">' +
              t[1].map(function (x) {
                x = x.trim();
                return '<li class="hoa-rvp__note">' + noteIcon(noteKey(x), body.getAttribute('data-rvp-note-base')) + '<span>' + esc(x) + '</span></li>';
              }).join('') + '</ul></div>';
          }).join('') + '</div>');
      }
    };

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
      // Product panel beside the film: the card's <template>, else its compact shop strip
      var tpl = reel.querySelector('template[data-hoa-reel-panel]');
      var strip = reel.querySelector('[data-hoa-reel-shop]');
      shop.innerHTML = '';
      shop.classList.toggle('is-strip', !tpl);
      if (tpl) shop.appendChild(tpl.content.cloneNode(true));
      else if (strip) shop.innerHTML = strip.innerHTML;
      shop.scrollTop = 0;
      hidePhoto(false);
      fillPanel(shop);
      markShots();
      startGallery();
      syncBagCount();
      var text = shop.querySelector('[data-rvp-text]');
      var more = shop.querySelector('[data-rvp-more]');
      // "Read more" only when the clamped description actually overflows (measured once the dialog is laid out)
      if (text && more) requestAnimationFrame(function () { more.hidden = text.scrollHeight <= text.clientHeight + 2; });
      shop.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });
      // A fresh copy: never carry the card's momentary Adding / Added state
      shop.querySelectorAll('[data-hoa-reel-add]').forEach(function (b) {
        b.classList.remove('is-added', 'is-loading');
        b.removeAttribute('aria-busy');
        var s = b.querySelector('span');
        if (s && !b.disabled) s.textContent = 'Add to bag';
      });
      shop.hidden = !tpl && !strip;
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
      var shot = e.target.closest('.hoa-rvp__shot');
      if (shot && shop.contains(shot)) {
        if (shot.classList.contains('is-current')) hidePhoto(true); else showPhoto(shot);
        return;
      }
      if (e.target.closest('[data-rv-photo-back]')) { hidePhoto(true); return; }
      var codeBtn = e.target.closest('[data-rvp-code]');
      if (codeBtn) {
        var code = codeBtn.getAttribute('data-rvp-code');
        var act = codeBtn.querySelector('[data-rvp-code-act]');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).catch(function () {});
        if (window.HOA && window.HOA.coupon && window.HOA.coupon.apply) window.HOA.coupon.apply(code);
        codeBtn.classList.add('is-copied');
        if (act) act.textContent = 'Copied · applied';
        return;
      }
      var more = e.target.closest('[data-rvp-more]');
      if (more) {
        var box = more.closest('.hoa-rvp__desc');
        var open = box.classList.toggle('is-open');
        more.textContent = open ? 'Read less' : 'Read more';
        return;
      }
      // Bag icon: close the film, then open the theme's bag drawer
      if (e.target.closest('[data-rvp-bag]')) {
        dlg.close();
        var toggleBag = document.querySelector('.js-cart-toggle');
        if (toggleBag) toggleBag.click();
        return;
      }
      var step = e.target.closest('[data-rv-step]');
      if (step) v.show(v.index + Number(step.dataset.rvStep));
    });
    dlg.addEventListener('keydown', function (e) {
      var kshot = e.target.closest && e.target.closest('.hoa-rvp__shot');
      if (kshot && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kshot.click(); return; }
      if (e.key === 'Escape' && !photo.hidden) { e.preventDefault(); hidePhoto(true); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); v.show(v.index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); v.show(v.index - 1); }
    });
    // Swipe left / right between films on touch screens
    var sx = null;
    dlg.addEventListener('touchstart', function (e) { sx = e.target.closest && e.target.closest('[data-rvp-gallery]') ? null : e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50 && v.list.length > 1) v.show(v.index + (dx < 0 ? 1 : -1));
    });
    dlg.addEventListener('close', function () {
      stopGallery();
      hidePhoto(false);
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
    // Scroll story (2026-10-07), a different entrance per reels section:
    //   first on the page (product films): the cards start bunched to the left, small, and
    //   fan out into their places; later ones (Instagram): they rise in an alternating wave.
    var all = Array.prototype.slice.call(document.querySelectorAll('[data-hoa-reels]:not(.hoa-reels--product)'));
    var fan = all.indexOf(root) === 0;
    cards = Array.prototype.slice.call(cards);
    return gsap.context(function () {
      var tl = gsap.timeline({ paused: true });
      if (fan) {
        tl.fromTo(cards, {
          autoAlpha: 0, scale: 0.9,
          x: function (i, el) { return -(el.offsetLeft - cards[0].offsetLeft) * 0.55; }
        }, { autoAlpha: 1, scale: 1, x: 0, duration: 1.5, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' });
      } else {
        tl.fromTo(cards, { autoAlpha: 0, y: function (i) { return i % 2 ? 120 : 64; } },
          { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' });
      }
      gsap.set(cards, { autoAlpha: 0 });
      ScrollTrigger.create({ trigger: root.querySelector('[data-hoa-reels-track]') || root, start: 'top 85%', once: true, onEnter: function () { tl.play(); } });
    }, root);
  }

  /* ---------------- Live Instagram feed ----------------
     With a feed URL set (section setting, a behold.so JSON feed or anything with
     the same shape) the latest posts replace the theme blocks: reels play like the
     block films, photos and albums show as stills. Any failure keeps the blocks. */
  var IG_GLYPH = '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>';
  var REEL_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 9H20M9.5 4L7.5 9M15.5 4L13.5 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10.5 12.5V16.5L14 14.5L10.5 12.5Z" fill="currentColor"/></svg>';
  var ALBUM_ICON = '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="7.5" width="13" height="13" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 3.5H18A2.5 2.5 0 0 1 20.5 6V16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var CONTROLS = '<div class="hoa-reel__controls"><button type="button" class="hoa-reel__ctrl" data-hoa-reel-play aria-label="Pause reel"><svg class="hoa-reel__i-play" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5.5V18.5L19 12L8 5.5Z" fill="currentColor"/></svg><svg class="hoa-reel__i-pause" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="7" y="5" width="3.6" height="14" fill="currentColor"/><rect x="13.4" y="5" width="3.6" height="14" fill="currentColor"/></svg></button><button type="button" class="hoa-reel__ctrl" data-hoa-reel-sound aria-label="Turn sound on" aria-pressed="false"><svg class="hoa-reel__i-muted" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5V14.5H8L13 18.5V5.5L8 9.5H4Z" fill="currentColor"/><path d="M16.5 9.5L21 14.5M21 9.5L16.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><svg class="hoa-reel__i-sound" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5V14.5H8L13 18.5V5.5L8 9.5H4Z" fill="currentColor"/><path d="M16 9C17.2 10.1 17.2 13.9 16 15M18.6 6.6C21.1 9 21.1 15 18.6 17.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function feedCard(post, handle, avatar) {
    var type = String(post.mediaType || post.media_type || 'IMAGE').toUpperCase();
    var media = post.mediaUrl || post.media_url || '';
    var sizes = post.sizes || {};
    var still = (sizes.large && sizes.large.mediaUrl) || (sizes.medium && sizes.medium.mediaUrl) || post.thumbnailUrl || post.thumbnail_url || (type === 'VIDEO' ? '' : media);
    var isVideo = type === 'VIDEO' && media;
    var isReel = isVideo || type === 'REEL';   // REEL = a reel known only by its cover (Elfsight source)
    var link = post.permalink || ('https://www.instagram.com/' + handle + '/');
    var caption = String(post.prunedCaption || post.caption || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    var label = caption || ('@' + handle + (isReel ? ' reel' : ' post'));
    var badge = isReel ? '<span class="hoa-reel__badge" aria-hidden="true">' + REEL_ICON + 'Reel</span>'
      : type === 'CAROUSEL_ALBUM' ? '<span class="hoa-reel__badge hoa-reel__badge--icon" aria-hidden="true">' + ALBUM_ICON + '</span>' : '';
    return '<li class="hoa-reel" data-hoa-reel><div class="hoa-reel__frame"><div class="hoa-reel__stage" data-hoa-reel-stage>' +
      (still ? '<img class="hoa-reel__poster" src="' + esc(still) + '" alt="' + esc(label) + '" loading="lazy" decoding="async">' : '') +
      (isVideo ? '<video class="hoa-reel__video" data-hoa-reel-video muted loop playsinline preload="none" disablepictureinpicture data-src="' + esc(media) + '" aria-label="' + esc(label) + '"></video>' : '') +
      '<a class="hoa-reel__open" href="' + esc(link) + '" target="_blank" rel="noopener" aria-label="Watch this ' + (isReel ? 'reel' : 'post') + ' on Instagram (opens in a new tab)"></a>' +
      '<div class="hoa-reel__ig"><span class="hoa-reel__avatar" aria-hidden="true"><img src="' + esc(avatar) + '" alt="" width="64" height="64" loading="lazy" decoding="async"></span><span class="hoa-reel__handle">@' + esc(handle) + '</span></div>' +
      '<span class="hoa-reel__hover" aria-hidden="true">' + IG_GLYPH + '</span>' +
      (isVideo ? CONTROLS : '') + badge +
      '</div></div></li>';
  }

  function loadFeed(root, track) {
    var url = root.dataset.hoaReelsFeed;
    if (!url || !window.fetch) return Promise.resolve();
    var limit = parseInt(root.dataset.feedLimit, 10) || 12;
    var handle = root.dataset.igHandle || 'aghaperfumes';
    var avatar = root.dataset.igAvatar || '';
    return fetch(url, { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var posts = Array.isArray(data) ? data : (data.posts || data.data || []);
        posts = posts.filter(function (p) { return p && (p.mediaUrl || p.media_url || p.thumbnailUrl || p.thumbnail_url); }).slice(0, limit);
        if (!posts.length) return;
        if (data.username) handle = data.username;
        track.innerHTML = posts.map(function (p) { return feedCard(p, handle, avatar); }).join('');
        track.scrollLeft = 0;
      })
      .catch(function () { /* keep the theme blocks */ });
  }

  /* Elfsight as a data source only: its Instagram Feed widget renders off screen (inside its
     own shadow root), the reels are read from it (post link, cover, caption; a reel is a card
     whose media carries Elfsight's reel icon) and drawn as House cards. Elfsight never puts the
     video files in the page, so a card shows the reel's cover and opens the reel on Instagram.
     Resolves with [] if the widget does not render in time. */
  function loadElfsight(root) {
    var id = String(root.dataset.hoaReelsElfsight).replace(/[^a-z0-9-]/gi, '');
    var limit = parseInt(root.dataset.feedLimit, 10) || 12;
    return new Promise(function (resolve) {
      var host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.setAttribute('inert', '');
      host.style.cssText = 'position:absolute;left:-10000px;top:0;width:1200px;opacity:0;pointer-events:none;';
      host.innerHTML = '<div class="elfsight-app-' + id + '"></div>';
      document.body.appendChild(host);
      if (!document.querySelector('script[src*="elfsightcdn.com/platform.js"]')) {
        var sc = document.createElement('script');
        sc.src = 'https://elfsightcdn.com/platform.js';
        sc.async = true;
        document.head.appendChild(sc);
      }
      var tries = 0, settle = 0, last = -1;
      var timer = setInterval(function () {
        tries++;
        var embed = host.querySelector('.es-embed-root');
        var sr = embed && embed.shadowRoot;
        var cards = sr ? sr.querySelectorAll('.es-card-container') : [];
        // posts stream in: read once the card count has held steady for ~1s
        if (cards.length && cards.length === last) settle++; else settle = 0;
        last = cards.length;
        if (!((cards.length && settle >= 3) || tries > 50)) return;
        clearInterval(timer);
        var posts = [];
        Array.prototype.forEach.call(cards, function (c) {
          var a = c.querySelector('a[href*="instagram.com/p/"], a[href*="instagram.com/reel/"]');
          var img = c.querySelector('.es-media-image');
          var cover = img && (img.currentSrc || img.src);
          var isReel = !!c.querySelector('.es-card-media-icon-slot svg');
          if (!a || !cover || !isReel) return;
          var text = c.querySelector('[class*="es-card-text"]');
          posts.push({ mediaType: 'REEL', thumbnailUrl: cover, permalink: a.href.split('?')[0], caption: text ? text.textContent : '' });
        });
        host.remove();
        resolve(posts.slice(0, limit));
      }, 300);
    });
  }

  function applyFeed(root, posts) {
    var track = root.querySelector('[data-hoa-reels-track]');
    if (!track || !posts.length) return;   // nothing read: keep the theme's own films
    destroy(root);
    // Fewer live reels than a full row: the theme's own films follow them so the row never has a gap
    var keep = posts.length < 4 ? Array.prototype.slice.call(track.children, 0, 4 - posts.length) : [];
    track.innerHTML = posts.map(function (p) {
      return feedCard(p, root.dataset.igHandle || 'aghaperfumes', root.dataset.igAvatar || '');
    }).join('');
    keep.forEach(function (li) { li.removeAttribute('style'); track.appendChild(li); });
    track.scrollLeft = 0;
    root._hoaFeedDone = true;
    init(root);
  }

  /* ---------------- Lifecycle ---------------- */
  function init(root) {
    if (!root || instances.has(root) || root._hoaReelsLoading) return;
    var track = root.querySelector('[data-hoa-reels-track]');
    if (!track) return;
    if (root.dataset.hoaReelsFeed && !root._hoaFeedDone) {
      root._hoaReelsLoading = true;
      loadFeed(root, track).then(function () {
        root._hoaReelsLoading = false;
        root._hoaFeedDone = true;
        init(root);
      });
      return;
    }
    // Elfsight: the theme's own films show (and play) until the live reels arrive, then swap in
    if (root.dataset.hoaReelsElfsight && !root._hoaFeedDone && !root._hoaElfsightAsked) {
      root._hoaElfsightAsked = true;
      loadElfsight(root).then(function (posts) { applyFeed(root, posts); });
    }
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
