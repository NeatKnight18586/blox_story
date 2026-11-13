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
    const grad = !!o.userData.gradient;
    const key = `${Math.floor(c.x / cellSize)},${Math.floor(c.z / cellSize)}|${o.material.uuid}|${o.castShadow ? 1 : 0}|${grad ? 'g' : ''}`;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    if (grad) contactGradient(g);
    if (!buckets.has(key)) buckets.set(key, {mat: grad ? gradientMaterial(o.material) : o.material, cast: o.castShadow, geos: []});
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

// Ribbon (Amendment A1): ONE mesh following a curve — paths, streets, rivers. Top strip sampled every ~`step`
// units, world-space UVs (u across in world units/tile, v along the arc length), and side skirts closed down
// `thick` below the top so no gap shows against the terrain. heightFn(x, z) gives the top height at a point.
// Never overlapping plates: a ribbon is one surface, so it cannot z-fight with itself.
export function ribbon(curve, width, heightFn, {pattern = 'sand', color = '#d8c49a', thick = .3, step = .5, tile = 6, material = null} = {}) {
  const L = curve.getLength(), n = Math.max(2, Math.ceil(L / step)), pos = [], uv = [], idx = [];
  const ring = [];   // per sample: [left, right] top points
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u), side = new T.Vector3(t.z, 0, -t.x).normalize().multiplyScalar(width / 2);
    const l = [p.x - side.x, 0, p.z - side.z], r = [p.x + side.x, 0, p.z + side.z];
    const h = Math.max(heightFn(l[0], l[2]), heightFn(p.x, p.z), heightFn(r[0], r[2])); l[1] = r[1] = h;
    ring.push([l, r, u * L]);
  }
  const push = (v, uu, vv) => { pos.push(...v); uv.push(uu / tile, vv / tile); return pos.length / 3 - 1; };
  // Top strip.
  const top = ring.map(([l, r, s]) => [push(l, 0, s), push(r, width, s)]);
  for (let i = 0; i < n; i++) { const [a, b] = top[i], [c, d] = top[i + 1]; idx.push(a, c, b, b, c, d); }
  // Side skirts (outer edges), straight down by `thick`.
  for (const k of [0, 1]) {
    const col = ring.map(([l, r, s]) => { const v = k ? r : l; return [push(v, s, 0), push([v[0], v[1] - thick, v[2]], s, thick)]; });
    for (let i = 0; i < n; i++) { const [a, b] = col[i], [c, d] = col[i + 1]; if (k) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, b, c, d); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  const m = new T.Mesh(g, material ?? new T.MeshPhongMaterial({color})); m.name = 'ribbon'; m.receiveShadow = true; m.userData.ribbon = {width, samples: n + 1};
  return m;
}

// Baked contact shading (A1 B2): bottom 1.5 units up to 12 % darker, top 1.5 units 5 % lighter (vertex colours).
export function contactGradient(g) {
  g.computeBoundingBox(); const {min, max} = g.boundingBox, p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), lo = y - min.y, hi = max.y - y;
    const k = lo < 1.5 ? .88 + .12 * lo / 1.5 : hi < 1.5 ? 1 + .05 * (1 - hi / 1.5) : 1;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); return g;
}
const gradMats = new Map();
const gradientMaterial = m => { if (!gradMats.has(m.uuid)) { const c = m.clone(); c.vertexColors = true; gradMats.set(m.uuid, c); } return gradMats.get(m.uuid); };

// Named anchors: shots reference these, never raw coordinates (brief §7.4.6).
export function anchor(anchors, name, position, facing = 0, extra = {}) { anchors[name] = {position, facing, ...extra}; return anchors[name]; }
