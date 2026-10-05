/* Agha V2 — shared behaviour for every /v2/ page.
   Header, mobile menu, bag (localStorage, its own key — separate from V1), product cards, reveals.
   GSAP is optional: used for the reveal and drawer list easing when present. */
(() => {
  const A = window.AGHA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V2 = (window.V2 = { $, $$, esc, reduced });

  /* ---------- Header: hairline once scrolled ---------- */
  const head = $('[data-head]');
  const onScroll = () => head && head.classList.toggle('is-scrolled', scrollY > 4);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Overlays (menu + bag) ---------- */
  let lastFocus = null;
  const open = (el) => {
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const panel = $('[role="dialog"]', el);
    panel && panel.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => panel && panel.focus({ preventScroll: true }));
  };
  const close = (el) => {
    if (!el || !el.classList.contains('is-open')) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    lastFocus && lastFocus.focus({ preventScroll: true });
  };
  const menu = $('[data-menu]');
  const bagEl = $('[data-bag]');

  /* ---------- Bag ---------- */
  const KEY = 'agha-v2-bag';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = (items) => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ } render(); };
  const lines = () => read().map((it) => {
    const p = A.byHandle[it.h];
    const size = p && p.sizes.find((s) => s.label === it.size);
    return p && size ? { ...it, p, size, total: size.price * it.qty } : null;
  }).filter(Boolean);
  V2.bag = {
    lines,
    count: () => lines().reduce((n, l) => n + l.qty, 0),
    subtotal: () => lines().reduce((n, l) => n + l.total, 0),
    add(h, size, qty = 1) {
      const items = read();
      const hit = items.find((i) => i.h === h && i.size === size);
      if (hit) hit.qty += qty; else items.push({ h, size, qty });
      write(items);
      open(bagEl);
    },
    set(index, qty) {
      const items = read();
      if (!items[index]) return;
      if (qty <= 0) items.splice(index, 1); else items[index].qty = Math.min(20, qty);
      write(items);
    },
    clear() { write([]); }
  };

  function render() {
    const ls = lines();
    const n = ls.reduce((a, l) => a + l.qty, 0);
    $$('[data-bag-count]').forEach((el) => { el.textContent = n || ''; el.dataset.n = n; });
    const title = $('#bag-title');
    if (title) title.textContent = n ? `Your bag (${n})` : 'Your bag';
    const body = $('[data-bag-lines]');
    const foot = $('[data-bag-foot]');
    if (!body) return;
    if (!ls.length) {
      body.innerHTML = `<div class="bag__empty"><p class="t-name">Your bag is empty.</p><p class="note">Begin with a fragrance from the collection.</p><a class="btn" href="shop.html">Shop all fragrances</a></div>`;
      foot.innerHTML = '';
    } else {
      body.innerHTML = ls.map((l, i) => `
        <div class="line">
          <a class="line__img" href="product.html?p=${l.p.handle}"><img src="${l.p.images[0].sm}" alt="${esc(l.p.name)}" loading="lazy"></a>
          <div>
            <a class="t-name" href="product.html?p=${l.p.handle}">${esc(l.p.name)}</a>
            <p class="line__meta">${esc(l.p.type)} · ${esc(l.size.label)}</p>
            <div class="line__ctrl">
              <div class="qty qty--sm"><button type="button" data-line="${i}" data-q="${l.qty - 1}" aria-label="Decrease">−</button><span>${l.qty}</span><button type="button" data-line="${i}" data-q="${l.qty + 1}" aria-label="Increase">+</button></div>
              <button class="line__rm" type="button" data-line="${i}" data-q="0">Remove</button>
            </div>
          </div>
          <span class="line__price">${A.money(l.total)}</span>
        </div>`).join('');
      foot.innerHTML = `
        <div class="bag__row"><span class="t-meta" style="color:var(--ink)">Subtotal</span><span>${A.money(V2.bag.subtotal())}</span></div>
        <p class="note">Prices include taxes. Free express shipping on prepaid orders.</p>
        <a class="btn btn--block" href="checkout.html">Checkout</a>`;
    }
    document.dispatchEvent(new CustomEvent('v2:bag'));
  }

  /* ---------- Wishlist (localStorage, own key) ---------- */
  const WKEY = 'agha-v2-wish';
  const wread = () => { try { return (JSON.parse(localStorage.getItem(WKEY)) || []).filter((h) => A.byHandle[h]); } catch (e) { return []; } };
  const wrender = () => {
    const n = wread().length;
    $$('[data-wish-count]').forEach((el) => { el.textContent = n || ''; el.dataset.n = n; });
    $$('[data-wish]').forEach((b) => {
      const on = V2.wish.has(b.dataset.wish);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${on ? 'Remove from' : 'Add to'} wishlist: ${A.byHandle[b.dataset.wish].name}`);
    });
  };
  V2.wish = {
    list: wread,
    has: (h) => wread().includes(h),
    toggle(h) {
      const list = wread();
      const next = list.includes(h) ? list.filter((x) => x !== h) : [...list, h];
      try { localStorage.setItem(WKEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
      wrender();
      document.dispatchEvent(new CustomEvent('v2:wish'));
    }
  };

  /* ---------- Search panel (submits to shop.html?q=) ---------- */
  const search = $('[data-search]');
  const searchBtn = $('[data-search-open]');
  const toggleSearch = (show) => {
    if (!search) return;
    search.hidden = !show;
    searchBtn && searchBtn.setAttribute('aria-expanded', String(show));
    if (show) { const q = $('input', search); q.value = new URLSearchParams(location.search).get('q') || ''; q.focus(); }
  };

  /* ---------- Product card (shared by home, product) ---------- */
  V2.card = (p) => {
    const first = p.sizes.find((s) => s.available) || p.sizes[0];
    const varies = new Set(p.sizes.map((s) => s.price)).size > 1;
    const soldOut = !p.sizes.some((s) => s.available);
    return `
      <article class="card" data-reveal>
        <a class="card__img" href="product.html?p=${p.handle}" aria-label="${esc(p.name)}">
          ${soldOut ? '<span class="card__sold">Sold out</span>' : ''}
          <img src="${p.images[0].sm}" alt="${esc(p.name)}, ${esc(p.type)}" loading="lazy" width="700" height="875">
          ${p.images[1] ? `<img src="${p.images[1].sm}" alt="" loading="lazy" width="700" height="875">` : ''}
        </a>
        <div class="card__body">
          <a class="t-name" href="product.html?p=${p.handle}">${esc(p.name)}</a>
          <span class="card__notes">${esc(p.notes)}</span>
          <span class="card__price">${varies ? 'From ' : ''}${A.money(A.fromPrice(p))}</span>
          <button class="btn btn--line btn--sm card__add" type="button" data-add="${p.handle}" data-size="${esc(first.label)}"${soldOut ? ' disabled' : ''}>Add to bag</button>
        </div>
      </article>`;
  };

  /* ---------- Reveal: fade + 14px rise, once ---------- */
  const io = 'IntersectionObserver' in window && !reduced ? new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      e.target.style.transitionDelay = `${Math.min(i, 5) * 60}ms`;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  V2.reveal = (root = document) => $$('[data-reveal]:not(.is-in)', root).forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-menu-open]')) return open(menu);
    if (t.closest('[data-menu-close]')) return close(menu);
    if (t.closest('[data-bag-open]')) return open(bagEl);
    if (t.closest('[data-bag-close]')) return close(bagEl);
    if (t.closest('[data-search-open]')) return toggleSearch(search.hidden);
    if (t.closest('[data-search-close]')) return toggleSearch(false);
    const wish = t.closest('[data-wish]');
    if (wish) return V2.wish.toggle(wish.dataset.wish);
    const add = t.closest('[data-add]');
    if (add) return V2.bag.add(add.dataset.add, add.dataset.size, 1);
    const line = t.closest('[data-line]');
    if (line) return V2.bag.set(Number(line.dataset.line), Number(line.dataset.q));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(menu); close(bagEl); toggleSearch(false); } });
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.matches('[data-news]')) {
      e.preventDefault();
      f.innerHTML = '<p style="font-size:13px;padding:10px 0;color:rgba(247,243,238,.8)">Thank you. You are on the list.</p>';
    }
  });
  addEventListener('storage', (e) => { if (e.key === KEY) render(); if (e.key === WKEY) wrender(); });

  /* ---------- Side menu (Sarkar): drops in under the header; the menu button toggles open / closed ---------- */
  const burger = $('.xhead__burger');
  if (menu && burger) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.xhead__burger')) return;
      if (menu.classList.contains('is-open')) {
        e.stopPropagation(); // the handler below would re-open it
        close(menu);
        return;
      }
      const top = Math.max(0, head.getBoundingClientRect().bottom);
      document.documentElement.style.setProperty('--xmenu-top', `${Math.round(top)}px`);
    }, true);
    new MutationObserver(() => {
      const on = menu.classList.contains('is-open');
      burger.setAttribute('aria-expanded', String(on));
      burger.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }
  // Underline this page's own link in the side menu (the shop marks its collection links itself).
  const here = location.pathname.split('/').pop() || 'index.html';
  if (here !== 'shop.html') $$('.xmenu__links > a').forEach((a) => a.getAttribute('href') === here && a.setAttribute('aria-current', 'page'));

  render();
  wrender();
  V2.reveal();
})();
