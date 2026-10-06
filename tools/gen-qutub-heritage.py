"""Generates assets/hoa-qutub-heritage.svg: a seamless 240x52 tile. Four Hyderabad monuments in
line (Charminar, a Qutub Shahi tomb, Golconda Fort, Mecca Masjid) with a carved lotus between each,
standing on a slim plinth of the Qutub Shahi arcade (hoa-qutub.svg at half size, ten modules)."""
import sys

B = 39.5  # ground line
P = []    # main paths (stroke 1)
F = []    # fine detail (stroke .7)

def arch(cx, hw, spring, apex, base=B):
    """pointed Qutub Shahi arch, shouldered, from base up to apex"""
    l, r = cx - hw, cx + hw
    sh = hw * 0.55
    return (f"M{l:g} {base:g}V{spring:g}C{l:g} {spring-(spring-apex)*0.55:g} {cx-sh:g} {apex+(spring-apex)*0.25:g} {cx:g} {apex:g}"
            f"C{cx+sh:g} {apex+(spring-apex)*0.25:g} {r:g} {spring-(spring-apex)*0.55:g} {r:g} {spring:g}V{base:g}")

def dome(cx, hw, base, top, fin=0):
    """bulbous dome with a small point, optional finial"""
    d = (f"M{cx-hw:g} {base:g}C{cx-hw*1.25:g} {base-(base-top)*0.55:g} {cx-hw*0.45:g} {top+(base-top)*0.12:g} {cx:g} {top:g}"
         f"C{cx+hw*0.45:g} {top+(base-top)*0.12:g} {cx+hw*1.25:g} {base-(base-top)*0.55:g} {cx+hw:g} {base:g}")
    if fin:
        d += f"M{cx:g} {top:g}V{top-fin:g}"
    return d

def minaret(cx, top, galleries, w=1.5, dome_h=4.5):
    d = f"M{cx-w:g} {B:g}V{top:g}M{cx+w:g} {B:g}V{top:g}"
    for g in galleries:
        d += f"M{cx-w-1.3:g} {g:g}H{cx+w+1.3:g}"
    d += f"M{cx-w-1.3:g} {top:g}H{cx+w+1.3:g}"
    d += dome(cx, w + 0.4, top, top - dome_h, 1.6)
    return d

# 1 · Charminar (x 12-48): four tall minarets (two seen), the great central arch, two galleries
P.append(minaret(14, 10, [27, 19]))
P.append(minaret(46, 10, [27, 19]))
P.append("M15.5 20H44.5M15.5 23.5H44.5")
P.append(arch(30, 8, 29.5, 24.8))
F.append("".join(arch(cx, 1.7, 22.6, 20.9, 23.5) for cx in (20, 25, 35, 40)))  # upper gallery arcade

# 2 · Qutub Shahi tomb (x 64-96), as at the Qutub Shahi Tombs: a two-storey arcaded square, corner
#     finials, a ring of lotus petals on the drum and the high bulbous dome with its finial
P.append("M65 39.5V24H95V39.5M63.6 30H96.4M63.6 24H96.4")
P.append("".join(arch(cx, 2.6, 34.6, 31.4) for cx in (71, 80, 89)))
F.append("".join(arch(cx, 1.4, 27.6, 25.8, 30) for cx in (68.6, 74.3, 80, 85.7, 91.4)))
P.append("M65.4 24V19.8M94.6 24V19.8" + dome(65.4, 1, 19.8, 16.8) + dome(94.6, 1, 19.8, 16.8))
P.append("M72.4 24V20.8H87.6V24")
P.append(dome(80, 7.4, 20.8, 4.8, 2.6))
F.append("M72.8 20.8C73.9 19.2 75.3 19.2 76.4 20.8 77.5 19 78.9 19 80 20.8 81.1 19 82.5 19 83.6 20.8 84.7 19.2 86.1 19.2 87.2 20.8")

# 3 · Golconda Fort (x 108-154): battlemented wall, pointed gate, round bastion, the Baradari on the hill
merlons = "".join(f"H{x:g}V25H{x+2.4:g}V27" for x in range(110, 140, 5))
P.append(f"M108 39.5V27{merlons}H141V39.5")
P.append(arch(124.5, 4, 33.4, 29))
P.append("M141 39.5V23.5H154V39.5")
P.append("M141 23.5V21.6H143.4V23.5M146.3 23.5V21.6H148.7V23.5M151.6 23.5V21.6H154V23.5")
P.append("M114 27V16.5H135V27M113 16.5H136M116 16.5V14.6H133V16.5")
F.append("".join(arch(cx, 1.8, 22.8, 20.4, 27) for cx in (118.5, 124.5, 130.5)))

# 4 · Mecca Masjid (x 168-204): broad five-arched facade between two short minarets
P.append(minaret(170, 15, [26]))
P.append(minaret(202, 15, [26]))
P.append("M171.5 24H200.5M171.5 26.4H200.5")
P.append("".join(arch(cx, 2.2, 31.4, 28.4) for cx in (174.4, 180.2, 186, 191.8, 197.6)))

# lotus between the monuments, sitting on the ground line
LOTUS = ('<g id="l"><path d="M0 -10.6C1.9 -8.8 2.1 -6.4 0 -4.2-2.1 -6.4-1.9 -8.8 0 -10.6Z"/>'
         '<path d="M-.8 -4C-3.2 -4.2-4.4 -5.8-4.4 -7.6-2.6 -7.2-1.3 -5.8-.8 -4ZM.8 -4C3.2 -4.2 4.4 -5.8 4.4 -7.6 2.6 -7.2 1.3 -5.8.8 -4Z"/>'
         '<path d="M-3.4 -3.3C-1.9 -1.9 1.9 -1.9 3.4 -3.3"/></g>')
uses = "".join(f'<use href="#l" x="{x:g}" y="38"/>' for x in (57, 101, 161, 228))

# the arcade plinth: the hoa-qutub.svg module at half size, ten across, under the ground line
ARC = ('<g id="a"><path d="M7 23.5V13.5C7 8.6 13.4 6.6 18.8 5.4 21.4 4.8 23.3 3.9 24 2.6 24.7 3.9 26.6 4.8 29.2 5.4 34.6 6.6 41 8.6 41 13.5V23.5"/>'
       '<path d="M10.5 23.5V14C10.5 10.6 15.4 9 19.6 8.1 21.8 7.6 23.4 6.9 24 5.8 24.6 6.9 26.2 7.6 28.4 8.1 32.6 9 37.5 10.6 37.5 14V23.5" stroke-width="1.4"/>'
       '<use href="#al"/><use href="#al" x="48"/></g>'
       '<g id="al"><path d="M0 3.6C1.9 5.4 2.1 7.8 0 10-2.1 7.8-1.9 5.4 0 3.6Z"/>'
       '<path d="M-.8 10.2C-3.2 10-4.4 8.4-4.4 6.6-2.6 7-1.3 8.4-.8 10.2ZM.8 10.2C3.2 10 4.4 8.4 4.4 6.6 2.6 7 1.3 8.4.8 10.2Z"/>'
       '<path d="M-3.4 10.9C-1.9 12.3 1.9 12.3 3.4 10.9"/></g>')
plinth = ('<g transform="translate(0 39.5) scale(.5)" stroke-width="1.6">'
          + "".join(f'<use href="#a" x="{i*48}"/>' for i in range(10))
          + '<path d="M0 23H480" stroke-linecap="butt"/></g>')

svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="52" viewBox="0 0 240 52">'
       f'<defs>{LOTUS}{ARC}</defs>'
       '<g fill="none" stroke="#000" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">'
       '<path d="M0 39.5H240" stroke-linecap="butt"/>'
       + "".join(f'<path d="{d}"/>' for d in P)
       + f'<path d="{"".join(F)}" stroke-width=".7"/>'
       + uses + plinth + '</g></svg>' + chr(10))
open(sys.argv[1], "w", encoding="utf-8").write(svg)
print(len(svg), "bytes")
