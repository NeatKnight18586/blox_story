import {EGG_HOLD} from '../parts/eggs.js';
// engine/poses.js — pose library for the v2 block avatar (docs/V2_BRIEF.md §6.5).
// Rigid blocks swinging from shoulders and hips, slightly stiff and bouncy: that stiffness IS the style.
// Every sampler is a pure function of time: samplePose(name, t, opts) → {pivots, root}.
//   pivots: {head, leftShoulder, rightShoulder, leftHip, rightHip} → [x, y, z] radians
//           (x < 0 swings an arm/leg forward and up; leftShoulder.z < 0 / rightShoulder.z > 0 raise sideways)
//   root:   {dx, dy, dz, lean (rot x, + forward), roll (rot z), yaw}
// Poses are IN PLACE: travel along a path belongs to actors.js (WALK_SPEED / RUN_SPEED match the gaits).
// sampleTimeline(keys, t) cross-fades any two poses over 0.15–0.2 s.
import {sampleAction} from '../avatar/actions.js';

export const PIVOTS = ['head', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
export const WALK_SPEED = .67, RUN_SPEED = 4.2;          // units/s (legacy readable walk; run cycle stride)
export const FADE = .18;
const PI = Math.PI, clamp01 = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const ease = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const twos = t => Math.floor(t * 15) / 15;                 // limbs on twos (15 poses/s), as in the studio style

const blank = () => ({pivots: {head: [0, 0, 0], leftShoulder: [0, 0, 0], rightShoulder: [0, 0, 0], leftHip: [0, 0, 0], rightHip: [0, 0, 0]}, root: {dx: 0, dy: 0, dz: 0, lean: 0, roll: 0, yaw: 0}});
function make(piv = {}, root = {}) { const s = blank(); Object.assign(s.pivots, piv); Object.assign(s.root, root); return s; }
function legacy(name, t, opts) {
  const a = sampleAction(name, t, opts), s = make(Object.fromEntries(PIVOTS.map(p => [p, [...a.pivots[p]]])), {dy: a.root.position[1]});
  if (a.offsets) s.offsets = a.offsets; return s;
}

const POSES = {
  idle: (t, o) => legacy('idle', t + (o.phase ?? 0), {}),
  look_react: (t, o) => legacy('look_react', t, {direction: o.direction ?? 'right'}),
  walk: t => legacy('walk', t, {gait: 'readable'}),
  run(t) {
    const p = Math.sin(2 * PI * twos(t) / .55);
    return make({leftShoulder: [.95 * p, 0, -.05], rightShoulder: [-.95 * p, 0, .05], leftHip: [-.85 * p, 0, 0], rightHip: [.85 * p, 0, 0], head: [-.05, 0, 0]},
      {lean: .16, dy: .14 * Math.abs(Math.sin(2 * PI * t / .55))});
  },
  jump(t) {
    const u = clamp01(t / .7), up = smooth(u * 5);
    return make({leftShoulder: [-PI * up, 0, -.1 * up], rightShoulder: [-PI * up, 0, .1 * up], leftHip: [-.35 * up, 0, 0], rightHip: [.15 * up, 0, 0], head: [-.12 * up, 0, 0]},
      {dy: 4 * 1.7 * u * (1 - u)});
  },
  fall(t) {
    const w = .18 * Math.sin(twos(t) * 2 * PI * 2.5);
    return make({leftShoulder: [-2.5 + w, 0, -.55], rightShoulder: [-2.5 - w, 0, .55], leftHip: [-.2 - w, 0, -.3], rightHip: [-.2 + w, 0, .3], head: [-.25, 0, 0]}, {lean: -.12});
  },
  climb(t) {
    const p = Math.sin(2 * PI * twos(t) / .8);
    return make({leftShoulder: [-2.6 + .45 * p, 0, .1], rightShoulder: [-2.6 - .45 * p, 0, -.1], leftHip: [-.7 * Math.max(0, p), 0, 0], rightHip: [-.7 * Math.max(0, -p), 0, 0], head: [-.3, 0, 0]}, {dy: .25 * p});
  },
  toolHold: (t, o) => { const s = legacy('idle', t + (o.phase ?? 0), {}); s.pivots.rightShoulder = [-PI / 2, 0, 0]; return s; },
  // Season 1 eggs: both hands round the egg at chest height (eggHold) or high under the chin (eggChin); parts/eggs.js EGG_HOLD
  eggHold: (t, o) => { const s = legacy('idle', t + (o.phase ?? 0), {}), {alpha: a, theta: h} = EGG_HOLD.eggHold; s.pivots.rightShoulder = [-a, 0, -h]; s.pivots.leftShoulder = [-a, 0, h]; return s; },
  eggWalk: (t, o) => { const s = POSES.walk(t, o), {alpha: a, theta: h} = EGG_HOLD.eggHold; s.pivots.rightShoulder = [-a, 0, -h]; s.pivots.leftShoulder = [-a, 0, h]; return s; },
  eggRun: (t, o) => { const s = POSES.run(t, o), {alpha: a, theta: h} = EGG_HOLD.eggHold; s.pivots.rightShoulder = [-a, 0, -h]; s.pivots.leftShoulder = [-a, 0, h]; return s; },
  eggChin: (t, o) => { const s = legacy('idle', t + (o.phase ?? 0), {}), {alpha: a, theta: h} = EGG_HOLD.eggChin; s.pivots.rightShoulder = [-a, 0, -h]; s.pivots.leftShoulder = [-a, 0, h]; s.pivots.head = [.18, 0, 0]; return s; },
  toolSwing(t) {
    const u = clamp01(t / .45);
    const x = u < .35 ? -PI / 2 - (2.95 - PI / 2) * ease(u / .35) : u < .6 ? -2.95 + 2.5 * ease((u - .35) / .25) : -.45 - (PI / 2 - .45) * smooth((u - .6) / .4);
    return make({rightShoulder: [x, 0, 0], leftShoulder: [-.3, 0, -.15], head: [u > .35 && u < .7 ? .18 : -.08, 0, 0], leftHip: [-.25, 0, 0], rightHip: [.2, 0, 0]}, {lean: u > .35 && u < .8 ? .18 : 0});
  },
  pull(t, o) {
    const strain = Math.floor(t * 15) % 2 ? 1 : -1, k = o.effort ?? 1;  // 2-frame strain shake
    return make({leftShoulder: [-1.1 + .04 * strain * k, 0, .52], rightShoulder: [-1.1 - .04 * strain * k, 0, -.52], leftHip: [-.1, 0, 0], rightHip: [.42, 0, 0], head: [.12, 0, 0]},   // fists together on a hilt ~0.8 in front, ~3.0 high (scale 0.9)
      {lean: -.15 * k, dy: -.1 * k, dx: .03 * strain * k});
  },
  point: () => make({rightShoulder: [-1.55, 0, .05], leftShoulder: [0, 0, -.08], head: [0, -.1, 0]}),
  cheer(t) {
    const b = Math.abs(Math.sin(2 * PI * twos(t) / .5));
    return make({leftShoulder: [0, 0, -2.7 + .2 * b], rightShoulder: [0, 0, 2.7 - .2 * b], head: [-.2, 0, 0]}, {dy: .22 * b});
  },
  recoil: () => make({leftShoulder: [-.75, 0, -.45], rightShoulder: [-.75, 0, .45], head: [-.18, 0, 0]}, {lean: -.16}),
  trip(t) {
    const u = ease(t / .8);
    return make({leftShoulder: [-2.3 * u, 0, -.2 * u], rightShoulder: [-2.3 * u, 0, .2 * u], leftHip: [.45 * u, 0, 0], rightHip: [.1 * u, 0, 0], head: [-.35 * u, 0, 0]}, {lean: 1.5 * u, dy: .5 * u, dz: .6 * u});
  },
  sit: (t, o) => make({leftHip: [-PI / 2, 0, -.04], rightHip: [-PI / 2, 0, .04], leftShoulder: [-.3, 0, -.05], rightShoulder: [-.3, 0, .05]}, {dy: o.ground ? -1.5 : 0}),
  sitEgg: (t, o) => { const s = POSES.sit(t, {ground: true}), {alpha: a, theta: h} = EGG_HOLD.eggHold; s.pivots.rightShoulder = [-a, 0, -h]; s.pivots.leftShoulder = [-a, 0, h]; s.pivots.head = [.15, 0, 0]; return s; },   // opt-in (egg nest): seated on the ground, an egg held in both hands
  bow: t => { const u = smooth(clamp01(t / .5)); return make({leftShoulder: [.1 * u, 0, -.06], rightShoulder: [.1 * u, 0, .06], head: [.3 * u, 0, 0]}, {lean: .6 * u}); },   // opt-in (egg S33): a small polite bow
  sleep: t => make({leftShoulder: [0, 0, -.12], rightShoulder: [0, 0, .12], head: [.04 * Math.sin(t * 1.4), 0, 0]}, {lean: -PI / 2, dy: .5}),
  wave(t) { const w = Math.sin(twos(t) * 2 * PI * 1.6); return make({rightShoulder: [-.2, 0, 2.5 + .35 * w], leftShoulder: [0, 0, -.06], head: [0, 0, -.08]}); },
  // Session 5 (episode "Nobody"): holding a heavy tool up, two-handed carry, one-hand pull, lifting a whole
  // stone, shivering, looking up at the tag.
  raise(t) { const b = .04 * Math.sin(2 * PI * t / 1.6); return make({rightShoulder: [-PI + b, 0, .12], leftShoulder: [-.35, 0, -.25], head: [-.28, 0, 0], leftHip: [-.12, 0, 0], rightHip: [.12, 0, 0]}, {lean: -.06}); },
  hammerHold(t) { const b = .03 * Math.sin(2 * PI * t / 1.8); return make({rightShoulder: [-1.15 + b, 0, -.18], leftShoulder: [-1.15 + b, 0, .5], head: [.06, 0, 0], leftHip: [-.1, 0, 0], rightHip: [.1, 0, 0]}, {lean: -.1, dy: -.04}); },
  pullOne(t, o) {
    const strain = Math.floor(t * 15) % 2 ? 1 : -1, k = o.effort ?? .4;
    return make({rightShoulder: [-.95 - .03 * strain * k, 0, .08], leftShoulder: [-1.75, 0, -.35], head: [.05, .25, 0], leftHip: [-.08, 0, 0], rightHip: [.22, 0, 0]}, {lean: -.08 * k});
  },
  lift(t, o) {
    const strain = Math.floor(t * 15) % 2 ? 1 : -1, k = o.effort ?? 1;
    return make({leftShoulder: [-.55 + .05 * strain * k, 0, .38], rightShoulder: [-.55 - .05 * strain * k, 0, -.38], leftHip: [-.55, 0, -.12], rightHip: [-.55, 0, .12], head: [-.35, 0, 0]}, {lean: .45, dy: -.35});
  },
  shiver(t) { const s = .05 * (Math.floor(t * 15) % 2 ? 1 : -1); return make({leftShoulder: [-1.25, 0, .75 + s], rightShoulder: [-1.25, 0, -.75 - s], head: [.12, 0, 0]}, {dx: s * .3}); },
  lookUp(t, o) { const s = legacy('idle', t + (o.phase ?? 0), {}); s.pivots.head = [-.55, 0, 0]; return s; },
};
export const POSE_NAMES = Object.keys(POSES);

export function samplePose(name, t, opts = {}) {
  if (!POSES[name]) throw Error('unknown pose ' + name);
  if (!Number.isFinite(t) || t < 0) throw Error('pose time must be finite and ≥ 0');
  return POSES[name](t, opts);
}

export function blendPoses(a, b, w) {
  const s = blank(); w = clamp01(w);
  for (const p of PIVOTS) s.pivots[p] = a.pivots[p].map((v, i) => v + (b.pivots[p][i] - v) * w);
  for (const k of Object.keys(s.root)) s.root[k] = a.root[k] + (b.root[k] - a.root[k]) * w;
  if (a.offsets || b.offsets) { s.offsets = {}; for (const h of ['leftHip', 'rightHip']) { const x = a.offsets?.[h] ?? [0, 0, 0], y = b.offsets?.[h] ?? [0, 0, 0]; s.offsets[h] = x.map((v, i) => v + (y[i] - v) * w); } }
  return s;
}

// keys: [[t0, 'pose', opts?], ...] sorted by t0. Pure: the pose at t depends only on t.
export function sampleTimeline(keys, t, {fade = FADE} = {}) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const [t0, name, o = {}] = keys[i], cur = samplePose(name, Math.max(0, t - t0), o);
  if (i === 0 || t - t0 >= fade) return cur;
  const [p0, pn, po = {}] = keys[i - 1];
  return blendPoses(samplePose(pn, Math.max(0, t - p0), po), cur, smooth((t - t0) / fade));
}

// Background life: seeded idle offsets, slow head turns, the occasional jump. Pure in (seed, t).
export function ambientPose(seed, t) {
  const r = k => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const s = samplePose('idle', t, {phase: r(1) * 3});
  const turnPeriod = 4 + r(2) * 3, turn = Math.sin(2 * PI * t / turnPeriod + r(3) * 6) * .45;
  s.pivots.head[1] += turn;
  const jumpEvery = 7 + r(4) * 5, jt = (t + r(5) * jumpEvery) % jumpEvery;
  if (r(6) < .5 && jt < .7) { const j = samplePose('jump', jt); return blendPoses(s, j, smooth(Math.min(jt, .7 - jt) / .12)); }
  return s;
}

// Apply a sample to an actor (v2 actor or legacy avatar): absolute, never accumulated.
export function applyPoseSample(actor, s, origin = {position: [0, 0, 0], yaw: 0}) {
  const yaw = (origin.yaw ?? 0) + s.root.yaw, c = Math.cos(yaw), sn = Math.sin(yaw), k = actor.root.scale.y;
  const {dx, dy, dz} = s.root;
  actor.root.position.set(origin.position[0] + (dx * c + dz * sn) * k, origin.position[1] + dy * k, origin.position[2] + (-dx * sn + dz * c) * k);
  actor.root.rotation.set(s.root.lean, yaw, s.root.roll, 'YXZ');
  for (const p of PIVOTS) {
    actor.pivots[p].rotation.set(...s.pivots[p]);
    actor.pivots[p].position.fromArray(actor.restPositions[p]);
    const off = s.offsets?.[p]; if (off) actor.pivots[p].position.add({x: off[0], y: off[1], z: off[2]});
  }
  return actor;
}
