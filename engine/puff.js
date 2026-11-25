// engine/puff.js — tuft 2B PUFF (pure: no three, no DOM, no clock). Sizes, the grow / deflate curves and the `puff:` / `glow:` vocab.
//   tuft (beast rig 'puff'): the whole beast scales uniformly (root scale k = target height / rest height); the quill clusters extend a
//     little further (QUILL_EXTRA) and their blue-gold tips brighten with size (tipGlow). Wind ripples the clusters at colossal.
//   hero (R6): torso + head swell into a ball proxy of diameter D (studs); arms and legs keep their size and stick out (episode.js).
//   deflate: DEFLATE.dur s back to rest (log-scale ease) with 3 wobble undershoots, settled exactly at dur; one air puff + sfx 'squeak'.
export const KID_H = 5.3 * .82;
export const TITAN_H = 12 * KID_H;                                  // TITAN stands ×12 kid height (beasts/TITAN.json)
export const TUFT_H = .95;                                          // TUFT rest height (studs): palm-sized next to an R6 kid hand
export const SIZES = {tuft: {ball: KID_H, room: 10, colossal: TITAN_H * 1.2}, hero: {ball: 3 * 2 * .82, room: 10, colossal: TITAN_H * .6}};   // tuft: height; hero: ball diameter (ball = 3× the torso width)
export const SIZE_NAMES = ['ball', 'room', 'colossal', 'deflate'];
export const GROW = {dur: .8, over: .08}, DEFLATE = {dur: .6, wobbles: 3, amp: .16}, QUILL_EXTRA = .3, SETTLE_TOL = .02;
const cl = x => Math.max(0, Math.min(1, x)), sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
const backOut = (u, o) => { u = cl(u); const c1 = 1.70158 * o / .1, c3 = c1 + 1; return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; };
// the target size (studs) of a named size for a puffer ('tuft' | 'hero'); deflate = rest
export const targetOf = (who, size, rest) => size === 'deflate' || !size ? rest : SIZES[who][size];
// events [{t, size}] (absolute s, sorted) → {k: scale vs rest, size, phase: 'rest'|'grow'|'held'|'deflate', tau, from, to}
export function puffAt(events, t, rest, who = 'tuft', kMap = null) {   // kMap {ball, room, colossal}: the solved scale per size (TUFT.json puffK: quills included)
  let k = 1, prevK = 1, ev = null, from = 1;
  for (const e of events) { if (t < e.t) break; from = kAt(ev, e.t, rest, who, prevK, kMap); prevK = from; ev = e; }
  if (!ev) return {k, size: null, phase: 'rest', tau: 0, from: 1, to: 1};
  k = kAt(ev, t, rest, who, from, kMap); const to = toK(who, ev.size, rest, kMap), tau = t - ev.t;
  return {k, size: ev.size, phase: ev.size === 'deflate' ? (tau < DEFLATE.dur ? 'deflate' : 'rest') : tau < GROW.dur ? 'grow' : 'held', tau, from, to}; }
const toK = (who, size, rest, kMap) => size === 'deflate' ? 1 : kMap?.[size] ?? targetOf(who, size, rest) / rest;
function kAt(ev, t, rest, who, from, kMap) {
  if (!ev) return 1; const to = toK(who, ev.size, rest, kMap), tau = Math.max(0, t - ev.t);
  if (ev.size === 'deflate') return deflateK(from, to, tau);
  const u = tau / GROW.dur, e = backOut(u, GROW.over); return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * e); }
// deflate: log-scale ease from → to over DEFLATE.dur, × (1 + wobble) whose envelope reaches 0 at dur; 3 full wobble cycles
export function deflateK(from, to, tau) {   // the shrink takes the first 30 %, then 3 wobble cycles (sqrt envelope) end exactly at dur
  const {dur, wobbles, amp} = DEFLATE, u = cl(tau / dur), e = sm(u / .3), v = cl((u - .3) / .7), w = u >= 1 || u < .3 ? 0 : amp * Math.sqrt(1 - v) * Math.sin(2 * Math.PI * wobbles * v);
  return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * e) * (1 + w); }
// settle time of a deflate (s): the last sample where |k / to − 1| > SETTLE_TOL; undershoots = local minima below `to`
export function deflateStats(from, to, fps = 24) {
  let settle = 0, under = 0, prev = Infinity, prev2 = Infinity;
  for (let i = 0; i <= Math.round(1.2 * fps); i++) { const tau = i / fps, k = deflateK(from, to, tau); if (Math.abs(k / to - 1) > SETTLE_TOL) settle = tau;
    if (prev < to && prev < prev2 && prev <= k) under++; prev2 = prev; prev = k; }
  return {settle, undershoots: under}; }
// quill cluster scale beyond the body, tip glow multiplier, wind ripple (rad) at colossal sizes
export const quillScale = k => 1 + QUILL_EXTRA * cl(Math.log(Math.max(1, k)) / Math.log(SIZES.tuft.colossal / TUFT_H));
export const tipGlow = (k, level = 1) => level * (1 + .55 * Math.log(Math.max(1, k)));
export const windAt = (k, t, i) => { const w = cl((k - 10) / 30); return w * .12 * Math.sin(2 * Math.PI * (.55 * t - i / 6)); };
// glow events [{t, level}] → the quill glow level (linear .4 s fades); default `def`
export function glowAt(events, t, def = .35) { let v = def, from = def, t0 = 0, to = def;
  for (const e of events) { if (t < e.t) break; from = v; to = e.level; t0 = e.t; v = to; }
  if (!events.length || t < events[0].t) return def; return from + (to - from) * sm((t - t0) / .4); }
// vocab: `puff: <tuft|hero> <ball|room|colossal|deflate>` · `glow: tuft <0–1>` (the `@ <word>` is split off by the caller)
const ID = /^[A-Za-z][A-Za-z0-9_]*$/;
export function parsePuff(s) { const p = String(s).trim().split(/\s+/);
  if (p.length !== 2 || !ID.test(p[0]) || !SIZE_NAMES.includes(p[1])) throw Error(`puff: "${s}" — expected "<tuft|hero> <${SIZE_NAMES.join('|')}> @ <word>"`);
  return {actor: p[0], size: p[1]}; }
export function parseGlow(s) { const p = String(s).trim().split(/\s+/), v = +p[1];
  if (p.length !== 2 || !ID.test(p[0]) || !(v >= 0 && v <= 1)) throw Error(`glow: "${s}" — expected "<actor> <0–1> @ <word>"`);
  return {actor: p[0], level: v}; }
