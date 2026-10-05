# Agha V2

A separate, minimal version of the site (Sarkar-level simplicity, Agha identity) on its own routes.
V1 is untouched: V2 lives only in this folder and reads V1's photos from `/assets`.

## Routes

| Page | URL |
| --- | --- |
| Home | `/v2/index.html` |
| Shop | `/v2/shop.html` (`?type=`, `for=`, `col=`, `size=`, `price=`, `sort=az|za|low|high`, `q=` search, `view=wishlist`; old `?c=` links still work) |
| Product | `/v2/product.html?p=oud-fury` |
| About | `/v2/about.html` |
| Contact | `/v2/contact.html` |
| Shipping & returns | `/v2/help.html` |
| Account | `/v2/account.html` |
| Checkout | `/v2/checkout.html` |

Run the usual preview (`node server.js`) and open http://localhost:3000/v2/index.html.

## Editing

- Pages: `_src/pages/*.html`. Shared header, footer and bag: `_src/partials/`.
  After editing, rebuild with `node v2/_build.js` (writes the `/v2/*.html` files).
- Styles: `assets/v2.css`. Behaviour: `assets/v2.js` (header, menu, bag, cards),
  `v2-home.js`, `v2-shop.js`, `v2-product.js`.
- Products: `assets/v2-data.js`, the one source for names, prices, sizes, notes and images.
  Prices, sizes and stock match the live store (aghaperfumes.com, 3 Oct 2026).

The bag (`agha-v2-bag`) and wishlist (`agha-v2-wish`) are stored in the browser, separate from V1.
