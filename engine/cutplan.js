// engine/cutplan.js — the Phase 4 cut planner (pure). VO word timestamps + beats prompt → shot list (R-CUT-01/02, R-CAM-02/03,
// R-LEAK-01/02, R-HERO-01, R-JOLT-01). No geometry here: compile() (tools/plan_cuts.js) turns planned shots into camera data.
//   planCuts({words, lines, stressed, beats, end, reversalAt, fps}) → {shots: [{at, beat, intent, preset, size, see, why, hero, openHit}], stats}
// words: [{w, start, end}] (cues.json order) · lines: [{start, text, wordIdx: [i0, i1]}] · stressed: Set of word indexes (owner *marks*)
// beats: [{at, intent, place, see, text}] — intent: clue | reveal | emotion | scale | action | insert | info.

export const AVG = [1.5, 2.2];   // R-CUT-01
export const CUT = {target: 1.85, min: .9, max: 2.4, gap: .4, pause: .18, beatScore: 6, beatBonus: 9};   // beatBonus: a cut on a beat start outweighs re-spacing its neighbours
// beat intent → preset of the beat's first shot (R-CAM-03), and the size cycle for its later shots
export const INTENT = {
  clue: {first: 'whipZoom', cycle: ['medium', 'insert', 'close']},
  reveal: {first: 'snapZoom', cycle: ['wide', 'medium', 'close']},
  emotion: {first: 'push', size: 'close', lens: 'emotion', cycle: ['close', 'medium', 'close']},
  scale: {first: 'aerialReveal', cycle: ['wide', 'medium', 'insert']},
  action: {first: 'track', cycle: ['medium', 'wide', 'close']},
  insert: {first: 'macroInsert', cycle: ['insert', 'medium', 'close']},
  info: {first: 'push', cycle: ['medium', 'close', 'wide', 'insert']},
};
const MOVES_FOR = {wide: ['craneUp', 'pull', 'orbit'], medium: ['orbit', 'track', 'push'], close: ['push', 'orbit', 'tiltDown'], insert: ['macroInsert']};
const cls = size => size === 'wide' ? 'wide' : size === 'insert' ? 'macro' : null;

// candidate cut points: every word start, scored (line start, clause punctuation, pause, stress); mandatory = beat starts, VO gaps
export function candidates({words, lines = [], stressed = new Set(), beats = []}) {
  const lineStart = new Set(lines.map(l => l.wordIdx?.[0]).filter(i => i !== undefined));
  const afterPunct = new Set();
  for (const l of lines) if (l.text && l.wordIdx) {
    const toks = l.text.split(/\s+/).filter(Boolean);
    if (toks.length === l.wordIdx[1] - l.wordIdx[0] + 1) toks.forEach((t, k) => { if (/[,;:.!?…—-]$/.test(t)) afterPunct.add(l.wordIdx[0] + k + 1); });
  }
  const C = words.map((w, i) => {
    const pause = i > 0 ? w.start - words[i - 1].end : 0;
    let score = 0;
    if (lineStart.has(i)) score += 3; if (afterPunct.has(i)) score += 2; if (pause >= CUT.pause) score += 2; if (stressed.has(i)) score += 2;
    const gapCut = i > 0 && pause > CUT.gap + 1e-9;   // R-LEAK-01: every VO pause > 0.4 s gets a cut (mandatory)
    return {t: w.start, i, score, must: gapCut, ...(gapCut ? {gapA: words[i - 1].end} : {})};
  });
  for (const b of beats) {   // a beat start is a strong preference (snapped to the nearest word start), not a forced cut
    if (!C.length) break;
    const k = C.reduce((best, c, j) => Math.abs(c.t - b.at) < Math.abs(C[best].t - b.at) ? j : best, 0);
    if (k > 0) { C[k].score += CUT.beatScore; C[k].beat = true; }
  }
  return C;
}

// DP over candidate cuts: every shot within [min, max] where possible; cost = squared distance from the target length − score bonus
export function chooseCuts(C, end, o = CUT) {
  const pts = [{t: 0, score: 0, must: true}, ...C.filter(c => c.t > 1e-6 && c.t < end - o.min * .5), {t: end, score: 0, must: true}];
  const n = pts.length, best = new Array(n).fill(Infinity), prev = new Array(n).fill(-1); best[0] = 0;
  for (let j = 1; j < n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      const L = pts[j].t - pts[i].t;
      if (L > o.max * 1.6) break;
      let cost = ((L - o.target) / .5) ** 2 - .35 * (pts[j].score ?? 0) - (pts[j].beat ? o.beatBonus : 0);
      if (L < o.min) cost += 40 + (o.min - L) * 100; if (L > o.max) cost += 60 + (L - o.max) * 100;
      if (best[i] + cost < best[j]) { best[j] = best[i] + cost; prev[j] = i; }
      if (pts[i].must && i > 0) break;   // a mandatory cut can't be skipped
    }
  }
  const cuts = []; for (let j = n - 1; j > 0; j = prev[j]) { if (prev[j] < 0) throw Error('cut planner: no path'); cuts.push(pts[prev[j]]); }
  return cuts.reverse();   // shot-start points, first = {t: 0}
}

export function planCuts({words, lines = [], stressed = new Set(), beats = [], end, reversalAt = null, fps = 24}) {
  if (!words.length) throw Error('planCuts: no words');
  end = end ?? +(words.at(-1).end + .2).toFixed(3);
  const B = [...beats].sort((a, b) => a.at - b.at);
  // R-CUT-01: keep the average inside 1.5–2.2 s — relax step by step (longer minimum shot, then weaker beat pull) until it fits
  const C = candidates({words, lines, stressed, beats: B});
  let pts = null, relax = 0;
  for (const [min, beatBonus] of [[CUT.min, CUT.beatBonus], [1.0, CUT.beatBonus], [1.1, CUT.beatBonus], [1.1, 5], [1.2, 3], [1.3, 0]]) {
    pts = chooseCuts(C, end, {...CUT, min, beatBonus}); const avg = end / pts.length;
    if (avg >= AVG[0] + .01 && avg <= AVG[1]) break; relax++;
  }
  // cut frames: a pause cut lands on a frame inside the pause (rounding must not push it past the next word); others on the nearest frame
  const starts = pts.map(p => p.gapA !== undefined ? Math.max(Math.ceil(p.gapA * fps), Math.floor(p.t * fps)) / fps : Math.round(p.t * fps) / fps);
  const frame = t => t;
  const shots = [];
  let prevCls = null, beatIdx = -1, k = 0;
  starts.forEach((t, n) => {
    const bi = B.findLastIndex(b => b.at <= t + .05), b = B[bi] ?? {intent: 'info', see: [], text: ''}, I = INTENT[b.intent] ?? INTENT.info;
    const firstOfBeat = bi !== beatIdx; if (firstOfBeat) { beatIdx = bi; k = 0; } else k++;
    let preset = firstOfBeat ? I.first : null, size = firstOfBeat ? (I.size ?? null) : I.cycle[(k - 1) % I.cycle.length];
    if (preset && !size) size = {aerialReveal: 'wide', macroInsert: 'insert', snapZoom: 'close', whipZoom: 'close', track: 'medium', push: 'medium'}[preset] ?? 'medium';
    // R-CAM-02: never two wides or two macros in a row
    if (cls(size) && cls(size) === prevCls) { size = 'medium'; if (preset === 'aerialReveal' || preset === 'macroInsert') preset = null; }
    if (!preset) { const m = MOVES_FOR[size]; preset = m[(n + k) % m.length]; }
    prevCls = cls(size);
    const t1 = starts[n + 1] ?? end, inWords = words.filter(w => w.start >= t - 1e-6 && w.start < t1 - 1e-6).map(w => w.w).join(' ');
    shots.push({at: +frame(t).toFixed(3), dur: +(t1 - t).toFixed(3), beat: bi, intent: b.intent ?? 'info', preset, size, place: b.place ?? null,
      see: b.see ?? [], why: (inWords || b.text || '(pause)').slice(0, 80), ...(I.lens && firstOfBeat ? {lens: I.lens} : {})});
  });
  // hero shots (R-HERO-01): first, the shot holding the reversal, last; jolt only on shot 1 (R-JOLT-01); shot 1 is the reveal
  shots[0].openHit = true; shots[0].reveal = true; shots[0].hero = 'frame1';
  const ri = reversalAt === null ? -1 : shots.findLastIndex(s => s.at <= reversalAt + 1e-6);
  if (ri > 0 && ri < shots.length - 1) shots[ri].hero = 'reversal';
  shots.at(-1).hero = 'final';
  const lens = shots.map(s => s.dur), pairs = shots.slice(1).filter((s, i) => cls(s.size) && cls(s.size) === cls(shots[i].size)).length;
  return {shots, end, stats: {relax, shots: shots.length, average: +(end / shots.length).toFixed(3), min: +Math.min(...lens).toFixed(3), max: +Math.max(...lens).toFixed(3), sameClassPairs: pairs}};
}

// beats prompt → beats. Accepts the owner's markdown table (| # | in–out (s) | words | shot |) or JSON/YAML-like objects.
// Intent comes from an explicit [intent] tag in the shot text, else from keywords.
const KW = [['reveal', /\breveal|turns out|behind\b/i], ['clue', /crash ?zoom|clue|clock|key\b|whip/i], ['emotion', /\bcr(y|ies|ying)|tear|sad|hug|alone|hands?\b.*\bhands?|holds? hands/i],
  ['scale', /top ?down|aerial|wide|god'?s.eye|whole|reveal/i], ['insert', /insert|close insert|macro/i], ['action', /track|run|race|drift|fall|kart|waddle|chase/i]];
export function intentOf(text) {
  const tag = /\[(clue|reveal|emotion|scale|action|insert|info)\]/i.exec(text); if (tag) return tag[1].toLowerCase();
  for (const [k, re] of KW) if (re.test(text)) return k; return 'info';
}
export function parseBeatsTable(md, places = []) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*(\d+)\s*\|\s*([\d.]+)\s*[–-]\s*([\d.]+)\s*\|\s*([^|]*)\|\s*([^|]*)\|/.exec(line);
    if (!m) continue;
    const shot = m[5].trim(), place = places.find(p => new RegExp(`\\b${p}\\b`, 'i').test(shot)) ?? null;
    out.push({n: +m[1], at: +m[2], out: +m[3], words: m[4].trim(), text: shot, intent: intentOf(shot), place, see: []});
  }
  return out;
}
