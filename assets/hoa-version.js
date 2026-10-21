/* V1 / V2 switch (2026-10-20). V1 = the site as it was. V2 = V1 + the transparent navbar and the black product
   page (assets/hoa-v2-skin.css, every rule scoped to html.hoa-v2). ?v=2 or ?v=1 picks one and it is remembered;
   the small pill at the bottom left flips it. Runs in <head> so the class is on <html> before first paint. */
(function () {
  var KEY = 'hoa-version', v = '1';
  try {
    var q = /[?&]v=([12])\b/.exec(location.search);
    if (q) localStorage.setItem(KEY, q[1]);
    v = localStorage.getItem(KEY) || '1';
  } catch (_) { var m = /[?&]v=([12])\b/.exec(location.search); if (m) v = m[1]; }
  var root = document.documentElement;
  root.classList.toggle('hoa-v2', v === '2');
  var h = /(?:\/products\/|[?&]p=)([a-z0-9-]+)/.exec(location.pathname + location.search);
  if (h || /product\.html$/.test(location.pathname)) { root.classList.add('hoa-pdp'); root.setAttribute('data-bottle', h ? h[1] : 'oud-fury'); }
  function pill() {
    var box = document.createElement('div');
    box.className = 'hoa-vswitch';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Site version');
    ['1', '2'].forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'V' + n;
      b.setAttribute('aria-pressed', String(n === v));
      b.addEventListener('click', function () { try { localStorage.setItem(KEY, n); } catch (_) {} location.reload(); });
      box.appendChild(b);
    });
    document.body.appendChild(box);
  }
  if (document.body) pill(); else document.addEventListener('DOMContentLoaded', pill);
})();
