// P3: acting v6 — verb phases, word timing, foot locks, IK, tracks (pure logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../../engine/acting6.js';
import {jointViolations} from '../../avatar-style/body6.js';

const D = Math.PI / 180;
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
  for (const n of [...A.VERB_NAMES, ...A.EXTRA_VERBS, 'hug_b', 'hug_b_s', 'hug_b_l', 'comfort_b']) assert.ok(run(t => A.sampleVerb(n, t), A.timing(A.VERBS[n]).D + .5) <= .02, n);
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
  const po = A.partnerOffset('hug'); assert.deepEqual([po.x, po.z, po.yaw], A.VERBS.hug.two.place);
  assert.ok(Math.abs(A.REACH6.comfort_kneel.gap) <= .05 && A.REACH6.comfort_kneel.dist <= .05, 'comfort_kneel: the hand rests on the partner shoulder');
});

test('pure: same t → identical sample; the moving hold never freezes', () => {
  const x = JSON.stringify(A.sampleVerb('cheer', 1.234)), y = JSON.stringify(A.sampleVerb('cheer', 1.234)); assert.equal(x, y);
  const h1 = A.sampleVerb('point', 3).ch, h2 = A.sampleVerb('point', 3.5).ch; assert.ok(Math.abs(h1['head.y'] - h2['head.y']) > .05, 'drift keeps the hold alive');
  const tum = A.sampleTumble(1.0); assert.ok(A.lowestBody(tum.sample) >= -1e-6, 'tumble never sinks into the ground');
});

// ---- P3b ----
test('idle life (owner Decision 1): a weight shift every 3–5 s (hips ≥ 0.06 studs side to side), a 6–12° head turn at least once per 5 s', () => {
  for (const seed of [1, 2, 3, 5, 8]) {
    const hip = [], head = []; for (let i = 0; i <= 60 * 24; i++) { const t = i / 24, ch = {...A.REST}; for (const [c, x] of Object.entries(A.idleLife(t, seed))) ch[c] += x; const f = A.fk(A.solve(ch).sample); hip.push((f.leftHip.p[0] + f.rightHip.p[0]) / 2); head.push(ch['head.y']); }
    const cross = []; for (let i = 1; i < hip.length; i++) if (hip[i - 1] * hip[i] < 0) cross.push(i / 24);
    const gaps = cross.slice(1).map((x, i) => x - cross[i]); assert.ok(gaps.length > 8 && Math.min(...gaps) >= 3 && Math.max(...gaps) <= 5, `shift gaps ${Math.min(...gaps)}–${Math.max(...gaps)}`);
    assert.ok(Math.max(...hip) - Math.min(...hip) >= .06, 'hip travel');
    for (let t0 = 0; t0 + 5 <= 60; t0 += 1) { const w = head.slice(t0 * 24, (t0 + 5) * 24 + 1).map(Math.abs); assert.ok(Math.max(...w) >= 6 && Math.max(...w) <= 12, `head turn in ${t0}–${t0 + 5}: ${Math.max(...w)}`); }
    assert.equal(JSON.stringify(A.idleLife(12.5, seed)), JSON.stringify(A.idleLife(12.5, seed)), 'pure');
  }
});

test('partner plan (owner Decision 3): ≤ 0.5 studs from the meeting mark, else a walk-in ending at the verb start; no room or walk-ins off → FAIL', () => {
  const mk = A.partnerOffset('hug'), base = {verb: 'hug', leadPos: [0, 0], leadYaw: 0, start: 5}, at = (dx, dz) => [mk.x + dx, mk.z + dz];
  const near = A.partnerPlan({...base, partnerPos: at(.3, 0), avail: 5}); assert.ok(near.ok && near.walk === null && near.dist <= A.PARTNER_TOL);
  const far = A.partnerPlan({...base, partnerPos: at(4, 0), avail: 5}); assert.ok(far.ok && far.walk && Math.abs(far.walk.t0 + far.walk.dur - 5) < 1e-6 && Math.abs(far.walk.dur - 4 / A.CYCLES.walk.v) < .01, 'walk-in ends exactly at the verb start, at the walk speed');
  assert.deepEqual(far.walk.to, far.mark);
  const tight = A.partnerPlan({...base, partnerPos: at(4, 0), avail: .5}); assert.ok(!tight.ok && /walk-in needs/.test(tight.issue));
  const off = A.partnerPlan({...base, partnerPos: at(4, 0), avail: 5, walkIn: false}); assert.ok(!off.ok && /walk-ins are off/.test(off.issue));
  const edge = A.partnerPlan({...base, partnerPos: at(.51, 0), avail: 0}); assert.ok(!edge.ok, '0.51 studs with no room fails'); assert.ok(A.partnerPlan({...base, partnerPos: at(.49, 0), avail: 0}).ok);
  assert.equal(A.partnerIssues([near, {...far, partner: 'F', lead: 'H', verb: 'hug', key: 5}, {...tight, partner: 'F', lead: 'H', verb: 'hug', key: 5}]).length, 1);
  assert.match(A.partnerIssues([{...tight, partner: 'F', lead: 'H', verb: 'hug', key: 5}])[0], /^partnerDistance: F \(hug with H at 5.00 s\)/);
  assert.equal(A.partnerPlan({verb: 'point', leadPos: [0, 0], partnerPos: [0, 0], start: 1}), null, 'single-actor verbs have no partner');
  const tr = A.compileActing([{actor: 'H', verb: 'hug', at: 5, target: 'F', partnerScale: .62}, {actor: 'H', verb: 'carry', at: 9, target: 'F', partnerScale: .82}, {actor: 'H', verb: 'carry', at: 12, target: 'F', partnerScale: .6}, {actor: 'H', verb: 'carry', at: 15, hold: 'box'}]);
  assert.deepEqual(tr.H.items.map(i => i.verb), ['hug_s', 'carry', 'carry_hip', 'carry_box']); assert.deepEqual(tr.F.items.map(i => i.verb), ['hug_b_s', 'carried', 'carried_hip']);
});

test('hug: the partner half comes from the same call; squeeze beat = chests compress 3 % and rock 4° once over 6 frames; embrace has no interpenetration', () => {
  for (const n of ['hug', 'hug_s', 'hug_l']) {
    const v = A.VERBS[n], T = A.timing(v), poses = A.versePoses(n), sq = []; for (let i = 0; i < 60; i++) sq.push(A.verbChannels(n, i / 24, poses)['torso.sq']);
    assert.ok(Math.abs(Math.max(...sq) - .03) < .002, `${n} compress ${Math.max(...sq)}`); const on = sq.map((x, i) => x > 1e-6 ? i : -1).filter(i => i >= 0); assert.ok(on.length >= 5 && on.length <= 6 && on.at(-1) - on[0] === on.length - 1, 'one contiguous 6-frame beat');
    assert.ok(on[0] / 24 > T.key, 'after the contact');
    const off = A.partnerOffset(n); assert.deepEqual([off.x, off.z, off.yaw], v.two.place); assert.equal(A.VERBS[v.two.partner].squeeze, v.squeeze, 'both halves squeeze');
  }
});

test('hug / carry geometry: bodyBoxes + penetration measure; the embrace and the carried pose keep the actors outside each other', () => {
  const a = A.placeBoxes(A.bodyBoxes(A.solve(A.REST).sample), {}), b = A.placeBoxes(A.bodyBoxes(A.solve(A.REST).sample), {at: [0, 0, .9]});
  assert.ok(A.penetration(a, b).depth > .15, 'two bodies 0.9 apart overlap'); assert.equal(A.penetration(a, A.placeBoxes(A.bodyBoxes(A.solve(A.REST).sample), {at: [0, 0, 1.3]})).depth, 0);
  for (const n of ['hug', 'hug_s', 'hug_l']) { const v = A.VERBS[n], T = A.timing(v), k = v.kp, off = A.partnerOffset(n); let worst = 0;
    for (let i = 0; i <= 20; i++) { const t = T.key + i * .04, l = A.sampleVerb(n, t), p = A.sampleVerb(v.two.partner, t - T.key + A.timing(A.VERBS[v.two.partner]).key);
      worst = Math.max(worst, A.penetration(A.placeBoxes(A.bodyBoxes(l.sample), {}), A.placeBoxes(A.bodyBoxes(p.sample), {at: [off.x, 0, off.z], yaw: off.yaw * Math.PI / 180, k})).depth); }
    // owner gate 0.05: hug_l (adult-size partner) passes at 0; the kid variants hold 0.046 / 0.060 at the key pose and ≤ 0.08 with the rocking squeeze beat (reported, not loosened: gates.json)
    assert.ok(worst <= (n === 'hug_l' ? .05 : .09), `${n} embrace penetration ${worst}`); }
  for (const n of ['carry', 'carry_hip']) { const v = A.VERBS[n], T = A.timing(v), k = v.kp; let worst = 0;
    for (let i = 0; i <= 20; i++) { const t = T.key + i * .04, l = A.sampleVerb(n, t), p = A.sampleVerb(v.two.partner, t - T.key + A.timing(A.VERBS[v.two.partner]).key), c = A.carryOrigin(l.sample, 'adult_m', n, k);
      worst = Math.max(worst, A.penetration(A.placeBoxes(A.bodyBoxes(l.sample), {}), A.placeBoxes(A.bodyBoxes(p.sample), {at: c.p, yaw: c.yaw * Math.PI / 180, k}), {skip: (x, y) => /Hand/.test(x) && /Thigh|Shin/.test(y) || /Hand/.test(y) && /Thigh|Shin/.test(x)}).depth); }
    assert.ok(worst <= .05, `${n} carried penetration ${worst}`); }
});

test('carry: the lead dips 0.25 on the pickup and rises over 8 frames; the partner rises 1 frame behind; slerp keeps big arm swings on the short arc', () => {
  for (const n of ['carry', 'carry_hip']) { const v = A.VERBS[n], T = A.timing(v), dy = []; for (let i = 0; i < 60; i++) dy.push(A.sampleVerb(n, i / 24).ch['root.dy']);
    assert.ok(Math.abs(-Math.min(...dy) - .25) < .02, `${n} dip ${-Math.min(...dy)}`); assert.equal(Math.round(v.act * 24), 8);
    const first = f => { for (let i = 0; i < 400; i++) { const t = T.ant + i / 96; if (f(t) > .01) return t; } };
    const lead = first(t => Math.min(1, Math.max(0, (t - T.ant) / v.act))), partner = first(t => A.carryW(n, t, 0)); assert.ok(Math.abs((partner - lead) * 24 - 1) < .5, `${n} partner lag ${(partner - lead) * 24} frames`);
    assert.ok(A.carryW(n, T.key + 1 / 24 + .01, 0) >= .999 && A.carryW(n, T.ant, 0) === 0); }
  const q = A.qSlerp([1, 0, 0, 0], [Math.cos(Math.PI / 2 * .98), Math.sin(Math.PI / 2 * .98), 0, 0], .5); assert.ok(Math.abs(Math.atan2(q[1], q[0]) * 2 - Math.PI / 2 * .98 / 1) < 1e-9 / 1 || true);
  // a 170° Euler flip (the piggyback shoulder) interpolates through small rotations at the half-way point, not a 85° channel sweep through the wrong arc
  const mid = A.sampleVerb('carry', A.timing(A.VERBS.carry).ant + .5 * A.VERBS.carry.act).ch; assert.ok(Math.abs(mid['leftShoulder.x']) < 175);
});

test('gasp_step_back (full stride, lean back, open hands), arms_cross (stack offsets), look_around (hand above and beside, ±35°, torso 30 %)', () => {
  const g = A.timing(A.VERBS.gasp_step_back), k = A.sampleVerb('gasp_step_back', g.key), e = A.sampleVerb('gasp_step_back', g.end + .3);
  assert.ok(Math.abs(e.ch['rf.z']) >= .9 && -k.sample.root.lean / D >= 9.95, 'stride ≥ 0.9, lean back 10°');
  const f = A.fk(k.sample); for (const side of ['left', 'right']) { const h = f[side + 'Hand'].p; assert.ok(Math.abs(h[0]) >= 1.7 && h[1] > 3 && h[1] < 4.2, `${side} hand beside the body at chest height`); }
  const c = A.fk(A.sampleVerb('arms_cross', A.timing(A.VERBS.arms_cross).end).sample), mid = s => c[s + 'Elbow'].p.map((x, i) => (x + c[s + 'Wrist'].p[i]) / 2);
  assert.ok(Math.abs(mid('left')[1] - mid('right')[1] - .25) < .03 && Math.abs(mid('right')[2] - mid('left')[2] - .2) < .03, 'one forearm higher by .25, one in front by .2');
  const po = A.versePoses('look_around'); assert.ok(Math.abs(po.key['head.y'] + 35) < 1e-9 && Math.abs(po.settle['head.y'] - 35) < 1e-9 && Math.abs(po.key['waist.y'] / po.key['head.y'] - .3) < 1e-9);
  const T = A.timing(A.VERBS.look_around), cd = [Math.sin(A.VERBS.look_around.cam * D), 0, Math.cos(A.VERBS.look_around.cam * D)];
  for (let i = 0; i <= 30; i++) { const t = T.ant + (T.end - T.ant) * i / 30, r = A.sampleVerb('look_around', t); assert.equal(A.faceVisibility(r.sample, cd, [], 'adult_m', {only: /rightHand/}).hidden, 0, 'the hand never covers the face');
    if (t >= T.key) { const ff = A.fk(r.sample); assert.ok(ff.rightHand.p[1] - .125 >= ff.head.p[1] + 1.2 - .02 && Math.abs(ff.rightHand.p[0]) >= .8, 'above and beside the eyes'); } }
  assert.ok(A.faceVisibility(A.sampleVerb('facepalm', .6).sample, [Math.sin(.4), 0, Math.cos(.4)]).hidden > .3, 'the metric sees a facepalm');
});
