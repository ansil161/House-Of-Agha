/* Agha V2 — shop (collection page), measured against in.ajmal.com/collections/shop-all-products:
   breadcrumb, title + count, toolbar, 180px filter sidebar (a right-hand "Filter and sort" drawer
   below 990px), 3-column grid of shop cards (2 on phones).
   Facets are built from v2-data.js only (no invented metadata): Category (type), Gender (for),
   Collection, Size, Price. OR inside a group, AND across groups. State lives in the URL.
   Old links keep working: ?c=unisex|men|women|oud|attar|gift. */
(() => {
  const A = window.AGHA;
  const { $, $$, esc } = window.V2;

  /* ---------- Facet definitions (all values read from the data) ---------- */
  const GENDER = { men: 'Men', women: 'Women', unisex: 'Unisex' };
  const PRICE = [
    { v: 'u2', label: `Under ${A.money(2000)}`, min: 0, max: 1999 },
    { v: '2-3', label: `${A.money(2000)} – ${A.money(3000)}`, min: 2000, max: 3000 },
    { v: '3-5', label: `${A.money(3000)} – ${A.money(5000)}`, min: 3001, max: 5000 },
    { v: '5p', label: `${A.money(5000)}+`, min: 5001, max: Infinity }
  ];
  const sellable = (p) => p.sizes.filter((s) => s.available);
  const uniq = (arr) => [...new Set(arr)];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const GROUPS = [
    { key: 'type', title: 'Category', options: uniq(A.products.map((p) => p.type)).map((t) => ({ v: slug(t), label: t })), test: (p, v) => slug(p.type) === v },
    { key: 'for', title: 'Gender', options: Object.keys(GENDER).filter((g) => A.products.some((p) => p.for === g)).map((g) => ({ v: g, label: GENDER[g] })), test: (p, v) => p.for === v },
    { key: 'col', title: 'Collection', options: A.products.some((p) => p.collections.includes('oud')) ? [{ v: 'oud', label: 'The Oud Collection' }] : [], test: (p, v) => p.collections.includes(v) },
    { key: 'size', title: 'Size', options: uniq(A.products.flatMap((p) => p.sizes.map((s) => s.label))).sort((a, b) => parseFloat(a) - parseFloat(b)).map((s) => ({ v: slug(s), label: s })), test: (p, v) => sellable(p).some((s) => slug(s.label) === v) },
    { key: 'price', title: 'Price', options: PRICE, test: (p, v) => { const b = PRICE.find((x) => x.v === v); return sellable(p).some((s) => s.price >= b.min && s.price <= b.max); } }
  ].filter((g) => g.options.length);

  const SORTS = {
    featured: null,
    az: (a, b) => a.name.localeCompare(b.name),
    za: (a, b) => b.name.localeCompare(a.name),
    low: (a, b) => A.fromPrice(a) - A.fromPrice(b),
    high: (a, b) => A.fromPrice(b) - A.fromPrice(a)
  };

  /* ---------- State (URL) ---------- */
  const params = new URLSearchParams(location.search);
  const state = { sel: {}, sort: SORTS[params.get('sort')] !== undefined ? params.get('sort') : 'featured', q: (params.get('q') || '').trim(), view: params.get('view') === 'wishlist' ? 'wishlist' : '' };
  GROUPS.forEach((g) => {
    const valid = new Set(g.options.map((o) => o.v));
    state.sel[g.key] = new Set((params.get(g.key) || '').split(',').filter((v) => valid.has(v)));
  });
  const legacy = { unisex: ['for', 'unisex'], men: ['for', 'men'], women: ['for', 'women'], oud: ['col', 'oud'], attar: ['type', 'attar'], gift: ['type', 'gift-set'] }[params.get('c')];
  if (legacy && state.sel[legacy[0]]) state.sel[legacy[0]].add(legacy[1]);

  const syncUrl = () => {
    const q = new URLSearchParams();
    if (state.view) q.set('view', state.view);
    if (state.q) q.set('q', state.q);
    GROUPS.forEach((g) => state.sel[g.key].size && q.set(g.key, [...state.sel[g.key]].join(',')));
    if (state.sort !== 'featured') q.set('sort', state.sort);
    history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
  };

  /* ---------- Filtering ---------- */
  const inScope = (p) => {
    if (state.view === 'wishlist' && !window.V2.wish.has(p.handle)) return false;
    if (state.q) {
      const hay = `${p.name} ${p.type} ${p.notes} ${GENDER[p.for] || ''}`.toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  };
  const passes = (p, skip) => GROUPS.every((g) => g.key === skip || !state.sel[g.key].size || [...state.sel[g.key]].some((v) => g.test(p, v)));
  const results = () => {
    const list = A.products.filter((p) => inScope(p) && passes(p));
    return SORTS[state.sort] ? [...list].sort(SORTS[state.sort]) : list;
  };
  const activeCount = () => GROUPS.reduce((n, g) => n + state.sel[g.key].size, 0);

  /* ---------- Facets markup (one sidebar; becomes the drawer on small screens) ---------- */
  const facets = $('[data-facets]');
  $('[data-facet-groups]').innerHTML = GROUPS.map((g) => `
    <details class="fg" open data-fg>
      <summary class="fg__title"><svg class="fg__back" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg><span>${esc(g.title)}</span><svg class="fg__chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg></summary>
      <ul class="fg__list">
        ${g.options.map((o) => `
        <li><label class="ck">
          <input type="checkbox" data-f="${g.key}" value="${esc(o.v)}"${state.sel[g.key].has(o.v) ? ' checked' : ''}>
          <span class="ck__box" aria-hidden="true"></span>
          <span class="ck__label">${esc(o.label)}</span>
          <span class="ck__n" data-n="${g.key}:${esc(o.v)}"></span>
        </label></li>`).join('')}
      </ul>
    </details>`).join('');

  const updateFacetCounts = () => {
    GROUPS.forEach((g) => g.options.forEach((o) => {
      const n = A.products.filter((p) => inScope(p) && passes(p, g.key) && g.test(p, o.v)).length;
      const el = $(`[data-n="${g.key}:${o.v}"]`);
      el.textContent = `(${n})`;
      const input = el.parentElement.querySelector('input');
      input.disabled = !n && !input.checked;
      el.parentElement.classList.toggle('is-off', input.disabled);
    }));
  };

  /* ---------- Shop card ---------- */
  const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0112 7.4a4.2 4.2 0 017.5 2.5C19.5 15.4 12 20 12 20z"/></svg>';
  // Ajmal card order: image (badge top-left) · small family line · name · price · full-width ADD TO CART.
  // No rating / discount rows: the store has no reviews and no compare-at prices.
  const card = (p) => {
    const avail = sellable(p);
    const first = avail[0] || p.sizes[0];
    const soldOut = !avail.length;
    const wished = window.V2.wish.has(p.handle);
    return `
      <article class="pc" data-pc="${p.handle}">
        <div class="pc__media">
          <a class="pc__img" href="product.html?p=${p.handle}" aria-label="${esc(p.name)}"${p.images.length > 1 ? ' data-cycle' : ''}>
            ${p.images.slice(0, 4).map((im, i) => `<img src="${im.sm}" alt="${i ? '' : `${esc(p.name)}, ${esc(p.type)}`}" loading="lazy" width="700" height="875"${i ? '' : ' class="is-on"'}>`).join('')}
          </a>
          ${soldOut ? '<span class="pc__badge">Sold out</span>' : ''}
          <button class="pc__wish" type="button" data-wish="${p.handle}" aria-pressed="${wished}" aria-label="${wished ? 'Remove from' : 'Add to'} wishlist: ${esc(p.name)}">${heart}</button>
        </div>
        <div class="pc__info">
          <span class="pc__meta">${esc(p.notes)}</span>
          <a class="pc__name" href="product.html?p=${p.handle}">${esc(p.name)} <span class="pc__size">- ${esc(first.label)}</span></a>
          <span class="pc__price">${A.money(first.price)}</span>
          <button class="pc__add" type="button" data-add="${p.handle}" data-size="${esc(first.label)}"${soldOut ? ' disabled' : ''}>${soldOut ? 'Sold out' : 'Add to cart'}</button>
        </div>
      </article>`;
  };

  /* ---------- Render ---------- */
  const grid = $('[data-grid]');
  const empty = $('[data-empty]');
  const chips = $('[data-chips]');
  // A collection link (?c=…) titles the page like an Ajmal collection; the nav marks it current.
  const COLLECTION = { oud: 'The Oud Collection', attar: 'Attar', gift: 'Gift Sets', men: 'Men’s perfumes', women: 'Women’s perfumes', unisex: 'Unisex perfumes' }[params.get('c')];
  const ALL = 'Shop all products';
  const title = state.view === 'wishlist' ? 'Wishlist' : state.q ? `Results for “${state.q}”` : COLLECTION || ALL;
  const navKey = state.view || state.q ? '' : COLLECTION ? params.get('c') : 'all';
  $$('[data-xnav]').forEach((a) => a.dataset.xnav === navKey && a.setAttribute('aria-current', 'page'));
  const xq = $('[data-xsearch]');
  if (xq && state.q) xq.value = state.q;
  $('[data-shop-title]').textContent = title;
  $('[data-crumb-current]').textContent = state.view === 'wishlist' ? 'Wishlist' : state.q ? 'Search' : 'Shop';
  if (state.view || state.q) $('[data-crumb-shop]').hidden = false;
  document.title = `${title} · House of Agha`;

  const draw = () => {
    const list = results();
    const total = A.products.filter(inScope).length;
    const word = (n) => `${n} ${n === 1 ? 'product' : 'products'}`;
    $('[data-shop-count]').textContent = word(list.length);
    $('[data-showing]').textContent = `Showing - ${list.length} out of ${word(total)}`;
    $('[data-drawer-showing]').textContent = `Showing ${word(list.length)}`;
    const n = activeCount();
    $$('[data-filter-n]').forEach((el) => (el.textContent = n ? `(${n})` : ''));

    grid.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
    if (!list.length) {
      const wishEmpty = state.view === 'wishlist' && !n && !A.products.some(inScope);
      $('[data-empty-title]').textContent = wishEmpty ? 'Your wishlist is empty.' : 'No fragrances match these filters.';
      $('[data-empty-clear]').hidden = wishEmpty;
    }

    const parts = [];
    if (state.q) parts.push(`<button type="button" class="chip" data-chip="q">Search: ${esc(state.q)}<span aria-hidden="true">×</span></button>`);
    GROUPS.forEach((g) => state.sel[g.key].forEach((v) => {
      const o = g.options.find((x) => x.v === v);
      parts.push(`<button type="button" class="chip" data-chip="${g.key}" data-v="${esc(v)}" aria-label="Remove ${esc(o.label)}">${esc(o.label)}<span aria-hidden="true">×</span></button>`);
    }));
    chips.innerHTML = parts.length ? parts.join('') + (n ? '<button type="button" class="chip chip--clear" data-clear>Clear all</button>' : '') : '';
    chips.hidden = !parts.length;

    updateFacetCounts();
    syncUrl();
  };

  /* ---------- Events ---------- */
  facets.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.matches('[data-f]')) return;
    state.sel[t.dataset.f][t.checked ? 'add' : 'delete'](t.value);
    draw();
  });
  const clearAll = () => {
    GROUPS.forEach((g) => state.sel[g.key].clear());
    $$('[data-f]', facets).forEach((i) => (i.checked = false));
    draw();
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-clear]')) return clearAll();
    const chip = t.closest('[data-chip]');
    if (chip) {
      if (chip.dataset.chip === 'q') state.q = '';
      else {
        state.sel[chip.dataset.chip].delete(chip.dataset.v);
        const box = $(`[data-f="${chip.dataset.chip}"][value="${chip.dataset.v}"]`);
        if (box) box.checked = false;
      }
      if (!state.q && !state.view) { $('[data-shop-title]').textContent = COLLECTION || ALL; $('[data-crumb-current]').textContent = 'Shop'; $('[data-crumb-shop]').hidden = true; }
      return draw();
    }
    if (t.closest('[data-facets-open]')) return openDrawer();
    if (t.closest('[data-facets-close]') || t.closest('[data-apply]')) return closeDrawer();
  });
  $$('[data-sort]').forEach((s) => {
    s.value = state.sort;
    s.addEventListener('change', () => { state.sort = s.value; $$('[data-sort]').forEach((o) => (o.value = s.value)); draw(); });
  });
  // The wishlist view drops a card as soon as it is un-hearted.
  document.addEventListener('v2:wish', () => { if (state.view === 'wishlist') draw(); });

  /* ---------- Mobile / tablet drawer (Ajmal / Dawn "Filter and sort") ----------
     The drawer lists the groups; tapping one slides its options in over the list (back arrow returns). */
  const drawerMode = matchMedia('(max-width: 989px)');
  const undrill = () => $$('[data-fg]', facets).forEach((d) => d.classList.remove('is-drill'));
  facets.addEventListener('click', (e) => {
    const sum = e.target.closest('.fg__title');
    if (!sum || !drawerMode.matches) return;
    e.preventDefault(); // groups stay open in the drawer; the summary drills in and out instead
    const g = sum.parentElement;
    const on = !g.classList.contains('is-drill');
    undrill();
    g.classList.toggle('is-drill', on);
    facets.classList.toggle('is-drilled', on);
  });
  const scrim = $('[data-facets-scrim]');
  let lastFocus = null;
  const openDrawer = () => {
    lastFocus = document.activeElement;
    facets.classList.add('is-open');
    scrim.classList.add('is-open');
    facets.setAttribute('role', 'dialog');
    facets.setAttribute('aria-modal', 'true');
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => facets.focus({ preventScroll: true }));
  };
  const closeDrawer = () => {
    if (!facets.classList.contains('is-open')) return;
    facets.classList.remove('is-open', 'is-drilled');
    undrill();
    $$('[data-fg]', facets).forEach((d) => (d.open = true));
    scrim.classList.remove('is-open');
    facets.removeAttribute('role');
    facets.removeAttribute('aria-modal');
    document.body.classList.remove('is-locked');
    lastFocus && lastFocus.focus({ preventScroll: true });
  };
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawer());
  drawerMode.addEventListener('change', (e) => !e.matches && closeDrawer());

  /* ---------- Desktop hover: cross-fade through the product's photos while the pointer stays ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !window.V2.reduced) {
    let timer = null;
    let active = null;
    const stop = () => {
      clearInterval(timer);
      if (active) $$('img', active).forEach((im, i) => im.classList.toggle('is-on', i === 0));
      active = null;
    };
    grid.addEventListener('pointerover', (e) => {
      const el = e.target.closest('[data-cycle]');
      if (!el || el === active) return;
      stop();
      active = el;
      const imgs = $$('img', el);
      let i = 0;
      const step = () => { imgs[i].classList.remove('is-on'); i = (i + 1) % imgs.length; imgs[i].classList.add('is-on'); };
      step();
      timer = setInterval(step, 1400);
    });
    grid.addEventListener('pointerout', (e) => {
      if (active && !active.contains(e.relatedTarget)) stop();
    });
  }

  draw();
})();
