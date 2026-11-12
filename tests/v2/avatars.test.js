// npm run v2:test — Session 2 pure-logic tests: poses, cross-fades, actor budgets, caches, overlays.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POSE_NAMES, samplePose, blendPoses, sampleTimeline, ambientPose, applyPoseSample, PIVOTS, FADE} from '../../engine/poses.js';
import {buildActor, townsperson} from '../../engine/actors.js';
import {triangles, createActor} from '../../avatar-style/body.js';
import {HAIR_STYLES, hairGeometry, EYE_CLEAR} from '../../avatar-style/hair.js';
import {FACES, faceMaterial, setFace} from '../../avatar-style/faces2.js';
import {popScale, bubbleSprite} from '../../engine/overhead.js';

const cast = JSON.parse(readFileSync(new URL('../../stories/nobody/cast.json', import.meta.url))).cast;
const flat = s => [...PIVOTS.flatMap(p => s.pivots[p]), ...Object.values(s.root)];

test('every pose is finite, within joint limits and deterministic', () => {
  for (const n of POSE_NAMES) for (let f = 0; f < 90; f += 3) {
    const a = samplePose(n, f / 30), b = samplePose(n, f / 30);
    assert.deepEqual(a, b, n);
    for (const v of flat(a)) assert.ok(Number.isFinite(v) && Math.abs(v) <= Math.PI + .2, `${n} @${f}: ${v}`);
  }
  assert.throws(() => samplePose('moonwalk', 0)); assert.throws(() => samplePose('run', -1));
});

test('jump leaves and returns to the ground; pull strain steps on twos', () => {
  assert.equal(samplePose('jump', 0).root.dy, 0); assert.ok(Math.abs(samplePose('jump', .7).root.dy) < 1e-9); assert.ok(samplePose('jump', .35).root.dy > 1.5);
  const x = f => samplePose('pull', f / 30).root.dx;
  assert.equal(x(0), x(1)); assert.notEqual(x(1), x(2)); assert.equal(x(2), x(3));
});

test('blend endpoints and cross-fade continuity (0.15–0.2 s)', () => {
  const a = samplePose('point', 0), b = samplePose('cheer', 0);
  assert.deepEqual(flat(blendPoses(a, b, 0)), flat(a)); assert.deepEqual(flat(blendPoses(a, b, 1)), flat(b));
  assert.ok(FADE >= .15 && FADE <= .2);
  const keys = [[0, 'idle'], [1, 'point']];
  const before = sampleTimeline(keys, 1 - 1e-9), at = sampleTimeline(keys, 1);
  for (const [i, v] of flat(at).entries()) assert.ok(Math.abs(v - flat(before)[i]) < .02, 'no pop at the key');
  assert.deepEqual(sampleTimeline(keys, 1 + FADE), samplePose('point', FADE));
});

test('background ambient life is seeded and pure', () => {
  assert.deepEqual(ambientPose(3, 4.2), ambientPose(3, 4.2));
  assert.notDeepEqual(ambientPose(3, 4.2), ambientPose(4, 4.2));
});

test('triangle budgets: hero ≤ 2.5k, background ≤ 300, hair hero ≤ 300 / bg ≤ 60', () => {
  for (const [id, p] of Object.entries(cast)) assert.ok(triangles(buildActor(p, id).root) <= 2500, id);
  for (let s = 1; s <= 12; s++) assert.ok(triangles(buildActor(townsperson(s)).root) <= 300, 'town ' + s);
  for (const st of HAIR_STYLES) {
    const h = hairGeometry(st, 'hero'), b = hairGeometry(st, 'bg');
    if (h) assert.ok(h.attributes.position.count / 3 <= 300, st); if (b) assert.ok(b.attributes.position.count / 3 <= 60, st + ' bg');
  }
});

test('hair never covers the eyes from the front', () => {
  for (const st of HAIR_STYLES) for (const tier of ['hero', 'bg']) {
    const g = hairGeometry(st, tier); if (!g) continue; const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > .4 && Math.abs(p.getX(i)) < .33) assert.ok(p.getY(i) >= EYE_CLEAR, `${st}/${tier}`);
  }
});

test('faces and geometry are cached: switching face or pose never rebuilds meshes', () => {
  for (const f of FACES) assert.equal(faceMaterial(f), faceMaterial(f));
  const a = buildActor(cast.nobody, 'nobody'), geos = [];
  a.root.traverse(o => o.geometry && geos.push(o.geometry));
  for (const f of FACES) setFace(a, f);
  applyPoseSample(a, samplePose('run', .3)); applyPoseSample(a, samplePose('sleep', 1));
  const after = []; a.root.traverse(o => o.geometry && after.push(o.geometry));
  assert.equal(after.length, geos.length); after.forEach((g, i) => assert.equal(g, geos[i]));
  // Same pose applied twice → identical transforms (absolute placement, never accumulated).
  const b = createActor(); applyPoseSample(b, samplePose('wave', .4), {position: [1, 0, 2], yaw: .5}); b.root.updateMatrixWorld(true);
  const m1 = b.pivots.rightShoulder.matrixWorld.clone();
  applyPoseSample(b, samplePose('wave', .4), {position: [1, 0, 2], yaw: .5}); b.root.updateMatrixWorld(true);
  assert.ok(m1.equals(b.pivots.rightShoulder.matrixWorld));
});

test('overlays: tag pop curve and chat bubble word limit', () => {
  assert.equal(popScale(0), .6); assert.ok(popScale(3) > 1.1); assert.equal(popScale(6), 1); assert.equal(popScale(40), 1);
  assert.throws(() => bubbleSprite('this is far too long')); assert.ok(bubbleSprite('need a hand?'));
});
