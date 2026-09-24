// Preview build: renders templates/index.json through the real Liquid sections (liquidjs + Shopify stubs)
// and writes the result into the static preview index.html.
// Usage: npm install, then npm run preview:build (writes index.html), then node server.js.
const fs = require('fs');
const path = require('path');
const { Liquid, Tag } = require('liquidjs');

const THEME = path.resolve(__dirname, '..');
const engine = new Liquid({ root: [path.join(THEME, 'snippets')], extname: '.liquid', relativeReference: false, jsTruthy: false });

// ---- Shopify filter stubs ----
engine.registerFilter('asset_url', (v) => 'assets/' + v);
engine.registerFilter('stylesheet_tag', (v) => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('handleize', (v) => String(v || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
engine.registerFilter('money', (v) => '₹' + Number(v || 0).toLocaleString('en-IN'));
engine.registerFilter('image_url', (v) => v);
engine.registerFilter('image_tag', (v) => `<img src="${v}" alt="">`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('shopify_asset_url', () => '');
engine.registerFilter('script_tag', () => '');
engine.registerFilter('default_pagination', () => '');
engine.registerFilter('format_address', (a) => a ? [
  [a.first_name, a.last_name].filter(Boolean).join(' '), a.company, a.address1, a.address2,
  [a.city, a.province_code, a.zip].filter(Boolean).join(' '), a.country
].filter(Boolean).map((l) => `<p>${l}</p>`).join('') : '');

// ---- Shopify tag stubs ----
engine.registerTag('schema', {
  parse(token, remain) {
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endschema', () => stream.stop()).on('template', () => {}).on('end', () => { throw new Error('schema not closed'); });
    stream.start();
  },
  * render() { return ''; }
});
// Shopify's {% form %}: the action Shopify would use, plus a `form` object in scope
// (no errors, fields prefilled from the address for 'customer_address').
const FORM_ACTIONS = {
  customer_login: '/account/login', recover_customer_password: '/account/recover', guest_login: '/account/login',
  create_customer: '/account', reset_customer_password: '/account/reset', activate_customer_password: '/account/activate',
  customer_address: '/account/addresses', product: '/cart/add'
};
engine.registerTag('form', {
  parse(token, remain) {
    const m = token.args.match(/^\s*'(\w+)'(?:\s*,\s*([\w.]+)(?=\s*(?:,|$)))?/);
    this.formType = m ? m[1] : 'product';
    this.formObject = m && m[2] ? m[2] : null;
    const cls = token.args.match(/class:\s*'([^']*)'/);
    this.formClass = cls ? cls[1] : '';
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endform', () => stream.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('form not closed'); });
    stream.start();
  },
  * render(ctx, emitter) {
    const obj = this.formObject ? (yield this.liquid.evalValue(this.formObject, ctx)) : null;
    const form = Object.assign({ errors: null, 'posted_successfully?': false, password_needed: true }, obj || {});
    if (this.formType === 'customer_address') {
      const id = obj && obj.id ? obj.id : 'new';
      form.id = obj && obj.id;
      form.set_as_default_checkbox = `<input type="checkbox" id="address_default_address_${id}" name="address[default]" value="1"${obj && obj.default ? ' checked' : ''}>`;
    }
    const action = this.formType === 'customer_address' && obj && obj.url ? obj.url : (FORM_ACTIONS[this.formType] || '/');
    emitter.write(`<form method="post" action="${action}" accept-charset="UTF-8"${this.formClass ? ` class="${this.formClass}"` : ''} novalidate><input type="hidden" name="form_type" value="${this.formType}">`);
    ctx.push({ form });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  }
});

// Shopify's {% paginate %}: renders its body once, one page.
engine.registerTag('paginate', {
  parse(token, remain) {
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endpaginate', () => stream.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('paginate not closed'); });
    stream.start();
  },
  * render(ctx, emitter) {
    ctx.push({ paginate: { pages: 1, current_page: 1 } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
  }
});

const readSchema = (src) => {
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : {};
};
const defaults = (list) => Object.fromEntries((list || []).filter((s) => s.id).map((s) => [s.id, s.default === undefined ? '' : s.default]));

const globals = {
  routes: {
    root_url: '/', all_products_collection_url: '/collections/all',
    account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/register',
    account_logout_url: '/account/logout', account_addresses_url: '/account/addresses'
  },
  shop: { customer_accounts_enabled: true, checkout: { guest_login: false } },
  all_country_option_tags: ['India', 'United Arab Emirates', 'United Kingdom', 'United States']
    .map((c) => `<option value="${c}" data-provinces="[]">${c}</option>`).join(''),
  collections: {}, all_products: {}, cart: { item_count: 0 },
  template: { name: 'index' }
};

// Renders a JSON template's sections the way Shopify does: one wrapper div per section.
async function renderTemplate(name, templateGlobals) {
  const tpl = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', name + '.json'), 'utf8'));
  let main = '';
  for (const key of tpl.order) {
    const conf = tpl.sections[key];
    const file = path.join(THEME, 'sections', conf.type + '.liquid');
    const src = fs.readFileSync(file, 'utf8');
    const schema = readSchema(src);
    const settings = Object.assign(defaults(schema.settings), conf.settings || {});
    const blocks = (conf.block_order || []).map((id) => {
      const b = conf.blocks[id];
      const bs = (schema.blocks || []).find((x) => x.type === b.type) || {};
      return { id, type: b.type, settings: Object.assign(defaults(bs.settings), b.settings || {}), shopify_attributes: '' };
    });
    const section = { id: key, settings, blocks };
    const html = await engine.parseAndRender(src, Object.assign({}, globals, templateGlobals, { section }));
    const cls = ['shopify-section', schema.class].filter(Boolean).join(' ');
    main += `\n    <!-- ${key} · sections/${conf.type}.liquid -->\n    <div id="shopify-section-${key}" class="${cls}">${html}</div>\n`;
  }
  return { main, tpl };
}

(async () => {
  const { main, tpl } = await renderTemplate('index', {});
  const header = await engine.parseAndRender(fs.readFileSync(path.join(THEME, 'snippets/header.liquid'), 'utf8'), globals);

  const indexPath = path.join(THEME, 'index.html');
  let page = fs.readFileSync(indexPath, 'utf8');
  const hs = page.search(/  <!-- Navigation Header[^>]*-->/);
  const ms = page.indexOf('<main id="main-content">');
  const me = page.indexOf('</main>');
  if (hs < 0 || ms < 0 || me < 0) throw new Error('index.html markers missing');
  page = page.slice(0, hs) + '  <!-- Navigation Header · snippets/header.liquid (rendered by the preview build) -->\n' + header.trim() + '\n\n  ' +
    '<main id="main-content">\n    <!-- Generated from templates/index.json. Edit the Liquid sections, not this block. -->' + main + '\n  ' + page.slice(me);
  // The Liquid uses real Shopify URLs (/pages/…, /collections/…, /products/…). In the static
  // preview, point them at the .html files so it also works under a plain static server
  // (e.g. the IDE's Live Server on :5500), not only under server.js on :3000.
  const toPreview = (url) => url
    .replace(/^\/pages\/(the-house|private-access|contact|faq|shipping-returns)(?=[#?]|$)/, '/$1.html')
    .replace(/^\/collections\/all(?=[#?]|$)/, '/shop.html')
    .replace(/^\/products\/([a-z0-9-]+)(?=[#?]|$)/, '/product.html?p=$1')
    .replace(/^\/account\/(login|register|addresses|reset|activate)(?=[#?]|$)/, '/account-$1.html')
    .replace(/^\/account\/orders\/[\w-]+(?=[#?]|$)/, '/account-order.html')
    .replace(/^\/account\/logout(?=[#?]|$)/, '/account-login.html')
    .replace(/^\/account(?=[#?]|$)/, '/account.html')
    .replace(/^\/#/, '#');
  page = page.replace(/href="(\/[^"]*)"/g, (m, url) => `href="${toPreview(url)}"`);

  fs.writeFileSync(indexPath, page);
  console.log('rendered', tpl.order.length, 'sections,', main.length, 'chars');

  // Inner preview pages get the same header as the homepage (as layout/theme.liquid does on the
  // live theme): swap whatever header they carry for the rendered snippet, plus the stylesheet it needs.
  const headerHtml = ('  <!-- Navigation Header · snippets/header.liquid (rendered by the preview build) -->\n  ' + header.trim())
    .replace(/href="(\/[^"]*)"/g, (m, url) => `href="${toPreview(url).replace(/^#/, '/#')}"`);
  const inner = fs.readdirSync(THEME).filter((f) => f.endsWith('.html') && f !== 'index.html');
  for (const f of inner) {
    const file = path.join(THEME, f);
    let html = fs.readFileSync(file, 'utf8');
    const re = /[ \t]*(?:<!-- Navigation Header[^>]*-->\s*)?<header class="header[\s\S]*?<\/header>(?:\s*<nav class="hoa-menu"[\s\S]*?<\/nav>)?/;
    if (!re.test(html)) { console.warn('no header found in', f); continue; }
    html = html.replace(re, () => headerHtml);
    if (!html.includes('assets/hoa-home.css')) {
      html = html.replace(/(<link rel="stylesheet" href="(\/?)assets\/theme\.css">)/, '$1\n  <link rel="stylesheet" href="$2assets/hoa-home.css">');
    }
    fs.writeFileSync(file, html);
  }
  console.log('shared header on', inner.length, 'inner pages');

  // Pages built from JSON templates: replace the preview file's <main> with the rendered sections.
  const pageTemplates = { 'the-house.html': 'page.the-house', 'shop.html': 'collection' };
  for (const [file, name] of Object.entries(pageTemplates)) {
    const [tplName, suffix] = name.split('.');
    const rendered = await renderTemplate(name, { template: { name: tplName, suffix } });
    const pagePath = path.join(THEME, file);
    let html = fs.readFileSync(pagePath, 'utf8');
    const start = html.search(/<main[\s>]/);
    const end = html.indexOf('</main>');
    if (start < 0 || end < 0) throw new Error(file + ': <main> markers missing');
    const body = ('<main id="main-content">\n    <!-- Generated from templates/' + name + '.json. Edit the Liquid sections, not this block. -->' + rendered.main + '\n  ')
      .replace(/href="(\/[^"]*)"/g, (m, url) => `href="${toPreview(url)}"`);
    html = html.slice(0, start) + body + html.slice(end);
    fs.writeFileSync(pagePath, html);
    console.log('rendered', rendered.tpl.order.length, 'sections into', file);
  }

  // Customer account templates (Shopify classic accounts) → account-*.html, built on the shop page's
  // shell. Signed-in pages use the mock customer below; the forms post nowhere in the static preview.
  const addr = (o) => Object.assign({ first_name: 'Aisha', last_name: 'Rahman', company: '', address2: '', country: 'India', province_code: 'MH', phone: '' }, o);
  const home = addr({ id: 101, address1: '14 Carmichael Road', city: 'Mumbai', zip: '400026', default: true, url: '/account/addresses/101' });
  const work = addr({ id: 102, company: 'Rahman Studio', address1: '3rd Floor, Kala Ghoda Chambers', address2: 'Fort', city: 'Mumbai', zip: '400001', url: '/account/addresses/102' });
  const shipped = { created_at: '2026-09-13T10:00:00Z', tracking_number: 'BD4418207', tracking_url: 'https://example.com/track', tracking_company: 'Blue Dart' };
  const item = (handle, title, qty, price) => ({
    title, quantity: qty, final_price: price, final_line_price: price * qty, original_line_price: price * qty,
    url: '/products/' + handle, image: `assets/hoa-product-${handle}-sm.webp`, fulfillment: shipped,
    product: { title, has_only_default_variant: false }, variant: { title: '100 ml' }, properties: {}
  });
  const order = {
    name: '#1042', customer_url: '/account/orders/1042', created_at: '2026-09-12T10:00:00Z',
    financial_status_label: 'Paid', fulfillment_status: 'fulfilled', fulfillment_status_label: 'Fulfilled', cancelled: false,
    item_count: 3, total_price: 17640, line_items_subtotal_price: 16800, total_refunded_amount: 0,
    line_items: [item('oud-fury', 'Oud Fury', 2, 5600), item('agha-blue', 'Agha Blue', 1, 5600)],
    cart_level_discount_applications: [], shipping_methods: [{ title: 'Express', price: 0 }],
    tax_lines: [{ title: 'GST', rate_percentage: 5, price: 840 }],
    shipping_address: home, billing_address: home
  };
  const orders = [
    order,
    { name: '#1031', customer_url: '/account/orders/1031', created_at: '2026-08-02T10:00:00Z', financial_status_label: 'Paid', fulfillment_status: null, fulfillment_status_label: 'Unfulfilled', cancelled: false, total_price: 5900 },
    { name: '#1017', customer_url: '/account/orders/1017', created_at: '2026-05-21T10:00:00Z', financial_status_label: 'Refunded', fulfillment_status: null, fulfillment_status_label: 'Unfulfilled', cancelled: true, total_price: 11200 }
  ];
  const customer = {
    first_name: 'Aisha', last_name: 'Rahman', name: 'Aisha Rahman', email: 'aisha.rahman@example.com', phone: '+91 98200 00000',
    orders, orders_count: orders.length, addresses: [home, work], addresses_count: 2, default_address: home, new_address: {}
  };
  const accountPages = {
    'account-login.html': ['customers/login', 'Sign in', null],
    'account-register.html': ['customers/register', 'Create account', null],
    'account-reset.html': ['customers/reset_password', 'Reset password', { email: customer.email }],
    'account-activate.html': ['customers/activate_account', 'Activate account', null],
    'account.html': ['customers/account', 'Account', customer],
    'account-order.html': ['customers/order', 'Order #1042', customer],
    'account-addresses.html': ['customers/addresses', 'Addresses', customer]
  };
  const shell = fs.readFileSync(path.join(THEME, 'shop.html'), 'utf8');
  for (const [file, [name, title, cust]] of Object.entries(accountPages)) {
    const rendered = await renderTemplate(name, { template: { name: name.split('/')[1], directory: 'customers' }, customer: cust, order });
    const body = ('<main id="main-content">\n    <!-- Generated from templates/' + name + '.json. Edit the Liquid sections, not this block. -->' + rendered.main + '\n  ')
      .replace(/href="(\/[^"]*)"/g, (m, url) => `href="${toPreview(url)}"`);
    let html = shell
      .replace(/<title>[^<]*<\/title>/, `<title>${title} | House of Agha</title>`)
      .replace(/<meta name="description"[^>]*>/, '<meta name="robots" content="noindex">')
      .replace('assets/hoa-shop.css', 'assets/hoa-account.css')
      .replace('assets/hoa-shop.js', 'assets/hoa-account.js')
      .replace('<body class="hoa-shop-page">', '<body class="hoa-account-page">');
    const start = html.search(/<main[\s>]/);
    const end = html.indexOf('</main>');
    html = html.slice(0, start) + body + html.slice(end);
    fs.writeFileSync(path.join(THEME, file), html);
  }
  console.log('rendered', Object.keys(accountPages).length, 'account pages');

  // Welcome coupon popup (snippets/hoa-coupon-popup.liquid) — layout/theme.liquid renders it on every
  // page, so mirror that in each preview page: stylesheet, script and the rendered snippet.
  const couponHtml = (await engine.parseAndRender(fs.readFileSync(path.join(THEME, 'snippets/hoa-coupon-popup.liquid'), 'utf8'), globals)).trim();
  const couponBlock = '  <!-- Welcome coupon popup · snippets/hoa-coupon-popup.liquid (rendered by the preview build) -->\n  ' + couponHtml + '\n';
  const couponCss = /[ \t]*<link rel="stylesheet" href="\/?assets\/hoa-coupon\.css">\n/;
  const couponJs = /[ \t]*<script src="\/?assets\/hoa-coupon\.js" defer><\/script>\n/;
  const couponBlockRe = /[ \t]*<!-- Welcome coupon popup[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\n/;
  const all = fs.readdirSync(THEME).filter((f) => f.endsWith('.html'));
  for (const f of all) {
    const file = path.join(THEME, f);
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(couponCss, '').replace(couponJs, '').replace(couponBlockRe, '');
    const pre = (html.match(/<link rel="stylesheet" href="(\/?)assets\/hoa-home\.css">/) || ['', ''])[1];
    html = html
      .replace(/([ \t]*<link rel="stylesheet" href="\/?assets\/hoa-home\.css">\n)/, `$1  <link rel="stylesheet" href="${pre}assets/hoa-coupon.css">\n`)
      .replace('</head>', () => `  <script src="${pre}assets/hoa-coupon.js" defer></script>\n</head>`)
      .replace('</body>', () => couponBlock + '</body>');
    fs.writeFileSync(file, html);
  }
  console.log('coupon popup on', all.length, 'pages');

  // Wishlist drawer (snippets/wishlist-drawer.liquid) — layout/theme.liquid renders it on every page.
  // The preview also loads assets/wishlist-preview.js, which fakes the customer, storage and product
  // JSON (see that file; ?signedin=1 signs in).
  const wlHtml = (await engine.parseAndRender(fs.readFileSync(path.join(THEME, 'snippets/wishlist-drawer.liquid'), 'utf8'), globals)).trim();
  const wlBlock = '  <!-- Wishlist drawer · snippets/wishlist-drawer.liquid (rendered by the preview build) -->\n  ' + wlHtml + '\n';
  const wlCss = /[ \t]*<link rel="stylesheet" href="\/?assets\/agha-wishlist-drawer\.css">\n/;
  const wlJs = /[ \t]*<script src="\/?assets\/(?:wishlist-preview|agha-wishlist|agha-wishlist-drawer)\.js" defer><\/script>\n/g;
  const wlBlockRe = /[ \t]*<!-- Wishlist drawer[\s\S]*?<\/aside>\n/;
  for (const f of all) {
    const file = path.join(THEME, f);
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(wlCss, '').replace(wlJs, '').replace(wlBlockRe, '');
    const pre = (html.match(/<link rel="stylesheet" href="(\/?)assets\/hoa-home\.css">/) || ['', ''])[1];
    html = html
      .replace(/([ \t]*<link rel="stylesheet" href="\/?assets\/hoa-home\.css">\n)/, `$1  <link rel="stylesheet" href="${pre}assets/agha-wishlist-drawer.css">\n`)
      .replace('</head>', () => `  <script src="${pre}assets/wishlist-preview.js" defer></script>\n  <script src="${pre}assets/agha-wishlist.js" defer></script>\n  <script src="${pre}assets/agha-wishlist-drawer.js" defer></script>\n</head>`)
      .replace('</body>', () => wlBlock + '</body>');
    fs.writeFileSync(file, html);
  }
  console.log('wishlist drawer on', all.length, 'pages');

  // Redirect stubs so Shopify URLs typed or bookmarked (/collections/all, /pages/…, /products/…)
  // still resolve under a plain static server. Generated, git-ignored, not part of the theme.
  const redirects = {
    'collections/all': '/shop.html', 'collections': '/shop.html', 'pages/about': '/the-house.html'
  };
  ['the-house', 'private-access', 'contact', 'faq', 'shipping-returns']
    .forEach((p) => { redirects['pages/' + p] = `/${p}.html`; });
  const handles = new Set();
  fs.readdirSync(THEME).filter((f) => f.endsWith('.html')).forEach((f) => {
    for (const m of fs.readFileSync(path.join(THEME, f), 'utf8').matchAll(/product\.html\?p=([a-z0-9-]+)/g)) handles.add(m[1]);
  });
  handles.forEach((h) => { redirects['products/' + h] = `/product.html?p=${h}`; });
  for (const [from, to] of Object.entries(redirects)) {
    const dir = path.join(THEME, from);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'),
      `<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${to}">` +
      `<script>location.replace(${JSON.stringify(to)} + location.hash)</script><a href="${to}">Continue</a>\n`);
  }
  console.log('wrote', Object.keys(redirects).length, 'preview redirects');
})().catch((e) => { console.error(e); process.exit(1); });
