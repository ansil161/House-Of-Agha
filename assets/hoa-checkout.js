/* HOUSE OF AGHA — preview checkout (checkout.html). Frontend only; nothing is posted and no payment is taken.

   Reads the bag the drawer keeps in localStorage ('agha-bag'), prices it with window.HOA.quote (the same
   engine as the bag, so both show the same numbers), and offers the shipping methods that serve the
   CUSTOMER'S delivery area: an Indian PIN code resolves to a state and a zone (metro / rest of India /
   remote), another country to an international rate. The Pay button validates the form and stops there.

   SHOPIFY LATER: /checkout is Shopify's hosted checkout. Zones and rates below map to Settings → Shipping
   and delivery (shipping zones + rates), the prepaid saving to a payment-method discount.
*/
(function () {
  'use strict';

  var BAG_KEY = 'agha-bag', DRAFT_KEY = 'hoa-checkout-draft';

  /* ------------------------------------------------------------ areas */
  var STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
    'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

  // Indian PIN codes: the first digits name the postal circle. Most specific prefix wins.
  var PIN_STATE = {
    '11': 'Delhi', '12': 'Haryana', '13': 'Haryana', '14': 'Punjab', '15': 'Punjab', '160': 'Chandigarh', '16': 'Punjab',
    '17': 'Himachal Pradesh', '18': 'Jammu and Kashmir', '19': 'Jammu and Kashmir', '194': 'Ladakh',
    '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Uttar Pradesh', '24': 'Uttar Pradesh', '25': 'Uttar Pradesh',
    '26': 'Uttar Pradesh', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh', '244': 'Uttarakhand', '246': 'Uttarakhand', '247': 'Uttarakhand',
    '248': 'Uttarakhand', '249': 'Uttarakhand', '262': 'Uttarakhand', '263': 'Uttarakhand',
    '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan', '33': 'Rajasthan', '34': 'Rajasthan',
    '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat', '39': 'Gujarat', '396': 'Dadra and Nagar Haveli and Daman and Diu',
    '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra', '403': 'Goa',
    '45': 'Madhya Pradesh', '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh', '49': 'Chhattisgarh',
    '50': 'Telangana', '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
    '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
    '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu', '605': 'Puducherry',
    '67': 'Kerala', '68': 'Kerala', '69': 'Kerala', '6825': 'Lakshadweep',
    '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal', '73': 'West Bengal', '74': 'West Bengal', '737': 'Sikkim', '744': 'Andaman and Nicobar Islands',
    '75': 'Odisha', '76': 'Odisha', '77': 'Odisha', '78': 'Assam',
    '790': 'Arunachal Pradesh', '791': 'Arunachal Pradesh', '792': 'Arunachal Pradesh', '793': 'Meghalaya', '794': 'Meghalaya', '795': 'Manipur',
    '796': 'Mizoram', '797': 'Nagaland', '798': 'Nagaland', '799': 'Tripura',
    '80': 'Bihar', '81': 'Bihar', '82': 'Jharkhand', '83': 'Jharkhand', '814': 'Jharkhand', '815': 'Jharkhand', '816': 'Jharkhand', '84': 'Bihar', '85': 'Bihar'
  };
  var METROS = { '110': 'New Delhi', '400': 'Mumbai', '560': 'Bengaluru', '600': 'Chennai', '700': 'Kolkata', '500': 'Hyderabad', '411': 'Pune', '380': 'Ahmedabad', '122': 'Gurugram', '201': 'Noida' };
  var REMOTE = ['Jammu and Kashmir', 'Ladakh', 'Andaman and Nicobar Islands', 'Lakshadweep', 'Sikkim', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura'];

  // Rates per zone. 'standard' becomes complimentary above the catalog's free-shipping threshold.
  var RATES = {
    metro: [
      { id: 'same-day', name: 'Same-day delivery', note: 'Order before 2 pm', days: [0, 0], price: 349 },
      { id: 'express', name: 'Express', note: 'Next business day', days: [1, 1], price: 199 },
      { id: 'standard', name: 'Standard', note: 'Blue Dart surface', days: [2, 3], price: 99, freeAbove: true }
    ],
    india: [
      { id: 'express', name: 'Express', note: 'Blue Dart air', days: [2, 3], price: 249 },
      { id: 'standard', name: 'Standard', note: 'Blue Dart surface', days: [3, 5], price: 99, freeAbove: true }
    ],
    remote: [
      { id: 'standard', name: 'Standard', note: 'India Post Speed Post', days: [6, 9], price: 149, freeAbove: true }
    ]
  };
  var WORLD = {
    AE: { dial: '+971', days: [3, 5], price: 1499 }, SA: { dial: '+966', days: [4, 6], price: 1799 }, QA: { dial: '+974', days: [4, 6], price: 1799 },
    SG: { dial: '+65', days: [4, 7], price: 1999 }, GB: { dial: '+44', days: [5, 8], price: 2499 }, US: { dial: '+1', days: [5, 8], price: 2499 }
  };

  function pinState(pin) {
    for (var n = 4; n >= 2; n--) { var s = PIN_STATE[pin.slice(0, n)]; if (s) return s; }
    return null;
  }

  /* ------------------------------------------------------------ helpers */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var H, money, esc;

  function readBag() { try { var b = JSON.parse(localStorage.getItem(BAG_KEY)); return Array.isArray(b) ? b : []; } catch (e) { return []; } }
  function readDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch (e) { return {}; } }
  function writeDraft(d) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {} }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  // Business days from today (Sundays skipped); 0 = today.
  function addDays(n) {
    var d = new Date();
    while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) n--; }
    return d;
  }
  function fmtDay(d) { return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function eta(days) {
    if (days[1] === 0) return 'Arrives today';
    var a = addDays(days[0]), b = addDays(days[1]);
    return days[0] === days[1] ? 'Arrives ' + fmtDay(a) : 'Arrives ' + fmtDay(a) + ' – ' + fmtDay(b);
  }

  /* ------------------------------------------------------------ state */
  var S = { cart: [], area: null, methods: [], method: null, submitted: false, touched: {} };
  var form, prepaidPct = 0;

  /* The area the customer is delivering to → the methods offered there. */
  function resolveArea() {
    var country = form.country.value;
    if (country !== 'IN') {
      var w = WORLD[country];
      var label = form.country.options[form.country.selectedIndex].text;
      return { zone: 'world', label: label, methods: [{ id: 'dhl', name: 'DHL Express', note: 'Duties and taxes included', days: w.days, price: w.price }] };
    }
    var pin = form.zip.value.replace(/\D/g, '');
    if (pin.length !== 6) return null;
    if (/^[09]/.test(pin)) return { zone: 'none', pin: pin };
    var state = pinState(pin);
    if (!state) return { zone: 'none', pin: pin };
    var metro = METROS[pin.slice(0, 3)];
    var zone = metro ? 'metro' : REMOTE.indexOf(state) > -1 ? 'remote' : 'india';
    return { zone: zone, pin: pin, state: state, city: metro || '', methods: RATES[zone] };
  }

  function methodPrice(m, q) { return m.freeAbove && q.shipping.free ? 0 : m.price; }

  /* ------------------------------------------------------------ GST
     Perfume (HSN 3303) is 18% GST and catalog prices are GST-inclusive. Shipping is taxed at the same rate.
     Place of supply = the delivery state: same state as the seller → CGST 9% + SGST 9%, else IGST 18%.
     Exports are zero-rated, so the GST inside the goods price is taken off for international orders. */
  var GST_RATE = 18, SELLER_STATE = 'Telangana';

  function gstOf(inclusive) { var taxable = Math.round(inclusive * 100 / (100 + GST_RATE)); return { taxable: taxable, tax: inclusive - taxable }; }

  function totals(q) {
    var prepaid = prepaidPct ? Math.round(q.total * prepaidPct / 100) : 0;
    var m = S.methods.filter(function (x) { return x.id === S.method; })[0];
    var ship = m ? methodPrice(m, q) : null;
    var goods = q.total - prepaid;
    var t = { prepaid: prepaid, method: m, ship: ship, exportRelief: 0 };
    if (S.area && S.area.zone === 'world') {
      t.exportRelief = gstOf(goods).tax;
      t.grand = goods - t.exportRelief + (ship || 0);
      t.gst = null;
    } else {
      t.grand = goods + (ship || 0);
      var g = gstOf(t.grand);
      var state = form.province.value || (S.area && S.area.state) || '';
      t.gst = { taxable: g.taxable, tax: g.tax, intra: state === SELLER_STATE, state: state };
    }
    t.saved = q.totalSavings + prepaid + (m && m.price && ship === 0 ? m.price : 0);
    return t;
  }

  /* ------------------------------------------------------------ render: shipping */
  var ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  var ICON_WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/></svg>';

  function renderShipping(q) {
    var box = $('[data-co-ship]');
    var a = S.area;
    if (!a || a.zone === 'none') {
      S.methods = []; S.method = null;
      box.innerHTML = !a
        ? '<div class="hoa-co-ship__wait"><span class="hoa-co-ship__ico">' + ICON_PIN + '</span><p>Enter your <b>PIN code</b> to see the delivery options and dates available in your area.</p></div>'
        : '<div class="hoa-co-ship__wait is-error"><span class="hoa-co-ship__ico">' + ICON_WARN + '</span><p>We don&rsquo;t deliver to PIN code <b>' + esc(a.pin) + '</b> yet. Please check the number or use another address.</p></div>';
      return;
    }
    S.methods = a.methods;
    if (!S.method || !a.methods.some(function (m) { return m.id === S.method; })) {
      var std = a.methods.filter(function (m) { return m.id === 'standard'; })[0];
      S.method = (std || a.methods[a.methods.length - 1]).id;
    }
    var where = a.zone === 'world' ? 'International delivery to <b>' + esc(a.label) + '</b>'
      : 'Delivering to <b>' + esc([form.city.value.trim() || a.city, a.state].filter(Boolean).join(', ')) + '</b> &middot; ' + esc(a.pin);
    var zoneNote = a.zone === 'metro' ? 'Same-day and express delivery available in your city'
      : a.zone === 'remote' ? 'Express delivery isn&rsquo;t available in your area yet'
      : a.zone === 'world' ? 'Duties and taxes are pre-paid, nothing to pay on delivery' : 'Express and standard delivery available';
    var fastest = a.methods[0].id;

    box.innerHTML = '<div class="hoa-co-ship__where"><span class="hoa-co-ship__ico">' + ICON_PIN + '</span><span><span>' + where + '</span><small>' + zoneNote + '</small></span></div>' +
      '<fieldset class="hoa-co-methods"><legend class="hoa-sr">Shipping method</legend>' +
      a.methods.map(function (m) {
        var p = methodPrice(m, q), on = m.id === S.method;
        var tag = a.methods.length > 1 && m.id === fastest ? '<span class="hoa-co-method__tag">Fastest</span>' : '';
        return '<label class="hoa-co-method' + (on ? ' is-on' : '') + '">' +
          '<input type="radio" name="shipping" value="' + m.id + '"' + (on ? ' checked' : '') + '>' +
          '<span class="hoa-co-method__dot" aria-hidden="true"></span>' +
          '<span class="hoa-co-method__txt"><b>' + esc(m.name) + tag + '</b><small>' + eta(m.days) + ' &middot; ' + esc(m.note) + '</small></span>' +
          '<span class="hoa-co-method__price">' + (p === 0 ? '<em>Free</em>' + (m.price ? '<s>' + money(m.price) + '</s>' : '') : money(p)) + '</span></label>';
      }).join('') + '</fieldset>' +
      (a.zone !== 'world' && !q.shipping.free && q.shipping.threshold
        ? '<p class="hoa-co-ship__hint">Add <b>' + money(q.shipping.remaining) + '</b> more for complimentary standard shipping.</p>' : '');
  }

  /* ------------------------------------------------------------ render: summary */
  function src(u) { return esc(String(u || '').replace(/^\//, '')); }

  function lineHtml(g) {
    var u = g.unit, meta = u.kind === 'set' ? (u.product.tagline || u.size) : u.size;
    return '<li class="hoa-co-line"><span class="hoa-co-line__media">' + (u.image ? '<img src="' + src(u.image) + '" alt="" loading="lazy">' : '') +
      '<span class="hoa-co-line__qty" aria-label="Quantity ' + g.qty + '">' + g.qty + '</span></span>' +
      '<span class="hoa-co-line__info"><b>' + esc(u.name) + '</b><small>' + esc(meta) + (g.qty > 1 ? ' &middot; ' + money(u.price) + ' each' : '') + '</small></span>' +
      '<span class="hoa-co-line__price">' + (u.regular > u.price ? '<s>' + money(u.regular * g.qty) + '</s>' : '') + money(u.price * g.qty) + '</span></li>';
  }

  function couponHtml(q) {
    if (q.coupon) {
      return '<div class="hoa-co-coupon__on"><span><b>' + esc(q.coupon.code) + '</b>' + esc(q.coupon.description) + '</span>' +
        '<button type="button" data-co-coupon-remove>Remove</button></div>';
    }
    return '<form class="hoa-co-coupon__form" data-co-coupon-form novalidate><label class="hoa-sr" for="co-coupon">Discount code</label>' +
      '<input class="hoa-co-input" id="co-coupon" type="text" placeholder="Discount code" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
      '<button type="submit">Apply</button></form><p class="hoa-co-coupon__msg" data-co-coupon-msg role="status"></p>';
  }

  function row(dt, dd, cls) { return '<div class="hoa-co-row' + (cls ? ' ' + cls : '') + '"><dt>' + dt + '</dt><dd>' + dd + '</dd></div>'; }

  function rowsHtml(q, t) {
    var r = row('Subtotal &middot; ' + q.units + (q.units === 1 ? ' item' : ' items'), money(q.regularTotal));
    if (q.offerSavings > 0) r += row('Offer savings', '&minus;' + money(q.offerSavings), 'is-save');
    if (q.tierDiscount > 0) r += row('Buy ' + q.tier.qty + (q.tierUnits > q.tier.qty ? '+' : '') + ' &middot; ' + q.tier.percent + '% off', '&minus;' + money(q.tierDiscount), 'is-save');
    if (q.coupon) r += row('Coupon &middot; ' + esc(q.coupon.code), '&minus;' + money(q.couponDiscount), 'is-save');
    if (t.prepaid) r += row('Prepaid saving &middot; ' + prepaidPct + '%', '&minus;' + money(t.prepaid), 'is-save');
    r += row('Shipping' + (t.method ? ' &middot; ' + esc(t.method.name) : ''),
      t.ship === null ? '<span class="hoa-co-row__pending">Enter PIN code</span>' : t.ship === 0 ? 'Free' : money(t.ship));
    if (t.exportRelief) r += row('GST removed &middot; export', '&minus;' + money(t.exportRelief), 'is-save');
    else if (t.gst) r += row('GST ' + GST_RATE + '% (included)', money(t.gst.tax));
    r += row('Total<small>' + (t.gst ? 'Inclusive of all taxes' : 'Duties and taxes included') + '</small>', '<span class="hoa-co-row__cur">INR</span>' + money(t.grand), 'is-total');
    if (t.saved > 0) r += row('You save', money(t.saved), 'is-saved');
    return r;
  }

  function renderGst(t) {
    var box = $('[data-co-gst]');
    if (!t.gst) {
      box.querySelector('summary span').innerHTML = 'GST';
      box.querySelector('[data-co-gst-rows]').innerHTML = row('Indian GST', 'Not applicable');
      box.querySelector('[data-co-gst-note]').textContent = 'Exports are zero-rated under GST. Import duties at destination are pre-paid by us.';
      $('[data-co-gst-inline]').textContent = 'Duties and taxes included';
      return;
    }
    var g = t.gst, half = Math.floor(g.tax / 2);
    box.querySelector('summary span').innerHTML = 'GST breakdown<b>' + money(g.tax) + '</b>';
    var r = row('Taxable value', money(g.taxable));
    r += g.intra
      ? row('CGST &middot; ' + GST_RATE / 2 + '%', money(half)) + row('SGST &middot; ' + GST_RATE / 2 + '%', money(g.tax - half))
      : row('IGST &middot; ' + GST_RATE + '%', money(g.tax));
    r += row('Total GST', money(g.tax), 'is-strong');
    box.querySelector('[data-co-gst-rows]').innerHTML = r;
    var gstin = form.gstin.value.trim().toUpperCase();
    box.querySelector('[data-co-gst-note]').textContent =
      (g.state ? (g.intra ? 'Delivery within ' + SELLER_STATE + ': CGST + SGST apply. ' : 'Delivery to ' + g.state + ': IGST applies. ') : 'Tax split is set by your delivery state. ') +
      'Perfumes (HSN 3303) carry ' + GST_RATE + '% GST, already included in every price.' +
      (gstin && GSTIN_RE.test(gstin) ? ' A B2B tax invoice will be issued to GSTIN ' + gstin + '.' : '');
    $('[data-co-gst-inline]').textContent = 'Includes ' + money(g.tax) + ' GST';
  }

  /* ------------------------------------------------------------ you may also like */
  function recommendations() {
    var inBag = {}; S.cart.forEach(function (i) { if (i.handle) inBag[i.handle] = 1; });
    var out = [], seen = {};
    var push = function (p) { if (p && !inBag[p.handle] && !seen[p.handle]) { seen[p.handle] = 1; out.push(p); } };
    S.cart.forEach(function (i) { if (i.handle) push(H.pairOf(i.handle)); });
    H.fragrances().filter(function (p) { return p.isBestSeller; }).forEach(push);
    H.fragrances().forEach(push);
    push(H.product('royal-gift-set'));
    push(H.product('discovery-set'));
    return out.slice(0, 8);
  }

  var REC_COUNT = 3;

  function recHtml(p) {
    var badge = p.hasOffer ? p.discountPercentage + '% off' : p.isBestSeller ? 'Best seller' : p.isNew ? 'New' : '';
    var href = p.kind === 'fragrance' ? 'product.html?p=' + p.handle : 'shop.html#bundles';
    var meta = p.kind === 'set' ? 'Gift set' : (p.family || 'Eau de Parfum');
    return '<li class="hoa-co-rec">' +
      '<a class="hoa-co-rec__media" href="' + href + '" tabindex="-1" aria-hidden="true"><img src="' + src(p.image) + '" alt="" loading="lazy"></a>' +
      '<div class="hoa-co-rec__body"><a class="hoa-co-rec__name" href="' + href + '">' + esc(p.name) + '</a>' +
      '<span class="hoa-co-rec__meta">' + esc(meta) + (badge ? ' &middot; <em>' + badge + '</em>' : '') + '</span>' +
      '<span class="hoa-co-rec__price">' + money(p.price) + (p.hasOffer ? '<s>' + money(p.regularPrice) + '</s>' : '') + '</span></div>' +
      '<button type="button" class="hoa-co-rec__add" data-co-rec-add="' + esc(p.handle) + '" aria-label="Add ' + esc(p.name) + ' to order">' +
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9"/></svg><span>Add</span></button></li>';
  }

  function renderRecs() {
    var list = recommendations().slice(0, REC_COUNT);
    $('[data-co-recs]').hidden = !list.length;
    $('[data-co-recs-rail]').innerHTML = list.map(recHtml).join('');
  }

  /* ------------------------------------------------------------ render */
  function render() {
    var q = H.quote(S.cart, H.coupon.code());
    S.area = resolveArea();
    renderShipping(q);
    var t = totals(q);

    $('[data-co-lines]').innerHTML = q.groups.map(lineHtml).join('');
    $('[data-co-count]').textContent = q.units + (q.units === 1 ? ' item' : ' items');
    // Repaint the coupon box only when it flips between "enter a code" and "applied" (keeps typing intact)
    var cbox = $('[data-co-coupon]'), cstate = q.coupon ? q.coupon.code : '';
    if (cbox.getAttribute('data-state') !== cstate || !cbox.firstChild) { cbox.innerHTML = couponHtml(q); cbox.setAttribute('data-state', cstate); }

    $('[data-co-rows]').innerHTML = rowsHtml(q, t);
    renderGst(t);
    $('[data-co-total-short]').textContent = money(t.grand);
    $('[data-co-total-pay]').textContent = money(t.grand);
    $('[data-co-pay] .hoa-co-cta__label').textContent = 'Pay ' + money(t.grand);
    if (S.submitted) validate(false);
  }

  /* ------------------------------------------------------------ validation */
  var GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  function showErr(name, msg) {
    var f = document.querySelector('[data-co-field="' + name + '"]');
    if (!f) return;
    var input = f.querySelector('.hoa-co-input'), p = f.querySelector('.hoa-co-msg');
    if (!p.hasAttribute('data-hint')) p.setAttribute('data-hint', p.textContent);
    f.classList.toggle('is-invalid', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    p.textContent = msg || p.getAttribute('data-hint');
    p.classList.toggle('hoa-co-msg--error', !!msg);
  }

  function checks() {
    var india = form.country.value === 'IN';
    var v = function (n) { return (form[n] ? form[n].value : '').trim(); };
    var phone = v('phone').replace(/[\s()-]/g, '').replace(/^(\+91|0091|0)(?=\d{10}$)/, '');
    var e = {};
    if (!v('email')) e.email = 'Enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) e.email = 'Enter a valid email, like name@example.com';
    if (!phone) e.phone = 'Enter your mobile number';
    else if (india ? !/^[6-9]\d{9}$/.test(phone) : !/^\+?\d{7,15}$/.test(phone)) e.phone = india ? 'Enter a 10-digit mobile number' : 'Enter a valid phone number';
    if (!v('first_name')) e.first = 'Enter your first name';
    if (!v('last_name')) e.last = 'Enter your last name';
    if (!v('address1')) e.address1 = 'Enter your house number and street';
    var pin = v('zip');
    if (!pin) e.pin = india ? 'Enter a PIN code' : 'Enter a postal code';
    else if (india && !/^\d{6}$/.test(pin)) e.pin = 'PIN code has 6 digits';
    else if (india && S.area && S.area.zone === 'none') e.pin = 'We don’t deliver to this PIN code yet';
    if (!v('city')) e.city = 'Enter your city';
    if (india ? !form.province.value : !v('region')) e[india ? 'state' : 'region'] = 'Select your state';
    if (india && v('gstin') && !GSTIN_RE.test(v('gstin').toUpperCase())) e.gstin = 'Enter a valid 15-character GSTIN';
    return e;
  }

  var FIELDS = ['email', 'phone', 'first', 'last', 'address1', 'pin', 'city', 'state', 'region', 'gstin'];

  // report: move focus to the first problem (only on submit)
  function validate(report) {
    var e = checks();
    FIELDS.forEach(function (n) { if (S.submitted || S.touched[n]) showErr(n, e[n]); });
    var shipMsg = $('[data-co-ship-msg]');
    var noShip = !S.method;
    if (S.submitted && noShip && !e.pin) { shipMsg.textContent = 'Choose a shipping method'; shipMsg.hidden = false; } else shipMsg.hidden = true;
    var first = FIELDS.filter(function (n) { return e[n]; })[0];
    if (report && first) {
      var el = document.querySelector('[data-co-field="' + first + '"] .hoa-co-input');
      el.focus({ preventScroll: true });
      el.closest('.hoa-co-field').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return !first && !noShip;
  }

  /* ------------------------------------------------------------ country switch */
  function applyCountry() {
    var india = form.country.value === 'IN';
    $('[data-co-dial]').textContent = india ? '+91' : WORLD[form.country.value].dial;
    $('[data-co-pin-label]').textContent = india ? 'PIN code' : 'Postal code';
    form.zip.maxLength = india ? 6 : 10;
    form.zip.inputMode = india ? 'numeric' : 'text';
    $('[data-co-field="state"]').hidden = !india;
    $('[data-co-field="region"]').hidden = india;
    $('[data-co-field="gstin"]').hidden = !india;
    $('[data-co-pincheck]').hidden = !india;
    form.province.required = india; form.region.required = !india;
  }

  var DRAFT_FIELDS = ['country', 'email', 'phone', 'first_name', 'last_name', 'address1', 'address2', 'zip', 'city', 'province', 'region', 'gstin'];

  function saveDraft() {
    if (!form.save.checked) { clearDraft(); return; }
    var d = {};
    DRAFT_FIELDS.forEach(function (n) { d[n] = form[n].value; });
    d.news = form.news.checked; d.shipping = S.method;
    writeDraft(d);
  }

  function restoreDraft() {
    var d = readDraft();
    DRAFT_FIELDS.forEach(function (n) { if (d[n] != null && form[n]) form[n].value = d[n]; });
    if (d.news === false) form.news.checked = false;
    if (d.shipping) S.method = d.shipping;
  }

  /* ------------------------------------------------------------ init */
  function init() {
    H = window.HOA;
    var root = $('[data-hoa-checkout]');
    if (!root || !H || !H.ready) return;
    money = H.money; esc = H.esc;
    form = $('[data-co-form]');
    var m = String((H.settings && H.settings.prepaidOffer) || '').match(/(\d+(?:\.\d+)?)\s*%/);
    prepaidPct = m ? +m[1] : 0;

    // ?discount=CODE from the bag's checkout link
    var dc = new URLSearchParams(location.search).get('discount');
    if (dc) H.coupon.apply(dc);

    $('[data-co-back]').addEventListener('click', function (e) {
      e.preventDefault();
      if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back(); else location.href = 'shop.html';
    });

    S.cart = readBag();
    if (!S.cart.length) {
      $('[data-co-empty]').hidden = false;
      $('[data-co-layout]').hidden = true;
      $('.hoa-co-intro .hoa-co-lede').hidden = true;
      $('.hoa-co-h1').innerHTML = 'Nothing here <em>yet.</em>';
      return;
    }

    form.province.insertAdjacentHTML('beforeend', STATES.map(function (s) { return '<option>' + s + '</option>'; }).join(''));
    restoreDraft();
    applyCountry();

    var layout = $('[data-co-layout]'), toggle = $('[data-co-sum-toggle]');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      layout.classList.toggle('is-sum-open', open);
      $('[data-co-sum-toggle-text]').textContent = open ? 'Hide order summary' : 'Show order summary';
    });

    var fieldOf = { email: 'email', phone: 'phone', first_name: 'first', last_name: 'last', address1: 'address1', zip: 'pin', city: 'city', province: 'state', region: 'region', gstin: 'gstin' };
    var shipPin = $('#co-ship-pin'), pinMsg = $('[data-co-pin-msg]');
    var PIN_HINT = pinMsg.textContent;
    function syncShipPin() { if (document.activeElement !== shipPin) shipPin.value = form.zip.value; }
    function checkPin() {
      var pin = form.zip.value, bad = pin.length !== 6 ? 'Enter a 6-digit PIN code' : (S.area && S.area.zone === 'none') ? 'We don’t deliver to this PIN code yet' : '';
      var ok = !bad && S.area && S.area.state;
      pinMsg.textContent = bad || (ok ? 'Delivering to ' + (form.city.value.trim() ? form.city.value.trim() + ', ' : '') + S.area.state : PIN_HINT);
      pinMsg.classList.toggle('hoa-co-msg--error', !!bad);
      shipPin.closest('.hoa-co-field').classList.toggle('is-invalid', !!bad);
    }

    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.name === 'ship_pin') { t.value = t.value.replace(/\D/g, '').slice(0, 6); form.zip.value = t.value; t = form.zip; }
      if (t.name === 'zip' && form.country.value === 'IN') {
        t.value = t.value.replace(/\D/g, '').slice(0, 6);
        // A resolved PIN fills state (and city for metros) unless the customer typed them.
        var pin = t.value, st = pin.length === 6 ? pinState(pin) : null;
        if (st && !/^[09]/.test(pin)) {
          form.province.value = st;
          var metro = METROS[pin.slice(0, 3)];
          if (metro && (!form.city.value.trim() || form.city.dataset.auto === '1')) { form.city.value = metro; form.city.dataset.auto = '1'; }
        }
      }
      if (t.name === 'zip') { syncShipPin(); if (form.zip.value.length === 6) { render(); checkPin(); } else { pinMsg.textContent = PIN_HINT; pinMsg.classList.remove('hoa-co-msg--error'); shipPin.closest('.hoa-co-field').classList.remove('is-invalid'); } }
      if (t.name === 'city') delete t.dataset.auto;
      if (t.name === 'shipping') S.method = t.value;
      if (['zip', 'city', 'shipping', 'province', 'gstin'].indexOf(t.name) > -1) render();
      else if (S.submitted || S.touched[fieldOf[t.name]]) validate(false);
      saveDraft();
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'country') { applyCountry(); render(); }
      if (e.target.name === 'shipping') { S.method = e.target.value; render(); }
      if (e.target.name === 'province') { S.touched.state = true; render(); }
      saveDraft();
    });
    form.addEventListener('focusout', function (e) {
      var n = fieldOf[e.target.name];
      if (n && e.target.value.trim()) { S.touched[n] = true; validate(false); }
    });

    $('[data-co-pin-check]').addEventListener('click', function () { render(); checkPin(); });
    shipPin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); render(); checkPin(); } });
    syncShipPin();

    // Coupon (same engine as the bag)
    var cbox = $('[data-co-coupon]');
    cbox.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = cbox.querySelector('#co-coupon'), code = input.value.trim();
      var msg = cbox.querySelector('[data-co-coupon-msg]');
      if (!code) { msg.textContent = 'Enter a discount code'; msg.className = 'hoa-co-coupon__msg is-error'; return; }
      if (!H.coupon.apply(code).ok) { msg.textContent = 'This code isn’t valid'; msg.className = 'hoa-co-coupon__msg is-error'; return; }
      cbox.innerHTML = ''; render();
    });
    cbox.addEventListener('click', function (e) {
      if (e.target.closest('[data-co-coupon-remove]')) { H.coupon.remove(); cbox.innerHTML = ''; render(); }
    });

    // You may also like (in the summary, under the total): add straight into this order and the bag
    var rail = $('[data-co-recs-rail]');
    rail.addEventListener('click', function (e) {
      var b = e.target.closest('[data-co-rec-add]');
      if (!b || b.classList.contains('is-added')) return;
      S.cart.push(H.makeItem(b.getAttribute('data-co-rec-add')));
      try { localStorage.setItem(BAG_KEY, JSON.stringify(S.cart)); } catch (err) {}
      b.classList.add('is-added');
      b.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.4 2.4L9.6 3.8"/></svg><span>Added</span>';
      render();
      setTimeout(renderRecs, 1200);
    });

    // Pay: UI only. Validate, show a short busy state, then say payments aren't connected.
    var pay = $('[data-co-pay]'), status = $('[data-co-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (pay.getAttribute('aria-busy') === 'true') return;
      S.submitted = true;
      status.hidden = true;
      if (!validate(true)) {
        if (!S.method && !checks().pin) $('[data-co-ship]').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      saveDraft();
      pay.setAttribute('aria-busy', 'true'); pay.classList.add('is-busy');
      setTimeout(function () {
        pay.removeAttribute('aria-busy'); pay.classList.remove('is-busy');
        status.innerHTML = '<b>Your details are complete.</b> Online payment isn&rsquo;t connected yet, so no order was placed and nothing was charged.';
        status.hidden = false;
      }, 1100);
    });

    render();
    renderRecs();

    // Keep the receipt pinned only when all of it fits on screen, so nothing is ever out of reach.
    var sum = $('.hoa-co-sum');
    var fit = function () { sum.classList.toggle('is-sticky', sum.offsetHeight + 124 <= window.innerHeight); };
    fit();
    window.addEventListener('resize', fit, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(sum);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
