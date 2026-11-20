// P3: acting v6 — verb phases, word timing, foot locks, IK, tracks (pure logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../../engine/acting6.js';
import {jointViolations} from '../../avatar-style/body6.js';

const cues = {lines: [{line: 1, words: [{w: 'Then', start: .2, end: .45}, {w: 'BANG!', start: .5, end: .9}, {w: 'and', start: 1.0, end: 1.1}]},
  {line: 2, words: [{w: 'bang', start: 2.0, end: 2.3}, {w: 'went', start: 2.3, end: 2.5}, {w: 'the', start: 2.5, end: 2.6}, {w: 'drum', start: 2.6, end: 3.2}]}]};

test('verb phases: anticipation is 20 % of the verb, opposite the stroke; the KEY is the first crossing; overshoot 12 % of the stroke', () => {
  for (const n of A.VERB_NAMES) {
    const p = A.verbPhases(n), T = A.timing(A.VERBS[n]);
    assert.ok(Math.abs(p.anticFrac - .2) < 1e-9, `${n} anticipation fraction ${p.anticFrac}`);
    assert.ok(p.antic > 0 && p.antic >= .15 * p.stroke - 1e-9, `${n} anticipation ${p.antic} of stroke ${p.stroke}`);
    assert.ok(p.overshoot >= .08 && p.overshoot <= .16, `${n} overshoot ${p.overshoot}`);
    assert.ok(T.ant < T.key && T.key < T.win && T.win < T.end && Math.abs(T.end - T.D) < 1e-9, n);
  }
  assert.ok(Math.abs(A.keyCrossing() - .2) < .2 && A.keyCrossing() > 0);
});

test('head leads the body by 2 frames, hands settle 2.5 frames after the torso', () => {
  const n = 'point', poses = A.versePoses(n), T = A.timing(A.VERBS[n]), prog = (c, t) => (A.verbChannels(n, t, poses)[c] - poses.antic[c]) / (poses.key[c] - poses.antic[c]);
  const t = T.ant + .02; assert.ok(Math.abs(prog('head.y', t) - prog('waist.y', t + A.LEAD)) < 1e-6, 'the head is where the chest will be 2 frames later');
  const h = A.verbChannels(n, T.end + A.LAG, poses), o = A.verbChannels(n, T.end, poses), settle = poses.settle;
  assert.ok(Math.abs(h['rightElbow.x'] - (settle['rightElbow.x'])) < 2, 'the elbow arrives LAG after the torso');
  assert.ok(Math.abs(o['waist.y'] - settle['waist.y']) < 1.6, 'the torso has settled at T.end (drift ≤ 1.5°)');
});

test('intensity scales amplitude (0.5–1.5, clamped), facing mirrors the verb to the camera side', () => {
  const k = I => A.versePoses('point', {intensity: I}).key['rightShoulder.z'] - A.REST['rightShoulder.z'];
  assert.ok(Math.abs(k(1.5) - 1.5 * k(1)) < 1e-9 && Math.abs(k(.5) - .5 * k(1)) < 1e-9 && k(3) === k(1.5));
  const m = A.versePoses('point', {facing: -40}).key;
  assert.ok(m['leftShoulder.x'] < -80 && Math.abs(m['rightShoulder.x']) < 20, 'mirrored: the left arm points');
  assert.ok(m['root.yaw'] < 0, 'cheated toward the camera side');
});

test('word timing: the KEY lands exactly on the word start (case and punctuation ignored, nth occurrence)', () => {
  assert.equal(A.wordTime(cues, {word: 'bang'}), .5);
  assert.equal(A.wordTime(cues, {word: 'Bang', nth: 2}), 2.0);
  assert.throws(() => A.wordTime(cues, {word: 'pow'}));
  const tr = A.compileActing([{actor: 'H', verb: 'flinch', at: {word: 'bang', nth: 2}, face: 'shock'}], {cues}).H;
  assert.equal(tr.items[0].key, 2.0); assert.ok(Math.abs(tr.items[0].start + A.timing(A.VERBS.flinch).key - 2.0) < 1e-12);
  assert.deepEqual(tr.faces, [[2.0, 'shock']]);
  assert.equal(A.faceAt(tr, 1.99, 'smile'), 'smile'); assert.equal(A.faceAt(tr, 2.0, 'smile'), 'shock');
});

test('stressed words: the Brief marks win, else the loudest word of the line from the envelope', () => {
  const env = {fps: 10, rms: Array.from({length: 40}, (_, i) => i >= 26 && i < 32 ? .9 : .1)};   // "drum" (2.6–3.2) is loudest
  assert.deepEqual(A.stressedWords(cues.lines[1], {env}).map(w => w.w), ['drum']);
  assert.deepEqual(A.stressedWords(cues.lines[1], {marks: ['went'], env}).map(w => w.w), ['went']);
  const tr = A.compileActing([], {cues, env, talk: [{actor: 'H', line: 2, gesture: 'head_nod'}]}).H;
  assert.equal(tr.gestures[0].key, 2.6); assert.equal(tr.gestures[0].verb, 'head_nod');
});

test('foot locks: every planted foot corner drifts ≤ 0.02 studs per contact (verbs, cycles at speed, partner verbs)', () => {
  const run = (f, dur, travel = 0) => { const fr = []; for (let i = 0; i <= Math.round(dur * 24); i++) { const t = i / 24, r = f(t); fr.push({t, corners: A.cornersOf(r.sample), skid: !!r.ch.skid}); }
    return Math.max(0, ...A.footContacts(fr, {travel}).map(c => c.slide)); };
  for (const n of [...A.VERB_NAMES, 'hug_b', 'comfort_b']) assert.ok(run(t => A.sampleVerb(n, t), A.timing(A.VERBS[n]).D + .5) <= .02, n);
  for (const n of ['walk', 'sad_walk', 'sneak', 'run', 'sprint']) assert.ok(run(t => A.sampleCycle(n, t), 2.2, A.CYCLES[n].v) <= .02, n);
  assert.ok(run(t => A.sampleCycle('skid_stop', t), A.SKID.end) <= .02, 'skid_stop after its flagged skid');
  // the metric catches a slide: a foot target dragged along the ground
  const drag = []; for (let i = 0; i <= 12; i++) { const ch = {...A.REST, 'rf.z': i * .01}; drag.push({t: i / 24, corners: A.cornersOf(A.solve(ch).sample)}); }
  assert.ok(Math.max(...A.footContacts(drag).map(c => c.slide)) > .1);
});

test('leg IK puts the ankle on target; arm IK puts the hand on target; joints stay inside LIMITS6', () => {
  const ch = {...A.REST, 'root.dy': -.2, 'root.dz': -.05, 'root.lean': 6, 'lf.z': .3, 'rf.z': -.1, 'rf.x': .8};
  const r = A.solve(ch), f = A.fk(r.sample);
  assert.deepEqual([r.rolled.left, r.rolled.right], [0, 0], 'flat feet (no roll needed)');
  for (const [side, z, x] of [['left', .3, -A.REST['rf.x']], ['right', -.1, .8]]) { const lo = f[side + 'FootCorners'].map(q => q[1]); assert.ok(Math.max(...lo.slice(0, 1)) < 1e-6 || Math.min(...lo) > -1e-6, side); const c = f[side + 'FootCorners'];
    const cx = c.reduce((a, q) => a + q[0], 0) / 8, cz = c.reduce((a, q) => a + q[2], 0) / 8; assert.ok(Math.abs(cx - x) < 1e-6 && Math.abs(cz - z) < 1e-6, `${side} foot on target`); }
  const a = A.armIK('right', [.5, 1.6, 1.5], [-1, 0, 0]), ch2 = {...A.REST, 'rightShoulder.x': a.shoulder[0], 'rightShoulder.y': a.shoulder[1], 'rightShoulder.z': a.shoulder[2], 'rightElbow.x': a.elbow};
  const h = A.fk(A.solve(ch2).sample).rightHand.p, w = A.fk(A.solve(ch2).sample).waist.p; assert.ok(Math.hypot(h[0] - .5, h[1] - w[1] - 1.6, h[2] - 1.5) < 1e-6);
  for (const n of A.VERB_NAMES) for (const I of [.5, 1.5]) for (let i = 0; i <= 40; i++) assert.equal(jointViolations(A.sampleVerb(n, i / 24, {intensity: I}).raw).length, 0, `${n} ×${I} @${i}`);
});

test('tracks: verbs chain from the pose the previous one left; props follow the hand; partners get their half', () => {
  const tr = A.compileActing([{actor: 'H', verb: 'arms_cross', at: 1}, {actor: 'H', verb: 'shrug', at: 3}, {actor: 'H', verb: 'throw', at: 5, hold: 'ball'}, {actor: 'H', verb: 'hug', at: 7, target: 'F'}]);
  const H = tr.H, s1 = H.items[1].start, eps = 1e-4, a = A.trackChannels(H, s1 - eps), b = A.trackChannels(H, s1 + eps);
  for (const c of ['leftElbow.x', 'rightShoulder.x', 'head.y']) assert.ok(Math.abs(a[c] - b[c]) < .5, `continuous into the next verb: ${c}`);
  const before = A.sampleActing(H, 5 - .1), after = A.sampleActing(H, 5.3);
  assert.equal(before.props.ball.held, true); assert.equal(after.props.ball.held, false);
  const hand = A.handAt(before.sample, 'right'); assert.ok(Math.hypot(...before.props.ball.p.map((x, i) => x - hand.p[i])) < 1e-9, 'the held prop rides the hand');
  assert.equal(tr.F.items[0].verb, 'hug_b'); assert.equal(tr.F.items[0].key, 7); assert.equal(tr.F.items[0].partnerOf, 'H');
  assert.deepEqual(A.partnerOffset('hug'), {x: 0, z: 1.75, yaw: 180});
  assert.ok(Math.abs(A.REACH6.comfort_kneel.gap) <= .05 && A.REACH6.comfort_kneel.dist <= .05, 'comfort_kneel: the hand rests on the partner shoulder');
});

test('pure: same t → identical sample; the moving hold never freezes', () => {
  const x = JSON.stringify(A.sampleVerb('cheer', 1.234)), y = JSON.stringify(A.sampleVerb('cheer', 1.234)); assert.equal(x, y);
  const h1 = A.sampleVerb('point', 3).ch, h2 = A.sampleVerb('point', 3.5).ch; assert.ok(Math.abs(h1['head.y'] - h2['head.y']) > .05, 'drift keeps the hold alive');
  const tum = A.sampleTumble(1.0); assert.ok(A.lowestBody(tum.sample) >= -1e-6, 'tumble never sinks into the ground');
});
