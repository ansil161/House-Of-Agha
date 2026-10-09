/* ==========================================================================
   HOUSE OF AGHA · 3D LOGO (hero)
   The gold Agha logo (assets/agha-crest.glb, the client's model), drawn on a
   fixed, transparent layer over the page (sections/hoa-hero.liquid loads this).

   1. Open: it appears exactly over the logo printed on the Oud Fury label in the
      hero photo, then lifts off and comes forward to rest centred on the bottle, larger,
      floating gently; from there it travels down the homepage (7).
   2. Hover (mouse over the logo): it stops spinning, comes round to face front
      the short way, and leans toward the cursor, limited to ±MAX_YAW / ±MAX_PITCH.
   3. Drag: turns it in place, in any direction (DRAG_SPEED rad per px); it does
      not move. Pointer capture, grab / grabbing cursor. On touch, a drag that
      starts on the logo turns the logo (the page doesn't scroll under it).
   4. Release: a flick keeps it turning, sideways and/or top over bottom (up to
      MAX_FLING rad/s), and it eases into the idle spin.
   5. Idle: whenever nobody is holding or hovering it, it turns slowly left to right
      on its own (SPIN_SECONDS per turn) and settles upright. SPIN_VERTICAL: true would
      add a top-over-bottom tumble (SPIN_SECONDS_VERTICAL per turn).
   6. A small "Drag to rotate" hint with a hand icon sits under it at rest, only
      until the visitor's first drag; after that it never shows again (remembered
      in localStorage, so not on later visits either).
   7. The journey: the same logo travels down the homepage. Each stop is pinned to its
      content (it scrolls with it); between stops it glides to the next spot and size,
      fading out across product/film stretches and back in at the next stop (JOURNEY
      below). Rendering stops while it is hidden. Desktop: hero -> "Seven fragrances"
      headline -> The House photo seal -> World headline -> gone. Phones: hero -> The
      House seal -> gone.

   Springs integrate in fixed 1/240 s steps: identical at any frame rate.
   Reduced motion: no lift animation, float, spin or hover tilt; drag works and it
   settles back to front. three.js (not otherwise in the theme) loads from jsdelivr after
   the page's own load; rendering stops while the journey has it hidden.
   ========================================================================== */

/* ----------------------------- CONFIG ----------------------------------- */
var HOA_CREST_CONFIG = {
  MODEL_URL: null,            // null = data-src on [data-hoa-logo3d] (hero setting, or the agha-crest.glb asset)
  MAX_YAW: 25,                // degrees, hover left/right
  MAX_PITCH: 15,              // degrees, hover up/down
  DRAG_SPEED: 0.01,           // radians of turn per pixel dragged
  HOVER_STIFFNESS: 42,        // hover follow spring (softer, so it trails the cursor)
  HOVER_DAMPING: 12.5,
  INTRO_DELAY: 450,           // ms after the page shows
  INTRO_MS: 2000,             // lift-off duration
  MAX_FLING: 9,               // rad/s: the fastest a released flick keeps it turning
  IDLE_SPIN: true,            // turns on its own when nobody holds or hovers it
  SPIN_VERTICAL: false,       // false = left/right only; it stays upright (user, 2026-10-09)
  SPIN_SECONDS: 12,           // idle (IDLE_SPIN only): one full turn left to right
  SPIN_SECONDS_VERTICAL: 18,  // idle: one full turn top over bottom (different, so it never repeats one loop)
  // resting place, in units of the printed logo's height. side: 'center' (on the bottle),
  // 'left' or 'right' (beside it, gap apart); line: true = on the headline's line ("House ·
  // logo · of Agha"), else rise: up from the printed logo (negative = down); lineShift: nudge
  // along that line's height (+ = down); hint: "Drag to rotate" 'left' / 'right' / 'above' / 'below'
  HOME: {
    desktop: { side: 'center', scale: 2.6, gap: 0, line: true, lineShift: 0, hint: 'above' }, // between "House" and "of Agha"
    phone:   { side: 'center', scale: 1.8, gap: 0, rise: -2.3, hint: 'left' }    // words stack over the bottle: on the lower body
  },
  // where the logo is printed on the bottle photos (fractions of the bottle image)
  LABEL: {
    desktop: { cx: 0.4969, cy: 0.4285, h: 0.1085 },   // hoa-hero-oud-fury-bottle.webp
    phone:   { cx: 0.4948, cy: 0.4305, h: 0.1116 }    // hoa-oud-fury-portrait-bottle.webp
  },
  // the homepage journey: where the logo holds still (as fractions of the viewport
  // height: it arrives when its spot is at `in`, leaves when it reaches `out`)
  JOURNEY: {
    WIDE: 1024,               // px: below this only the hero and The House stops (layouts stack)
    HERO_HOLD: 0.25,          // hero: holds until the page has scrolled this much of a viewport
    FADE: 0.35,               // share of each hidden stretch spent fading out / back in...
    FADE_VH: 0.5,             // ...but never longer than this much scroll (x viewport): long stretches stay dark
    END_FADE: 0.3,            // after the last stop it fades out over this much scroll (x viewport)
    SMOOTH: 170               // spring stiffness on the travelling position (inertia)
  },
  THREE_URL: 'https://cdn.jsdelivr.net/npm/three@0.169.0/'
};
/* ------------------------------------------------------------------------ */

(function (C) {
  'use strict';

  var anchor = document.querySelector('[data-hoa-logo3d]');
  var bottle = document.querySelector('[data-hoa-hero-bottle] img');
  var modelUrl = C.MODEL_URL || (anchor && anchor.getAttribute('data-src'));
  if (!anchor || !bottle || !modelUrl || !window.IntersectionObserver) return;

  var html = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEG = Math.PI / 180;
  var TAU = Math.PI * 2;
  var MAX_YAW = C.MAX_YAW * DEG;
  var MAX_PITCH = C.MAX_PITCH * DEG;
  var STEP = 1 / 240;

  /* ---------- the layer ---------- */
  var layer = document.createElement('div');
  layer.className = 'hoa-logo3d';
  layer.hidden = true;
  var canvas = document.createElement('canvas');
  canvas.className = 'hoa-logo3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var hit = document.createElement('button');
  hit.type = 'button';
  hit.className = 'hoa-logo3d__hit';
  hit.setAttribute('aria-label', anchor.getAttribute('data-label') || 'House of Agha logo. Drag it anywhere.');
  var hint = document.createElement('div');                 // "Drag to rotate" + hand
  hint.className = 'hoa-logo3d__hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.innerHTML = '<span class="hoa-logo3d__hand"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>' +
    '<path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></span>' +
    '<span class="hoa-logo3d__hint-text"></span>';
  hint.lastChild.textContent = anchor.getAttribute('data-hint') || 'Drag to rotate';
  layer.appendChild(canvas);
  layer.appendChild(hint);
  layer.appendChild(hit);
  document.body.appendChild(layer);

  /* ---------- load: after the page's own load (the hero photo comes first) ---------- */
  function boot() {
    var V = C.THREE_URL;
    Promise.all([
      import(V + '+esm'),
      import(V + 'examples/jsm/loaders/GLTFLoader.js/+esm'),
      import(V + 'examples/jsm/environments/RoomEnvironment.js/+esm'),
      import(V + 'examples/jsm/libs/meshopt_decoder.module.js/+esm')
    ]).then(function (m) {
      init(m[0], m[1].GLTFLoader, m[2].RoomEnvironment, m[3].MeshoptDecoder);
    }).catch(fail);
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot, { once: true });

  function fail(err) {
    layer.remove();
    if (window.console && err) console.warn('[hoa-crest]', err);
  }

  // the page is showing once the preloader starts its reveal (or there is none)
  var revealedAt = html.classList.contains('pl-on') ? 0 : performance.now();
  document.addEventListener('pl:reveal', function () { revealedAt = revealedAt || performance.now(); });

  function clamp(v, a) { return Math.max(-a, Math.min(a, v)); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function wrap(a) { return a - TAU * Math.ceil((a - Math.PI) / TAU); }   // into (-π, π]
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function mix(a, b, t) { return a + (b - a) * t; }

  function init(THREE, GLTFLoader, RoomEnvironment, MeshoptDecoder) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { fail(e); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral rendering, as a standard glTF viewer (user 2026-10-09: "the exact 3D file, no effect from our side,
    // the exact metallic gold"): Khronos PBR Neutral tone mapping keeps the file's base colour true, exposure 1.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    // The file's own look (user 2026-10-09: "exact 3D file glazing, not added from our side"): the GLB stores only its
    // material (metal 1, roughness 0.22, its gold) and no lights, so the glaze comes from reflecting a viewer's studio.
    // This is the standard neutral glTF-viewer studio (three.js RoomEnvironment), unmodified: no added strips or lights.
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // a long lens: little perspective skew away from the screen centre
    var FOV = 18, DIST = 20;
    var camera = new THREE.PerspectiveCamera(FOV, 1, 1, 60);
    camera.position.set(0, 0, DIST);
    var frameH = 2 * DIST * Math.tan(FOV * DEG / 2);       // world units across the viewport height

    var pivot = new THREE.Group();
    scene.add(pivot);
    var fit = new THREE.Group();
    pivot.add(fit);
    var dims;

    var vw = 0, vh = 0;
    function size() {
      vw = window.innerWidth; vh = window.innerHeight;
      hintW = 0;
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
      wake();
    }

    /* ---------- state ---------- */
    var yaw = { x: 0, v: 0 }, pitch = { x: 0, v: 0 };     // rotation
    var grab = { x: 0, v: 0 };                            // 0..1, held: a touch closer
    var pointer = null;                                   // mouse position while over the logo
    var overLogo = false;
    var drag = null;
    var spinning = false, spinVel = 0, spinVelV = 0;      // turning on its own: sideways, top over bottom
    var hintW = 0, hintH = 0;
    var HINT_KEY = 'agha-logo3d-dragged';
    var hintDone = false;
    try { hintDone = localStorage.getItem(HINT_KEY) === '1'; } catch (_) {}
    var introStart = -1;                                  // ms; -1 = not yet, 0 = skipped
    var pose = null;                                      // { x, y, s }: centre + logo height, px
    var J = C.JOURNEY;
    var px = { x: 0, v: 0 }, py = { x: 0, v: 0 }, ps = { x: 0, v: 0 };   // travelling position, smoothed
    var snap = true;                                      // next frame: jump straight to the target
    var running = false, raf = 0, last = 0, acc = 0, t0 = performance.now();

    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(modelUrl, function (gltf) {
      var model = gltf.scene;
      var box = new THREE.Box3().setFromObject(model);
      dims = box.getSize(new THREE.Vector3());
      model.position.sub(box.getCenter(new THREE.Vector3()));
      fit.add(model);
      
      // landed below the hero (reload, anchor): no lift-off, it is simply there
      if (reduceMotion || window.scrollY > window.innerHeight * 0.5) introStart = 0;

      size();
      window.addEventListener('resize', size);
      window.addEventListener('scroll', wake, { passive: true });
      wake();
      document.addEventListener('visibilitychange', function () { document.hidden ? pause() : wake(); });
    }, undefined, fail);

    /* ---------- where the logo is ---------- */
    // the printed logo on the label, and the bottle's drawn edges (object-fit: contain)
    function label() {
      var r = bottle.getBoundingClientRect();
      var nw = bottle.naturalWidth || 480, nh = bottle.naturalHeight || 1272;
      var k = Math.min(r.width / nw, r.height / nh);
      var dw = nw * k, dh = nh * k;
      var left = r.left + (r.width - dw) / 2, top = r.top + (r.height - dh) / 2;
      var phone = /portrait/.test(bottle.currentSrc || bottle.src);
      var L = phone ? C.LABEL.phone : C.LABEL.desktop;
      return { x: left + L.cx * dw, y: top + L.cy * dh, s: L.h * dh, left: left, right: left + dw, home: phone ? C.HOME.phone : C.HOME.desktop };
    }
    // the headline's words ("House", "of Agha"): their line's vertical centre
    var words = document.querySelectorAll('[data-hoa-hero-word]');
    function lineY() {
      if (!words.length) return null;
      var r = words[0].getBoundingClientRect();
      return r.height ? r.top + r.height / 2 : null;
    }
    function homePose(L) {
      var H = L.home, s = L.s * H.scale, gap = L.s * H.gap;
      var ly = H.line ? lineY() : null;
      return {
        x: H.side === 'center' ? L.x : H.side === 'left' ? L.left - gap - s / 2 : L.right + gap + s / 2,
        y: ly !== null ? ly + (H.lineShift || 0) * s : L.y - L.s * (H.rise || 0),
        s: s,
        hint: H.hint || 'below'
      };
    }

    /* ---------- the journey: the other stops down the homepage ---------- */
    // each returns { x, y, s } in viewport px, pinned to its content, or null when it doesn't fit
    function textBox(el) {
      var rg = document.createRange();
      rg.selectNodeContents(el);
      return rg.getBoundingClientRect();
    }
    function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    var sigHead = document.querySelector('.hoa-frag-section h2');
    var houseSeal = document.querySelector('[data-vessel-seal]');
    var worldHead = document.querySelector('.hoa-world-section h2');
    var worldLede = document.querySelector('.hoa-world-section .hoa-lede');
    var STOPS = [
      { // "Seven fragrances. Seven worlds."  ◉   right of the headline, on its line
        wide: true, inAt: 0.72, outAt: 0.24,
        pose: function () {
          if (!sigHead) return null;
          var t = textBox(sigHead), h = sigHead.getBoundingClientRect();
          var s = clampN(vw * 0.072, 84, 118);
          if (h.right - t.right < s + 48) return null;
          return { x: (t.right + h.right) / 2, y: t.top + t.height / 2, s: s };
        }
      },
      { // The House ("The Vessel"): pressed onto the finished bottle's upper body. The seal sits
        // at the end of the pinned stretch (hoa-vessel.js), so the logo rides up with it and lands
        // just as the bottle settles, then leaves with the section.
        wide: false, inAt: 0.8, outAt: 0.25,
        pose: function () {
          if (!houseSeal) return null;
          var r = houseSeal.getBoundingClientRect();
          var s = parseFloat(houseSeal.dataset.size) || 0;
          if (!s) return null;
          return { x: r.left, y: r.top, s: s };
        }
      },
      { // World: between "Beyond the bottle. Into the day." and its intro line, then it is gone
        wide: true, inAt: 0.75, outAt: 0.25,
        pose: function () {
          if (!worldHead || !worldLede) return null;
          var t = textBox(worldHead), l = worldLede.getBoundingClientRect();
          var s = clampN(vw * 0.075, 84, 120);
          if (l.left - t.right < s + 40) return null;
          return { x: (t.right + l.left) / 2, y: t.top + t.height / 2, s: s };
        }
      }
    ];

    // where it should be for this scroll position: { x, y, s, a (0..1), hero (0..1) }
    function journey(heroPose) {
      var sy = window.scrollY, list = [{ pose: heroPose, a: 0, b: vh * J.HERO_HOLD, hero: true }];
      var wide = vw >= J.WIDE;
      for (var n = 0; n < STOPS.length; n++) {
        var st = STOPS[n];
        if (st.wide && !wide) continue;
        var p = st.pose();
        if (!p) continue;
        var doc = p.y + sy;                                 // the spot's place on the page
        list.push({ pose: p, a: doc - st.inAt * vh, b: doc - st.outAt * vh });
      }
      for (var m = 1; m < list.length; m++) {               // never let two holds overlap
        if (list[m].a < list[m - 1].b + 1) list[m - 1].b = list[m].a - 1;
      }
      var k, A, B, t;
      for (k = 0; k < list.length; k++) {
        A = list[k];
        if (sy <= A.b) {                                     // holding at stop k
          if (sy >= A.a || k === 0) return { x: A.pose.x, y: A.pose.y, s: A.pose.s, a: 1, hero: A.hero ? 1 : 0 };
          B = A; A = list[k - 1];                            // between stop k-1 and k
          t = clamp01((sy - A.b) / Math.max(1, B.a - A.b));
          var e = ease(t);
          var f = Math.min(J.FADE, J.FADE_VH * vh / Math.max(1, B.a - A.b));
          var a = t < f ? 1 - t / f : t > 1 - f ? (t - (1 - f)) / f : 0;   // out, hidden, back in
          return {
            x: mix(A.pose.x, B.pose.x, e), y: mix(A.pose.y, B.pose.y, e), s: mix(A.pose.s, B.pose.s, e),
            a: a, hero: A.hero ? 1 - e : 0
          };
        }
      }
      A = list[list.length - 1];                             // past the last stop: fade out for good
      t = clamp01((sy - A.b) / (vh * J.END_FADE));
      return { x: A.pose.x, y: A.pose.y, s: A.pose.s, a: 1 - t, hero: A.hero ? 1 : 0 };
    }

    /* ---------- hover: over the logo it stops and leans toward the cursor ---------- */
    hit.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { overLogo = true; wake(); } });
    hit.addEventListener('pointerleave', function () { overLogo = false; pointer = null; wake(); });
    hit.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') { overLogo = true; pointer = { x: e.clientX, y: e.clientY }; }
    });

    function hoverTarget() {
      if (reduceMotion || !pointer || !pose) return [0, 0];
      var nx = (pointer.x - pose.x) / (pose.s / 2);
      var ny = (pointer.y - pose.y) / (pose.s / 2);
      return [clamp(nx, 1) * MAX_YAW, clamp(ny, 1) * MAX_PITCH];
    }

    /* ---------- drag: turn it in place, any direction ---------- */
    hit.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), vel: 0, velV: 0, moved: false };
      if (spinning) { yaw.x = wrap(yaw.x); pitch.x = wrap(pitch.x); spinning = false; }
      spinVel = spinVelV = 0;
      yaw.v = pitch.v = 0;
      layer.classList.add('is-dragging');
      try { hit.setPointerCapture(e.pointerId); } catch (_) {}
      wake();
    });
    hit.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var now = performance.now();
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (dx || dy) drag.moved = true;
      yaw.x += dx * C.DRAG_SPEED;
      pitch.x += dy * C.DRAG_SPEED;
      var dt = Math.max(8, now - drag.t) / 1000;
      drag.vel = drag.vel * 0.6 + (dx * C.DRAG_SPEED / dt) * 0.4;     // smoothed flick speed, sideways
      drag.velV = drag.velV * 0.6 + (dy * C.DRAG_SPEED / dt) * 0.4;   // and top over bottom
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
      wake();
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dragged = drag.moved;
      // a flick keeps turning; it then slows (or speeds) into the idle spin
      var fresh = performance.now() - drag.t < 120;
      var fling = fresh ? drag.vel : 0, flingV = fresh ? drag.velV : 0;
      drag = null;
      layer.classList.remove('is-dragging');
      // first real drag: the hint has done its job, never show it again
      if (dragged && !hintDone) {
        hintDone = true;
        try { localStorage.setItem(HINT_KEY, '1'); } catch (_) {}
      }
      yaw.x = wrap(yaw.x);
      pitch.x = wrap(pitch.x);
      yaw.v = clamp(fling, C.MAX_FLING);
      pitch.v = clamp(flingV, C.MAX_FLING);
      wake();
    }
    hit.addEventListener('pointerup', release);
    hit.addEventListener('pointercancel', release);
    hit.addEventListener('lostpointercapture', release);

    /* ---------- springs ---------- */
    function spring(s, target, k, d, h) {
      s.v += (-k * (s.x - target) - d * s.v) * h;   // semi-implicit Euler
      s.x += s.v * h;
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      var frameDt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      acc += frameDt;
      last = now;

      // spins whenever nobody is holding or hovering it (once it has landed)
      var landed = introStart === 0 || (introStart > 0 && now - introStart > C.INTRO_MS);
      var nowSpin = C.IDLE_SPIN && !reduceMotion && landed && !drag && !overLogo;
      if (nowSpin !== spinning) {
        if (nowSpin) { spinVel = yaw.v; spinVelV = pitch.v; }        // carry on from how it was moving
        else {                                                      // hovered: come round, the short way
          yaw.x = wrap(yaw.x); pitch.x = wrap(pitch.x);
          yaw.v = spinVel; pitch.v = spinVelV; spinVel = spinVelV = 0;
        }
        spinning = nowSpin;
      }

      var t = hoverTarget();
      // coming round from a spin or a drag (outside the hover range): a slower, critically damped turn
      var far = Math.abs(yaw.x) > MAX_YAW + 0.05 || Math.abs(pitch.x) > MAX_PITCH + 0.05;
      var k = far ? 16 : C.HOVER_STIFFNESS;
      var d = far ? 8 : C.HOVER_DAMPING;
      while (acc >= STEP) {
        if (spinning) {
          var ramp = 1 - Math.exp(-1.2 * STEP);                                  // eases to the idle speeds
          spinVel += (TAU / C.SPIN_SECONDS - spinVel) * ramp;
          yaw.x = wrap(yaw.x + spinVel * STEP);
          if (C.SPIN_VERTICAL) {
            spinVelV += (TAU / C.SPIN_SECONDS_VERTICAL - spinVelV) * ramp;
            pitch.x = wrap(pitch.x + spinVelV * STEP);
          } else {
            pitch.v = spinVelV; spinVelV = 0;                                    // upright: settle the tilt
            spring(pitch, 0, 16, 8, STEP);
          }
        } else if (!drag) {
          spring(yaw, t[0], k, d, STEP);
          spring(pitch, t[1], k, d, STEP);
        }
        spring(grab, drag ? 1 : 0, 160, 2 * Math.sqrt(160), STEP);
        acc -= STEP;
      }
      // hover limits, once it is inside them
      if (!spinning && !drag) {
        if (Math.abs(yaw.x) <= MAX_YAW + 1e-3) yaw.x = clamp(yaw.x, MAX_YAW);
        if (Math.abs(pitch.x) <= MAX_PITCH + 1e-3) pitch.x = clamp(pitch.x, MAX_PITCH);
      }

      /* where: printed label -> its resting place on the bottle (lift-off), then the journey */
      if (introStart < 0 && revealedAt && now - revealedAt > C.INTRO_DELAY) introStart = now;
      var i = introStart < 0 ? 0 : introStart === 0 ? 1 : clamp01((now - introStart) / C.INTRO_MS);
      var lift = ease(i);
      var introAlpha = introStart < 0 ? 0 : introStart === 0 ? 1 : clamp01(i / 0.12);   // appears on the label, then lifts
      var L = label();
      var Hm = homePose(L);
      var bob = reduceMotion ? 0 : Math.sin((now - t0) / 1000 * 1.1) * Hm.s * 0.03 * lift;
      var at = journey({
        x: mix(L.x, Hm.x, lift),
        y: mix(L.y, Hm.y, lift),
        s: mix(L.s, Hm.s, lift)
      });
      // travel with a little inertia (springs); while it lifts off the label, exactly on track
      if (snap || i < 1) {
        px.x = at.x; py.x = at.y; ps.x = at.s; px.v = py.v = ps.v = 0;
        snap = false;
      } else {
        var kk = J.SMOOTH, dd = 2 * Math.sqrt(J.SMOOTH), h = Math.min(0.05, frameDt);
        for (var q = 0; q < 4; q++) {
          spring(px, at.x, kk, dd, h / 4); spring(py, at.y, kk, dd, h / 4); spring(ps, at.s, kk, dd, h / 4);
        }
      }
      pose = { x: px.x, y: py.x + bob, s: ps.x * (1 + 0.06 * grab.x) };         // held: a touch closer
      var alpha = at.a * (at.hero > 0.5 ? introAlpha : 1);
      var tip = -Math.sin(Math.PI * lift) * 0.2;                                 // tips up as it comes forward

      /* place it */
      var px2w = frameH / vh;
      fit.scale.setScalar(pose.s * px2w / dims.y);
      pivot.position.set((pose.x - vw / 2) * px2w, -(pose.y - vh / 2) * px2w, 0);
      pivot.rotation.set(pitch.x + tip, yaw.x, 0, 'YXZ');
      canvas.style.opacity = alpha;
      renderer.render(scene, camera);

      var side = pose.s * 1.04;
      hit.style.width = hit.style.height = side + 'px';
      hit.style.transform = 'translate(' + (pose.x - side / 2) + 'px,' + (pose.y - side / 2) + 'px)';
      hit.style.visibility = alpha > 0.5 ? 'visible' : 'hidden';

      // the hint: under the logo once it has landed, until the first drag
      var showHint = !hintDone && i >= 1 && !drag && at.hero > 0.999 && at.a > 0.99;   // at the hero stop only
      hint.classList.toggle('is-shown', showHint);
      if (showHint || hint.style.transform === '') {
        if (!hintW) { hintW = hint.offsetWidth; hintH = hint.offsetHeight; }
        var hx, hy, ly = pose.y - bob;                                            // the hint doesn't bob
        if (Hm.hint === 'below') { hx = pose.x; hy = ly + pose.s * 0.52 + 12; }
        else if (Hm.hint === 'above') { hx = pose.x; hy = ly - pose.s * 0.52 - 12 - hintH; }
        else {
          hx = pose.x + (Hm.hint === 'left' ? -1 : 1) * (pose.s * 0.52 + 14 + hintW / 2);
          hy = ly - hintH / 2;
        }
        hx = Math.max(10 + hintW / 2, Math.min(vw - 10 - hintW / 2, hx));       // stays on screen
        hint.style.transform = 'translate(' + hx + 'px,' + hy + 'px) translateX(-50%)';
      }

      // hidden by the journey (and nobody holding it): stop until the next scroll
      if (at.a <= 0 && !drag) { pause(); return; }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (running || !dims || document.hidden) return;
      if (layer.hidden) snap = true;           // was hidden: appear where it belongs, no fly-in
      running = true;
      layer.hidden = false;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      if (drag) return;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      layer.hidden = true;                     // never leave a stale frame on the fixed layer
    }
  }
})(HOA_CREST_CONFIG);
