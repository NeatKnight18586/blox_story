// npm run v2:test — Phase 1A: the island city plan (parts/city/plan.json + plan.js), pure helpers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLAN, toWorld, toMap, pathPoints, COAST, insideLand, groundY, standY, districtAt, anchor, ANCHOR_NAMES, roadPaths, landmarkSlots, hillsZ} from '../../parts/city/plan.js';

test('map ↔ world: plaza centre is the origin, 1 px = 2 studs, +z south', () => {
  assert.deepEqual(toWorld([191, 154]), [0, 0]);
  assert.deepEqual(toWorld([201, 164]), [20, 20]);
  assert.deepEqual(toMap([20, 20]), [201, 164]);
});
test('coast path is closed and the bay is water, the arms and plaza are land', () => {
  const P = pathPoints(PLAN.coast); assert.deepEqual(P[0], P[P.length - 1]); assert.ok(COAST.length > 100);
  assert.ok(insideLand(0, 0)); assert.ok(!insideLand(0, 150));               // plaza / bay centre
  assert.ok(insideLand(...toWorld([70, 250]))); assert.ok(insideLand(...toWorld([310, 250])));   // west + east arms
  assert.ok(!insideLand(0, 400) && !insideLand(-400, 0));
});
test('groundY: shore ≈ 0, plaza pad exactly +12, hills +45..+70, sea floor under water, south → north rise', () => {
  assert.equal(groundY(0, 0), 12); assert.equal(groundY(20, -20), 12);
  const shore = groundY(...toWorld([190, 200])); assert.ok(Math.abs(shore) < 1, `shore ${shore}`);
  assert.ok(groundY(0, 150) < -2, 'bay floor under water');
  const hills = [[-100, -200], [175, -180], [-215, -170], [0, -200]].map(([x, z]) => groundY(x, z));
  for (const h of hills) assert.ok(h >= 40 && h <= 72, `hill ${h}`);
  assert.ok(Math.max(...hills) >= 55);
  let prev = -Infinity; for (const z of [90, 60, 40, 0, -60, -110, -160]) { const y = groundY(0, z); assert.ok(y >= prev - .3, `rise at z ${z}: ${y} < ${prev}`); prev = y; }
  assert.ok(groundY(-130, -132) - groundY(-130, -116) > 10, 'cliff step');
  assert.equal(standY(0, 150), 0);
});
test('districtAt: every owner district resolves at its drawing position', () => {
  const at = (mx, my) => districtAt(...toWorld([mx, my]));
  assert.equal(at(191, 154), 'plaza'); assert.equal(at(260, 150), 'mainSt'); assert.equal(at(70, 180), 'school');
  assert.equal(at(318, 240), 'harbor'); assert.equal(at(300, 304), 'beach'); assert.equal(at(190, 60), 'wild');
  assert.equal(at(190, 250), 'bay'); assert.equal(at(190, 286), 'bay'); assert.equal(at(360, 340), 'sea');
  assert.ok(hillsZ(0) < -100 && hillsZ(0) > -120);
});
test('anchors: all ten exist, stand on ground or water, look at a different point', () => {
  const need = ['plazaSouth', 'plazaNorth', 'bayNorth', 'boardwalk', 'suburbStreet', 'schoolYard', 'mainSt', 'harborDock', 'beach', 'hillsLookout'];
  assert.deepEqual([...need].sort(), [...ANCHOR_NAMES].sort());
  for (const n of need) { const a = anchor(n); assert.ok(a.position[1] >= standY(a.position[0], a.position[2]) + 1); assert.ok(Math.hypot(a.target[0] - a.position[0], a.target[2] - a.position[2]) > 20); }
  assert.throws(() => anchor('nope'));
  for (const n of Object.values(PLAN.gate)) assert.ok(need.includes(n));
});
test('roads: 3 radials end at the drawing points, 2 shore roads, curved boardwalk', () => {
  const R = roadPaths(); assert.deepEqual(Object.keys(R).sort(), ['boardwalk', 'radialEast', 'radialNorth', 'radialWest', 'shoreEast', 'shoreWest']);
  assert.deepEqual(R.radialNorth.pts.at(-1), toWorld([191, 100])); assert.deepEqual(R.radialWest.pts.at(-1), toWorld([100, 160]));
  assert.deepEqual(R.radialEast.pts.at(-1), toWorld([285, 150])); assert.ok(R.boardwalk.pts.length > 20);
  assert.deepEqual(R.boardwalk.pts[0], toWorld([120, 206])); assert.deepEqual(R.boardwalk.pts.at(-1), toWorld([262, 206]));
});
test('landmark slots: 7, the bell tower is the tallest in town, the duck sits on its rock', () => {
  const L = landmarkSlots(); assert.equal(L.length, 7);
  const town = L.filter(s => s.id !== '7'), hall = L.find(s => s.id === '2');
  for (const s of town) if (s.id !== '2') assert.ok(hall.top > s.top, `${s.id} ${s.top} ≥ hall ${hall.top}`);
  assert.equal(L.find(s => s.id === '5').base, PLAN.landmarks['5'].rock.h);
  assert.deepEqual(L.find(s => s.id === '7').at, toWorld([236, 62]));
});
