// fearbell PREVIS pass 2 — owner-approved ENGINE slot (A1–A5), pure logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {faceAim, FACE_AIM, headroomOf, sampleTpl} from '../../engine/camtpl.js';
import {project} from '../../engine/cine.js';
import {leakJudge, LEAK_MAX} from '../../scripts/v2/fgleak.js';
import * as A from '../../engine/acting6.js';
import {sampleVerbR6, UNPLANTED} from '../../engine/r6.js';
import {name6, FACE_NAMES6, FACES_FB, family6} from '../../avatar-style/faces6.js';
import {PROPS1G, waterDrop, leafFlutter, cheeseburger, tris} from '../../parts/props1g.js';
import {buildTool} from '../../avatar-style/tools.js';
import {clockTower} from '../../parts/city/downtown.js';
import {parseBrief, briefToSpec, cityLocOf} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';

const AS = 9 / 16, head = (x, y, z, h = 1.2) => ({c: [x, y, z], top: [x, y + .72 * h, z]});
test('A1 faceAim: face centre on the upper-third line, headroom 8–12 %, the camera position kept', () => {
  for (const [cam, hs] of [[{position: [0, 4, 9], target: [0, 3, 0], fov: 50}, [head(0, 4.6, 0)]], [{position: [3, 2, 6], target: [0, 5, 0], fov: 30}, [head(.2, 4.6, 0)]],
    [{position: [0, 4.5, 8], target: [0, 4, 0], fov: 40}, [head(-.9, 4.6, 0), head(.9, 3.9, .4, 1.0)]]]) {
    const r = faceAim(cam, hs, AS), c = {position: r.position, target: r.target, fov: r.fov};
    assert.deepEqual(r.position, cam.position);
    const F = hs.reduce((a, h) => a.map((v, i) => v + h.c[i] / hs.length), [0, 0, 0]), q = project(c, F, AS);
    assert.ok(hs.length > 1 ? (1 - q.y) / 2 <= FACE_AIM.eyeLine + .005 : Math.abs((1 - q.y) / 2 - FACE_AIM.eyeLine) < .005, `face at ${(1 - q.y) / 2}`);   // two heads widened: the faces may rise above the line
    const hr = headroomOf(c, hs, AS); assert.ok(hr >= .08 - 1e-3 && hr <= .12 + 1e-3, `headroom ${hr}`); assert.ok(r.ok);
    for (const h of hs) assert.ok(Math.abs(project(c, h.c, AS).x) < .9, 'every face inside the width');
  }
});
test('A1 faceAim never crops the head top (headroom > 0) even from a low worm\'s-eye camera', () => {
  const r = faceAim({position: [0, .6, 5], target: [0, 4, 0], fov: 60}, [head(0, 4.6, 0)], AS); assert.ok(r.headroom >= .08 - 1e-3);
});
test('A1 kinds: close sizes only (never ecu)', () => { assert.ok(!FACE_AIM.kinds.includes('ecu')); for (const k of ['cu', 'mcu', 'two', 'ots']) assert.ok(FACE_AIM.kinds.includes(k)); });
test('A2 leak judge: > 10 % of the middle third is an error', () => {
  const r = leakJudge([{frame: 1, cover: .05}, {frame: 2, cover: .11, hits: ['pole']}]); assert.equal(LEAK_MAX, .10);
  assert.deepEqual(r.map(x => x.ok), [true, false]); assert.match(r[1].msg, /11\.0 %.*pole/);
});
test('A2 episode.js: format 7 drops fg unless fgNote; leakMeasure exported', () => {
  const s = readFileSync('engine/episode.js', 'utf8'); assert.match(s, /\(spec\.format \?\? 0\) >= 7 && !shot\.fgNote/); assert.match(s, /export function leakMeasure/);
});
test('A3 verbs: water / sip / leap / punch / lookAtLens exist, R6 leap is airborne, punch reaches forward', () => {
  for (const v of A.FB_VERBS) { assert.ok(A.VERBS[v], v); const s = sampleVerbR6(v, A.timing(A.VERBS[v]).key); assert.ok(s.sample, v); }
  assert.ok(UNPLANTED.has('leap')); assert.ok(sampleVerbR6('leap', A.timing(A.VERBS.leap).key).sample.root.dy > 1.5);
  assert.ok(!A.VERB_NAMES.includes('leap'), 'VERB_NAMES (v6 joint-limit set) unchanged');
});
test('A3 deadpan face: opt-in by name, the 24 v6 names unchanged', () => {
  assert.equal(name6('deadpan'), 'deadpan'); assert.equal(FACE_NAMES6.length, 24); assert.ok(FACES_FB.deadpan); assert.equal(family6('deadpan'), 'neutral');
});
test('A3 props: can (pour), cup, leaf (flutter), mouse, FULL cheeseburger; tools', () => {
  for (const k of ['wateringCan', 'juiceCup', 'leaf', 'mouse', 'cheeseburger']) { const g = PROPS1G[k](); assert.ok(tris(g) > 0 && tris(g) < 4000, k); }
  assert.equal(waterDrop(0, -.1), null); assert.ok(waterDrop(3, .5).p[1] <= 0); assert.notDeepEqual(leafFlutter(0).rot, leafFlutter(.5).rot);
  const b = cheeseburger(); assert.ok(b.userData.size.w >= 1.8 && b.userData.size.h >= 1.3, 'chunky enough to read at phone size');
  const layers = new Set(); b.traverse(o => { if (o.isMesh) layers.add('#' + o.material.color.getHexString()); }); for (const c of ['#43c437', '#5a2f19', '#ffc61a', '#e9a142']) assert.ok(layers.has(c), 'layer ' + c);
  assert.equal(buildTool('wateringCan').userData.grip, 'hold'); assert.equal(buildTool('juiceCup').userData.grip, 'hold');
});
test('A3 clock tower: a fixed time (noon = both hands up)', () => {
  const c = clockTower(); c.setClock('12:00'); assert.equal(c.hands[0].min.rotation.z, 0); assert.equal(c.hands[0].hr.rotation.z, 0);
  c.setClock('3:00'); assert.ok(Math.abs(c.hands[0].hr.rotation.z - Math.PI / 2) < 1e-9);
});
test('A3 attach + lookAtLens + clockTime are wired in episode / downtown (opt-in)', () => {
  const e = readFileSync('engine/episode.js', 'utf8'), d = readFileSync('parts/city/downtown.js', 'utf8');
  assert.match(e, /p\.attach && cast\[p\.attach\.actor\]/); assert.match(e, /verb === 'lookAtLens'/); assert.match(d, /k === 'clockTime'/);
});
test('A4 brief2spec: city locations, GOVERNOR, creature subjects, multi-word emphasis (fearbell BRIEF → exit 0)', () => {
  assert.deepEqual(cityLocOf('Main St bus stop'), ['city', 'mainSt']); assert.deepEqual(cityLocOf('hero home dining'), ['cityDining']); assert.deepEqual(cityLocOf('classroom'), ['cityClassroom']);
  assert.deepEqual(cityLocOf('suburb yard'), ['city', 'suburbStreet']); assert.deepEqual(cityLocOf('hero house yard'), ['city', 'heroHouse']); assert.equal(cityLocOf('the moon'), null);
  const b = parseBrief(readFileSync('stories/fearbell/BRIEF.md', 'utf8')), cues = JSON.parse(readFileSync('stories/fearbell/cues.json', 'utf8'));
  const {spec, errors, missing} = briefToSpec(b, cues, loadLibrary('.'), {slug: 'fearbell'});
  assert.deepEqual(errors, []); assert.deepEqual(missing, {locations: [], props: []});
  assert.equal(spec.format, 7); assert.equal(spec.cast.governor.troupe, 'GOVERNOR'); assert.equal(spec.world, 'parts/city/world.js'); assert.deepEqual(spec.locations, ['city', 'cityClassroom', 'cityDining']);
  assert.ok(spec.emphasis6.some(e => e.word === 'vacuum cleaner.')); assert.ok(spec.shots.every(s => s.from?.position && !s.fg));
});
test('fearbell FINAL fix: updateProps runs prop visibility + anim (the burger shrink, pour, rope pull, leaf) — the call is code, not comment text', () => {
  const src = readFileSync(new URL('../../engine/episode.js', import.meta.url), 'utf8'), i = src.indexOf('function updateProps(t)'), body = src.slice(i, src.indexOf('\nconst ALOCK', i));
  const code = body.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');   // drop line comments
  assert.match(code, /g\.visible = valueAt\(p\.visible, t, true\)/);
  assert.match(code, /g\.userData\.anim\(t - \(p\.animAt \?\? 0\), p\)/);
});
