// P4: moods (engine/mood6.js) and the format 6 plan checks a–h (engine/plancheck6.js), on a synthetic episode that passes and is then broken one rule at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MOODS, MOOD_NAMES, resolveMood, shotLight, keyEV, moodUniforms, lenVerdict, sizeOk} from '../../engine/mood6.js';
import {plan5, STATIC_PUSH} from '../../engine/plancheck5.js';
import {payoffEV, RAMP_IN, EASE_OUT} from '../../engine/mood6.js';
import {checkMoods, noveltyEvents, pacingCurve, actionTime, cueWords} from '../../engine/plancheck6.js';

const fps = 30;
test('mood data: six moods with the owner numbers', () => {
  assert.deepEqual(MOOD_NAMES, ['fun', 'comedy', 'tension', 'emotion', 'awe', 'payoff']);
  assert.deepEqual(MOODS.fun.len, [1.2, 2.2]); assert.deepEqual(MOODS.comedy.len, [.8, 2]); assert.deepEqual(MOODS.tension.fov, [28, 40]); assert.deepEqual(MOODS.awe.moves, ['drone', 'scaleReveal', 'crane', 'pull']);
  assert.equal(MOODS.tension.light.ev, -.15); assert.equal(MOODS.tension.light.sat, .9); assert.equal(MOODS.tension.light.camNoise, .3); assert.equal(MOODS.fun.light.sat, 1.08);
  assert.equal(MOODS.emotion.light.rim, 1.4); assert.equal(MOODS.emotion.dof, true);
});
test('resolveMood: defaults fill, shot values win; light override; unknown mood untouched', () => {
  const r = resolveMood({mood: 'tension', from: {position: [0, 0, 1], target: [0, 0, 0]}}); assert.equal(r.move, 'lowAuthority'); assert.equal(r.from.fov, 34);
  assert.equal(resolveMood({mood: 'fun', move: 'snap', from: {fov: 50}}).move, 'snap'); assert.equal(resolveMood({mood: 'fun', move: 'snap', from: {fov: 50}}).from.fov, 50);
  const o = {mood: 'nope'}; assert.equal(resolveMood(o), o);
  assert.equal(shotLight({mood: 'fun', light: {ev: .5}}).ev, .5); assert.equal(shotLight({mood: 'fun', light: {ev: .5}}).sat, 1.08);
  assert.ok(Math.abs(moodUniforms({mood: 'tension'}).exposure - 2 ** -.15) < 1e-12); assert.deepEqual(moodUniforms({}).tint, [1, 1, 1]);
});
test('lenVerdict: > 20 % warn, > 50 % fail; sizeOk for payoff (close, ecu, or a medium two-shot)', () => {
  assert.equal(lenVerdict(1.2, 'fun').level, 'ok'); assert.equal(lenVerdict(2.2 * 1.2, 'fun').level, 'ok'); assert.equal(lenVerdict(2.2 * 1.21, 'fun').level, 'warn'); assert.equal(lenVerdict(2.2 * 1.51, 'fun').level, 'fail'); assert.equal(lenVerdict(.5, 'fun').level, 'fail');
  assert.ok(sizeOk({size: 'close'}, 'payoff')); assert.ok(!sizeOk({size: 'wide'}, 'payoff')); assert.ok(sizeOk({size: 'medium', see: ['a', 'b']}, 'payoff')); assert.ok(!sizeOk({size: 'medium', see: ['a']}, 'payoff'));
});

// 8 shots, 30 fps: fun 2.0 · comedy ×3 (gags) 1.5 · tension 2.0 (breath) · twist comedy 1.5 · emotion 3.0 · payoff 2.0 — each carries a verb at its start and an expression mid-shot
const DUR = [['fun', 2.0], ['comedy', 1.5], ['comedy', 1.5], ['comedy', 1.5], ['tension', 2.0], ['comedy', 1.5], ['emotion', 3.0], ['payoff', 2.0]];
function episode() {
  let t = 0; const words = [], shots = DUR.map(([mood, d], i) => {
    const s = {id: `S${i + 1}`, start: Math.round(t * fps), frames: Math.round(d * fps), mood, size: ['medium', 'medium', 'close', 'close', 'medium', 'close', 'close', 'close'][i], move: {fun: 'track', comedy: 'snap', tension: 'push', emotion: 'push', payoff: 'push'}[mood], see: ['a'], subject: 'a',
      actions: [{actor: 'a', verb: 'flinch', at: 0}, {actor: 'a', face: 'shock', at: d / 2}], loopOpen: i === 0 ? 'L' : undefined, loopClose: i === 4 ? 'L' : undefined};
    words.push({w: `w${i}`, start: +(t + .2).toFixed(2), end: +(t + .5).toFixed(2)}, {w: `x${i}`, start: +(t + d / 2).toFixed(2), end: +(t + d / 2 + .3).toFixed(2)}); t += d; return s;
  });
  shots[1].gag = 1; shots[2].gag = 2; shots[3].gag = 3; shots[2].size = 'close'; shots[3].size = 'ecu'; shots[3].ecu = true; shots[5].twist = true; shots[5].move = 'crashZoom';
  const cues = {duration: t, lines: [{line: 1, words}]};
  return {shots, cues, spec: {emphasis6: [{word: 'w1', t: shots[1].start / fps, shot: 'S2'}]}, fps};
}
const res = (e, k) => checkMoods(e).checks[k];
test('checks: a well-formed episode passes a–g', () => { const r = checkMoods(episode()); for (const k of 'abcdefg') assert.equal(r.checks[k].level, 'PASS', k + ' ' + JSON.stringify(r.checks[k].items)); });
test('a: missing mood FAIL, length > 20 % WARN, > 50 % FAIL', () => {
  let e = episode(); delete e.shots[0].mood; assert.equal(res(e, 'a').level, 'FAIL'); assert.match(res(e, 'a').items[0], /S1.*no mood/);
  e = episode(); e.shots[0].frames = Math.round(2.2 * 1.3 * fps); assert.equal(res(e, 'a').level, 'WARN');
  e = episode(); e.shots[0].frames = Math.round(2.2 * 1.6 * fps); assert.equal(res(e, 'a').level, 'FAIL');
  e = episode(); e.shots.at(-1).mood = 'awe'; e.shots.at(-1).move = 'pull'; assert.ok(res(e, 'a').items.some(x => /not allowed as the final shot/.test(x)));
});
test('b: every 1.5 s window needs a novelty event (3.0 s in emotion / awe)', () => {
  let e = episode(); assert.equal(res(e, 'b').level, 'PASS');
  e = episode(); e.shots[0].actions = []; assert.equal(res(e, 'b').level, 'FAIL'); assert.match(res(e, 'b').items[0], /S1: dead stretch/);   // fun 2.0 s: only the cut and the move at its start
  e = episode(); e.shots[6].actions = []; assert.equal(res(e, 'b').level, 'PASS');   // emotion 3.0 s: window 3.0
  e.shots[6].frames = Math.round(3.5 * fps); e.shots[7].start += 15; e.cues.duration += .5; assert.equal(res(e, 'b').level, 'FAIL');
  e = episode(); e.shots[0].actions = []; e.spec.effects = [{type: 'flash', at: 1.0}]; assert.equal(res(e, 'b').level, 'PASS');   // a world effect is an event
});
test('c: emphasis needs a punch-in / crashZoom / expression / verb within ±3 frames', () => {
  let e = episode(); assert.equal(res(e, 'c').level, 'PASS');
  e.spec.emphasis6 = [{word: 'x', t: e.shots[0].start / fps + .35, shot: 'S1'}]; assert.equal(res(e, 'c').level, 'FAIL');   // nothing at .35 s (the verb is at 0, the face at 1.0)
  e.spec.emphasis6 = [{word: 'x', t: 1.0 + 3 / fps, shot: 'S1'}]; assert.equal(res(e, 'c').level, 'PASS'); e.spec.emphasis6 = [{word: 'x', t: 1.0 + 4 / fps, shot: 'S1'}]; assert.equal(res(e, 'c').level, 'FAIL');
});
test('d: the breath before the twist, payoff hold and brightest key', () => {
  let e = episode(); e.shots[4].mood = 'fun'; assert.equal(res(e, 'd').level, 'FAIL'); assert.match(res(e, 'd').items[0], /before the twist/);
  e = episode(); e.shots[4].frames = Math.round(1.4 * fps); assert.ok(res(e, 'd').items.some(x => /breath/.test(x)));
  e = episode(); e.shots[7].frames = Math.round(1.4 * fps); assert.ok(res(e, 'd').items.some(x => /payoff held/.test(x)));
  e = episode(); e.shots[0].light = {ev: .4}; assert.ok(res(e, 'd').items.some(x => /brightest/.test(x)));
  e = episode(); e.shots[5].twist = false; assert.ok(res(e, 'd').items.some(x => /twist/.test(x)));
});
test('e: gags 1, 2, 3 must grow (WARN)', () => {
  let e = episode(); assert.equal(res(e, 'e').level, 'PASS'); e.shots[3].size = 'close'; delete e.shots[3].ecu; e.shots[3].move = 'snap'; assert.equal(res(e, 'e').level, 'WARN'); assert.match(res(e, 'e').items[0], /S4: gag 3/);
});
test('f: 180° rule: the screen order of a pair must not flip unless cross: true', () => {
  const e = episode(); e.shots[1].see = e.shots[2].see = ['a', 'b']; const L = {a: {x: .3, inFront: true}, b: {x: .7, inFront: true}}, R = {a: {x: .7, inFront: true}, b: {x: .3, inFront: true}};
  e.heads = []; e.heads[1] = L; e.heads[2] = R; assert.equal(res(e, 'f').level, 'WARN'); assert.match(res(e, 'f').items[0], /S3: camera crosses/);
  e.shots[2].cross = true; assert.equal(res(e, 'f').level, 'PASS'); e.shots[2].cross = false; e.heads[2] = L; assert.equal(res(e, 'f').level, 'PASS');
});
test('g: open loops: > 20 s with no loop open = WARN', () => {
  const e = episode(); e.shots[0].loopOpen = undefined; e.shots[4].loopClose = undefined; assert.equal(res(e, 'g').level, 'PASS');   // short episode: 15 s without a loop is fine
  const long = {shots: [{id: 'A', start: 0, frames: 30, mood: 'fun'}, {id: 'B', start: 25 * fps, frames: 30, mood: 'fun'}, {id: 'C', start: 26 * fps, frames: 30, mood: 'fun'}], cues: {lines: []}, fps};
  assert.equal(checkMoods(long).checks.g.level, 'WARN'); long.shots[0].loopOpen = 'X'; long.shots[1].loopClose = 'X'; assert.equal(checkMoods(long).checks.g.level, 'PASS');
});
test('h: pacing curve bins, phases and targets', () => {
  const mk = d => Array.from({length: 40 / d | 0}, (_, i) => ({id: `S${i}`, start: Math.round(i * d * fps), frames: Math.round(d * fps), mood: 'fun'})), shots = mk(1.5), c = pacingCurve({shots, fps});
  assert.equal(c.bins[0].phase, 'opening'); assert.equal(c.bins[0].cuts, 6); assert.ok(c.bins[0].ok); assert.equal(c.bins[2].phase, 'middle'); assert.ok(c.bins[2].ok);
  const fast = pacingCurve({shots: mk(1), fps}); assert.equal(fast.bins[2].cuts, 10); assert.ok(!fast.bins[2].ok); assert.ok(!fast.bins[0].ok);   // 9–10 cuts/10 s: over every band but climax
  assert.match(c.ascii, /█/); shots[12].twist = true; shots[20].mood = 'payoff'; const d = pacingCurve({shots, fps}).bins.map(b => b.phase); assert.ok(d.includes('climax') && d.includes('payoff'));
});
test('noveltyEvents: word refs resolve like acting6 (nth is 1-based, inside the line)', () => {
  const cues = {lines: [{line: 1, words: [{w: 'Go', start: 1, end: 1.2}, {w: 'go', start: 1.5, end: 1.7}]}]}, s = {id: 'A', start: 0, frames: 90};
  assert.equal(actionTime({at: {word: 'go', nth: 2, line: 1}}, s, cueWords(cues), 30), 1.5); assert.equal(actionTime({at: 0.4}, {start: 30}, [], 30), 1.4);
  const ev = noveltyEvents({shots: [s], cues, spec: {cast: {a: {faces: [[0, 'smile'], [2, 'cry']], keys: [[0, 'idle'], [1, 'walk']]}}}, fps: 30}); assert.deepEqual(ev.map(e => e.type + e.t), ['verb1', 'expr2']);
});

// P4b: plan5 limits come from mood6.json for moods specs, the flat 3.5 / 2.5 s limits stay for the rest
const P5 = (shots, o = {}) => plan5(shots.map((s, i) => ({start: 0, ...s, id: s.id ?? `S${i}`, frames: Math.round(s.d * 24)})), {fps: 24, len: [0, 125], ...o}).errors.filter(e => /shot|static/.test(e) && !/average|first second/.test(e));
test('plan5 without moods: flat limits (moving 3.5 s, static 2.5 s)', () => {
  assert.equal(P5([{d: 3.2, move: 'push', mood: 'awe'}]).length, 0); assert.equal(P5([{d: 3.8, move: 'push', mood: 'awe'}]).length, 1); assert.equal(P5([{d: 2.8, move: 'static-drift', mood: 'emotion'}]).length, 1);
});
test('plan5 with moods: the limit is the mood\'s FAIL line (len max × 1.5); static > 2.5 s needs a ≥ 2 % push or the breath cycle', () => {
  const m = {moods: true};
  assert.equal(P5([{d: 4.0, move: 'drone', mood: 'awe'}], m).length, 0); assert.equal(P5([{d: 3.8, move: 'push', mood: 'awe'}], m).length, 0);   // flat rule would FAIL 3.8 s
  assert.equal(P5([{d: 6.1, move: 'push', mood: 'awe'}], m).length, 1); assert.equal(P5([{d: 3.4, move: 'push', mood: 'fun'}], m).length, 1);   // fun: 2.2 × 1.5 = 3.3
  const st = {d: 3.0, move: 'static-drift', mood: 'emotion'};
  assert.equal(P5([st], m).length, 1); assert.match(P5([st], m)[0], /slow push/);
  assert.equal(P5([st], {...m, pushOf: {S0: .019}}).length, 1); assert.equal(P5([st], {...m, pushOf: {S0: STATIC_PUSH}}).length, 0); assert.equal(P5([{...st, breath: true}], m).length, 0);
  assert.equal(P5([{...st, d: 2.4, mood: 'tension'}], m).length, 0);   // ≤ 2.5 s static: nothing needed
  assert.equal(P5([{d: 2, move: 'push'}], m).length, 0);   // no mood: the 3.5 s moving limit
});
test('payoffEV: ramps in over 6 frames, eases out over 10, never pops', () => {
  const sh = [{start: 0, frames: 30, mood: 'fun'}, {start: 30, frames: 40, mood: 'payoff'}, {start: 70, frames: 20, mood: 'fun'}];
  assert.equal(payoffEV(sh, 10), null); const ev = n => payoffEV(sh, n), key = .3;
  assert.ok(Math.abs(ev(30) - .1) < .05); assert.ok(Math.abs(ev(30 + RAMP_IN - 1) - key) < 1e-9); assert.equal(ev(50), key);
  let maxStep = 0; for (let n = 31; n < 70; n++) maxStep = Math.max(maxStep, Math.abs(ev(n) - ev(n - 1))); assert.ok(maxStep < .06, 'max step ' + maxStep);   // a pop would be .2
  assert.ok(Math.abs(ev(69) - .1) < 1e-9); assert.ok(ev(70 - EASE_OUT - 1) === key && ev(70 - EASE_OUT) < key);
  assert.equal(payoffEV(sh.slice(0, 2), 69), 0);
});
