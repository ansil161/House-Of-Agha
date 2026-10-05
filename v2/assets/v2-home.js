/* Agha V2 — home: product introduction carousel + featured grid.
   One bottle centred, neighbours small and quiet. Arrows, dots, swipe, keys.
   No autoplay: nothing moves unless the visitor asks. */
(() => {
  const A = window.AGHA;
  const { $, $$, esc, reduced } = window.V2;
  const gsap = window.gsap;

  /* ---------- Featured grid ---------- */
  const featured = $('[data-featured]');
  if (featured) {
    featured.innerHTML = ['oud-fury', 'sea-smoke', 'maha', 'agha-blue'].map((h) => window.V2.card(A.byHandle[h])).join('');
    window.V2.reveal(featured);
  }

  /* ---------- Carousel ---------- */
  const stage = $('[data-intro-stage]');
  if (!stage) return;
  const items = A.products.filter((p) => p.cutout && p.collections.includes('main'));
  const info = $('[data-intro-info]');
  const dots = $('[data-intro-dots]');
  let active = 0;

  stage.insertAdjacentHTML('beforeend', items.map((p, i) => `
    <div class="intro__slide" data-i="${i}" role="group" aria-roledescription="slide" aria-label="${esc(p.name)}">
      <img src="${p.cutout.src}" alt="${esc(p.name)} bottle" width="1200" height="1500"${i > 1 && i < items.length - 1 ? ' loading="lazy"' : ''}>
    </div>`).join(''));
  dots.innerHTML = items.map((p, i) => `<button type="button" data-dot="${i}" aria-label="${esc(p.name)}"></button>`).join('');
  const slides = $$('.intro__slide', stage);

  const layout = (animate) => {
    const w = stage.clientWidth;
    const narrow = w < 640;
    const n = items.length;
    slides.forEach((el, i) => {
      let d = i - active;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const ad = Math.abs(d);
      const x = d * w * (narrow ? 0.36 : 0.3);
      const scale = ad === 0 ? 1 : ad === 1 ? (narrow ? 0.5 : 0.56) : 0.36;
      const opacity = ad === 0 ? 1 : ad === 1 ? 0.42 : 0;
      el.style.zIndex = String(10 - ad);
      el.style.pointerEvents = ad > 1 ? 'none' : '';
      el.setAttribute('aria-hidden', String(ad !== 0));
      const props = { xPercent: -50, x, scale, opacity, transformOrigin: '50% 100%' };
      if (gsap) {
        gsap.to(el, { ...props, duration: animate && !reduced ? 0.75 : 0, ease: 'power3.out', overwrite: true });
      } else {
        el.style.transformOrigin = '50% 100%';
        el.style.transition = animate && !reduced ? 'transform .7s cubic-bezier(.22,.61,.36,1), opacity .7s' : 'none';
        el.style.transform = `translateX(calc(-50% + ${x}px)) scale(${scale})`;
        el.style.opacity = opacity;
      }
    });
    $$('button', dots).forEach((b, i) => b.setAttribute('aria-current', String(i === active)));
  };

  const showInfo = (animate) => {
    const p = items[active];
    const size = p.sizes.find((s) => s.available) || p.sizes[0];
    const html = `
      <h2 class="t-display">${esc(p.name)}</h2>
      <p class="t-notes">${esc(p.notes)}</p>
      <p class="card__price">From ${A.money(A.fromPrice(p))}</p>
      <div class="intro__actions">
        <a class="btn btn--sm" href="product.html?p=${p.handle}">Discover</a>
        <button class="btn btn--line btn--sm" type="button" data-add="${p.handle}" data-size="${esc(size.label)}">Add to bag</button>
      </div>`;
    info.innerHTML = html;   // content first; motion is only a soft fade on top
    if (animate && !reduced && gsap) gsap.fromTo(info, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', overwrite: true });
  };

  const go = (i) => {
    active = (i + items.length) % items.length;
    layout(true);
    showInfo(true);
  };

  $('[data-intro-prev]').addEventListener('click', () => go(active - 1));
  $('[data-intro-next]').addEventListener('click', () => go(active + 1));
  dots.addEventListener('click', (e) => { const b = e.target.closest('[data-dot]'); if (b) go(Number(b.dataset.dot)); });
  let swiped = false;
  stage.addEventListener('click', (e) => {
    const s = e.target.closest('.intro__slide');
    if (!s || swiped) { swiped = false; return; }
    const i = Number(s.dataset.i);
    if (i === active) location.href = `product.html?p=${items[i].handle}`;
    else go(i);
  });
  stage.closest('section').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(active - 1);
    if (e.key === 'ArrowRight') go(active + 1);
  });

  // Swipe (horizontal only; vertical scroll stays native via touch-action: pan-y)
  let x0 = null;
  stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) { swiped = true; go(active + (dx < 0 ? 1 : -1)); }
  });

  addEventListener('resize', () => layout(false));
  layout(false);
  showInfo(false);
})();
