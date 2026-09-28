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
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8c-1.5-3.5-5.5-4-5.5-1.5S10 8 12 8zM12 8c1.5-3.5 5.5-4 5.5-1.5S14 8 12 8z"/>',
    tag: '<path d="M3 12.6V4.2c0-.7.5-1.2 1.2-1.2h8.4L21 11.4a1.4 1.4 0 0 1 0 2l-7.6 7.6a1.4 1.4 0 0 1-2 0z"/><circle cx="7.8" cy="7.8" r="1.4"/>',
    card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 14.5h4"/>',
    person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    sparkle: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 16c.2 1.5.8 2.1 2.3 2.3-1.5.2-2.1.8-2.3 2.3-.2-1.5-.8-2.1-2.3-2.3 1.5-.2 2.1-.8 2.3-2.3z"/>'
  };

  // Payment badges. On Shopify these are the store's enabled methods drawn by payment_type_svg_tag;
  // here, simple stand-ins in the same 38 × 24 card so the row reads the same.
  const badge = (label, inner) => `<li><svg viewBox="0 0 38 24" width="38" height="24" role="img" aria-label="${label}"><rect x=".5" y=".5" width="37" height="23" rx="3" fill="#fff" stroke="#E2E0DC"/>${inner}</svg></li>`;
  const PAY_BADGES = [
    badge('Visa', '<text x="19" y="16" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" font-style="italic" fill="#1A1F71">VISA</text>'),
    badge('Mastercard', '<circle cx="15.5" cy="12" r="6" fill="#EB001B"/><circle cx="22.5" cy="12" r="6" fill="#F79E1B"/><path d="M19 7.1a6 6 0 0 1 0 9.8 6 6 0 0 1 0-9.8z" fill="#FF5F00"/>'),
    badge('RuPay', '<text x="17" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="700" font-style="italic" fill="#1B3F8B">RuPay</text><path d="M29 8l4 4-4 4z" fill="#F37021"/><path d="M26.5 8l4 4-4 4z" fill="#128A43"/>'),
    badge('UPI', '<text x="16.5" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" font-style="italic" fill="#5F6368">UPI</text><path d="M26 7l3.5 5L26 17z" fill="#F37021"/><path d="M28.5 7l3.5 5-3.5 5z" fill="#128A43"/>'),
    badge('American Express', '<rect x="3" y="4" width="32" height="16" rx="2" fill="#2E77BC"/><text x="19" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#fff">AMEX</text>'),
    badge('Google Pay', '<text x="19" y="15.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700"><tspan fill="#4285F4">G</tspan><tspan fill="#5F6368"> Pay</tspan></text>')
  ].join('');
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  // Mirrors Shopify's product.variants JSON (prices in minor units)
  const variants = Object.entries(product.sizes).map(([size, price], i) => ({
    id: 1000 + i,
    title: size,
    options: [size],
    price: price == null ? null : price * 100,
    compare_at_price: product.compare && product.compare[size] ? product.compare[size] * 100 : null,
    available: true
  }));
  const current = variants.find((v) => v.title === '50 ML') || variants[0];
  const images = product.images;
  const reviews = product.reviews || [];
  // Rating, review count, best-seller and stock come from the shared mock catalog (assets/hoa-commerce.js), so this page
  // agrees with the shop cards. The review cards below are only sample write-ups.
  const cat = window.HOA && window.HOA.ready ? window.HOA.product(handle) : null;
  const sampleRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const rating = cat && cat.reviewCount ? cat.rating : sampleRating;
  const stockNow = cat && window.HOA.stockState(cat).state !== 'in' ? window.HOA.stockState(cat) : { state: 'in', text: '' };
  const reviewCount = cat && cat.reviewCount ? cat.reviewCount : reviews.length;
  const niceTitle = titleCase(product.title);
  const tags = (product.tagline || '').split('·').map((t) => t.trim()).filter(Boolean);
  const stars = (value) => `<span class="pdp-stars" role="img" aria-label="Rated ${value.toFixed(1)} out of 5"><span class="pdp-stars__fill" style="width: ${(value / 5) * 100}%"></span></span>`;

  const eyebrow = product.eyebrow || 'Eau de Parfum';
  // Console data — same sources as the Liquid: catalog wearer / best-seller / coupon / shipping threshold.
  const wearerLabel = ({ men: 'For him', women: 'For her', unisex: 'Unisex' })[(cat && cat.wearer) || ''] || '';
  const isBest = Boolean(cat && cat.isBestSeller);
  const onSale = current.compare_at_price > current.price;
  const unitRupees = current.price == null ? 0 : current.price / 100;
  const welcome = window.HOA && window.HOA.ready ? window.HOA.coupon.primary() : null;
  const shipThreshold = window.HOA && window.HOA.ready ? window.HOA.threshold : 0;
  // Value stack (templates/product.json blocks): longevity, wearer, concentration — only facts the product has
  const values = [
    product.longevity && ['time', 'Longevity', /last/i.test(product.longevity) ? product.longevity : 'Lasts ' + product.longevity],
    wearerLabel && ['person', 'Made for', wearerLabel],
    ['drop', 'Concentration', 'Eau de Parfum']
  ].filter(Boolean);
  document.title = `${niceTitle} ${eyebrow} — AGHA PERFUMES`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.description);

  const notes = product.notes || {};
  const notesList = [['Top', notes.top], ['Heart', notes.heart], ['Base', notes.base]].filter(([, v]) => v);

  /* ------------------------------------ Why we are better: proof blocks inside Description (templates/product.json `proof` blocks) */
  const pdxIcon = (name) => {
    const paths = {
      badge: '<path d="M32 2 L37.4 5.7 L44 5.2 L46.8 11.2 L52.8 14 L52.3 20.6 L56 26 L52.3 31.4 L52.8 38 L46.8 40.8 L44 46.8 L37.4 46.3 L32 50 L26.6 46.3 L20 46.8 L17.2 40.8 L11.2 38 L11.7 31.4 L8 26 L11.7 20.6 L11.2 14 L17.2 11.2 L20 5.2 L26.6 5.7 Z"/><circle cx="32" cy="26" r="15"/><path d="M25 26l5 5 9-10"/><path d="M23 47l-5 14 9-4 5 5V50M41 47l5 14-9-4"/>',
      bottle: '<rect x="25" y="4" width="14" height="9"/><path d="M22 13h20v6H22z"/><rect x="16" y="19" width="32" height="41"/><rect x="22" y="29" width="20" height="24"/><path d="M22 43h20"/>',
      hourglass: '<path d="M14 6h36M14 58h36M18 6c0 12 14 16 14 26S18 46 18 58M46 6c0 12-14 16-14 26s14 14 14 26"/><path d="M24 52c4-2 12-2 16 0M28 14h8"/>',
      ifra: '<path d="M11 46A26 26 0 1 1 22 55"/><text x="32" y="40" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="20" fill="currentColor" stroke="none">ifra</text>'
    };
    return `<svg class="pdx-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
  };
  const whyItems = [
    ['badge', 'Certified<br>perfumers', 'Hong Kong<br>School of Perfumery'],
    ['bottle', '35% pure<br>parfum', 'Extrait de parfum'],
    ['hourglass', 'Aged for<br>weeks', 'Smooth and refined'],
    ['ifra', 'IFRA<br>certified', 'High-grade, skin safe']
  ];

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
        <!-- Product visual story: mirrors sections/agha-pdp-main.liquid -->
        <div class="pdp-media pdp-story${images.length < 2 ? ' pdp-story--single' : ''}" data-pdp-story data-pdp-thumbs style="--pdp-n: ${images.length}">
          <div class="pdp-stage" data-pdp-stage>
            <div class="pdp-stage__inner" data-pdp-stage-inner>
              <div class="pdp-stage__track" data-pdp-track>
                ${images.map((src, i) => `
                  <figure class="pdp-slide${i === 0 ? ' is-active' : ''}" data-pdp-slide="${i}">
                    <img src="${src}" alt="${esc(niceTitle)} — image ${i + 1} of ${images.length}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
                    ${i === 0 ? `<div class="pdp-slide__tags" aria-hidden="true"><span class="pdp-chip pdp-chip--dot">${esc(product.family)}</span>${cat && cat.isBestSeller ? '<span class="pdp-chip pdp-chip--best">Best seller</span>' : ''}</div>` : ''}
                  </figure>`).join('')}
              </div>
            </div>
            <div class="pdp-stage__badge"><span class="pdp-chip pdp-chip--dot">${esc(product.family)}</span>${cat && cat.isBestSeller ? '<span class="pdp-chip pdp-chip--best">Best seller</span>' : ''}</div>
            <button type="button" class="pdp-expand" data-pdp-expand aria-label="View images full screen">${icon('expand')}</button>
            ${images.length > 1 ? `
            <div class="pdp-story__progress" aria-hidden="true">
              <span><span data-pdp-count>01</span>&nbsp;/&nbsp;${pad(images.length)}</span>
              <span class="pdp-story__bar"><i data-pdp-bar></i></span>
            </div>` : ''}
          </div>
          ${images.length > 1 ? `
          <div class="pdp-thumbs" role="group" aria-label="Product images">
            ${images.map((src, i) => `<button type="button" class="pdp-thumb${i === 0 ? ' is-active' : ''}" data-pdp-thumb="${i}" aria-label="Show image ${i + 1} of ${images.length}" aria-current="${i === 0 ? 'true' : 'false'}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}
          </div>` : ''}
          <div class="pdp-more" aria-label="More views">
            ${images.slice(1).concat(['/assets/hoa-oud-fury-smoke.webp', '/assets/hoa-oud-fury-portrait.webp', '/assets/hoa-ingredients-tobacco.webp']).slice(0, 4).map((src) => `<figure class="pdp-more__tile"><img src="${src}" alt="${esc(niceTitle)}" loading="lazy"></figure>`).join('')}
          </div>
        </div>

        <!-- Purchase console: mirrors sections/agha-pdp-main.liquid -->
        <div class="pdp-info pdp-console" data-pdp-console>
          ${welcome ? `
          <a class="pdp-banner-offer" href="#pdp-deals-preview" data-pdp-hero-item>${icon('gift')}<span><b>${esc(welcome.description)}</b><span class="pdp-banner-offer__code">Code ${esc(welcome.code)}</span></span></a>` : ''}

          <div class="pdp-console__id" data-pdp-hero-item>
            ${values.length ? `
            <ul class="pdp-values" role="list">
              ${values.map(([ic, title, text]) => `<li class="pdp-value"><span class="pdp-value__icon">${icon(ic)}</span><span class="pdp-value__title pdp-sr">${esc(title)}: </span><span class="pdp-value__text">${esc(text)}</span></li>`).join('')}
            </ul>` : ''}
            <h1 class="pdp-title">${esc(niceTitle)}</h1>
            ${product.family ? `<p class="pdp-console__family">${esc(product.family)}</p>` : ''}
            <p class="pdp-lede">${esc(product.description)}</p>
          </div>

          ${rating ? `
          <div class="pdp-rating" data-pdp-hero-item>
            ${rating ? `<a class="pdp-rating__link" href="#pdp-reviews">${stars(rating)}<strong>${rating.toFixed(1)}</strong><span class="pdp-rating__count">${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}</span></a>` : ''}
          </div>` : ''}

          <div class="pdp-price" data-pdp-hero-item>
            <span class="pdp-price__amount" data-pdp-price>${money(current.price == null ? null : current.price / 100)}</span>
            <s class="pdp-price__compare" data-pdp-compare${onSale ? '' : ' hidden'}><span class="pdp-sr">MRP </span>${onSale ? money(current.compare_at_price / 100) : ''}</s>
            <span class="pdp-price__note">
              <span class="pdp-savings" data-pdp-savings${onSale ? '' : ' hidden'}>${onSale ? 'You save ' + money((current.compare_at_price - current.price) / 100) : ''}</span>
              <span class="pdp-price__save" data-pdp-save${onSale ? '' : ' hidden'}>${onSale ? Math.round(((current.compare_at_price - current.price) * 100) / current.compare_at_price) + '% off' : ''}</span>
              <span class="pdp-price__tax">Inclusive of all taxes</span>
            </span>
          </div>

          ${(welcome || shipThreshold) ? `
          <section class="pdp-deals" aria-labelledby="pdp-deals-preview" data-pdp-hero-item>
            <h2 class="pdp-deals__head" id="pdp-deals-preview">${icon('sparkle')}<span>Exclusive offers</span></h2>
            <ul class="pdp-deals__list" role="list">
              ${welcome ? `
              <li class="pdp-deal pdp-deal--lead" data-pdp-deal data-percent="${welcome.type === 'percent' ? welcome.value : ''}">
                <span class="pdp-deal__icon">${icon('gift')}</span>
                <span class="pdp-deal__body">
                  <span class="pdp-deal__label">${esc(welcome.label)}</span>
                  <span class="pdp-deal__title">${welcome.type === 'percent' ? `Get it for <b data-pdp-deal-price>${money(Math.round(unitRupees * (100 - welcome.value) / 100))}</b>` : esc(welcome.description)}</span>
                  <span class="pdp-deal__text">${esc(welcome.description.charAt(0).toUpperCase() + welcome.description.slice(1))}</span>
                </span>
                <button type="button" class="pdp-deal__code" data-pdp-code="${esc(welcome.code)}" aria-label="Copy and apply code ${esc(welcome.code)}">
                  <span class="pdp-deal__code-text">${esc(welcome.code)}</span><span class="pdp-deal__code-act" data-pdp-code-act>Copy</span>
                </button>
              </li>` : ''}
              ${shipThreshold ? `
              <li class="pdp-deal pdp-deal--auto" data-pdp-ship data-threshold="${shipThreshold * 100}">
                <span class="pdp-deal__icon">${icon('delivery')}</span>
                <span class="pdp-deal__body">
                  <span class="pdp-deal__label">Complimentary shipping</span>
                  <span class="pdp-deal__title" data-pdp-ship-text>Free on orders above ${money(shipThreshold)}</span>
                </span>
                <span class="pdp-deal__auto">Auto-applied</span>
              </li>` : ''}
            </ul>
            <p class="pdp-sr" data-pdp-code-live role="status" aria-live="polite"></p>
          </section>` : ''}

          <form class="pdp-form" data-pdp-form novalidate data-pdp-hero-item>
            <input type="hidden" name="id" value="${current.id}" data-pdp-variant-id>

            <fieldset class="pdp-options" data-pdp-option="0"${variants.length < 2 ? ' hidden' : ''}>
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

            <fieldset class="pdp-offers" data-pdp-offers data-unit="bottle" data-image="${esc(String(images[0] || '').replace(/(hoa-product-[a-z-]+)\.webp$/, '$1-sm.webp'))}" hidden>
              <legend class="pdp-offers__legend"><span>Buy more, save more</span></legend>
              <div class="pdp-offers__list" data-pdp-offers-list></div>
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
              <button type="button" class="pdp-icon-btn" data-pdp-wishlist data-wishlist-toggle data-wishlist-handle="${esc(handle)}" aria-pressed="false" aria-label="Save to wishlist">${icon('heart')}</button>
            </div>
            <button type="button" class="pdp-btn pdp-btn--ghost pdp-btn--block pdp-buynow" data-pdp-buy-now>Buy it now</button>
            <div class="pdp-paybadges">
              <span class="pdp-paybadges__label">${icon('secure')}Secure checkout</span>
              <ul class="pdp-paybadges__list" role="list" aria-label="Accepted payment methods">${PAY_BADGES}</ul>
            </div>
            <p class="pdp-stock" data-pdp-stock data-state="${stockNow.state}" role="status">${stockNow.text || 'In stock · ready to dispatch'}</p>
            <p class="pdp-sr" data-pdp-live role="status" aria-live="polite"></p>
          </form>

          <div class="pdp-deliver" data-pdp-delivery data-pdp-pincode data-min-days="3" data-max-days="6" data-dispatch-days="1" data-cutoff-hour="0" data-serviceability-url="" data-pdp-hero-item>
            <form class="pdp-deliver__form" data-pdp-pincode-form novalidate>
              <label class="pdp-deliver__label" for="pdp-pin-preview">${icon('pin')}Check delivery</label>
              <span class="pdp-deliver__field">
                <input id="pdp-pin-preview" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="Enter pincode" data-pdp-pincode-input aria-describedby="pdp-pin-msg-preview">
                <button type="submit" class="pdp-deliver__btn">Check</button>
              </span>
            </form>
            <p class="pdp-deliver__msg" id="pdp-pin-msg-preview" data-pdp-pincode-msg role="status" aria-live="polite">${icon('delivery')}<span data-pdp-delivery-summary>Estimated delivery <strong data-pdp-delivery-range></strong></span></p>
          </div>

          <div class="pdp-trust" data-pdp-hero-item>
            <ul class="pdp-trust__list" role="list">
              ${[
                ['delivery', 'Complimentary shipping', shipThreshold ? 'On orders above ' + money(shipThreshold) + ', wrapped in matte black hardboard.' : 'Wrapped in matte black hardboard.'],
                ['sample', '5 ml sample included', 'Try it on skin before you open the flacon.'],
                ['seal', 'Numbered and batch-coded', 'Every flacon is laser-engraved with its batch code and compounding date.']
              ].map(([ic, t, d]) => `<li class="pdp-trust__item"><span class="pdp-trust__icon">${icon(ic)}</span><span><b>${t}</b><small>${d}</small></span></li>`).join('')}
            </ul>
          </div>
          <div class="pdp-accordion" data-pdp-hero-item>
            <details data-pdp-accordion open>
              <summary>Description<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
              <div class="pdp-accordion__body"><p>${esc(product.description)}</p>
                <ul class="pdp-proofs" role="list" aria-label="Why we are better">
                  ${whyItems.map((w) => `<li class="pdp-proof"><span class="pdp-proof__icon">${pdxIcon(w[0])}</span><b class="pdp-proof__title">${w[1]}</b><small class="pdp-proof__text">${w[2]}</small></li>`).join('')}
                </ul>
              </div>
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
              <div class="pdp-accordion__body"><p>${shipThreshold ? 'Complimentary shipping on orders above ' + money(shipThreshold) + '. ' : ''}Every flacon is hand-wrapped in matte black hardboard with a 5 ml sample inside. Check your pincode above for an estimated delivery date.</p></div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <script type="application/json" data-pdp-variants>${JSON.stringify(variants)}</script>
    <script type="application/json" data-pdp-stock-levels>${JSON.stringify(Object.fromEntries(variants.map((v) => [v.id, cat && cat.inventory != null ? cat.inventory : null])))}</script>
    <script type="application/json" data-pdp-settings>{"lowStockThreshold": 5, "inStockText": "In stock · ready to dispatch"}</script>

    <div class="pdp-dock" data-pdp-dock aria-hidden="true">
      <div class="pdp-dock__inner">
        <img class="pdp-dock__thumb" src="${images[0]}" alt="" loading="lazy">
        <div>
          <p class="pdp-dock__title">${esc(niceTitle)}</p>
          <p class="pdp-dock__meta" data-pdp-variant-title>${current.title}</p>
        </div>
        <span class="pdp-dock__spacer"></span>
        <span class="pdp-dock__prices">
          <span class="pdp-dock__price" data-pdp-price>${money(current.price == null ? null : current.price / 100)}</span>
          <s class="pdp-dock__was" data-pdp-dock-was${onSale ? '' : ' hidden'}>${onSale ? money(current.compare_at_price / 100) : ''}</s>
        </span>
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

  /* ------------------------------------------------- The fragrance ("image with benefits") */
  // Mirrors sections/agha-pdp-the-fragrance.liquid. Same sources, preview names:
  //   notes.top / notes.heart / notes.base → custom.top_notes / heart_notes / base_notes (left column)
  //   claims (array)                       → custom.claims + "claim:" product tags (right column)
  //   family                               → custom.family
  // A note block without data is left out; a claim is icon + wording only, no invented text
  // under it. Renders nothing without data, like the Liquid.
  //
  // TEMPORARY LOCAL-DEV FALLBACK — Shopify is not connected yet, so the real handles below
  // have no metafields to read. DEV_FRAGRANCE_MOCK is placeholder content only, isolated here
  // so it is easy to delete once real notes/claims exist. It is used ONLY when a product has
  // no real data (AGHA_PRODUCTS[handle].notes / .claims, standing in for Shopify metafields);
  // real data always wins, and handles not listed here still render nothing without data.
  const DEV_FRAGRANCE_MOCK = {
    'oud-fury': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
    'agha-blue': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
    maha: { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
    'oud-royal': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] }
  };
  const tfMock = DEV_FRAGRANCE_MOCK[handle];
  // "Shopify data" here is AGHA_PRODUCTS[handle].notes / .claims — real data always takes priority.
  const tfTop = notes.top || (tfMock && tfMock.topNotes.join(', ')) || '';
  const tfHeart = notes.heart || (tfMock && tfMock.heartNotes.join(', ')) || '';
  const tfBase = notes.base || (tfMock && tfMock.baseNotes.join(', ')) || '';
  const tfClaimsData = (product.claims && product.claims.length) ? product.claims : (tfMock ? tfMock.claims : []);

  const tfBlock = (icon2, title, text, side) => `
          <li class="pdp-tf__block" data-pdp-tf-block data-side="${side}">
            <span class="pdp-tf__block-icon">${icon(icon2)}</span>
            <span class="pdp-tf__block-copy">
              <span class="pdp-tf__block-title">${esc(title)}</span>
              ${text ? `<span class="pdp-tf__block-text">${esc(text)}</span>` : ''}
            </span>
          </li>`;
  const noteKey = (name) => {
    const n = name.toLowerCase();
    if (n.includes('rose')) return 'rose';
    if (n.includes('iris')) return 'iris';
    if (n.includes('pepper')) return 'pepper';
    if (n.includes('oud') || n.includes('agar')) return 'oud';
    if (n.includes('musk')) return 'musk';
    if (n.includes('sandal')) return 'sandalwood';
    return n.trim().replace(/[^a-z0-9]+/g, '-');
  };
  const tfNotesBlock = (title, list) => `
          <li class="pdp-tf__block" data-pdp-tf-block data-side="left">
            <span class="pdp-tf__block-title">${esc(title)}</span>
            <span class="pdp-tf__notes">${list.split(',').map((x) => x.trim()).filter(Boolean).map((x) => `
              <span class="pdp-tf__note"><img class="pdp-tf__note-img" src="/assets/note-${noteKey(x)}.jpg" alt="" width="64" height="64" loading="lazy" onerror="this.style.visibility='hidden'"><span class="pdp-tf__note-name">${esc(x)}</span></span>`).join('')}
            </span>
          </li>`;
  const tfLeft = [
    ['leaf', 'Top notes', tfTop],
    ['flower', 'Heart notes', tfHeart],
    ['wood', 'Base notes', tfBase]
  ].filter(([, , text]) => text).map(([ic, title, text]) => tfNotesBlock(title, text));

  const CLAIM_ICON = (label) => {
    const l = label.toLowerCase();
    if (l.includes('paraben') || l.includes('phthalate')) return 'drop';
    if (l.includes('cruelty')) return 'heart';
    if (l.includes('vegan')) return 'leaf';
    if (l.includes('last')) return 'time';
    if (l.includes('premium') || l.includes('eau de parfum') || l.includes('extrait')) return 'sparkle';
    return 'seal';
  };
  const tfClaims = [...new Set((tfClaimsData || []).map((c) => String(c).trim()).filter(Boolean))];
  const tfRight = tfClaims.map((c) => tfBlock(CLAIM_ICON(c), c, '', 'right'));

  // Decorative only (aria-hidden, no content): a faint scent-trail line on either side of
  // the bottle and a few slowly drifting particles — mirrors the Liquid's fixed markup.
  const tfWaves = `
          <svg class="pdp-tf__wave pdp-tf__wave--left" viewBox="0 0 220 420" preserveAspectRatio="none"><path d="M210 16C150 70 168 130 118 168 70 204 96 264 70 316 52 352 60 388 96 408" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 9" stroke-linecap="round"/></svg>
          <svg class="pdp-tf__wave pdp-tf__wave--right" viewBox="0 0 220 420" preserveAspectRatio="none"><path d="M10 16C70 70 52 130 102 168 150 204 124 264 150 316 168 352 160 388 124 408" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 9" stroke-linecap="round"/></svg>`;
  const tfParticles = [
    ['12%', '14%', '5px', '0s'], ['86%', '22%', '4px', '1.1s'], ['8%', '52%', '3px', '2.4s'],
    ['90%', '60%', '5px', '0.6s'], ['20%', '82%', '4px', '1.8s'], ['80%', '86%', '3px', '3s']
  ].map(([x, y, sz, d]) => `<span class="pdp-tf__particle" style="--x:${x}; --y:${y}; --s:${sz}; --d:${d};"></span>`).join('');

  const theFragrance = (tfLeft.length || tfRight.length) ? `
  <section class="pdp pdp-section pdp-tf" data-pdp-tf aria-labelledby="tf-title">
    <div class="container">
      <header class="pdp-tf__head" data-pdp-reveal>
        <span class="pdp-eyebrow">${esc(niceTitle)}</span>
        <h2 class="pdp-tf__title" id="tf-title">The Fragrance</h2>
        <p class="pdp-tf__sub">An olfactory journey in three acts.</p>
      </header>
      <div class="pdp-tf__stage">
        <ol class="pdp-tf__col pdp-tf__col--left">${tfLeft.join('')}
        </ol>
        <div class="pdp-tf__center">
          <div class="pdp-tf__aura" aria-hidden="true"><svg class="pdp-tf__rings" viewBox="0 0 600 600" aria-hidden="true"><circle cx="300" cy="300" r="298"/><circle cx="300" cy="300" r="250"/><circle cx="300" cy="300" r="200"/></svg><svg class="pdp-tf__wave pdp-tf__wave--inner pdp-tf__wave--left" viewBox="0 0 220 420" preserveAspectRatio="none"><path d="M200 20C140 80 160 140 110 190 60 240 90 300 60 360" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg><svg class="pdp-tf__wave pdp-tf__wave--inner pdp-tf__wave--right" viewBox="0 0 220 420" preserveAspectRatio="none"><path d="M20 20C80 80 60 140 110 190 160 240 130 300 160 360" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg><span class="pdp-tf__glyph" style="--x:16%; --y:20%; --s:34px; --r:-20deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3C24 10 24 22 16 29 8 22 8 10 16 3Z"/><path d="M16 8v18"/></svg></span><span class="pdp-tf__glyph" style="--x:82%; --y:16%; --s:32px; --r:30deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 27C5 12 14 5 27 5 27 19 19 27 5 27Z"/><path d="M5 27L20 12"/></svg></span><span class="pdp-tf__glyph" style="--x:6%; --y:62%; --s:36px; --r:-10deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 29V6"/><path d="M16 10c-5-1-7-4-7-6M16 10c5-1 7-4 7-6M16 17c-5-1-8-4-8-7M16 17c5-1 8-4 8-7M16 24c-4-1-6-3-6-5M16 24c4-1 6-3 6-5"/></svg></span><span class="pdp-tf__glyph" style="--x:90%; --y:56%; --s:34px; --r:10deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6C12 8 10 16 16 18 22 20 22 26 28 28"/><path d="M4 12C10 13 9 20 15 22" opacity=".6"/></svg></span><span class="pdp-tf__glyph" style="--x:24%; --y:88%; --s:28px; --r:0deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="12" r="4"/><circle cx="21" cy="10" r="3"/><circle cx="17" cy="21" r="4.5"/></svg></span><span class="pdp-tf__glyph" style="--x:76%; --y:90%; --s:30px; --r:160deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3C24 10 24 22 16 29 8 22 8 10 16 3Z"/><path d="M16 8v18"/></svg></span><span class="pdp-tf__glyph" style="--x:32%; --y:8%; --s:26px; --r:-40deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 27C5 12 14 5 27 5 27 19 19 27 5 27Z"/><path d="M5 27L20 12"/></svg></span><span class="pdp-tf__glyph" style="--x:68%; --y:6%; --s:28px; --r:-20deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6C12 8 10 16 16 18 22 20 22 26 28 28"/><path d="M4 12C10 13 9 20 15 22" opacity=".6"/></svg></span>${tfWaves}${tfParticles}</div>
          <figure class="pdp-tf__visual" data-pdp-tf-visual>
            <span class="pdp-tf__float">
              <span class="pdp-tf__frame"><img src="${images[0]}" alt="${esc(niceTitle)}" loading="lazy" width="1200" height="1590"></span>
            </span>
          </figure>
        </div>
        <ol class="pdp-tf__col pdp-tf__col--right">${tfRight.join('')}
        </ol>
      </div>
    </div>
  </section>` : '';

  // Preview stand-in for Shopify's `customer`: add ?as=customer to the URL to see the signed-in state
  const previewCustomer = new URLSearchParams(window.location.search).get('as') === 'customer';
  const reviewReturn = encodeURIComponent(`${window.location.pathname}?p=${handle}&as=customer&review=1`);
  const reviewForm = previewCustomer ? `
          <div class="pdp-rform" id="pdp-review-form" data-pdp-review-form data-preview data-customer-name="Preview customer" hidden>
            <form class="pdp-rform__form" novalidate>
<div class="pdp-rform__head">
        <h3 class="pdp-rform__title">Write a review</h3>
        <p class="pdp-rform__sub" data-pdp-rsub></p>
      </div>

      <fieldset class="pdp-rform__rating">
        <legend>Your rating <span aria-hidden="true">*</span></legend>
        <div class="pdp-rstars" data-pdp-rstars>
          <input type="radio" id="pdp-r-star-5" name="contact[Rating]" value="5"><label for="pdp-r-star-5" title="5 out of 5"><span class="pdp-sr">5 out of 5</span></label>
          <input type="radio" id="pdp-r-star-4" name="contact[Rating]" value="4"><label for="pdp-r-star-4" title="4 out of 5"><span class="pdp-sr">4 out of 5</span></label>
          <input type="radio" id="pdp-r-star-3" name="contact[Rating]" value="3"><label for="pdp-r-star-3" title="3 out of 5"><span class="pdp-sr">3 out of 5</span></label>
          <input type="radio" id="pdp-r-star-2" name="contact[Rating]" value="2"><label for="pdp-r-star-2" title="2 out of 5"><span class="pdp-sr">2 out of 5</span></label>
          <input type="radio" id="pdp-r-star-1" name="contact[Rating]" value="1"><label for="pdp-r-star-1" title="1 out of 5"><span class="pdp-sr">1 out of 5</span></label>
        </div>
        <p class="pdp-rfield__err" data-error-for="rating" hidden></p>
      </fieldset>

      <div class="pdp-rfield">
        <label for="pdp-r-title">Review title <span aria-hidden="true">*</span></label>
        <input type="text" id="pdp-r-title" name="contact[Review title]" maxlength="80" autocomplete="off" placeholder="Sum it up in a few words" data-pdp-rtitle>
        <p class="pdp-rfield__err" data-error-for="title" hidden></p>
      </div>

      <div class="pdp-rfield">
        <label for="pdp-r-body">Your review <span aria-hidden="true">*</span></label>
        <textarea id="pdp-r-body" name="contact[body]" rows="5" maxlength="1000" placeholder="How does it wear on you? Opening, longevity, occasions…" data-pdp-rbody></textarea>
        <div class="pdp-rfield__foot">
          <p class="pdp-rfield__err" data-error-for="body" hidden></p>
          <span class="pdp-rfield__count"><span data-pdp-rcount>0</span> / 1000</span>
        </div>
      </div>

      <p class="pdp-rform__status" role="status" aria-live="polite" data-pdp-rstatus hidden></p>

      <div class="pdp-rform__actions">
        <button type="submit" class="pdp-btn" data-pdp-rsubmit><span data-pdp-rsubmit-label>Submit review</span></button>
        <button type="button" class="pdp-btn pdp-btn--ghost" data-pdp-rcancel>Cancel</button>
      </div>
            
            </form>
            <div class="pdp-rform__done" data-pdp-rdone hidden tabindex="-1">
      <h3 class="pdp-rform__title">Thank you</h3>
      <p>Your review has been sent to our team. It will appear here once it has been approved.</p>
      <button type="button" class="pdp-btn pdp-btn--ghost" data-pdp-rclose>Close</button>
    </div>
          </div>` : '';
  const reviewButton = previewCustomer
    ? '<button type="button" class="pdp-btn pdp-btn--ghost pdp-btn--block pdp-reviews__write" data-pdp-review-open aria-expanded="false" aria-controls="pdp-review-form">Write a review</button>'
    : `<a class="pdp-btn pdp-btn--ghost pdp-btn--block pdp-reviews__write" href="/account-login.html?return_url=${reviewReturn}" data-pdp-review-login>Write a review</a><p class="pdp-reviews__signin">Sign in to your account to review this fragrance.</p>`;

  /* ------------------------------------------------------------- 06 Reviews */
  const reviewsSection = `
  <section class="pdp pdp-section pdp-reviews" id="pdp-reviews" data-pdp-reviews>
    <div class="container">
      <header class="pdp-heading pdp-heading--left" data-pdp-reveal>
        <span class="pdp-eyebrow">Reviews</span>
        <h2>What patrons say</h2>
      </header>
      <div class="pdp-reviews__grid pdp-reviews__grid--list">
        <div class="pdp-reviews__summary" data-pdp-reveal hidden>
          <span class="pdp-eyebrow">Average rating</span>
          ${rating ? `
            <p class="pdp-reviews__score">${rating.toFixed(1)}</p>
            ${stars(rating)}
            <p class="pdp-reviews__count">Based on ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}</p>` : '<p class="pdp-reviews__count">No ratings yet</p>'}
          ${reviewButton}
        </div>
        <div class="pdp-reviews__list">
          ${reviewForm}
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


  /* ------------------------------------------- Customer reviews summary (mirrors sections/agha-pdp-review-summary.liquid) */
  // Preview only: the split of ratings is derived from the mock average + count, and the photo strip reuses product shots.
  const dist = (() => {
    if (!rating || !reviewCount) return null;
    const w = [5, 4, 3, 2, 1].map((k) => Math.exp(-1.4 * Math.pow(k - rating, 2)));
    const sum = w.reduce((a, b) => a + b, 0);
    const n = w.map((x) => Math.floor((x / sum) * reviewCount));
    let left = reviewCount - n.reduce((a, b) => a + b, 0);
    for (let i = 0; left > 0; i = (i + 1) % 5, left--) n[i] += 1;
    return n;
  })();
  const reviewSummary = rating ? `
  <section class="pdx pdx-rev" data-pdx-rev>
    <div class="pdx-wrap">
      <h2 class="pdx-heading" data-pdx-in>Customer reviews</h2>
      <div class="pdx-rev__board">
        <div class="pdx-rev__score" data-pdx-in>
          <span class="pdx-stars" role="img" aria-label="Rated ${rating.toFixed(2)} out of 5"><span class="pdx-stars__fill" style="width: ${(rating / 5) * 100}%"></span></span>
          <p class="pdx-rev__num"><span data-pdx-count="${rating.toFixed(2)}">${rating.toFixed(2)}</span> out of 5</p>
          <p class="pdx-rev__based">Based on ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}</p>
        </div>
        <ul class="pdx-rev__dist" aria-label="Rating distribution" data-pdx-in>
          ${[5, 4, 3, 2, 1].map((star, i) => `<li style="--i: ${i}"><span class="pdx-rev__row-stars" aria-label="${star} star"><span class="pdx-on">${'★'.repeat(star)}</span>${star < 5 ? `<span class="pdx-off">${'☆'.repeat(5 - star)}</span>` : ''}</span><span class="pdx-rev__bar"><i style="width: ${((dist[i] / reviewCount) * 100).toFixed(1)}%"></i></span><span class="pdx-rev__n">${dist[i]}</span></li>`).join('')}
        </ul>
        <div class="pdx-rev__cta" data-pdx-in><a class="pdx-btn" href="#pdp-reviews" data-pdx-write>Write a review</a></div>
      </div>
      ${images && images.length ? `
      <div class="pdx-rev__media" data-pdx-in>
        <p class="pdx-rev__media-label">Customer photos &amp; videos</p>
        <div class="pdx-rev__strip">
          ${images.slice(0, 7).map((src, i) => `<figure class="pdx-rev__thumb" style="--i: ${i}"><img src="${src}" alt="Customer photo" loading="lazy" width="72" height="72"></figure>`).join('')}
          <a class="pdx-rev__more" href="#pdp-reviews">See more</a>
        </div>
      </div>` : ''}
    </div>
  </section>` : '';

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
  // Same catalog order the shop uses; the paired fragrance leads, so "related" and "pair it with" agree.
  const pairHandle = cat && window.HOA.pairOf(handle) ? window.HOA.pairOf(handle).handle : null;
  const others = Object.entries(AGHA_PRODUCTS).filter(([key]) => key !== handle)
    .sort((a, b) => (b[0] === pairHandle) - (a[0] === pairHandle)).slice(0, 3);
  const relPrice = (key, p) => {
    const c = window.HOA && window.HOA.ready ? window.HOA.product(key) : null;
    return c ? window.HOA.priceHtml(c, 'hoa-cprice') : money(p.sizes['50 ML'] ?? Object.values(p.sizes)[0]);
  };
  const related = `
  <section class="pdp pdp-section pdp-related" data-pdp-related>
    <div class="container">
      <div class="pdp-related__head">
        <header class="pdp-heading pdp-heading--left" data-pdp-reveal>
          <span class="pdp-eyebrow">More scents to discover</span>
          <h2>If you love ${esc(niceTitle)}…</h2>
        </header>
        <a class="pdp-link" href="/shop.html">View all</a>
      </div>
      <!-- Same product card as the shop page (mirrors snippets/hoa-shop-card.liquid) -->
      <div class="hoa-shop-grid pdp-related-cards" data-view="grid" data-hoa-related>
        ${others.map(([key, p], i) => {
          const c = window.HOA && window.HOA.ready ? window.HOA.product(key) : null;
          return c ? window.HOA.cardHtml(c, i) : '';
        }).join('')}
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
          <h2 class="pdp-banner__title">Not sure yet? Wear three before you choose.</h2>
          <p class="pdp-banner__text">${window.HOA && window.HOA.ready && window.HOA.product('discovery-set') ? 'The Discovery Set: three of our fragrances in 5 ml, ' + window.HOA.money(window.HOA.product('discovery-set').price) + '.' : 'Three of our fragrances in 5 ml.'}</p>
          <a class="pdp-btn pdp-btn--light" href="/shop.html#bundles">Explore the set →</a>
        </div>
        <div class="pdp-banner__media" style="--pdp-focal: 50% 50%;">
          <img src="/assets/discovery_box.jpg" alt="The AGHA Discovery Set in its black box" loading="lazy">
        </div>
      </div>
    </div>
    <div class="pdp-dock-spacer" aria-hidden="true"></div>
  </section>`;

  /* ------------------------------------------------- Product films (only this product) */
  // Mirrors sections/hoa-reels.liquid in product-page mode. Mock clips = the Liquid mock list.
  const CLIPS = [
    ['oud-fury', 'https://videos.pexels.com/video-files/7816005/7816005-sd_540_960_25fps.mp4', 'hoa-oud-fury-portrait'],
    ['agha-blue', 'https://videos.pexels.com/video-files/6764969/6764969-sd_540_960_25fps.mp4', 'hoa-agha-blue-portrait'],
    ['oud-of-dark-paradise', '/assets/hoa-reel-oud-of-dark-paradise.mp4', 'hoa-dark-paradise-portrait'],
    ['maha', 'https://videos.pexels.com/video-files/5848516/5848516-sd_540_960_24fps.mp4', 'hoa-maha-portrait']
  ];
  // This product's own film first, then the House's other films: four in all.
  const reelSet = [...CLIPS.filter((c) => c[0] === handle), ...CLIPS.filter((c) => c[0] !== handle)].slice(0, 4);
  const reelName = esc(titleCase(product.title));
  const reelCard = (r, k) => `
          <li class="hoa-reel" data-hoa-reel>
            <div class="hoa-reel__frame"><div class="hoa-reel__stage" data-hoa-reel-stage>
              <img class="hoa-reel__poster" src="/assets/${r[2]}.webp" alt="${reelName} film" width="1200" height="1607">
              <video class="hoa-reel__video" data-hoa-reel-video muted loop playsinline preload="none" disablepictureinpicture data-src="${r[1]}" aria-label="${reelName} film"></video>
              <div class="hoa-reel__controls">
                <button type="button" class="hoa-reel__ctrl" data-hoa-reel-play aria-label="Pause reel">
                  <svg class="hoa-reel__i-play" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5.5V18.5L19 12L8 5.5Z" fill="currentColor"/></svg>
                  <svg class="hoa-reel__i-pause" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="7" y="5" width="3.6" height="14" fill="currentColor"/><rect x="13.4" y="5" width="3.6" height="14" fill="currentColor"/></svg>
                </button>
                <button type="button" class="hoa-reel__ctrl" data-hoa-reel-sound aria-label="Turn sound on" aria-pressed="false">
                  <svg class="hoa-reel__i-muted" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5V14.5H8L13 18.5V5.5L8 9.5H4Z" fill="currentColor"/><path d="M16.5 9.5L21 14.5M21 9.5L16.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  <svg class="hoa-reel__i-sound" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5V14.5H8L13 18.5V5.5L8 9.5H4Z" fill="currentColor"/><path d="M16 9C17.2 10.1 17.2 13.9 16 15M18.6 6.6C21.1 9 21.1 15 18.6 17.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </div>
              <button type="button" class="hoa-reel__tap" data-hoa-reel-open aria-label="Watch the ${esc(reelShop(r[0]).name)} film full screen, with sound">
                <span class="hoa-reel__tap-hint" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Tap to watch</span>
              </button>
            </div></div>
            ${reelShopHtml(r[0])}
          </li>`;
  // Shoppable strip: mirrors the product-page mode of sections/hoa-reels.liquid (catalog = Shopify stand-in)
  function reelShop(h) {
    const c = window.HOA && window.HOA.ready ? window.HOA.product(h) : null;
    const p = AGHA_PRODUCTS[h];
    return c ? { name: c.name, url: '/product.html?p=' + h, img: c.image, now: money(c.price), was: c.hasOffer ? money(c.regularPrice) : '', sold: c.inventory === 0 }
      : { name: p ? titleCase(p.title) : h, url: '/product.html?p=' + h, img: p ? p.images[0] : '', now: '', was: '', sold: false };
  }
  function reelShopHtml(h) {
    const s = reelShop(h);
    return `
            <div class="hoa-reel__shop" data-hoa-reel-shop>
              <a class="hoa-reel__thumb" href="${s.url}" tabindex="-1" aria-hidden="true">${s.img ? `<img src="${s.img}" alt="" width="120" height="150" loading="lazy" decoding="async">` : ''}</a>
              <div class="hoa-reel__info">
                <a class="hoa-reel__name" href="${s.url}">${esc(s.name)}</a>
                <p class="hoa-reel__price"><span>${s.now}</span>${s.was ? `<s><span class="hoa-sr">MRP </span>${s.was}</s>` : ''}</p>
              </div>
              <div class="hoa-reel__acts">
                ${h === handle ? '' : `<a class="hoa-reel__view" href="${s.url}">View product</a>`}
                <button type="button" class="hoa-reel__add" data-hoa-reel-add data-handle="${h}" data-variant="" data-title="${esc(s.name)}" data-price="${s.now}" data-compare="${s.was}" data-image="${s.img}"${s.sold ? ' disabled' : ''}><span>${s.sold ? 'Sold out' : 'Add to bag'}</span></button>
              </div>
            </div>`;
  }
  const reels = !reelSet.length ? '' : `
  <section class="hoa-reels hoa-reels--product" id="product-films" data-hoa-reels>
    <div class="hoa-wrap">
      <header class="hoa-reels__head">
        <div>
          <p class="hoa-eyebrow">Product film</p>
          <h2 class="hoa-h2">See it <em>in motion.</em></h2>
        </div>
        <div class="hoa-reels__nav">
          <div class="hoa-reels__arrows"><button type="button" class="hoa-reels__arrow" data-hoa-reels-prev aria-label="Previous reels"></button><button type="button" class="hoa-reels__arrow" data-hoa-reels-next aria-label="Next reels"></button></div>
        </div>
      </header>
      <div class="hoa-reels__viewport">
        <ul class="hoa-reels__track" data-hoa-reels-track role="list" tabindex="0" aria-label="Product films">${reelSet.map(reelCard).join('')}
        </ul>
      </div>
    </div>
  </section>`;

  // "Pair it with": painted by assets/hoa-commerce.js from the catalog (same mount the Liquid product template uses)
  const pair = '<section class="pdp pdp-section hoa-pair" data-hoa-pair data-handle="' + handle + '" hidden></section>';

  // Attention flow, mirroring templates/product.json:
  //   buy (hero) → why it's worth it (notes, proofs) → understand it (story, craft, reviews) → discover more.
  // The old "features" strip repeated the proofs, the craft steps and the trust list, so it is no longer shown.
  root.innerHTML = hero + theFragrance + collage + story + craft + fragranceNotes + reviewSummary + reviewsSection + faq + reels + pair + related + finale;
  // Summary "Write a review" reuses the existing review form / sign-in link above.
  root.querySelector('[data-pdx-write]')?.addEventListener('click', (e) => {
    const target = root.querySelector('[data-pdp-review-open], [data-pdp-review-login]');
    if (target) { e.preventDefault(); target.click(); }
  });
  window.HOA?.initPair?.();
  window.AghaPDP?.init();
  if (reels) {
    const sc = document.createElement('script');
    sc.src = '/assets/hoa-reels.js';
    document.body.appendChild(sc);
  }
})();
