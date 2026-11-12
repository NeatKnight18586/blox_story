// engine/timeline.js — pure timing helpers shared by the renderer, render.js, plan.js and tests.
// Shots are cut on phrase onsets, so an episode spec gives each shot `at` (seconds, the cut time);
// legacy specs give `frames`. layoutShots → [{...shot, start, frames, duration}] on the frame grid.
// The last shot runs to `spec.end` (seconds): max(voice + 2.5 s, 122.5 s) for an episode (brief §9).
// Step keys ([[t, value], ...]) and ramps ([t1, v1, 'ramp'] eases from the previous key) for
// timelines of cast and world state: valueAt(keys, t).

export const END_MIN = 122.5, END_PAD = 2.5;
export const episodeEnd = voiceSeconds => Math.max(voiceSeconds + END_PAD, END_MIN);

export function layoutShots(spec) {
  const fps = spec.fps ?? 30, list = spec.shots ?? [];
  if (!list.length) throw Error('spec has no shots');
  const timed = list.some(s => s.at !== undefined);
  const out = []; let start = 0;
  list.forEach((s, i) => {
    let frames;
    if (timed) {
      if (s.at === undefined) throw Error(`shot ${s.id}: every shot needs "at" once one does`);
      start = Math.round(s.at * fps);
      const next = list[i + 1], endF = next ? Math.round(next.at * fps) : Math.round((spec.end ?? s.at + (s.frames ?? 60) / fps) * fps);
      frames = endF - start;
    } else frames = s.frames;
    if (!(frames > 0)) throw Error(`shot ${s.id}: no frames (${frames})`);
    out.push({...s, start, frames, duration: frames / fps});
    if (!timed) start += frames;
  });
  return out;
}
export const totalFrames = shots => shots.at(-1).start + shots.at(-1).frames;

const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// keys: [[t0, v0], [t1, v1, 'ramp'?], ...] sorted by t. Before the first key: `fallback`.
export function valueAt(keys, t, fallback = undefined) {
  if (!keys?.length) return fallback;
  let i = -1; for (let k = 0; k < keys.length; k++) if (keys[k][0] <= t) i = k;
  // a ramp key that has not been reached yet still owns the stretch since the previous key
  const n = keys[i + 1];
  if (n && n[2] === 'ramp' && i >= 0 && typeof n[1] === 'number') {
    const [t0, v0] = keys[i], dur = n[3] ?? (n[0] - t0);
    const from = n[0] - dur; if (t >= from) return v0 + (n[1] - v0) * smooth((t - from) / dur);
  }
  return i < 0 ? fallback : keys[i][1];
}
// The key in force at t (whole entry), or null.
export function keyAt(keys, t) { let cur = null; for (const k of keys ?? []) if (k[0] <= t) cur = k; return cur; }
