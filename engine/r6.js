// engine/r6.js — rigid classic R6 rig (opt-in spec `rig: 'r6'`, owner 2026-11-24): acting6's R15 poses retargeted onto six rigid parts (no bends), classic R6 cycles, `twos`. Pure (no three, no DOM).
// R6 sample = engine/poses.js shape: {root: {dx, dy, dz, lean, roll, yaw}, pivots: {head, left/rightShoulder, left/rightHip} (XYZ radians), offsets?}.
//   retargetR15toR6(s15, build): head / torso / root rotation copied (the R6 torso takes the waist's rotation); each limb is ONE rigid
//   part aimed along the R15 chord (shoulder → hand tip, hip → sole) with the twist of the R15 upper segment. A leg whose chord is
//   shorter than the limb (sit, kneel, crouch) keeps the limb straight, aims along the thigh and the root sinks (classic R6: sit =
//   legs 90° forward, kneel = one leg back, root lowered). Root height: the lowest R6 point = the lowest R15 point, never below 0.
//   A limb box that would cut into the torso box moves its pivot out (offsets) until the overlap is ≤ 0.05.
import {fk, lowestBody, sampleActing, timing, VERBS, CYCLES, SEGL} from './acting6.js';
import {layout6} from '../avatar-style/body6.js';

const D = Math.PI / 180, clamp01 = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const MAX_PEN = .05, LOW_TOL = -.02, HEAD_BOX = 1.2;
// ---- tiny 3×3 maths (row-major, three.js conventions) ---------------------------------------------------------------
const Rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]], Ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]], Rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j])), mv = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const tr = A => [0, 1, 2].map(i => [A[0][i], A[1][i], A[2][i]]), add = (a, b) => a.map((x, i) => x + b[i]), sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = a => Math.hypot(...a), unit = a => { const l = len(a) || 1; return a.map(x => x / l); };
const EXYZ = ([x, y, z]) => mm(mm(Rx(x), Ry(y)), Rz(z));   // three.js Euler 'XYZ' (pivots)
const toXYZ = m => { const y = Math.asin(Math.max(-1, Math.min(1, m[0][2]))); return Math.abs(m[0][2]) < .9999999 ? [Math.atan2(-m[1][2], m[2][2]), y, Math.atan2(-m[0][1], m[0][0])] : [Math.atan2(m[2][1], m[1][1]), y, 0]; };
const RYXZ = ({yaw, lean, roll}) => mm(mm(Ry(yaw), Rx(lean)), Rz(roll));   // Euler 'YXZ' (root)
const toYXZ = m => { const x = Math.asin(-Math.max(-1, Math.min(1, m[1][2]))); return Math.abs(m[1][2]) < .9999999 ? {lean: x, yaw: Math.atan2(m[0][2], m[2][2]), roll: Math.atan2(m[1][0], m[1][1])} : {lean: x, yaw: Math.atan2(-m[2][0], m[0][0]), roll: 0}; };
const axisAngle = (u, a) => { const c = Math.cos(a), s = Math.sin(a), t = 1 - c, [x, y, z] = u;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]]; };
// rotation taking the limb's hanging axis [0, −1, 0] onto the unit vector d (shortest arc)
const aim = d => { const a = [0, -1, 0], c = dot(a, d); if (c < -.999999) return Rx(Math.PI); const v = cross(a, d), k = 1 / (1 + c);
  return [[1 - k * (v[1] ** 2 + v[2] ** 2), -v[2] + k * v[0] * v[1], v[1] + k * v[0] * v[2]], [v[2] + k * v[0] * v[1], 1 - k * (v[0] ** 2 + v[2] ** 2), -v[0] + k * v[1] * v[2]], [-v[1] + k * v[0] * v[2], v[0] + k * v[1] * v[2], 1 - k * (v[0] ** 2 + v[1] ** 2)]]; };
// the aimed limb, twisted about its axis so its local x follows the R15 upper segment's x
function aimTwist(d, Ru) {
  let R = aim(d); const a = mv(R, [1, 0, 0]), want = mv(Ru, [1, 0, 0]), b = unit(sub(want, d.map(x => x * dot(want, d))));
  if (len(sub(want, d.map(x => x * dot(want, d)))) < 1e-6) return R;
  return mm(axisAngle(d, Math.atan2(dot(d, cross(a, b)), dot(a, b))), R);
}
// ---- R6 body numbers (unscaled studs) --------------------------------------------------------------------------------
export function r6Layout(build = 'adult_m') {
  const L = layout6(build); return {shX: L.shoulder[0], shY: L.shoulder[1], hipX: L.hipX, bottom: L.bottom, th: L.th, headY: L.top + .01, leg: L.leg};
}
// ---- R6 forward kinematics from a sample (origin frame, before the origin's yaw) ----------------------------------------
export function r6Fk(s, build = 'adult_m') {
  const L = r6Layout(build), r = s.root, c = Math.cos(r.yaw), sn = Math.sin(r.yaw), p0 = [r.dx * c + r.dz * sn, r.dy, -r.dx * sn + r.dz * c], R0 = RYXZ(r);
  const P = s.pivots, off = s.offsets ?? {}, out = {root: {p: p0, R: R0}};
  const piv = (name, local, rot) => { const o = off[name] ?? [0, 0, 0], g = {p: add(p0, mv(R0, add(local, o))), R: mm(R0, EXYZ(rot))}; out[name] = g; return g; };
  for (const side of ['left', 'right']) { const sx = side === 'left' ? -1 : 1;
    const a = piv(side + 'Shoulder', [sx * L.shX, L.shY, 0], P[side + 'Shoulder']); out[side + 'Hand'] = {p: add(a.p, mv(a.R, [0, -2, 0])), R: a.R};
    const l = piv(side + 'Hip', [sx * L.hipX, 2, 0], P[side + 'Hip']); out[side + 'Foot'] = {p: add(l.p, mv(l.R, [0, -2, 0])), R: l.R}; }
  piv('head', [0, L.headY, 0], P.head);
  return out;
}
// oriented boxes {c, R, h: half sizes} of the six parts
export function r6Boxes(s, build = 'adult_m') {
  const f = r6Fk(s, build), L = r6Layout(build), at = (g, o) => add(g.p, mv(g.R, o)), boxes = {};
  boxes.torso = {c: at(f.root, [0, L.bottom + L.th / 2, 0]), R: f.root.R, h: [1, L.th / 2, .5]};
  boxes.head = {c: at(f.head, [0, HEAD_BOX / 2, 0]), R: f.head.R, h: [HEAD_BOX / 2, HEAD_BOX / 2, HEAD_BOX / 2]};
  for (const side of ['left', 'right']) { boxes[side + 'Arm'] = {c: at(f[side + 'Shoulder'], [0, -1, 0]), R: f[side + 'Shoulder'].R, h: [.5, 1, .5]}; boxes[side + 'Leg'] = {c: at(f[side + 'Hip'], [0, -1, 0]), R: f[side + 'Hip'].R, h: [L.leg / 2, 1, .5]}; }
  return boxes;
}
const corners = b => [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => add(b.c, mv(b.R, [x * b.h[0], y * b.h[1], z * b.h[2]])))));
export const lowestR6 = (s, build) => Math.min(...Object.values(r6Boxes(s, build)).flatMap(b => corners(b).map(p => p[1])));
// SAT penetration of two boxes: {depth > 0 when they overlap, n: the unit axis pointing from B toward A}
export function penetration(A, B) {
  const ax = [...[0, 1, 2].map(i => A.R.map(r => r[i])), ...[0, 1, 2].map(i => B.R.map(r => r[i]))], d = sub(A.c, B.c);
  for (const u of [0, 1, 2]) for (const v of [3, 4, 5]) { const c = cross(ax[u], ax[v]); if (len(c) > 1e-6) ax.push(unit(c)); }
  const rad = (b, n) => b.h.reduce((s, h, i) => s + h * Math.abs(dot(n, b.R.map(r => r[i]))), 0); let best = {depth: Infinity, n: [0, 1, 0]};
  for (const n of ax) { const o = rad(A, n) + rad(B, n) - Math.abs(dot(d, n)); if (o <= 0) return {depth: 0, n}; if (o < best.depth) best = {depth: o, n: dot(d, n) < 0 ? n.map(x => -x) : n}; }
  return best;
}
// Limbs out of the torso box: while a limb box cuts more than MAX_PEN into the torso box its pivot moves out along the contact normal
// (sample.offsets, root-local). `aimFn` (optional) re-aims the limbs after each move. Mutates and returns the sample.
export function clearTorso(sample, build = 'adult_m', aimFn = null) {
  sample.offsets ??= {};
  for (let it = 0; it < 16; it++) { const bx = r6Boxes(sample, build), Rt = tr(RYXZ(sample.root)); let moved = false;
    for (const part of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) { const pen = penetration(bx[part], bx.torso);
      if (pen.depth > MAX_PEN * .8) { const nm = part.replace('Arm', 'Shoulder').replace('Leg', 'Hip'), push = pen.n.map(x => x * (pen.depth - MAX_PEN * .5));
        sample.offsets[nm] = add(sample.offsets[nm] ?? [0, 0, 0], mv(Rt, push)); moved = true; } }
    if (!moved) break; aimFn?.(sample); }
  return sample;
}
// ---- retarget ---------------------------------------------------------------------------------------------------------
const TIP = {hand: SEGL.hand, foot: SEGL.foot};
// R6 sample from an R15 sample (acting6 `solve().sample`). `info` (optional object) receives the R15 targets and the R6 tips.
export function retargetR15toR6(s15, build = 'adult_m', info = null) {
  const f = fk(s15, build), L = r6Layout(build), lo15 = Math.max(0, lowestBody(s15, build));
  // targets (origin frame): hand tips and sole centres of the R15 rig
  const tgt = {leftHand: add(f.leftWrist.p, mv(f.leftWrist.R, [0, -TIP.hand, 0])), rightHand: add(f.rightWrist.p, mv(f.rightWrist.R, [0, -TIP.hand, 0])),
    leftFoot: add(f.leftAnkle.p, mv(f.leftAnkle.R, [0, -TIP.foot, 0])), rightFoot: add(f.rightAnkle.p, mv(f.rightAnkle.R, [0, -TIP.foot, 0]))};
  const thighDir = side => unit(sub(f[side + 'Knee'].p, f[side + 'Hip'].p));
  // R6 root rotation = the waist's (upper torso) world rotation; reference point = the waist pivot (shoulders and hips share the error)
  const Rw = f.waist.R, waistLocal = [0, (L.bottom + L.shY) / 2, 0];   // the R6 torso's middle, the waist's counterpart
  let root = sub(f.waist.p, mv(Rw, waistLocal));
  const pivots = {}, offsets = {}; let sample = null;
  const build6 = () => {
    const {lean, yaw, roll} = toYXZ(Rw), cy = Math.cos(yaw), sy = Math.sin(yaw);
    return {pivots: {...pivots}, offsets: {...offsets}, root: {dx: root[0] * cy - root[2] * sy, dy: root[1], dz: root[0] * sy + root[2] * cy, lean, roll, yaw}, squash: s15.squash ?? 0}; };
  const aimAll = () => {
    for (const side of ['left', 'right']) { const sx = side === 'left' ? -1 : 1;
      const oa = offsets[side + 'Shoulder'] ?? [0, 0, 0], oh = offsets[side + 'Hip'] ?? [0, 0, 0], pa = add(root, mv(Rw, add([sx * L.shX, L.shY, 0], oa))), ph = add(root, mv(Rw, add([sx * L.hipX, 2, 0], oh)));
      const da = unit(sub(tgt[side + 'Hand'], pa)); pivots[side + 'Shoulder'] = toXYZ(mm(tr(Rw), aimTwist(da, f[side + 'Shoulder'].R)));
      const chord = sub(tgt[side + 'Foot'], ph), c = len(chord), w = smooth((c - 1.3) / .3), dl = unit(add(chord.map(x => x / c * w), thighDir(side).map(x => x * (1 - w))));
      pivots[side + 'Hip'] = toXYZ(mm(tr(Rw), aimTwist(dl, f[side + 'Hip'].R))); }
    pivots.head = [...s15.pivots.head];
  };
  // root height: the one-dimensional search for the least reach error of the four limbs with the lowest point never under the ground
  const cost = y => { root[1] = y; aimAll(); sample = build6(); const f6 = r6Fk(sample, build), lo = lowestR6(sample, build); let c = 0;
    for (const k of ['leftHand', 'rightHand', 'leftFoot', 'rightFoot']) { const a = f6[k.replace('Hand', 'Shoulder').replace('Foot', 'Hip')].p, t = tgt[k], ch = len(sub(t, a));
      if (ch >= 2 - .35) c += len(sub(f6[k].p, t)) ** 2; }
    return c + 40 * Math.max(0, -lo) ** 2 + 40 * Math.max(0, lo - lo15) ** 2 * (lo15 === 0 ? 1 : 0); };
  { const y0 = root[1]; let a = y0 - .9, b = y0 + .9; const g = .618034;
    for (let it = 0; it < 22; it++) { const c1 = b - g * (b - a), c2 = a + g * (b - a); cost(c1) < cost(c2) ? b = c2 : a = c1; } root[1] = (a + b) / 2; }
  // limbs out of the torso box (SAT): move the pivot out along the contact normal, then aim again from the moved pivot
  for (let it = 0; it < 4; it++) { aimAll(); sample = build6(); const bx = r6Boxes(sample, build); let moved = false;
    for (const part of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) { const pen = penetration(bx[part], bx.torso);
      if (pen.depth > MAX_PEN * .8) { const nm = part.replace('Arm', 'Shoulder').replace('Leg', 'Hip'), push = pen.n.map(x => x * (pen.depth - MAX_PEN * .5)), o = offsets[nm] ?? [0, 0, 0];
        offsets[nm] = add(o, mv(tr(Rw), push)); moved = true; } }
    if (!moved) break; }
  aimAll(); sample = build6(); sample.offsets = offsets; clearTorso(sample, build);   // last pass without re-aiming: the gate number is the overlap
  const lo = lowestR6(sample, build); if (lo < 0 || lo > lo15 + 1e-6) { root[1] += lo15 - lo; sample = build6(); }
  if (info) { info.targets = tgt; info.tips = Object.fromEntries(['leftHand', 'rightHand', 'leftFoot', 'rightFoot'].map(k => [k, r6Fk(sample, build)[k].p])); info.lo15 = lo15; }
  return sample;
}
// Reach errors of the four limbs (studs). Chord ≥ 2 − 0.35: the tip's distance from the R15 target. A shorter chord (elbow / knee
// bent) cannot be matched by a straight limb: the error is then the target's distance from the limb axis, and `short` lists those limbs.
export function reachErrors(s15, build = 'adult_m') {
  const info = {}, s6 = retargetR15toR6(s15, build, info), f6 = r6Fk(s6, build), err = {}, short = [], over = {};
  for (const k of ['leftHand', 'rightHand', 'leftFoot', 'rightFoot']) { const a = f6[k.replace('Hand', 'Shoulder').replace('Foot', 'Hip')].p, tip = f6[k].p, t = info.targets[k], chord = len(sub(t, a));
    over[k] = Math.max(0, 2 - chord);
    if (chord >= 2 - .35) err[k] = len(sub(tip, t)); else { short.push(k); const u = unit(sub(tip, a)), pr = Math.max(0, Math.min(2, dot(sub(t, a), u))); err[k] = len(sub(t, add(a, u.map(x => x * pr)))); } }
  return {sample: s6, err, short, over, max: Math.max(...Object.values(err))};
}

// ---- classic R6 cycles (opposite arm / leg swing, torso bob, no foot IK) -----------------------------------------------
// amplitudes (degrees): walk 30, run 55, sprint 70, sad_walk 15 + head down, sneak 20 + torso lean 15; leg swing = arm swing.
export const R6CYCLE = {walk: {amp: 30, lean: 3, bob: .03}, sad_walk: {amp: 15, lean: 8, bob: .02, head: 24}, sneak: {amp: 20, lean: 15, bob: .03, head: -6},
  run: {amp: 55, lean: 10, bob: .1}, sprint: {amp: 70, lean: 18, bob: .12}};
export const R6CYCLE_NAMES = Object.keys(R6CYCLE);
export function r6Cycle(name, t, {build = 'adult_m', intensity = 1} = {}) {
  const c = R6CYCLE[name], T = CYCLES[name].T, ph = 2 * Math.PI * t / T, I = Math.min(1.5, Math.max(.5, intensity)), A = c.amp * D * I, sw = Math.sin(ph);
  const pivots = {leftHip: [-A * sw, 0, 0], rightHip: [A * sw, 0, 0], leftShoulder: [A * sw, 0, -.05], rightShoulder: [-A * sw, 0, .05], head: [(c.head ?? 0) * D, 0, 0]};
  const s = {pivots, root: {dx: 0, dy: 0, dz: 0, lean: c.lean * D, roll: 0, yaw: 0}, squash: 0};
  s.offsets = {}; clearTorso(s, build);   // a 70° leg swing would cut into the torso box: the pivot moves out
  s.root.dy = c.bob * (1 + Math.cos(2 * ph)) / 2 - lowestR6(s, build);   // feet touch down: the lowest point sits on 0, the bob rides on top (tiny)
  return s;
}
const mixS = (a, b, w) => ({root: Object.fromEntries(Object.keys(a.root).map(k => [k, a.root[k] + (b.root[k] - a.root[k]) * w])),
  pivots: Object.fromEntries(Object.keys(a.pivots).map(k => [k, a.pivots[k].map((x, i) => x + (b.pivots[k][i] - x) * w)])), offsets: w < 1 ? a.offsets : {}, squash: a.squash ?? 0});
// An acting track (engine/acting6.js compileActing) sampled on R6: every verb / gesture / drift through the retarget, cycles classic.
export function sampleActingR6(tr, t, {seed = 1, build = 'adult_m'} = {}) {
  const base = sampleActing(tr, t, {seed, build}); let s = retargetR15toR6(base.sample, build);
  let i = -1; for (let k = 0; k < tr.items.length; k++) if (tr.items[k].start <= t) i = k;
  const cy = tr.cycles.find(c => t >= c.start && t < c.until && (i < 0 || tr.items[i].start < c.start));
  if (cy && R6CYCLE[cy.name]) s = mixS(s, {...r6Cycle(cy.name, t - cy.start, {build}), offsets: {}}, smooth((t - cy.start) / .15));
  return {...base, sample: s};
}
// ---- twos (spec `twos: true`, 24 fps): actor poses and face swaps hold each pose 2 frames; camera, FX, light stay on ones ---------
export const twosFrame = n => n - (n % 2);
export const twosTime = (t, fps = 24) => twosFrame(Math.floor(t * fps + 1e-6)) / fps;
