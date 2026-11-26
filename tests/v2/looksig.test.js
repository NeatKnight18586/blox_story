// tests/v2/looksig.test.js — Look Signature (pure): outline params, key-art camera rule, living-town helpers, cityDay2 data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {outlineParams, fadeAt, idValue, MODES} from '../../engine/outline.js';
import {hazeMix, gradeGLSL} from '../../engine/look4.js';
import {PLAN, keyArt, screenX, ANCHOR_NAMES} from '../../parts/city/plan.js';
import {blimpAt, laneLoop, governorBlimp, keyArtProps, MOVERS} from '../../parts/city/living.js';
import LOOKS from '../../engine/looks4.json' with {type: 'json'};
import * as T from 'three';

const tris = o => { let n = 0; o.traverse(m => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return n; };

test('outline: 1 px at 720 × 1280, scaled by resolution; classicPlus doubles character width', () => {
  assert.deepEqual(MODES, ['off', 'classic', 'classicPlus']);
  const a = outlineParams('classic', 1280), b = outlineParams('classicPlus', 2560), c = outlineParams('classic', 480);
  assert.equal(a.radius, 1); assert.equal(a.alpha, 1); assert.equal(a.on, true); assert.equal(a.plus, false);
  assert.equal(b.radius, 2); assert.equal(b.charRadius, 4); assert.equal(b.plus, true);
  assert.equal(c.radius, 1); assert.ok(Math.abs(c.alpha - .375) < 1e-9);
  assert.equal(outlineParams('off', 1280).on, false); assert.throws(() => outlineParams('thick', 1280));
  assert.ok(a.dark > .5 && a.dark < .6, 'darken ~55 %, never pure black');
});
test('outline: distance fade full < 40, gone by 250; ids distinct and signed for characters', () => {
  assert.equal(fadeAt(10), 1); assert.equal(fadeAt(40), 1); assert.equal(fadeAt(250), 0); assert.ok(fadeAt(145) > .4 && fadeAt(145) < .6);
  const ids = new Set(Array.from({length: 200}, (_, i) => idValue(i))); assert.equal(ids.size, 200);
  assert.ok(idValue(5) > 0 && idValue(5, 0, true) < 0 && idValue(5) < 1);
});
test('cityDay2: opt-in preset; cityDay untouched; default outline classic (owner decision 1D)', () => {
  const v2 = LOOKS.cityDay2, v1 = LOOKS.cityDay;
  assert.equal(v2.v4.outline, 'classic'); assert.equal(v1.v4.outline, undefined); assert.equal(v1.v4.grade, undefined); assert.equal(v1.base.fogNear, 480);
  assert.ok(v2.base.fogNear >= 250, 'no near haze'); assert.ok(v2.v4.bake.sunI / v2.v4.bake.skyI > v1.v4.bake.sunI / v1.v4.bake.skyI, 'stronger key-to-shadow ratio');
  const sky = new T.Color(v2.base.hemiSky); assert.ok(sky.b > sky.r, 'blue sky fill'); const gr = new T.Color(v2.base.hemiGround); assert.ok(gr.r > gr.b, 'warm bounce');
  assert.ok(v2.v4.grade.sat > 1 && v2.v4.grade.warm[0] > v2.v4.grade.warm[2] && v2.v4.grade.cool[2] > v2.v4.grade.cool[0]);
  assert.match(gradeGLSL(v2.v4.grade), /mix\(vec3\(lg\)/);
  const h = hazeMix(new T.Color(0, 0, 1), [1, 0, 0], .5); assert.deepEqual([h.r, h.g, h.b], [.5, 0, .5]);
});
test('key art: every anchor has a variant; the 4 gate cameras put the subject on a third with a foreground ≤ 6 studs from the lens', () => {
  for (const n of ANCHOR_NAMES) assert.ok(PLAN.anchors[n].keyArt, n);
  for (const n of ['bayNorth', 'plazaWide', 'mainSt', 'heroHouse']) {
    const k = keyArt(n), x = screenX(k, k.subjectCentre); assert.ok(Math.abs(x - (k.third === 'R' ? 2 / 3 : 1 / 3)) < .02, `${n} subject x ${x}`);
    const d = Math.hypot(k.fg.at[0] - k.position[0], k.fg.at[2] - k.position[2]); assert.ok(d <= 6, `${n} fg ${d}`);
    assert.ok(k.movers.length <= 3, n); for (const m of k.movers) assert.ok(MOVERS.includes(m), m);
    assert.ok(!k.auto, n);
  }
});
test('living: blimp spline is periodic; lane loop closes; blimp ≤ 2k tris; foreground props build', () => {
  const a = blimpAt(0).pos, b = blimpAt(PLAN.living.blimp.period).pos; a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-6));
  const L = laneLoop([[[0, 0], [10, 0]]], 2); assert.equal(L.length, 4); assert.deepEqual(L[0], [0, 2]); assert.deepEqual(L[2], [10, -2]);
  assert.ok(tris(governorBlimp()) <= 2000, `blimp ${tris(governorBlimp())}`);
  const g = keyArtProps(['bayNorth', 'heroHouse', 'plazaWide'].map(n => keyArt(n).fg)); assert.ok(g.children.length >= 2 && g.getObjectByName('keyArtKit'), 'picket + kit (jetty planks, lamp)');
});
