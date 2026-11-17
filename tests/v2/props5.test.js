// tests/v2/props5.test.js — Toy House E1 fix: new props ≤ 800 tris, pure moving parts, poses blasterAim / drive / holdHands.
import test from 'node:test';
import assert from 'node:assert/strict';
import {toyProp} from '../../parts/sets4/props4.js';
import {PROPS5, PROP5_TRI_MAX, splashBall, SPLASH} from '../../parts/sets4/props5.js';
import {triCount} from '../../parts/sets4/common.js';
import {samplePose} from '../../engine/poses.js';
import {buildTool} from '../../avatar-style/tools.js';

const full = {darts: Array.from({length: 30}, (_, i) => ({from: [0, 3, 0], to: [6, 3, 0], t0: i * .01})), smoke: true};
test('E1 props: ≤ 800 triangles each with every instance live', () => {
  for (const n of Object.keys(PROPS5)) { const g = toyProp(n, 1); g.userData.anim?.(.3, full); assert.ok(triCount(g) <= PROP5_TRI_MAX, `${n} ${triCount(g)}`); }
});
test('E1 props: anim is pure in t (same t → same matrices)', () => {
  for (const n of ['dartVolley', 'ballSplash', 'kart2', 'fountain']) {
    const g = toyProp(n, 1), snap = () => { const out = []; g.traverse(m => { if (m.isInstancedMesh) out.push(m.count, ...m.instanceMatrix.array.slice(0, m.count * 16)); }); return out; };
    g.userData.anim(.7, full); const a = snap(); g.userData.anim(.2, full); g.userData.anim(.7, full); assert.deepEqual(snap(), a, n);
  }
});
test('darts: hidden before t0, stuck at the target after the hit', () => {
  const g = toyProp('dartVolley'), body = g.children[0], p = {darts: [{from: [0, 0, 0], to: [5, 1, 0], t0: 1, dur: .5}]};
  g.userData.anim(.9, p); assert.equal(body.count, 0);
  g.userData.anim(3, p); assert.equal(body.count, 1); const e = body.instanceMatrix.array; assert.ok(Math.abs(e[12] - 5) < 1e-6 && Math.abs(e[13] - 1) < 1e-6);
});
test('ball splash: nothing before the burst, balls rise then land on y ≥ 0', () => {
  assert.equal(splashBall(0, -.1), null);
  for (let i = 0; i < SPLASH.n; i++) { assert.ok(splashBall(i, .2)[1] > .3); assert.ok(splashBall(i, 5)[1] >= 0); }
});
test('blasterAim: 3-frame recoil every 0.5 s, then still', () => {
  const r = t => samplePose('blasterAim', t, {fire0: 0}).pivots.rightShoulder[0];
  assert.ok(r(0) < r(.2) - .2); assert.equal(r(.2), r(.4)); assert.ok(r(.5) < r(.2) - .2); assert.equal(r(3 / 24 + .001), r(.3));
});
test('holdHands: inner arm out toward the partner; drive: both hands forward', () => {
  assert.ok(samplePose('holdHands', .3, {side: 'left'}).pivots.leftShoulder[2] < -.15);
  assert.ok(samplePose('holdHands', .3, {side: 'right'}).pivots.rightShoulder[2] > .15);
  const d = samplePose('drive', .1, {}); assert.ok(d.pivots.leftShoulder[0] < -.5 && d.pivots.rightShoulder[0] < -.5);
  assert.ok(samplePose('drive', .1, {arm: .2}).pivots.rightShoulder[0] > d.pivots.rightShoulder[0]);   // o.arm lowers the hands
  assert.ok(samplePose('blasterAim', .3, {lower: 1}).pivots.rightShoulder[0] > samplePose('blasterAim', .3, {}).pivots.rightShoulder[0] + .9);   // o.lower dips the barrel
});
test('blaster tool: builds as blaster:<seed>', () => { assert.equal(buildTool('blaster:2').name, 'tool_blaster:2'); });
