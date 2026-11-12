// parts/build.js — placement helpers (docs/V2_BRIEF.md §7.2): row, grid, ringOf, along(curve),
// scatter(area, seed, density, avoid), stack, mirror, instance(list) → InstancedMesh,
// mergeByDistrict(group, cellSize), anchor(name, position, facing). All seeded and pure: the same
// call always builds the same world. Helpers return plain transform lists [{at, rotY, i, s}] so a
// prefab decides what to put there.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function rng(seed = 1) {
  let s = (Math.floor(seed) >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const row = (n, step, {from = [0, 0, 0], dir = [1, 0, 0], rotY = 0} = {}) =>
  Array.from({length: n}, (_, i) => ({at: [from[0] + dir[0] * step * i, from[1] + dir[1] * step * i, from[2] + dir[2] * step * i], rotY, i}));
export const grid = (nx, nz, step, {from = [0, 0, 0]} = {}) =>
  Array.from({length: nx * nz}, (_, i) => ({at: [from[0] + (i % nx) * step, from[1], from[2] + Math.floor(i / nx) * step], rotY: 0, i}));
// Points on a circle facing the centre (rotY points local +z at the centre) or outward.
export const ringOf = (n, r, {centre = [0, 0, 0], phase = 0, face = 'in', jitter = 0, seed = 1} = {}) => {
  const R = rng(seed);
  return Array.from({length: n}, (_, i) => {
    const a = phase + i / n * Math.PI * 2 + (R() - .5) * jitter, rr = r * (1 + (R() - .5) * jitter * .5);
    const at = [centre[0] + Math.sin(a) * rr, centre[1], centre[2] + Math.cos(a) * rr];
    return {at, rotY: a + (face === 'in' ? Math.PI : 0), i};
  });
};
// n points evenly spaced along a THREE.Curve (arc length), facing along the tangent (+ side offset).
export function along(curve, n, {offset = 0, endGap = 0} = {}) {
  return Array.from({length: n}, (_, i) => {
    const u = endGap + (1 - 2 * endGap) * (n === 1 ? .5 : i / (n - 1)), p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const side = new T.Vector3(t.z, 0, -t.x).normalize().multiplyScalar(offset);
    return {at: [p.x + side.x, p.y, p.z + side.z], rotY: Math.atan2(t.x, t.z), i, u};
  });
}
// Seeded scatter in a rectangle {x0, x1, z0, z1}, ~density per 100 sq units, skipping `avoid(x, z)`.
export function scatter(area, seed, density, avoid = () => false) {
  const R = rng(seed), n = Math.round((area.x1 - area.x0) * (area.z1 - area.z0) / 100 * density), out = [];
  for (let i = 0, tries = 0; out.length < n && tries < n * 20; tries++) {
    const x = area.x0 + R() * (area.x1 - area.x0), z = area.z0 + R() * (area.z1 - area.z0);
    if (!avoid(x, z)) out.push({at: [x, area.y ?? 0, z], rotY: R() * Math.PI * 2, s: .8 + R() * .4, i: i++});
  }
  return out;
}
export const stack = (n, h, {at = [0, 0, 0]} = {}) => Array.from({length: n}, (_, i) => ({at: [at[0], at[1] + i * h, at[2]], rotY: 0, i}));
export const mirror = (list, axis = 'x') => list.concat(list.map(p => ({...p, at: p.at.map((v, k) => (k === (axis === 'x' ? 0 : 2) ? -v : v)), rotY: -p.rotY, mirrored: true})));

// One InstancedMesh for many copies of one mesh (geometry + material) at transforms [{at, rotY, s}].
export function instance(mesh, list, {cast = false} = {}) {
  const im = new T.InstancedMesh(mesh.geometry, mesh.material, list.length), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  list.forEach((p, i) => { e.set(0, p.rotY ?? 0, 0); q.setFromEuler(e); const s = p.s ?? 1; m.compose(new T.Vector3(...p.at), q, new T.Vector3(s, s, s)); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true; im.name = (mesh.name ?? 'part') + '_x' + list.length;
  return im;
}

// Merge every static mesh under `group` into one mesh per (district cell, material), baking world
// transforms. Frustum culling then works per district, and draw calls drop to cells × materials.
// Meshes with userData.keep (animated / interactive) are left alone. Returns the new group.
export function mergeByDistrict(group, cellSize = 40) {
  group.updateMatrixWorld(true);
  const buckets = new Map(), keep = [];
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh) { if (o.isInstancedMesh) keep.push(o); return; }
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.keep) { keep.push(p); return; }
    const c = new T.Vector3(); o.getWorldPosition(c);
    const key = `${Math.floor(c.x / cellSize)},${Math.floor(c.z / cellSize)}|${o.material.uuid}|${o.castShadow ? 1 : 0}`;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(key)) buckets.set(key, {mat: o.material, cast: o.castShadow, geos: []});
    buckets.get(key).geos.push(g);
  });
  const out = new T.Group(); out.name = group.name + '_merged';
  for (const [key, b] of buckets) {
    const m = new T.Mesh(mergeGeometries(b.geos), b.mat); m.name = 'district_' + key.split('|')[0];
    m.castShadow = b.cast; m.receiveShadow = true; m.geometry.computeBoundingSphere(); out.add(m);
  }
  for (const k of new Set(keep)) { const w = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); k.matrixWorld.decompose(w, q, s); k.position.copy(w); k.quaternion.copy(q); k.scale.copy(s); out.add(k); }
  return out;
}

// Named anchors: shots reference these, never raw coordinates (brief §7.4.6).
export function anchor(anchors, name, position, facing = 0, extra = {}) { anchors[name] = {position, facing, ...extra}; return anchors[name]; }
