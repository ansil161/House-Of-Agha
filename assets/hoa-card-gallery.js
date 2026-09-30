/* House of Agha · product card hover carousel (every .hoa-pc on the site).
   Replaces the old 3D bottle spin. Hovering a card with a mouse cycles through all of its product
   images: studio shot → image 2 → image 3 → … → studio shot, looping, one smooth crossfade each
   (~1.2 s on screen, 0.7 s fade). Leaving the card stops it and fades back to the studio shot.

   Images: .hoa-pc__media[data-hoa-gallery] = every image after the first, "|"-separated. Written
   by snippets/hoa-shop-card.liquid (Shopify product.media, or the mock catalog's imageMood +
   gallery) and by HOA.pcMarkup (hoa-commerce.js). Nothing extra downloads until a card is hovered.

   One timer at most, for the one hovered card; cleared on leave, when the tab is hidden, and if the
   card is taken out of the page (re-rendered grids). Touch screens: no hover, nothing runs, the
   card keeps its primary image. Delegated listeners, so cards added later just work. */
(function () {
  if (window.HOA_CARD_GALLERY) return;
  var HOLD = 1200;            // ms an image stays fully on screen
  var FADE = 700;             // ms crossfade (matches .hoa-pc__img--slide in hoa-card.css)
  var FIRST = 350;            // ms before the first change, so a pass-over does nothing jarring
  var canHover = window.matchMedia ? matchMedia('(hover: hover) and (pointer: fine)') : { matches: true };
  var active = null;          // { card, slides, idx, z, timer, hideTimer }

  function layers(media) {
    if (media._hoaSlides) return media._hoaSlides;
    var urls = (media.getAttribute('data-hoa-gallery') || '').split('|').filter(Boolean);
    media._hoaSlides = urls.map(function (url) {
      var span = document.createElement('span');
      span.className = 'hoa-pc__img hoa-pc__img--slide';
      var img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      span.appendChild(img);
      media.appendChild(span);
      return span;
    });
    return media._hoaSlides;
  }

  function ready(slide, cb) {
    var img = slide && slide.firstChild;
    if (!img || (img.complete && img.naturalWidth)) { cb(); return; }
    if (img.decode) img.decode().then(cb, cb); else { img.onload = img.onerror = cb; }
  }

  // i = 0 is the studio shot (underneath every slide), i = k is slides[k - 1]
  function show(st, i) {
    var prev = st.idx;
    st.idx = i;
    clearTimeout(st.hideTimer);
    if (i === 0) {
      st.slides.forEach(function (s) { s.classList.remove('is-on'); });
      return;
    }
    var cur = st.slides[i - 1];
    cur.style.zIndex = ++st.z;              // newest on top: a clean crossfade over the last one
    cur.classList.add('is-on');
    var old = prev > 0 ? st.slides[prev - 1] : null;
    if (old && old !== cur) {
      st.hideTimer = setTimeout(function () { if (st.idx === i) old.classList.remove('is-on'); }, FADE + 40);
    }
  }

  function step(st) {
    if (active !== st) return;
    if (!st.card.isConnected || document.hidden) { stop(st); return; }
    var n = (st.idx + 1) % (st.slides.length + 1);
    ready(n ? st.slides[n - 1] : null, function () {
      if (active !== st) return;
      show(st, n);
      st.timer = setTimeout(function () { step(st); }, HOLD + FADE);
    });
  }

  function start(card) {
    if (active && active.card === card) return;
    if (active) stop(active);
    var media = card.querySelector('.hoa-pc__media[data-hoa-gallery]');
    if (!media) return;
    var slides = layers(media);
    if (!slides.length) return;
    active = { card: card, slides: slides, idx: 0, z: 1, timer: null, hideTimer: null };
    card.classList.add('is-cycling');
    var st = active;
    st.timer = setTimeout(function () { step(st); }, FIRST);
  }

  function stop(st) {
    clearTimeout(st.timer);
    clearTimeout(st.hideTimer);
    st.idx = 0;
    st.slides.forEach(function (s) { s.classList.remove('is-on'); });   // fades back to the studio shot
    st.card.classList.remove('is-cycling');
    if (active === st) active = null;
  }

  function cardOf(node) { return node && node.closest ? node.closest('.hoa-pc') : null; }

  document.addEventListener('pointerover', function (e) {
    if (!canHover.matches || (e.pointerType && e.pointerType !== 'mouse')) return;
    var card = cardOf(e.target);
    if (card) start(card);
  }, { passive: true });
  document.addEventListener('pointerout', function (e) {
    if (!active) return;
    if (!active.card.contains(e.relatedTarget)) stop(active);
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden && active) stop(active); });
  window.addEventListener('pagehide', function () { if (active) stop(active); });

  window.HOA_CARD_GALLERY = { stop: function () { if (active) stop(active); } };
})();
