/* ==========================================================================
   AGHA PERFUMES — STATIC PDP PREVIEW
   Local preview only (product.html). Renders the same markup the Shopify
   sections output (sections/agha-pdp-*.liquid), using AGHA_PRODUCTS from
   theme.js in place of product data + metafields, then boots pdp.js.
   Not loaded on Shopify.
   ========================================================================== */

(() => {
  const root = document.querySelector('[data-pdp-preview]');
  if (!root || typeof AGHA_PRODUCTS === 'undefined') return;

  const slug = new URLSearchParams(window.location.search).get('p')
    || (window.location.pathname.match(/^\/products\/([^/]+)/) || [])[1]
    || 'oud-fury';
  const handle = AGHA_PRODUCTS[slug] ? slug : 'oud-fury';
  const product = AGHA_PRODUCTS[handle];

  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/ Of /g, ' of ');
  const money = (rupees) => (rupees == null ? 'Price on request' : `₹${Number(rupees).toLocaleString('en-IN')}`);

  // Same icon set as snippets/agha-pdp-icon.liquid
  const ICONS = {
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3v2a5 5 0 0 0 10 0V3M7 21v-2a5 5 0 0 1 10 0v2"/>',
    sample: '<path d="M10 2h4v3h-4zM9 5h6v2l1 2v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l1-2z"/><path d="M8 13h8"/>',
    delivery: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
    secure: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    seal: '<circle cx="12" cy="10" r="6"/><path d="m9.5 10 1.8 1.8L15 8.2M8.5 15l-1.5 7 5-2.5 5 2.5-1.5-7"/>',
    bag: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    heart: '<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
    expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l8-8"/>',
    flower: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8c-1.5-3.2-.6-5.8 0-6.8.6 1 1.5 3.6 0 6.8zM12 14.2c1.5 3.2.6 5.8 0 6.8-.6-1-1.5-3.6 0-6.8zM9.8 12c-3.2 1.5-5.8.6-6.8 0 1-.6 3.6-1.5 6.8 0zM14.2 12c3.2-1.5 5.8-.6 6.8 0-1 .6-3.6 1.5-6.8 0z"/>',
    wood: '<ellipse cx="7" cy="12" rx="3" ry="6"/><path d="M7 6h10c1.7 0 3 2.7 3 6s-1.3 6-3 6H7"/><path d="M7 10.5c.6 0 1 .7 1 1.5s-.4 1.5-1 1.5"/>',
    sparkle: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 16c.2 1.5.8 2.1 2.3 2.3-1.5.2-2.1.8-2.3 2.3-.2-1.5-.8-2.1-2.3-2.3 1.5-.2 2.1-.8 2.3-2.3z"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  // Mirrors Shopify's product.variants JSON (prices in minor units)
  const variants = Object.entries(product.sizes).map(([size, price], i) => ({
    id: 1000 + i,
    title: size,
    options: [size],
    price: price == null ? null : price * 100,
    compare_at_price: null,
    available: true
  }));
  const current = variants.find((v) => v.title === '50 ML') || variants[0];
  const images = product.images;
  const reviews = product.reviews || [];
  const rating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const niceTitle = titleCase(product.title);
  const tags = (product.tagline || '').split('·').map((t) => t.trim()).filter(Boolean);
  const stars = (value) => `<span class="pdp-stars" role="img" aria-label="Rated ${value.toFixed(1)} out of 5"><span class="pdp-stars__fill" style="width: ${(value / 5) * 100}%"></span></span>`;

  const eyebrow = product.eyebrow || 'Extrait de parfum · 35%';
  document.title = `${niceTitle} ${eyebrow} — AGHA PERFUMES`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.description);

  const notes = product.notes || {};
  const notesList = [['Top', notes.top], ['Heart', notes.heart], ['Base', notes.base]].filter(([, v]) => v);

  /* ---------------------------------------------------------------- 01 Hero */
  const hero = `
  <section class="pdp pdp-hero" data-pdp-main data-money-format="₹{{amount_no_decimals}}" data-product-title="${esc(niceTitle)}" data-product-handle="${handle}">
    <div class="container">
      <nav class="pdp-breadcrumb" aria-label="Breadcrumb" data-pdp-hero-item>
        <a href="/index.html">Home</a><span aria-hidden="true">/</span>
        <a href="/shop.html">Fragrances</a><span aria-hidden="true">/</span>
        <span aria-current="page">${esc(niceTitle)}</span>
      </nav>

      <div class="pdp-hero__grid">
        ${images.length > 1 ? `
        <div class="pdp-rail" aria-label="Product media">
          ${images.map((src, i) => `
            <button type="button" class="pdp-thumb${i === 0 ? ' is-active' : ''}" data-pdp-thumb="${i}" aria-label="Show image ${i + 1} of ${images.length}"${i === 0 ? ' aria-current="true"' : ''}>
              <img src="${src}" alt="" loading="lazy">
            </button>`).join('')}
        </div>` : '<div aria-hidden="true"></div>'}

        <div class="pdp-media">
          <div class="pdp-stage" data-pdp-stage>
            <div class="pdp-stage__inner" data-pdp-stage-inner>
              <div class="pdp-stage__track" data-pdp-track>
                ${images.map((src, i) => `
                  <figure class="pdp-slide${i === 0 ? ' is-active' : ''}" data-pdp-slide="${i}">
                    <img src="${src}" alt="${esc(niceTitle)} — image ${i + 1}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
                  </figure>`).join('')}
              </div>
            </div>
            <div class="pdp-stage__badge"><span class="pdp-chip pdp-chip--dot">${esc(product.family)}</span></div>
            <button type="button" class="pdp-expand" data-pdp-expand aria-label="View images full screen">${icon('expand')}</button>
            ${images.length > 1 ? `
            <div class="pdp-stage__nav">
              <span class="pdp-counter" aria-hidden="true"><span data-pdp-count>01</span>&nbsp;/&nbsp;${pad(images.length)}</span>
              <button type="button" data-pdp-media-step="-1" aria-label="Previous image">${icon('prev')}</button>
              <button type="button" data-pdp-media-step="1" aria-label="Next image">${icon('next')}</button>
            </div>` : ''}
          </div>
          ${images.length > 1 ? `
          <div class="pdp-dots" aria-hidden="true">${images.map((_, i) => `<button type="button" tabindex="-1" data-pdp-dot="${i}"${i === 0 ? ' class="is-active"' : ''}></button>`).join('')}</div>` : ''}
        </div>

        <div class="pdp-info">
          <div data-pdp-hero-item>
            <span class="pdp-eyebrow">${esc(eyebrow)}</span>
            <h1 class="pdp-title">${esc(niceTitle)}</h1>
          </div>

          ${rating ? `
          <div class="pdp-rating" data-pdp-hero-item>
            ${stars(rating)}
            <strong>${rating.toFixed(1)}</strong>
            <a href="#pdp-reviews">${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}</a>
          </div>` : ''}

          ${tags.length ? `<div class="pdp-tags" data-pdp-hero-item>${tags.map((t) => `<span class="pdp-chip">${esc(t)}</span>`).join('')}</div>` : ''}

          <p class="pdp-lede" data-pdp-hero-item>${esc(product.description)}</p>

          <div class="pdp-price" data-pdp-hero-item>
            <span class="pdp-price__amount" data-pdp-price>${money(current.price == null ? null : current.price / 100)}</span>
            <s class="pdp-price__compare" data-pdp-compare hidden></s>
            <span class="pdp-price__note"><span data-pdp-variant-title>${current.title}</span> · Inclusive of all taxes</span>
          </div>

          <form class="pdp-form" data-pdp-form novalidate data-pdp-hero-item>
            <input type="hidden" name="id" value="${current.id}" data-pdp-variant-id>

            <fieldset class="pdp-options" data-pdp-option="0">
              <legend class="pdp-options__legend"><span>Size:</span><span data-pdp-option-value>${current.title}</span></legend>
              <div class="pdp-options__grid">
                ${variants.map((v) => `
                  <label class="pdp-tile">
                    <input type="radio" name="preview-option-1" value="${v.title}"${v === current ? ' checked' : ''}>
                    <span class="pdp-tile__value">${v.title}</span>
                    <span class="pdp-tile__price">${money(v.price == null ? null : v.price / 100)}</span>
                  </label>`).join('')}
              </div>
            </fieldset>

            <div class="pdp-buy">
              <div class="pdp-qty" data-pdp-qty>
                <button type="button" data-pdp-qty-step="-1" aria-label="Decrease quantity" disabled>−</button>
                <input type="number" name="quantity" value="1" min="1" max="10" inputmode="numeric" aria-label="Quantity">
                <button type="button" data-pdp-qty-step="1" aria-label="Increase quantity">+</button>
              </div>
              <button type="submit" name="add" class="pdp-btn pdp-add" data-pdp-add>
                <span class="pdp-add__label" data-pdp-add-label>Add to bag</span>
                <span class="pdp-add__sep" aria-hidden="true">—</span>
                <span class="pdp-add__price" data-pdp-add-price>${money(current.price == null ? null : current.price / 100)}</span>
                <span class="pdp-add__progress" aria-hidden="true"></span>
              </button>
              <button type="button" class="pdp-icon-btn" data-pdp-wishlist aria-pressed="false" aria-label="Save to wishlist">${icon('heart')}</button>
            </div>
            <button type="button" class="pdp-btn pdp-btn--ghost pdp-btn--block" data-pdp-buy-now>Buy it now</button>
            <p class="pdp-stock" data-pdp-stock data-state="in" role="status">In stock · ready to dispatch</p>
            <p class="pdp-sr" data-pdp-live role="status" aria-live="polite"></p>
          </form>

          <div class="pdp-secure" data-pdp-hero-item>
            <span class="pdp-secure__icon">${icon('secure')}</span>
            <div>
              <p class="pdp-secure__title">Secure checkout</p>
              <p class="pdp-secure__text">Payments are processed securely by Shopify.</p>
            </div>
          </div>

          <div class="pdp-benefits" data-pdp-hero-item>
            ${[
              ['delivery', 'Complimentary shipping', 'On every flacon'],
              ['sample', '5 ml sample included', 'Try it on skin first'],
              ['hourglass', '90-day maceration', 'Every batch is rested'],
              ['seal', 'Individually numbered', 'Batch code on every flacon']
            ].map(([ic, t, d]) => `
              <div class="pdp-benefit"><span class="pdp-benefit__icon">${icon(ic)}</span><span class="pdp-benefit__title">${t}</span><span class="pdp-benefit__text">${d}</span></div>`).join('')}
          </div>

          <div class="pdp-delivery" data-pdp-delivery data-min-days="3" data-max-days="6" data-dispatch-days="1" data-cutoff-hour="0" data-pdp-hero-item>
            <p class="pdp-delivery__summary">${icon('time')}<span data-pdp-delivery-summary>Estimated delivery <strong data-pdp-delivery-range></strong></span></p>
            <ol class="pdp-delivery__track">
              <li class="pdp-delivery__step"><span class="pdp-delivery__icon">${icon('bag')}</span><b data-pdp-delivery-date="order"></b>Ordered</li>
              <li class="pdp-delivery__step"><span class="pdp-delivery__icon">${icon('delivery')}</span><b data-pdp-delivery-date="dispatch"></b>Dispatched</li>
              <li class="pdp-delivery__step"><span class="pdp-delivery__icon">${icon('pin')}</span><b data-pdp-delivery-date="deliver"></b>Delivered</li>
            </ol>
          </div>

          <div class="pdp-accordion" data-pdp-hero-item>
            <details data-pdp-accordion open>
              <summary>Description<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
              <div class="pdp-accordion__body"><p>${esc(product.description)}</p></div>
            </details>
            ${notesList.length ? `
            <details data-pdp-accordion>
              <summary>Fragrance notes<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
              <div class="pdp-accordion__body">
                <ul class="pdp-notes-list">${notesList.map(([k, v]) => `<li><b>${k}</b><span>${esc(v)}</span></li>`).join('')}</ul>
              </div>
            </details>` : ''}
            <details data-pdp-accordion>
              <summary>How to wear<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
              <div class="pdp-accordion__body"><p>One to two sprays is enough. At 35% concentration an extrait is considerably denser than an eau de parfum — apply to pulse points or clothing rather than layering.</p></div>
            </details>
            <details data-pdp-accordion>
              <summary>Shipping<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
              <div class="pdp-accordion__body"><p>Complimentary shipping on every flacon, hand-wrapped in matte black hardboard with a 5 ml sample inside. Your estimated delivery window is shown above.</p></div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <script type="application/json" data-pdp-variants>${JSON.stringify(variants)}</script>
    <script type="application/json" data-pdp-settings>{"lowStockThreshold": 5, "inStockText": "In stock · ready to dispatch"}</script>

    <div class="pdp-dock" data-pdp-dock aria-hidden="true">
      <div class="pdp-dock__inner">
        <img class="pdp-dock__thumb" src="${images[0]}" alt="" loading="lazy">
        <div>
          <p class="pdp-dock__title">${esc(niceTitle)}</p>
          <p class="pdp-dock__meta" data-pdp-variant-title>${current.title}</p>
        </div>
        <span class="pdp-dock__spacer"></span>
        <span class="pdp-dock__price" data-pdp-price>${money(current.price == null ? null : current.price / 100)}</span>
        <button type="button" class="pdp-btn pdp-add" data-pdp-dock-add tabindex="-1">
          <span class="pdp-add__label" data-pdp-add-label>Add to bag</span>
          <span class="pdp-add__progress" aria-hidden="true"></span>
        </button>
      </div>
    </div>

    <dialog class="pdp-lightbox" data-pdp-lightbox aria-label="${esc(niceTitle)} images">
      <div class="pdp-lightbox__bar">
        <span><span data-pdp-lightbox-count>01</span> / ${pad(images.length)}</span>
        <button type="button" data-pdp-lightbox-close>Close ✕</button>
      </div>
      <div class="pdp-lightbox__stage" data-pdp-lightbox-stage></div>
      ${images.length > 1 ? `
      <div class="pdp-lightbox__nav">
        <button type="button" data-pdp-lightbox-step="-1">← Previous</button>
        <button type="button" data-pdp-lightbox-step="1">Next →</button>
      </div>` : ''}
    </dialog>
  </section>`;

  /* ------------------------------------------------------------ 02 Features */
  const features = [
    ['drop', '35%', 'Perfume oil', 'Extrait strength — most perfumes stop at 12–15%.'],
    product.longevity && ['time', product.longevity, 'Lasting on skin', 'And for days on wool and cashmere.'],
    ['hourglass', '90 days', 'Macerated', 'Every batch rests before it is bottled.'],
    ['sample', '5 ml', 'Sample included', 'Try it on skin before you open the flacon.']
  ].filter(Boolean);

  const featuresSection = `
  <section class="pdp pdp-section pdp-features" data-pdp-features>
    <div class="container">
      <div class="pdp-features__grid">
        ${features.map(([ic, value, title, text]) => `
          <div class="pdp-feature" data-pdp-card>
            <span class="pdp-feature__icon">${icon(ic)}</span>
            <p class="pdp-feature__value">${esc(value)}</p>
            <p class="pdp-feature__title">${esc(title)}</p>
            <p class="pdp-feature__text">${esc(text)}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>`;

  /* ---------------------------------------------------- 03 Notes collage */
  const collage = notesList.length ? `
  <section class="pdp pdp-section pdp-notes" data-pdp-notes>
    <div class="container">
      <header class="pdp-heading" data-pdp-reveal>
        <span class="pdp-eyebrow">The composition</span>
        <h2>Fragrance notes</h2>
        <p>Three movements, from the first spray to the trail that stays on wool the next morning.</p>
      </header>
      <div class="pdp-collage">
        ${notes.top ? tile('top', 'Top note', 'First 30 minutes', notes.top) : ''}
        ${notes.heart ? tile('heart', 'Heart note', '30 min – 4 hours', notes.heart) : ''}
        <div class="pdp-collage__bottle" data-pdp-card>
          <img src="${images[0]}" alt="${esc(niceTitle)} flacon" loading="lazy">
          <div class="pdp-collage__caption"><b>${esc(niceTitle)}</b><span>${esc(product.family)}</span></div>
        </div>
        ${notes.base ? tile('base', 'Base note', '4 – 14+ hours', notes.base, !product.keyMaterial) : ''}
        ${product.keyMaterial ? `
        <div class="pdp-tile-note pdp-tile-note--key" data-pdp-card>
          <div class="pdp-tile-note__head"><span class="pdp-chip">Key material</span></div>
          <div>
            <p class="pdp-tile-note__name">${esc(product.keyMaterial.name)}</p>
            <p class="pdp-tile-note__text" style="margin-top: 10px;">${esc(product.keyMaterial.text)}</p>
          </div>
        </div>` : ''}
      </div>
    </div>
  </section>` : '';

  function tile(kind, label, time, list, tall = false) {
    return `
        <div class="pdp-tile-note pdp-tile-note--${kind}${tall ? ' pdp-tile-note--tall' : ''}" data-pdp-card>
          <div class="pdp-tile-note__head"><span class="pdp-chip">${label}</span><span class="pdp-tile-note__time">${time}</span></div>
          <p class="pdp-tile-note__notes">${list.split(',').map((n) => `<span class="pdp-tile-note__note">${esc(n.trim())}</span>`).join('')}</p>
        </div>`;
  }

  /* --------------------------------------------------------------- 04 Story */
  const facts = [product.family, product.mood && `Mood · ${product.mood}`, product.sillage && `Sillage · ${product.sillage}`].filter(Boolean);
  const story = product.story ? `
  <section class="pdp pdp-section pdp-story" data-pdp-story>
    <div class="container pdp-story__grid">
      <div class="pdp-story__media" data-pdp-story-media style="--pdp-focal: 50% 56%; --pdp-zoom: 1.9;">
        <div class="pdp-story__zoom"><img src="${images[0]}" alt="${esc(niceTitle)} label, close up" loading="lazy"></div>
      </div>
      <div data-pdp-reveal>
        <span class="pdp-eyebrow">The story</span>
        <h2 class="pdp-story__title">${esc(product.story.heading)}</h2>
        <div class="pdp-story__body"><p>${esc(product.story.body)}</p></div>
        <div class="pdp-story__facts">${facts.map((f) => `<span class="pdp-chip">${esc(f)}</span>`).join('')}</div>
      </div>
    </div>
  </section>` : '';

  /* --------------------------------------------------------------- 05 Craft */
  const steps = [
    ['Source', 'Wild Cambodian agarwood from Assam, Florentine iris root aged for three years, and Madagascan pink pepper — harvested by hand.'],
    ['Compound', 'Each extrait is compounded at an uncompromised 35% oil concentration, where traditional houses dilute to 12–15%.'],
    ['Macerate', 'The mixture matures in temperature-stabilised obsidian vaults for 90 days, so it wears without a harsh alcohol opening.'],
    ['Finish', 'Each flacon is laser-engraved with its batch code and compounding date, then hand-wrapped in matte black hardboard.']
  ];

  const craft = `
  <section class="pdp pdp-section pdp-craft" data-pdp-craft>
    <div class="container">
      <header class="pdp-heading" data-pdp-reveal>
        <span class="pdp-eyebrow">How it's made</span>
        <h2>Ninety days to a flacon</h2>
      </header>
      <div class="pdp-steps-wrap" data-pdp-steps>
        <span class="pdp-steps__line" aria-hidden="true"><span class="pdp-steps__progress" data-pdp-steps-progress></span></span>
        <ol class="pdp-steps">
        ${steps.map(([title, text], i) => `
          <li class="pdp-step" data-pdp-step>
            <span class="pdp-step__index">${pad(i + 1)}</span>
            <h3 class="pdp-step__title">${title}</h3>
            <p class="pdp-step__text">${text}</p>
          </li>`).join('')}
        </ol>
      </div>
    </div>
  </section>`;

  /* ------------------------------------------ Discover the fragrance (notes) */
  // Mirrors sections/agha-pdp-fragrance-notes.liquid. Same sources, preview names:
  //   notes.top / notes.heart / notes.base  → custom.top_notes / heart_notes / base_notes
  //   family                                → custom.family
  //   scentCharacter → tagline → mood       → custom.scent_character → custom.scent_tags → custom.mood
  //   longevity (+ sillage)                 → custom.longevity (+ custom.sillage)
  const character = product.scentCharacter || tags.join(', ') || product.mood || '';
  const fnote = (slot, side, ic, label, text, { list, value, detail } = {}) => `
        <div class="pdp-fnote pdp-fnote--${side}" style="grid-area: ${slot};" data-pdp-fnote data-side="${side}">
          <span class="pdp-fnote__icon">${icon(ic)}</span>
          <div class="pdp-fnote__body">
            <h3 class="pdp-fnote__label">${label}</h3>
            <p class="pdp-fnote__value">${list
              ? list.split(',').map((n) => `<span class="pdp-fnote__note">${esc(n.trim())}</span>`).join('')
              : esc(value)}</p>
            ${detail ? `<p class="pdp-fnote__detail">Sillage · ${esc(detail)}</p>` : ''}
            <p class="pdp-fnote__text">${text}</p>
          </div>
          <span class="pdp-fnote__rule" aria-hidden="true"></span>
        </div>`;
  const fnoteItems = [
    notes.top && fnote('l1', 'left', 'leaf', 'Top notes', 'The opening you meet first.', { list: notes.top }),
    notes.heart && fnote('l2', 'left', 'flower', 'Heart notes', 'The character that unfolds.', { list: notes.heart }),
    notes.base && fnote('r1', 'right', 'wood', 'Base notes', 'What stays on the skin.', { list: notes.base }),
    product.family && fnote('l3', 'left', 'drop', 'Fragrance family', 'Where it sits in the house.', { value: product.family }),
    character && fnote('r2', 'right', 'sparkle', 'Scent character', 'How it feels to wear.', { value: character }),
    product.longevity && fnote('r3', 'right', 'time', 'Longevity', 'How long it stays with you.', { value: product.longevity, detail: product.sillage })
  ].filter(Boolean);
  // Like the Liquid, only render when the product carries note data (family alone is not enough here,
  // since every preview product has one; the real line-up has no confirmed notes yet).
  const hasNoteData = notes.top || notes.heart || notes.base || product.scentCharacter || product.longevity;
  const fragranceNotes = hasNoteData ? `
  <section class="pdp pdp-section pdp-fnotes" data-pdp-fnotes aria-labelledby="fnotes-title">
    <div class="container">
      <header class="pdp-heading" data-pdp-reveal>
        <span class="pdp-eyebrow">The notes</span>
        <h2 id="fnotes-title">Discover the Fragrance</h2>
        <p>Explore the notes that shape this fragrance.</p>
      </header>
      <div class="pdp-fnotes__stage">
        <figure class="pdp-fnotes__image" data-pdp-fnotes-image>
          <img src="${images[0]}" alt="${esc(niceTitle)}" loading="lazy" width="1100" height="1430">
        </figure>
        ${fnoteItems.join('')}
      </div>
    </div>
  </section>` : '';

  /* ------------------------------------------------------------- 06 Reviews */
  const reviewsSection = `
  <section class="pdp pdp-section pdp-reviews" id="pdp-reviews" data-pdp-reviews>
    <div class="container">
      <header class="pdp-heading pdp-heading--left" data-pdp-reveal>
        <span class="pdp-eyebrow">Reviews</span>
        <h2>What patrons say</h2>
      </header>
      <div class="pdp-reviews__grid">
        <div class="pdp-reviews__summary" data-pdp-reveal>
          <span class="pdp-eyebrow">Average rating</span>
          ${rating ? `
            <p class="pdp-reviews__score">${rating.toFixed(1)}</p>
            ${stars(rating)}
            <p class="pdp-reviews__count">Based on ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}</p>` : '<p class="pdp-reviews__count">No ratings yet</p>'}
        </div>
        <div class="pdp-reviews__list">
          ${reviews.length ? reviews.map((r) => `
            <article class="pdp-review" data-pdp-review>
              ${stars(r.rating)}
              <p class="pdp-review__body">${esc(r.body)}</p>
              <div class="pdp-review__meta">
                <span class="pdp-review__avatar" aria-hidden="true">${esc(r.author.charAt(0))}</span>
                <p class="pdp-review__who">${esc(r.author)}<span>${r.location ? esc(r.location) : ''}${r.verified ? ' · <span class="pdp-review__verified">Verified purchase</span>' : ''}</span></p>
              </div>
            </article>`).join('') : '<p class="pdp-reviews__empty">No reviews yet. Be the first to tell us how it wears on you.</p>'}
        </div>
      </div>
    </div>
  </section>`;

  /* ----------------------------------------------------------------- 07 FAQ */
  const faqs = [
    ['How many sprays should I use?', 'One to two sprays is enough. At 35% concentration an extrait is considerably denser than an eau de parfum — apply to pulse points or clothing rather than layering.'],
    ['Which size should I choose?', 'If you haven’t worn AGHA before, the Discovery Collection holds five of our extraits in 5 × 5 ml so you can wear each one for a few days before committing to a full flacon.'],
    ['What arrives in the box?', 'The numbered flacon, hand-wrapped in matte black hardboard, with a complimentary 5 ml sample.'],
    ['Why is every batch rested for 90 days?', 'Maceration lets the raw materials bind. Resting each batch in temperature-stabilised vaults removes the sharp alcohol edge you notice in the first minutes of many perfumes.']
  ];

  const faq = `
  <section class="pdp pdp-section pdp-faq">
    <div class="container pdp-faq__wrap">
      <header class="pdp-heading" data-pdp-reveal>
        <span class="pdp-eyebrow">FAQ</span>
        <h2>Before you choose</h2>
      </header>
      <div class="pdp-accordion" data-pdp-reveal>
        ${faqs.map(([q, a]) => `
          <details data-pdp-accordion>
            <summary>${q}<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
            <div class="pdp-accordion__body"><p>${a}</p></div>
          </details>`).join('')}
      </div>
    </div>
  </section>`;

  /* ------------------------------------------------------------- 08 Related */
  const others = Object.entries(AGHA_PRODUCTS).filter(([key]) => key !== handle).slice(0, 4);
  const related = `
  <section class="pdp pdp-section pdp-related" data-pdp-related>
    <div class="container">
      <div class="pdp-related__head">
        <header class="pdp-heading pdp-heading--left" data-pdp-reveal>
          <span class="pdp-eyebrow">Explore the house</span>
          <h2>You may also like</h2>
        </header>
        <a class="pdp-link" href="/shop.html">View all</a>
      </div>
      <div class="pdp-related__grid">
        ${others.map(([key, p]) => `
          <a class="pdp-rel" href="/product.html?p=${key}" data-pdp-card>
            <div class="pdp-rel__frame"><img src="${p.images[0]}" alt="${esc(titleCase(p.title))}" loading="lazy"></div>
            <div class="pdp-rel__body">
              <span class="pdp-rel__meta">${esc(p.family)}</span>
              <h3 class="pdp-rel__title">${esc(titleCase(p.title))}</h3>
              <span class="pdp-rel__price">${money(p.sizes['50 ML'] ?? Object.values(p.sizes)[0])}</span>
            </div>
          </a>`).join('')}
      </div>
    </div>
  </section>`;

  /* ----------------------------------------------------------- 09 Banner */
  const finale = `
  <section class="pdp pdp-finale" data-pdp-finale>
    <div class="container">
      <div class="pdp-banner" data-pdp-banner>
        <div class="pdp-banner__copy" data-pdp-reveal>
          <span class="pdp-eyebrow">The discovery collection</span>
          <h2 class="pdp-banner__title">Not sure yet? Wear five before you choose.</h2>
          <p class="pdp-banner__text">Five of our extraits in 5 × 5 ml, in a matte black hardboard box lined with crushed velvet.</p>
          <a class="pdp-btn pdp-btn--light" href="/discover.html">Explore the set →</a>
        </div>
        <div class="pdp-banner__media" style="--pdp-focal: 50% 50%;">
          <img src="/assets/discovery_box.jpg" alt="The AGHA discovery collection, five numbered vials in a black box" loading="lazy">
        </div>
      </div>
    </div>
    <div class="pdp-dock-spacer" aria-hidden="true"></div>
  </section>`;

  root.innerHTML = hero + featuresSection + collage + story + craft + fragranceNotes + reviewsSection + faq + related + finale;
  window.AghaPDP?.init();
})();
