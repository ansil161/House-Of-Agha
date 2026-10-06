"""
Golconda Fort line art for the About page divider (snippets/hoa-ab-golconda.liquid).
Drawn from the client's reference photo of the Baradari on the summit of Golconda Fort
(Unsplash, Aamir, tM4HEI-nY2Y): the pavilion with its arcade, parapet and corner
minarets, the battlement wall running down to the right, the granite boulders and the
crenellated fort walls below.

Run:  python -X utf8 tools/golconda-svg.py > snippets/hoa-ab-golconda.liquid
Each path gets --i (its build order) so the drawing assembles ground → walls → rocks →
pavilion → arches → parapet → minarets when it scrolls in (CSS in assets/hoa-about.css).
"""
import math

W, H, G = 800, 237, 236          # viewBox width, height, ground line
paths = []                        # (order, d, extra_class)


def add(order, d, cls=''):
    paths.append((order, ' '.join(d.split()), cls))


def f(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


def crenel(x0, x1, y, step=12, mh=6, mw=6):
    """Top edge of a wall with merlons, left to right."""
    d = 'M%s %s' % (f(x0), f(y))
    x = x0
    while x + step <= x1 + 0.1:
        d += ' H%s V%s H%s V%s' % (f(x + (step - mw) / 2), f(y - mh), f(x + (step + mw) / 2), f(y))
        x += step
    d += ' H%s' % f(x1)
    return d


def boulder(cx, cy, rx, ry, tilt=0.0, flat=0.0):
    """A rounded granite boulder: a closed blob, slightly flattened at the base."""
    pts = []
    for k in range(8):
        a = k * math.pi / 4
        r = 1.0 + (0.08 if k % 2 else -0.04)
        x, y = rx * r * math.cos(a), ry * r * math.sin(a)
        if y > 0:
            y *= (1 - flat)
        ca, sa = math.cos(tilt), math.sin(tilt)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    # smooth closed curve through the points (Catmull-Rom → cubic Bézier)
    d = 'M%s %s' % (f(pts[0][0]), f(pts[0][1]))
    n = len(pts)
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += ' C%s %s %s %s %s %s' % (f(c1[0]), f(c1[1]), f(c2[0]), f(c2[1]), f(p2[0]), f(p2[1]))
    return d + ' Z'


def arch(x, w, base, spring, apex):
    """A Qutub Shahi pointed arch opening, base → spring → apex → spring → base."""
    r = x + w
    m = x + w / 2
    return ('M%s %s V%s C%s %s %s %s %s %s C%s %s %s %s %s %s V%s'
            % (f(x), f(base), f(spring),
               f(x), f(spring - (spring - apex) * 0.62), f(m - w * 0.2), f(apex + 2), f(m), f(apex),
               f(m + w * 0.2), f(apex + 2), f(r), f(spring - (spring - apex) * 0.62), f(r), f(spring),
               f(base)))


def minaret(x, top, base):
    """Corner minaret: slim shaft, a band, an onion dome and a finial with a small orb."""
    w = 4.5
    d = 'M%s %s V%s H%s V%s' % (f(x - w), f(base), f(top), f(x + w), f(base))
    d += ' M%s %s H%s' % (f(x - w - 1.5), f(top + 7), f(x + w + 1.5))           # band
    d += ' M%s %s H%s' % (f(x - w - 1.5), f(top), f(x + w + 1.5))                # collar
    d += (' M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s'                       # dome
          % (f(x - w - 1), f(top), f(x - w - 2), f(top - 7), f(x - 2), f(top - 9), f(x), f(top - 12),
             f(x + 2), f(top - 9), f(x + w + 2), f(top - 7), f(x + w + 1), f(top)))
    d += ' M%s %s V%s' % (f(x), f(top - 12), f(top - 18))                       # finial
    d += ' M%s %s a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0' % (f(x - 1.6), f(top - 15))
    return d


# 0 ── ground
add(0, 'M0 %d H%d' % (G, W))

# 1 ── lower fort walls (crenellated), left and right, with a square bastion on the right
add(1, 'M40 %d V200 ' % G + crenel(40, 276, 200)[len('M40 200'):] + ' V%d' % G)
add(1, 'M528 %d V204 ' % G + crenel(528, 760, 204)[len('M528 204'):] + ' V%d' % G)
add(2, 'M592 204 V178 ' + crenel(592, 640, 178, step=12)[len('M592 178'):] + ' V204')
add(2, 'M40 218 H276 M528 220 H760 M592 192 H640')                    # stone courses
# a ruined bastion on the left, jagged at the top
add(2, 'M70 200 V156 L80 152 L88 157 L97 150 L106 155 L116 149 L126 154 L134 150 L142 156 L150 152 V200')
add(3, 'M70 172 H150 M70 186 H150')

# 3–4 ── the granite boulders heaped under the pavilion (largest first)
rocks = [
    # summit, directly under the pavilion: big, tilted slabs
    (322, 168, 27, 15, -0.32, 0.10), (372, 165, 21, 13, 0.42, 0.08), (418, 169, 30, 16, -0.08, 0.10),
    (472, 166, 19, 13, 0.50, 0.08), (512, 172, 21, 14, -0.40, 0.10),
    # the middle of the heap: mixed sizes, uneven heights
    (284, 197, 17, 12, 0.55, 0.10), (329, 193, 23, 14, 0.10, 0.10), (380, 199, 31, 17, -0.18, 0.10),
    (435, 192, 18, 13, 0.35, 0.10), (474, 199, 27, 15, -0.12, 0.10), (520, 196, 15, 11, 0.60, 0.10),
    # resting on the ground between the walls, with a few spilled stones
    (300, 224, 19, 11, 0.08, 0.15), (344, 222, 25, 13, -0.12, 0.15), (398, 226, 20, 10, 0.05, 0.15),
    (444, 222, 27, 13, 0.14, 0.15), (497, 225, 23, 11, -0.06, 0.15),
    (258, 192, 9, 6, 0.30, 0.10), (546, 198, 8, 6, -0.30, 0.10), (228, 194, 7, 5, 0.00, 0.10),
]
for i, r in enumerate(rocks):
    add(3 if i < 5 else 4, boulder(*r))
add(4, 'M318 156 C330 150 346 151 356 155 M380 151 C394 147 410 148 420 152')   # grass on the crest

# 5 ── the Baradari: front face, side return, cornice slab
PX0, PX1, PTOP, PBASE = 300, 520, 84, 152
add(5, 'M%d %d V%d H%d V%d' % (PX0, PBASE, PTOP, PX1, PBASE))
add(5, 'M%d %d L%d %d V%d' % (PX1, PTOP, PX1 + 22, PTOP + 6, PBASE + 4))           # side return (perspective)
add(5, 'M%d %d H%d L%d %d H%d Z' % (PX0 - 8, PTOP, PX1 + 8, PX1 + 2, PTOP - 4, PX0 + 2))  # cornice
add(6, 'M%d 104 H%d M%d 126 H%d' % (PX0, PX1, PX0, PX1))                          # stone courses

# 6–7 ── the arcade (three open pointed arches) with its balustrade, and the right bay
for x in (316, 352, 388):
    add(7, arch(x, 28, 146, 116, 100))
add(7, 'M316 134 H416')
for x in (322, 334, 346, 358, 370, 382, 394, 406):
    add(8, 'M%d 134 V146' % x)
for x in (444, 482):
    add(7, arch(x, 20, 146, 120, 108))
for x in (430, 462, 500):
    add(8, 'M%d 90 h8 v8 h-8 Z' % x)

# 8 ── the white parapet with its small square openings
add(8, 'M%d %d V62 H%d V%d' % (PX0 + 2, PTOP - 4, PX1 - 2, PTOP - 4))
for x in range(PX0 + 16, PX1 - 10, 26):
    add(9, 'M%d 69 h4 v4 h-4 Z' % x)

# 9 ── battlement wall stepping down to the right of the pavilion
add(9, 'M%d 120 L620 162 M%d 136 L620 176 M620 162 V176' % (PX1 + 22, PX1 + 22))
for k in range(9):
    t = k / 8
    x = PX1 + 26 + (620 - PX1 - 30) * t
    y = 120 + (162 - 120) * ((x - PX1 - 22) / (620 - PX1 - 22))
    add(10, 'M%s %s v-7 h5 v%s' % (f(x), f(y), f(7 + 5 * (162 - 120) / (620 - PX1 - 22))))

# 10–11 ── corner minarets
add(11, minaret(PX0 + 4, 50, 62))
add(11, minaret(PX1 - 4, 50, 62))
add(11, minaret(PX1 - 52, 40, 62))       # the taller one at the back corner

paths.sort(key=lambda p: p[0])
print("""{%- comment -%}
  About · Golconda Fort line art (divider above "Composed in Hyderabad").
  The Baradari on the summit of Golconda Fort drawn in gold line from the client's photo,
  on a hairline that runs out to both sides. Draws itself once as it scrolls in
  ([data-hoa-ab-golconda], assets/hoa-about.js + hoa-about.css); complete without JS.
  GENERATED by tools/golconda-svg.py — edit that and re-run, don't hand-edit the paths.
{%- endcomment -%}
<div class="hoa-wrap">
  <div class="hoa-ab-golconda" data-hoa-ab-golconda aria-hidden="true">
    <svg class="hoa-ab-golconda__art" viewBox="0 0 VBW VBH" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" focusable="false">""".replace("VBW", str(W)).replace("VBH", str(H)))
for i, (o, d, cls) in enumerate(paths):
    print('      <path pathLength="1" style="--i:%d" d="%s"/>' % (o, d))
print("""    </svg>
  </div>
</div>""")
