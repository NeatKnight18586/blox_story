// npm run v2:test — Session 4: effect samplers are pure, seeded and silent outside their windows.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {progress, fadeAlpha, flashAlpha, shakeOffset, squashScale, meltState, glowLevel, particleState, PARTICLES, TYPES} from '../../engine/effects.js';

test('progress windows and hold', () => {
  const e = {at: 2, dur: 1};
  assert.equal(progress(e, 1.99), null); assert.equal(progress(e, 2), 0); assert.equal(progress(e, 2.5), .5); assert.equal(progress(e, 3.01), null);
  assert.equal(progress({...e, hold: 2}, 4.5), 1); assert.equal(progress({...e, hold: 2}, 5.1), null);
});

test('flash and fade are zero outside their window; flash peaks early and decays', () => {
  const f = {at: 1, dur: .5};
  assert.equal(flashAlpha(f, .9), 0); assert.equal(flashAlpha(f, 1.6), 0);
  const peak = flashAlpha(f, 1 + .5 * .15); assert.ok(peak > .8 && flashAlpha(f, 1.4) < peak);
  assert.equal(fadeAlpha({at: 0, dur: 1}, 0), 0); assert.ok(Math.abs(fadeAlpha({at: 0, dur: 1}, 1) - 1) < 1e-9);
});

test('shake is seeded, damped and exactly zero outside its window', () => {
  const s = {at: 3, dur: .6, amp: .3, seed: 2};
  assert.deepEqual(shakeOffset(s, 2.9), [0, 0, 0]); assert.deepEqual(shakeOffset(s, 3.6), [0, 0, 0]); assert.deepEqual(shakeOffset(s, 9), [0, 0, 0]);
  assert.deepEqual(shakeOffset(s, 3.2), shakeOffset(s, 3.2)); assert.notDeepEqual(shakeOffset(s, 3.2), shakeOffset({...s, seed: 3}, 3.2));
  const early = Math.hypot(...shakeOffset(s, 3.03)), late = Math.max(...[3.5, 3.52, 3.54, 3.56].map(t => Math.hypot(...shakeOffset(s, t))));
  assert.ok(late < early || early < .3 * .2, 'damped');
});

test('squash returns to rest; melt ends low and stays melted; glow pulses only in its window', () => {
  assert.deepEqual(squashScale({at: 0, dur: 1}, -1), [1, 1, 1]);
  const k = squashScale({at: 0, dur: 1}, 0); assert.ok(k[1] < 1 && k[0] > 1);
  assert.ok(Math.abs(squashScale({at: 0, dur: 1}, .999)[1] - 1) < .03);
  assert.equal(meltState({at: 1, dur: 1}, .5), null); assert.ok(Math.abs(meltState({at: 1, dur: 1}, 2).scaleY - .15) < 1e-9); assert.equal(meltState({at: 1, dur: 1}, 5).scaleY, .15);
  assert.equal(glowLevel({at: 1, dur: 1}, .5), 0); assert.ok(glowLevel({at: 1, dur: 1}, 1.5) > 0);
});

test('particles: every preset is finite, seeded and pure; bursts end', () => {
  for (const preset of PARTICLES) {
    const e = {type: 'particles', preset, at: 1, dur: 1, count: 12, seed: 4};
    for (let i = 0; i < 12; i++) for (const t of [1, 1.3, 1.7]) {
      const p = particleState(e, i, t), q = particleState(e, i, t);
      assert.deepEqual(p, q);
      if (p) assert.ok([...p.pos, p.size, p.alpha].every(Number.isFinite), preset);
    }
    assert.equal(particleState(e, 0, .9), null);
    if (preset !== 'stars') assert.ok(Array.from({length: 12}, (_, i) => particleState(e, i, 5)).every(p => p === null), preset + ' ends');
    else assert.equal(particleState(e, 0, 2.5), null);
  }
  assert.notDeepEqual(particleState({preset: 'sparkle', at: 0, seed: 1}, 3, .3), particleState({preset: 'sparkle', at: 0, seed: 2}, 3, .3));
  assert.equal(TYPES.length, 18);   // §5.3's nine + A3's class reveal (pillar, ring, halo, morph, card) + A4 (lightning, shockwave, weather, trail)
});
