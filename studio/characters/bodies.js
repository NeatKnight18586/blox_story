// Body types (opt-in, Studio V3): the same six parts, pivots and clothing faces as the
// classic block body, re-shaped per build so men, women and kids read apart at a glance,
// the way Roblox body packages do (broad square torso vs narrow shoulders, waist and hips,
// slimmer limbs). Shapes stay blocky with soft bevels; nothing is added to the silhouette.
// Shoulders pivot at the joint centre (R6 style), so a raised arm swings its top into the
// torso instead of opening a gap. A preset opts in with `body: 'woman'` (etc.); without it
// the classic body is untouched, so legacy renders stay pixel-identical.
import * as T from 'three';

// Box-face groups/UVs in BoxGeometry order, so clothing painted per face maps the same way.
const GROUP = {right: 0, left: 1, top: 2, bottom: 3, front: 4, back: 5};

// Rounded-rectangle ring (half extents a, b; corner radius rc) as [x, z, nx, nz] points.
function ring(a, b, rc, n = 5) {
  const pts = [], c = Math.min(rc, a * .95, b * .95);
  const corners = [[a - c, b - c, 0], [-(a - c), b - c, Math.PI / 2], [-(a - c), -(b - c), Math.PI], [a - c, -(b - c), 1.5 * Math.PI]];
  for (const [cx, cz, a0] of corners) for (let i = 0; i <= n; i++) {
    const t = a0 + (i / n) * Math.PI / 2, nx = Math.cos(t), nz = Math.sin(t);
    pts.push([cx + nx * c, cz + nz * c, nx, nz]);
  }
  return pts;
}

// Shaped block: profile(v) → [halfWidth, halfDepth, dz] for v in 0 (bottom) .. 1 (top).
// Bevel radius r rounds the top and bottom rims; rc rounds the vertical edges.
export function shapedBlock({h, profile, r = .06, rc = .08, rows = 14, capRows = 3}) {
  const levels = [];
  for (let i = 0; i <= capRows; i++) { const th = (i / capRows) * Math.PI / 2; levels.push({y: r - r * Math.cos(th), inset: r - r * Math.sin(th), ny: -Math.cos(th)}); }
  for (let i = 1; i < rows; i++) levels.push({y: r + (h - 2 * r) * i / rows, inset: 0, ny: 0});
  for (let i = capRows; i >= 0; i--) { const th = (i / capRows) * Math.PI / 2; levels.push({y: h - r + r * Math.cos(th), inset: r - r * Math.sin(th), ny: Math.cos(th)}); }
  const pos = [], nor = [], idx = [];
  let per = 0;
  for (const L of levels) {
    const v = L.y / h, [a, b, dz] = profile(Math.min(1, Math.max(0, v)));
    const pts = ring(Math.max(.02, a - L.inset), Math.max(.02, b - L.inset), Math.max(.01, rc - L.inset * .6));
    per = pts.length;
    const k = Math.sqrt(1 - L.ny * L.ny);
    for (const [x, z, nx, nz] of pts) { pos.push(x, L.y - h / 2, z + dz); nor.push(nx * k, L.ny, nz * k); }
  }
  for (let l = 0; l < levels.length - 1; l++) for (let i = 0; i < per; i++) {
    const j = (i + 1) % per, A = l * per + i, B = l * per + j, C = (l + 1) * per + j, D = (l + 1) * per + i;
    idx.push(A, C, B, A, D, C);
  }
  // Caps: fan to a centre point.
  const base = pos.length / 3;
  const [a0, b0, dz0] = profile(0), [a1, b1, dz1] = profile(1);
  pos.push(0, -h / 2, dz0, 0, h / 2, dz1); nor.push(0, -1, 0, 0, 1, 0);
  const top = (levels.length - 1) * per;
  for (let i = 0; i < per; i++) { const j = (i + 1) % per; idx.push(base, i, j); idx.push(base + 1, top + j, top + i); }
  let g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  g = g.toNonIndexed();
  // Per-triangle face group + UV, projected the way BoxGeometry maps each face, normalised
  // by the local cross-section so a painted shirt follows the waist and hips.
  const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2);
  const ext = y => { const v = Math.min(1, Math.max(0, (y + h / 2) / h)); return profile(v); };
  g.clearGroups();
  let cur = -1, start = 0;
  const tris = [];
  const fn = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3(), p0 = new T.Vector3(), p1 = new T.Vector3(), p2 = new T.Vector3();
  for (let t = 0; t < P.count; t += 3) {
    p0.fromBufferAttribute(P, t); p1.fromBufferAttribute(P, t + 1); p2.fromBufferAttribute(P, t + 2);
    fn.crossVectors(e1.subVectors(p1, p0), e2.subVectors(p2, p0)).normalize();
    const ax = Math.abs(fn.x), ay = Math.abs(fn.y), az = Math.abs(fn.z);
    const side = ay > ax && ay > az ? (fn.y > 0 ? 'top' : 'bottom') : ax > az ? (fn.x > 0 ? 'right' : 'left') : (fn.z > 0 ? 'front' : 'back');
    tris.push(side);
    for (let k = 0; k < 3; k++) {
      const x = P.getX(t + k), y = P.getY(t + k), z = P.getZ(t + k), [a, b, dz] = ext(y), zz = z - dz;
      const fy = (y + h / 2) / h, fx = (x / a + 1) / 2, fz = (zz / b + 1) / 2;
      const [u, v] = {front: [fx, fy], back: [1 - fx, fy], right: [1 - fz, fy], left: [fz, fy], top: [fx, 1 - fz], bottom: [fx, fz]}[side];
      uv[(t + k) * 2] = Math.min(1, Math.max(0, u)); uv[(t + k) * 2 + 1] = Math.min(1, Math.max(0, v));
    }
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  // Sort triangles by face so each material group is one contiguous range.
  const order = [...tris.keys()].sort((i, j) => GROUP[tris[i]] - GROUP[tris[j]]);
  const remap = (attr, n) => { const src = attr.array, dst = new Float32Array(src.length); order.forEach((tIdx, o) => dst.set(src.subarray(tIdx * 3 * n, tIdx * 3 * n + 3 * n), o * 3 * n)); return new T.BufferAttribute(dst, n); };
  g.setAttribute('position', remap(g.attributes.position, 3)); g.setAttribute('normal', remap(g.attributes.normal, 3)); g.setAttribute('uv', remap(g.attributes.uv, 2));
  order.forEach((tIdx, o) => { const gi = GROUP[tris[tIdx]]; if (gi !== cur) { if (cur >= 0) g.addGroup(start, o * 3 - start, cur); cur = gi; start = o * 3; } });
  g.addGroup(start, order.length * 3 - start, cur);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixv = (a, b, t) => a + (b - a) * t;
// Torso outline from hip (v=0) to shoulder (v=1): widths at hip, waist, chest, shoulder; depths likewise.
function torsoProfile({hip, waist, chest, shoulder, dHip, dWaist, dChest, waistAt = .38, chestAt = .7, bust = 0}) {
  return v => {
    const w = v < waistAt ? mixv(hip, waist, smooth(0, waistAt, v)) : v < chestAt ? mixv(waist, chest, smooth(waistAt, chestAt, v)) : mixv(chest, shoulder, smooth(chestAt, 1, v));
    const d = v < waistAt ? mixv(dHip, dWaist, smooth(0, waistAt, v)) : mixv(dWaist, dChest, smooth(waistAt, .95, v));
    // A soft, modest bust: extra depth on the front only, centred on the chest line.
    const bump = bust * Math.exp(-(((v - .66) / .11) ** 2));
    return [w / 2, d / 2 + bump / 2, bump / 2];
  };
}
const limb = (w, d) => () => [w / 2, d / 2, 0];

// Builds (studs). Torso height stays 2, legs 2: feet, seats and hand helpers keep working.
export const BODIES = Object.freeze({
  man: {torso: {hip: 1.9, waist: 1.84, chest: 2.04, shoulder: 2.12, dHip: .98, dWaist: .96, dChest: 1.06}, arm: [1.0, 1.0], leg: [.96, .98], hipX: .48, armGap: .03, r: .07},
  woman: {torso: {hip: 1.78, waist: 1.42, chest: 1.62, shoulder: 1.7, dHip: .9, dWaist: .8, dChest: .84, waistAt: .4, chestAt: .72, bust: .16}, arm: [.72, .76], leg: [.86, .88], hipX: .45, armGap: .03, r: .07},
  boy: {torso: {hip: 1.82, waist: 1.8, chest: 1.9, shoulder: 1.96, dHip: .96, dWaist: .94, dChest: 1.0}, arm: [.88, .9], leg: [.9, .92], hipX: .47, armGap: .03, r: .08},
  girl: {torso: {hip: 1.7, waist: 1.5, chest: 1.6, shoulder: 1.66, dHip: .88, dWaist: .84, dChest: .86, waistAt: .42}, arm: [.74, .78], leg: [.82, .84], hipX: .43, armGap: .03, r: .08},
});
export const BODY_TYPES = Object.keys(BODIES);

const geoCache = new Map();
function geometryFor(type, part) {
  const key = type + ':' + part; if (geoCache.has(key)) return geoCache.get(key);
  const B = BODIES[type]; let g;
  if (part === 'torso') g = shapedBlock({h: 2, profile: torsoProfile(B.torso), r: B.r, rc: .1, rows: 16});
  if (part === 'arm') g = shapedBlock({h: 1.99, profile: limb(...B.arm), r: B.r * 1.4, rc: .1, rows: 4});
  if (part === 'leg') g = shapedBlock({h: 2, profile: limb(...B.leg), r: B.r, rc: .08, rows: 4});
  geoCache.set(key, g); return g;
}

// Re-shape an avatar built on the classic body. Called once at build time; poses only rotate pivots.
export function applyBody(a, type) {
  const B = BODIES[type]; if (!B) throw new Error('Unknown body type: ' + type);
  const P = a.parts, V = a.pivots;
  P.torso.geometry = geometryFor(type, 'torso');
  const shoulderX = B.torso.shoulder / 2 + B.arm[0] / 2 + B.armGap, jointDrop = .42;
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    P[side + 'Arm'].geometry = geometryFor(type, 'arm');
    V[side + 'Shoulder'].position.set(sign * shoulderX, 4.02 - jointDrop, 0);
    P[side + 'Arm'].position.set(0, -.995 + jointDrop, 0);
    P[side + 'Leg'].geometry = geometryFor(type, 'leg');
    V[side + 'Hip'].position.set(sign * B.hipX, 2, 0);
  }
  a.restPositions = Object.fromEntries(Object.entries(V).map(([n, p]) => [n, p.position.toArray()]));
  a.body = {type, ...B, shoulderX};
  return a;
}

// A shell that hugs a body part with `inflate` studs of clearance (outer clothing layers).
export function bodyShell(type, part, inflate = .05, {h} = {}) {
  const B = BODIES[type];
  if (part === 'torso') { const p = torsoProfile(B.torso); return shapedBlock({h: h ?? 2 + inflate * 2, profile: v => { const [a, b, dz] = p(v); return [a + inflate, b + inflate, dz]; }, r: B.r + inflate, rc: .1 + inflate, rows: 16}); }
  const [w, d] = part === 'arm' ? B.arm : B.leg;
  return shapedBlock({h: h ?? (part === 'arm' ? 1.99 : 2) + inflate * 2, profile: limb(w + inflate * 2, d + inflate * 2), r: B.r * 1.4, rc: .1 + inflate, rows: 4});
}
