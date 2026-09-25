/* PDP purchase options ("Choose your set"): Single / Duo / Trio.
   Reads the quantity tiers from the catalog (window.HOA.settings.quantityTiers) and the unit price
   of the selected size from the page, paints the offers into [data-pdp-offers-list], and drives the
   existing quantity field, so pdp.js add-to-bag / buy-now keep working unchanged.
   Nothing is written to the cart here. Without catalog tiers the selector stays hidden. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const digits = (s) => Number(String(s || '').replace(/[^\d.]/g, '')) || 0;
  const rupees = (n) => (window.HOA && window.HOA.money ? window.HOA.money(n) : '₹' + Math.round(n).toLocaleString('en-IN'));

  function init() {
    const box = $('[data-pdp-offers]');
    if (!box || box.dataset.pdxReady) return Boolean(box);
    const tiers = (window.HOA && window.HOA.ready && window.HOA.settings && window.HOA.settings.quantityTiers) || [];
    if (!tiers.length) return true;
    box.dataset.pdxReady = '1';

    const list = $('[data-pdp-offers-list]', box);
    const priceEl = $('[data-pdp-price]');
    const qtyInput = $('[data-pdp-form] input[name="quantity"]');
    if (!list || !priceEl || !qtyInput) return true;

    const unit = box.dataset.unit || 'bottle';
    const steps = [{ qty: 1, pct: 0 }].concat(tiers.map((t) => ({ qty: +t.qty, pct: +t.percent || 0 })));
    const names = ['Single', 'Duo', 'Trio', 'Quartet'];
    const percentFor = (qty) => steps.reduce((p, s) => (qty >= s.qty ? s.pct : p), 0);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) box.classList.add('pdp-offers--still');

    const total = (qty) => {
      const base = digits(priceEl.textContent) * qty;
      return { was: base, now: Math.round(base * (100 - percentFor(qty)) / 100) };
    };

    const bottle = '<svg viewBox="0 0 16 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="3.5"/><path d="M4 5h8v2.5H4z"/><rect x="2.5" y="7.5" width="11" height="15"/><path d="M2.5 14h11"/></svg>';
    const tag = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.6V2.8c0-.4.3-.8.8-.8h5.8L14 7.4a1 1 0 0 1 0 1.4l-4.9 4.900a1 1 0 0 1-1.400 0z"/><circle cx="5.500" cy="5.500" r="1"/></svg>';
    list.innerHTML = steps.map((s, i) => `
      <label class="pdp-offer" data-pdx-offer="${s.qty}">
        <input type="radio" name="pdx-offer" value="${s.qty}"${i === 0 ? ' checked' : ''}>
        <span class="pdp-offer__radio" aria-hidden="true"></span>
        <span class="pdp-offer__icon" aria-hidden="true">${bottle.repeat(Math.min(s.qty, 3))}</span>
        <span class="pdp-offer__body">
          <span class="pdp-offer__name">${names[i] || s.qty + ' ' + unit + 's'}</span>
          <span class="pdp-offer__meta">${s.qty} ${unit}${s.qty > 1 ? 's' : ''}${s.pct ? `<em class="pdp-offer__save">${tag}Save ${s.pct}%</em>` : ''}</span>
        </span>
        <span class="pdp-offer__price"><b data-pdx-now></b><s data-pdx-was hidden></s></span>
        ${i === steps.length - 1 && steps.length > 1 ? '<span class="pdp-offer__flag">Best value</span>' : ''}
      </label>`).join('');
    box.hidden = false;

    const offers = $$('[data-pdx-offer]', list);
    const setAddPrice = (qty) => {
      const t = total(qty);
      $$('[data-pdp-add-price]').forEach((el) => { el.textContent = rupees(t.now); });
    };
    const paint = () => {
      const qty = Number(qtyInput.value) || 1;
      offers.forEach((el) => {
        const n = Number(el.dataset.pdxOffer);
        const t = total(n);
        $('[data-pdx-now]', el).textContent = rupees(t.now);
        const was = $('[data-pdx-was]', el);
        was.hidden = t.was <= t.now;
        was.textContent = t.was > t.now ? rupees(t.was) : '';
        const on = n === qty;
        el.classList.toggle('is-selected', on);
        $('input', el).checked = on;
      });
      setAddPrice(qty);
    };

    offers.forEach((el) => {
      $('input', el).addEventListener('change', () => {
        qtyInput.value = el.dataset.pdxOffer;
        qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
        paint();
      });
    });
    // Quantity stepper or typed value: keep the selected offer and the button price in step
    const form = qtyInput.closest('form');
    if (form) {
      form.addEventListener('click', (e) => { if (e.target.closest('[data-pdp-qty-step]')) setTimeout(paint, 0); });
      qtyInput.addEventListener('change', () => setTimeout(paint, 0));
    }
    // Size change: pdp.js rewrites the unit price; re-price every offer from it
    new MutationObserver(() => setTimeout(paint, 0)).observe(priceEl, { childList: true, characterData: true, subtree: true });
    paint();
    return true;
  }

  const start = () => {
    if (init()) return;
    const mo = new MutationObserver(() => { if (init()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 8000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
