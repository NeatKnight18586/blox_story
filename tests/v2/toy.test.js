// Toy House (format v5, Phase 3b): props, fill crowd, hall helpers, anchors index, poses — pure logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {TOY_PROPS, toyProp, TOY_TRI_MAX} from '../../parts/sets4/props4.js';
import {triCount, rnd, mergeByMaterial, box, plastic} from '../../parts/sets4/common.js';
import * as H from '../../parts/sets4/toyhouse.js';
import * as S from '../../parts/sets4/toyhouse_street.js';
import * as A from '../../parts/sets4/toyhouse_all.js';
import * as FL from '../../engine/fill.js';
import * as PO from '../../engine/poses.js';
import * as MT from '../../engine/motion5.js';
import {BUILDS} from '../../avatar-style/body.js';
import {outfitRegions, createActor5, headShoulderRatio, heroColours, heroColourCheck} from '../../avatar-style/body5.js';
const idx = JSON.parse(readFileSync('parts/sets4/anchors.json', 'utf8')), cast = JSON.parse(readFileSync('cast/toyhouse.json', 'utf8')).cast, hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO;
test('toy props: every prop ≤ 400 triangles and named', () => { assert.equal(TOY_PROPS.length, 10); for (const n of TOY_PROPS) { const g = toyProp(n, 3); assert.ok(triCount(g) <= TOY_TRI_MAX, `${n} ${triCount(g)}`); assert.equal(g.name, n === 'gumball' ? 'gumball' : n); } assert.throws(() => toyProp('rifle')); });
test('hyperbox carries the text HYPERBOX 9 on four faces; no realistic gun names exist', () => {
  const g = toyProp('hyperbox'), labels = []; g.traverse(o => { if (o.userData.text) labels.push(o.userData.text); }); assert.equal(labels.length, 4); assert.ok(labels.every(t => t === 'HYPERBOX 9'));
  assert.ok(!TOY_PROPS.some(n => /gun|rifle|pistol/i.test(n)), 'blaster only');
});
test('hall (3b-R): 150 × 210, three levels, practicals, anchors, ground height, zones', () => {
  assert.equal(H.PRACTICALS.length, 24); assert.ok(H.PRACTICALS.every(p => p.length === 3 && Math.abs(p[0]) < 75 && p[2] > -175 && p[2] < 35 && p[1] < 36), 'inside the hall'); assert.deepEqual(H.PRACTICALS, H.PRACTICALS.map(p => p.map(v => +v.toFixed(2))));
  assert.ok(Math.max(...H.PRACTICALS.map(p => p[0])) - Math.min(...H.PRACTICALS.map(p => p[0])) > 90, 'the cascade spans the hall');
  assert.equal(H.groundY(0, 10), 0); assert.ok(H.groundY(56, 22) > 1 && H.groundY(51, -20) > .5, 'trampoline and ball pit lift actors'); assert.equal(H.groundY(0, -160), 12, 'mezzanine 1'); assert.equal(H.groundY(0, -170), 24, 'mezzanine 2');
  assert.ok(H.groundY(70, -82) > 0 && H.groundY(70, -82) < 12, 'stair 0 → 12'); assert.ok(H.groundY(70, -116) > 12 && H.groundY(70, -116) < 24, 'stair 12 → 24');
  for (const [k, a] of Object.entries(H.ANCHORS)) { assert.equal(a.camera.position.length, 3); assert.ok(a.top.position[1] > a.camera.position[1], k); }
  assert.deepEqual(idx.toyhouse.anchors, Object.keys(H.ANCHORS)); assert.deepEqual(idx.toyhouse_street.anchors, Object.keys(S.ANCHORS)); assert.deepEqual(idx.toyhouse_all.anchors, Object.keys(A.ANCHORS)); assert.deepEqual(idx.toyhouse.practicals, H.PRACTICALS);
  assert.ok(A.groundY(0, 40) === 0 && A.groundY(56, 22) > 1); assert.ok(['mountain', 'aisles', 'far'].every(k => H.ZONES[k]));
  const L = H.TRAIN_LENGTH, p0 = H.trainPoint(0), p1 = H.trainPoint(.999999); assert.ok(Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) < .01, 'the train loop closes');
  for (let i = 0; i < 40; i++) { const [x, z] = H.trainPoint(i / 40), [x2, z2] = H.trainPoint((i + .5) / 40); assert.ok(Math.abs(Math.hypot(x2 - x, z2 - z) - L / 80) < .6, 'constant speed'); }
});
test('hall builds without a browser: districts + LOD twins, 800 balls, bevels near cameras, colour hierarchy, clock state', () => {
  const sc = new T.Scene(), w = H.build(sc, {}); assert.ok(w.stats.merged > 300 && w.stats.into < 400, JSON.stringify(w.stats)); assert.equal(w.ballPit, 800); assert.ok(w.lod.pairs > 10 && w.lod.swaps > 2);
  let balls = 0; sc.traverse(o => { if (o.isInstancedMesh && o.name === 'ballPit') balls = o.count; }); assert.equal(balls, 800);
  assert.equal(w.stats.bevel.fraction, 1, JSON.stringify(w.stats.bevel.sharp)); assert.ok(w.stats.bevel.near > 100);
  assert.equal(w.stats.colours.env.ok, w.stats.colours.env.n, w.stats.colours.env.bad.join()); assert.equal(w.stats.colours.story.ok, w.stats.colours.story.n);
  assert.ok(w.stats.shelves.far > 30 && w.stats.shelves.mid > 10, 'far half = low-LOD rows');
  w.setState('shutter', 1); w.update(1.5); let sh = null, clock = null; sc.traverse(o => { if (o.name === 'shutter') sh = o; if (o.name === 'clock') clock = o; }); assert.ok(Math.abs(sh.position.y - 11.2) < 1e-9);
  w.setState('clock', 8 * 60); assert.ok(Math.abs(clock.userData.hour.rotation.z + Math.PI * 2 * 8 / 12) < 1e-9 && Math.abs(clock.userData.minute.rotation.z) < 1e-9);
  const c1 = []; sc.traverse(o => { if (o.name === 'coasterCart' || o.name === 'toyTrain') c1.push(JSON.stringify(o.children.map(c => c.position.toArray()))); }); w.update(3); const c2 = []; sc.traverse(o => { if (o.name === 'coasterCart' || o.name === 'toyTrain') c2.push(JSON.stringify(o.children.map(c => c.position.toArray()))); });
  const text = []; sc.traverse(o => { if (o.userData.text) text.push(o.userData.text); }); assert.ok(text.includes('OPENS 8:00 AM'));
  w.onCamera([0, 300, -70]); let near = 0, far = 0; sc.traverse(o => { if (/^district_/.test(o.name)) { if (o.userData.coarse && o.visible) far++; if (!o.userData.coarse && o.visible && o.name.includes('@') && !o.name.includes('@*')) near++; } }); assert.ok(far > 10, 'top camera: coarse twins'); 
});
test('street: the truck eases in, composite world exposes both sets', () => {
  assert.equal(S.truckX(0), S.TRUCK.from); assert.ok(Math.abs(S.truckX(1) - S.TRUCK.to) < 1e-9); assert.ok(S.truckX(.5) > (S.TRUCK.from + S.TRUCK.to) / 2, 'fast then slow');
  const sc = new T.Scene(), w = A.build(sc, {}); assert.ok(w.anchors.street && w.anchors.counter && w.anchors.outside); assert.equal(w.bakeGroups.length, 2); assert.deepEqual(w.bakeGroups.map(g => g.preset), ['toy', 'dawn']);
});
test('fill crowd: seeded, avoids rects, ≤ 60 triangles, from above only', () => {
  const m = FL.fillMembers({count: 200, area: [46, 66, 0, 0], avoid: [[-9, 23, 9, 34]], seed: 2}); assert.equal(m.length, 200); assert.deepEqual(m, FL.fillMembers({count: 200, area: [46, 66, 0, 0], avoid: [[-9, 23, 9, 34]], seed: 2}));
  assert.ok(m.every(k => !(k.x > -9 && k.x < 9 && k.z > 23 && k.z < 34))); const tris = (FL.fillGeometry().attributes.position.count + FL.fillHeadGeometry().attributes.position.count) / 3; assert.ok(tris <= 60, tris);
  assert.equal(FL.fillVisible(40), true); assert.equal(FL.fillVisible(8), false); assert.equal(FL.fillVisible(8, true), true); assert.equal(FL.fillVisible(40, false), false);
  const a = FL.fillMatrix(m[0], 1, 0).elements.join(), b = FL.fillMatrix(m[0], 1.3, 0).elements.join(); assert.notEqual(a, b); assert.equal(a, FL.fillMatrix(m[0], 1, 0).elements.join(), 'pure in t');
});
test('merge by material keeps live meshes and merges the rest', () => {
  const g = new T.Group(); for (let i = 0; i < 5; i++) g.add(box(1, 1, 1, '#ff0000', [i * 2, 0, 0])); const live = box(1, 1, 1, '#ff0000', [20, 0, 0], {live: true}); g.add(live);
  const r = mergeByMaterial(g); assert.equal(r.merged, 5); assert.equal(r.into, 1); assert.ok(g.children.includes(live)); assert.equal(g.children.length, 2);
});
test('cast: body5 presets, elder_m build, hero colours clear, waddle swings', () => {
  assert.deepEqual(Object.keys(cast), ['HERO', 'HERO_TAPED', 'MO', 'PIP', 'YOUNG_PIP', 'MO_DAD']); assert.equal(cast.HERO.build, 'youth'); assert.equal(cast.HERO.age, 11); assert.equal(cast.HERO.hair, null);
  assert.equal(cast.MO.hair.style, 'curly_top'); assert.equal(cast.MO.accessories[0].name, 'beanie'); assert.equal(cast.PIP.build, 'elder_m'); assert.ok(BUILDS.elder_m.stoop <= .09);
  for (const c of Object.values(cast)) { assert.equal(c.body, 'v5'); assert.equal(c.faceStyle, 'v4'); }
  assert.ok(cast.HERO_TAPED.regions.bands.length >= 5 && cast.HERO_TAPED.regions.bands.some(b => b.part === 'head'));
  assert.deepEqual(heroColourCheck(hero, Object.fromEntries(Object.entries(cast).filter(([k]) => !k.startsWith('HERO')).map(([k, c]) => [k, {outfit: c.safeOutfit}]))), []);
  const a = createActor5({skin: '#e0a77a', build: 'elder_m', regions: outfitRegions({recipe: 'tunic', main: '#8c3b4a', legs: '#d8cfc0'}, '#e0a77a')}); assert.ok(Math.abs(headShoulderRatio(a) - .593) < .002);
  const w = [0, .1, .2, .3].map(t => PO.samplePose('waddle', t)); assert.ok(Math.max(...w.map(p => Math.abs(p.root.roll))) > .1); assert.ok(Math.max(...w.map(p => p.root.dy)) > .1); assert.ok(PO.POSE_NAMES.includes('waddle'));
});

test('look5: colour clamps, bevel geometry, census, contact bytes, corridor clear', async () => {
  const L = await import('../../parts/sets4/look5.js');
  for (const c of ['#ff5a5f', '#2b2d33', '#fbe8d0', '#3a86ff']) { const [, s, l] = L.hslOf(L.envColor(c)); assert.ok(s <= .45 && l >= .35 && l <= .75, c); }
  for (const c of ['#5a3320', '#c9b37f', '#ff5a5f']) assert.ok(L.hslOf(L.storyColor(c))[1] >= .6, c);
  assert.equal(L.hexOf(L.hslOf('#7a3510')), '#7a3510');
  const g = L.bevelBoxGeometry(2, 3, 4, .04, 100); assert.equal(g.userData.bevel, .04); g.computeBoundingBox(); assert.ok(Math.abs(g.boundingBox.max.y - 1.5) < 1e-6 && Math.abs(g.boundingBox.min.z + 2) < 1e-6, 'exact size');
  assert.equal(L.bevelBoxGeometry(2, 3, 4, 0, 100).index.count / 3, 12, 'r = 0: a plain box');
  const grp = new T.Group(); grp.add(new T.Mesh(L.bevelBoxGeometry(1, 1, 1), new T.MeshBasicMaterial()), new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial())); grp.children[1].position.set(50, 0, 0);
  let c = L.bevelCensus(grp, [[0, 0, 5]]); assert.deepEqual([c.near, c.bevelled, c.far], [1, 1, 1]); c = L.bevelCensus(grp, [[50, 0, 5]]); assert.equal(c.fraction, 0);
  const b = L.contactBytes(32); assert.ok(b[(16 * 32 + 16) * 4] < 120 && b[0] > 240, 'dark core, clear edge');
  const cc = L.corridorClear([0, 0], [0, 10], 3, 2.5); assert.equal(cc.length, 5); assert.deepEqual(cc.at(-1), [0, 10, 3]);
});
test('box art: 16 invented designs, muted, deterministic; gondola layout LODs', async () => {
  const BA = await import('../../parts/sets4/boxart.js'), SH = await import('../../parts/sets4/shelves.js'), L = await import('../../parts/sets4/look5.js');
  assert.equal(BA.BOX_NAMES.length, 16); assert.ok(BA.BOX_NAMES.every(n => /^[A-Z ]+$/.test(n) && !/ROBLOX|LEGO|BARBIE|NERF|HASBRO|MATTEL/.test(n)));
  for (let i = 0; i < 16; i++) { const c = BA.designColours(i); for (const k of ['bg', 'shape', 'band']) assert.ok(L.hslOf(c[k])[1] <= .45, `${i} ${k}`); }
  const a = BA.boxArt(256), b2 = BA.boxArt(256); assert.equal(a.length, 256 * 256 * 4); assert.deepEqual(a.subarray(0, 4096), b2.subarray(0, 4096));
  const lay = SH.gondolaLayout([{x: 0, z0: -40, z1: 0, lod: 'near'}, {x: 0, z0: -200, z1: -160, lod: 'far'}], [[0, 5, 5]]); assert.equal(lay.length, 10);
  assert.equal(lay[0].lod, 'near'); assert.equal(lay[4].lod, 'mid'); assert.ok(lay.slice(5).every(m => m.lod === 'far'));
  assert.ok(SH.moduleGeometry({bevel: true}).index.count / 3 < 1600 && SH.moduleGeometry({bevel: false}).index.count / 3 < 200);
});
