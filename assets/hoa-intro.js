/* HOUSE OF AGHA — opening ritual (snippets/hoa-intro.liquid, assets/hoa-intro.css).

   The bottle appears, the atomizer is pressed, and the bottle then TRAVELS across the screen, spraying as it goes.
   The mist trails behind the nozzle and drifts up through the wordmark, which stays fixed in the exact centre of the
   viewport and is uncovered by that mist: every droplet that crosses the lettering leaves a
   little of it visible, and the letters sharpen from soft to crisp. The bottle fades away, the mist disperses,
   the wordmark holds alone for a moment, then travels to the hero headline and the real homepage begins.

   How it works
     · one <canvas> holds the mist AND the wordmark. The wordmark is drawn from two pre-rendered textures
       (soft and sharp) through a small "reveal" buffer that droplets paint into as they pass. Only the
       text's bounding box is composited each frame, so the per-frame cost stays small.
     · GSAP owns the timeline (bottle in, nozzle press, spray, sharpen, disperse, hand-off) and the
       ticker drives the particle step, so everything pauses with the tab.
     · desktop and phones use different compositions and particle counts.
   Runs once per browsing session (sessionStorage 'hoa-intro'); ?intro=1 replays it, ?nointro skips it.
   If GSAP is missing or anything throws, the intro is removed and the homepage is simply shown.
   Reduced motion: bottle and wordmark appear briefly, no particles, then straight into the homepage.

   Hand-off to the homepage: the 'hoa:intro-reveal' event fires as the overlay starts to lift; hoa-home.js
   holds the hero entrance until then, and the header fades in. */
(function () {
  'use strict';

  var html = document.documentElement;
  var root = document.querySelector('[data-hoa-intro]');
  if (!root) return;
  if (!html.classList.contains('hoa-intro-active')) { root.parentNode && root.parentNode.removeChild(root); return; }

  var gsap = window.gsap;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = function (s) { return root.querySelector(s); };
  var bottle = q('[data-intro-bottle]');
  var float_ = q('[data-intro-float]');
  var cap = q('[data-intro-cap]');
  var body = q('[data-intro-body]');
  var imgs = [q('[data-intro-body]'), q('[data-intro-cap]')];
  var canvas = q('[data-intro-canvas]');
  var mark = q('[data-intro-mark]');
  var skipBtn = q('[data-intro-skip]');

  var finished = false;
  var revealed = false;
  var tl = null;
  var ticker = null;
  var lockedBody = false;
  var cleanups = [];
  var failsafe = null;

  try { sessionStorage.setItem('hoa-intro', '1'); } catch (e) {}

  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanups.push(function () { target.removeEventListener(type, fn, opts); });
  }

  function fireReveal() {
    if (revealed) return;
    revealed = true;
    root.classList.add('is-running'); // keep the overlay up while the page underneath takes over
    html.classList.remove('hoa-intro-active');
    document.dispatchEvent(new Event('hoa:intro-reveal'));
    var header = document.querySelector('[data-hoa-header]');
    if (header && gsap) gsap.fromTo(header, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out', clearProps: 'opacity' });
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(failsafe);
    fireReveal();
    if (ticker && gsap) gsap.ticker.remove(ticker);
    if (tl) tl.kill();
    if (gsap) gsap.killTweensOf([root, mark, canvas].concat(imgs).filter(Boolean));
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    if (keyedUrl) { URL.revokeObjectURL(keyedUrl); keyedUrl = ''; }
    if (lockedBody) { document.body.style.overflow = ''; lockedBody = false; }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  // Anything that goes wrong: drop the intro, show the site
  function bail() { try { fireReveal(); } catch (e) {} finish(); }

  if (!gsap || !bottle || !mark) { bail(); return; }
  failsafe = setTimeout(bail, 16000);

  document.body.style.overflow = 'hidden'; // hoa-home.js also pauses Lenis while this is set
  lockedBody = true;

  /* ------------------------------------------------------------------ */
  /* Layout                                                              */
  /* ------------------------------------------------------------------ */
  var mobile = window.matchMedia('(max-width: 767px)').matches;
  var CAP_SPLIT = 0.287;      // the cap ends at 28.7% of the photograph's height
  var NOZZLE = { x: 0.38, y: 0.17 }; // where the mist leaves, as a fraction of the bottle image

  var tablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
  // The bottle's travel, as fractions of the viewport width (image centre): shorter on tablet and phones
  var PATH = mobile ? [0.22, 0.78] : tablet ? [0.16, 0.84] : [0.12, 0.88];
  function dxAt(p) { return (PATH[0] + (PATH[1] - PATH[0]) * p - 0.5) * window.innerWidth; }

  // Wordmark: fitted to the screen, then placed in the true centre of the viewport (left / top in px, so the
  // later hand-off can use plain x / y). It never follows the bottle.
  function fitMark() {
    var vw = window.innerWidth, vh = window.innerHeight;
    mark.style.fontSize = '';
    var room = vw * (mobile ? 0.9 : 0.66);
    var w = mark.getBoundingClientRect().width;
    if (w > room) mark.style.fontSize = (parseFloat(getComputedStyle(mark).fontSize) * room / w).toFixed(2) + 'px';
    var r = mark.getBoundingClientRect();
    mark.style.left = Math.round((vw - r.width) / 2) + 'px';
    mark.style.top = Math.round((vh - r.height) / 2) + 'px';
  }

  function nozzlePoint() {
    var r = body.getBoundingClientRect();
    return { x: r.left + r.width * NOZZLE.x, y: r.top + r.height * NOZZLE.y, h: r.height };
  }

  /* ------------------------------------------------------------------ */
  /* Bottle photograph: white ground -> transparent                      */
  /* ------------------------------------------------------------------ */
  var keyedUrl = '';
  // The studio photograph sits on pure white. Un-multiply it (alpha from the darkest channel) so the bottle is
  // a true cut-out that can float, fade and lift over the homepage. Any failure falls back to CSS multiply.
  function keyBottle() {
    // the blueprint drawing is already line art on a transparent ground: nothing to key out
    if (/\.svg(\?|$)/.test(body.currentSrc || body.src || '')) return Promise.resolve();
    try {
      var W = 900, H = 1125;
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.drawImage(body, 0, 0, W, H);
      var d = x.getImageData(0, 0, W, H), p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var r = p[i], g = p[i + 1], b = p[i + 2];
        var m = Math.min(r, g, b), a = 255 - m;
        if (a < 4) { p[i + 3] = 0; continue; }
        p[i] = (r - m) * 255 / a; p[i + 1] = (g - m) * 255 / a; p[i + 2] = (b - m) * 255 / a; p[i + 3] = a;
      }
      x.putImageData(d, 0, 0);
      return new Promise(function (res) {
        c.toBlob(function (blob) {
          if (!blob) { root.classList.add('is-blend'); res(); return; }
          keyedUrl = URL.createObjectURL(blob);
          var done = 0;
          var one = function () { if (++done === 2) res(); };
          [body, cap].forEach(function (im) {
            im.addEventListener('load', one, { once: true });
            im.addEventListener('error', one, { once: true });
            im.src = keyedUrl;
          });
        }, 'image/png');
      });
    } catch (e) {
      root.classList.add('is-blend');
      return Promise.resolve();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mist + wordmark                                                     */
  /* ------------------------------------------------------------------ */
  var mist = null;

  function createMist() {
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    var vw = window.innerWidth, vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    var tr = mark.getBoundingClientRect();
    var pad = Math.round(tr.height * 0.3);
    var box = { x: Math.floor(tr.left - pad), y: Math.floor(tr.top - pad), w: Math.ceil(tr.width + pad * 2), h: Math.ceil(tr.height + pad * 2) };

    // -- wordmark textures (sharp and soft), drawn once at device resolution
    var cs = getComputedStyle(mark);
    var font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var text = mark.textContent.trim().toUpperCase();
    var fontPx = parseFloat(cs.fontSize);
    var spacing = parseFloat(cs.letterSpacing) || 0;
    var ink = cs.color;

    function makeTex(blur) {
      var c = document.createElement('canvas');
      c.width = Math.round(box.w * dpr); c.height = Math.round(box.h * dpr);
      var x = c.getContext('2d');
      x.scale(dpr, dpr);
      x.font = font;
      x.textBaseline = 'alphabetic';
      if ('letterSpacing' in x) x.letterSpacing = spacing + 'px';
      var m = x.measureText(text);
      var asc = m.fontBoundingBoxAscent || fontPx * 0.8;
      var desc = m.fontBoundingBoxDescent || fontPx * 0.2;
      var baseline = pad + (tr.height - (asc + desc)) / 2 + asc;
      var startX = pad;
      if (blur) {
        // draw only the shadow: the glyphs sit far off canvas, their blurred shadow lands in place
        x.shadowColor = ink; x.shadowBlur = blur * dpr; x.shadowOffsetX = 9000 * dpr; x.shadowOffsetY = 0;
        x.fillStyle = ink;
        x.fillText(text, startX - 9000, baseline);
      } else {
        x.fillStyle = ink;
        x.fillText(text, startX, baseline);
      }
      return c;
    }
    var sharpTex = makeTex(0);
    var softTex = makeTex(fontPx * 0.11);

    // -- reveal buffer: droplets paint here; low resolution, so it upsamples soft
    var CELL = 5;
    var rev = document.createElement('canvas');
    rev.width = Math.ceil(box.w / CELL); rev.height = Math.ceil(box.h / CELL);
    var rx = rev.getContext('2d');
    var tmp = document.createElement('canvas');
    tmp.width = sharpTex.width; tmp.height = sharpTex.height;
    var tx = tmp.getContext('2d');

    // -- soft sprite for the haze: a plain feathered dot, drawn once
    var SP = 64;
    var sprite = document.createElement('canvas');
    sprite.width = SP; sprite.height = SP;
    var sx = sprite.getContext('2d');
    var g = sx.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
    g.addColorStop(0, 'rgba(60,52,44,1)'); g.addColorStop(0.5, 'rgba(60,52,44,0.4)'); g.addColorStop(1, 'rgba(60,52,44,0)');
    sx.fillStyle = g; sx.fillRect(0, 0, SP, SP);

    // -- particles
    var FINE = mobile ? 380 : 900;
    var HAZE = mobile ? 70 : 150;
    var parts = [];
    var noz = nozzlePoint();
    var nozPrev = null;
    var bvx = 0, bvy = 0;            // the nozzle's own velocity: fresh mist inherits some of it, so it trails behind
    var ang = mobile ? -56 : -50;    // degrees, 0 = right, negative = up: the mist rises through the wordmark
    var spread = mobile ? 14 : 11;
    var reach = vh * (mobile ? 0.3 : 0.36);
    var K = 1.1; // drag
    var RATE = mobile ? 150 : 300;   // particles per second while spraying
    var HAZE_SHARE = 0.14;
    var spray = 0, acc = 0;
    var mistAlpha = 1;
    var sharp = 0;
    var boost = 0;
    var t = 0;
    var textOn = true;

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

    function spawn(haze) {
      var a = (ang + gauss() * spread * (haze ? 1.4 : 1)) * Math.PI / 180;
      var R = haze ? rnd(0.1, 0.55) * reach : rnd(0.18, 1) * reach;
      var v0 = R * K;
      parts.push({
        x: noz.x + rnd(-2, 2), y: noz.y + rnd(-2, 2),
        vx: Math.cos(a) * v0 + bvx * 0.5, vy: Math.sin(a) * v0 + bvy * 0.5,
        age: 0, life: haze ? rnd(3.2, 5.2) : rnd(1.8, 3.8),
        size: haze ? rnd(16, 34) : rnd(0.7, 1.9),
        haze: haze, bright: !haze && Math.random() < 0.42,
        ph: Math.random() * 6.28, wob: rnd(0.6, 1.4)
      });
    }

    function step(dt) {
      t += dt;
      // the nozzle moves with the bottle: emit from where it is now, and note how fast it is going
      noz = nozzlePoint();
      if (nozPrev) { bvx = (noz.x - nozPrev.x) / dt; bvy = (noz.y - nozPrev.y) / dt; }
      nozPrev = noz;
      if (spray > 0) {
        acc += spray * RATE * dt * (0.86 + 0.14 * Math.sin(t * 5.3));
        while (acc >= 1) { acc -= 1; spawn(Math.random() < HAZE_SHARE); }
      }
      var drag = Math.exp(-K * dt);
      for (var k = parts.length - 1; k >= 0; k--) {
        var q_ = parts[k];
        q_.age += dt;
        if (q_.age >= q_.life) { parts.splice(k, 1); continue; }
        // slow organic turbulence + a little lift
        var ax = Math.sin(q_.y * 0.006 + t * 0.9 + q_.ph) * 26 * q_.wob;
        var ay = Math.cos(q_.x * 0.005 + t * 0.7 + q_.ph) * 26 * q_.wob - 9;
        q_.vx = (q_.vx + ax * dt) * drag; q_.vy = (q_.vy + ay * dt) * drag;
        q_.x += q_.vx * dt; q_.y += q_.vy * dt;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, vw, vh);

      // paint the reveal buffer: every particle over the lettering leaves a little of it visible
      var i, p, life, a, s;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (p.x < box.x - 20 || p.x > box.x + box.w + 20 || p.y < box.y - 20 || p.y > box.y + box.h + 20) continue;
        life = p.age / p.life;
        a = Math.sin(Math.min(1, life) * Math.PI); // in and out
        s = p.haze ? p.size * 0.5 / CELL * (0.6 + life) : (mobile ? 3.1 : 2.4);
        rx.globalAlpha = (p.haze ? 0.06 : 0.16) * a * (mobile ? 1.25 : 1);
        rx.fillStyle = '#fff';
        rx.beginPath();
        rx.arc((p.x - box.x) / CELL, (p.y - box.y) / CELL, s, 0, 6.283);
        rx.fill();
      }
      rx.globalAlpha = 1;

      // the wordmark: soft to sharp, only where the mist has been, plus the final settle (boost)
      if (textOn) {
      tx.globalCompositeOperation = 'source-over';
      tx.globalAlpha = 1;
      tx.clearRect(0, 0, tmp.width, tmp.height);
      tx.globalAlpha = (1 - sharp) * 0.62; tx.drawImage(softTex, 0, 0);
      tx.globalAlpha = sharp; tx.drawImage(sharpTex, 0, 0);
      tx.globalAlpha = 1;
      tx.globalCompositeOperation = 'destination-in';
      tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high';
      tx.drawImage(rev, 0, 0, tmp.width, tmp.height);
      tx.globalCompositeOperation = 'source-over';
      if (boost > 0) { tx.globalAlpha = boost; tx.drawImage(sharpTex, 0, 0); tx.globalAlpha = 1; }
      ctx.globalAlpha = 0.94;
      ctx.drawImage(tmp, box.x, box.y, box.w, box.h);
      ctx.globalAlpha = 1;
      }

      // mist: fine droplets (some catching the light) and a very faint haze
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        life = p.age / p.life;
        a = Math.sin(Math.min(1, life) * Math.PI) * mistAlpha;
        if (a <= 0.004) continue;
        if (p.haze) {
          s = p.size * (1 + life * 2.2);
          ctx.globalAlpha = 0.07 * a;
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
        } else {
          ctx.globalAlpha = (p.bright ? 0.9 : 0.34) * a;
          ctx.fillStyle = p.bright ? '#ffffff' : '#3c342c';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, 6.283);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    return {
      box: box,
      setSpray: function (v) { spray = v; },
      step: step, draw: draw,
      setSharp: function (v) { sharp = v; },
      setBoost: function (v) { boost = v; },
      setMistAlpha: function (v) { mistAlpha = v; },
      hideText: function () { textOn = false; },
      alive: function () { return parts.length; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Timeline                                                            */
  /* ------------------------------------------------------------------ */
  function heroTitle() { return document.querySelector('.hoa-hero__title'); }

  // Wordmark travels to the hero headline while the overlay lifts and the hero words rise
  function handOff(tlx, at) {
    tlx.add(function () { fireReveal(); }, at);
    tlx.to(root, { backgroundColor: 'rgba(246,243,238,0)', duration: 1.15, ease: 'power2.inOut' }, at);
    tlx.add(function () {
      var target = heroTitle();
      if (!target) { gsap.to(mark, { opacity: 0, duration: 0.6 }); return; }
      var a = mark.getBoundingClientRect(), b = target.getBoundingClientRect();
      var s = Math.max(0.5, Math.min(1.2, b.width / a.width));
      gsap.to(mark, {
        x: (b.left + b.width / 2) - (a.left + a.width / 2), y: (b.top + b.height / 2) - (a.top + a.height / 2), scale: s,
        duration: 1.15, ease: 'expo.inOut'
      });
      // the hero is dark: the ink lettering turns ivory (the hero headline's colour) as it lifts over it
      gsap.to(mark, { color: '#F6F1E7', duration: 0.7, ease: 'power1.inOut' });
      gsap.to(mark, { opacity: 0, duration: 0.55, delay: 0.5, ease: 'power1.in' });
    }, at);
    tlx.add(finish, at + 1.7);
  }

  function runReduced() {
    // no particles: the bottle and the wordmark, briefly, then the homepage
    gsap.set(mark, { opacity: 0 });
    gsap.set(imgs, { x: dxAt(0) });
    tl = gsap.timeline({ onComplete: finish });
    tl.to(imgs, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0)
      .to(mark, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 0.25)
      .to({}, { duration: 0.9 })
      .add(function () { fireReveal(); })
      .to(root, { opacity: 0, duration: 0.7, ease: 'power1.inOut' });
  }

  function run() {
    fitMark();
    gsap.set(imgs, { opacity: 0 });
    gsap.set(mark, { opacity: 0 });

    if (reduce) { runReduced(); return; }

    mist = createMist();
    if (!mist) { runReduced(); return; }

    // st: everything the timeline animates. The bottle's position is applied every frame from st.p (travel),
    // st.enter (arrival), a slow float and a tiny lean, so the nozzle the mist follows is always the real one.
    var st = { p: 0, enter: 0, blur: 0, sharp: 0, boost: 0, mist: 1, spray: 0 };
    var apply = function () {
      var time = tl ? tl.time() : 0;
      var vw = window.innerWidth, vh = window.innerHeight;
      var x = dxAt(st.p) - (1 - st.enter) * vw * 0.06;
      var arc = -Math.sin(Math.PI * st.p) * vh * (mobile ? 0.02 : 0.03); // a gentle curve, not a straight line
      gsap.set(imgs, {
        x: x, y: arc + Math.sin(time * 0.9) * 3, rotation: Math.sin(time * 0.7) * 0.4 + Math.sin(Math.PI * st.p) * 1.1,
        transformOrigin: '50% 60%', filter: st.blur > 0.05 ? 'blur(' + st.blur.toFixed(2) + 'px)' : 'none'
      });
    };
    var tick = function (dt) { apply(); mist.step(dt); mist.draw(); };

    var last = 0;
    ticker = function (time) {
      var dt = Math.min(0.05, time - last); last = time;
      if (dt <= 0) return;
      tick(dt);
    };
    last = gsap.ticker.time;
    gsap.ticker.add(ticker);

    tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    // inspection handles (devtools / tests): step the timeline and the mist by hand
    root._hoaTl = tl;
    root._hoaSim = { tick: tick, stop: function () { gsap.ticker.remove(ticker); } };

    // 1. the bottle arrives at the left
    tl.to(imgs, { opacity: 1, duration: 0.9 }, 0.05);
    tl.to(st, { enter: 1, duration: 1.3, ease: 'power3.out' }, 0);

    // 2. the nozzle is pressed and the spray begins; the bottle then sets off across the screen, slowly
    tl.to(cap, { yPercent: 1.5, duration: 0.26, ease: 'power2.in', overwrite: false }, 0.75);
    tl.to(cap, { yPercent: 0, duration: 0.55, ease: 'power2.out', overwrite: false }, 1.02);
    tl.to(st, { spray: 1, duration: 0.45, ease: 'power1.out', onUpdate: function () { mist.setSpray(st.spray); } }, 0.85);
    tl.to(st, { p: 1, duration: 4.5, ease: 'power2.inOut' }, 1.2);

    // 3. the mist reaches the centre and uncovers the wordmark: soft, then crisp; a last settle makes it whole
    tl.to(st, { sharp: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: function () { mist.setSharp(st.sharp); } }, 2.5);
    tl.to(st, { boost: 1, duration: 1.2, ease: 'power1.inOut', onUpdate: function () { mist.setBoost(st.boost); } }, 3.1);

    // 4. the bottle stops spraying and fades away (opacity + a little blur) as it slows toward the far side
    tl.to(st, { spray: 0, duration: 0.7, ease: 'power1.in', onUpdate: function () { mist.setSpray(st.spray); } }, 4.8);
    tl.to(imgs, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 5.0);
    tl.to(st, { blur: 5, duration: 0.8, ease: 'power1.in' }, 5.0);

    // 5. the mist disperses; the wordmark holds alone in the centre
    tl.to(st, { mist: 0, duration: 1.0, ease: 'power1.inOut', onUpdate: function () { mist.setMistAlpha(st.mist); } }, 5.9);
    // the DOM wordmark takes over from the canvas one (same size, same place) so it can travel
    tl.add(function () {
      mark.style.opacity = '1';
      mist.hideText();
    }, 6.4);

    // 6. hand-off into the hero
    handOff(tl, 7.0);

    // Design aid: ?intro=1&introat=3.4 freezes the intro at 3.4 s (stepped deterministically), for screenshots.
    var at = /[?&]introat=([0-9.]+)/.exec(location.search);
    if (at) {
      gsap.ticker.remove(ticker); tl.pause(); clearTimeout(failsafe);
      var T = 0, target = parseFloat(at[1]);
      while (T < target) { T += 1 / 60; tl.time(T, false); tick(1 / 60); }
    }
  }

  // Start once the fonts and the bottle photograph are ready (or after a short wait)
  function start() {
    if (finished) return;
    try { run(); } catch (e) { bail(); }
  }
  var ready = [];
  if (document.fonts && document.fonts.load) {
    ready.push(document.fonts.load('400 64px "Bodoni Moda"').catch(function () {}));
  }
  ready.push(new Promise(function (res) {
    if (body.complete && body.naturalWidth) { res(); return; }
    body.addEventListener('load', res, { once: true });
    body.addEventListener('error', res, { once: true });
  }));
  var started = false;
  var go = function () { if (started) return; started = true; start(); };
  Promise.all(ready).then(keyBottle).then(go);
  setTimeout(go, 2500);

  /* ------------------------------------------------------------------ */
  /* Controls, resize, cleanup                                           */
  /* ------------------------------------------------------------------ */
  function skip() {
    if (finished) return;
    if (!started) { started = true; }
    if (tl) tl.kill();
    if (ticker) { gsap.ticker.remove(ticker); ticker = null; }
    if (mist) mist.setMistAlpha(0);
    gsap.set(canvas, { opacity: 0 });
    fireReveal();
    gsap.to(root, { opacity: 0, duration: 0.5, ease: 'power1.inOut', onComplete: finish });
  }
  if (skipBtn) on(skipBtn, 'click', skip);
  on(document, 'keydown', function (e) { if (e.key === 'Escape') skip(); });
  // A resize or rotation invalidates the composition: just move on
  var w0 = window.innerWidth;
  on(window, 'resize', function () { if (Math.abs(window.innerWidth - w0) > 80) skip(); });
  on(window, 'pagehide', finish);
})();
