/* Agha V2 — home hero: a scroll-scrubbed film (GSAP ScrollTrigger + video.currentTime).
   The section pins under the header; scroll progress is the film's timeline. Stop scrolling and the
   frame holds; scroll back and it reverses. The video never plays on its own.
     0–96%   the film: petals fall, the flower closes, glass forms, perfume pours, the cap settles
     88–100% copy and CTA; the crisp final still replaces the last video frame
   The film is fetched whole (blob URL) so every seek is local. Seeks are coalesced to one per
   animation frame and never stacked while the decoder is busy. Desktop and phone get their own film
   (16:9 / 9:16 crop) and scroll distance. Reduced motion (CSS) or missing GSAP: final still + copy. */
(() => {
  const hero = document.querySelector('[data-hx]');
  if (!hero) return;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (!gsap || !ST) { hero.classList.add('hx--static'); return; }
  gsap.registerPlugin(ST);

  const video = hero.querySelector('[data-hx-video]');
  const last = hero.querySelector('[data-hx-last]');
  const hint = hero.querySelector('[data-hx-hint]');
  const copy = [...hero.querySelector('[data-hx-copy]').children];
  const headH = () => (document.querySelector('body > header, .head') || {}).offsetHeight || 0;
  const fit = () => hero.style.setProperty('--hx-top', `${headH()}px`);
  fit();
  ST.addEventListener('refreshInit', fit);

  /* ---------- Source: one film per breakpoint, fetched whole ---------- */
  const FILM = { desk: 'assets/hero/hero-film', phone: 'assets/hero/hero-film-m' };
  const ext = video.canPlayType('video/mp4; codecs="avc1.42E01E"') ? '.mp4'
    : video.canPlayType('video/webm; codecs="vp9"') ? '.webm' : '.mp4';
  const blobs = {};
  const getFilm = (url) => blobs[url] || (blobs[url] = fetch(url)
    .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
    .then((b) => URL.createObjectURL(b))
    .catch(() => url));                              // fall back to streaming the file directly
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ---------- Seeking: latest target wins, one seek in flight ----------
     The target is kept as film progress (0–1), not seconds: scroll can move (or be restored on
     reload) before the video knows its duration. */
  let ready = false;
  let target = 0;
  let raf = 0;
  const EPS = 0.5 / 24;                              // half a frame
  const time = () => target * (video.duration || 0);
  const apply = () => {
    raf = 0;
    if (!ready) return;
    if (video.seeking) { raf = requestAnimationFrame(apply); return; }
    if (Math.abs(video.currentTime - time()) > EPS) video.currentTime = time();
  };
  const seek = (p, now) => {
    target = p;
    if (now) apply();
    else if (!raf) raf = requestAnimationFrame(apply);
  };
  video.addEventListener('seeked', () => { if (Math.abs(video.currentTime - time()) > EPS && !raf) raf = requestAnimationFrame(apply); });

  let loadToken = 0;
  const load = (url) => {
    const my = ++loadToken;
    ready = false;
    hero.classList.remove('hx--ready');
    getFilm(url).then((src) => {
      if (my !== loadToken) return;
      video.addEventListener('loadeddata', () => {
        if (my !== loadToken) return;
        const show = () => { ready = true; hero.classList.add('hx--ready'); seek(target, true); };
        // iOS Safari only paints seeked frames once the element has started: prime it silently.
        if (iOS) video.play().then(() => { video.pause(); show(); }).catch(show);
        else show();
      }, { once: true });
      video.preload = 'auto';
      video.src = src;
      video.load();
    });
  };

  /* ---------- Scroll timeline ---------- */
  const build = ({ film, distance, scrub }) => {
    load(film + ext);
    const f = { p: 0 };
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: () => `top ${headH()}`,
        end: () => `+=${Math.round(innerHeight * distance)}`,
        pin: true,
        scrub,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    // The film runs 0 → 1 on the timeline; the pin exists before the video has loaded, so nothing
    // jumps when it arrives.
    tl.to(f, { p: 1, duration: 1, onUpdate: () => seek(f.p) }, 0)
      .to(hint, { opacity: 0, duration: 0.05 }, 0)
      .fromTo(copy, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.06, stagger: 0.015, ease: 'power2.out' }, 0.9)
      .fromTo(last, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.96)
      .to({}, { duration: 0.08 });                   // short hold on the finished frame before the pin releases
    return () => { loadToken++; };
  };

  const mm = gsap.matchMedia();
  mm.add({
    desk: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
    phone: '(max-width: 767px) and (prefers-reduced-motion: no-preference)'
  }, (ctx) => {
    const { desk, phone } = ctx.conditions;
    if (desk) return build({ film: FILM.desk, distance: 2.6, scrub: 0.6 });
    if (phone) return build({ film: FILM.phone, distance: 2.2, scrub: 0.4 });
  });

  addEventListener('load', () => ST.refresh(), { once: true });
})();
