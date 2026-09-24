/* ==========================================================================
   AGHA PERFUMES — WISHLIST (shared, loaded on every page by layout/theme.liquid)

   One module owns the wishlist state; every heart on the site is just a button:
     <button data-wishlist-toggle data-wishlist-handle="oud-fury" data-wishlist-variant="123"
             aria-pressed="false"> … </button>
   It is found by delegation, so cards rendered later (recently viewed, wishlist page) work too.

   LOGIN
     Whether the visitor is signed in comes from Shopify's own `customer` object, exposed as
     window.AghaWishlistConfig.loggedIn by snippets/agha-wishlist-config.liquid. There is no
     login code here. A guest who clicks a heart is sent to Shopify's login page
     (routes.account_login_url ?return_url=<this page>); the wanted product is remembered as an
     *intent* (handle + page, 30 minutes) and added only after the customer is back, signed in,
     on that same page. Nothing is ever saved for a guest.

   STORAGE (window.AghaWishlistConfig.storage)
     Shopify has no wishlist storage a classic-account storefront can write to, so a signed-in
     customer's list needs an app on the shop's side.
       'proxy'  (production)  Talks to a Shopify App Proxy at AghaWishlistConfig.proxyPath
                (default /apps/wishlist). The app behind it must identify the customer from Shopify's
                signed proxy request (logged_in_customer_id) and keep the list on that customer.
                Contract (JSON, same origin, cookies included):
                  GET  {proxyPath}                                   → 200 {"items":[{"handle","variant_id"}]}
                  POST {proxyPath}  {"action":"add","handle","variant_id"}    → 200 {"items":[…]}  (idempotent)
                  POST {proxyPath}  {"action":"remove","handle"}              → 200 {"items":[…]}
                  POST {proxyPath}  {"action":"variant","handle","variant_id"}→ 200 {"items":[…]}
                Every response carries the full current list. 401/403 = not signed in.
       'device' (development) The list lives in this browser under the customer's id. It does NOT
                sync across devices; it exists so the interface can be built and tested before the
                proxy app is connected.
   ========================================================================== */

(() => {
  'use strict';
  if (window.AghaWishlist) return;

  const cfg = Object.assign({
    loggedIn: false,
    customerId: null,
    loginUrl: '/account/login',
    wishlistUrl: '/pages/wishlist',
    root: '/',
    storage: 'proxy',
    proxyPath: '/apps/wishlist',
    moneyFormat: ''
  }, window.AghaWishlistConfig || {});

  const INTENT_KEY = 'agha-wishlist-intent';
  const INTENT_TTL = 30 * 60 * 1000;
  const REQUEST_TIMEOUT = 12000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const store = () => (typeof AghaStore !== 'undefined' ? AghaStore : window.AghaStore);

  /* ------------------------------------------------------------------ toast */
  let toastEl = null;
  let toastTimer = 0;
  const toast = (message) => {
    const shop = store();
    if (shop && typeof shop.showToast === 'function') { shop.showToast(message); return; }
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:3000;padding:14px 28px;background:#141210;color:#fff;font:500 0.75rem/1 sans-serif;letter-spacing:.15em;text-transform:uppercase;opacity:0;transition:opacity .3s;pointer-events:none';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, 2600);
  };

  /* --------------------------------------------------------------- adapters */
  const normalise = (list) => (Array.isArray(list) ? list : [])
    .filter((i) => i && i.handle)
    .map((i) => ({ handle: String(i.handle), variant_id: i.variant_id ? Number(i.variant_id) : null }));

  const request = async (url, options = {}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(url, Object.assign({ credentials: 'same-origin', signal: ctrl.signal, headers: { Accept: 'application/json' } }, options));
      if (res.status === 401 || res.status === 403) throw Object.assign(new Error('Not signed in'), { auth: true });
      if (!res.ok) throw new Error(`Wishlist request failed (${res.status})`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const applyAction = (list, action, item) => {
    const next = list.filter((i) => i.handle !== item.handle);
    const existing = list.find((i) => i.handle === item.handle);
    if (action === 'add') next.push({ handle: item.handle, variant_id: item.variant_id || (existing && existing.variant_id) || null });
    if (action === 'variant' && existing) next.push({ handle: item.handle, variant_id: item.variant_id || existing.variant_id });
    return next;
  };

  const proxyAdapter = {
    async list() { return normalise((await request(cfg.proxyPath)).items); },
    async write(action, item) {
      const body = JSON.stringify(Object.assign({ action }, item));
      return normalise((await request(cfg.proxyPath, { method: 'POST', body, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } })).items);
    }
  };

  const deviceAdapter = (() => {
    const key = `agha-wishlist-device:${cfg.customerId}`;
    const read = () => normalise(safe(() => JSON.parse(localStorage.getItem(key)), []));
    const write = (list) => {
      try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { throw new Error('Storage unavailable'); }
    };
    return {
      async list() { return read(); },
      async write(action, item) {
        const next = applyAction(read(), action, item);
        write(next);
        return next;
      }
    };
  })();

  if (cfg.storage === 'device' && cfg.loggedIn) {
    console.warn('[AghaWishlist] Storage is "device": the wishlist stays in this browser and does not sync across devices. Set the theme setting "Wishlist storage" to "App proxy" for production.');
  }
  const adapter = cfg.storage === 'device' ? deviceAdapter : proxyAdapter;

  /* ------------------------------------------------------------------ state */
  let items = new Map();
  let status = cfg.loggedIn ? 'loading' : 'guest'; // guest | loading | ready | error
  const listeners = new Set();
  const busy = new Set();
  const emit = (detail) => listeners.forEach((fn) => safe(() => fn(detail)));

  const cacheKey = `agha-wishlist-cache:${cfg.customerId}`;
  const setItems = (list) => {
    items = new Map(list.map((i) => [i.handle, i]));
    if (cfg.storage === 'proxy') safe(() => sessionStorage.setItem(cacheKey, JSON.stringify(list)));
  };

  /* ---------------------------------------------------------------- buttons */
  const buttonsFor = (handle) => $$('[data-wishlist-toggle]').filter((b) => !handle || b.dataset.wishlistHandle === handle);

  const paint = (btn) => {
    const handle = btn.dataset.wishlistHandle;
    const saved = status === 'ready' || items.size ? items.has(handle) : false;
    btn.setAttribute('aria-pressed', String(saved));
    const title = btn.dataset.wishlistTitle ? ` ${btn.dataset.wishlistTitle}` : '';
    if (!btn.hasAttribute('data-wishlist-fixed-label')) {
      btn.setAttribute('aria-label', saved ? `Remove${title} from wishlist` : `Save${title} to wishlist`);
    }
    btn.toggleAttribute('data-wishlist-loading', status === 'loading' && cfg.loggedIn);
  };
  const paintAll = () => {
    buttonsFor().forEach(paint);
    $$('[data-wishlist-count]').forEach((el) => {
      const n = cfg.loggedIn && (status === 'ready' || items.size) ? items.size : 0;
      el.textContent = n ? String(n) : '';
      el.hidden = !n;
    });
  };

  const pop = (handle) => {
    if (reduceMotion.matches) return;
    buttonsFor(handle).forEach((btn) => {
      btn.classList.remove('is-pop');
      void btn.offsetWidth;
      btn.classList.add('is-pop');
      setTimeout(() => btn.classList.remove('is-pop'), 600);
    });
  };

  const setBusy = (handle, on) => {
    if (on) busy.add(handle); else busy.delete(handle);
    buttonsFor(handle).forEach((b) => { b.setAttribute('aria-busy', String(on)); });
  };

  /* ----------------------------------------------------------------- intent */
  const saveIntent = (handle, variantId) => {
    safe(() => localStorage.setItem(INTENT_KEY, JSON.stringify({
      handle, variantId: variantId || null, returnTo: window.location.pathname + window.location.search, at: Date.now()
    })));
  };
  const readIntent = () => {
    const intent = safe(() => JSON.parse(localStorage.getItem(INTENT_KEY)), null);
    if (!intent || !intent.handle || Date.now() - intent.at > INTENT_TTL) {
      safe(() => localStorage.removeItem(INTENT_KEY));
      return null;
    }
    return intent;
  };
  const clearIntent = () => safe(() => localStorage.removeItem(INTENT_KEY));

  const goToLogin = (handle, variantId) => {
    saveIntent(handle, variantId);
    const back = window.location.pathname + window.location.search;
    const url = cfg.loginUrl + (cfg.loginUrl.includes('?') ? '&' : '?') + 'return_url=' + encodeURIComponent(back);
    window.location.assign(url);
  };

  /* -------------------------------------------------------------- operations */
  const write = async (action, handle, variantId) => {
    const previous = items;
    try {
      const list = await adapter.write(action, { handle, variant_id: variantId || null });
      setItems(list);
      return true;
    } catch (error) {
      items = previous;
      if (error && error.auth) { cfg.loggedIn = false; status = 'guest'; items = new Map(); }
      throw error;
    }
  };

  const toggle = async (handle, variantId) => {
    if (!handle) return 'ignored';
    if (!cfg.loggedIn) { goToLogin(handle, variantId); return 'redirect'; }
    if (busy.has(handle)) return 'busy';
    if (status === 'loading') await api.ready;
    if (!cfg.loggedIn) { goToLogin(handle, variantId); return 'redirect'; }
    const saving = !items.has(handle);
    setBusy(handle, true);
    try {
      await write(saving ? 'add' : 'remove', handle, variantId);
      paintAll();
      if (saving) pop(handle);
      toast(saving ? 'Added to Wishlist' : 'Removed from Wishlist');
      emit({ type: 'change', handle, saved: saving });
      return saving ? 'added' : 'removed';
    } catch (error) {
      paintAll();
      if (error && error.auth) { toast('Please sign in to use your wishlist.'); emit({ type: 'status', status }); }
      else toast('We couldn’t update your wishlist. Please try again.');
      emit({ type: 'error', handle });
      return 'error';
    } finally {
      setBusy(handle, false);
    }
  };

  // A saved product's chosen size follows the selector on its product page
  const updateVariant = async (handle, variantId) => {
    if (!cfg.loggedIn || !variantId || !items.has(handle)) return;
    const current = items.get(handle);
    if (current.variant_id === Number(variantId)) return;
    try { await write('variant', handle, variantId); emit({ type: 'variant', handle }); } catch (e) { /* silent: the heart state is unaffected */ }
  };

  /* ------------------------------------------------------------------- load */
  const load = async () => {
    if (!cfg.loggedIn) { status = 'guest'; items = new Map(); paintAll(); emit({ type: 'status', status }); return; }
    if (cfg.storage === 'proxy') {
      const cached = safe(() => JSON.parse(sessionStorage.getItem(cacheKey)), null);
      if (Array.isArray(cached)) { items = new Map(normalise(cached).map((i) => [i.handle, i])); paintAll(); }
    }
    status = 'loading';
    paintAll();
    emit({ type: 'status', status });
    try {
      setItems(await adapter.list());
      status = 'ready';
    } catch (error) {
      if (error && error.auth) { cfg.loggedIn = false; status = 'guest'; items = new Map(); safe(() => sessionStorage.removeItem(cacheKey)); }
      else status = 'error';
    }
    paintAll();
    emit({ type: 'status', status });
  };

  // Back from the login page: finish what the customer asked for, once, on the page they left
  const resumeIntent = async () => {
    const intent = readIntent();
    if (!intent || !cfg.loggedIn || status !== 'ready') return;
    const samePage = intent.returnTo.split('?')[0] === window.location.pathname;
    if (!samePage) return;
    clearIntent();
    if (items.has(intent.handle)) return;
    setBusy(intent.handle, true);
    try {
      await write('add', intent.handle, intent.variantId);
      paintAll();
      pop(intent.handle);
      toast('Added to Wishlist');
      emit({ type: 'change', handle: intent.handle, saved: true });
    } catch (e) {
      toast('We couldn’t update your wishlist. Please try again.');
    } finally {
      setBusy(intent.handle, false);
    }
  };

  /* ------------------------------------------------------------- public API */
  const api = {
    config: cfg,
    get status() { return status; },
    has: (handle) => items.has(handle),
    list: () => Array.from(items.values()),
    count: () => items.size,
    toggle,
    updateVariant,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    paint: paintAll,
    reload: load,
    ready: null
  };
  window.AghaWishlist = api;

  let resolveReady;
  api.ready = new Promise((r) => { resolveReady = r; });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    toggle(btn.dataset.wishlistHandle, Number(btn.dataset.wishlistVariant) || null);
  });

  // Hearts added after load (recently viewed, wishlist page, theme editor) pick up their state
  let paintTimer = 0;
  new MutationObserver((mutations) => {
    if (!mutations.some((m) => m.addedNodes.length)) return;
    clearTimeout(paintTimer);
    paintTimer = setTimeout(paintAll, 30);
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('pageshow', (e) => { if (e.persisted) load(); });

  const boot = async () => {
    paintAll();
    await load();
    resolveReady();
    await resumeIntent();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
