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

// ---- Phase 1A-fix movie-set profile (all numbers in plan.json "terrain") ---------------------------------------------------------
const TR = PLAN.terrain, TC = TR.terrace, [TX0, TZ0, TX1, TZ1] = TC.rect, ST = TR.stair, HI = TR.hills, CL = PLAN.cliff, CL_A = CL.from, CL_B = CL.to;
const clamp01 = v => Math.max(0, Math.min(1, v));
// Terrace weight: 1 on the flat y+14 rect, falls to 0 over `blend` studs on N/E/W and over 1.5 studs on the south edge (the retaining wall).
export function terraceW(x, z) {
  const dx = Math.max(TX0 - x, 0, x - TX1), dz = Math.max(TZ0 - z, 0, z - TZ1), D = Math.hypot(dx, dz); if (D === 0) return 1;
  const south = z > TZ1 ? dz / (dz + dx + 1e-9) : 0, B = TC.blend * (1 - south) + 1.5 * south;
  return 1 - smooth(0, B, D);
}
// Town ground outside the hills: west arm (shore road +2 → +12 inland, linear ≈ 4 %), Main St 14 → 20, east arm +5 → +1, bay-front promenade, terrace.
function townY(x, z) {
  const dx = Math.max(TX0 - x, 0, x - TX1), dz = Math.max(TZ0 - z, 0, z - TZ1), D = Math.hypot(dx, dz), W = TR.westArm, M = TR.mainSt, E = TR.eastArm;
  const west = Math.max(W.shore, TC.y - (TC.y - W.shore) / W.run * D);
  const yM = M.plaza + (M.ne - M.plaza) * clamp01((x - M.x0) / (M.x1 - M.x0)), yH = z < E.z0 ? E.hi : E.hi - (E.hi - E.lo) * clamp01((z - E.z0) / E.run);
  const east = yM + (yH - yM) * clamp01((z - M.descend[0]) / (M.descend[1] - M.descend[0]));
  let y = west + (east - west) * smooth(-20, 20, x);
  const cx = (1 - smooth(110, 170, Math.abs(x))) * smooth(10, 40, z); y += (TR.promenade - y) * cx;
  const w = terraceW(x, z); return y + (TC.y - y) * w;
}
// Height of the land surface before the coast ramp: the town, the hills (from z −100) with crest line 75–90, the knoll, the cliff step.
export function landProfile(x, z) {
  if (z >= HI.startZ) return townY(x, z);
  const b0 = townY(x, HI.startZ), u = HI.startZ - z, [c0, c1] = HI.crest, [z1, z0] = HI.crestZ;
  const crest = Math.max(c0, Math.min(c1, (c0 + c1) / 2 + 6 * Math.sin(x / 55 + 1) + 2 * Math.sin(x / 23))), uc = (HI.startZ - z0 + HI.startZ - z1) / 2 + (z1 - z0) / 2 * Math.sin(x / 60 + .6);
  const t = Math.min(1, u / uc); let y = u <= uc ? b0 + (crest - b0) * (.8 * t + .2 * smooth(0, 1, t)) : crest - .35 * (u - uc);
  y += (3.5 * (vnoise(x / 31, z / 31) - .5) + 1.2 * (vnoise(x / 9, z / 9) - .5)) * smooth(0, 40, u);
  const dx = CL_B[0] - CL_A[0], dz = CL_B[1] - CL_A[1], L = Math.hypot(dx, dz), tt = ((x - CL_A[0]) * dx + (z - CL_A[1]) * dz) / (L * L);
  if (tt > -.1 && tt < 1.1) { const c = -((x - CL_A[0]) * -dz + (z - CL_A[1]) * dx) / L; y += CL.h * smooth(-CL.width / 2, CL.width / 2, c) * smooth(-.1, .12, tt) * smooth(1.1, .88, tt); }
  const K = HI.knoll, [kx, kz] = toWorld(K.at), kd = Math.hypot(x - kx, z - kz); if (kd < K.r + K.blend) y += (K.y - y) * (1 - smooth(K.r, K.r + K.blend, kd));
  return y;
}
const BEACH = PLAN.districts.beach.rect, [BX0, BZ0] = toWorld([BEACH[0] + 4, BEACH[1] - 12]), [BX1, BZ1] = toWorld([BEACH[2] - 4, BEACH[3] - 4]);
export function beachY(x, z) {   // sand spit at the east tip, sloping into the water
  const dx = Math.max(BX0 - x, 0, x - BX1), dz = Math.max(BZ0 - z, 0, z - BZ1), d = Math.hypot(dx, dz);
  return .9 - .07 * d - .012 * Math.max(0, z - BZ0);
}
const DUCK = PLAN.landmarks['5'], DUCK_C = toWorld(DUCK.at), DUCK_R = [DUCK.rock.rx * S, DUCK.rock.ry * S];
export function rockY(x, z) { const q = ((x - DUCK_C[0]) / DUCK_R[0]) ** 2 + ((z - DUCK_C[1]) / DUCK_R[1]) ** 2; return q >= 1 ? -Infinity : H.seaFloor + (DUCK.rock.h - H.seaFloor) * Math.sqrt(1 - q * q); }

const BOARD = () => roadPaths().boardwalk.pts; let _board = null;
// Grand Stair walkable profile: 10 steps, a 6-deep landing, 10 steps (total drop terrace y → deck y).
export function stairY(z) {
  const run = (ST.z1 - ST.z0 - ST.landing) / ST.steps, rise = (TC.y - TR.deck) / ST.steps, half = ST.steps / 2;
  if (z <= ST.z0) return TC.y; if (z >= ST.z1) return TR.deck;
  let u = z - ST.z0; if (u < half * run) return TC.y - (Math.floor(u / run) + 1) * rise;
  u -= half * run; if (u < ST.landing) return TC.y - half * rise; u -= ST.landing; return TC.y - (half + Math.min(half, Math.floor(u / run) + 1)) * rise;
}
export const onStair = (x, z) => Math.abs(x - ST.x) <= ST.w / 2 && z > ST.z0 && z < ST.z1;
// The terrain surface without the stair steps (what the terrain mesh is built from; the stair is its own blockout on top).
const PAD = PLAN.west?.pad, PAD_Y = PAD ? (() => { const [x0, z0, x1, z1] = PAD.rect; return terrainBase((x0 + x1) / 2, (z0 + z1) / 2); })() : 0;
export function terrainY(x, z) {   // Phase 1C: the school pad (plan.json west.pad) levels the school block for the court + building
  const y = terrainBase(x, z); if (!PAD) return y;
  const [x0, z0, x1, z1] = PAD.rect, D = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1)), w = 1 - smooth(0, PAD.blend, D);
  return w > 0 ? y + (PAD_Y - y) * w : y;
}
function terrainBase(x, z) {
  const s = coastDist(x, z); let y;
  if (s >= 0) {
    const k = H.shoreGrade + (H.cliffGrade - H.shoreGrade) * smooth(-90, -170, z), ramp = H.shore + k * s; y = Math.min(landProfile(x, z), ramp);
    const pd = polyDist(x, z, _board ??= BOARD()), wB = (1 - smooth(12, 120, pd)) * smooth(30, 130, z); y += (Math.min(TR.promenade, ramp) - y) * wB;
    const w = terraceW(x, z); if (w > 0) y += (TC.y - y) * w;   // the terrace is never clipped by the coast ramp
  } else y = Math.max(H.seaFloor, H.shore + H.seaGrade * s);
  return Math.max(y, beachY(x, z), rockY(x, z));
}
// The ground surface actors stand on: terrainY, with the real stepped Grand Stair inside its footprint.
export const groundY = (x, z) => onStair(x, z) ? stairY(z) : terrainY(x, z);
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
// View corridors (plan.json "corridors"): world segments [x0, z0, x1, z1, halfWidth] kept free of lots and trees (anchor → landmark slot tower/centre).
export function corridors() {
  return (PLAN.corridors ?? []).map(c => { const a = anchor(c.from), L = PLAN.landmarks[c.to], [lx, lz] = toWorld(L.at), tz = L.tower ? lz + L.tower.at[1] : lz; return [a.position[0], a.position[2], lx, tz, c.w]; });
}
export const inCorridor = (x, z, r = 0, C = corridors()) => C.some(([x0, z0, x1, z1, w]) => segDist(x, z, [x0, z0], [x1, z1])[0] < w + r);
