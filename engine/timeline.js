// engine/timeline.js — pure timing helpers shared by the renderer, render.js, plan.js and tests.
// Shots are cut on phrase onsets, so an episode spec gives each shot `at` (seconds, the cut time);
// legacy specs give `frames`. layoutShots → [{...shot, start, frames, duration}] on the frame grid.
// The last shot runs to `spec.end` (seconds). Format 6 (docs/season1/FORMAT_V6.md, the default for new episodes) and
// format 5: voice + 0.85 s, no padding (format 6 hard max 125 s). Legacy specs (no `format`, brief §9): max(voice + 2.5, 122.5).
// Step keys ([[t, value], ...]) and ramps ([t1, v1, 'ramp'] eases from the previous key) for
// timelines of cast and world state: valueAt(keys, t).

export const END_MIN = 122.5, END_PAD = 2.5;
export const episodeEnd = voiceSeconds => Math.max(voiceSeconds + END_PAD, END_MIN);   // legacy formats only
export const DEFAULT_FORMAT = 6, TAIL = .85, MAX_END6 = 125;   // FORMAT_V6.md rules 1–2: end = voice + 0.85, hard max 2:05
// The episode end (s) for a voice length and spec format: formats 5/6 end 0.85 s after the last word; older specs keep §9.
// Format 7 (docs: RULEBOOK §9): end = voice + 0.5 s; max end 77 s (lengthVariant "short") or 112 s ("long").
export const TAIL7 = .5, MAX_END7 = {short: 77, long: 112};
export const endFor = (voiceSeconds, format) => format >= 7 ? +(voiceSeconds + TAIL7).toFixed(3) : format >= 5 ? +(voiceSeconds + TAIL).toFixed(3) : episodeEnd(voiceSeconds);

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

// Render-farm shards (brief §14.2): split laid-out shots into ≤ n contiguous runs balanced by frame count.
// Returns [{index, from, to, frames, shots: [ids]}] with `to` exclusive; every frame lands in exactly one shard.
// Greedy against the ideal running total, so no shard strays far from total/n (one shot is the granularity).
export function shardShots(shots, n = 6) {
  const total = totalFrames(shots), out = []; let cur = null, k = 0;
  for (const s of shots) {
    if (!cur) cur = {index: out.length, from: s.start, shots: []};
    cur.shots.push(s.id); cur.to = s.start + s.frames;
    const target = total * (k + 1) / n;
    if (out.length < n - 1 && cur.to >= target - s.frames / 2) { cur.frames = cur.to - cur.from; out.push(cur); cur = null; k++; }
  }
  if (cur) { cur.frames = cur.to - cur.from; out.push(cur); }
  return out;
}
