/* ==========================================================================
   AGHA PERFUMES — THEME JS (Cart, Quick View, Scent Finder Quiz, Modals)
   ========================================================================== */

// Local product catalogue for the static preview. On Shopify, the same fields come from
// product data + metafields (custom.tagline, custom.family, custom.top_notes, …).
// TEMPORARY LOCAL-DEV FALLBACK: placeholder fragrance notes + claims per real handle, used only
// while Shopify is not connected (no custom.top_notes / heart_notes / base_notes metafields yet).
// Read by the product page (assets/pdp-preview.js) and the reel viewer (assets/hoa-reels.js);
// real data always wins. Delete once real notes exist.
window.AGHA_DEV_NOTES = {
  'oud-fury': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  'agha-blue': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  maha: { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  'oud-of-dark-paradise': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  'sea-smoke': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  'tobacco-enigma': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  shamamah: { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] },
  'oud-royal': { topNotes: ['Bergamot', 'Saffron', 'Pink Pepper'], heartNotes: ['Rose', 'Jasmine', 'Oud'], baseNotes: ['Musk', 'Amber', 'Sandalwood'], claims: ['Long Lasting', 'Premium Fragrance', 'Unisex'] }
};

// REAL product descriptions, copied from the live store (aghaperfumes.com/products.json, body_html,
// 2026-10-06), one string per paragraph. Used by the reel viewer's Description while the preview has
// no Shopify; on Shopify the product's own description is used instead. Keep in step with the store.
window.AGHA_STORIES = {
  "shamamah": [
    "Shamamah – The Essence of the Deccan",
    "2 Years Aged",
    "100% Natural",
    "Alcohol Free",
    "A fragrance born from ancient alchemy, Shamama is a tribute to the rich heritage of the Qutub Shahi dynasty. Deep, complex, and mysterious, this attar is a fusion of aged woods, exotic spices, and earthy undertones, crafted through a centuries-old distillation process.",
    "Reminiscent of the opulent traditions of Golconda, Shamama carries the warmth of royal hearths, the whispers of sufi gatherings, and the grandeur of Hyderabad’s golden era. With every drop, it unveils a timeless story - of power, poetry, and an undying connection to the land of the Deccan."
  ],
  "tobacco-enigma": [
    "Embark on a journey to the vibrant heart of India with our signature fragrance—a harmonious blend of fresh bergamot, zesty lemon, and soothing lavender. This captivating aroma reveals a warm heart of cinnamon, golden honey, and luxurious jasmine. Grounded by earthy tobacco leaf, tonka, and creamy vanilla, this perfume captures the rich heritage and timeless allure. A tribute to its grandeur, this fragrance is a celebration of tradition with a modern twist."
  ],
  "agha-blue": [
    "Agha blue",
    "Blue is a Symphony of Fresh Elegance and Smoky Depth",
    "Step into a world where clarity meets complexity. This exquisite fragrance opens with the sparkling zest of mandarin orange and the crisp, refreshing coolness of cucumber—a vibrant awakening for the senses. As the scent unfolds, the aromatic heart reveals a sophisticated blend of basil and sage, infusing the composition with earthy green nuances and a refined herbal edge.",
    "In its final evolution, the base notes emerge with irresistible allure—suede brings a smooth, sensual warmth, while woody accords, and a whisper of musk wrap the skin in a lingering veil of smoky, masculine sophistication. Bold yet balanced, fresh yet deeply grounded—this fragrance is a signature of timeless charisma."
  ],
  "oud-fury": [
    "A fragrance that embodies passion, mystery, and opulence, this scent is a captivating blend of exotic ingredients, weaving together a story of sensuality and depth.",
    "The Opening – A Lush and Fiery Invitation",
    "At first breath, the fragrance unveils an intoxicating burst of passion fruit, its tropical sweetness infused with the luxurious warmth of saffron. The delicate yet bold essence of rose adds a romantic touch, setting the stage for a mesmerizing olfactory journey.",
    "The Heart – A Deep and Mysterious Core",
    "As the scent unfolds, the richness of Agarwood (Oud) takes center stage—its deep, woody aroma exuding an air of mystery and power. The earthy warmth of patchouli intertwines with the resinous sweetness of benzoin, creating a heart that is both sensual and sophisticated.",
    "The Base – A Seductive and Lasting Impression",
    "The fragrance settles into a luxurious base where the raw sensuality of leather meets the creamy, comforting embrace of vanilla. The golden glow of amber lingers on the skin, adding an irresistible warmth that captivates and enchants.",
    "This perfume is a masterpiece of contrasts—a bold yet delicate interplay of fruity brightness, smoky woods, and rich, sensual accords. Perfect for those who embrace their individuality and leave a lasting impression wherever they go."
  ],
  "maha": [
    "A radiant symphony of light and warmth, this fragrance opens with the zesty brightness of lime, awakening the senses like the first rays of sunrise. At its heart, the delicate embrace of tiare flower and freesia blossoms into a bouquet of tropical elegance. The journey concludes with the velvety depth of cedarwood and the creamy sweetness of tonka bean, leaving a trail that is both captivating and unforgettable—a perfect balance of fresh vitality and soft allure."
  ],
  "oud-of-dark-paradise": [
    "DARK PARADISE OUD",
    "Embodies the essence of power and prestige, evoking the very soul of greatness. At its heart lies the rich, opulent allure of Oud Wood, revered for centuries as a symbol of luxury and spiritual depth. Crafted with unrivaled mastery, this bold fragrance is softened by elegant accents of Patchouli and Musk. A fresh burst of the exotic spice of Nutmeg and Saffron, creating a dynamic, textured composition. Enchanting and irresistible, this perfume celebrates the timeless magnificence of dark paradise Oud\"."
  ],
  "sea-smoke": [
    "SEA SMOKE is a boundless embrace of nature's raw elegance, this fragrance captures the essence of untamed shores. Fresh bergamot greets you with a vibrant sparkle, while seaweed unveils the soul of the ocean—salty and enigmatic. Soft musk intertwines with rugged cedarwood, grounding the scent in earthy warmth. It's a call to the infinite, an ode to the sea's mysteries—here, there, everywhere."
  ]
};

const AGHA_PRODUCTS = {
  // Real House of Agha line-up. Photography from the brand's Drive folder (see HOA-ASSETS.md).
  // The prices below are overwritten from the shared catalog (see applyToPreviewProducts); on Shopify they come from the product variants.
  'oud-fury': {
    title: "OUD FURY",
    family: "Woody",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-oud-fury.webp', '/assets/hoa-oud-fury-portrait.webp', '/assets/hoa-hero-oud-fury.webp', '/assets/hoa-oud-fury-smoke.webp', '/assets/hoa-craft-embers.webp', '/assets/hoa-world-profile.webp'],
    // PDP buy-column slider + thumbnails + 'more views' tiles (the brand's own Oud Fury photographs)
    media: ['/assets/hoa-pdp-oud-fury-1.webp', '/assets/hoa-pdp-oud-fury-2.webp', '/assets/hoa-pdp-oud-fury-3.webp', '/assets/hoa-pdp-oud-fury-4.webp', '/assets/hoa-pdp-oud-fury-5.webp', '/assets/hoa-pdp-oud-fury-6.webp'],
    description: "Amber smoke, charred wood and a single shaft of evening light.",
    sizes: { 'Eau de Parfum': 4500 },
    compare: { 'Eau de Parfum': 5200 },
    reviews: [{ rating: 5, author: "Arjun M.", location: "Mumbai", verified: true, body: "I wore Oud Fury to a winter wedding and three people asked what it was before the first dance." }]
  },
  'agha-blue': {
    title: "AGHA BLUE",
    family: "Fresh",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-agha-blue.webp', '/assets/hoa-agha-blue-portrait.webp', '/assets/hoa-hero-agha-blue.webp', '/assets/hoa-craft-ice.webp', '/assets/hoa-world-gift.webp'],
    description: "Ice caves, cold stone and the deep blue of a winter night.",
    sizes: { 'Eau de Parfum': 5200 },
    reviews: [{ rating: 5, author: "Sara K.", location: "Dubai", verified: true, body: "Agha Blue feels like cold air after rain. It is the one I reach for on hot, crowded days." }]
  },
  'oud-of-dark-paradise': {
    title: "OUD OF DARK PARADISE",
    family: "Woody",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-dark-paradise.webp', '/assets/hoa-dark-paradise-portrait.webp', '/assets/hoa-hero-dark-paradise.webp', '/assets/hoa-craft-sand.webp', '/assets/hoa-world-hand.webp'],
    description: "Black sand, rising smoke and a room lit only by embers.",
    sizes: { 'Eau de Parfum': 4800 },
    reviews: [{ rating: 5, author: "Rehan S.", location: "London", verified: true, body: "Dark Paradise is my evening scent. Smoky, close to the skin, never loud." }]
  },
  'maha': {
    title: "MAHA",
    family: "Floral",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-maha.webp', '/assets/hoa-maha-portrait.webp', '/assets/hoa-family-floral.webp', '/assets/hoa-craft-water.webp', '/assets/hoa-world-journey.webp'],
    description: "Blossom, warm sand and late sun through an open window.",
    sizes: { 'Eau de Parfum': 4600 },
    compare: { 'Eau de Parfum': 5400 },
    reviews: [{ rating: 5, author: "Noor A.", location: "Hyderabad", verified: true, body: "Maha is soft without being sweet. My mother borrowed it once and never gave it back." }]
  },
  'sea-smoke': {
    title: "SEA SMOKE",
    family: "Fresh",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-sea-smoke.webp', '/assets/hoa-sea-smoke-portrait.webp', '/assets/hoa-family-aquatic.webp', '/assets/hoa-world-water.webp', '/assets/hoa-world-poolside.webp'],
    description: "Clear water, pale stone and salt carried in on the wind.",
    sizes: { 'Eau de Parfum': 4900 },
    reviews: [{ rating: 5, author: "Meera P.", location: "Bengaluru", verified: true, body: "Sea Smoke has been in my carry-on for every trip this year. Clean, salty, easy to wear." }]
  },
  'tobacco-enigma': {
    title: "TOBACCO ENIGMA",
    family: "Aromatic",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-tobacco-enigma.webp', '/assets/hoa-tobacco-enigma-portrait.webp', '/assets/hoa-ingredients-tobacco.webp', '/assets/hoa-family-green.webp', '/assets/hoa-craft-moss.webp'],
    description: "Tobacco leaf, moss and a forest floor after rain.",
    sizes: { 'Eau de Parfum': 5400 },
    reviews: [{ rating: 5, author: "Kabir D.", location: "Delhi", verified: true, body: "Tobacco Enigma is warm and green at the same time. I did not expect to love tobacco this much." }]
  },
  'shamamah': {
    title: "SHAMAMAH",
    family: "Floral",
    eyebrow: 'Eau de Parfum',
    images: ['/assets/hoa-product-shamamah.webp', '/assets/hoa-shamamah-portrait.webp', '/assets/hoa-shamamah-lily.webp'],
    description: "Jasmine, gilded columns and the hush of a palace garden.",
    sizes: { 'Eau de Parfum': 4700 },
    reviews: [{ rating: 5, author: "Layla H.", location: "Doha", verified: true, body: "Shamamah smells like a garden in the late afternoon. It is the bottle guests always pick up first." }]
  },
  'royal-gift-set': {
    title: "THE ROYAL GIFT SET",
    family: "Gift Set",
    eyebrow: 'Gift Set',
    images: ['/assets/hoa-product-gift-set.webp', '/assets/hoa-alt-gift-set.webp'],
    description: "Oud of Dark Paradise, Oud Fury, Tobacco Enigma, Agha Blue and Sea Smoke, laid in the House of Agha keepsake case.",
    // Mirrors the gift-set entry in snippets/hoa-catalog-data.liquid (the bag prices from the catalog).
    sizes: { 'Gift Set': 12999 },
    compare: { 'Gift Set': 14999 },
    reviews: [{ rating: 5, author: "Rhea S.", location: "Hyderabad", verified: true, body: "Gave the gift set for an anniversary. The case alone made the moment, and he wears a different one every day." }]
  },
  // Older placeholder catalogue (not priced by the shared catalog).
  'oud-royal': {
    title: 'OUD ROYAL',
    family: 'Woody & Oud',
    tagline: 'Smoky · Resinous · Indelible',
    images: ['/assets/bestseller_oud_royal.jpg', '/assets/discovery_box.jpg'],
    description: 'An imposing, atmospheric composition constructed around 50-year-old wild Cambodian agarwood, cardamoms harvested at dusk in Kerala, wild Tuscan iris, and dark sueded leather.',
    sizes: { '30 ML': 9800, '50 ML': 14500, '100 ML': 24000 },
    notes: {
      top: 'Pink Pepper, Crushed Cardamom, Saffron Threads',
      heart: 'Wild Black Rose, Tuscan Iris, Incense Mist',
      base: 'Aged Cambodian Oud, Birch Tar, Dark Amber, Sueded Leather'
    },
    keyMaterial: {
      name: '50-year-old Cambodian agarwood',
      text: 'Sourced exclusively from sustainable reserves in Assam & Kampot. Naturally resinous without chemical acceleration.'
    },
    story: {
      heading: 'An encounter between smoke and rose',
      body: 'Oud Royal was born from a nocturnal exploration of old-growth resinous woods. As dusk settles, warm cardamoms and crushed saffron open the experience, before yielding to wild black damask roses steeped in incense mist.'
    },
    mood: 'Nocturnal',
    sillage: 'Wide',
    longevity: '14+ hours',
    reviews: [
      { rating: 5, author: 'Henrique V.', location: 'Paris', verified: true, body: 'Oud Royal is unlike anything from commercial perfume counters. When I put this on, strangers stop me in dark hotel lobbies to ask what scent is floating behind me.' }
    ]
  },
  'velvet-iris': {
    title: 'VELVET IRIS',
    family: 'Floral Suede',
    tagline: 'Powdery · Luminous · Soft',
    images: ['/assets/hero_perfume_bottle.jpg'],
    description: 'An ethereal suede iris fused with white amber and Florentine violet leaves. Powdery, luminous and quietly persistent.',
    sizes: { '30 ML': 8900, '50 ML': 13200, '100 ML': 21800 },
    notes: {
      top: 'Bergamot, Pink Pepper, Violet Leaf',
      heart: 'Florentine Orris Butter, Suede Accord, Heliotrope',
      base: 'White Amber, Musk, Cashmeran'
    }
  },
  'santal-nocturne': {
    title: 'SANTAL NOCTURNE',
    family: 'Woody & Oud',
    tagline: 'Creamy · Smoked · Close',
    images: ['/assets/bestseller_oud_royal.jpg'],
    description: 'Australian sandalwood, smoked papyrus, and bourbon vanilla extract. A creamy, after-dark wood that settles close to the skin.',
    sizes: { '30 ML': 10200, '50 ML': 15000, '100 ML': 24800 },
    notes: {
      top: 'Cardamom, Black Pepper, Fig Leaf',
      heart: 'Smoked Papyrus, Cedarwood, Orris',
      base: 'Australian Sandalwood, Bourbon Vanilla, Tonka Bean'
    }
  },
  'amber-absolute': {
    title: 'AMBER ABSOLUTE',
    family: 'Amber Resins',
    tagline: 'Golden · Resinous · Warm',
    images: ['/assets/hero_perfume_bottle.jpg'],
    description: 'Golden Baltic resin, benzoin tear drops, and crushed Madagascar clove. A warm, glowing amber built for cold evenings.',
    sizes: { '30 ML': 11200, '50 ML': 16500, '100 ML': 27200 },
    notes: {
      top: 'Madagascar Clove, Cinnamon Bark, Mandarin',
      heart: 'Labdanum, Benzoin Siam, Olibanum',
      base: 'Baltic Amber, Vanilla Absolute, Patchouli'
    }
  }
};

// Prices, offers and review figures for the House of Agha line-up come from the one mock catalog
// (snippets/hoa-catalog-data.liquid → assets/hoa-commerce.js), never from the figures above.
if (window.HOA && window.HOA.ready) window.HOA.applyToPreviewProducts(AGHA_PRODUCTS);

const slugify = (text) => (text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const AghaStore = {
  cart: [],

  init() {
    this.loadCart();
    this.bindEvents();
    this.updateCartUI();
  },

  bindEvents() {
    // Cart Drawer Toggle
    document.querySelectorAll('.js-cart-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleCartDrawer();
      });
    });

    document.querySelectorAll('.js-cart-close').forEach(btn => {
      btn.addEventListener('click', () => this.toggleCartDrawer(false));
    });

    // Quantity / remove buttons inside the bag (delegated: the lines are re-rendered)
    const cartBody = document.querySelector('.cart-drawer-body');
    if (cartBody) {
      cartBody.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-cart-act]');
        const line = btn && btn.closest('.cart-line');
        if (!line) return;
        const key = line.dataset.key;
        const act = btn.dataset.cartAct;
        if (act === 'inc') this.changeQty(key, 1);
        else if (act === 'dec') this.changeQty(key, -1);
        else if (act === 'remove') this.removeLine(key);
      });
    }
    const checkout = document.querySelector('[data-cart-checkout]');
    if (checkout) checkout.addEventListener('click', (ev) => { if (!this.cart.length) ev.preventDefault(); });

    // Quick View Modal Triggers
    document.querySelectorAll('.js-quick-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('[data-product-id]');
        if (card) {
          const productData = {
            id: card.dataset.productId || '1',
            title: card.dataset.title || 'Oud Royal',
            price: card.dataset.price || '₹14,500',
            meta: card.dataset.meta || '50 ML · EXTRAIT DE PARFUM',
            image: card.dataset.image || 'assets/bestseller_oud_royal.jpg',
            description: card.dataset.description || 'A rare composition of aged Cambodian oud, crushed cardamom, and wild black rose petals.'
          };
          this.openQuickView(productData);
        }
      });
    });

    // Close Modal Triggers
    document.querySelectorAll('.js-modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeModals());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModals();
        this.toggleCartDrawer(false);
      }
    });

    // Add to Cart buttons
    document.querySelectorAll('.js-add-to-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('[data-product-id]') || btn.closest('.modal-content-box');
        const title = card?.dataset?.title || btn.dataset.title || 'Oud Royal Extrait';
        const price = card?.dataset?.price || btn.dataset.price || '₹14,500';
        const image = card?.dataset?.image || btn.dataset.image || 'assets/bestseller_oud_royal.jpg';
        const size = btn.dataset.size || '50 ML';

        this.addToCart({ id: Date.now(), title, price, image, size });
        this.showToast(`Added ${title} (${size}) to your bag.`);
      });
    });

    // Interactive Quiz Setup
    this.initScentQuiz();

    // Inner Page Controls
    this.initFilterDrawer();
    this.initProductCardLinks();
    this.initPDPVariantSelector();
    this.initStickyBar();
    this.initGiftFinder();
    this.initMobileMenu();
  },

  // Full-screen menu for small screens (snippets/header.liquid → #hoa-menu)
  initMobileMenu() {
    const toggles = document.querySelectorAll('.js-mobile-menu');
    const menu = document.getElementById('hoa-menu');
    if (!toggles.length || !menu) return;
    const root = document.documentElement;
    const label = document.querySelector('.hoa-header__menu-label');
    const set = (open) => {
      root.classList.toggle('hoa-menu-open', open);
      toggles.forEach(b => b.setAttribute('aria-expanded', open ? 'true' : 'false'));
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (open) {
        const first = menu.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      }
    };
    toggles.forEach(b => b.addEventListener('click', () => set(!root.classList.contains('hoa-menu-open'))));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('hoa-menu-open')) set(false);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 960) set(false); });
  },

  initFilterDrawer() {
    const filterBtn = document.querySelector('.js-filter-toggle');
    const drawer = document.querySelector('.filter-drawer');
    const overlay = document.querySelector('.filter-drawer-overlay');
    const closeBtns = document.querySelectorAll('.js-filter-close');

    if (filterBtn && drawer && overlay) {
      filterBtn.addEventListener('click', () => {
        drawer.classList.add('active');
        overlay.classList.add('active');
      });
      closeBtns.forEach(btn => btn.addEventListener('click', () => {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
      }));
      overlay.addEventListener('click', () => {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
      });
    }

    // Filter chip clicks
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const activeFilters = Array.from(document.querySelectorAll('.filter-chip.active')).map(c => c.textContent.trim());
        this.filterProducts(activeFilters);
      });
    });
  },

  filterProducts(filters) {
    const cards = document.querySelectorAll('[data-product-id]');
    if (filters.length === 0) {
      cards.forEach(c => c.style.display = '');
      return;
    }
    cards.forEach(card => {
      const family = (card.dataset.family || '').toUpperCase();
      const meta = (card.dataset.meta || '').toUpperCase();
      const title = (card.dataset.title || '').toUpperCase();
      const match = filters.some(f => family.includes(f) || meta.includes(f) || title.includes(f));
      card.style.display = match ? '' : 'none';
    });
  },

  // Clicking a product card (outside its buttons) opens that product's detail page
  initProductCardLinks() {
    document.querySelectorAll('.product-card, .fragrance-spotlight-card').forEach(card => {
      const slug = slugify(card.dataset.title);
      if (!AGHA_PRODUCTS[slug]) return;
      card.classList.add('is-linked');
      card.addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        window.location.href = `/product.html?p=${slug}`;
      });
    });
  },

  initPDPVariantSelector() {
    document.querySelectorAll('.size-selector-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.size-selector-group');
        if (group) {
          group.querySelectorAll('.size-selector-btn').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          });
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');
          const size = btn.dataset.size || '50 ML';
          const price = btn.dataset.price || '₹14,500';
          const targetPriceEl = document.querySelector('.pdp-price-target');
          if (targetPriceEl) targetPriceEl.textContent = price;
          document.querySelectorAll('.pdp-hero-actions .js-add-to-cart, .pdp-sticky-bar .js-add-to-cart').forEach(cartBtn => {
            cartBtn.dataset.size = size;
            cartBtn.dataset.price = price;
          });
          document.querySelectorAll('[data-pdp="cta"]').forEach(el => { el.textContent = `ADD TO BAG — ${price}`; });
          document.querySelectorAll('[data-pdp="sticky-meta"]').forEach(el => { el.textContent = `${size} · 35% CONCENTRATION`; });
        }
      });
    });
  },

  initStickyBar() {
    const stickyBar = document.querySelector('.pdp-sticky-bar');
    const heroBar = document.querySelector('.pdp-hero-actions');
    if (!stickyBar || !heroBar) return;

    window.addEventListener('scroll', () => {
      const rect = heroBar.getBoundingClientRect();
      if (rect.bottom < 0) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    });
  },

  initGiftFinder() {
    document.querySelectorAll('.gift-concierge-card').forEach(card => {
      card.addEventListener('click', () => {
        const group = card.closest('.gift-concierge-grid');
        if (group) {
          group.querySelectorAll('.gift-concierge-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      });
    });
  },

  toggleCartDrawer(forceState) {
    const drawer = document.querySelector('.cart-drawer');
    const overlay = document.querySelector('.cart-drawer-overlay');
    if (!drawer || !overlay) return;

    const isActive = forceState !== undefined ? forceState : !drawer.classList.contains('active');
    if (isActive) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  addToCart(item) {
    this.cart.push(item);
    this.updateCartUI();
    this.toggleCartDrawer(true);
  },

  // Several units at once (bundles): one bag update, one drawer opening
  addItems(items) {
    items.forEach(i => this.cart.push(i));
    this.updateCartUI();
    this.toggleCartDrawer(true);
  },

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.updateCartUI();
  },

  // One bag line per product+size; the cart array holds one entry per unit. Known products are priced
  // from the shared catalog (assets/hoa-commerce.js), so the key must not include a price.
  cartKey(item) {
    const known = window.HOA && window.HOA.ready ? (item.handle && window.HOA.product(item.handle)) || (item.title && window.HOA.byName(item.title)) : null;
    return known ? known.handle + '|' + (item.size || '') : 'legacy:' + item.title + '|' + item.size;
  },

  changeQty(key, delta) {
    if (delta > 0) {
      const src = this.cart.find(i => this.cartKey(i) === key);
      if (src) this.cart.push({ ...src, id: `${src.id}-${Date.now()}` });
    } else {
      for (let i = this.cart.length - 1; i >= 0; i--) {
        if (this.cartKey(this.cart[i]) === key) { this.cart.splice(i, 1); break; }
      }
    }
    this.updateCartUI();
  },

  removeLine(key) {
    this.cart = this.cart.filter(i => this.cartKey(i) !== key);
    this.updateCartUI();
  },

  parseMoney(str) {
    const m = String(str || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  },

  formatMoney(n, sample) {
    const s = String(sample || '');
    const prefix = (s.match(/^[^\d]*/) || [''])[0];
    const suffix = (s.match(/[^\d.,]+$/) || [''])[0];
    return prefix + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + suffix;
  },

  escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  saveCart() { try { localStorage.setItem('agha-bag', JSON.stringify(this.cart)); } catch (e) {} },
  loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem('agha-bag'));
      if (Array.isArray(saved)) this.cart = saved;
    } catch (e) {}
  },

  // The bag is painted by the commerce layer (assets/hoa-commerce.js): lines, offers, quantity tier,
  // coupon, free-shipping progress and totals all come from one pricing function.
  updateCartUI() {
    this.saveCart();
    if (window.HOA && window.HOA.ready) window.HOA.renderBag(this);
  },

  openQuickView(product) {
    const modal = document.querySelector('.quick-view-modal');
    const overlay = document.querySelector('.modal-overlay');
    if (!modal || !overlay) return;

    modal.querySelector('.qv-title').textContent = product.title;
    modal.querySelector('.qv-meta').textContent = product.meta;
    modal.querySelector('.qv-price').textContent = product.price;
    modal.querySelector('.qv-description').textContent = product.description;
    modal.querySelector('.qv-image').src = product.image;

    modal.dataset.title = product.title;
    modal.dataset.price = product.price;
    modal.dataset.image = product.image;

    modal.classList.add('active');
    overlay.classList.add('active');
  },

  closeModals() {
    document.querySelectorAll('.modal-content-box').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('active'));
  },

  initScentQuiz() {
    let currentStep = 1;
    const selections = {};

    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const step = btn.closest('.quiz-step');
        const nextStepNum = parseInt(step.dataset.step) + 1;

        step.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selections[`step${step.dataset.step}`] = btn.dataset.value;

        setTimeout(() => {
          step.classList.remove('active');
          const nextStep = document.querySelector(`.quiz-step[data-step="${nextStepNum}"]`);
          if (nextStep) {
            nextStep.classList.add('active');
          } else {
            // Show recommendation result
            const resultStep = document.querySelector('.quiz-result-step');
            if (resultStep) resultStep.classList.add('active');
          }
        }, 350);
      });
    });
  },

  showToast(message) {
    let toast = document.querySelector('.gha-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'gha-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: var(--color-near-black);
        color: var(--color-white);
        border: 1px solid var(--color-white);
        padding: 14px 28px;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        z-index: 3000;
        opacity: 0;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => AghaStore.init());
