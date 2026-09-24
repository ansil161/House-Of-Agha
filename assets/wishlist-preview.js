/* ==========================================================================
   WISHLIST — STATIC PREVIEW SHIM (not used on Shopify; layout/theme.liquid does not load it)
   The preview pages have no Shopify, so this stands in for the three things the wishlist needs:
     • the customer: signed out by default; open any preview page with ?signedin=1 to sign in
       (?signedin=0 signs out again)
     • storage: the "device" adapter (this browser)
     • /products/{handle}.js: built from AGHA_PRODUCTS in theme.js (placeholder preview prices)
   ========================================================================== */

(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('signedin')) {
    try { localStorage.setItem('agha-preview-signed-in', params.get('signedin') === '0' ? '0' : '1'); } catch (e) { /* ignore */ }
  }
  const signedIn = (() => { try { return localStorage.getItem('agha-preview-signed-in') === '1'; } catch (e) { return false; } })();

  window.AghaWishlistConfig = {
    loggedIn: signedIn,
    customerId: signedIn ? 1 : null,
    loginUrl: '/account-login.html',
    wishlistUrl: '/shop.html',
    root: '/',
    storage: 'device',
    moneyFormat: '₹{{amount_no_decimals}}'
  };

  const realFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    const m = String(url).match(/\/products\/([^/.?]+)\.js/);
    const catalog = typeof AGHA_PRODUCTS !== 'undefined' ? AGHA_PRODUCTS : null;
    if (m && catalog) {
      const p = catalog[decodeURIComponent(m[1])];
      if (!p) return Promise.resolve(new Response('{}', { status: 404 }));
      const sizes = Object.entries(p.sizes || {});
      const variants = sizes.map(([title, price], i) => ({
        id: Number(`${Math.abs(String(m[1]).split('').reduce((a, c) => a + c.charCodeAt(0), 0))}${i}`),
        title,
        price: price * 100,
        compare_at_price: p.compare && p.compare[title] ? p.compare[title] * 100 : null,
        available: true,
        featured_image: null
      }));
      const body = {
        handle: m[1],
        title: p.title,
        type: p.family || '',
        url: `/product.html?p=${m[1]}`,
        description: `<p>${p.description || ''}</p>`,
        featured_image: p.images && p.images[0],
        price: variants[0] ? variants[0].price : 0,
        available: true,
        variants
      };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    }
    if (/cart\/add\.js/.test(String(url))) return Promise.resolve(new Response('{}', { status: 200 }));
    return realFetch(url, opts);
  };
})();
