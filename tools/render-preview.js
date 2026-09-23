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
engine.registerTag('form', {
  parse(token, remain) {
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain);
    stream.on('tag:endform', () => stream.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('form not closed'); });
    stream.start();
  },
  * render(ctx, emitter) {
    emitter.write('<form method="post" action="/cart/add">');
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write('</form>');
  }
});

const readSchema = (src) => {
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : {};
};
const defaults = (list) => Object.fromEntries((list || []).filter((s) => s.id).map((s) => [s.id, s.default === undefined ? '' : s.default]));

const globals = {
  routes: { root_url: '/', all_products_collection_url: '/collections/all' },
  collections: {}, all_products: {}, cart: { item_count: 0 },
  template: { name: 'index' }
};

(async () => {
  const tpl = JSON.parse(fs.readFileSync(path.join(THEME, 'templates/index.json'), 'utf8'));
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
    const html = await engine.parseAndRender(src, Object.assign({}, globals, { section }));
    const cls = ['shopify-section', schema.class].filter(Boolean).join(' ');
    main += `\n    <!-- ${key} · sections/${conf.type}.liquid -->\n    <div id="shopify-section-${key}" class="${cls}">${html}</div>\n`;
  }
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
    .replace(/^\/pages\/(the-house|discover|gifts|private-access|contact|faq|shipping-returns)(?=[#?]|$)/, '/$1.html')
    .replace(/^\/collections\/all(?=[#?]|$)/, '/shop.html')
    .replace(/^\/products\/([a-z0-9-]+)(?=[#?]|$)/, '/product.html?p=$1')
    .replace(/^\/#/, '#');
  page = page.replace(/href="(\/[^"]*)"/g, (m, url) => `href="${toPreview(url)}"`);

  fs.writeFileSync(indexPath, page);
  console.log('rendered', tpl.order.length, 'sections,', main.length, 'chars');
})().catch((e) => { console.error(e); process.exit(1); });
