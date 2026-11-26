// engine/lipflap.js — lip flaps from the owner's voice (format v4 Phase 1). Pure. The voice file is only read (decoded by
// scripts/v2/envelope.js into stories/<slug>/build/envelope.json); it is never trimmed, stretched or edited (V4 D3).
//   envelope(samples, sampleRate, fps) → per-frame RMS (one frame window)
//   talkShapes(env, o) → per-frame mouth shape 0 closed · 1 small · 2 open · 3 wide, each shape held ≥ 2 frames
//   flapActive(shot, actor, o) → does this actor flap in this shot
export const FLAP = {fps: 30, hold: 2, gate: .06, steps: [.3, .62], ref: .95};

export function envelope(samples, sampleRate, fps = FLAP.fps) {
  const n = Math.ceil(samples.length * fps / sampleRate), out = new Array(n);
  for (let f = 0; f < n; f++) {
    const a = Math.floor(f * sampleRate / fps), b = Math.min(samples.length, Math.floor((f + 1) * sampleRate / fps)); let s = 0;
    for (let i = a; i < b; i++) s += samples[i] * samples[i];
    out[f] = b > a ? Math.sqrt(s / (b - a)) : 0;
  }
  return out;
}
// Loudness → shape: normalised by the 95th percentile of the voiced frames; below `gate` the mouth is closed.
export function talkShapes(env, {hold = FLAP.hold, gate = FLAP.gate, steps = FLAP.steps, ref = FLAP.ref} = {}) {
  const voiced = env.filter(v => v > 0).sort((x, y) => x - y), top = voiced.length ? voiced[Math.min(voiced.length - 1, Math.floor(ref * voiced.length))] : 1;
  const want = env.map(v => { const x = v / (top || 1); return x < gate ? 0 : x < steps[0] ? 1 : x < steps[1] ? 2 : 3; });
  const out = []; let cur = want[0] ?? 0, held = 0;
  for (const w of want) { if (w !== cur && held >= hold) { cur = w; held = 0; } out.push(cur); held++; }
  return out;
}
// Who flaps: the narrator (the hero, first person) in close shots; a shot's named `speaker` in close and medium shots.
// Held reaction faces never flap (checked by the face, faces4.isHeld).
export function flapActive(shot, actor, {narrator = 'HERO'} = {}) {
  if (!shot) return false;
  const who = shot.speaker ?? narrator;
  if (actor !== who) return false;
  return shot.speaker ? ['close', 'medium'].includes(shot.size) : shot.size === 'close';
}
export const shapeAt = (shapes, t, fps = FLAP.fps) => shapes?.length ? shapes[Math.min(shapes.length - 1, Math.max(0, Math.round(t * fps)))] : null;
// P2b Faces v6 (pure): the talk-shape family of an expression. Every v6 expression is in exactly one family; avatar-style/faces6.js
// TALK6 has four shape sets (closed · small · open · wide) per family: happy = the wide grin set (upturned D mouths), neutral = level
// mouths, sad = downturned domes (the corners lower than the centre), angry = clenched / bared teeth (both rows, then a shout).
export const FAMILY6 = {
  happy: ['smile', 'grin', 'laugh', 'wink', 'warm', 'relief', 'nervous_laugh', 'embarrassed', 'awe'],
  neutral: ['neutral', 'thinking', 'smirk', 'scheme', 'sleepy'],
  sad: ['sad_soft', 'cry', 'gasp', 'panic', 'terrified', 'shock'],
  angry: ['determined', 'rage', 'yell', 'disgust'],
};
export const talkFamily6 = name => Object.keys(FAMILY6).find(k => FAMILY6[k].includes(name)) ?? null;
export const talkSet6 = family => FAMILY6[family] ? family : 'neutral';   // a family name → its TALK6 set (unknown → level mouths)
