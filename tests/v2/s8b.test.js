// npm run v2:test — Session 8b (Amendment A5): hair v4 construction rules + budgets, crowd promotion, UI minimum size and
// safe area, `fit` framing.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STYLES, HAIR4_STYLES, HAIR4_BOYS, HAIR4_GIRLS, RULES, HAIR4_BUDGET, EYE_LINE, FACE_X, hair4Geometry, hair4Triangles, braidParts, curlParts} from '../../avatar-style/hair4.js';
import {promoteNear, PROMOTE} from '../../engine/crowd.js';
import {minScale, safeShift, MIN_CAP, SAFE} from '../../engine/ruleui.js';

test('hair v4: 20 named styles, built only from mass / clump / bun / braid / curls', () => {
  assert.equal(HAIR4_STYLES.length, 20); assert.equal(HAIR4_BOYS.length, 8); assert.equal(HAIR4_GIRLS.length, 10);
  for (const s of ['messy_fringe', 'side_part', 'quiff', 'curtains', 'fade_textured', 'spiky_crop', 'curly_top', 'shaggy_mop', 'long_layered', 'high_ponytail', 'space_buns', 'low_twintails', 'wavy_bob', 'sleek_long', 'messy_bun', 'long_braids', 'curly_puffs', 'wolf_cut', 'buzz', 'bald']) assert.ok(STYLES[s], s);
  for (const [s, vols] of Object.entries(STYLES)) for (const v of vols) assert.ok(['mass', 'clump', 'bun', 'braid', 'curls'].includes(v.t), `${s}: ${v.t}`);
  assert.ok(STYLES.long_braids.some(v => v.t === 'braid') && STYLES.curly_puffs.filter(v => v.t === 'curls').length === 2 && STYLES.curly_top.some(v => v.t === 'curls'));
});

test('hair v4 construction rules on the style tables', () => {
  for (const [s, vols] of Object.entries(STYLES)) {
    if (s === 'bald') { assert.equal(vols.length, 0); continue; }
    if (s !== 'buzz') assert.ok(vols.length >= RULES.volumes[0] && vols.length <= RULES.volumes[1], `${s}: ${vols.length} volumes`);
    assert.equal(vols.filter(v => v.t === 'mass').length, 1, s);
    for (const v of vols) {
      if (v.t === 'clump') { assert.ok(v.w >= RULES.clumpW && v.th >= RULES.clumpTh, `${s}: clump ${v.w}×${v.th}`); if (v.fringe) assert.ok(v.w >= RULES.fringeW, `${s}: fringe ${v.w}`); }
      if (v.t === 'braid') { const n = v.n ?? 7; assert.ok(n >= RULES.braidBeads[0] && n <= RULES.braidBeads[1], `${s}: braid ${n}`); }
      if (v.t === 'curls') { const n = v.n ?? 9; assert.ok(n >= RULES.curlBuns[0] && n <= RULES.curlBuns[1], `${s}: curls ${n}`); }
    }
  }
  const b = braidParts([0, 0, 0], [0, -1, 0], {n: 6, r0: .2, r1: .1}); assert.equal(b.length, 6); assert.ok(b[0].r > b[5].r);
  for (let k = 1; k < 6; k++) assert.ok(Math.hypot(b[k].at[0] - b[k - 1].at[0], b[k].at[1] - b[k - 1].at[1]) < b[k].r + b[k - 1].r, 'beads overlap');
  assert.equal(curlParts([0, 0, 0], {n: 9}).length, 9);
});

test('hair v4 geometry: indexed and smooth, budgets per tier, nothing in front of the face below EYE_LINE', () => {
  for (const s of HAIR4_STYLES) for (const tier of ['hero', 'mid', 'crowd']) {
    const g = hair4Geometry(s, '#5a3a22', tier);
    if (s === 'bald') { assert.equal(g, null); continue; }
    assert.ok(g.index, `${s} ${tier} indexed`); assert.ok(g.attributes.color && g.attributes.normal);
    assert.ok(hair4Triangles(g) <= HAIR4_BUDGET[tier], `${s} ${tier}: ${hair4Triangles(g)}`);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0 && Math.abs(p.getX(i)) < FACE_X) assert.ok(p.getY(i) >= EYE_LINE - 1e-6, `${s} ${tier} below the eye line`);
  }
  assert.ok(hair4Triangles(hair4Geometry('long_layered', '#000', 'crowd')) <= 140);
});

test('crowd promotion: close/medium only, nearer than 9, ≤ 8, nearest first, deterministic', () => {
  const pts = Array.from({length: 30}, (_, i) => [Math.sin(i) * (i % 12), 0, Math.cos(i) * (i % 12)]), cam = [0, 2.5, 0];
  const a = promoteNear(pts, cam, 'close'); assert.deepEqual(a, promoteNear(pts, cam, 'close'));
  assert.ok(a.length <= PROMOTE.max); for (const i of a) assert.ok(Math.hypot(pts[i][0], pts[i][2]) < 9);
  for (let k = 1; k < a.length; k++) assert.ok(Math.hypot(...pts[a[k]]) >= Math.hypot(...pts[a[k - 1]]) - 1e-9);
  assert.deepEqual(promoteNear(pts, cam, 'wide'), []); assert.deepEqual(promoteNear(pts, cam, 'medium').length, a.length);
});

test('UI: minimum cap heights and the safe area (clamp, never clip, never in the caption band)', () => {
  assert.equal(MIN_CAP.tag, .024); assert.equal(MIN_CAP.stat, .03); assert.equal(MIN_CAP.plate, .03); assert.equal(MIN_CAP.focus, .045);
  assert.equal(minScale(.012, .024), 2); assert.equal(minScale(.05, .024), 1);
  const s1 = safeShift({x0: .92, x1: 1.05, y0: .3, y1: .34}); assert.ok(Math.abs(1.05 + s1.dx - (1 - SAFE.side)) < 1e-9);
  const s2 = safeShift({x0: .4, x1: .6, y0: .02, y1: .05}); assert.ok(Math.abs(.02 + s2.dy - SAFE.top) < 1e-9);
  const s3 = safeShift({x0: .4, x1: .6, y0: .6, y1: .64}); assert.ok(.64 + s3.dy <= SAFE.band[0] + 1e-9, 'pushed above the band');
  const s4 = safeShift({x0: .4, x1: .6, y0: .72, y1: .78}); assert.ok(.72 + s4.dy >= SAFE.band[1] - 1e-9, 'pushed below the band');
  const s5 = safeShift({x0: -.1, x1: 1.1, y0: .2, y1: .3}); assert.ok(Math.abs((-.1 + 1.1) / 2 + s5.dx - .5) < 1e-9, 'too wide: centred, not clipped');
});

import {fitDistance, applyFit, framingCheck, sampleCamera, FRAMING} from '../../engine/camera.js';
test('fit framing: the subject hits its target height; framing check thresholds', () => {
  const H = 5.3 * .82, fov = 50, pose = {position: [0, 3, 30], target: [0, 3, 0], fov}, actor = [2, 0, -1];
  for (const [part, frac] of [['full', .3], ['head', .45]]) {
    const p = applyFit(pose, {actor: 'a', height: frac, part}, actor, H), span = part === 'head' ? .42 * H : 1.02 * H;
    const d = Math.hypot(...p.position.map((v, i) => v - [actor[0], actor[1] + (part === 'head' ? .81 * H : .51 * H), actor[2]][i]));
    const onScreen = span / (2 * d * Math.tan(fov * Math.PI / 360)); assert.ok(Math.abs(onScreen - frac) < 1e-9, part);
  }
  assert.ok(Math.abs(fitDistance(2, .5, 90) - 2) < 1e-9);
  const shot = {move: 'heroLow', duration: 2, ground: 0, from: {position: [3, .9, 40], target: [0, 8, 0], fov: 66}, fit: {actor: 'a', height: .3, h: H}};
  const c = sampleCamera(shot, 1, {a: [0, 0, 0]}); assert.ok(Math.hypot(c.position[0], c.position[2]) < 20, 'moved in to fit');
  assert.ok(framingCheck({size: 'close', subjectFrac: .46}).ok); assert.ok(!framingCheck({size: 'close', subjectFrac: .4}).ok);
  assert.ok(!framingCheck({size: 'medium', subjectFrac: .2}).ok); assert.ok(!framingCheck({size: 'wide', move: 'heroLow', subjectFrac: .18}).ok);
  assert.ok(!framingCheck({size: 'wide', subjectFrac: .1, groundGap: .45}).ok); assert.ok(framingCheck({size: 'wide', subjectFrac: .1, groundGap: .45, spectacle: true}).ok);
  assert.equal(FRAMING.groundMax, .28);
});

import {lightness, nightPaletteCheck, NIGHT_MIN_L} from '../../engine/troupe.js';
import {readFileSync as rf} from 'node:fs';
test('night palette rule: hero/troupe outfit colours ≥ 0.32 lightness in night shots; the egg look test complies', () => {
  assert.ok(Math.abs(lightness('#808080') - .502) < .01); assert.equal(lightness('#000000'), 0); assert.equal(lightness('#ffffff'), 1);
  const data = JSON.parse(rf('cast/troupe.json', 'utf8'));
  const bad = {look: 'nightBright', cast: {dax: {troupe: 'RIVAL', outfit: {main: '#26262c', legs: '#4a4f57'}}, afk: {troupe: 'AFK'}, crowd1: {town: 3}}};
  const f = nightPaletteCheck(bad, data); assert.deepEqual(f.map(x => x.key).sort(), ['legs', 'main']); assert.ok(f.every(x => x.l < NIGHT_MIN_L));
  assert.deepEqual(nightPaletteCheck({...bad, look: 'day'}, data), []);
  assert.deepEqual(nightPaletteCheck(JSON.parse(rf('engine/fixtures/looktest/egg-new.json', 'utf8')), data), []);
  const egg = JSON.parse(rf('engine/fixtures/looktest/egg-new.json', 'utf8')); assert.ok(lightness(egg.cast.dax.outfit.main) >= NIGHT_MIN_L && egg.cast.dax.outfit.main === '#9a2f2f');
});
