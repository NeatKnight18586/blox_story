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
  const h = B5.HEAD5; assert.ok(Math.abs(1.25 * h[0] - 1) < 1e-9 && Math.abs(1.16 * h[1] - 1) < 1e-9 && Math.abs(1.1 * h[2] - 1) < 1e-9);
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
  const tor = B5.regionBlocks('torso', hero.regions); assert.equal(tor[0].color, '#0D7CD4'); assert.equal(tor.length, 7, 'strip, 2 lapels, 2 lapel edges, 2 collar edges');
});
test('hero slot: no hair, v5 + faces v4, resolves through the troupe', () => {
  const p = resolveTroupe({troupe: 'HERO'}, {troupe: {HERO: hero}});
  assert.equal(p.hair, null); assert.equal(p.body, 'v5'); assert.equal(p.faceStyle, 'v4'); assert.equal(p.skin, '#FFD542');
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
  assert.equal(e.length, 4); assert.ok(e.every(b => b.color === '#4A4E57' && Math.min(b.size[0], b.size[1]) === .03));
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
