// scripts/v2/beast-fixtures.js — tuft 2A BEAST KIT fixtures → engine/fixtures/beasts/{kit,parade,demo,flee}.json (+ kit-picks.json).
// Cameras are aimed with the pure kit (engine/beast.js sampleBeast): each frame looks at where the beast really is.
//   kit     night street (look4 mystery, post 'cine', R6 kids on twos): NIGHTFANG, VOLT, CINDER, BOULDER, each beside a kid;
//           per beast a 3-view turnaround (front ¾, side, back ¾) then a state strip (idle, run | fly, roar, flinch, flee).
//   parade  dawn street: 40 low-tier beasts (FOX / DEER / BOAR) walking the street + the 4 heroes at the kerbs + BLINK orbiting LITTLE.
//   demo    ~8 s night: each hero beast doing 2 states (then the parade spec's wide plays after it in the demo).
//   flee    one static camera per hero beast; flee `exit: 'right'` (gate: leaves the frame within its state duration).
// Usage: node scripts/v2/beast-fixtures.js
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as B from '../../engine/beast.js';

const P = Object.fromEntries(['NIGHTFANG', 'VOLT', 'CINDER', 'BOULDER', 'FOX', 'DEER', 'BOAR', 'BLINK'].map(n => [n, JSON.parse(readFileSync(`beasts/${n}.json`, 'utf8'))]));
const FPS = 24, D = Math.PI / 180, r2 = v => +v.toFixed(3), r3 = a => a.map(r2);
const HEAD = {fps: FPS, format: 6, acting: 6, rig: 'r6', twos: true, faceLife: true, labels: false, world: 'engine/fixtures/v4look/world.js', cues: 'engine/fixtures/acting6/cues.json', post: 'cine'};
const HEROES = [['nightfang', 'NIGHTFANG', -36, 'fly'], ['volt', 'VOLT', -10, 'run'], ['cinder', 'CINDER', 8, 'fly'], ['boulder', 'BOULDER', 26, 'run']];
// beast size (for camera distance): height + length at rest
const sizeOf = n => { const g = B.buildGeometry(P[n]), s = B.sampleBeast(P[n], [{t: 0, state: 'idle'}], 0, {geo: g}), v = B.worldVerts(s, g); let y1 = 0, z0 = 1e9, z1 = -1e9, x0 = 1e9, x1 = -1e9;
  for (let i = 0; i < v.length; i += 3) { y1 = Math.max(y1, v[i + 1]); z0 = Math.min(z0, v[i + 2]); z1 = Math.max(z1, v[i + 2]); x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); } return {h: y1, l: z1 - z0, w: x1 - x0}; };
// world centre of a beast's mesh at t (for aiming)
function centreAt(name, track, start, t) { const g = B.buildGeometry(P[name]), s = B.sampleBeast(P[name], track, t, {geo: g, start}), v = B.worldVerts(s, g); const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[i + k]); hi[k] = Math.max(hi[k], v[i + k]); } return {c: lo.map((x, k) => (x + hi[k]) / 2), ext: hi.map((x, k) => x - lo[k]), root: s.root}; }
// camera at angle a (deg, 0 = in front of a beast facing +z), distance d, height h, looking at c
const camAt = (c, a, d, h, fov) => ({position: r3([c[0] + Math.sin(a * D) * d, c[1] + h, c[2] + Math.cos(a * D) * d]), target: r3(c), fov});
const kid = (z, x) => ({style: 'v5', troupe: 'LEAD', at: 'street', offset: [x, 0, z], yaw: 200, keys: [[0, 'idle']]});
mkdirSync('engine/fixtures/beasts', {recursive: true});
const save = (f, o) => { writeFileSync(`engine/fixtures/beasts/${f}`, JSON.stringify(o, null, 1) + '\n'); console.log('wrote', f); };

// ---- kit ----------------------------------------------------------------------------------------------------------------------
{ const cast = {}, shots = [], picks = []; let t = 0;
  const shot = (id, dur, size, from, extra = {}) => { const frames = Math.round(dur * FPS); shots.push({id, frames, size, mood: 'awe', move: 'static-drift', from, ...extra}); const s0 = Math.round(t * FPS); t += frames / FPS; return s0; };
  for (const [name, preset, z0, move] of HEROES) {
    const S = sizeOf(preset), W = Math.max(S.w, S.l * .55); cast[name] = {style: 'beast', preset, tier: 'hero', at: 'street', offset: [0, 0, z0], yaw: 0};
    cast['kid_' + name] = kid(z0 + S.l * .42 + 1.2, S.w * .5 + 1.3);
    const start = {p: [0, z0], yaw: 0}, T0 = t, keys = [{t: 0, state: preset === 'CINDER' ? 'perch' : 'idle'}];
    const dTurn = Math.max(S.h, S.l * .75) * 1.65 + 4;
    for (const [view, a] of [['front 3/4', -38], ['side', -90], ['back 3/4', -145]]) { const c = [0, S.h * .45, z0]; const s0 = shot(`${name}-${view}`, .5, 'ws', camAt(c, a, dTurn, S.h * .28, 38), {subject: name}); picks.push({row: 1, beast: preset, label: view, frame: s0 + 6}); }
    const ts = t; const sIdle = shot(`${name}-idle`, .6, 'ms', null, {subject: name});
    const tMove = t, to = move === 'fly' ? [0, z0 + 10] : [0, z0 + 8]; keys.push({t: tMove, state: move, to});
    const sMove = shot(`${name}-${move}`, 1.2, 'ms', null, {subject: name, beasts: [{actor: name, state: move, at: 0, to: [0, 0, to[1]]}]});
    const tRoar = t; keys.push({t: tRoar, state: 'roar'}); const sRoar = shot(`${name}-roar`, 1.3, 'ms', null, {subject: name, beasts: [{actor: name, state: 'roar', at: 0}]});
    const tFl = t; keys.push({t: tFl, state: 'flinch'}); const sFl = shot(`${name}-flinch`, .9, 'ms', null, {subject: name, beasts: [{actor: name, state: 'flinch', at: 0}]});
    const tFe = t; keys.push({t: tFe, state: 'flee'}); const sFe = shot(`${name}-flee`, 1.4, 'ms', null, {subject: name, exit: 'right', beasts: [{actor: name, state: 'flee', at: 0}]});
    // aim the strip cameras at the beast (one camera per state shot; the flee camera holds on where the beast starts)
    const trk = keys.map(k => ({...k})), dS = Math.max(S.h, S.l * .7) * 1.35 + 3.5;
    const strip = [[sIdle, ts + .5, 'idle'], [sMove, tMove + .8, move], [sRoar, tRoar + 1.0, 'roar'], [sFl, tFl + .45, 'flinch'], [sFe, tFe + .75, 'flee']];
    for (const [s0, ta, lab] of strip) { const i = shots.findIndex((x, k) => shots.slice(0, k).reduce((a, y) => a + y.frames, 0) === s0);
      const at = lab === 'flee' ? centreAt(preset, trk, start, tFe) : centreAt(preset, trk, start, ta), c = [at.c[0], Math.max(at.c[1], S.h * .4), at.c[2]];
      shots[i].from = camAt(c, -55, dS * (lab === 'flee' ? 1.25 : 1) * (move === 'fly' && lab === 'run' ? 1.2 : 1), S.h * .2, 40);
      picks.push({row: 2, beast: preset, label: lab === 'run' || lab === 'fly' ? lab : lab, frame: Math.round(ta * FPS)}); }
    // the flee shot's exit 'right' is screen-right of that camera (episode resolves it); the turnaround / idle stay on idle
    void T0; }
  save('kit.json', {note: 'tuft 2A BEAST KIT look-dev fixture (scripts/v2/beast-fixtures.js): night street, post cine, the 4 hero beasts beside R6 kids; per beast a 3-view turnaround then a state strip.', slug: 'beasts', ...HEAD, look4: 'mystery', look: 'mystery', cast, shots});
  save('kit-picks.json', picks); }

// ---- parade (dawn) + BLINK ------------------------------------------------------------------------------------------------------
{ const cast = {little: {style: 'v5', troupe: 'LITTLE', at: 'street', offset: [6.2, 0, 10], yaw: 250, keys: [[0, 'idle']]}, blink: {style: 'beast', preset: 'BLINK', at: 'street', offset: [6.2, 0, 10], orbit: 'little'}};
  for (const [name, preset, , ] of HEROES) cast[name] = {style: 'beast', preset, tier: 'hero', at: 'street', offset: {nightfang: [-9.5, 0, -22], volt: [7.6, 0, -2], cinder: [-7.6, 0, 4], boulder: [8.2, 0, -14]}[name], yaw: {nightfang: 150, volt: 250, cinder: 110, boulder: 270}[name], state: name === 'cinder' ? 'perch' : 'idle'};
  const shots = [{id: 'parade-wide', frames: 72, size: 'ews', mood: 'awe', move: 'static-drift', from: {position: [7, 9, 34], target: [-1, 1.5, -6], fov: 46}},
    {id: 'blink-mcu', frames: 48, size: 'mcu', mood: 'fun', move: 'static-drift', subject: 'little', from: {position: [3.4, 3.4, 15.5], target: [6.2, 2.6, 10], fov: 34}}];
  save('parade.json', {note: 'tuft 2A BEAST KIT parade fixture (scripts/v2/beast-fixtures.js): dawn street, 40 low-tier beasts (FOX / DEER / BOAR, instanced) walking the street, the 4 hero beasts at the kerbs, BLINK orbiting LITTLE.', slug: 'beasts', ...HEAD, look4: 'dawn', look: 'dawn',
    beastCrowds: [{presets: ['FOX', 'DEER', 'BOAR'], n: 40, at: [0, -6], dir: [0, 1], length: 70, width: 6.5, state: 'walk', seed: 11}], cast, shots}); }

// ---- demo (night): each hero 2 states ----------------------------------------------------------------------------------------------
{ const cast = {}, shots = []; let t = 0;
  const plan = {nightfang: ['roar', 'breathe'], volt: ['run', 'flinch'], cinder: ['fly', 'perch'], boulder: ['walk', 'roar']};
  for (const [name, preset, z0] of HEROES) { const S = sizeOf(preset); cast[name] = {style: 'beast', preset, tier: 'hero', at: 'street', offset: [0, 0, z0], yaw: 0, state: preset === 'CINDER' ? 'perch' : 'idle'}; cast['kid_' + name] = kid(z0 + S.l * .42 + 1.2, S.w * .5 + 1.3);
    const [a, b] = plan[name], d = Math.max(S.h, S.l * .7) * 1.5 + 4, to1 = a === 'fly' ? [0, 0, z0 + 7] : a === 'run' || a === 'walk' ? [0, 0, z0 + (a === 'run' ? 8 : 3)] : null;
    const c = [0, S.h * .45, z0 + (to1 ? (to1[2] - z0) * .5 : 0)];
    shots.push({id: `${name}-${a}-${b}`, frames: 48, size: 'ms', mood: 'awe', move: 'static-drift', subject: name, from: camAt(c, -60, d * (a === 'fly' ? 1.3 : 1), S.h * .25, 42),
      beasts: [{actor: name, state: a, at: .1, ...(to1 ? {to: to1} : {})}, {actor: name, state: b === 'perch' ? 'perch' : b, at: 1.05, ...(b === 'perch' ? {to: [0, 0, z0 + 7]} : {})}]}); t += 2; }
  save('demo.json', {note: 'tuft 2A BEAST KIT demo (scripts/v2/beast-fixtures.js): night street, each hero beast doing 2 states (2 s each); review/beasts/demo.mp4 appends the parade wide.', slug: 'beasts', ...HEAD, look4: 'mystery', look: 'mystery', cast, shots}); }

// ---- flee gate: one static camera per hero; flee at 0.5 s, `exit: 'right'` ---------------------------------------------------------
{ const cast = {}, shots = [];
  HEROES.forEach(([name, preset, z0]) => { const S = sizeOf(preset); cast[name] = {style: 'beast', preset, tier: 'hero', at: 'street', offset: [0, 0, z0], yaw: 0};
    shots.push({id: `${name}-flee`, frames: Math.round((.5 + B.FLEE_DUR) * FPS), size: 'ws', mood: 'tension', move: 'static-drift', subject: name, exit: 'right',
      from: camAt([0, S.h * .45, z0], -30, Math.max(S.h, S.l * .7) * 1.6 + 4, S.h * .2, 42), beasts: [{actor: name, state: 'flee', at: .5}]}); });
  save('flee.json', {note: 'tuft 2A BEAST KIT flee gate fixture: per hero a static camera, flee at 0.5 s exiting screen-right (FLEE_DUR s to leave the frame).', slug: 'beasts', ...HEAD, look4: 'mystery', look: 'mystery', cast, shots}); }
