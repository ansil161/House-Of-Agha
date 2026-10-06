/* Agha V2 — product data (one source for every V2 page).
   Names, sizes, prices and availability: the live store (aghaperfumes.com/products.json, 3 Oct 2026).
   Notes, descriptors and descriptions: condensed from each product's own live description.
   Images: the photography already in /assets (read only — V1 files are not modified).
   banner: the product page's full-width band — one wide campaign image, or two portraits side by side. */
window.AGHA = (() => {
  const img = (name) => ({ src: `../assets/${name}.webp`, sm: `../assets/${name}-sm.webp` });

  const products = [
    {
      handle: 'oud-fury', name: 'Oud Fury', type: 'Eau de Parfum', for: 'unisex', collections: ['main', 'oud'],
      notes: 'Saffron · Oud · Leather',
      tagline: 'A fragrance that embodies passion, mystery and opulence.',
      description: 'Passion fruit and saffron open onto rose, then agarwood takes centre stage with patchouli and benzoin. It settles into leather, vanilla and the golden glow of amber: a bold yet delicate interplay of fruity brightness and smoky woods.',
      pyramid: { Top: 'Passion fruit, saffron, rose', Heart: 'Agarwood (oud), patchouli, benzoin', Base: 'Leather, vanilla, amber' },
      sizes: [{ label: '50 ml', price: 2299, available: true }, { label: '100 ml', price: 3499, available: true }],
      cutout: img('hoa-cutout-oud-fury'),
      images: [img('hoa-product-oud-fury'), img('hoa-alt-oud-fury'), img('hoa-pdp-oud-fury-4'), img('hoa-pdp-oud-fury-1'), img('hoa-pdp-oud-fury-6')],
      banner: [img('hoa-hero-oud-fury')]
    },
    {
      handle: 'dark-paradise-oud', name: 'Oud of Dark Paradise', type: 'Eau de Parfum', for: 'unisex', collections: ['main', 'oud'],
      notes: 'Oud · Nutmeg · Saffron',
      tagline: 'The essence of power and prestige.',
      description: 'The rich, opulent allure of oud wood, revered for centuries as a symbol of luxury, softened by patchouli and musk and lit by a burst of nutmeg and saffron.',
      pyramid: null,
      sizes: [{ label: '50 ml', price: 2299, available: true }, { label: '100 ml', price: 3499, available: false }],
      cutout: img('hoa-cutout-dark-paradise'),
      images: [img('hoa-product-dark-paradise'), img('hoa-alt-dark-paradise'), img('hoa-dark-paradise-portrait')],
      banner: [img('hoa-hero-dark-paradise')]
    },
    {
      handle: 'sea-smoke', name: 'Sea Smoke', type: 'Eau de Parfum', for: 'unisex', collections: ['main'],
      notes: 'Bergamot · Seaweed · Cedar',
      tagline: 'The essence of untamed shores.',
      description: 'Fresh bergamot sparkles over salty, enigmatic seaweed. Soft musk and rugged cedarwood ground it in earthy warmth: an ode to the sea’s mysteries.',
      pyramid: null,
      sizes: [{ label: '50 ml', price: 1899, available: true }, { label: '100 ml', price: 2999, available: true }],
      cutout: img('hoa-cutout-sea-smoke'),
      images: [img('hoa-product-sea-smoke'), img('hoa-alt-sea-smoke'), img('hoa-pgal-sea-smoke-2'), img('hoa-pgal-sea-smoke-3'), img('hoa-sea-smoke-portrait')],
      banner: [img('hoa-pgal-sea-smoke-hero'), img('hoa-pgal-sea-smoke-4')]
    },
    {
      handle: 'tobacco-enigma', name: 'Tobacco Enigma', type: 'Eau de Parfum', for: 'men', collections: ['main'],
      notes: 'Bergamot · Honey · Tobacco',
      tagline: 'A celebration of tradition, with a modern twist.',
      description: 'Fresh bergamot, zesty lemon and soothing lavender reveal a warm heart of cinnamon, golden honey and jasmine, grounded by tobacco leaf, tonka and creamy vanilla.',
      pyramid: { Top: 'Bergamot, lemon, lavender', Heart: 'Cinnamon, honey, jasmine', Base: 'Tobacco leaf, tonka, vanilla' },
      sizes: [{ label: '50 ml', price: 2299, available: true }, { label: '100 ml', price: 3499, available: true }],
      cutout: img('hoa-cutout-tobacco-enigma'),
      images: [img('hoa-product-tobacco-enigma'), img('hoa-alt-tobacco-enigma'), img('hoa-tobacco-enigma-portrait')],
      banner: [img('hoa-shop-rec-tobacco-enigma'), img('hoa-ingredients-tobacco')]
    },
    {
      handle: 'maha', name: 'Maha', type: 'Eau de Parfum', for: 'women', collections: ['main'],
      notes: 'Lime · Tiare · Tonka',
      tagline: 'A radiant symphony of light and warmth.',
      description: 'The zesty brightness of lime, like the first rays of sunrise, blossoms into tiare flower and freesia, and ends on velvety cedarwood and creamy tonka bean.',
      pyramid: { Top: 'Lime', Heart: 'Tiare flower, freesia', Base: 'Cedarwood, tonka bean' },
      sizes: [{ label: '50 ml', price: 1499, available: true }, { label: '100 ml', price: 2499, available: true }],
      cutout: img('hoa-cutout-maha'),
      images: [img('hoa-product-maha'), img('hoa-alt-maha'), img('hoa-pgal-maha-2'), img('hoa-pgal-maha-3'), img('hoa-maha-portrait')],
      banner: [img('hoa-pgal-maha-4'), img('hoa-pgal-maha-5')]
    },
    {
      handle: 'agha-blue', name: 'Agha Blue', type: 'Eau de Parfum', for: 'men', collections: ['main'],
      notes: 'Mandarin · Sage · Suede',
      tagline: 'Fresh elegance and smoky depth.',
      description: 'Mandarin orange and crisp cucumber open onto basil and sage. Suede, woody accords and a whisper of musk wrap the skin in a lingering veil of smoky sophistication.',
      pyramid: { Top: 'Mandarin orange, cucumber', Heart: 'Basil, sage', Base: 'Suede, woody accords, musk' },
      sizes: [{ label: '50 ml', price: 1499, available: true }, { label: '100 ml', price: 2499, available: true }],
      cutout: img('hoa-cutout-agha-blue'),
      images: [img('hoa-product-agha-blue'), img('hoa-alt-agha-blue'), img('hoa-pgal-agha-blue-2'), img('hoa-pgal-agha-blue-3'), img('hoa-agha-blue-portrait')],
      banner: [img('hoa-hero-agha-blue')]
    },
    {
      handle: 'shamamah', name: 'Shamamah', type: 'Attar', for: 'unisex', collections: ['attar'],
      notes: 'Aged woods · Spice · Earth',
      tagline: 'The essence of the Deccan. Aged two years, 100% natural, alcohol free.',
      description: 'Born from ancient alchemy and a tribute to the Qutub Shahi dynasty: aged woods, exotic spices and earthy undertones, crafted through a centuries-old distillation process.',
      pyramid: null,
      sizes: [{ label: '12 ml', price: 3999, available: true }],
      cutout: img('hoa-cutout-shamamah'),
      images: [img('hoa-product-shamamah'), img('hoa-alt-shamamah'), img('hoa-pgal-shamamah-2'), img('hoa-pgal-shamamah-3')],
      banner: [img('hoa-pgal-shamamah-hero'), img('hoa-shamamah-portrait')]
    },
    {
      handle: 'luxury-gift-set', name: 'Luxury Gift Set', type: 'Gift Set', for: 'gift', collections: ['gift'],
      notes: 'Five fragrances',
      tagline: 'Oud Fury, Oud of Dark Paradise, Sea Smoke, Agha Blue and Tobacco Enigma, in one case.',
      description: 'A curated collection of five fragrances that embody sophistication, tradition and modern allure. Perfect for gifting, or for finding your own signature.',
      pyramid: null,
      sizes: [{ label: '50 ml', price: 9999, available: true }, { label: '100 ml', price: 15999, available: true }],
      cutout: null,
      images: [img('hoa-product-gift-set'), img('hoa-alt-gift-set')]
    }
  ];

  const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
  const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const fromPrice = (p) => Math.min(...p.sizes.map((s) => s.price));
  return { products, byHandle, money, fromPrice, email: 'info@aghaperfumes.com' };
})();
