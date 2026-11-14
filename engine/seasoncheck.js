// engine/seasoncheck.js — Amendment A4 §E season gates + the A5 framing and uiSize gates, as a pure function.
// scripts/v2/plan.js gathers the measurements in the episode page (seasonMeasure); tests feed synthetic ones.
//   checkSeason({spec, shots, cues, fps, end, info, meas}) → {errors, warnings, stats}
// spec (episode file): season, hero, beats {B1: [fromId, toId], … B9}, clues [3 ids], twist, afk [2 ids], moneyShot, ruleLines (2)
// shots: laid out (timeline.js): id, start, frames, size, move, subject, fit, spectacle, ruleImage, captionY, clueObject
// info[i]: {first, last} inspectFrame results (camera); meas[i]: [seasonMeasure at the shot's first, middle, last frame]
//   seasonMeasure → {actors: {name: {front, box, feet, shoulder, top, face: {y0, y1, h, front, toward}, opacity, troupe}},
//                    objects: {name: {y0, y1, h, front} | null}, ui: [uiMeasure items], v3}
import {framingCheck} from './camera.js';
import {uiSizeIssues, SAFE} from './ruleui.js';
import {wideCentred, SUBJECT_BAND} from './heroread.js';

export const SEASON = {firstWords: 9, ruleEnd: 8.5, faceBy: 5.0, face: .20, b2Shots: 3, b2Max: 2.5, clue: .03, afkOpacity: [.35, .5],
  rhyme: .10, length: [122, 150], band: SAFE.band, bandHigh: [.25, .34], beats: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']};

const overlaps = (y0, y1, [b0, b1]) => y1 > b0 && y0 < b1;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// Camera rhyme (pure): position within `tol` of shot 1's camera-to-target distance, FOV within `tol` of shot 1's FOV.
export function rhyme(c0, c1, tol = SEASON.rhyme) {
  const scale = Math.max(1e-6, dist(c0.position, c0.target)), dp = dist(c0.position, c1.position) / scale, df = Math.abs(c1.fov - c0.fov) / c0.fov;
  return {ok: dp <= tol && df <= tol, dp: +dp.toFixed(4), df: +df.toFixed(4)};
}
// Shot ids of a beat range (pure).
export function beatShots(shots, [from, to]) {
  const a = shots.findIndex(s => s.id === from), b = shots.findIndex(s => s.id === to);
  return a < 0 || b < a ? null : shots.slice(a, b + 1);
}
// Framing measure of one actor in one seasonMeasure (same reading as scripts/v2/look-gates.js).
export function subjectFrac(act, part) {
  if (!act) return null;
  const frac = part === 'head' ? act.shoulder - act.top : act.feet - act.top, groundGap = part === 'head' || act.feet > 1 ? 0 : Math.max(0, 1 - act.feet);
  return {frac, groundGap};
}

// Eggs read on a phone (owner, 2026-11-14): in medium, close and insert shots the largest visible egg's shell (within 25 units
// of the camera) is ≥ 5 % of frame height; in wides the largest egg plus its rarity beam is ≥ 2 %. Shots that show no egg are not checked (pure).
export const EGG_MIN = {near: .05, wide: .02, nearDist: 25};   // medium/close/insert: eggs within 25 units of the camera (far bases are scenery; their beams count in wides)
export function eggSizeCheck(size, eggs = []) {
  const vis = eggs.filter(e => e.front && e.box.x1 > 0 && e.box.x0 < 1 && e.box.y1 > 0 && e.box.y0 < 1 && (size === 'wide' || (e.dist ?? 0) <= EGG_MIN.nearDist));
  if (!vis.length) return null;
  const wide = size === 'wide', clamp = e => Math.min(e.box.y1, 1) - Math.max(e.box.y0, 0), val = e => wide ? Math.max(clamp(e), e.hb ?? 0) : clamp(e);
  const best = vis.reduce((a, e) => val(e) > val(a) ? e : a), max = +Math.min(1, val(best)).toFixed(4), need = wide ? EGG_MIN.wide : EGG_MIN.near;
  return {n: vis.length, max, kind: best.kind, need, ok: max >= need};
}
// Overlap (owner bug, 2026-11-14): no two bodies share space. places: [{name, x, z, y, r, crowd?}] (r ≈ half the shoulder span);
// a pair overlaps when its centres are closer than k × (ra + rb) on the same level. Running crowds pass through each other and
// are skipped (pure).
export function overlapIssues(places = [], k = .85) {
  const out = [], P = places.filter(p => p.crowd !== 'panic');
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j], d = Math.hypot(a.x - b.x, a.z - b.z);
    if (Math.abs((a.y ?? 0) - (b.y ?? 0)) < 2 && d < k * (a.r + b.r)) out.push(`${a.name} and ${b.name} overlap (${d.toFixed(2)} apart, need ${(k * (a.r + b.r)).toFixed(2)})`);
  }
  return out;
}

export function checkSeason({spec, shots, cues, fps = 30, end, info = [], meas = []}) {
  const L = SEASON, errors = [], warnings = [], season = !!spec.season, byId = Object.fromEntries(shots.map((s, i) => [s.id, i]));
  const v3 = meas.some(ms => ms?.some(m => m?.v3));
  const E = (m) => errors.push(m), shotS = s => s.frames / fps, startS = s => s.start / fps;
  const at = id => byId[id] === undefined ? null : shots[byId[id]];
  const actorsIn = i => (meas[i] ?? []).filter(Boolean).map(m => m.actors);
  if (season) {
    // data shape
    for (const b of L.beats) if (!Array.isArray(spec.beats?.[b]) || !beatShots(shots, spec.beats[b])) E(`season: beats.${b} missing or not a valid [fromShot, toShot] range`);
    if (!Array.isArray(spec.clues) || spec.clues.length !== 3) E('season: clues must list exactly three shot ids');
    if (!Array.isArray(spec.afk) || spec.afk.length !== 2) E('season: afk must list exactly two shot ids');
    for (const k of ['twist', 'moneyShot']) if (!at(spec[k])) E(`season: ${k} "${spec[k]}" is not a shot id`);
    for (const id of [...(spec.clues ?? []), ...(spec.afk ?? [])]) if (!at(id)) E(`season: shot "${id}" does not exist`);
    // B1
    const w0 = cues.lines[0]?.words.length ?? 0, nr = spec.ruleLines ?? 2, ruleEnd = cues.lines[Math.min(nr, cues.lines.length) - 1]?.end ?? Infinity;
    if (w0 > L.firstWords) E(`B1: first narration line has ${w0} words (≤ ${L.firstWords})`);
    if (ruleEnd > L.ruleEnd + 1e-6) E(`B1: the rule lines (${nr}) end at ${ruleEnd.toFixed(2)} s (≤ ${L.ruleEnd})`);
    if (!shots[0]?.spectacle && !shots[0]?.ruleImage) E(`B1: shot 1 (${shots[0]?.id}) is tagged neither spectacle nor ruleImage`);
    const hero = spec.hero; let face = 0;
    if (!hero) E('B1: spec.hero (the hero actor) is not set');
    else shots.forEach((s, i) => { if (startS(s) <= L.faceBy + 1e-6) for (const A of actorsIn(i)) { const f = A[hero]?.face; if (f && f.front && f.toward && f.y1 > 0 && f.y0 < 1) face = Math.max(face, Math.min(f.y1, 1) - Math.max(f.y0, 0)); } });
    if (hero && face < L.face) E(`B1: no shot starting ≤ ${L.faceBy} s shows ${hero}'s face at ≥ ${L.face * 100} % (best ${(face * 100).toFixed(1)} %)`);
    // B2
    const b2 = spec.beats?.B2 && beatShots(shots, spec.beats.B2);
    if (b2) { if (b2.length < L.b2Shots) E(`B2: ${b2.length} shots (≥ ${L.b2Shots})`); for (const s of b2) if (shotS(s) > L.b2Max + 1e-6) E(`B2: ${s.id} is ${shotS(s).toFixed(2)} s (≤ ${L.b2Max})`); }
    // clues
    const tw = at(spec.twist);
    for (const id of spec.clues ?? []) {
      const s = at(id); if (!s) continue; const i = byId[id];
      if (tw && s.start >= tw.start) E(`clue ${id} starts at ${startS(s).toFixed(2)} s, not before the twist ${tw.id} (${startS(tw).toFixed(2)} s)`);
      if (!s.clueObject) { E(`clue ${id}: no clueObject named`); continue; }
      const h = Math.max(0, ...(meas[i] ?? []).filter(Boolean).map(m => { const b = m.objects?.[s.clueObject]; return b && b.front ? Math.min(b.y1, 1) - Math.max(b.y0, 0) : 0; }));
      if (h < L.clue) E(`clue ${id}: ${s.clueObject} is ${(h * 100).toFixed(1)} % of frame height (≥ ${L.clue * 100} %)`);
    }
    // AFK
    const afkName = spec.afkActor ?? Object.entries(spec.cast ?? {}).find(([, c]) => c.troupe === 'AFK')?.[0] ?? (spec.afk ?? []).flatMap(id => actorsIn(byId[id])).flatMap(A => Object.entries(A)).find(([, a]) => a.troupe === 'AFK')?.[0];   // the cast entry first: a measured frame may fall before he appears
    let afkBefore = false;
    for (const id of spec.afk ?? []) {
      const s = at(id); if (!s) continue; const i = byId[id];
      const seen = actorsIn(i).map(A => A[afkName]).filter(a => a && a.front && a.box.x1 > 0 && a.box.x0 < 1 && a.box.y1 > 0 && a.box.y0 < 1);
      if (!afkName || !seen.length) { E(`afk ${id}: the AFK actor is not in frame`); continue; }
      const op = seen[0].opacity; if (op < L.afkOpacity[0] || op > L.afkOpacity[1]) E(`afk ${id}: opacity ${op} outside ${L.afkOpacity.join('–')}`);
      if (s.subject === afkName || s.fit?.actor === afkName) E(`afk ${id}: the AFK actor is the subject`);
      if (tw && s.start < tw.start) afkBefore = true;
    }
    if ((spec.afk ?? []).length && !afkBefore) E('afk: no AFK shot before the twist');
    // rhyme
    const c0 = info[0]?.first?.camera, c1 = info[shots.length - 1]?.last?.camera;
    if (c0 && c1) { const r = rhyme(c0, c1); if (!r.ok) E(`rhyme: final camera differs from shot 1 by ${(r.dp * 100).toFixed(1)} % position, ${(r.df * 100).toFixed(1)} % FOV (≤ ${L.rhyme * 100} %)`); }
    // length
    const len = end ?? (shots.at(-1).start + shots.at(-1).frames) / fps;
    if (len < L.length[0] - 1e-6 || len > L.length[1] + 1e-6) E(`episode length ${len.toFixed(2)} s outside ${L.length.join('–')} s`);
    // hero readability: in wides the subject's head stays inside the middle 60 % of the frame width (first, middle, last frame)
    shots.forEach((s, i) => {
      const who = s.subject ?? s.fit?.actor; if (s.size !== 'wide' || !who) return;
      for (const k of ['first', 'mid', 'last']) { const h = info[i]?.[k]?.heads?.[who]; if (h && h.inFront && !wideCentred(h.x)) { E(`${s.id}: wide subject ${who} at x ${(h.x * 100).toFixed(0)} % (${k} frame), outside the middle ${((SUBJECT_BAND[1] - SUBJECT_BAND[0]) * 100).toFixed(0)} %`); break; } }
    });
    // caption band: the subject's / fit actor's face and the clue objects stay out of it
    shots.forEach((s, i) => {
      const mid = meas[i]?.[1]; if (!mid) return; const band = s.captionY === 'high' ? L.bandHigh : L.band;
      for (const n of new Set([s.subject, s.fit?.actor].filter(Boolean))) { const f = mid.actors?.[n]?.face; if (f && f.front && overlaps(f.y0, f.y1, band)) E(`${s.id}: ${n}'s face (${(f.y0 * 100).toFixed(0)}–${(f.y1 * 100).toFixed(0)} %) in the caption band`); }
      const b = s.clueObject && mid.objects?.[s.clueObject]; if (b && b.front && (b.y0 + b.y1) / 2 > band[0] && (b.y0 + b.y1) / 2 < band[1]) E(`${s.id}: clue object ${s.clueObject} centred in the caption band`);
    });
  }
  // A5 framing + uiSize (season episodes and v3 worlds)
  const stats = {framing: [], ui: 0, eggs: [], overlaps: 0};
  if (season) shots.forEach((s, i) => {
    const ms = (meas[i] ?? []).filter(Boolean); if (!ms.length) return;
    const checks = ms.map(m => eggSizeCheck(s.size, m.eggs)).filter(Boolean);
    if (checks.length) { const c = checks.reduce((a, b) => b.max > a.max ? b : a); stats.eggs.push({shot: s.id, size: s.size, max: c.max, kind: c.kind, need: c.need, n: c.n});
      if (!c.ok) E(`${s.id}: largest visible egg (${c.kind}) is ${(c.max * 100).toFixed(1)} % of frame height (≥ ${c.need * 100} % ${s.size === 'wide' ? 'with its beam, in a wide' : 'in a ' + s.size})`); }
    const ov = overlapIssues(ms[1]?.places ?? ms[0].places ?? []); stats.overlaps += ov.length; for (const x of ov.slice(0, 3)) E(`${s.id}: ${x}`);
  });
  if (season || v3) shots.forEach((s, i) => {
    const mid = meas[i]?.[1]; if (!mid) return; const who = s.fit?.actor ?? s.subject;
    if (who && (['close', 'medium'].includes(s.size) || s.move === 'heroLow')) {
      const part = s.fit?.part ?? (s.size === 'close' ? 'head' : 'full'), m = subjectFrac(mid.actors?.[who], part);
      if (!m) E(`${s.id}: framing subject ${who} not measured`);
      else { const c = framingCheck({size: s.size, move: s.move, subjectFrac: m.frac, groundGap: m.groundGap, spectacle: s.spectacle}); stats.framing.push({shot: s.id, part, frac: +m.frac.toFixed(3), need: c.need}); for (const x of c.issues) E(`${s.id}: framing ${x}`); }
    }
    const ui = uiSizeIssues(mid.ui ?? [], {band: s.captionY === 'high' ? L.bandHigh : L.band}); stats.ui += (mid.ui ?? []).length;
    for (const x of ui) E(`${s.id}: uiSize ${x}`);
  });
  return {errors, warnings, stats};
}
