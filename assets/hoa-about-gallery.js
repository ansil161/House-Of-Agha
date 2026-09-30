/* ==========================================================================
   HOUSE OF AGHA · ABOUT · PALACE GALLERY (sections/hoa-about-gallery.liquid)

   Reveal ... each plate opens from a domed arch, its photo settles and (colour
              photographs) develops from monochrome as it enters the viewport.
              Arming (.is-armed) happens here only, so without JS or with reduced
              motion the wall is static and complete.
   Viewer ... any plate opens a full-screen <dialog>: arrows / swipe / keys to move,
              Esc or the close button to leave. Page scroll is locked while open
              (hoa-about.js pauses Lenis when body overflow is hidden).
   Theme Editor safe: rebuilt on shopify:section:load, torn down on unload.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(root) {
    if (!root || root._hoaPal) return;
    var io = null;
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-hoa-pal-plate]'));

    /* ---------- Reveal ---------- */
    if (!reduce.matches && 'IntersectionObserver' in window) {
      root.classList.add('is-armed');
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Viewer ---------- */
    var lb = root.querySelector('[data-hoa-pal-lb]');
    var img = root.querySelector('[data-hoa-pal-lb-img]');
    var stage = root.querySelector('[data-hoa-pal-stage]');
    var noEl = root.querySelector('[data-hoa-pal-lb-no]');
    var titleEl = root.querySelector('[data-hoa-pal-lb-title]');
    var placeEl = root.querySelector('[data-hoa-pal-lb-place]');
    var openers = Array.prototype.slice.call(root.querySelectorAll('[data-hoa-pal-open]'));
    var plates = openers.map(function (btn) {
      var fig = btn.closest('figure');
      var pic = btn.querySelector('img');
      var b = fig.querySelector('.hoa-pal-plate__txt b');
      var sm = fig.querySelector('.hoa-pal-plate__txt small');
      var srcset = pic.getAttribute('srcset') || '';
      // largest candidate in the srcset, else src
      var best = pic.getAttribute('src'), bestW = 0;
      srcset.split(',').forEach(function (c) {
        var bits = c.trim().split(/\s+/);
        var w = parseInt(bits[1], 10) || 0;
        if (bits[0] && w > bestW) { bestW = w; best = bits[0]; }
      });
      return { src: best, alt: pic.getAttribute('alt') || '', title: b ? b.textContent : '', place: sm ? sm.textContent : '' };
    });
    var index = 0;
    var lastFocus = null;
    var prevOverflow = '';

    function show(i, animate) {
      index = (i + plates.length) % plates.length;
      var p = plates[index];
      var apply = function () {
        img.src = p.src;
        img.alt = p.alt;
        noEl.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(plates.length).padStart(2, '0');
        titleEl.textContent = p.title;
        placeEl.textContent = p.place;
        img.classList.remove('is-swapping');
      };
      if (animate && !reduce.matches) {
        img.classList.add('is-swapping');
        setTimeout(apply, 220);
      } else apply();
    }
    function open(i) {
      if (!lb || typeof lb.showModal !== 'function') return;
      lastFocus = document.activeElement;
      show(i, false);
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      lb.showModal();
    }
    function onClose() {
      document.body.style.overflow = prevOverflow;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    var onOpen = function (e) {
      var btn = e.target.closest('[data-hoa-pal-open]');
      if (!btn || !root.contains(btn)) return;
      open(parseInt(btn.getAttribute('data-hoa-pal-open'), 10) || 0);
    };
    var onKey = function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, true); }
    };
    var onLbClick = function (e) {
      if (e.target.closest('[data-hoa-pal-next]')) show(index + 1, true);
      else if (e.target.closest('[data-hoa-pal-prev]')) show(index - 1, true);
      else if (e.target.closest('[data-hoa-pal-close]') || e.target === stage) lb.close();
    };
    // Swipe on the stage
    var sx = null, sy = null;
    var onDown = function (e) { sx = e.clientX; sy = e.clientY; };
    var onUp = function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), true);
    };

    root.addEventListener('click', onOpen);
    if (lb) {
      lb.addEventListener('keydown', onKey);
      lb.addEventListener('click', onLbClick);
      lb.addEventListener('close', onClose);
      stage.addEventListener('pointerdown', onDown);
      stage.addEventListener('pointerup', onUp);
    }

    root._hoaPal = function destroy() {
      if (io) io.disconnect();
      root.classList.remove('is-armed');
      items.forEach(function (el) { el.classList.remove('is-in'); });
      root.removeEventListener('click', onOpen);
      if (lb) {
        if (lb.open) lb.close();
        lb.removeEventListener('keydown', onKey);
        lb.removeEventListener('click', onLbClick);
        lb.removeEventListener('close', onClose);
        stage.removeEventListener('pointerdown', onDown);
        stage.removeEventListener('pointerup', onUp);
      }
      delete root._hoaPal;
    };
  }

  function boot() { Array.prototype.forEach.call(document.querySelectorAll('[data-hoa-pal]'), init); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('shopify:section:load', function (e) { init(e.target.querySelector('[data-hoa-pal]')); });
  document.addEventListener('shopify:section:unload', function (e) {
    var r = e.target.querySelector('[data-hoa-pal]');
    if (r && r._hoaPal) r._hoaPal();
  });
})();
