// stories/testpark/make_spec.js — E1 review specs for the testPark world (parts/sets6/testpark.js):
//   episode.json  7 still shots (6 owner stills + the cast lineup), 6 frames each; render every 6th frame at 1080×1920.
//   paths.json    3 camera paths through the park (drone over the plaza, crane up the tower, track past ring + coaster) for v2:stability.
//   bench.json    120 DUMMY actors on the plaza, one wide shot, for the 270×480 s/frame gate.
// Seeded (mulberry32) so the same specs come out every run: node stories/testpark/make_spec.js
import {writeFileSync} from 'node:fs';
import {COASTER_LOOP} from '../../parts/props.js';

const rng = s => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const POSES = ['idle', 'idle', 'idle', 'idle', 'idle', 'lookUp', 'cheer', 'wave', 'recoil', 'fall', 'trip', 'sit', 'look_react'];
const base = {fps: 30, format: 6, body: 'v6', faceStyle: 'v6', labels: false, world: 'parts/sets6/testpark.js', look: 'day'};
const actor = (troupe, at, offset, yaw, pose = 'idle', extra = {}) => ({style: 'v5', troupe, at, offset, yaw, keys: [[0, pose]], ...extra});
function dummies(n, seed, area = {x0: -14, x1: 14, z0: 0, z1: 26}, avoid = () => false) {   // plaza anchor at (0, 0.15, 8): offsets are relative to it
  const R = rng(seed), out = {}, pts = [];
  for (let i = 0; out && pts.length < n && i < n * 60; i++) { const x = area.x0 + R() * (area.x1 - area.x0), z = area.z0 + R() * (area.z1 - area.z0);
    if (avoid(x, z) || pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.3)) continue; pts.push([x, z]); }
  pts.forEach(([x, z], i) => { out['d' + String(i + 1).padStart(3, '0')] = actor('DUMMY', 'plaza', [+x.toFixed(2), 0, +z.toFixed(2)], Math.round(R() * 360 - 180), POSES[Math.floor(R() * POSES.length)], {costume: 'CROWD'}); });
  return out;
}
const shot = (id, from, extra = {}) => ({id, size: 'wide', frames: 6, move: 'static-drift', drift: 0, from, shadowRadius: 60, ...extra});
const S = 6 / 30;   // seconds per still shot

// ---- episode.json: stills -------------------------------------------------------------------------------------------
const cast = {...dummies(34, 11, {x0: -14, x1: 14, z0: 0, z1: 30}, (x, z) => x < 2 && z < 16),
  // fan: five dummies blown off their feet in front of the fan (fan anchor (−8, 18) = plaza offset (−8, 10))
  ...Object.fromEntries([[-7, 7], [-5.5, 10.5], [-3.5, 8.5], [-2, 12], [-6, 13]].map(([x, z], i) => ['fan' + i, actor('DUMMY', 'plaza', [x, 0, z], 90 + i * 25, i % 2 ? 'fall' : 'recoil')])),
  ring0: actor('DUMMY', 'ring', [-4.6, 0, 1], 90, 'cheer'), ring1: actor('DUMMY', 'ring', [4.6, 0, 1.6], -90, 'recoil'),
  top0: actor('DUMMY', 'towerTop', [-1, 40, 1], 200, 'lookUp'),
  hero: actor('HERO', 'plaza', [24, 0, -14.1], -90, 'idle', {faces: [[0, 'hero_wink']]}),
  bitsy: actor('LITTLE', 'plaza', [24, 0, -11.8], -90, 'idle', {costume: 'BITSY', faceStyle: 'v6'}),
  kid: actor('SECOND', 'plaza', [24, 0, -9.5], -90, 'idle', {costume: 'KID', faceStyle: 'v6'}),
  dummy: actor('DUMMY', 'plaza', [24, 0, -7.2], -90, 'idle')};
const stills = [
  shot('S1_drone', {position: [0, 52, 84], target: [0, 0, 6], fov: 50}, {subject: 'd001'}),
  shot('S2_fan', {position: [3, 7, -1], target: [-13, 9.5, 18], fov: 56}, {subject: 'fan1'}),
  shot('S3_tower', {position: [1, 2, 1], target: [-30, 21, -22], fov: 66}, {subject: 'top0'}),
  shot('S4_loop', {position: [34, 6, -28], target: [12, 8.5, -44], fov: 50}),
  shot('S5_ring_sign', {position: [16, 5.4, 6], target: [16, 5.2, -26], fov: 44}, {subject: 'ring0'}),
  shot('S6_hand', {position: [0, 9, 56], target: [0, 13, 8], fov: 56}, {subject: 'd001'}),
  shot('S7_lineup', {position: [-2, 3, -2.6], target: [24, 2.5, -2.6], fov: 36}, {subject: 'hero', shadowRadius: 16}),
];
const t = k => +(k * S).toFixed(4), loopTop = +((COASTER_LOOP.u0 + COASTER_LOOP.u1) / 2).toFixed(4);
const worldState = {cart: [[0, .08], [t(3), loopTop], [t(4), .12]], padFlash: [[0, .6], [t(1), 0]], handOn: [[0, 0], [t(5), 1], [t(6), 0]], hand: [[0, 'open'], [t(5), 'pinch']], handGrip: [[0, 0], [t(5), .85]], handY: [[0, 21]], handZ: [[0, 22]], handYaw: [[0, 55]]};
writeFileSync('stories/testpark/episode.json', JSON.stringify({slug: 'testpark', ...base, note: 'E1 review stills (written by make_spec.js). S1–S6 owner stills, S7 cast lineup (HERO, Bitsy, kid, DUMMY).', cast, worldState, shots: stills}, null, 1) + '\n');

// ---- paths.json: 3 camera paths for v2:stability ----------------------------------------------------------------
const paths = [
  {id: 'P1_drone', size: 'wide', frames: 60, move: 'drone', path: [[0, 46, 84], [14, 34, 44], [6, 24, 18]], targets: [[0, 0, 6], [0, 2, -10]], from: {position: [0, 46, 84], target: [0, 0, 6], fov: 50}, to: {position: [6, 24, 18], target: [0, 2, -10], fov: 50}, shadowRadius: 60},
  {id: 'P2_tower', size: 'wide', frames: 60, move: 'crane', from: {position: [-4, 2.2, -4], target: [-30, 6, -22], fov: 60}, to: {position: [-8, 30, -6], target: [-30, 38, -22], fov: 60}, shadowRadius: 50},
  {id: 'P3_ring', size: 'wide', frames: 60, move: 'crane', from: {position: [32, 5, 4], target: [16, 4.5, -26], fov: 46}, to: {position: [2, 7, 2], target: [12, 7, -40], fov: 46}, shadowRadius: 50},
];
writeFileSync('stories/testpark/paths.json', JSON.stringify({slug: 'testpark', ...base, note: 'E1 stability: three camera paths through testPark.', cast: dummies(40, 11), worldState: {padFlash: [[0, .5]]}, shots: paths}, null, 1) + '\n');

// ---- bench.json: 120 DUMMY actors ---------------------------------------------------------------------------------
writeFileSync('stories/testpark/bench.json', JSON.stringify({slug: 'testpark', ...base, note: 'E1 gate: 120 DUMMY actors render at ≤ 0.25 s/frame at 270×480.', cast: dummies(120, 7, {x0: -26, x1: 26, z0: -14, z1: 30}),
  shots: [{id: 'B1_crowd', size: 'wide', frames: 24, move: 'static-drift', from: {position: [0, 30, 70], target: [0, 0, 8], fov: 50}, shadowRadius: 60}]}, null, 1) + '\n');
console.log('episode', Object.keys(cast).length, 'actors; paths', paths.length, '; bench', Object.keys(JSON.parse(JSON.stringify(dummies(120, 7, {x0: -26, x1: 26, z0: -14, z1: 30})))).length);
