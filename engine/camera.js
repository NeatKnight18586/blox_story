// engine/camera.js — pure camera sampler for v2 episodes (docs/V2_BRIEF.md §5.2, §5.3 openHit).
// sampleCamera(shot, localT, actorPositions) → {position, target, fov, roll}. No THREE, no clock, no
// Math.random: the same inputs always give the same camera, in Node and in the browser.
//
// Shot fields (all optional except move/from):
//   move: push | pull | orbit | track | crane | whip | gamecam | static-drift
//   from/to: {position:[x,y,z], target:[x,y,z], fov}   (track/gamecam: offsets from the followed actor)
//   duration (s), ease, follow (actor name), followOffset, drift (units), seed,
//   degrees (orbit sweep), heading/distance/height (gamecam), start (episode frame), openHit (bool), fps.
// A4 moves: drone {path: [[x,y,z]…≥3], targets?: [[x,y,z]…] | lookAhead (s), bankDeg} — a Catmull-Rom fly-over (3–5 s)
//   that banks into its turns · heroLow {ground} — from/to with the camera clamped 0.6–1.2 above `ground`, fov 60–70, looking up
//   · snap {snapAt} — a 2-frame punch from the wide `from` to the close `to` along the SAME axis (target → camera), then
//   holds · tiltUp — the camera stays (or rises gently) while the target climbs from feet (from.target) to sky (to.target).

export const FPS = 30;
export const MOVES = ['push', 'pull', 'orbit', 'track', 'crane', 'whip', 'gamecam', 'static-drift', 'drone', 'heroLow', 'snap', 'tiltUp'];   // last four: A4
// Format v5 (Phase 3a) camera grammar, opt-in by name; the moves above are unchanged.
export const MOVES5 = ['crashZoom', 'topDown', 'splitScreen', 'lowAuthority', 'aisleTrack'];
MOVES.push(...MOVES5);
export const CRASH = {frames: 5, overshoot: .06, push: .04};       // crashZoom: fov from→to in 5 frames with a 6 % overshoot, 4 % dolly in
export const TOPDOWN = {tiltDeg: 3, degrees: 40};                  // topDown: ~straight down (3° off so 'up' stays defined), slow turn
export const SPLIT = {maxDur: 3};                                  // splitScreen: two half-frame cameras, ≤ 3 s
export const LOW_AUTH = {maxH: .8, minFov: 28, maxFov: 40, minUpDeg: 8, push: .03};   // lowAuthority: low, long lens, looking up

export const HERO_LOW = {minH: .6, maxH: 1.2, minFov: 60, maxFov: 70, fov: 66};
export const DRONE = {minDur: 3, maxDur: 5, bankDeg: 8};
export const SNAP_FRAMES = 2;
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
  if (!f.position) return {...f};   // A4 drone: no from/to poses
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

// Centripetal-free uniform Catmull-Rom through points (pure), u in [0, 1] over the whole path.
export function catmull(points, u) {
  const n = points.length - 1, x = Math.min(n - 1e-9, Math.max(0, u * n)), i = Math.floor(x), t = x - i;
  const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n, i + 2)];
  return [0, 1, 2].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
}
// Drone bank (radians): proportional to how fast the horizontal heading turns, capped at bankDeg.
export function droneBank(points, u, bankDeg = DRONE.bankDeg) {
  const e = .01, a = catmull(points, Math.max(0, u - e)), b = catmull(points, u), c = catmull(points, Math.min(1, u + e));
  const h1 = Math.atan2(b[0] - a[0], b[2] - a[2]), h2 = Math.atan2(c[0] - b[0], c[2] - b[2]);
  let dh = h2 - h1; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  const cap = bankDeg * Math.PI / 180; return Math.max(-cap, Math.min(cap, -dh * 6));
}
const clampHeroLow = (pose, ground) => ({...pose, position: [pose.position[0], ground + Math.min(HERO_LOW.maxH, Math.max(HERO_LOW.minH, pose.position[1] - ground)), pose.position[2]],
  fov: Math.min(HERO_LOW.maxFov, Math.max(HERO_LOW.minFov, pose.fov ?? HERO_LOW.fov))});

// ---- A5 §F: framing that fills the phone (pure) ----------------------------------------------------------------
export const FRAMING = {close: .45, medium: .30, heroLow: .30, groundMax: .28};
export const FIT_MOVES = ['heroLow', 'snap', 'push', 'orbit'];
// Distance at which a span of height `spanH` fills `frac` of the frame height at vertical fov `fovDeg`.
export const fitDistance = (spanH, frac, fovDeg) => spanH / (2 * Math.tan(fovDeg * Math.PI / 360) * frac);
// The part of an actor of height H a fit frames: 'head' = head and shoulders (0.6 H → 1.02 H), else the full actor.
export const fitSpan = (part, H) => part === 'head' ? {lo: .6 * H, hi: 1.02 * H} : {lo: 0, hi: 1.02 * H};
// fit {actor, height (frame fraction), part: 'full'|'head', y: screen y of the subject centre (0 top), h: actor height}
// → the pose moved along its own view direction so the subject's on-screen height = fit.height; the target sits above the
// subject centre so the centre lands at screen y (full-body shots default 0.6, which keeps empty ground ≤ 28 %).
export function applyFit(pose, fit, actorPos, H = fit.h ?? 5.3) {
  const {lo, hi} = fitSpan(fit.part, H), span = hi - lo, fov = pose.fov ?? 40, d = fitDistance(span, fit.height, fov);
  const yc = fit.y ?? (fit.part === 'head' ? .5 : .6), frameH = span / fit.height, centre = [actorPos[0], actorPos[1] + (lo + hi) / 2, actorPos[2]];
  const target = [centre[0], centre[1] + (yc - .5) * frameH, centre[2]];
  const dir = sub(pose.position, pose.target), l = len(dir) || 1;
  return {...pose, position: add(centre, scale(dir, d / l)), target, fov};
}
// Framing check (pure): {size, subjectFrac (on-screen height of the framed part), groundGap (frame fraction below the feet,
// 0 when they are off-frame), spectacle} → {ok, need, issues}.
export function framingCheck({size, move, subjectFrac, groundGap = 0, spectacle = false}) {
  const need = size === 'close' ? FRAMING.close : (size === 'medium' || move === 'heroLow') ? FRAMING.medium : 0, issues = [];
  if (need && subjectFrac < need) issues.push(`subject ${(subjectFrac * 100).toFixed(1)} % < ${need * 100} %`);
  if (!spectacle && groundGap > FRAMING.groundMax) issues.push(`empty ground ${(groundGap * 100).toFixed(1)} % > ${FRAMING.groundMax * 100} %`);
  return {ok: !issues.length, need, issues};
}

export function sampleCamera(shot, localT, actorPositions = {}) {
  if (!MOVES.includes(shot.move)) throw Error(`unknown camera move: ${shot.move}`);
  if (MOVES5.includes(shot.move)) return sampleMove5(shot, localT, actorPositions);
  const dur = Math.max(1e-6, shot.duration ?? 1), ease = EASE[shot.ease ?? 'inOutCubic'];
  if (!ease) throw Error(`unknown ease: ${shot.ease}`);
  const u = ease(clamp01(localT / dur));
  let f = shot.from, e = endPose(shot); const actor = shot.follow ? actorPositions[shot.follow] : null;
  const fa = shot.fit && FIT_MOVES.includes(shot.move) ? actorPositions[shot.fit.actor] : null;   // A5 §F
  if (fa) {
    if (shot.move === 'snap') e = applyFit(e, shot.fit, fa);
    else if (shot.move === 'push') { f = applyFit(f, shot.fit, fa); e = shot.to ? applyFit(e, shot.fit, fa) : {position: lerp3(f.position, f.target, DEFAULT_PUSH), target: f.target, fov: f.fov}; }
    else { f = applyFit(f, shot.fit, fa); e = applyFit(e, shot.fit, fa); }
  }
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
  } else if (shot.move === 'drone') {
    const pts = shot.path, uu = EASE[shot.ease ?? 'inOutSine'](clamp01(localT / dur));
    if (!pts || pts.length < 3) throw Error('drone needs a path of ≥ 3 points');
    position = catmull(pts, uu);
    target = shot.targets ? catmull(shot.targets.length > 2 ? shot.targets : [shot.targets[0], lerp3(shot.targets[0], shot.targets.at(-1), .5), shot.targets.at(-1)], uu)
      : (() => { const ahead = catmull(pts, Math.min(1, uu + (shot.lookAhead ?? .6) / dur)), d = sub(ahead, position), l = len(d) || 1; return add(position, add(scale(d, 10 / l), [0, -(shot.lookDown ?? 3), 0])); })();
    const roll = droneBank(pts, uu, shot.bankDeg ?? DRONE.bankDeg);
    const [dp2, dt2] = drift(shot.seed ?? 1, localT, shot.drift ?? 0), hit2 = openHitOffset(shot, localT);
    return {position: add(add(position, dp2), hit2.pos), target: add(add(target, dt2), hit2.target), fov: fov * hit2.fovScale, roll: roll + hit2.roll};
  } else if (shot.move === 'heroLow') {
    const g = shot.ground ?? 0, a = clampHeroLow(f, g), b = clampHeroLow(e, g);
    position = lerp3(a.position, b.position, u); target = lerp3(a.target, b.target, u); fov = lerp(a.fov, b.fov, u);
  } else if (shot.move === 'snap') {
    // same axis: the close pose sits on the line from the target back to the wide camera
    const fps = shot.fps ?? FPS, k = clamp01((Math.round(localT * fps) - Math.round((shot.snapAt ?? 0) * fps)) / SNAP_FRAMES);
    const tgt = e.target, d = sub(f.position, tgt), far = len(d), close = shot.closeDist ?? len(sub(e.position, tgt)), dir = scale(d, 1 / far);
    position = add(tgt, scale(dir, lerp(far, close, k))); target = lerp3(f.target, tgt, k); fov = lerp(f.fov ?? 40, e.fov ?? f.fov ?? 40, k);
  } else if (shot.move === 'tiltUp') {
    // the camera barely moves (≤ its own from→to rise); the look direction climbs from the feet to the sky
    position = lerp3(f.position, e.position, u); target = lerp3(f.target, e.target, u);
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
export const speedOk = (shot, actorsAt, fps) => shot.move === 'whip' || shot.move === 'snap' || maxTargetSpeed(shot, actorsAt, fps) <= SPEED_CAP;   // A4: snap is exempt like whip

// ---- format v5 moves (pure) ----------------------------------------------------------------------------------------------
// crashZoom: locked-off camera; at `zoomAt` (s) the fov snaps from→to in CRASH.frames with an overshoot, and a small dolly in.
// topDown: above `from.target` at `height` (default from.position height), looking down, turning `degrees` over the shot.
// splitScreen: {split: [camA, camB]} — top and bottom halves, each sampled as a push from `a`/`b` ({from, to}).
// lowAuthority: from/to clamped low (≤ 0.8 above `ground`), long lens (28–40°), looking up ≥ 8°, a slow 3 % push.
// aisleTrack: constant speed along from.position → to.position, looking down the aisle (target moves with it).
export function sampleMove5(shot, localT, actorPositions = {}) {
  const dur = Math.max(1e-6, shot.duration ?? 1), f = shot.from, e = shot.to ?? shot.from, k = clamp01(localT / dur), fps = shot.fps ?? FPS;
  if (shot.move === 'crashZoom') {
    const n = Math.round(localT * fps) - Math.round((shot.zoomAt ?? 0) * fps), x = clamp01(n / CRASH.frames);
    const over = x < 1 ? EASE.outBack(x) : 1, fov = lerp(f.fov ?? 40, e.fov ?? 20, over), pos = lerp3(f.position, f.target, CRASH.push * clamp01(n / CRASH.frames));
    return {position: pos, target: f.target, fov: Math.max(5, fov), roll: 0};
  }
  if (shot.move === 'topDown') {
    const c = f.target, h = shot.height ?? (f.position[1] - c[1]), a = ((shot.startDeg ?? 0) + (shot.degrees ?? TOPDOWN.degrees) * k) * Math.PI / 180, off = h * Math.tan(TOPDOWN.tiltDeg * Math.PI / 180);
    return {position: [c[0] + Math.sin(a) * off, c[1] + h, c[2] + Math.cos(a) * off], target: c, fov: lerp(f.fov ?? 45, e.fov ?? f.fov ?? 45, k), roll: 0};
  }
  if (shot.move === 'splitScreen') {
    const half = side => { const s = shot[side], u = EASE.inOutSine(k), a = s.from, b = s.to ?? s.from; return {position: lerp3(a.position, b.position, u), target: lerp3(a.target, b.target, u), fov: lerp(a.fov ?? 40, b.fov ?? a.fov ?? 40, u), roll: 0}; };
    const A = half('a'); return {...A, split: [A, half('b')]};
  }
  if (shot.move === 'lowAuthority') {
    const g = shot.ground ?? 0, clampP = p => { const pos = [p.position[0], Math.min(p.position[1], g + LOW_AUTH.maxH), p.position[2]], t = [...p.target];
      const dx = Math.hypot(t[0] - pos[0], t[2] - pos[2]), minRise = Math.tan(LOW_AUTH.minUpDeg * Math.PI / 180) * dx; if (t[1] - pos[1] < minRise) t[1] = pos[1] + minRise;
      return {position: pos, target: t, fov: Math.min(LOW_AUTH.maxFov, Math.max(LOW_AUTH.minFov, p.fov ?? 34))}; };
    const a = clampP(f), b0 = shot.to ? clampP(e) : {position: lerp3(a.position, a.target, LOW_AUTH.push), target: a.target, fov: a.fov}, u = EASE.inOutSine(k);
    const pos = lerp3(a.position, b0.position, u); pos[1] = Math.min(pos[1], g + LOW_AUTH.maxH);   // the push never lifts it out of the low band
    return {position: pos, target: lerp3(a.target, b0.target, u), fov: lerp(a.fov, b0.fov, u), roll: 0};
  }
  if (shot.move === 'aisleTrack') {
    const p = lerp3(f.position, e.position, k), dir = sub(e.position, f.position), l = len(dir) || 1, ahead = shot.lookAhead ?? 8, dy = (f.target?.[1] ?? p[1]) - f.position[1];
    const follow = shot.follow ? actorPositions[shot.follow] : null;
    const target = follow ? add(follow, shot.followOffset ?? [0, 3.2, 0]) : add(p, [dir[0] / l * ahead, dy, dir[2] / l * ahead]);
    return {position: p, target, fov: f.fov ?? 45, roll: 0};
  }
  throw Error('unknown v5 move ' + shot.move);
}
