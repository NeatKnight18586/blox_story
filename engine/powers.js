// engine/powers.js — tuft 2B POWERS + PROPS maths (pure: no three, no DOM, no clock, no Math.random; every particle seeded, pure in t).
// FX run on ONES (sampled at the frame's own t). The renderer is engine/powersrt.js.
//   cyanFire   jets from both R6 palms (hand tips) along the actor's facing: a cone of faceted cyan flame cards + embers (also NIGHTFANG
//              `breathe`, from the jaw); a cyan light on nearby actors (intensity `fireLight`).
//   lightning  a sprint (root moves SPRINT.speed along the facing) + a yellow ribbon trail (past root positions) + 2–3 forked bolts.
//   fly        lift-off (root rises to FLY.h, ease) on an orange flame ribbon from the feet.
//   fizzle     the palms spit ONE grey smoke puff (no fire).   cage: reveal (cloth whips off the giant cage).   chains: snap (links fly).
export const POWERS = ['cyanFire', 'lightning', 'fly'];
export const FIRE = {rate: 48, life: .55, speed: 7.5, spread: .26, size: [.18, .75], embers: 28, light: 2.2, dur: 1.8};
export const BREATH = {rate: 100, life: 1.0, speed: 26, spread: .11, size: [.4, 2.2], embers: 70, light: 3.2, dur: 1.8, emberV: [14, 8]};   // P3: NIGHTFANG breath = a LONG cyan flame jet (≥ 1.5 body lengths)
export const BOLT = {n: [3, 4], segs: 8, len: [2.8, 5.2], jag: .5, fork: .85, hold: 2}, SPRINT = {speed: 8, dur: 1.4, trail: 22, dt: 1 / 48, ribbon: 1.0};   // P3: slower sprint (the runner stays readable), more forks, a wide ribbon
export const FLY = {h: 7, rise: 1.2, ribbon: 14, len: 2.4}, FIZZLE = {dur: .9}, CAGE = {dur: .9}, CHAINS = {n: 14, g: 30, e: .38, life: 3};
const cl = x => Math.max(0, Math.min(1, x)), sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
// seeded hash → [0, 1)
export const h1 = (...k) => { let a = 0x9e3779b9; for (const v of k) { a = Math.imul(a ^ Math.floor(v * 1000003 + 7), 0x85ebca6b); a ^= a >>> 13; a = Math.imul(a, 0xc2b2ae35); a ^= a >>> 16; } return (a >>> 0) / 4294967296; };
// flame cards of a jet started at t0 (jet-local: +z along the jet, origin at the emitter); [{p, s, a, k}] k = 0 core … 1 tip
export function fireCards(t0, t, seed = 1, dur = FIRE.dur, F = FIRE) {
  const out = [], tau = t - t0; if (tau < 0) return out; const n0 = Math.floor(Math.max(0, tau - F.life) * F.rate), n1 = Math.floor(Math.min(tau, dur) * F.rate);
  for (let i = n0; i <= n1; i++) { const born = i / F.rate, age = tau - born; if (age < 0 || age > F.life) continue;
    const u = age / F.life, r1 = h1(seed, i, 1), r2 = h1(seed, i, 2), a = 2 * Math.PI * r1, sp = F.spread * Math.sqrt(r2) * (.4 + u), d = F.speed * age * (.85 + .3 * h1(seed, i, 3));
    out.push({p: [Math.cos(a) * sp * d, Math.sin(a) * sp * d + .6 * u * u, d], s: F.size[0] + (F.size[1] - F.size[0]) * Math.sqrt(u), a: (1 - u) * (u < .08 ? u / .08 : 1), k: u, rot: 6.28 * h1(seed, i, 4) + 3 * age}); }
  return out; }
export function embers(t0, t, seed = 1, dur = FIRE.dur, F = FIRE) {
  const out = [], tau = t - t0; if (tau < 0) return out; const [v0, dv] = F.emberV ?? [4, 3];
  for (let i = 0; i < F.embers; i++) { const born = h1(seed, i, 9) * dur, age = tau - born, life = .9 + .6 * h1(seed, i, 10); if (age < 0 || age > life) continue;
    const a = 2 * Math.PI * h1(seed, i, 11), sp = .5 + .7 * h1(seed, i, 12), v = v0 + dv * h1(seed, i, 13), u = age / life;
    out.push({p: [Math.cos(a) * sp * age * 2, Math.sin(a) * sp * age * 2 + 1.2 * age - 1.4 * age * age, v * age], s: .06, a: 1 - u}); }
  return out; }
export const breathReach = (F = BREATH) => F.speed * F.life * 1.15;   // the jet's far tip (jet-local studs, before the preset scale)
export const fireLight = (t0, t, dur = FIRE.dur, F = FIRE) => { const tau = t - t0; return tau < 0 || tau > dur + .3 ? 0 : F.light * sm(tau / .12) * (1 - sm((tau - dur) / .3)) * (.85 + .15 * Math.sin(37 * tau)); };
// lightning: forked bolts around a centre, re-struck every BOLT.hold frames (on ones), world offsets from the sprinting actor
export function bolts(t0, t, seed = 1, fps = 24) {
  const tau = t - t0; if (tau < 0 || tau > SPRINT.dur + .25) return []; const f = Math.floor(tau * fps / BOLT.hold), n = BOLT.n[0] + (h1(seed, f, 0) < .5 ? 0 : 1), out = [];
  for (let b = 0; b < n; b++) { const yaw = 2 * Math.PI * h1(seed, f, b, 1), pitch = -.4 + .9 * h1(seed, f, b, 2), L = BOLT.len[0] + (BOLT.len[1] - BOLT.len[0]) * h1(seed, f, b, 3), dir = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
    const pts = [[0, 0, 0]]; for (let k = 1; k <= BOLT.segs; k++) { const u = k / BOLT.segs, j = k === BOLT.segs ? 0 : BOLT.jag; pts.push(dir.map((d, q) => d * L * u + (h1(seed, f, b, k, q) - .5) * j)); }
    out.push(pts); if (h1(seed, f, b, 99) < BOLT.fork) { const k0 = 2 + Math.floor(h1(seed, f, b, 98) * 3), p0 = pts[k0], fk = [p0]; for (let k = 1; k <= 3; k++) fk.push(p0.map((v, q) => v + dir[q] * .5 * k + (h1(seed, f, b, 50 + k, q) - .5) * .7)); out.push(fk); } }
  return out; }
export const sprintAt = (t0, t) => { const tau = cl((t - t0) / SPRINT.dur) * SPRINT.dur; return SPRINT.speed * (tau - .25 * SPRINT.dur * sm(tau / (.25 * SPRINT.dur)) * 0); };   // distance along the facing (s)
// fly: rise height at t (s), flame ribbon points below the feet (local y offsets)
export const flyRise = (t0, t) => FLY.h * sm((t - t0) / FLY.rise);
export function flyRibbon(t0, t, seed = 1) { const tau = t - t0; if (tau < 0) return []; const w = sm(tau / .2), out = [];
  for (let i = 0; i < FLY.ribbon; i++) { const u = i / (FLY.ribbon - 1); out.push({p: [(h1(seed, Math.floor(tau * 24), i) - .5) * .25 * u, -FLY.len * u * w * (1 + .15 * Math.sin(23 * tau + i)), 0], s: .55 * (1 - .7 * u), a: (1 - u) * w}); }
  return out; }
// fizzle: one grey puff — scale, opacity, rise
export const fizzleAt = (t0, t) => { const u = (t - t0) / FIZZLE.dur; if (u < 0 || u > 1) return null; return {s: .35 + .9 * sm(u), a: .85 * (1 - u) * sm(u / .1), y: .8 * u}; };
// cage cloth: 0 = covering, 1 = gone (lift + whip + fly away)
export const clothAt = (t0, t) => { const u = cl((t - t0) / CAGE.dur); return {u, lift: 14 * u * u, swing: 1.6 * sm(u) + .25 * Math.sin(18 * u) * (1 - u), away: 22 * u * u * u, visible: u < 1}; };
// chains snap: links fly out from the leg cuffs, fall and bounce (restitution CHAINS.e) on y = 0; seeded per link
export function chainPieces(t0, t, origins, seed = 1) {
  const tau = t - t0; if (tau < 0) return []; const out = [];
  origins.forEach((o, oi) => { for (let i = 0; i < CHAINS.n; i++) { const r = k => h1(seed, oi, i, k), a = 2 * Math.PI * r(1), v = 6 + 8 * r(2), vy = 6 + 9 * r(3);
    let y = o[1], vY = vy, tt = tau, x = o[0], z = o[2], bounces = 0; const vx = Math.cos(a) * v, vz = Math.sin(a) * v;
    // analytic bounces: fly arcs until rest
    let tl = tt, px = x, pz = z, damp = 1; while (tl > 0 && bounces < 6) { const disc = vY * vY + 2 * CHAINS.g * y, tHit = (vY + Math.sqrt(Math.max(0, disc))) / CHAINS.g;
      if (tl < tHit) { y = y + vY * tl - .5 * CHAINS.g * tl * tl; px += vx * damp * tl; pz += vz * damp * tl; tl = 0; break; }
      px += vx * damp * tHit; pz += vz * damp * tHit; tl -= tHit; y = 0; vY = Math.sqrt(Math.max(0, disc)) * CHAINS.e; damp *= .55; bounces++; if (vY < .4) { tl = 0; vY = 0; } }
    out.push({p: [px, Math.max(0, y), pz], rot: [r(4) * 6.28 + tau * 7 * (bounces < 6 ? 1 : 0), r(5) * 6.28, r(6) * 6.28], s: .55 + .35 * r(7), bounces}); } });
  return out; }
// lantern sea: n paper lanterns in a disc (radius R) drifting up and sideways, bobbing; pure in t
export function lanternAt(i, t, {R = 90, n = 1500, rise = .55, seed = 3} = {}) {
  const r = k => h1(seed, i, k), rad = R * Math.sqrt(r(1)), a = 2 * Math.PI * r(2), y0 = 6 + 40 * r(3), sp = rise * (.6 + .8 * r(4));
  return {p: [Math.cos(a) * rad + 1.2 * Math.sin(.21 * t + 6.28 * r(5)), y0 + sp * t + .3 * Math.sin(1.3 * t + 6.28 * r(6)), Math.sin(a) * rad + 1.2 * Math.cos(.17 * t + 6.28 * r(7))], s: .7 + .5 * r(8), yaw: 6.28 * r(9) + .2 * t, glow: .8 + .2 * Math.sin(2.1 * t + 6.28 * r(10))}; }
// ---- vocab ----------------------------------------------------------------------------------------------------------------------
const ID = /^[A-Za-z][A-Za-z0-9_]*$/;
export function parsePower(s) { const p = String(s).trim().split(/\s+/); if (p.length !== 2 || !ID.test(p[0]) || !POWERS.includes(p[1])) throw Error(`power: "${s}" — expected "<actor> <${POWERS.join('|')}> @ <word>"`); return {actor: p[0], kind: p[1]}; }
export function parseFizzle(s) { const p = String(s).trim().split(/\s+/); if (p.length !== 1 || !ID.test(p[0])) throw Error(`fizzle: "${s}" — expected "<actor> @ <word>"`); return {actor: p[0]}; }
export function parseCage(s) { if (String(s).trim() !== 'reveal') throw Error(`cage: "${s}" — expected "reveal @ <word>"`); return {kind: 'reveal'}; }
export function parseChains(s) { if (String(s).trim() !== 'snap') throw Error(`chains: "${s}" — expected "snap @ <word>"`); return {kind: 'snap'}; }
export const PROPS = ['spider', 'toaster', 'spaghettiPlates', 'giantCage', 'chains', 'lanternSea'];
