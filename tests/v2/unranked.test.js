// tests/v2/unranked.test.js — E4 (unranked) Phase 1 pure logic: birth-symbol rank scaling, the hero-symbol hard error, STUDENT seed
// variety, rank colours (ΔE2000), costume resolution, the DOG poses and the CAST line `- dog → DOG`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RANKS, RANK_SIZE, RANK_GLOW, RANK_LOOK, symbolSpec, symbolHeroError, DARK_COLOR, SHAPES, SHAPE_PATHS} from '../../avatar-style/symbol.js';
import {deltaE2000} from '../../avatar-style/deltae.js';
import {studentLook, variety, STUDENT_RANKS} from '../../engine/student.js';
import {resolveTroupe} from '../../engine/troupe.js';
import {sampleDog, dogPose, DOG_STATES} from '../../avatar-style/dog.js';
import {parseBrief} from '../../scripts/v2/brief2spec.js';

const data = JSON.parse(fs.readFileSync('cast/troupe6.json', 'utf8'));

test('symbol size and glow grow with rank; S is twice D and the brightest', () => {
  for (let i = 1; i < RANKS.length; i++) { assert.ok(RANK_SIZE[RANKS[i]] > RANK_SIZE[RANKS[i - 1]]); assert.ok(RANK_GLOW[RANKS[i]] > RANK_GLOW[RANKS[i - 1]]); }
  assert.equal(RANK_SIZE.S / RANK_SIZE.D, 2); assert.equal(RANK_GLOW.S, 1);
  const s = symbolSpec({shape: 'flame', rank: 'B'}); assert.equal(s.color, RANK_LOOK.B.color); assert.equal(s.size, RANK_SIZE.B); assert.ok(s.glow > 0);
  assert.throws(() => symbolSpec({shape: 'leaf', rank: 'X'}), /rank/); assert.throws(() => symbolSpec({shape: 'star', rank: 'D'}), /shape/);
});
test('symbolDark: grey #5A5A60 and no glow, same size', () => {
  const l = symbolSpec({shape: 'lightning', rank: 'S'}), d = symbolSpec({shape: 'lightning', rank: 'S'}, {dark: true});
  assert.equal(d.color, '#5A5A60'); assert.equal(DARK_COLOR, '#5A5A60'); assert.equal(d.glow, 0); assert.equal(d.size, l.size); assert.equal(symbolSpec(null), null);
});
test('every shape has paths inside the unit box', () => {
  for (const sh of SHAPES) { const P = SHAPE_PATHS[sh]; assert.ok(P.fills.length + P.strokes.length > 0, sh);
    for (const f of [...P.fills, ...P.strokes]) for (const [x, y] of f.pts) assert.ok(Math.abs(x) <= .5 && Math.abs(y) <= .5, `${sh} ${x},${y}`); }
});
test('the HERO never gets a symbol: a hard error (cast key, troupe slot, costume)', () => {
  assert.match(symbolHeroError('hero', true), /never/); assert.equal(symbolHeroError('lila', true), null); assert.equal(symbolHeroError('hero', false), null);
  const sym = {shape: 'leaf', color: '#9BD48A', rank: 'D'}, d = {...data, troupe: {...data.troupe, HERO: {tier: 'hero', body: 'v6'}}};
  assert.throws(() => resolveTroupe({troupe: 'HERO', symbol: sym}, d), /HERO never gets/);
  assert.doesNotThrow(() => resolveTroupe({troupe: 'HERO'}, d));
});
test('the five rank colours are pairwise ΔE2000 ≥ 20 (G2)', () => {
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) assert.ok(deltaE2000(RANK_LOOK[RANKS[i]].color, RANK_LOOK[RANKS[j]].color) >= 20, RANKS[i] + RANKS[j]);
  assert.ok(Math.abs(deltaE2000('#FFFFFF', '#FFFFFF')) < 1e-9); assert.ok(deltaE2000('#000000', '#FFFFFF') > 90);   // sanity
});
test('STUDENT: 8 consecutive seeds differ in skin, hair style, hair colour and trim; all five ranks appear', () => {
  for (const f of ['skin', 'hairStyle', 'hairColor', 'trim']) { assert.equal(variety(f, 1), 8, f); assert.equal(variety(f, 9), 8, f + ' ring 2'); }
  assert.deepEqual(new Set(Array.from({length: 8}, (_, i) => studentLook(i + 1).symbol.rank)), new Set(RANKS)); assert.equal(STUDENT_RANKS.length, 8);
  assert.deepEqual(studentLook(5), studentLook(5));   // pure
  const l = studentLook(3); assert.equal(l.build, 'youth'); assert.equal(l.hair.v, 4); assert.equal(l.regions.arms.cuff, l.trim); assert.ok(l.scale >= .8 && l.scale <= .92);
  assert.notDeepEqual(studentLook(1).regions, studentLook(9).regions);   // the second ring shifts the colour tables
});
test('costumes resolve on their slots with symbols, skirt / apron and recolours', () => {
  const r = (slot, costume, seed) => resolveTroupe({troupe: slot, costume, seed, faceStyle: 'v6'}, data);
  const lila = r('SECOND', 'LILA'), dax = r('RIVAL', 'DAX'), dad = r('ELDER', 'DAD'), mom = r('ADULT_F', 'MOM');
  assert.equal(lila.symbol.rank, 'D'); assert.equal(lila.regions.skirt.color, '#8FAE8B'); assert.equal(lila.regions.torso.main, '#EFE6D2'); assert.equal(lila.regions.legs.main, '#3E4A3C'); assert.equal(lila.hair.style, 'long_layered');
  assert.equal(dax.symbol.rank, 'S'); assert.equal(dax.regions.torso.main, '#1F2A55'); assert.equal(dax.regions.torso.edge, '#E8B530'); assert.equal(dax.hair.style, 'quiff');
  assert.equal(dad.hair.color, '#3B2A1E'); assert.equal(dad.regions.torso.main, '#D9A23A'); assert.equal(dad.symbol.shape, 'flame');
  assert.equal(mom.build, 'adult_f'); assert.equal(mom.age, 40); assert.equal(mom.regions.torso.main, '#4FA3A0'); assert.equal(mom.regions.apron.color, '#F4EFE6'); assert.equal(mom.symbol.color, '#6FB7FF');
  assert.throws(() => resolveTroupe({troupe: 'SECOND', costume: 'DAX'}, data), /not for slot/);
  for (const [c, trim, rank] of [['STUDENT_A', '#8FD3FF', 'A'], ['STUDENT_B', '#FF8A2A', 'B'], ['STUDENT_C', '#2EC4C4', 'C']]) { const s = r('DUMMY', c); assert.equal(s.regions.torso.edge, trim); assert.equal(s.symbol.rank, rank); assert.ok(s.hair && s.skin !== '#F2F2F4'); assert.ok(!s.material); }
  const st = r('DUMMY', 'STUDENT', 4); assert.notEqual(st.tier, 'bg'); assert.ok(st.hair.style && st.symbol && st.build === 'youth');   // full detail: no bg tier
});
test('DOG: poses idle / sit / bow / wag, pure and cross-faded', () => {
  assert.deepEqual(DOG_STATES, ['idle', 'sit', 'bow', 'wag']);
  const idle = dogPose('idle', 0), sit = dogPose('sit', 0), bow = dogPose('bow', 0);
  assert.ok(sit.bodyY < idle.bodyY && sit.pitch < 0); assert.ok(bow.fLeg < -1.2 && bow.pitch > 0 && bow.tailUp > idle.tailUp);   // bow: front legs stretched forward, chest down, tail up
  assert.ok(Math.abs(dogPose('wag', .1).tailYaw) > .3); assert.throws(() => dogPose('fly', 0), /unknown dog state/);
  const mid = sampleDog([[0, 'idle'], [1, 'bow']], 1.125), a = sampleDog([[0, 'idle'], [1, 'bow']], 1.125 - 1e-9);
  assert.ok(mid.pitch > 0 && mid.pitch < bow.pitch + .1); assert.ok(Math.abs(a.pitch - mid.pitch) < 1e-6, 'continuous'); assert.deepEqual(sampleDog([[0, 'sit']], 2), dogPose('sit', 2));
});
test('`- dog → DOG` and `- mom → ADULT_F` resolve in a CAST section', () => {
  const b = parseBrief('## CAST\n- HERO (fixed)\n- dog → DOG\n- mom → ADULT_F · costume MOM\n- water → DUMMY · costume STUDENT_C\n'), by = Object.fromEntries(b.cast.map(c => [c.role, c]));
  assert.equal(by.dog.slot, 'DOG'); assert.equal(by.mom.slot, 'ADULT_F'); assert.equal(by.mom.costume, 'MOM'); assert.equal(by.water.costume, 'STUDENT_C');
});
