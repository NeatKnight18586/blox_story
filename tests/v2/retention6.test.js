// Phase 4 pure logic: camera presets + lenses, cut planner, sign sizing, loop helper, format-6 plan rules, Dutch roll.
import test from 'node:test';
import assert from 'node:assert/strict';
import {preset, PRESETS, mmToFov, LENS, framing, loopify, loopScore, loopOk} from '../../engine/presets6.js';
import {planCuts, candidates, chooseCuts, intentOf, parseBeatsTable, CUT} from '../../engine/cutplan.js';
import {sign, capFraction, CAP_FRAC} from '../../engine/signs6.js';
import {sampleCamera} from '../../engine/camera.js';
import {plan5, V6} from '../../engine/plancheck5.js';
import {lengthRule} from '../../engine/plancheck.js';

const moved = s => JSON.stringify(s.from) !== JSON.stringify(s.to ?? s.from) || s.degrees || s.move === 'crashZoom';

test('lenses: mm → vertical fov (36 mm side)', () => {
  assert.equal(mmToFov(18), 90); assert.equal(mmToFov(35), 54.43); assert.ok(Math.abs(mmToFov(85) - 23.91) < .01);
  assert.ok(LENS.wide >= 18 && LENS.wide <= 24 && LENS.action === 35 && LENS.emotion >= 85);
  assert.ok(framing({size: 'close'}).dist < framing({size: 'medium'}).dist * 2);   // the long lens sits back but frames tighter
});

test('every preset: target + duration + intensity → a moving shot the engine can sample', () => {
  for (const name of PRESETS) {
    const s = preset(name, {target: [2, 3, -4], dur: 1.8, intensity: 1, az: 30, follow: name === 'track' ? null : undefined});
    assert.ok(moved(s), name);
    const c = sampleCamera({...s, duration: 1.8}, .9, {});
    assert.ok(c.position.every(Number.isFinite) && Number.isFinite(c.fov), name);
  }
  const lo = preset('push', {target: [0, 3, 0], intensity: .5}), hi = preset('push', {target: [0, 3, 0], intensity: 2});
  const travel = s => Math.hypot(...s.from.position.map((v, i) => v - s.to.position[i]));
  assert.ok(travel(hi) > 3 * travel(lo));
  assert.ok(preset('push', {target: [0, 3, 0]}).from.position[1] < 3);   // low angle (R-LOOK-05)
  assert.throws(() => preset('dolly'));
});

test('dutch roll is opt-in', () => {
  const s = {...preset('push', {target: [0, 2, 0]}), duration: 2};
  assert.equal(sampleCamera(s, 1).roll, sampleCamera({...s, dutch: 0}, 1).roll);
  assert.ok(Math.abs(sampleCamera({...s, dutch: 4}, 1).roll - sampleCamera(s, 1).roll - 4 * Math.PI / 180) < 1e-9);
});

function vo(n, step = .34, gapsAt = {}) {   // n words, sentence every 6 words, extra pauses
  const words = [], lines = []; let t = .1;
  for (let i = 0; i < n; i++) { if (i % 6 === 0) { lines.push({start: t, text: '', wordIdx: [i, Math.min(n, i + 6) - 1]}); } words.push({w: 'w' + i, start: +t.toFixed(3), end: +(t + step - .03).toFixed(3)}); t += step + (i % 6 === 5 ? .2 : 0) + (gapsAt[i] ?? 0); }
  return {words, lines};
}

test('cut planner: cadence, VO pauses, alternation, hero shots, jolt', () => {
  const {words, lines} = vo(300, .34, {40: .6, 120: .9, 200: .5});
  const beats = [{at: 0, intent: 'scale'}, {at: 12, intent: 'clue'}, {at: 30, intent: 'emotion'}, {at: 55, intent: 'reveal'}, {at: 70, intent: 'action'}, {at: 90, intent: 'insert'}];
  const p = planCuts({words, lines, beats, reversalAt: 60, fps: 24});
  assert.ok(p.stats.average >= 1.5 && p.stats.average <= 2.2, `average ${p.stats.average}`);
  assert.ok(p.stats.max <= CUT.max + 1e-6 && p.stats.min >= CUT.min - 1e-6, JSON.stringify(p.stats));
  assert.equal(p.stats.sameClassPairs, 0);
  for (const i of [40, 120, 200]) {   // every pause > 0.4 s holds a cut
    const a = words[i].end, b = words[i + 1].start;
    assert.ok(p.shots.some(s => s.at >= a - 1e-9 && s.at <= b + 1e-9), `pause after word ${i}`);
  }
  assert.deepEqual(p.shots.filter(s => s.hero).map(s => s.hero), ['frame1', 'reversal', 'final']);
  assert.equal(p.shots.filter(s => s.openHit).length, 1); assert.ok(p.shots[0].openHit && p.shots[0].reveal);
  assert.equal(p.shots.find(s => s.intent === 'clue').preset, 'whipZoom');
  assert.equal(p.shots.find(s => s.intent === 'reveal').preset, 'snapZoom');
  assert.ok(Math.abs(p.shots.find(s => s.intent === 'clue').at - 12) < 1.2);   // a beat pulls its cut close
});

test('beats table parsing + intents', () => {
  const md = '| # | in–out (s) | words | shot |\n|---|---|---|---|\n| 01 | 0.00–1.16 | Once | topDown god\'s-eye over the hall |\n| 05 | 3.56–4.56 | One rule | crashZoom to wall clock 9:00 |\n| 35 | 49.8–51.2 | Pip | PIP reveal behind the counter |\n| 40 | 58.9–60.0 | Mo | MO close `cry` |';
  const b = parseBeatsTable(md, ['hall', 'counter']);
  assert.deepEqual(b.map(x => x.intent), ['scale', 'clue', 'reveal', 'emotion']);
  assert.deepEqual(b.map(x => x.place), ['hall', null, 'counter', null]);
  assert.equal(intentOf('anything [insert]'), 'insert');
});

test('signs: ≤ 3 words, cap ≥ 3 % of the frame from the reading distance', () => {
  const g = sign('DAY 19', {at: [0, 4, 0], readFrom: 14, fov: 54});
  assert.ok(capFraction(g.capH, 14, 54) >= CAP_FRAC);
  assert.ok(capFraction(g.capH, 14 * 1.1, 54) >= CAP_FRAC);   // the 15 % margin
  assert.ok(g.w > g.h);
  assert.throws(() => sign('THIS HAS FOUR WORDS'));
  assert.equal(sign('NEVER MEET ANYONE', {}).lines.length, 2);
});

test('loop helper: last shot ends on shot 1 opening pose', () => {
  const a = {id: 'A', at: 0, ...preset('aerialReveal', {target: [0, 2, 0]})}, b = {id: 'B', at: 2, ...preset('orbit', {target: [5, 2, 5]})}, c = {id: 'C', at: 4, ...preset('push', {target: [9, 2, 9]})};
  assert.ok(!loopOk(loopScore(a, c)));
  const L = loopify([a, b, c]);
  assert.ok(loopOk(loopScore(L[0], L.at(-1)))); assert.equal(L.at(-1).loop, true); assert.equal(L.length, 3);
});

test('format 6 plan rules', () => {
  assert.deepEqual(lengthRule(6), {voice: [60, 175], end: [60, 175]});
  assert.equal(V6.avgMin, 1.5); assert.equal(V6.maxLen, 175);
  const shots = Array.from({length: 60}, (_, i) => ({id: 'S' + i, start: i * 48, frames: 48, move: 'push', reveal: i === 0}));   // 2.0 s × 60 = 120 s
  assert.deepEqual(plan5(shots, {fps: 24, limits: V6}).errors, []);
  assert.ok(plan5(shots, {fps: 24}).errors.some(e => /length/.test(e)));   // format 5 numbers reject 120 s
});
