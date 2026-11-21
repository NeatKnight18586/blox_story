// E2 story mechanics: marker parsing + errors (engine/story6.js), brief2spec wiring, and the pure motion maths.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../engine/story6.js';
import {parseBrief, briefToSpec} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';
import {readFileSync} from 'node:fs';

test('drain: parse, regions, the hero head never drains', () => {
  assert.deepEqual(S.parseDrain('hero legs @ legs'), {actor: 'hero', region: 'legs', word: 'legs'});
  for (const r of S.DRAIN_REGIONS) assert.equal(S.parseDrain(`hero ${r} @ w`).region, r);
  assert.throws(() => S.parseDrain('hero head @ w'), /head never drains/);
  assert.throws(() => S.parseDrain('hero face @ w'), /head never drains/);
  assert.throws(() => S.parseDrain('bitsy head @ w'), /not a drain region/);
  assert.throws(() => S.parseDrain('hero elbows @ w'), /unknown drain region/);
  assert.throws(() => S.parseDrain('hero @ w'), /expected/);
  assert.equal(S.drainError('hero', 'head'), "the hero's head never drains (asked: hero head)");
  assert.equal(S.parseDrain('hero all').word, null);
});
test('bloom: regions, colour, crowd random', () => {
  assert.deepEqual(S.parseBloom('hero all @ back'), {actor: 'hero', region: 'all', colour: null, word: 'back'});
  assert.deepEqual(S.parseBloom('dummyA cheeks #FF8FB1 @ w'), {actor: 'dummyA', region: 'cheeks', colour: '#FF8FB1', word: 'w'});
  for (const r of ['nose', 'arms', 'stripe']) assert.equal(S.parseBloom(`dummyB ${r} @ w`).region, r);
  assert.deepEqual(S.parseBloom('crowd random @ bloomed'), {crowd: true, word: 'bloomed'});
  assert.throws(() => S.parseBloom('crowd all @ w'), /crowd random/);
  assert.throws(() => S.parseBloom('hero head @ w'), /cheeks/);
  assert.throws(() => S.parseBloom('hero all pink @ w'), /#rrggbb/);
  assert.throws(() => S.parseBloom('hero wings @ w'), /unknown bloom region/);
});
test('crowd: behaviours, anchors, max 120', () => {
  assert.deepEqual(S.parseCrowd('dummies 40 wander'), {n: 40, behaviour: 'wander', anchor: null});
  assert.deepEqual(S.parseCrowd('dummies 40 run to towerBase'), {n: 40, behaviour: 'run', anchor: 'towerBase'});
  assert.deepEqual(S.parseCrowd('dummies 30 pile at cushion'), {n: 30, behaviour: 'pile', anchor: 'cushion'});
  assert.deepEqual(S.parseCrowd('dummies 12 idle at plaza'), {n: 12, behaviour: 'idle', anchor: 'plaza'});
  for (const b of ['limp', 'flop']) assert.equal(S.parseCrowd(`dummies 5 ${b}`).behaviour, b);
  assert.throws(() => S.parseCrowd('dummies 121 wander'), /1–120/);
  assert.throws(() => S.parseCrowd('dummies 10 dance'), /expected/);
  assert.throws(() => S.parseCrowd('dummies 10 run'), /expected/);
  assert.throws(() => S.parseCrowd('people 10 wander'), /expected/);
});
test('hand: six actions and their errors', () => {
  assert.deepEqual(S.parseHand('enter'), {act: 'enter'}); assert.deepEqual(S.parseHand('exit'), {act: 'exit'});
  assert.deepEqual(S.parseHand('grab bitsy'), {act: 'grab', actor: 'bitsy'});
  assert.deepEqual(S.parseHand('carry bitsy to towerTop'), {act: 'carry', actor: 'bitsy', anchor: 'towerTop'});
  assert.deepEqual(S.parseHand('throw dummyA'), {act: 'throw', actor: 'dummyA', anchor: null});
  assert.deepEqual(S.parseHand('throw dummyA to pool'), {act: 'throw', actor: 'dummyA', anchor: 'pool'});
  assert.deepEqual(S.parseHand('release bitsy'), {act: 'release', actor: 'bitsy'});
  assert.throws(() => S.parseHand('slap bitsy'), /unknown hand action/);
  assert.throws(() => S.parseHand('enter bitsy'), /no actor/);
  assert.throws(() => S.parseHand('carry bitsy'), /carry <actor> to <anchor>/);
  assert.throws(() => S.parseHand('grab'), /needs an actor/);
});
test('tumble, airCatch, splash, tag, spawn: parse + errors', () => {
  assert.deepEqual(S.parseTumble('hero'), {actor: 'hero', anchor: null}); assert.deepEqual(S.parseTumble('hero to pool'), {actor: 'hero', anchor: 'pool'});
  assert.throws(() => S.parseTumble('hero into pool'), /expected/);
  assert.deepEqual(S.parseAirCatch('hero bitsy'), {hero: 'hero', partner: 'bitsy'}); assert.throws(() => S.parseAirCatch('hero hero'), /expected/); assert.throws(() => S.parseAirCatch('hero'), /expected/);
  assert.deepEqual(S.parseSplash('big @ into'), {size: 'big', word: 'into', anchor: 'pool'}); assert.throws(() => S.parseSplash('small @ x'), /expected/);
  assert.deepEqual(S.parseTag('bitsy "Bitsy"'), {actor: 'bitsy', text: 'Bitsy'}); assert.throws(() => S.parseTag('bitsy Bitsy'), /expected/);
  assert.deepEqual(S.parseSpawn('bitsy @ spawned'), {actor: 'bitsy', word: 'spawned'}); assert.throws(() => S.parseSpawn('bitsy'), /expected/);
  assert.deepEqual(S.markerOf('drain: hero legs @ legs'), {key: 'drain', value: 'hero legs @ legs'}); assert.equal(S.markerOf('look: day'), null);
});
test('brief2spec: every key lands in spec.story6, head drain is a row error', () => {
  const brief = parseBrief(readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8')), cues = JSON.parse(readFileSync('stories/_fixture_e2/cues.json', 'utf8')), lib = loadLibrary('.');
  const {spec, errors} = briefToSpec(brief, cues, lib, {slug: '_fixture_e2'}); assert.deepEqual(errors, []);
  for (const k of ['drains', 'blooms', 'crowd', 'hand', 'tumbles', 'airCatch', 'splashes', 'tags', 'spawns']) assert.ok(spec.story6[k], k);
  assert.equal(spec.story6.crowd.names.length, 40); assert.equal(spec.cast.crowd040.costume, 'CROWD'); assert.deepEqual(spec.lod, {near: 18, max: 24});
  assert.deepEqual(spec.story6.crowd.steps.map(s => s.behaviour), ['wander', 'run', 'pile', 'flop']);
  assert.deepEqual(spec.story6.hand.map(h => h.act), ['enter', 'grab', 'carry', 'release', 'exit']);
  assert.ok(spec.shots.find(s => s.id === 'S11').actions.some(a => a.verb === 'carry' && a.target === 'bitsy'));
  assert.equal(spec.cast.bitsy.costume, 'BITSY');
  const bad = {...brief, rows: brief.rows.map(r => r['#'] === '6' ? {...r, notes: 'drain: hero head @ legs'} : r)};
  assert.ok(briefToSpec(bad, cues, lib, {slug: '_fixture_e2'}).errors.some(e => /row 6 .*head never drains/.test(e)));
  const bad2 = {...brief, rows: brief.rows.map(r => r['#'] === '9' ? {...r, notes: 'hand: carry bitsy to moon @ carried'} : r)};
  assert.ok(briefToSpec(bad2, cues, lib, {slug: '_fixture_e2'}).errors.some(e => /anchor "moon"/.test(e)));
  const plain = briefToSpec(parseBrief(readFileSync('stories/proof6/BRIEF.md', 'utf8')), JSON.parse(readFileSync('stories/proof6/cues.json', 'utf8')), lib, {slug: 'proof6'}).spec;
  assert.equal(plain.story6, undefined, 'specs without markers get no story6'); assert.equal(plain.lod, undefined);
});
test('tumble: ≥ 1.5 turns, limbs lag 0.25 s, lands lying, gets up', () => {
  const o = {t0: 1, from: [0, 0, 0], to: [9, 0, 0]};
  assert.equal(S.tumbleAt(.5, o), null);
  const end = S.tumbleAt(1 + S.TUMBLE.dur - 1e-6, o); assert.ok(end.spin / (2 * Math.PI) >= 1.5);
  for (const t of [1.3, 1.6, 1.9]) { const a = S.tumbleAt(t, o), b = S.tumbleAt(t - .25, o); assert.ok(Math.abs(S.limbAngle(a, t) - b.spin) < 1e-9, 'limbs = torso 0.25 s earlier'); }
  assert.equal(S.tumbleAt(1 + S.TUMBLE.dur + .1, o).phase, 'lie'); assert.equal(S.tumbleAt(1 + S.TUMBLE.dur + 2, o).phase, 'done');
});
test('wash front, pop, particles, flash', () => {
  assert.ok(S.washFront(0, 5, 0, 'down') > 5 && S.washFront(1, 5, 0, 'down') < 0);
  assert.equal(S.washedAt(2, S.washFront(1, 5, 0, 'down'), 'down'), 1); assert.equal(S.washedAt(2, S.washFront(0, 5, 0, 'down'), 'down'), 0);
  assert.equal(S.washedAt(2, S.washFront(1, 5, 0, 'up'), 'up'), 1);
  assert.equal(S.popScale(0, 1), 0); assert.ok(Math.abs(S.popScale(1 + 4 / 30, 1) - 1.1) < 1e-9); assert.equal(S.popScale(1 + 6 / 30, 1), 1);
  assert.equal(S.particlesAt({kind: 'puff', t: 0, p: [0, 0, 0]}, .2).length, S.PUFF_N); assert.ok(S.particlesAt({kind: 'splash', t: 0, p: [0, 0, 0]}, .05).length >= 25);
  assert.equal(S.flashAt(0, 1), 0); assert.ok(Math.abs(S.flashAt(1.1, 1) - 1) < 1e-9);
});
test('hand track: enter from above, grab, carry, release over 4 frames, exit', () => {
  const ev = [{t: 0, act: 'enter'}, {t: 1.2, act: 'grab', actor: 'b', headAt: [0, 3, 40]}, {t: 2, act: 'carry', actor: 'b', anchorPos: [-30, 43, -22]}, {t: 4, act: 'release', actor: 'b'}, {t: 4.5, act: 'exit'}];
  assert.ok(S.handTrack(ev, .05).Q[1] > 60); assert.deepEqual(S.handTrack(ev, 1.2 + S.HAND.approach + .01).Q.map(v => +v.toFixed(3)), [0, 3, 40]);
  assert.equal(S.handTrack(ev, 1.9).holding, 'b'); assert.deepEqual(S.handTrack(ev, 3.9).Q.map(v => +v.toFixed(2)), [-30, 43, -22]);
  assert.ok(Math.abs(S.handTrack(ev, 4 + 2 / 30).grip - .5) < 1e-6); assert.equal(S.handTrack(ev, 4.2).holding, null); assert.equal(S.handTrack(ev, 4.2).released.length, 1);
  assert.equal(S.handTrack(ev, 6).visible, false);
});
test('air catch: meet at tc, fall together, land', () => {
  const o = {tc: 5, partnerFrom: [-30, 40.15, -22], heroFrom: [-30, .15, -30], dir: [0, -1]}, A = S.airCatchAt(5 - 1e-9, o);
  assert.ok(Math.hypot(...A.partner.map((v, i) => v - A.hero[i])) < .05, 'they meet at the catch frame');
  assert.ok(A.catchAt[1] > 5, 'mid-air'); assert.equal(S.airCatchAt(A.tLand + .1, o).phase, 'landed');
});
test('crowd: deterministic, pile ≤ 0.1 interpenetration and 3 high, flop stagger ≤ 0.4 s', () => {
  const crowd = {n: 40, seed: 7, start: [0, 8], area: {x0: -36, x1: 36, z0: -50, z1: 56}, steps: [{t: 0, behaviour: 'wander'}, {t: 4, behaviour: 'run', anchorPos: [-25, 0, -26]}, {t: 8, behaviour: 'pile', anchorPos: [-12, 0, -20]}, {t: 14, behaviour: 'flop'}]};
  assert.deepEqual(S.crowdAt(3, 2.5, crowd), S.crowdAt(3, 2.5, crowd));
  const pile = S.pileSlots(40); assert.ok(S.pileWorst(pile) <= .1, 'pile interpenetration ' + S.pileWorst(pile)); assert.ok(pile.height >= 3 && pile.height <= 4); assert.ok(pile.length >= 20);
  const lying = [...Array(40)].map((_, i) => S.crowdAt(i, 14, crowd, {pile})).filter(s => s.lie && s.lie.u >= 1).length; assert.equal(lying, pile.length);
  const flops = [...Array(40)].map((_, i) => S.crowdAt(i, 15, crowd, {pile})).filter(s => s.flopT !== null); assert.equal(flops.length, 40 - pile.length); assert.ok(flops.every(s => s.flopT >= 14 && s.flopT <= 14.4));
  assert.deepEqual(S.story6Times({}), []);
});
