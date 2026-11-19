// Phase 5 pure logic: mood presets (engine/moods7.js + moods7.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOODS, moodLocation, postFor, wbGains, actOf, wantsDof} from '../../engine/moods7.js';

const M = JSON.parse(readFileSync(new URL('../../engine/moods7.json', import.meta.url)));

test('five moods, each complete', () => {
  assert.deepEqual(MOODS, ['dawnHope', 'overcastDread', 'goldenBittersweet', 'nightMystery', 'stormAction']);
  for (const k of MOODS) for (const f of ['hdri', 'exposure', 'sun', 'fog', 'bloom', 'ao', 'dof', 'grade', 'acts']) assert.ok(M[k][f] !== undefined, `${k}.${f}`);
  for (const k of MOODS) assert.equal(M[k].acts.length, 4);
});

test('moods differ in key temperature: warm golden/dawn, cool night/storm/overcast', () => {
  const t = k => M[k].grade.temp;
  assert.ok(t('goldenBittersweet') > t('dawnHope') && t('dawnHope') > 0);
  for (const k of ['overcastDread', 'nightMystery', 'stormAction']) assert.ok(t(k) < 0, k);
});

test('white balance gains keep brightness and follow temperature', () => {
  for (const tp of [-.2, 0, .15]) { const g = wbGains(tp); assert.ok(Math.abs(g.reduce((a, b) => a + b) / 3 - 1) < 1e-3); }
  assert.ok(wbGains(.1)[0] > wbGains(.1)[2]); assert.ok(wbGains(-.1)[0] < wbGains(-.1)[2]);
});

test('acts shift temperature; DOF only on emotion/close shots', () => {
  assert.equal(actOf(10, [25, 55, 80]), 1); assert.equal(actOf(60, [25, 55, 80]), 3); assert.equal(actOf(90, [25, 55, 80]), 4); assert.equal(actOf(90, null), 1);
  const g = M.goldenBittersweet, a1 = postFor(g, {t: 0, acts: [25, 55, 80]}), a4 = postFor(g, {t: 90, acts: [25, 55, 80]});
  assert.ok(Math.abs(a4.grade.temp - a1.grade.temp - (g.acts[3] - g.acts[0])) < 1e-9);
  assert.equal(postFor(g, {shot: {size: 'wide'}, focus: 9}).dof, null);
  assert.equal(postFor(g, {shot: {lens: 'emotion'}, focus: 9}).dof.focus, 9);
  assert.ok(wantsDof({mm: 85}) && !wantsDof({size: 'medium'}));
});

test('moodLocation sets HDRI, exposure, fog and sun on a location', () => {
  const loc = moodLocation({name: 'x', backdrop: {type: 'groundedSkybox', hdri: 'old', height: 5}, sun: {shadow: {size: 1024}}}, M.nightMystery);
  assert.equal(loc.backdrop.hdri, 'night'); assert.equal(loc.backdrop.height, 5); assert.equal(loc.exposure, M.nightMystery.exposure);
  assert.equal(loc.fog.color, '#1a2433'); assert.equal(loc.sun.shadow.size, 1024); assert.equal(loc.sun.color, M.nightMystery.sun.color);
});
