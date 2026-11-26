// tests/v2/city-kit.test.js — Phase 1B City Building Kit + Downtown (pure: three in node, no DOM; signs fall back to plain colours).
import test from 'node:test';
import assert from 'node:assert/strict';
import {building, resolve, lodFor, fixWinding, bevel} from '../../parts/city/kit/building.js';
import {cityProps, PROP_KINDS} from '../../parts/city/kit/props.js';
import PRESETS from '../../parts/city/kit/presets.json' with {type: 'json'};
import STATUE from '../../parts/city/statue.json' with {type: 'json'};
import {governorsHall, governorStatue, clockTower, mainStreetLots, downtown} from '../../parts/city/downtown.js';
import {PLAN, landmarkSlots} from '../../parts/city/plan.js';

const tris = o => { let n = 0; o.traverse(m => { if (m.isMesh) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return n; };
const quiet = f => { const w = console.warn; console.warn = () => {}; try { return f(); } finally { console.warn = w; } };

test('kit: every preset builds within budget (near ≤ 3k, mid ≤ 600, far = a box + roof cap)', () => quiet(() => {
  for (const [k, p] of Object.entries(PRESETS)) { if (k === 'note') continue;
    const b = building({...p, seed: 3});
    assert.ok(b.tris.near <= 3000, `${k} near ${b.tris.near}`); assert.ok(b.tris.mid <= 600, `${k} mid ${b.tris.mid}`); assert.ok(b.tris.far <= 40, `${k} far ${b.tris.far}`);
    assert.equal(b.signs.length, p.sign ? 2 : 0, `${k}: one sign per LOD (near + mid)`);
    if (p.sign) assert.ok(b.signs[0].userData.capH > .5, `${k} sign cap ${b.signs[0].userData.capH}`);
  }
}));
test('kit: deterministic per seed, LOD switch by distance, sign text never a brand or a red cross', () => quiet(() => {
  const a = building({...PRESETS.toys, seed: 9}), b = building({...PRESETS.toys, seed: 9});
  assert.equal(a.tris.near, b.tris.near); assert.equal(lodFor(10), 'near'); assert.equal(lodFor(100), 'mid'); assert.equal(lodFor(400), 'far');
  const s = resolve(PRESETS.hospital); assert.equal(s.sign.text, 'H'); assert.notEqual(s.sign.bg.toLowerCase(), '#ff0000');
  for (const k of ['toys', 'bakery', 'iceCream', 'arcade', 'grocery', 'hospital', 'police', 'fireStation']) assert.ok(PRESETS[k], k);
  assert.equal(PRESETS.fireStation.ground, 'garage');
}));
test('kit: bevelled boxes face outward on all six sides (winding fix)', () => {
  const g = bevel(1, 2, 1, 0, 0, 0, 99, []).toNonIndexed(), p = g.attributes.position, n = g.attributes.normal; let bad = 0;
  for (let i = 0; i < p.count; i += 3) { const v = [0, 1, 2].map(k => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)]), a = v[1].map((x, j) => x - v[0][j]), b = v[2].map((x, j) => x - v[0][j]);
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; if (Math.hypot(...c) < 1e-9) continue; if (c[0] * n.getX(i) + c[1] * n.getY(i) + c[2] * n.getZ(i) < 0) bad++; }
  assert.equal(bad, 0); assert.equal(typeof fixWinding, 'function');
});
test('props: every kind builds; static and live parts separated', () => quiet(() => {
  const g = cityProps(PROP_KINDS.map((kind, i) => ({kind, at: [i * 5, 0, 0]})));
  assert.ok(tris(g) < 6000); assert.ok(g.children.some(m => m.userData.live), 'lamp glow is live');
}));
test('downtown: Hall is the tallest (top hat), bell swings via setState, clock runs backwards, statue pose is data', () => quiet(() => {
  const h = governorsHall(), slots = landmarkSlots(), s2 = slots.find(s => s.id === '2');
  assert.ok(s2.base + h.hatTop <= s2.top + .5 && s2.base + h.hatTop > s2.top - 3, `hat top ${s2.base + h.hatTop} vs slot top ${s2.top}`);
  assert.ok(h.bell.userData.live && h.group.children.some(m => /slot:2/.test(m.name)));
  const ck = clockTower(); ck.setTime(0); const a0 = ck.hands[0].min.rotation.z; ck.setTime(5); assert.ok(ck.hands[0].min.rotation.z > a0, 'minute hand turns counter-clockwise (backwards)');
  for (const pose of Object.keys(STATUE.poses)) assert.ok(tris(governorStatue(pose).group) < 4000, pose);
  const dt = downtown({slots, layerPlaza: PLAN.terrain.terrace.y + .06});
  assert.equal(dt.setState('bell', {swing: 20}), true); assert.ok(Math.abs(dt.hall.bell.rotation.x - 20 * Math.PI / 180) < 1e-9);
  assert.equal(dt.buildings.length, PLAN.mainStreet.shops.length);
  const L = mainStreetLots(); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) assert.ok(Math.hypot(L[i].x - L[j].x, L[i].z - L[j].z) > (Math.min(L[i].w, L[j].w)) / 2 + 1, `${L[i].id} overlaps ${L[j].id}`);
  assert.ok(tris(dt.hall.group) < 12000 && tris(dt.statue.group) < 4000 && tris(dt.clock.group) < 3000);
}));

// ---------------- Phase 1C: west arm (school + homes), glass, gold, props ----------------
import {HOUSES, heroLot, westReserves, houseLot} from '../../parts/city/west.js';
import {roadFrame} from '../../parts/city/downtown.js';
import {kitMat, goldMat, glassMat} from '../../parts/city/kit/mats.js';
import {groundY} from '../../parts/city/plan.js';
test('1C kit: ten pastel house presets (≥ 8 seeded variants), school, heroHouse (red door, attached garage), upsideHouse; all within budget', () => quiet(() => {
  assert.ok(HOUSES.length >= 8, 'house presets ' + HOUSES.length);
  const pastel = new Set(HOUSES.map(k => PRESETS[k].palette.body)); assert.ok(pastel.size >= 5, 'mint, peach, sky, lemon, lavender siding');
  const hero = PRESETS.heroHouse; assert.equal(hero.palette.door.toLowerCase(), '#d62828'); assert.ok(hero.garage && hero.floors === 2 && hero.siding);
  const s = building({...PRESETS.school, seed: 5}); assert.ok(s.tris.near <= 3000 && s.h > 10, 'school lifted by its steps'); assert.ok(PRESETS.school.clock && PRESETS.school.steps.n >= 5);
  const a = building({...hero, seed: 11}), b = building({...hero, seed: 11}); assert.equal(a.tris.near, b.tris.near);
  for (const k of HOUSES) assert.ok(building({...PRESETS[k], seed: 2}).tris.near <= 3000, k);
}));
test('1C kit: window glass is light blue + live (never baked); statue gold is polished metal (metalness 1, roughness .28–.35); props within budget', () => quiet(() => {
  const g = glassMat(); assert.ok(g.userData.live && g.color.getHex() === 0xffffff && g.emissive.b > g.emissive.r, 'light-blue glass'); assert.equal(kitMat('glass', '#000000'), g);
  for (const r of ['body', 'hat', 'face']) { const m = goldMat(r); assert.equal(m.metalness, 1); assert.ok(m.roughness >= .28 && m.roughness <= .35 && m.userData.live, r); }
  assert.ok(goldMat('face').emissiveIntensity > goldMat('hat').emissiveIntensity, 'face lift');
  for (const k of ['sedan', 'van', 'hydrant', 'trash', 'mailbox', 'stripe', 'fence', 'hoop', 'court', 'swings', 'slide', 'sandbox', 'bus', 'treehouse', 'drive']) assert.ok(PROP_KINDS.includes(k), k);
  assert.ok(tris(cityProps([{kind: 'sedan', at: [0, 0, 0]}])) <= 1500, 'cars ≤ 1.5k'); assert.ok(tris(cityProps([{kind: 'treehouse', at: [0, 0, 0]}])) <= 1500);
  const m = cityProps([{kind: 'mailbox', at: [0, 0, 0], tilt: .2}]); assert.ok(tris(m) > 0);
}));
test('1C west: hero house on the north side of the west radial, clear of lots; reserves cover the school + lane + upside-down slot; court slab sits on the slope', () => {
  const H = heroLot(), R = westReserves(); assert.ok(H.z < roadFrame(roadPathsOf(), 118).p[1] - 8 && Math.abs(H.yaw) < .2, 'north of the road, facing it');
  assert.ok(R.some(r => Math.hypot(r.x - H.x, r.z - H.z) < 4 && r.r >= 15) && R.some(r => Math.hypot(r.x + 238, r.z - 112) < 2), 'hero lot + slot 4 reserved');
  assert.ok(!PLAN.west.pad, 'no terrain pad: the 1A-fix west-arm grade (≤ 8 %) is untouched'); const C = PLAN.west.yard.court; assert.ok(Math.abs(groundY(C.at[0], C.at[1]) - groundY(C.at[0] + 20, C.at[1])) < 1.5, 'court sits on a gentle slope');
  const lot = houseLot({x: -150, z: -10, w: 10, d: 9, n: [0, -1], yaw: 0}, (() => { let i = 0; return () => ((i += .17) % 1); })()); assert.ok(HOUSES.includes(lot.key) && lot.tris.near > 0);
});
import {roadPaths as roadPathsOf0} from '../../parts/city/plan.js';
function roadPathsOf() { return roadPathsOf0().radialWest; }
