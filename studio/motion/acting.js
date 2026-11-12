// Acting library for the six-part R6 rig: named key poses blended pose-to-pose
// with anticipation, overshoot and settle; limbs stepped on twos, root smooth.
// Conventions (from r6.js): rotation.x < 0 swings an arm or leg forward/up;
// leftShoulder.z < 0 / rightShoulder.z > 0 raise arms sideways; head.x < 0 looks up.
// Pure functions of time: any frame renders identically in any order.
import {onTwos, ease} from './r6.js';

const PIV = ['head', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
const Z = [0, 0, 0];
// Each pose: pivot → [x, y, z]; root: {dy (in body units), lean (rad, + forward)}.
export const POSES = Object.freeze({
  stand: {leftShoulder: [0, 0, -.06], rightShoulder: [0, 0, .06]},
  point: {rightShoulder: [-1.55, 0, .05], leftShoulder: [0, 0, -.08], head: [0, -.1, 0]},
  pointUp: {rightShoulder: [-2.7, 0, .1], head: [-.35, 0, 0]},
  shrug: {leftShoulder: [-.45, 0, -.55], rightShoulder: [-.45, 0, .55], head: [0, 0, .16]},
  gasp: {leftShoulder: [-.62, 0, .3], rightShoulder: [-.62, 0, -.3], head: [-.12, 0, 0], root: {lean: -.08}},
  cheer: {leftShoulder: [0, 0, -2.6], rightShoulder: [0, 0, 2.6], head: [-.2, 0, 0]},
  recoil: {leftShoulder: [-.7, 0, -.45], rightShoulder: [-.7, 0, .45], head: [-.18, 0, 0], root: {lean: -.16}},
  armsWide: {leftShoulder: [-.15, 0, -1.45], rightShoulder: [-.15, 0, 1.45], head: [-.05, 0, 0]},
  carry: {leftShoulder: [-1.15, 0, .12], rightShoulder: [-1.15, 0, -.12]},
  hold: {leftShoulder: [-1.0, 0, .18], rightShoulder: [-1.0, 0, -.18], head: [.2, 0, 0]},
  facepalm: {rightShoulder: [-2.35, 0, -.45], head: [.22, 0, 0]},
  handsHips: {leftShoulder: [.1, 0, -.55], rightShoulder: [.1, 0, .55]},
  speech: {rightShoulder: [-1.3, 0, .35], leftShoulder: [-.2, 0, -.12], head: [-.08, 0, 0]},
  lookHands: {leftShoulder: [-1.5, 0, .12], rightShoulder: [-1.5, 0, -.12], head: [.42, 0, 0]},
  handsUp: {leftShoulder: [-2.15, 0, .32], rightShoulder: [-2.15, 0, -.32], head: [.05, 0, 0]},
  lookUp: {head: [-.45, 0, 0], leftShoulder: [0, 0, -.08], rightShoulder: [0, 0, .08]},
  lookDown: {head: [.38, 0, 0]},
  shy: {leftShoulder: [-.5, 0, .3], rightShoulder: [-.5, 0, -.3], head: [.3, .2, 0], root: {lean: .05}},
  kneel: {leftHip: [-1.05, 0, 0], rightHip: [1.05, 0, 0], leftShoulder: [-.5, 0, .1], rightShoulder: [-.6, 0, -.1], head: [.15, 0, 0], root: {dy: -1, lean: .12}},
  crouch: {leftHip: [-1.05, 0, -.1], rightHip: [-1.05, 0, .1], leftShoulder: [-.95, 0, .4], rightShoulder: [-.95, 0, -.4], head: [.1, 0, 0], root: {dy: -1, lean: .3}},
  sit: {leftHip: [-1.57, 0, -.04], rightHip: [-1.57, 0, .04], leftShoulder: [-.3, 0, -.05], rightShoulder: [-.3, 0, .05], root: {dy: -1}},
  sitCheer: {leftHip: [-1.57, 0, -.04], rightHip: [-1.57, 0, .04], leftShoulder: [0, 0, -2.6], rightShoulder: [0, 0, 2.6], head: [-.15, 0, 0], root: {dy: -1}},
  sitReach: {leftHip: [-1.57, 0, -.04], rightHip: [-1.57, 0, .04], leftShoulder: [-.85, 0, .2], rightShoulder: [-1.45, 0, -.05], root: {dy: -1, lean: .08}},
  sitHands: {leftHip: [-1.57, 0, -.04], rightHip: [-1.57, 0, .04], leftShoulder: [-.85, 0, .2], rightShoulder: [-.85, 0, -.2], head: [.12, 0, 0], root: {dy: -1}},
  reachDown: {rightShoulder: [-.9, 0, .1], head: [.4, 0, 0], root: {lean: .25}},
  reach: {rightShoulder: [-1.5, 0, -.1], leftShoulder: [-.3, 0, -.1], root: {lean: .1}},
  hug: {leftShoulder: [-1.3, 0, .55], rightShoulder: [-1.3, 0, -.55], head: [.1, 0, 0], root: {lean: .08}},
  run: {leftShoulder: [.6, 0, -.1], rightShoulder: [-.8, 0, .1], leftHip: [-.6, 0, 0], rightHip: [.5, 0, 0], root: {lean: .15}},
  slump: {leftShoulder: [.05, 0, -.02], rightShoulder: [.05, 0, .02], head: [.35, 0, 0], root: {lean: .12}},
  tense: {leftShoulder: [-.25, 0, .15], rightShoulder: [-.25, 0, -.15], head: [.08, 0, 0], root: {lean: -.03}},
});

const P = name => { const p = POSES[name]; if (!p) throw Error('unknown pose ' + name); return p; };
const val = (pose, piv) => pose[piv] ?? (piv.endsWith('Shoulder') ? (POSES.stand[piv] ?? Z) : Z);
const rootOf = pose => ({dy: pose.root?.dy ?? 0, lean: pose.root?.lean ?? 0});

// Transition curve: a little anticipation (pulls back ~6%), then overshoot (~8%) and settle.
export function snap(x, {antic = .06, over = .08} = {}) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  if (x < .2) return -antic * Math.sin(x / .2 * Math.PI);
  const y = (x - .2) / .8, s = 1.70158 * over / .1;
  const k = y - 1; return 1 + (s + 1) * k ** 3 + s * k ** 2;
}

// keys: [[t, 'pose', {blend, twos}], ...] sorted by time. Applies the blended pose to `a`.
// opts.breathe adds a small held-pose sway so nothing freezes; opts.twos steps limbs.
// opts.seated (layered acting): legs and hips stay in the sit pose and the root keeps the seat
// height whatever the upper-body pose is, so a seated character can gasp or point without
// straightening its legs through the chair or desk.
export function act(a, t, keys, {twos = true, breathe = true, seed = 0, blend = .28, seated = false} = {}) {
  const tt = twos ? onTwos(t) : t;
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= tt) i++;
  const [t1, n1, o1 = {}] = keys[i], prev = i > 0 ? keys[i - 1] : null;
  const to = P(n1), from = prev ? P(prev[1]) : to;
  // Big moves take longer: even through the snap curve's steepest drawing (on twos) no joint jumps more than ~1 rad, so a
  // large pose change never reads as a one-frame pop.
  let travel = 0; if (prev) for (const piv of PIV) { const A = val(from, piv), B = val(to, piv); travel = Math.max(travel, Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]), Math.abs(B[2] - A[2])); }
  const b = Math.max(o1.blend ?? blend, travel * .2), x = prev ? (tt - t1) / b : 1;
  const k = o1.smooth || travel > 1.2 ? ease(x) : snap(x);   // big moves glide (eased), small ones snap
  for (const piv of PIV) {
    if (seated && piv.endsWith('Hip')) { a.pivots[piv].rotation.set(...POSES.sit[piv]); continue; }
    const A = val(from, piv), B = val(to, piv);
    a.pivots[piv].rotation.set(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k);
  }
  const ra = rootOf(from), rb = rootOf(to), s = a.root.scale.y;
  // The root moves smoothly (not stepped), eased, so the body never pops.
  const kr = prev ? ease((t - t1) / b) : 1;
  a.root.position.y += (seated ? POSES.sit.root.dy : ra.dy + (rb.dy - ra.dy) * kr) * s;
  a.root.rotation.x += ra.lean + (rb.lean - ra.lean) * kr;
  if (breathe) {
    const w = Math.sin(tt * 2.1 + seed);
    a.pivots.leftShoulder.rotation.z -= .02 * w; a.pivots.rightShoulder.rotation.z += .02 * w;
    a.pivots.head.rotation.x += .015 * Math.sin(tt * 1.3 + seed);
  }
  return a;
}

// Talking overlay: small hand beats while a line is spoken (on twos).
export function talk(a, t, {amt = 1, side = 'right'} = {}) {
  const tt = onTwos(t), s = a.pivots[side + 'Shoulder'];
  s.rotation.x += -.18 * amt * Math.max(0, Math.sin(tt * 7.3)); s.rotation.z += (side === 'right' ? .06 : -.06) * amt * Math.sin(tt * 4.1);
  a.pivots.head.rotation.x += .04 * amt * Math.sin(tt * 6.1); a.pivots.head.rotation.z += .03 * amt * Math.sin(tt * 2.9);
  return a;
}
// Shiver: fast small shake (on ones, it is fear).
export function shiver(a, t, amt = 1) {
  a.root.position.x += .03 * amt * Math.sin(t * 61) * a.root.scale.x;
  a.pivots.head.rotation.z += .05 * amt * Math.sin(t * 47);
  return a;
}
// Expression schedule: [[t, 'face'], ...] → face at time t (changes on the word).
export function faceAt(t, list) { let f = list[0][1]; for (const [t0, n] of list) if (t >= t0) f = n; return f; }
