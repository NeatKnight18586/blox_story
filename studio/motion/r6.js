// Roblox-classic (R6-style) motion for the six-part rig: rigid limbs swinging
// from shoulders/hips, arms opposite legs, no knees or elbows. Every function
// is a pure function of time, so any frame renders identically in any order.
// Style: limbs and faces may be stepped "on twos" (15 poses/s, 2D-animation
// feel) while root travel and camera stay smooth at 30fps.

export const onTwos = t => Math.floor(t * 15 + 1e-6) / 15;
const TAU = Math.PI * 2;
export const ease = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const lerp = (a, b, t) => a + (b - a) * t;

export const GAITS = {
  walk: {period: 1.0, swing: .58, arm: .62, lean: 0},
  child_walk: {period: .66, swing: .58, arm: .66, lean: 0},
  run: {period: .56, swing: .9, arm: .95, lean: .12},
};

// Ground speed matched to the leg sweep: rigid leg (length 2·scale) sweeping ±swing.
export function gaitSpeed(gait, scale = 1) { const g = GAITS[gait]; return 8 * Math.sin(g.swing) / g.period * scale; }

function reset(a) { for (const p of Object.values(a.pivots)) p.rotation.set(0, 0, 0); }

// Place and pose a walker: travels from `from` along `dir` (unit [x,z]) starting at time t0.
export function locomote(a, t, {gait = 'walk', from, dir, t0 = 0, stopAt = Infinity, twos = true} = {}) {
  const g = GAITS[gait], s = a.root.scale.x, lt = Math.max(0, Math.min(t, stopAt) - t0);
  const dist = gaitSpeed(gait, s) * lt;
  const moving = t >= t0 && t < stopAt;
  reset(a);
  const ph = TAU * (twos ? onTwos(lt) : lt) / g.period, sw = moving ? Math.sin(ph) : 0;
  const A = g.swing * sw;
  a.pivots.leftHip.rotation.x = -A; a.pivots.rightHip.rotation.x = A;
  a.pivots.leftShoulder.rotation.x = g.arm * sw; a.pivots.rightShoulder.rotation.x = -g.arm * sw;
  a.pivots.leftShoulder.rotation.z = -.06; a.pivots.rightShoulder.rotation.z = .06;
  // Rigid legs: drop the root so the forward/back feet stay on the ground.
  const bob = -2 * (1 - Math.cos(A)) * s;
  a.root.position.set(from[0] + dir[0] * dist, from[1] + bob, from[2] + dir[1] * dist);
  a.root.rotation.set(moving ? g.lean : 0, Math.atan2(dir[0], dir[1]), 0);
  return a;
}

// Idle: breathing sway (on twos).
export function idle(a, t, {seed = 0, twos = true} = {}) {
  const tt = twos ? onTwos(t) : t, w = Math.sin(tt * 2.1 + seed);
  a.pivots.leftShoulder.rotation.set(.03 * w, 0, -.05 - .02 * w); a.pivots.rightShoulder.rotation.set(-.03 * w, 0, .05 + .02 * w);
  a.pivots.head.rotation.x = .02 * Math.sin(tt * 1.3 + seed);
  return a;
}
// Wave: right arm raised, hand rocking (on twos).
export function wave(a, t, {twos = true} = {}) { const tt = twos ? onTwos(t) : t; a.pivots.rightShoulder.rotation.set(-.1, 0, 2.65 + .32 * Math.sin(tt * 11)); return a; }
// Celebrate hop: both arms up, one jump over `dur` seconds starting at t0.
export function hop(a, t, t0, {dur = .45, height = .7, twos = true} = {}) {
  const u = ((twos ? onTwos(t) : t) - t0) / dur;
  if (u < 0) return a;
  const up = u < 1 ? Math.sin(Math.PI * u) : 0;
  a.root.position.y += height * up * a.root.scale.x;
  const arms = Math.min(1, u * 3);
  a.pivots.leftShoulder.rotation.set(0, 0, -2.5 * arms); a.pivots.rightShoulder.rotation.set(0, 0, 2.5 * arms);
  return a;
}
// Head turn toward a world point, eased in over `dur` from t0 (yaw only, clamped).
export function lookToward(a, t, t0, target, {dur = .3, max = .9} = {}) {
  const u = ease((t - t0) / dur); if (u <= 0) return a;
  const dx = target[0] - a.root.position.x, dz = target[2] - a.root.position.z;
  let yaw = Math.atan2(dx, dz) - a.root.rotation.y; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  a.pivots.head.rotation.y = Math.max(-max, Math.min(max, yaw)) * u; a.pivots.head.rotation.x = -.12 * u;
  return a;
}
