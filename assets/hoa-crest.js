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
   5. Idle: whenever nobody is holding or hovering it, it tumbles on its own (TUMBLE):
      a turn that is slow through the front view and quicker edge-on, a short hold on the
      front each turn, and X / Z drifting on their own periods.
   6. A small "Drag to rotate" hint with a hand icon sits under it at rest, only
      until the visitor's first drag; after that it never shows again (remembered
      in localStorage, so not on later visits either).
   7. The journey: the same logo travels down the homepage. Each stop is pinned to its
      content (it scrolls with it); between stops it glides to the next spot and size,
      fading out across product/film stretches and back in at the next stop (JOURNEY
      below). Rendering stops while it is hidden. Desktop: hero -> World headline
      -> gone ("Seven fragrances" + collection stops removed 2026-10-12). Phones: hero only.
      SHOW_IN_HERO false (2026-10-12): invisible at the hero (no lift-off, no hint), so
      it first fades in at World; phones never show it.
   8. Home V2 (anchor data-profile="v2", sections/hoa-v2-object-hero.liquid, 2026-10-12): the
      SAME layer and model, a different route. The hero's own script (hoa-v2.js) runs the
      opening and tells this one when to move through window.AGHA_HERO { appear, home } (ms,
      performance.now()): the logo appears large at [data-logo3d-intro], then, as the bottle
      rises in, glides to [data-logo3d-home] beside it (both markers are placed by CSS, so
      every breakpoint has its own spot). Then: Scent Story (above the chapter text, held
      while that column is sticky; since 2026-10-12 it fades out after the hero and back in there,
      because the story + "Born in ice" sections now come first) -> the seam of Two worlds ->
      gone. Phones/tablets: hero only. No "Drag to rotate" hint (the bottle has its own).
   9. Home V1 photo hero (anchor data-profile="photo", sections/hoa-photo-hero.liquid, 2026-10-12):
      the hero half of 8. (markers + AGHA_HERO, sway, shown in the hero on every screen) with the
      V1 route after it (World headline -> gone).

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
  SHOW_IN_HERO: false,        // false = never shown at the hero (user, 2026-10-12); it first appears at the next stop
  IDLE_SPIN: true,            // turns on its own when nobody holds or hovers it
  SPIN_BLEND: 2,              // 1/s: after a release the flick blends into the idle spin (~95% there in 1.5 s)
  // idle = an eased, heavy tumble (2026-10-13, "polished metal" reference): the main turn is slow through the
  // front view and quicker through edge-on, with a short hold on the front each turn, while X and Z drift on
  // their own periods so the motion never repeats
  TUMBLE: {
    SLOW: 0.25, FAST: 0.9,    // rad/s: turn speed facing front -> edge-on
    PAUSE: 0.6,               // s: held on the front view once per turn
    STOP_RATE: 6,             // 1/s: how hard it eases into that hold
    TILT: -12,                // degrees: centre of the X tumble (- = face a touch upward, toward the bright sky)...
    PITCH: 20, PITCH_S: 7,    // ...plus/minus this, one swing per this many s
    ROLL: 6, ROLL_S: 11       // Z: plus/minus degrees, s per swing
  },
  // light that keeps moving while the logo is nearly still (2026-10-13, user: "only shiny when I drag it")
  ENV_TURN: 0.1,              // rad/s: the studio reflections turn slowly around the logo
  KEY_LAP_SECONDS: 9,         // the key light circles the logo once in this long
  DEPTH: 0.09,              // the plate's thickness as a share of its width (the file is ~0.056: too thin for side walls)
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
    WIDE: 1024,               // px: below this only the hero stop (layouts stack)
    HERO_HOLD: 0.25,          // hero: holds until the page has scrolled this much of a viewport
    FADE: 0.35,               // share of each hidden stretch spent fading out / back in...
    FADE_VH: 0.5,             // ...but never longer than this much scroll (x viewport): long stretches stay dark
    END_FADE: 0.3,            // after the last stop it fades out over this much scroll (x viewport)
    SMOOTH: 170               // spring stiffness on the travelling position (inertia)
  },
  // Home V2 profile (see 8. above)
  V2: {
    APPEAR_MS: 900,           // fade + settle in at the intro spot
    GLIDE_MS: 1700,           // intro spot -> home beside the bottle
    SWAY_DEG: 0,              // >0 = a slow sway left/right instead of full turns (was 26: it never went edge-on)
    SWAY_SECONDS: 10,         //   beside the bottle (one full sway); 0 = the V1 full turn
    FALLBACK_MS: 4500         // if the hero never signals: appear at home this long after the reveal
  },
  THREE_URL: 'https://cdn.jsdelivr.net/npm/three@0.169.0/'
};
/* ------------------------------------------------------------------------ */

(function (C) {
  'use strict';

  var anchor = document.querySelector('[data-hoa-logo3d]');
  var PROFILE = anchor ? anchor.getAttribute('data-profile') : '';
  var V2 = PROFILE === 'v2';                                // V2 route: Scent Story -> Two worlds
  var MARK = V2 || PROFILE === 'photo';                     // hero spots = CSS markers + window.AGHA_HERO (V2, and the V1 photo hero, 9.)
  var bottle = MARK ? null : document.querySelector('[data-hoa-hero-bottle] img');
  var modelUrl = C.MODEL_URL || (anchor && anchor.getAttribute('data-src'));
  if (!anchor || (!MARK && !bottle) || !modelUrl || !window.IntersectionObserver) return;
  var HERO_ON = MARK || C.SHOW_IN_HERO;                     // shown at the hero stop
  var INTRO_MS = MARK ? C.V2.GLIDE_MS : C.INTRO_MS;
  var SWAY = MARK && C.V2.SWAY_DEG > 0 ? C.V2.SWAY_DEG * Math.PI / 180 : 0;   // radians
  var swayT = 0;

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

  // Studio for the reflections (2026-10-13, "polished metal" reference). A HARD horizon: above it a warm gradient
  // from mid gold up to a bright sky, below it near-black brown, with no blend between; plus hard-edged rectangle
  // softboxes (tall left, tall right, wide overhead, a thin low strip). A mirror metal shows exactly this, so the
  // horizon and the box edges become crisp light/dark bands that slide across the faces and walls as it turns.
  var STUDIO = {
    HORIZON: [0.55, 0.42, 0.25],            // sky just above the horizon...
    SKY: [1.6, 1.45, 1.2],                  // ...up to this overhead
    SKY_CURVE: 1.8,                         // >1: the bright end stays near the zenith (a tilted face never goes all white)
    GROUND: [0.04, 0.03, 0.02],             // everything below the horizon
    BOXES: [
      // [x, y, z, width, height, brightness, colour]
      [-10, 2, 3, 1.4, 11, 8, 0xffffff],      // tall softbox, left
      [10, 2, 1, 1.4, 11, 7, 0xfff1dc],       // tall softbox, right
      [0, 10, 2, 11, 2.6, 8, 0xffffff],       // wide overhead
      [0, -1.6, 10, 13, 0.45, 6, 0xffe2b0]    // thin strip, low in front
    ]
  };
  function goldStudio(THREE) {
    var room = new THREE.Scene();
    var sky = new THREE.SphereGeometry(20, 64, 24, 0, TAU, 0, Math.PI / 2);   // upper half only: the horizon stays hard
    var p = sky.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      var t = Math.pow(clamp01(v.fromBufferAttribute(p, i).normalize().y), STUDIO.SKY_CURVE);
      for (var c = 0; c < 3; c++) col[i * 3 + c] = mix(STUDIO.HORIZON[c], STUDIO.SKY[c], t);
    }
    sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
    room.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })));
    var ground = new THREE.SphereGeometry(20, 64, 12, 0, TAU, Math.PI / 2, Math.PI / 2);
    room.add(new THREE.Mesh(ground, new THREE.MeshBasicMaterial({ color: new THREE.Color().fromArray(STUDIO.GROUND), side: THREE.BackSide, toneMapped: false })));
    var plane = new THREE.PlaneGeometry(1, 1);
    STUDIO.BOXES.forEach(function (b) {
      var m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: new THREE.Color(b[6]).multiplyScalar(b[5]), side: THREE.DoubleSide, toneMapped: false }));
      m.position.set(b[0], b[1], b[2]);
      m.scale.set(b[3], b[4], 1);
      m.lookAt(0, 0, 0);
      room.add(m);
    });
    return room;
  }

  function init(THREE, GLTFLoader, RoomEnvironment, MeshoptDecoder) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { fail(e); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Polished gold (user 2026-10-12: "no shine, glint or reflections while rotating, it looks flat"):
    // filmic tone mapping so the bright softbox reflections roll off into white instead of clipping flat.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    // A mirror metal shows nothing but its reflections: the hard-edged studio (above) gives crisp bands that slide
    // across the faces as the logo turns. Minimal PMREM blur keeps those edges sharp.
    scene.environment = pmrem.fromScene(goldStudio(THREE), 0.02).texture;
    pmrem.dispose();

    // polished gold, in place of the file's flat-looking standard material
    // (2026-10-13) mirror-like: deep brown-gold where it faces the dark ground, warm white on the softboxes
    var GOLD = { ENV: 1.4, ENV_DRAG: 1.5 };
    var gold = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#E8B64A'),
      metalness: 1,
      roughness: 0.08,
      specularIntensity: 1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.03,
      envMapIntensity: GOLD.ENV,
      side: THREE.DoubleSide
    });

    // Relief read (user 2026-10-13: "rings, lions, border look flat and muddy"). The GLB is one modelled relief
    // mesh with no UVs, so no bump map or re-extrusion: instead every vertex on a front/back-facing surface is
    // tinted by its height inside the relief, so recess floors sit a shade deeper and the raised rings, lions and
    // border stand out in full gold. Side walls (where the travelling glints run) keep the full colour.
    var CAVITY = { FLOOR: 0.42, FACING: 0.55, FLOOR_PCT: 0.01 };
    function cavity(geo) {
      var pos = geo.attributes.position, nor = geo.attributes.normal;
      if (!pos || !nor) return;
      geo.computeBoundingBox();
      var bb = geo.boundingBox, ext = bb.getSize(new THREE.Vector3());
      var ax = ext.x < ext.y ? (ext.x < ext.z ? 0 : 2) : (ext.y < ext.z ? 1 : 2);   // thinnest axis = relief depth
      var mid = (bb.min.getComponent(ax) + bb.max.getComponent(ax)) / 2;
      var get = ['getX', 'getY', 'getZ'][ax];
      var n = pos.count, h = new Float32Array(n), face = new Uint8Array(n), hs = [], i;
      for (i = 0; i < n; i++) {
        if (Math.abs(nor[get](i)) < CAVITY.FACING) continue;
        h[i] = Math.abs(pos[get](i) - mid);
        face[i] = 1;
        hs.push(h[i]);
      }
      // the floor is a low percentile, not the minimum: a few stray deep vertices would otherwise squash the
      // three real relief levels (base disc / details / top rims) into the top of the range
      hs = Float32Array.from(hs).sort();   // typed array: numeric sort
      var lo = hs[Math.floor(hs.length * CAVITY.FLOOR_PCT)], hi = hs[hs.length - 1];
      if (!(hi - lo > 1e-6)) return;
      var col = new Float32Array(n * 3);
      for (i = 0; i < n; i++) {
        var t = face[i] ? clamp01((h[i] - lo) / (hi - lo)) : 1;
        var c = mix(CAVITY.FLOOR, 1, t * t * (3 - 2 * t));
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      gold.userData.cavity = true;
    }

    // lights, fixed in the world (the logo turns under them): warm key top-right, cool rim behind, a low
    // hemisphere fill so nothing goes fully dark, and a small glint that follows the mouse while it is over the logo
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x5a4630, 0.35));
    var key = new THREE.DirectionalLight(0xfff4e0, 1.1);
    key.position.set(4, 5, 6);                                   // (circles the logo while it runs, see frame())
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xbfd6ff, 1.2);
    rim.position.set(-4, 2.5, -6);
    scene.add(rim);
    var glint = new THREE.PointLight(0xffffff, 0, 0, 1.4);
    scene.add(glint);
    var glintI = { x: 0, v: 0 }, shine = { x: 0, v: 0 };

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
    var idleT = 0;                                        // s spent tumbling (drives the X / Z drift)
    var roll = { x: 0, v: 0 };                            // Z tilt, idle tumble only
    var holdLeft = 0, lastHold = -9;                      // the short hold on the front view
    var hintW = 0, hintH = 0;
    var HINT_KEY = 'agha-logo3d-dragged';
    var hintDone = false;
    try { hintDone = localStorage.getItem(HINT_KEY) === '1'; } catch (_) {}
    var introStart = -1;                                  // ms; -1 = not yet, 0 = skipped
    var readyAt = 0;                                      // ms: the model is in
    var pose = null;                                      // { x, y, s }: centre + logo height, px
    var J = C.JOURNEY;
    var px = { x: 0, v: 0 }, py = { x: 0, v: 0 }, ps = { x: 0, v: 0 };   // travelling position, smoothed
    var snap = true;                                      // next frame: jump straight to the target
    var running = false, raf = 0, last = 0, acc = 0, t0 = performance.now();

    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(modelUrl, function (gltf) {
      var model = gltf.scene;
      // a thicker plate (2026-10-13): the file is ~5.6% deep, too thin to show side walls turning through the light.
      // Stretch each mesh along its own thinnest axis; three corrects the normals for the scale.
      var box = new THREE.Box3().setFromObject(model), ext = box.getSize(new THREE.Vector3());
      var thick = C.DEPTH * Math.max(ext.x, ext.y, ext.z) / Math.min(ext.x, ext.y, ext.z);
      model.traverse(function (o) {
        if (!o.isMesh) return;
        o.geometry.computeBoundingBox();
        var g = o.geometry.boundingBox.getSize(new THREE.Vector3());
        var ax = g.x < g.y ? (g.x < g.z ? 'x' : 'z') : (g.y < g.z ? 'y' : 'z');
        o.scale[ax] *= thick;
      });
      box.setFromObject(model);
      dims = box.getSize(new THREE.Vector3());
      model.position.sub(box.getCenter(new THREE.Vector3()));
      model.traverse(function (o) { if (o.isMesh) { if (o.material) o.material.dispose(); o.material = gold; cavity(o.geometry); } });
      if (gold.userData.cavity) { gold.vertexColors = true; gold.needsUpdate = true; }
      fit.add(model);
      
      // landed below the hero (reload, anchor): no lift-off, it is simply there
      if (reduceMotion || !HERO_ON || window.scrollY > window.innerHeight * 0.5) introStart = 0;
      readyAt = performance.now();
      window.__aghaLogoReady = true;
      try { document.dispatchEvent(new CustomEvent('agha:logo-ready')); } catch (_) {}

      size();
      window.addEventListener('resize', size);
      window.addEventListener('scroll', wake, { passive: true });
      document.addEventListener('agha:hero', wake);           // V2: the hero calls the next move
      wake();
      document.addEventListener('visibilitychange', function () { document.hidden ? pause() : wake(); });
    }, undefined, fail);

    /* ---------- where the logo is ---------- */
    // the printed logo on the label, and the bottle's drawn edges (object-fit: contain)
    function marker(sel) {                                // a CSS-placed spot: its centre, its height = logo size
      var el = document.querySelector(sel);
      var r = el ? el.getBoundingClientRect() : null;
      return r && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.height } : null;
    }
    function label() {
      if (MARK) return marker('[data-logo3d-intro]') || marker('[data-logo3d-home]') || { x: vw / 2, y: vh / 2, s: 120 };
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
      if (MARK) { var m = marker('[data-logo3d-home]') || L; return { x: m.x, y: m.y, s: m.s, hint: 'below' }; }
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
    var worldHead = document.querySelector('.hoa-world-section h2');
    var worldLede = document.querySelector('.hoa-world-section .hoa-lede');
    var ssStack = document.querySelector('.ss__stack');
    var ssAside = document.querySelector('.ss__aside');
    var worldsSplit = document.querySelector('.v2-worlds__split');
    var worldFirst = document.querySelector('.v2-worlds__split > .v2-world');
    var STOPS_V2 = [
      { // Scent Story: above the chapter text ("Notes / Rooted in Oud"), left-aligned with it, held for as
        // long as that column is sticky. It glides here from the hero in full view (the first scroll).
        wide: true,   // (glide: true travels in full view; the hero is now followed by the story + Born in ice, so it fades)
        pose: function () {
          if (!ssStack || !ssAside) return null;
          var r = ssStack.getBoundingClientRect();
          if (!r.height) return null;
          var s = clampN(vw * 0.055, 72, 96);
          var y = r.top - s / 2 - 28;
          if (r.top < vh && y - s / 2 < 76) return null;   // short screens: no room under the header
          return { x: r.left + s / 2, y: y, s: s };
        },
        span: function () {                                 // scroll range: from just before it sticks until it lets go
          var r = ssAside.getBoundingClientRect(), top = r.top + window.scrollY;
          return [top - vh * 0.3, top + r.height - vh];
        }
      },
      { // Two worlds: on the seam between the Oud and the Fresh photographs (it follows the seam on hover)
        wide: true, inAt: 0.75, outAt: 0.25,
        pose: function () {
          if (!worldsSplit || !worldFirst) return null;
          var a = worldFirst.getBoundingClientRect(), r = worldsSplit.getBoundingClientRect();
          if (!r.height) return null;
          return { x: a.right, y: r.top + r.height / 2, s: clampN(vw * 0.075, 90, 130) };
        }
      }
    ];
    var STOPS = V2 ? STOPS_V2 : [
      // "Seven fragrances" + Collection stops removed (user 2026-10-12)
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
        var sp = st.span ? st.span() : null;                // or its own scroll range (a sticky spot)
        list.push({ pose: p, a: sp ? sp[0] : doc - st.inAt * vh, b: sp ? sp[1] : doc - st.outAt * vh, glide: !!st.glide });
      }
      for (var m = 1; m < list.length; m++) {               // never let two holds overlap
        if (list[m].a < list[m - 1].b + 1) list[m - 1].b = list[m].a - 1;
      }
      var k, A, B, t;
      for (k = 0; k < list.length; k++) {
        A = list[k];
        if (sy <= A.b) {                                     // holding at stop k
          if (sy >= A.a || k === 0) return { x: A.pose.x, y: A.pose.y, s: A.pose.s, a: A.hero && !HERO_ON ? 0 : 1, hero: A.hero ? 1 : 0, tilt: 0 };
          B = A; A = list[k - 1];                            // between stop k-1 and k
          t = clamp01((sy - A.b) / Math.max(1, B.a - A.b));
          var e = ease(t);
          var f = Math.min(J.FADE, J.FADE_VH * vh / Math.max(1, B.a - A.b));
          var a = t < f ? 1 - t / f : t > 1 - f ? (t - (1 - f)) / f : 0;   // out, hidden, back in
          if (B.glide) a = 1;                                               // travels in full view
          if (A.hero && !HERO_ON && t < f) a = 0;                           // not shown at the hero: only fades in
          return {
            x: mix(A.pose.x, B.pose.x, e), y: mix(A.pose.y, B.pose.y, e), s: mix(A.pose.s, B.pose.s, e),
            a: a, hero: A.hero ? 1 - e : 0,
            tilt: B.glide ? Math.sin(Math.PI * t) : 0                       // a slight lean while it travels
          };
        }
      }
      A = list[list.length - 1];                             // past the last stop: fade out for good
      t = clamp01((sy - A.b) / (vh * J.END_FADE));
      return { x: A.pose.x, y: A.pose.y, s: A.pose.s, a: A.hero && !HERO_ON ? 0 : 1 - t, hero: A.hero ? 1 : 0, tilt: 0 };
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
      var landed = introStart === 0 || (introStart > 0 && now - introStart > INTRO_MS);
      var nowSpin = C.IDLE_SPIN && !reduceMotion && landed && !drag && !overLogo;
      if (nowSpin !== spinning) {
        if (nowSpin) { spinVel = yaw.v; spinVelV = pitch.v; if (SWAY) yaw.x = wrap(yaw.x); }   // carry on from how it was moving
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
        if (spinning && SWAY) {                                                    // V2: sways, comes round softly
          swayT += STEP;
          yaw.v += spinVel; spinVel = 0;
          spring(yaw, SWAY * Math.sin(TAU * swayT / C.V2.SWAY_SECONDS), 16, 8, STEP);
          pitch.v += spinVelV; spinVelV = 0;
          spring(pitch, 0, 16, 8, STEP);
        } else if (spinning) {                                                   // the eased multi-axis tumble
          var T = C.TUMBLE;
          idleT += STEP;
          var want = holdLeft > 0 ? 0 : mix(T.SLOW, T.FAST, Math.abs(Math.sin(yaw.x)));   // slow facing, quick edge-on
          if (holdLeft > 0) holdLeft -= STEP;
          spinVel += (want - spinVel) * (1 - Math.exp(-(holdLeft > 0 ? T.STOP_RATE : C.SPIN_BLEND) * STEP));
          var was = yaw.x;
          yaw.x = wrap(yaw.x + spinVel * STEP);
          if (was < 0 && yaw.x >= 0 && was > -0.5 && idleT - lastHold > 2) { holdLeft = T.PAUSE; lastHold = idleT; }   // front: hold
          pitch.v += spinVelV; spinVelV = 0;
          spring(pitch, (T.TILT * Math.cos(yaw.x) + T.PITCH * Math.sin(TAU * idleT / T.PITCH_S)) * DEG, 16, 8, STEP);   // cos: the back face leans up too
          spring(roll, T.ROLL * Math.sin(TAU * idleT / T.ROLL_S) * DEG, 16, 8, STEP);
        } else if (!drag) {
          spring(yaw, t[0], k, d, STEP);
          spring(pitch, t[1], k, d, STEP);
        }
        if (!spinning) spring(roll, 0, 16, 8, STEP);
        spring(grab, drag ? 1 : 0, 160, 2 * Math.sqrt(160), STEP);
        spring(glintI, pointer && !reduceMotion ? 1 : 0, 40, 2 * Math.sqrt(40), STEP);
        spring(shine, drag ? 1 : 0, 30, 2 * Math.sqrt(30), STEP);
        acc -= STEP;
      }
      // hover limits, once it is inside them
      if (!spinning && !drag) {
        if (Math.abs(yaw.x) <= MAX_YAW + 1e-3) yaw.x = clamp(yaw.x, MAX_YAW);
        if (Math.abs(pitch.x) <= MAX_PITCH + 1e-3) pitch.x = clamp(pitch.x, MAX_PITCH);
      }

      /* where: printed label -> its resting place on the bottle (lift-off), then the journey */
      var introAlpha, appear = 1;
      if (MARK) {
        // the hero's script calls the moves (window.AGHA_HERO); a late model simply fades in where it should be
        var ph = window.AGHA_HERO || {};
        if (!ph.appear && revealedAt && now - revealedAt > C.V2.FALLBACK_MS) ph = window.AGHA_HERO = { appear: now, home: now };
        if (introStart < 0 && ph.home) introStart = ph.home;
        var from = Math.max(ph.appear || 0, readyAt);
        appear = introStart === 0 ? 1 : ph.appear ? clamp01((now - from) / C.V2.APPEAR_MS) : 0;
        introAlpha = appear;
      } else if (introStart < 0 && revealedAt && now - revealedAt > C.INTRO_DELAY) introStart = now;
      var i = introStart < 0 ? 0 : introStart === 0 ? 1 : clamp01((now - introStart) / INTRO_MS);
      var lift = ease(i);
      if (!MARK) introAlpha = introStart < 0 ? 0 : introStart === 0 ? 1 : clamp01(i / 0.12);   // appears on the label, then lifts
      var L = label();
      if (MARK) L.s *= 0.86 + 0.14 * (1 - Math.pow(1 - appear, 3));                // settles in, a touch smaller first
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
      var tip = -Math.sin(Math.PI * lift) * (MARK ? 0.12 : 0.2) - (at.tilt || 0) * 0.1;   // tips up as it comes forward / travels

      /* place it */
      var px2w = frameH / vh;
      fit.scale.setScalar(pose.s * px2w / dims.y);
      pivot.position.set((pose.x - vw / 2) * px2w, -(pose.y - vh / 2) * px2w, 0);
      pivot.rotation.set(pitch.x + tip, yaw.x, roll.x, 'YXZ');
      canvas.style.opacity = alpha;
      // while held, the reflections brighten a little so the shine reads during the turn
      gold.envMapIntensity = GOLD.ENV + (GOLD.ENV_DRAG - GOLD.ENV) * shine.x;
      // the cursor glint: a small light just in front of the logo, under the mouse
      if (pointer) glint.position.set((pointer.x - vw / 2) * px2w, -(pointer.y - vh / 2) * px2w, pose.s * px2w * 0.9);
      glint.intensity = 14 * Math.pow(pose.s * px2w, 2) * Math.max(0, glintI.x);
      // light that moves on its own, so the bands keep sliding even when the logo is nearly still:
      // the studio reflections turn slowly and the key light circles the logo
      if (!reduceMotion) {
        var secs = (now - t0) / 1000;
        scene.environmentRotation.y = secs * C.ENV_TURN;
        var kA = TAU * secs / C.KEY_LAP_SECONDS;
        key.position.set(3 * Math.sin(kA), 2.5, 3 * Math.cos(kA));
      }
      renderer.render(scene, camera);

      var side = pose.s * 1.04;
      hit.style.width = hit.style.height = side + 'px';
      hit.style.transform = 'translate(' + (pose.x - side / 2) + 'px,' + (pose.y - side / 2) + 'px)';
      hit.style.visibility = alpha > 0.5 ? 'visible' : 'hidden';

      // the hint: under the logo once it has landed, until the first drag
      var showHint = !MARK && C.SHOW_IN_HERO && !hintDone && i >= 1 && !drag && at.hero > 0.999 && at.a > 0.99;   // at the hero stop only
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
