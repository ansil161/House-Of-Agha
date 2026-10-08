"""House of Agha · Qutub Shahi tomb jaali (2026-10-08).

Writes assets/hoa-qutub-jaali.svg, a seamless mask tile after the pierced stone screens of the
Qutub Shahi tombs (Hyderabad): six-point stars meeting tip to tip with hexagons between, drawn
as double-lined strapwork, a six-petal stucco flower in a ring at the heart of every hexagon.
Black strokes on transparent; used as a CSS mask so it takes currentColor.

Geometry: hexagon side s, line spacing h = sqrt(3) s. Hexagon centres sit on a triangular lattice
(spacing 2s); three families of lines (normals at 90, 30, 150 degrees) run halfway between them.
Tile = 2s x 2h. Lines are drawn long and clipped by the viewBox.

Run: python tools/gen-qutub-jaali.py
"""
import math
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')

S = 15.0                    # hexagon side
H = math.sqrt(3) * S        # spacing of the parallel lines
W, HT = 2 * S, 2 * H        # tile
GAP = 1.1                   # half-gap of the double strapwork
SW = 0.62                   # stroke width (viewBox units)


def f(v):
    return f'{v:.2f}'


def lines():
    out = []
    span = 4 * HT
    for ang in (90, 30, 150):
        nx, ny = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        tx, ty = -ny, nx
        for j in range(-6, 7):
            for off in (-GAP, GAP):
                d = (j + 0.5) * H + off
                cx, cy = nx * d, ny * d
                x1, y1 = cx - tx * span, cy - ty * span
                x2, y2 = cx + tx * span, cy + ty * span
                out.append(f'M{f(x1)} {f(y1)} L{f(x2)} {f(y2)}')
    return out


def rosettes():
    out = []
    for k in range(-2, 4):
        for m in range(-2, 4):
            cx = 2 * S * m + (S if k % 2 else 0)
            cy = k * H
            if -8 < cx < W + 8 and -8 < cy < HT + 8:
                r = 6.2
                out.append(f'M{f(cx + r)} {f(cy)} A{r} {r} 0 1 0 {f(cx - r)} {f(cy)} A{r} {r} 0 1 0 {f(cx + r)} {f(cy)} Z')
                # six lens petals (stucco flower), tips on a radius of 5.2, and a seed at the heart
                for i in range(6):
                    a = math.radians(60 * i - 90)
                    tx, ty = cx + 5.2 * math.cos(a), cy + 5.2 * math.sin(a)
                    out.append(f'M{f(cx)} {f(cy)} A3.4 3.4 0 0 1 {f(tx)} {f(ty)} A3.4 3.4 0 0 1 {f(cx)} {f(cy)} Z')
                out.append(f'M{f(cx + 1)} {f(cy)} A1 1 0 1 0 {f(cx - 1)} {f(cy)} A1 1 0 1 0 {f(cx + 1)} {f(cy)} Z')
    return out


def main():
    body = ''.join(f'<path d="{d}"/>' for d in lines() + rosettes())
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(W)}" height="{f(HT)}" viewBox="0 0 {f(W)} {f(HT)}">'
           f'<g fill="none" stroke="#000" stroke-width="{SW}" stroke-linejoin="round" stroke-linecap="round">'
           f'{body}</g></svg>')
    with open(os.path.join(OUT, 'hoa-qutub-jaali.svg'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(svg)
    print('wrote hoa-qutub-jaali.svg', len(svg), 'bytes', f'tile {W:.2f} x {HT:.2f}')


if __name__ == '__main__':
    main()
