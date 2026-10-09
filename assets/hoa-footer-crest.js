/*
  House of Agha: the footer's 3D logo (2026-10-09, user: "3D logo in the footer, it rotates, no interaction").
  The crest half of the footer lockup ([data-hoa-footer-crest], snippets/footer.liquid) becomes the
  client's 3D crest (assets/agha-crest.glb), turning slowly left to right on its own. No hover, drag
  or click: pointer-events stay off and the wordmark link around it works as before.
  Same three.js build, model and gold lighting as the hero logo (assets/hoa-crest.js), so the look matches.
  Loads only when the footer comes near the screen; draws only while it is on screen and the tab is
  visible. Reduced motion: one still frame, facing front. Until the model is ready (or if WebGL is
  unavailable) the flat crest image stays.
*/
(function () {
  'use strict';
  var box = document.querySelector('[data-hoa-footer-crest]');
  if (!box || !window.IntersectionObserver) return;
  var src = box.getAttribute('data-src');
  if (!src) return;

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
  var SPIN_SECONDS = 12;                                   // one turn, like the hero logo's idle spin
  var DEG = Math.PI / 180;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var near = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    near.disconnect();
    boot();
  }, { rootMargin: '400px 0px' });
  near.observe(box);

  function boot() {
    Promise.all([
      import(THREE_URL + '+esm'),
      import(THREE_URL + 'examples/jsm/loaders/GLTFLoader.js/+esm'),
      import(THREE_URL + 'examples/jsm/environments/RoomEnvironment.js/+esm'),
      import(THREE_URL + 'examples/jsm/libs/meshopt_decoder.module.js/+esm')
    ]).then(function (m) {
      init(m[0], m[1].GLTFLoader, m[2].RoomEnvironment, m[3].MeshoptDecoder);
    }).catch(function (err) { if (window.console) console.warn('[hoa-footer-crest]', err); });
  }

  function init(THREE, GLTFLoader, RoomEnvironment, MeshoptDecoder) {
    var canvas = document.createElement('canvas');
    canvas.className = 'hoa-footer__crest-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral rendering, as a standard glTF viewer (user 2026-10-09: "the exact 3D file, no effect from our side,
    // the exact metallic gold"): Khronos PBR Neutral tone mapping keeps the file's base colour true, exposure 1.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x000000, 0);

    // lighting = the hero logo's: the file's material in the standard neutral studio, nothing added
    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    // The file's own look (user 2026-10-09: "exact 3D file glazing, not added from our side"): the GLB stores only its
    // material (metal 1, roughness 0.22, its gold) and no lights, so the glaze comes from reflecting a viewer's studio.
    // This is the standard neutral glTF-viewer studio (three.js RoomEnvironment), unmodified: no added strips or lights.
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    var FOV = 18, DIST = 20;
    var camera = new THREE.PerspectiveCamera(FOV, 1, 1, 60);
    camera.position.set(0, 0, DIST);
    var frameH = 2 * DIST * Math.tan(FOV * DEG / 2);
    var pivot = new THREE.Group();
    scene.add(pivot);

    var visible = false, raf = 0, t0 = performance.now(), ready = false;

    function size() {
      var w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (ready) draw(performance.now());
    }

    function draw(now) {
      pivot.rotation.y = reduceMotion ? 0 : ((now - t0) / 1000) * (Math.PI * 2 / SPIN_SECONDS);
      renderer.render(scene, camera);
    }
    function loop(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    function wake() {
      if (!ready || reduceMotion || raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
    }

    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(src, function (gltf) {
      var model = gltf.scene;
      var bb = new THREE.Box3().setFromObject(model);
      var dims = bb.getSize(new THREE.Vector3());
      model.position.sub(bb.getCenter(new THREE.Vector3()));
            // fill the box height; the crest is about as wide as it is tall, so it never clips while turning
      pivot.scale.setScalar((frameH * 0.94) / Math.max(dims.x, dims.y));
      pivot.add(model);
      box.appendChild(canvas);
      ready = true;
      size();
      draw(performance.now());
      box.classList.add('is-3d');                            // CSS fades the flat crest out
      wake();
    }, undefined, function (err) { if (window.console) console.warn('[hoa-footer-crest]', err); });

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      wake();
    }).observe(box);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('resize', size);
  }
})();
