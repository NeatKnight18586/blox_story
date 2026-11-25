// tests/templates.js — tuft 4C camera templates (engine/camtpl.js), pure: a box world (4 locations incl. a tight bedroom interior),
// 11 template shots with moves; on EVERY frame (30 fps): each checked head inside the frame and unoccluded, the camera inside no
// box (5 rays per head: centre + 4 across the face), both heads in frame on two / ots, beastHero beast height share 0.6–0.8 with the camera ≤ 1.6 studs above the ground.
import assert from 'node:assert/strict';
import {sampleTpl, solveShot, parseTpl, moveMods, clearMemo, headPoints, TPL, KINDS} from '../engine/camtpl.js';
import {headBox, project} from '../engine/cine.js';

const box = (x0, y0, z0, x1, y1, z1, owner = null) => ({min: [x0, y0, z0], max: [x1, y1, z1], owner});
function segHit(a, b, bx) {   // slab test: does the open segment a→b cross the box?
  let t0 = 1e-6, t1 = 1 - 1e-6;
  for (let i = 0; i < 3; i++) { const d = b[i] - a[i]; if (Math.abs(d) < 1e-12) { if (a[i] < bx.min[i] || a[i] > bx.max[i]) return false; continue; }
    let u = (bx.min[i] - a[i]) / d, v = (bx.max[i] - a[i]) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false; }
  return true; }
const inside = (p, bx, m = 0) => p.every((v, i) => v > bx.min[i] - m && v < bx.max[i] + m);
// a kid: feet at foot, height H, head height headH, facing [x, z]; walking: foot + vel × t
const kid = (name, foot, face, vel = [0, 0], H = 4.4) => ({name, H, headH: 1.0, at: t => [foot[0] + vel[0] * t, foot[1], foot[2] + vel[1] * t], face: () => face});
const bodyBoxes = (a, t) => { const f = a.at(t); return [box(f[0] - .9, f[1], f[2] - .5, f[0] + .9, f[1] + a.H - a.headH, f[2] + .5, a.name), box(f[0] - .55, f[1] + a.H - a.headH, f[2] - .55, f[0] + .55, f[1] + a.H, f[2] + .55, a.name)]; };
const LOCS = {
  plaza: {static: [box(-30, -1, -30, 30, 0, 30), box(6, 0, 4, 7.5, 12, 5.5), box(-9, 0, -3, -7.5, 12, -1.5)]},
  street: {static: [box(-40, -1, -40, 40, 0, 40), box(-12, 0, -40, -5, 14, 40), box(5, 0, -40, 12, 14, 40), box(2.5, 0, 3, 2.9, 9, 3.4)]},
  homeBedroom: {static: [box(-8, -1, -7, 8, 0, 7), box(-8, 0, -7, -6, 9, 7), box(6, 0, -7, 8, 9, 7), box(-8, 0, -7, 8, 9, -5), box(-8, 0, 5, 8, 9, 7), box(-8, 9, -7, 8, 10, 7),
    box(-6, 0, -5, -2.5, 1.6, -1, 'bed'), box(2.5, 0, -5, 6, 2.6, -3.2, 'desk')]},   // a 12 × 10 × 9 room: walls, ceiling, bed, desk
  beastYard: {static: [box(-80, -1, -80, 80, 0, 80), box(-30, 0, 20, 30, 3, 21), box(-12, 0, -4, -11, 6, 30)]}};
const SHOTS = [
  {loc: 'plaza', s: {id: 'P1', tpl: {kind: 'wide'}, subject: 'hero', move: 'track'}, cast: [kid('hero', [-4, 0, 0], [1, 0], [2.2, 0]), kid('juni', [8, 0, -2], [-1, 0])]},
  {loc: 'plaza', s: {id: 'P2', tpl: {kind: 'cu'}, subject: 'hero', move: 'push'}, cast: [kid('hero', [5.5, 0, 6.5], [0, -1]), kid('vance', [6, 0, 10], [0, -1])]},   // a pillar right behind-left
  {loc: 'plaza', s: {id: 'P3', tpl: {kind: 'establish'}, subject: 'hero', move: 'drone'}, cast: [kid('hero', [0, 0, 0], [0, 1])]},
  {loc: 'street', s: {id: 'S1', tpl: {kind: 'ms'}, subject: 'juni', move: 'orbit'}, cast: [kid('juni', [-3.5, 0, 0], [1, 0]), kid('hero', [0, 0, 2], [0, 1])]},   // facing the far wall across a narrow street
  {loc: 'street', s: {id: 'S2', tpl: {kind: 'two', a: 'juni', b: 'hero'}, subject: 'juni', move: 'snap'}, cast: [kid('juni', [-1.5, 0, 0], [1, 0]), kid('hero', [1.5, 0, 0], [-1, 0])]},
  {loc: 'homeBedroom', s: {id: 'B1', tpl: {kind: 'mcu'}, subject: 'hero', move: 'push'}, cast: [kid('hero', [0, 0, 3.6], [0, 1])]},   // faces the wall 1.4 studs away: the camera must swing
  {loc: 'homeBedroom', s: {id: 'B2', tpl: {kind: 'ots', partner: 'juni'}, subject: 'hero', move: 'static-drift'}, cast: [kid('hero', [-1, 0, -.5], [1, 0]), kid('juni', [2, 0, 0], [-1, 0], [0, 0], 3.6)]},
  {loc: 'homeBedroom', s: {id: 'B3', tpl: {kind: 'insert', prop: 'ball'}, subject: 'hero', move: 'push'}, cast: [kid('hero', [0, 0, 0], [1, 0])], prop: {name: 'ball', centre: [4, 3.1, -4.2], H: 1}},
  {loc: 'homeBedroom', s: {id: 'B4', tpl: {kind: 'ecu'}, subject: 'hero', move: 'crashZoom', zoomAt: .4}, cast: [kid('hero', [-4.5, 0, 2], [-1, 0])]},   // next to the side wall, facing it
  {loc: 'beastYard', s: {id: 'Y1', tpl: {kind: 'beastHero', beast: 'tuft'}, subject: 'tuft', move: 'push'}, cast: [kid('hero', [4, 0, 6], [0, -1])], beast: {name: 'tuft', foot: [0, 0, 0], H: 30, headH: 8, face: [0, 1]}},
  {loc: 'beastYard', s: {id: 'Y2', tpl: {kind: 'beastFace', beast: 'tuft'}, subject: 'tuft', move: 'whip'}, cast: [], beast: {name: 'tuft', foot: [0, 0, 0], H: 30, headH: 8, face: [0, 1]}},
  {loc: 'beastYard', s: {id: 'Y3', tpl: {kind: 'ms'}, subject: 'hero', move: 'dollyZoom'}, cast: [kid('hero', [-12.8, 0, 8], [-1, 0])]}];   // backed against a fence post, facing it

const fps = 30, aspect = 9 / 16, report = []; let frames = 0, bad = [];
clearMemo();
for (const {loc, s, cast, prop, beast} of SHOTS) {
  const shot = {...s, duration: 2, frames: 60}, world = t => [...LOCS[loc].static, ...cast.flatMap(a => bodyBoxes(a, t)), ...(beast ? [box(beast.foot[0] - 8, 0, beast.foot[2] - 8, beast.foot[0] + 8, beast.H, beast.foot[2] + 8, beast.name)] : [])];
  let T = 0;
  const groundAt = () => 0, subjectAt = (n, lt) => { if (beast && n === beast.name) return {eyes: [beast.foot[0], beast.H - beast.headH / 2, beast.foot[2] + 7], headH: beast.headH, H: beast.H, foot: beast.foot, face: beast.face};
    const a = cast.find(c => c.name === n); if (!a) return null; const f = a.at(lt); return {eyes: [f[0], f[1] + a.H - a.headH / 2, f[2]], headH: a.headH, H: a.H, foot: f, face: a.face(lt)}; };
  const ctx = {fps, aspect, cacheKey: s.id, groundAt, subjectAt, propAt: n => prop && n === prop.name ? {centre: prop.centre, H: prop.H} : null, atTime: lt => { T = lt; },
    clear: (a, b, ignore) => !world(T).some(bx => !(bx.owner && ignore.includes(bx.owner)) && segHit(a, b, bx)),
    free: p => !world(T).some(bx => inside(p, bx, .3))};
  const P = solveShot(shot, ctx); let worst = {head: 0, occl: 0, inside: 0, share: null};
  for (let f = 0; f < 60; f++) {
    const lt = f / fps; T = lt; const c = sampleTpl(shot, lt, ctx); frames++;
    const cam = {position: c.position, target: c.target, fov: c.fov}, k = s.tpl.kind;
    const heads = k === 'two' ? [s.tpl.a, s.tpl.b] : k === 'ots' ? [s.subject, s.tpl.partner] : k === 'insert' ? [] : [k.startsWith('beast') ? s.tpl.beast : s.subject];
    for (const n of heads) { const h = subjectAt(n, lt), b = headBox(cam, h.eyes, h.headH, aspect);
      if (!b || b.x0 < -1 || b.x1 > 1 || b.y0 < -1 || b.y1 > 1) { bad.push(`${s.id} f${f}: ${n} head out of frame ${JSON.stringify(b)}`); worst.head++; } }
    const checks = k === 'insert' ? [prop.centre] : heads.filter(n => k !== 'ots' || n === s.subject).map(n => subjectAt(n, lt).eyes);
    for (const p0 of checks) for (const p of headPoints(p0, c.position, .6 * (k.startsWith('beast') ? beast.headH : k === 'insert' ? prop.H / 2 : 1))) { const v = c.position.map((x, i) => x - p[i]), l = Math.hypot(...v), r = .6 * (k.startsWith('beast') ? beast.headH : k === 'insert' ? prop.H / 2 : 1); const st = p.map((x, i) => x + v[i] * r / l);
      if (!ctx.clear(st, c.position, k === 'insert' ? [] : heads.filter(n => n !== 'tuft' || k.startsWith('beast')).slice(0, k === 'two' ? 2 : 1))) { bad.push(`${s.id} f${f}: occluded`); worst.occl++; } }
    if (world(lt).some(bx => inside(c.position, bx))) { bad.push(`${s.id} f${f}: camera inside a box`); worst.inside++; }
    if (k === 'beastHero') { const cx = beast.foot[0] / 2, cz = (beast.foot[2] + beast.foot[2] + 7) / 2, a = project(cam, [cx, beast.H, cz], aspect), b = project(cam, [cx, 0, cz], aspect), sh = (a.y - b.y) / 2; worst.share = worst.share === null ? [sh, sh] : [Math.min(worst.share[0], sh), Math.max(worst.share[1], sh)];
      if (sh < .6 || sh > .8) bad.push(`${s.id} f${f}: beast share ${sh.toFixed(3)}`); if (c.position[1] > 1.6 + 1e-6) bad.push(`${s.id} f${f}: camera ${c.position[1].toFixed(2)} above kid-eye height`); }
  }
  report.push(`${s.id} ${loc} ${s.tpl.kind}/${s.move}: swing ${P.swing}° pull ${P.pull}${worst.share ? ` share ${worst.share.map(v => v.toFixed(2)).join('–')}` : ''}`);
}
for (const r of report) console.log('  ' + r);
if (bad.length) { console.log(bad.slice(0, 20).join('\n')); }
assert.equal(bad.length, 0, `${bad.length} bad frames of ${frames}`);
assert.ok(report.find(r => r.startsWith('B1')).match(/swing (-?\d+)/)[1] !== '0', 'B1 (facing a wall) must swing');
// parse + moves on top
assert.deepEqual(parseTpl('ots Juni'), {kind: 'ots', partner: 'juni'}); assert.deepEqual(parseTpl('two juni hero'), {kind: 'two', a: 'juni', b: 'hero'}); assert.deepEqual(parseTpl('cu'), {kind: 'cu'});
assert.throws(() => parseTpl('closeup')); assert.throws(() => parseTpl('two juni')); assert.equal(KINDS.length, Object.keys(TPL).length);
const sh = {tpl: {kind: 'cu'}, duration: 2}; assert.equal(moveMods({...sh, move: 'push'}, 2).dist, 1); assert.equal(moveMods({...sh, move: 'whip'}, 1).yaw, 0); assert.equal(moveMods({...sh, move: 'snap'}, 1).dist, 1);
assert.ok(Math.abs(moveMods({...sh, move: 'orbit'}, 1).yaw) < 1e-9); assert.ok(Math.abs(moveMods({...sh, move: 'crashZoom'}, 1).fovK - 1) < 1e-9);   // moves land on (or centre on) the template framing
console.log(`PASS templates: ${SHOTS.length} shots × 60 frames (${frames}) in 4 locations: heads in frame + unoccluded, camera in no box, two/ots both heads, beastHero share .6–.8 at ≤ 1.6 studs`);
