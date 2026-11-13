// parts/landform.js — landform rigs (Amendment A4 B2): part of the terrain that turns out to be a character (the
// mountain giant of card 11). One body mound + head with an eye under a rock eyelid, a ridge-shoulder, an arm ending in a
// hand, a leg ending in a foot. Every piece is displaced low-poly rock that carries the terrain's `splat` attribute, so it
// takes the SAME splat material as the ground (grass on top, rock on the sides, snow high up) and reads as part of the land.
// Named pivots: shoulder, eyelid, arm, hand, leg, foot. ≤ 12,000 triangles. Poses are pure functions of t.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {splatWeights} from './terrain.js';

export const LANDFORM_STATES = ['sleep', 'stir', 'open', 'reach', 'rise'];
export const LANDFORM_MAX_TRIS = 12000;
const h3 = (x, y, z, s) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s * 4.37) * 43758.5453; return v - Math.floor(v); };

// A displaced rock lump: icosahedron of `detail` (20·(detail+1)² triangles), scaled, with seeded radial bumps; flat-shaded (non-indexed).
export function rockLump(r, scale = [1, 1, 1], {detail = 2, seed = 1, bump = .16} = {}) {
  const g0 = new T.IcosahedronGeometry(r, detail), g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position;
  const cache = new Map();   // the same vertex position gets the same bump on every face that shares it (no cracks)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    if (!cache.has(key)) cache.set(key, 1 + (h3(Math.round(x * 7), Math.round(y * 7), Math.round(z * 7), seed) - .5) * 2 * bump);
    const k = cache.get(key); p.setXYZ(i, x * k * scale[0], y * k * scale[1], z * k * scale[2]);
  }
  g.computeVertexNormals(); return g;
}
// Give a geometry the terrain splat attribute from its own face normals and WORLD heights (worldY = local y + y0).
export function splatify(g, y0 = 0, splat = {}) {
  const p = g.attributes.position, n = g.attributes.normal, w = new Float32Array(p.count * 3), uv = new Float32Array(p.count * 2), tile = splat.tile ?? 8;
  for (let i = 0; i < p.count; i++) { w.set(splatWeights(p.getY(i) + y0, n.getY(i), splat), i * 3); const ax = Math.abs(n.getX(i)), az = Math.abs(n.getZ(i)); uv[i * 2] = (ax > az ? p.getZ(i) : p.getX(i)) / tile; uv[i * 2 + 1] = (Math.abs(n.getY(i)) > .6 ? p.getZ(i) : p.getY(i)) / tile; }
  g.setAttribute('splat', new T.BufferAttribute(w, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); return g;
}
const piece = (geos) => mergeGeometries(geos.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k); return g; }));
const at = (g, x, y, z, rot = [0, 0, 0]) => { g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(x, y, z); return g; };

// Build the giant. Local frame: +z = the way it faces, y = up, origin at the ground under its chest. Size ≈ 90 × 55 × 70.
export function landformRig({material, eyeMaterial = null, seed = 7, splat = {}, groundY = 0, scale = 1, name = 'landform'} = {}) {
  const root = new T.Group(); root.name = name; const pivots = {}, meshes = [];
  const mesh = (geo, parent, y0) => { splatify(geo, y0 * scale + groundY, splat); const m = new T.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; parent.add(m); meshes.push(m); return m; };
  const pivot = (nm, parent, pos) => { const g = new T.Group(); g.name = nm; g.position.set(...pos); parent.add(g); pivots[nm] = g; return g; };
  // body: a long ridge of three mounds
  mesh(piece([rockLump(30, [1.25, .6, 1], {detail: 12, seed, bump: .045}), at(rockLump(22, [1.1, .7, 1], {detail: 6, seed: seed + 1, bump: .1}), -30, -4, -18), at(rockLump(18, [1, .65, 1], {detail: 6, seed: seed + 2, bump: .1}), 26, -6, -22)]), root, 0);
  // head with the eye socket on its front; eyelid pivot sits on the eye
  const head = pivot('head', root, [0, 18, 26]);
  mesh(piece([rockLump(13, [1.15, .85, 1], {detail: 8, seed: seed + 3, bump: .09}), at(rockLump(5, [1.6, .5, .8], {detail: 1, seed: seed + 4}), 0, 6, 6)]), head, 18);   // brow
  const eye = new T.Mesh(new T.SphereGeometry(4.6, 18, 12), eyeMaterial ?? new T.MeshPhongMaterial({color: '#ffe9a8', emissive: '#ffb02e', emissiveIntensity: .9}));
  eye.position.set(0, 2.5, 10.4); eye.name = 'eye'; head.add(eye); meshes.push(eye);
  const lid = pivot('eyelid', head, [0, 2.5, 10.4]);   // rotation.x: 0 = closed (shell over the eye), −1.4 = open (rolled up)
  const shell = new T.SphereGeometry(5.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * .55).rotateX(Math.PI / 2 + .1); mesh(shell, lid, 20.5);
  // shoulder ridge + arm + hand (right side, +x)
  const shoulder = pivot('shoulder', root, [30, 14, 6]);
  mesh(rockLump(14, [1.3, .7, 1], {detail: 6, seed: seed + 5, bump: .1}), shoulder, 14);
  const arm = pivot('arm', shoulder, [10, -4, 6]);
  mesh(at(rockLump(7, [.8, 1.8, .8], {detail: 3, seed: seed + 6}), 0, -10, 0), arm, 4);
  const hand = pivot('hand', arm, [0, -20, 0]);
  const fingers = [-3, -1, 1, 3].map((x, k) => at(new T.BoxGeometry(1.6, 5.2 + (k % 2), 1.8).toNonIndexed(), x, -3.4, 1.2, [.25, 0, 0]));
  mesh(piece([rockLump(4.4, [1.3, .7, 1], {detail: 3, seed: seed + 7}), ...fingers, at(new T.BoxGeometry(1.8, 4, 1.8).toNonIndexed(), -4.6, -1.2, 2, [.3, 0, .6])]), hand, -16);
  // leg + foot (left front)
  const leg = pivot('leg', root, [-22, 6, 18]);
  mesh(at(rockLump(9, [1, 1.3, 1], {detail: 5, seed: seed + 8, bump: .1}), 0, -6, 0), leg, 2);
  const foot = pivot('foot', leg, [0, -14, 4]);
  mesh(piece([at(rockLump(7, [1.2, .55, 1.6], {detail: 3, seed: seed + 9}), 0, 0, 3), ...[-3, 0, 3].map(x => at(new T.BoxGeometry(2.2, 2, 2.4).toNonIndexed(), x, -1.4, 12))]), foot, -8);
  let tris = 0; for (const m of meshes) { const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; }
  root.scale.setScalar(scale);
  return {root, pivots, eye, baseScale: scale, triangles: tris, rest: Object.fromEntries(Object.entries(pivots).map(([k, p]) => [k, p.rotation.toArray().slice(0, 3)]))};
}

// Pose per state at time-in-state a (pure): pivot rotations [x, y, z] + body breathing scale.
export function landformPose(state, a) {
  const z = {head: [0, 0, 0], eyelid: [0, 0, 0], shoulder: [0, 0, 0], arm: [0, 0, 0], hand: [0, 0, 0], leg: [0, 0, 0], foot: [0, 0, 0], breathe: 1};
  const s = x => Math.min(1, Math.max(0, x)), e = x => { x = s(x); return x * x * (3 - 2 * x); };
  z.breathe = 1 + .006 * Math.sin(a * 2 * Math.PI / 5);
  if (state === 'sleep') return z;
  if (state === 'stir') { z.shoulder = [0, 0, .06 * Math.sin(a * 3) * e(a / .4)]; z.head = [0, .04 * Math.sin(a * 1.3), 0]; z.eyelid = [-.18 * e((a - .5) / .4) * (1 - e((a - 1.4) / .3)), 0, 0]; return z; }
  const open = e(a / .8);
  z.eyelid = [-1.45 * open, 0, 0]; z.head = [-.08 * open, 0, 0];
  if (state === 'reach') { const k = e((a - .3) / 1.6); z.shoulder = [0, 0, .32 * k]; z.arm = [-.9 * k, 0, .2 * k]; z.hand = [-.5 * k, 0, 0]; }
  if (state === 'rise') { const k = e((a - .2) / 2); z.leg = [-.7 * k, 0, 0]; z.foot = [.5 * k, 0, 0]; z.shoulder = [0, 0, .12 * k]; z.head = [-.2 * k, 0, 0]; z.breathe = 1 + .03 * k; }
  return z;
}
export function sampleLandform(keys, t, fade = .4) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const cur = landformPose(keys[i][1], Math.max(0, t - keys[i][0]));
  if (i === 0 || t - keys[i][0] >= fade) return cur;
  const prev = landformPose(keys[i - 1][1], t - keys[i - 1][0]), w = (t - keys[i][0]) / fade, out = {};
  for (const k of Object.keys(cur)) out[k] = Array.isArray(cur[k]) ? cur[k].map((v, j) => prev[k][j] + (v - prev[k][j]) * w) : prev[k] + (cur[k] - prev[k]) * w;
  return out;
}
export function driveLandform(rig, keys, t) {
  const s = sampleLandform(keys, t);
  for (const [k, p] of Object.entries(rig.pivots)) if (s[k]) p.rotation.set(...s[k]);
  const k = rig.baseScale ?? 1; rig.root.scale.set(k, k * s.breathe, k); return s;
}
