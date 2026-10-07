/* ==========================================================================
   HOUSE OF AGHA — SCROLL FILM (sections/hoa-sequence.liquid)
   Scroll position → frame index, drawn into a canvas.

   · progress = how far the sticky track has been scrolled (0 at its top, 1 when its end leaves)
   · the shown frame eases toward progress × (count − 1) on requestAnimationFrame, so fast
     flicks stay smooth and slow scrolls stay exact; the loop sleeps once it has caught up
   · frames load coarse-to-fine (every 16th, 8th, 4th, 2nd, then the rest) once the section
     is within ~1.5 screens, so any scroll position has a near frame early; the nearest loaded
     frame is drawn until the exact one arrives
   · desktop/landscape: cover-fit. Portrait phones: the 16:9 film is fitted to the width
     (slightly zoomed) over a soft, blurred fill of the same frame, edges feathered
   · works with Lenis (it scrolls the window) and without GSAP; no-JS shows frame 1
   ========================================================================== */
(function () {
  'use strict';

  var STRIDES = [16, 8, 4, 2, 1];
  var PARALLEL = 6;

  function Film(el) {
    this.el = el;
    this.canvas = el.querySelector('[data-hoa-seq-canvas]');
    this.poster = el.querySelector('[data-hoa-seq-poster]');
    this.ctx = this.canvas.getContext('2d');
    this.count = parseInt(el.dataset.count, 10) || 1;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mqMobile = window.matchMedia('(max-width: 767px)');
    this.target = 0;
    this.pos = 0;
    this.drawn = -1;
    this.raf = 0;
    this.near = false;
    this.soft = document.createElement('canvas'); // blurred fill (portrait)
    this.soft.width = 16; this.soft.height = 9;
    this.feather = document.createElement('canvas'); // feathered frame (portrait)

    var self = this;
    this.onScroll = function () { self.measure(); self.kick(); };
    this.onResize = function () { self.resize(); self.onScroll(); };
    this.onMq = function () { self.setVariant(); };

    this.setVariant();
    this.resize();
    this.measure();
    this.pos = this.target;

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    if (this.mqMobile.addEventListener) this.mqMobile.addEventListener('change', this.onMq);

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(function (es) {
        self.near = es[0].isIntersecting;
        if (self.near) { self.startLoading(); self.onScroll(); }
      }, { rootMargin: '150% 0px 150% 0px' });
      this.io.observe(el);
    } else {
      this.near = true;
      this.startLoading();
    }
  }

  Film.prototype.setVariant = function () {
    var mobile = this.mqMobile.matches;
    if (this.mobile === mobile && this.frames) return;
    this.mobile = mobile;
    var src = mobile ? this.el.dataset.srcMobile : this.el.dataset.src;
    // hoa-seq-001.webp?v=… → hoa-seq-NNN.webp?v=… (the CDN query string is kept)
    this.urlFor = function (i) {
      return src.replace(/(hoa-seq-(?:m-)?)001(\.webp)/, function (_, a, b) { return a + ('00' + (i + 1)).slice(-3) + b; });
    };
    this.frames = new Array(this.count);
    this.queue = null;
    this.loading = 0;
    this.drawn = -1;
    if (this.near) this.startLoading();
  };

  Film.prototype.startLoading = function () {
    if (this.queue) return;
    var seen = {}, q = [];
    STRIDES.forEach(function (st) {
      for (var i = 0; i < this.count; i += st) if (!seen[i]) { seen[i] = 1; q.push(i); }
    }, this);
    if (!seen[this.count - 1]) q.splice(1, 0, this.count - 1);
    else { q.splice(q.indexOf(this.count - 1), 1); q.splice(1, 0, this.count - 1); }
    this.queue = q;
    this.pump();
  };

  Film.prototype.pump = function () {
    var self = this, frames = this.frames;
    while (this.loading < PARALLEL && this.queue.length) {
      (function (i) {
        self.loading++;
        var img = new Image();
        img.decoding = 'async';
        var done = function (ok) {
          if (frames !== self.frames) return; // variant switched meanwhile
          self.loading--;
          if (ok) {
            frames[i] = img;
            if (Math.abs(i - Math.round(self.pos)) < Math.abs(self.drawn - Math.round(self.pos)) || self.drawn < 0) {
              self.drawn = -1; self.kick();
            }
          }
          self.pump();
        };
        img.onload = function () {
          if (img.decode) img.decode().then(function () { done(true); }, function () { done(true); });
          else done(true);
        };
        img.onerror = function () { done(false); };
        img.src = self.urlFor(i);
      })(this.queue.shift());
    }
  };

  Film.prototype.measure = function () {
    var r = this.el.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    var p = span > 0 ? -r.top / span : 0;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    this.target = p * (this.count - 1);
  };

  Film.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.feather.width = this.canvas.width;
    this.drawn = -1;
  };

  Film.prototype.kick = function () {
    if (this.raf || !this.near) return;
    var self = this;
    this.raf = requestAnimationFrame(function () { self.raf = 0; self.tick(); });
  };

  Film.prototype.tick = function () {
    var d = this.target - this.pos;
    // Ease toward the scroll position; snap when close (or when motion is reduced).
    if (this.reduce || Math.abs(d) < 0.05) this.pos = this.target;
    else this.pos += d * 0.22;
    this.render(Math.round(this.pos));
    if (this.pos !== this.target) this.kick();
  };

  Film.prototype.nearest = function (i) {
    var f = this.frames;
    if (f[i]) return i;
    for (var k = 1; k < this.count; k++) {
      if (i - k >= 0 && f[i - k]) return i - k;
      if (i + k < this.count && f[i + k]) return i + k;
    }
    return -1;
  };

  Film.prototype.render = function (want) {
    var i = this.nearest(want);
    if (i < 0 || i === this.drawn) return;
    this.drawn = i;
    var img = this.frames[i], c = this.canvas, ctx = this.ctx;
    var cw = c.width, ch = c.height, iw = img.naturalWidth, ih = img.naturalHeight;
    var ia = iw / ih, ca = cw / ch;

    if (ca >= ia * 0.8) {
      // Cover (desktop, tablets, landscape phones).
      var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    } else {
      // Portrait: soft fill of the same frame, then the frame fitted to the width with feathered edges.
      var sx = this.soft.getContext('2d');
      sx.drawImage(img, 0, 0, 16, 9);
      var bs = Math.max(cw / 16, ch / 9);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.soft, (cw - 16 * bs) / 2, (ch - 9 * bs) / 2, 16 * bs, 9 * bs);

      var fw = cw * 1.1, fh = fw / ia;
      var f = this.feather, fx = f.getContext('2d');
      if (f.height !== Math.round(fh)) f.height = Math.round(fh);
      fx.globalCompositeOperation = 'source-over';
      fx.clearRect(0, 0, f.width, f.height);
      fx.drawImage(img, (f.width - fw) / 2, 0, fw, f.height);
      fx.globalCompositeOperation = 'destination-in';
      var g = fx.createLinearGradient(0, 0, 0, f.height);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.14, 'rgba(0,0,0,1)');
      g.addColorStop(0.86, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      fx.fillStyle = g;
      fx.fillRect(0, 0, f.width, f.height);
      ctx.drawImage(f, 0, (ch - f.height) / 2);
    }
    if (!this.el.classList.contains('is-ready')) this.el.classList.add('is-ready');
  };

  Film.prototype.destroy = function () {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    if (this.mqMobile.removeEventListener) this.mqMobile.removeEventListener('change', this.onMq);
    if (this.io) this.io.disconnect();
    cancelAnimationFrame(this.raf);
    this.queue = [];
  };

  var films = [];
  function init() {
    films.forEach(function (f) { f.destroy(); });
    films = Array.prototype.map.call(document.querySelectorAll('[data-hoa-seq]'), function (el) {
      var c = el.querySelector('[data-hoa-seq-canvas]');
      return c && c.getContext ? new Film(el) : null;
    }).filter(Boolean);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', init);
})();
