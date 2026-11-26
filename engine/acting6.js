// engine/acting6.js — P3 acting library for Actor v6 (R15, avatar-style/body6.js). Pure: every sampler is a function of t only.
// Opt-in per spec (`acting: 6`, engine/episode.js); specs without it never load this file's output.
//
// CHANNELS. A pose is a flat object of numbers: `<joint>.<x|y|z>` in degrees for the 14 R15 joints (engine/poses6.js signs:
// shoulder/hip x < 0 swings forward, elbow x < 0 bends, knee x > 0 bends back, waist x > 0 leans the chest forward, head x > 0
// looks down, y > 0 turns toward +x), `root.{dx,dy,dz}` studs + `root.{lean,roll,yaw}` degrees about the pivot `root.{cy,cz}`
// (default the hip line, y 2: a lean tilts the body over planted feet), feet `lf.* / rf.*` = ground targets {x, z, y (lift),
// yaw, pitch} in the actor's origin frame, and `ik` (1 = legs solved onto the feet, 0 = the hip/knee/ankle channels as FK).
// LEGS. solve() runs an analytic 2-bone IK (thigh 1.0, shin 0.73) per leg and an exact ankle so the foot sits on its target
// with the asked pitch (pitch > 0 rolls onto the toe edge, < 0 onto the heel edge: the edge in contact never moves). A foot
// that changes target is lifted on an arc proportional to its travel (footMix), so feet never slide; airborne / falling
// verbs blend `ik` to 0. Joint values leave clamped to LIMITS6; `raw` keeps the unclamped values for the limit gate.
// VERBS (VERBS, 24 + cycles + talk gestures + tumble). Each verb is data: an anticipation pose (or 'auto' = the opposite of
// the stroke on every angle channel, 30 %), a KEY pose (impact / contact / apex) and a settle pose, sampled through phases:
//   anticipation 20 % of the verb (smoothstep, from the incoming pose) → action (fast, `act` s) → overshoot (motion5b
//   overshootEase 12 % of the stroke, the KEY is the first crossing of the key pose) → settle (`tail` s) → moving hold (seeded
//   drift ≤ 1.5°, never a dead freeze). Overlap: the head leads by 2 frames, elbows + wrists settle 2.5 frames after the torso;
//   `arc` bends the stroke's elbow mid-move so wrist paths curve. `fall` channels accelerate (u²) and never overshoot,
//   `impact` adds a gamma / damped-sine impulse after the key, `air` a parabolic flight, `sub` per-channel sub-keys.
// TRACKS. compileActing(actions, ctx) → per-actor tracks; an action = {actor, verb, at: s | {word, nth}, intensity, target,
// facing, hold, face}; the verb's KEY lands on `at` (a word's start time, cues.json). sampleActing(track, t) → {sample, raw,
// props, face, partner}. Talk gestures fire on stressed words (Brief marks, else the loudest word per line from the envelope).
import {overshootEase} from './motion5b.js';
import {JOINTS6, LIMITS6, jointKind, layout6} from '../avatar-style/body6.js';

export const ROLL_MARGIN = .25, FPS6 = 24, LEAD = 2 / 24, LAG = 2.5 / 24, OS = .12, ANT = .2, DRIFT_DEG = 1.5;
const D = Math.PI / 180, clamp01 = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const minJerk = u => { u = clamp01(u); return u * u * u * (10 - 15 * u + 6 * u * u); };
export const JOINTS = ['head', 'waist', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];
const AX = ['x', 'y', 'z'], LEGJ = ['leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];
const FOOTK = ['x', 'y', 'z', 'yaw', 'pitch'], ROOTK = ['dx', 'dy', 'dz', 'lean', 'roll', 'yaw', 'cy', 'cz'];
export const CHANNELS = [...JOINTS.flatMap(j => AX.map(a => `${j}.${a}`)), ...ROOTK.map(k => `root.${k}`), ...FOOTK.map(k => `lf.${k}`), ...FOOTK.map(k => `rf.${k}`), 'ik', 'torso.sq'];   // torso.sq: chest compression fraction (hug squeeze)
const isFoot = c => c[1] === 'f' && c[2] === '.', isAngle = c => !isFoot(c) && c !== 'ik' && c !== 'torso.sq' && !['root.dx', 'root.dy', 'root.dz', 'root.cy', 'root.cz'].includes(c);
const HEADC = new Set(['head.x', 'head.y', 'head.z']), HANDC = new Set(['leftElbow', 'rightElbow', 'leftWrist', 'rightWrist'].flatMap(j => AX.map(a => `${j}.${a}`)));
const L6 = layout6('adult_m'), HIPX = L6.hipX;
export const REST = Object.freeze(Object.fromEntries(CHANNELS.map(c => [c, 0]).concat([['leftShoulder.z', -3], ['rightShoulder.z', 3], ['lf.x', -HIPX], ['rf.x', HIPX], ['root.cy', 2], ['ik', 1]])));

// ---- pure maths ---------------------------------------------------------------------------------------------------
const Rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const Ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const Rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const mv = (A, v) => A.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const tr = A => [0, 1, 2].map(i => [A[0][i], A[1][i], A[2][i]]);
const add = (a, b) => a.map((x, i) => x + b[i]), sub3 = (a, b) => a.map((x, i) => x - b[i]);
const E = ([x, y, z]) => mm(mm(Rx(x), Ry(y)), Rz(z));   // three.js Euler 'XYZ'
const toEuler = m => { const y = Math.asin(Math.max(-1, Math.min(1, m[0][2]))); return Math.abs(m[0][2]) < .9999999 ? [Math.atan2(-m[1][2], m[2][2]), y, Math.atan2(-m[0][1], m[0][0])] : [Math.atan2(m[2][1], m[1][1]), y, 0]; };
const rootR = r => mm(mm(Ry(r.yaw), Rx(r.lean)), Rz(r.roll));   // Euler 'YXZ' (applyPoseSample)
// Quaternions [w, x, y, z] — a big joint swing (a hug's arm, a piggyback's thigh) interpolates by slerp, never by Euler channels (which sweep the limb through the wrong arc)
const qFromM = m => { const t = m[0][0] + m[1][1] + m[2][2]; let w, x, y, z, s;
  if (t > 0) { s = Math.sqrt(t + 1) * 2; w = s / 4; x = (m[2][1] - m[1][2]) / s; y = (m[0][2] - m[2][0]) / s; z = (m[1][0] - m[0][1]) / s; }
  else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; w = (m[2][1] - m[1][2]) / s; x = s / 4; y = (m[0][1] + m[1][0]) / s; z = (m[0][2] + m[2][0]) / s; }
  else if (m[1][1] > m[2][2]) { s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; w = (m[0][2] - m[2][0]) / s; x = (m[0][1] + m[1][0]) / s; y = s / 4; z = (m[1][2] + m[2][1]) / s; }
  else { s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; w = (m[1][0] - m[0][1]) / s; x = (m[0][2] + m[2][0]) / s; y = (m[1][2] + m[2][1]) / s; z = s / 4; }
  return [w, x, y, z]; };
const mFromQ = ([w, x, y, z]) => [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
export function qSlerp(a, b, t) {   // t outside [0, 1] extends the arc (overshoot)
  if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0) b = b.map(x => -x);
  const r = qMul([a[0], -a[1], -a[2], -a[3]], b), sn = Math.hypot(r[1], r[2], r[3]); if (sn < 1e-9) return a.slice();
  const h = Math.atan2(sn, r[0]) * t, k = Math.sin(h) / sn; return qMul(a, [Math.cos(h), r[1] * k, r[2] * k, r[3] * k]);
}
const eulerToQ = d => qFromM(E(d.map(x => x * Math.PI / 180))), qToEuler = q => toEuler(mFromQ(q)).map(x => x * 180 / Math.PI);
export const SEGL = {thigh: 1, shin: .73, foot: .27, footX: .48, footZ: .49, arm: 1, fore: .75, hand: .25};
// Arm IK in the chest (waist pivot) frame: the hand centre on `p`, the elbow bending so the forearm opens toward `pole`
// (the elbow sticks out the other way). → {shoulder [x, y, z]°, elbow x°}. Upper arm 1.0, wrist→hand centre 0.875.
export function armIK(side, p, pole, build = 'adult_m') {
  const L = layout6(build), sh = [(side === 'left' ? -1 : 1) * L.shoulder[0], L.shoulder[1] - L.waistY, 0], v = sub3(p, sh), L1 = SEGL.arm, L2 = SEGL.fore + SEGL.hand / 2;
  const r = Math.min(Math.hypot(...v), (L1 + L2) * .999), e = Math.PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - r * r) / (2 * L1 * L2))));
  const nrm = a => { const l = Math.hypot(...a); return a.map(x => x / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lh = [0, -L1 - L2 * Math.cos(e), L2 * Math.sin(e)], a = nrm(lh), b = nrm(sub3([0, 0, 1], a.map(x => x * a[2]))), c = cross(a, b);
  const a2 = nrm(v), b2 = nrm(sub3(pole, a2.map(x => x * dot(pole, a2)))), c2 = cross(a2, b2);
  const M = [0, 1, 2].map(i => [0, 1, 2].map(j => a2[i] * a[j] + b2[i] * b[j] + c2[i] * c[j]));   // [a2 b2 c2]·[a b c]ᵀ
  return {shoulder: toEuler(M).map(x => x / D), elbow: -e / D};
}
// ---- authoring: P({lS: [x, y, z], rE: -90, root: {lean: 8}, lf: {z: .4}, ik: 0}) → a full channel pose (absolute) --------
const ALIAS = {lS: 'leftShoulder', rS: 'rightShoulder', lE: 'leftElbow', rE: 'rightElbow', lW: 'leftWrist', rW: 'rightWrist', lH: 'leftHip', rH: 'rightHip', lK: 'leftKnee', rK: 'rightKnee', lA: 'leftAnkle', rA: 'rightAnkle', head: 'head', waist: 'waist'};
export function P(spec = {}, base = REST) {
  const o = {...base};
  for (const [k, v] of Object.entries(spec)) {
    if (ALIAS[k]) { const j = ALIAS[k], arr = typeof v === 'number' ? [v, 0, 0] : v; arr.forEach((x, i) => { o[`${j}.${AX[i]}`] = x; }); }
    else if (k === 'root' || k === 'lf' || k === 'rf') for (const [kk, x] of Object.entries(v)) o[`${k}.${kk}`] = x;
    else if (k === 'ik') o.ik = v;
    else if (k === 'sq') o['torso.sq'] = v;
    else if (k === 'lHand' || k === 'rHand') { const side = k === 'lHand' ? 'left' : 'right', r = armIK(side, v.p, v.pole); r.shoulder.forEach((x, i) => { o[`${side}Shoulder.${AX[i]}`] = x; }); o[`${side}Elbow.x`] = r.elbow; }
    else throw Error('acting6: unknown pose key ' + k);
  }
  return o;
}
// Mirror a pose left ↔ right (the verb read from the other camera side).
export function mirror(p) {
  const o = {};
  for (const c of CHANNELS) {
    let src = c;
    if (c.startsWith('left')) src = 'right' + c.slice(4); else if (c.startsWith('right')) src = 'left' + c.slice(5);
    else if (c.startsWith('lf.')) src = 'rf.' + c.slice(3); else if (c.startsWith('rf.')) src = 'lf.' + c.slice(3);
    let v = p[src] ?? REST[src];
    if (/\.(y|z)$/.test(c) && JOINTS.includes(c.split('.')[0])) v = -v;
    if (['root.roll', 'root.yaw', 'root.dx', 'lf.x', 'rf.x', 'lf.yaw', 'rf.yaw'].includes(c)) v = -v;
    o[c] = v;
  }
  return o;
}
// The joint's limits in degrees for channel c (null if free).
const LIM = c => { const [j, a] = c.split('.'); if (!JOINTS6.includes(j)) return null; return LIMITS6[jointKind(j)][AX.indexOf(a)].map(r => r / D); };
const clampCh = (c, v) => { const L = LIM(c); return L ? Math.min(L[1], Math.max(L[0], v)) : v; };

// ---- feet: a target change is a lifted step (never a slide) ------------------------------------------------------------
// Mix two poses' channels with weight w (any value; overshoot allowed on angles); feet move with a clamped weight and lift
// 0.35 × their horizontal travel × sin(π w) (+ the target's own lift).
export function mix(a, b, w, {footW = clamp01(w)} = {}) {
  const o = {};
  for (const c of CHANNELS) { const x = a[c] ?? REST[c], y = b[c] ?? REST[c]; o[c] = x + (y - x) * (isFoot(c) ? footW : c === 'ik' ? clamp01(w) : w); }
  for (const s of ['lf', 'rf']) { const d = Math.hypot((b[s + '.x'] ?? 0) - (a[s + '.x'] ?? 0), (b[s + '.z'] ?? 0) - (a[s + '.z'] ?? 0)); if (d > 1e-4) o[s + '.y'] += Math.min(.45, .35 * d) * Math.sin(Math.PI * footW); }
  return o;
}

// ---- verb data ---------------------------------------------------------------------------------------------------------
// v: {act, tail, antic: pose|'auto', key, settle, main: [channel, sign of the action], arc: {side, deg}, fall: [channels],
//     noOs: [channels], impact: {channel: amount, shape, peak}, air: {t0, apex, t1, h} (s relative to the key), sub: [...],
//     exit: {dx, dz} (the verb travels: later verbs start from there), two: {partner verb, offset [x, z, yaw]}, prop: 'attach'|'release'}
const FALLROOT = ['root.lean', 'root.dy', 'root.dz', 'root.roll', 'ik'];
export const VERBS = {
  idle_alive: {act: .34, tail: .5, main: ['root.dx', 1], cam: 25, breath: true,   // P3b: one subtle weight shift + head turn (no big key pose); exempt from the silhouette gate, measured by the LIFE gate
    key: P({root: {dx: .06, roll: -1.6}, waist: [0, -3, 1], head: [0, 9, 0]}),
    settle: P({root: {dx: .06, roll: -1.6}, waist: [0, -3, 1], head: [0, 9, 0]})},
  look_around: {act: .22, tail: .9, main: ['head.y', -1], cam: -25,   // P3b: the brow-shade hand sits above-and-beside the eyes (never over the face); the head turns left (−35°) then right (+35°), the chest follows 30 %
    key: P({head: [-6, -35, 0], waist: [-1, -10.5, 0], rHand: {p: [1.5, 3.25, .15], pole: [1, -.8, 0]}, rW: [-22, 0, 0], lS: [6, 0, -6]}),
    settle: P({head: [-6, 35, 0], waist: [-1, 10.5, 0], rHand: {p: [1.5, 3.25, .15], pole: [1, -.8, 0]}, rW: [-22, 0, 0], lS: [6, 0, -6]})},
  flinch: {act: .07, tail: .4, main: ['waist.x', -1], cam: 30,
    antic: P({waist: [6, 0, 0], head: [-6, 0, 0], root: {lean: 3}}),
    key: P({head: [14, -28, -8], waist: [-12, 20, -6], rS: [-118, 0, -20], rE: -116, lS: [-68, 0, -38], lE: -96, lW: [0, 0, -20], root: {lean: -6, roll: 4, dy: -.16, dz: -.12}}),
    settle: P({head: [10, -22, -6], waist: [-8, 16, -4], rS: [-108, 0, -18], rE: -110, lS: [-60, 0, -34], lE: -90, lW: [0, 0, -16], root: {lean: -4, roll: 3, dy: -.12, dz: -.1}}),
    impact: {'head.x': 6, 'root.dy': -.05}},
  gasp_step_back: {act: .14, tail: .5, main: ['root.lean', -1], cam: 25, exit: {dz: -.55},   // P3b: hands up OPEN beside the body (elbows out, palms out), a full stride back (the right foot travels 1.0), the chest leans back 10°
    key: P({root: {dz: -.46, dy: -.09, lean: -10}, waist: [-4, 0, 0], head: [-10, 0, 0], lHand: {p: [-2.1, .95, .75], pole: [-.6, -.6, -.4]}, rHand: {p: [2.1, .95, .75], pole: [.6, -.6, -.4]}, lW: [-10, 0, -10], rW: [-10, 0, 10], rf: {z: -1.0}}),
    settle: P({root: {dz: -.55, lean: -8}, waist: [-3, 0, 0], head: [-8, 0, 0], lHand: {p: [-2.1, .95, .75], pole: [-.6, -.6, -.4]}, rHand: {p: [2.1, .95, .75], pole: [.6, -.6, -.4]}, lW: [-10, 0, -10], rW: [-10, 0, 10], lf: {z: -.5}, rf: {z: -1.0}}), arc: {side: 'both', deg: 14}},
  point: {act: .12, tail: .45, main: ['rightShoulder.x', -1], cam: 15,
    key: P({rS: [-90, 0, 52], rE: -4, head: [-4, 34, 0], waist: [3, 18, 0], lS: [12, 0, -8], lE: -22, root: {lean: 4, dz: .1}, rf: {z: .35}}),
    settle: P({rS: [-86, 0, 50], rE: -6, head: [-3, 30, 0], waist: [2, 16, 0], lS: [10, 0, -8], lE: -20, root: {lean: 3, dz: .1}, rf: {z: .35}}), arc: {side: 'right', deg: 35}},
  cheer: {act: .14, tail: .5, main: ['waist.x', -1], cam: 25,
    antic: P({root: {dy: -.34, dz: -.18, lean: 10}, waist: [14, 0, 0], head: [8, 0, 0], lS: [30, 0, -12], rS: [30, 0, 12], lE: -30, rE: -30}),
    key: P({lS: [-12, 0, -152], rS: [-12, 0, 152], lE: -18, rE: -14, head: [-18, 6, 0], waist: [-9, 0, 0], root: {dy: 0, lean: -3}}),
    settle: P({lS: [-12, 0, -146], rS: [-12, 0, 146], lE: -22, rE: -18, head: [-14, 5, 0], waist: [-7, 0, 0], root: {lean: -2}}), arc: {side: 'both', deg: 30}},
  facepalm: {act: .14, tail: .55, main: ['rightShoulder.x', -1], cam: 30,
    key: P({rHand: {p: [.2, 1.95, 1.25], pole: [-.6, 1, 0]}, rW: [-30, 0, 0], head: [24, -8, 0], waist: [12, 0, 0], root: {lean: 3}, lS: [8, 0, -6]}),
    settle: P({rHand: {p: [.2, 1.9, 1.3], pole: [-.6, 1, 0]}, rW: [-30, 0, 0], head: [28, -6, 4], waist: [14, 0, 0], root: {lean: 4}, lS: [8, 0, -6]}), arc: {side: 'right', deg: 25},
    impact: {'head.x': 7}},
  shrug: {act: .12, tail: .45, main: ['rightShoulder.z', 1], cam: 20,
    key: P({lS: [-24, 0, -36], rS: [-24, 0, 36], lE: -92, rE: -92, lW: [0, 0, -24], rW: [0, 0, 24], head: [-4, 0, 16], waist: [-4, 0, 3], root: {dy: .0}}),
    settle: P({lS: [-22, 0, -32], rS: [-22, 0, 32], lE: -88, rE: -88, lW: [0, 0, -20], rW: [0, 0, 20], head: [-3, 0, 13], waist: [-3, 0, 2]}), arc: {side: 'both', deg: 20}},
  arms_cross: {act: .16, tail: .45, main: ['head.y', -1], cam: 25,   // P3b: forearms stacked — the left one 0.25 higher and 0.2 behind the right; hands tucked in toward the opposite upper arm as far as the reach allows
    key: P({lHand: {p: [.2, 1.241, .5], pole: [-1, -.4, 0]}, rHand: {p: [-.2, .95, .747], pole: [1, -.4, 0]}, head: [-6, -10, 3], waist: [-3, 0, 0], root: {roll: 1.5}}),
    settle: P({lHand: {p: [.2, 1.241, .5], pole: [-1, -.4, 0]}, rHand: {p: [-.2, .95, .747], pole: [1, -.4, 0]}, head: [-5, -9, 3], waist: [-3, 0, 0], root: {roll: 1.5}})},
  grab: {act: .12, tail: .45, main: ['rightShoulder.x', -1], cam: 60, prop: 'attach',
    key: P({rS: [-58, 0, 4], rE: -14, rW: [-24, 0, 0], waist: [26, 0, 0], head: [14, 0, 0], root: {lean: 12, dy: -.42, dz: -.3}, lS: [20, 0, -12], lE: -24, rf: {z: .5}}),
    settle: P({rS: [-56, 0, 6], rE: -64, rW: [-8, 0, 0], waist: [8, 0, 0], head: [6, 0, 0], root: {lean: 3, dy: -.06, dz: -.04}, lS: [8, 0, -8], lE: -18, rf: {z: .4}}), arc: {side: 'right', deg: 30}},
  tug_pull: {act: .18, tail: .55, main: ['root.lean', -1], cam: 60,
    key: P({lS: [-66, 0, -4], rS: [-70, 0, 4], lE: -26, rE: -30, root: {lean: -16, dy: -.36, dz: -.32}, waist: [-10, 0, 0], head: [-4, 0, 0], rf: {z: .55}, lf: {z: -.25}}),
    settle: P({lS: [-62, 0, -4], rS: [-66, 0, 4], lE: -34, rE: -36, root: {lean: -13, dy: -.32, dz: -.28}, waist: [-8, 0, 0], head: [-2, 0, 0], rf: {z: .55}, lf: {z: -.25}}),
    impact: {'waist.x': -3, 'head.x': 3, shape: 'osc', peak: .16}},
  push: {act: .12, tail: .5, main: ['root.lean', 1], cam: 75,
    antic: P({lS: [-44, 0, -10], rS: [-44, 0, 10], lE: -122, rE: -122, root: {lean: -5, dz: -.1}, waist: [-5, 0, 0], lW: [-30, 0, 0], rW: [-30, 0, 0]}),
    key: P({lS: [-86, 0, -4], rS: [-86, 0, 4], lE: -6, rE: -6, lW: [-30, 0, 0], rW: [-30, 0, 0], root: {lean: 14, dz: .3, dy: -.12}, waist: [10, 0, 0], head: [-6, 0, 0], rf: {z: -.6}, lf: {z: .35}}),
    settle: P({lS: [-82, 0, -4], rS: [-82, 0, 4], lE: -12, rE: -12, lW: [-26, 0, 0], rW: [-26, 0, 0], root: {lean: 11, dz: .26, dy: -.1}, waist: [8, 0, 0], head: [-4, 0, 0], rf: {z: -.6}, lf: {z: .35}})},
  throw: {act: .1, tail: .5, main: ['rightShoulder.x', -1], cam: 68, prop: 'release',
    antic: P({rS: [58, 0, 70], rE: -96, rW: [20, 0, 0], waist: [-10, -32, 0], root: {lean: -6, yaw: -10}, head: [-4, 8, 0], lS: [-50, 0, -26], lE: -20}),
    key: P({rS: [-112, 0, 20], rE: -12, rW: [-24, 0, 0], waist: [16, 24, 0], root: {lean: 9, yaw: 8, dz: .2}, head: [-6, 4, 0], lS: [24, 0, -18], lE: -40, lf: {z: .55}}),
    settle: P({rS: [-40, 0, -22], rE: -34, rW: [-10, 0, 0], waist: [20, 30, 0], root: {lean: 10, yaw: 10, dz: .24}, head: [-2, 6, 0], lS: [26, 0, -16], lE: -38, lf: {z: .55}}), arc: {side: 'right', deg: 40}},
  catch: {act: .1, tail: .5, main: ['rightShoulder.x', -1], cam: 45, prop: 'attach',
    key: P({lS: [-112, 0, -14], rS: [-112, 0, 14], lE: -22, rE: -22, lW: [-14, 0, 0], rW: [-14, 0, 0], head: [-16, 0, 0], waist: [-4, 0, 0]}),
    settle: P({lS: [-56, 0, -14], rS: [-56, 0, 14], lE: -112, rE: -112, lW: [0, 0, 0], rW: [0, 0, 0], head: [4, 0, 0], waist: [6, 0, 0], root: {dy: -.18, dz: -.12, lean: 4}}),
    impact: {'root.dy': -.1, 'waist.x': 5}, arc: {side: 'both', deg: 20}},
  jump: {act: .42, tail: .55, main: ['rightShoulder.x', -1], cam: 30, air: {t0: -.3, apex: 0, t1: .3, h: 1.7},
    antic: P({root: {dy: -.5, dz: -.42, lean: 16}, waist: [20, 0, 0], head: [10, 0, 0], lS: [40, 0, -10], rS: [40, 0, 10], lE: -24, rE: -24}),
    key: P({rS: [-160, 0, 16], rE: -22, lS: [-40, 0, -40], lE: -70, head: [-14, 0, 4], waist: [-4, 6, 0], ik: 0, lH: [-70, 0, -6], lK: 116, lA: [24, 0, 0], rH: [-16, 0, 6], rK: 60, rA: [26, 0, 0]}),
    settle: P({rS: [-10, 0, 10], rE: -12, lS: [-4, 0, -10], lE: -14, head: [2, 0, 0], waist: [4, 0, 0]}),
    sub: [{ch: LEGJ, keys: [[-.31, 'straight'], [-.18, 'key'], [.12, 'key'], [.29, 'straight']]}, {ch: ['root.dy', 'root.dz', 'root.lean'], keys: [[-.42, 'antic'], [-.3, 'straight']]}, {ch: ['ik'], keys: [[-.45, 'straight'], [-.31, 'straight'], [-.29, 'key'], [.29, 'key'], [.31, 'straight']]}],
    impact: {at: .3, 'root.dy': -.42, 'root.dz': -.32, 'root.lean': 12, 'waist.x': 14, peak: .1}},
  land: {act: .1, tail: .55, main: ['waist.x', 1], cam: 30, air: {t0: -9, apex: -.42, t1: 0, h: 1.4},
    antic: P({lS: [-120, 0, -40], rS: [-120, 0, 40], lE: -20, rE: -20, waist: [-8, 0, 0], head: [-10, 0, 0]}),
    key: P({lS: [-36, 0, -42], rS: [-36, 0, 42], lE: -34, rE: -34, waist: [22, 0, 0], head: [14, 0, 0], root: {lean: 10}}),
    settle: P({lS: [-6, 0, -10], rS: [-6, 0, 10], lE: -10, rE: -10, waist: [4, 0, 0], head: [2, 0, 0], root: {lean: 2}}),
    impact: {'root.dy': -.56, 'root.dz': -.4, 'root.lean': 10, peak: .1}},
  trip_fall: {act: .36, tail: .55, main: ['rightShoulder.x', -1], cam: 80, fall: FALLROOT,
    antic: P({root: {lean: -8, cz: .49, cy: 0}, lS: [30, 0, -40], rS: [30, 0, 40], lE: -30, rE: -30, head: [-14, 0, 0], waist: [-6, 0, 0]}),
    key: P({root: {lean: 88, cz: .49, cy: 0, dy: .02}, ik: 0, lS: [-164, 0, -30], rS: [-164, 0, 30], lE: -10, rE: -10, head: [-30, 0, 0], waist: [-4, 0, 0]}),
    settle: P({root: {lean: 88, cz: .49, cy: 0, dy: .02}, ik: 0, lS: [-150, 0, -40], rS: [-156, 0, 40], lE: -16, rE: -20, head: [-24, 14, 0], waist: [-2, 0, 0], lH: [-10, 0, 0], lK: 34, rH: [6, 0, 0], rK: 14}),
    impact: {'head.x': -10, 'root.dy': .12, shape: 'osc', peak: .07}},
  slip: {act: .3, tail: .55, main: ['rightShoulder.x', 1], cam: 80, fall: FALLROOT, skid: [-.3, 0],
    antic: P({root: {lean: 7}, lS: [-60, 0, -30], rS: [-60, 0, 30], head: [8, 0, 0], waist: [6, 0, 0], rf: {z: .3}}),
    key: P({root: {lean: -86, cz: -.49, cy: 0, dy: .02}, ik: 0, lH: [-92, 0, -8], rH: [-70, 0, 8], lK: 20, rK: 40, lS: [40, 0, -100], rS: [40, 0, 100], lE: -20, rE: -20, head: [16, 0, 0], waist: [8, 0, 0]}),
    settle: P({root: {lean: -86, cz: -.49, cy: 0, dy: .02}, ik: 0, lH: [-34, 0, -10], rH: [-20, 0, 10], lK: 26, rK: 30, lS: [30, 0, -80], rS: [30, 0, 84], lE: -20, rE: -24, head: [10, 6, 0], waist: [4, 0, 0]}),
    impact: {'head.x': 14, shape: 'osc', peak: .07}},
  bonk_dizzy: {act: .07, tail: .45, main: ['head.x', 1], cam: 25, dizzy: true,
    antic: P({head: [-16, 0, 0], waist: [-4, 0, 0]}),
    key: P({head: [26, 0, 12], waist: [8, 0, 6], root: {dy: -.22, dz: -.14, roll: 3}, lS: [-6, 0, -34], rS: [-6, 0, 30], lE: -20, rE: -20}),
    settle: P({head: [14, 0, 10], waist: [6, 0, 4], root: {dy: -.16, dz: -.1, roll: 2}, lS: [-4, 0, -26], rS: [-4, 0, 24], lE: -26, rE: -24}),
    impact: {'head.x': 3, 'root.dy': -.06}},
  knees_collapse: {act: .26, tail: .7, main: ['head.x', 1], cam: 55, fall: ['root.dy', 'root.dz'],
    antic: P({head: [-14, 0, 0], waist: [-6, 0, 0], root: {dy: .0}, lS: [-12, 0, -10], rS: [-12, 0, 10]}),
    key: P({root: {dy: -.505, dz: .74}, lf: {z: -.75, pitch: 90}, rf: {z: -.75, pitch: 90}, waist: [10, 0, 0], head: [16, 0, 0], lS: [4, 0, -8], rS: [4, 0, 8], lE: -10, rE: -10}),
    settle: P({root: {dy: -.505, dz: .74, lean: 4}, lf: {z: -.75, pitch: 90}, rf: {z: -.75, pitch: 90}, waist: [24, 0, 0], head: [30, 0, 0], lS: [12, 0, -4], rS: [12, 0, 4], lE: -6, rE: -6}),
    impact: {'waist.x': 4, 'root.dy': -.0}},
  reach_for: {act: .16, tail: .55, main: ['rightShoulder.x', -1], cam: 25,
    key: P({rS: [-140, 0, 42], rE: -2, rW: [-16, 0, 0], lS: [42, 0, -18], lE: -16, root: {lean: 16, dz: .4, dy: -.2}, waist: [12, 22, 0], head: [-22, 26, 0], rf: {z: .85}}),
    settle: P({rS: [-134, 0, 40], rE: -4, rW: [-14, 0, 0], lS: [36, 0, -18], lE: -18, root: {lean: 14, dz: .38, dy: -.2}, waist: [10, 20, 0], head: [-16, 24, 0], rf: {z: .85}}), arc: {side: 'right', deg: 35}},
  comfort_kneel: {act: .3, tail: .6, main: ['head.y', 1], cam: -40, two: {partner: 'comfort_b', reach: 'right', place: [2.4, 1.4, -30]}, fall: ['root.dy'],
    antic: P({root: {dy: .0}, head: [-6, -8, 0], waist: [-3, 0, 0], rS: [14, 0, 6]}),
    key: P({root: {dy: -.505, dz: .54}, lf: {z: -.95, pitch: 90}, rf: {z: 1.3}, rS: [-64, 0, 10], rE: -40, rW: [-12, 0, 0], head: [10, 18, 0], waist: [8, 10, 0], lS: [6, 0, -8]}),
    settle: P({root: {dy: -.505, dz: .54, lean: 3}, lf: {z: -.95, pitch: 90}, rf: {z: 1.3}, rS: [-62, 0, 10], rE: -42, rW: [-12, 0, 0], head: [12, 22, 4], waist: [8, 12, 0], lS: [6, 0, -8]}), arc: {side: 'right', deg: 20}},
  comfort_b: {act: .3, tail: .6, main: ['head.x', 1], cam: 50,
    key: P({root: {dy: -.505, dz: .74}, lf: {z: -.75, pitch: 90}, rf: {z: -.75, pitch: 90}, waist: [22, 0, 0], head: [28, 0, 0], lS: [12, 0, -4], rS: [12, 0, 4], lE: -6, rE: -6}),
    settle: P({root: {dy: -.505, dz: .74}, lf: {z: -.75, pitch: 90}, rf: {z: -.75, pitch: 90}, waist: [18, -8, 0], head: [18, -26, 0], lS: [10, 0, -4], rS: [10, 0, 4], lE: -8, rE: -8})},
  // ---- talk gestures: additive (delta) layers on whatever the actor is doing; key on the stressed word ----
  beat: {act: .08, tail: .22, gesture: true, main: ['rightShoulder.x', -1], key: P({rE: -32, rW: [-22, 0, 0], rS: [-14, 0, 3]}), settle: REST},
  open_palms: {act: .12, tail: .35, gesture: true, main: ['rightShoulder.z', 1], key: P({lS: [-26, 0, -26], rS: [-26, 0, 26], lE: -48, rE: -48, lW: [0, 0, -18], rW: [0, 0, 18]}), settle: REST},
  head_nod: {act: .09, tail: .25, gesture: true, main: ['head.x', 1], key: P({head: [14, 0, 0]}), settle: REST},
  head_shake: {act: .09, tail: .4, gesture: true, main: ['head.y', -1], key: P({head: [2, -15, 0]}), settle: REST, impact: {'head.y': 26, shape: 'osc', peak: .11}},
  // Phase 1F: THE GOVERNOR's acts (GOV_VERBS; the R6 keys in engine/r6keys.js). rope_pull = both hands high on the bell rope, then a hard yank down
  // (knees give); announce = the megaphone arm up and forward, chest out; panic_up = both arms flung up, flailing.
  rope_pull: {act: .14, tail: .6, main: ['root.dy', -1], cam: 30,
    antic: P({lS: [-172, 0, -6], rS: [-172, 0, 6], head: [-24, 0, 0], root: {lean: -4}}),
    key: P({lS: [-62, 0, -8], rS: [-62, 0, 8], head: [-8, 0, 0], waist: [6, 0, 0], root: {dy: -.38, lean: 6}}),
    settle: P({lS: [-70, 0, -8], rS: [-70, 0, 8], head: [-10, 0, 0], waist: [4, 0, 0], root: {dy: -.3, lean: 4}}), impact: {'head.x': 6, 'leftShoulder.x': 8, 'rightShoulder.x': 8, shape: 'osc', peak: .12}},
  announce: {act: .14, tail: .5, main: ['rightShoulder.x', -1], cam: 25,
    antic: P({rS: [12, 0, 6], head: [8, 0, 0], root: {lean: 5}}),
    key: P({rS: [-100, 0, 8], lS: [-6, 0, -34], head: [-8, 0, 0], waist: [-6, 0, 0], root: {lean: -5}}),
    settle: P({rS: [-97, 0, 8], lS: [-6, 0, -30], head: [-6, 0, 0], waist: [-5, 0, 0], root: {lean: -4}})},
  panic_up: {act: .1, tail: .5, main: ['waist.x', -1], cam: 25,
    antic: P({lS: [10, 0, -6], rS: [10, 0, 6], head: [10, 0, 0], root: {dy: -.2, lean: 8}}),
    key: P({lS: [-30, 0, -150], rS: [-30, 0, 150], head: [-16, 0, 0], waist: [-8, 0, 0], root: {lean: -8, dz: -.25}}),
    settle: P({lS: [-24, 0, -138], rS: [-24, 0, 138], head: [-12, 0, 0], waist: [-6, 0, 0], root: {lean: -6, dz: -.25}}), impact: {'leftShoulder.z': 14, 'rightShoulder.z': -14, shape: 'osc', peak: .1}},
  // fearbell pass 2 (owner A3, FB_VERBS; R6 keys in engine/r6keys.js): water = the held can tips forward over the flowers; sip = the cup up to the mouth;
  // leap = a scared jump up and forward (R6: unplanted, the episode moves the mark into the cart); punch = a straight right jab; lookAtLens = chin level,
  // the body turn to the lens is done by the episode (engine/episode.js lensActs).
  water: {act: .2, tail: .6, main: ['rightShoulder.x', -1], cam: 30,
    antic: P({rS: [-30, 0, 8], head: [-4, 0, 0]}), key: P({rS: [-78, 0, 8], rW: [30, 0, 0], head: [14, 0, 0], root: {lean: 6}}), settle: P({rS: [-74, 0, 8], rW: [26, 0, 0], head: [12, 0, 0], root: {lean: 5}})},
  sip: {act: .18, tail: .5, main: ['rightShoulder.x', -1], cam: 20,
    antic: P({rS: [-20, 0, 6], head: [4, 0, 0]}), key: P({rS: [-112, -40, -60], rE: -20, head: [-6, 0, 0]}), settle: P({rS: [-108, -38, -58], rE: -18, head: [-4, 0, 0]})},
  leap: {act: .16, tail: .7, main: ['root.dy', 1], cam: 40,
    antic: P({root: {dy: -.25, lean: 12}, lS: [20, 0, -6], rS: [20, 0, 6]}), key: P({root: {dy: 2.4, dz: 1.2, lean: -6}, lS: [-160, 0, -20], rS: [-160, 0, 20], head: [-14, 0, 0]}),
    settle: P({root: {dy: 2.2, dz: 1.4, lean: -4}, lS: [-150, 0, -24], rS: [-150, 0, 24], head: [-12, 0, 0]})},
  punch: {act: .08, tail: .45, main: ['rightShoulder.x', -1], cam: 60,
    antic: P({rS: [24, 0, 12], lS: [-40, 0, -10], root: {lean: -6}}), key: P({rS: [-92, 0, 2], rE: 0, lS: [-46, 0, -12], root: {lean: 12, dz: .35}, head: [-4, 0, 0]}),
    settle: P({rS: [-88, 0, 4], lS: [-44, 0, -12], root: {lean: 10, dz: .3}, head: [-4, 0, 0]})},
  lookAtLens: {act: .2, tail: .4, main: ['head.x', -1], cam: 0,
    antic: P({head: [6, 0, 0]}), key: P({head: [-3, 0, 0]}), settle: P({head: [-2, 0, 0]})},
};
export const FB_VERBS = ['water', 'sip', 'leap', 'punch', 'lookAtLens'];
export const GOV_VERBS = ['rope_pull', 'announce', 'panic_up'];
// ---- hug and carry (P3b): solved poses, frozen as data (scripts/v2/acting6-solve.js: seeded search over pure arm IK + FK + sampled box penetration) ----
// C(d): a full channel pose = REST + the listed channels. Both actors of a hug / carry come from ONE call (partner half + placement).
const C = (d, base = REST) => ({...base, ...d});
const NO_OS_LIMBS = CHANNELS.filter(c => /^(left|right)(Shoulder|Elbow|Wrist|Hip|Knee|Ankle)\./.test(c)), NO_OS_ALL = CHANNELS.filter(c => !isFoot(c) && c !== 'ik' && c !== 'torso.sq');   // arms and legs stop on the contact; a partner's whole pose stops
const CONTACT_DRIFT = ['head.y', 'head.x'];   // moving hold of an embrace / carry: the head only (arms and chest stay on the contact)
const HUG_D_L = 57;   // hug_l's camera angle off the torso line (45 hid the partner in the silhouette)
const SQUEEZE = {at: .12, frames: 6, sq: .03, rock: 4, axis: 'root.roll'};   // rock = the whole body sways about its hips (both partners together)   // after the contact: both chests compress 3 % and rock 4° once, over 6 frames
const FREE_ARM = {'leftShoulder.x': 105.204, 'leftShoulder.y': -88.601, 'leftShoulder.z': 106.536, 'leftElbow.x': -5.137};   // the lead's free arm hangs out to the side
// Side embrace of a kid (0 penetration for her scale: .62 / .82 / 1.0): the lead's near arm round her back, her near arm round his neck, her free hand on his chest.
const HUGS = {
  '': {kp: 0.82, place: [2.76, 0.5, 38.17], lead: C({...FREE_ARM, 'head.y': 12, 'rightShoulder.x': 5.64, 'rightShoulder.y': 53.667, 'rightShoulder.z': 0.506, 'rightElbow.x': -85.444, 'root.lean': 8, 'root.roll': -13.99}),
    partner: C({'head.x': -12.47, 'leftShoulder.x': -84.422, 'leftShoulder.y': -44.997, 'leftShoulder.z': -163.596, 'rightShoulder.x': -167.002, 'rightShoulder.y': 22.767, 'rightShoulder.z': -100.283, 'leftElbow.x': -5.137, 'rightElbow.x': -5.137, 'root.lean': 24.55, 'root.roll': -10.53})},
  '_s': {kp: 0.62, place: [2.06, 0.59, -9.8], lead: C({...FREE_ARM, 'head.y': 12, 'rightShoulder.x': 11.859, 'rightShoulder.y': 33.201, 'rightShoulder.z': -6.85, 'rightElbow.x': -76.687, 'root.lean': 7.82, 'root.roll': -14}),
    partner: C({'head.x': 9.43, 'leftShoulder.x': 166.579, 'leftShoulder.y': -41.118, 'leftShoulder.z': 6.122, 'rightShoulder.x': -158.005, 'rightShoulder.y': 8.305, 'rightShoulder.z': -81.074, 'leftElbow.x': -75.561, 'rightElbow.x': -5.137, 'root.lean': 24.7, 'root.roll': -14.96})},
  '_l': {kp: 1, place: [2.39, 0.6, 5.51], lead: C({...FREE_ARM, 'head.y': 12, 'rightShoulder.x': 37.747, 'rightShoulder.y': 11.819, 'rightShoulder.z': 8.933, 'rightElbow.x': -116.095, 'root.lean': 0.7, 'root.roll': -1.98}),
    partner: C({'head.x': -21.91, 'leftShoulder.x': -171.547, 'leftShoulder.y': 4.721, 'leftShoulder.z': 70.434, 'rightShoulder.x': 133.643, 'rightShoulder.y': -0.045, 'rightShoulder.z': -81.649, 'leftElbow.x': -131.328, 'rightElbow.x': -5.137, 'root.lean': 13.03, 'root.roll': 3.85})},
};
for (const [sfx, h] of Object.entries(HUGS)) {
  VERBS['hug' + sfx] = {act: .16, tail: .5, main: ['head.y', 1], cam: 8, slerp: true, noLag: true, drift: CONTACT_DRIFT, noOs: NO_OS_ALL.filter(c => !c.startsWith('head.')), squeeze: SQUEEZE, kp: h.kp, two: {partner: 'hug_b' + sfx, place: h.place}, key: h.lead, settle: h.lead};
  VERBS['hug' + sfx].cam = Math.round(Math.atan2(h.place[0], h.place[1]) * 180 / Math.PI + (sfx === '_l' ? -HUG_D_L + 180 : 45) - 180);   // P3c staging: the camera sits 45° off the line between the torsos, on the far side from the partner (three-quarter of the lead's side), so both arms show and the face stays clear
  VERBS['hug_b' + sfx] = {act: .18, tail: .5, main: ['root.lean', 1], cam: 8, slerp: true, noLag: true, drift: CONTACT_DRIFT, noOs: NO_OS_ALL, squeeze: SQUEEZE, key: h.partner, settle: h.partner};
}
// Carry. PIGGYBACK (kid partners, scale .82): the lead stoops, the partner's hips ride a fixed point of his chest frame (behind the waist), arms forward over his
// shoulders, legs round his hips, his hands under her thighs. HIP-CARRY (small kids, .62): she sits on his +x hip, one arm round his neck, his near arm round her back.
// The pickup: the lead dips 0.25 studs (anticipation), rises over 8 frames; the partner follows 1 frame behind (episode.js / reel).
export const CARRY = {
  carry: {kp: .82, chest: [0, .53, -1.1]},                                                  // partner hip pivot in the lead's chest (waist) frame
  carry_hip: {kp: .62, origin: [1.67, 2.43, 0.7], yaw: -84.91},                                    // hip pivot (lead units, origin frame) + her yaw°
};
const RISE = 8 / 24, DIP = .25;
Object.assign(VERBS, {
  carry: {act: RISE, noLag: true, drift: CONTACT_DRIFT, tail: .6, main: ['root.dy', 1], cam: -50, slerp: true, noOs: NO_OS_LIMBS, kp: .82, two: {partner: 'carried', follow: true},
    antic: C({'root.dy': -DIP, 'root.lean': 14, 'waist.x': 16, 'head.x': 6, 'leftShoulder.x': 22, 'rightShoulder.x': 22, 'leftElbow.x': -18, 'rightElbow.x': -18}),
    key: C({'head.x': -14, 'waist.x': 19.91, 'leftShoulder.x': 170.791, 'leftShoulder.y': 22.457, 'leftShoulder.z': 175.883, 'rightShoulder.x': 170.791, 'rightShoulder.y': -22.457, 'rightShoulder.z': -175.883,
      'leftElbow.x': -58.703, 'rightElbow.x': -58.703, 'root.dy': -.1, 'root.lean': 25.55}),
    settle: C({'head.x': -13, 'waist.x': 19, 'leftShoulder.x': 170.791, 'leftShoulder.y': 22.457, 'leftShoulder.z': 175.883, 'rightShoulder.x': 170.791, 'rightShoulder.y': -22.457, 'rightShoulder.z': -175.883,
      'leftElbow.x': -58.703, 'rightElbow.x': -58.703, 'root.dy': -.1, 'root.lean': 25})},
  carried: {act: RISE, noLag: true, drift: CONTACT_DRIFT, tail: .6, main: ['root.lean', 1], cam: -50, slerp: true, noOs: NO_OS_ALL,
    antic: C({'leftKnee.x': 30, 'rightKnee.x': 30, 'leftHip.x': -14, 'rightHip.x': -14, 'waist.x': 6}),
    key: C({'head.x': -26.83, 'waist.x': -10, 'leftShoulder.x': -80.45, 'leftShoulder.z': -27.83, 'rightShoulder.x': -80.45, 'rightShoulder.z': 27.83, 'leftElbow.x': -7.07, 'rightElbow.x': -7.07,
      'leftHip.x': -77.5, 'leftHip.z': -66.39, 'rightHip.x': -77.5, 'rightHip.z': 66.39, 'leftKnee.x': 125.5, 'rightKnee.x': 125.5, 'root.lean': 45.46, ik: 0}),
    settle: C({'head.x': -25, 'waist.x': -10, 'leftShoulder.x': -80.45, 'leftShoulder.z': -27.83, 'rightShoulder.x': -80.45, 'rightShoulder.z': 27.83, 'leftElbow.x': -7.07, 'rightElbow.x': -7.07,
      'leftHip.x': -77.5, 'leftHip.z': -66.39, 'rightHip.x': -77.5, 'rightHip.z': 66.39, 'leftKnee.x': 125.5, 'rightKnee.x': 125.5, 'root.lean': 45.46, ik: 0})},
  carry_hip: {act: RISE, noLag: true, drift: CONTACT_DRIFT, tail: .6, main: ['root.dy', 1], cam: 20, slerp: true, noOs: NO_OS_LIMBS, kp: .62, two: {partner: 'carried_hip', follow: true},
    antic: C({'root.dy': -DIP, 'waist.x': 18, 'root.roll': 4, 'head.x': 8, 'leftShoulder.x': 8, 'rightShoulder.x': 25, 'rightShoulder.z': 14, 'rightElbow.x': -20}),
    key: C({...FREE_ARM, 'rightShoulder.x': 40.951, 'rightShoulder.y': -15.993, 'rightShoulder.z': 71.974, 'rightElbow.x': -120.334, 'root.dy': -0.07, 'root.lean': 0.01, 'root.roll': -8.31}),
    settle: C({...FREE_ARM, 'rightShoulder.x': 40.951, 'rightShoulder.y': -15.993, 'rightShoulder.z': 71.974, 'rightElbow.x': -120.334, 'root.dy': -0.07, 'root.lean': 0.01, 'root.roll': -8.31})},
  carried_hip: {act: RISE, noLag: true, drift: CONTACT_DRIFT, tail: .6, main: ['root.roll', -1], cam: 20, slerp: true, noOs: NO_OS_ALL,
    antic: C({'leftKnee.x': 30, 'rightKnee.x': 30, 'leftHip.x': -14, 'rightHip.x': -14}),
    key: C({'head.x': -24.72, 'leftShoulder.x': 21.783, 'leftShoulder.y': 31.998, 'leftShoulder.z': 126.722, 'rightShoulder.x': 93.729, 'rightShoulder.y': -11.983, 'rightShoulder.z': -121.683, 'leftElbow.x': -150.325, 'rightElbow.x': -5.137, 'leftHip.x': -31.26, 'leftHip.z': -25.57, 'rightHip.x': -31.26, 'rightHip.z': 25.57, 'leftKnee.x': 41.62, 'rightKnee.x': 41.62, 'root.lean': 7.83, 'root.roll': -23.24, 'ik': 0}),
    settle: C({'head.x': -24.72, 'leftShoulder.x': 21.783, 'leftShoulder.y': 31.998, 'leftShoulder.z': 126.722, 'rightShoulder.x': 93.729, 'rightShoulder.y': -11.983, 'rightShoulder.z': -121.683, 'leftElbow.x': -150.325, 'rightElbow.x': -5.137, 'leftHip.x': -31.26, 'leftHip.z': -25.57, 'rightHip.x': -31.26, 'rightHip.z': 25.57, 'leftKnee.x': 41.62, 'rightKnee.x': 41.62, 'root.lean': 7.83, 'root.roll': -23.24, 'ik': 0})},
  carry_box: {act: .2, tail: .5, main: ['waist.x', -1], cam: 50, prop: 'carry',   // a prop (crate) in both arms, no partner
    antic: P({root: {dy: -.52, dz: -.42, lean: 14}, waist: [26, 0, 0], head: [16, 0, 0], lS: [-40, 0, -12], rS: [-40, 0, 12], lE: -20, rE: -20}),
    key: P({lS: [-48, 0, -12], rS: [-48, 0, 12], lE: -84, rE: -84, lW: [0, 0, -8], rW: [0, 0, 8], root: {lean: -7, dy: -.1}, waist: [-6, 0, 0], head: [-6, 0, 0]}),
    settle: P({lS: [-46, 0, -12], rS: [-46, 0, 12], lE: -86, rE: -86, lW: [0, 0, -8], rW: [0, 0, 8], root: {lean: -5, dy: -.08}, waist: [-4, 0, 0], head: [-4, 0, 0]})},
});
export const EXTRA_VERBS = ['hug_s', 'hug_l', 'carry_hip', 'carry_box'];
export const VERB_NAMES = ['idle_alive', 'look_around', 'flinch', 'gasp_step_back', 'point', 'cheer', 'facepalm', 'shrug', 'arms_cross', 'hug', 'grab', 'tug_pull', 'push', 'throw', 'catch', 'carry',
  'jump', 'land', 'trip_fall', 'slip', 'bonk_dizzy', 'knees_collapse', 'reach_for', 'comfort_kneel'];
export const GESTURES = ['beat', 'open_palms', 'head_nod', 'head_shake'];
export const PARTNER = Object.fromEntries(Object.entries(VERBS).filter(([, v]) => v.two).map(([k, v]) => [k, v.two.partner ?? null]));

// ---- phase timing (pure) -----------------------------------------------------------------------------------------------
let U1 = null;   // first u where overshootEase reaches 1 (the KEY)
export function keyCrossing(os = OS) { if (U1 !== null) return U1; let a = 0, b = .42; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; overshootEase(m, os) >= 1 ? b = m : a = m; } return U1 = b; }
// {ant, key, win, end, D}: anticipation ends at `ant` (= 20 % of the verb D), the KEY at `key`, the overshoot window at `win`, settle at `end`.
export function timing(v) {
  const W = v.act / keyCrossing(), D = (W + v.tail) / (1 - ANT), ant = ANT * D;
  return {ant, key: ant + v.act, win: ant + W, end: ant + W + v.tail, D, W};
}
const gammaPulse = (tau, p) => tau <= 0 ? 0 : (tau / p) * Math.exp(1 - tau / p);
const oscPulse = (tau, p) => tau <= 0 ? 0 : Math.sin(Math.PI * tau / p) * Math.exp(-tau / (1.6 * p));
const seedR = (seed, k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
// Moving hold: a seeded drift on head, chest and arms (≤ DRIFT_DEG), never on the root or legs (planted feet stay put).
export function drift(t, seed = 1, amp = 1) {
  const s = (k, f, a) => a * amp * Math.sin(2 * Math.PI * (f * t + seedR(seed, k)));
  return {'head.y': s(1, .21, DRIFT_DEG), 'head.x': s(2, .29, .8), 'head.z': s(3, .17, .6), 'waist.x': s(4, .27, .7), 'waist.y': s(5, .13, .8),
    'leftShoulder.x': s(6, .23, 1.1), 'rightShoulder.x': s(7, .19, 1.1), 'leftWrist.z': s(8, .31, 1.2), 'rightWrist.z': s(9, .37, 1.2)};
}
const scaleP = (p, base, I) => { const o = {}; for (const c of CHANNELS) { const b = base[c] ?? REST[c], x = p[c] ?? b; o[c] = c === 'ik' || c === 'root.cy' || c === 'root.cz' || c.endsWith('.pitch') || c === 'torso.sq' ? x : b + I * (x - b); } return o; };
// The three authored poses of a verb for an incoming pose `from` (absolute), intensity, facing (mirror + cheat), offset.
export function versePoses(name, {from = REST, intensity = 1, facing = 0, offset = null} = {}) {
  const v = VERBS[name]; if (!v) throw Error('acting6: unknown verb ' + name);
  const I = Math.min(1.5, Math.max(.5, intensity)), mir = facing < 0, cheat = Math.max(-20, Math.min(20, .25 * facing * (mir ? -1 : 1)));
  const prep = p => { let q = mir ? mirror(p) : {...p}; if (cheat) q['root.yaw'] += mir ? -cheat : cheat; if (offset) q = shift(q, offset); return q; };
  if (v.gesture) { const k = scaleP(v.key, REST, I); return {rest: REST, antic: autoAntic(REST, k), key: mir ? mirror(k) : k, settle: REST, I, mir}; }
  const base = prep(REST), key = scaleP(prep(v.key), base, I), settle = scaleP(prep(v.settle), base, I);
  const antic = v.antic ? scaleP(prep(v.antic), base, I) : autoAntic(from, key);
  for (const c of CHANNELS) if (isFoot(c) && !(v.antic && (v.antic[c] ?? REST[c]) !== REST[c])) antic[c] = from[c];   // feet stay planted through an anticipation unless it moves them
  return {rest: from, antic, key, settle, I, mir};
}
// 'auto' anticipation: 30 % the opposite way on every angle channel (as far as the joint allows); feet and ik stay.
function autoAntic(from, key) { const o = {...from}; for (const c of CHANNELS) if (isAngle(c) || c === 'root.dy' || c === 'root.dz' || c === 'root.dx') o[c] = clampCh(c, from[c] - .3 * (key[c] - from[c])); o.ik = from.ik; return o; }
// Travel offset {dx, dz, yaw}: the whole pose (root and feet) moved in the origin frame.
export function shift(p, {dx = 0, dz = 0, yaw = 0} = {}) {
  const q = {...p}, c = Math.cos(yaw * D), s = Math.sin(yaw * D), rot = (x, z) => [x * c + z * s, -x * s + z * c];
  [q['root.dx'], q['root.dz']] = rot(p['root.dx'], p['root.dz']); q['root.dx'] += dx; q['root.dz'] += dz; q['root.yaw'] += yaw;
  for (const f of ['lf', 'rf']) { [q[f + '.x'], q[f + '.z']] = rot(p[f + '.x'], p[f + '.z']); q[f + '.x'] += dx; q[f + '.z'] += dz; q[f + '.yaw'] += yaw; }
  return q;
}
// Channel weight in the stroke window: overshoot (default), no overshoot (noOs / feet), or gravity (fall).
function strokeW(v, c, t, T) {
  const u = (t - T.ant) / T.W;
  if (v.fall?.includes(c)) return clamp01((t - T.ant) / v.act) ** 2;
  const e = overshootEase(u);
  if (v.noOs?.includes(c) || c === 'ik') return u >= keyCrossing() ? 1 : Math.min(1, e);
  return e;
}
// The verb's channels at verb-local time t (0 = verb start). `poses` from versePoses; seed for the moving hold.
export function verbChannels(name, t, poses, seed = 1) {
  const v = VERBS[name], T = timing(v), {rest, antic, key, settle, I} = poses, out = {};
  const tl = c => {   // per-channel time: head leads, hands lag after the key
    if (HEADC.has(c)) return t + LEAD * smooth(t / T.ant);
    if (HANDC.has(c) && !v.noLag && t > T.key) { const post = T.end - T.key, d = t - T.key; return d <= post + LAG ? T.key + d * post / (post + LAG) : t - LAG; }
    return t;
  };
  const value = (c, tt) => {
    if (tt <= 0) return rest[c];
    if (tt < T.ant) return rest[c] + smooth(tt / T.ant) * (antic[c] - rest[c]);
    const ws = smooth((tt - T.win) / v.tail), w = strokeW(v, c, tt, T);
    return antic[c] + w * (key[c] - antic[c]) + ws * (settle[c] - key[c]);
  };
  for (const c of CHANNELS) if (!isFoot(c)) out[c] = clampCh(c, value(c, tl(c)));   // FK joints stop at their limits (an elbow locks out, never hyper-extends)
  if (v.slerp) for (const j of ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip']) {   // opt-in (hug, carry): big swings on the shortest arc
    const tt = tl(j + '.x'), e = P => eulerToQ(AX.map(a => P[`${j}.${a}`])), qR = e(rest), qA = e(antic), qK = e(key), qS = e(settle); let q;
    if (tt <= 0) q = qR; else if (tt < T.ant) q = qSlerp(qR, qA, smooth(tt / T.ant)); else q = qSlerp(qSlerp(qA, qK, strokeW(v, j + '.x', tt, T)), qS, smooth((tt - T.win) / v.tail));
    qToEuler(q).forEach((x, i) => { out[`${j}.${AX[i]}`] = x; }); }
  // feet: a monotone weight through every phase (lifted when they travel)
  const fw = tt => tt <= 0 ? 0 : tt < T.ant ? smooth(tt / T.ant) : 1, sw = tt => tt < T.ant ? 0 : Math.min(1, (tt - T.ant) / T.W >= keyCrossing() ? 1 : overshootEase((tt - T.ant) / T.W));
  const feet = (a, b, w) => { const m = mix(a, b, w, {footW: w}); for (const c of CHANNELS) if (isFoot(c)) out[c] = m[c]; };
  if (t < T.ant) feet(rest, antic, fw(t)); else if (t < T.win) feet(antic, key, sw(t)); else feet(key, settle, smooth((t - T.win) / v.tail));
  // elbow arc: the stroke's elbow bends further mid-move so the wrist path curves (never a straight line)
  if (v.arc) { const u = clamp01((t - T.ant) / v.act), b = Math.sin(Math.PI * u) * v.arc.deg * I;
    for (const side of v.arc.side === 'both' ? ['left', 'right'] : [poses.mir ? (v.arc.side === 'left' ? 'right' : 'left') : v.arc.side]) out[side + 'Elbow.x'] = Math.max(-150, out[side + 'Elbow.x'] - b); }
  // sub-keys (per-channel overrides relative to the key), impacts, flight, dizzy sway, moving hold
  for (const s of v.sub ?? []) { const ks = s.keys.map(([dt, which]) => [T.key + dt, which]), chans = s.ch.flatMap(j => j === 'ik' || j.includes('.') ? [j] : AX.map(a => `${j}.${a}`));
    const src = w => w === 'straight' ? REST : w === 'key' ? key : w === 'antic' ? antic : settle;
    if (t <= ks[0][0] || t >= ks.at(-1)[0]) { const k = t <= ks[0][0] ? null : ks.at(-1); if (k) for (const c of chans) out[c] = src(k[1])[c]; }
    else { let i = 0; while (ks[i + 1][0] < t) i++; const u = smooth((t - ks[i][0]) / (ks[i + 1][0] - ks[i][0])); for (const c of chans) out[c] = src(ks[i][1])[c] + u * (src(ks[i + 1][1])[c] - src(ks[i][1])[c]); } }
  if (v.impact) { const {shape = 'gamma', peak = .1, at = 0, ...amt} = v.impact, f = shape === 'osc' ? oscPulse : gammaPulse;
    for (const [ch, a] of Object.entries(amt)) { if (ch in out) out[ch] += (poses.mir && /\.(y|z)$|root\.(roll|yaw|dx)/.test(ch) ? -1 : 1) * a * I * f(t - T.key - at, peak); } }
  if (v.air) { const {t0, apex, t1, h} = v.air, a = T.key + apex, x = t - a, lo = T.key + t0, hi = T.key + t1;
    let y = 0; if (t > lo && t < hi) y = h * I * (1 - (x / (x < 0 ? a - lo : hi - a)) ** 2); if (t0 < -5 && t <= a) y = h * I;
    out['root.dy'] += Math.max(0, y); const e = 1.5 / FPS6, A = smooth((t - lo + e) / e) * (1 - smooth((t - hi + e) / e));
    if (!v.sub?.some(q => q.ch.includes('ik'))) out.ik = Math.min(out.ik, 1 - A); }   // a verb with its own ik keys times its take-off itself
  if (v.breath) out['torso.sq'] += breath(t, seed);
  if (v.squeeze) { const {at, frames, sq, rock} = v.squeeze, u = (t - T.key - at) / (frames / FPS6); if (u > 0 && u < 1) { out['torso.sq'] += sq * Math.sin(Math.PI * u); for (const [c, a] of v.squeeze.axes ?? [[v.squeeze.axis ?? 'waist.z', rock]]) out[c] += a * Math.sin(2 * Math.PI * u); } }   // hug squeeze beat: the chest compresses 3 % and rocks 4° once over 6 frames
  if (v.dizzy) { const d = t - T.key, a = smooth(d / .4) * I; if (d > 0) { const w = 2 * Math.PI * 1.1 * d; out['head.y'] += 12 * a * Math.sin(w); out['head.z'] += 8 * a * Math.cos(w); out['waist.z'] += 3 * a * Math.sin(w + 1); out['waist.y'] += 4 * a * Math.cos(w + 1); } }
  if (!v.gesture) { const dr = drift(t, seed, smooth((t - T.key) / .5)); for (const [c, x] of Object.entries(dr)) if (!v.drift || v.drift.includes(c)) out[c] += x; }   // v.drift: only these channels drift (contact verbs keep arms and legs still)
  if (v.skid) out.skid = t >= T.key + v.skid[0] && t <= T.key + v.skid[1] + 2 / FPS6 ? 1 : 0;   // an intended slide (the gag), flagged for the slide gate
  return out;
}

// ---- pure FK + IK ------------------------------------------------------------------------------------------------------
// Root position in the origin frame (before the origin's yaw) of a sample.
const rootPos = s => { const r = s.root, c = Math.cos(r.yaw), sn = Math.sin(r.yaw); return [r.dx * c + r.dz * sn, r.dy, -r.dx * sn + r.dz * c]; };
// Frames {p, R} of every pivot, the hand centres and the eight foot corners, in the origin frame (unscaled).
export function fk(s, build = 'adult_m') {
  const L = layout6(build), R0 = rootR(s.root), p0 = rootPos(s), P = s.pivots, f = {root: {p: p0, R: R0}};
  const at = (par, off, rot, name) => { const g = {p: add(par.p, mv(par.R, off)), R: mm(par.R, E(rot ?? [0, 0, 0]))}; f[name] = g; return g; };
  const w = at(f.root, [0, L.waistY, 0], P.waist, 'waist'); at(w, [0, L.headPivot[1] - L.waistY, 0], P.head, 'head');
  for (const side of ['left', 'right']) {
    const sx = side === 'left' ? -1 : 1, sh = at(w, [sx * L.shoulder[0], L.shoulder[1] - L.waistY, 0], P[side + 'Shoulder'], side + 'Shoulder');
    const el = at(sh, [0, -SEGL.arm, 0], P[side + 'Elbow'], side + 'Elbow'), wr = at(el, [0, -SEGL.fore, 0], P[side + 'Wrist'], side + 'Wrist');
    f[side + 'Hand'] = {p: add(wr.p, mv(wr.R, [0, -SEGL.hand / 2, 0])), R: wr.R};
    const hp = at(f.root, [sx * L.hipX, 2, 0], P[side + 'Hip'], side + 'Hip'), kn = at(hp, [0, -SEGL.thigh, 0], P[side + 'Knee'], side + 'Knee'), an = at(kn, [0, -SEGL.shin, 0], P[side + 'Ankle'], side + 'Ankle');
    f[side + 'FootCorners'] = [-1, 1].flatMap(x => [-SEGL.foot, 0].flatMap(y => [-1, 1].map(z => add(an.p, mv(an.R, [x * SEGL.footX, y, z * SEGL.footZ])))));
  }
  return f;
}
// Lowest point of the body (torso, head, arms, legs, feet corners) in the origin frame: ground clamp for FK verbs.
export function lowestBody(s, build = 'adult_m') {
  const f = fk(s, build), L = layout6(build); let lo = Infinity; const put = (g, pts) => { for (const q of pts) lo = Math.min(lo, add(g.p, mv(g.R, q))[1]); };
  const box = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap(x => [y0, y1].flatMap(y => [z0, z1].map(z => [x, y, z])));
  put(f.waist, box(-1, 1, 0, L.upH, -.5, .5)); put(f.root, box(-1, 1, L.bottom, L.waistY, -.5, .5)); put(f.head, box(-.7, .7, -.05, 1.25, -.62, .62));
  for (const side of ['left', 'right']) { put(f[side + 'Shoulder'], box(-.5, .5, -1, 0, -.5, .5)); put(f[side + 'Elbow'], box(-.5, .5, -.75, 0, -.5, .5)); put(f[side + 'Wrist'], box(-.5, .5, -.25, 0, -.5, .5));
    put(f[side + 'Hip'], box(-.49, .49, -1, 0, -.5, .5)); put(f[side + 'Knee'], box(-.49, .49, -.73, .45, -.5, .5)); lo = Math.min(lo, ...f[side + 'FootCorners'].map(q => q[1])); }
  return lo;
}
// Ankle position + world foot rotation for a foot target (pitch rolls about the toe edge if > 0, the heel edge if < 0).
export function footAnkle(ft) {
  const Fw = mm(Ry(ft.yaw * D), Rx(ft.pitch * D)), e = ft.pitch >= 0 ? SEGL.footZ : -SEGL.footZ, edge = add([ft.x, ft.y, ft.z], mv(Ry(ft.yaw * D), [0, 0, e]));
  return {p: sub3(edge, mv(Fw, [0, -SEGL.foot, e])), R: Fw};
}
// Analytic 2-bone leg IK in the root frame: {hip [x, 0, z], knee [k, 0, 0], ankle [..], reach} for an ankle target.
export function legIK(s, side, target, build = 'adult_m') {
  const L = layout6(build), R0 = rootR(s.root), sx = side === 'left' ? -1 : 1, hip = add(rootPos(s), mv(R0, [sx * L.hipX, 2, 0])), v = mv(tr(R0), sub3(target.p, hip));
  const L1 = SEGL.thigh, L2 = SEGL.shin, r = Math.hypot(...v), rMin = Math.sqrt(L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(148 * D)), rr = Math.max(rMin, Math.min(r, (L1 + L2) * (1 - 1e-9)));   // a target nearer than a 148° fold (a swing heel kick) stops at the fold
  const k = Math.acos(Math.max(-1, Math.min(1, (rr * rr - L1 * L1 - L2 * L2) / (2 * L1 * L2)))), M = L1 + L2 * Math.cos(k), az = -L2 * Math.sin(k);
  const g = Math.asin(Math.max(-1, Math.min(1, v[0] / M))), th0 = Math.atan2(v[2], v[1]) - Math.atan2(az, -Math.cos(g) * M), th = Math.atan2(Math.sin(th0), Math.cos(th0));   // wrapped to (−π, π]
  const Rleg = mm(mm(R0, mm(Rx(th), Rz(g))), Rx(k)), ank = toEuler(mm(tr(Rleg), target.R));
  return {hip: [th, 0, g], knee: [k, 0, 0], ankle: ank, reach: r - rr};
}
const rad = v => v * D;
// Channels → a v6 sample {pivots, root} (radians); `raw` = before LIMITS6, `clamped` = after. ik blends IK and FK legs.
export function solve(ch, build = 'adult_m', {groundClamp = false} = {}) {
  // the rig's FK joints (waist, elbows, wrists; knees/ankles when ik < 1) pass through LIMITS6 first: intensity, drift, impacts
  // and overshoot stop at a joint's stop; `raw` then shows what the IK legs (knees, ankles) ask for before the final clamp
  const piv = {}; for (const j of JOINTS) piv[j] = AX.map(a => rad(clampCh(`${j}.${a}`, ch[`${j}.${a}`] ?? 0)));
  const lean = rad(ch['root.lean']), roll = rad(ch['root.roll']), yaw = rad(ch['root.yaw']), c = [0, ch['root.cy'], ch['root.cz']], R0 = rootR({lean, roll, yaw});
  const P = add([ch['root.dx'], ch['root.dy'], ch['root.dz']], sub3(c, mv(R0, c))), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const s = {pivots: piv, root: {dx: P[0] * cy - P[2] * sy, dy: P[1], dz: P[0] * sy + P[2] * cy, lean, roll, yaw}};   // root dx/dz are in the actor's yawed frame (applyPoseSample)
  const ik = clamp01(ch.ik ?? 1), reach = {}, rolled = {};
  if (ik > 0) for (const side of ['left', 'right']) {
    // foot roll: when the ankle would pass ±35°, the foot pitches onto its toe edge (heel rise) or heel edge (toe lift) just
    // enough to stay inside the limit — the edge in contact does not move (a real foot's roll, never a slide)
    const f = side === 'left' ? 'lf' : 'rf', ft = {x: ch[f + '.x'], y: ch[f + '.y'], z: ch[f + '.z'], yaw: ch[f + '.yaw'], pitch: ch[f + '.pitch']}, lim = 35 - ROLL_MARGIN;
    let sol = legIK(s, side, footAnkle(ft), build);
    for (let it = 0; it < 16; it++) { const ax = sol.ankle[0] / D; if (ax >= -lim && ax <= lim) break; ft.pitch += ax < -lim ? -lim - ax : lim - ax; sol = legIK(s, side, footAnkle(ft), build); }
    reach[side] = sol.reach; rolled[side] = ft.pitch - ch[f + '.pitch'];
    for (const [j, val] of [['Hip', sol.hip], ['Knee', sol.knee], ['Ankle', sol.ankle]]) piv[side + j] = piv[side + j].map((x, i) => x + ik * (val[i] - x));
  }
  if (groundClamp && ik < 1) { const lo = lowestBody(s, build); if (lo < 0) s.root.dy -= lo * (1 - ik); }
  const raw = {pivots: Object.fromEntries(Object.entries(piv).map(([k, v]) => [k, [...v]])), root: {...s.root}};
  for (const j of JOINTS6) { const Lm = LIMITS6[jointKind(j)]; piv[j] = piv[j].map((x, i) => Math.min(Lm[i][1], Math.max(Lm[i][0], x))); }
  s.squash = ch['torso.sq'] ?? 0; return {sample: s, raw, reach, rolled};
}

// Arm IK on a channel pose: the `side` hand centre on `target` (origin frame, unscaled), the elbow opening toward `pole` (chest frame).
// Uses the pose's own root / waist, so call it after those channels are set. → a copy of ch with that arm's shoulder and elbow set.
export function reachPose(ch, side, target, pole, build = 'adult_m') {
  const w = fk(solve(ch, build).sample, build).waist, r = armIK(side, mv(tr(w.R), sub3(target, w.p)), pole, build), o = {...ch};
  r.shoulder.forEach((q, i) => { o[`${side}Shoulder.${AX[i]}`] = q; }); o[`${side}Elbow.x`] = r.elbow; return o;
}
// The hand centre of a channel pose (origin frame, unscaled).
export const handCentre = (ch, side, build = 'adult_m') => fk(solve(ch, build).sample, build)[side + 'Hand'].p;
// ---- standalone verb sampling (sheets, gates, tests) ------------------------------------------------------------------
// The verb alone from rest: t = verb-local seconds (0 = start; timing(v).key = the KEY).
export function sampleVerb(name, t, {intensity = 1, facing = 0, seed = 1, build = 'adult_m', from = REST} = {}) {
  const v = VERBS[name], poses = versePoses(name, {from, intensity, facing});
  const ch = v.gesture ? addDelta(from, verbChannels(name, t, poses, seed)) : verbChannels(name, t, poses, seed);
  return {...solve(ch, build, {groundClamp: !!v.fall || !!v.air}), ch};
}
const addDelta = (base, g) => { const o = {...base}; for (const c of CHANNELS) if (!isFoot(c) && c !== 'ik' && c !== 'torso.sq' && !c.startsWith('root.c')) o[c] = (base[c] ?? REST[c]) + (g[c] - REST[c]); return o; };

// ---- cycles: walk, sad_walk, sneak, run, sprint (planted-foot IK at CYCLE speed) + skid_stop ---------------------------
// speed v (studs/s, the mark's travel speed), period T, stance fraction b, lift h, pitch swing, arm swing, elbows, lean, bob.
export const CYCLES = {
  walk: {v: 1.7, T: 1.0, b: .6, h: .24, pitch: 18, arm: 24, elb: [16, 14], lean: 4, waist: 3, head: -2, yaw: 3, bob: .03, roll: 1.5},
  sad_walk: {v: .95, T: 1.3, b: .66, h: .16, pitch: 8, arm: 7, elb: [8, 4], lean: 8, waist: 12, head: 24, yaw: 1.5, bob: .03, roll: 2.5, slump: true},
  sneak: {v: 1.1, T: 1.4, b: .7, h: .42, pitch: 24, arm: 10, elb: [86, 8], lean: 14, waist: 10, head: -6, yaw: 4, bob: .04, roll: 1, crouch: .42, sneak: true},
  run: {v: 5.0, T: .6, b: .38, h: .62, pitch: 26, arm: 48, elb: [90, 10], lean: 10, waist: 6, head: -6, yaw: 5, bob: .16, roll: 1, crouch: .2, flight: .1},
  sprint: {v: 8.0, T: .5, b: .32, h: .78, pitch: 30, arm: 70, elb: [90, 0], lean: 22, waist: 8, head: -14, yaw: 6, bob: .18, roll: 0, crouch: .22, flight: .12},
};
export const CYCLE_NAMES = ['walk', 'sad_walk', 'sneak', 'run', 'sprint', 'skid_stop'];
const frac = x => x - Math.floor(x);
// Foot target of one leg at time t in the travelling frame (root moves at v): planted contacts, minimum-jerk swing with lift.
export function cycleFoot(c, t, side) {
  const ph = side === 'left' ? 0 : .5, q = t / c.T - ph, n = Math.floor(q), p = q - n, S = c.v * c.T, x = (side === 'left' ? -1 : 1) * HIPX;
  const hipZ = c.hipZ ?? 0, plant = k => S * (k + ph + c.b / 2) + hipZ;
  if (p < c.b) return {x, y: 0, z: plant(n), yaw: 0, pitch: 0, contact: true};
  const u = (p - c.b) / (1 - c.b), z = plant(n) + (plant(n + 1) - plant(n)) * minJerk(u);
  return {x, y: c.h * Math.sin(Math.PI * u) ** (c.flight ? .8 : 1), z, yaw: 0, pitch: c.pitch * Math.sin(2 * Math.PI * u), contact: false, u};
}
// Highest root dy that keeps both feet reachable (a soft-min with the designed bob).
function reachDy(ch, feet, build) {
  const L = layout6(build), lean = rad(ch['root.lean']), R0 = rootR({lean, roll: rad(ch['root.roll']), yaw: rad(ch['root.yaw'])}), c = [0, ch['root.cy'], 0];
  const base = add([ch['root.dx'], 0, ch['root.dz']], sub3(c, mv(R0, c))); let m = Infinity;
  for (const [side, ft] of feet) { const a = footAnkle(ft).p, hip = add(base, mv(R0, [(side === 'left' ? -1 : 1) * L.hipX, 2, 0])), dxz = Math.hypot(a[0] - hip[0], a[2] - hip[2]), Lm = (SEGL.thigh + SEGL.shin) * .998;
    m = Math.min(m, a[1] - hip[1] + Math.sqrt(Math.max(0, Lm * Lm - dxz * dxz))); }
  return m;
}
const softMin = (a, b, k = .012) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));
// Channels of a cycle at t; travel: true keeps the root's forward travel (v·t), else in place (the episode's mark travels).
export function cycleChannels(name, t, {travel = false, build = 'adult_m', intensity = 1} = {}) {
  if (name === 'skid_stop') return skidChannels(t, {build, intensity});
  const c = {...CYCLES[name]}, I = Math.min(1.5, Math.max(.5, intensity)), ch = {...REST}, zt = c.v * t;
  c.hipZ = 0;
  const pl = frac(t / c.T), pr = frac(t / c.T - .5), wave = (p, k = 1) => Math.cos(2 * Math.PI * p * k);
  ch['root.lean'] = c.lean; ch['root.dz'] = zt; ch['root.yaw'] = c.yaw * I * Math.sin(2 * Math.PI * pl); ch['waist.z'] = c.roll * Math.sin(2 * Math.PI * (pl - c.b / 2));   // the sway lives in the chest: a rolled pelvis would drop the stance hip and fold the planted knee
  ch['waist.x'] = c.waist * (c.slump ? 1 : .5); ch['waist.y'] = -c.yaw * 1.6 * I * Math.sin(2 * Math.PI * pl);
  ch['head.x'] = c.head + (c.slump ? 3 * Math.sin(4 * Math.PI * pl) : 0); ch['head.y'] = c.yaw * 1.2 * I * Math.sin(2 * Math.PI * pl);
  for (const [side, opp] of [['left', pr], ['right', pl]]) {   // each arm swings with the opposite leg: forward at its heel strike
    const fwd = wave(opp), sx = side === 'left' ? -1 : 1;
    ch[side + 'Shoulder.x'] = -c.arm * I * fwd + (c.sneak ? -38 : c.slump ? 6 : 0); ch[side + 'Shoulder.z'] = sx * (c.sneak ? 14 : 5);
    ch[side + 'Elbow.x'] = -(c.elb[0] + c.elb[1] * I * Math.max(0, fwd));
    ch[side + 'Wrist.x'] = c.sneak ? 26 : -4 * Math.sin(2 * Math.PI * opp);
  }
  const feet = [['left', cycleFoot(c, t, 'left')], ['right', cycleFoot(c, t, 'right')]];
  for (const [side, ft] of feet) { const f = side === 'left' ? 'lf' : 'rf'; for (const k of FOOTK) ch[`${f}.${k}`] = ft[k]; }
  const design = -(c.crouch ?? 0) - c.bob * I * (1 + wave(pl - c.b / 2, 2)) / 2 + (c.flight ? c.bob * 1.4 * Math.max(0, -wave(pl - c.b / 2, 2)) : 0);
  ch['root.dy'] = softMin(design, reachDy(ch, feet, build) - .004);
  if (!travel) { ch['root.dz'] -= zt; ch['lf.z'] -= zt; ch['rf.z'] -= zt; }
  return ch;
}
// skid_stop: arriving at run speed, both feet plant ahead and SKID (an intended slide, flagged), the body leans back with arms
// flung out, then the stop overshoots forward and settles. Travels its own stop distance (root dz included).
export const SKID = {v0: 5.0, slide: .5, stopAt: .55, end: 1.5};
function skidChannels(t, {build, intensity}) {
  const I = Math.min(1.5, Math.max(.5, intensity)), {v0, slide, stopAt} = SKID, ch = {...REST};
  const z = t < stopAt ? v0 * t - v0 * t * t / (2 * stopAt) : v0 * stopAt / 2, zs = v0 * stopAt / 2;   // uniform deceleration to 0 at stopAt
  const tk = stopAt, T = {ant: .12, W: .55};   // anticipation: the last run step (lean forward) before the plant
  const e = overshootEase(clamp01((t - T.ant) / T.W)), a = smooth(t / T.ant);
  const lean = 10 * a * (1 - Math.min(1, e)) + (-18 * I) * Math.min(1, e) + 18 * I * smooth((t - tk) / .5) + (t > tk ? 6 * I * Math.sin(Math.PI * clamp01((t - tk) / .5)) : 0);
  ch['root.lean'] = lean; ch['root.dz'] = z; ch['root.dy'] = -.32 * Math.min(1, e) * (1 - smooth((t - tk) / .6));
  const fl = Math.min(1, e) * (1 - smooth((t - tk - .1) / .6));
  ch['leftShoulder.x'] = 40 * fl - 10 * a; ch['rightShoulder.x'] = 30 * fl - 10 * a; ch['leftShoulder.z'] = -3 - 70 * I * fl; ch['rightShoulder.z'] = 3 + 76 * I * fl;
  ch['leftElbow.x'] = -20 - 40 * (1 - fl) * a * (1 - Math.min(1, e)); ch['rightElbow.x'] = -18; ch['head.x'] = -12 * fl; ch['waist.x'] = -10 * fl + 4 * a * (1 - Math.min(1, e));
  ch['head.y'] = 6 * fl * Math.sin(8 * t);
  const lead = .55 * Math.min(1, e);   // the right foot plants ahead, the left a step behind it; both skid with the body until the stop
  const fz = Math.min(z, zs), st = smooth((t - tk - .05) / .35);
  ch['rf.z'] = fz + lead; ch['lf.z'] = fz - .15 + (lead + .15) * st; ch['lf.y'] = .3 * Math.sin(Math.PI * st); ch['rf.pitch'] = -6 * Math.min(1, e) * (1 - smooth((t - tk) / .3));
  ch['root.dz'] += lead * smooth((t - tk) / .5);   // the hips come over the planted feet
  ch['root.dy'] = Math.min(ch['root.dy'], reachDy(ch, [['left', {x: -HIPX, y: 0, z: ch['lf.z'], yaw: 0, pitch: 0}], ['right', {x: HIPX, y: 0, z: ch['rf.z'], yaw: 0, pitch: ch['rf.pitch']}]], build) - .015);
  if (t > tk) { const d = drift(t, 3, smooth((t - tk - .3) / .5)); for (const [k, x] of Object.entries(d)) ch[k] += x; }
  ch.skid = t < tk + .02 ? 1 : 0;
  return ch;
}
export function sampleCycle(name, t, o = {}) { const ch = cycleChannels(name, t, o); return {...solve(ch, o.build), ch}; }

// ---- comedy: tumble — a procedural roll along +z with 2 bounces and a limp settle (deterministic in t) ----------------
export const TUMBLE = {speed: 4.2, rolls: 1.5, bounce: [.9, .45], dur: 1.9, settle: .7};
export function tumbleChannels(t, {intensity = 1} = {}) {
  const I = Math.min(1.5, Math.max(.5, intensity)), {speed, rolls, bounce, dur} = TUMBLE, ch = {...REST, ik: 0, 'root.cy': 2.4, 'root.cz': 0};
  const antT = .3, ant = smooth(t / antT), u = clamp01((t - antT) / (dur - antT)), decel = u * (2 - u);   // the roll slows down
  const spin = 360 * rolls * decel + 90 * smooth((t - dur + .1) / .5);   // ends face down (+90)
  ch['root.lean'] = -10 * ant * (1 - smooth((t - antT) / .1)) + (t > antT ? spin : 0);   // anticipation: a small rear-back before the pitch forward
  ch['root.dz'] = speed * (dur - antT) * decel * .5 * I;
  const hop = (a, b, h) => t > a && t < b ? h * 4 * ((t - a) / (b - a)) * (1 - (t - a) / (b - a)) : 0, span = dur - antT;
  ch['root.dy'] = .2 + hop(antT + span * .25, antT + span * .55, bounce[0] * I) + hop(antT + span * .55, antT + span * .78, bounce[1] * I);
  const curl = (1 - smooth((t - dur + .25) / .4)) * smooth((t - antT) / .15);   // tucked while rolling, limp after
  ch['leftHip.x'] = -95 * curl - 8; ch['rightHip.x'] = -88 * curl + 6; ch['leftKnee.x'] = 120 * curl + 10; ch['rightKnee.x'] = 112 * curl + 22;
  ch['leftShoulder.x'] = -100 * curl - 150 * (1 - curl); ch['rightShoulder.x'] = -110 * curl - 30 * (1 - curl); ch['leftShoulder.z'] = -20 - 25 * (1 - curl); ch['rightShoulder.z'] = 20 + 50 * (1 - curl);
  ch['leftElbow.x'] = -110 * curl - 10; ch['rightElbow.x'] = -100 * curl - 30 * (1 - curl); ch['head.x'] = 30 * curl - 20 * (1 - curl); ch['waist.x'] = 25 * curl;
  const lim = t - dur; if (lim > 0) { const j = Math.exp(-lim / .25) * Math.sin(2 * Math.PI * 3 * lim); ch['rightKnee.x'] += 20 * j; ch['rightShoulder.x'] += 14 * j; ch['head.y'] = 20 * smooth(lim / .3); }
  return ch;
}
export function sampleTumble(t, o = {}) { const ch = tumbleChannels(t, o); return {...solve(ch, o.build, {groundClamp: true}), ch}; }

// ---- words: cues.json timing, stress ---------------------------------------------------------------------------------
const norm = w => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
// {word, nth (1-based, default 1), line?} → the word's start time (s); throws when the word is not in the cues.
export function wordTime(cues, ref) {
  const want = norm(ref.word), nth = ref.nth ?? 1; let k = 0;
  for (const ln of cues.lines) { if (ref.line && ln.line !== ref.line) continue; for (const w of ln.words) if (norm(w.w) === want && ++k === nth) return w.start; }
  throw Error(`acting6: word "${ref.word}" #${nth} not in cues`);
}
// Stressed words of a line: the Brief's marks, else the loudest word by mean envelope RMS (env: {fps, rms}).
export function stressedWords(line, {marks = null, env = null} = {}) {
  if (marks?.length) { const m = new Set(marks.map(norm)); return line.words.filter(w => m.has(norm(w.w))); }
  if (!env) return [line.words.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a))];   // no envelope: the longest word
  const loud = w => { const a = Math.floor(w.start * env.fps), b = Math.max(a + 1, Math.ceil(w.end * env.fps)); let s = 0; for (let i = a; i < b; i++) s += env.rms[i] ?? 0; return s / (b - a); };
  return [line.words.reduce((a, b) => (loud(b) > loud(a) ? b : a))];
}
export const resolveAt = (at, cues) => typeof at === 'number' ? at : wordTime(cues, at);

// ---- tracks ------------------------------------------------------------------------------------------------------------
// actions: [{actor, verb | cycle | face | gesture, at, intensity, target, facing, hold}], ctx {cues, env, talk: [{actor, line, gesture, stress}], shotStart}
// → {actorName: track}. A track: {items (verbs, KEY times), gestures, faces [[t, face]], props, partners}.
// verb variants by partner scale (action.partnerScale = her scale / his): hug .62 / .82 / 1.0 poses; carry → piggyback (kid) or hip-carry (small kid); carry with a prop and no partner → carry_box
export const pickVerb = a => { const kp = a.partnerScale; let n = a.verb;
  if (n === 'hug' && kp !== undefined) n = kp < .72 ? 'hug_s' : kp > .9 ? 'hug_l' : 'hug';
  if (n === 'carry') n = !a.target ? 'carry_box' : kp !== undefined && kp < .72 ? 'carry_hip' : 'carry';
  return n; };
export function compileActing(actions, {cues = null, env = null, talk = [], offset = 0} = {}) {
  const tracks = {}, T = n => (tracks[n] ??= {items: [], gestures: [], faces: [], props: [], cycles: []});
  for (const a of actions) {
    const t = resolveAt(a.at ?? 0, cues) + (typeof a.at === 'number' ? offset : 0);
    if (a.face) T(a.actor).faces.push([t, a.face]);
    if (a.cycle) T(a.actor).cycles.push({name: a.cycle, start: t, until: a.until ?? Infinity});
    if (a.verb === 'tumble') T(a.actor).items.push({verb: 'tumble', key: t, start: t - .3, intensity: a.intensity ?? 1});
    else if (a.verb && GESTURES.includes(a.verb)) T(a.actor).gestures.push({verb: a.verb, key: t, intensity: a.intensity ?? 1, facing: a.facing ?? 0});
    else if (a.verb) {
      const vn = pickVerb(a), v = VERBS[vn]; if (!v) throw Error('acting6: unknown verb ' + a.verb);
      const tm = timing(v), it = {verb: vn, key: t, start: t - tm.key, intensity: a.intensity ?? 1, facing: a.facing ?? 0, hold: a.hold ?? null, target: a.target ?? null};
      T(a.actor).items.push(it);
      if (a.hold) T(a.actor).props.push({id: a.hold, verb: vn, mode: v.prop ?? 'attach', key: t, item: it});
      if (v.two && a.target) T(a.target).items.push({verb: v.two.partner ?? a.verb, key: t, start: t - timing(VERBS[v.two.partner]).key, intensity: a.intensity ?? 1, facing: -(a.facing ?? 0), partnerOf: a.actor, two: v.two, walkIn: a.walkIn !== false});
    }
  }
  for (const k of talk) {   // talk gestures on the stressed words of the actor's lines
    const ln = cues?.lines.find(l => l.line === k.line); if (!ln) continue;
    const list = stressedWords(ln, {marks: k.stress, env}), g = k.gesture ?? GESTURES[(k.line - 1) % GESTURES.length];
    for (const w of list) T(k.actor).gestures.push({verb: g, key: w.start, intensity: k.intensity ?? 1, facing: k.facing ?? 0, word: w.w});
  }
  for (const tr of Object.values(tracks)) { tr.items.sort((a, b) => a.start - b.start); tr.faces.sort((a, b) => a[0] - b[0]); tr.memo = new Map(); }
  return tracks;
}
// Channels of a track at t (absolute seconds). Verbs chain: each starts from the pose the previous one left (sampled at its
// start), travel offsets accumulate. Cycles run while active. Gestures add on top.
export function trackChannels(tr, t, {seed = 1, build = 'adult_m'} = {}) {
  let i = -1; for (let k = 0; k < tr.items.length; k++) if (tr.items[k].start <= t) i = k;
  let ch = i < 0 ? idleChannels(t, seed) : itemChannels(tr, i, t, seed, build);
  const cy = tr.cycles.find(c => t >= c.start && t < c.until && (i < 0 || tr.items[i].start < c.start));
  if (cy) { const w = smooth((t - cy.start) / .15), c2 = cycleChannels(cy.name, t - cy.start, {build}); ch = w >= 1 ? c2 : mix(ch, c2, w); }   // blends in over 0.15 s
  for (const g of tr.gestures) { const v = VERBS[g.verb], tm = timing(v), lt = t - (g.key - tm.key); if (lt <= 0 || lt > tm.end + .05) continue;
    const gc = verbChannels(g.verb, lt, versePoses(g.verb, {intensity: g.intensity, facing: g.facing}), seed); ch = addDelta(ch, gc); }
  return ch;
}
// ---- idle life (P3b owner Decision 1): subtle, feet locked ------------------------------------------------------------------
// A weight shift every 3–5 s (the hips travel 2 × LIFE.shift studs side to side, the chest counter-tilts) and a head turn of 7.5–10.5° every
// 3–5 s (held ~1.2 s, then back; the moving-hold drift adds ≤ 1.5° on top). Pure in (seed, t): event times are cumulative seeded gaps.
export const BREATH = {amp: .015, period: 3.5};
export const breath = (t, seed = 1) => -BREATH.amp * (.5 + .5 * Math.sin(2 * Math.PI * (t / BREATH.period + seedR(seed, 11))));   // torso.sq < 0 = the chest rises (squash: y grows, x shrinks by half)
export const LIFE = {shift: .05, gap: [3.1, 4.8], turn: [7.5, 10.5], moveT: .7, holdT: 1.2};
const lifeTimes = (seed, kind, until) => { const out = []; let t = .6 + 2 * seedR(seed, kind * 31 + 5); for (let k = 0; t < until + 6; k++) { out.push(t); t += LIFE.gap[0] + (LIFE.gap[1] - LIFE.gap[0]) * seedR(seed, kind * 31 + 7 + k * 3); } return out; };
export function idleLife(t, seed = 1) {
  const o = {}, ts = lifeTimes(seed, 1, t), par = seedR(seed, 3) < .5 ? 0 : 1, sd = k => (((k + par) % 2) + 2) % 2 === 0 ? 1 : -1, S = LIFE.shift;
  let k = -1; while (k + 1 < ts.length && ts[k + 1] <= t) k++;
  const dx = k < 0 ? sd(-1) * S : sd(k - 1) * S + (sd(k) * S - sd(k - 1) * S) * overshootEase((t - ts[k]) / LIFE.moveT);
  o['torso.sq'] = breath(t, seed);   // P3c: 1.5 % chest rise and fall, 3.5 s cycle
  o['root.dx'] = dx; o['root.roll'] = -dx / S * 1.6; o['waist.z'] = dx / S * 1.0;   // the pelvis shifts over the planted feet, the chest tilts back toward vertical
  const hs = lifeTimes(seed, 2, t); let j = -1; while (j + 1 < hs.length && hs[j + 1] <= t) j++;
  if (j >= 0) { const m = (LIFE.turn[0] + (LIFE.turn[1] - LIFE.turn[0]) * seedR(seed, 100 + j)) * (j % 2 ? 1 : -1), d = t - hs[j], e = smooth(d / .5) * (1 - smooth((d - .5 - LIFE.holdT) / .6)); o['head.y'] = m * e; o['waist.y'] = .3 * m * e; }
  return o;
}
const idleChannels = (t, seed) => { const o = {...REST}; for (const [c, x] of Object.entries(drift(t, seed))) o[c] += x; for (const [c, x] of Object.entries(idleLife(t, seed))) o[c] += x; return o; };
// ---- partners (P3b owner Decision 3) -----------------------------------------------------------------------------------------
// A partner of hug / carry / comfort_kneel must START (at the verb's anticipation) within PARTNER_TOL studs of its meeting mark. A Brief that
// places it further away gets a walk-in (walk cycle at CYCLES.walk.v) ending exactly at the verb start; the plan FAILS only when no walk-in fits
// (not enough time before the verb) or walk-ins are off (`walkIn: false`).
export const PARTNER_TOL = .5;
// → {mark [x, z], yaw (rad, partner facing), dist, ok, walk: null | {dur, t0, from, to}, issue}. leadPos/partnerPos: world [x, z] of the origins; avail: s before `start` the partner is free.
export function partnerPlan({verb, leadPos, leadYaw = 0, leadScale = 1, partnerPos, start, avail = Infinity, walkIn = true, facing = 0}) {
  const off = partnerOffset(verb, {facing}); if (!off) return null;
  const c = Math.cos(leadYaw), sn = Math.sin(leadYaw), mark = [leadPos[0] + leadScale * (off.x * c + off.z * sn), leadPos[1] + leadScale * (-off.x * sn + off.z * c)], yaw = leadYaw + off.yaw * D;
  const dist = Math.hypot(mark[0] - partnerPos[0], mark[1] - partnerPos[1]), dur = dist / CYCLES.walk.v;
  if (dist <= PARTNER_TOL) return {mark, yaw, dist: +dist.toFixed(3), ok: true, walk: null, issue: null};
  if (walkIn && avail >= dur) return {mark, yaw, dist: +dist.toFixed(3), ok: true, walk: {dur: +dur.toFixed(3), t0: +(start - dur).toFixed(3), from: partnerPos, to: mark}, issue: null};
  return {mark, yaw, dist: +dist.toFixed(3), ok: false, walk: null, issue: `partner starts ${dist.toFixed(2)} studs from its mark (> ${PARTNER_TOL})` + (walkIn ? `; a walk-in needs ${dur.toFixed(2)} s, ${Number.isFinite(avail) ? avail.toFixed(2) : '∞'} s available` : ' and walk-ins are off')};
}
// P3c hug staging: the camera must be 25–60° off the line between the two torsos (so both arms show). Angle between the camera's horizontal view direction and that line (0–90°).
export const HUG_ANGLE = [25, 60];
export function hugAngle({camPos, leadPos, partnerPos}) {
  const m = [(leadPos[0] + partnerPos[0]) / 2, (leadPos[1] + partnerPos[1]) / 2], v = [m[0] - camPos[0], m[1] - camPos[1]], l = [partnerPos[0] - leadPos[0], partnerPos[1] - leadPos[1]];
  return Math.acos(Math.min(1, Math.abs(v[0] * l[0] + v[1] * l[1]) / (Math.hypot(...v) * Math.hypot(...l) || 1))) * 180 / Math.PI;
}
export const hugAngleIssues = plans => plans.filter(p => p.cam).map(p => ({p, a: hugAngle(p.cam)})).filter(x => x.a < HUG_ANGLE[0] || x.a > HUG_ANGLE[1])
  .map(x => `hugAngle: ${x.p.lead} hugs ${x.p.partner} at ${x.p.key.toFixed(2)} s: camera is ${x.a.toFixed(0)}° off the torso line (want ${HUG_ANGLE[0]}–${HUG_ANGLE[1]}°; shoot a three-quarter view of the lead's side or back)`);
// plan.js: the FAIL lines for a list of partner plans (episode.js `actingPlan()`): [{partner, lead, verb, key, ...partnerPlan result}]
export const partnerIssues = plans => plans.filter(p => !p.ok).map(p => `partnerDistance: ${p.partner} (${p.verb} with ${p.lead} at ${(p.key ?? 0).toFixed(2)} s): ${p.issue}`);
function itemChannels(tr, i, t, seed, build) {
  const it = tr.items[i], lt = t - it.start;
  if (it.verb === 'tumble') { const off = offsetBefore(tr, i, seed, build); return shift(tumbleChannels(lt, {intensity: it.intensity}), off); }
  const poses = itemPoses(tr, i, seed, build);
  return verbChannels(it.verb, lt, poses, seed);
}
function offsetBefore(tr, i, seed, build) { let o = {dx: 0, dz: 0, yaw: 0}; for (let k = 0; k < i; k++) { const e = VERBS[tr.items[k].verb]?.exit; if (e) o = {dx: o.dx + (e.dx ?? 0), dz: o.dz + (e.dz ?? 0), yaw: o.yaw + (e.yaw ?? 0)}; } return o; }
function itemPoses(tr, i, seed, build) {
  if (tr.memo.has(i)) return tr.memo.get(i);
  const it = tr.items[i], cy = tr.cycles.find(c => c.start < it.start && c.until >= it.start && (i === 0 || tr.items[i - 1].start < c.start));
  const from = cy ? cycleChannels(cy.name, it.start - cy.start, {build}) : i === 0 ? idleChannels(it.start, seed) : itemChannels(tr, i - 1, it.start, seed, build);
  const off = offsetBefore(tr, i, seed, build), p = versePoses(it.verb, {from, intensity: it.intensity, facing: it.facing, offset: off.dx || off.dz || off.yaw ? off : null});
  tr.memo.set(i, p); return p;
}
// Face at t (step keys), and the face-change times (faces6 pop + blink land on them: actors.js faceLife).
export const faceAt = (tr, t, fallback = null) => { let f = fallback; for (const [t0, n] of tr.faces) if (t >= t0) f = n; return f; };
// The full sample of a track at t: {sample, raw, ch, props: {id: {pos, R} | null}}.
export function sampleActing(tr, t, {seed = 1, build = 'adult_m'} = {}) {
  const ch = trackChannels(tr, t, {seed, build}), item = tr.items.findLast(x => x.start <= t), v = item ? VERBS[item.verb] : null;
  const out = {...solve(ch, build, {groundClamp: item?.verb === 'tumble' || !!v?.fall || !!v?.air}), ch};
  out.props = actingProps(tr, t, out.sample, {seed, build});
  return out;
}
// Props of a track at t for a body sample. `hand` (opt-in, R6 rig): (sample, side) → {p, R}, `sampleAt` (tt) → that rig's sample; default = the R15 hands.
export function actingProps(tr, t, sample, {seed = 1, build = 'adult_m', hand = null, sampleAt = null} = {}) {
  const H = hand ? {now: side => hand(sample, side), at: (tt, side) => hand(sampleAt(tt), side)} : null, out = {};
  for (const pr of tr.props) out[pr.id] = propAt(tr, pr, t, sample, {seed, build, H});
  return out;
}
// Props: attach (grab, catch: in the hand from the key; catch flies in on a ballistic arc before it), release (throw: in the
// hand until the key, then ballistic from the hand's release velocity), carry (between both hands). Origin-frame positions.
export const GRAV = -34, PROP_R = .32;
export function handAt(sample, side, build = 'adult_m') {
  const f = fk(sample, build);
  if (side === 'both') { const a = f.leftHand, b = f.rightHand; return {p: a.p.map((x, i) => (x + b.p[i]) / 2), R: f.waist.R}; }
  const h = f[side + 'Hand']; return {p: add(h.p, mv(h.R, [0, -.12 - PROP_R * .5, .2])), R: h.R};
}
function propAt(tr, pr, t, sample, {seed, build, H = null}) {
  const side = pr.mode === 'carry' ? 'both' : (pr.item.facing < 0 ? 'left' : 'right');
  const handT = H ? tt => H.at(tt, side) : tt => handAt(solve(trackChannels(tr, tt, {seed, build}), build).sample, side, build), handNow = sd => H ? H.now(sd) : handAt(sample, sd, build);
  if (pr.mode === 'carry') { const h = handNow('both'); return {p: add(h.p, mv(h.R, [0, .05, .62])), R: h.R, held: true}; }
  if (pr.mode === 'release') {
    if (t <= pr.key) return {...handNow(side), held: true};
    const a = handT(pr.key), b = handT(pr.key - 1 / FPS6), v = sub3(a.p, b.p).map(x => x * FPS6 * 1.25), d = t - pr.key;
    const p = add(a.p, [v[0] * d, v[1] * d + .5 * GRAV * d * d, v[2] * d]); p[1] = Math.max(PROP_R, p[1]); return {p, R: a.R, held: false};
  }
  if (t >= pr.key) return {...handNow(side), held: true};
  const k = handT(pr.key), d = t - pr.key, vin = pr.item.verb === 'catch' ? [0, 5.5, -7] : [0, 0, 0];
  if (pr.item.verb !== 'catch') { const p = handT(pr.item.start).p; return {p: [p[0], PROP_R, p[2] + .9], R: k.R, held: false}; }   // grab: waiting on the ground ahead
  return {p: add(k.p, [vin[0] * d, vin[1] * d + .5 * GRAV * d * d, vin[2] * d]), R: k.R, held: false};
}
// Two-actor verbs: the partner's origin relative to the lead's origin frame ([x, z, yaw°]) — hug: facing at a set distance;
// comfort_kneel: placed so the lead's reaching hand rests on the partner's near shoulder at the key.
export function partnerOffset(verb, {facing = 0} = {}) {
  const v = VERBS[verb]; if (!v?.two) return null;
  let x, z, yaw;
  if (v.two.follow) { const o = carryOrigin(sampleVerb(verb, timing(v).key).sample, 'adult_m', verb); [x, z, yaw] = [o.p[0], o.p[2], o.yaw]; }   // the ground mark under the carried pose
  else [x, z, yaw] = v.two.offset ?? v.two.place;
  return facing < 0 ? {x: -x, z, yaw: -yaw} : {x, z, yaw};
}
// comfort_kneel (one call aligns both): the lead's reaching hand is solved (armIK) onto the partner's near shoulder top at the
// KEY, with the partner placed at two.place; `gap` = hand bottom above the shoulder top (gate: |gap| ≤ 0.05).
export function rigReach(verb) {
  const v = VERBS[verb], [x, z, yaw] = v.two.place, side = v.two.reach, pv = VERBS[v.two.partner];
  const b = fk(solve(pv.key).sample), sh = b[(side === 'right' ? 'left' : 'right') + 'Shoulder'].p, c = Math.cos(yaw * D), sn = Math.sin(yaw * D);
  const top = [sh[0] * c + sh[2] * sn + x, sh[1] + .02, -sh[0] * sn + sh[2] * c + z];   // partner shoulder top in the lead's origin frame
  for (const k of ['key', 'settle']) {
    const w = fk(solve(v[k]).sample).waist, tgt = add(top, [0, SEGL.hand / 2, 0]), loc = mv(tr(w.R), sub3(tgt, w.p)), r = armIK(side, loc, [side === 'right' ? -.6 : .6, -.3, 1]);
    r.shoulder.forEach((q, i) => { v[k][`${side}Shoulder.${AX[i]}`] = q; }); v[k][`${side}Elbow.x`] = r.elbow;
  }
  const hand = fk(solve(v.key).sample)[side + 'Hand'].p; return {gap: +(hand[1] - SEGL.hand / 2 - top[1]).toFixed(3), dist: +Math.hypot(hand[0] - top[0], hand[2] - top[2]).toFixed(3)};
}
export const REACH6 = {comfort_kneel: rigReach('comfort_kneel')};
// Carry with a partner (one call, both actors): where the carried actor's ORIGIN sits (lead's origin frame, lead units) for the lead's sample; kp = her scale / his.
// piggyback: her hip pivot is a fixed point of his chest frame; hip-carry: a fixed point on his +x side. → {p: [x, y, z], yaw (degrees)}
export const LEAD_OF = {carried: 'carry', carried_hip: 'carry_hip'};
export function carryOrigin(leadSample, build = 'adult_m', verb = 'carry', kp = null) {
  verb = LEAD_OF[verb] ?? verb; const c = CARRY[verb]; kp ??= c.kp;
  if (verb === 'carry_hip') return {p: [c.origin[0], c.origin[1] - 2 * kp, c.origin[2]], yaw: c.yaw};
  const W = fk(leadSample, build).waist, H = add(W.p, mv(W.R, c.chest)); return {p: [H[0], H[1] - 2 * kp, H[2]], yaw: 0};
}
// The partner's rise weight for a carry (0 on the ground → 1 on the lead): the lead's 8-frame rise, the partner starts 1 frame behind it (stagger).
export const carryW = (verb, t, start) => smooth((t - 1 / FPS6 - (start + timing(VERBS[LEAD_OF[verb] ?? verb]).ant)) / (RISE - 1 / FPS6));   // starts 1 frame after the lead and lands with him (a 7-frame rise): the arms never close on a partner still in the air
// ---- geometry: segment boxes and penetration (pure) --------------------------------------------------------------------------
// Every body segment as an oriented box in the actor's origin frame (unscaled): {n: name, c: centre, R: 3×3, h: half extents}.
const BOXES = [['lowerTorso', 'root', [0, 2.21, 0], [1, .19, .5]], ['torso', 'waist', [0, .81, 0], [1, .81, .5]], ['head', 'head', [0, .6, 0], [.6, .6, .6]]];
export function bodyBoxes(sample, build = 'adult_m') {
  const f = fk(sample, build), out = [], sq = 1 - (sample.squash ?? 0);
  const put = (n, fr, c, h) => out.push({n, c: add(f[fr].p, mv(f[fr].R, c)), R: f[fr].R, h});
  for (const [n, fr, c, h] of BOXES) put(n, fr, c, n === 'torso' || n === 'lowerTorso' ? [h[0], h[1] * sq, h[2] * sq] : h);
  for (const side of ['left', 'right']) {
    put(side + 'UpperArm', side + 'Shoulder', [0, -.5, 0], [.5, .5, .5]); put(side + 'Forearm', side + 'Elbow', [0, -.375, 0], [.5, .375, .5]); put(side + 'Hand', side + 'Wrist', [0, -.125, 0], [.5, .125, .5]);
    put(side + 'Thigh', side + 'Hip', [0, -.5, 0], [.49, .5, .5]); put(side + 'Shin', side + 'Knee', [0, -.365, 0], [.49, .365, .5]); put(side + 'Foot', side + 'Ankle', [0, -.135, 0], [.49, .135, .5]);
  }
  return out;
}
// A boxes list placed in the world: origin position, yaw (rad) and the actor's scale k.
export function placeBoxes(boxes, {at = [0, 0, 0], yaw = 0, k = 1} = {}) {
  const Y = Ry(yaw); return boxes.map(b => ({n: b.n, c: add(at, mv(Y, b.c).map(x => x * k)), R: mm(Y, b.R), h: b.h.map(x => x * k)}));
}
const GRID = [-1, 0, 1], PTS = GRID.flatMap(x => GRID.flatMap(y => GRID.map(z => [x, y, z])));
// Deepest interpenetration (studs) of the sample points of A's boxes (corners, edge and face midpoints, centre) inside B's boxes, and B's inside A's.
// `skip(nameA, nameB)` ignores pairs; a bounding-sphere test skips boxes that cannot touch.
export function penetration(A, B, {skip = () => false, margin = 0} = {}) {
  let worst = 0, who = null, sum = 0; const Rt = new Map(B.concat(A).map(q => [q, tr(q.R)])), rad = new Map(B.concat(A).map(q => [q, Math.hypot(...q.h)]));
  const test = (P, Q) => { for (const a of P) for (const q of Q) {
    if (skip(a.n, q.n) || Math.hypot(a.c[0] - q.c[0], a.c[1] - q.c[1], a.c[2] - q.c[2]) > rad.get(a) + rad.get(q)) continue; const T = Rt.get(q);
    for (const [x, y, z] of PTS) { const w = add(a.c, mv(a.R, [x * a.h[0], y * a.h[1], z * a.h[2]])), l = mv(T, sub3(w, q.c));
      const d = Math.min(q.h[0] - Math.abs(l[0]), q.h[1] - Math.abs(l[1]), q.h[2] - Math.abs(l[2])) - margin; if (d > 0) sum += d; if (d > worst) { worst = d; who = `${a.n}→${q.n}`; } } } };
  test(A, B); test(B, A); return {depth: +worst.toFixed(4), pair: who, sum: +sum.toFixed(3)};
}
// Face visibility (P3b): the fraction of the hero's front face (a 5 × 5 grid on the head's front quad) hidden from a camera looking along `camDir`
// (origin frame of the hero, unit vector toward the camera) by any body box except the head itself — the hero's own arms and a partner's body count —
// and the facing cosine (face normal · camDir). `others`: boxes already placed in the hero's origin frame (a partner: placeBoxes(..., {at, yaw, k})).
export function faceVisibility(sample, camDir, others = [], build = 'adult_m', {only = null} = {}) {   // only: a RegExp on box names (e.g. just the hand and forearm of the shading arm)
  const f = fk(sample, build), hd = f.head, boxes = bodyBoxes(sample, build).filter(b => b.n !== 'head').concat(others.filter(b => b.n !== 'head')).filter(b => !only || only.test(b.n));
  const normal = mv(hd.R, [0, 0, 1]), cosf = normal[0] * camDir[0] + normal[1] * camDir[1] + normal[2] * camDir[2]; let hidden = 0, n = 0;
  for (const gx of [-.5, -.25, 0, .25, .5]) for (const gy of [.2, .4, .6, .8, 1.0]) { n++;
    const o = add(hd.p, mv(hd.R, [gx, gy, .62])); let hit = false;
    for (const b of boxes) { const Rt = tr(b.R), lo = mv(Rt, sub3(o, b.c)), ld = mv(Rt, camDir); let t0 = 0, t1 = 1e9, ok = true;
      for (let k = 0; k < 3 && ok; k++) { if (Math.abs(ld[k]) < 1e-9) { if (Math.abs(lo[k]) > b.h[k]) ok = false; } else { let a1 = (-b.h[k] - lo[k]) / ld[k], a2 = (b.h[k] - lo[k]) / ld[k]; if (a1 > a2) [a1, a2] = [a2, a1]; t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) ok = false; } }
      if (ok && t1 > 1e-4) { hit = true; break; } }
    if (hit) hidden++; }
  return {hidden: +(hidden / n).toFixed(3), facing: +cosf.toFixed(3)};
}
// ---- gate measures (pure) ----------------------------------------------------------------------------------------------
// Foot-corner contacts over a sampled clip: [{side, corner, from, to, slide}] (slide = max horizontal drift while y < eps).
export function footContacts(frames, {eps = .015, travel = 0} = {}) {
  const out = [];
  for (const side of ['left', 'right']) for (let k = 0; k < 8; k++) {
    let run = null;
    frames.forEach((fr, i) => { const q = fr.corners[side][k], z = q[2] + travel * fr.t, on = q[1] < eps && !fr.skid;
      if (on) { if (!run) run = {side, corner: k, from: fr.t, x0: q[0], z0: z, slide: 0}; run.slide = Math.max(run.slide, Math.hypot(q[0] - run.x0, z - run.z0)); run.to = fr.t; }
      if ((!on || i === frames.length - 1) && run) { out.push(run); run = null; } });
  }
  return out;
}
export const cornersOf = (sample, build = 'adult_m') => { const f = fk(sample, build); return {left: f.leftFootCorners, right: f.rightFootCorners}; };
// Anticipation + overshoot of a verb on its main channel (degrees / studs): {antic, stroke, overshoot (fraction), ok}.
export function verbPhases(name, {intensity = 1} = {}) {
  const v = VERBS[name], T = timing(v), [c, dir] = v.main, at = t => sampleVerb(name, t, {intensity}).ch[c], k = versePoses(name, {intensity}).key[c];
  const r0 = at(0), n = 160; let ant = 0, peak = -Infinity;   // anticipation: the most opposite value before the stroke; overshoot: past the KEY pose's value
  for (let i = 0; i <= n; i++) { const t = T.ant * i / n, d = (at(t) - r0) * dir; ant = Math.min(ant, d); }
  const stroke = (k - r0) * dir - ant;
  for (let i = 0; i <= n; i++) { const t = T.ant + (T.win - T.ant) * i / n; peak = Math.max(peak, (at(t) - k) * dir); }   // inside the overshoot window (a settle that carries on is not overshoot)
  return {channel: c, antic: -ant, stroke, overshoot: stroke > 1e-9 ? peak / stroke : 0, key: T.key, ant: T.ant, D: T.D, anticFrac: T.ant / T.D};
}
