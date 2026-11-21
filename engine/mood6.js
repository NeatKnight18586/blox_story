// engine/mood6.js — format 6 moods (P4), pure. Data: engine/mood6.json. A shot's `mood` sets defaults (move, fov, light) that
// the shot overrides with its own `move`, `from.fov`/`to.fov` or `light`. Used by the renderer (spec.moods), plancheck6 and brief2spec.
//   resolveMood(shot) → shot with move / fov defaults filled (nothing the shot states is touched)
//   shotLight(shot)   → {ev, sat, tint, haze, rim, camNoise}  (mood light, then shot.light on top)
//   moodUniforms(shot) → what the renderer multiplies in: {exposure (×), sat, tint, haze, rim, camNoise}
//   lenVerdict(dur, mood) → {level: 'ok' | 'warn' | 'fail', dev}   (> 20 % outside the range = warn, > 50 % = fail)
import MOODS from './mood6.json' with {type: 'json'};

export {MOODS};
export const MOOD_NAMES = Object.keys(MOODS).filter(k => !k.startsWith('_'));
export const LEN_WARN = .2, LEN_FAIL = .5;
// P5b fields, wired in engine/episode.js applyMood: rimK / fillK (rim light / hemisphere fill temperature shift, K; the key stays neutral), skyEV (sky dome exposure), shadow (hardness ×), bloom (highlight lift), vignette (strength)
export const DEFAULT_LIGHT = {ev: 0, sat: 1, tint: [1, 1, 1], haze: 0, rim: 1, camNoise: 0, rimK: 0, fillK: 0, skyEV: 0, shadow: 1, bloom: 0, vignette: 0};
export const moodOf = shot => MOODS[shot?.mood] && MOOD_NAMES.includes(shot.mood) ? MOODS[shot.mood] : null;

export function shotLight(shot) {
  const m = moodOf(shot);
  return {...DEFAULT_LIGHT, ...(m?.light ?? {}), ...(shot?.light ?? {})};
}
export const keyEV = shot => shotLight(shot).ev;   // the key light the payoff check ranks (EV stops)
export const moodUniforms = shot => { const l = shotLight(shot); return {exposure: 2 ** l.ev, sat: l.sat, tint: l.tint, haze: l.haze, rim: l.rim, camNoise: l.camNoise, rimK: l.rimK, fillK: l.fillK, skyEV: l.skyEV, shadow: l.shadow, bloom: l.bloom, vignette: l.vignette}; };

export function resolveMood(shot) {
  const m = moodOf(shot); if (!m) return shot;
  const out = {...shot}, mid = (m.fov[0] + m.fov[1]) / 2;
  out.move ??= m.moves[0];
  for (const k of ['from', 'to']) if (out[k] && out[k].fov === undefined) out[k] = {...out[k], fov: mid};
  return out;
}

export function lenVerdict(dur, mood) {
  const m = MOODS[mood]; if (!m) return {level: 'fail', dev: Infinity};
  const [lo, hi] = m.len, dev = dur < lo ? (lo - dur) / lo : dur > hi ? (dur - hi) / hi : 0;
  return {level: dev > LEN_FAIL ? 'fail' : dev > LEN_WARN ? 'warn' : 'ok', dev: +dev.toFixed(3)};
}
export const sizeOk = (shot, mood) => { const m = MOODS[mood]?.sizes; if (!m) return true; return m.includes(shot.size) || (m.includes('twoShot') && shot.size === 'medium' && (shot.see ?? []).length >= 2); };

// P4b: the payoff key never pops. Its EV ramps in over RAMP_IN frames from the shot before (smoothstep) and eases out over EASE_OUT frames at its end
// (toward the next shot's EV, or 0 EV after the last shot). → EV for frame n, or null for a shot that is not a payoff (other shots keep their own EV).
export const RAMP_IN = 6, EASE_OUT = 10;
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export function payoffEV(shots, n) {
  const i = shots.findLastIndex(s => n >= s.start), s = shots[i]; if (!s || s.mood !== 'payoff') return null;
  const key = keyEV(s), from = i > 0 ? keyEV(shots[i - 1]) : key, to = shots[i + 1] ? keyEV(shots[i + 1]) : 0, k = n - s.start, left = s.start + s.frames - 1 - n;
  let ev = key + (from - key) * (1 - smooth((k + 1) / RAMP_IN));
  if (left < EASE_OUT) ev = ev + (to - ev) * smooth(1 - (left + 1) / (EASE_OUT + 1) + 1 / (EASE_OUT + 1));
  return ev;
}
