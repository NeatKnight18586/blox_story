// npm run v2:test — Session 5 pure logic: shot timeline, plan rules (§5.2), dragon sampler, directed particles.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutShots, totalFrames, valueAt, keyAt, episodeEnd} from '../../engine/timeline.js';
import {checkPlan, phraseOnsets} from '../../engine/plancheck.js';
import {sampleDragon, dragonPose, DRAGON_STATES, buildDragon, driveDragon, dragonTriangles} from '../../avatar-style/dragon.js';
import {particleState} from '../../engine/effects.js';

const cues = JSON.parse(readFileSync(new URL('../../stories/nobody/cues.json', import.meta.url)));

test('timeline: cut times land on the frame grid, the last shot runs to the end', () => {
  const sh = layoutShots({fps: 30, end: 10, shots: [{id: 'a', at: 0}, {id: 'b', at: 3.48}, {id: 'c', at: 7.444}]});
  assert.deepEqual(sh.map(s => [s.start, s.frames]), [[0, 104], [104, 119], [223, 77]]);
  assert.equal(totalFrames(sh), 300);
  const legacy = layoutShots({shots: [{id: 'a', frames: 10}, {id: 'b', frames: 5}]});
  assert.deepEqual(legacy.map(s => s.start), [0, 10]);
  assert.throws(() => layoutShots({shots: [{id: 'a', at: 0}, {id: 'b'}]}));
  assert.equal(episodeEnd(119.72), 122.5); assert.equal(episodeEnd(140), 142.5);
});

test('timeline: step keys and ramps are pure in t', () => {
  const k = [[0, 0], [8, 0], [10, 1, 'ramp']];
  assert.equal(valueAt(k, 5), 0); assert.equal(valueAt(k, 9), .5); assert.equal(valueAt(k, 12), 1);
  assert.equal(valueAt([[2, 'x']], 1, 'none'), 'none');
  assert.deepEqual(keyAt([[0, 'a'], [3, 'b']], 3), [3, 'b']);
});

test('plan: onsets come from pauses; rules catch bad plans', () => {
  const on = phraseOnsets(cues);
  assert.equal(on[0], 0); assert.ok(on.includes(3.48) && on.includes(77.851) && on.some(x => Math.abs(x - 119) < .01));
  const base = s => ({size: 'wide', see: ['x'], why: 'y', move: 'push', loc: 'field', ...s});
  const shots = layoutShots({fps: 30, end: 122.5, shots: [
    base({id: 'a', at: 0, openHit: true}), base({id: 'b', at: 3.48, size: 'wide'}), base({id: 'c', at: 4.0, size: 'close', loc: 'square'}),
    base({id: 'd', at: 12.21, size: 'medium', openHit: true}), base({id: 'e', at: 119.002, size: 'close'})]});
  const cam = p => ({camera: {position: p, target: [0, 0, 0], fov: 40}, heads: {}});
  const info = shots.map(() => ({speed: .1, first: cam([0, 1, 5]), last: cam([0, 1, 4]), mid: cam([0, 1, 4.5]), early: cam([0, 1, 5])}));
  info[4] = {...info[4], last: cam([0, 1, 5]), speed: .5};
  const r = checkPlan({shots, cues, fps: 30, end: 122.5, info});
  const has = re => r.errors.some(e => re.test(e));
  assert.ok(has(/^b: same size/)); assert.ok(has(/^c: .*from a phrase onset/)); assert.ok(has(/^c: location change/));
  assert.ok(has(/^b: 0\.53 s long/)); assert.ok(has(/^d: .*long/)); assert.ok(has(/^d: openHit/)); assert.ok(has(/^e: no camera motion/));
  assert.ok(has(/^e: pan speed/)); assert.ok(!has(/^a:/));
});

test('dragon: every state samples, cross-fades are deterministic, budget ≤ 4000 triangles', () => {
  for (const s of DRAGON_STATES) for (const t of [0, .5, 1.3]) { const p = dragonPose(s, t); assert.ok(Object.values(p).every(Number.isFinite), s); }
  const keys = [[0, 'perch'], [2, 'roar'], [3, 'cry']];
  assert.deepEqual(sampleDragon(keys, 2.1), sampleDragon(keys, 2.1));
  const mid = sampleDragon(keys, 2.15), a = dragonPose('perch', 2.15), b = dragonPose('roar', .15);
  assert.ok(mid.jaw > a.jaw && mid.jaw < b.jaw);   // cross-fading
  assert.equal(sampleDragon(keys, 3.5).tears, 1); assert.equal(sampleDragon(keys, 3.5).eyes, 0);
  const d = buildDragon(); assert.ok(dragonTriangles(d) <= 4000);
  driveDragon(d, 1, {keys, origin: {position: [1, 2, 3], yaw: .5}}); assert.deepEqual(d.root.position.toArray(), [1, 2, 3]);
});

test('directed particles travel along dir within the cone; defaults unchanged', () => {
  const e = {preset: 'fire', at: 0, dur: 1, count: 10, seed: 3, dir: [0, 0, 1], cone: .1, speed: [10, 10], life: [1, 1], up: 0, gravity: 0, stagger: 0};
  for (let i = 0; i < 10; i++) { const p = particleState(e, i, .5); assert.ok(p.pos[2] > 4.9 && Math.hypot(p.pos[0], p.pos[1]) < 5 * Math.sin(.1) + 1e-6); }
  const plain = {preset: 'sparkle', at: 0, dur: 1, seed: 1};
  assert.deepEqual(particleState(plain, 2, .3), particleState({...plain}, 2, .3));
});

// ---- Amendment A3 (Session 7): class reveal maths, beat shots and card rules ----
import {expandClassReveal, applyPatch, cardState, cardRect, cardOk, CARD} from '../../engine/classes.js';
import {classSword, CLASS_NAMES, triangleCount as tc} from '../../parts/props.js';

test('A3 class swords: six classes, budgets, deterministic', () => {
  assert.equal(CLASS_NAMES.length, 6);
  for (const c of CLASS_NAMES) {
    const h = tc(classSword(c)), b = tc(classSword(c, {tier: 'bg'}));
    assert.ok(h > 0 && h <= 700, `${c} hero ${h}`); assert.ok(b > 0 && b <= 120, `${c} bg ${b}`);
    assert.equal(h, tc(classSword(c)));
  }
  assert.throws(() => classSword('wizard'));
});

test('A3 reveal expands to timed effects and timeline patches', () => {
  const x = expandClassReveal({actor: 'k', cls: 'knight', at: 10});
  const at = type => x.effects.find(e => e.type === type).at;
  assert.equal(at('pillar'), 10); assert.equal(at('flash'), 10.12); assert.equal(at('morph'), 10.15); assert.equal(at('card'), 10.55);
  assert.ok(x.effects.find(e => e.type === 'flash').dur <= 2 / 30 + 1e-9 && x.effects.find(e => e.type === 'flash').peak < .5);   // not a white-out
  assert.ok(x.effects.find(e => e.type === 'shake').amp <= .03);
  assert.deepEqual(x.patch.tools, [[10, 'sword'], [10.15, 'class:knight']]);
  assert.equal(x.patch.keys[1][1], 'raise'); assert.deepEqual(x.patch.kit[0][1], ['helmet']);
  assert.deepEqual(x.patch.tags[0], [10.55, null]); assert.deepEqual(x.patch.tags[1].slice(1), ['Knight', null, {cls: 'knight'}]);
  assert.deepEqual(expandClassReveal({actor: 'k', cls: 'king', at: 0}).patch.kit[0][1], ['crown', 'cape']);
  // later keys of the actor survive the patch (e.g. a taunt at 27 s)
  const merged = applyPatch({keys: [[0, 'pull'], [27, 'point']], tags: [[0, 'Nobody']]}, x.patch);
  assert.deepEqual(merged.keys.map(k => k[1]), ['pull', 'pull', 'raise', 'idle', 'point']);
  assert.deepEqual(merged.tags.map(k => k[1]), ['Nobody', null, 'Knight']);
  const early = applyPatch({keys: [[0, 'pull'], [11, 'point']]}, x.patch);   // a key inside the window wins over later patch keys
  assert.deepEqual(early.keys.map(k => k[1]), ['pull', 'pull', 'raise', 'point']);
});

test('A3 card motion and placement', () => {
  assert.equal(cardState(-.1), null);
  assert.ok(Math.abs(cardState(0).scale - 1.4) < 1e-9); assert.equal(cardState(8 / 30).scale, 1); assert.ok(cardState(.5).landed);
  assert.ok(cardState(1.5).fly > 0 && cardState(1.5).scale < 1); assert.equal(cardState(1.7), null);
  const r = cardRect({x: .5, y: .4}); assert.deepEqual(cardOk(r), []); assert.ok(r.cap >= CARD.big.minCap);
  const edge = cardRect({x: .02, y: .95}); assert.deepEqual(cardOk(edge), []);   // clamped into the safe area, above the caption band
  assert.ok(edge.x0 >= .1 && edge.y1 <= .56);
  assert.ok(cardOk({...r, y0: .55, y1: .65}).some(m => m.includes('caption band')));
  assert.ok(cardOk({...r, cap: .03}).some(m => m.includes('cap height')));
  assert.deepEqual(cardOk(cardRect({x: .5, y: .3}, 'mini')), []);
});

test('A3 beat shots: 0.55–1.2 s, ≤ 3 in a row, before 20 s, on word onsets', () => {
  const base = s => ({see: ['x'], why: 'y', move: 'push', loc: 'field', ...s});
  const sizes = ['medium', 'close', 'medium', 'close', 'wide', 'close'];
  const mk = list => layoutShots({fps: 30, end: 122.5, shots: [base({id: 'a', at: 0, openHit: true, size: 'wide'}), ...list.map((s, i) => base({size: sizes[i], ...s})), base({id: 'z', at: 119.002, size: 'medium'})]});
  const cam = p => ({camera: {position: p, target: [0, 0, 0], fov: 40}, heads: {}});
  const run = shots => checkPlan({shots, cues, fps: 30, end: 122.5, info: shots.map(() => ({speed: .1, first: cam([0, 1, 5]), last: cam([0, 1, 4]), mid: cam([0, 1, 4.5]), early: cam([0, 1, 5])}))}).errors;
  const good = run(mk([{id: 'b1', at: 14.609, beat: true}, {id: 'b2', at: 15.325, beat: true}, {id: 'b3', at: 15.953, beat: true}, {id: 'w', at: 17.114}]));
  assert.ok(!good.some(e => /^b\d/.test(e)), good.join('; '));
  const four = run(mk([{id: 'b1', at: 14.609, beat: true}, {id: 'b2', at: 15.325, beat: true}, {id: 'b3', at: 15.953, beat: true}, {id: 'b4', at: 17.114, beat: true}, {id: 'w', at: 18.533}]));
  assert.ok(four.some(e => e.startsWith('b4: more than 3')));
  const short = run(mk([{id: 'b1', at: 14.609, beat: true}, {id: 'b2', at: 15.0, beat: true}, {id: 'w', at: 15.953}]));
  assert.ok(short.some(e => e.startsWith('b1: beat shot 0.40 s')) && short.some(e => e.startsWith('b2: beat cut at 15.00')));
});
