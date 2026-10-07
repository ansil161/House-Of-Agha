/* ==========================================================================
   HOUSE OF AGHA · 3D LOGO (hero)
   The gold Agha logo (assets/agha-crest.glb, the client's model), drawn on a
   fixed, transparent layer over the page (sections/hoa-hero.liquid loads this).

   1. Open: it appears exactly over the logo printed on the Oud Fury label in the
      hero photo, then lifts off and glides out to rest beside the bottle, larger,
      floating gently. It scrolls away with the hero.
   2. Hover: leans toward the cursor (tracked across the page, relative to the
      logo's centre), limited to ±MAX_YAW / ±MAX_PITCH: never edge-on, never its
      back. Cursor out of the window -> faces front.
   3. Drag: pick it up and carry it anywhere on the screen; it turns with the
      movement in every direction (DRAG_SPEED rad per px). Pointer capture, grab /
      grabbing cursor, above the header while held. On touch, a drag that starts on
      the logo moves the logo (the page doesn't scroll under it).
   4. Release: position and rotation spring back home beside the bottle
      (STIFFNESS / DAMPING, angles wrapped into (-π, π] first: shortest way, never
      unwinding whole turns); hover takes over again.
   5. Idle: when nobody is interacting (mouse still for IDLE_AFTER ms, mouse out
      of the window, or a touch device at rest) it turns slowly on its own
      (SPIN_SECONDS per turn). Moving the mouse or hovering the logo hands it back
      to the cursor, decelerating the shortest way round instead of snapping.
   6. A small "Drag to rotate" hint with a hand icon sits under it at rest, only
      until the visitor's first drag; after that it never shows again (remembered
      in localStorage, so not on later visits either).

   Springs integrate in fixed 1/240 s steps: identical at any frame rate.
   Reduced motion: no lift animation, no float, no hover tilt; drag works with a
   quick return. three.js (not otherwise in the theme) loads from jsdelivr after
   the page's own load; rendering stops while the hero is out of view.
   ========================================================================== */

/* ----------------------------- CONFIG ----------------------------------- */
var HOA_CREST_CONFIG = {
  MODEL_URL: null,            // null = data-src on [data-hoa-logo3d] (hero setting, or the agha-crest.glb asset)
  MAX_YAW: 25,                // degrees, hover left/right
  MAX_PITCH: 15,              // degrees, hover up/down
  DRAG_SPEED: 0.01,           // radians of turn per pixel dragged
  STIFFNESS: 90,              // release spring (position + rotation)
  DAMPING: 14,
  HOVER_STIFFNESS: 42,        // hover follow spring (softer, so it trails the cursor)
  HOVER_DAMPING: 12.5,
  INTRO_DELAY: 450,           // ms after the page shows
  INTRO_MS: 2000,             // lift-off duration
  IDLE_AFTER: 2000,           // ms without interaction before it starts turning on its own
  SPIN_SECONDS: 12,           // one full turn while idle
  // resting place beside the bottle, in units of the printed logo's height
  HOME: {
    desktop: { side: 'left', scale: 2.8, gap: 0.4, rise: 1.54 },   // shoulder height, clear of "House"
    phone:   { side: 'left', scale: 1.8, gap: 0.25, rise: -2.1 }   // below the stacked title
  },
  // where the logo is printed on the bottle photos (fractions of the bottle image)
  LABEL: {
    desktop: { cx: 0.4969, cy: 0.4285, h: 0.1085 },   // hoa-hero-oud-fury-bottle.webp
    phone:   { cx: 0.4948, cy: 0.4305, h: 0.1116 }    // hoa-oud-fury-portrait-bottle.webp
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
  var hero = bottle.closest('section') || anchor.parentElement;

  var html = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEG = Math.PI / 180;
  var TAU = Math.PI * 2;
  var MAX_YAW = C.MAX_YAW * DEG;
  var MAX_PITCH = C.MAX_PITCH * DEG;
  var K_RETURN = reduceMotion ? 320 : C.STIFFNESS;
  var D_RETURN = reduceMotion ? 2 * Math.sqrt(320) : C.DAMPING;
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    var key = new THREE.DirectionalLight(0xfff0d6, 2.2);   // warm key, upper left front
    key.position.set(-3, 3.5, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xff8a2a, 2.6);   // orange rim, behind right
    rim.position.set(3.5, 1.5, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffe2bd, 0.35));     // soft fill

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
    var offX = { x: 0, v: 0 }, offY = { x: 0, v: 0 };     // carried away from home, px
    var grab = { x: 0, v: 0 };                            // 0..1, picked-up swell
    var mode = 'hover';                                   // 'hover' | 'drag' | 'return'
    var pointer = null;
    var drag = null;
    var lastActive = performance.now();                   // last mouse move / drag
    var overLogo = false;
    var idle = false, spinVel = 0;                        // turning on its own
    var hintW = 0;
    var HINT_KEY = 'agha-logo3d-dragged';
    var hintDone = false;
    try { hintDone = localStorage.getItem(HINT_KEY) === '1'; } catch (_) {}
    var introStart = -1;                                  // ms; -1 = not yet, 0 = skipped
    var pose = null;                                      // { x, y, s }: centre + logo height, px
    var visible = false;
    var running = false, raf = 0, last = 0, acc = 0, t0 = performance.now();

    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(modelUrl, function (gltf) {
      var model = gltf.scene;
      var box = new THREE.Box3().setFromObject(model);
      dims = box.getSize(new THREE.Vector3());
      model.position.sub(box.getCenter(new THREE.Vector3()));
      fit.add(model);
      model.traverse(function (o) { if (o.isMesh && o.material) o.material.envMapIntensity = 0.6; });

      // landed below the hero (reload, anchor): no lift-off, it is simply there
      if (reduceMotion || window.scrollY > window.innerHeight * 0.5) introStart = 0;

      size();
      window.addEventListener('resize', size);
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? wake() : pause();
      }).observe(hero);
      window.addEventListener('scroll', wake, { passive: true });
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
    function homePose(L) {
      var H = L.home, s = L.s * H.scale, gap = L.s * H.gap;
      return {
        x: H.side === 'left' ? L.left - gap - s / 2 : L.right + gap + s / 2,
        y: L.y - L.s * H.rise,
        s: s
      };
    }

    /* ---------- hover ---------- */
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      pointer = { x: e.clientX, y: e.clientY };
      lastActive = performance.now();
      wake();
    }, { passive: true });
    hit.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { overLogo = true; wake(); } });
    hit.addEventListener('pointerleave', function () { overLogo = false; });
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { pointer = null; wake(); } });
    window.addEventListener('blur', function () { pointer = null; wake(); });

    function hoverTarget() {
      if (reduceMotion || !pointer || !pose) return [0, 0];
      var nx = (pointer.x - pose.x) / (vw / 2);
      var ny = (pointer.y - pose.y) / (vh / 2);
      return [clamp(nx, 1) * MAX_YAW, clamp(ny, 1) * MAX_PITCH];
    }

    /* ---------- drag: carry it anywhere, turning as it moves ---------- */
    hit.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      mode = 'drag';
      yaw.v = pitch.v = offX.v = offY.v = 0;
      layer.classList.add('is-dragging');
      try { hit.setPointerCapture(e.pointerId); } catch (_) {}
      wake();
    });
    hit.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (dx || dy) drag.moved = true;
      offX.x += dx;
      offY.x += dy;
      yaw.x += dx * C.DRAG_SPEED;
      pitch.x += dy * C.DRAG_SPEED;
      drag.x = e.clientX;
      drag.y = e.clientY;
      wake();
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dragged = drag.moved;
      drag = null;
      layer.classList.remove('is-dragging');
      // first real drag: the hint has done its job, never show it again
      if (dragged && !hintDone) {
        hintDone = true;
        try { localStorage.setItem(HINT_KEY, '1'); } catch (_) {}
      }
      yaw.x = wrap(yaw.x);              // shortest way home, never unwinding whole turns
      pitch.x = wrap(pitch.x);
      yaw.v = pitch.v = offX.v = offY.v = 0;
      mode = 'return';
      lastActive = performance.now();
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
    function atRest(s, target, eps) { return Math.abs(s.x - target) < eps && Math.abs(s.v) < eps; }

    function frame(now) {
      raf = 0;
      if (!running) return;
      acc += Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;

      // idle: nobody steering it (mouse still / gone, or touch at rest) -> it turns on its own
      var landed = introStart === 0 || (introStart > 0 && now - introStart > C.INTRO_MS);
      var nowIdle = !reduceMotion && mode === 'hover' && !overLogo && landed &&
        (!pointer || now - lastActive > C.IDLE_AFTER);
      if (nowIdle !== idle) {
        if (nowIdle) { spinVel = yaw.v; }                         // carry on from how it was moving
        else { yaw.x = wrap(yaw.x); yaw.v = spinVel; spinVel = 0; } // back to the cursor, the short way
        idle = nowIdle;
      }

      var t = mode === 'hover' ? hoverTarget() : [0, 0];
      var k = mode === 'hover' ? C.HOVER_STIFFNESS : K_RETURN;
      var d = mode === 'hover' ? C.HOVER_DAMPING : D_RETURN;
      // coming back from a spin (still outside the hover range): a slower, critically damped turn
      if (mode === 'hover' && !idle && Math.abs(yaw.x) > MAX_YAW + 0.05) { k = 16; d = 8; }
      while (acc >= STEP) {
        if (idle) {
          spinVel += (TAU / C.SPIN_SECONDS - spinVel) * (1 - Math.exp(-1.2 * STEP));   // eases up to speed
          yaw.x += spinVel * STEP;
          if (yaw.x > Math.PI) yaw.x -= TAU;
          spring(pitch, 0, k, d, STEP);
          spring(offX, 0, K_RETURN, D_RETURN, STEP);
          spring(offY, 0, K_RETURN, D_RETURN, STEP);
        } else if (mode !== 'drag') {
          spring(yaw, t[0], k, d, STEP);
          spring(pitch, t[1], k, d, STEP);
          spring(offX, 0, K_RETURN, D_RETURN, STEP);
          spring(offY, 0, K_RETURN, D_RETURN, STEP);
        }
        spring(grab, drag ? 1 : 0, 160, 2 * Math.sqrt(160), STEP);
        acc -= STEP;
      }
      // hover limits; after a spin it first eases back inside them, then stays there
      if (mode === 'hover' && !idle) {
        if (Math.abs(yaw.x) <= MAX_YAW + 1e-3) yaw.x = clamp(yaw.x, MAX_YAW);
        if (Math.abs(pitch.x) <= MAX_PITCH + 1e-3) pitch.x = clamp(pitch.x, MAX_PITCH);
      }
      if (mode === 'return' && atRest(yaw, 0, 1e-3) && atRest(pitch, 0, 1e-3) && atRest(offX, 0, 0.3) && atRest(offY, 0, 0.3)) mode = 'hover';

      /* where: printed label -> beside the bottle (lift-off), plus wherever it is carried */
      if (introStart < 0 && revealedAt && now - revealedAt > C.INTRO_DELAY) introStart = now;
      var i = introStart < 0 ? 0 : introStart === 0 ? 1 : clamp01((now - introStart) / C.INTRO_MS);
      var lift = ease(i);
      var alpha = introStart < 0 ? 0 : introStart === 0 ? 1 : clamp01(i / 0.12);   // appears on the label, then lifts
      var L = label();
      var Hm = homePose(L);
      var bob = reduceMotion || drag ? 0 : Math.sin((now - t0) / 1000 * 1.1) * Hm.s * 0.03 * lift;
      var swell = 1 + 0.08 * grab.x;                                             // picked up: a touch closer
      pose = {
        x: mix(L.x, Hm.x, lift) + offX.x,
        y: mix(L.y, Hm.y, lift) + bob + offY.x,
        s: mix(L.s, Hm.s, lift) * swell
      };
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

      // the hint: under the logo once it has landed, hidden while it is carried
      var showHint = !hintDone && i >= 1 && !drag && mode === 'hover' && Math.abs(offX.x) < 2 && Math.abs(offY.x) < 2;
      hint.classList.toggle('is-shown', showHint);
      if (showHint || hint.style.transform === '') {
        if (!hintW) hintW = hint.offsetWidth;
        var hx = Math.max(10 + hintW / 2, Math.min(vw - 10 - hintW / 2, pose.x));   // stays on screen
        hint.style.transform = 'translate(' + hx + 'px,' + (pose.y - bob + pose.s * 0.52 + 12) + 'px) translateX(-50%)';
      }

      // hero gone and the logo back home: stop
      if (!visible && !drag && mode === 'hover') { pause(); return; }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (running || !dims || document.hidden || !(visible || drag || mode === 'return')) return;
      running = true;
      layer.hidden = false;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      if (drag || mode === 'return') return;   // finish carrying it home first
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      layer.hidden = true;                     // never leave a stale frame on the fixed layer
    }
  }
})(HOA_CREST_CONFIG);
