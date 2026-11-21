// E1 test park: pure pieces of parts/props.js (coaster path, hand curls, sign layout, fan), the testPark world plan
// (parts/sets6/testpark.js anchors, ground, library6 registration) and the troupe additions (DUMMY, costumes).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coasterPoint, coasterFrame, COASTER_LEN, COASTER_LOOP, handCurl, HAND_POSES, signLayout, SIGN_TEXT, fanAngle, PROP6_NAMES} from '../../parts/props.js';
import {parkAnchors, groundY, LAYER, PLAZA, hillHeight} from '../../parts/sets6/testpark.js';
import {resolveTroupe} from '../../engine/troupe.js';
import {buildLayout} from '../../avatar-style/body.js';

const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
test('coaster: closed circuit, continuous, one 14-stud loop the cart rides upside down', () => {
  assert.ok(dist(coasterPoint(0).p, coasterPoint(1 - 1e-9).p) < 1e-3, 'closed');
  let worst = 0; const N = 4000; for (let i = 0; i < N; i++) worst = Math.max(worst, dist(coasterPoint(i / N).p, coasterPoint((i + 1) / N).p));
  assert.ok(worst < COASTER_LEN / N * 2, 'no jumps: ' + worst);
  const ys = []; for (let u = COASTER_LOOP.u0; u <= COASTER_LOOP.u1; u += .001) ys.push(coasterPoint(u).p[1]);
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 14) < .01, 'loop diameter 14');
  assert.equal(COASTER_LOOP.diameter, 14);
  const top = coasterFrame((COASTER_LOOP.u0 + COASTER_LOOP.u1) / 2);
  assert.ok(top.up[1] < -.99 && coasterPoint((COASTER_LOOP.u0 + COASTER_LOOP.u1) / 2).inLoop, 'flipped at the loop top');
  assert.ok(coasterFrame(.05).up[1] > .99, 'upright on the station straight');
});
test('giant hand: grip 0 is open, poses curl the right digits', () => {
  for (const p of HAND_POSES) for (const a of Object.values(handCurl(p, 0)).flat()) assert.equal(a, 0);
  const f = handCurl('fist', 1), pt = handCurl('point', 1), pi = handCurl('pinch', .5);
  assert.ok(['index', 'middle', 'ring'].every(d => f[d][0] > 1.3));
  assert.deepEqual(pt.index, [0, 0]); assert.ok(pt.middle[0] > 1.3 && pt.ring[0] > 1.3);
  assert.ok(Math.abs(pi.index[0] - .375) < 1e-9, 'grip blends linearly');
  assert.deepEqual(handCurl('nope', 1).index, [0, 0]);
});
test('wall sign: two lines that fit the panel', () => {
  const L = signLayout(SIGN_TEXT, {W: 2048, H: 403});
  assert.deepEqual(L.lines, ['DUMMIES HELP', 'EACH OTHER']);
  assert.ok(L.px * 2 * 1.08 <= 403 && L.px * 12 * .64 <= 2048 * .88);
  assert.equal(signLayout('HI').lines.length, 1);
});
test('fan angle and the prop registry', () => {
  assert.equal(fanAngle(0), 0); assert.ok(Math.abs(fanAngle(1.5, 40) - 2 * Math.PI) < 1e-12);
  assert.equal(PROP6_NAMES.length, 15);
  const lib = JSON.parse(readFileSync('parts/library6.json', 'utf8'));
  for (const n of PROP6_NAMES) assert.ok(lib.props.includes(n), n);
});
test('testPark: nine sub-anchors on walkable ground, registered in library6', () => {
  const A = parkAnchors(), names = ['plaza', 'fan', 'pool', 'coaster', 'ring', 'crates', 'spawnPad', 'towerBase', 'towerTop'];
  assert.deepEqual(Object.keys(A).sort(), [...names].sort());
  for (const [n, a] of Object.entries(A)) { const [x, y, z] = a.position; assert.ok(x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1, n);
    if (n !== 'towerTop') assert.ok(Math.abs(y - groundY(x, z)) < 1e-9, n); }
  assert.equal(A.towerTop.position[1], 40 + LAYER.plaza);
  const lib = JSON.parse(readFileSync('parts/library6.json', 'utf8')).locations.testPark;
  assert.equal(lib.world, 'parts/sets6/testpark.js'); assert.deepEqual([...lib.anchors].sort(), [...names].sort());
  for (const n of names) assert.ok(dist(lib.anchorPositions[n], A[n].position) < 1e-3, n);
});
test('testPark ground: layers ≥ 0.05 apart, flat plaza, hills outside', () => {
  const v = Object.values(LAYER).sort((a, b) => a - b); for (let i = 1; i < v.length; i++) assert.ok(v[i] - v[i - 1] >= .05);
  assert.equal(groundY(-30, 50), LAYER.plaza); assert.equal(groundY(16, -20), LAYER.ring); assert.equal(groundY(0, 42), LAYER.pad);
  assert.ok(Math.abs(hillHeight(0, 0)) < 1e-9 && hillHeight(0, -210) > 10);
});
test('troupe: DUMMY slot (torso +5 %) and costumes', () => {
  const data = JSON.parse(readFileSync('cast/troupe6.json', 'utf8'));
  const d = resolveTroupe({troupe: 'DUMMY'}, data);
  assert.equal(d.skin, '#E9E9EC'); assert.equal(d.face, 'neutral'); assert.equal(d.faceStyle, 'v6'); assert.equal(d.hair, null);
  assert.ok(Math.abs(buildLayout(d.build).torso.size[1] / buildLayout('adult_m').torso.size[1] - 1.05) < 1e-9);
  const b = resolveTroupe({troupe: 'LITTLE', costume: 'BITSY'}, data);
  assert.equal(b.skin, '#FFC2D9'); assert.equal(b.regions.torso.main, '#FF7FB0'); assert.equal(b.scale, .62); assert.equal(b.hair.style, 'high_ponytail');
  const k = resolveTroupe({troupe: 'SECOND', costume: 'KID'}, data);
  assert.equal(k.regions.torso.main, '#F28C28'); assert.equal(k.regions.legs.shoes, '#F4F4F4'); assert.equal(k.hair.color, '#4FB548');
  assert.equal(resolveTroupe({troupe: 'DUMMY', costume: 'CROWD'}, data).tier, 'bg');
  assert.throws(() => resolveTroupe({troupe: 'LEAD', costume: 'BITSY'}, data));
  assert.equal(resolveTroupe({troupe: 'LITTLE'}, data).skin, data.troupe.LITTLE.skin, 'the slot itself is unchanged');
});
