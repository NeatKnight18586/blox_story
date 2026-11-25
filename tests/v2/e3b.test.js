// E3b staging pass (opt-in pieces): D1 `clear` (engine/clear6.js), brief `clear` / `clear: off` / META `clear:` / `keep:`, `key:`,
// crowd `crowdArea:` (spread start, partial steps) + `crowdAvoid:`, story markers `sitOn:` / `lie:` / `rise:`. Legacy specs unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clearScreen, overlap, segSeg, clearHidden, CLEAR} from '../../engine/clear6.js';
import {crowdAt, crowdStart, markerOf, MARKERS, inBox} from '../../engine/story6.js';
import {parseBrief, briefToSpec} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';

const lib = loadLibrary('.'), J = p => JSON.parse(readFileSync(p, 'utf8'));
const md = readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8'), cues = J('stories/_fixture_e2/cues.json');
const run = edit => briefToSpec(parseBrief(edit(md)), cues, lib, {slug: '_fixture_e2'});
const R = (x0, x1, y0, y1) => ({x0, x1, y0, y1});

test('clear: a dummy nearer than the subject and overlapping it on screen hides; behind or beside it stays', () => {
  const subj = {rect: R(.4, .6, .2, .9), dist: 10};
  const h = clearScreen(subj, [{name: 'front', rect: R(.5, .7, .3, 1), dist: 6, lensD: 5}, {name: 'behind', rect: R(.45, .55, .3, .8), dist: 14, lensD: 13},
    {name: 'beside', rect: R(.7, .9, .3, .9), dist: 6, lensD: 5}, {name: 'lens', rect: null, dist: Infinity, lensD: CLEAR.lens - .1}, {name: 'level', rect: R(.4, .6, .2, .9), dist: 10 - CLEAR.behind + .01, lensD: 8}]);
  assert.deepEqual([...h].sort(), ['front', 'lens']);
  assert.equal(overlap(R(0, .5, 0, .5), R(.25, 1, .25, 1)), .0625); assert.equal(overlap(R(0, .2, 0, .2), R(.3, 1, .3, 1)), 0);
});
test('clear: segment distance + the capsule rule (lens, sight line)', () => {
  assert.ok(Math.abs(segSeg([0, 0, 0], [10, 0, 0], [5, 1, -2], [5, 1, 2]).d - 1) < 1e-9);
  const h = clearHidden([0, 2, 0], [[0, 2, 20]], [{name: 'onLine', p: [0, 0, 10]}, {name: 'off', p: [6, 0, 10]}, {name: 'atLens', p: [1, 0, 1]}, {name: 'past', p: [0, 0, 25]}]);
  assert.deepEqual([...h].sort(), ['atLens', 'onLine']);
});
test('brief: META clear sizes set shot.clear; a row `clear` / `clear: off` / `keep:` override; no META = no field', () => {
  const plain = run(s => s).spec; assert.ok(plain.shots.every(s => s.clear === undefined && s.keep === undefined));
  const R5 = '| 5 | 5.2–6.1 | Right into the pool |';
  const {spec, errors} = run(s => s.replace('- slug: _fixture_e2', '- slug: _fixture_e2\n- clear: medium close (D1)').replace('splash: big @ into;', 'splash: big @ into; clear: off; keep: dummya; key: 30 25;'));
  assert.deepEqual(errors, []); const sizes = spec.shots.map(s => [s.size, !!s.clear, s.id]);
  for (const [size, c, id] of sizes) if (id !== 'S05') assert.equal(c, ['medium', 'close'].includes(size), id);
  const s5 = spec.shots[4]; assert.equal(s5.clear, undefined); assert.deepEqual(s5.keep, ['dummya']); assert.deepEqual(s5.key, {el: 30, offset: 25}); assert.ok(md.includes(R5));
  assert.ok(run(s => s.replace('- slug: _fixture_e2', '- slug: _fixture_e2\n- clear: huge')).errors.some(e => /clear: unknown size "huge"/.test(e)));
});
test('crowd: crowdArea spreads the start inside the box and keeps out of crowdAvoid; steps carry n only then', () => {
  const plain = run(s => s).spec; assert.ok(plain.story6.crowd.steps.every(q => q.n === undefined) && !plain.story6.crowd.partial);
  const {spec, errors} = run(s => s.replace('crowd: dummies 40 wander;', 'crowd: dummies 40 wander; crowdArea: 0 30 -40 0; crowdAvoid: 10 20 -25 -15;'));
  assert.deepEqual(errors, []); const C = {...spec.story6.crowd, n: 40}; assert.equal(C.spread, true); assert.equal(C.partial, true);
  for (let i = 0; i < 40; i++) { const p = crowdStart(i, C).p; assert.ok(inBox(p[0], p[1], C.area), `start ${i}`); assert.ok(!inBox(p[0], p[1], C.avoid[0]), `avoid ${i}`); }
  const steps = C.steps.map(s => ({...s, anchorPos: [0, 0, -20]}));
  for (let i = 0; i < 40; i++) for (const t of [3, 8, 14]) { const p = crowdAt(i, t, {...C, steps}).p; if (t < steps[1].t) assert.ok(!inBox(p[0], p[1], {x0: 10.5, x1: 19.5, z0: -24.5, z1: -15.5}), `wander ${i} ${t}`); }
});
test('crowd partial: a step with n moves only the first n; the rest keep their previous behaviour', () => {
  const C = {n: 6, seed: 3, start: [0, 0], area: {x0: -20, x1: 20, z0: -20, z1: 20}, partial: true, steps: [{t: 0, behaviour: 'wander', anchorPos: [0, 0, 0]}, {t: 1, behaviour: 'idle', n: 2, anchorPos: [0, 0, 0]}]};
  for (let i = 0; i < 6; i++) { const s = crowdAt(i, 5, C); assert.equal(s.moving, i >= 2, `dummy ${i}`); }
  const L = {...C, partial: false}; for (let i = 0; i < 6; i++) assert.equal(crowdAt(i, 5, L).moving, false);   // legacy: every dummy idles
});
test('markers: sitOn / lie / rise parse; brief writes them with the row end', () => {
  assert.deepEqual(MARKERS.sitOn('bitsy hero right'), {partner: 'bitsy', lead: 'hero', side: 1});
  assert.deepEqual(MARKERS.lie('hero left'), {actor: 'hero', side: -1}); assert.deepEqual(MARKERS.rise('dummyc'), {actor: 'dummyc'});
  assert.throws(() => MARKERS.sitOn('bitsy')); assert.throws(() => MARKERS.lie('hero up')); assert.equal(markerOf('crowdArea: 1 2 3 4'), null);
  const {spec, errors} = run(s => s.replace('splash: big @ into;', 'splash: big @ into; sitOn: bitsy hero @ pool; lie: hero right; rise: hero @ into;'));
  assert.deepEqual(errors, []); const s5 = spec.shots[4], end = +s5.cue[1].toFixed(3);
  assert.equal(spec.story6.sits[0].until, end); assert.equal(spec.story6.lies[0].until, end); assert.equal(spec.story6.rises[0].actor, 'hero');
});
