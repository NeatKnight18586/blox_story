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
export const CHANNELS = [...JOINTS.flatMap(j => AX.map(a => `${j}.${a}`)), ...ROOTK.map(k => `root.${k}`), ...FOOTK.map(k => `lf.${k}`), ...FOOTK.map(k => `rf.${k}`), 'ik'];
const isFoot = c => c[1] === 'f' && c[2] === '.', isAngle = c => !isFoot(c) && c !== 'ik' && !['root.dx', 'root.dy', 'root.dz', 'root.cy', 'root.cz'].includes(c);
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
  idle_alive: {act: .34, tail: .5, main: ['root.dx', -1], cam: 25,
    key: P({root: {dx: -.14, roll: -3, yaw: 6}, waist: [2, -8, 4], head: [-3, -14, -6], rHand: {p: [1.25, -.1, .05], pole: [-1, .2, .3]}, rW: [0, 0, -18], lS: [6, 0, -10], lE: -10}),
    settle: P({root: {dx: -.12, roll: -2.5, yaw: 5}, waist: [2, -6, 3], head: [-2, -10, -5], rHand: {p: [1.25, -.08, .05], pole: [-1, .2, .3]}, rW: [0, 0, -16], lS: [5, 0, -9], lE: -10}), arc: {side: 'right', deg: 20}},
  look_around: {act: .2, tail: .55, main: ['head.y', 1], cam: 25,
    key: P({head: [-8, 52, 0], waist: [-2, 16, 0], root: {yaw: 6}, rHand: {p: [.55, 2.6, 1.0], pole: [-1, .4, 0]}, rW: [-20, 0, 0], lS: [6, 0, -6]}),
    settle: P({head: [-6, 44, 2], waist: [-2, 14, 0], root: {yaw: 5}, rHand: {p: [.6, 2.55, .95], pole: [-1, .4, 0]}, rW: [-18, 0, 0], lS: [6, 0, -6]}), arc: {side: 'right', deg: 30}},
  flinch: {act: .07, tail: .4, main: ['waist.x', -1], cam: 30,
    antic: P({waist: [6, 0, 0], head: [-6, 0, 0], root: {lean: 3}}),
    key: P({head: [14, -28, -8], waist: [-12, 20, -6], rS: [-118, 0, -20], rE: -116, lS: [-68, 0, -38], lE: -96, lW: [0, 0, -20], root: {lean: -6, roll: 4, dy: -.16, dz: -.12}}),
    settle: P({head: [10, -22, -6], waist: [-8, 16, -4], rS: [-108, 0, -18], rE: -110, lS: [-60, 0, -34], lE: -90, lW: [0, 0, -16], root: {lean: -4, roll: 3, dy: -.12, dz: -.1}}),
    impact: {'head.x': 6, 'root.dy': -.05}},
  gasp_step_back: {act: .14, tail: .5, main: ['root.lean', -1], cam: 35, exit: {dz: -.38},
    key: P({root: {dz: -.4, lean: -10}, waist: [-8, 0, 0], head: [-12, 0, 0], lS: [-72, 0, -16], rS: [-72, 0, 16], lE: -118, rE: -118, rf: {z: -.8}}),
    settle: P({root: {dz: -.38, lean: -6}, waist: [-5, 0, 0], head: [-8, 0, 0], lS: [-66, 0, -14], rS: [-66, 0, 14], lE: -116, rE: -116, rf: {z: -.8}}), arc: {side: 'both', deg: 22}},
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
  arms_cross: {act: .16, tail: .45, main: ['rightShoulder.x', -1], cam: 25,
    key: P({lS: [-42, 0, 16], rS: [-46, 0, -14], lE: -116, rE: -112, lW: [0, 0, 10], rW: [0, 0, -10], head: [-8, -14, 4], waist: [-5, 0, 0], root: {roll: 2, dx: -.08}}),
    settle: P({lS: [-40, 0, 16], rS: [-44, 0, -14], lE: -114, rE: -110, lW: [0, 0, 10], rW: [0, 0, -10], head: [-7, -12, 4], waist: [-4, 0, 0], root: {roll: 2, dx: -.08}}), arc: {side: 'both', deg: 15}},
  hug: {act: .16, tail: .5, main: ['rightShoulder.x', -1], cam: 70, two: {partner: 'hug_b', offset: [0, 1.75, 180]},
    key: P({lHand: {p: [-.55, .55, 1.25], pole: [1, 0, .4]}, rHand: {p: [.55, .7, 1.25], pole: [-1, 0, .4]}, waist: [8, 0, 0], head: [6, 22, 6], root: {lean: 6, dz: .12}, rf: {z: .3}}),
    settle: P({lHand: {p: [-.5, .5, 1.25], pole: [1, 0, .4]}, rHand: {p: [.5, .65, 1.25], pole: [-1, 0, .4]}, waist: [8, 0, 0], head: [8, 24, 8], root: {lean: 5, dz: .12}, rf: {z: .3}}), arc: {side: 'both', deg: 20}},
  hug_b: {act: .18, tail: .5, main: ['leftShoulder.x', -1], cam: 70,
    key: P({lHand: {p: [-.6, .2, 1.2], pole: [1, 0, .4]}, rHand: {p: [.6, .05, 1.2], pole: [-1, 0, .4]}, waist: [6, 0, 0], head: [6, -22, -6], root: {lean: 4, dz: .1}, lf: {z: .25}}),
    settle: P({lHand: {p: [-.55, .15, 1.2], pole: [1, 0, .4]}, rHand: {p: [.55, 0, 1.2], pole: [-1, 0, .4]}, waist: [6, 0, 0], head: [8, -24, -8], root: {lean: 4, dz: .1}, lf: {z: .25}})},
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
  carry: {act: .2, tail: .5, main: ['waist.x', -1], cam: 50, prop: 'carry', two: {partner: 'carried', follow: 'hands'},
    antic: P({root: {dy: -.52, dz: -.42, lean: 14}, waist: [26, 0, 0], head: [16, 0, 0], lS: [-40, 0, -12], rS: [-40, 0, 12], lE: -20, rE: -20}),
    key: P({lS: [-48, 0, -12], rS: [-48, 0, 12], lE: -84, rE: -84, lW: [0, 0, -8], rW: [0, 0, 8], root: {lean: -7, dy: -.1}, waist: [-6, 0, 0], head: [-6, 0, 0]}),
    settle: P({lS: [-46, 0, -12], rS: [-46, 0, 12], lE: -86, rE: -86, lW: [0, 0, -8], rW: [0, 0, 8], root: {lean: -5, dy: -.08}, waist: [-4, 0, 0], head: [-4, 0, 0]})},
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
  carried: {act: .2, tail: .5, main: ['leftShoulder.x', -1], cam: 50,
    key: P({ik: 0, root: {lean: -24}, lH: [-84, 0, -4], rH: [-80, 0, 4], lK: 84, rK: 92, lS: [-120, 0, -20], rS: [-150, 0, 34], lE: -60, rE: -70, head: [-6, -20, 0], waist: [-4, 0, 0]}),
    settle: P({ik: 0, root: {lean: -22}, lH: [-82, 0, -4], rH: [-78, 0, 4], lK: 86, rK: 94, lS: [-118, 0, -20], rS: [-148, 0, 34], lE: -62, rE: -72, head: [-4, -18, 0], waist: [-4, 0, 0]})},
  // ---- talk gestures: additive (delta) layers on whatever the actor is doing; key on the stressed word ----
  beat: {act: .08, tail: .22, gesture: true, main: ['rightShoulder.x', -1], key: P({rE: -32, rW: [-22, 0, 0], rS: [-14, 0, 3]}), settle: REST},
  open_palms: {act: .12, tail: .35, gesture: true, main: ['rightShoulder.z', 1], key: P({lS: [-26, 0, -26], rS: [-26, 0, 26], lE: -48, rE: -48, lW: [0, 0, -18], rW: [0, 0, 18]}), settle: REST},
  head_nod: {act: .09, tail: .25, gesture: true, main: ['head.x', 1], key: P({head: [14, 0, 0]}), settle: REST},
  head_shake: {act: .09, tail: .4, gesture: true, main: ['head.y', -1], key: P({head: [2, -15, 0]}), settle: REST, impact: {'head.y': 26, shape: 'osc', peak: .11}},
};
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
const scaleP = (p, base, I) => { const o = {}; for (const c of CHANNELS) { const b = base[c] ?? REST[c], x = p[c] ?? b; o[c] = c === 'ik' || c === 'root.cy' || c === 'root.cz' || c.endsWith('.pitch') ? x : b + I * (x - b); } return o; };
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
    if (HANDC.has(c) && t > T.key) { const post = T.end - T.key, d = t - T.key; return d <= post + LAG ? T.key + d * post / (post + LAG) : t - LAG; }
    return t;
  };
  const value = (c, tt) => {
    if (tt <= 0) return rest[c];
    if (tt < T.ant) return rest[c] + smooth(tt / T.ant) * (antic[c] - rest[c]);
    const ws = smooth((tt - T.win) / v.tail), w = strokeW(v, c, tt, T);
    return antic[c] + w * (key[c] - antic[c]) + ws * (settle[c] - key[c]);
  };
  for (const c of CHANNELS) if (!isFoot(c)) out[c] = clampCh(c, value(c, tl(c)));   // FK joints stop at their limits (an elbow locks out, never hyper-extends)
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
  if (v.dizzy) { const d = t - T.key, a = smooth(d / .4) * I; if (d > 0) { const w = 2 * Math.PI * 1.1 * d; out['head.y'] += 12 * a * Math.sin(w); out['head.z'] += 8 * a * Math.cos(w); out['waist.z'] += 3 * a * Math.sin(w + 1); out['waist.y'] += 4 * a * Math.cos(w + 1); } }
  if (!v.gesture) { const dr = drift(t, seed, smooth((t - T.key) / .5)); for (const [c, x] of Object.entries(dr)) out[c] += x; }
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
  return {sample: s, raw, reach, rolled};
}

// ---- standalone verb sampling (sheets, gates, tests) ------------------------------------------------------------------
// The verb alone from rest: t = verb-local seconds (0 = start; timing(v).key = the KEY).
export function sampleVerb(name, t, {intensity = 1, facing = 0, seed = 1, build = 'adult_m', from = REST} = {}) {
  const v = VERBS[name], poses = versePoses(name, {from, intensity, facing});
  const ch = v.gesture ? addDelta(from, verbChannels(name, t, poses, seed)) : verbChannels(name, t, poses, seed);
  return {...solve(ch, build, {groundClamp: !!v.fall || !!v.air}), ch};
}
const addDelta = (base, g) => { const o = {...base}; for (const c of CHANNELS) if (!isFoot(c) && c !== 'ik' && !c.startsWith('root.c')) o[c] = (base[c] ?? REST[c]) + (g[c] - REST[c]); return o; };

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
export function compileActing(actions, {cues = null, env = null, talk = [], offset = 0} = {}) {
  const tracks = {}, T = n => (tracks[n] ??= {items: [], gestures: [], faces: [], props: [], cycles: []});
  for (const a of actions) {
    const t = resolveAt(a.at ?? 0, cues) + (typeof a.at === 'number' ? offset : 0);
    if (a.face) T(a.actor).faces.push([t, a.face]);
    if (a.cycle) T(a.actor).cycles.push({name: a.cycle, start: t, until: a.until ?? Infinity});
    if (a.verb === 'tumble') T(a.actor).items.push({verb: 'tumble', key: t, start: t - .3, intensity: a.intensity ?? 1});
    else if (a.verb && GESTURES.includes(a.verb)) T(a.actor).gestures.push({verb: a.verb, key: t, intensity: a.intensity ?? 1, facing: a.facing ?? 0});
    else if (a.verb) {
      const v = VERBS[a.verb]; if (!v) throw Error('acting6: unknown verb ' + a.verb);
      const tm = timing(v), it = {verb: a.verb, key: t, start: t - tm.key, intensity: a.intensity ?? 1, facing: a.facing ?? 0, hold: a.hold ?? null, target: a.target ?? null};
      T(a.actor).items.push(it);
      if (a.hold) T(a.actor).props.push({id: a.hold, verb: a.verb, mode: v.prop ?? 'attach', key: t, item: it});
      if (v.two && a.target) T(a.target).items.push({verb: v.two.partner ?? a.verb, key: t, start: t - timing(VERBS[v.two.partner]).key, intensity: a.intensity ?? 1, facing: -(a.facing ?? 0), partnerOf: a.actor, two: v.two});
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
  if (cy) ch = cycleChannels(cy.name, t - cy.start, {build});
  for (const g of tr.gestures) { const v = VERBS[g.verb], tm = timing(v), lt = t - (g.key - tm.key); if (lt <= 0 || lt > tm.end + .05) continue;
    const gc = verbChannels(g.verb, lt, versePoses(g.verb, {intensity: g.intensity, facing: g.facing}), seed); ch = addDelta(ch, gc); }
  return ch;
}
const idleChannels = (t, seed) => { const o = {...REST}; for (const [c, x] of Object.entries(drift(t, seed))) o[c] += x; return o; };
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
  out.props = {}; for (const pr of tr.props) out.props[pr.id] = propAt(tr, pr, t, out.sample, {seed, build});
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
function propAt(tr, pr, t, sample, {seed, build}) {
  const side = pr.mode === 'carry' ? 'both' : (pr.item.facing < 0 ? 'left' : 'right');
  const handT = tt => handAt(solve(trackChannels(tr, tt, {seed, build}), build).sample, side, build);
  if (pr.mode === 'carry') { const h = handAt(sample, 'both', build); return {p: add(h.p, mv(h.R, [0, .05, .62])), R: h.R, held: true}; }
  if (pr.mode === 'release') {
    if (t <= pr.key) return {...handAt(sample, side, build), held: true};
    const a = handT(pr.key), b = handT(pr.key - 1 / FPS6), v = sub3(a.p, b.p).map(x => x * FPS6 * 1.25), d = t - pr.key;
    const p = add(a.p, [v[0] * d, v[1] * d + .5 * GRAV * d * d, v[2] * d]); p[1] = Math.max(PROP_R, p[1]); return {p, R: a.R, held: false};
  }
  if (t >= pr.key) return {...handAt(sample, side, build), held: true};
  const k = handT(pr.key), d = t - pr.key, vin = pr.item.verb === 'catch' ? [0, 5.5, -7] : [0, 0, 0];
  if (pr.item.verb !== 'catch') { const p = handT(pr.item.start).p; return {p: [p[0], PROP_R, p[2] + .9], R: k.R, held: false}; }   // grab: waiting on the ground ahead
  return {p: add(k.p, [vin[0] * d, vin[1] * d + .5 * GRAV * d * d, vin[2] * d]), R: k.R, held: false};
}
// Two-actor verbs: the partner's origin relative to the lead's origin frame ([x, z, yaw°]) — hug: facing at a set distance;
// comfort_kneel: placed so the lead's reaching hand rests on the partner's near shoulder at the key.
export function partnerOffset(verb, {facing = 0} = {}) {
  const v = VERBS[verb]; if (!v?.two || v.two.follow) return null;
  const [x, z, yaw] = v.two.offset ?? v.two.place; return facing < 0 ? {x: -x, z, yaw: -yaw} : {x, z, yaw};
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
// Carry with a partner actor: the carried actor's origin follows the lead's hands each frame (pure: from the lead's sample).
export function carryOrigin(leadSample, build = 'adult_m') { const h = handAt(leadSample, 'both', build), f = fk(leadSample, build); return {p: [h.p[0], h.p[1] - 1.6, h.p[2] + .55], yaw: 90 + f.root.R[0][2] * 0}; }

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
