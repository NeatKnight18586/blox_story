// parts/terrain.js — seeded heightfield terrain (Amendment A4 A1). Opt-in: "Nobody" never imports it.
// heightFn(spec) is PURE: a control list evaluated in order, so a world's groundY(x, z) is exactly the mesh
// surface at every grid vertex. Controls (all coordinates in world units, x/z plane):
//   {type:'noise', amp, scale, octaves}           seeded value-noise fBm (gentle unevenness)
//   {type:'slope', dir:[dx,dz], grade, at:[x,z]}   linear incline (a hill street), height 0 at `at`
//   {type:'hill', at, r, h} · {type:'valley', from, to, w, depth} · {type:'ridge', from, to, w, h}
//   {type:'plateau', at, r, h, edge}              flat top with a soft rim (raises only)
//   {type:'pad', x0, x1, z0, z1, y, blend}         flatten a building pad to exactly y (blend = soft edge width)
//   {type:'river', points:[[x,z]...], w, depth, bank}  channel cut below the surface along a polyline
//   {type:'cliff', from, to, h, side, width}      a steep step of height h on `side` (+1 / −1) of the line
// Mesh: square chunks; chunks within `fullR` of any focus point use step `fine`, the rest step `fine × 4`
// (quarter density). Every chunk has a skirt hanging `skirt` units down, so LOD seams and the world edge never show.
// Material: slope/height blend of three tiling layers (low, mid = rock on slopes, high = snow / stone) mixed per
// vertex (attribute `splat`), with matching blended normal maps (materials.js splatMaterial).
import * as T from 'three';

// ---- pure height function ------------------------------------------------------------------------------
const fract = v => v - Math.floor(v);
const h2 = (x, z, s) => fract(Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453);
const smooth = t => t * t * (3 - 2 * t);
const clamp01 = v => Math.max(0, Math.min(1, v));
function vnoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = smooth(x - xi), fz = smooth(z - zi);
  const a = h2(xi, zi, s), b = h2(xi + 1, zi, s), c = h2(xi, zi + 1, s), d = h2(xi + 1, zi + 1, s);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
}
// distance from p to segment ab (2D) and the along-parameter
function segDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
  const u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2));
  return Math.hypot(px - a[0] - dx * u, pz - a[1] - dz * u);
}
const polyDist = (px, pz, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(px, pz, pts[i - 1], pts[i])); return d; };
const bump = (d, r) => d >= r ? 0 : .5 + .5 * Math.cos(Math.PI * d / r);   // C1 cosine falloff, 1 at the centre

export function heightFn({seed = 1, base = 0, controls = []} = {}) {
  const ops = controls.map(c => {
    switch (c.type) {
      case 'noise': { const oct = c.octaves ?? 3, sc = c.scale ?? 40, amp = c.amp ?? 1; return (h, x, z) => { let s = 0, a = 1, f = 1 / sc, n = 0; for (let o = 0; o < oct; o++) { s += a * (vnoise(x * f, z * f, seed + o * 13) - .5); n += a; a *= .5; f *= 2; } return h + amp * 2 * s / n; }; }
      case 'slope': { const [dx, dz] = c.dir, l = Math.hypot(dx, dz) || 1, at = c.at ?? [0, 0]; return (h, x, z) => h + c.grade * ((x - at[0]) * dx + (z - at[1]) * dz) / l; }
      case 'hill': return (h, x, z) => h + c.h * bump(Math.hypot(x - c.at[0], z - c.at[1]), c.r);
      case 'ridge': return (h, x, z) => h + c.h * bump(segDist(x, z, c.from, c.to), c.w);
      case 'valley': return (h, x, z) => h - c.depth * bump(segDist(x, z, c.from, c.to), c.w);
      case 'plateau': { const e = c.edge ?? c.r * .3; return (h, x, z) => { const d = Math.hypot(x - c.at[0], z - c.at[1]); const k = d <= c.r - e ? 1 : smooth(clamp01((c.r - d) / e)); return Math.max(h, h + (c.h - h) * k * (c.h > h ? 1 : 0)); }; }
      case 'pad': { const bl = c.blend ?? 4; return (h, x, z) => { const ox = Math.max(c.x0 - x, 0, x - c.x1), oz = Math.max(c.z0 - z, 0, z - c.z1), d = Math.hypot(ox, oz); const k = d === 0 ? 1 : smooth(clamp01(1 - d / bl)); return h + (c.y - h) * k; }; }
      case 'river': { const bank = c.bank ?? c.w; return (h, x, z) => { const d = polyDist(x, z, c.points); if (d >= c.w / 2 + bank) return h; const bed = c.bedY ?? -Infinity; const k = d <= c.w / 2 ? 1 : smooth(1 - (d - c.w / 2) / bank); const cut = h - c.depth * k; return Math.max(Math.min(h, cut), Math.min(h, bed)); }; }
      case 'cliff': { const w = c.width ?? 2, side = c.side ?? 1; return (h, x, z) => { const [a, b] = [c.from, c.to], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; const sd = ((x - a[0]) * -dz + (z - a[1]) * dx) / l * side; const u = ((x - a[0]) * dx + (z - a[1]) * dz) / (l * l); if (u < -.05 || u > 1.05) return h; return h + c.h * smooth(clamp01(sd / w + .5)); }; }
      default: throw Error('terrain: unknown control ' + c.type);
    }
  });
  return (x, z) => { let h = base; for (const op of ops) h = op(h, x, z); return h; };
}

// Slope/height splat weights [low, mid(rock), high] for a surface point: pure, shared by mesh and tests.
export function splatWeights(y, normalY, {rockSlope = .78, rockSoft = .08, highY = Infinity, highSoft = 4} = {}) {
  const rock = smooth(clamp01((rockSlope - normalY) / rockSoft + .5));
  const high = smooth(clamp01((y - highY) / highSoft + .5)) * (1 - rock * .7);
  const low = Math.max(0, 1 - rock - high);
  const s = low + rock + high; return [low / s, rock / s, high / s];
}

// Chunk layout (pure): which step each chunk uses given focus points.
export function chunkPlan({size = 400, chunk = 40, fine = 2, fullR = 60, focus = [[0, 0]], centre = [0, 0]} = {}) {
  const n = Math.round(size / chunk), out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x0 = centre[0] - size / 2 + i * chunk, z0 = centre[1] - size / 2 + j * chunk;
    const dx = p => Math.max(x0 - p[0], 0, p[0] - (x0 + chunk)), dz = p => Math.max(z0 - p[1], 0, p[1] - (z0 + chunk));
    const near = focus.some(p => Math.hypot(dx(p), dz(p)) <= fullR);
    out.push({x0, z0, size: chunk, step: near ? fine : fine * 4, near});
  }
  return out;
}

// Build the terrain mesh group. `material` = a splat material (materials.splatMaterial); `params` = splat thresholds.
export function buildTerrain({height, size = 400, chunk = 40, fine = 2, fullR = 60, focus, centre = [0, 0], skirt = 4,
  material, splat = {}, tile = 8, name = 'terrain'} = {}) {
  const group = new T.Group(); group.name = name; let tris = 0;
  const nAt = (x, z, e) => { const hx = height(x + e, z) - height(x - e, z), hz = height(x, z + e) - height(x, z - e); const v = new T.Vector3(-hx, 2 * e, -hz); return v.normalize(); };
  for (const c of chunkPlan({size, chunk, fine, fullR, focus, centre})) {
    const n = Math.round(c.size / c.step), pos = [], nor = [], uv = [], spl = [], idx = [];
    const vert = (x, y, z, nn) => { pos.push(x, y, z); nor.push(nn.x, nn.y, nn.z); uv.push(x / tile, z / tile); const w = splatWeights(y, nn.y, splat); spl.push(...w); return pos.length / 3 - 1; };
    const grid = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = c.x0 + i * c.step, z = c.z0 + j * c.step, y = height(x, z); grid.push(vert(x, y, z, nAt(x, z, c.step * .5))); }
    const g = (i, j) => grid[j * (n + 1) + i];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = g(i, j), b = g(i + 1, j), cc = g(i, j + 1), d = g(i + 1, j + 1);
      if ((i + j) % 2) idx.push(a, cc, b, b, cc, d); else idx.push(a, cc, d, a, d, b);
    }
    // skirts: each edge row duplicated `skirt` units down (normals copied, so lighting matches the edge)
    const edges = [[...Array(n + 1)].map((_, i) => g(i, 0)), [...Array(n + 1)].map((_, i) => g(n - i, n)), [...Array(n + 1)].map((_, j) => g(0, n - j)), [...Array(n + 1)].map((_, j) => g(n, j))];
    for (const e of edges) {
      const low = e.map(k => { const p = [pos[k * 3], pos[k * 3 + 1] - skirt, pos[k * 3 + 2]]; pos.push(...p); nor.push(nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]); uv.push(uv[k * 2], uv[k * 2 + 1] - skirt / tile); spl.push(spl[k * 3], spl[k * 3 + 1], spl[k * 3 + 2]); return pos.length / 3 - 1; });
      for (let i = 0; i < e.length - 1; i++) idx.push(e[i], low[i], e[i + 1], e[i + 1], low[i], low[i + 1]);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('splat', new T.Float32BufferAttribute(spl, 3)); geo.setIndex(idx);
    geo.computeBoundingSphere();
    const m = new T.Mesh(geo, material); m.receiveShadow = true; m.castShadow = false; m.name = `${name}_${c.near ? 'near' : 'far'}`;
    group.add(m); tris += idx.length / 3;
  }
  group.userData.triangles = tris;
  return group;
}
