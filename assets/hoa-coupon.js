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

  var card = root.querySelector('.hoa-coupon__card');
  var copyBtn = root.querySelector('[data-coupon-copy]');
  var status = root.querySelector('[data-coupon-status]');
  var codeEl = root.querySelector('[data-coupon-code]');
  var code = codeEl.textContent.trim();
  var delay = parseInt(root.getAttribute('data-delay'), 10) || 10000;
  var lastFocus = null, copyTimer = null, closing = false, lockedByUs = false;

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
  }

  function close() {
    if (closing) return;
    closing = true;
    root.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    unlock();
    setTimeout(function () {
      root.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 550);
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = card.querySelectorAll('button, a[href]');
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
    var done = function (ok) {
      if (!ok) { // last resort: select the code so it can be copied by hand
        var r = document.createRange(); r.selectNodeContents(codeEl);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        return;
      }
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('is-copied');
      status.textContent = 'Code ' + code + ' copied to clipboard';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        copyBtn.textContent = 'Copy Code';
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
    if (e.target.closest('[data-coupon-close]')) { close(); return; }
    if (e.target.closest('[data-coupon-close-link]')) unlock(); // navigating away; just release the scroll lock
  });

  // The delay counts from full page load, not from script parse.
  function schedule() { setTimeout(open, delay); }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
