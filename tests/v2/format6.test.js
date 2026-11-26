// FORMAT v6 (docs/season1/FORMAT_V6.md): end = voice + 0.85, length ≤ 125 s, hero on screen by 5.0 s, final shot not a wide.
import test from 'node:test';
import assert from 'node:assert/strict';
import {endFor, episodeEnd, DEFAULT_FORMAT, TAIL, MAX_END6, layoutShots} from '../../engine/timeline.js';
import * as PC from '../../engine/plancheck.js';
import {plan5} from '../../engine/plancheck5.js';

const cues = dur => ({duration: dur, lines: [{words: [{w: 'a', start: 0, end: .5}, {w: 'b', start: 4, end: 4.9}, {w: 'b2', start: 5, end: 30}, {w: 'b3', start: 40, end: 50}, {w: 'c', start: 60, end: dur}]}]});
const shot = (id, at, o = {}) => ({id, at, size: 'medium', see: ['x'], why: 'y', move: 'push', ...o});
const plan = (shots, dur, o = {}) => PC.checkPlan({shots: layoutShots({fps: 24, end: endFor(dur, 6), shots}), cues: cues(dur), fps: 24, format: 6, hero: 'HERO', ...o}).errors;
const ok = [shot('a', 0, {size: 'wide', see: ['HERO']}), shot('b', 4), shot('c', 60, {size: 'close', see: ['HERO']})];

test('format 6 end: voice + 0.85, legacy specs keep max(voice + 2.5, 122.5)', () => {
  assert.equal(DEFAULT_FORMAT, 6); assert.equal(TAIL, .85); assert.equal(MAX_END6, 125);
  assert.equal(endFor(100, 6), 100.85); assert.equal(endFor(80.9, 5), 81.75);
  assert.equal(endFor(100, undefined), 122.5); assert.equal(endFor(119.72, undefined), episodeEnd(119.72));
  assert.deepEqual(PC.lengthRule(6), {voice: [0, 124.15], end: [0, 125], tail: .85});
  assert.deepEqual(PC.lengthRule(5).voice, [75, 90]); assert.deepEqual(PC.lengthRule(undefined).voice, [100, 168]);
});

test('format 6 length: no minimum, ends 0.85 s after the voice, hard max 125 s', () => {
  assert.deepEqual(plan(ok, 82), []);                       // 1:22 is fine: never padded
  assert.deepEqual(plan(ok, 124.15), []);
  assert.ok(plan(ok, 124.5).some(e => /125 s hard max/.test(e)));
  const held = PC.checkPlan({shots: layoutShots({fps: 24, end: 122.5, shots: ok}), cues: cues(100), fps: 24, format: 6, hero: 'HERO'}).errors;
  assert.ok(held.some(e => /want voice \+ 0.85 = 100.85/.test(e)), 'a held final shot (old 122.5 end) fails');
  assert.deepEqual(plan5(layoutShots({fps: 24, end: 100.85, shots: ok}), {fps: 24, end: 100.85, len: [0, 125]}).errors.filter(e => /^length/.test(e)), []);
  assert.ok(plan5([], {fps: 24, end: 126, len: [0, 125]}).errors.some(e => /^length 126.00 s outside 0–125/.test(e)));
});

test('format 6 hero by 5.0 s', () => {
  const late = [shot('a', 0, {size: 'wide'}), shot('b', 5.5, {subject: 'HERO'}), shot('c', 60, {size: 'close', see: ['HERO']})];
  assert.ok(plan(late, 82).some(e => /hero HERO first on screen at 5.50 s in b/.test(e)));
  const onTime = [shot('a', 0, {size: 'wide'}), shot('b', 5, {fit: {actor: 'HERO'}}), shot('c', 60, {size: 'close'})];
  assert.deepEqual(plan(onTime, 82), []);
  assert.ok(plan(ok, 82, {hero: undefined}).some(e => /no hero named/.test(e)));
  assert.ok(plan([shot('a', 0, {size: 'wide'}), shot('c', 60, {size: 'close'})], 82).some(e => /hero HERO is in no shot/.test(e)));
  assert.deepEqual(PC.heroFirst(layoutShots({fps: 24, end: 82.85, shots: late}), 'HERO', 24), {id: 'b', t: 5.5});
});

test('format 6 final shot: close-up or two-shot, never a wide or a pull-back', () => {
  assert.ok(plan([...ok.slice(0, 2), shot('c', 60, {size: 'wide', subject: 'HERO'})], 82).some(e => /final shot c is a wide/.test(e)));
  assert.ok(plan([...ok.slice(0, 2), shot('c', 60, {size: 'close', move: 'pull'})], 82).some(e => /final shot c pulls back/.test(e)));
  assert.deepEqual(PC.finalShotIssues([{id: 'z', size: 'medium', move: 'push'}]), []);
  assert.deepEqual(PC.finalShotIssues([]), []);
});

test('format 6 rules stay off for format 5 and legacy specs', () => {
  const wideEnd = [shot('a', 0, {size: 'wide'}), shot('b', 40, {size: 'wide'})];
  const e5 = PC.checkPlan({shots: layoutShots({fps: 24, end: 81.75, shots: wideEnd}), cues: cues(80.9), fps: 24, format: 5}).errors;
  assert.deepEqual(e5, []);
});
