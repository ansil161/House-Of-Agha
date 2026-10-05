// Version switch — floating V1 / V2 pill shown on both versions of the preview site.
// V1 pages live at the site root, V2 pages under /v2/. Each click goes to the matching page in the
// other version (product keeps its ?p= handle) and falls back to that version's home page.
(function () {
  if (window.__aghaVersionSwitch) return;
  window.__aghaVersionSwitch = true;

  var V1_TO_V2 = {
    'index.html': 'index.html',
    'shop.html': 'shop.html',
    'product.html': 'product.html',
    'the-house.html': 'about.html',
    'contact.html': 'contact.html',
    'faq.html': 'help.html',
    'shipping-returns.html': 'help.html',
    'checkout.html': 'checkout.html',
    'account.html': 'account.html',
    'account-login.html': 'account.html',
    'account-register.html': 'account.html',
    'account-addresses.html': 'account.html',
    'account-order.html': 'account.html',
    'account-reset.html': 'account.html',
    'account-activate.html': 'account.html'
  };
  var V2_TO_V1 = {
    'index.html': 'index.html',
    'shop.html': 'shop.html',
    'product.html': 'product.html',
    'about.html': 'the-house.html',
    'contact.html': 'contact.html',
    'help.html': 'faq.html',
    'checkout.html': 'checkout.html',
    'account.html': 'account.html'
  };

  var path = location.pathname;
  var isV2 = /\/v2\//.test(path);
  var file = path.split('/').pop() || 'index.html';
  var params = new URLSearchParams(location.search);
  var keep = file === 'product.html' && params.get('p') ? '?p=' + encodeURIComponent(params.get('p')) : '';

  function target(toV2) {
    if (toV2 === isV2) return null;
    if (toV2) return 'v2/' + (V1_TO_V2[file] || 'index.html') + (V1_TO_V2[file] === 'product.html' ? keep : '');
    return '../' + (V2_TO_V1[file] || 'index.html') + (V2_TO_V1[file] === 'product.html' ? keep : '');
  }

  var css = [
    '.agha-vs{position:fixed;left:20px;bottom:20px;z-index:950;display:flex;align-items:center;gap:2px;padding:4px;',
    'border:1px solid rgba(17,17,17,.14);border-radius:999px;background:rgba(255,255,255,.94);',
    '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 8px 28px rgba(17,17,17,.12);',
    'font:500 10.5px/1 "Jost","Helvetica Neue",Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#111}',
    '.agha-vs__label{padding:0 8px 0 10px;color:rgba(17,17,17,.5)}',
    '.agha-vs a{display:block;padding:8px 12px;border-radius:999px;color:inherit;text-decoration:none;transition:background .25s,color .25s}',
    '.agha-vs a:hover{background:rgba(17,17,17,.07)}',
    '.agha-vs a[aria-current]{background:#111;color:#fff;pointer-events:none}',
    '.agha-vs a:focus-visible{outline:2px solid #111;outline-offset:2px}',
    '@media (max-width:760px){.agha-vs{left:12px;bottom:12px}.agha-vs__label{display:none}',
    '.agha-vs--lift{bottom:96px}}',
    '@media print{.agha-vs{display:none}}'
  ].join('');

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var nav = document.createElement('nav');
    // V1's product page has a sticky buy dock along the bottom on phones; sit above it there.
    nav.className = 'agha-vs' + (!isV2 && file === 'product.html' ? ' agha-vs--lift' : '');
    nav.setAttribute('aria-label', 'Site version');
    nav.innerHTML = '<span class="agha-vs__label">Version</span>';
    [['V1', false], ['V2', true]].forEach(function (v) {
      var a = document.createElement('a');
      a.textContent = v[0];
      var href = target(v[1]);
      if (href) { a.href = href; a.title = 'Switch to ' + v[0]; }
      else { a.setAttribute('aria-current', 'true'); a.title = 'You are on ' + v[0]; }
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
