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
