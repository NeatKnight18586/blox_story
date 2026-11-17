// Egg preview fixes (owner, 2026-11-14): hair never inside the torso; hatchling proportions; the mother's readable face.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {volumeGeometries, HAIR4_STYLES, insideTorso, clampOutsideTorso, TORSO_BOX} from '../../avatar-style/hair4.js';
import {buildDragon, driveDragon, BABY} from '../../avatar-style/dragon.js';

test('hair v4: no vertex of any style (hero, mid) sits inside the torso box', () => {
  for (const tier of ['hero', 'mid']) for (const st of HAIR4_STYLES) for (const g of volumeGeometries(st, '#553322', tier)) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) assert.ok(!insideTorso(p[i], p[i + 1], p[i + 2]), `${st}/${tier} vertex ${p[i].toFixed(2)},${p[i + 1].toFixed(2)},${p[i + 2].toFixed(2)} inside the torso`);
  }
});
test('torso clamp: pushes back (or front for front locks), leaves the head alone', () => {
  const p = new Float32Array([.6, -1.2, .16, 0, -1.5, -.3, .2, .3, .1, 1.5, -1.2, 0]); assert.equal(clampOutsideTorso(p), 2);
  assert.ok(p[2] > TORSO_BOX.z && p[5] < -TORSO_BOX.z, 'front lock forward, back lock behind'); assert.ok(Math.abs(p[8] - .1) < 1e-6, 'above the shoulders: untouched'); assert.ok(Math.abs(p[11]) < 1e-9, 'beside the torso: untouched');
});
const bbox = o => new T.Box3().setFromObject(o);
test('hatchling: head ≥ 40 % of the body height, big readable eyes; default dragon unchanged in shape', () => {
  const b = buildDragon({baby: true}); driveDragon(b, 1, {keys: [[0, 'perch']]}); b.root.updateMatrixWorld(true);
  const all = bbox(b.root), h = bbox(b.head), r = (h.max.y - h.min.y) / (all.max.y - all.min.y);
  assert.ok(r >= .4, `head ${(r * 100).toFixed(1)} % of the body`); assert.ok(all.min.y >= -.3, 'feet on the ground');
  const e = bbox(b.eyes[0]), eh = (e.max.y - e.min.y) / (h.max.y - h.min.y); assert.ok(eh >= .12, `eye ${(eh * 100).toFixed(0)} % of the head`);
  const d = buildDragon(); driveDragon(d, 1, {keys: [[0, 'perch']]}); d.root.updateMatrixWorld(true); const D = bbox(d.root);
  assert.ok(Math.abs(D.max.y - D.min.y - 19.93) < .05, 'default perch height unchanged'); assert.equal(BABY.head > 1, true);
});
test('mother face v2: white eyes, glowing iris, brow ridge; curl state lies low', () => {
  const d = buildDragon({face: 'v2'}); let white = 0; d.eyes[0].traverse(o => { if (o.isMesh && o.material.color.getHexString() === 'f4f1e8') white++; }); assert.equal(white, 1);
  driveDragon(d, 1, {keys: [[0, 'curl']]}); d.root.updateMatrixWorld(true); assert.ok(bbox(d.root).max.y < 15, 'curled lower than perched');
});
