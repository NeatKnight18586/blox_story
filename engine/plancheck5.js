// engine/plancheck5.js — format v5 plan rules (pure), run by v2:plan for `format: 5` specs. Errors are strings.
//   length 75–90 s (hard max 90) · average shot 1.2–2.2 s · static ≤ 2.5 s, moving ≤ 3.5 s · the first second has camera
//   motion and a reveal · story-prop inserts ≥ 40 % of frame height (measured, passed in) · a wall clock in frame whenever
//   the narration says a time.
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
const V5_DEFAULT = V5;
// Retention Engine format 6 (docs/bible/RULES_CARD.md R-CUT-01, R-LEAK-02, R-LEN-03): the format-5 rules with the new numbers.
export const V6 = {...V5, minLen: 60, maxLen: 175, avgMin: 1.5, avgMax: 2.2};
export function plan5(shots, {fps = 24, cues = null, insertH = {}, end = null, limits = null} = {}) {
  const V5 = limits ?? V5_DEFAULT;
  const errs = [], lenS = end ?? (shots.length ? (shots.at(-1).start + shots.at(-1).frames) / fps : 0);
  if (lenS < V5.minLen || lenS > V5.maxLen) errs.push(`length ${lenS.toFixed(2)} s outside ${V5.minLen}–${V5.maxLen} s (hard max ${V5.maxLen})`);
  const avg = shots.length ? lenS / shots.length : 0;
  if (avg < V5.avgMin || avg > V5.avgMax) errs.push(`average shot ${avg.toFixed(2)} s outside ${V5.avgMin}–${V5.avgMax} s`);
  for (const s of shots) {
    const d = s.frames / fps, still = STATIC_MOVES.includes(s.move) || !!s.static;   // `static: true` marks any other held framing
    if (still && d > V5.staticMax + 1e-9) errs.push(`${s.id}: static framing ${d.toFixed(2)} s > ${V5.staticMax}`);
    if (!still && d > V5.movingMax + 1e-9) errs.push(`${s.id}: moving shot ${d.toFixed(2)} s > ${V5.movingMax}`);
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
