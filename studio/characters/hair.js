// Classic-avatar hair accessories, built the way rigid hair accessories are made:
// a few BROAD, flat, layered clumps over a closed scalp shell that hugs the
// blocky head, merged into ONE watertight mesh (< 4k triangles) with ONE painted
// texture. Shading is carried by paint, not geometry: baked vertex AO (darker
// roots and under-layers) plus a painted highlight band and strand streaks.
// Masculine cuts: compact, tight tapered sides, volume on top, clean fringe.
// Feminine cuts: crown volume, long soft locks, face-framing pieces over the shoulders.
// Original designs on common archetypes; no catalog meshes are copied.
// Head-pivot coordinates: head x ±.625, z ±.55, y 0…1.16; torso below y 0 spans x ±1, z ±.5.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const HEAD_CENTER = new T.Vector3(0, .55, 0);

// Point on (or offset from) the oval head at angle a (degrees, 0 = front, + = character's left).
export function around(a, y, r = 1.05) {
  const t = a * Math.PI / 180;
  const rim = y > .94 ? Math.sqrt(Math.max(0, 1 - ((y - .94) / .34) ** 2)) * .35 + .65 * Math.max(0, 1 - (y - .94) / .5) : 1;
  return [.625 * r * rim * Math.sin(t), y, .55 * r * rim * Math.cos(t)];
}

// Baked ambient occlusion: shade = layer depth × root darkening (vertex colours).
function shadeAttr(count, fn) { const c = new Float32Array(count * 3); for (let i = 0; i < count; i++) { const v = fn(i); c.set([v, v, v], i * 3); } return new T.BufferAttribute(c, 3); }

// Front locks that rest on the shoulders. Legacy hair merges them like any clump (same order,
// same mesh); with {locks: true} each becomes its own pivoted piece that settleHair() keeps
// hanging with the body when the head turns, so a lock never swings across the face.
function lock(g, geo, pivot) { if (g.locks) g.locks.push([geo, pivot]); else g.push(geo); }

// One clump: a flat lofted prism along a curve, bulging mid-length, tapering to a
// soft (tip≈.3) or sharp (tip≈.03) end; both ends capped → watertight.
function clump(points, {w = .24, d = .08, tip = .1, bulge = .18, sides = 6, segments = 8, power = 1.6, shade = 1, root = .3} = {}) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
  const pos = [], uv = [], ts = [], idx = [], ring = sides + 1;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, c = curve.getPoint(t), tan = curve.getTangent(t).normalize();
    const out = c.clone().sub(HEAD_CENTER).normalize();
    let across = new T.Vector3().crossVectors(tan, out);
    if (across.lengthSq() < 1e-4) across.set(1, 0, 0);
    across.normalize();
    const up = new T.Vector3().crossVectors(across, tan).normalize();
    const env = (1 + bulge * Math.sin(Math.PI * t)) * (1 - (1 - tip) * Math.pow(t, power));
    for (let j = 0; j <= sides; j++) {
      const a = 2 * Math.PI * j / sides + Math.PI / sides;
      // Flattened lens cross-section: wide ribbon, slightly domed on the outside.
      const p = c.clone().addScaledVector(across, Math.cos(a) * w * env).addScaledVector(up, Math.sin(a) * d * env);
      pos.push(p.x, p.y, p.z); uv.push(j / sides, 1 - t * .96); ts.push(t);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
    const a = i * ring + j, b = a + 1, c = a + ring, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  for (const [i, flip] of [[0, true], [segments, false]]) {
    const center = curve.getPoint(i / segments), k = pos.length / 3;
    pos.push(center.x, center.y, center.z); uv.push(.5, i ? .04 : 1); ts.push(i / segments);
    for (let j = 0; j < sides; j++) { const a = i * ring + j, b = a + 1; flip ? idx.push(k, b, a) : idx.push(k, a, b); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', shadeAttr(ts.length, i => shade * (1 - root * Math.max(0, 1 - ts[i] / .35))));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// Closed shells (scalp cap, buns): low, flat dome that hugs the cylinder head.
function shell({x = 0, y = 1.02, z = -.03, sx = .67, sy = .27, sz = .61, shade = .72, ws = 12, hs = 8} = {}) {
  const g = new T.SphereGeometry(1, ws, hs); g.scale(sx, sy, sz); g.translate(x, y, z);
  g.setAttribute('color', shadeAttr(g.attributes.position.count, i => shade * (.85 + .15 * Math.max(0, (g.attributes.position.getY(i) - y) / sy))));
  return g;
}
const range = (from, to, n) => n === 1 ? [from] : Array.from({length: n}, (_, i) => from + (to - from) * i / (n - 1));
const V = (...p) => p;

// A clump that starts near the crown and falls over the scalp at angle a.
function drape(a, yEnd, {r = 1.06, crown = .3, mid = 1.0, flick = 0, ...o} = {}) {
  return clump([around(a, 1.2, crown), around(a, mid, 1.04), around(a + flick * .5, (mid + yEnd) / 2, r), around(a + flick, yEnd, r + .02)], o);
}
// A broad spike from a scalp point, aimed outward and up by elev degrees.
function spike(base, len, elev, yaw, o = {}) {
  const b = new T.Vector3(...base), y = yaw * Math.PI / 180, e = elev * Math.PI / 180;
  const dir = new T.Vector3(Math.sin(y) * Math.cos(e), Math.sin(e), Math.cos(y) * Math.cos(e));
  const mid = b.clone().addScaledVector(dir, len * .5).add(new T.Vector3(0, len * .05, 0));
  return clump([b.toArray(), mid.toArray(), b.clone().addScaledVector(dir, len).toArray()], {w: .25, d: .12, tip: .03, bulge: .15, segments: 5, root: .2, ...o});
}
// Tight masculine sides and nape: short, flat, close to the head.
function shortSides(g, {front = 58, yEnd = .66, napeEnd = .52} = {}) {
  for (const s of [-1, 1]) {
    for (const a of range(front, 145, 4)) g.push(drape(s * a, yEnd, {r: 1.03, w: .25, d: .055, tip: .3, shade: .82, crown: .45}));
    g.push(clump([around(s * 86, .95, 1.02), around(s * 88, .72, 1.025)], {w: .12, d: .045, tip: .55, segments: 3, shade: .8, root: .1})); // sideburn
  }
  for (const a of range(150, 210, 4)) g.push(drape(a, napeEnd, {r: 1.04, w: .27, d: .06, tip: .25, shade: .78, crown: .4}));
}

const STYLES = {
  // MASCULINE — swept messy cut: broad fringe clumps swept to one side, lifting at the tips.
  messy_fringe(g) {
    g.push(shell());
    shortSides(g);
    for (const [i, x] of range(-.42, .42, 6).entries()) {
      const lift = i % 2 ? .04 : 0;
      g.push(clump([V(x * .4, 1.25, -.3), V(x * .85, 1.32, .02), V(x - .06, 1.2, .4), V(x - .17, .99 + lift, .62)], {w: .23, d: .1, tip: .12, bulge: .25, shade: i % 2 ? .95 : 1}));
    }
    for (const x of [-.22, .05, .3]) g.push(clump([V(x, 1.24, -.05), V(x + .02, 1.4, -.25), V(x + .06, 1.34, -.48)], {w: .22, d: .1, tip: .06, shade: .92}));
  },
  // MASCULINE — spiky: a few broad spikes radiating up/back, short tight sides.
  spiky(g) {
    g.push(shell({sy: .29}));
    shortSides(g, {front: 62});
    // Low, swept-back spikes: front ones lift off the hairline, the rest lie back over the crown.
    for (const [i, x] of range(-.36, .36, 4).entries()) g.push(clump([V(x, 1.0, .52), V(x * .9, 1.26, .38), V(x * 1.1, 1.42, .12 - (i % 2) * .08)], {w: .22, d: .11, tip: .03, bulge: .2, segments: 5, root: .2}));
    for (const [i, x] of range(-.42, .42, 5).entries()) g.push(clump([V(x * .8, 1.22, .15), V(x, 1.36, -.12), V(x * 1.15, 1.38 - Math.abs(x) * .2, -.45)], {w: .24, d: .11, tip: .03, bulge: .2, segments: 5, root: .2, shade: i % 2 ? .9 : .97}));
    for (const yaw of [-125, 125, 180]) g.push(spike(around(yaw, 1.12, .7), .32, 20, yaw, {shade: .86}));
  },
  // MASCULINE — swept quiff: front volume sweeping up and back into one peak.
  swept_quiff(g) {
    g.push(shell({sy: .28}));
    shortSides(g, {front: 62, yEnd: .64});
    for (const [i, x] of range(-.36, .36, 4).entries()) g.push(clump([V(x, .98, .5), V(x * .9, 1.34, .4), V(x * .6 + .05, 1.52 - Math.abs(x) * .35, .05), V(x * .4 + .1, 1.44 - Math.abs(x) * .4, -.32)], {w: .24, d: .12, tip: .05, bulge: .25, shade: i % 2 ? .94 : 1}));
    g.push(clump([V(.05, 1.12, .45), V(.12, 1.52, .38), V(.32, 1.8, .16)], {w: .24, d: .12, tip: .03, bulge: .2}));
  },
  // FEMININE — long, centre part, face-framing locks resting in front of the shoulders.
  long_straight(g) {
    g.push(shell({sx: .69, sz: .63, sy: .3}));
    for (const s of [-1, 1]) {
      for (const [k, a] of [30, 58, 86].entries()) g.push(clump([V(s * .03, 1.28, .12 - k * .1), around(s * a, 1.12, .8), around(s * (a + 6), .8, 1.1), around(s * (a + 10), .35, 1.14)], {w: .27, d: .09, tip: .4, bulge: .15, shade: 1 - k * .05}));
      for (const [k, z] of [.6, .56].entries()) lock(g, clump([around(s * 50, 1.05, 1.02), V(s * .68, .45, .44), V(s * (.68 - k * .12), -.1, z), V(s * (.62 - k * .12), -.85 + k * .2, z + .02)], {w: .27, d: .09, tip: .45, bulge: .12, shade: .95 - k * .06}), V(s * .66, .62, .44));
    }
    for (const [k, x] of range(-.5, .5, 5).entries()) g.push(clump([V(x * .3, 1.24, -.22), V(x * 1.05, .95, -.62), V(x * 1.12, .2, -.7), V(x * 1.08, -1.05, -.64)], {w: .28, d: .09, tip: .4, bulge: .1, shade: .84 + (k % 2) * .06}));
  },
  // FEMININE — long with a deep side-swept fringe.
  long_side_fringe(g) {
    g.push(shell({sx: .69, sz: .63, sy: .3}));
    g.push(clump([V(.3, 1.27, .18), V(.08, 1.16, .55), V(-.38, .98, .58), V(-.64, .78, .3)], {w: .3, d: .1, tip: .3, bulge: .2, shade: 1}));
    g.push(clump([V(.3, 1.27, .18), V(.48, 1.08, .48), V(.66, .82, .34)], {w: .24, d: .09, tip: .35, shade: .95}));
    for (const s of [-1, 1]) {
      for (const a of [62, 88]) g.push(clump([around(s * a, 1.16, .8), around(s * a, .8, 1.1), around(s * (a + 8), .3, 1.14)], {w: .26, d: .09, tip: .4, shade: .92}));
      for (const [k, z] of [.6, .56].entries()) lock(g, clump([around(s * 48, 1.0, 1.04), V(s * .67, .4, .44), V(s * (.66 - k * .1), -.15, z), V(s * (.6 - k * .1), -1.05 + k * .25, z + .02)], {w: .2, d: .08, tip: .3, bulge: .1, shade: .96 - k * .06}), V(s * .66, .6, .44));
    }
    for (const [k, x] of range(-.5, .5, 5).entries()) g.push(clump([V(x * .3, 1.24, -.22), V(x * 1.05, .95, -.62), V(x * 1.12, .2, -.7), V(x * 1.08, -1.0, -.64)], {w: .28, d: .09, tip: .4, shade: .84 + (k % 2) * .06}));
  },
  // FEMININE — sleek, swept back into a high ponytail; soft wisps frame the face.
  side_ponytail(g) {
    g.push(shell({sy: .28}));
    for (const [i, x] of range(-.42, .42, 5).entries()) g.push(clump([V(x, .97, .56), V(x * .95, 1.27, .16), V(x * .5, 1.18, -.42), V(x * .08, 1.05, -.62)], {w: .24, d: .07, tip: .6, bulge: .1, shade: i % 2 ? .93 : 1}));
    for (const s of [-1, 1]) {
      g.push(clump([around(s * 70, .98, 1.03), around(s * 110, 1.0, 1.05), V(s * .1, 1.05, -.63)], {w: .26, d: .07, tip: .6, shade: .88}));
      g.push(clump([around(s * 64, 1.0, 1.04), around(s * 70, .7, 1.1), around(s * 74, .36, 1.12)], {w: .11, d: .05, tip: .3, shade: .95})); // face-framing wisp
    }
    g.push(shell({x: 0, y: 1.06, z: -.66, sx: .16, sy: .14, sz: .12, shade: .7, ws: 8, hs: 6})); // hair tie
    g.push(clump([V(0, 1.08, -.7), V(0, 1.14, -1.02), V(.04, .55, -1.05), V(.08, -.15, -.78)], {w: .3, d: .22, tip: .2, bulge: .35, segments: 10, shade: .96}));
    g.push(clump([V(.02, 1.04, -.72), V(-.05, .8, -.98), V(-.08, .2, -.92)], {w: .22, d: .16, tip: .2, bulge: .3, shade: .86}));
  },
  // FEMININE — smooth crown into a high bun with two small knot points; long side locks.
  high_bun(g) {
    g.push(shell({sx: .69, sz: .63, sy: .3}));
    for (const [i, a] of range(0, 330, 12).entries()) g.push(clump([around(a, .96, 1.07), around(a, 1.22, .72), V(0, 1.36, -.06)], {w: .27, d: .08, tip: .5, bulge: .25, shade: i % 2 ? .94 : 1}));
    g.push(shell({x: 0, y: 1.55, z: -.08, sx: .37, sy: .29, sz: .35, shade: 1, ws: 10, hs: 7}));
    for (const s of [-1, 1]) g.push(clump([V(s * .13, 1.74, -.06), V(s * .21, 1.9, -.04)], {w: .12, d: .1, tip: .08, segments: 3, shade: .95}));
    for (const s of [-1, 1]) g.push(clump([around(s * 52, 1.02, 1.0), around(s * 66, .78, 1.12), around(s * 64, .3, 1.15)], {w: .15, d: .07, tip: .3, shade: .96}));
    for (const [i, a] of range(120, 240, 5).entries()) g.push(drape(a, .5 - (i % 2) * .12, {r: 1.1, w: .32, d: .09, tip: .55, bulge: .2, shade: .84}));
  },
};

export const HAIR_OPTIONS = Object.freeze({
  long_red:       {shape: 'long_straight',    color: '#b8301f', style: 'feminine'},
  spiky_blonde:   {shape: 'spiky',            color: '#e3b43b', style: 'masculine'},
  messy_brown:    {shape: 'messy_fringe',     color: '#8a5528', style: 'masculine'},
  swept_blue:     {shape: 'swept_quiff',      color: '#2b3a8f', style: 'masculine'},
  ponytail_black: {shape: 'side_ponytail',    color: '#2a2a30', style: 'feminine'},
  long_blonde:    {shape: 'long_side_fringe', color: '#e9cf63', style: 'feminine'},
  bun_red:        {shape: 'high_bun',         color: '#c23a22', style: 'feminine'},
  bun_pink:       {shape: 'high_bun',         color: '#e4a3e0', style: 'feminine'},
});

// Painted texture (root at top, v=1): base, fine full-length strands, a soft
// highlight band in the upper third, slightly lighter tips. AO lives in vertex colours.
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const textures = new Map();
function paintTexture(color) {
  if (typeof document === 'undefined') return null;
  if (textures.has(color)) return textures.get(color);
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), base = new T.Color(color), r = rng(11);
  g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, W, H);
  const streak = (light, n, alpha) => { for (let i = 0; i < n; i++) {
    const tone = light ? base.clone().lerp(new T.Color(1, 1, 1), .18 + r() * .2) : base.clone().multiplyScalar(.6 + r() * .2);
    const x = r() * W; g.strokeStyle = '#' + tone.getHexString(); g.globalAlpha = alpha * (.5 + r() * .5); g.lineWidth = 1 + r() * 3;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 10, H * .35, x + (r() - .5) * 10, H * .7, x + (r() - .5) * 8, H); g.stroke();
  } };
  streak(false, 90, .55); streak(true, 60, .45);
  g.globalAlpha = 1;
  const band = g.createLinearGradient(0, H * .16, 0, H * .46);
  band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(.5, 'rgba(255,255,255,0.28)'); band.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = band; g.fillRect(0, 0, W, H);
  g.globalAlpha = .5; streak(true, 40, .6); g.globalAlpha = 1; // broken highlight strands across the band
  const tips = g.createLinearGradient(0, H * .75, 0, H); tips.addColorStop(0, 'rgba(255,255,255,0)'); tips.addColorStop(1, 'rgba(255,255,255,0.12)');
  g.fillStyle = tips; g.fillRect(0, 0, W, H);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.anisotropy = 4;
  textures.set(color, t); return t;
}

// Build one hair option as a single mesh (one geometry, one material).
export function makeHair(option, {color, locks = false} = {}) {
  const o = HAIR_OPTIONS[option]; if (!o) throw new Error('Unknown hair option: ' + option);
  const parts = []; if (locks) parts.locks = []; STYLES[o.shape](parts);
  const geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  geometry.computeBoundingBox();
  const tint = color ?? o.color, map = paintTexture(tint);
  const material = new T.MeshStandardMaterial({color: map ? 0xffffff : tint, map, vertexColors: true, roughness: .6});
  material.userData.authored = true;
  const mesh = new T.Mesh(geometry, material); mesh.name = `hair_${option}`; mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData = {attachment: 'HairAttachment', attachmentPoint: [0, 1.16, 0], option, shape: o.shape, style: o.style, color: tint, triangles: geometry.index.count / 3};
  mesh.userData.locks = [];
  for (const [geo, pivot] of parts.locks ?? []) {
    geo.translate(-pivot[0], -pivot[1], -pivot[2]);
    const pv = new T.Group(); pv.name = 'hair_lock_pivot'; pv.position.set(...pivot);
    const m = new T.Mesh(geo, material); m.name = 'hair_lock'; m.castShadow = m.receiveShadow = true;
    pv.add(m); mesh.add(pv); mesh.userData.locks.push(pv);
  }
  return mesh;
}

// Keep front locks hanging with the body: undo most of the head's own turn/tilt on each
// lock pivot (they still ride on the head, so roots stay attached). follow = share of the
// head motion the lock keeps (a little, so it reads as soft hair rather than glued on).
const _q = new T.Quaternion(), _id = new T.Quaternion();
export function settleHair(avatar, follow = .15) {
  const locks = avatar.hair?.userData.locks; if (!locks?.length) return;
  _q.copy(avatar.pivots.head.quaternion).invert().slerp(_id, follow);
  for (const pv of locks) pv.quaternion.copy(_q);
}
