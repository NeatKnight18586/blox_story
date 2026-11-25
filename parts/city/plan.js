// parts/city/plan.js — Phase 1A: pure helpers over parts/city/plan.json (the island city's source of truth). Node-testable, no three.
//   toWorld([mx, my]) / toMap([x, z]) · pathPoints(svg, segs) (M/Q/L/Z → polyline, map px) · COAST / BAY / HILLS (world polylines)
//   insideLand(x, z) · coastDist(x, z) (signed: + inland) · hillsZ(x) · groundY(x, z) · districtAt(x, z) · anchor(name)
//   roadPaths() (world polylines per road) · landmarkSlots() (world footprint + base y + reserved height) · DISTRICTS
// Ground model (owner decisions): shore y ≈ 0 at the coast, the town rises south → north to the plaza pad (exactly +12, r 32 studs),
// then gently to the hills line and up into the wild edge (+45..+70, soft hills, a cliff step with a cave mouth). The bay mouth
// holds the duck rock; the east tip carries a sand spit (beach). Sea floor slopes down to −7 under the water plane (y 0).
import PLAN from './plan.json' with {type: 'json'};
export {PLAN};

const S = PLAN.scale, [OX, OY] = PLAN.origin, H = PLAN.heights;
export const toWorld = ([mx, my]) => [(mx - OX) * S, (my - OY) * S];
export const toMap = ([x, z]) => [x / S + OX, z / S + OY];
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// SVG subset (M, L, Q, Z; absolute) → polyline in map px. Quadratic curves are flattened into `segs` pieces.
export function pathPoints(svg, segs = 24) {
  const tok = svg.match(/[MLQZ]|-?\d+(\.\d+)?/g), out = []; let i = 0, cur = null, start = null;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { cur = [num(), num()]; start = cur; out.push(cur); }
    else if (c === 'L') { cur = [num(), num()]; out.push(cur); }
    else if (c === 'Q') { const q = [num(), num()], e = [num(), num()], p = cur;
      for (let k = 1; k <= segs; k++) { const t = k / segs, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; out.push([a * p[0] + b * q[0] + d * e[0], a * p[1] + b * q[1] + d * e[1]]); }
      cur = e; }
    else if (c === 'Z') { if (start && (cur[0] !== start[0] || cur[1] !== start[1])) out.push(start); cur = start; }
    else throw Error('pathPoints: unsupported token ' + c);
  }
  return out;
}
export const COAST = pathPoints(PLAN.coast).map(toWorld);       // closed (last = first)
export const BAY = pathPoints(PLAN.bayShore).map(toWorld);
export const HILLS = pathPoints(PLAN.hillsLine).map(toWorld);   // west → east

function segDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2));
  return [Math.hypot(px - a[0] - dx * u, pz - a[1] - dz * u), u];
}
export const polyDist = (x, z, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(x, z, pts[i - 1], pts[i])[0]); return d; };
export function inPoly(x, z, pts) {
  let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}
export const insideLand = (x, z) => inPoly(x, z, COAST);
export const coastDist = (x, z) => (insideLand(x, z) ? 1 : -1) * polyDist(x, z, COAST);
// z of the hills line at x (clamped to its ends).
export function hillsZ(x) {
  const P = HILLS; if (x <= P[0][0]) return P[0][1]; if (x >= P[P.length - 1][0]) return P[P.length - 1][1];
  for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const t = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + t * (P[i][1] - P[i - 1][1]); }
  return P[P.length - 1][1];
}
const fract = v => v - Math.floor(v), h2 = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
function vnoise(x, z) { const xi = Math.floor(x), zi = Math.floor(z), fx = smooth(0, 1, x - xi), fz = smooth(0, 1, z - zi), a = h2(xi, zi), b = h2(xi + 1, zi), c = h2(xi, zi + 1), d = h2(xi + 1, zi + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }

const PLAZA_C = toWorld(PLAN.plaza.at), PLAZA_R = PLAN.plaza.r * S, PLAZA_B = PLAN.plaza.blend * S;
const CL = PLAN.cliff, CL_A = CL.from, CL_B = CL.to;
// Height of the land surface before the coast ramp (town profile + hills + cliff + plaza pad).
export function landProfile(x, z) {
  const zh = hillsZ(x), rise = z => H.plaza + H.plazaRise * -z;
  let y;
  if (z >= zh) { y = z >= 0 ? H.plaza * (1 - Math.max(0, z - PLAZA_R) / 70) : rise(z); y = Math.max(y, H.armFloor); y += .5 * (vnoise(x / 23, z / 23) - .5); }
  else {
    const u = zh - z, b0 = rise(zh); y = b0 + (H.hillBase - b0) * smooth(0, H.hillRun, u);
    let bumps = 0; for (const {at, r, h} of PLAN.hills) { const q = Math.hypot(x - at[0], z - at[1]) / r; if (q < 1) bumps += h * (.5 + .5 * Math.cos(q * Math.PI)); }
    y += (bumps + 5 * (vnoise(x / 31, z / 31) - .5) + 2 * (vnoise(x / 9, z / 9) - .5)) * smooth(0, 40, u);
    // cliff step (wild edge): the ground north of the line stands `h` higher, over `width` studs
    const dx = CL_B[0] - CL_A[0], dz = CL_B[1] - CL_A[1], L = Math.hypot(dx, dz), t = ((x - CL_A[0]) * dx + (z - CL_A[1]) * dz) / (L * L);
    if (t > -.1 && t < 1.1) { const c = -((x - CL_A[0]) * -dz + (z - CL_A[1]) * dx) / L;   // + = north of the line
      y += CL.h * smooth(-CL.width / 2, CL.width / 2, c) * smooth(-.1, .12, t) * smooth(1.1, .88, t); }
    if (y > H.hillMax - 6) y = H.hillMax - 6 + 6 * Math.tanh((y - H.hillMax + 6) / 6);   // soft cap at hillMax
  }
  const d = Math.hypot(x - PLAZA_C[0], z - PLAZA_C[1]);
  if (d < PLAZA_R + PLAZA_B) { const w = 1 - smooth(PLAZA_R, PLAZA_R + PLAZA_B, d); y = y + (H.plaza - y) * w; }
  return y;
}
const BEACH = PLAN.districts.beach.rect, [BX0, BZ0] = toWorld([BEACH[0] + 4, BEACH[1] - 12]), [BX1, BZ1] = toWorld([BEACH[2] - 4, BEACH[3] - 4]);
export function beachY(x, z) {   // sand spit at the east tip, sloping into the water
  const dx = Math.max(BX0 - x, 0, x - BX1), dz = Math.max(BZ0 - z, 0, z - BZ1), d = Math.hypot(dx, dz);
  return .9 - .07 * d - .012 * Math.max(0, z - BZ0);
}
const DUCK = PLAN.landmarks['5'], DUCK_C = toWorld(DUCK.at), DUCK_R = [DUCK.rock.rx * S, DUCK.rock.ry * S];
export function rockY(x, z) { const q = ((x - DUCK_C[0]) / DUCK_R[0]) ** 2 + ((z - DUCK_C[1]) / DUCK_R[1]) ** 2; return q >= 1 ? -Infinity : H.seaFloor + (DUCK.rock.h - H.seaFloor) * Math.sqrt(1 - q * q); }

// The ground surface (terrain = exactly this at every grid vertex). Under the bay/sea it is the sea floor (water plane at H.waterY).
export function groundY(x, z) {
  const s = coastDist(x, z); let y;
  if (s >= 0) { const k = H.shoreGrade + (H.cliffGrade - H.shoreGrade) * smooth(-90, -170, z); y = Math.min(landProfile(x, z), H.shore + k * s); }
  else y = Math.max(H.seaFloor, H.shore + H.seaGrade * s);
  return Math.max(y, beachY(x, z), rockY(x, z));
}
// Standing height: ground, or the water surface where the ground is under water (boats, bay cameras).
export const standY = (x, z) => Math.max(groundY(x, z), H.waterY);

export const DISTRICTS = PLAN.districts;
export function districtAt(x, z) {
  const [mx, my] = toMap([x, z]), D = PLAN.districts;
  const inRect = r => mx >= r[0] && mx <= r[2] && my >= r[1] && my <= r[3];
  const land = groundY(x, z) > H.waterY + .05;
  if (inRect(D.beach.rect) && land) return 'beach';
  if (rockY(x, z) > -Infinity) return 'bay';
  if (!land) return z > 40 && Math.abs(x) < 240 && !insideLand(x, z) && z < 300 ? 'bay' : 'sea';
  for (const k of PLAN.districtOrder) {
    const d = D[k];
    if (d.circle && Math.hypot(mx - d.circle[0], my - d.circle[1]) <= d.circle[2] && my <= d.maxY) return k;
    if (d.north && z < hillsZ(x)) return k;
    if (d.rect && k !== 'beach' && inRect(d.rect)) return k;
  }
  return 'town';
}
// Named camera anchor: position (ground or water + h), target (look point: map px + height above its standing y), yaw (deg, 0 = +z), fov.
export function anchor(name) {
  const a = PLAN.anchors[name]; if (!a) throw Error('unknown city anchor ' + name);
  const [x, z] = toWorld(a.at), [lx, lz] = toWorld(a.look), position = [x, standY(x, z) + a.h, z], target = [lx, standY(lx, lz) + a.look[2], lz];
  return {name, position, target, facing: Math.atan2(lx - x, lz - z) * 180 / Math.PI, fov: a.fov ?? 55, district: a.district};
}
export const ANCHOR_NAMES = Object.keys(PLAN.anchors);
// Roads as world polylines [[x, z]...] (curved ones flattened through their control points with a Catmull-Rom).
export function roadPaths(step = 4) {
  const out = {};
  for (const [k, r] of Object.entries(PLAN.roads)) {
    const P = r.pts.map(toWorld);
    if (!r.curve) { out[k] = {...r, pts: P}; continue; }
    const pts = [], seg = (a, b, c, d, t) => [0, 1].map(j => .5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t * t * t));
    for (let i = 0; i < P.length - 1; i++) { const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)], n = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step);
      for (let k = 0; k < n; k++) pts.push(seg(a, b, c, d, k / n)); }
    pts.push(P[P.length - 1]); out[k] = {...r, pts};
  }
  return out;
}
export const roadDist = (x, z, roads = roadPaths()) => Math.min(...Object.values(roads).map(r => polyDist(x, z, r.pts) - r.w / 2));
// Landmark slots in world space: centre, footprint [w, d] studs, base y (lowest ground under the footprint), reserved height, extra parts.
export function landmarkSlots() {
  return Object.entries(PLAN.landmarks).map(([id, L]) => {
    const [x, z] = toWorld(L.at), [w, d] = L.fp, ys = [[0, 0], [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([a, b]) => standY(x + a, z + b));
    const base = id === '5' ? DUCK.rock.h : Math.min(...ys);
    const tower = L.tower ? {at: [x + L.tower.at[0], z + L.tower.at[1]], fp: L.tower.fp, h: L.tower.h} : null;
    return {id, name: L.name, at: [x, z], fp: [w, d], base, h: L.h, top: base + Math.max(L.h, tower?.h ?? 0), tower, shape: L.shape, district: L.district};
  });
}
