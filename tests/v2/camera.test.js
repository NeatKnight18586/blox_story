// npm run v2:test — pure-logic tests for engine/camera.js (docs/V2_BRIEF.md §5.2, §5.3, §12 Session 1).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleCamera, EASE, MOVES, OPEN_HIT, openHitOffset, maxTargetSpeed, speedOk, SPEED_CAP, rng} from '../../engine/camera.js';

const clip = JSON.parse(readFileSync(new URL('../../engine/fixtures/eight-moves.json', import.meta.url)));
const shots = []; { let start = 0; for (const s of clip.shots) { shots.push({...s, start, duration: s.frames / clip.fps}); start += s.frames; } }
const hero = t => ({hero: [-4 + 8 * t / 3, 0, 0]});
const finite = c => [...c.position, ...c.target, c.fov, c.roll].every(Number.isFinite);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('fixture covers every move once', () => {
  assert.deepEqual([...new Set(shots.map(s => s.move))].sort(), MOVES.filter(m => !['drone', 'heroLow', 'snap', 'tiltUp'].includes(m)).sort());   // the A4 moves are tested in s8.test.js
  assert.equal(shots.at(-1).start + shots.at(-1).frames, 90);
});

test('every move produces finite, moving cameras', () => {
  for (const s of shots) {
    const a = sampleCamera(s, 0, hero(s.start / 30)), b = sampleCamera(s, s.duration, hero((s.start + s.frames) / 30));
    assert.ok(finite(a) && finite(b), s.id);
    const moved = dist(a.position, b.position) + dist(a.target, b.target) + Math.abs(a.fov - b.fov);
    assert.ok(moved > .01, `${s.id} (${s.move}) does not move`);
  }
});

test('push moves closer, pull moves away, crane rises, orbit keeps radius', () => {
  const by = m => shots.find(s => s.move === m), at = (s, t) => sampleCamera(s, t, hero(1));
  const p = by('push'); assert.ok(dist(at(p, p.duration).position, p.from.target) < dist(at(p, 0).position, p.from.target));
  const q = by('pull'); assert.ok(dist(at(q, q.duration).position, at(q, q.duration).target) > dist(at(q, 0).position, at(q, 0).target));
  const c = by('crane'); assert.ok(at(c, c.duration).position[1] - at(c, 0).position[1] > 5);
  const o = by('orbit'), r = t => { const k = at(o, t); return Math.hypot(k.position[0] - k.target[0], k.position[2] - k.target[2]); };
  assert.ok(Math.abs(r(0) - r(o.duration)) < 1e-9);
});

test('easing curves hit their endpoints; cubic ones are monotonic', () => {
  for (const [name, f] of Object.entries(EASE)) {
    assert.ok(Math.abs(f(0)) < 1e-12 && Math.abs(f(1) - 1) < 1e-12, name);
    if (name !== 'outBack') for (let i = 1; i <= 100; i++) assert.ok(f(i / 100) >= f((i - 1) / 100) - 1e-12, `${name} not monotonic`);
  }
  const s = {...shots[0], ease: 'nope'}; assert.throws(() => sampleCamera(s, 0));
});

test('a shot with no `to` gets a gentle push (4–7 %)', () => {
  const s = {move: 'push', duration: 2, from: {position: [0, 0, 10], target: [0, 0, 0], fov: 40}};
  const k = 1 - dist(sampleCamera(s, 2).position, [0, 0, 0]) / 10; assert.ok(k >= .04 && k <= .07, String(k));
});

test('deterministic: same inputs give identical output; drift depends on seed', () => {
  for (const s of shots) for (let f = 0; f <= s.frames; f++) assert.deepEqual(sampleCamera(s, f / 30, hero(1)), sampleCamera(s, f / 30, hero(1)));
  const s8 = shots.find(s => s.move === 'static-drift');
  assert.notDeepEqual(sampleCamera(s8, .3), sampleCamera({...s8, seed: 9}, .3));
  const a = rng(5), b = rng(5); for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

test('speed cap: fixture shots pass; a fast pan is caught; whips are exempt', () => {
  // At real shot lengths (plan.js allows 1.2–5 s) every move stays under the cap. The 3 s demo clip
  // squeezes 8 moves into 0.17–0.43 s each, so its own shots are far faster than a real episode allows.
  for (const s of shots) {
    const real = {...s, duration: 3.5, degrees: s.move === 'orbit' ? 8 : s.degrees};
    const walk = t => ({hero: [-1 + 2 * t / 3.5, 0, 0]});
    if (s.move !== 'whip') assert.ok(speedOk(real, walk), `${s.id} ${maxTargetSpeed(real, walk).toFixed(2)}`);
  }
  const pan = {move: 'push', duration: .5, ease: 'linear', from: {position: [0, 2, 10], target: [-6, 2, 0], fov: 45}, to: {position: [0, 2, 10], target: [6, 2, 0], fov: 45}};
  assert.ok(maxTargetSpeed(pan) > SPEED_CAP); assert.equal(speedOk(pan), false); assert.equal(speedOk({...pan, move: 'whip'}), true);
});

test('openHit: punch-in + shake on frames 0–7 only, exactly zero from frame 8, absent on later shots', () => {
  const s = shots[0];
  const f0 = openHitOffset(s, 0); assert.ok(Math.abs(f0.fovScale - (1 - OPEN_HIT.punch)) < 1e-12);
  let moved = 0; for (let f = 1; f < 8; f++) { const o = openHitOffset(s, f / 30); moved += Math.hypot(...o.pos); assert.ok(o.fovScale < 1); }
  assert.ok(moved > 0);
  for (let f = 8; f <= s.frames; f++) assert.deepEqual(openHitOffset(s, f / 30), {fovScale: 1, pos: [0, 0, 0], target: [0, 0, 0], roll: 0});
  // Same shot without the hit is identical from frame 8 on.
  for (let f = 8; f <= s.frames; f++) assert.deepEqual(sampleCamera(s, f / 30), sampleCamera({...s, openHit: false}, f / 30));
  for (const later of shots.slice(1)) for (let f = 0; f <= later.frames; f++) {
    assert.deepEqual(sampleCamera({...later, openHit: true}, f / 30, hero(1)), sampleCamera({...later, openHit: false}, f / 30, hero(1)), later.id);
  }
  // Shake amplitude never exceeds the brief's start amplitude.
  for (let f = 0; f < 8; f++) assert.ok(Math.max(...openHitOffset(s, f / 30).pos.map(Math.abs)) <= OPEN_HIT.amp + 1e-12);
});
