// avatar-style/hair4.js — hair v4 PROTOTYPE (Amendment A5 §A): sculpted hair. Three styles done; Session 8b finishes it.
// The difference from v3: a hairstyle is a few BIG smooth volumes, not many thin flat shards.
//   mass(...)   one closed, smooth "hair mass" over the skull (thick, with crown lift and a rolled lower edge)
//   clump(...)  a thick lock: rounded 8-sided section swept along a curved spine, tapering to a soft point
//   bun(...)    a smooth ball
// Everything is indexed with shared vertices → smooth normals (no faceting). Colour = vertex gradient
// (darker root → lighter tip) with a small per-clump tone shift, so strands read without a texture.
import * as T from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {HEAD} from './body.js';

const {radius: HR, halfHeight: HH, rim: RIM, depth: D} = HEAD, deg = Math.PI / 180;
const V = (x, y, z) => new T.Vector3(x, y, z);
export const HAIR4_BUDGET = {hero: 2400, mid: 700, crowd: 140};
export const EYE_LINE = .26;   // nothing in front of the face (|x| < .45, z > 0) may hang below this y

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

// The hair mass. hairline(ang) → h where the hair starts; thick(ang, h) → offset from the skull.
export function mass(color, {segs = 28, rings = 7, hairline, thick}) {
  const pos = [], idx = [], row = [];
  for (let j = 0; j <= rings; j++) {
    const r = [];
    for (let i = 0; i < segs; i++) {
      const ang = i / segs * 360, h0 = hairline(ang), t = j / rings, h = h0 + (1 - h0) * t ** .85;
      // j = 0 is the rolled lower edge: it tucks back onto the skull so the rim looks thick, not like paper
      const off = j === 0 ? .012 : thick(ang, h) * (j === 1 ? .82 : 1);
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

// A thick lock. pts: 3–5 control points (head-centre coords) root → tip. w/th: width and thickness at the root.
// taper: tip width as a fraction; belly: >0 swells the middle; up: which way the flat side faces (default: away from head).
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
      const sx = Math.sign(cx) * Math.abs(cx) ** .75, sn = Math.sign(sy) * Math.abs(sy) ** .75;   // slightly squared: a chunky lock, not a noodle
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
export function bun(color, at, r, {squash = [1, .92, 1], tone = 1} = {}) {
  let g = new T.IcosahedronGeometry(r, 2); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g); g.scale(...squash); g.translate(...at); g.computeVertexNormals();
  return paint(g, color, (i, v) => tone * (.88 + .22 * Math.max(0, Math.min(1, (v.y - at[1] + r) / (2 * r)))));
}

// ---------- two finished styles as the model for the other eighteen ----------
const line = (fore, temple, nape) => ang => { const a = Math.abs(((ang + 540) % 360) - 180); return a < 38 ? fore : a < 95 ? fore + (temple - fore) * ((a - 38) / 57) : temple + (nape - temple) * ((a - 95) / 85); };
const P = (ang, h, off) => skull(ang, h, off).p.toArray();

const STYLES = {
  // Boy, classic: full fluffy top, a swept fringe of four fat locks, short sides, a few tufts breaking the outline.
  messy_fringe: c => [
    mass(c, {hairline: line(.34, -.3, -.6), thick: (a, h) => .1 + .1 * Math.max(0, h) + .05 * Math.max(0, -Math.cos(a * deg))}),
    ...[[-34, .1, 1.02], [-12, .3, .94], [12, .22, 1.06], [34, .05, .97]].map(([a, sweep, t], i) =>
      clump(c, [P(a - 6, .78, .1), P(a, .5, .2), P(a + sweep * 30, .26, .24), [Math.sin((a + sweep * 46) * deg) * .62, .3, Math.cos((a + sweep * 46) * deg) * .66]], {w: .5, th: .24, tone: t, taper: .22})),
    ...[[-70, .97], [70, 1.03]].map(([a, t]) => clump(c, [P(a, .5, .1), P(a * 1.08, .15, .16), P(a * 1.12, -.22, .1)], {w: .34, th: .16, tone: t})),
    ...[[150, 1.05], [-150, .96], [180, 1], [118, .98], [-118, 1.04]].map(([a, t], i) => clump(c, [P(a, .55, .1), P(a, .15, .2), P(a, -.5, .15 + (i % 2) * .05)], {w: .46, th: .2, tone: t, taper: .25})),
    ...[[15, .82, .42, 1.06], [-70, .78, .36, .97], [100, .8, .36, 1.02], [180, .8, .4, 1.04]].map(([a, h, len, t]) => {
      const b = skull(a, h, .08), dir = b.n.clone().add(V(0, .55, -.25)).normalize();
      return clump(c, [b.p.toArray(), b.p.clone().addScaledVector(dir, len * .55).toArray(), b.p.clone().addScaledVector(dir, len).add(V(0, -.06, -.05)).toArray()], {w: .46, th: .3, tone: t, taper: .14, belly: .25, rings: 4});
    }),
  ],
  // Girl, modern: long smooth hair to the shoulder blades in three broad panels, two face-framing front pieces, curtain bangs.
  long_layered: c => [
    mass(c, {hairline: line(.4, -.55, -.9), thick: (a, h) => .11 + .07 * Math.max(0, h) + .06 * Math.max(0, -Math.cos(a * deg))}),
    clump(c, [[0, .5, -.56], [0, -.3, -.72], [0, -1.25, -.7], [0, -1.95, -.56]], {w: 1.05, th: .4, taper: .5, belly: .06, rings: 8, sides: 10, up: [0, 0, -1]}),
    ...[-1, 1].map(s => clump(c, [[s * .42, .45, -.42], [s * .62, -.35, -.5], [s * .6, -1.2, -.5], [s * .44, -1.8, -.42]], {w: .62, th: .36, taper: .3, tone: s < 0 ? .96 : 1.04, rings: 8, up: [s * .6, 0, -.8]})),
    ...[-1, 1].map(s => clump(c, [[s * .6, .3, .12], [s * .7, -.35, .16], [s * .64, -1.0, .22], [s * .5, -1.45, .26]], {w: .4, th: .24, taper: .16, tone: s < 0 ? 1.05 : .97, rings: 7, up: [s, 0, .25]})),
    ...[-1, 1].map(s => clump(c, [[s * .04, .66, .46], [s * .3, .5, .6], [s * .58, .22, .5], [s * .7, -.2, .34]], {w: .42, th: .17, taper: .16, tone: s < 0 ? 1.02 : 1.06, up: [s * .3, .2, 1]})),
  ],
  // Girl: two smooth buns, a full fringe of three fat locks, two thin face-framing strands.
  space_buns: c => [
    mass(c, {hairline: line(.36, -.35, -.62), thick: (a, h) => .1 + .06 * Math.max(0, h)}),
    bun(c, [-.42, .92, -.08], .3), bun(c, [.42, .92, -.08], .3, {tone: 1.04}),
    ...[[-26, .96], [0, 1.05], [26, 1]].map(([a, t]) => clump(c, [P(a, .8, .1), P(a, .5, .2), P(a * 1.05, .27, .22), [Math.sin(a * 1.1 * deg) * .62, .3, Math.cos(a * 1.1 * deg) * .65]], {w: .54, th: .24, tone: t, taper: .34})),
    ...[-1, 1].map(s => clump(c, [P(s * 62, .3, .1), P(s * 66, -.2, .15), [s * .68, -.7, .2]], {w: .3, th: .18, tone: 1.03, taper: .25})),
  ],
};
export const HAIR4_STYLES = Object.keys(STYLES);
export function hair4Geometry(style, color = '#5a3a22') {
  const g = mergeGeometries(STYLES[style](color).map(x => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'color'].includes(k)) x.deleteAttribute(k); return x; }));
  g.userData.v4 = true; return g;
}
export const hair4Triangles = g => g.index.count / 3;
