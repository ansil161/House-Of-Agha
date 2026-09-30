// Generates the Charminar line drawing for sections/hoa-about-hyderabad.liquid.
// Usage: node tools/charminar-svg.js  → prints the <path> elements (viewBox 0 0 400 640).
// Each path carries data-o = build level (0 = ground … 14 = finials): assets/hoa-about.js draws
// the strokes (.hoa-ab-hyd__ln) level by level from the ground up and fades the solid openings
// (.hoa-ab-hyd__fill) in right after their level. Symmetric: every part is mirrored about x = 200.
const out = [];
const f = (n) => +n.toFixed(2);

// Parts are drafted on a compact 540-high grid, then stretched to the reference's slender
// proportions: a taller ground floor and a much longer upper minaret shaft. Only absolute
// y values move; relative commands (little circles, brackets, petals) keep their shape.
const lerp = (y, a, b, c, d) => c + (y - a) * (d - c) / (b - a);
const MAPS = {
  main: (y) => y >= 365 ? lerp(y, 365, 525, 425, 625)      // ground floor ×1.25
    : y >= 218 ? y + 60                                        // body storeys + parapet: shifted
    : y >= 196 ? lerp(y, 196, 218, 196, 278)                   // upper minaret shaft: stretched
    : y,                                                       // balconies, domes, finials
  rear: (y) => y + 60                                          // rear minarets: rise just above the parapet
};
let MODE = 'main';
function mapD(d) {
  const map = MAPS[MODE];
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let cmd = '', i = 0, res = [];
  while (i < toks.length) {
    const t = toks[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; res.push(t); i++; continue; }
    if (cmd === 'V') { res.push(f(map(+t))); i++; continue; }
    if ('MLCQST'.includes(cmd)) { res.push(t, f(map(+toks[i + 1]))); i += 2; continue; }
    res.push(t); i++;                                          // H and every relative command
  }
  return res.join(' ').replace(/ ([a-zA-Z]) /g, ' $1').replace(/^([a-zA-Z]) /, '$1');
}
const ln = (o, d) => out.push(`<path class="hoa-ab-hyd__ln" pathLength="1" data-o="${o}" d="${mapD(d)}"/>`);
const fill = (o, d) => out.push(`<path class="hoa-ab-hyd__fill" data-o="${o}" d="${mapD(d)}"/>`);
const both = (fn) => { fn(55); fn(345); };          // main minaret centres
const bothRear = (fn) => { fn(96); fn(304); };     // rear minaret centres

// A cylinder band: top and bottom edges sag a little so the round towers read as round.
const band = (cx, h, y1, y2, sag = 1.6) =>
  `M${f(cx - h)} ${y1} Q${cx} ${f(y1 + sag)} ${f(cx + h)} ${y1} V${y2} Q${cx} ${f(y2 + sag)} ${f(cx - h)} ${y2} Z`;
// A pointed (Qutb Shahi) arch from x1 to x2, springing at ys, apex at ya, open down to yb.
const arch = (x1, x2, ys, ya, yb, close) => {
  const w = x2 - x1, h = ys - ya, m = (x1 + x2) / 2;
  return `M${f(x1)} ${yb} V${ys} C${f(x1)} ${f(ys - h * 0.62)} ${f(m - w * 0.14)} ${f(ya + h * 0.18)} ${f(m)} ${ya} ` +
    `C${f(m + w * 0.14)} ${f(ya + h * 0.18)} ${f(x2)} ${f(ys - h * 0.62)} ${f(x2)} ${ys} V${yb}${close ? ' Z' : ''}`;
};
// A row of n arched openings across [x1, x2] (filled dark, like the reference's voids).
const arcade = (o, x1, x2, n, ys, ya, yb, gapRatio = 0.3) => {
  const bay = (x2 - x1) / n, gap = bay * gapRatio;
  let d = '';
  for (let i = 0; i < n; i++) { const a = x1 + i * bay + gap / 2; d += arch(a, a + bay - gap, ys, ya, yb, true) + ' '; }
  fill(o, d.trim());
  ln(o, d.trim());
};
const circle = (cx, cy, r) => `M${f(cx - r)} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

/* ---------------- rear minarets (behind; visible above the parapet) ---------------- */
MODE = 'rear';
bothRear((cx) => {
  ln(10, `M${cx - 11} 228 V200 M${cx + 11} 228 V200`);
  ln(10, band(cx, 17, 194, 200));
  arcade(10, cx - 15, cx + 15, 3, 188, 183, 193);
  ln(10, band(cx, 18, 176, 182));
  ln(12, `M${cx - 10} 176 V162 M${cx + 10} 176 V162`);
  arcade(12, cx - 9, cx + 9, 3, 169, 165, 174, 0.4);
  ln(12, band(cx, 12, 158, 162, 1));
  ln(13, `M${cx - 11} 158 C${cx - 16} 149 ${cx - 7} 140 ${cx} 134 C${cx + 7} 140 ${cx + 16} 149 ${cx + 11} 158`);
  ln(13, `M${cx} 134 Q${cx - 5} 146 ${cx - 5} 158 M${cx} 134 Q${cx + 5} 146 ${cx + 5} 158`);
  ln(14, `M${cx} 134 V122 ${circle(cx, 126, 1.8)}`);
});

MODE = 'main';
/* ---------------- central body ---------------- */
// ground floor frame and plinth
ln(0, 'M4 525 H396');
ln(0, 'M85 525 V518 H315 V525');
ln(2, 'M85 518 V365 M315 518 V365');                 // outer faces of the body between the towers
ln(2, 'M122 518 V365 M278 518 V365');                // piers either side of the great arch
ln(2, 'M128 518 V372 H272 V518');                    // frame around the arch
// stacked niches in the side panels (four each side)
for (const [a, b] of [[91, 116], [284, 309]]) {
  for (let i = 0; i < 4; i++) {
    const top = 378 + i * 35;
    fill(3, arch(a + 5, b - 5, top + 14, top + 5, top + 28, true));
    ln(3, `M${a} ${top} H${b} V${top + 32} H${a} Z ` + arch(a + 5, b - 5, top + 14, top + 5, top + 28, true));
  }
}
// the great arch: outer ring, then the dark opening
ln(3, arch(138, 262, 440, 380, 518));
ln(4, arch(146, 254, 442, 392, 518));
fill(4, arch(146, 254, 442, 392, 518, true) );
// spandrel medallions + the small finial over the apex
fill(5, circle(152, 388, 7) + ' ' + circle(248, 388, 7));
ln(5, circle(152, 388, 10) + ' ' + circle(248, 388, 10));
ln(5, `M200 380 V372 ${circle(200, 376, 2.2)}`);
// cornice with brackets
ln(5, 'M85 365 H315 M85 358 H315');
let brackets = '';
for (let x = 92; x <= 308; x += 12) brackets += `M${x} 365 q3 6 6 0 `;
ln(5, brackets.trim());
// first floor: an arcade of seven bays; the centre bay holds a round medallion
ln(6, 'M97 358 V300 M303 358 V300');
ln(6, 'M97 352 H303');
{
  const x1 = 97, n = 7, bay = (303 - 97) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = x1 + i * bay + 4, b = x1 + (i + 1) * bay - 4;
    if (i === 3) continue;
    d += arch(a, b, 330, 312, 352, true) + ' ';
  }
  fill(6, d.trim());
  ln(6, d.trim());
  const c = 200;
  fill(7, circle(c, 330, 6));
  ln(7, circle(c, 330, 11) + ' ' + arch(c - 13, c + 13, 326, 310, 352));
}
ln(7, 'M97 306 H303 M97 300 H303');
// upper floor: a screen of twelve small arches
ln(7, 'M86 300 V262 M314 300 V262');
arcade(8, 90, 310, 12, 284, 274, 296, 0.34);
ln(8, 'M86 268 H314 M86 262 H314');
// parapet: panels with a small lattice mark, crenellated top edge
ln(9, 'M86 262 V232 M314 262 V232');
{
  let d = '', crest = 'M86 232';
  const n = 12, w = (314 - 86) / n;
  for (let i = 0; i < n; i++) {
    const a = 86 + i * w, m = a + w / 2;
    d += `M${f(a + 3)} 257 H${f(a + w - 3)} V238 H${f(a + 3)} Z M${f(m)} 242 l4 5.5 l-4 5.5 l-4 -5.5 Z `;
    crest += ` H${f(a + 4)} V226 Q${f(m)} 220 ${f(a + w - 4)} 226 V232`;
  }
  ln(9, d.trim());
  ln(9, crest + ' H314');
}

/* ---------------- main minarets (in front) ---------------- */
both((cx) => {
  // plinth and fluted lower shaft
  ln(0, band(cx, 34, 512, 525, 0));
  ln(1, `M${cx - 30} 512 V380 M${cx + 30} 512 V380`);
  let flutes = '';
  for (let k = -3; k <= 3; k++) flutes += `M${f(cx + k * 7.5)} 510 V382 `;
  ln(1, flutes.trim());
  // capital rings under the big balcony
  ln(5, band(cx, 34, 372, 380));
  ln(5, band(cx, 38, 364, 372));
  let sc = '';
  for (let k = -3; k <= 2; k++) sc += `M${f(cx + k * 11 + 1)} 380 q4.5 6 9 0 `;
  ln(5, sc.trim());
  // big balcony: two rows of arched openings between banded rings
  ln(6, `M${cx - 38} 364 V300 M${cx + 38} 364 V300`);
  arcade(6, cx - 35, cx + 35, 5, 346, 338, 360);
  ln(6, band(cx, 40, 328, 334));
  arcade(7, cx - 35, cx + 35, 5, 314, 306, 326);
  ln(7, band(cx, 41, 294, 300));
  // middle shaft with a dark ring at its top
  ln(8, `M${cx - 19} 294 V256 M${cx + 19} 294 V256`);
  ln(8, `M${cx - 7} 290 V266 M${cx + 7} 290 V266`);
  fill(8, band(cx, 19, 256, 262, 1.2));
  // second balcony
  ln(9, band(cx, 30, 248, 256));
  arcade(9, cx - 27, cx + 27, 5, 240, 234, 247);
  ln(9, `M${cx - 30} 248 V232 M${cx + 30} 248 V232`);
  ln(9, band(cx, 31, 226, 232));
  // upper shaft
  ln(10, `M${cx - 16} 226 V196 M${cx + 16} 226 V196 M${cx} 224 V198`);
  // third balcony
  ln(11, band(cx, 24, 190, 196));
  arcade(11, cx - 21, cx + 21, 4, 183, 178, 189);
  ln(11, `M${cx - 24} 190 V176 M${cx + 24} 190 V176`);
  ln(11, band(cx, 25, 170, 176));
  // drum with small openings
  ln(12, `M${cx - 15} 170 V152 M${cx + 15} 170 V152`);
  arcade(12, cx - 14, cx + 14, 3, 162, 156, 168, 0.4);
  ln(12, band(cx, 18, 148, 152, 1));
  // lotus petals and the onion dome with its ribs
  let pet = '';
  for (let k = -2; k <= 1; k++) pet += `M${f(cx + k * 8)} 148 q4 -7 8 0 `;
  ln(13, pet.trim());
  ln(13, `M${cx - 17} 148 C${cx - 26} 134 ${cx - 11} 121 ${cx} 112 C${cx + 11} 121 ${cx + 26} 134 ${cx + 17} 148`);
  ln(13, `M${cx} 112 Q${cx - 8} 128 ${cx - 8} 148 M${cx} 112 V148 M${cx} 112 Q${cx + 8} 128 ${cx + 8} 148`);
  // finial
  ln(14, `M${cx} 112 V92 ${circle(cx, 104, 2.6)} ${circle(cx, 97, 1.8)} M${cx - 3} 88 Q${cx} 84 ${cx + 3} 88`);
});

console.log(out.join('\n'));
