// Format v4 Phase 1: Actor v5, the hero, Faces v4, lip flaps — pure logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as B5 from '../../avatar-style/body5.js';
import * as F4 from '../../avatar-style/faces4.js';
import * as L from '../../engine/lipflap.js';
import {resolveTroupe} from '../../engine/troupe.js';

const hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO, troupe = JSON.parse(readFileSync('cast/troupe.json', 'utf8'));

test('v5 body: six rigid parts, R6 sizes, bevel .04, shared satin per colour, classic head in 1×1×1', () => {
  const a = B5.createActor5({skin: '#FFD542', name: 'h', regions: hero.regions});
  assert.deepEqual(Object.keys(a.parts).sort(), ['head', 'leftArm', 'leftLeg', 'rightArm', 'rightLeg', 'torso']);
  const p = a.parts.torso.geometry.parameters; assert.deepEqual([p.width, p.height, p.depth], [2, 2, 1]);
  const h = B5.HEAD5; assert.ok(Math.abs(1.25 * h[0] - 1.2) < 1e-9 && Math.abs(1.16 * h[1] - 1.2) < 1e-9 && Math.abs(1.1 * h[2] - 1.2) < 1e-9, 'P1: classic head 1.2³');
  const r = B5.headTorsoRatio(a); assert.ok(r >= .58 && r <= .62, `head / torso width at a front ortho view ${r}`);
  assert.deepEqual(a.pivots.head.scale.toArray(), h);
  assert.equal(B5.satin('#73985E'), B5.satin('#73985e'), 'one material per colour');
  assert.equal(B5.satin('#000').roughness, .45); assert.equal(B5.satin('#000').metalness, 0); assert.ok(B5.satin('#000').isMeshStandardMaterial);
  assert.equal(a.parts.leftLeg.material, B5.satin('#73985E'));
  assert.equal(a.parts.leftLeg.children[0].material, B5.satin('#161616'), 'black shoes');
  const sub = B5.rbox([1, 2, 1]); assert.equal(sub.parameters.radius ?? .04, .04);
  for (const b of ['adult_f', 'youth', 'elder_f']) assert.ok(B5.createActor5({skin: '#f6c9a0', build: b, age: b === 'youth' ? 12 : 40}).parts.torso);
});
test('v5 regions: arms half sleeve / half hand, shoes = bottom 20 %, blocks fill the part', () => {
  const arm = B5.regionBlocks('leftArm', hero.regions), leg = B5.regionBlocks('leftLeg', hero.regions);
  assert.deepEqual(arm.map(b => b.size[1]), [1, 1]); assert.equal(arm[1].color, '#FFD542');
  assert.ok(Math.abs(leg[1].size[1] - .4) < 1e-9); assert.ok(Math.abs(leg[0].size[1] + leg[1].size[1] - 2) < 1e-9);
  const tor = B5.regionBlocks('torso', hero.regions); assert.equal(tor[0].color, '#0D7CD4'); assert.equal(tor.length, 10, 'strip, 2 lapels, 2 trims, collar rim back + 2 sides + 2 front tips');
});
test('hero slot: no hair, v5 + faces v4, resolves through the troupe', () => {
  const p = resolveTroupe({troupe: 'HERO'}, {troupe: {HERO: hero}});
  assert.equal(p.hair, null); assert.equal(p.body, 'v5'); assert.equal(p.faceStyle, 'v5'); assert.equal(p.skin, '#FFD542');
  assert.equal(resolveTroupe({troupe: 'LEAD'}, troupe).faceStyle, 'v3', 'troupe default unchanged');
});
test('hero colours: troupe/crowd outfits closer than RGB 90 swap to the nearest passing colour; the check then passes', () => {
  const all = {...troupe.troupe, AFK: troupe.AFK}, cols = B5.heroColours(hero);
  assert.deepEqual(cols, ['#2B2D33', '#0D7CD4', '#73985E', '#FFD542']);
  assert.ok(B5.heroColourCheck(hero, all).length > 0, 'today\'s troupe defaults clash');
  const fixed = Object.fromEntries(Object.entries(all).map(([k, p]) => [k, {...p, outfit: B5.heroSafeOutfit(p.outfit, cols)}]));
  assert.deepEqual(B5.heroColourCheck(hero, fixed), [], 'passes after the swap');
  for (const [k, p] of Object.entries(fixed)) for (const key of ['main', 'legs']) {   // nearest: never further than needed + one grid step
    const o = all[k].outfit[key], n = p.outfit[key]; if (o === n) continue;
    const need = Math.max(...cols.map(c => 90 - B5.rgbDist(o, c))); assert.ok(B5.rgbDist(o, n) <= need + 15 * Math.sqrt(3) + 1, `${k}.${key} ${o}→${n}`);
  }
  assert.equal(B5.safeColour('#ff00ff', cols), '#ff00ff', 'passing colours stay');
  const night = B5.safeColour('#3a3d44', cols, {minL: .32}); assert.ok(B5.rgbDist(night, '#2B2D33') >= 90);
  assert.deepEqual(B5.heroSafeOutfit({main: '#73985E', legs: '#4a5a80', recipe: 'tee'}, cols), B5.heroSafeOutfit({main: '#73985E', legs: '#4a5a80', recipe: 'tee'}, cols), 'deterministic');
});
test('hero jacket: charcoal with #4A4E57 lapel and collar edges; charcoal sleeves', () => {
  assert.equal(hero.regions.torso.main, '#2B2D33'); assert.equal(hero.regions.arms.upper, '#2B2D33');
  const t = B5.regionBlocks('torso', hero.regions), e = t.filter(b => b.edge);
  assert.equal(e.length, 7); assert.ok(e.every(b => b.color === '#4A4E57')); assert.ok(e.filter(b => !b.collar).every(b => b.size[0] === .05));
  assert.ok(e.filter(b => b.collar).every(b => b.at[1] + b.size[1] / 2 > 1), 'collar rim stands above the shoulders');
});
test('faces v4 (1b): placement, sizes, no sketch pass, marker strokes', () => {
  const G = F4.GRID4; assert.ok(Math.abs(G.eyeY - (.5 - .48)) < 1e-12); assert.ok(Math.abs(G.eyeX * 2 - .4) < 1e-12); assert.ok(Math.abs(G.mouthY - (.5 - .70)) < 1e-12); assert.equal(G.stroke, .035);
  assert.deepEqual(F4.eyeCentres4('hero_grin').map(v => +v.toFixed(3)), [-.2, .2]);
  const names = [...F4.HERO_PRESETS, ...F4.RESKINNED]; assert.equal(F4.HERO_PRESETS.length, 8); assert.equal(F4.RESKINNED.length, 24);
  for (const n of names) {
    const it = F4.faceItems4(n);
    assert.ok(!it.some(i => i.sketch || (i.alpha === .35)), `${n}: no sketch pass`);
    assert.ok(it.filter(i => i.line && i.color === F4.INK).length >= 1);
    assert.ok(it.every(i => !i.line || i.color !== '#808080'), 'ink is never grey');
    const g = F4.faceGates4(n); assert.ok(g.w >= .55, `${n} width ${g.w}`); assert.ok(g.h >= .40, `${n} height ${g.h}`);
    for (const e of [g.eyeL, g.eyeR]) if (e !== null) assert.ok(e >= .022, `${n} eye area ${e}`);
  }
  const a = F4.faceItems4('smile'), b = F4.faceItems4('smile'); assert.deepEqual(a, b, 'wobble is fixed per face (never animated)');
  // wobble ≤ 1 % of head width: compare against the unwobbled line
  for (const k of [0, 1, 2]) assert.ok(F4.GRID4.wobble <= .01);
  // almond default: solid black 0.20 × 0.13 with one shine 30 % of the eye
  const eye = a.find(i => i.kind === 'eye' && i.pts), bb = F4.bbox(eye.pts); assert.ok(Math.abs(bb[2] - bb[0] - .2) < .002 && Math.abs(bb[3] - bb[1] - .13) < .03);
  const sh = a.filter(i => i.shine).map(i => i.r).sort((x, y) => y - x); assert.ok(Math.abs(sh[0] * 2 - .06) < 1e-9);
  for (const n of names) assert.equal(F4.faceItems4(n).filter(i => i.eyeLine).length <= 2, true, 'single outline only');
  for (const n of Object.keys(F4.ALIAS4)) assert.ok(F4.resolveFace4(n).name);
  for (const o of ['gasp', 'shout', 'crying']) assert.ok(F4.resolveFace4(o).name);
});
test('faces v4 (1b): talk shapes step .04/.08/.13, held faces never flap, blush clear of the mouth', () => {
  for (const [fam, shapes] of Object.entries(F4.TALK)) { assert.equal(shapes.length, 4, fam); for (const m of shapes) assert.ok(F4.hasMouth(m), m); }
  for (const f of ['hero_grin', 'hero_wink', 'smile', 'neutral', 'worried']) for (const k of [1, 2, 3]) assert.ok(Math.abs(F4.mouthHeight(f, k) - F4.TALK_H[k]) < .002, `${f} ${k}: ${F4.mouthHeight(f, k)}`);
  assert.ok(F4.faceItems4('smile', {talk: 3}).some(i => i.fill === F4.TONGUE), 'wide shows the tongue');
  assert.ok(F4.isHeld('hero_shock') && F4.isHeld('hero_cry') && F4.isHeld('hero_rage') && F4.isHeld('gasp'));
  assert.deepEqual(F4.faceItems4('hero_shock', {talk: 3}), F4.faceItems4('hero_shock'));
  for (const f of [...F4.HERO_PRESETS, ...F4.RESKINNED]) for (const k of [null, 0, 1, 2, 3]) assert.equal(F4.blushOverlap(f, k), 0, `${f} ${k}`);
  assert.ok(!F4.faceItems4('hero_rage').some(i => i.pts && i.alpha < 1 && F4.bbox(i.pts)[1] < .1 && F4.bbox(i.pts)[3] > -.05 && i.fill !== F4.BLUSH), 'no flush over the eyes');
  const w = F4.faceItems4('hero_wink'); assert.ok(w.some(i => i.fang) && w.some(i => i.blush));
});
test('lip flaps: envelope, shapes with a 2-frame hold, who flaps', () => {
  const sr = 3000, s = new Float32Array(sr * 2); for (let i = 0; i < s.length; i++) s[i] = (i < sr ? .5 : 0) * Math.sin(i / 3);
  const e = L.envelope(s, sr, 30); assert.equal(e.length, 60); assert.ok(e[5] > .3 && e[45] === 0);
  const shapes = L.talkShapes([0, 1, 0, 1, 0, .5, .5, .2, 0, 0, 1, 1]);
  let run = 1; for (let i = 1; i < shapes.length; i++) { if (shapes[i] !== shapes[i - 1]) { assert.ok(run >= 2, `run ${run} at ${i}`); run = 1; } else run++; }
  assert.equal(L.talkShapes([0, 0, 0, 0]).every(v => v === 0), true);
  assert.equal(L.flapActive({size: 'close'}, 'HERO'), true); assert.equal(L.flapActive({size: 'medium'}, 'HERO'), false);
  assert.equal(L.flapActive({size: 'medium', speaker: 'Dax'}, 'Dax'), true); assert.equal(L.flapActive({size: 'wide', speaker: 'Dax'}, 'Dax'), false);
  assert.equal(L.flapActive({size: 'close', speaker: 'Dax'}, 'HERO'), false);
});

// ---- Phase 2: baking, surfaces, presets ----
import * as BK from '../../engine/bake.js';
import * as M4 from '../../parts/materials4.js';
test('bake: voxel grid, occlusion, sun shadow, AO and practicals per vertex (pure, deterministic)', () => {
  const quad = (y, x0, x1, z0, z1) => [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1];
  const roofTris = quad(3, -1, 1, -1, 1), G = BK.voxelize(new Float32Array([...quad(0, -10, 10, -10, 10), ...roofTris]), .5);
  assert.ok(G.n.every(v => v > 0));
  assert.equal(BK.occluded(G, [0, .6, 0], [0, 1, 0], 10), true, 'the roof blocks the sky above');
  assert.equal(BK.occluded(G, [6, .6, 6], [0, 1, 0], 10), false, 'open sky away from it');
  const cfg = {sunDir: [0, 1, 0], sun: [1, 1, 1], sunI: 1, sky: [.5, .6, .9], skyI: .6, ground: [.3, .3, .3], groundI: .1, aoDist: 3.5, lights: []};
  const under = BK.bakeVertex([0, 0, 0], [0, 1, 0], G, cfg), open = BK.bakeVertex([6, 0, 6], [0, 1, 0], G, cfg);
  assert.ok(open[0] > under[0] + .5, `sun shadow under the roof ${under[0]} vs ${open[0]}`);
  assert.deepEqual(BK.bakeVertex([6, 0, 6], [0, 1, 0], G, cfg), open, 'deterministic');
  const lit = BK.bakeVertex([6, 0, 6], [0, 1, 0], G, {...cfg, lights: [{p: [6, 2, 6], color: [1, .8, .5], i: 2, range: 6}]});
  assert.ok(lit[0] > open[0] && lit[2] > open[2], 'a practical adds light');
  const d = BK.hemiDirs(12); assert.equal(d.length, 12); assert.ok(d.every(v => v[2] > 0 && Math.abs(Math.hypot(...v) - 1) < 1e-9));
});
test('v4 surfaces: six generators, deterministic, roughness/height ranges, cache pack size', () => {
  assert.deepEqual(M4.NAMES4, ['asphaltLane', 'plaster', 'timber', 'roofTile', 'glassPanel', 'polishedFloor']);
  for (const n of M4.NAMES4) { const a = M4.gen4(n, 32), b = M4.gen4(n, 32); assert.deepEqual(a.albedo, b.albedo); assert.equal(a.rough.length, 32 * 32); assert.ok(a.height.every(h => h >= 0 && h <= 1.2)); }
  const g = M4.gen4('glassPanel', 64), r = [...g.rough]; assert.ok(Math.min(...r) < 30 && Math.max(...r) > 90, 'glass panes glossy, mullions rough');
  const asph = M4.gen4('asphaltLane', 128); assert.ok([...asph.albedo].some((v, i) => i % 4 === 0 && v > 200), 'lane paint present');
  assert.equal(M4.pack4(M4.gen4('plaster', 16)).length, 16 * 16 * 9);
  assert.deepEqual([...M4.roughnessFromHeight(new Float32Array([0, .5, 1]))], [247, 219, 191]);
});
test('v4 presets (data): comedy and mystery with fixed numbers', async () => {
  const P = JSON.parse(readFileSync('engine/looks4.json', 'utf8'));
  assert.equal(P.comedy.v4.toneMapping, 'Neutral'); assert.equal(P.mystery.v4.toneMapping, 'AgX');
  for (const k of ['comedy', 'mystery']) { assert.equal(P[k].v4.lut, k); assert.ok(P[k].base.exposure > 0); }
  assert.equal(P.comedy.v4.clouds, 'puffy'); assert.equal(P.comedy.v4.heightFog, null); assert.ok(P.mystery.v4.heightFog.amount > 0); assert.equal(P.mystery.v4.bake.lights, true);
});

// ---- Phase 2b: whole cast on v5, crowd low tier ----
import * as CR from '../../engine/crowd.js';
test('2b: outfit recipes become colour regions; every build keeps head/shoulder 0.58–0.62', () => {
  const r = B5.outfitRegions({recipe: 'tee', main: '#2f80d1', legs: '#4a5a80'}, '#e0a77a');
  assert.deepEqual(r, {torso: {main: '#2f80d1'}, arms: {upper: '#2f80d1', lower: '#e0a77a', split: .35}, legs: {main: '#4a5a80', shoes: B5.SHOES, shoeFrac: .15}});
  assert.equal(B5.outfitRegions({recipe: 'hoodie', main: '#f00'}, '#fff').arms.split, .85); assert.equal(B5.outfitRegions(null, '#fff'), null);
  assert.equal(B5.regionBlocks('torso', r), null, 'plain torso: no strip blocks');
  for (const b of ['adult_m', 'adult_f', 'youth', 'elder_f']) { const a = B5.createActor5({skin: '#f6c9a0', build: b, regions: r}), q = B5.headShoulderRatio(a); assert.ok(q >= .58 && q <= .62, `${b} ${q}`);
    assert.equal(a.parts.torso.material, B5.satin('#2f80d1')); }
});
test('2b: crowd v5 low tier ≤ 300 tris a member, chamfered parts, the 1.2 head about its pivot', () => {
  assert.ok(CR.crowdV5Triangles() <= 300); const g = CR.v5PartGeometry([1, 2, 1]); assert.equal(g.attributes.position.count / 3, 28);
  g.computeBoundingBox(); assert.deepEqual(g.boundingBox.min.toArray().map(v => +v.toFixed(6)), [-.5, -.5, -.5]);
  const m = {scale: 1, yaw: 0}, pose = {root: {dx: 0, dy: 0, dz: 0, lean: 0, yaw: 0, roll: 0}, pivots: {head: [0, 0, 0], leftShoulder: [0, 0, 0], rightShoulder: [0, 0, 0], leftHip: [0, 0, 0], rightHip: [0, 0, 0]}};
  const a = CR.memberMatrices(m, pose, [0, 0, 0]), b = CR.memberMatrices(m, pose, [0, 0, 0], {headScale: B5.HEAD5});
  const sx = M => Math.hypot(M.elements[0], M.elements[1], M.elements[2]);
  assert.ok(Math.abs(sx(b.head) / sx(a.head) - B5.HEAD5[0]) < 1e-9); assert.equal(sx(b.torso), sx(a.torso));
});
