// tests/v2/fearbell3.test.js — fearbell ENGINE fix (animatic slot): A1 seek-safe motion (the creature runtime, incl. the dark dome's
// inside view, and the clock FX bell are pure functions of t: any frame order gives the same scene), A2 plan gate non-actor subjects
// (objectIssues), and the location segments that render a room location from its own world.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {createCreatures} from '../../parts/creatures.js';
import {createClockFx} from '../../engine/clockfx.js';
import {objectIssues, OBJ} from '../../engine/plancheck.js';
import {segmentSpec} from '../../scripts/v2/segments.js';

// a scene fingerprint: everything that reaches the frame (visible subtrees: world matrices, light intensities), background, dark factor
function fp(scene, api) {
  scene.updateMatrixWorld(true); const out = [];
  const walk = (o, p) => { if (!o.visible) return; const k = p + '/' + (o.name || o.type);
    out.push(k + ':' + o.matrixWorld.elements.map(v => v.toFixed(4)).join() + (o.isLight ? '|' + o.intensity.toFixed(3) : ''));
    for (const c of o.children) walk(c, k); };
  walk(scene, ''); out.push('bg:' + (scene.background?.isColor ? scene.background.getHexString() : String(scene.background)), 'dark:' + api.dark);
  return out.join('\n');
}
const DOMES = () => [
  {id: 'dome', kind: 'dome', radius: 24, pos: [0, 0, 6], acts: [{act: 'roll', at: 1, dur: 1.7, from: [0, 0, -40], to: [0, 0, 6]}], visible: [[0, false], [1, true], [4, false]]},
  {id: 'domeLulu', kind: 'dome', pos: [0, 0, 6], acts: [{act: 'inside', at: 3, dur: 1.4}], visible: [[0, false], [3, true], [4.4, false]]},
  {id: 'domeIn', kind: 'dome', pos: [0, 0, 6], acts: [{act: 'inside', at: 5, dur: 2, rim: ['lulu']}], visible: [[0, false], [5, true], [7, false]]},
  {id: 'domeS', kind: 'dome', pos: [0, 0, -10], acts: [{act: 'shrink', at: 7.2, toActor: 'lulu', hand: 'right'}], visible: [[0, false], [7, true], [9, false]]},
];
function domeScene() {
  const scene = new T.Scene(); scene.background = null; const ground = new T.Mesh(new T.BoxGeometry(50, 1, 50), new T.MeshBasicMaterial()); ground.name = 'ground'; scene.add(ground);
  const lulu = new T.Group(); lulu.name = 'lulu'; lulu.position.set(-3, 0, 14); scene.add(lulu);
  const torch = new T.SpotLight('#fff', 260); torch.userData.keep = true; torch.name = 'flash'; scene.add(torch);
  const hand = t => [-3 + .2 * Math.sin(t), 2.1, 14.5];   // a posed palm that moves with t (pure)
  let now = 0; const list = DOMES();
  const api = createCreatures(scene, list, {actorPos: () => [-3, 4, 14], keep: o => o === lulu, handPos: () => hand(now)});
  return {scene, list, api, at: t => { now = t; api.update(t); return fp(scene, api); }};
}

test('A1 seek-safe: the dark dome (roll · inside · shrink to a palm) renders the same scene cold and after any frame order', () => {
  const probes = [3.6, 5.5, 7.9, 2.2, 8.6];   // inside (Lulu), inside (rim), mid-shrink, roll, palm puff
  const cold = Object.fromEntries(probes.map(t => { const s = domeScene(); return [t, s.at(t)]; }));
  const s = domeScene(), before = JSON.stringify(s.list);
  for (const seq of [[0, 1, 2, 3, 3.5, 4.2, 5, 6, 7.5, 8, 9], [9, 7.6, 5.1, 3.1, 0], [6, 3.2, 8.9, 1.5]]) {
    for (const t of seq) s.at(t);
    for (const t of probes) { assert.equal(s.at(t), cold[t], `dome scene at t=${t} differs after the sequence ${seq}`); s.at(seq.at(-1)); }
  }
  assert.equal(JSON.stringify(s.list), before, 'the spec acts are never mutated (shrink toActor)');
});
test('A1 seek-safe: leaving the inside view restores a null sky background (it stayed black)', () => {
  const s = domeScene(); s.at(5.5); assert.ok(s.scene.background?.isColor); s.at(2.2); assert.equal(s.scene.background, null); assert.equal(s.api.dark, 0);
});
test('A1 seek-safe: clock FX `rest` puts the bell back to swing 0 after a jump out of a dong; default unchanged', () => {
  const mk = rest => { const st = {}; const fx = createClockFx(new T.Scene(), [{at: 1, fx: 'dong'}], {world: {setState: (k, v) => { st[k] = v; return true; }}, wordTime: () => 0, rest}); return {fx, st}; };
  const a = mk(true); a.fx.update(1.4); assert.ok(Math.abs(a.st.bell.swing) > 1); a.fx.update(9); assert.equal(a.st.bell.swing, 0);
  const cold = mk(true); cold.fx.update(9); assert.deepEqual(cold.st.bell, a.st.bell);
  const b = mk(false); b.fx.update(1.4); const kept = b.st.bell.swing; b.fx.update(9); assert.equal(b.st.bell.swing, kept, 'without rest: the old behaviour');
});
test('A2 plan gate: non-actor subjects measured by their projected box', () => {
  assert.match(objectIssues('ghost', null)[0], /not in the scene/);
  assert.match(objectIssues('dome', {visible: false, front: false, area: 0})[0], /not visible/);
  assert.match(objectIssues('rat', {visible: true, front: true, area: .004, cx: .5, cy: .5})[0], /covers 0.4 %/);
  assert.match(objectIssues('trex', {visible: true, front: true, area: .1, cx: .05, cy: .5})[0], /centre at x 5 %/);
  assert.deepEqual(objectIssues('trex', {visible: true, front: true, area: .1, cx: .5, cy: .5}), []);
  assert.deepEqual(objectIssues('dome', {visible: true, front: true, area: OBJ.fill + .1, cx: .02, cy: .95}), [], 'a frame-filling subject passes the centre rule');
});
test('A2 fearbell: every row names its subject (or its story prop) again', () => {
  const s = JSON.parse(readFileSync('stories/fearbell/episode.json', 'utf8'));
  for (const sh of s.shots) assert.ok(sh.subject || sh.prop, `${sh.id} has neither subject nor prop`);
  const by = r => s.shots.find(x => x.row === r);
  assert.equal(by(16).prop, 'teacherDrawer'); assert.equal(by(23).prop, 'prop_burger3'); assert.equal(by(34).prop, 'slot:3:dial#2');
  for (const [r, n] of [[3, 'ghost'], [8, 'trex'], [36, 'dome'], [49, 'domeS'], [45, 'heroF:rightArm']]) assert.equal(by(r).subject, n);
});
test('segments: a location JSON with its own `world` renders from that world; room-addressed creatures / clock / props stay on their page', () => {
  const spec = {world: 'parts/city/world.js', locations: ['city', 'cityDining'], cityLiving: ['blimp'], shots: [{id: 'S1', loc: 'city', frames: 10}, {id: 'S2', loc: 'cityDining', frames: 10}],
    creatures: [{id: 'a'}, {id: 'b', room: 'cityDining'}], clock: [{fx: 'dong'}, {fx: 'pop', room: 'cityDining'}], props: [{id: 'p'}, {id: 'q', loc: 'cityDining'}]};
  const room = segmentSpec(spec, 'cityDining', {world: 'parts/city/rooms.js'}), city = segmentSpec(spec, 'city', {world: 'parts/city/world.js'});
  assert.equal(room.world, 'parts/city/rooms.js'); assert.equal(room.cityLiving, undefined);
  assert.deepEqual(room.creatures.map(c => c.id), ['b']); assert.deepEqual(room.clock.map(c => c.fx), ['pop']); assert.deepEqual(room.props.map(c => c.id), ['q']);
  assert.equal(city.world, 'parts/city/world.js'); assert.deepEqual(city.cityLiving, ['blimp']);
  assert.deepEqual(city.creatures.map(c => c.id), ['a']); assert.deepEqual(city.clock.map(c => c.fx), ['dong']); assert.deepEqual(city.props.map(c => c.id), ['p']);
  const plain = {world: 'w.js', locations: ['x', 'y'], shots: [{id: 'S1', loc: 'x', frames: 1}], creatures: [{id: 'a'}]};
  assert.deepEqual(segmentSpec(plain, 'y', {}).creatures, [{id: 'a'}], 'no room tags, no world: unchanged');
});
