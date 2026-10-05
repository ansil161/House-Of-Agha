// Agha V2 — page assembler. Wraps each _src/pages/*.html in the shared shell
// (head, header, footer, bag drawer) and writes /v2/<page>.html.
//   node v2/_build.js
// Each source page starts with a JSON comment: <!--{"title":"Shop","nav":"shop","scripts":["v2-shop.js"]}-->
// Optional meta "header" / "footer" pick another partial (the shop uses header-shop / footer-shop).
// V2 lives entirely in /v2 and only reads V1 images from /assets; no V1 file is touched.
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, '_src');
const part = (name) => fs.readFileSync(path.join(SRC, 'partials', name + '.html'), 'utf8');

const NAV = [['shop', 'Shop', 'shop.html'], ['about', 'About', 'about.html'], ['contact', 'Contact', 'contact.html']];

for (const file of fs.readdirSync(path.join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
  const raw = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing JSON header comment`);
  const meta = JSON.parse(m[1]);
  const body = raw.slice(m[0].length);
  const nav = NAV.map(([key, label, href]) =>
    `<a href="${href}"${meta.nav === key ? ' aria-current="page"' : ''}>${label}</a>`).join('\n          ');
  // Paths starting with http or ../ are used as-is (the About page borrows V1's about CSS/JS).
  const src = (s) => (/^(https?:|\.\.\/)/.test(s) ? s : `assets/${s}`);
  const scripts = (meta.styles || []).map((s) => `  <link rel="stylesheet" href="${src(s)}">`)
    .concat(['v2-data.js', 'v2.js', ...(meta.scripts || [])].map((s) => `  <script src="${src(s)}" defer></script>`))
    .join('\n');
  const html = part('head')
    .replace(/{{title}}/g, meta.title ? `${meta.title} · House of Agha` : 'House of Agha')
    .replace('{{description}}', meta.description || 'House of Agha, fine perfumery rooted in the Qutb Shahi heritage of Golconda and Hyderabad.')
    .replace('{{scripts}}', scripts)
    .replace('{{page}}', meta.nav || file.replace('.html', ''))
    .replace('{{bodyClass}}', meta.bodyClass ? ` class="${meta.bodyClass}"` : '')
    + part(meta.header || 'header').replace('{{nav}}', nav)
    + '\n  <main id="main">\n' + body.trimEnd() + '\n  </main>\n'
    + (meta.bare ? '' : part(meta.footer || 'footer'))
    + part('bag')
    + '</body>\n</html>\n';
  fs.writeFileSync(path.join(DIR, file), html);
  console.log('built', file);
}
