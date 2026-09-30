/* ==========================================================================
   HOUSE OF AGHA · PHONE BEHAVIOUR (styles: assets/hoa-mobile.css)
   Loaded on every page. Each piece checks for its markup and does nothing without it.

     scroll state   html.hoa-scrolled once the page leaves the top (header settles)
     bag count      a short bump when the number changes
     search         the sheet in snippets/header.liquid, results from window.HOA
     footer folds   column titles fold their lists below 560px
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Scroll state ---------------- */
  function initScrollState() {
    var on = false;
    var check = function () {
      var next = window.scrollY > 24;
      if (next !== on) { on = next; root.classList.toggle('hoa-scrolled', on); }
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------------- Bag count bump ---------------- */
  function initBagBump() {
    var count = document.querySelector('.hoa-header .cart-count');
    if (!count || reduceMotion || !('MutationObserver' in window)) return;
    var last = count.textContent;
    var timer;
    new MutationObserver(function () {
      if (count.textContent === last) return;
      last = count.textContent;
      count.classList.add('is-bump');
      clearTimeout(timer);
      timer = setTimeout(function () { count.classList.remove('is-bump'); }, 320);
    }).observe(count, { childList: true, characterData: true, subtree: true });
  }

  /* ---------------- Search ---------------- */
  var WEARER_WORDS = { men: 'for him men man his', women: 'for her women woman hers', unisex: 'unisex shared everyone' };
  var WEARER_LABEL = { men: 'For him', women: 'For her', unisex: 'Unisex' };

  function searchIndex() {
    if (!window.HOA || typeof window.HOA.fragrances !== 'function') return [];
    var extra = typeof AGHA_PRODUCTS !== 'undefined' ? AGHA_PRODUCTS : {}; // eslint-disable-line no-undef
    return window.HOA.fragrances().filter(Boolean).map(function (p) {
      var more = extra[p.handle] || {};
      var hay = [p.name, p.family, WEARER_WORDS[p.wearer] || '', more.description || '', p.gift ? 'gift' : ''].join(' ').toLowerCase();
      return { p: p, line: more.description || '', hay: hay };
    });
  }

  function initSearch() {
    var sheet = document.getElementById('hoa-search');
    if (!sheet) return;
    var form = sheet.querySelector('[data-hoa-search-form]');
    var input = sheet.querySelector('[data-hoa-search-input]');
    var list = sheet.querySelector('[data-hoa-search-results]');
    var status = sheet.querySelector('[data-hoa-search-status]');
    var suggest = sheet.querySelector('[data-hoa-search-suggest]');
    var index = null;
    var opener = null;
    // The static preview serves product.html?p=handle; Shopify serves /products/handle.
    var isPreview = /\.html$/.test(location.pathname) || !!document.querySelector('script[src*="wishlist-preview"]');
    var shopUrl = isPreview ? '/shop.html' : '/collections/all';
    var url = function (h) { return isPreview ? '/product.html?p=' + h : '/products/' + h; };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var money = function (n) { return window.HOA && window.HOA.money ? window.HOA.money(n) : '₹' + Number(n).toLocaleString('en-IN'); };

    function render(q) {
      if (!index) index = searchIndex();
      q = q.trim().toLowerCase();
      suggest.hidden = !!q;
      if (!q) { list.innerHTML = ''; status.textContent = ''; return; }
      var words = q.split(/\s+/);
      var hits = index.filter(function (e) { return words.every(function (w) { return e.hay.indexOf(w) > -1; }); });
      // Name matches first, then the catalog order
      hits.sort(function (a, b) { return (b.p.name.toLowerCase().indexOf(q) === 0) - (a.p.name.toLowerCase().indexOf(q) === 0); });
      status.textContent = hits.length
        ? hits.length + (hits.length === 1 ? ' fragrance' : ' fragrances')
        : 'Nothing matches “' + q + '”. Try a family such as Woody, Fresh or Floral.';
      list.innerHTML = hits.map(function (e, i) {
        var p = e.p;
        return '<li><a class="hoa-search__hit" style="--i:' + i + '" href="' + url(p.handle) + '">' +
          '<img src="' + esc(p.image) + '" alt="" width="60" height="72" loading="lazy">' +
          '<span><span class="hoa-search__name">' + esc(p.name) + '</span>' +
          '<span class="hoa-search__meta">' + esc([p.family, WEARER_LABEL[p.wearer]].filter(Boolean).join(' · ')) + '</span>' +
          (e.line ? '<span class="hoa-search__note">' + esc(e.line) + '</span>' : '') + '</span>' +
          '<span class="hoa-search__price">' + money(p.price) + (p.hasOffer ? '<s>' + money(p.regularPrice) + '</s>' : '') + '</span>' +
          '</a></li>';
      }).join('') + (hits.length ? '' : '<li><a class="hoa-search__all" href="' + shopUrl + '">See all fragrances</a></li>');
    }

    function focusables() {
      return Array.prototype.filter.call(sheet.querySelectorAll('a[href], button, input:not([type="hidden"])'), function (el) { return el.offsetParent !== null; });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function open(trigger) {
      opener = trigger || document.activeElement;
      // Leave the menu sheet first so only one overlay is up
      if (root.classList.contains('hoa-menu-open')) { var t = document.querySelector('.hoa-header__menu.js-mobile-menu'); if (t) t.click(); }
      sheet.hidden = false;
      root.classList.add('hoa-search-open');
      document.body.style.overflow = 'hidden'; // hoa-home.js pauses Lenis on this
      document.querySelectorAll('[data-hoa-search-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      document.addEventListener('keydown', onKey);
      render(input.value);
      setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
    }
    function close() {
      if (sheet.hidden) return;
      sheet.hidden = true;
      root.classList.remove('hoa-search-open');
      document.body.style.overflow = '';
      document.querySelectorAll('[data-hoa-search-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus && opener.offsetParent !== null) opener.focus({ preventScroll: true });
      else { var h = document.querySelector('.hoa-header [data-hoa-search-open]'); if (h) h.focus({ preventScroll: true }); }
    }

    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-hoa-search-open]');
      if (t) { e.preventDefault(); open(t); }
    });
    sheet.querySelector('[data-hoa-search-close]').addEventListener('click', close);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    input.addEventListener('input', function () { render(input.value); });
    sheet.querySelectorAll('[data-hoa-search-term]').forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.dataset.hoaSearchTerm; render(input.value); input.focus({ preventScroll: true }); });
    });
    // Enter opens the first result; with none, fall through to the full catalogue
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = list.querySelector('a');
      location.href = first ? first.href : shopUrl;
    });
  }

  /* ---------------- Footer folds ---------------- */
  function initFooterFolds() {
    var toggles = document.querySelectorAll('[data-hoa-fold]');
    if (!toggles.length) return;
    var mq = window.matchMedia('(max-width: 560px)');
    var listOf = function (b) { return document.getElementById(b.getAttribute('aria-controls')); };
    var setOpen = function (b, open) { b.setAttribute('aria-expanded', String(open)); var l = listOf(b); if (l) l.hidden = !open; };
    var apply = function () {
      toggles.forEach(function (b) {
        if (mq.matches) { b.removeAttribute('tabindex'); setOpen(b, false); }
        else { b.setAttribute('tabindex', '-1'); setOpen(b, true); }
      });
    };
    toggles.forEach(function (b) {
      b.addEventListener('click', function () { if (mq.matches) setOpen(b, b.getAttribute('aria-expanded') !== 'true'); });
    });
    if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
    apply();
  }

  function init() {
    initScrollState();
    initBagBump();
    initSearch();
    initFooterFolds();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
