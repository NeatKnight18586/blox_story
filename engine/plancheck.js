// engine/plancheck.js — the shot-plan rules of docs/V2_BRIEF.md §5.2 as a pure function (scripts/v2/plan.js
// gathers the measurements in the episode page; tests feed synthetic ones).
//   checkPlan({shots, cues, fps, end, info}) → {errors: [...], warnings: [...], stats}
// shots: laid out (timeline.js) with id, start, frames, size, move, loc, subject, see, why, openHit, captionY.
// info[i]: {speed, first, mid, last, early} where first/mid/last/early are inspectFrame() results
//   ({camera: {position, target, fov}, heads: {name: {x, y, inFront, dist, rootDist}}}) at the shot's first,
//   middle, last frame and first frame + 6.
import {episodeEnd} from './timeline.js';
import {SPEED_CAP} from './camera.js';

export const SIZES = ['wide', 'medium', 'close', 'insert'];
export const LIMITS = {minShot: 1.2, maxShot: 5.0, cutTol: 2, firstWide: 6, headX: [.15, .85], headY: [.18, .58], meanShot: [2.2, 3.0], band: [.6, .72], minCam: 2, whipFrames: [4, 6]};

// Phrase onsets (s): every line start, plus every word that follows a pause (its start is later than the
// previous word's end: align.py closes words at the next word unless a ≥ 0.18 s silence lies between).
export function phraseOnsets(cues) {
  const out = []; let prevEnd = null;
  for (const l of cues.lines) l.words.forEach((w, i) => { if (i === 0 || prevEnd === null || w.start > prevEnd + .01) out.push(w.start); prevEnd = w.end; });
  return [...new Set(out)].sort((a, b) => a - b);
}
const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) < 1e-4);
const inBox = (h, [x0, x1], [y0, y1]) => h && h.inFront && h.x >= x0 && h.x <= x1 && h.y >= y0 && h.y <= y1;

export function checkPlan({shots, cues, fps = 30, end, info = []}) {
  const errors = [], warnings = [], L = LIMITS, onsetF = phraseOnsets(cues).map(t => Math.round(t * fps));
  const voiceEnd = cues.duration, err = (s, m) => errors.push(`${s.id}: ${m}`), warn = (s, m) => warnings.push(`${s.id}: ${m}`);
  const nearOnset = f => Math.min(...onsetF.map(o => Math.abs(o - f))) <= L.cutTol;
  const want = episodeEnd(voiceEnd), last = shots.at(-1), endS = (last.start + last.frames) / fps;
  if (end !== undefined && Math.abs(end - want) > 1 / fps) errors.push(`episode end ${end} s ≠ max(voice + 2.5, 122.5) = ${want.toFixed(2)} s`);
  if (Math.abs(endS - want) > 1.5 / fps) errors.push(`last frame ends at ${endS.toFixed(2)} s, want ${want.toFixed(2)} s`);
  let prev = null;   // previous non-whip shot
  shots.forEach((s, i) => {
    const whip = s.move === 'whip', I = info[i] ?? {};
    for (const k of ['size', 'see', 'why']) if (s[k] === undefined || s[k] === '' || (Array.isArray(s[k]) && !s[k].length)) err(s, `missing "${k}"`);
    if (s.size && !SIZES.includes(s.size)) err(s, `unknown size "${s.size}"`);
    // length (the held tail after the last word of the final shot is mandated by §9 and does not count)
    const fullS = s.frames / fps, durS = (Math.min(s.start + s.frames, i === shots.length - 1 ? Math.ceil(voiceEnd * fps) : Infinity) - s.start) / fps;
    if (whip) { if (s.frames < L.whipFrames[0] || s.frames > L.whipFrames[1]) err(s, `whip is ${s.frames} frames (4–6)`); }
    else if (fullS < L.minShot - 1e-6 || durS > L.maxShot + 1e-6) err(s, `${(fullS < L.minShot ? fullS : durS).toFixed(2)} s long (1.2–5.0)`);
    // cuts on phrase onsets (a whip is one transition: one of its two edges must sit on an onset)
    if (i > 0 && !whip && shots[i - 1].move !== 'whip' && !nearOnset(s.start)) err(s, `cut at ${(s.start / fps).toFixed(2)} s is > ${L.cutTol} frames from a phrase onset`);
    if (whip && !nearOnset(s.start) && !nearOnset(s.start + s.frames)) err(s, 'whip touches no phrase onset');
    // camera motion
    if (I.first && I.last && same(I.first.camera.position, I.last.camera.position) && same(I.first.camera.target, I.last.camera.target) && Math.abs(I.first.camera.fov - I.last.camera.fov) < 1e-4) err(s, 'no camera motion');
    if (!whip && I.speed !== undefined && I.speed > SPEED_CAP) err(s, `pan speed ${(I.speed * 100).toFixed(0)} %/s > ${SPEED_CAP * 100} %`);
    if (!whip) {
      if (prev && prev.size === s.size) err(s, `same size as ${prev.id} (${s.size})`);
      if (prev && s.loc && prev.loc && s.loc !== prev.loc && s.size !== 'wide') err(s, `location change ${prev.loc} → ${s.loc} must open on a wide`);
      prev = s;
    }
    if (s.openHit && (i !== 0 || s.start !== 0)) err(s, 'openHit only on episode frame 0');
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
  if (shots.filter(s => s.openHit).length !== 1 || !shots[0].openHit) errors.push('exactly one openHit, on the first shot');
  const nonWhip = shots.filter(s => s.move !== 'whip'), mean = (Math.min(endS, voiceEnd)) / nonWhip.length;
  if (mean < L.meanShot[0] || mean > L.meanShot[1]) warnings.push(`mean shot length ${mean.toFixed(2)} s (target 2.2–3.0)`);
  return {errors, warnings, stats: {shots: shots.length, meanShot: +mean.toFixed(2), end: +endS.toFixed(2), gamecam: shots.filter(s => s.move === 'gamecam').length, wides: shots.filter(s => s.size === 'wide').length}};
}
