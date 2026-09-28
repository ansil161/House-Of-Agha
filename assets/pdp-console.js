/* ==========================================================================
   PDP purchase console — the live parts of sections/agha-pdp-main.liquid
   (mirrored in the preview by assets/pdp-preview.js).

   · Offer codes: one tap copies the code and applies it — on Shopify through /discount/CODE
     (the code then rides along to checkout), in the preview through the mock bag (window.HOA).
   · "Get it for ₹…", the pay-later split and the free-shipping line follow the price shown on
     the Add button, so they stay right when the size, quantity or multi-buy option changes.
   · Delivery: a valid Indian pincode gets the estimated window (same maths as pdp.js); when the
     section has a serviceability URL it is asked as well. Nothing here changes a price.
   ========================================================================== */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isShopify = Boolean(window.Shopify && window.Shopify.routes);
  const PIN_KEY = 'agha-pincode';

  const amount = (el) => (el ? Number(String(el.textContent).replace(/[^\d.]/g, '')) || 0 : 0);
  // Format like the page already does (currency symbol and grouping come from the rendered price)
  const formatLike = (sample, n) => {
    const text = sample ? sample.textContent.trim() : '₹0';
    const out = Math.round(n).toLocaleString('en-IN');
    return /[\d]/.test(text) ? text.replace(/[\d][\d,.]*/, out) : `₹${out}`;
  };

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(t);
      t.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      t.remove();
      return ok;
    }
  }

  async function applyCode(code) {
    if (isShopify) {
      // Shopify stores the code on the session; it is applied to the cart and at checkout.
      try {
        await fetch(`${window.Shopify.routes.root}discount/${encodeURIComponent(code)}`, { credentials: 'same-origin', redirect: 'manual' });
        return true;
      } catch (e) { return false; }
    }
    if (window.HOA && window.HOA.coupon) return window.HOA.coupon.apply(code).ok;
    return false;
  }

  function initCodes(main) {
    const live = $('[data-pdp-code-live]', main);
    const current = window.HOA && window.HOA.coupon ? window.HOA.coupon.code() : null;
    $$('[data-pdp-code]', main).forEach((btn) => {
      const code = btn.dataset.pdpCode;
      const act = $('[data-pdp-code-act]', btn);
      const mark = (text) => {
        btn.classList.add('is-applied');
        if (act) act.textContent = text;
      };
      if (current && current === code) mark('Applied');
      btn.addEventListener('click', async () => {
        if (btn.classList.contains('is-busy')) return;
        btn.classList.add('is-busy');
        const [copied, applied] = await Promise.all([copyText(code), applyCode(code)]);
        btn.classList.remove('is-busy');
        mark(applied ? 'Applied' : copied ? 'Copied' : code);
        btn.classList.remove('is-pop');
        void btn.offsetWidth;
        btn.classList.add('is-pop');
        if (live) {
          live.textContent = applied
            ? `${code} ${copied ? 'copied and ' : ''}applied — it will be taken off at checkout.`
            : copied ? `${code} copied. Paste it at checkout.` : `Use code ${code} at checkout.`;
        }
      });
    });
  }

  function initLivePrices(main) {
    const addPrice = $('[data-pdp-form] [data-pdp-add-price]', main) || $('[data-pdp-add-price]', main);
    const unitPrice = $('.pdp-price [data-pdp-price]', main) || $('[data-pdp-price]', main);
    const source = addPrice || unitPrice;
    if (!source) return;

    const deals = $$('[data-pdp-deal][data-percent]', main).filter((d) => Number(d.dataset.percent) > 0);
    const ship = $('[data-pdp-ship]', main);
    const emi = $('[data-pdp-emi]', main);
    const compare = $('.pdp-price [data-pdp-compare]', main);
    const dockWas = $('[data-pdp-dock-was]', main);
    const savings = $('.pdp-price [data-pdp-savings]', main);
    let lastSave = savings ? savings.textContent : '';

    const paint = () => {
      const total = amount(source);
      deals.forEach((d) => {
        const out = $('[data-pdp-deal-price]', d);
        if (out) out.textContent = formatLike(source, (total * (100 - Number(d.dataset.percent))) / 100);
      });
      if (ship) {
        const threshold = Number(ship.dataset.threshold) / 100;
        const text = $('[data-pdp-ship-text]', ship);
        const free = total >= threshold;
        ship.classList.toggle('is-met', free);
        if (text) {
          text.textContent = free
            ? 'This order ships free'
            : `Add ${formatLike(source, threshold - total)} more to ship free`;
        }
      }
      if (emi) {
        const n = Number(emi.dataset.installments) || 3;
        const now = $('[data-pdp-emi-now]', emi);
        if (now) now.textContent = formatLike(source, Math.ceil(total / n));
      }
      if (dockWas && compare) {
        dockWas.hidden = compare.hidden;
        dockWas.textContent = compare.textContent.replace(/^MRP\s*/i, '');
      }
      if (savings && savings.textContent !== lastSave && !savings.hidden) {
        lastSave = savings.textContent;
        savings.classList.remove('is-pop');
        void savings.offsetWidth;
        savings.classList.add('is-pop');
      }
    };

    let queued = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(queued);
      queued = setTimeout(paint, 0);
    });
    [source, unitPrice, compare].filter(Boolean).forEach((el) => mo.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }));
    paint();
  }

  /* ---------------------------------------------------------------- delivery */
  function addBusinessDays(date, days) {
    const d = new Date(date);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) added += 1; // Sundays excluded, as in pdp.js
    }
    return d;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmtDay = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  function initPincode(main) {
    const box = $('[data-pdp-pincode]', main);
    if (!box) return;
    const form = $('[data-pdp-pincode-form]', box);
    const input = $('[data-pdp-pincode-input]', box);
    const msg = $('[data-pdp-pincode-msg]', box);
    if (!form || !input || !msg) return;
    const icon = (msg.querySelector('svg') || { outerHTML: '' }).outerHTML;
    const minDays = Number(box.dataset.minDays) || 3;
    const maxDays = Math.max(Number(box.dataset.maxDays) || 6, minDays);
    const url = box.dataset.serviceabilityUrl || '';

    const say = (html, state) => {
      msg.innerHTML = `${icon}<span>${html}</span>`;
      box.dataset.state = state;
    };

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      input.removeAttribute('aria-invalid');
    });

    const check = async (pin, quiet) => {
      if (!/^[1-9]\d{5}$/.test(pin)) {
        if (!quiet) {
          input.setAttribute('aria-invalid', 'true');
          say('Enter a valid 6-digit pincode', 'error');
        }
        return;
      }
      let min = minDays;
      let max = maxDays;
      if (url) {
        box.classList.add('is-busy');
        try {
          const res = await fetch(url.replace('{pincode}', encodeURIComponent(pin)), { headers: { Accept: 'application/json' } });
          const data = await res.json();
          box.classList.remove('is-busy');
          if (data && data.serviceable === false) {
            say(`We don’t deliver to <strong>${pin}</strong> yet. <a class="pdp-link" href="/pages/contact">Ask us</a>`, 'error');
            return;
          }
          if (data && Number(data.days) > 0) { min = Number(data.days); max = Math.max(min, Number(data.max_days) || min + 2); }
        } catch (e) {
          box.classList.remove('is-busy');
        }
      }
      const today = new Date();
      const range = `${fmtDay(addBusinessDays(today, min))} – ${fmtDay(addBusinessDays(today, max))}`;
      say(`Delivery to <strong>${pin}</strong> by <strong>${range}</strong>`, 'ok');
      try { localStorage.setItem(PIN_KEY, pin); } catch (e) { /* private mode */ }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      check(input.value.trim(), false);
    });

    let saved = null;
    try { saved = localStorage.getItem(PIN_KEY); } catch (e) { saved = null; }
    if (saved) {
      input.value = saved;
      // After pdp.js has written its default estimate
      setTimeout(() => check(saved, true), 0);
    }
  }

  function init() {
    const main = $('[data-pdp-console]');
    if (!main || main.dataset.consoleReady) return Boolean(main);
    main.dataset.consoleReady = '1';
    const scope = main.closest('[data-pdp-main]') || document;
    initCodes(scope);
    initLivePrices(scope);
    initPincode(scope);
    return true;
  }

  const start = () => {
    if (init()) return;
    // The preview paints the page after load (assets/pdp-preview.js)
    const mo = new MutationObserver(() => { if (init()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 8000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
