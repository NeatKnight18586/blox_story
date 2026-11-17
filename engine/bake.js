// engine/bake.js — format v4 Phase 2: baked light for everything static. Once per episode, at world build, every static
// mesh gets per-vertex sun light (with sun shadow), sky light with ambient occlusion, a ground bounce and (mystery)
// practical lights, stored in its vertex colours. Static materials then become a cheap unlit material (map × baked colour
// + a small env highlight); real-time light and shadows are only for actors and moving props.
//   pure: voxelize(tris, cell) · occluded(grid, o, d, max) · hemiDirs(k) · bakeVertex(p, n, grid, cfg) → [r, g, b]
//   three: bakeScene(scene, cfg) → {meshes, vertices, ms}
import * as T from 'three';

// Occupancy grid of the static triangles (conservative: every voxel a triangle's box touches).
export function voxelize(tris, cell = .5) {
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < tris.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], tris[i + k]); max[k] = Math.max(max[k], tris[i + k]); }
  if (!isFinite(min[0])) return {grid: new Uint8Array(1), n: [1, 1, 1], min: [0, 0, 0], cell};
  min = min.map(v => v - cell); max = max.map(v => v + cell);
  const n = [0, 1, 2].map(k => Math.max(1, Math.ceil((max[k] - min[k]) / cell))), grid = new Uint8Array(n[0] * n[1] * n[2]);
  for (let i = 0; i < tris.length; i += 9) {
    const lo = [0, 1, 2].map(k => Math.floor((Math.min(tris[i + k], tris[i + 3 + k], tris[i + 6 + k]) - min[k]) / cell));
    const hi = [0, 1, 2].map(k => Math.floor((Math.max(tris[i + k], tris[i + 3 + k], tris[i + 6 + k]) - min[k]) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) grid[(x * n[1] + y) * n[2] + z] = 1;
  }
  return {grid, n, min, cell};
}
const at = (G, p) => { const x = Math.floor((p[0] - G.min[0]) / G.cell), y = Math.floor((p[1] - G.min[1]) / G.cell), z = Math.floor((p[2] - G.min[2]) / G.cell);
  return x < 0 || y < 0 || z < 0 || x >= G.n[0] || y >= G.n[1] || z >= G.n[2] ? -1 : G.grid[(x * G.n[1] + y) * G.n[2] + z]; };
// March from o along unit d (half-cell steps) up to max; true at the first occupied voxel; leaving the grid = open sky.
export function occluded(G, o, d, max = 60) {
  const step = G.cell * .5;
  for (let s = step; s <= max; s += step) { const v = at(G, [o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s]); if (v === -1) return false; if (v === 1) return true; }
  return false;
}
// k fixed, cosine-weighted directions on the +z hemisphere (Fibonacci spiral): deterministic AO samples.
export function hemiDirs(k = 12) {
  return Array.from({length: k}, (_, i) => { const u = (i + .5) / k, r = Math.sqrt(u), a = i * 2.39996323; return [r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)]; });
}
const HEMI = hemiDirs(12);
function toBasis(n, d) {   // rotate a +z hemisphere direction onto normal n
  const up = Math.abs(n[1]) < .99 ? [0, 1, 0] : [1, 0, 0];
  const tx = [up[1] * n[2] - up[2] * n[1], up[2] * n[0] - up[0] * n[2], up[0] * n[1] - up[1] * n[0]], l = Math.hypot(...tx), t = tx.map(v => v / l);
  const b = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
  return [0, 1, 2].map(k => t[k] * d[0] + b[k] * d[1] + n[k] * d[2]);
}
// cfg: {sunDir (unit, toward the sun), sun [r,g,b], sunI, sky, skyI, ground, groundI, aoDist, lights: [{p, color, i, range}]}
export function bakeVertex(p, n, G, cfg) {
  const off = G.cell * 1.05, o = [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off], out = [0, 0, 0];
  const ndl = n[0] * cfg.sunDir[0] + n[1] * cfg.sunDir[1] + n[2] * cfg.sunDir[2];
  if (ndl > 0 && !occluded(G, o, cfg.sunDir, 80)) for (let k = 0; k < 3; k++) out[k] += cfg.sun[k] * cfg.sunI * ndl;
  let sky = 0, ground = 0;
  for (const h of HEMI) { const d = toBasis(n, h); if (occluded(G, o, d, cfg.aoDist ?? 3.5)) continue; if (d[1] >= 0) sky += 1; else ground += 1; }
  sky /= HEMI.length; ground /= HEMI.length;
  for (let k = 0; k < 3; k++) out[k] += cfg.sky[k] * cfg.skyI * sky + cfg.ground[k] * cfg.groundI * (ground + .5 * Math.max(0, -n[1]));
  for (const L of cfg.lights ?? []) {
    const v = [L.p[0] - p[0], L.p[1] - p[1], L.p[2] - p[2]], d = Math.hypot(...v); if (d >= L.range || d < 1e-6) continue;
    const u = v.map(x => x / d), c = n[0] * u[0] + n[1] * u[1] + n[2] * u[2]; if (c <= 0 || occluded(G, o, u, d - .3)) continue;
    const f = (1 - d / L.range) ** 2 * c * L.i; for (let k = 0; k < 3; k++) out[k] += L.color[k] * f;
  }
  return out;
}

// ---- three: bake a built world -------------------------------------------------------------------------------------------
// Static = every Mesh under `root` that is not instanced/skinned, not transparent, and not marked userData.live (glass,
// water, glow, movers). Shared geometries are cloned before their colours are written. Materials become MeshBasic
// (map × colour × baked vertex light) with an env highlight scaled by the pattern's gloss; the result is cached per material.
export function bakeScene(root, cfg, {cell = .5, env = null, reflect = .12} = {}) {
  const t0 = performance.now(), meshes = [];
  root.updateMatrixWorld(true);
  const skip = o => { for (let p = o; p; p = p.parent) if (!p.visible || p.userData?.live) return true; return false; };   // hidden or live (any ancestor)
  root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !skip(o) && !(o.material?.transparent) && o.geometry?.attributes?.position) meshes.push(o); });
  const tri = [], v = new T.Vector3();
  for (const m of meshes) {
    const g = m.geometry, p = g.attributes.position, idx = g.index;
    const N = idx ? idx.count : p.count;
    for (let i = 0; i < N; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld); tri.push(v.x, v.y, v.z); }
  }
  const G = voxelize(tri, cell), users = new Map(), nm = new T.Matrix3(), n = new T.Vector3(), mats = new Map();
  for (const m of meshes) users.set(m.geometry, (users.get(m.geometry) ?? 0) + 1);
  let verts = 0;
  for (const m of meshes) {
    if (users.get(m.geometry) > 1) m.geometry = m.geometry.clone();
    const g = m.geometry; if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, no = g.attributes.normal, col = new Float32Array(p.count * 3); nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); n.fromBufferAttribute(no, i).applyMatrix3(nm).normalize();
      const c = bakeVertex([v.x, v.y, v.z], [n.x, n.y, n.z], G, cfg); col.set(c, i * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); verts += p.count;
    const swap = old => { if (mats.has(old)) return mats.get(old);
      const b = new T.MeshBasicMaterial({map: old.map ?? null, color: old.color ?? new T.Color('#ffffff'), vertexColors: true, side: old.side, fog: true,
        ...((old.userData?.gloss ?? .25) >= .5 ? {envMap: env, combine: T.AddOperation, reflectivity: old.userData.gloss * reflect * 4, specularMap: old.userData?.glossMap ?? null} : {})});   // pass 1: env highlight only on glossy surfaces
      b.name = 'baked:' + (old.name ?? ''); b.userData = {...old.userData, baked: true}; mats.set(old, b); return b; };
    m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
    m.castShadow = false; m.receiveShadow = false;   // static-on-static shadows are baked; actors cast on the shadow catcher
  }
  return {meshes: meshes.length, vertices: verts, voxels: G.n, ms: Math.round(performance.now() - t0)};
}
