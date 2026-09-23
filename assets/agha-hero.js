/* ==========================================================================
   AGHA PERFUMES — CINEMATIC HERO CONTROLLER
   One master GSAP timeline, scrubbed by scroll, that moves the "camera"
   through eight scenes:

     00–12  DARKNESS      iris lifts, first haze
     12–25  ATMOSPHERE    slow dolly forward through the light beam
     25–40  INGREDIENT    macro of oud, saffron, black rose — light travels
     40–55  MATERIAL      wood grain becomes glass, then the label surface (clips)
     55–72  BOTTLE        camera pulls back, the full bottle is revealed
     72–85  BRAND         AGHA — THE SCENT IS THE LUXURY.
     85–95  FRAGRANCE     OUD ROYAL · Woody · Amber · Spicy
     95–100 DISCOVERY     CTA, haze carries the eye into THE HOUSE

   Requires gsap + ScrollTrigger (already loaded by the theme layout).
   Degrades to a static composition (class "is-static") without them.
   Theme Editor safe: every instance lives in a gsap.context and is reverted
   on shopify:section:unload.
   ========================================================================== */

(function () {
  'use strict';

  var SELECTOR = '[data-agha-hero]';
  var instances = new WeakMap();
  var SCENES = [
    { at: 0,  label: '01 · Darkness' },
    { at: 12, label: '02 · Atmosphere' },
    { at: 25, label: '03 · Ingredient' },
    { at: 40, label: '04 · Material' },
    { at: 55, label: '05 · The bottle' },
    { at: 72, label: '06 · The house' },
    { at: 85, label: '07 · Oud Royal' },
    { at: 95, label: '08 · Discover' }
  ];

  /* ---------------------------------------------------------------------
     Lazy video helpers — a clip is only attached to the network when its
     scene is about to be reached, and paused again when it leaves.
     --------------------------------------------------------------------- */
  function loadVideo(video) {
    if (!video || video.dataset.loaded === 'true') return;
    video.dataset.loaded = 'true';
    var webm = video.dataset.srcWebm;
    var mp4 = video.dataset.srcMp4;
    if (webm) {
      var s1 = document.createElement('source');
      s1.src = webm;
      s1.type = 'video/webm';
      video.appendChild(s1);
    }
    if (mp4) {
      var s2 = document.createElement('source');
      s2.src = mp4;
      s2.type = 'video/mp4';
      video.appendChild(s2);
    }
    video.addEventListener('loadeddata', function () {
      video.classList.add('is-ready');
    }, { once: true });
    video.load();
  }

  function playVideo(video) {
    if (!video) return;
    loadVideo(video);
    if (video.paused) {
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
  }

  function pauseVideo(video) {
    if (!video || video.paused) return;
    video.pause();
  }

  /* ---------------------------------------------------------------------
     Build one hero instance
     --------------------------------------------------------------------- */
  function init(section) {
    if (!section || instances.has(section)) return;

    var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (!hasGsap) {
      section.classList.add('is-static');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var q = function (sel) { return section.querySelector(sel); };
    var stage = q('.agha-hero__stage');
    var iris = q('.agha-hero__iris');
    var layers = {
      atmosphere: q('.agha-hero__layer--atmosphere'),
      ingredient: q('.agha-hero__layer--ingredient'),
      material: q('.agha-hero__layer--material'),
      macro: q('.agha-hero__layer--macro'),
      reveal: q('.agha-hero__layer--reveal'),
      campaign: q('.agha-hero__layer--campaign'),
      closing: q('.agha-hero__layer--closing')
    };
    var videos = {
      atmosphere: layers.atmosphere && layers.atmosphere.querySelector('video'),
      ingredient: layers.ingredient && layers.ingredient.querySelector('video'),
      material: layers.material && layers.material.querySelector('video'),
      macro: layers.macro && layers.macro.querySelector('video'),
      reveal: layers.reveal && layers.reveal.querySelector('video'),
      campaign: layers.campaign && layers.campaign.querySelector('video'),
      closing: layers.closing && layers.closing.querySelector('video')
    };
    var blocks = {
      philosophy: q('.agha-hero__block--philosophy'),
      brand: q('.agha-hero__block--brand'),
      fragrance: q('.agha-hero__block--fragrance'),
      cta: q('.agha-hero__block--cta')
    };
    var headlineLines = section.querySelectorAll('.agha-hero__headline .agha-hero__line > span');
    var hint = q('.agha-hero__hint');
    var railFill = q('.agha-hero__rail-fill');
    var sceneLabel = q('.agha-hero__scene');
    var header = document.querySelector('.header');

    var allowMobileVideo = section.dataset.mobileVideo === 'true';
    var useCampaignVideo = section.dataset.campaignVideo === 'true';

    var ctx = gsap.context(function () {
      var mm = gsap.matchMedia();

      /* ---------- Reduced motion: static poster, copy, CTA ---------- */
      mm.add('(prefers-reduced-motion: reduce)', function () {
        section.classList.add('is-static');
        return function () { section.classList.remove('is-static'); };
      });

      /* ---------- Full film (desktop and mobile variants) ---------- */
      mm.add(
        {
          motionOk: '(prefers-reduced-motion: no-preference)',
          isDesktop: '(min-width: 768px)',
          isMobile: '(max-width: 767px)'
        },
        function (context) {
          var c = context.conditions;
          if (!c.motionOk) return;

          var isMobile = c.isMobile;
          var videoOk = !isMobile || allowMobileVideo;
          var currentScene = -1;

          section.classList.remove('is-static');

          /* Initial states — the film starts in the dark. */
          gsap.set(Object.keys(layers).map(function (k) { return layers[k]; }).filter(Boolean), { opacity: 0 });
          gsap.set(iris, { opacity: 1 });
          gsap.set(layers.atmosphere, { opacity: 0, scale: 1.16, filter: 'blur(8px)' });
          gsap.set(layers.ingredient, { opacity: 0, scale: 1.12 });
          gsap.set(layers.material, { opacity: 0, scale: 1.06 });
          gsap.set(layers.macro, { opacity: 0, scale: 1.14 });
          gsap.set(layers.reveal, { opacity: 0, scale: isMobile ? 1.32 : 1.26 });
          gsap.set(layers.campaign, { opacity: 0, scale: 1.06 });
          gsap.set(layers.closing, { opacity: 0, scale: 1.1 });
          gsap.set([blocks.philosophy, blocks.brand, blocks.fragrance, blocks.cta], { opacity: 0 });
          gsap.set(headlineLines, { opacity: 0 });
          gsap.set(hint, { opacity: 1 });

          var tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom bottom',
              /* The section itself provides the scroll distance (--agha-hero-length),
                 so the stage is pinned without extra spacing. GSAP pinning is used
                 instead of position: sticky because the theme sets overflow-x: hidden
                 on <body>, which turns body into the sticky containing block. */
              pin: stage,
              pinSpacing: false,
              anticipatePin: 1,
              scrub: isMobile ? 0.6 : 1,
              invalidateOnRefresh: true,
              onUpdate: function (self) {
                var p = self.progress * 100;

                if (railFill) railFill.style.transform = 'scaleY(' + self.progress + ')';

                var idx = 0;
                for (var i = 0; i < SCENES.length; i++) { if (p >= SCENES[i].at) idx = i; }
                if (idx !== currentScene) {
                  currentScene = idx;
                  if (sceneLabel) sceneLabel.textContent = SCENES[idx].label;
                }

                if (!videoOk) return;

                /* Warm each clip a scene early, play while visible, pause otherwise. */
                if (p > 0 && p < 32) playVideo(videos.atmosphere); else pauseVideo(videos.atmosphere);
                if (p > 18 && p < 50) { if (p > 22) playVideo(videos.ingredient); else loadVideo(videos.ingredient); } else pauseVideo(videos.ingredient);
                if (p > 34 && p < 56) { if (p > 39) playVideo(videos.material); else loadVideo(videos.material); } else pauseVideo(videos.material);
                if (p > 42 && p < 64) { if (p > 47) playVideo(videos.macro); else loadVideo(videos.macro); } else pauseVideo(videos.macro);
                if (p > 46 && p < 80) { if (p > 53) playVideo(videos.reveal); else loadVideo(videos.reveal); } else pauseVideo(videos.reveal);
                if (useCampaignVideo) {
                  if (p > 66 && p < 100) { if (p > 71) playVideo(videos.campaign); else loadVideo(videos.campaign); } else pauseVideo(videos.campaign);
                }
                if (p > 86) { if (p > 92) playVideo(videos.closing); else loadVideo(videos.closing); } else pauseVideo(videos.closing);
              },
              onToggle: function (self) {
                if (header) header.classList.toggle('agha-over-hero', self.isActive);
              },
              onRefresh: function (self) {
                if (header) header.classList.toggle('agha-over-hero', self.isActive);
              }
            }
          });

          /* Timeline runs 0 → 100 (scroll percent). */
          var T = 100;

          /* SCENE 01 — DARKNESS (0–12) */
          tl.to(iris, { opacity: 0.45, duration: 12 }, 0)
            .to(layers.atmosphere, { opacity: 0.7, scale: 1.12, filter: 'blur(4px)', duration: 12 }, 0)
            .to(hint, { opacity: 0, duration: 4 }, 7);

          /* SCENE 02 — ATMOSPHERE (12–25): slow dolly forward, iris fully lifts */
          tl.to(iris, { opacity: 0, duration: 10 }, 12)
            .to(layers.atmosphere, { opacity: 1, scale: 1.0, filter: 'blur(0px)', duration: 13 }, 12);

          /* SCENE 03 — INGREDIENT (25–40): dissolve, camera drifts through the material */
          tl.to(layers.ingredient, { opacity: 1, duration: 7 }, 25)
            .to(layers.ingredient, { scale: 1.0, duration: 15 }, 25)
            .to(layers.atmosphere, { opacity: 0, scale: 0.97, duration: 8 }, 26)
            .to(blocks.philosophy, { opacity: 1, duration: 4, ease: 'power2.out' }, 29)
            .to(blocks.philosophy, { opacity: 0, duration: 3, ease: 'power2.in' }, 37);

          /* SCENE 04 — MATERIAL (40–55): wood → glass → label surface */
          tl.to(layers.material, { opacity: 1, duration: 7 }, 40)
            .to(layers.material, { scale: 1.0, duration: 12 }, 40)
            .to(layers.ingredient, { opacity: 0, scale: 1.04, filter: 'blur(6px)', duration: 7 }, 41)
            .to(layers.macro, { opacity: 1, duration: 6 }, 48)
            .to(layers.macro, { scale: 1.0, duration: 10 }, 48)
            .to(layers.material, { opacity: 0, scale: 0.98, filter: 'blur(5px)', duration: 6 }, 49);

          /* SCENE 05 — BOTTLE REVEAL (55–72): camera pulls back */
          tl.to(layers.reveal, { opacity: 1, duration: 6 }, 55)
            .to(layers.reveal, { scale: 1.0, duration: 17, ease: 'power1.out' }, 55)
            .to(layers.macro, { opacity: 0, scale: 1.04, filter: 'blur(8px)', duration: 6 }, 57);

          /* SCENE 06 — BRAND (72–85) */
          tl.to(layers.campaign, { opacity: 1, duration: 5 }, 72)
            .to(layers.campaign, { scale: 1.0, duration: 28 }, 72)
            .to(layers.reveal, { opacity: 0, duration: 5 }, 74)
            .to(blocks.brand, { opacity: 1, duration: 3, ease: 'power2.out' }, 74)
            .to(headlineLines, { opacity: 1, duration: 4, ease: 'power2.out', stagger: 1 }, 74.5)
            .to(blocks.brand, { opacity: 0, duration: 3, ease: 'power2.in' }, 83);

          /* SCENE 07 — FRAGRANCE (85–95) */
          tl.to(blocks.fragrance, { opacity: 1, duration: 3, ease: 'power2.out' }, 86)
            .to(layers.campaign, { scale: 1.03, duration: 14 }, 86)
            .to(blocks.fragrance, { opacity: 0, duration: 2.5, ease: 'power2.in' }, 93.5);

          /* SCENE 08 — DISCOVERY → THE HOUSE (95–100) */
          tl.to(layers.closing, { opacity: 1, scale: 1.0, duration: 5 }, 94)
            .to(layers.campaign, { opacity: 0, filter: 'brightness(0.6)', duration: 5 }, 95)
            .to(blocks.cta, { opacity: 1, duration: 2.5, ease: 'power2.out' }, 95.5)
            .to(iris, { opacity: 0.55, duration: 3 }, 97);

          /* Guarantee total length so scene percentages map 1:1 to scroll. */
          tl.to({}, { duration: 0 }, T);

          return function () {
            if (header) header.classList.remove('agha-over-hero');
            Object.keys(videos).forEach(function (k) { pauseVideo(videos[k]); });
          };
        }
      );
    }, section);

    instances.set(section, ctx);
  }

  function destroy(section) {
    var ctx = instances.get(section);
    if (ctx) {
      ctx.revert();
      instances.delete(section);
    }
    var header = document.querySelector('.header');
    if (header) header.classList.remove('agha-over-hero');
  }

  function initAll() {
    document.querySelectorAll(SELECTOR).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  /* Shopify Theme Editor lifecycle */
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.matches && e.target.matches(SELECTOR) ? e.target : e.target.querySelector(SELECTOR);
    if (el) init(el);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    var el = e.target.matches && e.target.matches(SELECTOR) ? e.target : e.target.querySelector(SELECTOR);
    if (el) destroy(el);
  });
  document.addEventListener('shopify:section:reorder', function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  /* Once fonts and images settle, let ScrollTrigger re-measure. */
  window.addEventListener('load', function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
