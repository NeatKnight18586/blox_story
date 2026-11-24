// engine/beast.js — tuft 2A BEAST KIT (pure: no three, no DOM, no clock, no Math.random). Presets are DATA (beasts/*.json).
// Rigid segments like R6 (no skinning): QUAD (body, neck, head, jaw, 2 ears, tail ×2, 4 legs ×2), BIRD (body, neck, head, beak = jaw,
// 2 wings ×2, tail fan, 2 legs), DRAGON = QUAD + 2 wings ×2 (+ horns as head parts), BLINK = a glow sprite + 2 wing cards (beastrt).
// Look rules (every beast): low-poly FACETED parts (flat shading, chunky), dark satin base, per-vertex glow mask `aGlow` (rgb = glow
// colour, a = group 0 seam · 1 mouth · 2 eye) → emissive × HDR in engine/beastrt.js; bone-white horns / claws; one glow colour each.
// States (pure in t, seeded): idle walk run roar breathe flinch flee lower lift fly perch sleep curl — anticipation (a short counter-
// move) + settle (back-out overshoot) on every change, like acting6. Root motion: walk / run / fly [to], flee along an exit direction.
// Plant: ground states touch the ground with the lowest vertex (exact, every vertex of the mesh); nothing ever goes below it.
export const STATES = ['idle', 'walk', 'run', 'roar', 'breathe', 'flinch', 'flee', 'lower', 'lift', 'fly', 'perch', 'sleep', 'curl', 'tremble', 'sneeze', 'hide', 'puff'];   // 2B: tremble sneeze hide puff (rig 'puff'; other rigs play them as idle)
export const TIER_MAX = {hero: 6000, low: 800};
export const KID_H = 5.3 * .82, ADULT_H = 5.3;   // R6 kid (troupe LEAD .82) / adult height in studs (cast/troupe-r6.json, engine/cine.js 5.3 × scale)
export const RESERVED_GLOW = ['#7FB8FF', '#FFD36B'];   // Tuft's blue-gold (2B): no beast may use it (RGB distance ≥ 60 from both ends)
export const ANTIC = {t: .14, a: .16}, FADE = .32, TURN = .4, FLEE_DUR = 2.6;
const PI = Math.PI, cl01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = cl01(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u;
const frac = x => x - Math.floor(x);
export const hashSeed = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export const rgbDist = (a, b) => Math.hypot(...hex(a).map((v, i) => 255 * (v - hex(b)[i])));

// ---- 3×3 rotations (row-major), R = Ry(y) · Rx(x) · Rz(z) ----------------------------------------------------------------------
const mm = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
const mv = (R, v) => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
const Rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const Ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const Rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
export const rot3 = ([x, y, z]) => mm(mm(Ry(y), Rx(x)), Rz(z));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl3 = (a, k) => k === 1 ? a : [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const D = Math.PI / 180;
import {quillScale, windAt} from './puff.js';

// ---- skeleton (from the preset's dims) -------------------------------------------------------------------------------------------
// Frames: +z forward, +y up, +x = the beast's left. Neck / head / jaw extend +z, tails −z, legs −y, left wings +x (right −x).
export function skeleton(P) {
  const d = P.dims, k0 = P.scale ?? 1, S = {}, put = (n, parent, pivot, rest = [0, 0, 0]) => { S[n] = {parent, pivot: pivot.map(v => v * k0), rest}; };   // preset `scale`: the whole rig (dims stay in unscaled studs)
  if (P.rig === 'blink') { put('body', null, [0, 0, 0]); return {seg: S, order: ['body']}; }
  if (P.rig === 'puff') { put('body', null, [0, d.bodyY, 0]); for (let i = 0; i < 6; i++) put('q' + i, 'body', [0, 0, 0]);   // 2B TUFT: body + 6 quill clusters (ripple / extend) + 2 feet
    for (const [s2, k] of [['L', 1], ['R', -1]]) put('foot' + s2, 'body', [k * d.footX, -d.bodyY + d.footH, d.footZ ?? 0]); return {seg: S, order: ['body', 'q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'footL', 'footR']}; }
  const bird = P.rig === 'bird', bh = d.bodyH, bl = d.bodyL, bw = d.bodyW;
  put('body', null, [0, d.legH + bh / 2, 0]);
  put('neck', 'body', [0, bh * (d.neckY ?? .25), bl * (d.neckZ ?? .45)], [-(d.neckUp ?? 30) * D, 0, 0]);
  put('head', 'neck', [0, 0, d.neckL], [(d.neckUp ?? 30) * D * (d.headLevel ?? .85), 0, 0]);
  put('jaw', 'head', d.jawAt ?? [0, -d.headH * .25, d.headL * .1]);
  if (bird) {
    put('tailFan', 'body', [0, bh * .1, -bl * .48], [(d.tailUp ?? 10) * D, 0, 0]);
    for (const [s, k] of [['L', 1], ['R', -1]]) { put('leg' + s, 'body', [k * bw * .22, -bh * .3, bl * .05]);
      put('wing' + s + '1', 'body', [k * bw * .42, bh * .28, bl * .18]); put('wing' + s + '2', 'wing' + s + '1', [k * d.wing1L, 0, 0]); }
  } else {
    if (d.ears !== false) for (const [s, k] of [['L', 1], ['R', -1]]) put('ear' + s, 'head', [k * d.headW * .32, d.headH * .42, -d.headL * .05]);
    put('tail1', 'body', [0, bh * .2, -bl * .48], [(d.tailUp ?? -20) * D, 0, 0]); put('tail2', 'tail1', [0, 0, -d.tailL / 2], [(d.tail2Up ?? -10) * D, 0, 0]);
    const ly = -bh * (d.hipDrop ?? .3), up = (d.legH + bh / 2 + ly) / 2;
    for (const [s, x, z] of [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]]) {
      put('leg' + s + '1', 'body', [x * bw * (d.legX ?? .36), ly, z * bl * (d.legZ ?? .36)]); put('leg' + s + '2', 'leg' + s + '1', [0, -up, 0]); }
    if (P.rig === 'dragon') for (const [s, k] of [['L', 1], ['R', -1]]) { put('wing' + s + '1', 'body', [k * bw * .42, bh * .38, bl * .16]); put('wing' + s + '2', 'wing' + s + '1', [k * d.wing1L, 0, 0]); }
  }
  // topological order (parents first)
  const order = [], seen = new Set(), visit = n => { if (seen.has(n)) return; if (S[n].parent) visit(S[n].parent); seen.add(n); order.push(n); };
  Object.keys(S).forEach(visit); return {seg: S, order};
}
export const legLen = P => { const d = P.dims, ly = -d.bodyH * (d.hipDrop ?? .3); return (d.legH + d.bodyH / 2 + ly) / 2; };

// ---- faceted primitives (non-indexed triangles, outward winding, per-triangle glow) ---------------------------------------------
const AXIS = {z: [0, 0, 0], '-z': [0, PI, 0], y: [-PI / 2, 0, 0], '-y': [PI / 2, 0, 0], x: [0, PI / 2, 0], '-x': [0, -PI / 2, 0]};
function prismTris(n, rx, ry, len, taper, phase = .5) {   // along +z from 0 to len; u = centroid fraction along the axis
  const ring = (z, k) => Array.from({length: n}, (_, i) => { const a = 2 * PI * (i + phase) / n; return [rx * k * Math.cos(a), ry * k * Math.sin(a), z]; });
  const A = ring(0, 1), B = ring(len, taper), out = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n;
    if (taper > 1e-3) { out.push([A[i], A[j], B[j], .5], [A[i], B[j], B[i], .5]); } else out.push([A[i], A[j], [0, 0, len], .6]); }
  for (let i = 1; i < n - 1; i++) out.push([A[0], A[i], A[i + 1], 0]);
  if (taper > 1e-3) for (let i = 1; i < n - 1; i++) out.push([B[0], B[i], B[i + 1], 1]);
  return out; }
function gemTris(n, m, [sx, sy, sz]) {   // faceted ellipsoid: n around (about z), m rings between the poles (pole axis = z: long beasts)
  const P0 = [0, 0, sz / 2], P1 = [0, 0, -sz / 2], R = [];
  for (let k = 1; k <= m; k++) { const ph = PI * k / (m + 1), c = Math.cos(ph), s = Math.sin(ph);
    R.push(Array.from({length: n}, (_, i) => { const a = 2 * PI * (i + .5 * (k % 2)) / n; return [sx / 2 * s * Math.cos(a), sy / 2 * s * Math.sin(a), sz / 2 * c]; })); }
  const out = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push([P0, R[0][i], R[0][j], 1]); out.push([P1, R[m - 1][j], R[m - 1][i], 0]); }
  for (let k = 0; k < m - 1; k++) for (let i = 0; i < n; i++) { const j = (i + 1) % n, A = R[k], B = R[k + 1];
    if (k % 2 === 0) out.push([A[i], B[i], A[j], .5], [A[j], B[i], B[j], .5]); else out.push([A[i], B[i], B[j], .5], [A[i], B[j], A[j], .5]); }
  return out; }
function boxTris([x, y, z]) { const h = [x / 2, y / 2, z / 2], v = (a, b, c) => [a * h[0], b * h[1], c * h[2]], out = [];
  const F = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
    [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]];
  for (const f of F) { const q = f.map(c => v(...c)); out.push([q[0], q[1], q[2], .5], [q[0], q[2], q[3], .5]); } return out; }
function slabTris(pts, th) {   // polygon in (x, z), extruded ±th/2 in y (wing membranes, feathers)
  const T = pts.map(([x, z]) => [x, th / 2, z]), B = pts.map(([x, z]) => [x, -th / 2, z]), out = [], n = pts.length;
  for (let i = 1; i < n - 1; i++) { out.push([T[0], T[i], T[i + 1], .5]); out.push([B[0], B[i + 1], B[i], .5]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push([T[i], B[i], B[j], .5], [T[i], B[j], T[j], .5]); }
  return out; }

// expand the preset's part list for a tier: mirror L → R, drop `detail` parts and cap facets on the low tier
export function partList(P, tier = 'hero') {
  const low = tier === 'low', out = [];
  for (const p of P.parts) { if (low && p.detail) continue; if (!low && p.lowOnly) continue;
    const q = {...p}; if (low) { q.facets = Math.min(p.facets ?? 5, P.lowFacets ?? 4); q.rings = Math.min(p.rings ?? 2, 2); }
    out.push(q);
    if (p.mirror) { const m = {...q, seg: q.seg.replace(/L(\d?)$/, 'R$1'), axis: q.axis === 'x' ? '-x' : q.axis === '-x' ? 'x' : q.axis, offset: q.offset ? [-q.offset[0], q.offset[1], q.offset[2]] : q.offset,
      rot: q.rot ? [q.rot[0], -q.rot[1], -q.rot[2]] : q.rot, from: q.from ? [-q.from[0], q.from[1], q.from[2]] : q.from, to: q.to ? [-q.to[0], q.to[1], q.to[2]] : q.to,
      pts: q.pts ? q.pts.map(([x, z]) => [-x, z]) : q.pts, mirror: false}; out.push(m); } }
  return out; }
function partTris(p) {
  const n = Math.max(3, p.facets ?? 5);
  let tris;
  if (p.shape === 'box') tris = boxTris(p.size);
  else if (p.shape === 'gem') tris = gemTris(n, Math.max(1, p.rings ?? 2), p.size);
  else if (p.shape === 'slab') tris = slabTris(p.pts, p.thick ?? .08);
  else if (p.shape === 'strip') { const d = sub(p.to, p.from), L = Math.hypot(...d), r = p.r ?? .06;
    const t0 = prismTris(Math.max(3, p.facets ?? 3), r, r, L, p.taper ?? 1), yaw = Math.atan2(d[0], d[2]), pitch = -Math.asin(d[1] / L), R = mm(Ry(yaw), Rx(pitch));
    return t0.map(([a, b, c, u]) => [mv(R, a), mv(R, b), mv(R, c), u].map((v, i) => i < 3 ? add(v, p.from) : v)); }
  else { const [rx, ry] = p.r ?? [.2, .2]; tris = prismTris(n, rx, ry, p.len ?? 1, p.shape === 'cone' ? 0 : p.taper ?? 1); const R = rot3(AXIS[p.axis ?? 'z']); tris = tris.map(([a, b, c, u]) => [mv(R, a), mv(R, b), mv(R, c), u]); }
  const R = p.rot ? rot3(p.rot.map(v => v * D)) : null, o = p.offset ?? [0, 0, 0];
  return tris.map(([a, b, c, u]) => { const f = v => add(R ? mv(R, v) : v, o); return [f(a), f(b), f(c), u]; });
}
// the whole mesh of a preset at a tier: positions (segment-local), segment index, glow rgba, base colour (sRGB 0–1)
export function buildGeometry(P, tier = 'hero') {
  const sk = skeleton(P), segIx = Object.fromEntries(sk.order.map((n, i) => [n, i])), pos = [], seg = [], glow = [], col = [];
  const K = P.scale ?? 1, colorOf = c => hex(P.colors?.[c] ?? c ?? P.colors?.body ?? '#222222');
  for (const p of partList(P, tier)) {
    if (segIx[p.seg] === undefined) throw Error(`${P.name}: part on unknown segment "${p.seg}"`);
    const tris = partTris(p), c = colorOf(p.color), grp = p.glowGroup === 'mouth' ? 1 : p.glowGroup === 'eye' ? 2 : 0;
    const gc = hex(p.glowColor ?? (grp === 1 ? P.mouthGlow ?? P.glow : grp === 2 ? P.eyeGlow ?? P.glow : P.glow));   // 2B: part glowColor (TUFT's blue → gold tips)
    let cen = [0, 0, 0], nv = 0; for (const t of tris) for (let k = 0; k < 3; k++) { cen = add(cen, t[k]); nv++; } cen = cen.map(v => v / nv);
    for (const [a0, b0, c0, u] of tris) {
      let a = a0, b = b0, cc = c0; const nrm = cross(sub(b, a), sub(cc, a)), mid = [(a[0] + b[0] + cc[0]) / 3, (a[1] + b[1] + cc[1]) / 3, (a[2] + b[2] + cc[2]) / 3];
      if (dot(nrm, sub(mid, cen)) < 0) { b = c0; cc = b0; }   // outward winding (convex parts)
      const nl = Math.hypot(...nrm) || 1, ny = (dot(nrm, sub(mid, cen)) < 0 ? -nrm[1] : nrm[1]) / nl;
      const g = p.glow === 'all' ? 1 : p.glow === 'top' ? (ny > .45 ? 1 : 0) : p.glow === 'tip' ? (u >= (p.tipFrac ?? .6) ? 1 : 0) : 0;
      const gi = g * (p.glowK ?? 1);
      for (const v of [a, b, cc]) { pos.push(v[0] * K, v[1] * K, v[2] * K); seg.push(segIx[p.seg]); col.push(...(gi > 0 && p.glowBase !== false ? gc.map(x => x * .5) : c)); glow.push(gc[0] * gi, gc[1] * gi, gc[2] * gi, grp); }
    } }
  return {pos: Float32Array.from(pos), seg: Float32Array.from(seg), glow: Float32Array.from(glow), col: Float32Array.from(col), tris: pos.length / 9, segNames: sk.order, sk}; }
export const beastTris = (P, tier) => buildGeometry(P, tier).tris;
// unique vertices per segment (plant / bounds)
export function supportPoints(geo) { const seen = new Set(), out = [];
  for (let i = 0; i < geo.pos.length / 3; i++) { const k = `${geo.seg[i]}|${geo.pos[3 * i].toFixed(3)}|${geo.pos[3 * i + 1].toFixed(3)}|${geo.pos[3 * i + 2].toFixed(3)}`; if (seen.has(k)) continue; seen.add(k); out.push([geo.seg[i], geo.pos[3 * i], geo.pos[3 * i + 1], geo.pos[3 * i + 2]]); }
  return out; }

// ---- FK -------------------------------------------------------------------------------------------------------------------------
export function fk(sk, rots) {
  const W = {};
  for (const n of sk.order) { const s = sk.seg[n], r = rots[n] ?? [0, 0, 0], L = rot3([s.rest[0] + r[0], s.rest[1] + r[1], s.rest[2] + r[2]]);
    if (!s.parent) W[n] = {R: L, p: [...s.pivot]}; else { const P = W[s.parent]; W[n] = {R: mm(P.R, L), p: add(P.p, mv(P.R, s.pivot))}; } }
  return W; }

// ---- channels per state (pure in the state's local time τ and the global cycle time t) ---------------------------------------------
const Z = () => ({bodyPitch: 0, bodyYaw: 0, bodyRoll: 0, bodyY: 0, recoil: 0, neckX: 0, neckY: 0, headX: 0, headY: 0, jaw: .04, earX: 0, tailX: 0, tailY: 0, tail2Y: 0,
  lFL1: 0, lFL2: 0, lFR1: 0, lFR2: 0, lBL1: 0, lBL2: 0, lBR1: 0, lBR2: 0, w1Z: .3, w1Y: .95, w2Z: -.35, w2Y: 1.75, fan: 0, mouth: .2, eyes: 1, seam: 1});
const FOLD = {w1Z: .3, w1Y: .95, w2Z: -.35, w2Y: 1.75}, SPREAD = {w1Z: .55, w1Y: -.1, w2Z: .25, w2Y: 0};
const flapWave = u => { u = frac(u); return u < .4 ? Math.cos(PI * u / .4) : -Math.cos(PI * (u - .4) / .6); };   // 1 → −1 fast (downstroke), back slow
function legsQuad(c, A, K, ph, gallop) {   // trot (diagonal pairs) or gallop (front pair, back pair)
  const P = gallop ? {FL: 0, FR: .12, BL: .5, BR: .62} : {FL: 0, BR: 0, FR: .5, BL: .5};
  for (const [l, o] of Object.entries(P)) { const a = 2 * PI * (ph + o), swing = -A * Math.sin(a), lift = Math.max(0, Math.cos(a));
    c['l' + l + '1'] = swing; c['l' + l + '2'] = (l[0] === 'F' ? 1 : -.6) * K * lift; } }
export function channelsAt(P, state, tau, t, seed = 1) {
  if (P.rig === 'puff') return puffChannels(P, state, tau, t, seed);
  const c = Object.assign(Z(), P.fold ?? {}), FOLDP = {...FOLD, ...(P.fold ?? {})}, bird = P.rig === 'bird', winged = bird || P.rig === 'dragon', g = P.gait ?? {}, sd = (seed % 997) / 997, br = Math.sin(2 * PI * (t / (g.breath ?? 2.8) + sd));
  c.seam = 1 + .12 * Math.sin(2 * PI * (t / 2.2 + sd));
  const idle = () => { c.neckX = .04 * br; c.headX = -.03 * br; c.tailY = .18 * Math.sin(2 * PI * (t / 3.3 + sd)); c.tail2Y = .25 * Math.sin(2 * PI * (t / 3.3 + sd) - .8); c.bodyRoll = .012 * br; c.jaw = .04 + .02 * br;
    if (bird) { c.fan = .1; c.headY = .35 * Math.sin(2 * PI * (t / 4.1 + sd)) * (Math.sin(2 * PI * t / 4.1 * 2.3) > .2 ? 1 : .2); } };
  switch (state) {
    case 'idle': idle(); break;
    case 'walk': case 'run': case 'flee': {
      const run = state !== 'walk', f = run ? g.runHz ?? 2 : g.walkHz ?? 1.1, ph = t * f + sd;
      if (bird) { if (state === 'flee') return channelsAt(P, 'fly', tau, t, seed);
        const a = 2 * PI * ph; c.lBL1 = -(run ? .7 : .45) * Math.sin(a); c.lBR1 = -c.lBL1; c.neckX = .12 * Math.abs(Math.sin(a)) - (run ? .3 : 0); c.headX = -c.neckX * .6;
        if (run) { Object.assign(c, {w1Z: .1 + .25 * Math.sin(2 * a), w1Y: .5, w2Z: .1, w2Y: .6}); c.bodyPitch = .25; } break; }
      legsQuad(c, run ? .8 : .42, run ? 1.25 : .55, ph, run); const a = 2 * PI * ph;
      c.bodyPitch = run ? .07 * Math.sin(a + PI / 2) : 0; c.bodyRoll = run ? 0 : .025 * Math.sin(a); c.neckX = (run ? .14 : .05) * Math.sin(2 * a) + (run ? .25 : 0); c.headX = -c.neckX * .7;
      c.tailY = (run ? .12 : .22) * Math.sin(a); c.tailX = run ? .35 : 0; c.earX = run ? -.7 : 0; c.jaw = run ? .25 : .05;
      if (winged) Object.assign(c, run ? {w1Z: -.1, w1Y: .8, w2Y: 1.6} : FOLDP); if (state === 'flee') { c.earX = -1; c.eyes = 1; c.seam = 1.15; } break; }   // 2B: preset `fold` overrides the folded wing pose
    case 'roar': { const tr = .07 * Math.sin(2 * PI * 9 * t), rise = sm(tau / .45);
      if (bird) { Object.assign(c, {w1Z: .9, w1Y: -.2, w2Z: .4, w2Y: 0}); c.neckX = -.35 * rise; c.headX = -.15; c.jaw = .9 + tr; c.fan = 1; c.bodyPitch = -.3 * rise; }
      else { const rear = P.rig === 'dragon' ? (P.gait?.rear ?? 1) : .2; c.bodyPitch = -rear * rise; c.neckX = (-.55 - .1 * Math.sin(2 * PI * 1.3 * t)) * rise; c.headX = -.2 + .25 * rise; c.jaw = (.95 + tr) * rise + .04;
        c.lFL1 = c.lFR1 = (P.rig === 'dragon' ? -.9 : -.15) * rise + rear * rise * .4; c.lFL2 = c.lFR2 = (P.rig === 'dragon' ? 1.1 : .2) * rise;
        c.lBL1 = c.lBR1 = rear * rise * .85; c.lBL2 = c.lBR2 = -.15 * rise; c.tailX = .45 + rear * rise * .7; c.earX = -.8;
        if (winged) Object.assign(c, {w1Z: .75, w1Y: -.15, w2Z: .35, w2Y: 0}); }
      c.mouth = .7 + .3 * rise; c.seam = 1.35; break; }
    case 'breathe': { const pulse = .5 + .5 * Math.sin(2 * PI * 5 * t);
      c.neckX = .32; c.headX = -.28; c.jaw = .85 + .05 * Math.sin(2 * PI * 7 * t); c.bodyPitch = .06; c.lFL1 = c.lFR1 = -.28; c.lFL2 = c.lFR2 = .3; c.tailX = .25; c.earX = -.5;
      if (winged) Object.assign(c, {w1Z: .35, w1Y: .35, w2Z: .15, w2Y: .4}); c.mouth = 1.1 + .25 * pulse * sm(tau / .3); c.seam = 1.2; break; }
    case 'flinch': { c.bodyPitch = .12; c.recoil = -.45; c.neckX = .45; c.headX = .35; c.headY = .2; c.earX = -1.15; c.tailX = -.6; c.tailY = .3; c.eyes = .25; c.mouth = .08; c.jaw = .02;
      c.lFL1 = c.lFR1 = -.3; c.lFL2 = c.lFR2 = .65; c.lBL1 = c.lBR1 = .35; c.lBL2 = c.lBR2 = -.7; if (winged) Object.assign(c, {w1Z: -.5, w1Y: 1.3, w2Y: 2.4}); c.seam = .7; break; }
    case 'lower': idle(); c.neckX = bird ? .8 : .95; c.headX = -.6; c.bodyPitch = .14; c.lFL1 = c.lFR1 = -.35; c.lFL2 = c.lFR2 = .75; c.lBL1 = c.lBR1 = .1; c.earX = .25; c.jaw = .08; break;
    case 'lift': idle(); c.neckX = -.6; c.headX = .38; c.bodyPitch = -.12; c.lBL1 = c.lBR1 = .12; c.earX = -.2; c.tailX = .3; if (bird) Object.assign(c, {w1Z: .15, w1Y: .7}); break;
    case 'fly': { const f = g.flapHz ?? 1, u = t * f + sd, w = flapWave(u), w2 = flapWave(u - .09);
      Object.assign(c, {w1Z: .22 + .78 * w, w1Y: .05, w2Z: .32 * w2, w2Y: .15 * Math.max(0, -w)}); c.bodyY = -.22 * w; c.bodyPitch = .1 - .05 * w; c.neckX = bird ? .25 : .5; c.headX = bird ? -.25 : -.45;
      c.tailX = bird ? 0 : .5; c.tailY = .1 * Math.sin(2 * PI * u); c.fan = .5 + .3 * w;
      c.lBL1 = c.lBR1 = bird ? 1.25 : .9; c.lBL2 = c.lBR2 = bird ? 0 : .5; c.lFL1 = c.lFR1 = .7; c.lFL2 = c.lFR2 = -1.0; c.earX = -.8; break; }
    case 'perch': idle();
      if (!bird) { c.bodyPitch = -.5; c.lFL1 = c.lFR1 = .5; c.lBL1 = c.lBR1 = -.75; c.lBL2 = c.lBR2 = 1.55; c.neckX = -.1; c.headX = .35; c.tailX = .3; } else { c.lBL1 = c.lBR1 = 0; c.neckX = -.1; } break;
    case 'sleep': case 'curl': { const b2 = Math.sin(2 * PI * (t / 4.2 + sd)), curl = state === 'curl';
      c.bodyRoll = .015 * b2; c.eyes = curl ? .55 : 0; c.mouth = .06; c.seam = .55 + .1 * b2; c.jaw = .02; c.earX = curl ? .2 : -.9;
      if (bird) { c.neckX = .9; c.neckY = curl ? .9 : 1.9; c.headY = curl ? .5 : 1.2; c.lBL1 = c.lBR1 = 1.4; c.fan = 0; }
      else { c.lFL1 = c.lFR1 = -1.4; c.lFL2 = c.lFR2 = 2.3; c.lBL1 = c.lBR1 = -1.1; c.lBL2 = c.lBR2 = 1.9; c.neckX = 1.05 + .03 * b2; c.neckY = curl ? 1.0 : .35; c.headX = -.55; c.headY = curl ? .6 : .2;
        c.tailX = -.2; c.tailY = curl ? -1.2 : .9; c.tail2Y = curl ? -.9 : .7; } break; }
    default: idle();
  }
  return c; }
// 2B TUFT (rig 'puff'): idle breath, tremble (fast shiver), sneeze (wind-up, snap, one sparkle), hide (squash, eyes shut), run (feet scurry, bob), puff (idle + quills bristle)
export function puffChannels(P, state, tau, t, seed = 1) {
  const sd = (seed % 997) / 997, br = Math.sin(2 * PI * (t / 2.2 + sd)), c = {bodyPitch: 0, bodyYaw: 0, bodyRoll: 0, bodyY: 0, recoil: 0, squash: 1 + .025 * br, eyes: 1, seam: 1, mouth: 0, sparkle: 0, fL: 0, fR: 0, bristle: 0};
  for (let i = 0; i < 6; i++) c['q' + i] = .035 * Math.sin(2 * PI * (t / 2.2 + sd) - i * .7);
  switch (state) {
    case 'tremble': { const f = Math.sin(2 * PI * 13 * t), g = Math.sin(2 * PI * 17 * t + 1); c.bodyRoll = .06 * f; c.bodyYaw = .04 * g; c.squash = .94; c.eyes = 1.1; for (let i = 0; i < 6; i++) c['q' + i] = .09 * Math.sin(2 * PI * 15 * t + i * 1.3); break; }
    case 'sneeze': { const wind = sm(tau / .45), snap = tau < .45 ? 0 : Math.exp(-(tau - .45) / .12);
      c.bodyPitch = -.32 * wind * (tau < .45 ? 1 : 0) + .45 * snap; c.squash = tau < .45 ? 1 + .1 * wind : 1 - .12 * snap; c.eyes = tau < .45 ? 1 - .7 * wind : 1 - .9 * snap; c.mouth = snap;
      c.sparkle = tau >= .45 && tau < 1.05 ? Math.exp(-(tau - .45) / .22) : 0; for (let i = 0; i < 6; i++) c['q' + i] += .25 * snap * Math.sin(i * 2.1); c.bristle = .25 * snap; break; }
    case 'hide': { const u = sm(tau / .3); c.squash = 1 - .28 * u; c.eyes = 1 - .85 * u; c.bodyPitch = .2 * u; for (let i = 0; i < 6; i++) c['q' + i] = -.12 * u; break; }
    case 'run': { const a = 2 * PI * (P.gait?.runHz ?? 4.5) * t; c.fL = .9 * Math.sin(a); c.fR = -c.fL; c.bodyRoll = .06 * Math.sin(a); c.bodyPitch = .12; c.squash = 1 + .06 * Math.abs(Math.sin(a)); break; }
    case 'puff': c.bristle = .6 * sm(tau / .3); c.eyes = 1.15; break;
  }
  return c; }
// rig → segment rotations from channels
export function segRots(P, c, sk) {
  if (P.rig === 'puff') { const r = {body: [c.bodyPitch, c.bodyYaw, c.bodyRoll], footL: [c.fL, 0, 0], footR: [c.fR, 0, 0]}; for (let i = 0; i < 6; i++) r['q' + i] = [c['q' + i], 0, c['q' + i] * .6]; return r; }
  const r = {body: [c.bodyPitch, c.bodyYaw, c.bodyRoll], neck: [c.neckX, c.neckY, 0], head: [c.headX, c.headY, 0], jaw: [c.jaw * (P.dims.jawMax ?? .7), 0, 0]};
  if (P.rig === 'bird') { r.tailFan = [c.tailX * .5, c.tailY * .4, 0]; r.legL = [c.lBL1, 0, 0]; r.legR = [c.lBR1, 0, 0]; }
  else { r.earL = [c.earX, 0, 0]; r.earR = [c.earX, 0, 0]; r.tail1 = [c.tailX, c.tailY, 0]; r.tail2 = [c.tailX * .6, c.tail2Y, 0];
    for (const l of ['FL', 'FR', 'BL', 'BR']) { r['leg' + l + '1'] = [c['l' + l + '1'], 0, 0]; r['leg' + l + '2'] = [c['l' + l + '2'], 0, 0]; } }
  if (sk.seg.wingL1) { r.wingL1 = [0, c.w1Y, c.w1Z]; r.wingR1 = [0, -c.w1Y, -c.w1Z]; r.wingL2 = [0, c.w2Y, c.w2Z]; r.wingR2 = [0, -c.w2Y, -c.w2Z]; }
  return r; }

// ---- anticipation + settle (like acting6): blend weight of the new state at τ ------------------------------------------------------
export const ANT_BY = {flinch: 0, roar: .24, run: .18, flee: .2, fly: .22, breathe: .2, lift: .14};
export const FADE_BY = {flinch: .12, roar: .4, sleep: .7, curl: .7, fly: .45};
export function blendW(state, tau) {
  const A = ANT_BY[state] ?? ANTIC.a, Ta = A > 0 ? ANTIC.t : 0, Dd = FADE_BY[state] ?? FADE;
  if (tau < Ta) return -A * Math.sin(PI * tau / Ta) * .5;
  const u = cl01((tau - Ta) / Dd), c1 = state === 'flinch' ? 2.2 : 1.3, c3 = c1 + 1; return u >= 1 ? 1 : 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; }
const isAir = (P, s) => s === 'fly' || (P.rig === 'bird' && s === 'flee');
const MOVES = new Set(['walk', 'run', 'flee', 'fly']);

// ---- track: [{t, state, to?: [x, z] | [x, y, z], exit?: [dx, dz]}] sorted, plus start {p: [x, z], yaw (rad)} ----------------------
export function normTrack(track) { return [...track].sort((a, b) => a.t - b.t); }
const turnTo = (y0, y1, u) => { let d = y1 - y0; d = Math.atan2(Math.sin(d), Math.cos(d)); return y0 + d * sm(u); };
function speedOf(P, s) { const g = P.gait ?? {}; return s === 'walk' ? g.walkSpeed ?? 2 : s === 'run' ? g.runSpeed ?? 6 : s === 'flee' ? (g.runSpeed ?? 6) * 1.3 : s === 'fly' || s === 'perch' ? g.flySpeed ?? 7 : 0; }
const distAt = (v, d, acc = .45) => d <= 0 ? 0 : d < acc ? v * d * d / (2 * acc) : v * (d - acc / 2);
// one key held for d seconds from state s → the next root state
function advance(P, k, s, d) {
  const air = isAir(P, k.state) || (P.rig === 'bird' && k.state === 'perch' && k.to), alt0 = s.alt, altT = air ? (P.dims.flyH ?? 4) * (P.scale ?? 1) : 0;
  const Ta = (ANT_BY[k.state] ?? ANTIC.a) > 0 ? ANTIC.t : 0, v = speedOf(P, k.state), dm = Math.max(0, d - Ta);
  let {x, z, yaw} = s, arrived = null;
  if (k.state === 'flee' || (MOVES.has(k.state) && !k.to && k.state !== 'fly')) {
    const dir = k.state === 'flee' && k.exit ? k.exit : [Math.sin(s.yaw), Math.cos(s.yaw)], n = Math.hypot(...dir) || 1, yT = Math.atan2(dir[0], dir[1]);
    yaw = turnTo(s.yaw, yT, d / TURN); const L = distAt(v, dm); x += dir[0] / n * L; z += dir[1] / n * L; }
  else if (k.to && (MOVES.has(k.state) || k.state === 'perch')) {
    const dx = k.to[0] - s.x, dz = k.to[k.to.length - 1] - s.z, Dd = Math.hypot(dx, dz), yT = Dd > 1e-6 ? Math.atan2(dx, dz) : s.yaw, L = distAt(v, dm), u = Dd > 1e-6 ? Math.min(1, L / Dd) : 1;
    yaw = turnTo(s.yaw, yT, d / TURN); x += dx * u; z += dz * u;
    if (u >= 1) { let lo = 0, hi = d; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (distAt(v, Math.max(0, m - Ta)) >= Dd) hi = m; else lo = m; } arrived = k.t + hi; } }
  else if (k.to) { const dx = k.to[0] - s.x, dz = k.to[k.to.length - 1] - s.z; if (Math.hypot(dx, dz) > 1e-6) yaw = turnTo(s.yaw, Math.atan2(dx, dz), d / (TURN * 1.3)); }
  let alt = lerp(alt0, altT, sm(d / (air ? .8 : .6)));
  if (P.rig === 'bird' && k.state === 'perch' && k.to) { const prog = arrived ? 1 : 0; alt = arrived && k.t + d >= arrived ? lerp((P.dims.flyH ?? 4) * (P.scale ?? 1), 0, sm((k.t + d - arrived) / .5)) : alt * (1 - prog); }
  return {x, z, yaw, alt, arrived}; }
export function rootAt(P, track, start, t) {
  let s = {x: start.p[0], z: start.p[1], yaw: start.yaw ?? 0, alt: start.alt ?? 0, arrived: null}, ki = -1;
  for (let i = 0; i < track.length; i++) { const k = track[i]; if (t < k.t) break; ki = i; const t1 = Math.min(t, track[i + 1]?.t ?? Infinity); s = advance(P, k, {...s}, t1 - k.t); if (t1 < (track[i + 1]?.t ?? Infinity)) break; }
  return {...s, key: ki}; }

// channels at t with the transition blend (the previous key's channels, recursively to depth 3)
export function blendedAt(P, track, t, seed, depth = 3, start = null) {
  let i = -1; for (let k = 0; k < track.length; k++) if (t >= track[k].t) i = k;
  const k = track[Math.max(0, i)], tau = i < 0 ? 0 : t - k.t;
  let state = k?.state ?? 'idle';
  // a mover that arrived at its `to` settles into idle (no treadmill)
  if (start && k?.to && MOVES.has(state) && i >= 0) { const r = rootAt(P, track.slice(0, i + 1), start, t); if (r.arrived !== null && t >= r.arrived) {
    const cA = channelsAt(P, state, tau, t, seed), cI = channelsAt(P, P.rig === 'bird' ? 'perch' : 'idle', t - r.arrived, t, seed), w = blendW('idle', t - r.arrived);
    return mixCh(cA, cI, w); } }
  const cur = channelsAt(P, state, tau, t, seed);
  if (i <= 0 || depth <= 0) return cur;
  const prev = blendedAt(P, track.slice(0, i), t, seed, depth - 1, start), w = blendW(state, tau);
  return w >= 1 ? cur : mixCh(prev, cur, w); }
const mixCh = (a, b, w) => Object.fromEntries(Object.keys(a).map(n => [n, a[n] + (b[n] - a[n]) * w]));

// ---- the whole sample: root (planted), segments (root-local), glow ------------------------------------------------------------------
// opts {seed, groundY(x, z), geo (buildGeometry), support (supportPoints), start {p:[x,z], yaw}, glowT (t on ones)}
export function sampleBeast(P, track, t, opts = {}) {
  const {seed = 1, groundY = () => 0, start = {p: [0, 0], yaw: 0}, glowT = t} = opts, geo = opts.geo ?? buildGeometry(P, opts.tier ?? 'hero'), sk = geo.sk;
  const sup = opts.support ?? supportPoints(geo), tr = normTrack(track), r = rootAt(P, tr, start, t), ki = Math.max(0, r.key), k = tr[ki] ?? {state: 'idle'};
  const ch = blendedAt(P, tr, t, seed, 3, start), cg = glowT === t ? ch : blendedAt(P, tr, glowT, seed, 3, start), W = fk(sk, segRots(P, ch, sk));
  const K = opts.scale ?? 1;   // 2B: uniform root scale (TUFT puff); rig 'puff' also squashes the body and extends the quill clusters
  if (P.rig === 'puff' && K > 10) { for (let i = 0; i < 6; i++) ch['q' + i] += windAt(K, t, i); Object.assign(W, fk(sk, segRots(P, ch, sk))); }   // colossal: wind ripples through the fluff
  if (P.rig === 'puff') { const sq = ch.squash ?? 1, qs = quillScale(K) * (1 + .25 * (ch.bristle ?? 0)), b = W.body.R; W.body = {...W.body, R: [b[0] / Math.sqrt(sq), b[1] * sq, b[2] / Math.sqrt(sq), b[3] / Math.sqrt(sq), b[4] * sq, b[5] / Math.sqrt(sq), b[6] / Math.sqrt(sq), b[7] * sq, b[8] / Math.sqrt(sq)]};
    for (let i = 0; i < 6; i++) { const w = W['q' + i]; W['q' + i] = {...w, R: w.R.map((v, j) => v * qs * (j % 3 === 1 ? sq : 1))}; } }
  let lowest = Infinity; for (const [si, x, y, z] of sup) { const w = W[sk.order[si]], py = w.R[3] * x + w.R[4] * y + w.R[5] * z + w.p[1]; if (py < lowest) lowest = py; }
  const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw), x = r.x + fx * ch.recoil, z = r.z + fz * ch.recoil, gy = groundY(x, z), air = isAir(P, k.state) || r.alt > 1e-4;
  const y = Math.max(gy - lowest * K, air ? gy + r.alt + ch.bodyY : -Infinity);
  return {root: {p: [x, y, z], yaw: r.yaw, ...(K !== 1 ? {k: K} : {})}, segs: W, order: sk.order, state: k.state, air, lowest: y + lowest * K - gy, ch,
    glow: {seam: cg.seam, mouth: cg.mouth, eye: cg.eyes, sparkle: cg.sparkle ?? 0}, arrived: r.arrived}; }
// world position of a root-local point (segment frame) of a sample
export function worldOf(s, seg, v = [0, 0, 0]) { const w = s.segs[seg], l = scl3(add(mv(w.R, v), w.p), s.root.k ?? 1), c = Math.cos(s.root.yaw), sn = Math.sin(s.root.yaw);
  return [s.root.p[0] + c * l[0] + sn * l[2], s.root.p[1] + l[1], s.root.p[2] - sn * l[0] + c * l[2]]; }
// segment matrices (3 rows × vec4 per segment, root-local) for the GPU texture
export function segRows(s, out = null, off = 0) { const n = s.order.length, a = out ?? new Float32Array(n * 12);
  s.order.forEach((name, i) => { const {R, p} = s.segs[name], o = off + i * 12; a.set([R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2]], o); }); return a; }
// all mesh vertices in world space (tests: plant, silhouettes, exits)
export function worldVerts(s, geo) { const out = new Float32Array(geo.pos.length), c = Math.cos(s.root.yaw), sn = Math.sin(s.root.yaw);
  for (let i = 0; i < geo.pos.length / 3; i++) { const w = s.segs[s.order[geo.seg[i]]], v = [geo.pos[3 * i], geo.pos[3 * i + 1], geo.pos[3 * i + 2]], l = scl3(add(mv(w.R, v), w.p), s.root.k ?? 1);
    out[3 * i] = s.root.p[0] + c * l[0] + sn * l[2]; out[3 * i + 1] = s.root.p[1] + l[1]; out[3 * i + 2] = s.root.p[2] - sn * l[0] + c * l[2]; } return out; }

// ---- crowds (low tier): a parade column / a flee herd, pure in t --------------------------------------------------------------------
// cfg {presets: [...names], n, at: [x, z], dir: [dx, dz], length, width, speed, state: 'walk'|'run'|'flee'|'idle', seed}
export function crowdMembers(cfg) {
  let s = (cfg.seed ?? 7) >>> 0 || 1; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
  const n = cfg.n ?? 40, L = cfg.length ?? 60, Wd = cfg.width ?? 6, out = [];
  for (let i = 0; i < n; i++) { const along = (i + .5) / n * L + (rnd() - .5) * L / n * .6, lane = (rnd() - .5) * Wd; out.push({i, preset: cfg.presets[Math.floor(rnd() * cfg.presets.length) % cfg.presets.length], along, lane, sp: .88 + .24 * rnd(), seed: 1 + Math.floor(rnd() * 9999)}); }
  return out; }
export function crowdRoot(cfg, m, t, P) {
  const d = cfg.dir ?? [1, 0], n = Math.hypot(...d) || 1, dx = d[0] / n, dz = d[1] / n, L = cfg.length ?? 60, st = cfg.state ?? 'walk', v = speedOf(P, st) * m.sp * (cfg.speed ?? 1);
  const t0 = cfg.from ?? 0, run = Math.max(0, t - t0), moved = st === 'idle' ? 0 : distAt(v, run, .6);
  let a = m.along + moved; if (cfg.loop !== false && st !== 'flee') a = ((a % L) + L) % L;
  return {x: cfg.at[0] + dx * (a - L / 2) - dz * m.lane, z: cfg.at[1] + dz * (a - L / 2) + dx * m.lane, yaw: Math.atan2(dx, dz)}; }
export function sampleCrowdMember(P, geo, sup, cfg, m, t, groundY = () => 0) {
  const r = crowdRoot(cfg, m, t, P), st = cfg.state ?? 'walk', ch = channelsAt(P, st, t, t + m.seed * .37, m.seed), W = fk(geo.sk, segRots(P, ch, geo.sk));
  let lowest = Infinity; for (const [si, x, y, z] of sup) { const w = W[geo.sk.order[si]], py = w.R[3] * x + w.R[4] * y + w.R[5] * z + w.p[1]; if (py < lowest) lowest = py; }
  return {root: {p: [r.x, groundY(r.x, r.z) - lowest, r.z], yaw: r.yaw}, segs: W, order: geo.sk.order, glow: {seam: ch.seam, mouth: ch.mouth, eye: ch.eyes}, state: st, lowest: 0}; }

// ---- BLINK (firefly): orbits a head; pure in t (on ones: it is a light) ------------------------------------------------------------
export const BLINK = {r: .95, rate: .42, bob: .22, up: .45, flap: 16};
export function blinkAt(t, head, seed = 1) {
  const sd = (seed % 997) / 997, a = 2 * PI * (BLINK.rate * t + sd), r = BLINK.r + .15 * Math.sin(2 * PI * (.31 * t + sd));
  const p = [head[0] + r * Math.cos(a), head[1] + BLINK.up + BLINK.bob * Math.sin(2 * PI * (1.1 * t + sd)), head[2] + r * Math.sin(a)];
  return {p, yaw: Math.atan2(-Math.sin(a), Math.cos(a)) , wing: Math.sin(2 * PI * BLINK.flap * t), glow: .85 + .15 * Math.sin(2 * PI * (2.3 * t + sd))}; }

// ---- exit direction (screen words → world xz) and the `beast:` story marker -------------------------------------------------------
export function exitDir(exit, cam) {
  if (Array.isArray(exit)) { const n = Math.hypot(exit[0], exit[exit.length - 1]) || 1; return [exit[0] / n, exit[exit.length - 1] / n]; }
  const f = [cam.target[0] - cam.position[0], cam.target[2] - cam.position[2]], n = Math.hypot(...f) || 1, fx = f[0] / n, fz = f[1] / n, right = [-fz, fx];
  return {right, left: [-right[0], -right[1]], away: [fx, fz], toward: [-fx, -fz]}[exit ?? 'right'] ?? right; }
const ID = /^[A-Za-z][A-Za-z0-9_]*$/;
export function parseBeast(s) {   // `<actor> <state> [to <anchor>]` (the `@ <word>` is split off by the caller)
  const p = String(s).trim().split(/\s+/);
  if (!ID.test(p[0] ?? '') || !STATES.includes(p[1]) || !(p.length === 2 || (p.length === 4 && p[2] === 'to' && ID.test(p[3]))))
    throw Error(`beast: "${s}" — expected "<actor> <${STATES.join('|')}> [to <anchor>] @ <word>"`);
  return {actor: p[0], state: p[1], ...(p[3] ? {to: p[3]} : {})}; }
// preset sanity: own glow colour clear of Tuft's blue-gold; tris per tier
export function presetErrors(P) { const e = [];
  if (!P.reservedOwner) for (const g of [P.glow, P.mouthGlow, P.eyeGlow, ...P.parts.map(q => q.glowColor)].filter(Boolean)) for (const r of RESERVED_GLOW) if (rgbDist(g, r) < 60) e.push(`${P.name}: glow ${g} too close to Tuft's ${r}`);
  if (P.rig !== 'blink') for (const tier of P.tiers ?? ['hero', 'low']) { const n = beastTris(P, tier); if (n > TIER_MAX[tier]) e.push(`${P.name}: ${n} tris > ${TIER_MAX[tier]} (${tier})`); }
  return e; }
