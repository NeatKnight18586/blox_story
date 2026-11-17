// Format v5 (Phase 3a): camera grammar, motion grammar, plan rules, snappy poses — pure logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../../engine/camera.js';
import * as MO from '../../engine/motion5.js';
import * as P5 from '../../engine/plancheck5.js';
import * as PO from '../../engine/poses.js';
const F = {position: [0, 4, 30], target: [0, 3.6, 4], fov: 50};
const ang = (p, t) => Math.atan2(t[1] - p[1], Math.hypot(t[0] - p[0], t[2] - p[2])) * 180 / Math.PI;
test('camera v5: crashZoom snaps the fov in 5 frames (with overshoot), locked off with a 4 % dolly', () => {
  const s = {move: 'crashZoom', duration: 1.5, fps: 24, zoomAt: .4, from: F, to: {fov: 14}};
  assert.ok(Math.abs(C.sampleCamera(s, .3).fov - 50) < 1e-9);
  const f = k => C.sampleCamera(s, .4 + k / 24).fov;
  assert.ok(f(3) < 20, `fov at +3 frames ${f(3)}`); assert.ok(Math.min(f(3), f(4)) < 14, 'overshoots past the target'); assert.ok(Math.abs(f(5) - 14) < 1e-9);
  assert.deepEqual(C.sampleCamera(s, 1.4).target, F.target);
});
test('camera v5: topDown looks (almost) straight down and turns; lowAuthority stays low and looks up', () => {
  const t = C.sampleCamera({move: 'topDown', duration: 2, from: {position: [0, 18, 0], target: [0, 0, 3], fov: 40}, degrees: 30}, 1);
  assert.ok(ang(t.position, t.target) < -85, `${ang(t.position, t.target)}`); assert.ok(Math.abs(t.position[1] - 18) < 1e-9);
  const a = C.sampleCamera({move: 'topDown', duration: 2, from: {position: [0, 18, 0], target: [0, 0, 3]}}, 0), b = C.sampleCamera({move: 'topDown', duration: 2, from: {position: [0, 18, 0], target: [0, 0, 3]}}, 2);
  assert.notDeepEqual(a.position, b.position, 'turns over the shot');
  const l = C.sampleCamera({move: 'lowAuthority', duration: 2, from: {position: [1.5, 2.5, 9.5], target: [0, 2, 4], fov: 55}}, 1);
  assert.ok(l.position[1] <= .8 + 1e-9); assert.ok(ang(l.position, l.target) >= 8 - 1e-6); assert.ok(l.fov <= 40 && l.fov >= 28);
});
test('camera v5: splitScreen returns two cameras; aisleTrack moves at constant speed looking down the aisle', () => {
  const s = C.sampleCamera({move: 'splitScreen', duration: 2.5, a: {from: {position: [-1, 4, 9], target: [-2, 4, 3]}}, b: {from: {position: [3, 4, 9], target: [2, 4, 3]}}}, 1);
  assert.equal(s.split.length, 2); assert.deepEqual(s.split[0].target, [-2, 4, 3]);
  const sh = {move: 'aisleTrack', duration: 2, from: {position: [0, 3, 28], target: [0, 3, 0], fov: 45}, to: {position: [0, 3, 12]}};
  const p = [0, .5, 1, 1.5, 2].map(x => C.sampleCamera(sh, x).position[2]), d = p.slice(1).map((v, i) => v - p[i]);
  assert.ok(d.every(v => Math.abs(v - d[0]) < 1e-9), 'constant speed'); const c = C.sampleCamera(sh, 1); assert.ok(c.target[2] < c.position[2] && Math.abs(c.target[1] - c.position[1]) < 1e-9);
  assert.ok(C.MOVES.includes('crashZoom') && C.MOVES5.length === 5);
});
test('motion v5: freeze holds every frame, impact holds 2 then shakes and decays, step 2 is on twos (anim only)', () => {
  const sh = {start: 100, frames: 48, freeze: [.5, 6]};
  for (let k = 0; k < 6; k++) assert.deepEqual([MO.motionFrame(112 + k, sh).anim, MO.motionFrame(112 + k, sh).cam], [112, 112]);
  assert.equal(MO.motionFrame(118, sh).anim, 118, 'real time after the freeze');
  const im = {start: 0, frames: 48, impact: 1};
  assert.equal(MO.motionFrame(25, im).anim, 24); assert.deepEqual(MO.motionFrame(25, im).shake, [0, 0, 0]);
  const amp = k => Math.hypot(...MO.motionFrame(26 + k, im).shake); assert.ok(amp(0) === 0 || amp(1) > 0); assert.ok(amp(1) > amp(7)); assert.deepEqual(MO.motionFrame(26 + MO.IMPACT.frames, im).shake, [0, 0, 0]);
  const st = {start: 10, frames: 20, step: 2}; assert.deepEqual([11, 12, 13].map(n => MO.motionFrame(n, st).anim), [10, 12, 12]); assert.equal(MO.motionFrame(13, st).cam, 13);
  assert.deepEqual(MO.motionFrame(5, {start: 0, frames: 10}), {anim: 5, cam: 5, shake: [0, 0, 0]}, 'plain shots unchanged');
  assert.deepEqual(MO.cascadeOn(.25, 4, {at: 0, step: .1}), [true, true, true, false]); assert.deepEqual(MO.cascadeOn(.25, 2, {at: 0, step: .1, on: false}), [false, false]);
});
test('plan v5: length, average, holds, first second, inserts, wall clock on time words', () => {
  const sh = (id, s, f, o = {}) => ({id, start: s, frames: f, move: 'push', size: 'medium', ...o});
  const ok = Array.from({length: 48}, (_, i) => sh('S' + i, i * 40, 40, i === 0 ? {reveal: true} : {}));   // 48 × 40 / 24 = 80 s, avg 1.67
  assert.deepEqual(P5.plan5(ok, {fps: 24}).errors, []);
  assert.ok(P5.plan5(ok.slice(0, 40), {fps: 24}).errors.some(e => e.startsWith('length')));
  assert.ok(P5.plan5([...ok.slice(0, 47), sh('L', 47 * 40, 96)], {fps: 24}).errors.some(e => e.includes('moving shot')));
  assert.ok(P5.plan5(ok.map((s, i) => i === 3 ? {...s, move: 'static-drift', frames: 70} : s), {fps: 24}).errors.some(e => e.includes('static framing')));
  assert.ok(P5.plan5(ok.map((s, i) => i === 0 ? {...s, reveal: false} : s), {fps: 24}).errors.some(e => e.includes('no reveal')));
  const ins = ok.map((s, i) => i === 5 ? {...s, size: 'insert', prop: 'egg'} : s);
  assert.ok(P5.plan5(ins, {fps: 24, insertH: {S5: .3}}).errors.some(e => e.includes('frame height'))); assert.deepEqual(P5.plan5(ins, {fps: 24, insertH: {S5: .45}}).errors, []);
  const cues = {words: [{word: 'at', start: 10}, {word: 'seven', start: 10.2}, {word: "o'clock", start: 10.5}]};
  assert.ok(P5.plan5(ok, {fps: 24, cues}).errors.some(e => e.includes('wall clock')));
  assert.deepEqual(P5.plan5(ok.map(s => s.start <= 10.2 * 24 && s.start + s.frames > 10.2 * 24 ? {...s, clock: true} : s), {fps: 24, cues}).errors, []);
});
test('poses v5: 11 snappy poses, snap keys land in 2 frames, older keys still blend over FADE', () => {
  assert.equal(PO.SNAPPY.length, 11); for (const n of PO.SNAPPY) assert.ok(PO.POSE_NAMES.includes(n));
  const k = [[0, 'idle'], [1, 'shrug', {snap: true, fps: 24}]], end = PO.samplePose('shrug', 0).pivots.rightShoulder;
  assert.notDeepEqual(PO.sampleTimeline(k, 1 + 1 / 24).pivots.rightShoulder, end); assert.deepEqual(PO.sampleTimeline(k, 1 + 2 / 24).pivots.rightShoulder, end);
  const k2 = [[0, 'idle'], [1, 'shrug']]; assert.notDeepEqual(PO.sampleTimeline(k2, 1 + 2 / 24).pivots.rightShoulder, end, 'no snap: 0.18 s blend as before');
});
import * as PC from '../../engine/plancheck.js';
test('plan v5: length rule 75–90 s for format 5, older formats keep a 100–168 s voice and the 122.5 s end', () => {
  assert.deepEqual(PC.lengthRule(5).voice, [75, 90]); assert.deepEqual(PC.lengthRule(undefined).voice, [100, 168]);
  const cues = {duration: 80.9, lines: [{words: [{w: 'a', start: 0, end: .5}, {w: 'b', start: 40, end: 80.9}]}]};
  const shots = [{id: 'a', start: 0, frames: 960, size: 'wide', see: ['x'], why: 'y', move: 'push'}, {id: 'b', start: 960, frames: 1018, size: 'wide', see: ['x'], why: 'y', move: 'push'}];
  assert.deepEqual(PC.checkPlan({shots, cues, fps: 24, format: 5}).errors, []);
  assert.ok(PC.checkPlan({shots, cues, fps: 24}).errors.some(e => /122\.5/.test(e)));
  const long = [{...shots[0]}, {...shots[1], frames: 1300}];
  assert.ok(PC.checkPlan({shots: long, cues, fps: 24, format: 5}).errors.some(e => /format v5/.test(e)));
});
