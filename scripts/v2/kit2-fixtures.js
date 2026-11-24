// scripts/v2/kit2-fixtures.js — tuft 2B kit fixtures → engine/fixtures/beasts2/*.json (+ picks.json): every shot on camera 'cine'
// (moving: orbit / track / push), grade 'clear', beasts on ones, low heroic angles (cine `angle` default 'low' for beast subjects).
//   heroes-day / heroes-night  NIGHTFANG (idle → roar, orbit), VOLT (run, track), BOULDER (walk, track), BLINK orbiting a kid (push)
//   (more fixtures are appended by later 2B tasks: tuft, titan, powers, demo2)
// Usage: node scripts/v2/kit2-fixtures.js
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as B from '../../engine/beast.js';

const L = n => JSON.parse(readFileSync(`beasts/${n}.json`, 'utf8')), FPS = 24, D = Math.PI / 180, r3 = a => a.map(v => +v.toFixed(3));
export const HEAD = {fps: FPS, format: 6, acting: 6, rig: 'r6', twos: true, faceLife: true, labels: false, world: 'engine/fixtures/v4look/world.js', cues: 'engine/fixtures/acting6/cues.json', post: 'cine', camera: 'cine', grade: 'clear'};
export const sizeOf = n => { const P = L(n), g = B.buildGeometry(P), s = B.sampleBeast(P, [{t: 0, state: 'idle'}], 0, {geo: g}), v = B.worldVerts(s, g); let y1 = 0, z0 = 1e9, z1 = -1e9, x0 = 1e9, x1 = -1e9;
  for (let i = 0; i < v.length; i += 3) { y1 = Math.max(y1, v[i + 1]); z0 = Math.min(z0, v[i + 2]); z1 = Math.max(z1, v[i + 2]); x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); } return {h: y1, l: z1 - z0, w: x1 - x0}; };
const kid = (x, z, yaw = 200, troupe = 'LEAD') => ({style: 'v5', troupe, at: 'street', offset: [x, 0, z], yaw, keys: [[0, 'idle']]});
const out = 'engine/fixtures/beasts2'; mkdirSync(out, {recursive: true});
const save = (f, o) => { writeFileSync(`${out}/${f}`, JSON.stringify(o, null, 1) + '\n'); console.log('wrote', f); };
const picks = [];
// a low camera at angle a (deg, 0 = in front of a beast facing +z) and distance d around c, looking at (c.x, ty, c.z)
const lowCam = (c, a, d, h, ty) => ({position: r3([c[0] + Math.sin(a * D) * d, h, c[2] + Math.cos(a * D) * d]), target: r3([c[0], ty, c[2]])});

function heroes(day) {
  const cast = {}, shots = []; let t = 0; const tag = day ? 'day' : 'night', add = (sh, pick) => { const s0 = Math.round(t * FPS); shots.push(sh); t += sh.frames / FPS; picks.push({set: 'heroes', look: tag, frame: s0 + Math.round(pick * FPS), ...sh.pickInfo}); delete sh.pickInfo; };
  // NIGHTFANG: idle → roar, slow orbit from low
  { const S = sizeOf('NIGHTFANG'), z = -34; cast.nightfang = {style: 'beast', preset: 'NIGHTFANG', tier: 'hero', at: 'street', offset: [0, 0, z], yaw: 0}; cast.kid_nf = kid(S.w * .5 + 1.6, z + S.l * .4 + 1.4);
    add({id: `nightfang-${tag}`, frames: 60, duration: 2.5, size: 'ws', mood: 'awe', move: 'orbit', degrees: 24, subject: 'nightfang', from: {...lowCam([0, 0, z], -40, Math.max(S.h, S.l) * 1.25 + 3, 1.2, S.h * .55)}, to: {position: [0, 1.2, 0], target: [0, S.h * .55, 0]},
      beasts: [{actor: 'nightfang', state: 'roar', at: 1.0}], pickInfo: {beast: 'NIGHTFANG'}}, .7); }
  // VOLT: runs at the camera; the camera tracks ahead of it, low in the road (eye height), looking up at it
  { const S = sizeOf('VOLT'), z = -14; cast.volt = {style: 'beast', preset: 'VOLT', tier: 'hero', at: 'street', offset: [0, 0, z], yaw: 0};
    add({id: `volt-${tag}`, frames: 60, duration: 2.5, size: 'ws', mood: 'tension', move: 'track', follow: 'volt', followOffset: [0, 0, 0], subject: 'volt', angle: 'eye',
      from: {position: r3([-3.2, 1.3, S.l * 2.6 + 3]), target: [0, S.h * .6, 0]}, to: {position: r3([-3.8, 1.3, S.l * 2.2 + 3]), target: [0, S.h * .6, 0]},
      beasts: [{actor: 'volt', state: 'run', at: .2, to: [0, 0, z + 16]}], pickInfo: {beast: 'VOLT'}}, 1.4); }
  // BOULDER: walks a few steps; slow low orbit from the front quarter (looking up at the head and horns)
  { const S = sizeOf('BOULDER'), z = 8; cast.boulder = {style: 'beast', preset: 'BOULDER', tier: 'hero', at: 'street', offset: [0, 0, z], yaw: 0};
    add({id: `boulder-${tag}`, frames: 60, duration: 2.5, size: 'ws', mood: 'awe', move: 'orbit', degrees: -20, subject: 'boulder',
      from: lowCam([0, 0, z + 1.5], -35, Math.max(S.h, S.l) * 2.1 + 5, 1.0, S.h * .6), to: {position: [0, 1.0, 0], target: [0, S.h * .6, 0]},
      beasts: [{actor: 'boulder', state: 'walk', at: .2, to: [0, 0, z + 3]}], pickInfo: {beast: 'BOULDER'}}, 1.6); }
  // BLINK: orbiting LITTLE's head, slow push from kid-eye height
  { cast.little = kid(6.2, 26, 330, 'LITTLE'); cast.blink = {style: 'beast', preset: 'BLINK', at: 'street', offset: [6.2, 0, 26], orbit: 'little'};
    add({id: `blink-${tag}`, frames: 48, duration: 2.0, size: 'ms', mood: 'fun', move: 'push', subject: 'little', angle: 'eye', from: {position: [2.4, 3.4, 33.0], target: [6.2, 3.6, 26]}, to: {position: [3.2, 3.4, 31.2], target: [6.2, 3.6, 26]}, pickInfo: {beast: 'BLINK'}}, 1.2); }
  save(`heroes-${tag}.json`, {note: `tuft 2B fixed hero beasts (scripts/v2/kit2-fixtures.js), ${tag}: low heroic moving cine cameras, grade 'clear', beasts on ones.`, slug: 'beasts', ...HEAD, look4: day ? 'comedy' : 'mystery', look: day ? 'comedy' : 'mystery', cast, shots});
}
if (process.argv[1]?.endsWith("kit2-fixtures.js")) { heroes(true); heroes(false); }
export const EXTRA = [];   // later tasks push fixture builders here
// ---- TUFT + PUFF (Task 2): hook ECU eye, states, hood ride, tuft puff ball → room → colossal → deflate, hero ball → room → deflate ----
EXTRA.push(({save, picks, kid}) => {
  const cast = {}, shots = []; let t = 0, n = 0; const TH = .95;
  const add = (sh, label, pick) => { const s0 = Math.round(t * FPS); shots.push({id: `tuft-${n++}-${label}`, mood: 'fun', ...sh}); t += sh.frames / FPS; if (pick != null) picks.push({set: 'tuft', label, frame: s0 + Math.round(pick * FPS)}); return s0 / FPS; };
  cast.hero = {...kid(4, 24, 180, 'HERO')}; cast.tuft = {style: 'beast', preset: 'TUFT', tier: 'hero', at: 'street', offset: [1.6, 0, 22], yaw: 200, state: 'hide', glowLevel: .45};
  cast.tuft_h = {style: 'beast', preset: 'TUFT', tier: 'hero', at: 'street', offset: [4, 0, 24], yaw: 180, ride: {actor: 'hero', at: 'hood'}};
  cast.tuft_p = {style: 'beast', preset: 'TUFT', tier: 'hero', at: 'street', offset: [0, 0, -12], yaw: 190, glowLevel: .5};
  cast.hero2 = {...kid(0, 8, 20, 'HERO')};
  const T0 = [1.6, 0, 22], yw = 200 * D, eye = [T0[0] + .115 * Math.cos(yw) + .3 * Math.sin(yw), .43, T0[2] - .115 * Math.sin(yw) + .3 * Math.cos(yw)];   // Tuft's left eye (root-local [.115, .43, .3])
  // 0 hook: extreme close on the eye opening, quills blooming (glow 1)
  add({frames: 30, duration: 1.25, size: 'ws', move: 'push', angle: 'high', from: {position: [eye[0] + Math.sin(yw) * 1.25, .5, eye[2] + Math.cos(yw) * 1.25], target: eye, fov: 34}, to: {position: [eye[0] + Math.sin(yw) * 1.0, .48, eye[2] + Math.cos(yw) * 1.0], target: eye, fov: 34},
    beasts: [{actor: 'tuft', state: 'idle', at: .3}], glows: [{actor: 'tuft', level: 1, at: 0}]}, 'hook', 0);
  const near = (a, d, h = .7) => ({position: [T0[0] + Math.sin(a * D) * d, h, T0[2] + Math.cos(a * D) * d], target: [T0[0], .42, T0[2]], fov: 34});
  add({frames: 24, duration: 1, size: 'ws', move: 'orbit', degrees: 12, subject: 'tuft', from: near(200, 3.2), to: {position: [0, .7, 0], target: [T0[0], .42, T0[2]]}, glows: [{actor: 'tuft', level: .45, at: 0}]}, 'idle', .6);
  add({frames: 24, duration: 1, size: 'ws', move: 'push', subject: 'tuft', from: near(215, 3.2), to: near(215, 2.6), beasts: [{actor: 'tuft', state: 'tremble', at: 0}]}, 'tremble', .5);
  add({frames: 30, duration: 1.25, size: 'ws', move: 'push', subject: 'tuft', from: near(175, 3.0), to: near(175, 2.5), beasts: [{actor: 'tuft', state: 'sneeze', at: 0}]}, 'sneeze', .55);
  add({frames: 30, duration: 1.25, size: 'ws', move: 'track', follow: 'tuft', followOffset: [0, 0, 0], subject: 'tuft', from: {position: [-3.4, .8, -1.2], target: [0, .45, 0]}, to: {position: [-3.4, .8, .4], target: [0, .45, 0]}, beasts: [{actor: 'tuft', state: 'run', at: 0, to: [1.6, 0, 26]}]}, 'run', .8);
  add({frames: 30, duration: 1.25, size: 'ws', move: 'orbit', degrees: 15, subject: 'hero', angle: 'eye', from: {position: [6.2, 4.2, 28.2], target: [4, 3.3, 24]}, to: {position: [0, 4.2, 0], target: [4, 3.3, 24]}, beasts: [{actor: 'tuft_h', state: 'hide', at: 0}]}, 'hood', .7);
  // tuft puffs in the open street
  const P0 = [0, 0, -12], far = (d, h, ty) => ({position: [P0[0] - d * .2, h, P0[2] - d * .98], target: [P0[0], ty, P0[2]], fov: d > 40 ? 72 : 46});
  add({frames: 36, duration: 1.5, size: 'ws', move: 'push', subject: 'tuft_p', from: far(9, 1.0, 2.0), to: far(8.2, 1.0, 2.0), puffs: [{actor: 'tuft_p', size: 'ball', at: .1}], beasts: [{actor: 'tuft_p', state: 'puff', at: .1}]}, 'puff ball', 1.3);
  add({frames: 36, duration: 1.5, size: 'ws', move: 'push', subject: 'tuft_p', from: far(20, 1.2, 4.5), to: far(18.5, 1.2, 4.5), puffs: [{actor: 'tuft_p', size: 'room', at: .1}]}, 'puff room', 1.3);
  add({frames: 48, duration: 2.0, size: 'ws', move: 'orbit', degrees: -14, subject: 'tuft_p', angle: 'eye', from: far(46, 2.5, 30), to: {position: [0, 3.5, 0], target: [P0[0], 28, P0[2]]}, puffs: [{actor: 'tuft_p', size: 'colossal', at: .1}], glows: [{actor: 'tuft_p', level: 1, at: .3}]}, 'puff colossal', 1.9);
  add({frames: 30, duration: 1.25, size: 'ws', move: 'push', subject: 'tuft_p', from: far(16, 1.2, 3), to: far(14, 1.2, 3), puffs: [{actor: 'tuft_p', size: 'deflate', at: .05}], glows: [{actor: 'tuft_p', level: .5, at: .05}]}, 'deflate', 1.0);
  // hero puffs (R6 ball proxy)
  const H0 = [0, 0, 8], hf = (d, h, ty, a = 20) => ({position: [H0[0] + Math.sin(a * D) * d, h, H0[2] + Math.cos(a * D) * d], target: [H0[0], ty, H0[2]], fov: 44});
  add({frames: 36, duration: 1.5, size: 'ws', move: 'push', subject: 'hero2', angle: 'eye', from: hf(13, 3.4, 3.4), to: hf(12, 3.4, 3.4), puffs: [{actor: 'hero2', size: 'ball', at: .1}]}, 'hero ball', 1.3);
  add({frames: 36, duration: 1.5, size: 'ws', move: 'push', subject: 'hero2', angle: 'eye', from: hf(22, 3.4, 5.5), to: hf(20.5, 3.4, 5.5), puffs: [{actor: 'hero2', size: 'room', at: .1}]}, 'hero room', 1.3);
  add({frames: 30, duration: 1.25, size: 'ws', move: 'push', subject: 'hero2', angle: 'eye', from: hf(16, 3.4, 4.5), to: hf(15, 3.4, 4.5), puffs: [{actor: 'hero2', size: 'deflate', at: .05}]}, 'hero deflate', .9);
  save('tuft.json', {note: 'tuft 2B TUFT + PUFF fixture (scripts/v2/kit2-fixtures.js): day street, hook ECU on the glowing eye, states, hood ride, tuft ball/room/colossal/deflate, hero ball/room/deflate.', slug: 'beasts', ...HEAD, look4: 'comedy', look: 'comedy', cast, shots, sfxCues: [[+(t - 1.25 + .05).toFixed(3), 'squeak']]});
});
// ---- TITAN (Task 3): caged, roar, break (chains snap), stomp (footfall shake), flinch, flee from colossal Tuft; titanCave eyes ignite ----
EXTRA.push(({save, picks, kid}) => {
  const cast = {}, shots = []; let t = 0, n = 0, Z = -24;
  const add = (sh, label, pick) => { const s0 = Math.round(t * FPS); shots.push({id: `titan-${n++}-${label}`, mood: 'awe', size: 'ws', subject: 'titan', ...sh}); t += sh.frames / FPS; if (pick != null) picks.push({set: 'titan', label, frame: s0 + Math.round(pick * FPS)}); return s0 / FPS; };
  cast.titan = {style: 'beast', preset: 'TITAN', tier: 'hero', at: 'street', offset: [0, 0, Z], yaw: 0, state: 'caged'};
  cast.kid = kid(4, 30, 180, 'HERO'); cast.tuftc = {style: 'beast', preset: 'TUFT', tier: 'hero', at: 'street', offset: [0, 0, 40], yaw: 180, glowLevel: .6};
  const cam = (a, d, h, ty, fov = 62) => ({position: [Math.sin(a * D) * d, h, Z + Math.cos(a * D) * d], target: [0, ty, Z], fov});
  add({frames: 36, duration: 1.5, move: 'orbit', degrees: 10, from: cam(15, 58, 1.6, 22), to: {position: [0, 1.6, 0], target: [0, 22, Z]}}, 'caged', 1.0);
  add({frames: 36, duration: 1.5, move: 'push', from: cam(-25, 56, 1.4, 26), to: cam(-25, 50, 1.4, 26), beasts: [{actor: 'titan', state: 'roar', at: .1}]}, 'roar', 1.0);
  add({frames: 36, duration: 1.5, move: 'push', from: cam(30, 52, 1.2, 14), to: cam(30, 47, 1.2, 14), beasts: [{actor: 'titan', state: 'break', at: .1}]}, 'chains snap', .1 + .62);
  add({frames: 60, duration: 2.5, move: 'track', follow: 'titan', followOffset: [0, 0, 0], shake: 'titan', from: {position: [-30, 1.4, 46], target: [0, 24, 0], fov: 64}, to: {position: [-28, 1.4, 40], target: [0, 24, 0], fov: 64},
    beasts: [{actor: 'titan', state: 'stomp', at: .1, to: [0, 0, Z + 14]}]}, 'stomp', 1.5);
  add({frames: 30, duration: 1.25, move: 'push', from: cam(-10, 58, 1.4, 22), to: cam(-10, 54, 1.4, 22), beasts: [{actor: 'titan', state: 'flinch', at: .05}]}, 'flinch', .6);
  add({frames: 60, duration: 2.5, move: 'push', subject: 'tuftc', angle: 'eye', from: {position: [-26, 3, 62], target: [0, 28, 0], fov: 72}, to: {position: [-24, 3, 58], target: [0, 28, -4], fov: 72},
    puffs: [{actor: 'tuftc', size: 'colossal', at: 0}], glows: [{actor: 'tuftc', level: 1, at: 0}], beasts: [{actor: 'titan', state: 'flee', at: .9}]}, 'flee', 1.9);
  save('titan.json', {note: 'tuft 2B TITAN fixture (scripts/v2/kit2-fixtures.js): night street, caged / roar / chains snap / stomp (shake) / flinch / flee from colossal Tuft.', slug: 'beasts', ...HEAD, look4: 'mystery', look: 'mystery', cast, shots});
  // titanCave insert: darkness, two molten eyes fade up (state ignite)
  const cc = {titan: {style: 'beast', preset: 'TITAN', tier: 'hero', at: 'street', offset: [-40, 0, -50], yaw: 60, state: 'ignite'}};
  save('titancave.json', {note: 'tuft 2B titanCave insert: two molten eyes fade up in darkness (TITAN state ignite).', slug: 'beasts', ...HEAD, look4: 'mystery', look: 'mystery', cast: cc,
    shots: [{id: 'titanCave', frames: 48, duration: 2, size: 'ws', mood: 'tension', move: 'push', angle: 'high', from: {position: [10.5, 27.6, -20.8], target: [-15.6, 28.6, -35.85], fov: 26}, to: {position: [6.3, 27.8, -23.2], target: [-15.6, 28.6, -35.85], fov: 38}}]});
  picks.push({set: 'titancave', label: 'eyes ignite', frame: 40});
});
if (process.argv[1]?.endsWith("kit2-fixtures.js")) for (const f of EXTRA) f({save, picks, sizeOf, kid, lowCam, HEAD, FPS});
if (process.argv[1]?.endsWith("kit2-fixtures.js")) save("picks.json", picks);
