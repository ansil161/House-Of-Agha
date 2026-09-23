/* ==========================================================================
   AGHA PERFUMES — PRODUCT DETAIL PAGE
   Gallery, variants, quantity, add-to-bag, accordions, sticky dock, delivery
   estimate, recommendations, and one GSAP/ScrollTrigger choreography.
   Works on Shopify (sections/agha-pdp-*.liquid) and on the static preview
   (product.html + pdp-preview.js), which renders the same markup.
   ========================================================================== */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isShopify = Boolean(window.Shopify && window.Shopify.routes);
  const cleanups = [];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  const readJSON = (el) => {
    try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; }
  };
  // theme.js declares AghaStore as a top-level const, which is not a window property
  const store = () => (typeof AghaStore !== 'undefined' ? AghaStore : window.AghaStore);
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  /* ------------------------------------------------------------------ Money */
  function formatMoney(cents, format) {
    if (cents == null) return 'Price on request';
    const value = cents / 100;
    const withDelims = (n, decimals, thousands = ',', decimal = '.') => {
      const [int, frac] = n.toFixed(decimals).split('.');
      const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return frac ? `${grouped}${decimal}${frac}` : grouped;
    };
    const fmt = format || '₹{{amount_no_decimals}}';
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return withDelims(value, 0);
        case 'amount_with_comma_separator': return withDelims(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withDelims(value, 0, '.', ',');
        case 'amount_with_space_separator': return withDelims(value, 2, ' ', ',');
        default: return withDelims(value, 2);
      }
    });
  }

  /* ---------------------------------------------------------------- Gallery */
  function initGallery(main) {
    const slides = $$('[data-pdp-slide]', main);
    const thumbs = $$('[data-pdp-thumb]', main);
    const track = $('[data-pdp-track]', main);
    const counter = $('[data-pdp-count]', main);
    const dots = $$('[data-pdp-dot]', main);
    const swipeMode = window.matchMedia('(max-width: 1100px)');
    let current = 0;

    const setActive = (index, { scroll = false } = {}) => {
      if (!slides[index]) return;
      current = index;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      thumbs.forEach((t, i) => {
        t.classList.toggle('is-active', i === index);
        if (i === index) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      if (counter) counter.textContent = pad(index + 1);
      if (scroll && swipeMode.matches && track) {
        track.scrollTo({ left: slides[index].offsetLeft, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
      // Pause videos that are no longer visible
      slides.forEach((s, i) => {
        const video = $('video', s);
        if (!video) return;
        if (i === index) video.play().catch(() => {});
        else video.pause();
      });
    };

    thumbs.forEach((thumb) => {
      listen(thumb, 'click', () => setActive(Number(thumb.dataset.pdpThumb), { scroll: true }));
    });
    dots.forEach((dot) => {
      listen(dot, 'click', () => setActive(Number(dot.dataset.pdpDot), { scroll: true }));
    });
    $$('[data-pdp-media-step]', main).forEach((btn) => {
      listen(btn, 'click', () => {
        const next = (current + Number(btn.dataset.pdpMediaStep) + slides.length) % slides.length;
        setActive(next, { scroll: true });
      });
    });

    // Keyboard arrows on the rail
    const rail = $('.pdp-rail', main);
    if (rail) {
      listen(rail, 'keydown', (e) => {
        if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const next = (current + (e.key === 'ArrowDown' ? 1 : -1) + slides.length) % slides.length;
        setActive(next);
        thumbs[next]?.focus();
      });
    }

    // Swipe track keeps the counter in sync
    if (track) {
      let ticking = false;
      listen(track, 'scroll', () => {
        if (!swipeMode.matches || ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const index = Math.round(track.scrollLeft / track.clientWidth);
          if (index !== current) setActive(index);
          ticking = false;
        });
      }, { passive: true });
    }

    return { setActive, get current() { return current; }, slides };
  }

  /* --------------------------------------------------------------- Lightbox */
  function initLightbox(main, gallery) {
    const dialog = $('[data-pdp-lightbox]', main);
    const openBtn = $('[data-pdp-expand]', main);
    if (!dialog || !openBtn || typeof dialog.showModal !== 'function') {
      if (openBtn) openBtn.hidden = true;
      return;
    }
    const stage = $('[data-pdp-lightbox-stage]', dialog);
    const count = $('[data-pdp-lightbox-count]', dialog);
    const images = gallery.slides.map((s) => $('img', s)).filter(Boolean);
    if (!images.length) { openBtn.hidden = true; return; }
    let index = 0;

    const show = (i) => {
      index = (i + images.length) % images.length;
      const src = images[index].dataset.pdpFull || images[index].currentSrc || images[index].src;
      stage.innerHTML = '';
      const img = new Image();
      img.src = src;
      img.alt = images[index].alt;
      stage.appendChild(img);
      if (count) count.textContent = pad(index + 1);
    };

    listen(openBtn, 'click', () => {
      const activeImg = $('img', gallery.slides[gallery.current]);
      show(Math.max(0, images.indexOf(activeImg)));
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
    listen(dialog, 'close', () => {
      document.body.style.overflow = '';
      gallery.setActive(gallery.slides.findIndex((s) => $('img', s) === images[index]), { scroll: true });
    });
    listen(dialog, 'click', (e) => {
      if (e.target.closest('[data-pdp-lightbox-close]') || e.target === stage) dialog.close();
      const step = e.target.closest('[data-pdp-lightbox-step]');
      if (step) show(index + Number(step.dataset.pdpLightboxStep));
    });
    listen(dialog, 'keydown', (e) => {
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });
  }

  /* --------------------------------------------------------------- Variants */
  function initVariants(main) {
    const variants = readJSON($('[data-pdp-variants]', main)) || [];
    const stockLevels = readJSON($('[data-pdp-stock-levels]', main)) || {};
    const settings = readJSON($('[data-pdp-settings]', main)) || {};
    const moneyFormat = main.dataset.moneyFormat;
    const fieldsets = $$('[data-pdp-option]', main);
    const idInput = $('[data-pdp-variant-id]', main);
    const state = { variant: variants.find((v) => String(v.id) === idInput?.value) || variants[0] };

    const render = (variant) => {
      const available = Boolean(variant && variant.available);
      const price = variant ? formatMoney(variant.price, moneyFormat) : '';

      $$('[data-pdp-price]', main).forEach((el) => { el.textContent = price; });
      $$('[data-pdp-add-price]', main).forEach((el) => { el.textContent = price; });
      $$('[data-pdp-variant-title]', main).forEach((el) => { el.textContent = variant ? variant.title : ''; });

      const compare = $('[data-pdp-compare]', main);
      if (compare) {
        const onSale = variant && variant.compare_at_price > variant.price;
        compare.hidden = !onSale;
        if (onSale) compare.textContent = formatMoney(variant.compare_at_price, moneyFormat);
      }

      $$('[data-pdp-add], [data-pdp-dock-add]', main).forEach((btn) => {
        if (btn.classList.contains('is-loading') || btn.classList.contains('is-added')) return;
        btn.disabled = !available;
        const label = $('[data-pdp-add-label]', btn);
        if (label) label.textContent = variant ? (available ? 'Add to bag' : 'Sold out') : 'Unavailable';
      });

      const stock = $('[data-pdp-stock]', main);
      if (stock) {
        const qty = variant ? stockLevels[variant.id] : null;
        const threshold = settings.lowStockThreshold || 5;
        if (!variant || !available) {
          stock.dataset.state = 'sold-out';
          stock.textContent = variant ? 'Currently unavailable' : 'This combination is unavailable';
        } else if (typeof qty === 'number' && qty > 0 && qty <= threshold) {
          stock.dataset.state = 'low';
          stock.textContent = `Only ${qty} left`;
        } else {
          stock.dataset.state = 'in';
          stock.textContent = settings.inStockText || 'In stock';
        }
      }

      if (variant && idInput) idInput.value = variant.id;

      // Jump the gallery to the variant's image when it has one
      if (variant && variant.featured_media && main._pdpGallery) {
        const target = variant.featured_media.position - 1;
        if (main._pdpGallery.slides[target]) main._pdpGallery.setActive(target, { scroll: true });
      }

      if (isShopify && variant) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
      }
    };

    fieldsets.forEach((fieldset) => {
      listen(fieldset, 'change', () => {
        const selected = fieldsets.map((fs) => $('input:checked', fs)?.value);
        fieldsets.forEach((fs, i) => {
          const out = $('[data-pdp-option-value]', fs);
          if (out) out.textContent = selected[i];
        });
        state.variant = variants.find((v) => v.options.every((opt, i) => opt === selected[i]));
        render(state.variant);
        const live = $('[data-pdp-live]', main);
        if (live && state.variant) live.textContent = `${state.variant.title}, ${formatMoney(state.variant.price, moneyFormat)}`;
      });
    });

    return state;
  }

  /* --------------------------------------------------------------- Quantity */
  function initQuantity(main) {
    const box = $('[data-pdp-qty]', main);
    if (!box) return;
    const input = $('input', box);
    const minus = $('[data-pdp-qty-step="-1"]', box);
    const clamp = (v) => Math.min(Number(input.max) || 99, Math.max(1, Number.parseInt(v, 10) || 1));
    const sync = () => { minus.disabled = Number(input.value) <= 1; };

    $$('[data-pdp-qty-step]', box).forEach((btn) => {
      listen(btn, 'click', () => {
        input.value = clamp(Number(input.value) + Number(btn.dataset.pdpQtyStep));
        sync();
      });
    });
    listen(input, 'change', () => { input.value = clamp(input.value); sync(); });
    sync();
  }

  /* ------------------------------------------------------------ Add to bag */
  function setButtonState(btn, state) {
    const label = $('[data-pdp-add-label]', btn);
    if (!btn._pdpLabel) btn._pdpLabel = label ? label.textContent : '';
    btn.classList.remove('is-loading', 'is-added');
    btn.removeAttribute('aria-busy');
    if (state === 'loading') {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      if (label) label.textContent = 'Adding';
    } else if (state === 'added') {
      btn.classList.add('is-added');
      if (label) label.textContent = 'Added to bag ✓';
    } else {
      btn.disabled = false;
      if (label) label.textContent = btn._pdpLabel || 'Add to bag';
      btn._pdpLabel = '';
    }
  }

  function initAddToBag(main, variantState) {
    const form = $('[data-pdp-form]', main);
    if (!form) return;
    const mainBtn = $('[data-pdp-add]', form);
    const dockBtn = $('[data-pdp-dock-add]', main);
    const qtyInput = $('input[name="quantity"]', form);
    const live = $('[data-pdp-live]', main);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const addToBag = async (buttons) => {
      const variant = variantState.variant;
      if (!variant || !variant.available) return false;
      const quantity = Number(qtyInput?.value) || 1;
      buttons.forEach((b) => setButtonState(b, 'loading'));

      try {
        if (isShopify) {
          const body = new FormData(form);
          const res = await fetch(`${window.Shopify.routes.root}cart/add.js`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.description || 'We couldn’t add this to your bag.');
          }
          await wait(250);
        } else {
          await wait(650);
        }

        buttons.forEach((b) => setButtonState(b, 'added'));
        if (live) live.textContent = `${main.dataset.productTitle || ''} added to your bag`;

        // Mirror into the theme's bag drawer so the header count and drawer stay in sync
        const bag = store();
        if (bag) {
          const image = $('[data-pdp-slide] img', main);
          const price = formatMoney(variant.price, main.dataset.moneyFormat);
          for (let i = 0; i < quantity; i += 1) {
            bag.cart.push({
              id: `${variant.id}-${Date.now()}-${i}`,
              title: main.dataset.productTitle || variant.name,
              price,
              image: image ? image.currentSrc || image.src : '',
              size: variant.title
            });
          }
          bag.updateCartUI();
          setTimeout(() => bag.toggleCartDrawer(true), 450);
        }
        await wait(1600);
        return true;
      } catch (error) {
        store()?.showToast?.(error.message);
        return false;
      } finally {
        buttons.forEach((b) => setButtonState(b, 'idle'));
        buttons.forEach((b) => { b.disabled = !(variantState.variant && variantState.variant.available); });
      }
    };

    listen(form, 'submit', (e) => {
      e.preventDefault();
      addToBag([mainBtn, dockBtn].filter(Boolean));
    });
    if (dockBtn) listen(dockBtn, 'click', () => addToBag([mainBtn, dockBtn].filter(Boolean)));

    // Preview-only "Buy it now" (Shopify renders its own dynamic checkout button)
    const buyNow = $('[data-pdp-buy-now]', main);
    if (buyNow) listen(buyNow, 'click', () => addToBag([mainBtn].filter(Boolean)));
  }

  /* ------------------------------------------------------------ Sticky dock */
  function initDock(main) {
    const dock = $('[data-pdp-dock]', main);
    const anchor = $('.pdp-buy', main);
    if (!dock || !anchor || !('IntersectionObserver' in window)) return;
    const dockBtn = $('[data-pdp-dock-add]', dock);
    let pastCta = false;
    let nearEnd = false;
    const update = () => {
      const visible = pastCta && !nearEnd;
      dock.classList.toggle('is-visible', visible);
      dock.setAttribute('aria-hidden', String(!visible));
      if (dockBtn) dockBtn.tabIndex = visible ? 0 : -1;
    };

    const ctaObserver = new IntersectionObserver(([entry]) => {
      pastCta = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    ctaObserver.observe(anchor);

    const footer = $('.footer') || $('[data-pdp-finale]');
    let endObserver;
    if (footer) {
      endObserver = new IntersectionObserver(([entry]) => { nearEnd = entry.isIntersecting; update(); });
      endObserver.observe(footer);
    }
    cleanups.push(() => { ctaObserver.disconnect(); endObserver?.disconnect(); });
  }

  /* --------------------------------------------------------------- Wishlist */
  // Saved per browser; swap for an app/customer-account integration if one is added
  function initWishlist(main) {
    const btn = $('[data-pdp-wishlist]', main);
    if (!btn) return;
    const key = 'agha-wishlist';
    const id = main.dataset.productHandle || main.dataset.productTitle;
    const read = () => {
      try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
    };
    const sync = () => {
      const saved = read().includes(id);
      btn.setAttribute('aria-pressed', String(saved));
      btn.setAttribute('aria-label', saved ? 'Remove from wishlist' : 'Save to wishlist');
    };
    listen(btn, 'click', () => {
      const list = read();
      const saved = list.includes(id);
      const next = saved ? list.filter((x) => x !== id) : [...list, id];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
      sync();
      store()?.showToast?.(saved ? 'Removed from your wishlist.' : 'Saved to your wishlist.');
      if (!saved && window.gsap && !reduceMotion.matches) {
        window.gsap.fromTo($('svg', btn), { scale: 0.7 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      }
    });
    sync();
  }

  /* -------------------------------------------------------- Delivery window */
  function initDelivery(main) {
    const box = $('[data-pdp-delivery]', main);
    if (!box) return;
    const addBusinessDays = (date, days) => {
      const d = new Date(date);
      let added = 0;
      while (added < days) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) added += 1; // Sundays excluded
      }
      return d;
    };
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fmt = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const fmtDay = (d) => `${DAYS[d.getDay()]} ${fmt(d)}`;
    const today = new Date();
    const dispatch = addBusinessDays(today, Number(box.dataset.dispatchDays) || 0);
    const min = addBusinessDays(today, Number(box.dataset.minDays) || 3);
    const max = addBusinessDays(today, Math.max(Number(box.dataset.maxDays) || 6, Number(box.dataset.minDays) || 3));

    const range = $('[data-pdp-delivery-range]', box);
    if (range) range.textContent = `${fmtDay(min)} – ${fmtDay(max)}`;
    const set = (key, text) => { const el = $(`[data-pdp-delivery-date="${key}"]`, box); if (el) el.textContent = text; };
    set('order', fmt(today));
    set('dispatch', fmt(dispatch));
    set('deliver', `${fmt(min)} – ${fmt(max)}`);

    // "Order within Xh Ym" — only when a same-day dispatch cutoff is configured
    const cutoff = Number(box.dataset.cutoffHour);
    const summary = $('[data-pdp-delivery-summary]', box);
    if (summary && cutoff > 0 && today.getDay() !== 0) {
      const end = new Date(today);
      end.setHours(cutoff, 0, 0, 0);
      const renderCountdown = () => {
        const ms = end - new Date();
        if (ms <= 0) return false;
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        summary.innerHTML = `Order within <strong>${h}h ${pad(m)}m</strong> to receive it between <strong>${fmtDay(min)}</strong> and <strong>${fmtDay(max)}</strong>`;
        return true;
      };
      if (renderCountdown()) {
        const timer = setInterval(() => { if (!renderCountdown()) clearInterval(timer); }, 30000);
        cleanups.push(() => clearInterval(timer));
      }
    }
  }

  /* ------------------------------------------------------------- Accordions */
  function initAccordions(scope) {
    $$('details[data-pdp-accordion]', scope).forEach((details) => {
      const summary = $('summary', details);
      const body = $('.pdp-accordion__body', details);
      if (!summary || !body) return;
      listen(summary, 'click', (e) => {
        if (reduceMotion.matches || !body.animate) return;
        e.preventDefault();
        if (details.open) {
          const anim = body.animate(
            [{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
            { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
          );
          body.style.overflow = 'hidden';
          anim.onfinish = () => { details.open = false; body.style.overflow = ''; };
        } else {
          details.open = true;
          const h = body.offsetHeight;
          body.style.overflow = 'hidden';
          const anim = body.animate(
            [{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }],
            { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
          );
          anim.onfinish = () => { body.style.overflow = ''; };
        }
      });
    });
  }

  /* -------------------------------------------------------- Recommendations */
  async function initRecommendations() {
    const section = $('[data-pdp-related][data-url]');
    if (!section || !isShopify || section.querySelector('.pdp-rel')) return;
    try {
      const res = await fetch(section.dataset.url);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-pdp-related]');
      if (fresh && fresh.innerHTML.trim()) {
        section.innerHTML = fresh.innerHTML;
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        revealNow($$('[data-pdp-reveal]', section));
      }
    } catch (e) {
      /* Recommendations are optional */
    }
  }

  function revealNow(els) {
    if (!window.gsap || reduceMotion.matches) {
      els.forEach((el) => { el.style.opacity = 1; });
      return;
    }
    window.gsap.fromTo(els, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out' });
  }

  /* ----------------------------------------------------------------- Motion */
  let motionCtx = null;

  function showEverything() {
    document.documentElement.classList.remove('pdp-js');
    document.documentElement.classList.add('pdp-no-motion');
  }

  function initMotion() {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger || reduceMotion.matches) {
      showEverything();
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.remove('pdp-no-motion');
    document.documentElement.classList.add('pdp-js');
    const scope = $('#main-content') || $('main') || document.body;

    motionCtx = gsap.context(() => {
      const ease = 'power3.out';

      /* Hero — product first, then the purchase column in a quick cascade */
      const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
      const stage = $('[data-pdp-stage]', scope);
      const firstImg = $('[data-pdp-slide].is-active img', scope);
      if (stage) intro.fromTo(stage, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, clearProps: 'transform' }, 0);
      if (firstImg) intro.fromTo(firstImg, { scale: 1.1 }, { scale: 1, duration: 1.6, clearProps: 'transform' }, 0);
      const thumbs = $$('.pdp-thumb', scope);
      if (thumbs.length) intro.fromTo(thumbs, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.06, clearProps: 'transform' }, 0.25);
      intro.fromTo('[data-pdp-hero-item]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, clearProps: 'transform' }, 0.2);

      /* Headings and copy */
      const reveals = $$('[data-pdp-reveal]', scope);
      gsap.set(reveals, { y: 24 });
      ScrollTrigger.batch(reveals, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease, clearProps: 'transform' })
      });

      /* Cards rise in groups, row by row */
      const cards = $$('[data-pdp-card]', scope);
      gsap.set(cards, { autoAlpha: 0, y: 40 });
      ScrollTrigger.batch(cards, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease, clearProps: 'transform' })
      });

      /* Discover the fragrance — heading (above, via data-pdp-reveal), then the image,
         then the facts in pairs from either side while their hairlines draw towards it */
      $$('[data-pdp-fnotes]', scope).forEach((sec) => {
        const stageEl = $('.pdp-fnotes__stage', sec);
        const img = $('[data-pdp-fnotes-image]', sec);
        const facts = $$('[data-pdp-fnote]', sec);
        if (!stageEl || !facts.length) return;
        const wide = window.matchMedia('(min-width: 769px)').matches;
        const rules = wide ? facts.map((f) => $('.pdp-fnote__rule', f)).filter(Boolean) : [];
        const row = (f) => parseInt((f.style.gridArea || '').replace(/\D/g, ''), 10) || 0;
        const ordered = wide ? facts.slice().sort((a, b) => row(a) - row(b)) : facts;

        if (img) gsap.set(img, { autoAlpha: 0, y: 24 });
        facts.forEach((f) => gsap.set(f, { autoAlpha: 0, x: wide ? (f.dataset.side === 'left' ? -18 : 18) : 0, y: wide ? 0 : 16 }));
        if (rules.length) gsap.set(rules, { scaleX: 0 });

        const tl = gsap.timeline({ scrollTrigger: { trigger: stageEl, start: 'top 78%', once: true } });
        if (img) tl.to(img, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power2.out', clearProps: 'transform' }, 0);
        tl.to(ordered, { autoAlpha: 1, x: 0, y: 0, duration: 1.1, stagger: 0.14, ease, clearProps: 'transform' }, 0.45);
        if (rules.length) tl.to(rules, { scaleX: 1, duration: 0.9, stagger: 0.14, ease: 'power2.inOut' }, 0.75);
      });

      /* Craft — steps rise in turn while the progress line draws across */
      const steps = $('[data-pdp-steps]', scope);
      if (steps) {
        const stepEls = $$('[data-pdp-step]', steps);
        gsap.set(stepEls, { autoAlpha: 0, y: 40 });
        const progress = $('[data-pdp-steps-progress]', steps);
        const tl = gsap.timeline({ scrollTrigger: { trigger: steps, start: 'top 80%', once: true } });
        tl.to(stepEls, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ease, clearProps: 'transform' });
        if (progress) tl.fromTo(progress, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, 0.1);
        stepEls.forEach((step, i) => tl.call(() => step.classList.add('is-active'), null, 0.35 + i * 0.3));
      }

      /* Scroll-linked depth on the large images (not on small screens) */
      const mm = gsap.matchMedia();
      mm.add('(min-width: 769px)', () => {
        const depth = (img, trigger, from) => {
          if (!img) return;
          gsap.fromTo(img, from, {
            scale: 1,
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        };
        const storyImg = $('[data-pdp-story-media] img', scope);
        depth(storyImg, storyImg?.parentElement, { scale: 1.12, yPercent: -3 });
        const collageImg = $('.pdp-collage__bottle img', scope);
        depth(collageImg, collageImg?.parentElement, { scale: 1.1, yPercent: 0 });
        const bannerImg = $('[data-pdp-banner] img', scope);
        depth(bannerImg, bannerImg?.closest('[data-pdp-banner]'), { scale: 1.12, yPercent: 0 });
      });
    }, scope);

    // Late-loading images change section heights
    listen(window, 'load', () => ScrollTrigger.refresh(), { once: true });
  }

  /* ------------------------------------------------------------------- Boot */
  function init() {
    const main = $('[data-pdp-main]');
    if (main) {
      main.dataset.productTitle = main.dataset.productTitle || $('.pdp-title', main)?.textContent.trim() || '';
      const gallery = initGallery(main);
      main._pdpGallery = gallery;
      initLightbox(main, gallery);
      const variantState = initVariants(main);
      initQuantity(main);
      initAddToBag(main, variantState);
      initDock(main);
      initDelivery(main);
      initWishlist(main);
    }
    initAccordions(document);
    initRecommendations();
    initMotion();
  }

  function destroy() {
    if (motionCtx) {
      motionCtx.revert();
      motionCtx = null;
      // Tweens that never started don't restore their pre-state on revert; clear it explicitly
      window.gsap?.set('[data-pdp-reveal], [data-pdp-hero-item], [data-pdp-card], [data-pdp-step], [data-pdp-stage], .pdp-thumb, [data-pdp-fnote], [data-pdp-fnotes-image], .pdp-fnote__rule', { clearProps: 'transform,opacity,visibility' });
    }
    cleanups.splice(0).forEach((fn) => fn());
  }

  // Motion preference can change while the page is open
  const onMotionPref = () => { destroy(); init(); };
  reduceMotion.addEventListener?.('change', onMotionPref);

  // Shopify theme editor: re-initialise when a PDP section is re-rendered
  document.addEventListener('shopify:section:load', (e) => {
    if (e.target.querySelector('.pdp')) { destroy(); init(); }
  });
  document.addEventListener('shopify:section:unload', (e) => {
    if (e.target.querySelector('.pdp')) destroy();
  });

  window.AghaPDP = { init, destroy, formatMoney };

  // pdp-preview.js renders the static preview first and then calls AghaPDP.init()
  if (!document.querySelector('[data-pdp-preview]')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
