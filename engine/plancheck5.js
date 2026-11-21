// engine/plancheck5.js — format v5 plan rules (pure), run by v2:plan for `format: 5` and `format: 6` specs. Errors are strings.
//   length 75–90 s (hard max 90) · average shot 1.2–2.2 s · static ≤ 2.5 s, moving ≤ 3.5 s · the first second has camera
//   motion and a reveal · story-prop inserts ≥ 40 % of frame height (measured, passed in) · a wall clock in frame whenever
//   the narration says a time.
import {MOODS, LEN_FAIL} from './mood6.js';
export const V5 = {minLen: 75, maxLen: 90, avgMin: 1.2, avgMax: 2.2, staticMax: 2.5, movingMax: 3.5, insertH: .40, splitMax: 3, insertMin: .35, insertMax: .60, insertMargin: .06, faceMin: .12, faceMax: .35};
export const STATIC_MOVES = ['static-drift', 'topDown'];   // topDown turns slowly: counted with the held framings
const TIME_RE = /^(\d{1,2}([:.]\d{2})?|o'?clock|midnight|noon|am|pm|a\.m\.?|p\.m\.?)$/i;
const NUM_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
// Narration time mentions (pure): word indices that state a clock time ("seven o'clock", "3:15", "midnight", "noon", "6 pm").
export function timeMentions(words) {
  const w = words.map(x => String(x.word ?? x).toLowerCase().replace(/[^a-z0-9:.']/g, '')), out = [];
  for (let i = 0; i < w.length; i++) {
    if (['midnight', 'noon'].includes(w[i]) || /^\d{1,2}[:.]\d{2}$/.test(w[i])) out.push(i);
    else if (/^o'?clock$/.test(w[i]) && i > 0) out.push(i - 1);
    else if (/^(am|pm|a\.m\.?|p\.m\.?)$/.test(w[i]) && i > 0 && (/^\d{1,2}$/.test(w[i - 1]) || NUM_WORDS.includes(w[i - 1]))) out.push(i - 1);
  }
  return [...new Set(out)];
}
// shots: [{id, start, frames, move, size, reveal?, openHit?, prop?, clock?, see?}] (layoutShots), fps, cues {words: [{word, start}]},
// insertH: {shotId: measured prop height fraction}.
// `len` [min, max] s: format 5 uses 75–90; format 6 passes [0, 125] (FORMAT_V6.md: the voice sets the length, hard max 2:05).
// P4b `moods: true`: the per-shot moving / static length limit is the mood's own FAIL line (mood6.json len max × 1.5, checkMoods a) instead of the
// flat 3.5 / 2.5 s; a static shot over 2.5 s must show a slow push ≥ 2 % (`pushOf[id]`, measured by plan.js) or the breath cycle (`shot.breath`).
export const STATIC_PUSH = .02, STATIC_LONG = 2.5;
export function plan5(shots, {fps = 24, cues = null, insertH = {}, end = null, len = [V5.minLen, V5.maxLen], moods = false, pushOf = {}} = {}) {
  const errs = [], lenS = end ?? (shots.length ? (shots.at(-1).start + shots.at(-1).frames) / fps : 0);
  if (lenS < len[0] || lenS > len[1]) errs.push(`length ${lenS.toFixed(2)} s outside ${len[0]}–${len[1]} s (hard max ${len[1]})`);
  const avg = shots.length ? lenS / shots.length : 0;
  if (avg < V5.avgMin || avg > V5.avgMax) errs.push(`average shot ${avg.toFixed(2)} s outside ${V5.avgMin}–${V5.avgMax} s`);
  for (const s of shots) {
    const d = s.frames / fps, still = STATIC_MOVES.includes(s.move) || !!s.static;   // `static: true` marks any other held framing
    if (moods) {
      const m = MOODS[s.mood], cap = m ? m.len[1] * (1 + LEN_FAIL) : V5.movingMax;
      if (d > cap + 1e-9) errs.push(`${s.id}: ${still ? 'static' : 'moving'} shot ${d.toFixed(2)} s > ${cap.toFixed(2)} (${s.mood ?? 'no mood'} limit, mood6.json)`);
      if (still && d > STATIC_LONG + 1e-9 && !s.breath && !((pushOf[s.id] ?? 0) >= STATIC_PUSH - 1e-9)) errs.push(`${s.id}: static framing ${d.toFixed(2)} s > ${STATIC_LONG} with no ≥ ${STATIC_PUSH * 100} % slow push (${((pushOf[s.id] ?? 0) * 100).toFixed(1)} %) and no breath cycle`);
    } else {
    if (still && d > V5.staticMax + 1e-9) errs.push(`${s.id}: static framing ${d.toFixed(2)} s > ${V5.staticMax}`);
    if (!still && d > V5.movingMax + 1e-9) errs.push(`${s.id}: moving shot ${d.toFixed(2)} s > ${V5.movingMax}`); }
    if (s.move === 'splitScreen' && d > V5.splitMax + 1e-9) errs.push(`${s.id}: splitScreen ${d.toFixed(2)} s > ${V5.splitMax}`);
    if (s.size === 'insert' && s.prop) { const h = insertH[s.id]; if (h === undefined) errs.push(`${s.id}: story-prop insert not measured`); else if (typeof h === 'object') {   // Toy House final fix (owner P3): the whole prop in frame, ≥ 6 % margin, 35–60 % of frame height
      if (h.h < V5.insertMin || h.h > V5.insertMax) errs.push(`${s.id}: prop ${(h.h * 100).toFixed(0)} % of frame height (${V5.insertMin * 100}–${V5.insertMax * 100})`);
      if (h.margin < V5.insertMargin) errs.push(`${s.id}: prop margin ${(h.margin * 100).toFixed(1)} % (≥ ${V5.insertMargin * 100})`); }
    else if (h < V5.insertH) errs.push(`${s.id}: prop ${(h * 100).toFixed(0)} % of frame height (≥ ${V5.insertH * 100})`); }
    if (s.faceH !== undefined && (s.faceH < V5.faceMin || s.faceH > V5.faceMax)) errs.push(`${s.id}: face ${(s.faceH * 100).toFixed(0)} % of frame height (${V5.faceMin * 100}–${V5.faceMax * 100})`);
  }
  const first = shots.filter(s => s.start < fps);
  if (!first.some(s => !STATIC_MOVES.includes(s.move))) errs.push('first second: no camera motion');
  if (!first.some(s => s.reveal || s.openHit)) errs.push('first second: no reveal (shot `reveal` or `openHit`)');
  if (cues?.words?.length) for (const i of timeMentions(cues.words)) {
    const f = Math.round(cues.words[i].start * fps), sh = shots.findLast(s => f >= s.start);
    if (!sh || !(sh.clock || (sh.see ?? []).includes('clock'))) errs.push(`narration says a time ("${cues.words[i].word}" at ${cues.words[i].start.toFixed(2)} s) but shot ${sh?.id ?? '?'} has no wall clock in frame`);
  }
  return {lengthS: +lenS.toFixed(2), averageShotS: +avg.toFixed(2), errors: errs};
}
