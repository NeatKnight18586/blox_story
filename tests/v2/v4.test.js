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
  const tor = B5.regionBlocks('torso', hero.regions); assert.equal(tor[0].color, '#0D7CD4'); assert.equal(tor.length, 3);
});
test('hero slot: no hair, v5 + faces v4, resolves through the troupe', () => {
  const p = resolveTroupe({troupe: 'HERO'}, {troupe: {HERO: hero}});
  assert.equal(p.hair, null); assert.equal(p.body, 'v5'); assert.equal(p.faceStyle, 'v4'); assert.equal(p.skin, '#FFD542');
  assert.equal(resolveTroupe({troupe: 'LEAD'}, troupe).faceStyle, 'v3', 'troupe default unchanged');
});
test('hero colours vs the troupe (RGB distance ≥ 90): measured', () => {
  const issues = B5.heroColourCheck(hero, {...troupe.troupe, AFK: troupe.AFK});
  // recorded, not asserted away: the owner fixes the hero colours; a clash is reported per troupe outfit
  console.log('heroColourCheck', JSON.stringify(issues));
  assert.ok(Array.isArray(issues));
  assert.equal(B5.heroColourCheck(hero, {X: {outfit: {main: '#73985E'}}}).length, 1);
});
test('faces v4: eye centres 0.30 of head width apart, sketch on brows/mouth only, 8 hero presets', () => {
  for (const f of F4.HERO_PRESETS) { const [l, r] = F4.eyeCentres4(f); assert.ok(Math.abs((r - l) * F4.DECAL_PER_HEAD - .30) < .02, `${f}: ${(r - l) * .8}`); }
  assert.equal(F4.HERO_PRESETS.length, 8);
  for (const f of F4.HERO_PRESETS) {
    const L4 = F4.faceParts4(f, {px: 512}), sk = L4.filter(it => it.kind === 'sketch');
    assert.ok(sk.length >= 3, f); assert.ok(sk.every(it => it.alpha === .35));
    for (const it of L4) { if (it.clip) continue; const [x0, y0, x1, y1] = it.bbox; assert.ok(x0 >= -.5 && x1 <= .5 && y0 >= -.345 && y1 <= .345, `${f} outside ${it.bbox}`); }
  }
  // no sketch line near an eye centre
  const [l, r] = F4.eyeCentres4('hero_grin');
  for (const it of F4.faceParts4('hero_grin').filter(it => it.kind === 'sketch')) { const cx = (it.bbox[0] + it.bbox[2]) / 2, cy = (it.bbox[1] + it.bbox[3]) / 2; assert.ok(!([l, r].some(e => Math.abs(cx - e) < .03) && Math.abs(cy - .06) < .03)); }
  assert.deepEqual(F4.faceParts4('hero_wink'), F4.faceParts4('hero_wink'), 'deterministic');
  assert.ok(F4.faceParts4('hero_rage', {tier: 'crowd'}).every(it => it.kind !== 'sketch'));
});
test('faces v4: talking mouths, 4 shapes per family; held faces never change', () => {
  for (const [fam, shapes] of Object.entries(F4.TALK)) { assert.equal(shapes.length, 4, fam); for (const m of shapes) assert.ok(F4.hasMouth(m), m); assert.equal(F4.talkFamily(shapes[0]), fam); }
  const m = k => JSON.stringify(F4.faceParts4('hero_grin', {talk: k}).filter(it => it.kind === 'mouth' || it.fill === '#5a1f2a'));
  assert.equal(new Set([0, 1, 2, 3].map(m)).size, 4);
  assert.ok(F4.isHeld('hero_shock') && F4.isHeld('hero_cry') && F4.isHeld('hero_rage') && F4.isHeld('terrified'));
  assert.ok(!F4.isHeld('hero_wink') && !F4.isHeld('smile'));
  assert.deepEqual(F4.faceParts4('hero_shock', {talk: 3}), F4.faceParts4('hero_shock'));
  for (const f of ['hero_wink', 'hero_grin', 'hero_soft']) for (const k of [null, 0, 1, 2, 3]) assert.equal(F4.blushOverlap(f, k), 0, `${f} talk ${k}: blush touches the mouth`);
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
