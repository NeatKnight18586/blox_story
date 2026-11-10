// Studio V2 cast API: real Three.js modules, no mocks.
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCharacter, setExpression, EXPRESSIONS, PRESETS} from '../studio/characters/characters.js';
import {applyPose} from '../avatar/poses.js';

const PARTS = ['torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
const PIVOTS = ['head', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
const meshIds = a => { const ids = []; a.root.traverse(o => { if (o.isMesh && !o.name.startsWith('eye') && !o.name.startsWith('glint') && !o.name.startsWith('brow') && !['mouth', 'teeth', 'face_decal'].includes(o.name) && !o.name.startsWith('blush')) ids.push(o.geometry.uuid); }); return ids; };

for (const name of Object.keys(PRESETS)) {
  const a = createCharacter(name);
  assert.deepEqual(Object.keys(a.parts).sort(), [...PARTS].sort(), `${name}: six canonical parts`);
  assert.deepEqual(Object.keys(a.pivots).sort(), [...PIVOTS].sort(), `${name}: five named pivots`);
  assert.ok(a.hair && a.hair.children.length > 3, `${name}: dimensional hair attached`);
  // Ground contact: lowest point sits on y=0 (shoes included).
  a.root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(a.root);
  assert.ok(Math.abs(box.min.y) < .02, `${name}: grounded, min y ${box.min.y}`);
  // Expression swaps reuse cached groups and never rebuild body/hair geometry.
  const before = meshIds(a);
  for (const e of EXPRESSIONS) setExpression(a, e);
  const cached = a.faceLayer;
  setExpression(a, EXPRESSIONS.at(-1));
  assert.equal(a.faceLayer, cached, `${name}: cached face reused`);
  assert.deepEqual(meshIds(a), before, `${name}: body and hair geometry identity preserved`);
  assert.equal(a.pivots.head.children.filter(c => c.name.startsWith('face_')).length, 1, `${name}: exactly one face attached`);
  // Existing deterministic pose API still drives the preset.
  applyPose(a, 'walk_demo', .25); const swing = a.pivots.leftHip.rotation.x;
  applyPose(a, 'neutral'); assert.equal(a.pivots.leftHip.rotation.x, 0);
  applyPose(a, 'walk_demo', .25); assert.equal(a.pivots.leftHip.rotation.x, swing, `${name}: deterministic pose`);
}
assert.equal(createCharacter('pip').root.scale.x, .65, 'Pip keeps child scale');
assert.ok(createCharacter('mother').glasses, 'Mother has the age cue');
assert.throws(() => createCharacter('kai'), /Unknown character preset/);
assert.throws(() => setExpression(createCharacter('leo'), 'smug'), /Unknown expression/);
for (const old of ['neutral', 'worried', 'surprised', 'determined']) setExpression(createCharacter('leo'), old); // legacy names still resolve
console.log(`PASS studio cast (classic): ${Object.keys(PRESETS).length} presets, ${EXPRESSIONS.length} cached sheet expressions each, six parts/five pivots, grounded, geometry identity, deterministic poses`);
