// avatar-style/hair4.js — hair v4 (Amendment A5 §A): sculpted hair. A hairstyle is a few BIG smooth volumes, not many thin
// flat shards. Every style is a DATA TABLE of volume descriptors (unit-tested for the construction rules), built from five
// blocks only:
//   mass   one closed, smooth hair body over the skull (thick, crown lift, rolled lower edge)
//   clump  a thick lock: rounded section swept along a curved spine, tapering to a soft point
//   bun    a smooth ball
//   braid  a chain of 5–8 overlapping smooth beads, shrinking toward the tip
//   curls  a cluster of 6–12 small buns
// Indexed geometry with shared vertices → smooth normals. Colour = vertex gradient (darker root → lighter tip, ±6 % per
// clump). One Phong material, single-sided. Tiers: hero (≤ 2,400 tris), mid (≤ 700: fewer rings and sides), crowd (≤ 140:
// the mass alone at 10 × 2). Nothing in front of the face (|x| < 0.45, z > 0) hangs below EYE_LINE.
// All designs are our own; no style copies a catalogue item.
import * as T from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {HEAD} from './body.js';

const {radius: HR, halfHeight: HH, rim: RIM, depth: D} = HEAD, deg = Math.PI / 180;
const V = (x, y, z) => new T.Vector3(x, y, z);
export const HAIR4_BUDGET = {hero: 2400, mid: 700, crowd: 140};
export const EYE_LINE = .26, FACE_X = .45;
export const RULES = {volumes: [5, 14], clumpW: .26, clumpTh: .16, fringeW: .40, braidBeads: [5, 8], curlBuns: [6, 12]};
const TIER = {hero: {segs: 28, rings: 7, cr: 6, cs: 8, bun: 2, bead: 1, curl: 1}, mid: {segs: 14, rings: 3, cr: 3, cs: 5, bun: 1, bead: 0, curl: 0}, crowd: {segs: 10, rings: 2}};

// Point on the skull (head-centre coords). ang: 0 = front (+z), 90 = +x. h ∈ [−1, 1] (−1 = jaw line, 0 = top of the
// vertical side, .5 = end of the rounded rim, 1 = crown). `off` pushes out along the normal (in head units).
export function skull(ang, h, off = 0) {
  const a = ang * deg, s = Math.sin(a), c = Math.cos(a); let r, y, nr, ny;
  if (h <= 0) { r = HR; y = (HH - RIM) + h * (2 * HH - RIM); nr = 1; ny = 0; }
  else if (h <= .5) { const t = h / .5 * Math.PI / 2; r = HR - RIM + RIM * Math.cos(t); y = HH - RIM + RIM * Math.sin(t); nr = Math.cos(t); ny = Math.sin(t); }
  else { const t = (h - .5) / .5; r = (HR - RIM) * (1 - t); y = HH; nr = 0; ny = 1; }
  const n = V(s * nr, ny, c * nr).normalize();
  return {p: V(s * r, y, c * r * D).addScaledVector(n, off), n};
}
const shade = (col, k) => { const c = new T.Color(col); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k))); return c; };
function paint(g, color, fn) {   // fn(i, position) → brightness factor
  const p = g.attributes.position, c = new Float32Array(p.count * 3), v = V();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = shade(color, fn(i, v)); c.set([k.r, k.g, k.b], i * 3); }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); return g;
}

// ---- blocks (geometry) -------------------------------------------------------------------------------------------
// mass: hairline(ang) → h where the hair starts; thick(ang, h) → offset from the skull.
export function mass(color, {segs = 28, rings = 7, hairline, thick}) {
  const pos = [], idx = [], row = [];
  for (let j = 0; j <= rings; j++) {
    const r = [];
    for (let i = 0; i < segs; i++) {
      const ang = i / segs * 360, h0 = hairline(ang), t = j / rings, h = h0 + (1 - h0) * t ** .85;
      const off = j === 0 ? .012 : thick(ang, h) * (j === 1 ? .82 : 1);   // j = 0: the rolled lower edge tucks onto the skull
      const q = skull(ang, j === 0 ? h0 + .03 : h, off).p; r.push(pos.push(q.x, q.y, q.z) / 3 - 1);
    }
    row.push(r);
  }
  const top = skull(0, 1, thick(0, 1)).p; const ti = pos.push(0, top.y, 0) / 3 - 1;
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) { const a = row[j][i], b = row[j][(i + 1) % segs], c = row[j + 1][i], d = row[j + 1][(i + 1) % segs]; idx.push(a, b, c, b, d, c); }
  for (let i = 0; i < segs; i++) idx.push(row[rings][i], row[rings][(i + 1) % segs], ti);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return paint(g, color, (i, v) => .86 + .2 * Math.max(0, Math.min(1, (v.y + .3) / (HH + .5))));
}
// clump: pts 3–5 control points root → tip; w/th at the root; taper = tip width fraction; belly swells the middle.
export function clump(color, pts, {w = .34, th = .2, taper = .18, belly = .12, rings = 6, sides = 8, tone = 1, up = null, twist = 0} = {}) {
  const curve = new T.CatmullRomCurve3(pts.map(p => V(...p)), false, 'centripetal', .5), pos = [], idx = [], ss = [];
  for (let k = 0; k <= rings; k++) {
    const s = k / rings, p = curve.getPoint(s), tg = curve.getTangent(s).normalize();
    const out = up ? V(...up) : V(p.x, p.y * .35, p.z).normalize();
    let side = V().crossVectors(tg, out); if (side.lengthSq() < 1e-6) side = V().crossVectors(tg, V(0, 0, 1)); side.normalize();
    const nor = V().crossVectors(side, tg).normalize(), a0 = twist * s;
    const prof = (1 - (1 - taper) * s ** 1.7) * (1 + belly * Math.sin(Math.PI * s)) * (k === 0 ? .75 : 1);
    for (let e = 0; e < sides; e++) {
      const a = e / sides * Math.PI * 2 + a0, cx = Math.cos(a), sy = Math.sin(a);
      const sx = Math.sign(cx) * Math.abs(cx) ** .75, sn = Math.sign(sy) * Math.abs(sy) ** .75;   // slightly squared: chunky, not a noodle
      const q = p.clone().addScaledVector(side, sx * w / 2 * prof).addScaledVector(nor, sn * th / 2 * prof);
      pos.push(q.x, q.y, q.z); ss.push(s);
    }
  }
  const tipP = curve.getPoint(1).addScaledVector(curve.getTangent(1).normalize(), Math.max(w, th) * taper * .9), tip = pos.push(tipP.x, tipP.y, tipP.z) / 3 - 1; ss.push(1.05);
  const rootP = curve.getPoint(0), root = pos.push(rootP.x, rootP.y, rootP.z) / 3 - 1; ss.push(0);
  for (let k = 0; k < rings; k++) for (let e = 0; e < sides; e++) { const a = k * sides + e, b = k * sides + (e + 1) % sides, c = a + sides, d = b + sides; idx.push(a, c, b, b, c, d); }
  for (let e = 0; e < sides; e++) { idx.push(rings * sides + e, tip, rings * sides + (e + 1) % sides); idx.push(e, (e + 1) % sides, root); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return paint(g, color, i => tone * (.8 + .34 * Math.min(1, ss[i]) ** .8));
}
export function bun(color, at, r, {squash = [1, .92, 1], tone = 1, detail = 2} = {}) {
  let g = new T.IcosahedronGeometry(r, detail); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g); g.scale(...squash); g.translate(...at); g.computeVertexNormals();
  return paint(g, color, (i, v) => tone * (.88 + .22 * Math.max(0, Math.min(1, (v.y - at[1] + r) / (2 * r)))));
}
// braid: n overlapping beads from `from` to `to`, radius r0 → r1, alternating a little side to side.
export function braidParts(from, to, {n = 7, r0 = .17, r1 = .1} = {}) {
  return Array.from({length: n}, (_, k) => { const u = k / (n - 1), r = r0 + (r1 - r0) * u, wob = (k % 2 ? 1 : -1) * r * .25;
    return {at: [from[0] + (to[0] - from[0]) * u + wob, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u], r, squash: [1.1, .9, 1]}; });
}
// curls: n small buns scattered on a dome of radius R around `at` (seeded, deterministic).
export function curlParts(at, {n = 9, R = .32, r = .15, seed = 1, flat = .75} = {}) {
  const out = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + seed, el = (k % 3) * .45 + .15, rr = r * (.85 + .3 * ((k * 7 + seed * 3) % 5) / 5);
    out.push({at: [at[0] + Math.cos(a) * Math.cos(el) * R, at[1] + Math.sin(el) * R * flat, at[2] + Math.sin(a) * Math.cos(el) * R], r: rr}); }
  out.push({at: [at[0], at[1] + R * .5, at[2]], r: r * 1.15}); return out.slice(0, n);
}

// ---- descriptor helpers ------------------------------------------------------------------------------------------
// hairline (as skull h) by angle: forehead up to `edge`°, then just above the eye line at 43° (|x| = 0.45), down to the temple by 52°,
// held over the ear to 100°, then to the nape
const EYE_H = -.08;   // skull h whose rolled edge sits just above EYE_LINE
const line = (fore, temple, nape, edge = 24) => ang => { const a = Math.abs(((ang + 540) % 360) - 180); const f = Math.max(fore, EYE_H);
  return a < edge ? f : a < 43 ? f + (EYE_H - f) * ((a - edge) / (43 - edge)) : a < 52 ? EYE_H + (temple - EYE_H) * ((a - 43) / 9) : a < 100 ? temple : temple + (nape - temple) * ((a - 100) / 80); };   // |x| < 0.45 ends at 43°
const P = (ang, h, off) => skull(ang, h, off).p.toArray().map(v => +v.toFixed(4));
const M = (fore, temple, nape, base, top = .1, back = .05, extra = {}) => ({t: 'mass', fore, temple, nape, base, top, back, ...extra});
const C = (pts, o = {}) => ({t: 'clump', pts, w: .4, th: .2, ...o});
// fringe lock at angle a, swept by `sweep`; its tip stays above the eye line
const FR = (a, sweep = 0, o = {}) => { const a2 = a + sweep * 46, w = o.w ?? .5, tp = o.taper ?? .22, ty = Math.max(o.tipY ?? .34, EYE_LINE + .035 + Math.max(w, o.th ?? .24) * tp * .95);   // tip cap stays above the eye line
  return C([P(a - 6, .78, .1), P(a, .5, .2), P(a + sweep * 30, .26, .24), [+(Math.sin(a2 * deg) * .62).toFixed(4), ty, +(Math.cos(a2 * deg) * .66).toFixed(4)]], {w: .5, th: .24, taper: .22, fringe: true, ...o}); };
// lock hanging from angle a (side/back), down to height y with spread
const HANG = (a, y = -.5, o = {}) => C([P(a, .55, .1), P(a, .15, .2), P(a, -.3, o.out ?? .17), ...(y < -.6 ? [[Math.sin(a * deg) * (HR + .18 + (o.flare ?? 0)), y, Math.cos(a * deg) * (HR * D + .18 + (o.flare ?? 0))]] : [])], {w: .46, th: .2, taper: .25, ...o});
// tuft rising from the crown at angle a
const TUFT = (a, h = .8, len = .42, o = {}) => { const b = skull(a, h, .08), dir = b.n.clone().add(V(0, .55, -.25)).normalize();
  return C([b.p.toArray(), b.p.clone().addScaledVector(dir, len * .55).toArray(), b.p.clone().addScaledVector(dir, len).add(V(0, -.06, -.05)).toArray()].map(p => p.map(v => +v.toFixed(4))), {w: .46, th: .3, taper: .14, belly: .25, ...o}); };

// ---- the 20 styles (data) ----------------------------------------------------------------------------------------
export const STYLES = {
  // Boys
  messy_fringe: [M(.34, -.42, -.6, .1, .1, .05), FR(-34, .1, {tone: 1.02}), FR(-12, .3, {tone: .94}), FR(12, .22, {tone: 1.06}), FR(34, .05, {tone: .97}),
    HANG(-72, -.5, {w: .36, th: .18, tone: .97}), HANG(72, -.5, {w: .36, th: .18, tone: 1.03}), HANG(150, -.5, {tone: 1.05}), HANG(-150, -.5, {tone: .96}), HANG(180, -.5),
    TUFT(15, .82, .42, {tone: 1.06}), TUFT(-70, .78, .36, {tone: .97}), TUFT(100, .8, .36, {tone: 1.02})],
  side_part: [M(.4, -.42, -.55, .09, .06, .05), C([P(-40, .8, .12), P(-5, .9, .26), P(40, .62, .26), P(70, .25, .2), [.66, .2, .2]], {w: .95, th: .3, taper: .4, belly: .2, fringe: true, tone: 1.04}),
    C([P(-30, .7, .1), P(5, .62, .22), P(35, .42, .22), [.5, .34, .5]], {w: .55, th: .24, taper: .3, fringe: true}),
    C([P(-60, .55, .08), P(-75, .2, .12), P(-80, -.25, .1)], {w: .3, th: .16, tone: .95}), HANG(140, -.45, {w: .5}), HANG(-140, -.45, {w: .5, tone: .96}), HANG(180, -.5, {tone: 1.03})],
  // one rolled front volume: a single thick roll rising off the forehead and curling back over the crown; tight sides
  quiff: [M(.42, -.44, -.5, .05, .06, .03, {tight: true}), C([P(0, .32, .1), [0, HH + .1, .56], [0, HH + .3, .38], [0, HH + .3, .06], [0, HH + .12, -.24]], {w: .98, th: .4, taper: .6, belly: .22, rings: 8, sides: 10, up: [0, 1, .3]}),
    C([P(0, .9, .12), [0, HH + .22, -.24], [0, HH + .04, -.56]], {w: .78, th: .26, taper: .45, tone: .96, up: [0, 1, 0]}), HANG(150, -.42, {w: .5, th: .16}), HANG(-150, -.42, {w: .5, th: .16, tone: .96}), HANG(180, -.45, {th: .16})],
  curtains: [M(.42, -.45, -.62, .1, .08, .05), ...[-1, 1].flatMap(s => [C([[s * .05, HH + .14, .38], [s * .32, .62, .58], [s * .58, .32, .52], [s * .72, .02, .34]], {w: .5, th: .22, taper: .3, fringe: true, tone: s < 0 ? .98 : 1.04, up: [s * .3, .4, 1]}),
    C([P(s * 70, .45, .1), P(s * 78, .05, .18), [s * .74, -.4, .12]], {w: .4, th: .2, taper: .3, tone: s < 0 ? 1.03 : .96})]), HANG(140, -.55), HANG(-140, -.55, {tone: .96}), HANG(180, -.6, {tone: 1.04})],
  fade_textured: [M(.42, -.45, -.5, .05, .05, .02, {sides: .035, tight: true}), ...[[-28, .74], [0, .82], [28, .74], [-60, .62], [60, .62], [180, .72], [140, .7]].map(([a, h], i) => {
    const b = skull(a, h, .06), dir = b.n.clone().add(V(0, .9, .35)).normalize();
    return C([b.p.toArray(), b.p.clone().addScaledVector(dir, .16).toArray(), b.p.clone().addScaledVector(dir, .3).toArray()].map(p => p.map(v => +v.toFixed(4))), {w: .4, th: .26, taper: .3, belly: .2, tone: .94 + (i % 3) * .05}); })],
  spiky_crop: [M(.4, -.38, -.5, .07, .08, .03, {tight: true}), ...[[0, .9, [0, 1, .45]], [-30, .78, [-.5, 1, .3]], [30, .78, [.5, 1, .3]], [-80, .62, [-1, .9, 0]], [80, .62, [1, .9, 0]], [180, .75, [0, 1, -.7]], [-135, .7, [-.6, 1, -.5]], [135, .7, [.6, 1, -.5]]].map(([a, h, d], i) => {
    const b = skull(a, h, .05), dir = V(...d).normalize();
    return C([b.p.toArray(), b.p.clone().addScaledVector(dir, .26).toArray(), b.p.clone().addScaledVector(dir, .55).toArray()].map(p => p.map(v => +v.toFixed(4))), {w: .38, th: .3, taper: .05, belly: .1, tone: .95 + (i % 3) * .05}); })],
  curly_top: [M(.42, -.36, -.5, .06, .05, .03), {t: 'curls', at: [0, HH + .06, -.02], n: 12, R: .27, r: .21, seed: 2, flat: .45}, {t: 'curls', at: [0, .58, .4], n: 7, R: .19, r: .17, seed: 5, flat: .5},
    C([P(-75, .4, .08), P(-80, .05, .12), [-.7, -.2, .02]], {w: .3, th: .16, tone: .96}), C([P(75, .4, .08), P(80, .05, .12), [.7, -.2, .02]], {w: .3, th: .16, tone: 1.03}), HANG(180, -.35, {w: .55, th: .16})],
  shaggy_mop: [M(.3, -.5, -.7, .16, .1, .06), ...[-36, -12, 12, 36].map((a, i) => FR(a, 0, {tipY: .3, w: .52, th: .26, tone: .95 + i * .03})),
    ...[-1, 1].flatMap(s => [HANG(s * 70, -.62, {w: .52, th: .26, flare: .06, tone: 1 + s * .03}), HANG(s * 105, -.7, {w: .52, th: .26, flare: .08})]), HANG(150, -.75, {w: .56}), HANG(-150, -.75, {w: .56, tone: .96}), HANG(180, -.78, {w: .6, tone: 1.04})],
  // Girls
  long_layered: [M(.4, -.55, -.9, .11, .07, .06), C([[0, .5, -.56], [0, -.3, -.72], [0, -1.25, -.7], [0, -1.95, -.56]], {w: 1.05, th: .4, taper: .5, belly: .06, rings: 8, sides: 10, up: [0, 0, -1]}),
    ...[-1, 1].map(s => C([[s * .42, .45, -.42], [s * .62, -.35, -.5], [s * .6, -1.2, -.5], [s * .44, -1.8, -.42]], {w: .62, th: .36, taper: .3, tone: s < 0 ? .96 : 1.04, rings: 8, up: [s * .6, 0, -.8]})),
    ...[-1, 1].map(s => C([[s * .64, .3, .1], [s * .78, -.35, .12], [s * .74, -1.0, .16], [s * .62, -1.45, .2]], {w: .4, th: .24, taper: .16, tone: s < 0 ? 1.05 : .97, rings: 7, up: [s, 0, .25]})),
    ...[-1, 1].map(s => C([[s * .04, .66, .46], [s * .3, .52, .6], [s * .58, .3, .5], [s * .72, -.1, .32]], {w: .42, th: .17, taper: .16, fringe: true, tone: s < 0 ? 1.02 : 1.06, up: [s * .3, .2, 1]}))],
  high_ponytail: [M(.42, -.5, -.6, .07, .05, .03), {t: 'bun', at: [0, HH + .16, -.42], r: .17, squash: [1, .9, 1]},
    C([[0, HH + .2, -.5], [0, HH + .28, -.85], [0, .1, -1.0], [0, -.8, -.86], [0, -1.35, -.74]], {w: .5, th: .36, taper: .3, belly: .3, rings: 8, up: [0, .3, -1]}),
    C([[.08, HH + .14, -.55], [.24, .2, -.95], [.2, -.9, -.82]], {w: .32, th: .22, taper: .25, tone: 1.04}), C([[-.08, HH + .14, -.55], [-.24, .2, -.95], [-.2, -.9, -.82]], {w: .32, th: .22, taper: .25, tone: .96}),
    ...[-1, 1].map(s => C([[s * .62, .32, .2], [s * .74, -.1, .24], [s * .72, -.6, .26]], {w: .28, th: .17, taper: .3, tone: 1.04}))],
  space_buns: [M(.36, -.42, -.62, .1, .06, 0), {t: 'bun', at: [-.42, .92, -.08], r: .3}, {t: 'bun', at: [.42, .92, -.08], r: .3, tone: 1.04},
    ...[[-26, .96], [0, 1.05], [26, 1]].map(([a, t]) => FR(a, 0, {w: .54, th: .24, tone: t, taper: .34})),
    ...[-1, 1].map(s => C([[s * .64, .34, .16], [s * .72, -.15, .2], [s * .7, -.7, .2]], {w: .3, th: .18, tone: 1.03, taper: .25}))],
  low_twintails: [M(.34, -.48, -.7, .1, .06, .04), ...[-30, 0, 30].map((a, i) => FR(a, 0, {tipY: .32, w: .52, tone: .96 + i * .04})),
    ...[-1, 1].flatMap(s => [{t: 'bun', at: [s * .66, -.2, -.3], r: .14, tone: .9},
      C([[s * .7, -.2, -.3], [s * .92, -.6, -.1], [s * .98, -1.25, .12], [s * .9, -1.75, .2]], {w: .5, th: .34, taper: .28, belly: .2, rings: 8, tone: s < 0 ? .97 : 1.03})])],
  wavy_bob: [M(.38, -.5, -.6, .12, .08, .05), ...[[-72, .97], [72, 1.03], [-104, 1], [100, .96], [-140, 1.04], [140, .98], [180, 1.02]].map(([a, t]) => {
    const s = Math.sin(a * deg), c = Math.cos(a * deg), R = HR + .2;
    return C([P(a, .5, .1), [s * R, .05, c * R * D], [s * (R + .08), -.35, c * (R * D + .08)], [s * (R + .02), -.68, c * (R * D + .02)], [s * (R + .14), -.92, c * (R * D + .14)]], {w: .52, th: .24, taper: .3, belly: .15, rings: 7, tone: t}); }),
    C([P(-30, .82, .12), P(5, .62, .24), [.42, .48, .55], [.64, .4, .4]], {w: .62, th: .24, taper: .35, fringe: true, tone: 1.05})],
  sleek_long: [M(.44, -.5, -.9, .08, .05, .04), C([[0, .55, -.52], [0, -.4, -.66], [0, -1.6, -.62], [0, -2.5, -.5]], {w: 1.15, th: .3, taper: .7, belly: .02, rings: 8, sides: 10, up: [0, 0, -1]}),
    ...[-1, 1].map(s => C([[s * .5, .45, -.3], [s * .7, -.3, -.3], [s * .66, -1.5, -.34], [s * .54, -2.3, -.34]], {w: .5, th: .26, taper: .6, rings: 8, tone: s < 0 ? .97 : 1.03, up: [s, 0, -.3]})),
    C([P(-45, .82, .12), P(-5, .7, .24), P(40, .45, .24), [.72, .2, .2], [.76, -.4, .14]], {w: .66, th: .24, taper: .45, belly: .1, fringe: true, tone: 1.05}),
    C([[-.66, .3, .14], [-.76, -.4, .14], [-.72, -1.3, .14]], {w: .32, th: .18, taper: .4, tone: .98})],
  messy_bun: [M(.42, -.48, -.55, .08, .05, .03), {t: 'bun', at: [0, HH + .28, -.3], r: .38, squash: [1.05, .85, 1]}, {t: 'bun', at: [.16, HH + .44, -.22], r: .2, tone: 1.05}, {t: 'bun', at: [-.2, HH + .36, -.44], r: .18, tone: .95},
    C([[.66, .34, .18], [.76, -.1, .2], [.7, -.55, .26]], {w: .28, th: .17, taper: .25, tone: 1.04}), C([[-.66, .3, .1], [-.74, -.2, .14], [-.68, -.6, .2]], {w: .28, th: .17, taper: .25, tone: .97}),
    FR(-10, .25, {w: .5, th: .22, tone: 1.03})],
  long_braids: [M(.36, -.45, -.62, .09, .06, .03), ...[-28, 0, 28].map((a, i) => FR(a, 0, {tipY: .33, w: .52, tone: .97 + i * .03})),
    {t: 'braid', from: [-.66, -.2, -.1], to: [-.78, -1.6, .2], n: 8, r0: .19, r1: .12}, {t: 'braid', from: [.66, -.2, -.1], to: [.78, -1.6, .2], n: 8, r0: .19, r1: .12}],
  curly_puffs: [M(.4, -.45, -.6, .1, .06, .03), {t: 'curls', at: [-.5, .8, -.05], n: 10, R: .2, r: .21, seed: 3}, {t: 'curls', at: [.5, .8, -.05], n: 10, R: .2, r: .21, seed: 7},
    FR(-14, 0, {w: .48, th: .22}), FR(14, 0, {w: .48, th: .22, tone: 1.05})],
  wolf_cut: [M(.36, -.5, -.66, .12, .1, .05), ...[-30, 0, 30].map((a, i) => FR(a, i - 1 ? .1 : -.1, {tipY: .32, w: .5, tone: .96 + i * .04})),
    ...[-1, 1].flatMap(s => [C([P(s * 75, .5, .12), P(s * 82, -.1, .2), [s * .7, -.5, .1], [s * .98, -.68, -.05]], {w: .46, th: .26, taper: .2, belly: .2, tone: 1 + s * .03}),
      C([P(s * 130, .5, .12), P(s * 135, -.1, .22), [s * .58, -.55, -.5], [s * .82, -.72, -.72]], {w: .46, th: .26, taper: .2, belly: .2})]),
    C([P(180, .55, .12), P(180, -.1, .22), [0, -.6, -.72], [0, -.82, -.98]], {w: .5, th: .28, taper: .2, belly: .2, tone: 1.04}), TUFT(0, .85, .32, {tone: 1.05}), TUFT(160, .82, .34, {tone: .96})],
  // Neutral
  buzz: [M(.46, -.45, -.5, .075, .02, 0)],
  bald: [],
};
export const HAIR4_STYLES = Object.keys(STYLES);
export const HAIR4_BOYS = HAIR4_STYLES.slice(0, 8), HAIR4_GIRLS = HAIR4_STYLES.slice(8, 18), HAIR4_NEUTRAL = ['buzz', 'bald'];

// ---- builder ------------------------------------------------------------------------------------------------------
const strip = x => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'color'].includes(k)) x.deleteAttribute(k); return x; };
export function volumeGeometries(style, color = '#5a3a22', tier = 'hero') {
  const T0 = TIER[tier]; if (!T0) throw Error('unknown hair tier ' + tier);
  const out = [];
  for (const v of STYLES[style] ?? (() => { throw Error('unknown hair v4 style ' + style); })()) {
    if (v.t === 'mass') { const sd = v.sides ?? v.top; out.push(mass(color, {segs: T0.segs, rings: T0.rings, hairline: line(v.fore, Math.min(v.temple, v.tight ? -.44 : -.62), Math.max(-1, v.nape - .28)),   // tight short cuts sit higher over the ears (scalp gate relaxed to < 3 % for them, owner 2026-11-14)
        // sideburns reach below cheek height so the face edge is screened from behind   // the back always covers down to the nape
      thick: (a, h) => v.base + v.top * Math.max(0, h) + v.back * Math.max(0, -Math.cos(a * deg)) - (v.sides !== undefined ? (v.base - v.sides) * Math.abs(Math.sin(a * deg)) * (h < .3 ? 1 : 0) : 0)})); }
    if (tier === 'crowd') continue;   // the crowd tier is the mass alone
    if (v.t === 'clump') out.push(clump(color, v.pts, {w: v.w, th: v.th, taper: v.taper, belly: v.belly, tone: v.tone, up: v.up, twist: v.twist, rings: tier === 'hero' ? (v.rings ?? T0.cr) : T0.cr, sides: tier === 'hero' ? (v.sides ?? T0.cs) : T0.cs}));
    if (v.t === 'bun') out.push(bun(color, v.at, v.r, {squash: v.squash, tone: v.tone, detail: T0.bun}));
    if (v.t === 'braid') for (const b of braidParts(v.from, v.to, v)) out.push(bun(color, b.at, b.r, {squash: b.squash, tone: v.tone ?? 1, detail: T0.bead}));
    if (v.t === 'curls') for (const b of curlParts(v.at, v)) out.push(bun(color, b.at, b.r, {tone: v.tone ?? 1, detail: T0.curl}));
  }
  return out.map(strip);
}
const cache = new Map();
export function hair4Geometry(style, color = '#5a3a22', tier = 'hero') {
  const key = `${style}|${color}|${tier}`; if (cache.has(key)) return cache.get(key);
  const parts = volumeGeometries(style, color, tier), g = parts.length ? mergeGeometries(parts) : null;
  if (g) g.userData.v4 = true; cache.set(key, g); return g;
}
export const hair4Triangles = g => (g ? g.index.count / 3 : 0);
