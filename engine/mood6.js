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
export const DEFAULT_LIGHT = {ev: 0, sat: 1, tint: [1, 1, 1], haze: 0, rim: 1, camNoise: 0};
export const moodOf = shot => MOODS[shot?.mood] && MOOD_NAMES.includes(shot.mood) ? MOODS[shot.mood] : null;

export function shotLight(shot) {
  const m = moodOf(shot);
  return {...DEFAULT_LIGHT, ...(m?.light ?? {}), ...(shot?.light ?? {})};
}
export const keyEV = shot => shotLight(shot).ev;   // the key light the payoff check ranks (EV stops)
export const moodUniforms = shot => { const l = shotLight(shot); return {exposure: 2 ** l.ev, sat: l.sat, tint: l.tint, haze: l.haze, rim: l.rim, camNoise: l.camNoise}; };

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
