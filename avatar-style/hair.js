// avatar-style/hair.js — chunky game hair (docs/V2_BRIEF.md §6.3). Each style is ONE merged,
// flat-shaded mesh on the head pivot: a cap shell (the head lathe ×1.06, cut at the hairline) plus
// faceted chunks (staggered wedge bangs, side locks, a stepped back slab, spikes, ponytail blocks,
// buns, cube-stack braids). Vertex colours give a darker underside and a lighter top. Rigid: it never
// moves relative to the head. Budgets: hero ≤ 300 triangles, background ≤ 60 (cap + 2 key chunks).
// The front hairline stays above y = 0.24 (head-centre coords) so eyes and brows are never covered.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HEAD, headProfile} from './body.js';

export const HAIR_STYLES = ['short_messy', 'side_swept', 'spiky', 'bowl', 'long_straight', 'ponytail', 'twin_buns', 'braids', 'curly_blocks', 'bald'];
export const HAIRLINE = .3, EYE_CLEAR = .24;
const D = HEAD.depth, R = HEAD.radius * 1.06;

// Faceted chunk: box with an optional tapered bottom (wedge), rotated and placed. Angles in degrees.
function chunk(w, h, d, {at = [0, 0, 0], rot = [0, 0, 0], taper = 0, tip = false} = {}) {
  const g = tip ? new T.ConeGeometry(w / 2, h, 4, 1) : new T.BoxGeometry(w, h, d);
  if (taper && !tip) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setX(i, p.getX(i) * (1 - taper)); p.setZ(i, p.getZ(i) * (1 - taper * .5)); } }
  if (tip) g.scale(1, 1, d / w);
  g.rotateX(rot[0] * Math.PI / 180); g.rotateY(rot[1] * Math.PI / 180); g.rotateZ(rot[2] * Math.PI / 180); g.translate(...at);
  return g;
}
// Cap shell: the upper head lathe, 6 % larger, from the hairline to the crown.
function cap(segments, hairline = HAIRLINE) {
  const prof = headProfile(segments > 8 ? 2 : 0).filter(v => v.y >= hairline - 1e-6);
  prof.unshift(new T.Vector2(HEAD.radius, hairline));
  const g = new T.LatheGeometry(prof.map(v => new T.Vector2(v.x * 1.06, v.y * 1.04 + .02)), segments);
  g.scale(1, 1, D); return g;
}
const ball = (r, at) => { const g = new T.IcosahedronGeometry(r, 0); g.translate(...at); return g; };

// Chunk lists per style; entries flagged `bg` survive in the background variant.
const ZF = R * D;                                  // front surface z of the cap
const STYLES = {
  short_messy: () => [
    {g: chunk(1.34, .34, .5, {at: [0, .06, -.36], taper: .1}), bg: true},                       // back slab
    {g: chunk(1.1, .18, .4, {at: [0, -.17, -.4], taper: .25})},                                   // stepped bottom edge
    ...[-.36, -.15, .06, .27].map((x, i) => ({g: chunk(.3, .22, .22, {at: [x, .47 - (i % 2) * .04, ZF - .08], rot: [-18, 0, (i - 1.5) * 9], taper: .45}), bg: i === 1})),
    ...[[-.3, .2], [0, .26], [.28, .18], [-.1, -.1]].map(([x, z], i) => ({g: chunk(.32, .2, .3, {at: [x, .66, z], rot: [i * 11 - 15, i * 25, (i - 1.5) * 14], taper: .3})})),
    {g: chunk(.2, .42, .5, {at: [-.66, .22, -.05], taper: .3}), bg: true}, {g: chunk(.2, .42, .5, {at: [.66, .22, -.05], taper: .3})},
  ],
  side_swept: () => [
    {g: chunk(1.34, .5, .5, {at: [0, .02, -.36], taper: .15}), bg: true},
    {g: chunk(1.05, .22, .3, {at: [.08, .44, ZF - .1], rot: [-15, 0, -14], taper: .3}), bg: true},
    {g: chunk(.5, .2, .3, {at: [.42, .36, ZF - .14], rot: [-10, 10, -24], taper: .5})},
    {g: chunk(.22, .5, .46, {at: [-.66, .2, -.04], taper: .25}), bg: true}, {g: chunk(.22, .44, .46, {at: [.66, .22, -.04], taper: .25})},
    {g: chunk(.8, .16, .8, {at: [-.12, .66, 0], rot: [0, 0, 8]})},
  ],
  spiky: () => [
    {g: chunk(1.3, .3, .46, {at: [0, .12, -.38], taper: .1}), bg: true},
    ...[[0, .84, 0, 0, 0], [-.32, .76, .12, 12, 26], [.32, .76, .12, 12, -26], [-.24, .78, -.26, -22, 20], [.24, .78, -.26, -22, -20], [0, .74, .34, 32, 0], [-.48, .58, .2, 18, 46], [.48, .58, .2, 18, -46]]
      .map(([x, y, z, rx, rz], i) => ({g: chunk(.34, .46, .34, {at: [x, y, z], rot: [rx, 45, rz], tip: true}), bg: i < 2})),
  ],
  bowl: () => [
    ...[[12, false], [6, true]].map(([n, bgOnly]) => ({g: (() => { const g = new T.CylinderGeometry(R + .04, R + .07, .2, n, 1, true); g.scale(1, 1, D); g.translate(0, HAIRLINE + .08, 0); return g; })(), bgOnly})),
    {g: chunk(1.1, .14, .16, {at: [0, HAIRLINE + .02, ZF - .02]}), bg: true},
    {g: chunk(1.3, .5, .4, {at: [0, .1, -.4], taper: .05})},
  ],
  long_straight: () => [
    {g: chunk(1.36, 1.5, .3, {at: [0, -.32, -.42], taper: -.08}), bg: true},                     // long back curtain over the shoulders
    {g: chunk(.24, 1.2, .5, {at: [-.7, -.18, -.06], taper: -.15}), bg: true},                    // side locks beside the face, not over it
    {g: chunk(.24, 1.2, .5, {at: [.7, -.18, -.06], taper: -.15})},
    ...[-.3, -.1, .1, .3].map((x, i) => ({g: chunk(.26, .2, .2, {at: [x, .42 - (i % 2) * .04, ZF - .08], rot: [-16, 0, (i - 1.5) * 7], taper: .4})})),
    {g: chunk(1.0, .2, .28, {at: [0, -1.06, -.42], taper: .3})},                                  // stepped bottom edge
  ],
  ponytail: () => [
    {g: chunk(1.3, .42, .4, {at: [0, .12, -.38], taper: .1}), bg: true},
    {g: chunk(.3, .26, .26, {at: [0, .36, -.66]})},                                               // tie
    {g: chunk(.4, .5, .36, {at: [0, .08, -.8], rot: [-14, 0, 0], taper: .2}), bg: true},
    {g: chunk(.32, .46, .3, {at: [0, -.34, -.86], rot: [-6, 0, 0], taper: .35}), bg: true},
    {g: chunk(.22, .3, .22, {at: [0, -.68, -.88], taper: .5})},
    ...[-.24, 0, .24].map((x, i) => ({g: chunk(.3, .18, .18, {at: [x, .44, ZF - .08], rot: [-20, 0, (i - 1) * 10], taper: .4})})),
  ],
  twin_buns: () => [
    {g: chunk(1.3, .36, .4, {at: [0, .1, -.38], taper: .1}), bg: true},
    {g: ball(.27, [-.46, .66, -.06])}, {g: ball(.27, [.46, .66, -.06])},
    {g: chunk(.42, .42, .42, {at: [-.46, .66, -.06], rot: [0, 45, 0]}), bgOnly: true}, {g: chunk(.42, .42, .42, {at: [.46, .66, -.06], rot: [0, 45, 0]}), bgOnly: true},
    ...[-.22, 0, .22].map((x, i) => ({g: chunk(.26, .16, .18, {at: [x, .44, ZF - .08], rot: [-20, 0, (i - 1) * 12], taper: .4})})),
  ],
  braids: () => [
    {g: chunk(1.3, .5, .4, {at: [0, .06, -.38], taper: .1}), bg: true},
    ...[-1, 1].flatMap(s => [0, 1, 2, 3].map(k => ({g: chunk(.24 - k * .02, .24, .24 - k * .02, {at: [s * .66, -.06 - k * .26, .02], rot: [0, 45, 0]}), bg: k === 0}))),
    ...[-.22, .02, .24].map((x, i) => ({g: chunk(.28, .18, .18, {at: [x, .43, ZF - .08], rot: [-18, 0, (i - 1) * 9], taper: .4})})),
  ],
  curly_blocks: () => [
    {g: chunk(1.34, .5, .44, {at: [0, .05, -.36], taper: 0}), bg: true},
    ...Array.from({length: 13}, (_, i) => {
      const a = i / 13 * Math.PI * 2, top = i % 3 === 0;
      return {g: chunk(.3, .3, .3, {at: [Math.sin(a) * .5, top ? .72 : .5, Math.cos(a) * .42 * (Math.cos(a) > .3 ? .85 : 1) - (Math.cos(a) > .3 ? .02 : 0)], rot: [i * 17, i * 31, i * 11]}), bg: i < 2};
    }),
  ],
  bald: () => [],
};

function colourise(g, color) {
  const c = new T.Color(color), lo = c.clone().multiplyScalar(.62), hi = c.clone().lerp(new T.Color('#ffffff'), .18);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), t = new T.Color();
  let y0 = Infinity, y1 = -Infinity; for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
  for (let i = 0; i < p.count; i++) { const k = (p.getY(i) - y0) / Math.max(1e-6, y1 - y0); t.copy(lo).lerp(c, Math.min(1, k * 1.6)).lerp(hi, Math.max(0, k - .6) * 2.2); col.set([t.r, t.g, t.b], i * 3); }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
}

let hairMat = null;
const hairMaterial = () => hairMat ??= new T.MeshPhongMaterial({vertexColors: true, flatShading: true, shininess: 22, specular: '#2a2a2a'});
const cache = new Map();
// Geometry in head-centre coordinates (the head mesh sits .58 above the head pivot).
export function hairGeometry(style, tier = 'hero', color = '#5a3a22') {
  if (!STYLES[style]) throw Error('unknown hair style ' + style);
  const key = `${style}:${tier}:${color}`; if (cache.has(key)) return cache.get(key);
  if (style === 'bald') { cache.set(key, null); return null; }
  const list = STYLES[style]().filter(c => tier === 'hero' ? !c.bgOnly : (c.bgOnly || c.bg));
  if (tier !== 'hero') { list.sort((a, b) => (b.bgOnly ? 1 : 0) - (a.bgOnly ? 1 : 0)); list.splice(2); }   // cap + 2 key chunks
  const parts = [cap(tier === 'hero' ? 12 : 6)].concat(list.map(c => c.g));
  const g = mergeGeometries(parts.map(x => { const n = x.index ? x.toNonIndexed() : x; for (const k of Object.keys(n.attributes)) if (!['position', 'normal'].includes(k)) n.deleteAttribute(k); return n; }));
  g.computeVertexNormals(); colourise(g, color); g.computeBoundingBox();
  cache.set(key, g); return g;
}
export function attachHair(actor, style, color) {
  if (actor.hair) actor.hair.removeFromParent();
  const g = hairGeometry(style, actor.tier, color); actor.hairStyle = style;
  if (!g) { actor.hair = null; return actor; }
  const m = new T.Mesh(g, hairMaterial()); m.name = 'hair'; m.position.y = HEAD.centre; m.castShadow = true;
  actor.pivots.head.add(m); actor.hair = m; return actor;
}

// ---- Amendment A4: hair v3 (opt-in). attachHair3(actor, style, colour, {streak}) — v2 presets above stay for "Nobody".
import {hair3Geometry, HAIR3_STYLES} from './hair3.js';
export {HAIR3_STYLES};
let hair3Mat = null;   // double-sided: thin locks show both faces
const hair3Material = () => hair3Mat ??= new T.MeshPhongMaterial({vertexColors: true, flatShading: true, shininess: 18, specular: '#1c1c1c', side: T.DoubleSide});
export function attachHair3(actor, style, color, opts = {}) {
  if (actor.hair) actor.hair.removeFromParent();
  const g = hair3Geometry(style, actor.tier, color, opts); actor.hairStyle = style;
  if (!g) { actor.hair = null; return actor; }
  const m = new T.Mesh(g, hair3Material()); m.name = 'hair'; m.position.y = HEAD.centre; m.castShadow = false;   // fringe shadows streak the face
  actor.pivots.head.add(m); actor.hair = m; return actor;
}
