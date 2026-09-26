/* ==========================================================================
   AGHA PERFUMES — WISHLIST PAGE (/pages/wishlist)
   Renders the saved list held by assets/agha-wishlist.js. Product details come from each
   product's public Shopify JSON (/products/{handle}.js), so prices, stock and images are
   always the store's live data. A product that no longer exists shows as unavailable.
   ========================================================================== */

(() => {
  'use strict';
  const page = document.querySelector('[data-wl-page][data-wl-customer]');
  if (!page) return; // signed-out state is plain Liquid

  const wl = window.AghaWishlist;
  if (!wl) return;
  const cfg = wl.config;

  const $ = (sel, root = page) => root.querySelector(sel);
  const grid = $('[data-wl-grid]');
  const states = { loading: $('[data-wl-loading]'), list: grid, empty: $('[data-wl-empty]'), error: $('[data-wl-error]') };
  const countEl = $('[data-wl-count]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const store = () => (typeof AghaStore !== 'undefined' ? AghaStore : window.AghaStore);

  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (cents) => {
    const value = cents / 100;
    const fmt = cfg.moneyFormat || '₹{{amount_no_decimals}}';
    const group = (n, d, th = ',', dec = '.') => {
      const [i, f] = n.toFixed(d).split('.');
      const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, th);
      return f ? `${g}${dec}${f}` : g;
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return group(value, 0);
        case 'amount_with_comma_separator': return group(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
        case 'amount_with_space_separator': return group(value, 2, ' ', ',');
        default: return group(value, 2);
      }
    });
  };

  const show = (name) => {
    Object.entries(states).forEach(([key, el]) => { if (el) el.hidden = key !== name; });
  };

  const HEART = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.3S2.3 12.6 1 8.1C.2 5.2 2 2.4 5 2.4c2 0 3.6 1.2 5 3.1 1.4-1.9 3-3.1 5-3.1 3 0 4.8 2.8 4 5.7-1.3 4.5-9 9.2-9 9.2Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------------ data */
  const products = new Map(); // handle -> product JSON, or null when the product no longer exists

  const fetchProduct = async (handle) => {
    if (products.has(handle)) return products.get(handle);
    const res = await fetch(`${cfg.root}products/${encodeURIComponent(handle)}.js`, { headers: { Accept: 'application/json' } });
    if (res.status === 404) { products.set(handle, null); return null; }
    if (!res.ok) throw new Error(`Product request failed (${res.status})`);
    const data = await res.json();
    products.set(handle, data);
    return data;
  };

  /* ------------------------------------------------------------------ card */
  // Saved products are the shared product card (HOA.pcMarkup, styled by hoa-card.css). The heart is
  // already "saved" here, so pressing it removes the card; the button below adds to the bag.
  const CART = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 5.5h10l-.8 8H3.8L3 5.5ZM5.5 5.5V4.6a2.5 2.5 0 0 1 5 0v.9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const saved = (html) => html.replace('aria-pressed="false"', 'aria-pressed="true"').replace('data-wishlist-toggle', 'data-wishlist-toggle data-wishlist-fixed-label');

  const cardHtml = (item, p, index) => {
    const handle = esc(item.handle);
    if (!p) {
      return `<article class="hoa-pc hoa-pc--gone" data-wl-card data-handle="${handle}" style="--i:${index}">
        <div class="hoa-pc__visual"><span class="hoa-pc__media">${HEART}</span></div>
        <div class="hoa-pc__info"><div class="hoa-pc__body">
          <h3 class="hoa-pc__name">No longer available</h3>
          <p class="hoa-pc__note">This fragrance has been removed from the store.</p>
        </div>
        <div class="hoa-pc__action">
          <button type="button" class="hoa-pc__remove" data-wishlist-toggle data-wishlist-handle="${handle}" data-wishlist-fixed-label aria-pressed="true" aria-label="Remove from wishlist">${HEART}<span>Remove</span></button>
        </div></div>
      </article>`;
    }
    const variants = p.variants || [];
    const v = variants.find((x) => x.id === item.variant_id) || variants.find((x) => x.available) || variants[0] || {};
    const price = v.price != null ? v.price : p.price;
    const compare = v.compare_at_price && v.compare_at_price > price ? v.compare_at_price : 0;
    const available = v.available !== undefined ? v.available : p.available;
    const image = (v.featured_image && v.featured_image.src) || p.featured_image;
    const add = available
      ? `<button type="button" class="hoa-pc__cta" data-wl-add data-handle="${handle}" data-variant="${esc(v.id)}">${CART}<span>Add to cart</span></button>`
      : '<button type="button" class="hoa-pc__cta hoa-pc__cta--ghost" disabled><span>Sold out</span></button>';
    const build = window.HOA && window.HOA.pcMarkup;
    if (!build) return '';
    return saved(build({
      handle: item.handle, url: p.url, name: p.title, image, imageMood: (p.images || [])[1], family: p.type,
      now: money(price), was: compare ? money(compare) : '', off: compare ? Math.round(((compare - price) * 100) / compare) : 0,
      best: (p.tags || []).some((t) => /^best[- ]?seller$/i.test(t)), sold: !available,
      action: add, index, attrs: ` data-wl-card data-handle="${handle}"`
    }));
  };

  /* ---------------------------------------------------------------- render */
  const updateCount = () => {
    const n = grid.querySelectorAll('[data-wl-card]').length;
    countEl.textContent = n ? String(n) : '';
  };

  let renderToken = 0;
  const render = async () => {
    const token = ++renderToken;
    const list = wl.list();
    if (!list.length) { countEl.textContent = ''; show('empty'); return; }
    show('loading');
    try {
      const loaded = await Promise.all(list.map((item) => fetchProduct(item.handle)));
      if (token !== renderToken) return;
      grid.innerHTML = list.map((item, i) => cardHtml(item, loaded[i], i)).join('');
      updateCount();
      show('list');
    } catch (error) {
      if (token !== renderToken) return;
      show('error');
    }
  };

  const removeCard = (handle) => {
    const card = Array.from(grid.querySelectorAll('[data-wl-card]')).find((c) => c.dataset.handle === handle);
    if (!card) return;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      card.remove();
      updateCount();
      if (!grid.querySelector('[data-wl-card]')) show('empty');
    };
    if (reduceMotion.matches || !card.animate) { done(); return; }
    card.style.pointerEvents = 'none';
    card.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).onfinish = done;
    setTimeout(done, 450); // animations pause in background tabs; never leave a removed card behind
  };

  /* ------------------------------------------------------------ add to bag */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const addToBag = async (btn) => {
    const handle = btn.dataset.handle;
    const p = products.get(handle);
    const variant = p && (p.variants || []).find((x) => String(x.id) === btn.dataset.variant);
    if (!variant || !variant.available || btn.getAttribute('aria-busy') === 'true') return;
    const lab = btn.querySelector('span') || btn;
    const label = lab.textContent;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    lab.textContent = 'Adding…';
    try {
      const res = await fetch(`${cfg.root}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }] })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.description || 'We couldn’t add this to your bag.');
      }
      // Mirror into the theme's bag drawer, the same way the product page does
      const bag = store();
      if (bag && bag.cart) {
        const img = (variant.featured_image && variant.featured_image.src) || p.featured_image || '';
        bag.cart.push({ id: `${variant.id}-${Date.now()}`, title: p.title, price: money(variant.price), compare: variant.compare_at_price > variant.price ? money(variant.compare_at_price) : '', image: img, size: variant.title });
        bag.updateCartUI();
        setTimeout(() => bag.toggleCartDrawer(true), 350);
      }
      lab.textContent = 'Added';
      await wait(1600);
    } catch (error) {
      const bag = store();
      if (bag && bag.showToast) bag.showToast(error.message);
      lab.textContent = label;
    } finally {
      btn.removeAttribute('aria-busy');
      btn.classList.remove('is-loading');
      if (lab.textContent === 'Added' || lab.textContent === 'Adding…') lab.textContent = label;
    }
  };

  page.addEventListener('click', (e) => {
    const add = e.target.closest('[data-wl-add]');
    if (add) { e.preventDefault(); addToBag(add); return; }
    if (e.target.closest('[data-wl-retry]')) { show('loading'); wl.reload(); }
  });

  /* ------------------------------------------------------------- lifecycle */
  wl.on((event) => {
    if (event.type === 'status') {
      if (event.status === 'ready') render();
      else if (event.status === 'error') show('error');
      else if (event.status === 'guest') {
        window.location.assign(`${cfg.loginUrl}${cfg.loginUrl.includes('?') ? '&' : '?'}return_url=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    if (event.type === 'change' && event.saved === false) removeCard(event.handle);
    if (event.type === 'change' && event.saved === true && !grid.querySelector(`[data-handle="${CSS.escape(event.handle)}"]`)) render();
  });

  show('loading');
  if (wl.status === 'ready') render();
})();
