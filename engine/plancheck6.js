// engine/plancheck6.js — format 6 mood / pacing checks (P4), pure. Run by v2:plan for specs with `moods: true`.
//   checkMoods({shots, cues, spec, fps, heads}) → {checks: {a…h: {name, level: 'PASS'|'WARN'|'FAIL', items: [str]}}, errors, warnings, pacing}
// shots: layoutShots output (id, start, frames, mood, size, move, see, subject, actions, gag, twist, cross, loopOpen, loopClose, pair…).
// heads[i]: {name: {x, inFront}} at the shot's middle frame (inspectFrame), only for the 180° check; absent = skipped.
import {MOODS, MOOD_NAMES, lenVerdict, keyEV, sizeOk} from './mood6.js';
import {story6Times} from './story6.js';

export const WINDOW = 1.5, WINDOW_EARLY7 = 1.0, EARLY7_UNTIL = 12.0, VOICE_GAP7 = .4, WINDOW_LONG = 3.0, LONG_MOODS = ['emotion', 'awe'], EMPH_TOL = 3, BREATH = 1.5, LOOP_GAP = 20, BIN = 10;
export const PACING_TARGET = {opening: [5, 7], middle: [4, 6], emotion: [2, 4], climax: [6, 8], payoff: [2, 3]};
const norm = w => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
export const cueWords = cues => (cues?.lines ?? []).flatMap(l => (l.words ?? []).map(x => ({w: x.w ?? x.word, n: norm(x.w ?? x.word), start: x.start, end: x.end, line: l.line})));
// An action's time (s): a number is shot-local; {word, nth (1-based), line?} is the nth spoken word (in that line when `line` is given), as acting6.wordTime.
export function actionTime(a, shot, words, fps) {
  if (typeof a.at === 'number') return shot.start / fps + a.at;
  if (a.at?.word) { const hits = words.filter(x => x.n === norm(a.at.word) && (!a.at.line || x.line === a.at.line)); return hits[(a.at.nth ?? 1) - 1]?.start ?? null; }
  return shot.start / fps;
}
const STILL = ['static-drift', 'static', 'topDown'];
// Novelty events (s): cut · move (a camera move starts or changes) · punch (punch-in, snap, crashZoom) · expr · verb · effect.
export function noveltyEvents({shots, cues, spec = {}, fps}) {
  const words = cueWords(cues), ev = [];
  shots.forEach((s, i) => {
    const t0 = s.start / fps, add = (t, type) => t !== null && t !== undefined && ev.push({t, type, shot: s.id});
    if (i > 0) add(t0, 'cut');
    if (s.move && !STILL.includes(s.move)) add(t0, 'move');
    for (const t of s.camEvents ?? []) add(t0 + t, 'move');
    if (s.move === 'crashZoom') add(t0, 'punch');
    if (s.move === 'snap') add(t0 + (s.snapAt ?? 0), 'punch');
    for (const t of s.punch ?? []) add(t0 + t, 'punch');
    for (const a of s.actions ?? []) { const t = actionTime(a, s, words, fps); if (a.face) add(t, 'expr'); if (a.verb || a.cycle) add(t, 'verb'); }
    if (s.freeze) add(t0 + s.freeze[0], 'effect');
    if (s.impact !== undefined) add(t0 + s.impact, 'effect');
  });
  for (const [, c] of Object.entries(spec.cast ?? {})) {
    for (const [t, f] of c.faces ?? []) if (t > 0) ev.push({t, type: 'expr', shot: shots.findLast(s => t * fps >= s.start)?.id});
    for (const [t] of (c.keys ?? []).slice(1)) ev.push({t, type: 'verb', shot: shots.findLast(s => t * fps >= s.start)?.id});
  }
  for (const e of spec.effects ?? []) ev.push({t: e.at, type: 'effect', shot: shots.findLast(s => e.at * fps >= s.start)?.id});
  for (const t of story6Times(spec)) ev.push({t, type: 'effect', shot: shots.findLast(s => t * fps >= s.start)?.id});   // E2 (opt-in spec.story6): drains, blooms, hand, tumbles, … are on-screen events
  return ev.sort((a, b) => a.t - b.t);
}
const res = (name, items, fail = true) => ({name, level: !items.length ? 'PASS' : fail ? 'FAIL' : 'WARN', items});
const SIZE_RANK = {wide: 0, medium: 1, close: 2, insert: 2, ecu: 3};
const MOVE_RANK = {'static-drift': 0, static: 0, push: 1, pull: 1, track: 2, orbit: 2, gamecam: 2, crane: 2, drone: 2, tiltUp: 2, lowAuthority: 1, heroLow: 2, scaleReveal: 2, whip: 3, snap: 3, crashZoom: 3};
export const intensity = (s, fps = 30, ev = []) => (s.ecu ? 3 : SIZE_RANK[s.size] ?? 1) * 2 + (MOVE_RANK[s.move] ?? 1) + ev.filter(e => e.shot === s.id && ['effect', 'punch'].includes(e.type)).length;

// P5b: moodSeparation. means {shotId: [r, g, b]} = mean colour (0–255) of each rendered shot (stories/<slug>/moodmeans.json). The mean colour of a mood = the mean of its shots;
// CIE76 ΔE between every two of fun / comedy / awe must be ≥ SEP_MIN (a mood missing from the episode is skipped).
export const SEP_MIN = 6, SEP_MOODS = ['fun', 'comedy', 'awe'];
const lab = ([r, g, b]) => { const lin = v => { v /= 255; return v > .04045 ? ((v + .055) / 1.055) ** 2.4 : v / 12.92; }, R = lin(r), G = lin(g), B = lin(b),
  X = (.4124 * R + .3576 * G + .1805 * B) / .95047, Y = .2126 * R + .7152 * G + .0722 * B, Z = (.0193 * R + .1192 * G + .9505 * B) / 1.08883, f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
export const deltaE76 = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
export function moodSeparation({shots, means}) {
  if (!means) return {name: 'moodSeparation', level: 'WARN', items: ['no moodmeans.json: render, run stories/<slug>/measure.py, then plan again']};
  const mm = {}; for (const m of SEP_MOODS) { const v = shots.filter(s => s.mood === m && means[s.id]).map(s => means[s.id]); if (v.length) mm[m] = [0, 1, 2].map(i => v.reduce((a, x) => a + x[i], 0) / v.length); }
  const names = Object.keys(mm), items = [], bad = []; 
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const d = deltaE76(mm[names[i]], mm[names[j]]); items.push(`${names[i]} / ${names[j]}: ΔE ${d.toFixed(1)} (≥ ${SEP_MIN})`); if (d < SEP_MIN) bad.push(items.at(-1)); }
  return {name: 'moodSeparation', level: bad.length ? 'FAIL' : 'PASS', items: bad.length ? bad.map(x => 'FAIL ' + x) : items};
}
export const FALL_VERBS = ['trip_fall', 'slip', 'knees_collapse'], FREEZE_MIN = 8, GROUND_HOLD_MIN = .6;
// P5b trip: every fall verb freezes ≥ 8 frames and holds ≥ 0.6 s on the ground (action `hold`, s); the numbers are printed.
export function tripCheck({shots}) {
  const items = [], bad = [];
  for (const s of shots) for (const a of s.actions ?? []) if (FALL_VERBS.includes(a.verb)) { const fr = s.freeze?.[1] ?? 0, hold = a.hold ?? 0, t = `${s.id}: ${a.verb} freeze ${fr} f (≥ ${FREEZE_MIN}), ground hold ${hold.toFixed(2)} s (≥ ${GROUND_HOLD_MIN})`; items.push(t); if (fr < FREEZE_MIN || hold < GROUND_HOLD_MIN) bad.push('FAIL ' + t); }
  return {name: 'trip freeze + ground hold', level: bad.length ? 'FAIL' : 'PASS', items: bad.length ? bad : items};
}

// Format 7 dead-stretch window (s): 1.0 s for a window starting before 12.0 s, 1.5 s after; format 6 keeps 1.5 s.
export const windowFor = (t, format) => format >= 7 && t < EARLY7_UNTIL - 1e-9 ? WINDOW_EARLY7 : WINDOW;
// Format 7 voiceGap (pure): every gap between consecutive cue words longer than 0.4 s → item with its time.
export function voiceGaps(cues, max = VOICE_GAP7) {
  const w = cueWords(cues), out = [];
  for (let i = 1; i < w.length; i++) { const g = w[i].start - w[i - 1].end; if (g > max + 1e-6) out.push({t: w[i - 1].end, gap: g}); }
  return out;
}
export function checkMoods({shots, cues, spec = {}, fps = 30, heads = [], means = null}) {
  const dur = s => s.frames / fps, ev = noveltyEvents({shots, cues, spec, fps}), end = (shots.at(-1).start + shots.at(-1).frames) / fps, words = cueWords(cues);
  const c = {};
  // a. mood present + length range (+ move / size / fov ranges as warnings)
  { const f = [], w = [];
    for (const s of shots) {
      if (!MOOD_NAMES.includes(s.mood)) { f.push(`${s.id}: no mood (${s.mood === undefined ? 'missing' : `unknown "${s.mood}"`})`); continue; }
      const m = MOODS[s.mood], v = lenVerdict(dur(s), s.mood), txt = `${dur(s).toFixed(2)} s vs ${m.len[0]}–${m.len[1]} s (${s.mood}, ${(v.dev * 100).toFixed(0)} % out)`;
      if (v.level === 'fail') f.push(`${s.id}: length ${txt}`); else if (v.level === 'warn') w.push(`${s.id}: length ${txt}`);
      if (s.move && !m.moves.includes(s.move)) w.push(`${s.id}: move ${s.move} is not a ${s.mood} move (${m.moves.join(', ')})`);
      const fov = s.from?.fov; if (fov !== undefined && (fov < m.fov[0] || fov > m.fov[1])) w.push(`${s.id}: fov ${fov} outside ${m.fov[0]}–${m.fov[1]} (${s.mood})`);
      if (!sizeOk(s, s.mood)) w.push(`${s.id}: size ${s.size} is not ${m.sizes.join(' / ')} (${s.mood})`);
      if (m.noFinal && s === shots.at(-1) && m.noFinal.includes(s.move)) f.push(`${s.id}: ${s.move} is not allowed as the final shot (${s.mood})`);
    }
    c.a = {name: 'mood + length', level: f.length ? 'FAIL' : w.length ? 'WARN' : 'PASS', items: [...f.map(x => 'FAIL ' + x), ...w.map(x => 'WARN ' + x)]}; }
  // b. no dead stretch: a novelty event in every 1.5 s window (3.0 s inside emotion / awe shots)
  { const items = [], pts = [0, ...ev.map(e => e.t), end].sort((x, y) => x - y);
    for (let i = 0; i + 1 < pts.length; i++) {
      const g = pts[i + 1] - pts[i], s = shots.findLast(x => Math.round(pts[i] * fps) >= x.start) ?? shots[0], W = LONG_MOODS.includes(s.mood) ? WINDOW_LONG : windowFor(pts[i], spec.format);
      if (g > W + 1e-6) items.push(`${s.id}: dead stretch ${pts[i].toFixed(2)}–${pts[i + 1].toFixed(2)} s (${g.toFixed(2)} s > ${W} s, nothing happens)`);
    }
    c.b = res('no dead stretch', items); }
  // c. emphasis: every *word* has a punch-in, crashZoom, expression change or verb key frame within ±3 frames
  { const items = [], tol = EMPH_TOL / fps;
    for (const e of spec.emphasis6 ?? []) {
      const hit = ev.find(x => ['punch', 'expr', 'verb'].includes(x.type) && Math.abs(x.t - e.t) <= tol + 1e-9);
      if (!hit) items.push(`${e.shot ?? shots.findLast(s => e.t * fps >= s.start)?.id}: emphasis "${e.word}" at ${e.t.toFixed(2)} s has no punch-in / crashZoom / expression / verb within ±${EMPH_TOL} frames`);
    }
    c.c = res('emphasis', items); }
  // d. the breath + the payoff
  { const items = [], twistI = shots.findIndex(s => s.twist), payoffs = shots.filter(s => s.mood === 'payoff');
    if (twistI < 0) items.push('no shot is marked twist: true');
    else if (twistI === 0) items.push(`${shots[0].id}: the twist cannot be the first shot (no breath before it)`);
    else { const b = shots[twistI - 1]; if (!['tension', 'emotion'].includes(b.mood)) items.push(`${b.id}: the shot before the twist (${shots[twistI].id}) is ${b.mood}, not tension or emotion`); if (dur(b) < BREATH - 1e-6) items.push(`${b.id}: the breath before the twist is ${dur(b).toFixed(2)} s (≥ ${BREATH} s)`); }
    if (!payoffs.length) items.push('no payoff shot (mood: payoff)');
    for (const p of payoffs) {
      if (dur(p) < BREATH - 1e-6) items.push(`${p.id}: payoff held ${dur(p).toFixed(2)} s (≥ ${BREATH} s)`);
      const top = Math.max(...shots.filter(s => s !== p).map(keyEV), -Infinity); if (!(keyEV(p) > top)) items.push(`${p.id}: payoff key ${keyEV(p).toFixed(2)} EV is not the brightest of the episode (another shot has ${top.toFixed(2)} EV)`);
    }
    c.d = res('breath + payoff', items); }
  // e. escalation: gag 1, 2, 3 grow in intensity or subject scale
  { const items = [], g = shots.filter(s => s.gag).sort((x, y) => x.gag - y.gag);
    for (let i = 1; i < g.length; i++) if (intensity(g[i], fps, ev) <= intensity(g[i - 1], fps, ev)) items.push(`${g[i].id}: gag ${g[i].gag} (${intensity(g[i], fps, ev)}) does not grow over gag ${g[i - 1].gag} in ${g[i - 1].id} (${intensity(g[i - 1], fps, ev)}): size, move or effects must step up`);
    c.e = res('escalation', items, false); }
  // f. 180° rule: consecutive shots of the same two actors keep the same screen order (= one side of the line) unless `cross: true`
  { const items = [], pair = s => { const p = s.pair ?? ((s.see ?? []).length === 2 ? s.see : null); return p ? [...p].sort() : null; };
    for (let i = 1; i < shots.length; i++) {
      const a = pair(shots[i - 1]), b = pair(shots[i]); if (!a || !b || a.join() !== b.join() || shots[i].cross) continue;
      const side = h => { const p = h?.[a[0]], q = h?.[a[1]]; return p?.inFront && q?.inFront ? Math.sign(p.x - q.x) : 0; }, s0 = side(heads[i - 1]), s1 = side(heads[i]);
      if (s0 && s1 && s0 !== s1) items.push(`${shots[i].id}: camera crosses the ${a.join('–')} line vs ${shots[i - 1].id} (screen order flips); mark cross: true if intended`);
    }
    c.f = res('180° rule', items, false); }
  // g. open loops: > 20 s with no loop open = WARN
  { const items = [], marks = [];
    for (const s of shots) { if (s.loopOpen) marks.push({t: s.start / fps, d: +1, n: s.loopOpen}); if (s.loopClose) marks.push({t: s.start / fps, d: -1, n: s.loopClose}); }
    marks.sort((x, y) => x.t - y.t || y.d - x.d);
    const open = new Set(); let since = 0;
    const gap = t => { if (t - since > LOOP_GAP + 1e-6) items.push(`no loop open from ${since.toFixed(1)} to ${t.toFixed(1)} s (${(t - since).toFixed(1)} s > ${LOOP_GAP} s)`); };
    for (const m of marks) { if (m.d > 0) { if (!open.size) gap(m.t); open.add(m.n); } else { if (!open.has(m.n)) items.push(`loopClose "${m.n}" at ${m.t.toFixed(1)} s was never opened`); open.delete(m.n); if (!open.size) since = m.t; } }
    if (!open.size) gap(end); else for (const n of open) items.push(`loop "${n}" is never closed`);
    c.g = res('open loops', items, false); }
  // h. pacing curve: cuts per 10 s vs the target of its phase
  const pacing = pacingCurve({shots, fps, end}); c.h = res('pacing curve', pacing.bins.filter(b => !b.ok).map(b => `${b.from}–${b.to} s: ${b.cuts} cuts/10 s (${b.phase} wants ${PACING_TARGET[b.phase][0]}–${PACING_TARGET[b.phase][1]})`), false);
  c.m = moodSeparation({shots, means}); c.t = tripCheck({shots});
  if (spec.format >= 7) c.v = res('voiceGap', voiceGaps(cues).map(g => `silence of ${g.gap.toFixed(2)} s at ${g.t.toFixed(2)} s (> ${VOICE_GAP7} s between words)`), false);
  const errors = [], warnings = [];
  for (const [k, x] of Object.entries(c)) if (x.level !== 'PASS') for (const it of x.items) (it.startsWith('WARN ') || x.level === 'WARN' ? warnings : errors).push(`${k}. ${x.name}: ${it.replace(/^(FAIL|WARN) /, '')}`);
  return {checks: c, errors, warnings, pacing};
}
// Cuts per 10 s in 10 s bins (the last bin ≥ 5 s is scaled to 10 s, a shorter one joins nothing). Phases: payoff (from the payoff shot), climax (10 s before the
// twist up to the payoff), opening (0–25 s), emotion (bin mostly inside emotion shots), middle.
export function pacingCurve({shots, fps = 30, end}) {
  end ??= (shots.at(-1).start + shots.at(-1).frames) / fps;
  const cuts = shots.slice(1).map(s => s.start / fps), tw = shots.find(s => s.twist), pay = shots.find(s => s.mood === 'payoff');
  const climax0 = tw ? tw.start / fps - BIN : Infinity, payAt = pay ? pay.start / fps : Infinity, bins = [];
  for (let a = 0; a < end - 1e-6; a += BIN) {
    const b = Math.min(a + BIN, end), len = b - a; if (len < 5 - 1e-6) continue;
    const mid = (a + b) / 2, n = cuts.filter(t => t >= a && t < b).length, cuts10 = +(n * BIN / len).toFixed(1);
    const emoT = shots.filter(s => s.mood === 'emotion').reduce((z, s) => z + Math.max(0, Math.min(b, (s.start + s.frames) / fps) - Math.max(a, s.start / fps)), 0);
    const phase = mid >= payAt ? 'payoff' : mid >= climax0 ? 'climax' : mid < 25 ? 'opening' : emoT >= len / 2 ? 'emotion' : 'middle', [lo, hi] = PACING_TARGET[phase];
    bins.push({from: +a.toFixed(1), to: +b.toFixed(1), cuts: cuts10, phase, target: [lo, hi], ok: cuts10 >= lo && cuts10 <= hi});
  }
  return {bins, ascii: pacingAscii(bins)};
}
export function pacingAscii(bins) {
  return bins.map(b => `${String(b.from).padStart(5)}–${String(b.to).padEnd(5)} s |${'█'.repeat(Math.round(b.cuts)).padEnd(10)}| ${String(b.cuts).padStart(4)}  ${b.phase.padEnd(7)} ${b.target[0]}–${b.target[1]}  ${b.ok ? 'ok' : 'WARN'}`).join('\n');
}
