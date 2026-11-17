// Look 6 (after-hours light states): pure logic — pools, height fade, layers, cascade, contrast, clamps, faces box, crashZoom aim.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../../engine/bake.js';
import * as L6 from '../../engine/look6.js';
import * as C from '../../engine/camera.js';
import {faceItems5, bbox} from '../../avatar-style/faces5.js';
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('pool light: full under the lamp, zero beyond its radius and above the lamp, upper surfaces dimmer', () => {
  const L = {p: [0, 10, 0], pool: 8, color: [1, 1, 1], i: 1}, up = [0, 1, 0];
  const centre = B.poolFactor([0, 0, 0], up, L), edge = B.poolFactor([7.9, 0, 0], up, L);
  assert.ok(centre > .95 && centre <= 1); assert.ok(edge > 0 && edge < .05);
  assert.equal(B.poolFactor([8.1, 0, 0], up, L), 0); assert.equal(B.poolFactor([0, 11, 0], up, L), 0);
  assert.ok(B.poolFactor([2, 8, 0], up, L) < B.poolFactor([2, 0, 0], up, L));   // the upper shelves fall off
  assert.equal(B.poolFactor([0, 0, 0], [0, -1, 0], L), 0);                      // faces away from the lamp
});
test('height fade: 1 below y0, min above y1, monotone', () => {
  const f = {y0: 3, y1: 26, min: .15}; assert.equal(B.heightFade(0, f), 1); assert.ok(near(B.heightFade(30, f), .15));
  let prev = 2; for (let y = 0; y <= 30; y++) { const v = B.heightFade(y, f); assert.ok(v <= prev + 1e-12); prev = v; }
});
test('light layers: each layer alone sums to the full light; G-less lights match bakeVertex light loop', () => {
  const lights = [{p: [0, 10, 0], pool: 8, color: [1, .7, .4], i: 1.5}, {p: [3, 6, 0], color: [.2, .8, 1], i: 2, range: 20}];
  const one = B.lightsInto([0, 0, 0], [1, 0, 1], [0, 1, 0], null, null, lights), parts = lights.map(l => B.lightsInto([0, 0, 0], [1, 0, 1], [0, 1, 0], null, null, [l]));
  for (let k = 0; k < 3; k++) assert.ok(near(one[k], parts[0][k] + parts[1][k]));
  const s = L6.shelfLight([1, 0, 1], [[lights[0]], [lights[1]]], [1, .5], [.1, .1, .1]);
  for (let k = 0; k < 3; k++) assert.ok(near(s[k], .1 + parts[0][k] + .5 * parts[1][k]));
});
test('cascade: fraction of lights on (cascadeOn semantics) and the lamp order', () => {
  const e = {at: 2, step: .1}; assert.equal(L6.cascadeFrac(1.9, e, 10), 0); assert.equal(L6.cascadeFrac(2, e, 10), .1); assert.equal(L6.cascadeFrac(2.95, e, 10), 1);
  assert.equal(L6.cascadeFrac(2.95, {...e, on: false}, 10), 0);
  assert.deepEqual(L6.cascadeOrder([[0, 0, -50], [0, 0, 30], [10, 0, 0]], [0, 0, 35]), [1, 2, 0]);
  assert.equal(L6.lampOn(0, 10, .1), true); assert.equal(L6.lampOn(1, 10, .1), false); assert.equal(L6.lampOn(9, 10, 1), true);
});
test('light state: layers ramp from the pre-cascade dusk spill to the state; toyLate keeps half the pendants', () => {
  const v6 = {layers: [1, 1, 1, 0], pre: [0, 0, 0, .55], cascade: true, base: 1, pendants: [1, 1]};
  assert.deepEqual(L6.lightState6(v6, 0).layers, [0, 0, 0, .55]); assert.deepEqual(L6.lightState6(v6, 1).layers, [1, 1, 1, 0]);
  const late = L6.lightState6({layers: [1, 0, 1, 0], cascade: false, pendants: [1, 0]}, 0); assert.deepEqual(late.layers, [1, 0, 1, 0]); assert.deepEqual(late.pendants, [1, 0]);
});
test('owner gates: local contrast either direction; pompom clamp; actor pool gain', () => {
  assert.ok(near(L6.localContrast(.6, .3), 1)); assert.ok(near(L6.localContrast(.2, .4), .5)); assert.equal(L6.localContrast(.5, 0), null);
  const d = L6.clampLen([.3, -.1, .4], .15); assert.ok(near(Math.hypot(...d), .15)); assert.deepEqual(L6.clampLen([.05, 0, .05], .15), [.05, 0, .05]);
  assert.ok(near(L6.actorPool([0, 0, 0], {base: .6, k: 2, max: 3}), .6)); assert.equal(L6.actorPool([5, 5, 5], {base: .6, k: 2, max: 3}), 3);
});
test('faces v5 box: .9 of the head front scales the drawing about the centre; eye line +3 % moves eyes and brows only', () => {
  const a = faceItems5('worried'), b = faceItems5('worried', {box: .9, eyeUp: .03}), bx = (it, k) => bbox(it.filter(i => i.kind === k).flatMap(i => i.line ?? i.pts));
  const ea = bx(a, 'eye'), eb = bx(b, 'eye'); assert.ok(near(eb[0], ea[0] * .9 / .8, 1e-9)); assert.ok(near(eb[3], ea[3] * .9 / .8 + .03, 1e-9));
  const ma = bx(a, 'mouth'), mb = bx(b, 'mouth'); assert.ok(near(mb[1], ma[1] * .9 / .8, 1e-9));
  assert.deepEqual(faceItems5('grin'), faceItems5('grin', {box: .8, eyeUp: 0}));   // default unchanged
});
test('crashZoom ends on the shot subject (aim point above its mark); without a subject the target is fixed', () => {
  const F = {position: [0, 4, 30], target: [0, 3.6, 4], fov: 50}, s = {move: 'crashZoom', duration: 1.5, fps: 24, zoomAt: .4, from: F, to: {fov: 14}, subject: 'mo'};
  const end = C.sampleCamera(s, 1.4, {mo: [3, 0, 6]}); assert.deepEqual(end.target, [3, C.CRASH.aimY, 6]);
  assert.deepEqual(C.sampleCamera(s, .2, {mo: [3, 0, 6]}).target, F.target);
  assert.deepEqual(C.sampleCamera({...s, subject: undefined}, 1.4, {}).target, F.target);
});
