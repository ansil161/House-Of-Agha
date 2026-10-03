/* ==========================================================================
   HOUSE OF AGHA — THE SCENT CONCIERGE · "Scent Discovery Field" (sections/hoa-scent-concierge.liquid)

   One master controller. conciergeState = { phase, activeScent, discoveryProgress }
     INTRO           scroll assembles the words, the bottle, the field and the cue
     IDLE            waiting; the cue says "Move to explore ↗" (touch: "Drag around the bottle")
     APPROACH        the pointer is near the bottle: it lifts and leans, the field brightens,
                     the cue becomes "Explore the scent"
     ACTIVE          the pointer is in the field: the ring draws where it has been, words surface
     DISCOVERY       the pointer has reached a word: the dot fills (≈0.3 s)
     SCENT_SELECTED  a family is found: tint, bottle, family + phrase, counter 0n / 04, trail turns
     FINAL_REVEAL    all four found: the field simplifies and "Your scent" appears with one link
     EXIT            the section is off screen; the frame loop stops

   Motion: ONE gsap.ticker callback writes every continuous value (bottle via quickTo, sheen, tints,
   word opacity/scale, ring segments, dot, trail). Discoveries are timelines; a new one kills the
   previous one. No window scroll listener: ScrollTrigger callbacks invalidate the cached rects.
   Durations follow the motion-design tokens (feedback 120ms, cue/counter 180–300ms ease-out-quart,
   discoveries 700–1200ms ease-out-expo). Reduced motion: no tilt, trail, motes or dot; instant changes.
   Everything lives in gsap.context / gsap.matchMedia and is reverted on section unload.
   ========================================================================== */
(function () {
  'use strict';

  var SELECTOR = '[data-hoa-st]';
  var instances = new WeakMap();
  var DWELL = 300;          // ms on a word before it is discovered (the dot fills meanwhile)
  var TRAIL_LIFE = 1100;    // ms a point of the trail lives
  var SEGS = 48;            // ring segments
  var RING = { cx: 0.5, cy: 0.52, rx: 0.4714, ry: 0.3771 };   // in units of the object box (matches the SVG)
  var EXPO = 'expo.out', QUART = 'quart.out';
  var ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DRIFT = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

  function $(s, r) { return r.querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function Concierge(section, data) {
    var self = this;
    this.s = section;
    this.data = data;
    this.el = {
      field: $('[data-st-field]', section), object: $('[data-st-object]', section),
      lift: $('[data-st-lift]', section), bottle: $('[data-st-bottle]', section), bottleIn: $('[data-st-bottle-in]', section),
      imgs: $$('[data-st-img]', section), sheen: $('[data-st-sheen]', section),
      glow: $('[data-st-glow]', section), motes: $('[data-st-motes]', section),
      ring: $('[data-st-ring]', section), segs: $('[data-st-segs]', section),
      line: $('[data-st-line]', section), vapor: $('[data-st-vapor]', section),
      dot: $('[data-st-dot]', section),
      cue: $('[data-st-cue]', section), cueText: $('[data-st-cue-text]', section),
      cueArrow: $('[data-st-cue-arrow]', section), cueDrag: $('[data-st-cue-drag] i', section),
      count: $('[data-st-count]', section), countN: $('[data-st-count-n]', section),
      scentCol: $('[data-st-scent-col]', section), scent: $('[data-st-scent]', section), final: $('[data-st-final]', section),
      tintOn: $('[data-st-tint-on]', section), intro: $$('[data-st-intro]', section)
    };
    this.tints = {};
    $$('[data-st-tint]', section).forEach(function (t) { self.tints[t.getAttribute('data-st-tint')] = t; });

    this.words = $$('[data-st-word]', section).map(function (el) {
      var f = self.familyById(el.getAttribute('data-st-id'));
      var span = $('span', el);
      return { el: el, span: span, family: f, near: 0, dwell: 0, op: 0, sc: 1, time: 0, cx: 0, cy: 0,
        setOp: gsap.quickSetter(el, 'opacity'), setSc: gsap.quickSetter(span, 'scale') };
    });

    this.state = { phase: 'INTRO', activeScent: null, discoveryProgress: 0 };
    this.found = [];
    this.awake = 0;           // scroll intro: how present the field is
    this.p = { cx: 0, cy: 0, on: false, t: 0, touch: false };
    this.box = null;
    this.trail = [];
    this.drift = [0, -1];
    this.segs = [];
    this.tl = null;
    this.active = false;
    this.tick = this.tick.bind(this);
    this.build();
  }

  Concierge.prototype.familyById = function (id) {
    return this.data.families.filter(function (f) { return f.id === id; })[0] || null;
  };
  Concierge.prototype.productByHandle = function (h) {
    return this.data.products.filter(function (p) { return p.handle === h; })[0] || this.data.products[0];
  };
  Concierge.prototype.phase = function (ph) { this.state.phase = ph; this.s.setAttribute('data-phase', ph.toLowerCase()); };

  /* --------------------------------------------------------------- setup */
  Concierge.prototype.build = function () {
    var self = this, s = this.s, ns = 'http://www.w3.org/2000/svg';
    s.classList.add('is-live');
    this.ctx = gsap.context(function () {}, s);

    // The ring, as 48 short arcs that light where the pointer has explored
    for (var i = 0; i < SEGS; i++) {
      var a0 = (i / SEGS) * Math.PI * 2, a1 = ((i + 0.82) / SEGS) * Math.PI * 2;
      var x0 = 350 + Math.cos(a0) * 330, y0 = 455 + Math.sin(a0) * 330, x1 = 350 + Math.cos(a1) * 330, y1 = 455 + Math.sin(a1) * 330;
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'A330 330 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1));
      this.el.segs.appendChild(path);
      this.segs.push({ el: path, v: 0, shown: -1 });
    }
    for (var m = 0; m < 9; m++) this.el.motes.appendChild(document.createElement('i'));

    this.words.forEach(function (w) {
      w.el.addEventListener('click', function (e) { e.preventDefault(); self.discover(w); });
      w.el.addEventListener('focus', function () { w.focus = true; });
      w.el.addEventListener('blur', function () { w.focus = false; });
    });
    this.el.final.addEventListener('click', function (e) { if (e.target.closest('[data-st-again]')) self.reset(); });

    var preloaded = false;
    this.preload = function () {
      if (preloaded) return; preloaded = true;
      self.data.products.forEach(function (p) { var im = new Image(); im.decoding = 'async'; im.src = p.image; });
    };

    this.mm = gsap.matchMedia(s);
    this.mm.add({
      fine: '(hover: hover) and (pointer: fine)',
      pinnable: '(min-width: 1024px) and (min-height: 640px)',
      reduce: '(prefers-reduced-motion: reduce)'
    }, function (c) {
      var k = c.conditions;
      self.reduce = !!k.reduce;
      self.fine = !!k.fine;
      self.s.classList.toggle('is-touch', !self.fine);
      self.resetInstant();
      var undo = [self.setupIntro(!!k.pinnable && self.fine && !self.reduce), self.setupPointer(), self.setupAmbient()];
      return function () { undo.forEach(function (fn) { if (fn) fn(); }); if (self.tl) { self.tl.kill(); self.tl = null; } };
    });
  };

  /* Scroll teaches first: words rise, the bottle settles, the field and ring appear, then the cue
     arrives and its arrow travels toward the bottle. Pinned briefly on desktop. */
  Concierge.prototype.setupIntro = function (pinned) {
    var self = this, el = this.el;
    this.setCue(this.fine ? 'Move to explore' : 'Drag around the bottle', true);
    if (this.reduce) { this.awake = 1; this.phase('IDLE'); return null; }
    this.s.classList.toggle('is-pinned', pinned);
    var tl = gsap.timeline({ paused: true });
    tl.fromTo(el.intro, { y: 28, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.1, ease: EXPO }, 0)
      .fromTo(el.lift, { y: 56, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.8, ease: EXPO }, 0.25)
      .fromTo(el.ring, { scale: 0.92, opacity: 0, transformOrigin: '50% 52%' }, { scale: 1, opacity: 1, duration: 0.8, ease: EXPO }, 0.4)
      .to(this, { awake: 1, duration: 0.6, ease: 'power2.out' }, 0.45)
      .fromTo(el.cue, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: QUART }, 0.75)
      .fromTo(el.cueArrow, { x: -14, y: 14 }, { x: 0, y: 0, duration: 0.6, ease: EXPO }, 0.8)
      .add(function () { if (self.state.phase === 'INTRO') self.phase('IDLE'); }, 1.2);
    var st;
    if (pinned) {
      st = ScrollTrigger.create({ trigger: this.s, start: 'top top', end: '+=80%', pin: true, pinSpacing: true,
        scrub: 0.6, anticipatePin: 1, refreshPriority: 1, invalidateOnRefresh: true, animation: tl,
        onUpdate: function () { self.box = null; } });
    } else {
      st = ScrollTrigger.create({ trigger: this.s, start: 'top 70%', end: 'max', once: true, onEnter: function () { tl.duration(1.8).play(0); } });
    }
    return function () {
      st.kill(); tl.progress(1).kill();
      gsap.set([el.intro, el.lift, el.ring, el.cue, el.cueArrow], { clearProps: 'transform,opacity,filter' });
      self.s.classList.remove('is-pinned');
    };
  };

  // The slow life of the field: motes drift, the cue's arrow leans toward the bottle, the drag hint slides
  Concierge.prototype.setupAmbient = function () {
    if (this.reduce) return null;
    var tl = gsap.timeline({ paused: true });
    $$('i', this.el.motes).forEach(function (m, i) {
      var a = i / 9 * Math.PI * 2 + i, r = 0.22 + (i % 3) * 0.08;
      gsap.set(m, { xPercent: 0, x: Math.cos(a) * r * 300, y: Math.sin(a) * r * 360, opacity: 0.18 + (i % 3) * 0.1 });
      tl.to(m, { x: '+=' + (18 + i * 3) * (i % 2 ? 1 : -1), y: '-=' + (26 + i * 4), duration: 6 + i, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 0);
    });
    tl.to(this.el.cueArrow, { x: 4, y: -4, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 1.4);
    tl.fromTo(this.el.cueDrag, { x: 0 }, { x: 19, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 0);
    this.ambient = tl;
    if (this.active) tl.play();
    var self = this;
    return function () { tl.kill(); self.ambient = null; gsap.set($$('i', self.el.motes), { clearProps: 'all' }); };
  };

  Concierge.prototype.setupPointer = function () {
    var self = this, s = this.s, obj = this.el.object, el = this.el;
    this.bottleTo = this.reduce ? null : {
      r: gsap.quickTo(el.bottle, 'rotation', { duration: 0.9, ease: 'power3.out' }),
      x: gsap.quickTo(el.bottle, 'x', { duration: 0.9, ease: 'power3.out' }),
      y: gsap.quickTo(el.bottle, 'y', { duration: 0.9, ease: 'power3.out' }),
      s: gsap.quickTo(el.bottle, 'scale', { duration: 0.9, ease: 'power3.out' })
    };
    this.dotTo = (this.reduce || !this.fine) ? null : {
      x: gsap.quickTo(el.dot, 'x', { duration: 0.18, ease: 'power3.out' }),
      y: gsap.quickTo(el.dot, 'y', { duration: 0.18, ease: 'power3.out' }),
      core: gsap.quickSetter($('.hoa-st__dot-core', el.dot), 'scale')
    };

    var onMove = function (e) {
      if (e.pointerType !== 'mouse' && !self.dragging) return;
      self.p.cx = e.clientX; self.p.cy = e.clientY; self.p.on = true; self.p.t = performance.now();
      self.p.touch = e.pointerType !== 'mouse';
    };
    var onDown = function (e) { if (e.pointerType !== 'mouse' && obj.contains(e.target)) { self.dragging = true; onMove(e); } };
    var onUp = function () { self.dragging = false; };
    var onLeave = function (e) { if (e.pointerType === 'mouse') self.p.on = false; };
    var invalidate = function () { self.box = null; };
    s.addEventListener('pointermove', onMove, { passive: true });
    s.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    s.addEventListener('pointerleave', onLeave);
    ScrollTrigger.addEventListener('refresh', invalidate);

    var st = ScrollTrigger.create({
      trigger: s, start: 'top bottom', end: 'bottom top',
      onUpdate: invalidate,
      onToggle: function (t) {
        self.setActive(t.isActive);
        if (t.isActive) { self.preload(); if (self.state.phase === 'EXIT') self.phase(self.found.length >= self.data.families.length ? 'FINAL_REVEAL' : 'IDLE'); }
        else if (self.state.phase !== 'INTRO') self.phase('EXIT');
      }
    });
    this.setActive(st.isActive);

    return function () {
      s.removeEventListener('pointermove', onMove); s.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      s.removeEventListener('pointerleave', onLeave);
      ScrollTrigger.removeEventListener('refresh', invalidate);
      st.kill(); self.setActive(false);
      gsap.set([el.bottle, el.dot], { clearProps: 'all' });
      self.bottleTo = null; self.dotTo = null;
    };
  };

  Concierge.prototype.setActive = function (on) {
    if (on === this.active) return;
    this.active = on;
    if (on) { gsap.ticker.add(this.tick); if (this.ambient) this.ambient.play(); }
    else { gsap.ticker.remove(this.tick); if (this.ambient) this.ambient.pause(); }
  };

  Concierge.prototype.measure = function () {
    var o = this.el.object.getBoundingClientRect(), f = this.el.field.getBoundingClientRect();
    var b = this.box = { cx: o.left + o.width * RING.cx, cy: o.top + o.height * RING.cy, w: o.width, h: o.height, fx: f.left, fy: f.top,
      r: o.width * RING.rx };   // ring radius in px (the box keeps the SVG's aspect, so rx·w = ry·h)
    this.words.forEach(function (w) {
      var r = w.el.getBoundingClientRect();
      w.cx = r.left + r.width / 2 - b.cx; w.cy = r.top + r.height / 2 - b.cy;
    });
  };

  /* --------------------------------------------------- the one frame loop */
  Concierge.prototype.tick = function (time, dt) {
    if (!this.box) this.measure();
    var b = this.box, p = this.p, el = this.el, now = performance.now(), st = this.state;
    dt = Math.min(dt || 16, 50);
    var k = dt / 16.67, i, w;
    if (p.on && p.touch && !this.dragging && now - p.t > 700) p.on = false;
    var final = st.phase === 'FINAL_REVEAL';

    var lx = p.cx - b.cx, ly = p.cy - b.cy, dist = Math.hypot(lx, ly);
    var zone = b.r * 1.55;                                   // the interaction field reaches past the ring
    var inField = p.on && dist < zone && st.phase !== 'INTRO';
    var prox = inField ? clamp(1 - dist / zone, 0, 1) : 0;
    this.prox = lerp(this.prox || 0, prox, 0.1 * k);

    // Phase from the pointer (discoveries set SCENT_SELECTED / FINAL_REVEAL themselves)
    if (!final && st.phase !== 'INTRO' && st.phase !== 'EXIT') {
      var base = this.found.length ? 'SCENT_SELECTED' : 'IDLE';
      if (inField && dist < b.r * 1.25) base = this.found.length ? 'SCENT_SELECTED' : 'ACTIVE';
      else if (inField) base = this.found.length ? 'SCENT_SELECTED' : 'APPROACH';
      if (st.phase !== 'DISCOVERY') this.phase(base);
    }
    if (!this.found.length && !final) {
      var engaged = st.phase === 'APPROACH' || st.phase === 'ACTIVE' || st.phase === 'DISCOVERY';
      this.setCue(engaged ? 'Explore the scent' : (this.fine ? 'Move to explore' : 'Drag around the bottle'));
    }

    // Bottle: lifts, leans with the pointer, breathes in scale; the light slides the other way
    if (this.bottleTo) {
      var nx = clamp(lx / (b.w * 0.6), -1, 1), ny = clamp(ly / (b.h * 0.5), -1, 1), e = this.prox;
      this.bottleTo.r(nx * 3 * e + ny * nx * 1.2 * e);
      this.bottleTo.x(nx * 8 * e);
      this.bottleTo.y(-6 * Math.min(1, e * 2.5) + ny * 4 * e);
      this.bottleTo.s(1 + 0.025 * Math.min(1, e * 2.5));
      el.sheen.style.setProperty('--sx', (-nx * 40 * e).toFixed(1) + 'px');
      el.sheen.style.setProperty('--sy', (-ny * 30 * e).toFixed(1) + 'px');
      el.sheen.style.opacity = (0.2 + 0.4 * e).toFixed(3);
    }
    el.glow.style.opacity = ((0.45 + 0.4 * this.prox) * (final ? 0.6 : 1) * this.awake).toFixed(3);

    // Ring: the arc under the pointer lights; explored arcs keep a faint memory
    var ringOn = !final && inField && Math.abs(dist - b.r) < b.r * 0.55;
    var hitAng = Math.atan2(ly / (b.h * RING.ry), lx / (b.w * RING.rx));
    var hit = ringOn ? ((Math.floor(hitAng / (Math.PI * 2) * SEGS) % SEGS) + SEGS) % SEGS : -1;
    for (i = 0; i < SEGS; i++) {
      var sg = this.segs[i], d = hit < 0 ? 99 : Math.min(Math.abs(i - hit), SEGS - Math.abs(i - hit));
      var tgt = d === 0 ? 0.75 : d === 1 ? 0.5 : d === 2 ? 0.28 : 0;
      sg.v = tgt > sg.v ? lerp(sg.v, tgt, 0.25 * k) : Math.max(sg.mem ? 0.16 : 0, sg.v - 0.004 * k);
      if (tgt >= 0.5) sg.mem = true;
      var shown = final ? 0 : Math.round(sg.v * 100);
      if (shown !== sg.shown) { sg.el.style.opacity = shown / 100; sg.shown = shown; }
    }

    // Words: hidden → surface as the pointer nears; the nearest grows; reaching one discovers it
    var radius = b.h * 0.26, best = null, bestN = 0;
    for (i = 0; i < this.words.length; i++) {
      w = this.words[i];
      var dw = Math.hypot(lx - w.cx, ly - w.cy);
      var n = final ? 0 : w.focus ? 1 : (inField ? clamp(1 - dw / radius, 0, 1) : 0);
      w.near = lerp(w.near, n, 0.16 * k);
      if (n > bestN) { bestN = n; best = w; }
      if (n > 0.3) w.time += dt;                       // where the visitor lingers decides "Your scent"
    }
    var floor = this.reduce ? 0.5 : (this.found.length ? 0.18 : 0.06 * this.awake);
    for (i = 0; i < this.words.length; i++) {
      w = this.words[i];
      var isActive = st.activeScent === w.family;
      var isFound = this.found.indexOf(w.family) > -1;
      var target = final ? 0 : Math.max(isActive ? 1 : isFound ? 0.42 : floor, w.near);
      w.op = lerp(w.op, target, (final ? 0.2 : 0.12) * k);
      w.setOp(w.op);
      var sc = isActive ? 1.18 : 1 + 0.12 * w.near;
      w.sc = lerp(w.sc, sc, 0.14 * k);
      w.setSc(w.sc);
      var canDwell = w === best && bestN > 0.62 && !isActive && !final && st.phase !== 'INTRO' && (!this.lockUntil || now > this.lockUntil);
      w.dwell = canDwell ? w.dwell + dt : 0;
      if (canDwell) { this.phase('DISCOVERY'); st.discoveryProgress = clamp(w.dwell / DWELL, 0, 1); }
      if (w.dwell >= DWELL) { w.dwell = 0; this.discover(w); }
    }
    if (!best || bestN <= 0.62) st.discoveryProgress = Math.max(0, st.discoveryProgress - 0.15 * k);
    if (st.phase === 'DISCOVERY' && st.discoveryProgress <= 0) this.phase(this.found.length ? 'SCENT_SELECTED' : 'ACTIVE');

    // Atmosphere: the side the pointer nears warms a little; the active family's wash sits under it
    for (i = 0; i < this.words.length; i++) {
      w = this.words[i];
      var want = st.activeScent === w.family || final ? 0 : w.near * 0.6;
      w.tint = lerp(w.tint || 0, want, 0.06 * k);
      this.tints[w.family.id].style.opacity = w.tint.toFixed(3);
    }

    // The pointer dot: · outside, ○ in the field, ◉ filling while a word is reached
    if (this.dotTo) {
      var show = p.on && !p.touch && dist < zone * 1.15;
      el.dot.style.opacity = show ? 1 : 0;
      if (show) {
        this.dotTo.x(p.cx - b.fx); this.dotTo.y(p.cy - b.fy);
        el.dot.classList.toggle('is-field', inField && !final);
        this.dotTo.core(inField && !final ? 0.14 + 0.62 * st.discoveryProgress : 0.24);
      }
    }

    this.drawTrail(now, k, inField && !final);
  };

  /* The exploration path: a hairline + faint vapour that drift in the active family's direction */
  Concierge.prototype.drawTrail = function (now, k, on) {
    if (this.reduce) return;
    var b = this.box, p = this.p, pts = this.trail;
    if (on) {
      var x = p.cx - b.fx, y = p.cy - b.fy, last = pts[pts.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 6) pts.push({ x: x, y: y, t: now });
    }
    while (pts.length && now - pts[0].t > TRAIL_LIFE) pts.shift();
    this.trailA = lerp(this.trailA || 0, pts.length > 2 ? 1 : 0, 0.08 * k);
    if (pts.length < 3) {
      if (this.trailDrawn) { this.el.line.setAttribute('d', ''); this.el.vapor.setAttribute('d', ''); this.trailDrawn = false; }
      return;
    }
    var dx = this.drift[0], dy = this.drift[1], i, a, c, ax, ay;
    for (i = 0; i < pts.length; i++) {
      a = pts[i];
      var age = (now - a.t) / TRAIL_LIFE, sway = Math.sin(now / 430 + i * 0.6) * 5 * age;
      a.ox = dx * 18 * age * age - dy * sway;
      a.oy = dy * 18 * age * age + dx * sway;
    }
    var d = 'M' + (pts[0].x + pts[0].ox).toFixed(1) + ' ' + (pts[0].y + pts[0].oy).toFixed(1);
    for (i = 1; i < pts.length - 1; i++) {
      a = pts[i]; c = pts[i + 1];
      ax = a.x + a.ox; ay = a.y + a.oy;
      d += 'Q' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' ' + ((ax + c.x + c.ox) / 2).toFixed(1) + ' ' + ((ay + c.y + c.oy) / 2).toFixed(1);
    }
    this.el.line.setAttribute('d', d);
    this.el.vapor.setAttribute('d', d);
    this.el.line.style.opacity = (0.9 * this.trailA).toFixed(3);
    this.el.vapor.style.opacity = this.trailA.toFixed(3);
    this.trailDrawn = true;
  };

  /* ------------------------------------------------------------- the cue */
  Concierge.prototype.setCue = function (text, instant) {
    var t = this.el.cueText;
    if (this.cueWord === text) return;
    this.cueWord = text;
    if (instant || this.reduce) { t.textContent = text; return; }
    if (this.cueTl) this.cueTl.kill();
    this.cueTl = gsap.timeline()
      .to(t, { yPercent: -110, opacity: 0, duration: 0.18, ease: 'quad.in' })
      .add(function () { t.textContent = text; })
      .fromTo(t, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, ease: QUART });
  };

  /* --------------------------------------------------------- discoveries */
  Concierge.prototype.timeline = function () {
    if (this.tl) this.tl.kill();
    this.tl = gsap.timeline();
    if (this.reduce) this.tl.timeScale(60);
    return this.tl;
  };

  Concierge.prototype.discover = function (w) {
    var f = w.family, el = this.el, st = this.state, self = this;
    if (!f || st.phase === 'FINAL_REVEAL' || st.activeScent === f) return;
    var isNew = this.found.indexOf(f) < 0;
    if (isNew) this.found.push(f);
    st.activeScent = f; st.discoveryProgress = 0;
    this.phase('SCENT_SELECTED');
    this.lockUntil = performance.now() + 700;
    this.drift = DRIFT[f.zone] || [0, -1];
    var tl = this.timeline();

    // The cue has done its job
    if (this.found.length === 1) tl.to(el.cue, { opacity: 0, y: 6, duration: 0.24, ease: 'quad.in' }, 0);

    // Atmosphere, bottle, field
    el.tintOn.style.backgroundColor = f.tint;
    tl.fromTo(el.tintOn, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'sine.inOut' }, 0);
    this.swapBottle(this.productByHandle(f.bottle), tl, 0.05);
    var turn = f.zone === 'left' ? -4 : f.zone === 'right' ? 4 : f.zone === 'top' ? -2 : 2;
    if (!this.reduce) {
      tl.to(el.bottleIn, { rotation: turn, duration: 0.5, ease: QUART }, 0.05)
        .to(el.bottleIn, { rotation: 0, duration: 1.2, ease: EXPO }, 0.55)
        .fromTo(el.glow, { scale: 1 }, { scale: 1.08, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
    }

    // Counter: the number rolls up to the new count
    if (isNew) {
      var n = pad(this.found.length);
      if (el.count.hidden) {
        el.count.hidden = false; el.countN.textContent = n;
        tl.fromTo(el.count, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: QUART }, 0.1);
      } else {
        tl.to(el.countN, { yPercent: -100, duration: 0.18, ease: 'quad.in' }, 0.1)
          .add(function () { el.countN.textContent = n; }, 0.28)
          .fromTo(el.countN, { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: QUART }, 0.28);
      }
    }

    // The family, letter by letter, then its phrase line by line
    var chars = f.label.split('').map(function (ch) { return '<span class="ch">' + esc(ch) + '</span>'; }).join('');
    var lines = (f.line.match(/[^.]+\.?/g) || [f.line]).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('');
    el.scent.innerHTML = '<p class="hoa-st__fam" aria-label="' + esc(f.label) + '"><span aria-hidden="true">' + chars + '</span></p>' +
      '<p class="hoa-st__phrase">' + lines + '</p>';
    var fam = $('.hoa-st__fam', el.scent);
    tl.fromTo(fam, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(-12% -12% -12% -12%)', duration: 1, ease: EXPO }, 0.15)
      .fromTo($$('.ch', fam), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.04, ease: EXPO }, 0.15)
      .fromTo($$('.hoa-st__phrase span', el.scent), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: EXPO }, 0.6);

    if (this.found.length >= this.data.families.length) tl.add(function () { self.revealFinal(); }, 1.9);
  };

  /* All four found: labels and ring leave, the bottle grows, "Your scent" and the one link appear */
  Concierge.prototype.revealFinal = function () {
    var el = this.el;
    var fav = this.words.slice().sort(function (a, b) { return b.time - a.time; })[0].family;
    var p = this.productByHandle(fav.bottle);
    this.phase('FINAL_REVEAL');
    this.state.activeScent = fav;
    var tl = this.timeline();
    tl.to(el.scentCol, { opacity: 0, y: -10, duration: 0.3, ease: 'quad.in' }, 0)
      .to(el.ring, { opacity: 0, duration: 0.4, ease: 'quad.in' }, 0);
    el.tintOn.style.backgroundColor = fav.tint;
    tl.to(el.tintOn, { opacity: 1, duration: 0.8 }, 0);
    this.swapBottle(p, tl, 0.1);
    tl.fromTo(el.bottleIn, { scale: 1, rotation: 8 }, { scale: 1.1, rotation: 0, duration: 1.2, ease: EXPO }, 0.2);

    el.final.innerHTML =
      '<p class="hoa-st__kicker">Your scent</p>' +
      '<p class="hoa-st__name">' + esc(p.name) + '</p>' +
      '<p class="hoa-st__traits">' + esc(fav.label) + ' · ' + esc(fav.line.replace(/\./g, '').split(/\s+/).slice(0, 3).join(' · ')) + '</p>' +
      '<p class="hoa-st__desc">' + esc(p.line) + '</p>' +
      '<a class="hoa-st__cta" href="' + esc(p.url) + '">Discover ' + esc(p.name) + '<span class="hoa-st__cta-icon">' + ARROW + '</span></a>' +
      '<button type="button" class="hoa-st__again" data-st-again>Explore again</button>';
    gsap.set(el.final, { opacity: 1 });
    var kids = Array.prototype.slice.call(el.final.children);
    tl.fromTo(kids[0], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: QUART }, 0.35)
      .fromTo(kids[1], { clipPath: 'inset(0 0 100% 0)', y: 24 }, { clipPath: 'inset(-12% -12% -12% -12%)', y: 0, duration: 1.1, ease: EXPO }, 0.45)
      .fromTo(kids.slice(2, 4), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: EXPO }, 0.8)
      .fromTo(kids.slice(4), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: EXPO }, 1.1);
  };

  Concierge.prototype.reset = function () {
    var el = this.el, self = this;
    var tl = this.timeline();
    tl.to(el.final, { opacity: 0, y: 8, duration: 0.25, ease: 'quad.in', onComplete: function () { el.final.innerHTML = ''; gsap.set(el.final, { clearProps: 'transform' }); } }, 0)
      .to(el.tintOn, { opacity: 0, duration: 0.6 }, 0)
      .to(el.bottleIn, { scale: 1, duration: 0.8, ease: EXPO }, 0)
      .add(function () { self.clearJourney(); }, 0.25)
      .to(el.ring, { opacity: 1, duration: 0.6, ease: QUART }, 0.3)
      .to(el.scentCol, { opacity: 1, y: 0, duration: 0.01 }, 0.3)
      .fromTo(el.cue, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: QUART }, 0.4);
    this.swapBottle(this.productByHandle(this.familyById('woody').bottle), tl, 0.1);
  };

  Concierge.prototype.clearJourney = function () {
    var el = this.el;
    this.found = []; this.state.activeScent = null; this.state.discoveryProgress = 0;
    this.phase('IDLE');
    this.words.forEach(function (w) { w.time = 0; w.dwell = 0; });
    this.segs.forEach(function (s) { s.v = 0; s.mem = false; });
    el.scent.innerHTML = ''; el.count.hidden = true; el.countN.textContent = '01';
    this.drift = [0, -1];
    this.cueWord = null;
    this.setCue(this.fine ? 'Move to explore' : 'Drag around the bottle', true);
  };

  Concierge.prototype.swapBottle = function (p, tl, at) {
    var imgs = this.el.imgs;
    var on = imgs[0].classList.contains('is-on') ? imgs[0] : imgs[1];
    var off = on === imgs[0] ? imgs[1] : imgs[0];
    if (on.getAttribute('src') === p.image) return;
    tl.add(function () {
      off.src = p.image; off.alt = p.name + ' Eau de Parfum'; on.alt = '';
      var show = function () { off.classList.add('is-on'); on.classList.remove('is-on'); };
      if (off.complete && off.naturalWidth) show(); else off.addEventListener('load', show, { once: true });
    }, at);
  };

  Concierge.prototype.resetInstant = function () {
    var el = this.el;
    if (this.tl) { this.tl.kill(); this.tl = null; }
    this.phase('INTRO'); this.awake = 0; this.trail = [];
    this.clearJourney();
    this.phase('INTRO');
    el.final.innerHTML = '';
    el.tintOn.style.opacity = 0;
    gsap.set([el.bottleIn, el.scentCol, el.final, el.cue], { clearProps: 'transform,opacity' });
    this.words.forEach(function (w) { w.near = 0; w.op = 0; w.sc = 1; });
    this.box = null;
  };

  /* ----------------------------------------------------------------- boot */
  function init(section) {
    if (instances.has(section)) return;
    if (!window.gsap || !window.ScrollTrigger) return;    // stays four plain links
    var data;
    try { data = JSON.parse($('[data-st-data]', section).textContent); } catch (e) { return; }
    if (!data || !data.families || !data.products) return;
    gsap.registerPlugin(ScrollTrigger);
    instances.set(section, new Concierge(section, data));
  }
  function destroy(section) {
    var c = instances.get(section);
    if (!c) return;
    c.mm.revert(); c.ctx.revert(); c.setActive(false);
    instances.delete(section);
  }
  function boot() { Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', function (e) { var s = e.target.querySelector(SELECTOR); if (s) init(s); });
  document.addEventListener('shopify:section:unload', function (e) { var s = e.target.querySelector(SELECTOR); if (s) destroy(s); });
})();
