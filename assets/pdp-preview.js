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

  // Payment badges: the brand's own icon set, same list as snippets/hoa-pay-icons.liquid.
  const PAY_BADGES = [['upi', 'UPI'], ['gpay', 'Google Pay'], ['visa', 'Visa'], ['mastercard', 'Mastercard'], ['rupay', 'RuPay'], ['amex', 'American Express']]
    .map(([f, label]) => `<li title="${label}"><img src="/assets/hoa-pay-${f}.png" alt="${label}" width="40" height="28" loading="lazy" decoding="async"></li>`).join('');
  // The brand's own filled icons (same as snippets/agha-pdp-icon.liquid), tinted via a CSS mask.
  const IMG_ICONS = { 'free-shipping': 1, badge: 1 };
  const icon = (name) => IMG_ICONS[name] ? `<span class="pdp-img-icon" style="--pdp-icon: url('/assets/hoa-icon-${name}.png')" aria-hidden="true"></span>` : `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  // Mirrors Shopify's product.variants JSON (prices in minor units)
  const variants = Object.entries(product.sizes).map(([size, price], i) => ({
    id: 1000 + i,
    title: size,
    options: [size],
    price: price == null ? null : price * 100,
    compare_at_price: product.compare && product.compare[size] ? product.compare[size] * 100 : null,
    available: !(product.soldOut || []).includes(size)   // sold-out sizes, from the catalog (live store)
  }));
  const current = variants.find((v) => v.title === '50 ML' && v.available) || variants.find((v) => v.available) || variants[0];
  const images = product.images;
  // Buy-column slider, thumbnails, 'more views' tiles and lightbox: the product's own photo set when it has one
  // (theme.js `media`), else the catalog images. images[0] stays the plain flacon used by the dock, story, offers.
  const media = product.media || images;
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
        <div class="pdp-media pdp-story${media.length < 2 ? ' pdp-story--single' : ''}" data-pdp-story data-pdp-thumbs style="--pdp-n: ${media.length}">
          <div class="pdp-stage" data-pdp-stage>
            <div class="pdp-stage__inner" data-pdp-stage-inner>
              <div class="pdp-stage__track" data-pdp-track>
                ${media.map((src, i) => `
                  <figure class="pdp-slide${i === 0 ? ' is-active' : ''}" data-pdp-slide="${i}">
                    <img src="${src}" alt="${esc(niceTitle)} — image ${i + 1} of ${media.length}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
                    ${i === 0 ? `<div class="pdp-slide__tags" aria-hidden="true"><span class="pdp-chip pdp-chip--dot">${esc(product.family)}</span>${cat && cat.isBestSeller ? '<span class="pdp-chip pdp-chip--best">Best seller</span>' : ''}</div>` : ''}
                  </figure>`).join('')}
              </div>
            </div>
            <div class="pdp-stage__badge"><span class="pdp-chip pdp-chip--dot">${esc(product.family)}</span>${cat && cat.isBestSeller ? '<span class="pdp-chip pdp-chip--best">Best seller</span>' : ''}</div>
            <button type="button" class="pdp-expand" data-pdp-expand aria-label="View images full screen">${icon('expand')}</button>
            ${media.length > 1 ? `
            <div class="pdp-story__progress" aria-hidden="true">
              <span><span data-pdp-count>01</span>&nbsp;/&nbsp;${pad(media.length)}</span>
              <span class="pdp-story__bar"><i data-pdp-bar></i></span>
            </div>` : ''}
          </div>
          ${media.length > 1 ? `
          <div class="pdp-tiles" role="group" aria-label="More product photos">
            ${media.slice(1, 5).map((src, i) => `<button type="button" class="pdp-tiles__btn" data-pdp-tile="${i + 1}" aria-label="Show this photo as the main image"><img src="${src}" alt="" loading="lazy"></button>`).join('')}
          </div>` : ''}
          <ul class="pdp-proofs" role="list" aria-label="Why we are better">
            ${whyItems.map((w) => `<li class="pdp-proof"><span class="pdp-proof__icon">${['badge','bottle','hourglass','ifra'].includes(w[0]) ? `<img class="pdp-proof__art" src="assets/hoa-proof-${w[0]}.svg" alt="" width="40" height="40" loading="lazy" decoding="async">` : pdxIcon(w[0])}</span><b class="pdp-proof__title">${w[1]}</b><small class="pdp-proof__text">${w[2]}</small></li>`).join('')}
          </ul>
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
                <span class="pdp-deal__icon">${icon('free-shipping')}</span>
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
                  <label class="pdp-tile${v.available ? '' : ' is-unavailable'}">
                    <input type="radio" name="preview-option-1" value="${v.title}"${v === current ? ' checked' : ''}>
                    <span class="pdp-tile__value">${v.title}</span>
                    <span class="pdp-tile__price">${v.available ? money(v.price == null ? null : v.price / 100) : 'Sold out'}</span>
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
                ['free-shipping', 'Complimentary shipping', shipThreshold ? 'On orders above ' + money(shipThreshold) + ', wrapped in matte black hardboard.' : 'Wrapped in matte black hardboard.'],
                ['sample', '5 ml sample included', 'Try it on skin before you open the flacon.'],
                ['badge', 'Numbered and batch-coded', 'Every flacon is laser-engraved with its batch code and compounding date.']
              ].map(([ic, t, d]) => `<li class="pdp-trust__item"><span class="pdp-trust__icon">${icon(ic)}</span><span><b>${t}</b><small>${d}</small></span></li>`).join('')}
            </ul>
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
              <summary>How to use<span class="pdp-accordion__icon" aria-hidden="true"></span></summary>
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
        <span><span data-pdp-lightbox-count>01</span> / ${pad(media.length)}</span>
        <button type="button" data-pdp-lightbox-close>Close ✕</button>
      </div>
      <div class="pdp-lightbox__stage" data-pdp-lightbox-stage></div>
      ${media.length > 1 ? `
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
  // Mirrors sections/agha-pdp-craft.liquid ("the bottle fills up") and its product.json blocks.
  const fillDays = 90;
  const steps = [
    ['Source', 'Before day one', 'Wild Cambodian agarwood from Assam, Florentine iris root aged for three years, and Madagascan pink pepper — harvested by hand.'],
    ['Compound', 'Day 1', 'Each extrait is compounded at an uncompromised 35% oil concentration, where traditional houses dilute to 12–15%.'],
    ['Macerate', 'Days 1–90', 'The mixture matures in temperature-stabilised obsidian vaults for 90 days, so it wears without a harsh alcohol opening.'],
    ['Finish', 'Day 90', 'Each flacon is laser-engraved with its batch code and compounding date, then hand-wrapped in matte black hardboard.']
  ];
  const fillBottle = '/assets/hoa-product-oud-fury.webp';

  const craft = `
  <section class="pdp pdp-fill" data-pdp-fill data-days="${fillDays}" aria-labelledby="fill-title" style="--fill-top: 37%; --fill-bottom: 88%; --fill-cap: 34%;">
    <div class="container">
      <header class="pdp-fill__head" data-pdp-reveal>
        <span class="pdp-fill__eyebrow">How it's made</span>
        <h2 class="pdp-fill__title" id="fill-title">Ninety days <em>to a flacon</em></h2>
        <p class="pdp-fill__intro">Most of the making is waiting. The oil rests for ninety days before it is bottled, so it wears warm and close instead of sharp.</p>
      </header>
    </div>
    <div class="pdp-fill__track" data-pdp-fill-track>
      <div class="pdp-fill__stage">
        <div class="container pdp-fill__grid">
          <figure class="pdp-fill__bottle">
            <span class="pdp-fill__halo" aria-hidden="true"></span>
            <img class="pdp-fill__empty" src="${fillBottle}" alt="" aria-hidden="true" loading="lazy" width="1200" height="1500">
            <img class="pdp-fill__full" src="${fillBottle}" alt="${esc(niceTitle)} flacon" loading="lazy" width="1200" height="1500">
            <span class="pdp-fill__bubbles" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--i: ${i + 1}"></i>`).join('')}</span>
            <span class="pdp-fill__meniscus" aria-hidden="true"></span>
            <span class="pdp-fill__glint" aria-hidden="true"></span>
            <span class="pdp-fill__stream" aria-hidden="true"></span>
            <img class="pdp-fill__cap" src="${fillBottle}" alt="" aria-hidden="true" loading="lazy" width="1200" height="1500">
            <figcaption class="pdp-fill__day" aria-hidden="true">
              <span class="pdp-fill__day-label">Day</span>
              <span class="pdp-fill__day-num" data-pdp-fill-day>${fillDays}</span>
              <span class="pdp-fill__day-total">/ ${fillDays}</span>
            </figcaption>
          </figure>
          <ol class="pdp-fill__steps">
          ${steps.map(([title, when, text], i) => `
            <li class="pdp-fill__step pdp-fill__step--${'abcd'[i]}" data-pdp-fill-step>
              <div class="pdp-fill__meta"><span class="pdp-fill__when">${when}</span></div>
              <h3 class="pdp-fill__name">${title}</h3>
              <p class="pdp-fill__text">${text}</p>
            </li>`).join('')}
          </ol>
        </div>
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
  // The placeholder notes now live in assets/theme.js (window.AGHA_DEV_NOTES), shared with the reel viewer.
  const DEV_FRAGRANCE_MOCK = window.AGHA_DEV_NOTES || {};
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
  // One act of the arc above the bottle (mirrors the Liquid): the first act is shown, the rest wait on the left
  const tfNotesBlock = (title, list, act) => {
    const names = list.split(',').map((x) => x.trim()).filter(Boolean);
    return `
          <li class="pdp-tf__block" data-pdp-tf-block data-pdp-tf-act data-side="left" data-state="${act ? 'next' : 'active'}">
            <span class="pdp-tf__act-label"><span class="pdp-tf__block-title">${esc(title)}</span></span>
            <span class="pdp-tf__notes" style="--n:${names.length};">${names.map((x, i) => `
              <span class="pdp-tf__note" style="--i:${i};"><img class="pdp-tf__note-img" src="/assets/note-${noteKey(x)}.jpg" alt="" width="64" height="64" loading="lazy" onerror="this.style.visibility='hidden'"><span class="pdp-tf__note-name">${esc(x)}</span></span>`).join('')}
            </span>
          </li>`;
  };
  const tfLeft = [
    ['leaf', 'Top notes', tfTop],
    ['flower', 'Heart notes', tfHeart],
    ['wood', 'Base notes', tfBase]
  ].filter(([, , text]) => text).map(([ic, title, text], i) => tfNotesBlock(title, text, i));

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

  // White-background cut-out (mirrors the Liquid): the studio photo's tinted backdrop reads as a card
  const tfKey = handle.replace('oud-of-', '');
  const tfBottle = ['oud-fury', 'agha-blue', 'dark-paradise', 'maha', 'sea-smoke', 'tobacco-enigma', 'shamamah'].includes(tfKey)
    ? `/assets/hoa-cutout-${tfKey}.webp` : images[0];

  const theFragrance = (tfLeft.length || tfRight.length) ? `
  <section class="pdp pdp-section pdp-tf" data-pdp-tf aria-labelledby="tf-title">
    <div class="container">
      <header class="pdp-tf__head" data-pdp-reveal>
        <span class="pdp-eyebrow">${esc(niceTitle)}</span>
        <h2 class="pdp-tf__title" id="tf-title">The Fragrance</h2>
        <p class="pdp-tf__sub">An olfactory journey in three acts.</p>
      </header>
      <div class="pdp-tf__stage">
        <ol class="pdp-tf__col pdp-tf__col--left pdp-tf__arc" data-pdp-tf-arc>${tfLeft.join('')}
        </ol>
        <div class="pdp-tf__center">
          <div class="pdp-tf__aura" aria-hidden="true"><svg class="pdp-tf__rings" viewBox="0 0 600 600" aria-hidden="true"><circle cx="300" cy="300" r="298"/><circle cx="300" cy="300" r="250"/><circle cx="300" cy="300" r="200"/></svg><svg class="pdp-tf__wave pdp-tf__wave--inner pdp-tf__wave--left" viewBox="0 0 220 420" preserveAspectRatio="none"><path d="M200 20C140 80 160 140 110 190 60 240 90 300 60 360" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg><svg class="pdp-tf__wave pdp-tf__wave--inner pdp-tf__wave--right" viewBox="0 0 220 420" preserveAspectRatio="none"><path d="M20 20C80 80 60 140 110 190 160 240 130 300 160 360" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg><span class="pdp-tf__glyph" style="--x:16%; --y:20%; --s:34px; --r:-20deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3C24 10 24 22 16 29 8 22 8 10 16 3Z"/><path d="M16 8v18"/></svg></span><span class="pdp-tf__glyph" style="--x:82%; --y:16%; --s:32px; --r:30deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 27C5 12 14 5 27 5 27 19 19 27 5 27Z"/><path d="M5 27L20 12"/></svg></span><span class="pdp-tf__glyph" style="--x:6%; --y:62%; --s:36px; --r:-10deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 29V6"/><path d="M16 10c-5-1-7-4-7-6M16 10c5-1 7-4 7-6M16 17c-5-1-8-4-8-7M16 17c5-1 8-4 8-7M16 24c-4-1-6-3-6-5M16 24c4-1 6-3 6-5"/></svg></span><span class="pdp-tf__glyph" style="--x:90%; --y:56%; --s:34px; --r:10deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6C12 8 10 16 16 18 22 20 22 26 28 28"/><path d="M4 12C10 13 9 20 15 22" opacity=".6"/></svg></span><span class="pdp-tf__glyph" style="--x:24%; --y:88%; --s:28px; --r:0deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="12" r="4"/><circle cx="21" cy="10" r="3"/><circle cx="17" cy="21" r="4.5"/></svg></span><span class="pdp-tf__glyph" style="--x:76%; --y:90%; --s:30px; --r:160deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3C24 10 24 22 16 29 8 22 8 10 16 3Z"/><path d="M16 8v18"/></svg></span><span class="pdp-tf__glyph" style="--x:32%; --y:8%; --s:26px; --r:-40deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 27C5 12 14 5 27 5 27 19 19 27 5 27Z"/><path d="M5 27L20 12"/></svg></span><span class="pdp-tf__glyph" style="--x:68%; --y:6%; --s:28px; --r:-20deg;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6C12 8 10 16 16 18 22 20 22 26 28 28"/><path d="M4 12C10 13 9 20 15 22" opacity=".6"/></svg></span>${tfWaves}${tfParticles}</div>
          <figure class="pdp-tf__visual" data-pdp-tf-visual>
            <span class="pdp-tf__float">
              <span class="pdp-tf__frame"><img src="${tfBottle}" alt="${esc(niceTitle)}" loading="lazy" width="1200" height="1500"></span>
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
                <a class="hoa-reel__view" href="${h === handle ? '#top' : s.url}">View product</a>
                <button type="button" class="hoa-reel__add" data-hoa-reel-add data-handle="${h}" data-variant="" data-title="${esc(s.name)}" data-price="${s.now}" data-compare="${s.was}" data-image="${s.img}"${s.sold ? ' disabled' : ''}><span>${s.sold ? 'Sold out' : 'Add to bag'}</span></button>
              </div>
            </div>
            ${reelPanelHtml(h, s)}`;
  }
  // Viewer panel (mirrors the <template data-hoa-reel-panel> in sections/hoa-reels.liquid)
  function reelPanelHtml(h, s) {
    const p = AGHA_PRODUCTS[h] || {};
    const shots = (p.images || []).slice(0, 6);
    return `
            <template data-hoa-reel-panel>
              <div class="hoa-rvp__gallery" data-rvp-gallery>${shots.map((src) => `<figure class="hoa-rvp__shot"><img src="${src}" alt="${esc(s.name)}" decoding="async"></figure>`).join('')}</div>
              <div class="hoa-rvp__body" data-rvp-handle="${h}">
                <h3 class="hoa-rvp__name">${esc(s.name)}</h3>
                <p class="hoa-rvp__price"><b>${s.now}</b>${s.was ? `<s><span class="hoa-sr">MRP </span>${s.was}</s>` : ''}</p>
              </div>
              <div class="hoa-rvp__foot">
                <a class="hoa-rvp__info" href="${s.url}">More info</a>
                <button type="button" class="hoa-rvp__add" data-hoa-reel-add data-handle="${h}" data-variant="" data-title="${esc(s.name)}" data-price="${s.now}" data-compare="${s.was}" data-image="${s.img}"${s.sold ? ' disabled' : ''}><span>${s.sold ? 'Sold out' : 'Add to bag'}</span></button>
                <button type="button" class="hoa-rvp__bag" data-rvp-bag aria-label="Open bag"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.5 8h13l-1 12h-11l-1-12Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="hoa-rvp__count cart-count">0</span></button>
              </div>
            </template>`;
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

  // Campaign gallery: mirrors sections/hoa-pdp-gallery.liquid with the photo blocks in templates/product.json
  // (each block names its product; the first photo is the full-width banner). [asset, w, h, alt, banner focus]
  const GALLERY = {
    'maha': [
      ["hoa-pdp-gal-hero", 1856, 2304, "A woman in a red gown holds Maha", "50% 20%"],
      ["hoa-pgal-maha-2", 1000, 1241, "Maha held out in a sweep of red silk"],
      ["hoa-pgal-maha-3", 1000, 1241, "A woman holds Maha close to her face"],
      ["hoa-pgal-maha-4", 1000, 1241, "Maha bottle among red silk"],
      ["hoa-pgal-maha-5", 1000, 1241, "Maha resting in folds of red silk"]
    ],
    'agha-blue': [
      ["hoa-pgal-agha-blue-hero", 1856, 2304, "Agha Blue resting in snow and ice", "50% 45%"],
      ["hoa-pgal-agha-blue-2", 1000, 1250, "Agha Blue on a sea rock by the cliffs"],
      ["hoa-pgal-agha-blue-3", 1000, 1250, "Agha Blue held at the waist by the sea"],
      ["hoa-pgal-agha-blue-4", 1000, 1250, "Agha Blue on a rock above the sea"],
      ["hoa-pgal-agha-blue-5", 1000, 1250, "Agha Blue in the water of a sea cave"],
      ["hoa-pgal-agha-blue-6", 1000, 1241, "Agha Blue inside a block of ice"],
      ["hoa-pgal-agha-blue-7", 1000, 1250, "Agha Blue in snow among ice cubes"],
      ["hoa-pgal-agha-blue-8", 1000, 1250, "Fresh as ice, deep as blue"]
    ],
    'sea-smoke': [
      ["hoa-pgal-sea-smoke-hero", 1536, 1920, "Sea Smoke lying in the shallow waves", "50% 50%"],
      ["hoa-pgal-sea-smoke-2", 1000, 1250, "Sea Smoke on the sand among lemons"],
      ["hoa-pgal-sea-smoke-3", 1000, 1250, "A man on the shore holds Sea Smoke"],
      ["hoa-pgal-sea-smoke-4", 1000, 1250, "Sea Smoke held in the surf"]
    ],
    'shamamah': [
      ["hoa-pgal-shamamah-hero", 1638, 2048, "Shamamah on old wood with moss, sandalwood and lavender", "50% 22%"],
      ["hoa-pgal-shamamah-2", 1000, 1250, "Shamamah on green satin"],
      ["hoa-pgal-shamamah-3", 1000, 1250, "Shamamah lying on green satin"]
    ],
    'oud-fury': [
      ["hoa-pgal-oud-fury-hero", 1792, 2400, "Oud Fury by a palace window at dusk", "50% 60%"],
      ["hoa-pgal-oud-fury-2", 1200, 1500, "A hand raises Oud Fury on a crystal stand with smoking agarwood"],
      ["hoa-alt-oud-fury", 1080, 1350, "Oud Fury among pieces of agarwood"],
      ["hoa-oud-fury-smoke", 2000, 1125, "Oud Fury in smoke and embers"],
      ["hoa-hero-oud-fury", 2000, 1125, "Oud Fury on agarwood in amber light"]
    ],
    'oud-of-dark-paradise': [
      ["hoa-pgal-dark-paradise-lava", 1600, 1600, "Oud of Dark Paradise on black rock among rivers of lava", "50% 50%"],
      ["hoa-pgal-dark-paradise-panther", 1600, 1600, "Oud of Dark Paradise before a black panther in the dark"],
      ["hoa-pgal-dark-paradise-chains", 1080, 1440, "Oud of Dark Paradise wrapped in black chain"]
    ],
    'tobacco-enigma': [
      ["hoa-tobacco-enigma-portrait", 1200, 1607, "Tobacco Enigma among tobacco leaves", "50% 45%"],
      ["hoa-alt-tobacco-enigma", 1080, 1350, "Tobacco Enigma on moss in a forest"],
      ["hoa-ingredients-tobacco", 969, 969, "Tobacco Enigma with its ingredients"],
      ["hoa-shop-rec-tobacco-enigma", 1086, 1448, "Tobacco Enigma on stone"]
    ]
  };
  const galSet = GALLERY[handle] || [];
  const galImg = ([name, w, h, alt], sizes) => `<img src="/assets/${name}.webp" srcset="/assets/${name}-sm.webp ${w > 1500 ? 1000 : 700}w, /assets/${name}.webp ${w}w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  const galFeature = false; // "First photo full width" is off in templates/product.json
  // Three photos side by side in one row (mirrors sections/hoa-pdp-gallery.liquid); extra photos are not shown.
  const galShown = (galFeature ? galSet.slice(1, 3) : galSet.slice(0, 3));
  const galItems = galShown.map((g) => `<li class="hoa-pgal__item">${galImg(g, '(min-width: 769px) 34vw, 80vw')}</li>`).join('');
  const gallery = galSet.length ? `
  <section class="hoa-pgal" aria-label="Campaign photographs">
    ${galFeature ? `<figure class="hoa-pgal__hero" style="--pos: ${galSet[0][4] || 'center'}">${galImg(galSet[0], '100vw')}</figure>` : ''}
    ${galItems ? `<ul class="hoa-pgal__pair" role="list" style="--n: ${galShown.length}">${galItems}</ul>` : ''}
  </section>` : '';

  // Benefits marquee: mirrors sections/hoa-fragrance-benefits.liquid with the blocks in templates/product.json
  // (plant-based / vegan / cruelty free are switched off there until confirmed, so they are left out here too).
  const bnfItems = [['Artisanal perfumery', 'perfume'], ['Fine fragrance oils', 'drop'], ['Crafted with precision', 'precision'],
    ['IFRA certified', 'seal'], ['Certified perfumers', 'certificate']]
    .map(([text, icon]) => `<li class="hoa-bnf__item"><span class="hoa-bnf__icon" style="--hoa-bnf-icon: url('/assets/hoa-bnf-${icon}.png')" aria-hidden="true"></span><span class="hoa-bnf__text">${esc(text)}</span></li>`).join('');
  const benefits = `
  <section class="hoa-bnf hoa-bnf--dark" data-hoa-bnf data-duration="42" data-hover="slow" aria-label="The house standard">
    <div class="hoa-bnf__viewport" data-hoa-bnf-viewport><ul class="hoa-bnf__track" data-hoa-bnf-track role="list">${bnfItems}</ul></div>
  </section>`;

  /* ------------------------------------------ Fragrance notes (light cards) */
  // Mirrors sections/fragrance-notes.liquid with the product.json defaults (notes_cards).
  // The product's own notes replace a card's caption, like the Liquid's metafield step.
  // The section's style and script blocks are read from the .liquid file itself (below).
  const FNL_ICONS = {
    top: '<path d="M5 19c8 0 14-6 14-14C11 5 5 11 5 19z"/><path d="M5 19l7-7"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    base: '<path d="M12 3c3 3.5 5 6.4 5 9.5a5 5 0 0 1-10 0C7 9.4 9 6.5 12 3z"/><path d="M5 21h14"/>',
    none: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
  };
  const fnlRots = [5, -6, -4, 6];
  const fnlData = [
    { style: 'white', label: 'Top notes', title: 'Top', caption: notes.top || 'Bergamot, Pink Pepper', glow: '#ffe08a', src: 'top' },
    { style: 'black', label: 'Heart notes', title: 'Heart', caption: notes.heart || 'Rose, Jasmine', glow: '#ffc2d1', src: 'heart' },
    { style: 'accent', label: 'Base notes', title: 'Base', caption: notes.base || 'Oud, Amber, Musk', glow: '#f2c48d', src: 'base' },
    { style: 'grey', label: 'On skin', title: '12h', caption: 'Longevity', glow: '#d6deea', src: 'none' }
  ];
  const fnlChips = (txt) => txt.split(',').map((x) => x.trim()).filter(Boolean).map((x) => `<li data-fnl-chip>${esc(x)}</li>`).join('');
  const fnlBand = fnlData.map((c) => `${esc(c.title)} <i>✦</i> `).join('');
  const fnlPins = fnlData.map((c, i) => `
      <span class="fnl-pin fnl-pin--${i % 2 ? 'left' : 'right'}" data-fnl-pin data-slot="${i + 1}" aria-hidden="true"><i class="fnl-pin__line" data-fnl-line></i><i class="fnl-pin__dot" data-fnl-dot></i></span>`).join('');
  const fnlCards = fnlData.map((c, i) => `
        <li class="fnl-card fnl-card--${c.style}" data-fnl-card data-slot="${i + 1}" data-rot="${fnlRots[i]}" data-glow="${c.glow}" style="--rot: ${fnlRots[i]}deg;">
          <div class="fnl-card__in" data-fnl-in>
            <div class="fnl-card__body">
              <span class="fnl-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${FNL_ICONS[c.src]}</svg></span>
              <p class="fnl-card__label">${c.label}</p>
              <h3 class="fnl-card__title">${esc(c.title)}</h3>
              <ul class="fnl-card__chips" role="list">${fnlChips(c.caption)}</ul>
            </div>
          </div>
        </li>`).join('');
  const notesCards = `
  <div class="shopify-section fnl-section">
  <section class="fnl" id="fnl-preview" style="--fnl-bg: #f4f4f2; --fnl-accent: #c9a96a; --fnl-accent-ink: #111111;" data-fnl aria-labelledby="fnl-preview-title">
    <header class="fnl__head">
      <p class="fnl__eyebrow">Scent profile</p>
      <h2 class="fnl__title" id="fnl-preview-title">What's inside</h2>
    </header>
    <div class="fnl__stage" data-fnl-stage style="--fnl-aura: ${fnlData[0].glow};">
      <div class="fnl__band" data-fnl-band aria-hidden="true">${`<span>${fnlBand}</span>`.repeat(4)}</div>
      <div class="fnl__aura" aria-hidden="true"></div>
      <div class="fnl__bottle" data-fnl-bottle>
        <div class="fnl__spritz" data-fnl-spritz aria-hidden="true">${'<i></i>'.repeat(22)}</div>
        <div class="fnl__float"><img class="fnl__img" src="/assets/hoa-bottle-${handle}.webp" width="289" height="760" loading="lazy" decoding="async" alt="${esc(niceTitle)} bottle"></div>
        <div class="fnl__shadow" aria-hidden="true"></div>
      </div>${fnlPins}
      <ul class="fnl__cards" role="list">${fnlCards}
      </ul>
    </div>
  </section>
  </div>`;

  // "Pair it with": painted by assets/hoa-commerce.js from the catalog (same mount the Liquid product template uses)
  const pair = '<section class="pdp pdp-section hoa-pair" data-hoa-pair data-handle="' + handle + '" hidden></section>';

  // Attention flow, mirroring templates/product.json:
  //   buy (hero) → why it's worth it (notes, proofs) → understand it (story, craft) → campaign gallery
  //   → reviews (right after the gallery, client 2026-10-05) → discover more.
  // The old "features" strip repeated the proofs, the craft steps and the trust list, so it is no longer shown.
  root.innerHTML = hero + benefits + theFragrance + collage + story + fragranceNotes + notesCards + gallery + reels + reviewSummary + reviewsSection + faq + pair + related + finale;
  // Summary "Write a review" reuses the existing review form / sign-in link above.
  root.querySelector('[data-pdx-write]')?.addEventListener('click', (e) => {
    const target = root.querySelector('[data-pdp-review-open], [data-pdp-review-login]');
    if (target) { e.preventDefault(); target.click(); }
  });
  window.HOA?.initPair?.();
  window.AghaPDP?.init();
  if (window.HOA_BNF) window.HOA_BNF.init();
  else { const b = document.createElement('script'); b.src = '/assets/hoa-benefits.js'; document.body.appendChild(b); }
  // Fragrance notes (light cards): reuse the section file's own <style> and <script>
  fetch('/sections/fragrance-notes.liquid').then((r) => r.text()).then((src) => {
    // Only the top-level blocks (tag at the start of a line), not words in a comment
    const css = src.match(/^<style>\r?\n([\s\S]*?)^<\/style>/m);
    const js = src.match(/^<script>\r?\n([\s\S]*?)^<\/script>/m);
    if (css) { const st = document.createElement('style'); st.textContent = css[1]; document.head.appendChild(st); }
    if (js) { const sc = document.createElement('script'); sc.textContent = js[1]; document.body.appendChild(sc); }
  }).catch(() => {});
  if (reels) {
    const sc = document.createElement('script');
    sc.src = '/assets/hoa-reels.js';
    document.body.appendChild(sc);
  }
})();
