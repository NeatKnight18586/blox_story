// engine/cine.js — tuft 1B cinematic camera (opt-in spec `camera: 'cine'`). Pure: no three, no DOM, no clock, no Math.random.
// sampleCine(shot, localT, ctx) → {position, target, fov, roll, noise: [rx, ry, rz] (rad), lens, focus}. It wraps camera.js
// sampleCamera (the authored move) and adds, in order:
//   lens      shot `lens: 24|35|50|85` (mm on a 24 mm-wide 9:16 frame) → fov; default by size (ews/ws 24, ms 35, mcu 50, cu/ecu 85).
//             The camera slides along its view axis so the authored subject size holds (longer lens = further back, flatter).
//   ramp      shot `ramp: [{at, speed}]` remaps the move's clock (smoothstep between keys); actors keep their own time.
//   framing   ms/mcu/cu/ecu with a subject: eyes on the upper-third line, lead room toward the subject's facing, chin above
//             the caption band (58–74 % of the height). Aim only; the position stays the move's.
//   antic     a moving shot starts with a counter-move over its first ANTIC.frames frames.
//   body      a critically damped follower (natural frequency per mood) with jerk / acceleration / speed caps on the position,
//             an angular-speed cap on the aim; simulated from the shot's first frame (state = the frame-0 pose at rest), so
//             frame 0 is settled and a cut never shows a catch-up. dollyZoom rides its rails (size lock) under the same caps.
//   handheld  rotation-only seeded layered sines per mood (0.3–1.5 Hz), returned as `noise`, never moves the position.
// ctx: {actorsAt(tt) → {name: [x, y, z]} marks (follow moves), eyesAt(tt) → subject eye point | null, faceAt(tt) → subject
//       facing [x, z] | null, headH (world), aspect (w/h), fps, cacheKey (optional: lets a renderer resume the simulation;
//       the output is identical with or without it)}.
import {sampleCamera, dollyZoomPose, EASE} from './camera.js';

export const SENSOR_W = 24, SENSOR_V = 24 * 16 / 9;                       // mm; 9:16 frame, short side = 24 mm
export const LENSES = [24, 35, 50, 85];
export const LENS_BY_SIZE = {ews: 24, ws: 24, wide: 24, establishing: 24, ms: 35, medium: 35, mcu: 50, cu: 85, close: 85, ecu: 85};
export const lensFov = mm => 360 / Math.PI * Math.atan(SENSOR_V / (2 * mm));   // vertical fov, degrees
export const shotLens = shot => shot.lens ?? LENS_BY_SIZE[shot.size] ?? 35;
export const FRAMED = ['ms', 'medium', 'mcu', 'cu', 'close', 'ecu'];
export const FRAME = {eyesY: 1 / 3, lead: .16, capTop: .58, capBottom: .74, chinGap: .01, eyeToChin: .52};   // eyesY / capTop: fraction of the height from the top
// mood camera: spring natural frequency (Hz) and handheld peak (deg)
export const MOOD_CAM = {tension: {hz: 2.0, hand: .8}, emotion: {hz: .8, hand: .3}, awe: {hz: .9, hand: .3}, comedy: {hz: 1.6, hand: .3},
  fun: {hz: 1.4, hand: .3}, payoff: {hz: 1.2, hand: 0}, default: {hz: 1.2, hand: .2}};
export const CAPS = {speed: 12, accel: 24, jerk: 120, angSpeed: 60};      // world units /s, /s², /s³; degrees /s
export const ANTIC = {frames: 4, k: .02, max: .12};                       // counter-move: k × the move's whole travel, ≤ max units, against its first 0.25 s
export const SIM_HZ = 120;                                                // integration rate (divides 24 and 30 fps)
export const HAND_BANDS = [[.3, .5, .6], [.6, .95, .3], [1.05, 1.5, .1]]; // [f lo, f hi, weight]: weights sum to 1 → peak ≤ amplitude

const D = Math.PI / 180, clamp01 = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k], len = a => Math.hypot(a[0], a[1], a[2]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clampLen = (v, m) => { const l = len(v); return l > m ? scl(v, m / l) : v; };
export const moodCam = shot => MOOD_CAM[shot?.mood] ?? MOOD_CAM.default;

// ---- seeded numbers (mulberry32) --------------------------------------------------------------------------------------
export function rand(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- speed ramp: effective move time τ(t) = ∫ speed ---------------------------------------------------------------------
export function speedAt(ramp, t) {
  if (!ramp?.length) return 1;
  let k = [...ramp].sort((a, b) => a.at - b.at); if (k[0].at > 0) k = [{at: 0, speed: 1}, ...k];   // normal speed until the first key eases in
  if (t <= k[0].at) return k[0].speed;
  for (let i = 0; i < k.length - 1; i++) if (t < k[i + 1].at) return k[i].speed + (k[i + 1].speed - k[i].speed) * smooth((t - k[i].at) / Math.max(1e-6, k[i + 1].at - k[i].at));
  return k.at(-1).speed;
}
export function rampTime(ramp, t, dt = 1 / (4 * SIM_HZ)) {
  if (!ramp?.length) return t;
  let tau = 0; const n = Math.round(t / dt); for (let i = 0; i < n; i++) tau += speedAt(ramp, (i + .5) * dt) * dt; return tau + (t - n * dt) * speedAt(ramp, t);
}

// ---- handheld: rotation-only layered sines -------------------------------------------------------------------------------
export function handheld(shot, t, seed = 1) {
  const amp = shot.handheld ?? moodCam(shot).hand; if (!amp) return [0, 0, 0];
  const r = rand(seed * 7919 + 17), out = [0, 0, 0];
  for (let ax = 0; ax < 3; ax++) for (const [lo, hi, w] of HAND_BANDS) { const f = lo + (hi - lo) * r(), ph = 2 * Math.PI * r(); out[ax] += w * Math.sin(2 * Math.PI * f * t + ph); }
  return [out[0] * amp * D, out[1] * amp * D, out[2] * amp * .5 * D];   // pitch, yaw, roll (roll at half)
}

// ---- projection helpers (camera with up = +y, no roll, three.js lookAt convention) ------------------------------------
export function basis(position, target) {
  const f = norm(sub(target, position)); let r = cross(f, [0, 1, 0]); if (len(r) < 1e-6) r = [1, 0, 0]; r = norm(r); return {f, r, u: cross(r, f)};
}
// NDC of a world point: x right, y up, in [-1, 1]
export function project(cam, p, aspect) {
  const {f, r, u} = basis(cam.position, cam.target), e = sub(p, cam.position), z = dot(e, f), ty = Math.tan(cam.fov * D / 2), tx = ty * aspect;
  return {x: dot(e, r) / z / tx, y: dot(e, u) / z / ty, z};
}
const ndcToTop = y => (1 - y) / 2;   // NDC y → fraction of the height from the top
// aim the camera from `position` so the world point `p` lands at NDC (xn, yn): 2-D Newton on yaw / pitch
export function aimAt(position, p, xn, yn, fov, aspect) {
  const e = sub(p, position), dist = len(e); let yaw = Math.atan2(e[0], e[2]), pitch = Math.asin(e[1] / (dist || 1));
  const tgt = (yw, pt) => add(position, [Math.sin(yw) * Math.cos(pt) * dist, Math.sin(pt) * dist, Math.cos(yw) * Math.cos(pt) * dist]);
  const err = (yw, pt) => { const q = project({position, target: tgt(yw, pt), fov}, p, aspect); return [q.x - xn, q.y - yn]; };
  for (let i = 0; i < 6; i++) {
    const e0 = err(yaw, pitch), h = 1e-4, ey = err(yaw + h, pitch), ep = err(yaw, pitch + h);
    const J = [[(ey[0] - e0[0]) / h, (ep[0] - e0[0]) / h], [(ey[1] - e0[1]) / h, (ep[1] - e0[1]) / h]], det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    if (Math.abs(det) < 1e-12) break;
    yaw -= (J[1][1] * e0[0] - J[0][1] * e0[1]) / det; pitch -= (-J[1][0] * e0[0] + J[0][0] * e0[1]) / det;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));
  }
  return tgt(yaw, pitch);
}
// where the framing solver wants the eyes (NDC), from the camera, the subject's eyes, facing and head height
export function framingTarget(cam, eyes, face, headH, aspect, place = null) {
  const {r} = basis(cam.position, cam.target), fs = face ? face[0] * r[0] + face[1] * r[2] : 0, side = place === 'left' ? -1 : place === 'right' ? 1 : Math.abs(fs) > .25 ? Math.sign(fs) : 0;   // + = the subject looks screen-right; shot.side places it
  const xn = place ? side * FRAME.lead * 2 : -side * FRAME.lead * 2;   // lead room: the subject sits against its look (or on shot.side)
  const dist = len(sub(eyes, cam.position)), headFrac = headH / (2 * dist * Math.tan(cam.fov * D / 2));   // head height / frame height
  let top = FRAME.eyesY; const chin = top + FRAME.eyeToChin * headFrac; if (chin > FRAME.capTop - FRAME.chinGap) top -= chin - (FRAME.capTop - FRAME.chinGap);
  return {xn, yn: 1 - 2 * Math.max(.08, top), headFrac};
}

// ---- foreground layer (shot `fg`): one element near the lens on the non-subject third, fixed in the world at the shot's first
//      camera (so it parallaxes as the camera moves). → {kind, position (world), scale, cameraSpace: [x, y, z]}
export const FG = {lantern: {z: 2.8, yn: .55, xn: .95, s: .32}, post: {z: 2.1, yn: 0, xn: .7, s: 1}, leaves: {z: 1.3, yn: .68, xn: .6, s: .8}, crowd: {z: 2.3, yn: -.6, xn: .58, s: 1}};
export function fgPlace(kind, cam, subjectNdcX = 0, aspect = 9 / 16) {
  const g = FG[kind]; if (!g) throw Error('unknown fg ' + kind);
  const sx = subjectNdcX > .02 ? -1 : 1, ty = Math.tan(cam.fov * D / 2), tx = ty * aspect, x = sx * g.xn * tx * g.z, y = g.yn * ty * g.z;
  const {f, r, u} = basis(cam.position, cam.target);
  return {kind, cameraSpace: [x, y, -g.z], position: add(cam.position, add(add(scl(r, x), scl(u, y)), scl(f, g.z))), scale: g.s, side: sx};
}

// ---- focus (DOF): the subject's head distance; `rack: {to, at, dur}` eases (in dioptres) to another actor's head ---------
export function focusAt(shot, localT, headDist) {
  const d0 = headDist(shot.subject); if (!shot.rack) return d0;
  const k = EASE.inOutCubic(clamp01((localT - shot.rack.at) / Math.max(1e-6, shot.rack.dur ?? .6))); if (k <= 0) return d0;
  const d1 = headDist(shot.rack.to); return 1 / (1 / d0 + (1 / d1 - 1 / d0) * k);
}

// ---- the authored move under lens + ramp + framing + anticipation (no body dynamics) ------------------------------------
const NOFRAME = ['splitScreen', 'topDown', 'povScope', 'drone'];
export function idealAt(shot, tt, ctx) {
  const fps = ctx.fps ?? 30, tau = rampTime(shot.ramp, tt), base = sampleCamera({...shot, fps}, tau, ctx.actorsAt?.(tt) ?? {});
  if (base.split) return base;
  let {position, target, fov} = base;
  if (shot.move !== 'dollyZoom') {   // lens: the new fov, the camera slid along its axis so the subject at the target keeps its size
    const lf = lensFov(shotLens(shot)), f0 = (shot.from?.fov ?? fov), k = lf / f0, nf = fov * k;
    position = add(target, scl(sub(position, target), Math.tan(fov * D / 2) / Math.tan(nf * D / 2))); fov = nf;
  }
  const eyes = ctx.eyesAt?.(tt);
  if (eyes && shot.subject && FRAMED.includes(shot.size) && shot.frame !== false && !NOFRAME.includes(shot.move)) {
    const ft = framingTarget({position, target, fov}, eyes, ctx.faceAt?.(tt), ctx.headH ?? 1.2, ctx.aspect ?? 9 / 16, shot.side ?? null);
    target = aimAt(position, eyes, ft.xn, ft.yn, fov, ctx.aspect ?? 9 / 16);
  }
  return {position, target, fov, roll: base.roll ?? 0};
}
export function anticipation(shot, tt, ctx) {
  const fps = ctx.fps ?? 30, Ta = ANTIC.frames / fps; if (tt >= Ta || shot.antic === false || shot.move === 'dollyZoom') return [0, 0, 0];
  const a = idealAt(shot, 0, ctx).position, b = idealAt(shot, Math.min(.25, (shot.duration ?? 1)), ctx).position, e = idealAt(shot, shot.duration ?? 1, ctx).position, d = sub(b, a), l = len(d);
  if (l < 1e-3) return [0, 0, 0];
  const w = Math.sin(Math.PI * tt / Ta) ** 2; return scl(norm(d), -Math.min(ANTIC.max, ANTIC.k * len(sub(e, a))) * w);
}

// ---- body simulation (critically damped, capped) ------------------------------------------------------------------------
const CACHE = new Map();
function stepState(S, goal, w, dt, rails) {
  if (rails) {   // dollyZoom: on rails, still under the caps (it is authored inside them; the gate measures it)
    const v = scl(sub(goal.position, S.p), 1 / dt); S.a = scl(sub(v, S.v), 1 / dt); S.v = v; S.p = goal.position; S.q = goal.target; S.fov = goal.fov; S.roll = goal.roll; return;
  }
  const carrot = clampLen(sub(goal.position, S.p), .9 * 2 * CAPS.speed / w);   // a goal further than the steady lag of a capped-speed follow is pulled in
  let aDes = clampLen(add(scl(carrot, w * w), scl(S.v, -2 * w)), CAPS.accel);
  // speed cap without a jerk spike: brake through the (jerk-limited) acceleration before the speed reaches the cap
  const sp = len(S.v), al = len(S.a), vf = sp + Math.max(0, dot(S.a, norm(S.v))) * al / (2 * CAPS.jerk);
  if (sp > 1e-9 && vf > CAPS.speed * .96) { const u = norm(S.v), along = dot(aDes, u); if (along > -CAPS.accel * .25) aDes = sub(aDes, scl(u, along + CAPS.accel * .25)); }
  S.a = add(S.a, clampLen(sub(aDes, S.a), CAPS.jerk * dt)); S.a = clampLen(S.a, CAPS.accel);
  S.v = add(S.v, scl(S.a, dt)); S.p = add(S.p, scl(S.v, dt));
  // aim point: critically damped, then the view direction turns at most angSpeed
  const qa = add(scl(sub(goal.target, S.q), w * w), scl(S.qv, -2 * w)); S.qv = add(S.qv, scl(qa, dt)); let q = add(S.q, scl(S.qv, dt));
  const d0 = S.dir, dist = len(sub(q, S.p)), d1 = norm(sub(q, S.p)), ang = Math.acos(Math.max(-1, Math.min(1, dot(d0, d1)))), maxA = CAPS.angSpeed * D * dt;
  let d = d1; if (ang > maxA) { const k = maxA / ang, m = norm(add(scl(d0, 1 - k), scl(d1, k))); d = m; q = add(S.p, scl(d, dist)); }
  S.q = q; S.dir = d;
  const fa = (goal.fov - S.fov) * w * w - 2 * w * S.fv; S.fv += fa * dt; S.fov += S.fv * dt;
  S.roll += (goal.roll - S.roll) * Math.min(1, w * dt);
}
function initState(g) { return {i: 0, p: g.position, v: [0, 0, 0], a: [0, 0, 0], q: g.target, qv: [0, 0, 0], dir: norm(sub(g.target, g.position)), fov: g.fov, fv: 0, roll: g.roll}; }
export function bodyAt(shot, localT, ctx) {
  const w = 2 * Math.PI * (shot.springHz ?? moodCam(shot).hz), dt = 1 / SIM_HZ, n = Math.max(0, Math.round(localT * SIM_HZ)), rails = shot.move === 'dollyZoom';
  const goal = tt => { const g = idealAt(shot, tt, ctx); const an = anticipation(shot, tt, ctx); return an[0] || an[1] || an[2] ? {...g, position: add(g.position, an)} : g; };
  let S = ctx.cacheKey ? CACHE.get(ctx.cacheKey) : null;
  if (!S || S.i > n) S = initState(goal(0)); else S = {...S};
  for (let i = S.i + 1; i <= n; i++) stepState(S, goal(i * dt), w, dt, rails);
  S.i = n; if (ctx.cacheKey) CACHE.set(ctx.cacheKey, {...S});
  return S;
}
export const clearCache = () => CACHE.clear();

export function sampleCine(shot, localT, ctx = {}) {
  const g0 = idealAt(shot, 0, ctx); if (g0.split) return sampleCamera({...shot, fps: ctx.fps ?? 30}, localT, ctx.actorsAt?.(localT) ?? {});   // two cameras: authored as is
  const S = bodyAt(shot, localT, ctx), noise = handheld(shot, localT, (shot.seed ?? 1) + (shot.start ?? 0));
  return {position: S.p, target: S.q, fov: S.fov, roll: S.roll, noise, lens: shotLens(shot), velocity: S.v};
}

// ---- measures for the gates ----------------------------------------------------------------------------------------------
// positions sampled at fps → max speed, acceleration, jerk (finite differences) and max angular speed of the view (deg/s)
export function motionStats(shot, dur, ctx = {}, fps = 30) {
  const P = [], Dd = [], Da = []; for (let i = 0; i <= Math.round(dur * fps); i++) { const c = sampleCine(shot, i / fps, ctx); if (c.split) return null; P.push(c.position);
    const b = basis(c.position, c.target), n = c.noise; Da.push(b.f); Dd.push(norm(add(b.f, add(scl(b.u, n[0]), scl(b.r, -n[1]))))); }
  let vmax = 0, amax = 0, jmax = 0, wmax = 0, wa = 0; const h = 1 / fps, ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / D / h;
  for (let i = 1; i < P.length; i++) { vmax = Math.max(vmax, len(sub(P[i], P[i - 1])) / h); wmax = Math.max(wmax, ang(Dd[i], Dd[i - 1])); wa = Math.max(wa, ang(Da[i], Da[i - 1])); }
  for (let i = 2; i < P.length; i++) amax = Math.max(amax, len(add(sub(P[i], scl(P[i - 1], 2)), P[i - 2])) / h / h);
  for (let i = 3; i < P.length; i++) jmax = Math.max(jmax, len(sub(add(sub(P[i], scl(P[i - 1], 3)), scl(P[i - 2], 3)), P[i - 3])) / h / h / h);
  return {speed: vmax, accel: amax, jerk: jmax, angSpeed: wa, angSpeedHandheld: wmax};
}
// projected height of a subject of height H at `p` (fraction of the frame height)
export const sizeFrac = (cam, p, H) => H / (2 * len(sub(p, cam.position)) * Math.tan(cam.fov * D / 2));
