/* ==========================================================================
   AGHA PERFUMES — THEME JS (Cart, Quick View, Scent Finder Quiz, Modals)
   ========================================================================== */

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
