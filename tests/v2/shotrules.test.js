// Owner shot rules (2026-11-14): season warnings as pure functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {staticShotIssue, clockBoardIssues, holdIssues, crowdCover, moodIssues, faceAt, SHOT_RULES} from '../../engine/seasoncheck.js';

test('show the verb: static objects only as inserts ≤ 1.5 s', () => {
  assert.equal(staticShotIssue({id: 'A', size: 'wide'}, 2, 1), null, 'a person in frame');
  assert.match(staticShotIssue({id: 'A', size: 'wide'}, 2, 0), /static wide/);
  assert.equal(staticShotIssue({id: 'A', size: 'insert'}, 1.2, 0), null);
  assert.match(staticShotIssue({id: 'A', size: 'insert'}, 1.8, 0), /1.80 s/);
});
test('clock ≤ 3 shots each ≤ 1.5 s, scoreboard ≤ 3 shots', () => {
  const r = (id, dur, clock = 0, board = 0) => ({id, dur, clock, board});
  assert.deepEqual(clockBoardIssues([r('a', 1, .1), r('b', 1.2, .05), r('c', 1, .2), r('d', 4, .01), r('e', 2, 0, .2)]), []);
  assert.ok(clockBoardIssues([r('a', 1, .1), r('b', 1, .1), r('c', 1, .1), r('d', 1, .1)])[0].startsWith('clock in 4 shots'));
  assert.ok(clockBoardIssues([r('a', 2, .1)])[0].includes('a: clock shot is 2.00 s'));
  assert.ok(clockBoardIssues([1, 2, 3, 4].map(k => r('s' + k, 3, 0, .25)))[0].startsWith('scoreboard in 4'));
  assert.deepEqual(clockBoardIssues([1, 2, 3, 4].map(k => r('s' + k, 3, 0, .1))), [], 'a board in the background is not a board shot');
});
test('no framing held > 3 s except the exempt shots', () => {
  const shots = [{id: 'a', start: 0, frames: 90}, {id: 'b', start: 90, frames: 91}, {id: 'c', start: 181, frames: 300}];
  assert.deepEqual(holdIssues(shots, 30, new Set(['c'])).map(x => x.slice(0, 2)), ['b:']);
  assert.deepEqual(holdIssues([{id: 'a', start: 0, frames: 300}], 30, new Set(), 2.5), [], 'the held tail after the voice does not count');
});
test('foreground crowd cover: union area of near members', () => {
  const b = (x0, x1, y0, y1, dist) => ({x0, x1, y0, y1, dist});
  assert.equal(crowdCover([b(0, .5, 0, .5, 3), b(0, .5, 0, .5, 3)]), .25, 'overlapping boxes count once');
  assert.equal(crowdCover([b(0, .5, 0, .5, 30)]), 0, 'far members are background');
  assert.equal(crowdCover([b(0, .5, 0, .5, 8)], 6), 0, 'behind the subject');
  assert.equal(crowdCover([b(-1, 2, -1, 2, 1)]), 1, 'clipped to the frame');
  assert.ok(crowdCover([b(0, .4, .5, 1, 4)]) > SHOT_RULES.crowdCover);
});
test('face mood map and the hero rule', () => {
  const cues = {lines: [{line: 1, start: 0, end: 2}, {line: 2, start: 2, end: 4}]};
  const spec = {hero: 'kit', cast: {kit: {faces: [[0, 'curious'], [2.5, 'polite']]}, dax: {face: 'laugh'}}, faceMap: [[1, 'kit', 'curious'], [2, 'kit', 'polite'], [2, 'dax', 'laugh']]};
  assert.deepEqual(moodIssues(spec, cues), []);
  assert.equal(faceAt(spec.cast.kit, 2.4), 'curious');
  spec.faceMap.push([1, 'kit', 'brave']); assert.match(moodIssues(spec, cues)[0], /wants kit "brave", shows curious/);
  spec.faceMap.pop(); spec.cast.kit.faces.push([3, 'angry']); assert.match(moodIssues(spec, cues)[0], /never on the hero/);
});
