// campaigns/tapcap/world/crowd.js — Slime Town crowd (pure): who stands where, which colour, which idle loop.
// 20–40 Slime Guys, Core colours with a few Rares (never Cosmic: "nobody has seen the real Cosmic in years"). Each instance gets
// one of 3 tiny idle loops (sway, hop, tap) and a phase; nothing else moves (prompt §4).
import {tapOffset, TAP} from '../../../engine/tapcap.js';

export const CORE = ['frozen', 'grape', 'bubblegum', 'midnight', 'banana'], RARE = ['pumpkin', 'strawberry', 'coffee'];
export const LOOPS = ['sway', 'hop', 'tap'];
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// spots: [[x, z, yaw], …] → [{x, z, yaw, preset, loop, phase}], ~15 % Rares, colours spread so no two neighbours repeat
export function crowdFrom(spots, {seed = 11, rareShare = .15} = {}) {
  const r = rng(seed); let last = null;
  return spots.map(([x, z, yaw = 0], i) => {
    let preset; do { preset = r() < rareShare ? RARE[Math.floor(r() * RARE.length)] : CORE[Math.floor(r() * CORE.length)]; } while (preset === last);
    last = preset; return {x, z, yaw, preset, loop: LOOPS[i % 3 === 0 ? 0 : Math.floor(r() * 3)], phase: +r().toFixed(3)};
  });
}
// idle pose at time t (s): {dy (H), roll (rad), tap (keycap offset, fraction of H)}
export const IDLE = {sway: {period: 1.8, roll: .07}, hop: {period: 1.1, height: .12}, tap: {period: 1.6}};
export function idlePose(loop, t, phase = 0, fps = 24) {
  if (loop === 'sway') return {dy: 0, roll: IDLE.sway.roll * Math.sin(2 * Math.PI * (t / IDLE.sway.period + phase)), tap: 0};
  if (loop === 'hop') { const u = ((t / IDLE.hop.period + phase) % 1 + 1) % 1; return {dy: u < .4 ? IDLE.hop.height * Math.sin(Math.PI * u / .4) : 0, roll: 0, tap: 0}; }
  if (loop === 'tap') { const f = Math.floor((((t / IDLE.tap.period + phase) % 1 + 1) % 1) * IDLE.tap.period * fps); return {dy: 0, roll: 0, tap: tapOffset(f, TAP)}; }
  return {dy: 0, roll: 0, tap: 0};
}
