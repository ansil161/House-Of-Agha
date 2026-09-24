// Dev-only: renders templates/product.json through the real Liquid sections (liquidjs + Shopify stubs)
// with a stand-in product, so the mock / real data priority can be checked without a store.
//   node tools/render-pdp-test.js --mock=on|off [--real] [--out=_pdp-test.html]
//   --real  gives the stand-in product real metafields/SKU/compare-at price (they must beat mock data)
// The stand-in product mimics Shopify objects only closely enough for these sections.
const fs = require('fs');
const path = require('path');
const { Liquid, Tag } = require('liquidjs');

const THEME = path.resolve(__dirname, '..');
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a === '--' + name || a.startsWith('--' + name + '='));
  return hit ? (hit.includes('=') ? hit.split('=')[1] : true) : dflt;
};
const MOCK = arg('mock', 'on') === 'on';
const REAL = Boolean(arg('real', false));
const OUT = arg('out', '_pdp-test.html');
const CUSTOMER = arg('customer', 'on') === 'on';

const mf = (value, type = 'single_line_text_field') => ({ value, type });
const variants = [
  { id: 101, title: '50 ml', options: ['50 ml'], option1: '50 ml', position: 1, price: 560000, compare_at_price: REAL ? 700000 : null, sku: REAL ? 'REAL-50' : '', barcode: '', available: true, inventory_management: 'shopify', inventory_quantity: 3, url: '/products/oud-royal?variant=101', weight: 0, weight_unit: 'g', featured_media: null },
  { id: 102, title: '100 ml', options: ['100 ml'], option1: '100 ml', position: 2, price: 900000, compare_at_price: null, sku: '', barcode: '', available: true, inventory_management: 'shopify', inventory_quantity: 40, url: '/products/oud-royal?variant=102', weight: 0, weight_unit: 'g', featured_media: null }
];
const media = [1, 2].map((i) => ({ media_type: 'image', alt: 'Oud Royal', preview_image: 'assets/hoa-product-oud-fury.webp', src: 'assets/hoa-product-oud-fury.webp' }));
const custom = {};
if (REAL) {
  Object.assign(custom, {
    ingredients: mf('REAL INGREDIENTS LIST', 'multi_line_text_field'),
    top_notes: mf(['Real Bergamot', 'Real Lemon'], 'list.single_line_text_field'),
    longevity: mf('REAL 8 hours'), longevity_level: mf(2, 'number_integer'),
    occasions: mf(['Real Office'], 'list.single_line_text_field')
  });
}
const product = {
  id: 1, handle: 'oud-royal', title: 'Oud Royal', url: '/products/oud-royal', vendor: REAL ? 'Real Brand' : '', type: REAL ? '' : '',
  description: REAL ? '<p>REAL DESCRIPTION</p>' : '', tags: [], images: media,
  media, featured_media: media[0], featured_image: 'assets/hoa-product-oud-fury.webp',
  variants, selected_or_first_available_variant: variants[0], has_only_default_variant: false,
  options: ['Size'], options_with_values: [{ name: 'Size', position: 1, selected_value: '50 ml', values: ['50 ml', '100 ml'] }],
  selling_plan_groups: [], requires_selling_plan: false,
  metafields: { custom, reviews: REAL ? { rating: mf({ rating: 4.2, scale_max: 5 }, 'rating'), rating_count: mf(9, 'number_integer') } : {} }
};

const globals = {
  product, settings: { use_mock_pdp_data: MOCK },
  shop: { url: 'https://agha.example', name: 'AGHA', money_format: '₹{{amount_no_decimals}}', enabled_payment_types: [], shipping_policy: REAL ? { url: '/policies/shipping-policy' } : null, refund_policy: null },
  cart: { taxes_included: false, currency: { iso_code: 'INR' } },
  routes: { root_url: '/', all_products_collection_url: '/collections/all', product_recommendations_url: '/recommendations/products' },
  pages: { 'shipping-returns': { title: 'Shipping & returns', url: '/pages/shipping-returns' } },
  recommendations: { performed: true, products_count: 0, products: [] },
  request: { design_mode: false }
};

const engine = new Liquid({ root: [path.join(THEME, 'snippets')], extname: '.liquid', relativeReference: false, jsTruthy: false, globals });
engine.registerFilter('asset_url', (v) => 'assets/' + v);
engine.registerFilter('stylesheet_tag', (v) => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('money', (v) => '₹' + Math.round(Number(v || 0) / 100).toLocaleString('en-IN'));
engine.registerFilter('image_url', (v) => (v && v.src) || v);
engine.registerFilter('image_tag', (v) => `<img src="${v}" alt="">`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('payment_button', () => '<button type="button" class="shopify-payment-button">Buy it now</button>');
engine.registerFilter('payment_type_svg_tag', () => '<svg></svg>');
engine.registerFilter('parse_json', (v) => JSON.parse(v));
engine.registerFilter('metafield_tag', (m) => (m && m.value ? `<span class="metafield">${Array.isArray(m.value) ? m.value.join(', ') : m.value}</span>` : ''));
engine.registerFilter('weight_with_unit', (v) => v + ' g');
engine.registerFilter('pluralize', (n, a, b) => (Number(n) === 1 ? a : b));
engine.registerFilter('media_tag', () => '');
engine.registerFilter('video_tag', () => '');
engine.registerFilter('external_video_tag', () => '');
engine.registerTag('schema', {
  parse(token, remain) {
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endschema', () => stream.stop()).on('template', () => {}).on('end', () => { throw new Error('schema not closed'); });
    stream.start();
  },
  * render() { return ''; }
});
engine.registerTag('form', {
  parse(token, remain) {
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endform', () => stream.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('form not closed'); });
    stream.start();
  },
  * render(ctx, emitter) {
    emitter.write('<form method="post" action="/cart/add" class="pdp-form" data-pdp-form novalidate>');
    ctx.push({ form: {} });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  }
});

const readSchema = (src) => {
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : {};
};
const defaults = (list) => Object.fromEntries((list || []).filter((s) => s.id).map((s) => [s.id, s.default === undefined ? '' : s.default]));

(async () => {
  const tpl = JSON.parse(fs.readFileSync(path.join(THEME, 'templates', 'product.json'), 'utf8'));
  let main = '';
  for (const key of tpl.order) {
    const conf = tpl.sections[key];
    const src = fs.readFileSync(path.join(THEME, 'sections', conf.type + '.liquid'), 'utf8');
    const schema = readSchema(src);
    const settings = Object.assign(defaults(schema.settings), conf.settings || {});
    const blocks = (conf.block_order || []).map((id) => {
      const b = conf.blocks[id];
      const bs = (schema.blocks || []).find((x) => x.type === b.type) || {};
      return { id, type: b.type, settings: Object.assign(defaults(bs.settings), b.settings || {}), shopify_attributes: '' };
    });
    const html = await engine.parseAndRender(src, { section: { id: key, settings, blocks } });
    main += `\n<!-- ${key} · ${conf.type} -->\n<div id="shopify-section-${key}" class="shopify-section">${html}</div>\n`;
  }
  let page = fs.readFileSync(path.join(THEME, 'product.html'), 'utf8');
  page = page.replace('<main id="main-content" data-pdp-preview></main>', () => `<main id="main-content">${main}</main>`);
  // the main section loads pdp.css / pdp.js itself (as on Shopify); drop the preview shell's copies
  page = page.replace(/[ \t]*<script src="\/assets\/pdp\.js" defer><\/script>\r?\n/, '').replace(/[ \t]*<link rel="stylesheet" href="\/assets\/pdp\.css">\r?\n/, '');
  page = page.replace('<script src="/assets/pdp-preview.js" defer></script>', () => `<script>window.Shopify = { routes: { root: "/" } }; window.AghaWishlistConfig = { loggedIn: ${CUSTOMER}, customerId: ${CUSTOMER ? 4242 : 'null'}, loginUrl: '/account-login.html', root: '/', storage: 'device', moneyFormat: '₹{{amount_no_decimals}}' };</script>
<script src="/assets/agha-wishlist.js" defer></script>`);
  fs.writeFileSync(path.join(THEME, OUT), page);
  console.log(`rendered ${tpl.order.length} sections → ${OUT} (mock ${MOCK ? 'ON' : 'OFF'}${REAL ? ', real data' : ''})`);
})().catch((e) => { console.error(e); process.exit(1); });
