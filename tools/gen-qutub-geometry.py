"""House of Agha · Hyderabadi geometric patterns (2026-10-06).

Writes six mask SVGs into assets/, drawn after the client's reference sheet (Deccani stucco and
jaali geometry). Black strokes on transparent, used as CSS masks so they take currentColor.

  hoa-qutub-star12.svg   twelve-petal rosette around a twelve-point star (a single mark)
  hoa-qutub-star.svg     sharp twelve-point star rosette, double outline (a single mark)
  hoa-qutub-star8.svg    eight-point interlace: two squares, an octagram heart (a single mark)
  hoa-qutub-cross.svg    cross lattice: double-lined pointed crosses, points meeting (seamless tile)
  hoa-qutub-knot.svg     square-knot lattice: stepped knots, small squares between (seamless tile)
  hoa-qutub-girih.svg    eight-point star girih: stars and crosses in strapwork (seamless tile)

Run: python tools/gen-qutub-geometry.py
"""
import math
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')


def pol(r, deg, c=16.0):
    a = math.radians(deg - 90)
    return (c + r * math.cos(a), c + r * math.sin(a))


def path(points, close=True):
    d = 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in points)
    return d + (' Z' if close else '')


def scale(points, k, c=(16.0, 16.0)):
    return [(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k) for x, y in points]


def centroid(points):
    return (sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points))


def svg(w, h, body, sw):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<g fill="none" stroke="#000" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round">'
            f'{body}</g></svg>')


def write(name, text):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('wrote', name, len(text), 'bytes')


# ---------- 1. twelve-petal rosette (reference, top left) ----------
def star12():
    d = []
    tips = [pol(6.4, 30 * k) for k in range(12)]
    star = []
    for k in range(12):
        star += [tips[k], pol(4.4, 30 * k + 15)]
    d.append(path(star))
    for k in range(12):
        a = 30 * k
        petal = [tips[k], pol(11.6, a + 3), pol(15.2, a + 15), pol(11.6, a + 27), tips[(k + 1) % 12], pol(4.4, a + 15)]
        d.append(path(petal))
        d.append(path(scale(petal, 0.62, centroid(petal))))
    return svg(32, 32, ''.join(f'<path d="{p}"/>' for p in d), 0.55)


# ---------- 2. sharp twelve-point star, double outline (reference, top right) ----------
def star_sharp():
    d = []
    for ro, ri in ((15.2, 10.4), (13.2, 9.0)):
        pts = []
        for k in range(12):
            pts += [pol(ro, 30 * k), pol(ri, 30 * k + 15)]
        d.append(path(pts))
    inner = []
    for k in range(12):
        inner += [pol(6.2, 30 * k), pol(4.2, 30 * k + 15)]
    d.append(path(inner))
    for k in range(12):
        d.append(path([pol(6.2, 30 * k), pol(9.0, 30 * k + 15)], close=False))
        d.append(path([pol(6.2, 30 * k), pol(9.0, 30 * k - 15)], close=False))
    return svg(32, 32, ''.join(f'<path d="{p}"/>' for p in d), 0.55)


# ---------- 3. eight-point interlace (reference, bottom right) ----------
def star8():
    d = []
    for rot in (0, 45):
        for r in (15.0, 12.6):
            d.append(path([pol(r, rot + 45 + 90 * k) for k in range(4)]))
    octa = []
    for k in range(8):
        octa += [pol(7.4, 45 * k), pol(4.6, 45 * k + 22.5)]
    d.append(path(octa))
    d.append(path([pol(2.6, 45 * k + 22.5) for k in range(8)]))
    return svg(32, 32, ''.join(f'<path d="{p}"/>' for p in d), 0.6)


# ---------- 4. cross lattice (reference, plain gold crosses) ----------
def cross():
    # 40×40 tile; crosses at the centre and the four corners (half-drop), arms with pointed ends
    def cross_at(cx, cy, a=5.0, l=15.0, tip=4.0):
        # clockwise outline: each arm runs out, round its point and back to the next inner corner
        pts = []
        for rot in range(4):
            for x, y in ((-a, -l), (0, -l - tip), (a, -l), (a, -a)):
                for _ in range(rot):
                    x, y = -y, x
                pts.append((cx + x, cy + y))
        return pts

    # one cross per 32px tile on a square grid; arm points meet the neighbours' at the tile edge,
    # so the gaps between four crosses close into small eight-sided stars
    d = [path(cross_at(16, 16, 5.0, 11.0, 5.0)), path(cross_at(16, 16, 2.4, 9.0, 3.6))]
    return svg(32, 32, ''.join(f'<path d="{p}"/>' for p in d), 0.9)


# ---------- 5. square-knot lattice (reference, rose ground) ----------
def knot():
    # 48×48 tile. A stepped knot (a plus with notched shoulders) round a small square at the
    # centre, drawn twice for the double line; small squares on the tile corners and edge midpoints.
    c = 24.0
    def plus(a, l):
        return [(c - a, c - l), (c + a, c - l), (c + a, c - a), (c + l, c - a), (c + l, c + a), (c + a, c + a),
                (c + a, c + l), (c - a, c + l), (c - a, c + a), (c - l, c + a), (c - l, c - a), (c - a, c - a)]
    d = [path(plus(7.5, 17.5)), path(plus(4.5, 14.5))]
    d.append(path([(c - 2.5, c - 2.5), (c + 2.5, c - 2.5), (c + 2.5, c + 2.5), (c - 2.5, c + 2.5)]))
    # diagonal shoulders closing the knot into an octagon-like outline
    for sx in (-1, 1):
        for sy in (-1, 1):
            d.append(path([(c + sx * 7.5, c + sy * 17.5), (c + sx * 17.5, c + sy * 7.5)], close=False))
    # small squares between knots: corners (quartered by the tile edge) and edge midpoints
    def sq(x, y, s=3.0):
        return path([(x - s, y - s), (x + s, y - s), (x + s, y + s), (x - s, y + s)])
    for x, y in ((0, 0), (48, 0), (0, 48), (48, 48)):
        d.append(sq(x, y, 3.5))
    for x, y in ((24, 0), (24, 48), (0, 24), (48, 24)):
        d.append(sq(x, y, 2.5))
    return svg(48, 48, ''.join(f'<path d="{p}"/>' for p in d), 1.0)


# ---------- 6. eight-point star girih (reference, embossed blue) ----------
def girih():
    # 48×48 tile. Eight-point stars at the centre and corners, joined by straight straps along
    # the axes; the gaps between read as crosses and hexagons, as in carved strapwork.
    def octagram(cx, cy, ro=11.0, ri=6.6):
        pts = []
        for k in range(8):
            for r, a in ((ro, 45 * k), (ri, 45 * k + 22.5)):
                ang = math.radians(a - 90)
                pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
        return pts
    d = []
    for cx, cy in ((24, 24), (0, 0), (48, 0), (0, 48), (48, 48)):
        d.append(path(octagram(cx, cy)))
        d.append(path(octagram(cx, cy, 8.4, 5.0)))
    # straps between diagonal neighbours run tip to tip
    for (x1, y1), (x2, y2) in (((0, 0), (24, 24)), ((48, 0), (24, 24)), ((0, 48), (24, 24)), ((48, 48), (24, 24))):
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy)
        ux, uy = dx / n, dy / n
        d.append(path([(x1 + ux * 11, y1 + uy * 11), (x2 - ux * 11, y2 - uy * 11)], close=False))
    # axis straps from the edge stars meet in a small diamond on each edge midpoint
    for x, y in ((24, 0), (24, 48), (0, 24), (48, 24)):
        d.append(path([(x, y - 4.2), (x + 4.2, y), (x, y + 4.2), (x - 4.2, y)]))
    return svg(48, 48, ''.join(f'<path d="{p}"/>' for p in d), 1.0)


if __name__ == '__main__':
    write('hoa-qutub-star12.svg', star12())
    write('hoa-qutub-star.svg', star_sharp())
    write('hoa-qutub-star8.svg', star8())
    write('hoa-qutub-cross.svg', cross())
    write('hoa-qutub-knot.svg', knot())
    write('hoa-qutub-girih.svg', girih())
