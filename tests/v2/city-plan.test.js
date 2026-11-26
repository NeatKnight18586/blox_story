// npm run v2:test — Phase 1A: the island city plan (parts/city/plan.json + plan.js), pure helpers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLAN, toWorld, toMap, pathPoints, COAST, insideLand, groundY, stairY, coastDist, standY, districtAt, anchor, ANCHOR_NAMES, roadPaths, landmarkSlots, hillsZ} from '../../parts/city/plan.js';

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
test('groundY (movie-set profile): shore 0, boardwalk +2.3, terrace flat +14, hills to a +75..+90 crest, sea floor under water', () => {
  for (const [x, z] of [[0, 0], [20, -20], [-70, -60], [70, 20], [0, -66], [62, -40], [-79, 31]]) assert.equal(groundY(x, z), 14, `terrace ${x},${z}`);   // plaza, Hall slot, clock-tower slot, corners
  const shore = groundY(...toWorld([190, 200])); assert.ok(Math.abs(shore) < 1.5, `shore ${shore}`);
  assert.equal(groundY(0, 76), PLAN.terrain.promenade); assert.ok(groundY(0, 150) < -2, 'bay floor under water');
  assert.ok(groundY(60, 33.2) < 9, 'retaining wall: the terrace edge drops within 1.5 studs'); assert.ok(groundY(60, 31.9) === 14);
  const crest = [-100, 0, 100].map(x => Math.max(...[-185, -195, -205, -215, -225].map(z => groundY(x, z))));
  for (const c of crest) assert.ok(c >= 75 && c <= 92, `crest ${c}`);
  assert.equal(groundY(...toWorld(PLAN.terrain.hills.knoll.at)), 85, 'stone-head knoll');
  let prev = 14; for (let z = -100; z > -190; z -= 5) { const y = groundY(0, z); assert.ok(y >= prev - 2.5, `hills rise at z ${z}: ${y} < ${prev}`); prev = y; }   // monotonic up to noise
  assert.ok(groundY(0, -100) < 20 && groundY(0, -120) < groundY(0, -170), 'hills start rising at z -100');
  assert.equal(standY(0, 150), 0);
});
test('Grand Stair: 20 steps of equal rise, a 6-deep landing halfway, monotonic, ends on the boardwalk deck', () => {
  const S = PLAN.terrain.stair, rise = (14 - PLAN.terrain.deck) / S.steps, levels = new Set();
  let prev = Infinity; for (let z = S.z0 + .01; z < S.z1; z += .1) { const y = stairY(z); assert.ok(y <= prev + 1e-9, `monotonic at ${z}`); prev = y; levels.add(+y.toFixed(3)); }
  assert.equal(levels.size, 20, '20 distinct tread levels; the landing sits at the 10th level'); assert.ok(Math.abs(stairY(S.z1 - .01) - PLAN.terrain.deck) < 1e-9);
  assert.ok(Math.abs(stairY(S.z0 + 17 + 3) - (14 - 10 * rise)) < 1e-9, 'landing level'); assert.equal(stairY(S.z0 + 10 * 1.7 + 5.9), stairY(S.z0 + 10 * 1.7 + .1));
  assert.equal(groundY(17.9, 50), stairY(50)); assert.notEqual(groundY(25, 50), stairY(50)); assert.equal(groundY(0, 31), 14);
});
test('profile grades: west arm 2 → 12 at ≤ 8 %, Main St 14 → 20, east arm low, docks reachable', () => {
  const g = (x, z) => Math.max(Math.abs(groundY(x + 2, z) - groundY(x - 2, z)), Math.abs(groundY(x, z + 2) - groundY(x, z - 2))) / 4;
  let m = 0; for (let x = -300; x < -200; x += 8) for (let z = -60; z < 280; z += 8) if (insideLand(x, z) && coastDist(x, z) > 50) m = Math.max(m, g(x, z));
  assert.ok(m <= .08, `west arm grade ${m}`);
  assert.ok(groundY(-182, 12) <= 12 && groundY(-182, 12) >= 9, 'west arm inland edge'); assert.ok(Math.abs(groundY(...toWorld([100, 160]).map((v, i) => v + i * 0)) - 9.9) < 1);
  assert.ok(Math.abs(groundY(...toWorld([285, 150])) - 20) < .3, 'Main St north-east end'); assert.equal(groundY(72, 0), 14);
  for (const [x, z] of [[250, 100], [238, 200], [240, 280]]) { const y = groundY(x, z); assert.ok(y >= .9 && y <= 6, `east arm ${x},${z}: ${y}`); }
});
test('districtAt: every owner district resolves at its drawing position', () => {
  const at = (mx, my) => districtAt(...toWorld([mx, my]));
  assert.equal(at(191, 154), 'plaza'); assert.equal(at(260, 150), 'mainSt'); assert.equal(at(70, 180), 'school');
  assert.equal(at(318, 240), 'harbor'); assert.equal(at(300, 304), 'beach'); assert.equal(at(190, 60), 'wild');
  assert.equal(at(190, 250), 'bay'); assert.equal(at(190, 286), 'bay'); assert.equal(at(360, 340), 'sea');
  assert.ok(hillsZ(0) < -100 && hillsZ(0) > -120);
});
test('anchors: all seventeen exist, stand on ground or water, look at a different point', () => {
  const need = ['plazaSouth', 'plazaNorth', 'bayNorth', 'stairBottom', 'boardwalk', 'suburbStreet', 'schoolYard', 'mainSt', 'harborDock', 'beach', 'hillsLookout', 'plazaWide', 'hallBalcony', 'acrossBay', 'schoolFront', 'heroHouse', 'upsideDown'];
  assert.deepEqual([...need].sort(), [...ANCHOR_NAMES].sort());
  for (const n of need) { const a = anchor(n); assert.ok(a.position[1] >= standY(a.position[0], a.position[2]) + 1); assert.ok(Math.hypot(a.target[0] - a.position[0], a.target[2] - a.position[2]) > 20); }
  const ps = anchor('plazaSouth'), bn = anchor('bayNorth'), sb = anchor('stairBottom');
  assert.ok(Math.abs(ps.position[1] - 19.5) < 1e-6 && Math.abs(ps.position[2] - 30) < 1e-6 && ps.fov === 62 && Math.abs(ps.facing) < 1e-6, 'plazaSouth: top of the stair, terrace + 5.5, fov 62, facing south');
  assert.ok(Math.atan2(ps.target[1] - ps.position[1], 200) * 180 / Math.PI < -9 && Math.atan2(ps.target[1] - ps.position[1], 200) * 180 / Math.PI > -14, 'pitch ≈ −10..−13°');
  assert.ok(bn.position[1] === 6 && bn.fov === 50 && Math.abs(Math.abs(bn.facing) - 180) < 1e-6 || Math.abs(bn.facing) > 179, 'bayNorth on the water at y +6, fov 50, facing north');
  assert.ok(sb.fov >= 55 && sb.fov <= 60 && sb.position[2] > PLAN.terrain.stair.z1 && sb.target[2] < sb.position[2] && sb.target[1] > sb.position[1], 'stairBottom (1B): on the boardwalk past the stair foot, fov 55–60, low angle up at the Hall');
  assert.throws(() => anchor('nope'));
  for (const n of [...Object.values(PLAN.gate), ...Object.values(PLAN.gate1b), ...Object.values(PLAN.gate1c)]) assert.ok(need.includes(n));
  assert.ok(!Object.values(PLAN.gate1b).includes('acrossBay') && !Object.values(PLAN.gate1c).includes('acrossBay'), 'Phase 1C: acrossBay is out of the gates');
});
test('roads: 3 radials end at the drawing points, 2 shore roads, curved boardwalk', () => {
  const R = roadPaths(); assert.deepEqual(Object.keys(R).sort(), ['boardwalk', 'radialEast', 'radialNorth', 'radialWest', 'shoreEast', 'shoreWest']);
  assert.deepEqual(R.radialNorth.pts.at(-1), toWorld([191, 131])); assert.deepEqual(R.radialWest.pts.at(-1), toWorld([100, 160]));
  assert.deepEqual(R.radialEast.pts.at(-1), toWorld([285, 150])); assert.ok(R.boardwalk.pts.length > 20);
  assert.deepEqual(R.boardwalk.pts[0], toWorld([120, 206])); assert.deepEqual(R.boardwalk.pts.at(-1), toWorld([262, 206]));
});
test('landmark slots: 8, the bell tower is the tallest in town, the duck sits on its rock', () => {
  const L = landmarkSlots(); assert.equal(L.length, 8); assert.equal(L.find(s => s.id === '8').name, 'Grand Stair');
  const town = L.filter(s => s.id !== '7'), hall = L.find(s => s.id === '2');
  for (const s of town) if (s.id !== '2') assert.ok(hall.top > s.top, `${s.id} ${s.top} ≥ hall ${hall.top}`);
  assert.equal(L.find(s => s.id === '5').base, PLAN.landmarks['5'].rock.h);
  assert.deepEqual(L.find(s => s.id === '7').at, toWorld([236, 62]));
});
