/* HOUSE OF AGHA — commerce layer (mock, frontend only; Shopify is NOT connected).

   One catalog, one pricing engine. Everything that shows a price reads window.HOA, which is built
   from the JSON that snippets/hoa-catalog-script.liquid embeds (snippets/hoa-catalog-data.liquid).
   The shop cards, product page, related products, bundles and the bag all price from it, so the same
   product cannot show two different prices.

     HOA.product(handle)        normalised product: regularPrice, salePrice, hasOffer, discountPercentage,
                                price, savings, isBestSeller, rating, reviewCount, inventory …
     HOA.quote(cart, code)      prices a bag: offers, quantity tier, coupon, shipping progress, total
     HOA.bundleQuote(handles)   what a set of fragrances costs together
     HOA.coupon                 validate / apply / remove (persisted in localStorage)
     HOA.renderBag(store)       paints the bag drawer (called by AghaStore.updateCartUI in theme.js)

   SHOPIFY LATER — each piece has a matching real thing:
     catalog prices      ← product price / compare_at_price      (replace the embedded JSON)
     quantity tiers      ← an automatic discount / Shopify Function
     coupon validation   ← a Shopify discount code (the bag already links checkout with ?discount=CODE)
     bundles             ← bundle products or an app; the UI only needs a price and the member list
     bag lines           ← /cart.js, /cart/change.js instead of localStorage ('agha-bag')
*/
(function () {
  'use strict';
  if (window.HOA) return;

  var COUPON_KEY = 'hoa-coupon';

  /* ------------------------------------------------------------------ data */
  function readCatalog() {
    var el = document.getElementById('hoa-catalog-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  var RAW = readCatalog();
  if (!RAW) { window.HOA = { ready: false }; return; }

  var settings = RAW.settings || {};
  var TIERS = (settings.quantityTiers || []).slice().sort(function (a, b) { return a.qty - b.qty; });
  var THRESHOLD = +settings.freeShippingThreshold || 0;
  var LOW_STOCK = +settings.lowStockThreshold || 5;
  var MSG = settings.messages || {};

  function img(u) { return !u ? '' : (/^(https?:)?\/\//.test(u) || u.charAt(0) === '/') ? u : '/' + u; }
  function handleize(s) { return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function money(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function parseMoney(s) { var m = String(s || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 0; }

  // Offer maths lives here and nowhere else: an offer exists only when a sale price is set and lower.
  function normalise(p, kind) {
    var reg = +p.regularPrice || 0;
    var sale = p.salePrice == null ? null : +p.salePrice;
    var hasOffer = sale != null && sale > 0 && sale < reg;
    return {
      kind: kind, handle: p.handle, name: p.name, family: p.family || '', wearer: p.wearer || '', gift: !!p.gift,
      asset: p.asset || '', image: img(p.image), url: kind === 'fragrance' ? '/products/' + p.handle : '/collections/all#bundles',
      tagline: p.tagline || '', members: p.members || [],
      regularPrice: reg, salePrice: hasOffer ? sale : null, hasOffer: hasOffer,
      price: hasOffer ? sale : reg,
      discountPercentage: hasOffer ? Math.round((reg - sale) / reg * 100) : 0,
      savings: hasOffer ? reg - sale : 0,
      isBestSeller: !!p.isBestSeller, rating: +p.rating || 0, reviewCount: +p.reviewCount || 0,
      inventory: p.inventory == null ? null : +p.inventory
    };
  }

  var PRODUCTS = {}, ORDER = [];
  (RAW.products || []).forEach(function (p) { PRODUCTS[p.handle] = normalise(p, 'fragrance'); ORDER.push(p.handle); });
  var BUNDLES = {};
  (RAW.bundles || []).forEach(function (b) { BUNDLES[b.id] = b; });
  var SET = BUNDLES['discovery-set'] ? normalise(BUNDLES['discovery-set'], 'set') : null;
  if (SET) PRODUCTS[SET.handle] = SET;
  var PAIRS = RAW.pairs || {};

  function product(handle) { return PRODUCTS[handle] || null; }
  function fragrances() { return ORDER.map(function (h) { return PRODUCTS[h]; }); }
  function byName(name) { return PRODUCTS[handleize(name)] || null; }

  /* ---------------------------------------------------------------- tiers */
  function tierFor(units) {
    var t = null;
    TIERS.forEach(function (x) { if (units >= x.qty) t = x; });
    return t;
  }
  function nextTier(units) {
    for (var i = 0; i < TIERS.length; i++) if (units < TIERS[i].qty) return TIERS[i];
    return null;
  }

  /* --------------------------------------------------------------- coupons */
  function findCoupon(code) {
    var c = String(code || '').trim().toUpperCase();
    if (!c) return null;
    for (var i = 0; i < (RAW.coupons || []).length; i++) if (RAW.coupons[i].code.toUpperCase() === c) return RAW.coupons[i];
    return null;
  }
  var coupon = {
    code: function () {
      try { var c = localStorage.getItem(COUPON_KEY); return c && findCoupon(c) ? findCoupon(c).code : null; } catch (e) { return null; }
    },
    validate: function (code) { var c = findCoupon(code); return c ? { ok: true, coupon: c } : { ok: false }; },
    apply: function (code) {
      var r = coupon.validate(code);
      if (r.ok) { try { localStorage.setItem(COUPON_KEY, r.coupon.code); } catch (e) {} }
      return r;
    },
    remove: function () { try { localStorage.removeItem(COUPON_KEY); } catch (e) {} },
    primary: function () { return (RAW.coupons || [])[0] || null; }
  };

  /* ---------------------------------------------------------------- lines */
  function makeItem(handle, size) {
    var p = product(handle);
    return { id: handle + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e4), handle: handle, size: size || (p && p.kind === 'set' ? '3 × 5 ml' : 'Eau de Parfum') };
  }

  // A bag entry is one unit. Known products are priced from the catalog (never from stored text),
  // anything else (older placeholder pages) falls back to the price the page passed in.
  function resolve(item) {
    var p = (item.handle && product(item.handle)) || (item.title && byName(item.title)) || null;
    if (p) {
      // On a live Shopify store the page passes Shopify's own price along; the mock catalog only prices what has none.
      var live = !!(window.Shopify && window.Shopify.routes) && item.price;
      var pr = live ? parseMoney(item.price) : p.price, rg = live ? (parseMoney(item.compare) || pr) : p.regularPrice;
      return { key: p.handle + '|' + (item.size || ''), kind: p.kind, handle: p.handle, name: p.name, image: item.image || p.image, price: pr, regular: rg > pr ? rg : pr, size: item.size || 'Eau de Parfum', product: p };
    }
    var price = parseMoney(item.price), cmp = parseMoney(item.compare);
    return { key: 'legacy:' + item.title + '|' + item.size, kind: 'legacy', handle: '', name: item.title, image: item.image || '', price: price, regular: cmp > price ? cmp : price, size: item.size || 'Eau de Parfum', product: null };
  }

  function quote(cart, code) {
    var groups = [], map = {};
    cart.forEach(function (item) {
      var r = resolve(item);
      if (!map[r.key]) { map[r.key] = { key: r.key, unit: r, qty: 0 }; groups.push(map[r.key]); }
      map[r.key].qty += 1;
    });
    var regularTotal = 0, sellTotal = 0, tierUnits = 0, tierBase = 0, units = 0;
    groups.forEach(function (g) {
      regularTotal += g.unit.regular * g.qty;
      sellTotal += g.unit.price * g.qty;
      units += g.qty;
      if (g.unit.kind === 'fragrance') { tierUnits += g.qty; tierBase += g.unit.price * g.qty; }
    });
    var offerSavings = regularTotal - sellTotal;
    var tier = tierFor(tierUnits);
    var tierDiscount = tier ? Math.round(tierBase * tier.percent / 100) : 0;
    var afterTier = sellTotal - tierDiscount;

    var c = code ? findCoupon(code) : null, couponDiscount = 0;
    if (c && (c.stackable !== false || !tierDiscount)) couponDiscount = Math.round(afterTier * c.value / 100);
    else c = null;
    var total = afterTier - couponDiscount;

    var remaining = Math.max(0, THRESHOLD - total);
    return {
      groups: groups, units: units, tierUnits: tierUnits,
      regularTotal: regularTotal, sellTotal: sellTotal, offerSavings: offerSavings,
      tier: tier, tierDiscount: tierDiscount, nextTier: nextTier(tierUnits),
      coupon: c, couponDiscount: couponDiscount,
      total: total, totalSavings: offerSavings + tierDiscount + couponDiscount,
      shipping: { threshold: THRESHOLD, free: THRESHOLD > 0 && remaining === 0, remaining: remaining, progress: THRESHOLD ? Math.min(1, total / THRESHOLD) : 1 }
    };
  }

  // What a set of fragrances costs together. The quantity tier prices them, exactly as the bag will.
  function bundleQuote(handles) {
    var sum = 0;
    handles.forEach(function (h) { var p = product(h); if (p) sum += p.price; });
    var t = tierFor(handles.length);
    var save = t ? Math.round(sum * t.percent / 100) : 0;
    return { separately: sum, price: sum - save, save: save, percent: t ? t.percent : 0 };
  }

  /* ------------------------------------------------------------- messages */
  function tierText() {
    return TIERS.map(function (t) { return 'Buy ' + t.qty + ' save ' + t.percent + '%'; }).join(' · ');
  }
  function noteText(kind) {
    if (kind === 'tiers-pdp') return tierText();
    return MSG[kind] || '';
  }
  function stockState(p) {
    if (!p || p.inventory == null) return { state: 'in', text: '' };
    if (p.inventory <= 0) return { state: 'sold-out', text: 'Currently unavailable' };
    if (p.inventory <= LOW_STOCK) return { state: 'low', text: 'Only ' + p.inventory + ' left' };
    return { state: 'in', text: '' };
  }

  /* ---------------------------------------------- price markup helpers */
  function priceHtml(p, cls) {
    cls = cls || 'hoa-cprice';
    return '<span class="' + cls + '"><span class="' + cls + '__now">' + money(p.price) + '</span>' +
      (p.hasOffer ? '<s class="' + cls + '__was"><span class="hoa-sr">Was </span>' + money(p.regularPrice) + '</s><span class="' + cls + '__off">' + p.discountPercentage + '% off</span>' : '') + '</span>';
  }

  /* ---------------------------------------------------------------- bag UI */
  var ui = { couponOpen: false, couponValue: '', msg: '', msgType: '', last: null, progress: 0 };
  var store = null;

  function drawerEl(sel) { return document.querySelector('.cart-drawer ' + sel); }

  function ensureFooter() {
    var f = drawerEl('.cart-drawer-footer');
    var sum = f && f.querySelector('.cart-summary');
    if (!f || !sum) return null;
    if (!f.querySelector('[data-bag-coupon]')) {
      var c = document.createElement('div'); c.className = 'bag-coupon'; c.setAttribute('data-bag-coupon', '');
      sum.parentNode.insertBefore(c, sum);
    }
    if (!f.querySelector('.bag-trust')) {
      var t = document.createElement('ul'); t.className = 'bag-trust';
      var items = MSG.trust || ['Secure checkout', 'Returns within 7 days', 'Authentic and batch-numbered'];
      t.innerHTML = items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
      sum.parentNode.insertBefore(t, sum.nextSibling);
    }
    return f;
  }

  function lineHtml(g) {
    var u = g.unit, off = u.regular > u.price ? Math.round((1 - u.price / u.regular) * 100) : 0;
    var meta = u.kind === 'set' ? (u.product.tagline || u.size) : u.size;
    var e = esc;
    return '<article class="cart-line" data-key="' + e(g.key) + '">' +
      '<div class="cart-line__media">' + (u.image ? '<img src="' + e(u.image) + '" alt="' + e(u.name) + '">' : '') + '</div>' +
      '<div class="cart-line__info"><div class="cart-line__top"><h4 class="cart-line__title">' + e(u.name) + '</h4>' +
      '<button type="button" class="cart-line__remove" data-cart-act="remove" aria-label="Remove ' + e(u.name) + '"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button></div>' +
      '<p class="cart-line__meta">' + e(meta) + '</p>' +
      '<div class="cart-line__prices">' + (off ? '<s class="cart-line__was">' + money(u.regular * g.qty) + '</s>' : '') +
      '<span class="cart-line__price">' + money(u.price * g.qty) + '</span>' + (off ? '<span class="cart-line__off">' + off + '% off</span>' : '') + '</div>' +
      (g.qty > 1 ? '<p class="cart-line__each">' + money(u.price) + ' each</p>' : '') +
      '<div class="cart-qty" role="group" aria-label="Quantity for ' + e(u.name) + '"><button type="button" data-cart-act="dec" aria-label="Decrease quantity">&minus;</button>' +
      '<span class="cart-qty__n" aria-live="polite">' + g.qty + '</span><button type="button" data-cart-act="inc" aria-label="Increase quantity">+</button></div></div></article>';
  }

  function shipHtml(q) {
    var s = q.shipping;
    if (!s.threshold) return '';
    var text = s.free
      ? 'You have unlocked <b>complimentary shipping</b>'
      : 'Add <b>' + money(s.remaining) + '</b> more to unlock complimentary shipping';
    return '<div class="bag-ship' + (s.free ? ' is-free' : '') + '"><p class="bag-ship__text">' + text + '</p>' +
      '<div class="bag-ship__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(s.progress * 100) + '"><span class="bag-ship__fill" style="transform:scaleX(' + ui.progress + ')" data-to="' + s.progress + '"></span></div></div>';
  }

  function nudgeHtml(q) {
    var n = q.nextTier;
    if (!n || q.tierUnits < 2) return '';
    var need = n.qty - q.tierUnits;
    return '<p class="bag-nudge">Add ' + (need === 1 ? 'one more fragrance' : need + ' more fragrances') + ' and save ' + n.percent + '%</p>';
  }

  function pairHtml(q) {
    if (q.tierUnits !== 1) return '';
    var g = q.groups.filter(function (x) { return x.unit.kind === 'fragrance'; })[0];
    var comp = g && product(PAIRS[g.unit.handle]);
    if (!comp) return '';
    var bq = bundleQuote([g.unit.handle, comp.handle]);
    if (!bq.save) return '';
    return '<section class="bag-offer"><p class="bag-offer__eyebrow">Complete your pair</p>' +
      '<div class="bag-offer__row"><img src="' + esc(comp.image) + '" alt="" width="56" height="70"><div class="bag-offer__copy">' +
      '<p class="bag-offer__title">Complete your pair and save ' + money(bq.save) + '</p>' +
      '<p class="bag-offer__sub">' + esc(comp.name) + ' pairs beautifully with ' + esc(g.unit.name) + '</p></div></div>' +
      '<a class="bag-offer__cta" href="/collections/all#bundles" data-bag-view-bundle>View bundle</a></section>';
  }

  function crossHtml(q) {
    if (q.tierUnits === 1 && pairHtml(q)) return '';
    var inBag = {}; q.groups.forEach(function (g) { if (g.unit.handle) inBag[g.unit.handle] = 1; });
    var cand = null;
    for (var i = q.groups.length - 1; i >= 0 && !cand; i--) {
      var c = product(PAIRS[q.groups[i].unit.handle]);
      if (c && !inBag[c.handle]) cand = c;
    }
    if (!cand) cand = fragrances().filter(function (p) { return p.isBestSeller && !inBag[p.handle]; })[0] || fragrances().filter(function (p) { return !inBag[p.handle]; })[0];
    if (!cand) return '';
    return '<section class="bag-cross"><p class="bag-offer__eyebrow">You may also like</p><div class="bag-cross__row">' +
      '<img src="' + esc(cand.image) + '" alt="" width="56" height="70"><div class="bag-offer__copy"><p class="bag-offer__title">' + esc(cand.name) + '</p>' +
      '<p class="bag-cross__price">' + priceHtml(cand, 'hoa-cprice') + '</p></div>' +
      '<button type="button" class="bag-cross__add" data-hoa-quick-add="' + esc(cand.handle) + '" aria-label="Add ' + esc(cand.name) + ' to bag">Add</button></div></section>';
  }

  function summaryHtml(q) {
    var rows = '<div class="cart-summary__row"><dt>Subtotal</dt><dd>' + money(q.regularTotal) + '</dd></div>';
    if (q.offerSavings > 0) rows += '<div class="cart-summary__row cart-summary__row--save"><dt>Offer savings</dt><dd>&minus;' + money(q.offerSavings) + '</dd></div>';
    if (q.tierDiscount > 0) rows += '<div class="cart-summary__row cart-summary__row--save"><dt>Buy ' + q.tier.qty + (q.tierUnits > q.tier.qty ? '+' : '') + ' &middot; ' + q.tier.percent + '% off</dt><dd>&minus;' + money(q.tierDiscount) + '</dd></div>';
    if (q.coupon) rows += '<div class="cart-summary__row cart-summary__row--save"><dt>Coupon &middot; ' + esc(q.coupon.code) + '</dt><dd>&minus;' + money(q.couponDiscount) + '</dd></div>';
    rows += '<div class="cart-summary__row"><dt>Shipping</dt><dd>' + (q.shipping.free ? 'Complimentary' : 'Calculated at checkout') + '</dd></div>';
    rows += '<div class="cart-summary__row cart-summary__row--total"><dt>Total</dt><dd class="cart-total-price">' + money(q.total) + '</dd></div>';
    if (q.totalSavings > 0) rows += '<div class="cart-summary__row cart-summary__row--saved"><dt>Total savings</dt><dd>' + money(q.totalSavings) + '</dd></div>';
    return rows;
  }

  function renderCoupon() {
    var box = document.querySelector('[data-bag-coupon]');
    if (!box) return;
    var code = coupon.code();
    var c = code && findCoupon(code);
    if (c) {
      box.innerHTML = '<div class="bag-coupon__applied" role="status"><span class="bag-coupon__tick" aria-hidden="true"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M2 6.5l2.6 2.6L10 3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span class="bag-coupon__what"><b>' + esc(c.code) + '</b><small>Coupon applied &middot; ' + esc(c.description) + '</small></span>' +
        '<button type="button" class="bag-coupon__remove" data-coupon-remove>Remove</button></div>';
      if (ui.msgType === 'ok') box.querySelector('.bag-coupon__applied').classList.add('is-new');
      ui.msgType = '';
      return;
    }
    var open = ui.couponOpen;
    box.innerHTML = '<button type="button" class="bag-coupon__toggle" data-coupon-toggle aria-expanded="' + open + '" aria-controls="bag-coupon-form"><span>Have a coupon code?</span>' +
      '<svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<form class="bag-coupon__form" id="bag-coupon-form" data-coupon-form novalidate' + (open ? '' : ' hidden') + '>' +
      '<label class="hoa-sr" for="bag-coupon-input">Coupon code</label>' +
      '<input id="bag-coupon-input" class="bag-coupon__input' + (ui.msgType === 'err' ? ' is-error' : '') + '" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter code" value="' + esc(ui.couponValue) + '"' + (ui.msgType === 'err' ? ' aria-invalid="true" aria-describedby="bag-coupon-msg"' : '') + '>' +
      '<button type="submit" class="bag-coupon__apply">Apply</button></form>' +
      '<p class="bag-coupon__msg' + (ui.msgType === 'err' ? ' is-error' : '') + '" id="bag-coupon-msg" role="status">' + esc(ui.msg) + '</p>';
  }

  function renderBag(s) {
    store = s || store;
    if (!store) return;
    var body = drawerEl('.cart-drawer-body');
    if (!body) return;
    var footer = ensureFooter();
    var q = quote(store.cart, coupon.code());
    var total = store.cart.length;

    var count = document.querySelectorAll('.cart-count');
    var prevCount = ui.last ? ui.last.units : total;
    count.forEach(function (el) { el.textContent = total; if (total > prevCount) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); } });
    document.querySelectorAll('[data-cart-count-label]').forEach(function (el) { el.textContent = total ? '(' + total + ') · ' + money(q.total) : ''; });

    if (footer) footer.classList.toggle('is-empty', total === 0);
    var checkout = document.querySelector('[data-cart-checkout]');
    if (checkout) {
      checkout.setAttribute('aria-disabled', String(total === 0));
      checkout.setAttribute('href', '/checkout' + (q.coupon ? '?discount=' + encodeURIComponent(q.coupon.code) : ''));
    }

    if (total === 0) {
      ui.progress = 0;
      body.innerHTML = '<div class="cart-empty"><p class="cart-empty__title">Your bag is empty</p><p class="cart-empty__text">Explore our signature fragrances to select your scent.</p>' +
        '<a class="bag-empty__cta" href="/collections/all" data-bag-continue>Explore fragrances</a></div>';
      ui.last = { units: 0, total: 0, saved: 0 };
      return;
    }

    body.innerHTML = shipHtml(q) + nudgeHtml(q) + q.groups.map(lineHtml).join('') + pairHtml(q) + crossHtml(q);

    var fill = body.querySelector('.bag-ship__fill');
    if (fill) {
      var to = +fill.getAttribute('data-to');
      requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.transform = 'scaleX(' + to + ')'; }); });
      ui.progress = to;
    }

    var summary = drawerEl('.cart-summary');
    if (summary) {
      summary.innerHTML = summaryHtml(q);
      var changed = ui.last && (ui.last.total !== q.total || ui.last.saved !== q.totalSavings);
      if (changed) {
        var tp = summary.querySelector('.cart-total-price'), sv = summary.querySelector('.cart-summary__row--saved');
        [tp, sv].forEach(function (n) { if (n) { n.classList.remove('is-flash'); void n.offsetWidth; n.classList.add('is-flash'); } });
      }
    }
    renderCoupon();
    ui.last = { units: total, total: q.total, saved: q.totalSavings };
  }

  function bindDrawer() {
    var drawer = document.querySelector('.cart-drawer');
    if (!drawer || drawer._hoaBound) return;
    drawer._hoaBound = true;

    drawer.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-coupon-toggle]')) {
        ui.couponOpen = !ui.couponOpen; renderCoupon();
        if (ui.couponOpen) { var i = drawer.querySelector('#bag-coupon-input'); if (i) i.focus(); }
        return;
      }
      if (t.closest('[data-coupon-remove]')) { coupon.remove(); ui.msg = ''; ui.msgType = ''; ui.couponValue = ''; ui.couponOpen = false; renderBag(store); return; }
      if (t.closest('[data-bag-view-bundle]') || t.closest('[data-bag-continue]')) {
        var a = t.closest('a');
        if (store) store.toggleCartDrawer(false);
        if (/\/(collections\/all|shop\.html)\/?$/.test(location.pathname) && a && /#bundles$/.test(a.getAttribute('href') || '')) {
          e.preventDefault();
          var b = document.getElementById('bundles');
          if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      var add = t.closest('[data-hoa-quick-add]');
      if (add) { e.preventDefault(); quickAdd(add.getAttribute('data-hoa-quick-add'), add, true); }
    });

    drawer.addEventListener('input', function (e) {
      if (e.target.matches && e.target.matches('.bag-coupon__input')) {
        ui.couponValue = e.target.value.toUpperCase();
        e.target.value = ui.couponValue;
      }
    });

    drawer.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-coupon-form]');
      if (!form) return;
      e.preventDefault();
      var v = form.querySelector('input').value;
      ui.couponValue = v.trim().toUpperCase();
      if (!ui.couponValue) { ui.msg = 'Enter a coupon code'; ui.msgType = 'err'; renderCoupon(); focusCoupon(); return; }
      var r = coupon.apply(ui.couponValue);
      if (r.ok) { ui.msg = ''; ui.msgType = 'ok'; ui.couponValue = ''; ui.couponOpen = false; renderBag(store); }
      else { ui.msg = 'Invalid coupon code'; ui.msgType = 'err'; renderCoupon(); focusCoupon(); }
    });
  }
  function focusCoupon() { var i = document.getElementById('bag-coupon-input'); if (i) { i.focus(); var v = i.value; i.value = ''; i.value = v; } }

  /* --------------------------------------------------------------- adding */
  function flash(btn, done) {
    if (!btn) return;
    var label = btn.querySelector('span') || btn;
    if (!btn._hoaLabel) btn._hoaLabel = label.textContent;
    label.textContent = done || 'Added';
    btn.classList.add('is-added');
    clearTimeout(btn._hoaT);
    btn._hoaT = setTimeout(function () { label.textContent = btn._hoaLabel; btn.classList.remove('is-added'); }, 1600);
  }
  function quickAdd(handle, btn, keepDrawer) {
    var p = product(handle);
    // AghaStore is a top-level const in theme.js (not a window property)
    if (!p || typeof AghaStore === 'undefined') return;
    AghaStore.addToCart(makeItem(handle));
    flash(btn);
  }
  function addBundle(handles, btn) {
    if (typeof AghaStore === 'undefined') return;
    AghaStore.addItems(handles.map(function (h) { return makeItem(h); }));
    flash(btn, 'Added');
  }

  /* --------------------------------------------------------------- bundles */
  var duoPick = [];

  function thumb(p, cls) { return '<img class="' + cls + '" src="' + esc(p.image) + '" alt="" width="120" height="150" loading="lazy" decoding="async">'; }
  function saveHtml(save, pct) { return save > 0 ? '<span class="hoa-bundle__save">Save ' + money(save) + ' &middot; ' + pct + '% off</span>' : ''; }

  function bundlesHtml() {
    var out = '';
    var ds = BUNDLES['discovery-set'];
    if (ds && SET) {
      out += '<article class="hoa-bundle hoa-bundle--set"><div class="hoa-bundle__media"><img src="' + esc(SET.image) + '" alt="' + esc(SET.name) + '" width="800" height="600" loading="lazy" decoding="async"></div>' +
        '<div class="hoa-bundle__body"><p class="hoa-bundle__eyebrow">Discovery</p><h3 class="hoa-bundle__title">' + esc(SET.name) + '</h3><p class="hoa-bundle__text">' + esc(SET.tagline) + '</p>' +
        '<p class="hoa-bundle__names">' + SET.members.map(function (h) { return esc((product(h) || {}).name || h); }).join(' &middot; ') + '</p>' +
        '<div class="hoa-bundle__price">' + priceHtml(SET, 'hoa-cprice') + '</div>' +
        '<button type="button" class="hoa-bundle__cta" data-hoa-quick-add="' + esc(SET.handle) + '"><span>Add Discovery Set</span></button></div></article>';
    }
    var duo = BUNDLES['duo'];
    if (duo) {
      out += '<article class="hoa-bundle hoa-bundle--duo"><div class="hoa-bundle__body"><p class="hoa-bundle__eyebrow">Choose any ' + duo.pick + '</p><h3 class="hoa-bundle__title">' + esc(duo.name) + '</h3><p class="hoa-bundle__text">' + esc(duo.tagline) + '</p>' +
        '<div class="hoa-duo" role="group" aria-label="Choose ' + duo.pick + ' fragrances">' + fragrances().map(function (p) {
          return '<button type="button" class="hoa-duo__opt" data-duo-pick="' + esc(p.handle) + '" aria-pressed="false">' + esc(p.name) + '</button>';
        }).join('') + '</div>' +
        '<div class="hoa-bundle__price" data-duo-price aria-live="polite"></div>' +
        '<button type="button" class="hoa-bundle__cta" data-duo-add disabled><span>Add bundle</span></button></div></article>';
    }
    var sig = BUNDLES['signature'];
    if (sig) {
      var bq = bundleQuote(sig.members);
      out += '<article class="hoa-bundle hoa-bundle--sig"><div class="hoa-bundle__body"><p class="hoa-bundle__eyebrow">' + sig.members.length + ' selected fragrances</p><h3 class="hoa-bundle__title">' + esc(sig.name) + '</h3><p class="hoa-bundle__text">' + esc(sig.tagline) + '</p>' +
        '<div class="hoa-bundle__stack">' + sig.members.map(function (h) { return thumb(product(h), 'hoa-bundle__thumb'); }).join('') + '</div>' +
        '<p class="hoa-bundle__names">' + sig.members.map(function (h) { return esc(product(h).name); }).join(' &middot; ') + '</p>' +
        '<div class="hoa-bundle__price"><span class="hoa-cprice"><span class="hoa-cprice__now">' + money(bq.price) + '</span><s class="hoa-cprice__was"><span class="hoa-sr">Separately </span>' + money(bq.separately) + '</s></span>' + saveHtml(bq.save, bq.percent) + '</div>' +
        '<button type="button" class="hoa-bundle__cta" data-hoa-bundle-add="' + esc(sig.members.join(',')) + '"><span>Add collection</span></button></div></article>';
    }
    return out;
  }

  function updateDuo(root) {
    var duo = BUNDLES['duo'];
    root.querySelectorAll('[data-duo-pick]').forEach(function (b) { b.setAttribute('aria-pressed', String(duoPick.indexOf(b.getAttribute('data-duo-pick')) > -1)); });
    var price = root.querySelector('[data-duo-price]'), add = root.querySelector('[data-duo-add]');
    if (!price || !add) return;
    if (duoPick.length === duo.pick) {
      var q = bundleQuote(duoPick);
      price.innerHTML = '<span class="hoa-cprice"><span class="hoa-cprice__now">' + money(q.price) + '</span><s class="hoa-cprice__was"><span class="hoa-sr">Separately </span>' + money(q.separately) + '</s></span>' + saveHtml(q.save, q.percent);
      add.disabled = false;
    } else {
      var need = duo.pick - duoPick.length;
      price.innerHTML = '<span class="hoa-bundle__hint">Select ' + need + ' more ' + (need === 1 ? 'fragrance' : 'fragrances') + '</span>';
      add.disabled = true;
    }
  }

  function initBundles() {
    var root = document.querySelector('[data-hoa-bundles]');
    if (!root) return;
    var grid = root.querySelector('[data-hoa-bundles-grid]');
    if (!grid) return;
    grid.innerHTML = bundlesHtml();
    updateDuo(grid);
    grid.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-duo-pick]');
      if (pick) {
        var h = pick.getAttribute('data-duo-pick'), i = duoPick.indexOf(h), n = BUNDLES['duo'].pick;
        if (i > -1) duoPick.splice(i, 1); else { duoPick.push(h); if (duoPick.length > n) duoPick.shift(); }
        updateDuo(grid); return;
      }
      var addDuo = e.target.closest('[data-duo-add]');
      if (addDuo && !addDuo.disabled) { addBundle(duoPick.slice(), addDuo); duoPick = []; setTimeout(function () { updateDuo(grid); }, 0); return; }
      var addB = e.target.closest('[data-hoa-bundle-add]');
      if (addB) { addBundle(addB.getAttribute('data-hoa-bundle-add').split(','), addB); return; }
      var one = e.target.closest('[data-hoa-quick-add]');
      if (one) quickAdd(one.getAttribute('data-hoa-quick-add'), one);
    });
  }

  /* ------------------------------------------------------- product-page pair */
  function pairBlockHtml(handle) {
    var cur = product(handle), comp = cur && product(PAIRS[handle]);
    if (!cur || !comp) return '';
    var q = bundleQuote([cur.handle, comp.handle]);
    return '<div class="container"><header class="pdp-heading pdp-heading--left"><span class="pdp-eyebrow">Complete your collection</span><h2>Pair it with</h2></header>' +
      '<div class="hoa-pair__card"><div class="hoa-pair__imgs"><a href="' + esc(comp.url) + '" class="hoa-pair__img" aria-label="' + esc(comp.name) + '">' + thumb(cur, '') + '</a><span class="hoa-pair__plus" aria-hidden="true">+</span>' +
      '<a href="' + esc(comp.url) + '" class="hoa-pair__img" aria-label="' + esc(comp.name) + '">' + thumb(comp, '') + '</a></div>' +
      '<div class="hoa-pair__body"><p class="hoa-pair__names">' + esc(cur.name) + ' + ' + esc(comp.name) + '</p>' +
      '<p class="hoa-pair__note">Two full-size fragrances, ' + q.percent + '% off when chosen together</p>' +
      '<div class="hoa-bundle__price"><span class="hoa-cprice"><span class="hoa-cprice__now">' + money(q.price) + '</span><s class="hoa-cprice__was"><span class="hoa-sr">Separately </span>' + money(q.separately) + '</s></span>' + saveHtml(q.save, q.percent) + '</div></div>' +
      '<div class="hoa-pair__act"><button type="button" class="hoa-bundle__cta" data-hoa-bundle-add="' + esc(cur.handle + ',' + comp.handle) + '"><span>Add bundle</span></button>' +
      '<a class="hoa-pair__more" href="/collections/all#bundles">Explore all bundles</a></div></div></div>';
  }

  function initPair() {
    document.querySelectorAll('[data-hoa-pair]').forEach(function (el) {
      var h = el.getAttribute('data-handle') || (window.__hoaHandle || '');
      var html = pairBlockHtml(h);
      if (!html) { el.hidden = true; return; }
      el.innerHTML = html; el.hidden = false;
      if (el._hoaBound) return;
      el._hoaBound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-hoa-bundle-add]');
        if (b) addBundle(b.getAttribute('data-hoa-bundle-add').split(','), b);
      });
    });
  }

  function initNotes() {
    document.querySelectorAll('[data-hoa-offer-note]').forEach(function (el) {
      var t = noteText(el.getAttribute('data-hoa-offer-note'));
      if (t) el.textContent = t; else el.hidden = true;
    });
  }

  /* --------------------------------------- shared quick-add (home cards etc.) */
  function initGlobal() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('.cart-drawer')) return; // the drawer has its own handler
      var add = e.target.closest('[data-hoa-quick-add]');
      if (add && !add.closest('[data-hoa-bundles]')) { e.preventDefault(); quickAdd(add.getAttribute('data-hoa-quick-add'), add); }
    });
  }

  /* ------------------------------------- feed the older static product page */
  // theme.js's AGHA_PRODUCTS still drives the preview product page. For every catalog fragrance its
  // prices and review figures are overwritten from the catalog, so that page cannot disagree.
  function applyToPreviewProducts(map) {
    fragrances().forEach(function (p) {
      var t = map[p.handle];
      if (!t) return;
      t.sizes = { 'Eau de Parfum': p.price };
      if (p.hasOffer) t.compare = { 'Eau de Parfum': p.regularPrice }; else delete t.compare;
      t.rating = p.rating; t.reviewCount = p.reviewCount; t.isBestSeller = p.isBestSeller; t.inventory = p.inventory;
    });
  }

  function init() {
    ensureFooter();
    bindDrawer();
    initBundles();
    initPair();
    initNotes();
    initGlobal();
  }
  if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);

  window.HOA = {
    ready: true, settings: settings, money: money, esc: esc, parseMoney: parseMoney,
    product: product, fragrances: fragrances, byName: byName, pairOf: function (h) { return product(PAIRS[h]); },
    quote: quote, bundleQuote: bundleQuote, tierFor: tierFor, coupon: coupon, makeItem: makeItem,
    stockState: stockState, priceHtml: priceHtml, noteText: noteText, tierText: tierText,
    renderBag: renderBag, applyToPreviewProducts: applyToPreviewProducts, initPair: initPair,
    lowStock: LOW_STOCK, threshold: THRESHOLD
  };
})();
