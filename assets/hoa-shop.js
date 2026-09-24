/* ==========================================================================
   HOUSE OF AGHA · SHOP (sections/hoa-shop-*.liquid)

   Each piece of motion has one job:
     Toolbar ......... wearer, scent family and sort filter the grid in place; the
                       products that remain rise in with a short stagger (feedback).
                       Grid / list switches the layout. The state is mirrored in the URL
                       (?for= &family= &sort= &view=) and the layout is remembered.
     Interlude ....... the campaign photo only shows in the full, featured grid, where
                       it fills the gap it was placed for.
     Reveal .......... the closing section fades up once as it enters.

   Without JS every product is listed in the grid.
   Theme Editor safe: rebuilt on shopify:section:load / unload.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VIEW_KEY = 'hoa-shop-view';
  var cleanups = [];

  function readView() { try { return localStorage.getItem(VIEW_KEY); } catch (e) { return null; } }
  function saveView(v) { try { localStorage.setItem(VIEW_KEY, v); } catch (e) {} }


  function initCatalog() {
    var sec = document.querySelector('[data-hoa-shop]');
    if (!sec) return;
    var grid = sec.querySelector('[data-hoa-shop-grid]');
    var items = Array.prototype.slice.call(grid.querySelectorAll('[data-hoa-item]'));
    var interlude = grid.querySelector('[data-hoa-interlude]');
    var tabs = sec.querySelectorAll('[data-hoa-for]');
    var tags = sec.querySelectorAll('[data-hoa-family]');
    var gift = sec.querySelector('[data-hoa-gift]');
    var views = sec.querySelectorAll('[data-hoa-fview]');
    var sort = sec.querySelector('[data-hoa-sort]');
    var shown = sec.querySelector('[data-hoa-shown]');
    var empty = sec.querySelector('[data-hoa-empty]');
    var resets = sec.querySelectorAll('[data-hoa-reset]');
    var clear = sec.querySelector('.hoa-shop-cat__clear');
    var total = items.length;
    if (!total) return;

    // Where the interlude sits in the featured order (after this many products).
    var interludeAfter = 0;
    if (interlude) {
      var prev = interlude.previousElementSibling;
      interludeAfter = prev ? items.indexOf(prev) + 1 : 0;
    }

    var wearers = ['men', 'women', 'unisex'];
    var validFamilies = Array.prototype.map.call(tags, function (c) { return c.dataset.hoaFamily; });
    var params = new URLSearchParams(location.search);
    var state = {
      wearer: wearers.indexOf(params.get('for')) > -1 ? params.get('for') : 'all',
      family: validFamilies.indexOf(params.get('family')) > -1 ? params.get('family') : '',
      gift: gift ? params.get('gift') === '1' : false,
      sort: params.get('sort') || 'featured',
      view: params.get('view') === 'list' || (!params.get('view') && readView() === 'list') ? 'list' : 'grid'
    };
    if (sort && !sort.querySelector('option[value="' + state.sort + '"]')) state.sort = 'featured';

    // Counts per wearer on the tabs, and the total in the page head.
    var count = { all: total };
    wearers.forEach(function (w) { count[w] = items.filter(function (it) { return it.dataset.for === w; }).length; });
    count.gift = items.filter(function (it) { return it.dataset.gift === 'true'; }).length;
    sec.querySelectorAll('[data-hoa-count]').forEach(function (el) { el.textContent = count[el.dataset.hoaCount] || 0; });
    document.querySelectorAll('[data-hoa-total]').forEach(function (el) { el.textContent = total; });

    var compare = {
      featured: function (a, b) { return a.dataset.index - b.dataset.index; },
      az: function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); },
      za: function (a, b) { return b.dataset.name.localeCompare(a.dataset.name); },
      'price-asc': function (a, b) { return (+a.dataset.price || 0) - (+b.dataset.price || 0); },
      'price-desc': function (a, b) { return (+b.dataset.price || 0) - (+a.dataset.price || 0); }
    };

    function writeUrl() {
      var p = new URLSearchParams(location.search);
      if (state.wearer !== 'all') p.set('for', state.wearer); else p.delete('for');
      if (state.family) p.set('family', state.family); else p.delete('family');
      if (state.gift) p.set('gift', '1'); else p.delete('gift');
      if (state.sort !== 'featured') p.set('sort', state.sort); else p.delete('sort');
      if (state.view === 'list') p.set('view', 'list'); else p.delete('view');
      var q = p.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
    }

    function apply(animate) {
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.hoaFor === state.wearer)); });
      tags.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.hoaFamily === state.family)); });
      if (gift) gift.setAttribute('aria-pressed', String(state.gift));
      views.forEach(function (v) { v.setAttribute('aria-pressed', String(v.dataset.hoaFview === state.view)); });
      if (sort) sort.value = state.sort;
      grid.dataset.view = state.view;

      var ordered = items.slice().sort(compare[state.sort] || compare.featured);
      ordered.forEach(function (it, i) {
        grid.appendChild(it);
        if (interlude && i + 1 === interludeAfter) grid.appendChild(interlude);
      });

      var filtered = state.wearer !== 'all' || !!state.family || state.gift;
      if (interlude) interlude.hidden = filtered || state.sort !== 'featured';

      var visible = 0;
      ordered.forEach(function (it) {
        var on = (state.wearer === 'all' || it.dataset.for === state.wearer) &&
                 (!state.family || it.dataset.family === state.family) &&
                 (!state.gift || it.dataset.gift === 'true');
        it.hidden = !on;
        it.classList.remove('is-entering');
        if (on) {
          if (animate && !reduceMotion) {
            it.style.setProperty('--i', visible);
            void it.offsetWidth;
            it.classList.add('is-entering');
          }
          visible++;
        }
      });

      if (shown) shown.textContent = visible === total ? total + ' fragrances' : visible + ' of ' + total + ' fragrances';
      if (clear) clear.hidden = !filtered;
      if (empty) empty.hidden = visible > 0;
    }

    function set(patch, animate) {
      Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
      apply(animate !== false);
      writeUrl();
    }

    var onTab = function (e) { set({ wearer: e.currentTarget.dataset.hoaFor }); };
    var onTag = function (e) {
      var f = e.currentTarget.dataset.hoaFamily;
      set({ family: state.family === f ? '' : f });
    };
    var onView = function (e) {
      var v = e.currentTarget.dataset.hoaFview;
      if (v === state.view) return;
      saveView(v);
      set({ view: v });
    };
    var onSort = function () { set({ sort: sort.value }); };
    var onGift = function () { set({ gift: !state.gift }); };
    var onReset = function () { set({ wearer: 'all', family: '', gift: false }); };

    tabs.forEach(function (b) { b.addEventListener('click', onTab); });
    tags.forEach(function (c) { c.addEventListener('click', onTag); });
    if (gift) gift.addEventListener('click', onGift);
    views.forEach(function (v) { v.addEventListener('click', onView); });
    if (sort) sort.addEventListener('change', onSort);
    resets.forEach(function (r) { r.addEventListener('click', onReset); });

    apply(false);

    cleanups.push(function () {
      tabs.forEach(function (b) { b.removeEventListener('click', onTab); });
      tags.forEach(function (c) { c.removeEventListener('click', onTag); });
      if (gift) gift.removeEventListener('click', onGift);
      views.forEach(function (v) { v.removeEventListener('click', onView); });
      if (sort) sort.removeEventListener('change', onSort);
      resets.forEach(function (r) { r.removeEventListener('click', onReset); });
    });
  }

  // Wishlist hearts are handled site-wide by assets/agha-wishlist.js (data-wishlist-toggle).

  // Add to bag: post to Shopify's cart when it exists, then show the item in the bag
  // drawer (AghaStore, theme.js) with its price, offer price and quantity controls.
  function initAdd() {
    var grid = document.querySelector('[data-hoa-shop-grid]');
    if (!grid) return;

    function addToBag(card, btn, formData) {
      var bag = typeof AghaStore !== 'undefined' ? AghaStore : null;
      var d = card.dataset;
      var done = function () {
        if (bag) {
          bag.addToCart({
            id: (d.productId || d.name) + '-' + Date.now(),
            title: d.name || d.title,
            price: d.priceText || '',
            compare: d.compareText || '',
            image: d.image || '',
            size: 'Eau de Parfum'
          });
        }
        btn.classList.add('is-added');
        setTimeout(function () { btn.classList.remove('is-added'); }, 1400);
      };
      if (formData && window.Shopify && window.Shopify.routes) {
        btn.disabled = true;
        fetch(window.Shopify.routes.root + 'cart/add.js', {
          method: 'POST',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: formData
        }).then(function (res) {
          if (!res.ok) throw new Error('add failed');
          done();
        }).catch(function () {
          if (bag && bag.showToast) bag.showToast('We could not add this to your bag.');
        }).then(function () { btn.disabled = false; });
      } else {
        done();
      }
    }

    var onClick = function (e) {
      var btn = e.target.closest('[data-hoa-add]');
      if (!btn || !grid.contains(btn)) return;
      e.preventDefault();
      addToBag(btn.closest('[data-hoa-item]'), btn, null);
    };
    var onSubmit = function (e) {
      var form = e.target.closest('.hoa-pc__action form');
      if (!form || !grid.contains(form)) return;
      e.preventDefault();
      addToBag(form.closest('[data-hoa-item]'), form.querySelector('button'), new FormData(form));
    };
    grid.addEventListener('click', onClick);
    grid.addEventListener('submit', onSubmit);
    cleanups.push(function () {
      grid.removeEventListener('click', onClick);
      grid.removeEventListener('submit', onSubmit);
    });
  }

  function initReveals() {
    var els = document.querySelectorAll('.hoa-shop-page [data-hoa-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('hoa-is-in'); });
      return;
    }
    root.classList.add('hoa-js'); // hides [data-hoa-reveal] until revealed (hoa-home.css)
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('hoa-is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });
    cleanups.push(function () { io.disconnect(); });
  }

  function init() { initCatalog(); initAdd(); initReveals(); }
  function destroy() {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('shopify:section:load', function () { destroy(); init(); });
  document.addEventListener('shopify:section:unload', function () { destroy(); });
})();
