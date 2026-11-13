// Word-anchored timing. Shots start on a narration word, never on a guessed frame.
// Before the voice-over exists, word times are estimated from the script (letters
// per word, longer pauses at punctuation, scaled to the measured narration pace).
// Once scripts/episode-align.py has run, the real forced-aligned times replace them.

export const PACE_WPS = 3.14;   // Dice Town narration (ElevenLabs Adam at 1.25×): 368 words / 117.1 s
export const LEAD_FRAMES = 3;   // a cut lands 0.1 s before its word, like an editor's lead

// Spoken text of a SCRIPT.md: everything after the first '---' line, minus [beat] lines.
export function spokenText(md) {
  const body = md.split(/^---\s*$/m).slice(1).join('\n');
  return body.split('\n').filter(l => !/^\s*\[/.test(l)).join('\n');
}
export const tokenize = text => text.split(/\s+/).filter(Boolean);
export const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/'$/, '');

export function estimateTimings(text) {
  const paras = text.split(/\n\s*\n/).map(p => tokenize(p)).filter(p => p.length);
  const out = []; let t = .25;
  for (const p of paras) {
    p.forEach((w, i) => {
      const letters = norm(w).length;
      const dur = .11 + .052 * letters;
      out.push({word: w, start: t, end: t + dur}); t += dur;
      if (/(\.\.\.|…)["”]?$/.test(w)) t += .55; else if (/[.!?]["”]?$/.test(w)) t += .38; else if (/[,;:]["”]?$/.test(w)) t += .18; else t += .02;
    });
    t += .25;
  }
  // Scale to the measured pace (pauses included).
  const k = (out.length / PACE_WPS) / t;
  return out.map(w => ({...w, start: w.start * k, end: w.end * k, estimated: true}));
}

// Find the word index where `phrase` starts, searching from `from`.
export function findPhrase(words, phrase, from = 0) {
  const p = tokenize(phrase).map(norm);
  for (let i = from; i <= words.length - p.length; i++) if (p.every((w, k) => norm(words[i + k].word) === w)) return i;
  throw Error(`phrase not found after word ${from}: "${phrase}"`);
}

// shots: [{id, at: 'phrase' | {word: n} | {after: seconds}}] in order → frame ranges.
export function layoutShots(shots, words, {fps = 30, tail = 1.6, lead = LEAD_FRAMES} = {}) {
  let cursor = 0; const starts = [];
  for (const [n, s] of shots.entries()) {
    if (n === 0) { starts.push(0); continue; }
    if (s.at?.after !== undefined) { starts.push(null); continue; }   // resolved below
    const i = typeof s.at === 'object' ? s.at.word : findPhrase(words, s.at, cursor);
    cursor = i; s.wordIndex = i;
    starts.push(Math.max(0, Math.round(words[i].start * fps) - lead + Math.round((s.nudge ?? 0) * fps)));
  }
  // `after` shots split time inside the previous anchored shot.
  for (let n = 0; n < shots.length; n++) if (starts[n] === null) {
    const prev = starts[n - 1]; starts[n] = prev + Math.round(shots[n].at.after * fps);
  }
  const total = Math.round((words.at(-1).end + tail) * fps);
  const ranges = shots.map((s, n) => {
    const a = starts[n], b = n + 1 < shots.length ? starts[n + 1] : total;
    if (b - a < 8) throw Error(`shot ${s.id} too short (${b - a} frames)`);
    return {id: s.id, start: a, end: b};
  });
  return Object.assign(ranges, {total});
}

// Time (s) of the n-th word after a shot's anchor, relative to the shot start — so
// actions and expressions land on the word that causes them.
export function wordTime(words, shotRange, fps, phraseOrIndex, from = 0) {
  const i = typeof phraseOrIndex === 'number' ? phraseOrIndex : findPhrase(words, phraseOrIndex, from);
  return words[i].start - shotRange.start / fps;
}
