// Dev-only: renders templates/page.wishlist.json (real Liquid via liquidjs) into a copy of the shop
// page shell, with Shopify's `customer` on or off, and stubs the storefront's /products/{handle}.js
// so the wishlist page and hearts can be exercised in a browser without a store.
//   node tools/render-wishlist-test.js --customer=on|off [--out=_wishlist-test.html]
// The wishlist itself uses the "device" storage adapter (the app-proxy adapter needs a real app).
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.resolve(__dirname, '..');
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a === '--' + name || a.startsWith('--' + name + '='));
  return hit ? (hit.includes('=') ? hit.split('=')[1] : true) : dflt;
};
const CUSTOMER = arg('customer', 'on') === 'on';
const OUT = arg('out', '_wishlist-test.html');

const engine = new Liquid({ root: [path.join(THEME, 'snippets')], extname: '.liquid', relativeReference: false, jsTruthy: false });
engine.registerFilter('asset_url', (v) => 'assets/' + v);
engine.registerFilter('url_encode', (v) => encodeURIComponent(v));
engine.registerTag('schema', {
  parse(token, remain) {
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endschema', () => stream.stop()).on('template', () => {}).on('end', () => { throw new Error('schema not closed'); });
    stream.start();
  },
  * render() { return ''; }
});

const readSchema = (src) => { const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/); return m ? JSON.parse(m[1]) : {}; };
const defaults = (list) => Object.fromEntries((list || []).filter((s) => s.id).map((s) => [s.id, s.default === undefined ? '' : s.default]));

const PRODUCTS = {
  'oud-fury': { id: 1, handle: 'oud-fury', title: 'Oud Fury', type: 'Oud Woody', url: '/products/oud-fury', description: '<p>A dense, smoky extrait of aged agarwood, iris root and pink pepper compounded at 35% oil.</p>', featured_image: 'assets/hoa-product-oud-fury.webp', price: 560000, available: true, variants: [
    { id: 101, title: '50 ml', price: 560000, compare_at_price: 660000, available: true, featured_image: null },
    { id: 102, title: '100 ml', price: 900000, compare_at_price: null, available: false, featured_image: null }] },
  'agha-blue': { id: 2, handle: 'agha-blue', title: 'Agha Blue', type: 'Aquatic Woody', url: '/products/agha-blue', description: '<p>Sea salt and cedar.</p>', featured_image: 'assets/hoa-product-agha-blue.webp', price: 560000, available: false, variants: [
    { id: 201, title: 'Default Title', price: 560000, compare_at_price: null, available: false, featured_image: null }] },
  'maha': { id: 3, handle: 'maha', title: 'Maha', type: 'Amber Floral', url: '/products/maha', description: '<p>Amber, rose and musk.</p>', featured_image: 'assets/hoa-product-maha.webp', price: 560000, available: true, variants: [
    { id: 301, title: 'Default Title', price: 560000, compare_at_price: null, available: true, featured_image: null }] }
};

(async () => {
  const conf = JSON.parse(fs.readFileSync(path.join(THEME, 'templates/page.wishlist.json'), 'utf8'));
  const c = conf.sections.main;
  const src = fs.readFileSync(path.join(THEME, 'sections', c.type + '.liquid'), 'utf8');
  const settings = Object.assign(defaults(readSchema(src).settings), c.settings || {});
  const globals = {
    customer: CUSTOMER ? { id: 4242, first_name: 'Test' } : null,
    routes: { root_url: '/', account_login_url: '/account/login', all_products_collection_url: '/collections/all' },
    request: { path: '/pages/wishlist' }
  };
  const html = await engine.parseAndRender(src, Object.assign({}, globals, { section: { id: 'main', settings, blocks: [] } }));

  const stub = `<script>
    window.AghaWishlistConfig = { loggedIn: ${CUSTOMER}, customerId: ${CUSTOMER ? 4242 : 'null'}, loginUrl: '/account-login.html', wishlistUrl: '/_wishlist-test.html', root: '/', storage: 'device', proxyPath: '/apps/wishlist', moneyFormat: '₹{{amount_no_decimals}}' };
    // test-only: the storefront's public product JSON
    const PRODUCTS = ${JSON.stringify(PRODUCTS)};
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      const m = String(url).match(/\\/products\\/([^/.?]+)\\.js/);
      if (m) {
        const p = PRODUCTS[decodeURIComponent(m[1])];
        return Promise.resolve(p ? new Response(JSON.stringify(p), { status: 200 }) : new Response('{}', { status: 404 }));
      }
      if (/cart\\/add\\.js/.test(String(url))) return Promise.resolve(new Response('{}', { status: 200 }));
      return realFetch(url, opts);
    };
  </script>`;

  let page = fs.readFileSync(path.join(THEME, 'shop.html'), 'utf8');
  page = page.replace('assets/hoa-shop.css', 'assets/agha-wishlist.css');
  page = page.replace(/<script src="assets\/hoa-shop\.js" defer><\/script>/, () => `${stub}\n  <script src="assets/agha-wishlist.js" defer></script>\n  <script src="assets/agha-wishlist-page.js" defer></script>`);
  page = page.replace('<body class="hoa-shop-page">', '<body class="hoa-wishlist-page">');
  const start = page.search(/<main[\s>]/);
  const end = page.indexOf('</main>');
  page = page.slice(0, start) + '<main id="main-content"><div class="shopify-section">' + html + '</div>\n  ' + page.slice(end);
  fs.writeFileSync(path.join(THEME, OUT), page);
  console.log(`rendered wishlist page → ${OUT} (customer ${CUSTOMER ? 'ON' : 'OFF'})`);
})().catch((e) => { console.error(e); process.exit(1); });
