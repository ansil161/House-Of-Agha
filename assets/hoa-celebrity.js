/* ==========================================================================
   HOUSE OF AGHA — FEATURED FILM (celebrity video)
   sections/hoa-celebrity.liquid

   Playback: the <video> carries data-src/data-src-webm and preload="none";
   <source> elements are attached the first time the film is about to play, so
   nothing is fetched until it is likely to be watched. An IntersectionObserver
   plays it once roughly 45% of the frame is on screen and pauses it once that
   drops away, so it resumes automatically when the visitor scrolls back. A
   small corner button lets the visitor override that while the film is in
   view; a centred "Play the film" prompt sits over the poster until playback
   first starts (also the fallback if a browser blocks autoplay).

   Motion: a one-time GSAP reveal (film scales/fades into place, the perfume
   panel follows with a slight stagger) plus a slow parallax on the media while
   the section scrolls past. Skipped entirely under prefers-reduced-motion or
   without GSAP; the CSS beneath needs no JS to render correctly.

   Architecture: gsap.context per section instance (WeakMap guard), reverted on
   shopify:section:unload — same lifecycle as assets/hoa-testimonials.js.
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-film]';
  var instances = new WeakMap();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Playback ---------------- */
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

  function setPlayingState(section, playing) {
    section.classList.toggle('is-playing', playing);
    var toggle = section.querySelector('[data-hoa-film-toggle]');
    if (toggle) toggle.setAttribute('aria-label', playing ? 'Pause film' : 'Play film');
  }

  function playVideo(section, video) {
    attachSources(video);
    var request = video.play();
    if (request && request.catch) {
      request.then(function () { setPlayingState(section, true); })
        .catch(function () { setPlayingState(section, false); }); // autoplay blocked: poster + prompt stay visible
    } else {
      setPlayingState(section, true);
    }
  }

  function pauseVideo(section, video) {
    video.pause();
    setPlayingState(section, false);
  }

  function initPlayback(section) {
    var video = section.querySelector('[data-hoa-film-video]');
    if (!video) return null;

    var prompt = section.querySelector('[data-hoa-film-prompt]');
    var toggle = section.querySelector('[data-hoa-film-toggle]');
    var cleanups = [];

    var onPlaying = function () { setPlayingState(section, true); };
    var onPause = function () { setPlayingState(section, false); };
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    cleanups.push(function () {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
    });

    if (prompt) {
      var onPrompt = function () { playVideo(section, video); };
      prompt.addEventListener('click', onPrompt);
      cleanups.push(function () { prompt.removeEventListener('click', onPrompt); });
    }
    if (toggle) {
      var onToggle = function () {
        if (video.paused) playVideo(section, video); else pauseVideo(section, video);
      };
      toggle.addEventListener('click', onToggle);
      cleanups.push(function () { toggle.removeEventListener('click', onToggle); });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) playVideo(section, video);
          else if (!video.paused) pauseVideo(section, video);
        });
      }, { threshold: [0, 0.45] });
      io.observe(video);
      cleanups.push(function () { io.disconnect(); });
    }

    return function destroy() {
      cleanups.forEach(function (fn) { fn(); });
      pauseVideo(section, video);
    };
  }

  /* ---------------- Motion (reveal + parallax) ---------------- */
  function initMotion(section) {
    if (reduceMotion || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return null;
    gsap.registerPlugin(ScrollTrigger);

    var stage = section.querySelector('[data-hoa-film-stage]');
    var panel = section.querySelector('[data-hoa-film-panel]');
    var media = stage ? stage.querySelector('.hoa-film__video, .hoa-film__poster-img') : null;
    if (!stage) return null;

    return gsap.context(function () {
      gsap.set(stage, { autoAlpha: 0, scale: 1.06, y: 36 });
      gsap.to(stage, {
        autoAlpha: 1, scale: 1, y: 0, duration: 1.5, ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 78%', toggleActions: 'play none none none' }
      });

      if (panel) {
        gsap.set(panel, { autoAlpha: 0, y: 34 });
        gsap.to(panel, {
          autoAlpha: 1, y: 0, duration: 1.2, ease: 'power2.out', delay: 0.3,
          scrollTrigger: { trigger: section, start: 'top 70%', toggleActions: 'play none none none' }
        });
      }

      if (media) {
        gsap.fromTo(media, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    }, section);
  }

  /* ---------------- Lifecycle ---------------- */
  function init(section) {
    if (!section || instances.has(section)) return;
    var destroyPlayback = initPlayback(section);
    var gsapCtx = initMotion(section);
    instances.set(section, { destroyPlayback: destroyPlayback, gsapCtx: gsapCtx });
  }

  function destroy(section) {
    var inst = instances.get(section);
    if (!inst) return;
    if (inst.destroyPlayback) inst.destroyPlayback();
    if (inst.gsapCtx) inst.gsapCtx.revert();
    instances.delete(section);
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
