/* ==========================================================================
   AGHA — THE WORLD OF AGHA: on-screen-only reel playback
   Videos carry data-src and preload="none". The source is attached the first
   time a reel is mostly on screen; it plays while visible and pauses when not.
   Reduced motion: posters only, a tap toggles playback.
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function attach(video) {
    if (video.dataset.src && !video.dataset.loaded) {
      video.dataset.loaded = 'true';
      video.src = video.dataset.src;
    }
  }

  function play(video) {
    attach(video);
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  function init(root) {
    if (!root || root.dataset.worldReady) return;
    root.dataset.worldReady = 'true';
    var videos = root.querySelectorAll('video[data-agha-reel]');
    if (!videos.length) return;

    videos.forEach(function (v) {
      v.muted = true;
      v.addEventListener('playing', function () { v.classList.add('is-ready'); });
      var fig = v.closest('.agha-reel');
      if (fig) {
        fig.addEventListener('click', function () {
          if (v.paused) play(v); else v.pause();
        });
      }
    });

    if (reduce || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.45) play(e.target);
        else if (!e.target.paused) e.target.pause();
      });
    }, { threshold: [0, 0.45] });
    videos.forEach(function (v) { io.observe(v); });
  }

  function initAll() { document.querySelectorAll('[data-agha-world]').forEach(init); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
  document.addEventListener('shopify:section:load', initAll);
})();
