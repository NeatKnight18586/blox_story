// Phase R: pure parts of the generic location loader (parts/location.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandLayout, mergeLocation, worldUV, sunFromEquirect, horizonColor, texBytes, materialFiles} from '../../parts/location.js';

const J = f => JSON.parse(readFileSync(new URL('../../engine/fixtures/realism/' + f, import.meta.url)));
test('mergeLocation: child wins, materials/modules merge, layout concatenates', () => {
  const m = mergeLocation({a: 1, materials: {x: 1}, modules: {m: 1}, layout: [1]}, {a: 2, extends: 'f', materials: {y: 2}, layout: [2]});
  assert.deepEqual(m, {a: 2, materials: {x: 1, y: 2}, modules: {m: 1}, layout: [1, 2]});
});
test('expandLayout: grid repeats, rotation, per-item material override', () => {
  const loc = {modules: {w: {parts: [{box: [1, 1, 1], at: [1, 0, 0], mat: 'wall', grid: {n: [2, 3], u: [0, 0, 2], v: [0, 4, 0]}}]}},
    layout: [{module: 'w', at: [10, 0, 0], rotY: 180, mats: {wall: 'brick'}}]};
  const p = expandLayout(loc);
  assert.equal(p.length, 6); assert.ok(p.every(q => q.mat === 'brick'));
  assert.ok(Math.abs(p[0].at[0] - 9) < 1e-9 && Math.abs(p[5].at[1] - 8) < 1e-9 && Math.abs(p[5].at[2] + 2) < 1e-9);
  assert.throws(() => expandLayout({modules: {}, layout: [{module: 'nope', at: [0, 0, 0]}]}), /unknown module/);
});
test('the test street: both palettes resolve every material the layout uses', () => {
  const base = J('street-layout.json');
  for (const f of ['street-cc0.json', 'street-procedural.json']) {
    const loc = mergeLocation(base, J(f)), used = new Set(expandLayout(loc).map(p => p.mat));
    for (const m of used) assert.ok(loc.materials[m], `${f}: ${m}`);
  }
});
test('worldUV: dominant-axis planar projection', () => {
  assert.deepEqual(worldUV([2, 3, 4], [0, 1, 0], 2), [1, 2]);
  assert.deepEqual(worldUV([2, 3, 4], [1, 0, 0], 2), [2, 1.5]);
  assert.deepEqual(worldUV([2, 3, 4], [0, 0, -1], 2), [1, 1.5]);
});
test('sunFromEquirect / horizonColor on a synthetic map', () => {
  const w = 64, h = 32, rgb = new Float32Array(w * h * 3).fill(.5); const x = 48, y = 8, i = (y * w + x) * 3; rgb[i] = rgb[i + 1] = rgb[i + 2] = 50;
  const s = sunFromEquirect(rgb, w, h); assert.deepEqual(s.px, [48, 8]); assert.ok(s.el > 40 && s.el < 50 && s.dir[1] > .6);
  assert.ok(Math.abs(horizonColor(rgb, w, h)[0] - .5) < 1e-6);
});
test('texBytes and materialFiles', () => {
  assert.equal(texBytes(1024, 1024), Math.round(1024 * 1024 * 4 * 4 / 3));
  assert.deepEqual(materialFiles('b', {materials: {b: {id: 'red_brick_03', maps: {albedo: 'a.jpg'}}}}), {albedo: 'renders/cache/assets/red_brick_03/a.jpg'});
  assert.equal(materialFiles('x', {materials: {}}), null);
});
