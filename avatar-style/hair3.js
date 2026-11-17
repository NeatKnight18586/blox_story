// avatar-style/hair3.js — hair v3 (Amendment A4 G1), opt-in (`hair: {style, color, v: 3}` or preset `hairStyle: 'v3'`).
// The v2 shells read as helmets; v3 builds every style as a FITTED CAP (the head surface ×1.04, its hairline set per
// angle: high on the forehead, lower at the temples, down to the nape) plus LAYERED, OVERLAPPING LOCKS: each lock is a
// small flat-shaded tube of rectangular section that leaves the cap along a bent path and tapers to a tip. Locks overlap,
// part, sweep and break the head silhouette. Three tones by vertex colour (shadow underneath / base / highlight on top)
// plus an optional streak colour on chosen locks. Rigid, one merged mesh. Hero ≤ 600 triangles, background ≤ 80.
// The front never drops below EYE_CLEAR inside the eye band (|x| < 0.42, front half), so eyes and brows stay clear.
// Our own designs: no style copies a specific catalogue item, and none carries an item name.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HEAD} from './body.js';

export const HAIR3_BOYS = ['messy_fringe', 'side_part', 'quiff', 'curtains', 'fade_textured', 'spiky_crop', 'curly_top', 'shaggy_mop'];
export const HAIR3_GIRLS = ['long_layered', 'high_ponytail', 'space_buns', 'low_twintails', 'wavy_bob', 'sleek_long', 'messy_bun', 'long_braids', 'curly_puffs', 'wolf_cut'];
export const HAIR3_NEUTRAL = ['buzz', 'bald'];
export const HAIR3_STYLES = [...HAIR3_BOYS, ...HAIR3_GIRLS, ...HAIR3_NEUTRAL];
export const HAIR3_BUDGET = {hero: 600, bg: 80};
export const EYE_CLEAR = .24, EYE_BAND = .42;

const {radius: HR, halfHeight: HH, rim: RIM, depth: D} = HEAD;
const deg = Math.PI / 180, clamp01 = x => Math.max(0, Math.min(1, x));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const nrm = a => { const l = Math.hypot(...a) || 1; return sc(a, 1 / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Head surface (head-centre coords): ang = degrees around Y (0 = front/+z, 90 = right/+x), h ∈ [−1, 1]:
// h ≤ 0 runs down the vertical side (h = −1 → y = −0.58), 0..0.5 over the rounded rim, 0.5..1 across the top to the crown.
export function surf(ang, h, k = 1.04) {
  const a = ang * deg, s = Math.sin(a), c = Math.cos(a); let r, y, nr, ny;
  if (h <= 0) { r = HR; y = (HH - RIM) + h * (2 * HH - RIM); nr = 1; ny = 0; }
  else if (h <= .5) { const t = h / .5 * Math.PI / 2; r = HR - RIM + RIM * Math.cos(t); y = HH - RIM + RIM * Math.sin(t); nr = Math.cos(t); ny = Math.sin(t); }
  else { r = (HR - RIM) * (1 - (h - .5) / .5); y = HH; nr = 0; ny = 1; }
  const p = [s * r * k, y * (k > 1 ? 1 + (k - 1) * .6 : 1) + (k - 1) * .2, c * r * k * D];
  return {p, n: nrm([s * nr, ny, c * nr / D])};
}
// Hairline height (as surface h) by angle: forehead, temples, sides, nape. `fore` lowers/raises the front.
const hairline = (ang, fore = -.02, nape = -.62) => { const a = Math.abs(((ang + 540) % 360) - 180); return a < 40 ? fore + (a / 40) * (fore - .02 - fore) : a < 100 ? fore - .02 + ((a - 40) / 60) * (-.42 - fore + .02) : -.42 + ((a - 100) / 80) * (nape + .42); };

// Fitted cap: grid over angles × rings from the hairline to the crown, plus a crown fan.
function capGeometry(segs, rings, {k = 1.065, fore, nape} = {}) {
  k = Math.max(k, 1.05);   // never closer than 5 % to the head: thinner caps z-fight with the 20-sided head lathe
  const pos = [], idx = [], ring = [];
  for (let j = 0; j <= rings; j++) { const row = []; for (let i = 0; i < segs; i++) { const ang = i / segs * 360, h0 = hairline(ang, fore, nape), h = h0 + (1 - h0) * (j / (rings + 1)) ** .8; row.push(pos.push(...surf(ang, h, k).p) / 3 - 1); } ring.push(row); }
  const top = pos.push(0, HH * (1 + (k - 1) * .6) + (k - 1) * .2, 0) / 3 - 1;
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) { const a = ring[j][i], b = ring[j][(i + 1) % segs], c = ring[j + 1][i], d = ring[j + 1][(i + 1) % segs]; idx.push(a, c, b, b, c, d); }
  for (let i = 0; i < segs; i++) idx.push(ring[rings][i], top, ring[rings][(i + 1) % segs]);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g.toNonIndexed();
}

// One lock: rectangular tube from `root` along a quadratic path (dir·len + bend·len·s²), width w → tip × w, thickness th.
// `up` orients the flat side (default: the surface normal at the root). segs = 2 or 3 → 16 or 24 triangles.
export function lockGeometry({root, dir, len, w = .22, th = .1, bend = [0, 0, 0], tip = .28, segs = 2, up = [0, 1, 0], twist = 0}) {
  const D0 = nrm(dir), rings = [], pos = [];
  for (let k = 0; k <= segs; k++) {
    const s = k / segs, p = add(add(root, sc(D0, len * s)), sc(bend, len * s * s)), tg = nrm(add(D0, sc(bend, 2 * s)));
    let side = nrm(cross(tg, up)); if (!Number.isFinite(side[0]) || Math.hypot(...cross(tg, up)) < 1e-4) side = nrm(cross(tg, [0, 0, 1]));
    const flat = nrm(cross(side, tg)), tw = twist * s, sd = add(sc(side, Math.cos(tw)), sc(flat, Math.sin(tw))), fl = add(sc(flat, Math.cos(tw)), sc(side, -Math.sin(tw)));
    const ww = w * 1.15 * (1 - (1 - tip) * s ** 1.6) / 2, tt = Math.max(th, .13) * 1.2 * (1 - (1 - tip) * s ** 1.2) / 2;
    rings.push([add(add(p, sc(sd, -ww)), sc(fl, tt)), add(add(p, sc(sd, ww)), sc(fl, tt)), add(add(p, sc(sd, ww)), sc(fl, -tt)), add(add(p, sc(sd, -ww)), sc(fl, -tt))]);
  }
  for (let k = 0; k < segs; k++) for (let e = 0; e < 4; e++) { const a = rings[k][e], b = rings[k][(e + 1) % 4], c = rings[k + 1][e], d = rings[k + 1][(e + 1) % 4]; pos.push(...a, ...c, ...b, ...b, ...c, ...d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); return g;
}
// Lock rooted on the cap surface at (ang, h), pushed out by `out` along the normal.
const L = (ang, h, o) => { const {p, n} = surf(ang, h, 1.06); return {...o, root: add(p, sc(n, o.out ?? .03)), up: o.up ?? n}; };
const R = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ball = (r, at, detail = 0) => { const g = new T.IcosahedronGeometry(r, detail); g.translate(...at); return g; };
const fwd = (ang, down = 0, out = .3) => nrm([Math.sin(ang * deg) * out, -down, Math.cos(ang * deg) * out]);   // a direction leaving the head at ang

// Fringe across the forehead: n locks from angle a0 to a1 at height h, all ending above EYE_CLEAR.
function fringe(r, n, a0, a1, {h = .28, len = .32, drop = .55, sweep = 0, w = .24, out = .04, bg = []} = {}) {
  return Array.from({length: n}, (_, i) => { const a = a0 + (a1 - a0) * (n === 1 ? .5 : i / (n - 1)) + (r() - .5) * 6;
    return {...L(a, h, {dir: nrm([Math.sin(a * deg) * .35 + sweep, -drop, Math.cos(a * deg) * .55]), len: len * (.85 + r() * .3), w: w * (.9 + r() * .2), th: .09, bend: [sweep * .3, -.12, .1], out}), fringe: true, bg: bg.includes(i)}; });
}
// Crown texture: short locks scattered over the top, leaning toward `lean`.
const crown = (r, n, {len = .26, lean = [0, 0, -1], up = .7, w = .24, h0 = .45, curl = 0, bg = []} = {}) => Array.from({length: n}, (_, i) => {
  const a = (i / n) * 360 + r() * 30, h = h0 + r() * (.95 - h0);
  return L(a, h, {dir: nrm(add(sc(lean, 1), [Math.sin(a * deg) * .3, up, Math.cos(a * deg) * .3])), len: len * (.8 + r() * .4), w: w * (.85 + r() * .3), th: .1, bend: curl ? [Math.cos(a * deg) * curl, -curl, -Math.sin(a * deg) * curl] : [0, -.15, 0], segs: curl ? 3 : 2, twist: curl * 2, bg: bg.includes(i)});
});
// Fall of locks around the back/sides from height h down to length len (layered when `layers` > 1).
const fall = (r, n, a0, a1, {h = .1, len = .9, w = .3, spread = .25, out = .05, layers = 1, wave = 0, bg = []} = {}) => {
  const out2 = [];
  for (let l = 0; l < layers; l++) for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (n === 1 ? .5 : i / (n - 1)) + (r() - .5) * 8;
    out2.push(L(a, h + l * .12 - .02 * l, {dir: nrm([Math.sin(a * deg) * spread, -1, Math.cos(a * deg) * spread]), len: len * (1 - l * .28) * (.9 + r() * .2), w: w * (.9 + r() * .25), th: .12, out: out + l * .035,
      bend: wave ? [Math.sin(a * deg) * wave, .1, Math.cos(a * deg) * wave] : [0, 0, 0], segs: wave ? 3 : 2, bg: l === 0 && bg.includes(i)})); }
  return out2;
};
const sideFrame = (r, s, {len = .8, w = .16, h = 0} = {}) => L(s * 62, h, {dir: [s * .12, -1, .18], len, w, th: .08, bend: [s * .05, 0, .08], out: .05});

// Each style: () → {cap: {fore, nape, k}, locks: [...], extra: [geometries]}; locks flagged bg survive in the background tier.
const STYLES = {
  messy_fringe: r => ({cap: {fore: .02}, locks: [...fringe(r, 5, -48, 40, {len: .34, sweep: .08, bg: [1, 3]}), ...crown(r, 9, {lean: [0, .2, -.6], len: .28}), ...fall(r, 7, 110, 250, {h: -.1, len: .35, w: .3})]}),
  side_part: r => ({cap: {fore: .04}, locks: [...fringe(r, 4, -20, 60, {len: .5, drop: .2, sweep: .85, h: .38, bg: [1]}), ...[-40, -60, -80].map((a, i) => L(a, .55, {dir: [-1, -.1, -.1], len: .42, w: .3, th: .1, bend: [0, -.3, 0], bg: i === 0})), ...crown(r, 5, {lean: [.4, .3, -.6], len: .3}), ...fall(r, 6, 120, 240, {h: -.12, len: .3})]}),
  quiff: r => ({cap: {fore: .1}, locks: [...[-34, -16, 2, 20, 36].map((a, i) => L(a, .48, {dir: [Math.sin(a * deg) * .2, 1, .55], len: .58, w: .36, th: .15, bend: [0, -.25, -1.0], segs: 3, bg: i === 2})), ...crown(r, 5, {lean: [0, .1, -1], len: .34, up: .3}), ...fall(r, 5, 110, 250, {h: -.15, len: .26})]}),
  curtains: r => ({cap: {fore: .05}, locks: [...[-1, 1].flatMap(s => [8, 26, 44].map((a, i) => L(s * a, .42, {dir: [s * .7, -.6, .45], len: .44 - i * .04, w: .26, th: .09, bend: [s * .25, .05, -.05], segs: 3, bg: i === 0}))), ...crown(r, 6, {len: .26}), ...fall(r, 7, 100, 260, {h: -.1, len: .42})]}),
  fade_textured: r => ({cap: {fore: .1, nape: -.4, k: 1.05}, locks: [...crown(r, 11, {lean: [0, .4, .5], len: .22, up: 1, w: .2, h0: .55, bg: [0, 4]}), ...fringe(r, 3, -20, 20, {len: .22, drop: .3, h: .45})]}),
  spiky_crop: r => ({cap: {fore: .06}, locks: [...Array.from({length: 13}, (_, i) => { const a = i / 13 * 360 + r() * 20, h = .42 + r() * .5; return L(a, h, {dir: nrm([Math.sin(a * deg) * .45, 1, Math.cos(a * deg) * .45 + .2]), len: .36 + r() * .14, w: .22, th: .14, tip: .05, bg: i < 2}); }), ...fall(r, 5, 110, 250, {h: -.1, len: .26})]}),
  curly_top: r => ({cap: {fore: .08, k: 1.03}, locks: [...crown(r, 14, {len: .22, curl: .9, up: .5, w: .2, h0: .4, bg: [0, 6]}), ...fall(r, 6, 110, 250, {h: -.1, len: .24})]}),
  shaggy_mop: r => ({cap: {fore: -.01}, locks: [...fringe(r, 6, -55, 55, {len: .3, drop: .55, h: .33, bg: [2]}), ...fall(r, 10, 60, 300, {h: .05, len: .62, spread: .4, w: .32, bg: [5]}), ...crown(r, 6, {len: .3, lean: [0, .1, -.4]})]}),
  long_layered: r => ({cap: {fore: .04, nape: -.7}, locks: [...[-1, 1].flatMap(s => [10, 30].map((a, i) => L(s * a, .4, {dir: [s * .55, -.8, .5], len: .5 - i * .06, w: .24, th: .09, bend: [s * .3, 0, -.1], segs: 3}))), sideFrame(r, -1, {len: 1.05}), sideFrame(r, 1, {len: 1.05}),
    ...fall(r, 7, 115, 245, {h: .25, len: 1.7, w: .34, spread: .12, layers: 2, bg: [3]}), ...fall(r, 3, 75, 105, {h: .1, len: 1.2, w: .3}), ...fall(r, 3, 255, 285, {h: .1, len: 1.2, w: .3})]}),
  high_ponytail: r => ({cap: {fore: .1, nape: -.45}, locks: [L(180, .7, {dir: [0, .4, -1], len: .2, w: .24, th: .2, bg: true}), ...[-1, 0, 1].map((x, i) => ({root: [x * .08, .78, -.62], up: [0, 0, -1], dir: [x * .15, -1, -.35], len: 1.5 - Math.abs(x) * .3, w: .26, th: .14, bend: [0, .2, -.3], segs: 3, bg: i === 1})),
    sideFrame(r, -1, {len: .7, h: .08}), sideFrame(r, 1, {len: .7, h: .08}), ...fringe(r, 3, -18, 18, {len: .2, drop: .1, h: .48})], extra: [ball(.17, [0, .76, -.6])]}),
  space_buns: r => ({cap: {fore: .04, nape: -.7}, locks: [...fall(r, 6, 120, 240, {h: .15, len: 1.3, w: .32, bg: [2]}), ...fringe(r, 4, -35, 35, {len: .3, drop: .5, h: .33}), sideFrame(r, -1), sideFrame(r, 1),
    ...[-1, 1].flatMap(s => [0, 1, 2].map(k => ({root: [s * .34, .8, -.1], up: [0, 1, 0], dir: [Math.cos(k * 2.1) * .6, .3, Math.sin(k * 2.1) * .6], len: .2, w: .2, th: .14, bend: [0, -.6, 0], segs: 2})))], extra: [ball(.24, [-.34, .8, -.1], 1), ball(.24, [.34, .8, -.1], 1)]}),
  low_twintails: r => ({cap: {fore: .03, nape: -.5}, locks: [...fringe(r, 5, -40, 40, {len: .3, drop: .55, h: .32, bg: [2]}), ...[-1, 1].flatMap(s => [0, 1].map(k => ({root: [s * (.62 + k * .04), -.18, -.32], up: [s, 0, 0], dir: [s * .25, -1, -.25 + k * .1], len: 1.25 - k * .15, w: .36, th: .22, bend: [s * .05, .05, .15], segs: 3, bg: k === 0}))), ...fall(r, 4, 140, 220, {h: .1, len: .4})], extra: [ball(.1, [-.64, -.15, -.32]), ball(.1, [.64, -.15, -.32])]}),
  wavy_bob: r => ({cap: {fore: .03, nape: -.55}, locks: [...fall(r, 11, 58, 302, {h: .12, len: .82, w: .33, spread: .34, wave: .28, bg: [2, 8]}), ...fringe(r, 4, -50, 15, {len: .38, drop: .35, sweep: -.35, h: .38})]}),
  sleek_long: r => ({cap: {fore: .06, nape: -.75}, locks: [...fall(r, 8, 100, 260, {h: .2, len: 1.9, w: .36, spread: .08, bg: [3]}), L(-20, .5, {dir: [-.9, -.5, .35], len: .62, w: .4, th: .09, bend: [.2, -.4, 0], segs: 3}), sideFrame(r, -1, {len: 1.3, w: .24}), sideFrame(r, 1, {len: 1.25, w: .2})]}),
  messy_bun: r => ({cap: {fore: .08, nape: -.4}, locks: [...[0, 1, 2, 3, 4].map(k => ({root: [0, .72, -.48], up: [0, .5, -1], dir: [Math.cos(k * 1.3) * .7, .4, Math.sin(k * 1.3) * .5 - .4], len: .26, w: .2, th: .14, bend: [0, -.4, 0], segs: 2, bg: k === 0})), sideFrame(r, -1, {len: .75, w: .12}), sideFrame(r, 1, {len: .8, w: .12}), ...fringe(r, 3, -30, 30, {len: .26, drop: .4, h: .4}), L(200, .15, {dir: [-.2, -1, -.4], len: .45, w: .14, th: .08})], extra: [ball(.26, [0, .74, -.5], 1)]}),
  long_braids: r => ({cap: {fore: .04, nape: -.45}, locks: [...fringe(r, 4, -38, 38, {len: .28, drop: .5, h: .34, bg: [1]}), ...fall(r, 4, 140, 220, {h: .15, len: .45})],
    extra: [-1, 1].flatMap(s => Array.from({length: 7}, (_, k) => { const g = new T.OctahedronGeometry(.17 - k * .008, 0); g.scale(1.3, 1.1, 1); g.rotateY(k % 2 ? .5 : -.5); g.translate(s * (.66 + k * .015), -.15 - k * .19, .1 + k * .02); return g; }))}),
  curly_puffs: r => ({cap: {fore: .05, k: 1.03}, locks: [...[-1, 1].flatMap(s => Array.from({length: 5}, (_, k) => { const a = k / 5 * 6.283; return {root: [s * .5, .7, -.05], up: [0, 1, 0], dir: [Math.cos(a), .5, Math.sin(a)], len: .2, w: .18, th: .14, bend: [-Math.cos(a) * .8, -.6, -Math.sin(a) * .8], segs: 3, twist: 1.5, bg: k === 0}; })), ...fringe(r, 3, -25, 25, {len: .22, drop: .4, h: .42})],
    extra: [ball(.3, [-.5, .72, -.05], 1), ball(.3, [.5, .72, -.05], 1)]}),
  wolf_cut: r => ({cap: {fore: .02, nape: -.55}, locks: [...fringe(r, 5, -45, 45, {len: .3, drop: .6, h: .3, bg: [2]}), ...crown(r, 8, {len: .3, lean: [0, .2, -.5], w: .26}), ...fall(r, 8, 70, 290, {h: .0, len: .78, spread: .3, w: .28, layers: 2, bg: [4]})]}),
  buzz: () => ({cap: {fore: .14, nape: -.38, k: 1.05}, locks: []}),
  bald: () => null,
};

// Three tones per face by vertex colour: shadow (facing down / tips), base, highlight (facing up on the crown); streak locks
// get the streak colour as their base.
function tone(g, color, streak = null, isStreak = false) {
  const base = new T.Color(isStreak && streak ? streak : color), lo = base.clone().multiplyScalar(.62), hi = base.clone().lerp(new T.Color('#ffffff'), .12);
  const p = g.attributes.position, c = new Float32Array(p.count * 3), a = new T.Vector3(), b = new T.Vector3(), d = new T.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f); b.fromBufferAttribute(p, f + 1); d.fromBufferAttribute(p, f + 2);
    const n = new T.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(a)).normalize(), y = (a.y + b.y + d.y) / 3;
    const col = n.y < -.35 || y < -.2 ? lo : n.y > .55 && y > .45 ? hi : base;
    for (let v = 0; v < 3; v++) c.set([col.r, col.g, col.b], (f + v) * 3);
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); return g;
}
const strip = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); return n; };

const cache = new Map();
// Geometry in head-centre coordinates. opts: {streak: '#hex', streakEvery: n}.
export function hair3Geometry(style, tier = 'hero', color = '#5a3a22', {streak = null, streakEvery = 4, seed = 3} = {}) {
  if (!(style in STYLES)) throw Error('unknown hair v3 style ' + style);
  const key = `${style}:${tier}:${color}:${streak}:${streakEvery}:${seed}`; if (cache.has(key)) return cache.get(key);
  const s = STYLES[style](R(seed + style.length * 31));
  if (!s) { cache.set(key, null); return null; }
  const hero = tier === 'hero';
  const parts = [tone(strip(capGeometry(hero ? 16 : 6, hero ? 3 : 1, s.cap)), color)];
  const locks = hero ? s.locks : s.locks.filter(l => l.bg).slice(0, 2);
  locks.forEach((l, i) => parts.push(tone(strip(lockGeometry(hero ? l : {...l, segs: 1})), color, streak, !!streak && i % streakEvery === 1)));
  if (hero) for (const e of s.extra ?? []) parts.push(tone(strip(e), color));
  else if (s.extra?.length) parts.push(tone(strip(new T.OctahedronGeometry(.24, 0).translate(...(() => { s.extra[0].computeBoundingBox(); const c = new T.Vector3(); s.extra[0].boundingBox.getCenter(c); return c.toArray(); })())), color));
  const g = mergeGeometries(parts); g.computeVertexNormals(); g.computeBoundingBox();
  cache.set(key, g); return g;
}
export const hair3Triangles = g => (g ? g.attributes.position.count / 3 : 0);
