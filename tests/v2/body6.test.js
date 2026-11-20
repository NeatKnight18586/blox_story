// P1: Actor v6 (R15) — joint clamps, liftR6 secondary bends, key poses, grounding FK (pure logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import {clampJoints, jointViolations, JOINTS6, LIMITS6, jointKind, lowestY, layout6, sleeveOf, SEG6, REF6} from '../../avatar-style/body6.js';
import {liftR6, samplePose6, sampleTimeline6, rawKey6, SHEET6, STANDING6, inSwing, POP_MAX} from '../../engine/poses6.js';
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

test('liftR6 run: elbow 80–95°, knee up to 90°, forward chest; idle: straight elbows and knees (P1c)', () => {
  let maxK = 0;
  for (let f = 0; f <= 30; f++) { const t = f / 24, s = liftR6(samplePose('run', t), t, 'run');
    for (const side of ['left', 'right']) { const k = deg(s.pivots[side + 'Knee'][0]), e = -deg(s.pivots[side + 'Elbow'][0]); maxK = Math.max(maxK, k);
      assert.ok(e >= 80 - 1e-9 && e <= 95 + 1e-9, `run elbow ${e}`); assert.ok(k >= 8 - 1e-9 && k <= 90 + 1e-9, `run knee ${k}`); }
    assert.ok(s.pivots.waist[0] > 0); }
  assert.ok(maxK > 85);
  const i = liftR6(samplePose('idle', .4), .4, 'idle');
  assert.equal(i.pivots.leftElbow[0], 0); assert.equal(i.pivots.rightKnee[0], 0); assert.equal(i.pivots.rightElbow[0], 0);
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
  const L = layout6('adult_m'); assert.equal(L.top, 4.02); assert.ok(Math.abs(L.lowH - .38) < 1e-9 && Math.abs(L.upH - 1.62) < 1e-9);
  const y = layout6('youth'); assert.ok(y.top < 4.02 && Math.abs(y.lowH / y.th - .19) < 1e-9);
  const rest = samplePose('idle', 0); for (const j of JOINTS6) rest.pivots[j] = [0, 0, 0]; assert.ok(Math.abs(lowestY(rest)) < 1e-9);   // soles on the ground at rest
});

test('P1b reference: segment heights, arm 1.75 + hand 0.25, leg 1.73 + foot 0.27, sleeve modes', () => {
  assert.ok(Math.abs(SEG6.upperArm[1] + SEG6.lowerArm[1] - REF6.arm) < 1e-9 && Math.abs(SEG6.upperLeg[1] + SEG6.lowerLeg[1] - REF6.leg) < 1e-9);
  assert.equal(SEG6.lowerArm[0], SEG6.upperArm[0]); assert.equal(SEG6.lowerLeg[2], SEG6.upperLeg[2]);   // flush: same width and depth
  assert.equal(SEG6.foot[2], 1);                                                                         // no toe
  assert.equal(sleeveOf({split: .35}), 'elbow'); assert.equal(sleeveOf({split: .85}), 'wrist'); assert.equal(sleeveOf({split: .5}), 'wrist'); assert.equal(sleeveOf({sleeve: 'elbow'}), 'elbow');
});

test('P1b cross-fade: idle ↔ walk ↔ run never adds more than 3° a frame to any joint on top of the poses\' own motion', () => {
  const fps = 24, keys = [[0, 'idle'], [1, 'walk'], [2.7, 'idle'], [4, 'run'], [5.3, 'idle']];
  const KS = keys.map((_, k) => keys.slice(0, k + 1)), at = t => sampleTimeline6(keys, t), one = (n, t0, t) => samplePose6(n, Math.max(0, t - t0));
  let worst = 0;
  for (let f = 1; f < 6.5 * fps; f++) { const t = f / fps, a = at(t - 1 / fps), b = at(t);
    let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
    const own = k => { const [t0, n] = keys[k], f = k < i ? (tt => sampleTimeline6(KS[k], tt)) : (tt => one(n, t0, tt)), x = f(t - 1 / fps), y = f(t); return j => x.pivots[j].map((v, q) => Math.abs(y.pivots[j][q] - v)); };
    const o1 = own(i), o0 = i ? own(i - 1) : o1;
    for (const j of Object.keys(b.pivots)) b.pivots[j].forEach((v, q) => { const d = Math.abs(v - a.pivots[j][q]) - Math.max(o1(j)[q], o0(j)[q]); worst = Math.max(worst, d); }); }
  assert.ok(worst <= POP_MAX + 1e-9, `pop ${(worst / D).toFixed(2)}°`);
});
