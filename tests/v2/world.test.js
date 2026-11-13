// npm run v2:test — Session 3 pure-logic tests: parts helpers, district merge, look presets, ambient movers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as P from '../../parts/parts.js';
import * as B from '../../parts/build.js';
import * as A from '../../parts/ambient.js';
import {PRESETS, blendPreset} from '../../engine/look.js';

const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

test('seeded helpers are deterministic and respect their arguments', () => {
  const a = B.rng(5), b = B.rng(5); for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const ring = B.ringOf(12, 10, {centre: [3, 0, -2]});
  assert.equal(ring.length, 12); for (const p of ring) assert.ok(Math.abs(Math.hypot(p.at[0] - 3, p.at[2] + 2) - 10) < 1e-9);
  const avoid = (x, z) => Math.hypot(x, z) < 5;
  const s1 = B.scatter({x0: -20, x1: 20, z0: -20, z1: 20}, 9, 2, avoid), s2 = B.scatter({x0: -20, x1: 20, z0: -20, z1: 20}, 9, 2, avoid);
  assert.deepEqual(s1, s2); assert.ok(s1.length > 20 && s1.every(p => !avoid(p.at[0], p.at[2])));
  const curve = new T.LineCurve3(new T.Vector3(0, 0, 0), new T.Vector3(0, 0, 10)), pts = B.along(curve, 5);
  assert.deepEqual(pts[0].at.map(Math.round), [0, 0, 0]); assert.deepEqual(pts[4].at.map(Math.round), [0, 0, 10]);
  assert.ok(Math.abs(B.along(curve, 3, {offset: 2})[1].at[0]) === 2);
  assert.equal(B.mirror(B.row(3, 2)).length, 6);
});

test('world-scaled UVs keep one texture size on any block', () => {
  const small = P.block([2, 2, 2], {pattern: 'brick'}), big = P.block([8, 8, 8], {pattern: 'brick'});
  const span = m => { const uv = m.geometry.attributes.uv; let lo = Infinity, hi = -Infinity; for (let i = 0; i < uv.count; i++) { lo = Math.min(lo, uv.getX(i)); hi = Math.max(hi, uv.getX(i)); } return hi - lo; };
  assert.ok(Math.abs(span(big) / span(small) - 4) < 1e-6);
});

test('gable roof overhangs every side by ≥ 0.6 and peaks at the ridge height', () => {
  const r = P.gableRoof(10, 8, 3, {overhang: .7}); r.geometry.computeBoundingBox(); const bb = r.geometry.boundingBox;
  assert.ok(bb.max.x - 5 >= .6 && bb.max.z - 4 >= .6); assert.ok(bb.max.y >= 3 && bb.max.y - 3 < .6);   // ridge line + slab thickness
  const st = P.stairs(4, {rise: .5}); st.updateMatrixWorld(true); const box = new T.Box3().setFromObject(st); assert.ok(Math.abs(box.max.y - 2) < 1e-6);
});

test('mergeByDistrict keeps every triangle, cuts meshes, and leaves movers alone', () => {
  const g = new T.Group(); let n = 0;
  for (let i = 0; i < 30; i++) { const m = P.block([1, 1, 1], {at: [i * 3, 0, 0], pattern: i % 2 ? 'brick' : 'slate'}); g.add(m); n += tris(m.geometry); }
  const f = A.flag({seed: 2}); g.add(f.object);
  const out = B.mergeByDistrict(g, 40);
  let after = 0, meshes = 0; out.traverse(o => { if (o.isMesh && !o.parent?.userData.keep && o.parent === out) { after += tris(o.geometry); meshes++; } });
  assert.equal(after, n); assert.ok(meshes <= 6, String(meshes)); assert.ok(out.children.includes(f.object));
});

test('look presets are complete and blend endpoints exactly', () => {
  const keys = Object.keys(PRESETS.day);
  for (const p of Object.values(PRESETS)) assert.deepEqual(Object.keys(p), keys);
  assert.ok(PRESETS.night.hemi >= .9 && PRESETS.night.rimI > 0, 'night: blue ambient ≥ 0.9 and a rim light');
  const b0 = blendPreset('day', 'night', 0), b1 = blendPreset('day', 'night', 1);
  for (const k of keys) if (typeof PRESETS.day[k] === 'number') { assert.equal(b0[k], PRESETS.day[k]); assert.ok(Math.abs(b1[k] - PRESETS.night[k]) < 1e-9); }
});

test('ambient movers are pure functions of time', () => {
  const snap = o => { o.updateMatrixWorld(true); const v = []; o.traverse(x => { if (x.isMesh) v.push(...x.matrixWorld.elements.map(e => +e.toFixed(9))); if (x.isInstancedMesh) v.push(...x.instanceMatrix.array); }); return v; };
  for (const m of [A.birds({seed: 4}), A.smoke({seed: 4}), A.flame({seed: 4}), A.spinner(new T.Group().add(new T.Mesh(new T.BoxGeometry())))]) {
    m.update(3.2); const a = snap(m.object); m.update(9.1); m.update(3.2); assert.deepEqual(snap(m.object), a);
  }
  const f = A.flag({seed: 3}), cloth = f.object.children[1].geometry.attributes.position;
  f.update(1.5); const a = Array.from(cloth.array); f.update(4); f.update(1.5); assert.deepEqual(Array.from(cloth.array), a);
});
