// avatar-style/faces5.js — Faces v5 (owner's face sheet, 2026-11-17: the only face style from now on).
// docs/season1/refs/faces-v5/sheet.png = 6 rows × 8 columns = 48 faces, solid black rounded strokes on white. Every cell is redrawn here as
// pure vector draw lists (Path2D at draw time): solid #111, round caps and joins, constant stroke, NO wobble, NO sketch pass, NO shine,
// NO hatching except the cell's own "//" blush marks. The layout is measured data (avatar-style/faces5-data.js, CELLS5: one table; fitted to
// the sheet's ink by scripts/v2/face5-fit.py, checked by scripts/v2/face5-gates.js).
//   · Units. Cell units (cu): the sheet's cell is 1 × 1, origin at the cell centre, y up. Cell → head front: the cell is 80 % of the head
//     front's width (GRID5.cell = .8), centred, so head units = cu × .8 (head front: x ∈ [−.5, .5], y ∈ [−.5, .5] up). Stroke ≈ 5.5 % of a cell.
//   · API mirrors faces4: PRESETS5 (one per cell, row-major, CELL_NAMES) + ALIAS5 (every faces4 / faces3 name) · resolveFace5 · isHeld ·
//     faceItems5 / faceParts5 (draw lists, pure) · TALK (grin / smile / neutral / worried × closed, .04, .08, .13) · TALK_H · mouthHeight ·
//     drawFace5 (browser) · faceMaterial5 / setFace5 · decalGeometry5. Custom faces: {brows, eyes, mouth, extras}, each a cell name that supplies
//     that part (or 'none'); blink replaces the eyes with closed arcs (the sheet's sleep arcs).
import * as T from 'three';
import {HEAD, headFrontZ} from './body.js';
import {OLD_NAMES, darkSkin} from './faces3.js';
import {CELL_NAMES, CELLS5} from './faces5-data.js';
export {CELL_NAMES, CELLS5};

export const INK = '#111111', EDGE = '#f7ead9';
export const GRID5 = {cell: .8, stroke: .055};   // cu → head units; the sheet's stroke (5.5 % of a cell)
export const TIER_PX = {hero: 1024, mid: 512, crowd: 128, bg: 128};
const K = GRID5.cell;

// ---- geometry (pure; cell units, y up) ----------------------------------------------------------------------------------------
const cubicPts = (c, n = 20) => Array.from({length: n + 1}, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map(k => u * u * u * c[k] + 3 * u * u * t * c[2 + k] + 3 * u * t * t * c[4 + k] + t * t * t * c[6 + k]); });
const ellipsePts = (cx, cy, rx, ry, n = 40) => Array.from({length: n}, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const arcPts = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({length: n + 1}, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export function bbox(p) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
// hull of two circles (a tapered mark): tangent points around both ends
function taperPts([x0, y0, r0, x1, y1, r1], n = 14) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-9, ang = Math.atan2(dy, dx), s = Math.asin(Math.max(-1, Math.min(1, (r0 - r1) / L)));
  return [...arcPts(x1, y1, r1, r1, ang + Math.PI / 2 - s, ang - Math.PI / 2 + s, n), ...arcPts(x0, y0, r0, r0, ang - Math.PI / 2 + s, ang - 3 * Math.PI / 2 - s, n)];
}
// a point + a circle: a drop (tip at (tx, ty), round end centred (cx, cy), radius r)
function dropPts([tx, ty, cx, cy, r], n = 20) {
  const dx = tx - cx, dy = ty - cy, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), a = Math.acos(Math.min(1, r / Math.max(L, r + 1e-6)));
  return [[tx, ty], ...arcPts(cx, cy, r, r, ang + a, ang - a + 2 * Math.PI, n * 2), [tx, ty]];
}
const ccw = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a < 0 ? [...p].reverse() : p; };
// a D (dir 1: flat top at y, round bottom) or a dome (dir −1: flat bottom at y, round top): straight sides `s`, then a half ellipse (rx, ry)
function dPts(cx, y, rx, ry, s, dir, n = 28) {
  const c = y - dir * s;
  return [[cx + rx, y], ...arcPts(cx, c, rx, ry, 0, -dir * Math.PI, n).map(([x, yy], i, a) => i === 0 || i === a.length - 1 ? [x, c] : [x, yy]), [cx - rx, y]];
}
function starPts([cx, cy, rx, ry, k], n = 12) {   // 4-point star, concave quadratic edges pulled toward the centre by k
  const tips = [[cx, cy + ry], [cx + rx, cy], [cx, cy - ry], [cx - rx, cy]], out = [];
  for (let i = 0; i < 4; i++) { const a = tips[i], b = tips[(i + 1) % 4], c = [cx + ((a[0] + b[0]) / 2 - cx) * k, cy + ((a[1] + b[1]) / 2 - cy) * k];
    for (let j = 0; j < n; j++) { const t = j / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } }
  return out;
}
// A primitive is [kind, w, ...coords] (cu, y up). → {line, w, closed?} | {pts, fill, holes?}
//   s seg · c cubic · p polyline · r ring · D flat-top D (cx, yt, rx, ry) · U dome (cx, yb, rx, ry) · t taper · q quad · o disc + rect holes
//   d drop (w 0 = filled) · h heart · * star outline
export function primItem(pr) {
  const [k, w, ...v] = pr;
  switch (k) {
    case 's': return {line: [[v[0], v[1]], [v[2], v[3]]], w};
    case 'c': return {line: cubicPts(v), w};
    case 'p': return {line: v.reduce((a, x, i) => (i % 2 ? (a[a.length - 1].push(x), a) : (a.push([x]), a)), []), w};
    case 'r': return {line: ellipsePts(v[0], v[1], v[2], v[3]), w, closed: true};
    case 'D': return {line: dPts(v[0], v[1], v[2], v[3], v[4] ?? 0, 1), w, closed: true, d: true};
    case 'U': return {line: dPts(v[0], v[1], v[2], v[3], v[4] ?? 0, -1), w, closed: true, d: true};
    case 'F': { const holes = []; for (let i = 5; i < v.length;) { const n = v[i++]; holes.push(Array.from({length: n}, (_, j) => [v[i + 2 * j], v[i + 2 * j + 1]])); i += 2 * n; } return {pts: dPts(v[0], v[1], v[2], v[3], v[4], 1), fill: INK, holes}; }
    case 't': return {pts: taperPts(v), fill: INK};
    case 'q': return {pts: [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]], fill: INK};
    case 'o': { const holes = []; for (let i = 4; i < v.length; i += 4) holes.push([[v[i], v[i + 1]], [v[i + 2], v[i + 1]], [v[i + 2], v[i + 3]], [v[i], v[i + 3]]]); return {pts: ellipsePts(v[0], v[1], v[2], v[3]), fill: INK, holes}; }
    case 'd': return w ? {line: dropPts(v), w, closed: true} : {pts: dropPts(v), fill: INK};
    case 'h': { const [cx, cy, d, r, ty] = v, tri = [[cx - d - r * .72, cy - r * .7], [cx - d - r * .72 + 2 * (d + r * .72), cy - r * .7], [cx, ty]]; return {pts: ellipsePts(cx - d, cy, r, r), fill: INK, more: [ellipsePts(cx + d, cy, r, r), ccw(tri)]}; }
    case '*': return {line: starPts(v), w, closed: true};
    default: throw Error('faces5 primitive ' + k);
  }
}

// ---- talk mouths: the sheet's D mouth (flat top, round bottom), interior opening h (head units) --------------------------------
export const TALK_H = [0, .04, .08, .13];
const SW = GRID5.stroke, MY = -.20 / K;   // mouth line y (cu): the sheet's mouths sit at −.2 cu
const dMouth = (wCu, hHead) => ['D', SW, 0, MY + .06, wCu / 2, hHead / K + SW, 0];   // interior = ry − w
export const MOUTHS5 = {
  'smile small': [dMouth(.24, .04)], 'smile open': [dMouth(.29, .08)], 'smile wide': [dMouth(.35, .13)],
  'grin small': [dMouth(.24, .04)], 'grin open': [dMouth(.30, .08)], 'grin wide': [dMouth(.36, .13)],
  'oval small': [['r', SW, 0, MY, .075 / K / 1.6, .04 / K / 1.2 + SW / 2]], 'oval open': [['r', SW, 0, MY, .1 / K / 1.6, .08 / K / 1.2 + SW / 2]], 'oval wide': [['r', SW, 0, MY, .13 / K / 1.6, .13 / K / 1.2 + SW / 2]],
};
const CLOSED = {grin: 'smile', smile: 'content', neutral: 'flat_meh', worried: 'frown'};   // closed mouth = that cell's mouth
export const TALK = {
  grin: ['@smile', 'grin small', 'grin open', 'grin wide'], smile: ['@content', 'smile small', 'smile open', 'smile wide'],
  neutral: ['@flat_meh', 'oval small', 'oval open', 'oval wide'], worried: ['@frown', 'oval small', 'oval open', 'oval wide'],
};
const mouthPrims = name => name[0] === '@' ? CELLS5[name.slice(1)].mouth : MOUTHS5[name];

// ---- presets ------------------------------------------------------------------------------------------------------------------------
// One preset per cell, row-major: its four parts come from that cell. Custom faces pick parts from other cells.
const P = n => ({brows: n, eyes: n, mouth: n, extras: [n]});
export const PRESETS5 = Object.fromEntries(CELL_NAMES.map(n => [n, P(n)]));
export const HERO_PRESETS5 = ['hero_wink', 'hero_grin', 'hero_shock', 'hero_panic', 'hero_scheme', 'hero_cry', 'hero_rage', 'hero_soft'];
// every faces4 / faces3 name → its nearest cell (so existing specs keep working)
export const ALIAS5 = {
  hero_wink: 'wink_soft', hero_grin: 'grin', hero_shock: 'shock', hero_panic: 'sweat_frown', hero_scheme: 'side_eye', hero_cry: 'cry', hero_rage: 'angry', hero_soft: 'blush_smile',
  neutral: 'blank', determined: 'flat_brows', steady: 'calm', brave: 'unimpressed', rage: 'angry', smug: 'side_eye', terrified: 'shock', scream: 'xd_shout', wonder: 'sparkle',
  curious: 'o_small', polite: 'content', laugh: 'laugh_xd', xd: 'xd_laugh', sheepish: 'sweat_smile', ko: 'xd_wince', evil_grin: 'angry', sad: 'frown',
  smirk: 'side_eye', chill: 'calm', blocky: 'blank', vsmile: 'smile', g_soft: 'smile', g_glossy: 'sparkle', g_closed: 'content', g_blush: 'blush_smile', g_uwu: 'blush_smile',
  g_wink_kid: 'wink_soft', g_sleepy: 'sleep', g_teary: 'cry', g_lips: 'smile', g_glam: 'wink_soft', m_brows: 'flat_brows', m_dad: 'smile', m_pixel: 'blank', elder_soft: 'content',
  elder_glasses: 'content', nervous: 'worried', dizzy: 'xd_wince', sob: 'cry', angry: 'angry', monster: 'angry', suspicious: 'side_eye_frown', embarrassed: 'sweat_smile', hum: 'content',
  crying: 'cry', shout: 'xd_shout', gasp: 'gasp',
};
// legacy faces4 extras names → the cell that draws them
const LEGACY_EXTRAS = {blush: 'blush_smile', sweat: 'sweat_frown', tears: 'cry', z: 'sleep', anger: null};
// talking: which preset flaps its mouth (family) — open, extreme and held reaction faces never do
const FAMILY5 = {
  smile: 'smile', content: 'smile', wink_soft: 'smile', wink_shine: 'smile', sparkle: 'smile', blush_smile: 'smile', calm: 'smile', starry: 'smile', sweat_smile: 'smile', shades: 'smile', side_eye: 'smile',
  grin: 'grin', happy: 'grin', beam: 'grin', beam2: 'grin', beam3: 'grin', love: 'grin',
  blank: 'neutral', o_small: 'neutral', dot_o: 'neutral', stare: 'neutral', ring_eyes: 'neutral', flat_brows: 'neutral', unimpressed: 'neutral', meh: 'neutral', flat_meh: 'neutral', bored_o: 'neutral',
  worried: 'worried', worried2: 'worried', sweat_frown: 'worried', frown: 'worried', confused: 'worried', side_eye_frown: 'worried',
};
export const talkFamily = f => FAMILY5[resolveFace5(f).name] ?? null;
export function resolveFace5(f) {
  if (f && typeof f === 'object') {
    const ex = f.extras ?? [], part = (v, d) => v ?? d;
    return {brows: part(f.brows, 'none'), eyes: part(f.eyes, 'smile'), mouth: part(f.mouth, 'smile'), extras: (Array.isArray(ex) ? ex : [ex]).filter(Boolean)};
  }
  const n = PRESETS5[f] ? f : PRESETS5[ALIAS5[f]] ? ALIAS5[f] : PRESETS5[OLD_NAMES[f]] ? OLD_NAMES[f] : PRESETS5[ALIAS5[OLD_NAMES[f]]] ? ALIAS5[OLD_NAMES[f]] : null;
  if (!n) throw Error('unknown face ' + f); return {name: n, ...PRESETS5[n]};
}
export const isHeld = f => !FAMILY5[resolveFace5(f).name ?? '#custom'];
export const faceError5 = f => { resolveFace5(f); return null; };   // v5 has no adult-only parts
export const hasMouth = m => !!MOUTHS5[m] || !!CELLS5[m];

// ---- draw list (pure) ---------------------------------------------------------------------------------------------------------
const part = (cell, k) => cell === 'none' || !cell ? [] : (CELLS5[cell]?.[k] ?? (() => { throw Error(`unknown face part ${k}: ${cell}`); })());
// closed eyes (blink): the sheet's sleep arcs, recentred on each eye and sized to it
function blinkEyes(eyeItems) {
  const tpl = CELLS5.sleep.eyes[0], base = primItem(tpl).line, bb = bbox(base), cx0 = (bb[0] + bb[2]) / 2, cy0 = (bb[1] + bb[3]) / 2, hw0 = (bb[2] - bb[0]) / 2, out = [];
  for (const side of [-1, 1]) { const mine = eyeItems.filter(it => Math.sign(bboxOf(it)[0] + bboxOf(it)[2]) === side); if (!mine.length) continue;
    const b = mine.map(bboxOf), x0 = Math.min(...b.map(q => q[0])), x1 = Math.max(...b.map(q => q[2])), y0 = Math.min(...b.map(q => q[1])), y1 = Math.max(...b.map(q => q[3])), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const hw = Math.max(.085, Math.min(hw0, (x1 - x0) / 2 + .02)), sc = hw / hw0; out.push({line: base.map(([x, y]) => [cx + (x - cx0) * sc, cy + (y - cy0)]), w: SW}); }
  return out;
}
const bboxOf = it => bbox(it.line ?? it.pts);
// box (Look 6, opt-in): the cell's share of the head front (default GRID5.cell = .8); eyeUp: eyes + brows raised (head units)
export function faceItems5(f, {tier = 'mid', blink = false, talk = null, box = K, eyeUp = 0} = {}) {
  const r = resolveFace5(f), items = [], push = (list, kind) => list.forEach(it => items.push({...it, kind, color: INK}));
  const prims = (cell, k) => part(cell, k).map(primItem);
  push(prims(r.brows, 'brows'), 'brow');
  const eyes = prims(r.eyes, 'eyes'); push(blink ? blinkEyes(eyes) : eyes, 'eye');
  const fam = talk !== null && !isHeld(f) ? talkFamily(f) : null;
  push((fam ? mouthPrims(TALK[fam][talk]) : part(r.mouth, 'mouth')).map(primItem), 'mouth');
  for (const e of r.extras) { const cell = e in LEGACY_EXTRAS ? LEGACY_EXTRAS[e] : e; if (cell) push(prims(cell, 'extras'), 'extra'); }
  const tf = it => { const up = it.kind === 'eye' || it.kind === 'brow' ? eyeUp : 0, q = ([x, y]) => [x * box, y * box + up]; return it.line ? {...it, line: it.line.map(q), w: it.w * box} : {...it, pts: it.pts.map(q), holes: it.holes?.map(h => h.map(q)), more: it.more?.map(h => h.map(q))}; };
  return items.map(tf);
}
export function faceParts5(f, {px = 512, ...o} = {}) {
  const X = x => +((x + .5) * px).toFixed(1), Y = y => +((.5 - y) * px).toFixed(1);
  const path = (p, close) => 'M' + p.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + (close ? 'Z' : '');
  return faceItems5(f, o).map(it => it.line
    ? {d: path(it.line, !!it.closed), stroke: it.color, w: +(it.w * px).toFixed(2), kind: it.kind, bbox: bbox(it.line)}
    : {d: path(it.pts, true) + (it.more ?? []).map(h => path(h, true)).join('') + (it.holes ?? []).map(h => path(h, true)).join(''), fill: it.fill, rule: it.holes?.length ? 'evenodd' : 'nonzero', kind: it.kind, bbox: bbox(it.pts)});
}
export const eyeCentres5 = f => { const it = faceItems5(f).filter(i => i.kind === 'eye'), c = side => { const b = it.map(bboxOf).filter(q => Math.sign(q[0] + q[2]) === side); return b.length ? (Math.min(...b.map(q => q[0])) + Math.max(...b.map(q => q[2]))) / 2 : null; }; return [c(-1), c(1)]; };
// Mouth opening (pure): the interior's vertical span at the centre column x = 0 (head units); talk shapes only
export function mouthHeight(f, talk) {
  const m = faceItems5(f, {talk}).filter(i => i.kind === 'mouth' && i.d); if (!m.length) return 0;
  const p = m[0].line, ys = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; if ((a[0] <= 0) !== (b[0] <= 0)) ys.push(a[1] + (b[1] - a[1]) * (0 - a[0]) / (b[0] - a[0])); }
  return ys.length >= 2 ? +(Math.max(...ys) - Math.min(...ys) - m[0].w).toFixed(3) : 0;
}

// ---- browser --------------------------------------------------------------------------------------------------------------------
export function drawFace5(g2, f, {px, tier, skin = '#f6c9a0', blink = false, talk = null, ...box} = {}) {
  const edge = darkSkin(skin);   // dark skin: a light edge under the ink so the black still reads
  for (const it of faceParts5(f, {px, tier, blink, talk, ...box})) {
    const p = new Path2D(it.d); g2.save(); g2.lineCap = 'round'; g2.lineJoin = 'round';
    if (it.stroke) { if (edge) { g2.strokeStyle = EDGE; g2.lineWidth = it.w + 3; g2.stroke(p); } g2.strokeStyle = it.stroke; g2.lineWidth = it.w; g2.stroke(p); }
    else { if (edge) { g2.strokeStyle = EDGE; g2.lineWidth = 3; g2.stroke(p); } g2.fillStyle = it.fill; g2.fill(p, it.rule); }
    g2.restore();
  }
}
let decal5 = null;
export function decalGeometry5() {   // over the whole head front (classic head 1.25 × 1.16, following the round front), head-pivot coordinates
  if (decal5) return decal5;
  const W = 2 * HEAD.radius, H = 2 * HEAD.halfHeight, g = new T.PlaneGeometry(W, H, 24, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, headFrontZ(p.getX(i) * .985) + .008);
  g.computeVertexNormals(); return (decal5 = g);
}
const cache = new Map();
export function faceMaterial5(f, tier = 'hero', skin = '#f6c9a0', {blink = false, talk = null, faceBox = null} = {}) {
  const key = JSON.stringify([f, tier, darkSkin(skin), blink, talk, ...(faceBox ? [faceBox] : [])]); if (cache.has(key)) return cache.get(key);
  let mat;
  if (typeof document === 'undefined') mat = new T.MeshBasicMaterial({transparent: true, opacity: 0});
  else {
    const px = TIER_PX[tier] ?? 512, c = document.createElement('canvas'); c.width = c.height = px;
    drawFace5(c.getContext('2d'), f, {px, tier, skin, blink, talk, ...(faceBox ? {box: faceBox[0], eyeUp: faceBox[1]} : {})});
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  }
  mat.name = 'face5_' + (typeof f === 'string' ? f : 'custom'); cache.set(key, mat); return mat;
}
export function setFace5(actor, f, {blink = false, talk = null} = {}) {
  const tier = actor.tier === 'hero' ? 'hero' : 'mid', skin = actor.skin ?? '#f6c9a0';
  const faceBox = actor.preset?.faceBox ?? null;   // Look 6 (opt-in preset faceBox [box, eyeUp], e.g. [.9, .03])
  if (!actor.faceLayer) { const m = new T.Mesh(decalGeometry5(), faceMaterial5(f, tier, skin, {faceBox})); m.name = 'face_decal'; m.renderOrder = 2; m.position.y = HEAD.centre; actor.pivots.head.add(m); actor.faceLayer = m; }
  actor.faceLayer.material = faceMaterial5(f, tier, skin, {blink, talk, faceBox}); actor.face = f; actor.faceBlink = blink; actor.faceTalk = talk; return actor;
}
export const SHOTS5 = {medium: {d: 7, fov: 35}, close: {d: 5, fov: 35}};
