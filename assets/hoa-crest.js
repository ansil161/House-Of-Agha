/* ==========================================================================
   HERO — 3D crest (2026-10-07)
   The Agha crest (assets/agha-crest.glb: the client's AGHA_Logo_3D.glb with its
   studio floor + turntable clip stripped and the mesh meshopt-compressed; geometry
   and gold material untouched), top right of the hero.

   Behaviour (user brief):
   - idle: a gentle continuous spin, so the logo never freezes. The crest is
     symmetric, so its back reads as the same seal.
   - cursor anywhere on the page: the logo turns to face / lean toward it; every
     cursor position gives its own angle. The spin settles to the nearest front-
     facing turn while the visitor is steering. When the mouse is still for a
     while, or leaves the window, the idle spin takes over again.
   - hand pointer over the logo: click (or tap / Enter) = one flicked turn;
     drag = spin it by hand, released with inertia.
   - everything is chased with framerate-independent exponential easing, so the
     logo lags slightly behind the cursor instead of snapping.
   - tablet: follow at 55%. Touch: no follow, idle spin + drag/tap.
   - reduced motion: no idle spin or follow; drag/tap still work (user-initiated).

   three.js is not part of the theme stack, so it is imported (ESM, jsdelivr) after
   the page has loaded and gone idle, never competing with the hero photo. The
   loop only runs while the hero is on screen.
   ========================================================================== */
(function () {
  'use strict';

  var host = document.querySelector('[data-hoa-crest]');
  if (!host || !window.IntersectionObserver) return;

  var hit = host.querySelector('[data-hoa-crest-hit]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var V = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
  var TAU = Math.PI * 2;

  var IDLE_SPEED = TAU / 16;   // rad/s: one turn every 16 s
  var FOLLOW_YAW = 0.75;       // rad at the far edge of the viewport
  var FOLLOW_PITCH = 0.42;
  var MAX_PITCH = 0.6;
  var EASE = 3.2;              // 1/s, follow lag
  var STILL_MS = 2600;         // mouse still this long -> back to idle spin
  var FRICTION = 2.4;          // 1/s, decay of a flick / drag release

  function followAmount() {
    if (reduceMotion || !finePointer.matches) return 0;
    return window.innerWidth < 1200 ? 0.55 : 1;
  }

  function boot() {
    Promise.all([
      import(V + '+esm'),
      import(V + 'examples/jsm/loaders/GLTFLoader.js/+esm'),
      import(V + 'examples/jsm/environments/RoomEnvironment.js/+esm'),
      import(V + 'examples/jsm/libs/meshopt_decoder.module.js/+esm')
    ]).then(function (m) {
      init(m[0], m[1].GLTFLoader, m[2].RoomEnvironment, m[3].MeshoptDecoder);
    }).catch(fail);
  }

  function fail(err) {
    host.classList.add('is-failed');
    if (window.console && err) console.warn('[hoa-crest]', err);
  }

  // after the hero photo: window load, then an idle moment
  function go() { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(boot, { timeout: 1500 }); }
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });

  function init(THREE, GLTFLoader, RoomEnvironment, MeshoptDecoder) {
    var canvas = host.querySelector('canvas');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { fail(e); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;   // antique gold, not the bright studio white of the raw env
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // warm key from upper left, amber rim from the right (the hero's shaft of light)
    var key = new THREE.DirectionalLight(0xfff1dc, 1.6);
    key.position.set(-2.5, 3, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xffb867, 1.1);
    rim.position.set(3.5, 1, -2);
    scene.add(rim);

    var camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    camera.position.set(0, 0, 5.4);

    var pivot = new THREE.Group();
    scene.add(pivot);

    /* ---------- motion state ---------- */
    var spin = 0, spinVel = 0;            // free yaw (idle spin, flicks, drags)
    var cur = { yaw: 0, pitch: 0 };
    var mouse = { x: 0, y: 0 };           // follow target, -1..1 around the logo
    var lastMove = -1e9;
    var presence = 0;                     // 0 idle spin .. 1 facing the cursor
    var drag = null, dragPitch = 0;
    var last = performance.now();
    var running = false, visible = false, raf = 0;

    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    }

    var loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(host.getAttribute('data-src'), function (gltf) {
      var model = gltf.scene;
      var box = new THREE.Box3().setFromObject(model);
      var c = box.getCenter(new THREE.Vector3());
      var s = box.getSize(new THREE.Vector3());
      model.position.sub(c);
      var fit = new THREE.Group();
      fit.add(model);
      fit.scale.setScalar(1.9 / Math.max(s.x, s.y));
      pivot.add(fit);
      model.traverse(function (o) {
        if (o.isMesh && o.material) o.material.envMapIntensity = 0.8;
      });
      host.classList.add('is-ready');
      start();
    }, undefined, fail);

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || drag) return;
      var r = host.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      // each side scaled by the room on that side, so the logo gets its full range of
      // angles even though it sits near the top-right corner
      var dx = e.clientX - cx, dy = e.clientY - cy;
      mouse.x = Math.max(-1, Math.min(1, dx / Math.max(120, dx < 0 ? cx : window.innerWidth - cx)));
      mouse.y = Math.max(-1, Math.min(1, dy / Math.max(120, dy < 0 ? cy : window.innerHeight - cy)));
      lastMove = performance.now();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { lastMove = -1e9; });

    /* drag / click / tap / keyboard on the logo */
    // one full turn, decaying with friction (total angle = v / FRICTION)
    function flick() { return TAU * FRICTION * (spinVel < 0 ? -1 : 1); }
    if (hit) {
      hit.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        var now = performance.now();
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now, lx: e.clientX, lt: now, moved: 0, v: 0 };
        spinVel = 0;
        host.classList.add('is-dragging');
        try { hit.setPointerCapture(e.pointerId); } catch (_) {}
        wake();
      });
      hit.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var now = performance.now();
        var dx = e.clientX - drag.lx;
        drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y));
        spin += dx * 0.012;
        dragPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, (e.clientY - drag.y) * 0.004));
        var dt = Math.max(1, now - drag.lt) / 1000;
        drag.v = drag.v * 0.6 + (dx * 0.012 / dt) * 0.4;   // smoothed release velocity
        drag.lx = e.clientX; drag.lt = now;
      });
      var end = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var quick = drag.moved < 6 && performance.now() - drag.t < 400;
        spinVel = quick ? flick() : Math.max(-14, Math.min(14, drag.v));
        drag = null;
        dragPitch = 0;
        host.classList.remove('is-dragging');
        wake();
      };
      hit.addEventListener('pointerup', end);
      hit.addEventListener('pointercancel', end);
      hit.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spinVel = flick(); wake(); }
      });
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      // rAF's timestamp can be a hair earlier than the performance.now() stamped in wake()
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      var k = 1 - Math.exp(-EASE * dt);
      var amt = followAmount();

      // steering while the mouse moves; idle spin when it rests or leaves
      var steering = amt > 0 && !drag && now - lastMove < STILL_MS ? 1 : 0;
      presence += (steering - presence) * (1 - Math.exp(-(steering ? 2.2 : 0.9) * dt));

      if (!drag) {
        spin += spinVel * dt;
        spinVel *= Math.exp(-FRICTION * dt);
        if (Math.abs(spinVel) < 0.02) spinVel = 0;
        if (!reduceMotion) spin += IDLE_SPEED * (1 - presence) * dt;
        // steering: settle the free spin onto its nearest front-facing turn
        if (presence > 0.01 && !spinVel) {
          var front = Math.round(spin / TAU) * TAU;
          spin += (front - spin) * presence * (1 - Math.exp(-2.4 * dt));
        }
      }

      var yawT = spin + mouse.x * FOLLOW_YAW * amt * presence;
      var pitchT = drag ? dragPitch : mouse.y * FOLLOW_PITCH * amt * presence;
      pitchT = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchT));

      // drags track the hand directly; everything else lags behind with inertia
      if (drag) cur.yaw = yawT;
      else cur.yaw += (yawT - cur.yaw) * k;
      cur.pitch += (pitchT - cur.pitch) * k;

      pivot.rotation.set(cur.pitch, cur.yaw, 0, 'YXZ');
      renderer.render(scene, camera);

      // reduced motion: stop once everything has come to rest
      if (reduceMotion && !drag && !spinVel && Math.abs(yawT - cur.yaw) < 1e-3 && Math.abs(pitchT - cur.pitch) < 1e-3) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (running || !visible || document.hidden || !host.classList.contains('is-ready')) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function start() {
      if (reduceMotion) { spin = -0.38; cur.yaw = spin; cur.pitch = 0.06; }
      pivot.rotation.set(cur.pitch, cur.yaw, 0, 'YXZ');
      size();
      if (window.ResizeObserver) new ResizeObserver(size).observe(host);
      else window.addEventListener('resize', size);
      renderer.render(scene, camera);   // first frame straight away, before the loop wakes
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? wake() : pause();
      }, { rootMargin: '80px 0px' }).observe(host);
      document.addEventListener('visibilitychange', function () {
        document.hidden ? pause() : wake();
      });
    }
  }
})();
