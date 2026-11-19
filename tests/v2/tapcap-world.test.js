import test from 'node:test';
import assert from 'node:assert/strict';
import {crowdFrom, idlePose, CORE, RARE, IDLE} from '../../campaigns/tapcap/world/crowd.js';
import {moodAt, ACTS} from '../../campaigns/tapcap/world/moods.js';
import {sign, capFraction} from '../../engine/signs6.js';
import {TAP} from '../../engine/tapcap.js';

test('crowd: Core + a few Rares, never Cosmic, no two neighbours alike, all 3 loops, deterministic', () => {
  const spots = Array.from({length: 32}, (_, i) => [i, 0]), a = crowdFrom(spots, {rareShare: .06}), b = crowdFrom(spots, {rareShare: .06});
  assert.deepEqual(a, b); assert.ok(a.every(c => [...CORE, ...RARE].includes(c.preset)));
  const rares = a.filter(c => RARE.includes(c.preset)).length; assert.ok(rares >= 1 && rares <= 8, `rares ${rares}`);
  for (let i = 1; i < a.length; i++) assert.notEqual(a[i].preset, a[i - 1].preset);
  for (const l of ['sway', 'hop', 'tap']) assert.ok(a.some(c => c.loop === l), l);
});
test('idle loops are tiny and periodic', () => {
  for (let t = 0; t < 4; t += .05) { const s = idlePose('sway', t, .3), h = idlePose('hop', t, .3), k = idlePose('tap', t, .3);
    assert.ok(Math.abs(s.roll) <= IDLE.sway.roll + 1e-9 && h.dy >= 0 && h.dy <= IDLE.hop.height + 1e-9 && k.tap <= .01 && k.tap >= -TAP.depth - 1e-9); }
  assert.ok(Math.abs(idlePose('sway', .2, .1).roll - idlePose('sway', .2 + IDLE.sway.period, .1).roll) < 1e-9);
});
test('lighting acts: dawn → rain night → golden at the prompt times', () => {
  assert.equal(moodAt(0), 'dawnHope'); assert.equal(moodAt(37.9), 'dawnHope'); assert.equal(moodAt(38.2), 'rainNight'); assert.equal(moodAt(66), 'golden'); assert.equal(ACTS.at(-1).to, 75.16);
});
test('the 4 signs are ≤ 3 words and read at ≥ 3 % from their sizing distance', () => {
  for (const t of ['1 / 102', 'TOP SHELF', 'CORE ROW', 'TRADES']) { const s = sign(t, {readFrom: 12, fov: 54}); assert.ok(capFraction(s.capH, 12, 54) >= .03); }
  assert.throws(() => sign('ONE TWO THREE FOUR'));
});
