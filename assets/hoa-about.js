/* ==========================================================================
   HOUSE OF AGHA · ABOUT PAGE MOTION (sections/hoa-about-*.liquid)

   Each animation has one job:
     Opening bento ... headline rises line by line, then the tiles assemble in
                       reading order (hierarchy); photos drift inside their tiles
                       while scrolling (depth, subtle).
     Stacking cards .. cards stick under the header; the card underneath recedes
                       as the next one arrives (storytelling, one idea at a time).
     Seven worlds .... the section pins behind carved palace doors that swing open;
                       then one canvas pans sideways, each world comes into focus at
                       the centre, a pearl lights and the Hyderabad skyline drifts
                       behind (entrance, then storytelling). Wide screens;
                       phones get a stacked version, reduced motion a static one.
     Our story ....... the old-city photograph opens from a framed window to the full
                       screen width while scrolling (the city arrives).
     Text ............ headline and philosophy words rise out of masks; the letters of
                       Agha rise and آقا is revealed right to left, as it is written.
     Story line ...... words sharpen from faint and soft to ink as the paragraphs are read.
     Our name ........ the stage holds while one giant word changes script, Persian,
                       Ottoman Turkish, Urdu, today (the word's journey, one step at a time).
     Philosophy ...... photo tiles open from an arch into their frame (order, motif).
     Closing card .... grows from slightly inset to full size before the shop
                       button (emphasis).

   Without GSAP, or with prefers-reduced-motion, the page is static and complete:
   initial states are only ever set from JS, never from CSS.
   Theme Editor safe: rebuilt on shopify:section:load / unload.
   ========================================================================== */
(function () {
  'use strict';

  var mm = null;
  var lenis = null;
  var hasGsap = function () { return typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'; };

  function initLenis() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenis || reduce || !fine || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    window.hoaLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Hand in-page anchors (hero button to #worlds) to Lenis so they glide.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
    // Pause while the theme locks the page (cart drawer, mobile menu).
    new MutationObserver(function () {
      if (document.body.style.overflow === 'hidden') lenis.stop(); else lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['style'] });
  }

  /* ---------------- 03 The seven worlds ----------------
     Wide (768px+, motion allowed): the palace gate, then the canvas. The section pins behind
     a pair of carved doors; the first stretch of scroll swings them open (inward) and the
     stage behind settles forward. The rest of the scroll pans one continuous canvas sideways;
     each world comes into focus as it nears the centre, its brass arch draws in, a pearl
     lights, the tint follows and the skyline drifts slower (depth). One scrubbed timeline:
     doors take 1 unit, the pan PAN units; focus is computed from the canvas position on
     every update, so it never drifts from the pan. The pan distance is measured, never fixed.
     Phones (motion allowed): the worlds stack; each settles into view. Reduced motion:
     nothing here runs, the static stack from the CSS is shown (no doors).
     Everything is created inside the shared gsap.matchMedia (mm), so destroy() / resize
     tear it down cleanly and Theme Editor reloads never leave duplicate ScrollTriggers. */
  function initSevenWorlds() {
    var scope = function () { return document.querySelector('[data-hoa-ab-worlds]'); };

    function parts(section) {
      return {
        pin: section.querySelector('[data-hoa-ab-pin]'),
        track: section.querySelector('[data-hoa-ab-track]'),
        skyline: section.querySelector('[data-hoa-ab-skyline]'),
        gate: section.querySelector('[data-hoa-ab-gate]'),
        pearls: gsap.utils.toArray('[data-hoa-ab-pearl]', section),
        worlds: gsap.utils.toArray('[data-hoa-ab-world]', section)
      };
    }

    /* The elements of one world that animate */
    function bits(w) {
      return {
        media: w.querySelector('[data-hoa-ab-media]'),
        img: w.querySelector('.hoa-ab-world__img'),
        title: w.querySelector('[data-hoa-ab-title]'),
        meta: gsap.utils.toArray('[data-hoa-ab-meta]', w)
      };
    }

    /* Wide screens: palace gate + pinned horizontal canvas */
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', function () {
      var section = scope();
      if (!section) return;
      var p = parts(section);
      if (!p.pin || !p.track || !p.worlds.length) return;
      var n = p.worlds.length;
      var b = p.worlds.map(bits);
      var centers = [];
      var dist = 0;
      var active = -1;
      var SKY = 0.3;                 // skyline speed relative to the canvas
      var DOOR = p.gate ? 1 : 0;     // timeline units for the doors
      var PAN = 6;                   // timeline units for the pan
      var stage = [section.querySelector('.hoa-ab-worlds__head'), section.querySelector('.hoa-ab-worlds__viewport')];
      section.classList.add('is-panning');

      // Pad the canvas so the first and last world can sit exactly at the centre.
      // Reads layout, so it only runs on (re)measure, never per frame.
      var measure = function () {
        var first = p.worlds[0];
        var last = p.worlds[n - 1];
        p.track.style.paddingLeft = Math.max(0, (window.innerWidth - first.offsetWidth) / 2) + 'px';
        p.track.style.paddingRight = Math.max(0, (window.innerWidth - last.offsetWidth) / 2) + 'px';
        centers = p.worlds.map(function (w) { return w.offsetLeft + w.offsetWidth / 2; });
        dist = Math.max(0, p.track.scrollWidth - window.innerWidth);
        if (p.skyline) p.skyline.style.width = Math.ceil(window.innerWidth + dist * SKY + 2) + 'px';
        return dist;
      };

      var setActive = function (i) {
        if (i === active) return;
        active = i;
        p.worlds.forEach(function (w, k) { w.classList.toggle('is-active', k === i); });
        p.pearls.forEach(function (el, k) {
          el.classList.toggle('is-active', k === i);
          el.classList.toggle('is-past', k < i);
          if (k === i) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
        });
        var tint = p.worlds[i].getAttribute('data-tint');
        if (tint) p.pin.style.setProperty('--tint', tint);
      };

      // Focus: each world eases in as it nears the centre, holds, then steps back.
      var sync = function () {
        var x = gsap.getProperty(p.track, 'x');
        var mid = window.innerWidth / 2;
        var span = window.innerWidth * 0.6;
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < n; i++) {
          var off = centers[i] + x - mid;
          if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = i; }
          var t = gsap.utils.clamp(-1, 1, off / span);   // +1 waiting right, -1 gone left
          var f = 1 - t * t;                               // focus 0..1
          var w = b[i];
          gsap.set(w.media, { opacity: 0.35 + 0.65 * f, scale: 0.92 + 0.08 * f });
          if (w.title) gsap.set(w.title, { opacity: 0.3 + 0.7 * f, y: (t > 0 ? 44 : -28) * (1 - f) });
          gsap.set(w.meta, { opacity: gsap.utils.clamp(0, 1, (f - 0.4) / 0.5), y: 18 * (1 - f) });
          if (w.img) gsap.set(w.img, { xPercent: -5 * t });
        }
        if (p.skyline) gsap.set(p.skyline, { x: x * SKY });
        setActive(best);
      };

      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: sync,
        scrollTrigger: {
          trigger: p.pin,
          start: 'top top',
          end: function () { return '+=' + Math.round(measure() * (PAN + DOOR) / PAN); },
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: function () { measure(); sync(); }
        }
      });

      if (p.gate) {
        var leafL = p.gate.querySelector('[data-hoa-ab-leaf="l"]');
        var leafR = p.gate.querySelector('[data-hoa-ab-leaf="r"]');
        var copy = p.gate.querySelector('[data-hoa-ab-gate-copy]');
        tl.to(copy, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power1.in' }, 0.02)
          .fromTo(leafL, { rotateY: 0 }, { rotateY: -88, duration: 0.85, ease: 'power2.inOut' }, 0.1)
          .fromTo(leafR, { rotateY: 0 }, { rotateY: 88, duration: 0.85, ease: 'power2.inOut' }, 0.1)
          .fromTo(stage, { scale: 0.94, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.1)
          .set(p.gate, { autoAlpha: 0 }, DOOR);
      }
      tl.fromTo(p.track, { x: 0 }, { x: function () { return -dist; }, duration: PAN }, DOOR);

      // Pearls: jump to a world (its centre lands mid-screen)
      var onPearl = function (e) {
        var k = +e.currentTarget.getAttribute('data-hoa-ab-pearl');
        var st = tl.scrollTrigger;
        var frac = dist ? gsap.utils.clamp(0, 1, (centers[k] - window.innerWidth / 2) / dist) : 0;
        var y = st.start + ((DOOR + frac * PAN) / (DOOR + PAN)) * (st.end - st.start);
        if (window.hoaLenis) window.hoaLenis.scrollTo(y, { duration: 1.6 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      };
      p.pearls.forEach(function (el) { el.addEventListener('click', onPearl); });
      measure();
      sync();

      return function () {
        section.classList.remove('is-panning');
        p.track.style.paddingLeft = '';
        p.track.style.paddingRight = '';
        if (p.skyline) p.skyline.style.width = '';
        p.pin.style.removeProperty('--tint');
        p.worlds.forEach(function (w) { w.classList.remove('is-active'); });
        b.forEach(function (w) { gsap.set([w.media, w.title, w.img].concat(w.meta).filter(Boolean), { clearProps: 'opacity,transform' }); });
        if (p.skyline) gsap.set(p.skyline, { clearProps: 'transform' });
        p.pearls.forEach(function (el) { el.removeEventListener('click', onPearl); el.classList.remove('is-active', 'is-past'); el.removeAttribute('aria-current'); });
      };
    });

    /* Phones: stacked worlds that settle into view, with a sticky counter */
    mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', function () {
      var section = scope();
      if (!section) return;
      var p = parts(section);
      if (!p.worlds.length) return;
      var n = p.worlds.length;
      section.classList.add('is-scrolly');

      p.worlds.forEach(function (w, i) {
        var b = bits(w);
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: w, start: 'top 88%', end: 'top 38%', scrub: true }
        })
          .fromTo(b.media, { opacity: 0.4, scale: 0.94 }, { opacity: 1, scale: 1 }, 0)
          .fromTo(b.title, { opacity: 0.3, y: 32 }, { opacity: 1, y: 0 }, 0)
          .fromTo(b.meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.05 }, 0.15);

        ScrollTrigger.create({
          trigger: w,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: function (self) {
            if (!self.isActive) return;
            p.worlds.forEach(function (o) { o.classList.toggle('is-active', o === w); });
            var tint = w.getAttribute('data-tint');
            if (tint) p.pin.style.setProperty('--tint', tint);
          }
        });
      });

      return function () {
        section.classList.remove('is-scrolly');
        p.pin.style.removeProperty('--tint');
        p.worlds.forEach(function (w) { w.classList.remove('is-active'); });
      };
    });
  }

  // Runs cb once the spritz preloader (snippets/preloader.liquid) has lifted, so the
  // opening motion is seen rather than played behind the overlay.
  function afterIntro(cb) {
    var h = document.documentElement;
    if (!h.classList.contains('pl-on')) { cb(); return; }
    var done = false;
    var go = function () { if (done) return; done = true; mo.disconnect(); cb(); };
    var mo = new MutationObserver(function () { if (!h.classList.contains('pl-on')) go(); });
    mo.observe(h, { attributes: true, attributeFilter: ['class'] });
    setTimeout(go, 10000); // never leave the opening parked if the preloader stalls
  }

  // Splits el's text into masked words: <span class="hoa-ab-wmask"><span class="hoa-ab-w">word</span></span>.
  // Keeps child elements (e.g. .hoa-ab-muted, .hoa-sr) and splits inside them; runs once per element.
  function maskWords(el) {
    if (el._hoaMasked) return el._hoaMasked;
    var out = [];
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { if (!n.classList.contains('hoa-sr')) walk(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var m = document.createElement('span'); m.className = 'hoa-ab-wmask';
          var w = document.createElement('span'); w.className = 'hoa-ab-w'; w.textContent = part;
          m.appendChild(w); frag.appendChild(m); out.push(w);
        });
        node.replaceChild(frag, n);
      });
    };
    walk(el);
    el._hoaMasked = out;
    return out;
  }

  // Splits the visible word of el into letters inside one mask (screen readers get aria-label).
  function maskLetters(el) {
    if (el._hoaLetters) return el._hoaLetters;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var node = Array.prototype.slice.call(el.childNodes).reverse().find(function (n) { return n.nodeType === 3 && n.nodeValue.trim(); });
    if (!node) return (el._hoaLetters = []);
    el.setAttribute('aria-label', label);
    var m = document.createElement('span'); m.className = 'hoa-ab-wmask'; m.setAttribute('aria-hidden', 'true');
    var letters = node.nodeValue.trim().split('').map(function (c) {
      var ch = document.createElement('span'); ch.className = 'hoa-ab-ch'; ch.textContent = c; m.appendChild(ch); return ch;
    });
    el.replaceChild(m, node);
    Array.prototype.slice.call(el.querySelectorAll('.hoa-sr')).forEach(function (sr) { sr.setAttribute('aria-hidden', 'true'); });
    el._hoaLetters = letters;
    return letters;
  }

  // Wraps each word of el in a span once (kept across rebuilds); returns the spans.
  function splitWords(el) {
    if (el._hoaWords) return el._hoaWords;
    var text = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    el._hoaWords = text.map(function (w, i) {
      var span = document.createElement('span');
      span.className = 'hoa-ab-lede-word';
      span.textContent = w;
      el.appendChild(span);
      if (i < text.length - 1) el.appendChild(document.createTextNode(' '));
      return span;
    });
    return el._hoaWords;
  }

  function build() {
    if (!hasGsap()) return;
    gsap.registerPlugin(ScrollTrigger);
    initLenis();

    mm = gsap.matchMedia();

    /* 03 The seven worlds. Created first: ScrollTrigger lays triggers out in creation
       order, so the pin spacing must exist before the triggers further down the page. */
    initSevenWorlds();

    /* 04 The meaning of our name: the stage holds under the header while one giant word
       changes script with each scroll step (the word's journey, one idea at a time).
       Added before any other trigger because .is-pinned makes the page taller. */
    var word = document.querySelector('[data-hoa-ab-word]');
    if (word) {
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
        var steps = gsap.utils.toArray('[data-hoa-ab-word-step]', word);
        var marks = gsap.utils.toArray('.hoa-ab-word__mark', word);
        if (steps.length < 2) return;
        word.classList.add('is-pinned');
        var current = -1;
        var show = function (i) {
          if (i === current) return;
          current = i;
          steps.forEach(function (el, k) {
            el.classList.toggle('is-active', k === i);
            el.classList.toggle('is-past', k < i);
          });
          marks.forEach(function (m, k) { m.classList.toggle('is-on', k <= i); });
        };
        show(0);
        ScrollTrigger.create({
          trigger: word.querySelector('.hoa-ab-word__track'),
          start: 'top top+=' + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hoa-header-h')) || 76),
          end: 'bottom bottom',
          onUpdate: function (self) { show(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))); }
        });
        return function () {
          word.classList.remove('is-pinned');
          steps.forEach(function (el) { el.classList.remove('is-active', 'is-past'); });
          marks.forEach(function (m) { m.classList.remove('is-on'); });
        };
      });
    }

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var ease = 'expo.out';

      /* 01 Opening bento */
      var hero = document.querySelector('[data-hoa-ab-hero]');
      if (hero) {
        var intro = gsap.timeline({ defaults: { ease: ease }, paused: true });
        afterIntro(function () { intro.play(); });
        intro
          .from(Array.prototype.slice.call(hero.querySelectorAll('[data-hoa-ab-rise]')).reduce(function (all, line) { return all.concat(maskWords(line)); }, []), {
            yPercent: 115, rotate: 5, transformOrigin: '0% 100%', duration: 1.3, stagger: 0.07
          }, 0.05)
          .from(hero.querySelectorAll('[data-hoa-ab-line]'), { y: 20, opacity: 0, duration: 1, stagger: 0.08 }, 0.3)
          .from(hero.querySelectorAll('[data-hoa-ab-tile]'), {
            y: 70, scale: 0.94, opacity: 0, duration: 1.4, stagger: 0.09, transformOrigin: '50% 100%'
          }, 0.35);
      }

      /* 01 Our story: the photograph opens from a framed window to the full width of the
         screen as it scrolls up, and settles from a slight zoom (the city arrives). */
      var win = document.querySelector('[data-hoa-ab-window]');
      if (win) {
        var headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hoa-header-h')) || 76;
        var winST = { trigger: win, start: 'top 88%', end: 'top top+=' + headerH, scrub: 0.6 };
        gsap.fromTo(win, { '--win': 0 }, { '--win': 1, ease: 'none', scrollTrigger: winST });
        var winImg = win.querySelector('[data-hoa-ab-window-img]');
        if (winImg) gsap.fromTo(winImg, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: Object.assign({}, winST) });
      }

      /* 04 The name: the letters of Agha rise one by one, the Persian آقا is revealed from
         right to left (the direction it is written) and the meaning follows (reading order). */
      var nameWord = document.querySelector('.hoa-ab-name__word');
      if (nameWord) {
        var nameTitle = nameWord.querySelector('.hoa-ab-name__title');
        var letters = nameTitle ? maskLetters(nameTitle) : [];
        var scriptEl = nameWord.querySelector('.hoa-ab-name__script');
        var meaningEl = nameWord.querySelector('.hoa-ab-name__meaning');
        var nameTl = gsap.timeline({ paused: true });
        if (letters.length) nameTl.from(letters, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 0);
        if (scriptEl) nameTl.fromTo(scriptEl, { clipPath: 'inset(-30% -10% -30% 100%)' }, { clipPath: 'inset(-30% -10% -30% 0%)', duration: 1.4, ease: 'power2.inOut', clearProps: 'clipPath' }, 0.35);
        if (meaningEl) nameTl.from(meaningEl, { y: 18, opacity: 0, duration: 1, ease: 'quart.out' }, 0.8);
        ScrollTrigger.create({ trigger: nameWord, start: 'top 82%', once: true, onEnter: function () { nameTl.play(); } });
      }

      /* 05 Philosophy heading: the words rise into place one by one as it arrives. */
      var philoHead = document.querySelector('.hoa-ab-philo__head');
      if (philoHead) {
        var philoWords = maskWords(philoHead);
        gsap.from(philoWords, {
          yPercent: 115, rotate: 5, transformOrigin: '0% 100%', duration: 1.2, ease: 'expo.out', stagger: 0.06,
          scrollTrigger: { trigger: philoHead, start: 'top 85%', once: true }
        });
      }

      /* 03 Philosophy: each photo tile opens from an arch into its full frame as it
         arrives, the photo settles and the words follow (echoes the arches, sets order). */
      var pillars = gsap.utils.toArray('[data-hoa-ab-pillar]');
      if (pillars.length) {
        var archClip = 'inset(12% 9% 0% 9% round 260px 260px 24px 24px)';
        var openClip = 'inset(0% 0% 0% 0% round 24px 24px 24px 24px)';
        gsap.set(pillars, { clipPath: archClip });
        gsap.set(pillars.map(function (el) { return el.querySelector('.hoa-ab-pillar__media'); }).filter(Boolean), { scale: 1.14 });
        gsap.set(pillars.map(function (el) { return [el.querySelector('.hoa-ab-pillar__word'), el.querySelector('.hoa-ab-pillar__copy')]; }).flat().filter(Boolean), { opacity: 0, y: 24 });
        ScrollTrigger.batch(pillars, {
          start: 'top 88%',
          once: true,
          onEnter: function (batch) {
            batch.forEach(function (el, i) {
              var d = i * 0.12;
              gsap.to(el, { clipPath: openClip, duration: 1.2, ease: 'quart.out', delay: d, clearProps: 'clipPath' });
              var media = el.querySelector('.hoa-ab-pillar__media');
              if (media) gsap.to(media, { scale: 1, duration: 1.6, ease: 'expo.out', delay: d });
              gsap.to([el.querySelector('.hoa-ab-pillar__word'), el.querySelector('.hoa-ab-pillar__copy')].filter(Boolean), {
                opacity: 1, y: 0, duration: 0.9, ease: 'quart.out', delay: d + 0.35, stagger: 0.08
              });
            });
          }
        });
      }

      // Photos drift a little inside their tiles and cards (the frames stay put).
      gsap.utils.toArray('[data-hoa-ab-parallax]').forEach(function (el) {
        gsap.fromTo(el, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* Headings rise in once */
      var ups = gsap.utils.toArray('[data-hoa-ab-up]');
      gsap.set(ups, { opacity: 0, y: 40 });
      ScrollTrigger.batch(ups, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: ease, stagger: 0.1, overwrite: true }); }
      });

      /* 02b Composed in Hyderabad: the Charminar draws itself line by line as the card
         scrolls in, and the Urdu city name surfaces behind it. */
      var hyd = document.querySelector('[data-hoa-ab-hyd]');
      if (hyd) {
        var panel = hyd.querySelector('.hoa-ab-hyd__visual');
        // Build from the ground up: each tier (data-o) draws its lines, then its arched
        // openings fill in with ink, so the building rises storey by storey while scrolling.
        var build = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: panel, start: 'top 80%', end: 'bottom 55%', scrub: 0.7 }
        });
        var tiers = {};
        hyd.querySelectorAll('[data-o]').forEach(function (el) {
          var o = +el.getAttribute('data-o');
          (tiers[o] = tiers[o] || { ln: [], fill: [] })[el.classList.contains('hoa-ab-hyd__fill') ? 'fill' : 'ln'].push(el);
        });
        Object.keys(tiers).map(Number).sort(function (a, b) { return a - b; }).forEach(function (o) {
          var at = o * 0.62;
          if (tiers[o].ln.length) build.fromTo(tiers[o].ln, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, stagger: 0.04 }, at);
          if (tiers[o].fill.length) build.fromTo(tiers[o].fill, { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: 0.03 }, at + 0.7);
        });
        var urdu = hyd.querySelector('[data-hoa-ab-hyd-urdu]');
        if (urdu) {
          gsap.fromTo(urdu, { opacity: 0, y: 50 }, {
            opacity: 1, y: -30, ease: 'none',
            scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        }
      }

      /* 04 Closing card grows to full size */
      var cta = document.querySelector('[data-hoa-ab-cta]');
      if (cta) {
        gsap.fromTo(cta, { scale: 0.9, borderRadius: 48 }, {
          scale: 1, borderRadius: 24, ease: 'none',
          scrollTrigger: { trigger: cta, start: 'top bottom', end: 'top 35%', scrub: 0.8 }
        });
      }
    });

    /* 02 Story line: its words light from faint to ink while the reader moves through the
       paragraphs beside it (pace of reading). Wide screens: the line is sticky, so the
       paragraphs drive it; phones: the line drives itself. */
    var lede = document.querySelector('[data-hoa-ab-lede]');
    if (lede) {
      var words = splitWords(lede);
      var ledeTween = function (trigger, start, end) {
        return gsap.fromTo(words, { opacity: 0.14, filter: 'blur(3px)' }, {
          opacity: 1, filter: 'blur(0px)', ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: trigger, start: start, end: end, scrub: 0.5 }
        });
      };
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
        ledeTween(lede, 'top 82%', 'bottom 38%');
      });
      mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', function () {
        ledeTween(lede, 'top 85%', 'bottom 45%');
      });
    }

    /* 02 Stacking cards: only where the cards are sticky (see CSS, 760px+) */
    mm.add('(min-width: 760px) and (prefers-reduced-motion: no-preference)', function () {
      var cards = gsap.utils.toArray('[data-hoa-ab-card]');
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        if (!next) return;
        gsap.to(card, {
          scale: 0.93,
          filter: 'brightness(0.86)',
          ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true }
        });
      });
    });

    // Images change heights and pan width once decoded.
    window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
  }

  function destroy() {
    if (mm) { mm.revert(); mm = null; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  document.addEventListener('shopify:section:load', function () { destroy(); build(); });
  document.addEventListener('shopify:section:unload', destroy);
  document.addEventListener('shopify:section:reorder', function () { destroy(); build(); });
})();
