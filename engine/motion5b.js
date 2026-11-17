// engine/motion5b.js — Look 5b motion (pure maths; the renderer applies it). Opt-in: spec `look5b` (engine/episode.js).
//   overshootEase(u, os)        pose-change weight 0 → 1 that overshoots by `os` (10–15 %) and settles to exactly 1 at u = 1
//   breathe(seed, t)            idle breathing: torso scale 1 + .6 % · sin, 3.5 s period, per-actor phase from the seed
//   springLag(signal, t, cfg)   a damped spring hanging from a moving part (pompom, hoodie strings): the convolution of the
//                               part's motion increments with the spring's step-response error — pure in t, no state
//   camNoise(t, seed, deg)      camera micro-noise for static shots: [pitch, yaw] in radians, |·| ≤ deg, smooth sum of sines
export const OVERSHOOT = {os: .12, settle: .3};
export const BREATHE = {amp: .006, period: 3.5};
export const SPRING = {f: 2.2, zeta: .22, window: 1.6, dt: 1 / 48};
export const CAM_NOISE = {deg: .15};
const rnd = (seed, k) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// Under-damped second-order step response with peak overshoot `os`, time-scaled so the response rises and settles inside
// [0, 1], then bent so that f(1) = 1 exactly (no jump when the blend window ends).
export function overshootEase(u, os = OVERSHOOT.os) {
  if (u <= 0) return 0; if (u >= 1) return 1;
  const L = Math.log(os), zeta = -L / Math.sqrt(Math.PI * Math.PI + L * L), wd = 2.4 * Math.PI, wn = wd / Math.sqrt(1 - zeta * zeta);   // peak at u = π / wd ≈ .42
  const step = x => 1 - Math.exp(-zeta * wn * x) * (Math.cos(wd * x) + zeta * wn / wd * Math.sin(wd * x));
  return step(u) + (1 - step(1)) * u * u * u;
}
export const overshootPeak = (os = OVERSHOOT.os, n = 400) => { let m = 0; for (let i = 0; i <= n; i++) m = Math.max(m, overshootEase(i / n, os)); return m; };

// Breathing: scale factor for the torso (1 ± amp), phase seeded per actor.
export const breathe = (seed, t, {amp = BREATHE.amp, period = BREATHE.period} = {}) => 1 + amp * Math.sin(2 * Math.PI * (t / period + rnd(seed, 7)));

// Step-response error of the spring: 1 at τ = 0 (the hanging part has not moved yet), → 0 with a damped wobble.
export function springKernel(tau, {f = SPRING.f, zeta = SPRING.zeta} = {}) {
  if (tau < 0) return 0; const wn = 2 * Math.PI * f, wd = wn * Math.sqrt(1 - zeta * zeta);
  return Math.exp(-zeta * wn * tau) * (Math.cos(wd * tau) + zeta * wn / wd * Math.sin(wd * tau));
}
// Lag of a hanging part behind its anchor: signal(t) → number (an anchor angle); returns −Σ Δsignal_k · kernel(τ_k) over the
// last `window` seconds (Δ over steps of dt). A step of the anchor by A gives a lag of −A that rings out to 0.
export function springLag(signal, t, cfg = {}) {
  const {window = SPRING.window, dt = SPRING.dt} = cfg, n = Math.ceil(window / dt); let lag = 0, prev = signal(t);
  for (let k = 0; k < n; k++) { const s = signal(t - (k + 1) * dt), d = prev - s; prev = s; lag -= d * springKernel(k * dt + dt / 2, cfg); }
  return lag;
}
// Camera micro-noise (static shots): two incommensurate sines per axis, max amplitude `deg` (radians out).
export function camNoise(t, seed = 1, deg = CAM_NOISE.deg) {
  const r = deg * Math.PI / 180, ax = k => .62 * Math.sin(2 * Math.PI * (.31 * t + rnd(seed, k))) + .38 * Math.sin(2 * Math.PI * (.83 * t + rnd(seed, k + 1)));
  return [r * ax(1), r * ax(3)];
}
// Motion blur sub-frames (whip / crashZoom only): the frame offsets (in frames) whose renders are averaged.
export const BLUR_MOVES = ['whip', 'crashZoom'];
export const blurOffsets = (move, on = true) => on && BLUR_MOVES.includes(move) ? [0, -.5] : [0];
