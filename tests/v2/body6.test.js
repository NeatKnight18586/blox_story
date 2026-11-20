// P1: Actor v6 (R15) — joint clamps, liftR6 secondary bends, key poses, grounding FK (pure logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import {clampJoints, jointViolations, JOINTS6, LIMITS6, jointKind, lowestY, layout6} from '../../avatar-style/body6.js';
import {liftR6, samplePose6, sampleTimeline6, rawKey6, SHEET6, STANDING6, inSwing} from '../../engine/poses6.js';
import {samplePose, POSE_NAMES} from '../../engine/poses.js';
const D = Math.PI / 180, deg = r => r / D;
const within = s => JOINTS6.every(j => s.pivots[j].every((x, i) => x >= LIMITS6[jointKind(j)][i][0] - 1e-9 && x <= LIMITS6[jointKind(j)][i][1] + 1e-9));

test('clampJoints: hinges never bend the wrong way, twist or overbend; wrists ±30, ankles ±35', () => {
  const bad = samplePose('idle', 0); for (const j of JOINTS6) bad.pivots[j] = [3, 2, -2];
  bad.pivots.leftElbow = [.5, .3, .2]; bad.pivots.rightKnee = [-.4, .1, 0];
  const c = clampJoints(bad);
  assert.deepEqual(c.pivots.leftElbow, [0, 0, 0]);                 // a forward-only elbow pushed backward stops straight
  assert.deepEqual(c.pivots.rightKnee, [0, 0, 0]);                 // a backward-only knee pushed forward stops straight
  assert.ok(Math.abs(deg(c.pivots.rightElbow[0]) - 0) < 1e-9);     // +3 rad on an elbow → 0
  assert.ok(Math.abs(deg(c.pivots.leftKnee[0]) - 150) < 1e-9);     // 3 rad on a knee → 150°
  assert.ok(Math.abs(deg(c.pivots.leftWrist[1]) - 30) < 1e-9 && Math.abs(deg(c.pivots.rightAnkle[2]) + 35) < 1e-9);
  assert.ok(within(c)); assert.equal(jointViolations(c).length, 0); assert.ok(jointViolations(bad).length > 0);
  assert.equal(bad.pivots.leftElbow[0], .5);                       // pure: the input is untouched
});

test('liftR6 walk: knee 0–45° only in the swing (0 at toe-off and heel strike), planted leg straight, elbow 15–25°', () => {
  let maxK = 0;
  for (let f = 0; f <= 60; f++) { const t = f / 24, s = liftR6(samplePose('walk', t), t, 'walk');
    for (const side of ['left', 'right']) { const k = deg(s.pivots[side + 'Knee'][0]), e = -deg(s.pivots[side + 'Elbow'][0]);
      assert.ok(k >= 0 && k <= 45 + 1e-9, `knee ${k}`); assert.ok(e >= 15 - 1e-9 && e <= 25 + 1e-9, `elbow ${e}`);
      if (!inSwing('walk', t, side)) assert.equal(k, 0); maxK = Math.max(maxK, k); } }
  assert.ok(maxK > 44, 'the swing knee reaches ~45° at passing');
});

test('liftR6 run: elbow 80–95°, knee up to 90°, forward chest; idle: elbow 8°, knee 3°', () => {
  let maxK = 0;
  for (let f = 0; f <= 30; f++) { const t = f / 24, s = liftR6(samplePose('run', t), t, 'run');
    for (const side of ['left', 'right']) { const k = deg(s.pivots[side + 'Knee'][0]), e = -deg(s.pivots[side + 'Elbow'][0]); maxK = Math.max(maxK, k);
      assert.ok(e >= 80 - 1e-9 && e <= 95 + 1e-9, `run elbow ${e}`); assert.ok(k >= 8 - 1e-9 && k <= 90 + 1e-9, `run knee ${k}`); }
    assert.ok(s.pivots.waist[0] > 0); }
  assert.ok(maxK > 85);
  const i = liftR6(samplePose('idle', .4), .4, 'idle');
  assert.ok(Math.abs(deg(i.pivots.leftElbow[0]) + 8) < 1e-9 && Math.abs(deg(i.pivots.rightKnee[0]) - 3) < 1e-9);
});

test('liftR6 keeps the R6 pose and is pure; every R6 pose lifts inside the limits', () => {
  const r6 = samplePose('point', 0), copy = JSON.parse(JSON.stringify(r6)), s = liftR6(r6, 0, 'point');
  assert.deepEqual(r6, copy); assert.deepEqual(s.pivots.rightShoulder, r6.pivots.rightShoulder); assert.equal(s.root.lean, r6.root.lean);
  for (const n of POSE_NAMES) for (const t of [0, .3, .9]) assert.ok(within(samplePose6(n, t)), n);
  assert.deepEqual(samplePose6('walk', .5), samplePose6('walk', .5));   // deterministic
});

test('sheet poses: authored joints inside the limits; grounded poses rest on y 0 (pure FK); jump apex is airborne', () => {
  assert.equal(SHEET6.length, 12);
  for (const n of SHEET6) { const v = jointViolations(rawKey6(n)).filter(x => !x.joint.endsWith('Ankle')); assert.equal(v.length, 0, `${n}: ${JSON.stringify(v)}`); }
  for (const n of STANDING6) { const s = samplePose6(n, 0); assert.ok(Math.abs(lowestY(s) + s.root.dy) < 1e-9, n); }
  assert.ok(samplePose6('jumpApex', 0).root.dy > 1.5);
  const t = sampleTimeline6([[0, 'idle6'], [1, 'cheer6']], 1.09); assert.ok(within(t));   // mid cross-fade stays legal
});

test('layout6: R6 overall lengths (torso 2.02–4.02, hips at 2, head pivot on the torso top)', () => {
  const L = layout6('adult_m'); assert.equal(L.top, 4.02); assert.ok(Math.abs(L.lowH - .45) < 1e-9 && Math.abs(L.upH - 1.55) < 1e-9);
  const y = layout6('youth'); assert.ok(y.top < 4.02 && Math.abs(y.lowH / y.th - .225) < 1e-9);
  const rest = samplePose('idle', 0); for (const j of JOINTS6) rest.pivots[j] = [0, 0, 0]; assert.ok(Math.abs(lowestY(rest)) < 1e-9);   // soles on the ground at rest
});
