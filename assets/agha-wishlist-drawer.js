/* ==========================================================================
   AGHA PERFUMES — WISHLIST DRAWER
   Opens from any [data-wishlist-open] (the navbar link), like the bag drawer. Shows the saved
   list held by assets/agha-wishlist.js: sign-in prompt for guests, loading, empty, list, error.
   Product details come from each product's public /products/{handle}.js (live price and stock).
   Without JS the navbar link still goes to /pages/wishlist.
   ========================================================================== */

(() => {
  'use strict';
  const drawer = document.querySelector('[data-wl-drawer]');
  const wl = window.AghaWishlist;
  if (!drawer || !wl) return;

  const cfg = wl.config;
  const overlay = document.querySelector('[data-wl-drawer-overlay]');
  const body = drawer.querySelector('[data-wl-drawer-body]');
  const footer = drawer.querySelector('[data-wl-drawer-footer]');
  const countEl = drawer.querySelector('[data-wl-drawer-count]');
  const store = () => (typeof AghaStore !== 'undefined' ? AghaStore : window.AghaStore);
  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HEART = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.3S2.3 12.6 1 8.1C.2 5.2 2 2.4 5 2.4c2 0 3.6 1.2 5 3.1 1.4-1.9 3-3.1 5-3.1 3 0 4.8 2.8 4 5.7-1.3 4.5-9 9.2-9 9.2Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

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

  /* ---------------------------------------------------------------- data */
  const products = new Map(); // handle -> product JSON, or null when it no longer exists
  const fetchProduct = async (handle) => {
    if (products.has(handle)) return products.get(handle);
    const res = await fetch(`${cfg.root}products/${encodeURIComponent(handle)}.js`, { headers: { Accept: 'application/json' } });
    if (res.status === 404) { products.set(handle, null); return null; }
    if (!res.ok) throw new Error(`Product request failed (${res.status})`);
    const data = await res.json();
    products.set(handle, data);
    return data;
  };

  /* --------------------------------------------------------------- views */
  const stateHtml = (title, text, action) => `<div class="cart-empty wl-empty">
      <span class="wl-empty__mark" aria-hidden="true">${HEART}</span>
      <p class="cart-empty__title">${esc(title)}</p>
      <p class="cart-empty__text">${esc(text)}</p>
      ${action || ''}
    </div>`;

  const line = (item, p, index) => {
    const handle = esc(item.handle);
    if (!p) {
      return `<div class="cart-line wl-line" data-wl-line data-handle="${handle}" style="animation-delay:${index * 50}ms">
        <span class="cart-line__media wl-line__gone">${HEART}</span>
        <div class="cart-line__info">
          <div class="cart-line__top"><h4 class="cart-line__title">No longer available</h4>
            <button type="button" class="cart-line__remove" data-wishlist-toggle data-wishlist-handle="${handle}" data-wishlist-fixed-label aria-pressed="true" aria-label="Remove from wishlist">${CLOSE}</button></div>
          <p class="cart-line__meta">Removed from the store</p>
        </div></div>`;
    }
    const variants = p.variants || [];
    const v = variants.find((x) => x.id === item.variant_id) || variants.find((x) => x.available) || variants[0] || {};
    const multi = variants.length > 1 && v.title && v.title !== 'Default Title';
    const price = v.price != null ? v.price : p.price;
    const compare = v.compare_at_price && v.compare_at_price > price ? v.compare_at_price : 0;
    const pct = compare ? Math.floor(((compare - price) * 100) / compare) : 0;
    const available = v.available !== undefined ? v.available : p.available;
    const image = (v.featured_image && v.featured_image.src) || p.featured_image;
    const meta = [p.type, multi ? v.title : ''].filter(Boolean).map(esc).join(' · ');
    const url = esc(p.url);
    return `<div class="cart-line wl-line" data-wl-line data-handle="${handle}" style="animation-delay:${index * 50}ms">
      <a class="cart-line__media" href="${url}" aria-label="${esc(p.title)}">${image ? `<img src="${esc(image)}" alt="${esc(p.title)}" loading="lazy">` : ''}</a>
      <div class="cart-line__info">
        <div class="cart-line__top">
          <h4 class="cart-line__title"><a href="${url}">${esc(p.title)}</a></h4>
          <button type="button" class="cart-line__remove" data-wishlist-toggle data-wishlist-handle="${handle}" data-wishlist-fixed-label aria-pressed="true" aria-label="Remove ${esc(p.title)} from wishlist">${CLOSE}</button>
        </div>
        ${meta ? `<p class="cart-line__meta">${meta}</p>` : ''}
        <div class="cart-line__prices">
          <span class="cart-line__price">${esc(money(price))}</span>
          ${compare ? `<s class="cart-line__was">${esc(money(compare))}</s><span class="cart-line__off">−${pct}%</span>` : ''}
        </div>
        <p class="wl-line__stock" data-state="${available ? 'in' : 'out'}">${available ? 'In stock' : 'Sold out'}</p>
        <div class="wl-line__actions">
          <button type="button" class="wl-line__add" data-wl-add data-handle="${handle}" data-variant="${esc(v.id)}" ${available ? '' : 'disabled'}>${available ? 'Add to bag' : 'Sold out'}</button>
          <a class="wl-line__view" href="${url}">View product</a>
        </div>
      </div></div>`;
  };

  const setFooter = (on) => { footer.hidden = !on; };
  const setCount = (n) => { countEl.textContent = n ? `(${n})` : ''; };
  const errorState = () => stateHtml('We couldn’t load your wishlist', 'Your saved fragrances are safe. Please try again.', '<button type="button" class="wl-empty__btn" data-wl-retry>Try again</button>');

  let token = 0;
  const render = async () => {
    const mine = ++token;
    if (!cfg.loggedIn || wl.status === 'guest') {
      setCount(0); setFooter(false);
      const back = window.location.pathname + window.location.search;
      const url = cfg.loginUrl + (cfg.loginUrl.includes('?') ? '&' : '?') + 'return_url=' + encodeURIComponent(back);
      body.innerHTML = stateHtml('Sign in to view your wishlist', 'Your saved fragrances are kept with your account.', `<a class="wl-empty__btn" href="${esc(url)}">Login to View Wishlist</a>`);
      return;
    }
    if (wl.status === 'error') { setCount(0); setFooter(false); body.innerHTML = errorState(); return; }
    const list = wl.list();
    if (wl.status === 'loading' && !list.length) {
      setFooter(false);
      body.innerHTML = '<div class="wl-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>';
      return;
    }
    if (!list.length) {
      setCount(0); setFooter(false);
      body.innerHTML = stateHtml('Your Wishlist is Empty', 'Fragrances you save will appear here, so you can return to them whenever you are ready.', `<a class="wl-empty__btn" href="${esc(cfg.root)}collections/all">Explore Fragrances</a>`);
      return;
    }
    try {
      const loaded = await Promise.all(list.map((item) => fetchProduct(item.handle)));
      if (mine !== token) return;
      body.innerHTML = list.map((item, i) => line(item, loaded[i], i)).join('');
      setCount(list.length);
      setFooter(true);
    } catch (e) {
      if (mine !== token) return;
      setCount(0); setFooter(false);
      body.innerHTML = errorState();
    }
  };

  /* ---------------------------------------------------------- open / close */
  let lastFocus = null;
  const isOpen = () => drawer.classList.contains('active');
  const open = () => {
    lastFocus = document.activeElement;
    const bag = store();
    if (bag && bag.toggleCartDrawer) bag.toggleCartDrawer(false);
    render();
    drawer.classList.add('active');
    overlay.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => drawer.querySelector('[data-wl-drawer-close]').focus({ preventScroll: true }), 50);
  };
  const close = () => {
    if (!isOpen()) return;
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };

  /* ---------------------------------------------------------------- bag */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const addToBag = async (btn) => {
    const p = products.get(btn.dataset.handle);
    const variant = p && (p.variants || []).find((x) => String(x.id) === btn.dataset.variant);
    if (!variant || !variant.available || btn.getAttribute('aria-busy') === 'true') return;
    const label = btn.textContent;
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Adding…';
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
      const bag = store();
      if (bag && bag.cart) {
        const img = (variant.featured_image && variant.featured_image.src) || p.featured_image || '';
        bag.cart.push({ id: `${variant.id}-${Date.now()}`, title: p.title, price: money(variant.price), compare: variant.compare_at_price > variant.price ? money(variant.compare_at_price) : '', image: img, size: variant.title });
        bag.updateCartUI();
      }
      btn.textContent = 'Added';
      await wait(500);
      close();
      if (bag && bag.toggleCartDrawer) setTimeout(() => bag.toggleCartDrawer(true), 250);
    } catch (error) {
      const bag = store();
      if (bag && bag.showToast) bag.showToast(error.message);
    } finally {
      btn.removeAttribute('aria-busy');
      btn.textContent = label;
    }
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-wishlist-open]');
    if (trigger) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
      e.preventDefault();
      if (isOpen()) close(); else open();
      return;
    }
    if (e.target.closest('.js-wl-close')) { close(); return; }
    if (!drawer.contains(e.target)) return;
    const add = e.target.closest('[data-wl-add]');
    if (add) { e.preventDefault(); addToBag(add); return; }
    if (e.target.closest('[data-wl-retry]')) wl.reload();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  /* ---------------------------------------------------------- live updates */
  const removeLine = (handle) => {
    const el = Array.from(body.querySelectorAll('[data-wl-line]')).find((n) => n.dataset.handle === handle);
    if (!el) return;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      el.remove();
      const left = body.querySelectorAll('[data-wl-line]').length;
      setCount(left);
      if (!left) render();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !el.animate) { done(); return; }
    el.style.pointerEvents = 'none';
    el.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(16px)' }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).onfinish = done;
    setTimeout(done, 400); // animations pause in background tabs; never leave a removed line behind
  };

  wl.on((event) => {
    if (event.type === 'status') { if (isOpen()) render(); return; }
    if (!isOpen()) return;
    if (event.type === 'change' && event.saved === false) removeLine(event.handle);
    if (event.type === 'change' && event.saved === true) render();
  });
})();
