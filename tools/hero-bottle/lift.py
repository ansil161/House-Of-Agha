"""Lift the Oud Fury bottle out of the hero photography (not part of the theme upload).

Produces, for the desktop (16:9) and mobile (portrait) hero art:
  assets/<name>-bottle.webp   the photo's own bottle pixels, alpha-cut (the one scroll-journey element)
  assets/<name>-plate.webp    the same photo with the bottle painted out (hero backdrop; + -plate-sm)
  assets/<name>-chip.webp     the wood chip in front of the glass, same box as -bottle
and prints the bottle's box as % of the photo for sections/hoa-hero.liquid.
Where a wood chip sits in front of the glass, the hidden corner is rebuilt by mirroring
the bottle's other half (it is symmetric) and the chip stays in the backdrop.
Run: python tools/hero-bottle/lift.py
"""
import cv2, numpy as np, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets')

def rrect(x0, y0, x1, y1, r):
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for a in range(a0, a0 + 91, 10):
            t = np.radians(a); pts.append((cx + r * np.cos(t), cy + r * np.sin(t)))
    return pts

def poly_mask(shape, polys, ss=4):
    h, w = shape
    m = np.zeros((h * ss, w * ss), np.uint8)
    for p in polys:
        cv2.fillPoly(m, [np.round(np.array(p) * ss).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA)

def run(name, s, cap, collar, body, chip, out_w):
    """All geometry in the reference frame of the desktop photo, scaled by s (per image)."""
    src = cv2.imread(os.path.join(ROOT, name + '.webp'), cv2.IMREAD_COLOR)
    h, w = src.shape[:2]
    S = lambda p: [(x * s[0] + s[2], y * s[1] + s[3]) for x, y in p]
    bottle = poly_mask((h, w), [S(cap), S(collar), S(body)])
    chipm = poly_mask((h, w), [S(chip)])

    # Glass hidden behind the chip: rebuild from the mirrored bottle.
    xs = [p[0] for p in S(body)]; axis = (min(xs) + max(xs)) / 2
    M = np.float32([[-1, 0, 2 * axis], [0, 1, 0]])
    mir = cv2.warpAffine(src, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    # (the chip trace hugs its lit face; its shadowed edge sits a little further right)
    shift = int(round(w * 0.02))
    chip_wide = cv2.max(chipm, np.roll(chipm, shift, axis=1))
    hidden = cv2.GaussianBlur(cv2.min(bottle, cv2.dilate(chip_wide, np.ones((15, 15), np.uint8))), (0, 0), 2.5)
    k = (hidden.astype(np.float32) / 255)[..., None]
    lifted = (src * (1 - k) + mir * k).astype(np.uint8)

    # Backdrop: paint the bottle out row by row (blend the scene either side of the
    # glass across the gap), smooth it vertically, then put the chip back on top.
    hole = cv2.dilate((bottle > 8).astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    rows = np.nonzero(hole.any(axis=1))[0]
    f = src.astype(np.float32)
    plate_up = f.copy()
    # sample a little way out from the glass so its rim-light spill isn't dragged in
    band, off = 8, 10
    for y in rows:
        xs_h = np.nonzero(hole[y])[0]
        a, b = max(xs_h.min() - 2, band + off), min(xs_h.max() + 2, w - band - off - 1)
        ca = f[y, a - off - band:a - off].mean(axis=0); cb = f[y, b + 1 + off:b + 1 + off + band].mean(axis=0)
        t = np.linspace(0, 1, b - a + 1)[:, None]
        plate_up[y, a:b + 1] = ca * (1 - t) + cb * t
    plate_up = cv2.GaussianBlur(plate_up, (0, 0), sigmaX=6, sigmaY=18 * w / 2000 * 1.6)
    fill = cv2.GaussianBlur(cv2.dilate(hole, np.ones((9, 9), np.uint8)), (0, 0), 6).astype(np.float32)[..., None] / 255
    plate = f * (1 - fill) + plate_up * fill
    rng = np.random.default_rng(7)
    plate = plate + rng.normal(0, 2.2, plate.shape[:2])[..., None] * fill
    ck = (cv2.GaussianBlur(chipm, (0, 0), 1.2).astype(np.float32) / 255)[..., None]
    plate = np.clip(plate * (1 - ck) + src * ck, 0, 255).astype(np.uint8)

    # Crop the bottle (with a little air) and write both files.
    ys, xs_ = np.nonzero(bottle > 8)
    pad = int(round(6 * s[0]))
    x0, y0, x1, y1 = max(xs_.min() - pad, 0), max(ys.min() - pad, 0), min(xs_.max() + pad + 1, w), min(ys.max() + pad + 1, h)
    rgba = np.dstack([lifted, bottle])[y0:y1, x0:x1]
    im = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
    bw = out_w; bh = round(im.height * bw / im.width)
    im.resize((bw, bh), Image.LANCZOS).save(os.path.join(ROOT, name + '-bottle.webp'), quality=90, method=6)
    # The chip that stands in front of the glass, cut to the bottle's box: it is laid
    # over the resting bottle so the first screen matches the photo exactly.
    chip_a = cv2.GaussianBlur(chipm, (0, 0), 1.2)
    crgba = np.dstack([src, chip_a])[y0:y1, x0:x1]
    Image.fromarray(cv2.cvtColor(crgba, cv2.COLOR_BGRA2RGBA)).resize((bw, bh), Image.LANCZOS).save(
        os.path.join(ROOT, name + '-chip.webp'), quality=88, method=6)
    Image.fromarray(cv2.cvtColor(plate, cv2.COLOR_BGR2RGB)).save(os.path.join(ROOT, name + '-plate.webp'), quality=84, method=6)
    sm = Image.fromarray(cv2.cvtColor(plate, cv2.COLOR_BGR2RGB))
    smw = 1000 if w > h else 700
    sm.resize((smw, round(h * smw / w)), Image.LANCZOS).save(os.path.join(ROOT, name + '-plate-sm.webp'), quality=82, method=6)
    print('%s  bottle box: left %.3f%%  top %.3f%%  width %.3f%%  height %.3f%%  (%dx%d px out)' % (
        name, x0 / w * 100, y0 / h * 100, (x1 - x0) / w * 100, (y1 - y0) / h * 100, bw, bh))

# Desktop art (2000x1125) — traced by hand.
CAP = rrect(943, 222, 1092, 382, 14)
COLLAR = [(978, 370), (1060, 370), (1062, 396), (976, 396)]
BODY = rrect(902, 388, 1137, 868, 22)
CHIP = [(760, 600), (846, 662), (874, 700), (893, 740), (925, 800), (968, 860), (1020, 905), (1020, 1125), (760, 1125)]
run('hoa-hero-oud-fury', (1, 1, 0, 0), CAP, COLLAR, BODY, CHIP, 480)

# Mobile art (1200x1607) — traced by hand.
CAP_M = rrect(493, 166, 773, 474, 24)
COLLAR_M = [(560, 452), (706, 452), (708, 492), (558, 492)]
BODY_M = rrect(417, 486, 857, 1364, 38)
CHIP_M = [(0, 980), (260, 985), (330, 1055), (402, 1128), (452, 1193), (502, 1260), (556, 1328), (616, 1398), (662, 1458), (662, 1607), (0, 1607)]
run('hoa-oud-fury-portrait', (1, 1, 0, 0), CAP_M, COLLAR_M, BODY_M, CHIP_M, 480)
