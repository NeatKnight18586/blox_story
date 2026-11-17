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
  eggRunLow: (t, o) => { const s = POSES.run(t, o); s.pivots.rightShoulder = [-.5, 0, -.5]; s.pivots.leftShoulder = [-.5, 0, .5]; return s; },   // opt-in (owner pass 2): an armful carried low, the face clear
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
  sneak(t) {   // opt-in (egg, owner pass 2): a sly tiptoe, knees bent, the egg tucked under the right arm, the left hand raised for balance
    const p = Math.sin(2 * PI * twos(t) / 1.1), lift = Math.abs(Math.sin(2 * PI * t / 1.1));
    return make({leftShoulder: [-.45 + .1 * p, 0, -.4], rightShoulder: [-.1, 0, .18], leftHip: [-.55 * p - .25, 0, 0], rightHip: [.55 * p - .25, 0, 0], head: [-.05, 0, 0]}, {lean: .22, dy: -.25 + .12 * lift});
  },
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
  // ---- format v5 (Phase 3a): snappy key poses. Held shapes with clear silhouettes; key them with {snap: true} so they
  // land in 2 frames on top of the smooth motion around them. (Right arm: +z = out to the side; left arm: −z.)
  shrug: () => make({rightShoulder: [-.35, 0, .62], leftShoulder: [-.35, 0, -.62], head: [0, 0, .16]}, {dy: .05}),
  facepalm: () => make({rightShoulder: [-2.12, 0, -.62], leftShoulder: [-.1, 0, -.12], head: [.32, 0, 0]}, {lean: .06}),   // fix: hand onto the face (was beside the head)
  armsCrossed: () => make({rightShoulder: [-1.3, 0, -.62], leftShoulder: [-1.18, 0, .62], head: [-.06, 0, 0]}, {lean: -.04}),
  heroPose: () => make({rightShoulder: [.12, 0, .62], leftShoulder: [.12, 0, -.62], head: [-.12, 0, 0], leftHip: [0, 0, -.12], rightHip: [0, 0, .12]}, {lean: -.07}),
  fistPump: () => make({rightShoulder: [-2.45, 0, .8], leftShoulder: [.45, 0, -.25], head: [-.18, 0, .1], leftHip: [-.15, 0, 0]}, {lean: -.06}),   // fix pass 1: up and out on a diagonal (was too close to pointUp)
  pointUp: () => make({rightShoulder: [-3.0, 0, .05], leftShoulder: [0, 0, -.1], head: [-.42, 0, 0]}),
  thinker: () => make({rightShoulder: [-1.95, 0, -.5], leftShoulder: [-.95, 0, .5], head: [.14, 0, .1]}),
  gaspHands: () => make({rightShoulder: [-2.45, 0, -.28], leftShoulder: [-2.45, 0, .28], head: [-.12, 0, 0]}, {lean: -.09}),
  doubleTake(t) { return t < .22 ? make({head: [0, .75, 0]}) : make({head: [-.16, 0, 0], leftShoulder: [-.6, 0, -.35], rightShoulder: [-.6, 0, .35]}, {lean: -.12, dy: .06}); },
  flail(t) { const a = Math.sin(Math.floor(t * 12) * 1.9); return make({rightShoulder: [-2.2 + .65 * a, 0, .9], leftShoulder: [-2.2 - .65 * a, 0, -.9], head: [-.1, 0, .12 * a]}, {dy: .06 * Math.abs(a)}); },
  // Toy House E1 fix (opt-in): blasterAim — both hands on a foam blaster (right fist on the grip, left under the barrel); every
  // o.every s (default .5, from o.fire0) a 3-frame recoil kick (24 fps). drive — seated, both hands on a kart wheel.
  // holdHands — the walk with the inner arm (o.side 'left' | 'right', toward the partner) angled out to meet the partner's hand (kids 3.4 apart); o.still: standing.
  blasterAim(t, o) { const ev = o.every ?? .5, u = ((t - (o.fire0 ?? 0)) % ev + ev) % ev, k = u < 3 / 24 ? 1 - u / (3 / 24) : 0;
    const lo = o.lower ?? 0;   // o.lower (rad): the barrel dips (a seated kid keeps the chin clear)
    return make({rightShoulder: [-1.5 + lo - .3 * k, 0, -.05], leftShoulder: [-1.38 + lo - .3 * k, 0, .55], head: [.05 + .06 * k, 0, 0], leftHip: [-.12, 0, 0], rightHip: [.12, 0, 0]}, {lean: -.04 - .08 * k, dz: -.12 * k}); },
  drive(t, o) { const s = POSES.sit(t, o), b = .03 * Math.sin(2 * PI * t / .4); const ar = o.arm ?? .6; s.pivots.rightShoulder = [-ar + b, 0, -.4]; s.pivots.leftShoulder = [-ar - b, 0, .4]; s.pivots.head = [-.05, 0, 0];
    if (o.aim) { const a = POSES.blasterAim(t, o); s.pivots.rightShoulder = a.pivots.rightShoulder; s.root.lean = a.root.lean; } return s; },   // aim: one hand on the wheel, the other firing
  holdHands(t, o) { const s = o.still ? legacy('idle', t + (o.phase ?? 0), {}) : POSES.walk(t, o), out = o.reach ?? .2; if ((o.side ?? 'left') === 'left') s.pivots.leftShoulder = [-.04, 0, -out]; else s.pivots.rightShoulder = [-.2, 0, out]; return s; },   // the two fists side by side, one a little ahead (no coplanar overlap)
  // taped up: legs together, arms pinned; a waddle — hops side to side, the body rolling over each foot (period 0.6 s)
  waddle(t) { const w = 2 * PI * t / .6, r = Math.sin(w), hop = Math.abs(Math.sin(w)); return make({leftHip: [.08 * r, 0, -.04], rightHip: [-.08 * r, 0, .04], leftShoulder: [0, 0, -.03], rightShoulder: [0, 0, .03], head: [.04, 0, -.1 * r]}, {roll: .15 * r, dy: .16 * hop, dx: .12 * r, lean: -.03}); },
  slump: () => make({head: [.48, 0, 0], rightShoulder: [.15, 0, .1], leftShoulder: [.15, 0, -.1]}, {lean: .13, dy: -.06}),
};
export const SNAPPY = ['shrug', 'facepalm', 'armsCrossed', 'heroPose', 'fistPump', 'pointUp', 'thinker', 'gaspHands', 'doubleTake', 'flail', 'slump'];
export const SNAP_FADE_FRAMES = 2;   // a key with {snap: true} lands in 2 frames (at the episode's fps)
export const POSE_NAMES = Object.keys(POSES);

export function samplePose(name, t, opts = {}) {
  if (!POSES[name]) throw Error('unknown pose ' + name);
  if (!Number.isFinite(t) || t < 0) throw Error('pose time must be finite and ≥ 0');
  return POSES[name](t, opts);
}

export function blendPoses(a, b, w, {extrapolate = false} = {}) {   // Look 5b: extrapolate lets an overshooting weight (> 1) through
  const s = blank(); w = extrapolate ? w : clamp01(w);
  for (const p of PIVOTS) s.pivots[p] = a.pivots[p].map((v, i) => v + (b.pivots[p][i] - v) * w);
  for (const k of Object.keys(s.root)) s.root[k] = a.root[k] + (b.root[k] - a.root[k]) * w;
  if (a.offsets || b.offsets) { s.offsets = {}; for (const h of ['leftHip', 'rightHip']) { const x = a.offsets?.[h] ?? [0, 0, 0], y = b.offsets?.[h] ?? [0, 0, 0]; s.offsets[h] = x.map((v, i) => v + (y[i] - v) * w); } }
  return s;
}

// keys: [[t0, 'pose', opts?], ...] sorted by t0. Pure: the pose at t depends only on t.
export function sampleTimeline(keys, t, {fade = FADE, overshoot = null} = {}) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const [t0, name, o = {}] = keys[i], cur = samplePose(name, Math.max(0, t - t0), o);
  if (o.snap) fade = SNAP_FADE_FRAMES / (o.fps ?? 24);   // format v5: snappy key (opt-in per key)
  if (overshoot) fade += overshoot.settle;   // Look 5b (opt-in): the change overshoots by overshoot.os and settles (engine/motion5b.js)
  if (i === 0 || t - t0 >= fade) return cur;
  const [p0, pn, po = {}] = keys[i - 1];
  if (overshoot) return blendPoses(samplePose(pn, Math.max(0, t - p0), po), cur, overshoot.ease((t - t0) / fade), {extrapolate: true});
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
