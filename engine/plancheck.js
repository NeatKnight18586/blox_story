// engine/plancheck.js — the shot-plan rules of docs/V2_BRIEF.md §5.2 as a pure function (scripts/v2/plan.js
// gathers the measurements in the episode page; tests feed synthetic ones).
//   checkPlan({shots, cues, fps, end, info}) → {errors: [...], warnings: [...], stats}
// shots: laid out (timeline.js) with id, start, frames, size, move, loc, subject, see, why, openHit, captionY.
// info[i]: {speed, first, mid, last, early} where first/mid/last/early are inspectFrame() results
//   ({camera: {position, target, fov}, heads: {name: {x, y, inFront, dist, rootDist}}}) at the shot's first,
//   middle, last frame and first frame + 6.
import {episodeEnd} from './timeline.js';
import {SPEED_CAP} from './camera.js';
import {cardOk} from './classes.js';

export const SIZES = ['wide', 'medium', 'close', 'insert'];
export const LIMITS = {beat: [.55, 1.2], beatRun: 3, beatBefore: 20, minShot: 1.2, maxShot: 5.0, cutTol: 2, firstWide: 6, headX: [.15, .85], headY: [.18, .58], meanShot: [2.2, 3.0], band: [.58, .74], minCam: 2, whipFrames: [4, 6]};

// Phrase onsets (s): every line start, plus every word that follows a pause (its start is later than the
// previous word's end: align.py closes words at the next word unless a ≥ 0.18 s silence lies between).
export function phraseOnsets(cues) {
  const out = []; let prevEnd = null;
  for (const l of cues.lines) l.words.forEach((w, i) => { if (i === 0 || prevEnd === null || w.start > prevEnd + .01) out.push(w.start); prevEnd = w.end; });
  return [...new Set(out)].sort((a, b) => a - b);
}
const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) < 1e-4);
const inBox = (h, [x0, x1], [y0, y1]) => h && h.inFront && h.x >= x0 && h.x <= x1 && h.y >= y0 && h.y <= y1;

// Every word start (A3 beat shots may cut on any word, not only after a pause).
export const wordOnsets = cues => cues.lines.flatMap(l => l.words.map(w => w.start));

// Voice / episode length per format (owner V4 D-format): format v5 runs 75–90 s, older formats keep a 100–168 s voice.
export const lengthRule = format => format === 6 ? {voice: [60, 175], end: [60, 175]} : format === 5 ? {voice: [75, 90], end: [75, 90]} : {voice: [100, 168], end: null};   // format 6: Retention Engine (R-LEN-03)
export function checkPlan({shots, cues, fps = 30, end, info = [], format}) {
  const V5 = format === 5 || format === 6;   // format 6 (Retention Engine) runs the format-5 path with its own numbers   // format v5: length, cuts and shot sizes follow engine/plancheck5.js (cut on any word; no size/location/openHit rules)
  const errors = [], warnings = [], L = LIMITS, onsetF = phraseOnsets(cues).map(t => Math.round(t * fps)), wordF = wordOnsets(cues).map(t => Math.round(t * fps));
  const nearWord = f => Math.min(...wordF.map(o => Math.abs(o - f))) <= L.cutTol;
  let beatRun = 0;
  const voiceEnd = cues.duration, err = (s, m) => errors.push(`${s.id}: ${m}`), warn = (s, m) => warnings.push(`${s.id}: ${m}`);
  const nearOnset = f => Math.min(...onsetF.map(o => Math.abs(o - f))) <= L.cutTol;
  const want = episodeEnd(voiceEnd), last = shots.at(-1), endS = (last.start + last.frames) / fps;
  if (V5) { const R = lengthRule(format), lastWord = Math.max(...cues.lines.flatMap(l => l.words.map(w => w.end))), vo = format === 6 ? lastWord : voiceEnd;   // format 6 ends on the last word (R-END-01), not the file
    if (vo < R.voice[0] || vo > R.voice[1]) errors.push(`voice ${vo.toFixed(2)} s outside ${R.voice[0]}–${R.voice[1]} s (format v${format})`);
    if (endS < vo - 1e-6 || endS > R.end[1] + 1e-6) errors.push(`last frame ends at ${endS.toFixed(2)} s, want voice end ${vo.toFixed(2)}–${R.end[1]} s (format v${format})`); }
  else {
  if (end !== undefined && Math.abs(end - want) > 1 / fps) errors.push(`episode end ${end} s ≠ max(voice + 2.5, 122.5) = ${want.toFixed(2)} s`);
  if (Math.abs(endS - want) > 1.5 / fps) errors.push(`last frame ends at ${endS.toFixed(2)} s, want ${want.toFixed(2)} s`); }
  let prev = null;   // previous non-whip shot
  shots.forEach((s, i) => {
    const whip = s.move === 'whip', I = info[i] ?? {};
    for (const k of ['size', 'see', 'why']) if (s[k] === undefined || s[k] === '' || (Array.isArray(s[k]) && !s[k].length)) err(s, `missing "${k}"`);
    if (s.size && !SIZES.includes(s.size)) err(s, `unknown size "${s.size}"`);
    // length (the held tail after the last word of the final shot is mandated by §9 and does not count)
    const fullS = s.frames / fps, durS = (Math.min(s.start + s.frames, i === shots.length - 1 ? Math.ceil(voiceEnd * fps) : Infinity) - s.start) / fps;
    beatRun = s.beat ? beatRun + 1 : 0;
    if (V5) { if (i > 0 && !nearWord(s.start)) err(s, `cut at ${(s.start / fps).toFixed(2)} s is > ${L.cutTol} frames from a word onset`); }
    else if (s.beat) {   // A3 beat shots: 0.55–1.2 s, ≤ 3 in a row, only before 20 s, cut on a word onset
      if (fullS < L.beat[0] - 1e-6 || fullS > L.beat[1] + 1e-6) err(s, `beat shot ${fullS.toFixed(2)} s long (0.55–1.2)`);
      if (beatRun > L.beatRun) err(s, `more than ${L.beatRun} beat shots in a row`);
      if (s.start / fps >= L.beatBefore) err(s, `beat shot after ${L.beatBefore} s`);
      if (!nearWord(s.start)) err(s, `beat cut at ${(s.start / fps).toFixed(2)} s is not on a word onset`);
    }
    else if (whip) { if (s.frames < L.whipFrames[0] || s.frames > L.whipFrames[1]) err(s, `whip is ${s.frames} frames (4–6)`); }
    else if (fullS < L.minShot - 1e-6 || durS > L.maxShot + 1e-6) err(s, `${(fullS < L.minShot ? fullS : durS).toFixed(2)} s long (1.2–5.0)`);
    // cuts on phrase onsets (a whip is one transition: one of its two edges must sit on an onset)
    if (!V5 && i > 0 && !whip && !s.beat && shots[i - 1].move !== 'whip' && !nearOnset(s.start)) err(s, `cut at ${(s.start / fps).toFixed(2)} s is > ${L.cutTol} frames from a phrase onset`);
    if (whip && !nearOnset(s.start) && !nearOnset(s.start + s.frames)) err(s, 'whip touches no phrase onset');
    // camera motion
    if (!V5 && I.first && I.last && same(I.first.camera.position, I.last.camera.position) && same(I.first.camera.target, I.last.camera.target) && Math.abs(I.first.camera.fov - I.last.camera.fov) < 1e-4) err(s, 'no camera motion');
    if (!whip && s.move !== 'snap' && I.speed !== undefined && I.speed > SPEED_CAP) err(s, `pan speed ${(I.speed * 100).toFixed(0)} %/s > ${SPEED_CAP * 100} %`);
    if (!whip && !V5) {
      if (prev && prev.size === s.size) err(s, `same size as ${prev.id} (${s.size})`);
      if (prev && s.loc && prev.loc && s.loc !== prev.loc && s.size !== 'wide') err(s, `location change ${prev.loc} → ${s.loc} must open on a wide`);
      prev = s;
    }
    if (s.openHit && (i !== 0 || s.start !== 0)) err(s, 'openHit only on episode frame 0');
    // A3 class cards: on frames where a card is fully visible (landed, not flying), it must sit in the safe area,
    // out of the caption band, with the class name's cap height at least the minimum for its kind
    const bad = new Map();
    for (const fr of I.cards ?? []) for (const c of fr.cards) if (c.landed && !c.fly) for (const m of cardOk(c.rect)) bad.set(`${c.cls} card ${m}`, fr.frame);
    for (const [m, f] of bad) err(s, `${m} (frame ${f})`);
    // framing of the named subject at the shot midpoint
    if (s.subject) {
      const h = I.mid?.heads?.[s.subject];
      if (!h) err(s, `subject ${s.subject} not in the scene at the midpoint`);
      else if (!inBox(h, L.headX, L.headY)) err(s, `subject ${s.subject} head at x ${(h.x * 100).toFixed(0)} % y ${(h.y * 100).toFixed(0)} % (want x 15–85, y 18–58)`);
      else if (h.y > L.band[0] - .02 && s.captionY !== 'high') warn(s, `subject head at y ${(h.y * 100).toFixed(0)} % near the caption band: consider captionY "high"`);
    }
    for (const n of [].concat(s.see ?? [])) {
      const h = I.early?.heads?.[n];
      if (h && !inBox(h, [.1, .9], [.05, .95])) warn(s, `"${n}" (see) not in frame by frame 6`);
    }
    if (I.mid) for (const [n, h] of Object.entries(I.mid.heads)) if (h.inFront && h.x > 0 && h.x < 1 && h.y > 0 && h.y < 1 && Math.min(h.dist, h.rootDist) < L.minCam) warn(s, `camera ${Math.min(h.dist, h.rootDist).toFixed(1)} units from ${n} (A1: keep ≥ 2)`);
    if (s.size === 'wide' && I.mid) {
      const fg = Object.values(I.mid.heads).some(h => h.inFront && h.x > .05 && h.x < .95 && h.y > .05 && h.y < .95 && h.dist < 30);
      if (!fg) warn(s, 'wide shot with no tagged character in the foreground');
    }
  });
  const firstWide = shots.find(s => s.size === 'wide');
  if (!firstWide || firstWide.start / fps > L.firstWide) errors.push(`no wide shot in the first ${L.firstWide} s`);
  if (!V5 && (shots.filter(s => s.openHit).length !== 1 || !shots[0].openHit)) errors.push('exactly one openHit, on the first shot');
  const nonWhip = shots.filter(s => s.move !== 'whip'), mean = (Math.min(endS, voiceEnd)) / nonWhip.length;
  if (!V5 && (mean < L.meanShot[0] || mean > L.meanShot[1])) warnings.push(`mean shot length ${mean.toFixed(2)} s (target 2.2–3.0)`);
  return {errors, warnings, stats: {shots: shots.length, meanShot: +mean.toFixed(2), end: +endS.toFixed(2), gamecam: shots.filter(s => s.move === 'gamecam').length, wides: shots.filter(s => s.size === 'wide').length}};
}
