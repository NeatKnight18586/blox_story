// npm run v2:test — Amendment A1: ground model, ribbons, normal maps, the stability metric, prop budgets.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {groundY, LAYER, TERRAIN} from '../../stories/nobody/world.js';
import {ribbon} from '../../parts/build.js';
import {heightToNormal, blurWrap, textureCounts, RELIEF_PATTERNS, PATTERNS} from '../../parts/materials.js';
import {flickerCount} from '../../scripts/v2/flicker.js';
import {sword, ringStone, heroStone, triangleCount} from '../../parts/props.js';

test('groundY returns the terrain top at base, field terraces and castle terraces', () => {
  assert.equal(groundY(0, 0), TERRAIN.base);
  assert.equal(groundY(0, 70), TERRAIN.fieldInner.top);                // inner field terrace
  assert.equal(groundY(30, 50), TERRAIN.fieldOuter.top);               // outer only
  assert.equal(groundY(60, 70), TERRAIN.base);                         // outside both
  assert.equal(groundY(0, -40), TERRAIN.castle[0].top); assert.equal(groundY(0, -60), TERRAIN.castle[1].top); assert.equal(groundY(0, -90), TERRAIN.castle[2].top);
  for (let i = 0; i < 400; i++) { const x = (i * 37 % 200) - 100, z = (i * 53 % 260) - 130; assert.ok(Number.isFinite(groundY(x, z)) && groundY(x, z) >= 0); }
});

test('LAYER: every pair of surfaces that can overlap in plan is ≥ 0.05 apart, and above the terrain', () => {
  const overlapping = [['patch', 'path'], ['patch', 'cobble'], ['cobble', 'square'], ['patch', 'dirt'], ['path', 'square']];
  for (const [a, b] of overlapping) assert.ok(Math.abs(LAYER[a] - LAYER[b]) >= .05 - 1e-9, `${a}/${b}`);
  for (const v of Object.values(LAYER)) assert.ok(v >= .05);
  // Terrace tops never coincide with a layer surface of the terrace below them.
  const tops = [TERRAIN.base, TERRAIN.fieldOuter.top, TERRAIN.fieldInner.top];
  // Only the field's layers can meet a field terrace edge (street and square lie on the town floor).
  for (const t of tops) for (const u of tops) for (const l of [LAYER.patch, LAYER.path, LAYER.dirt]) if (u > t) assert.ok(Math.abs(t + l - u) >= .05 - 1e-9, `layer ${l} on ${t} vs terrace ${u}`);
});

test('ribbon: one mesh, top faces never overlap, world-scaled UVs, skirts closed down', () => {
  const curve = new T.CatmullRomCurve3([[0, 0, 0], [5, 0, 10], [0, 0, 20], [-3, 0, 30]].map(v => new T.Vector3(...v)));
  const r = ribbon(curve, 4, () => .12, {thick: .3, step: .5, tile: 4}), g = r.geometry, p = g.attributes.position, idx = g.index.array;
  assert.ok(r.isMesh);
  const n = r.userData.ribbon.samples, topTris = (n - 1) * 2;
  // Top triangles: consecutive quads share only an edge — check no two top quads overlap in plan (centroids march along the curve, strictly).
  const cent = []; for (let t = 0; t < topTris; t += 2) { let x = 0, z = 0; for (const k of [0, 1, 2]) { x += p.getX(idx[t * 3 + k]); z += p.getZ(idx[t * 3 + k]); } cent.push([x / 3, z / 3]); }
  for (let i = 2; i < cent.length; i++) { const d1 = Math.hypot(cent[i][0] - cent[i - 1][0], cent[i][1] - cent[i - 1][1]); assert.ok(d1 > .05 && d1 < 1.2, 'quads advance without folding back'); }
  for (let i = 0; i < topTris * 3; i++) assert.ok(Math.abs(p.getY(idx[i]) - .12) < 1e-6, 'top at the height function');   // float32 storage
  let minY = Infinity; for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i)); assert.ok(Math.abs(minY - (.12 - .3)) < 1e-6, 'skirts reach thick below the top');
  const uv = g.attributes.uv; let maxV = 0; for (let i = 0; i < uv.count; i++) maxV = Math.max(maxV, uv.getY(i)); assert.ok(Math.abs(maxV - curve.getLength() / 4) < 1e-6, 'v = arc length / tile');
});

test('normal maps are deterministic, unit length and flat for flat height', () => {
  const w = 16, h = 16, flat = new Float32Array(w * h).fill(.5), nf = heightToNormal(flat, w, h);
  for (let i = 0; i < w * h; i++) { assert.equal(nf[i * 4], 128); assert.equal(nf[i * 4 + 1], 128); assert.equal(nf[i * 4 + 2], 255); }
  const bump = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) bump[y * w + x] = (x > 5 && x < 10 && y > 5 && y < 10) ? 1 : 0;
  const a = heightToNormal(blurWrap(bump, w, h), w, h), b = heightToNormal(blurWrap(bump, w, h), w, h);
  assert.deepEqual(a, b);
  for (let i = 0; i < w * h; i++) { const v = [0, 1, 2].map(k => a[i * 4 + k] / 255 * 2 - 1); assert.ok(Math.abs(Math.hypot(...v) - 1) < .02); }
  assert.ok(a[(8 * w + 5) * 4] < 128 && a[(8 * w + 10) * 4] > 128, 'x slopes point away from the raised block');
  const c = textureCounts(); assert.ok(c.albedo <= 16 && c.normal <= 10, JSON.stringify(c));
  for (const r of ['brick', 'cobble', 'slate', 'woodPlanks', 'thatch', 'rock', 'dirt']) assert.ok(RELIEF_PATTERNS.includes(r));
  for (const f of ['metal', 'moss', 'rock', 'dirt']) assert.ok(PATTERNS.includes(f));
});

test('stability metric: edges sliding ≤ 2 px are excused, a surface that flips colour is not', () => {
  const w = 40, h = 40, img = shift => { const a = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = x >= 20 + shift ? 255 : 0, i = (y * w + x) * 4; a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; } return a; };
  const e = flickerCount(img(0), img(1), w, h); assert.ok(e.raw > 0 && e.gate === 0, JSON.stringify(e));
  const z = img(0), z2 = Uint8Array.from(z); for (let y = 5; y < 15; y++) for (let x = 25; x < 35; x++) { const i = (y * w + x) * 4; z2[i] = 40; z2[i + 1] = 200; z2[i + 2] = 40; }   // a flipped patch
  const f = flickerCount(z, z2, w, h); assert.ok(f.gate >= 3, JSON.stringify(f));
  assert.deepEqual(flickerCount(z, z, w, h), {raw: 0, gate: 0});
});

test('prop budgets: hero sword ≤ 250, ring sword ≤ 40, ring stones ≤ 80, hero stone ≤ 600', () => {
  assert.ok(triangleCount(sword({tier: 'hero'})) <= 250); assert.ok(triangleCount(sword({tier: 'ring'})) <= 40);
  for (const v of [0, 1, 2]) for (const moss of [false, true]) assert.ok(triangleCount(ringStone(v, {moss})) <= 80, `${v} ${moss}`);
  const h = heroStone({cracks: 3}); assert.ok(triangleCount(h.group) <= 600);
  for (const k of [0, 1, 2, 3]) { h.setCracks(k); const vis = h.group.children.filter(c => c.name.startsWith('cracks') && c.visible).map(c => c.name); assert.deepEqual(vis, k ? ['cracks' + k] : []); }
});
