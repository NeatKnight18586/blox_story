// Classic-avatar hair accessories, built the way rigid hair accessories are made:
// low-poly chunky clumps with pointed tips over a closed scalp shell, merged into
// ONE watertight mesh (< 4k triangles) with ONE hand-painted strand texture
// (dark roots → lighter tips, streaks along each clump). Original designs that
// follow common hair archetypes; no catalog meshes are copied.
// Coordinates are head-pivot local: head x ±.625, z ±.55, y 0…1.16 (top).
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const HEAD_CENTER = new T.Vector3(0, .55, 0);

// Point on (or offset from) the oval head at angle a (degrees, 0 = front, + = character's left).
export function around(a, y, r = 1.05) {
  const t = a * Math.PI / 180;
  // Narrow toward the rolled top rim so crown points hug the scalp.
  const rim = y > .94 ? Math.sqrt(Math.max(0, 1 - ((y - .94) / .34) ** 2)) * .35 + .65 * Math.max(0, 1 - (y - .94) / .5) : 1;
  return [.625 * r * rim * Math.sin(t), y, .55 * r * rim * Math.cos(t)];
}

// One clump: a lofted low-poly prism (5 sides) along a curve, bulging in the
// middle and tapering to a point; root capped so the clump is watertight.
function clump(points, {w = .16, d = .08, tip = .04, bulge = .2, sides = 5, segments = 8, power = 1.5} = {}) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
  const pos = [], uv = [], idx = [], ring = sides + 1;
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
      const p = c.clone().addScaledVector(across, Math.cos(a) * w * env).addScaledVector(up, Math.sin(a) * d * env);
      pos.push(p.x, p.y, p.z); uv.push(j / sides, 1 - t * .96);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
    const a = i * ring + j, b = a + 1, c = a + ring, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  // Root and tip caps (fans) close the clump.
  for (const [i, flip] of [[0, true], [segments, false]]) {
    const center = curve.getPoint(i / segments), k = pos.length / 3;
    pos.push(center.x, center.y, center.z); uv.push(.5, i ? .04 : 1);
    for (let j = 0; j < sides; j++) { const a = i * ring + j, b = a + 1; flip ? idx.push(k, b, a) : idx.push(k, a, b); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// Closed scalp shell (the "hair cap" every hair accessory starts from).
// Centred high and flattened so its front edge stays above the brow line (~.88).
function scalp({y = 1.0, sx = .7, sy = .32, sz = .64, back = -.02} = {}) {
  const g = new T.SphereGeometry(1, 12, 8);
  g.scale(sx, sy, sz); g.translate(0, y, back); return g;
}

// Clump recipes -------------------------------------------------------------
// A strand that starts near the crown and falls over the scalp at angle a.
function drape(a, yEnd, {r = 1.08, flick = 0, crown = .28, mid = 1.02, ...o} = {}) {
  return clump([around(a, 1.2, crown), around(a, mid, 1.04), around(a + flick * .5, (mid + yEnd) / 2, r), around(a + flick, yEnd, r + .02)], o);
}
// A spike rising from the scalp at angle a, tilted up by elev degrees.
function spike(a, baseY, len, elev, o = {}) {
  const b = new T.Vector3(...around(a, baseY, .92));
  const out = b.clone().sub(HEAD_CENTER).setY(0).normalize();
  const e = elev * Math.PI / 180, dir = out.multiplyScalar(Math.cos(e)).add(new T.Vector3(0, Math.sin(e), 0)).normalize();
  const m = b.clone().addScaledVector(dir, len * .55).add(new T.Vector3(0, len * .08, 0)), tip = b.clone().addScaledVector(dir, len);
  return clump([b.toArray(), m.toArray(), tip.toArray()], {w: .17, d: .1, tip: .02, bulge: .1, segments: 5, ...o});
}
const range = (from, to, n) => Array.from({length: n}, (_, i) => from + (to - from) * i / (n - 1));

// A spike rooted at radius fraction r on the scalp (r<1 = closer to the crown centre).
function spikeFrom(a, baseY, r, len, elev, o = {}) {
  const b = new T.Vector3(...around(a, baseY, r));
  const out = new T.Vector3(b.x, 0, b.z).normalize();
  const e = elev * Math.PI / 180, dir = out.multiplyScalar(Math.cos(e)).add(new T.Vector3(0, Math.sin(e), 0)).normalize();
  const m = b.clone().addScaledVector(dir, len * .5).add(new T.Vector3(0, len * .06, 0)), tip = b.clone().addScaledVector(dir, len);
  return clump([b.toArray(), m.toArray(), tip.toArray()], {w: .17, d: .1, tip: .02, bulge: .12, segments: 5, ...o});
}
// The eight hair options (seven shapes; both buns share one mesh) ------------
const STYLES = {
  // Long straight hair with a centre part, falling behind the shoulders.
  long_straight(g) {
    g.push(scalp());
    for (const s of [-1, 1]) g.push(clump([[s * .02, 1.25, .2], around(s * 25, 1.1, .9), around(s * 70, .9, 1.06), around(s * 82, .45, 1.1)], {w: .2, d: .08, tip: .2}));
    for (const a of [...range(-110, -60, 3), ...range(60, 110, 3)]) g.push(drape(a, -.55, {r: 1.12, w: .19, d: .09, tip: .18, bulge: .1}));
    for (const a of range(125, 235, 7)) g.push(drape(a, -1.1, {r: 1.1, w: .2, d: .09, tip: .25, bulge: .08}));
    // Thin crown band (a woven-band accent common on long styles).
    for (const a of range(-80, 80, 9)) g.push(clump([around(a - 9, 1.08, 1.07), around(a + 9, 1.1, 1.07)], {w: .045, d: .045, tip: .9, bulge: .3, segments: 2}));
  },
  // Short spiky crop: crown spikes standing up, short spikes over the forehead.
  spiky(g) {
    g.push(scalp());
    // Spikes radiate from the crown in two staggered rings, not a single crown-like row.
    for (const a of range(0, 300, 6)) g.push(spikeFrom(a, 1.24, .35, .42, 58, {w: .2}));
    for (const a of range(15, 345, 12)) g.push(spikeFrom(a, 1.12, .78, .44 + .06 * Math.sin(a * .1), 30, {w: .19}));
    for (const a of range(-45, 45, 5)) g.push(spikeFrom(a, 1.0, .98, .3, 12, {w: .16}));
    for (const a of [...range(-160, -70, 4), ...range(70, 160, 4)]) g.push(drape(a, .72, {r: 1.06, w: .17, d: .07, tip: .1}));
  },
  // Messy shag: pointed clumps fanning from the crown, fringe falling over the brow line.
  messy_fringe(g) {
    g.push(scalp());
    // Fringe stops above the brow line so expressions stay readable.
    for (const a of range(-40, 40, 6)) g.push(drape(a, .93, {r: 1.12, flick: a * .2, w: .15, d: .08, tip: .03, crown: .2}));
    for (const a of [...range(-135, -55, 5), ...range(55, 135, 5)]) g.push(drape(a, .42, {r: 1.12, flick: a > 0 ? 10 : -10, w: .17, d: .08, tip: .03}));
    for (const a of range(150, 210, 4)) g.push(drape(a, .3, {r: 1.1, w: .18, d: .08, tip: .04}));
    // Top layer: short pointed clumps radiating from the crown give the shaggy dome.
    for (const a of range(0, 330, 12)) g.push(drape(a, 1.0, {r: 1.13, crown: .08, mid: 1.24, w: .19, d: .09, tip: .05, flick: 14}));
  },
  // Swept quiff: front clumps sweep up and back into one tall peak, short sides.
  swept_quiff(g) {
    g.push(scalp());
    for (const [i, x] of range(-.38, .38, 5).entries()) g.push(clump([[x, .98, .5], [x * .9, 1.32, .4], [x * .6 + .05, 1.55 - Math.abs(x) * .4, .05], [x * .4 + .12, 1.5 - Math.abs(x) * .5, -.3]], {w: .17, d: .12, tip: .03, bulge: .25}));
    g.push(clump([[.05, 1.1, .45], [.1, 1.5, .4], [.3, 1.85, .2]], {w: .2, d: .12, tip: .02, bulge: .2}));
    for (const a of [...range(-150, -60, 4), ...range(60, 150, 4)]) g.push(drape(a, .66, {r: 1.04, w: .17, d: .06, tip: .15}));
    for (const a of range(160, 200, 3)) g.push(drape(a, .45, {r: 1.08, flick: 8, w: .2, d: .07, tip: .05}));
  },
  // Side-swept hair gathered into a ponytail that curls forward over one shoulder.
  side_ponytail(g) {
    g.push(scalp());
    g.push(clump([[-.45, 1.22, .3], [.1, 1.12, .55], [.6, .9, .35]], {w: .24, d: .1, tip: .3}));
    for (const a of [...range(-150, -60, 4), ...range(60, 150, 4)]) g.push(drape(a, .75, {r: 1.05, w: .18, d: .07, tip: .4, bulge: .05}));
    g.push(clump([[.25, .85, -.62], [.75, .5, -.7], [1.0, 0, -.3], [.9, -.45, .25]], {w: .26, d: .2, tip: .03, bulge: .35, segments: 10}));
    g.push(clump([[.2, .8, -.65], [.6, .3, -.75], [.8, -.2, -.4]], {w: .2, d: .15, tip: .03, bulge: .3, segments: 8}));
    g.push(clump([[.16, .86, -.6], [.3, .86, -.68]], {w: .12, d: .12, tip: .9, segments: 2})); // tie
  },
  // Long straight hair with a deep side-swept fringe; front lengths fall past the chest.
  long_side_fringe(g) {
    g.push(scalp());
    g.push(clump([[.32, 1.25, .2], [.1, 1.1, .55], [-.4, .9, .52], [-.62, .7, .25]], {w: .24, d: .1, tip: .15}));
    g.push(clump([[.32, 1.25, .2], [.45, 1.05, .48], [.62, .8, .3]], {w: .2, d: .09, tip: .2}));
    for (const s of [-1, 1]) for (const z of [.18, .02]) g.push(clump([around(s * 60, 1.08, .9), around(s * 78, .7, 1.1), [s * .72, -.2, z], [s * .7, -1.25, z + .05]], {w: .17, d: .08, tip: .15, bulge: .05}));
    for (const a of range(115, 245, 7)) g.push(drape(a, -1.0, {r: 1.1, w: .2, d: .09, tip: .25, bulge: .06}));
  },
  // Voluminous crown with a high bun topped by two small peaks; side locks frame the face.
  high_bun(g) {
    g.push(scalp({sx: .74, sz: .67, sy: .34}));
    for (const a of range(0, 330, 12)) g.push(clump([around(a, 1.0, 1.1), around(a, 1.22, .7), [0, 1.38, -.05]], {w: .2, d: .1, tip: .4, bulge: .3}));
    const bun = new T.SphereGeometry(1, 10, 7); bun.scale(.38, .3, .36); bun.translate(0, 1.55, -.08); g.push(bun);
    for (const s of [-1, 1]) g.push(clump([[s * .14, 1.72, -.06], [s * .22, 1.9, -.04]], {w: .12, d: .1, tip: .05, segments: 3}));
    for (const s of [-1, 1]) g.push(clump([around(s * 55, 1.05, .95), around(s * 70, .8, 1.12), around(s * 66, .25, 1.14)], {w: .15, d: .08, tip: .15}));
    for (const a of range(110, 250, 6)) g.push(drape(a, .45, {r: 1.12, w: .2, d: .1, tip: .2, bulge: .2}));
  },
};

export const HAIR_OPTIONS = Object.freeze({
  long_red:       {shape: 'long_straight',    color: '#b8301f'},
  spiky_blonde:   {shape: 'spiky',            color: '#e3b43b'},
  messy_brown:    {shape: 'messy_fringe',     color: '#8a5528'},
  swept_blue:     {shape: 'swept_quiff',      color: '#2b3a8f'},
  ponytail_black: {shape: 'side_ponytail',    color: '#2a2a30'},
  long_blonde:    {shape: 'long_side_fringe', color: '#e9cf63'},
  bun_red:        {shape: 'high_bun',         color: '#c23a22'},
  bun_pink:       {shape: 'high_bun',         color: '#e4a3e0'},
});

// Hand-painted strand texture: root shade at the top (v=1), streaks running down the clumps.
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const textures = new Map();
function paintTexture(color) {
  if (typeof document === 'undefined') return null;
  if (textures.has(color)) return textures.get(color);
  const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), base = new T.Color(color), r = rng(7);
  g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) {
    const shade = base.clone().multiplyScalar(.62 + r() * .62), x = r() * W, w = 1 + r() * 5;
    g.strokeStyle = '#' + shade.getHexString(); g.globalAlpha = .35 + r() * .4; g.lineWidth = w;
    g.beginPath(); g.moveTo(x, r() * H * .3); g.bezierCurveTo(x + (r() - .5) * 20, H * .4, x + (r() - .5) * 20, H * .7, x + (r() - .5) * 14, H * (.75 + r() * .25)); g.stroke();
  }
  g.globalAlpha = 1;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)'); grad.addColorStop(.25, 'rgba(0,0,0,0.12)'); grad.addColorStop(.5, 'rgba(255,255,255,0.10)'); grad.addColorStop(.62, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.08)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.anisotropy = 4;
  textures.set(color, t); return t;
}

// Build one hair option as a single mesh (one geometry, one material).
export function makeHair(option, {color} = {}) {
  const o = HAIR_OPTIONS[option]; if (!o) throw new Error('Unknown hair option: ' + option);
  const parts = []; STYLES[o.shape](parts);
  const geometry = mergeGeometries(parts.map(p => p.index ? p : p.toNonIndexed()));
  for (const p of parts) p.dispose();
  geometry.computeBoundingBox();
  const tint = color ?? o.color, map = paintTexture(tint);
  const material = new T.MeshStandardMaterial({color: map ? 0xffffff : tint, map, roughness: .72});
  material.userData.authored = true;
  const mesh = new T.Mesh(geometry, material); mesh.name = `hair_${option}`; mesh.castShadow = mesh.receiveShadow = true;
  // HairAttachment: on the visible head surface at the crown, as accessory specs require.
  mesh.userData = {attachment: 'HairAttachment', attachmentPoint: [0, 1.16, 0], option, shape: o.shape, color: tint, triangles: geometry.index.count / 3};
  return mesh;
}
