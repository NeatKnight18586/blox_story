// fearbell add-on: relative speed gate (scripts/v2/benchref.js, RULEBOOK §6)
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalise, gate, REF, GATE_S} from '../../scripts/v2/benchref.js';
test('normalised = s / ref × 1A base; gate 0.62 unchanged', () => {
  assert.equal(GATE_S, .62); assert.equal(REF.base1A, .068);
  const n = normalise(.9, .1); assert.equal(n.ratio, 9); assert.equal(n.normalised, .612);
  assert.equal(gate(.9, .1).pass, true); assert.equal(gate(.92, .1).pass, false);
  assert.equal(gate(.62, .068).normalised, .62); assert.throws(() => normalise(.5, 0));
});
