/* HOUSE OF AGHA — welcome coupon popup (snippets/hoa-coupon-popup.liquid).
   Opens once per browsing session, `data-delay` ms after page load. Display only — no discount logic. */
(function () {
  'use strict';
  var KEY = 'hoa-coupon-shown';
  var root = document.querySelector('[data-hoa-coupon]');
  if (!root) return;

  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  if (seen) return;
  // Already applied in the bag: the offer is taken, so don't offer it again.
  if (window.HOA && window.HOA.ready && window.HOA.coupon.code()) return;

  var card = root.querySelector('.hoa-coupon__card');
  var copyBtn = root.querySelector('[data-coupon-copy]');
  var status = root.querySelector('[data-coupon-status]');
  var codeEl = root.querySelector('[data-coupon-code]');
  var code = (codeEl.getAttribute('data-code') || '').trim(); // the text itself is only written into the page once scratching starts
  var revealLink = root.querySelector('[data-coupon-reveal]');
  var delay = parseInt(root.getAttribute('data-delay'), 10) || 10000;
  var lastFocus = null, copyTimer = null, closing = false, lockedByUs = false;

  /* ------------------------------------------------------------------ */
  /* Scratch card: an opaque foil canvas over the code. Pointer events   */
  /* cover mouse, pen and touch; the canvas is touch-action:none so a    */
  /* scratch never scrolls the sheet. Everything is bound in start() and */
  /* released in stop() (called from close()).                           */
  /* ------------------------------------------------------------------ */
  var scratchEl = root.querySelector('[data-coupon-scratch]');
  var foil = root.querySelector('[data-scratch-canvas]');
  var fxCanvas = root.querySelector('[data-scratch-fx]');
  var desc = root.querySelector('[data-coupon-desc]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var REVEAL_AT = 0.62; // share of the foil scratched away before the rest melts off
  var revealed = false;
  var S = { ctx: null, fx: null, dpr: 1, w: 0, h: 0, down: false, last: null, started: false, parts: [], raf: 0, checkAt: 0, ro: null, bound: false, pid: null };

  function paintFoil() {
    var c = S.ctx, w = S.w, h = S.h, d = S.dpr, i;
    c.globalCompositeOperation = 'source-over';
    var g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#c9ad72'); g.addColorStop(0.32, '#ebdcb2'); g.addColorStop(0.58, '#c4a568'); g.addColorStop(0.8, '#e2cf9c'); g.addColorStop(1, '#a88549');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = d;
    for (var x = -h; x < w; x += 13 * d) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); }
    for (i = 0; i < (w * h) / 70; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(90,64,24,0.09)';
      c.fillRect(Math.random() * w, Math.random() * h, d, d);
    }
    c.strokeStyle = 'rgba(74,54,22,0.35)'; c.lineWidth = d;
    c.strokeRect(9 * d, 9 * d, w - 18 * d, h - 18 * d);
  }

  function sizeCanvases() {
    var cw = scratchEl.offsetWidth, ch = scratchEl.offsetHeight;
    if (!cw || !ch) return false;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.w = foil.width = fxCanvas.width = Math.round(cw * S.dpr);
    S.h = foil.height = fxCanvas.height = Math.round(ch * S.dpr);
    S.ctx = foil.getContext('2d', { willReadFrequently: true });
    S.fx = fxCanvas.getContext('2d');
    paintFoil();
    return true;
  }

  function pos(e) {
    var r = foil.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (S.w / r.width), y: (e.clientY - r.top) * (S.h / r.height) };
  }

  function ensureCodeText() { if (codeEl.getAttribute('data-shown') !== '1') { codeEl.textContent = code; codeEl.setAttribute('data-shown', '1'); } }

  function spawn(x, y, n, spread) {
    if (reduceMotion) return;
    for (var i = 0; i < n && S.parts.length < 90; i++) {
      var a = Math.random() * Math.PI * 2, v = (0.6 + Math.random() * 2.2) * S.dpr * (spread || 1);
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6 * S.dpr, life: 1, s: (1 + Math.random() * 2.2) * S.dpr, gold: Math.random() < 0.6 });
    }
    if (!S.raf) S.raf = requestAnimationFrame(tick);
  }

  function tick() {
    S.raf = 0;
    if (!S.fx) return;
    S.fx.clearRect(0, 0, S.w, S.h);
    for (var i = S.parts.length - 1; i >= 0; i--) {
      var p = S.parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.09 * S.dpr; p.life -= 0.035;
      if (p.life <= 0) { S.parts.splice(i, 1); continue; }
      S.fx.globalAlpha = Math.max(p.life, 0);
      S.fx.fillStyle = p.gold ? '#d9bd7c' : '#f4ead0';
      S.fx.fillRect(p.x, p.y, p.s, p.s);
    }
    S.fx.globalAlpha = 1;
    if (S.parts.length) S.raf = requestAnimationFrame(tick);
  }

  function scratchedShare() {
    var d;
    try { d = S.ctx.getImageData(0, 0, S.w, S.h).data; } catch (e) { return 0; }
    var total = 0, clear = 0;
    for (var i = 3; i < d.length; i += 32) { total++; if (d[i] < 128) clear++; } // every 8th pixel
    return total ? clear / total : 0;
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    stopScratch();
    ensureCodeText();
    codeEl.removeAttribute('aria-hidden');
    scratchEl.classList.remove('is-scratching');
    scratchEl.classList.add('is-revealed');
    root.classList.add('is-revealed');
    if (desc) desc.textContent = desc.getAttribute('data-done');
    copyBtn.hidden = false;
    status.textContent = 'Your code ' + code + ' is revealed.';
    if (S.w) spawn(S.w / 2, S.h / 2, 36, 1.6);
    setTimeout(function () { if (revealed && S.ctx) S.ctx.clearRect(0, 0, S.w, S.h); }, 800);
    if (revealLink) revealLink.hidden = true;
    try { copyBtn.focus({ preventScroll: true }); } catch (e) {}
  }

  function scratchTo(p) {
    var c = S.ctx;
    c.globalCompositeOperation = 'destination-out';
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = (S.pointerType === 'touch' ? 52 : 40) * S.dpr;
    c.beginPath();
    c.moveTo(S.last.x, S.last.y);
    c.lineTo(p.x + 0.01, p.y);
    c.stroke();
    spawn(p.x, p.y, 2, 1);
    S.last = p;
  }

  function onDown(e) {
    if (revealed || (e.button !== undefined && e.button > 0)) return;
    e.preventDefault();
    S.down = true; S.pointerType = e.pointerType;
    try { foil.setPointerCapture(e.pointerId); S.pid = e.pointerId; } catch (er) {}
    if (!S.started) { S.started = true; ensureCodeText(); scratchEl.classList.add('is-started'); }
    scratchEl.classList.add('is-scratching');
    S.last = pos(e);
    scratchTo(S.last);
  }
  function onMove(e) {
    if (!S.down || revealed) return;
    e.preventDefault();
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!evs.length) evs = [e];
    for (var i = 0; i < evs.length; i++) scratchTo(pos(evs[i]));
    var now = Date.now();
    if (now - S.checkAt > 140) { S.checkAt = now; if (scratchedShare() >= REVEAL_AT) reveal(); }
  }
  function onUp() {
    if (!S.down) return;
    S.down = false;
    scratchEl.classList.remove('is-scratching');
    if (S.pid !== null) { try { foil.releasePointerCapture(S.pid); } catch (er) {} S.pid = null; }
    if (!revealed && scratchedShare() >= REVEAL_AT) reveal();
  }
  function noSelect(e) { e.preventDefault(); }

  function startScratch() {
    if (revealed) { // reopened after a reveal: show the code straight away
      ensureCodeText(); codeEl.removeAttribute('aria-hidden');
      scratchEl.classList.add('is-revealed', 'is-started'); root.classList.add('is-revealed'); copyBtn.hidden = false;
      if (revealLink) revealLink.hidden = true;
      if (desc) desc.textContent = desc.getAttribute('data-done');
      return;
    }
    if (S.bound || !sizeCanvases()) return;
    foil.addEventListener('pointerdown', onDown);
    foil.addEventListener('pointermove', onMove);
    foil.addEventListener('pointerup', onUp);
    foil.addEventListener('pointercancel', onUp);
    scratchEl.addEventListener('selectstart', noSelect);
    scratchEl.addEventListener('contextmenu', noSelect);
    scratchEl.addEventListener('dragstart', noSelect);
    if (window.ResizeObserver) {
      var lastW = scratchEl.offsetWidth;
      S.ro = new ResizeObserver(function () {
        var w = scratchEl.offsetWidth;
        if (w && w !== lastW && !revealed && !S.down) { lastW = w; sizeCanvases(); } // a resize repaints the foil
      });
      S.ro.observe(scratchEl);
    }
    S.bound = true;
  }

  // Removes listeners and animation frames; the foil state is kept so a reopened popup carries on.
  function stopScratch() {
    if (!S.bound) return;
    foil.removeEventListener('pointerdown', onDown);
    foil.removeEventListener('pointermove', onMove);
    foil.removeEventListener('pointerup', onUp);
    foil.removeEventListener('pointercancel', onUp);
    scratchEl.removeEventListener('selectstart', noSelect);
    scratchEl.removeEventListener('contextmenu', noSelect);
    scratchEl.removeEventListener('dragstart', noSelect);
    if (S.ro) { S.ro.disconnect(); S.ro = null; }
    S.bound = false; S.down = false;
  }
  function cancelFx() {
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    S.parts.length = 0;
    if (S.fx) S.fx.clearRect(0, 0, S.w, S.h);
  }
  function endScratch() { stopScratch(); cancelFx(); }

  function markShown() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }

  function unlock() {
    if (lockedByUs) { document.body.style.overflow = ''; lockedByUs = false; }
  }

  function open() {
    // Don't stack on the bag drawer / menu; retry shortly.
    if (document.body.style.overflow === 'hidden' || document.documentElement.classList.contains('hoa-menu-open')) {
      setTimeout(open, 3000);
      return;
    }
    markShown();
    lastFocus = document.activeElement;
    root.hidden = false;
    void root.offsetWidth; // commit the un-hidden state so the transition runs
    root.classList.add('is-open');
    document.body.style.overflow = 'hidden'; // hoa-home.js pauses Lenis when this is set
    lockedByUs = true;
    card.focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
    startScratch();
  }

  function close() {
    if (closing) return;
    closing = true;
    root.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    endScratch();
    unlock();
    setTimeout(function () {
      root.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 550);
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = card.querySelectorAll('button:not([disabled]):not([hidden]), a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function fallbackCopy() {
    var t = document.createElement('textarea');
    t.value = code; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t);
    return ok;
  }

  function copy() {
    if (!revealed) return; // the code only exists to copy once it has been scratched off
    var done = function (ok) {
      if (!ok) { // last resort: select the code so it can be copied by hand
        var r = document.createRange(); r.selectNodeContents(codeEl);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        return;
      }
      copyBtn.textContent = 'COPIED!';
      copyBtn.classList.add('is-copied');
      status.textContent = 'Code ' + code + ' copied. Add it in your bag before checkout.';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        copyBtn.textContent = 'COPY CODE';
        copyBtn.classList.remove('is-copied');
        status.textContent = '';
      }, 2200);
    };
    // execCommand is synchronous inside the click gesture, so try it first; the async API is the backup.
    if (fallbackCopy()) { done(true); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  }

  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-coupon-copy]')) { copy(); return; }
    if (e.target.closest('[data-coupon-reveal]')) { reveal(); return; } // keyboard / no-pointer alternative to scratching
    if (e.target.closest('[data-coupon-close]')) { close(); return; }
    if (e.target.closest('[data-coupon-close-link]')) unlock(); // navigating away; just release the scroll lock
  });

  // The delay counts from full page load, not from script parse.
  // While the opening intro is up, the delay starts when it lifts, not at page load.
  function schedule() {
    if (document.documentElement.classList.contains('hoa-intro-active')) {
      document.addEventListener('hoa:intro-reveal', function () { setTimeout(open, delay); }, { once: true });
      return;
    }
    setTimeout(open, delay);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
