/* Agha V2 — product page (Sarkar PDP structure).
   Gallery: the bottle alone on white first, then the photography two-up (desktop) or as a swipe
   slider with a counter (phones). Choosing another fragrance swaps the page in place: gallery,
   text and band fade out and back in, the URL updates (back/forward work). Sizes update the price. */
(() => {
  const A = window.AGHA;
  const { $, $$, esc, reduced } = window.V2;
  const gallery = $('[data-gallery]');
  if (!gallery) return;

  const siblings = A.products.filter((p) => p.cutout);
  let product = A.byHandle[new URLSearchParams(location.search).get('p')] || A.byHandle['oud-fury'];
  let size = null;
  let qty = 1;

  /* ---------- Gallery + band ---------- */
  const drawGallery = () => {
    const first = product.cutout
      ? `<figure class="gal__item gal__item--hero gal__item--cut"><img src="${product.cutout.src}" alt="${esc(product.name)} bottle" width="1200" height="1500" fetchpriority="high"></figure>`
      : `<figure class="gal__item gal__item--hero"><img src="${product.images[0].src}" alt="${esc(product.name)}" width="1080" height="1350" fetchpriority="high"></figure>`;
    const rest = (product.cutout ? product.images : product.images.slice(1)).map((im, i) =>
      `<figure class="gal__item"><img src="${im.sm}" alt="${esc(product.name)}, image ${i + 2}" width="700" height="875" loading="lazy"></figure>`).join('');
    gallery.innerHTML = first + rest;
    gallery.scrollLeft = 0;
    count();
  };
  const count = () => {
    const items = gallery.children.length;
    const w = gallery.clientWidth || 1;
    const i = Math.min(items, Math.round(gallery.scrollLeft / (gallery.firstElementChild.offsetWidth || w)) + 1);
    $('[data-gal-count]').textContent = `${i} / ${items}`;
  };
  gallery.addEventListener('scroll', () => requestAnimationFrame(count), { passive: true });

  const drawBand = () => {
    const band = $('[data-band]');
    const b = product.banner || [];
    band.hidden = !b.length;
    band.classList.toggle('band--pair', b.length > 1);
    band.innerHTML = b.map((im) => `<img src="${b.length > 1 ? im.sm : im.src}" alt="" loading="lazy">`).join('');
  };

  /* ---------- Info ---------- */
  const fill = () => {
    const forLabel = { men: 'Men', women: 'Women', unisex: 'Unisex' }[product.for];
    $('[data-chips]').innerHTML = [forLabel, product.type].filter(Boolean).map((c) => `<span>${esc(c)}</span>`).join('');
    $('[data-name]').textContent = product.name;
    $('[data-notes]').textContent = product.notes;
    $('[data-tagline]').textContent = product.tagline;
    $('[data-description]').textContent = product.description;
    // Notes: the full pyramid where the live description gives one, otherwise the key notes line.
    const rows = product.pyramid
      ? Object.entries(product.pyramid).map(([k, v]) => [`${k} notes`, v])
      : (product.cutout ? [['Key notes', product.notes.split(' · ').join(', ')]] : []);
    $('[data-pyramid]').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('[data-pyramid]').hidden = !rows.length;
    document.title = `${product.name} · House of Agha`;
    $$('[data-variant]').forEach((s) => s.setAttribute('aria-current', String(s.dataset.variant === product.handle)));
    $('[data-variant-wrap]').hidden = !product.cutout;   // the gift set is not one of the bottles
    // Sizes: keep the same size when the new fragrance has it, otherwise the first available.
    const keep = size && product.sizes.find((s) => s.label === size.label && s.available);
    size = keep || product.sizes.find((s) => s.available) || product.sizes[0];
    $('[data-sizes]').innerHTML = product.sizes.map((s) =>
      `<button class="size" type="button" data-size-btn="${esc(s.label)}" aria-pressed="${s === size}"${s.available ? '' : ' disabled title="Sold out"'}>${esc(s.label)}</button>`).join('');
    $('[data-size-wrap]').hidden = product.sizes.length < 2;
    price();
    related();
  };
  const price = () => {
    $('[data-price]').textContent = A.money(size.price);
    $('[data-name-size]').textContent = `(${size.label})`;
    const buy = $('[data-buy]');
    buy.disabled = !size.available;
    buy.textContent = size.available ? 'Add to bag' : 'Sold out';
  };
  const related = () => {
    const el = $('[data-related]');
    const pool = A.products.filter((p) => p.handle !== product.handle && p.collections.includes('main'));
    const start = A.products.indexOf(product) % pool.length;
    el.innerHTML = [...pool.slice(start), ...pool.slice(0, start)].slice(0, 4).map(window.V2.card).join('');
    window.V2.reveal(el);
  };

  /* ---------- Switch fragrance in place ---------- */
  const draw = () => { drawGallery(); drawBand(); fill(); };
  const switchTo = (handle, push) => {
    const next = A.byHandle[handle];
    if (!next || next === product) return;
    product = next;
    if (push) history.pushState({ p: handle }, '', `?p=${handle}`);
    const fades = [...$$('[data-fade]'), $('[data-band]')];
    if (reduced) { draw(); return; }
    fades.forEach((f) => f.classList.add('is-out'));
    setTimeout(() => { draw(); requestAnimationFrame(() => fades.forEach((f) => f.classList.remove('is-out'))); }, 280);
  };

  /* ---------- Build ---------- */
  $('[data-variants]').innerHTML = siblings.map((p) => `
    <a class="variant" role="listitem" href="?p=${p.handle}" data-variant="${p.handle}">
      <span class="variant__img"><img src="${p.cutout.sm}" alt="" loading="lazy"></span>
      <span class="variant__name">${esc(p.name)}</span>
    </a>`).join('');
  draw();
  history.replaceState({ p: product.handle }, '', `?p=${product.handle}`);

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const v = t.closest('[data-variant]');
    if (v && !e.metaKey && !e.ctrlKey) { e.preventDefault(); switchTo(v.dataset.variant, true); return; }
    const sb = t.closest('[data-size-btn]');
    if (sb) {
      size = product.sizes.find((s) => s.label === sb.dataset.sizeBtn);
      $$('[data-size-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b === sb)));
      price();
      return;
    }
    const step = t.closest('[data-step]');
    if (step) { qty = Math.min(20, Math.max(1, qty + Number(step.dataset.step))); $('[data-qty-value]').textContent = qty; return; }
    if (t.closest('[data-buy]')) { window.V2.bag.add(product.handle, size.label, qty); return; }
    if (t.closest('[data-more]')) {
      e.preventDefault();
      $('[data-desc]').open = true;
      $('#details').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  });
  addEventListener('popstate', (e) => { if (e.state && e.state.p) switchTo(e.state.p, false); });
})();
