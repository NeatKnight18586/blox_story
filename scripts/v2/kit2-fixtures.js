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
if (process.argv[1]?.endsWith("kit2-fixtures.js")) for (const f of EXTRA) f({save, picks, sizeOf, kid, lowCam, HEAD, FPS});
if (process.argv[1]?.endsWith("kit2-fixtures.js")) save("picks.json", picks);
