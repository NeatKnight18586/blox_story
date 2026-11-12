// engine/camera.js — pure camera sampler for v2 episodes (docs/V2_BRIEF.md §5.2, §5.3 openHit).
// sampleCamera(shot, localT, actorPositions) → {position, target, fov, roll}. No THREE, no clock, no
// Math.random: the same inputs always give the same camera, in Node and in the browser.
//
// Shot fields (all optional except move/from):
//   move: push | pull | orbit | track | crane | whip | gamecam | static-drift
//   from/to: {position:[x,y,z], target:[x,y,z], fov}   (track/gamecam: offsets from the followed actor)
//   duration (s), ease, follow (actor name), followOffset, drift (units), seed,
//   degrees (orbit sweep), heading/distance/height (gamecam), start (episode frame), openHit (bool), fps.

export const FPS = 30;
export const MOVES = ['push', 'pull', 'orbit', 'track', 'crane', 'whip', 'gamecam', 'static-drift'];
export const ASPECT = 9 / 16;
export const SPEED_CAP = .35;                 // max target speed, fraction of frame width per second
export const OPEN_HIT = {frames: 8, punch: .07, amp: .05, hz: 18, decay: 14, rollDeg: .5};
export const DEFAULT_PUSH = .055;             // a shot with no `to` gets a 5.5 % push (brief: 4–7 %)

export const EASE = {
  linear: x => x,
  inCubic: x => x * x * x,
  outCubic: x => 1 - (1 - x) ** 3,
  inOutCubic: x => (x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; },
};

const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = a => Math.hypot(a[0], a[1], a[2]);

// Small deterministic PRNG (mulberry32) for seeded drift/shake phases.
export function rng(seed = 1) {
  let s = (Math.floor(seed) >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Default `to` for a shot that names only `from`: a gentle push toward the target.
function endPose(shot) {
  const f = shot.from;
  if (shot.to) return {position: shot.to.position ?? f.position, target: shot.to.target ?? f.target, fov: shot.to.fov ?? f.fov};
  const k = shot.move === 'pull' ? -DEFAULT_PUSH : DEFAULT_PUSH;
  return {position: lerp3(f.position, f.target, k), target: f.target, fov: f.fov};
}

// Seeded low-frequency sway (0.15–0.45 Hz), amplitude in world units.
function drift(seed, t, amp) {
  if (!amp) return [[0, 0, 0], [0, 0, 0]];
  const r = rng(seed * 7919 + 13), w = [0, 1, 2].map(() => [.15 + r() * .3, r() * Math.PI * 2]);
  const p = w.map(([hz, ph], i) => amp * (i === 1 ? .5 : 1) * Math.sin(2 * Math.PI * hz * t + ph));
  return [p, scale(p, .35)];
}

// openHit: punch-in + damped micro-shake on the first 8 frames of episode frame 0 only.
// Returns zero offsets (exactly) for every other frame and every other shot.
export function openHitOffset(shot, localT) {
  const zero = {fovScale: 1, pos: [0, 0, 0], target: [0, 0, 0], roll: 0};
  if (!shot.openHit || (shot.start ?? 0) !== 0) return zero;
  const fps = shot.fps ?? FPS, frame = Math.round(localT * fps);
  if (frame >= OPEN_HIT.frames || frame < 0) return zero;
  const t = frame / fps, x = frame / OPEN_HIT.frames;
  const taper = Math.cos(x * Math.PI / 2);               // lands exactly at 0 by frame 8
  const env = Math.exp(-OPEN_HIT.decay * t) * taper;
  const r = rng((shot.seed ?? 1) * 31 + 7), ph = [r(), r(), r(), r()].map(v => v * Math.PI * 2);
  const osc = i => Math.sin(2 * Math.PI * OPEN_HIT.hz * t + ph[i]);
  const pos = [OPEN_HIT.amp * env * osc(0), OPEN_HIT.amp * env * osc(1), OPEN_HIT.amp * .5 * env * osc(2)];
  return {
    fovScale: 1 - OPEN_HIT.punch * (1 - EASE.outCubic(x)),
    pos, target: scale(pos, .6),
    roll: OPEN_HIT.rollDeg * Math.PI / 180 * env * osc(3),
  };
}

export function sampleCamera(shot, localT, actorPositions = {}) {
  if (!MOVES.includes(shot.move)) throw Error(`unknown camera move: ${shot.move}`);
  const dur = Math.max(1e-6, shot.duration ?? 1), ease = EASE[shot.ease ?? 'inOutCubic'];
  if (!ease) throw Error(`unknown ease: ${shot.ease}`);
  const u = ease(clamp01(localT / dur));
  const f = shot.from, e = endPose(shot), actor = shot.follow ? actorPositions[shot.follow] : null;
  let position, target, fov = lerp(f.fov ?? 40, e.fov ?? f.fov ?? 40, u);

  if (shot.move === 'orbit') {
    // Sweep `degrees` around the target at constant radius; height and fov ease from→to.
    const centre = actor ? add(actor, shot.followOffset ?? [0, 3, 0]) : lerp3(f.target, e.target, u);
    const rel = sub(f.position, f.target), r = Math.hypot(rel[0], rel[2]);
    const a0 = Math.atan2(rel[0], rel[2]), a = a0 + (shot.degrees ?? 30) * Math.PI / 180 * u;
    const h = lerp(rel[1], sub(e.position, e.target)[1], u);
    position = [centre[0] + Math.sin(a) * r, centre[1] + h, centre[2] + Math.cos(a) * r]; target = centre;
  } else if (shot.move === 'track') {
    // from/to positions and targets are offsets from the followed actor.
    const base = actor ?? [0, 0, 0];
    position = add(base, lerp3(f.position, e.position, u)); target = add(base, lerp3(f.target, e.target, u));
  } else if (shot.move === 'gamecam') {
    // Third-person game camera: behind and above the actor, looking a little ahead of them.
    const base = actor ?? f.target, hd = (shot.heading ?? 0) * Math.PI / 180;
    const back = shot.distance ?? 9, up = shot.height ?? 5.5, fwd = [Math.sin(hd), 0, Math.cos(hd)];
    position = add(base, [-fwd[0] * back, up, -fwd[2] * back]); target = add(base, [fwd[0] * 3, 2.6, fwd[2] * 3]);
    fov = shot.from.fov ?? 67;
  } else {
    // push, pull, crane, whip, static-drift: eased interpolation from→to.
    position = lerp3(f.position, e.position, u); target = lerp3(f.target, e.target, u);
    if (actor) { const t2 = add(actor, shot.followOffset ?? [0, 3, 0]); position = add(t2, sub(position, target)); target = t2; }
  }

  const [dp, dt] = drift(shot.seed ?? 1, localT, shot.drift ?? (shot.move === 'static-drift' ? .15 : 0));
  const hit = openHitOffset(shot, localT);
  return {position: add(add(position, dp), hit.pos), target: add(add(target, dt), hit.target), fov: fov * hit.fovScale, roll: hit.roll};
}

// Vertical fov (deg) → horizontal fov (rad) for the 9:16 frame.
export const hfov = (fovDeg, aspect = ASPECT) => 2 * Math.atan(Math.tan(fovDeg * Math.PI / 360) * aspect);

// Peak pan speed across the shot: how fast the look direction (camera → target) turns, as a fraction
// of the frame per second (pan vs width, tilt vs height) (plan.js gate: ≤ 35 % outside a whip). A camera that travels with
// the subject it follows does not pan, so tracking a walker reads as still; a swing across the
// scene does.
export function maxTargetSpeed(shot, actorsAt = () => ({}), fps = FPS) {
  const n = Math.max(1, Math.round((shot.duration ?? 1) * fps));
  const dir = c => { const d = sub(c.target, c.position), l = len(d); return scale(d, 1 / l); };
  let peak = 0, prev = sampleCamera(shot, 0, actorsAt(0));
  for (let i = 1; i <= n; i++) {
    const t = i / fps, c = sampleCamera(shot, t, actorsAt(t)), a = dir(prev), b = dir(c);
    // Pans are measured against the frame width, tilts against the frame height (9:16 is tall).
    let yaw = Math.atan2(b[0], b[2]) - Math.atan2(a[0], a[2]); yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const pitch = Math.asin(Math.max(-1, Math.min(1, b[1]))) - Math.asin(Math.max(-1, Math.min(1, a[1])));
    peak = Math.max(peak, Math.abs(yaw) * Math.cos(Math.asin(Math.min(1, Math.abs(b[1])))) * fps / hfov(c.fov), Math.abs(pitch) * fps / (c.fov * Math.PI / 180));
    prev = c;
  }
  return peak;
}
export const speedOk = (shot, actorsAt, fps) => shot.move === 'whip' || maxTargetSpeed(shot, actorsAt, fps) <= SPEED_CAP;
