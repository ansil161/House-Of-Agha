// Version switch — floating V1 / V2 pill on the two home pages of the preview only.
// V1 home = index.html (templates/index.json), V2 home = home-v2.html (templates/index.v2.json).
(function () {
  if (window.__aghaVersionSwitch) return;
  window.__aghaVersionSwitch = true;

  var file = location.pathname.split('/').pop() || 'index.html';
  var isV2 = file === 'home-v2.html';

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
    '@media (max-width:760px){.agha-vs{left:12px;bottom:12px}.agha-vs__label{display:none}}',
    '@media print{.agha-vs{display:none}}'
  ].join('');

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var nav = document.createElement('nav');
    nav.className = 'agha-vs';
    nav.setAttribute('aria-label', 'Home page version');
    nav.innerHTML = '<span class="agha-vs__label">Version</span>';
    [['V1', 'index.html', false], ['V2', 'home-v2.html', true]].forEach(function (v) {
      var a = document.createElement('a');
      a.textContent = v[0];
      if (v[2] === isV2) { a.setAttribute('aria-current', 'true'); a.title = 'You are on ' + v[0]; }
      else { a.href = v[1]; a.title = 'Switch to ' + v[0]; }
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
