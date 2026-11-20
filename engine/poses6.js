// engine/poses6.js — poses for Actor v6 (R15, avatar-style/body6.js). Pure functions of time, like engine/poses.js.
// A v6 sample = an R6 sample plus the joints in JOINTS6 (waist, elbows, wrists, knees, ankles), each [x, y, z] radians:
//   elbow x < 0 bends the forearm forward (0 … −150°) · knee x > 0 bends the shin back (0 … 150°) · waist x > 0 leans the
//   chest forward · ankle x < 0 lifts the toe. Every sample leaves here clamped to LIMITS6.
// liftR6(pose, t, gait) plays any existing R6 pose on R15 with natural secondary bends:
//   walk  knee 0–45° in the swing phase only (thigh travelling forward; sin of the swing progress: 0 at toe-off and heel
//         strike, 45° at passing), the planted leg straight; elbow 15–25° with the arm swing
//   run   elbow 80–95°, knee up to 90° in the swing (8° on the stance leg), the chest leans 7° further forward
//   other elbow 8°, knee 3°; a thigh raised past 57° (sit, drive) folds the shin back to hang vertical
//   every pose: ankles keep the soles level with the ground (planted feet do not tip or slide), within ±35°
// POSES6: the R15 key poses of the P1 hero sheet (asymmetric, one line of action each); `ground: true` poses are lifted so
// the lowest sole / knee / hip point sits on y 0 (body6.js lowestY, pure FK).
import {samplePose, blendPoses, applyPoseSample, PIVOTS, FADE, SNAP_FADE_FRAMES} from './poses.js';
import {JOINTS6, clampJoints, lowestY} from '../avatar-style/body6.js';

const D = Math.PI / 180, clamp01 = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const WALKS = ['walk', 'eggWalk', 'holdHands'], RUNS = ['run', 'eggRun', 'eggRunLow'];
const AIR = ['jump', 'fall', 'trip', 'sleep', 'flail'];
const cyc = new Map();   // per gait: max forward hip speed and max |shoulder| over one cycle (pure, cached)
function gaitStats(g) {
  if (!cyc.has(g)) { let A = 1e-6, sh = 1e-6; for (let i = 0; i <= 96; i++) { const t = .2 + i * 1.3 / 96, s = samplePose(g, t); A = Math.max(A, Math.abs(s.pivots.leftHip[0])); sh = Math.max(sh, Math.abs(s.pivots.leftShoulder[0])); } cyc.set(g, {A, sh}); }
  return cyc.get(g);
}
const DT = 1 / 15;   // limbs move on twos: a one-step central difference sees every step
// Pure: is this leg in its swing phase (the thigh travelling forward) at t? The other leg is the planted one.
export const inSwing = (g, t, side) => hipSpeed(g, t, side + 'Hip') < -1e-4;
function hipSpeed(g, t, hip) { const a = samplePose(g, Math.max(0, t - DT)).pivots[hip][0], b = samplePose(g, t + DT).pivots[hip][0]; return (b - a) / (Math.min(t, DT) + DT); }

export function liftR6(pose, t, gait = 'idle') {
  const s = {...pose, pivots: {...pose.pivots}, root: {...pose.root}};
  for (const j of JOINTS6) s.pivots[j] = [...(pose.pivots[j] ?? [0, 0, 0])];
  const walk = WALKS.includes(gait), run = RUNS.includes(gait);
  for (const side of ['left', 'right']) {
    const hip = s.pivots[side + 'Hip'][0], sh = s.pivots[side + 'Shoulder'][0];
    let knee = 3 * D, elbow = -8 * D;
    if (walk || run) {
      // swing progress u: thigh from its back extreme (0, toe-off) to its front extreme (1, heel strike); the knee peaks at passing
      const st = gaitStats(gait), u = clamp01((st.A - hip) / (2 * st.A)), a = clamp01(Math.abs(sh) / st.sh), sw = inSwing(gait, t, side) ? Math.sin(Math.PI * u) : 0;
      knee = walk ? 45 * D * sw : Math.max(8 * D, 90 * D * sw);
      elbow = walk ? -(15 + 10 * a) * D : -(80 + 15 * a) * D;
    } else if (hip < -1) knee = Math.min(150 * D, -hip);
    s.pivots[side + 'Knee'][0] = knee; s.pivots[side + 'Elbow'][0] = elbow;
    if (!AIR.includes(gait)) s.pivots[side + 'Ankle'][0] = -((s.root.lean ?? 0) + hip + knee);
  }
  if (run) s.pivots.waist[0] = 7 * D;
  return clampJoints(s);
}

// ---- R15 key poses (degrees in the table, converted once) -------------------------------------------------------------
const P = (piv, root = {}, o = {}) => ({piv, root, ...o});
const KEY6 = {
  ref6: P({}, {}, {ground: true}),   // P1b reference stance: straight-on, arms down, every joint at rest
  idle6: P({head: [2, 10, 4], waist: [0, 5, -2], leftShoulder: [6, 0, -6], rightShoulder: [-8, 0, 9], leftElbow: [-10, 0, 0], rightElbow: [-14, 0, 0], rightWrist: [0, 0, 8],
    leftHip: [-5, 0, -5], rightHip: [3, 0, 2], leftKnee: [9, 0, 0], rightKnee: [2, 0, 0]}, {roll: 2}, {ground: true}),
  walkContact: P({head: [-2, -6, 0], waist: [3, -8, 0], leftShoulder: [24, 0, -5], rightShoulder: [-30, 0, 5], leftElbow: [-14, 0, 0], rightElbow: [-34, 0, 0],
    leftHip: [-27, 0, 0], rightHip: [24, 0, 0], leftKnee: [4, 0, 0], rightKnee: [12, 0, 0], leftAnkle: [-12, 0, 0], rightAnkle: [18, 0, 0]}, {lean: 4}, {ground: true}),
  walkPassing: P({head: [-2, 8, 0], waist: [3, 8, 0], leftShoulder: [-26, 0, -6], rightShoulder: [22, 0, 6], leftElbow: [-30, 0, 0], rightElbow: [-16, 0, 0],
    leftHip: [4, 0, 0], rightHip: [-26, 0, 0], leftKnee: [4, 0, 0], rightKnee: [64, 0, 0]}, {lean: 6}, {ground: true, flat: true}),   // P1b: opposite arm/leg, leaning in
  run6: P({head: [-16, -4, 0], waist: [8, -10, 0], leftShoulder: [-58, 0, -16], rightShoulder: [62, 0, 16], leftElbow: [-90, 0, 0], rightElbow: [-90, 0, 0],   // P1b: arms pump clear, hands past the outline, face up
    leftHip: [36, 0, 0], rightHip: [-72, 0, 0], leftKnee: [24, 0, 0], rightKnee: [104, 0, 0], leftAnkle: [30, 0, 0]}, {lean: 14}, {ground: true}),
  point6: P({head: [-4, -22, 0], waist: [2, -16, 0], rightShoulder: [-84, -10, 22], rightElbow: [-4, 0, 0], leftShoulder: [16, 0, -10], leftElbow: [-26, 0, 0], leftWrist: [0, 0, -10],
    leftHip: [6, 0, -4], rightHip: [-14, 0, 8], leftKnee: [6, 0, 0], rightKnee: [10, 0, 0]}, {lean: 4, roll: -2}, {ground: true, flat: true}),
  cheer6: P({head: [-16, 8, 6], waist: [-6, 8, 4], rightShoulder: [-10, 0, 150], rightElbow: [-14, 0, 0], leftShoulder: [-20, 0, -128], leftElbow: [-58, 0, 0],
    leftHip: [-48, 0, -4], leftKnee: [82, 0, 0], rightHip: [2, 0, 3], rightKnee: [4, 0, 0]}, {roll: -3}, {ground: true, flat: true}),
  crouch6: P({head: [-34, 14, 0], waist: [10, 8, 0], leftShoulder: [-56, 0, -10], rightShoulder: [-48, 0, 14], leftElbow: [-22, 0, 0], rightElbow: [-30, 0, 0],   // P1b: forearms forward onto the knees
    leftHip: [-96, 0, -16], rightHip: [-60, 0, 12], leftKnee: [130, 0, 0], rightKnee: [116, 0, 0]}, {lean: 24}, {ground: true, flat: true}),
  sit6: P({head: [6, 14, 0], waist: [8, 10, 0], leftShoulder: [34, 0, -18], rightShoulder: [-48, 0, 10], leftElbow: [-6, 0, 0], rightElbow: [-64, 0, 0],
    leftHip: [-80, 0, -8], leftKnee: [16, 0, 0], rightHip: [-96, 0, 6], rightKnee: [112, 0, 0]}, {lean: -12}, {ground: true, flat: true}),
  kneel6: P({head: [8, -10, 0], waist: [6, -6, 0], rightShoulder: [-38, 0, 14], rightElbow: [-74, 0, 0], leftShoulder: [8, 0, -8], leftElbow: [-24, 0, 0],
    rightHip: [-86, 0, 6], rightKnee: [88, 0, 0], leftHip: [8, 0, -4], leftKnee: [96, 0, 0], leftAnkle: [30, 0, 0]}, {}, {ground: true, flatR: true}),
  reachHug: P({head: [-8, 6, 4], waist: [8, 6, 0], leftShoulder: [-74, 0, -38], rightShoulder: [-66, 0, 44], leftElbow: [-34, 0, 0], rightElbow: [-26, 0, 0], leftWrist: [0, 0, -12], rightWrist: [0, 0, 12],
    leftHip: [-30, 0, -2], rightHip: [18, 0, 3], leftKnee: [16, 0, 0], rightKnee: [8, 0, 0], rightAnkle: [22, 0, 0]}, {lean: 10}, {ground: true}),
  flinch6: P({head: [14, -30, -8], waist: [-10, 22, -6], rightShoulder: [-120, 0, -22], rightElbow: [-118, 0, 0], leftShoulder: [-70, 0, -40], leftElbow: [-96, 0, 0], leftWrist: [0, 0, -20],
    leftHip: [16, 0, -10], rightHip: [-10, 0, 6], leftKnee: [22, 0, 0], rightKnee: [18, 0, 0]}, {lean: -8, roll: 4}, {ground: true, flat: true}),
  jumpApex: P({head: [-14, 0, 4], waist: [-4, 6, 0], rightShoulder: [-160, 0, 18], rightElbow: [-24, 0, 0], leftShoulder: [-36, 0, -40], leftElbow: [-70, 0, 0],
    leftHip: [-72, 0, -6], leftKnee: [120, 0, 0], rightHip: [-14, 0, 6], rightKnee: [64, 0, 0], leftAnkle: [24, 0, 0], rightAnkle: [28, 0, 0]}, {dy: 1.7}, {}),
};
export const SHEET6 = ['idle6', 'walkContact', 'walkPassing', 'run6', 'point6', 'cheer6', 'crouch6', 'sit6', 'kneel6', 'reachHug', 'flinch6', 'jumpApex'];
export const STANDING6 = ['idle6', 'walkContact', 'walkPassing', 'point6', 'cheer6', 'reachHug', 'flinch6', 'run6', 'crouch6'];
const blank6 = () => ({pivots: Object.fromEntries([...PIVOTS, ...JOINTS6].map(p => [p, [0, 0, 0]])), root: {dx: 0, dy: 0, dz: 0, lean: 0, roll: 0, yaw: 0}});
// Raw (unclamped) key pose, degrees → radians; flat: both soles level (ankle = −(lean + hip + knee)); flatR: the right one.
export function rawKey6(name) {
  const k = KEY6[name]; if (!k) throw Error('unknown v6 pose ' + name);
  const s = blank6();
  for (const [p, v] of Object.entries(k.piv)) s.pivots[p] = v.map(x => x * D);
  for (const [r, v] of Object.entries(k.root)) s.root[r] = r === 'dy' ? v : v * D;
  const level = side => { s.pivots[side + 'Ankle'][0] = -(s.root.lean + s.pivots[side + 'Hip'][0] + s.pivots[side + 'Knee'][0]); };
  if (k.flat) { level('left'); level('right'); } else if (k.flatR) level('right');
  return s;
}
export const POSES6 = Object.keys(KEY6);
export function samplePose6(name, t = 0, opts = {}) {
  if (KEY6[name]) { const s = clampJoints(rawKey6(name)); if (KEY6[name].ground) s.root.dy = -lowestY(s, opts.build ?? 'adult_m', {sole: opts.sole ?? 0}); return s; }
  return liftR6(samplePose(name, t, opts), t, name);
}
export function blendPoses6(a, b, w, o = {}) {
  const s = blendPoses(a, b, w, o), k = o.extrapolate ? w : clamp01(w);
  for (const j of JOINTS6) { const x = a.pivots[j] ?? [0, 0, 0], y = b.pivots[j] ?? [0, 0, 0]; s.pivots[j] = x.map((v, i) => v + (y[i] - v) * k); }
  return clampJoints(s);
}
// P1b cross-fade (pure): the fade between two v6 poses lasts long enough that the blend adds at most POP_MAX per frame to any
// joint on top of the two poses' own motion: smoothstep's peak slope is 1.5 / fade, so fade ≥ 1.5 · Δmax / (POP_MAX · fps)
// (Δmax = the largest joint difference between the two sides over the 1.5 s after the key, 24 fps; ×1.15 margin; the
// outgoing side is the timeline before the key, so a fade interrupted by the next key carries on without a jump). The outgoing pose keeps its own phase while it fades
// (a walk keeps walking out), so the gait never freezes mid-stride.
export const POP_MAX = 3 * D;
export function fadeFor(pairs, fps = 24) {   // pairs: [[outgoing, incoming] samples over the window after the key]
  let d = 0; for (const [a, b] of pairs) for (const j of Object.keys(b.pivots)) (a.pivots[j] ?? [0, 0, 0]).forEach((v, k) => { d = Math.max(d, Math.abs(v - b.pivots[j][k])); });
  return 1.15 * 1.5 * d / (POP_MAX * fps);
}
// sampleTimeline for v6 (snaps and overshoot as poses.js sampleTimeline; fades at least fadeFor).
const fadeCache = new WeakMap();   // keys array → {opts key → per-key fade lengths} (pure: a function of the keys and options)
function fades6(keys, opts) {
  const ok = `${opts.fade ?? FADE}:${opts.overshoot?.settle ?? 0}:${opts.build ?? 'adult_m'}:${opts.sole ?? 0}`;
  let m = fadeCache.get(keys); if (!m) fadeCache.set(keys, m = new Map()); if (m.has(ok)) return m.get(ok);
  const F = [0], {build = 'adult_m', sole = 0} = opts;
  for (let i = 1; i < keys.length; i++) {
    const [t0, name, o = {}] = keys[i];
    let f = o.snap ? SNAP_FADE_FRAMES / (o.fps ?? 24) : Math.max(opts.fade ?? FADE, fadeFor(Array.from({length: 13}, (_, k) => [at6(keys, F, i - 1, t0 + k / 8, opts), samplePose6(name, k / 8, {...o, build, sole})])));
    if (opts.overshoot) f += opts.overshoot.settle; F.push(f);
  }
  m.set(ok, F); return F;
}
// The timeline value at t using keys 0..i only (F: their fade lengths).
function at6(keys, F, i, t, opts) {
  const {overshoot = null, build = 'adult_m', sole = 0} = opts, [t0, name, o = {}] = keys[i], cur = samplePose6(name, Math.max(0, t - t0), {...o, build, sole});
  if (i === 0 || t - t0 >= F[i]) return cur;
  const prev = at6(keys, F, i - 1, t, opts), u = (t - t0) / F[i];
  return overshoot ? blendPoses6(prev, cur, overshoot.ease(u), {extrapolate: true}) : blendPoses6(prev, cur, smooth(u));
}
export function sampleTimeline6(keys, t, opts = {}) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  return at6(keys, fades6(keys, opts), i, t, opts);
}
// Apply a v6 sample: the R6 pivots and root through applyPoseSample, then the R15 joints (clamped again: never wrong way).
export function applyPose6(actor, s, origin) {
  applyPoseSample(actor, s, origin);
  const c = clampJoints(s);
  for (const j of JOINTS6) if (actor.pivots[j]) actor.pivots[j].rotation.set(...c.pivots[j]);
  return actor;
}
