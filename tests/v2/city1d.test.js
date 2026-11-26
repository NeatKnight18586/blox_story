// tests/v2/city1d.test.js — Phase 1D (pure): harbor layout + decks, staging rule data, key-art hero size, blimp loop, landmark budgets, outline MRT chunks.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PLAN, keyArt, keyArtGroup, heroFrac, STAGING, ANCHOR_NAMES, landmarkSlots, groundY, screenX} from '../../parts/city/plan.js';
import {harborLayout, harborDecks, deckAt, rubberDuck, diner, burgerTower, ferrisWheel, harbor} from '../../parts/city/harbor.js';
import {blimpAt, fishingBoat, ferryBoat, MOVERS} from '../../parts/city/living.js';
import {patchChunks} from '../../engine/outline.js';

const quiet = f => { const w = console.warn; console.warn = () => {}; try { return f(); } finally { console.warn = w; } };
const tris = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); return n; };

test('harbor layout: quay on the shore line, piers reach water, boats float, buildings on land', () => {
  const L = harborLayout();
  assert.ok(L.quay.length >= 8 && L.piers.length === PLAN.harbor.piers.length && L.boats.length === PLAN.harbor.boats.length);
  for (const p of L.piers) assert.ok(groundY(p.x - p.len / 2 + 1, p.z) < 0, 'pier end over water');
  for (const b of L.boats) assert.ok(groundY(b.at[0], b.at[2]) < -.3, `boat at ${b.at} floats`);
  for (const b of L.buildings) assert.ok(groundY(b.x, b.z) > .3, `${b.preset} on land`);
  const D = harborDecks(L); assert.equal(deckAt(D, L.piers[0].x, L.piers[0].z), PLAN.harbor.quay.deck); assert.equal(deckAt(D, 0, 0), null);
  assert.equal(deckAt(D, L.beachPier.x, L.beachPier.z), L.beachPier.deck);
});
test('staging rule: hero ≤ 35 % of frame height by construction, landmark on the other third, kids beside on the centre side', () => {
  assert.equal(STAGING.maxHeroH, .35); assert.equal(STAGING.landmarkMin, .02);
  const ids = landmarkSlots().map(s => s.id);
  for (const n of ANCHOR_NAMES) { const k = keyArt(n); assert.ok(heroFrac(k) <= .345, `${n} hero ${heroFrac(k).toFixed(3)}`); if (k.landmark) assert.ok(ids.includes(k.landmark), n); }
  for (const third of ['L', 'R']) { const g = keyArtGroup(STAGING, third), s = third === 'L' ? 1 : -1;
    assert.equal(g[0][2], 0); assert.ok(g[1][2] * s >= STAGING.kidSide - 1e-9 && g[2][2] * s > g[1][2] * s, 'both kids toward the frame centre, the second further out'); }
  for (const n of ['harborDock', 'diner', 'duckClose', 'beach']) assert.ok(keyArt(n).landmark, n);
});
test('blimp: ≈ 90 s loop; never crosses the statue in plazaWide key art', () => {
  assert.equal(PLAN.living.blimp.period, 90);
  const k = keyArt('plazaWide'), S1 = landmarkSlots().find(s => s.id === '1'), sx = screenX(k, [S1.at[0], S1.base + 10, S1.at[1]]);
  const f = k.target.map((v, i) => v - k.position[i]), fl = Math.hypot(...f), F = f.map(v => v / fl), tv = Math.tan(k.fov * Math.PI / 360);
  const sy = p => { const v = p.map((q, i) => q - k.position[i]), z = v[0] * F[0] + v[1] * F[1] + v[2] * F[2]; return [z, (v[1] - F[1] * z) / Math.hypot(1 - F[1] * F[1]) / z / tv]; };
  const [, st] = sy([S1.at[0], S1.base + 10, S1.at[1]]);
  for (let t = 0; t < 90; t += .5) { const p = blimpAt(t).pos, [z, y] = sy(p); if (z <= 0) continue; const x = screenX(k, p);
    assert.ok(!(Math.abs(x - sx) < .12 && Math.abs(y - st) < .35), `blimp over the statue at t ${t}`); }
});
test('landmarks: duck, diner, burger tower, Ferris wheel and boats within budget; duck beam toggles', () => quiet(() => {
  const d = rubberDuck(), dn = diner(), bt = burgerTower(), fw = ferrisWheel({});
  assert.ok(tris(d.group) <= 7000 && tris(dn.group) <= 3500 && tris(bt.group) <= 3500 && tris(fw.group) <= 3500, [tris(d.group), tris(dn.group), tris(bt.group), tris(fw.group)].join(','));
  assert.ok(tris(fishingBoat({}).g) <= 600 && tris(ferryBoat()) <= 800);
  assert.ok(bt.top > PLAN.harbor.burger.legH + 6, 'bun on top of the legs');
  const h = harbor({slots: landmarkSlots()}); assert.equal(h.setState('duckBeam', 'off'), true); assert.equal(h.duck.beam.visible, false); h.setState('duckBeam', 'on'); assert.equal(h.duck.beam.visible, true);
  fw.set(10); const a = fw.rim.rotation.z; fw.set(20); assert.ok(fw.rim.rotation.z !== a, 'wheel turns'); assert.ok(Math.abs(fw.cars[0].rotation.z + fw.rim.rotation.z) < 1e-9, 'cars stay level');
  for (const m of ['fishingBoats', 'ferry', 'gullsHarbor']) assert.ok(MOVERS.includes(m));
}));
test('outline MRT: the chunks are patched once (common / project_vertex / dithering + colorspace write)', () => {
  const first = patchChunks(); assert.equal(patchChunks(), false);
  if (first) { assert.ok(T.ShaderChunk.common.includes('olOut') && T.ShaderChunk.project_vertex.includes('olId') && T.ShaderChunk.dithering_fragment.includes('olOut') && T.ShaderChunk.colorspace_fragment.includes('olOut')); }
});
