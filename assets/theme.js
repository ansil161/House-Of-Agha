/* ==========================================================================
   AGHA PERFUMES — THEME JS (Cart, Quick View, Scent Finder Quiz, Modals)
   ========================================================================== */

// Local product catalogue for the static preview. On Shopify, the same fields come from
// product data + metafields (custom.tagline, custom.family, custom.top_notes, …).
const AGHA_PRODUCTS = {
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

const slugify = (text) => (text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const AghaStore = {
  cart: [],

  init() {
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

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.updateCartUI();
  },

  updateCartUI() {
    const countElements = document.querySelectorAll('.cart-count');
    countElements.forEach(el => el.textContent = this.cart.length);

    const body = document.querySelector('.cart-drawer-body');
    if (!body) return;

    if (this.cart.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; margin: auto 0; color: var(--color-muted);">
          <p style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 8px;">Your Bag is Empty</p>
          <p style="font-size: 0.8rem;">Explore our Signature Fragrances to select your scent.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = this.cart.map((item, i) => `
      <div style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 16px;">
        <img src="${item.image}" alt="${item.title}" style="width: 70px; height: 90px; object-fit: cover;">
        <div style="flex-grow: 1;">
          <h4 style="font-family: var(--font-serif); font-size: 1.1rem;">${item.title}</h4>
          <p style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase;">${item.size} · EXTRAIT DE PARFUM</p>
          <p style="font-size: 0.9rem; margin-top: 4px;">${item.price}</p>
        </div>
        <button onclick="AghaStore.removeFromCart(${i})" style="background: none; border: none; color: var(--color-muted); cursor: pointer; font-size: 1.2rem;">&times;</button>
      </div>
    `).join('');
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
