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
  // Editorial wall (tablet / desktop): slide 0 is the dominant image, the rest sit in fixed supporting
  // slots. A slot has a shape (data-slot) and a position (CSS order); clicking a supporting image trades
  // slots with the main image, so the wall's geometry never changes, only which photograph is where.
  // The trade is one GSAP move: each figure travels from the other's box to its own (position + size)
  // while its photograph is counter-scaled, so nothing is stretched. Rapid clicks settle the previous move
  // first. Without GSAP or with reduced motion the trade is instant.
  // Phones: a swipeable strip (CSS scroll-snap); this code only tracks the visible image and progress.
  const wallMode = () => window.matchMedia('(min-width: 769px)').matches;

  // Shapes for slots 1..n-1: rows of two alternating portrait / square; a lone last image spans the width
  function slotShapes(n) {
    const shapes = ['main'];
    for (let i = 1; i < n; i += 1) {
      const lone = i === n - 1 && (n - 1) % 2 === 1;
      shapes.push(lone ? 'wide' : (Math.floor((i - 1) / 2) % 2 === 0 ? 'a' : 'b'));
    }
    return shapes;
  }

  function initGallery(main) {
    const story = $('[data-pdp-story]', main);
    const track = $('[data-pdp-track]', main);
    const slides = $$('[data-pdp-slide]', main);
    const counter = $('[data-pdp-count]', main);
    const bar = $('[data-pdp-bar]', main);
    const n = slides.length;
    // Thumbnail gallery: one large frame + a strip of thumbnails; no wall / swipe strip behaviour
    const thumbMode = Boolean(story && story.hasAttribute('data-pdp-thumbs'));
    const thumbBtns = $$('[data-pdp-thumb]', main);
    const wallMode = () => !thumbMode && window.matchMedia('(min-width: 769px)').matches;
    const shapes = slotShapes(n);
    const slotOf = slides.map((_, i) => i); // slotOf[i] = the slot slide i sits in (0 = main)
    let mainIndex = 0; // slide in slot 0 (wall)
    let current = 0; // slide showing (wall: the main one; strip: the most visible)
    let swapping = null;

    const media = (slide) => $('img, video', slide);
    // GSAP writes the individual transform properties as well as `transform`; remove all of them so the
    // stylesheet's hover `scale` is not overridden by a leftover inline `scale: none`
    const clean = (el) => {
      if (!el) return;
      ['transform', 'transform-origin', 'translate', 'rotate', 'scale', 'z-index'].forEach((p) => el.style.removeProperty(p));
    };

    const paint = () => {
      const wall = wallMode() && n > 1;
      slides.forEach((s, i) => {
        const k = slotOf[i];
        if (wall) {
          s.dataset.slot = shapes[k];
          s.dataset.role = k === 0 ? 'main' : 'support';
          s.style.order = k;
          s.classList.toggle('is-extra', k > 4);
          s.tabIndex = 0;
          s.setAttribute('role', 'button');
          s.setAttribute('aria-label', k === 0 ? 'Open image ' + (i + 1) + ' full screen' : 'Show image ' + (i + 1) + ' as the main image');
        } else {
          delete s.dataset.slot;
          delete s.dataset.role;
          s.style.removeProperty('order');
          s.classList.remove('is-extra');
          s.removeAttribute('tabindex');
          s.removeAttribute('role');
          s.removeAttribute('aria-label');
        }
      });
    };

    const markActive = (index) => {
      current = index;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      thumbBtns.forEach((b, i) => {
        // with more photos than tiles, the last tile (the "+N" one) stands for all the photos after it
        const on = i === index || (i === thumbBtns.length - 1 && index > i);
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-current', on ? 'true' : 'false');
      });
      if (counter) counter.textContent = pad(index + 1);
      // Play only the videos that can be seen
      slides.forEach((s, i) => {
        const video = $('video', s);
        if (!video) return;
        if (i === index || (wallMode() && slotOf[i] < 5)) video.play().catch(() => {});
        else video.pause();
      });
    };

    const settle = () => {
      if (!swapping || !window.gsap) return;
      const { gsap } = window;
      swapping.forEach((el) => { gsap.killTweensOf(el); const m = media(el); if (m) gsap.killTweensOf(m); });
      swapping.forEach((el) => { clean(el); clean(media(el)); });
      swapping = null;
    };

    // Trade slots between slide `i` and the current main image
    const swapToMain = (i) => {
      if (!wallMode() || i === mainIndex || !slides[i]) return;
      const { gsap } = window;
      const animate = Boolean(gsap) && !reduceMotion.matches;
      const a = slides[i];
      const b = slides[mainIndex];
      if (animate) settle();
      const first = animate ? [a, b].map((el) => el.getBoundingClientRect()) : null;

      const t = slotOf[i];
      slotOf[i] = slotOf[mainIndex];
      slotOf[mainIndex] = t;
      mainIndex = i;
      paint();
      markActive(i);
      if (!animate) return;

      const last = [a, b].map((el) => el.getBoundingClientRect());
      const els = [a, b];
      els.forEach((el, j) => {
        const f = first[j];
        const l = last[j];
        const sx = f.width / l.width;
        const sy = f.height / l.height;
        const m = media(el);
        gsap.fromTo(el,
          { x: f.left - l.left, y: f.top - l.top, scaleX: sx, scaleY: sy, transformOrigin: '0 0', zIndex: j === 0 ? 4 : 3 },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.7, ease: 'power3.inOut', onComplete: () => clean(el) });
        if (m) {
          gsap.fromTo(m,
            { scaleX: 1 / sx, scaleY: 1 / sy, transformOrigin: '0 0' },
            { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'power3.inOut', onComplete: () => clean(m) });
        }
      });
      swapping = els;
      gsap.delayedCall(0.75, () => { if (swapping === els) swapping = null; });
    };

    // Bring the main slot into view first if the reader has scrolled past it
    const promote = (i) => {
      if (i === mainIndex) return;
      const top = slides[mainIndex].getBoundingClientRect().top;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pdp-header-offset')) || 96;
      if (top < header - 60 && !reduceMotion.matches) {
        window.scrollTo({ top: top + window.scrollY - header - 12, behavior: 'smooth' });
        setTimeout(() => swapToMain(i), 420);
      } else {
        swapToMain(i);
      }
    };

    // setActive(index, {scroll}): a variant's own image (or the lightbox closing on another image) asks for
    // that photograph to be the main one. Otherwise on phones it just records what is on screen.
    const phoneStripQ = () => thumbMode && window.matchMedia('(max-width: 768px)').matches;
    const setActive = (index, { scroll = false } = {}) => {
      if (!slides[index]) return;
      if (wallMode() && n > 1) {
        if (scroll) promote(index);
        else if (index === mainIndex) markActive(index);
        return;
      }
      markActive(index);
      if (scroll && track && (!thumbMode || phoneStripQ())) {
        const el = slides[index];
        track.scrollTo({ left: el.offsetLeft - (parseFloat(getComputedStyle(track).paddingLeft) || 0), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    };

    // Phones: the visible image is the one most on screen; the bar follows the strip's scroll.
    // The thumbnail gallery is a swipe strip on phones as well (pdp.css "MOBILE PDP").
    const phoneStrip = () => thumbMode && window.matchMedia('(max-width: 768px)').matches;
    if (story && n > 1 && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (wallMode() || (thumbMode && !phoneStrip())) return;
        const best = entries.filter((e) => e.isIntersecting).sort((x, y) => y.intersectionRatio - x.intersectionRatio)[0];
        if (best) markActive(slides.indexOf(best.target));
      }, { threshold: [0.25, 0.5, 0.75] });
      slides.forEach((s) => io.observe(s));
      cleanups.push(() => io.disconnect());
    }
    if (track && bar) {
      let raf = 0;
      listen(track, 'scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const max = track.scrollWidth - track.clientWidth;
          bar.style.transform = 'scaleX(' + (max > 0 ? Math.max(0.05, track.scrollLeft / max) : 1) + ')';
        });
      }, { passive: true });
    }

    slides.forEach((slide, i) => {
      const activate = () => {
        if (!wallMode()) {
          // phones: a tap opens the image full screen
          setActive(i);
          $('[data-pdp-expand]', main)?.click();
          return;
        }
        if (i === mainIndex) $('[data-pdp-expand]', main)?.click();
        else promote(i);
      };
      listen(slide, 'click', activate);
      listen(slide, 'keydown', (e) => {
        if (!wallMode() || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        activate();
      });
    });

    thumbBtns.forEach((b, i) => listen(b, 'click', () => setActive(i)));
    paint();
    markActive(0);
    listen(window.matchMedia('(min-width: 769px)'), 'change', () => { settle(); paint(); markActive(wallMode() ? mainIndex : current); });

    return {
      setActive,
      slides,
      get current() { return current; },
      setProgress() {}
    };
  }

  /* ------------------------------------------------ Gallery tiles: swap */
  // The 2 x 2 photos under the main image (.pdp-tiles). A tile holds one slide index (data-pdp-tile);
  // clicking it makes that photo the main image and the tile takes the photo that was main, so each
  // photo appears once. Anything else that changes the main photo (variant image, lightbox) goes
  // through the same setActive, so the tiles always stay in step.
  function initGalleryTiles(main, gallery) {
    const tiles = $$('[data-pdp-tile]', main);
    if (!tiles.length || !gallery) return;
    const slideImg = (i) => $('img', gallery.slides[i]);
    const show = (tile, i) => {
      const from = slideImg(i);
      const img = $('img', tile);
      if (!from || !img) return;
      img.removeAttribute('srcset');
      img.src = from.currentSrc || from.src;
      if (from.srcset) { img.srcset = from.srcset; img.sizes = '(min-width: 769px) 28vw, 1px'; }
      tile.dataset.pdpTile = String(i);
    };
    const setActive = gallery.setActive;
    gallery.setActive = (index, opts) => {
      const prev = gallery.current;
      setActive(index, opts);
      if (index === prev) return;
      const tile = tiles.find((t) => +t.dataset.pdpTile === index);
      if (tile) show(tile, prev);                                  // the old main photo takes its place
    };
    tiles.forEach((tile) => listen(tile, 'click', () => {
      const i = +tile.dataset.pdpTile;
      if (!gallery.slides[i]) return;
      gallery.setActive(i);
    }));
  }

  /* ------------------------------------------- Two columns: held in view, 769px+ */
  // The shorter of the two columns (gallery / information) follows the screen while the taller one
  // scrolls: it holds under the header, or — when it is taller than the screen — scrolls until its end
  // is in view and holds there. It is moved with a transform clamped to the product grid, so it
  // releases exactly where the main product section ends and never covers the sections below.
  // (CSS position: sticky was dropped here: Chrome snaps a sticky column that is taller than the
  // screen back to its start at the release point instead of letting it slide out.)
  function initColumnSticky(main) {
    const grid = $('.pdp-hero__grid', main);
    const cols = [$('.pdp-media', main), $('.pdp-info', main)].filter(Boolean);
    if (!grid || cols.length < 2) return;
    const wide = window.matchMedia('(min-width: 769px)');
    let raf = 0;
    const reset = () => cols.forEach((c) => { c.style.removeProperty('transform'); c.classList.remove('is-held'); });
    const update = () => {
      raf = 0;
      if (!wide.matches) { reset(); return; }
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pdp-header-offset')) || 96;
      const g = grid.getBoundingClientRect();
      cols.forEach((col) => {
        const h = col.offsetHeight;
        const room = g.height - h;                                   // how far this column can travel
        if (room <= 1) { col.style.removeProperty('transform'); col.classList.remove('is-held'); return; }
        const hold = Math.min(header + 12, window.innerHeight - h - 16);   // where it rests on screen (matches the 28px in pdp.css)
        const y = Math.max(0, Math.min(room, hold - g.top));
        col.style.transform = y ? 'translate3d(0,' + y.toFixed(1) + 'px,0)' : '';
        col.classList.toggle('is-held', y > 0);
      });
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    listen(window, 'scroll', queue, { passive: true });
    listen(window, 'resize', queue, { passive: true });
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(queue);
      cols.forEach((c) => ro.observe(c));
      ro.observe(grid);
      cleanups.push(() => ro.disconnect());
    }
    cleanups.push(() => { if (raf) cancelAnimationFrame(raf); reset(); });
    update();
  }

  /* --------------------------------------------- Info column: hold in view */
  // The purchase column is sticky next to the moving images. If it is taller than the screen its
  // sticky offset goes negative, so it scrolls until its end is in view and only then holds.
  function initInfoSticky(main) {
    const info = $('.pdp-info', main);
    if (!info) return;
    const wide = window.matchMedia('(min-width: 769px)');
    const apply = () => {
      info.style.removeProperty('--pdp-info-top');
      if (!wide.matches) return;
      const base = parseFloat(getComputedStyle(info).top) || 0;
      const top = Math.min(base, window.innerHeight - info.offsetHeight - 24);
      info.style.setProperty('--pdp-info-top', Math.round(top) + 'px');
    };
    apply();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(apply);
      ro.observe(info);
      cleanups.push(() => ro.disconnect());
    }
    listen(window, 'resize', apply);
    cleanups.push(() => info.style.removeProperty('--pdp-info-top'));
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
    const slideImgs = gallery.slides.map((s) => $('img', s)).filter(Boolean);
    if (!slideImgs.length) { openBtn.hidden = true; return; }
    // Every photo on the page opens the viewer: the main slides, then any "More views" photo that
    // is not already one of the slides (matched by file name, sizes differ).
    const key = (img) => ((img.currentSrc || img.src || '').split('?')[0].split('/').pop() || '').replace(/(_\d+x\d*|-sm)(?=\.\w+$)/, '');
    const tiles = $$('.pdp-more__tile', main);
    const images = slideImgs.slice();
    const tileIndex = tiles.map((tile) => {
      const img = $('img', tile);
      if (!img) return -1;
      const k = key(img);
      const found = images.findIndex((im) => key(im) === k);
      if (found > -1) return found;
      images.push(img);
      return images.length - 1;
    });
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

    const open = (i) => {
      show(i);
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    };
    listen(openBtn, 'click', () => {
      const activeImg = $('img', gallery.slides[gallery.current]);
      open(Math.max(0, images.indexOf(activeImg)));
    });
    // Main photo: a click opens the viewer on the slide showing
    gallery.slides.forEach((slide) => {
      const img = $('img', slide);
      if (!img) return;
      slide.classList.add('is-zoomable');
      listen(slide, 'click', (e) => {
        if (e.target.closest('button, a, video, model-viewer')) return;
        open(Math.max(0, images.indexOf(img)));
      });
    });
    // "More views" photos act as buttons, so keyboard users can open them too
    tiles.forEach((tile, t) => {
      if (tileIndex[t] < 0) return;
      tile.classList.add('is-zoomable');
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', 'View image ' + (tileIndex[t] + 1) + ' full screen');
      listen(tile, 'click', () => open(tileIndex[t]));
      listen(tile, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(tileIndex[t]); }
      });
    });
    listen(dialog, 'close', () => {
      document.body.style.overflow = '';
      const slideIndex = gallery.slides.findIndex((s) => $('img', s) === images[index]);
      if (slideIndex > -1) gallery.setActive(slideIndex, { scroll: true });
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

      // SKU: the variant's real SKU; only when empty (mock mode) a demo SKU built from the section's prefix
      const mockPrefix = main.dataset.mockSkuPrefix;
      const skuText = variant ? (variant.sku || (mockPrefix ? `${mockPrefix}-${variant.position}` : '')) : '';
      const skuWrap = $('[data-pdp-sku-wrap]', main);
      if (skuWrap) {
        skuWrap.hidden = !skuText;
        const sku = $('[data-pdp-sku]', skuWrap);
        if (sku) sku.textContent = skuText;
      }

      // Offer: a real compare-at price wins; only without one does mock mode derive a demo discount (display only)
      const mockPct = Number(main.dataset.mockDiscount) || 0;
      let comparePrice = variant ? variant.compare_at_price : 0;
      let savePct = 0;
      if (variant && comparePrice > variant.price) {
        savePct = Math.round(((comparePrice - variant.price) * 100) / comparePrice);
      } else if (variant && mockPct > 0 && mockPct < 90) {
        savePct = mockPct;
        comparePrice = Math.floor((variant.price * 100) / (100 - mockPct));
      }
      const saleOn = Boolean(variant && comparePrice > variant.price);
      const save = $('[data-pdp-save]', main);
      if (save) {
        save.hidden = !saleOn;
        if (saleOn) save.textContent = `${savePct}% off`;
      }
      // "You save ₹X": only when the selected variant really has a compare-at price
      $$('[data-pdp-savings]', main).forEach((el) => {
        el.hidden = !saleOn;
        if (saleOn) el.textContent = `You save ${formatMoney(comparePrice - variant.price, moneyFormat)}`;
      });
      $$('[data-pdp-offer]', main).forEach((el) => { el.hidden = !saleOn; });

      const compare = $('[data-pdp-compare]', main);
      if (compare) {
        compare.hidden = !saleOn;
        if (saleOn) compare.textContent = formatMoney(comparePrice, moneyFormat);
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
          // Offer price exactly as the page shows it (real compare-at from Shopify)
          const cmpEl = $('[data-pdp-compare]', main);
          const compare = cmpEl && !cmpEl.hidden ? cmpEl.textContent.trim() : '';
          for (let i = 0; i < quantity; i += 1) {
            bag.cart.push({
              id: `${variant.id}-${Date.now()}-${i}`,
              handle: main.dataset.productHandle || '',
              title: main.dataset.productTitle || variant.name,
              price,
              compare,
              image: image ? image.currentSrc || image.src : '',
              size: variant.title
            });
          }
          bag.updateCartUI();
          setTimeout(() => bag.toggleCartDrawer(true), 450);
        }
        // Back to one bottle once it is in the bag, so the next add starts fresh
        if (qtyInput) {
          qtyInput.value = 1;
          qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
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
    const phone = window.matchMedia('(max-width: 768px)');
    // Phones get Buy now in the bar too; it runs the page's own Buy now (same handler, no duplicate logic)
    const pageBuyNow = $('[data-pdp-buy-now]', main);
    let dockBuy = $('[data-pdp-dock-buy]', dock);
    if (pageBuyNow && !dockBuy && dockBtn) {
      dockBuy = document.createElement('button');
      dockBuy.type = 'button';
      dockBuy.className = 'pdp-btn pdp-dock__buy';
      dockBuy.setAttribute('data-pdp-dock-buy', '');
      dockBuy.tabIndex = -1;
      dockBuy.textContent = pageBuyNow.textContent.trim() || 'Buy now';
      dockBtn.after(dockBuy);
      listen(dockBuy, 'click', () => pageBuyNow.click());
    }
    let pastCta = false;
    let ctaInView = true;
    let nearEnd = false;
    const update = () => {
      // Phones: shown whenever the page's own buttons are off screen (also before them, so the first
      // screen always has a way to buy). Wider screens: only after scrolling past them.
      const visible = (phone.matches ? !ctaInView : pastCta) && !nearEnd;
      document.documentElement.classList.toggle('pdp-dock-on', visible && phone.matches);
      if (dockBuy) dockBuy.tabIndex = visible ? 0 : -1;
      dock.classList.toggle('is-visible', visible);
      dock.setAttribute('aria-hidden', String(!visible));
      if (dockBtn) dockBtn.tabIndex = visible ? 0 : -1;
    };

    const ctaObserver = new IntersectionObserver(([entry]) => {
      ctaInView = entry.isIntersecting;
      pastCta = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    listen(phone, 'change', update);
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
  // State, login and storage live in assets/agha-wishlist.js. Here the heart only follows the
  // selected size, so a saved product remembers which variant was chosen.
  function initWishlist(main, variantState) {
    const btn = $('[data-pdp-wishlist]', main);
    if (!btn) return;
    const sync = () => {
      const variant = variantState && variantState.variant;
      if (!variant) return;
      btn.dataset.wishlistVariant = variant.id;
      if (window.AghaWishlist && window.AghaWishlist.has(btn.dataset.wishlistHandle)) window.AghaWishlist.updateVariant(btn.dataset.wishlistHandle, variant.id);
    };
    $$('[data-pdp-option]', main).forEach((fieldset) => listen(fieldset, 'change', () => setTimeout(sync, 0)));
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
    if (window.matchMedia('(max-width: 768px)').matches) {
      $$('.pdp-hero details[data-pdp-accordion][open]', scope).forEach((d) => { d.open = false; });
    }
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
    if (!section || !isShopify || section.querySelector('.hoa-pc')) return;
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
      if (stage) intro.fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.1, clearProps: 'opacity,visibility' }, 0);
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

      /* The fragrance — heading (above, via data-pdp-reveal), then the bottle scales gently
         up while the trail lines draw in and the particles fade on, then the notes and
         claims read in toward it from either side, left column first. Slow and controlled —
         nothing here should feel cinematic or like elements flying in. */
      $$('[data-pdp-tf]', scope).forEach((sec) => {
        const visual = $('[data-pdp-tf-visual]', sec);
        const wide = window.matchMedia('(min-width: 769px)').matches;
        const left = $$('.pdp-tf__col--left [data-pdp-tf-block]', sec);
        const right = $$('.pdp-tf__col--right [data-pdp-tf-block]', sec);
        const particles = $$('.pdp-tf__particle, .pdp-tf__glyph', sec);
        if (!visual && !left.length && !right.length) return;

        if (visual) gsap.set(visual, { autoAlpha: 0, scale: 0.92 });
        left.forEach((b) => gsap.set(b, { autoAlpha: 0, x: wide ? -34 : 0, y: wide ? 0 : 14 }));
        right.forEach((b) => gsap.set(b, { autoAlpha: 0, x: wide ? 34 : 0, y: wide ? 0 : 14 }));
        if (particles.length) gsap.set(particles, { autoAlpha: 0 });

        const tl = gsap.timeline({ scrollTrigger: { trigger: $('.pdp-tf__stage', sec) || sec, start: 'top 78%', once: true } });
        if (visual) tl.to(visual, { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'power2.out', clearProps: 'transform' }, 0);
        if (particles.length) tl.to(particles, { autoAlpha: 1, duration: 1.4, stagger: 0.08, ease: 'power1.out', clearProps: 'visibility' }, 0.4);
        if (left.length) tl.to(left, { autoAlpha: 1, x: 0, y: 0, duration: 1, stagger: 0.15, ease, clearProps: 'transform' }, 0.3);
        if (right.length) tl.to(right, { autoAlpha: 1, x: 0, y: 0, duration: 1, stagger: 0.15, ease, clearProps: 'transform' }, 0.45);
      });

      /* How it's made — the bottle fills up. The stage pins (CSS .is-live) while the track scrolls.
         Choreography over progress p: the cap lifts (0.04–0.12), the stream pours and the level,
         meniscus, marker and day counter rise (0.12–0.84), the cap drops back (0.86–0.94) and the
         bottle is sealed (glint) from 0.95. Steps: source 0, compound 0.12, macerate 0.4, finish 0.9. */
      $$('[data-pdp-fill]', scope).forEach((sec) => {
        const track = $('[data-pdp-fill-track]', sec);
        const steps = $$('[data-pdp-fill-step]', sec);
        if (!track || !steps.length) return;
        const dayEl = $('[data-pdp-fill-day]', sec);
        const days = parseInt(sec.dataset.days, 10) || 90;
        const css = getComputedStyle(sec);
        const top = parseFloat(css.getPropertyValue('--fill-top')) || 37;
        const bottom = parseFloat(css.getPropertyValue('--fill-bottom')) || 88;
        const capAt = parseFloat(css.getPropertyValue('--fill-cap')) || 34;
        const at = steps.length === 4 ? [0, 0.12, 0.4, 0.9] : steps.map((_, i) => i / steps.length);
        const clamp01 = (v) => Math.min(1, Math.max(0, v));
        const smooth = (v) => v * v * (3 - 2 * v);
        let shownDay = -1;
        const paint = (p) => {
          const lift = smooth(clamp01((p - 0.04) / 0.08));
          const back = smooth(clamp01((p - 0.86) / 0.08));
          const pour = clamp01((p - 0.12) / 0.72);
          // As the cap seals, colour also reaches the collar between the glass top and the cap
          const lvl = pour < 1 ? bottom - (bottom - top) * pour : top - (top - capAt) * back;
          const men = pour <= 0 ? 0 : pour < 1 ? Math.min(1, pour * 12) : Math.max(0, 1 - back * 3);
          const st = sec.style;
          st.setProperty('--p', p.toFixed(3));
          st.setProperty('--lvl', lvl.toFixed(2) + '%');
          st.setProperty('--men', men.toFixed(2));
          st.setProperty('--cap', (lift * (1 - back)).toFixed(3));
          st.setProperty('--stream', pour > 0.002 && pour < 0.995 ? '1' : '0');
          sec.classList.toggle('is-sealed', p >= 0.95);
          const day = Math.round(pour * days);
          if (dayEl && day !== shownDay) { dayEl.textContent = day; shownDay = day; }
          let current = 0;
          steps.forEach((el, i) => { if (p >= at[i]) current = i; });
          steps.forEach((el, i) => {
            el.classList.toggle('is-on', p >= at[i] && i !== current);
            el.classList.toggle('is-current', i === current);
          });
        };
        sec.classList.add('is-live');
        paint(0);
        const state = { p: 0 };
        gsap.to(state, {
          p: 1,
          ease: 'none',
          onUpdate: () => paint(state.p),
          scrollTrigger: { trigger: track, start: () => `top ${parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pdp-header-offset')) || 96}px`, end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true }
        });
      });

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

  /* ------------------------------------------------------------ Write a review */
  // The form is only in the page for a signed-in customer (Liquid checks Shopify's `customer`);
  // guests get a login link that returns here with ?review=1, which opens the form.
  function initReviewForm() {
    const section = $('[data-pdp-reviews]');
    const box = section && $('[data-pdp-review-form]', section);
    const openBtn = section && $('[data-pdp-review-open]', section);
    if (!box || !openBtn) return;
    const form = $('form', box);
    const done = $('[data-pdp-rdone]', box);
    const status = $('[data-pdp-rstatus]', box);
    const submit = $('[data-pdp-rsubmit]', box);
    const submitLabel = $('[data-pdp-rsubmit-label]', box);
    const titleEl = $('[data-pdp-rtitle]', box);
    const bodyEl = $('[data-pdp-rbody]', box);
    const count = $('[data-pdp-rcount]', box);
    const sub = $('[data-pdp-rsub]', box);
    const preview = box.hasAttribute('data-preview');
    const LIMITS = { title: [3, 80], body: [20, 1000] };

    const productName = $('[data-pdp-main]')?.dataset.productTitle || '';
    if (sub) sub.textContent = `${productName ? productName + ' · ' : ''}Posting as ${box.dataset.customerName || 'you'}`;

    const setError = (key, msg) => {
      const el = $(`[data-error-for="${key}"]`, box);
      if (!el) return;
      el.hidden = !msg;
      el.textContent = msg || '';
      const field = key === 'title' ? titleEl : key === 'body' ? bodyEl : null;
      if (field) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    const clearErrors = () => { ['rating', 'title', 'body'].forEach((k) => setError(k, '')); };
    const setStatus = (msg, tone) => {
      status.hidden = !msg;
      status.textContent = msg || '';
      status.dataset.tone = tone || '';
    };
    const setBusy = (busy) => {
      submit.disabled = busy;
      submit.classList.toggle('is-loading', busy);
      if (busy) submit.setAttribute('aria-busy', 'true'); else submit.removeAttribute('aria-busy');
      submitLabel.textContent = busy ? 'Sending…' : 'Submit review';
    };

    const open = ({ scroll = true } = {}) => {
      done.hidden = true;
      form.hidden = false;
      box.hidden = false;
      box.classList.add('is-open');
      openBtn.setAttribute('aria-expanded', 'true');
      if (scroll) box.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => { const first = $('input[name="contact[Rating]"]', box); if (first) first.focus({ preventScroll: true }); }, 200);
    };
    const close = () => {
      box.classList.remove('is-open');
      box.hidden = true;
      openBtn.setAttribute('aria-expanded', 'false');
      form.reset();
      clearErrors();
      setStatus('');
      setBusy(false);
      if (count) count.textContent = '0';
      openBtn.focus({ preventScroll: true });
    };

    listen(openBtn, 'click', () => (box.hidden ? open() : close()));
    listen($('[data-pdp-rcancel]', box), 'click', close);
    listen($('[data-pdp-rclose]', box), 'click', close);
    listen(bodyEl, 'input', () => { if (count) count.textContent = String(bodyEl.value.length); setError('body', ''); });
    listen(titleEl, 'input', () => setError('title', ''));
    $$('input[name="contact[Rating]"]', box).forEach((r) => listen(r, 'change', () => setError('rating', '')));

    const validate = () => {
      clearErrors();
      let firstBad = null;
      const rating = $('input[name="contact[Rating]"]:checked', box);
      if (!rating) { setError('rating', 'Please choose a star rating.'); firstBad = firstBad || $('input[name="contact[Rating]"]', box); }
      const t = titleEl.value.trim();
      if (t.length < LIMITS.title[0]) { setError('title', t ? 'Please add a little more to your title.' : 'Please add a title.'); firstBad = firstBad || titleEl; }
      const b = bodyEl.value.trim();
      if (b.length < LIMITS.body[0]) { setError('body', `Please write at least ${LIMITS.body[0]} characters (${b.length} so far).`); firstBad = firstBad || bodyEl; }
      if (firstBad) firstBad.focus();
      return !firstBad;
    };

    listen(form, 'submit', async (e) => {
      e.preventDefault();
      setStatus('');
      if (!validate()) return;
      setBusy(true);
      try {
        if (preview) {
          await new Promise((r) => setTimeout(r, 900));
        } else {
          const res = await fetch(form.action, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: new FormData(form)
          });
          // Shopify may answer with its spam check page; hand over to a normal submit so the shopper can pass it
          if (/\/challenge/.test(res.url)) { form.submit(); return; }
          if (!res.ok) throw new Error('send failed');
        }
        form.hidden = true;
        done.hidden = false;
        done.focus({ preventScroll: true });
        form.reset();
        if (count) count.textContent = '0';
      } catch (error) {
        setStatus('We could not send your review. Please check your connection and try again.', 'error');
      } finally {
        setBusy(false);
      }
    });

    // Back from the login page with ?review=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('review') === '1') {
      params.delete('review');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
      setTimeout(() => open(), 400);
    }
  }

  /* --------------------------------------------------------- Review sorting */
  function initReviewSort() {
    const select = $('[data-pdp-review-sort]');
    if (!select) return;
    const list = select.closest('.pdp-reviews__list');
    listen(select, 'change', () => {
      const cards = $$('[data-pdp-review]', list);
      const key = (el, attr) => Number(el.dataset[attr]) || 0;
      cards.sort((a, b) => {
        if (select.value === 'high') return key(b, 'rating') - key(a, 'rating') || key(a, 'order') - key(b, 'order');
        if (select.value === 'low') return key(a, 'rating') - key(b, 'rating') || key(a, 'order') - key(b, 'order');
        return key(a, 'order') - key(b, 'order');
      });
      const app = $('.pdp-reviews__app', list);
      cards.forEach((c) => (app ? list.insertBefore(c, app) : list.appendChild(c)));
    });
  }

  /* ----------------------------------------------------------- Meter reveal */
  function initMeters() {
    const meters = $$('[data-pdp-meter]');
    if (!meters.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      meters.forEach((m) => m.classList.add('is-drawn'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    meters.forEach((m) => io.observe(m));
    cleanups.push(() => io.disconnect());
  }

  /* -------------------------------------------------------- Recently viewed */
  async function initRecentlyViewed() {
    const section = $('[data-pdp-recent]');
    const main = $('[data-pdp-main]');
    if (!main) return;
    const KEY = 'agha-recent-viewed';
    const current = main.dataset.productHandle;
    let handles = [];
    try { handles = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { handles = []; }
    if (!Array.isArray(handles)) handles = [];
    if (current) {
      const next = [current, ...handles.filter((h) => h !== current)].slice(0, 12);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
    }
    const grid = section && $('[data-pdp-recent-grid]', section);
    if (!grid || !isShopify) return;
    const limit = Number(section.dataset.limit) || 4;
    const wanted = handles.filter((h) => h && h !== current).slice(0, limit);
    const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const handleOf = (url) => ((String(url).match(/\/products\/([^/?#]+)/) || [])[1] || '');
    // Same card as the shop (assets/hoa-card.css), compact: image, price bar, name, no cart button.
    // Markup comes from HOA.pcMarkup (hoa-commerce.js, loaded on every page).
    const card = (o, i) => (window.HOA && window.HOA.pcMarkup ? window.HOA.pcMarkup({ ...o, handle: handleOf(o.url), compact: true, action: 'none', index: i }) : '');
    // Mock mode only: no real history yet, so show the demo cards embedded by the section
    const showDemo = () => {
      const demo = readJSON($('[data-pdp-recent-mock]', section));
      if (!Array.isArray(demo) || !demo.length) return;
      grid.innerHTML = demo.slice(0, limit).map((p, i) => card({ url: p.url, name: p.title, image: p.image, now: p.price }, i)).join('');
      section.hidden = false;
      revealNow($$('.hoa-pc', grid));
    };
    if (!wanted.length) { showDemo(); return; }
    const results = await Promise.all(wanted.map((h) => fetch(`/products/${encodeURIComponent(h)}.js`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    const items = results.filter(Boolean);
    if (!items.length) { showDemo(); return; }
    const format = section.dataset.moneyFormat;
    grid.innerHTML = items.map((p, i) => card({
      url: p.url, name: p.title, image: p.featured_image, imageMood: (p.images || [])[1], family: p.type,
      now: formatMoney(p.price, format),
      was: p.compare_at_price > p.price ? formatMoney(p.compare_at_price, format) : '',
      off: p.compare_at_price > p.price ? Math.round(((p.compare_at_price - p.price) * 100) / p.compare_at_price) : 0,
      best: (p.tags || []).some((t) => /^best[- ]?seller$/i.test(t)),
      sold: p.available === false
    }, i)).join('');
    section.hidden = false;
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    revealNow($$('.hoa-pc', grid));
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
      initWishlist(main, variantState);
      initInfoSticky(main);
      initGalleryTiles(main, gallery);
      initColumnSticky(main);
    }
    initAccordions(document);
    initRecommendations();
    initReviewSort();
    initReviewForm();
    initMeters();
    initRecentlyViewed();
    initMotion();
  }

  function destroy() {
    if (motionCtx) {
      motionCtx.revert();
      motionCtx = null;
      // Tweens that never started don't restore their pre-state on revert; clear it explicitly
      window.gsap?.set('[data-pdp-reveal], [data-pdp-hero-item], [data-pdp-card], [data-pdp-step], [data-pdp-stage], [data-pdp-fnote], [data-pdp-fnotes-image], .pdp-fnote__rule, [data-pdp-tf-visual], [data-pdp-tf-block], .pdp-tf__wave path, .pdp-tf__particle', { clearProps: 'transform,opacity,visibility' });
      // Bottle fill: back to the static state (unpinned, full bottle, every step shown)
      $$('[data-pdp-fill]').forEach((sec) => {
        sec.classList.remove('is-live', 'is-sealed');
        ['--lvl', '--men', '--p', '--cap', '--stream'].forEach((v) => sec.style.removeProperty(v));
        const day = $('[data-pdp-fill-day]', sec);
        if (day) day.textContent = sec.dataset.days || '90';
        $$('[data-pdp-fill-step]', sec).forEach((el) => el.classList.remove('is-on', 'is-current'));
      });
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
