// scripts/v2/toy5-specs.js — writes engine/fixtures/toyhouse/set5.json: the Phase 3b-R Toy House look/scale fixture (not an
// episode). One 1-second shot (24 frames) per view; the sheets and the gates read it. Animated kids are placed with crowd
// `clear` circles along every camera → subject corridor (anchor-clear radius), so no kid stands in front of a subject.
//   node scripts/v2/toy5-specs.js
import {writeFileSync} from 'node:fs';
import {ANCHORS, ZONES} from '../../parts/sets4/toyhouse.js';
import {ANCHORS as STREET} from '../../parts/sets4/toyhouse_street.js';
import {corridorClear} from '../../parts/sets4/look5.js';
import {MODULE} from '../../parts/sets4/shelves.js';

const F = 24, CLEAR_R = 4.5;
const add = (a, o) => a.map((v, i) => v + (o[i] ?? 0));
// shots: id, anchor (or explicit from), size, subject (cast name), where the subject stands, look, dof
const SHOTS = [
  {id: 'S1-top', anchor: 'hall', move: 'topDown', size: 'wide', look: 'toyTop', subject: 'hero', static: true, degrees: 0},
  {id: 'S2-aisle', anchor: 'aisle', size: 'wide', subject: 'hero'},
  {id: 'S3-counter', from: {position: [-3.2, 5.6, 17.5], target: [-.6, 5.3, 30], fov: 38}, size: 'close', subject: 'pip'},
  {id: 'S4-candy', from: {position: [-41.5, 5.6, 2], target: [-50, 3.6, 13.5], fov: 46}, size: 'medium', subject: 'mo'},
  {id: 'S5-street', anchor: 'street', size: 'wide', look: 'dawn'},
  {id: 'S6-scale', anchor: 'scale', size: 'wide', subject: 'hero'},
  {id: 'S7-hall', anchor: 'hall', size: 'wide', subject: 'hero'},
  {id: 'S8-track', anchor: 'track', size: 'wide', subject: 'taped'},
  {id: 'S9-arena', anchor: 'arena', size: 'wide', subject: 'dad'},
  {id: 'S10-pit', anchor: 'pit', size: 'wide', subject: 'youngpip'},
  {id: 'S11-hyperbox', anchor: 'hyperbox', size: 'close'},
  {id: 'S12-overlook', anchor: 'overlook', size: 'wide'},
  {id: 'S13-mountain', anchor: 'mountain', size: 'wide'},
  {id: 'S14-train', anchor: 'train', size: 'wide'},
];
// marks (where each actor stands, per shot start); hero re-blocks across its shots
const t = id => SHOTS.findIndex(s => s.id === id) * F / F;
const cast = {
  hero: {style: 'v5', preset: 'HERO', at: 'hall', offset: [0, 0, 4], yaw: 180, keys: [[0, 'heroPose', {snap: true}], [t('S6-scale'), 'lookUp'], [t('S7-hall'), 'heroPose', {snap: true}]], faces: [[0, 'hero_wink']],
    marks: [[0, {at: 'hall', offset: [0, 0, 4], yaw: 180}], [t('S2-aisle'), {at: 'aisle', offset: [0, 0, 0], yaw: 4}], [t('S6-scale'), {at: 'scale', offset: [-4, 0, -4], yaw: 168}], [t('S7-hall'), {at: 'hall', offset: [0, 0, 4], yaw: 0}]]},
  pip: {style: 'v5', preset: 'PIP', at: 'counter', offset: [0, 0, 1.6], yaw: 180, keys: [[0, 'idle']], faces: [[0, 'steady']]},
  mo: {style: 'v5', preset: 'MO', at: 'candy', offset: [4, 0, -7], yaw: 215, keys: [[0, 'point']], faces: [[0, 'grin']]},
  taped: {style: 'v5', preset: 'HERO_TAPED', at: 'track', offset: [11, 0, 12], yaw: 35, keys: [[0, 'waddle']], faces: [[0, 'hero_panic']]},
  dad: {style: 'v5', preset: 'MO_DAD', at: 'arena', offset: [-1, 0, 7], yaw: 170, keys: [[0, 'armsCrossed', {snap: true}]], faces: [[0, 'smile']]},
  youngpip: {style: 'v5', preset: 'YOUNG_PIP', at: 'pit', offset: [3, 0, 11], yaw: 20, keys: [[0, 'wave']], faces: [[0, 'polite']]},
};
// each actor shows only in the shots where it is the subject (an episode shows who the shot needs; the fixture should too)
for (const [name, c] of Object.entries(cast)) { const vis = [[0, false]]; SHOTS.forEach((s, i) => { const on = s.subject === name; if (on !== vis.at(-1)[1]) vis.push([i, on]); }); c.visible = vis.filter((v, i, a) => i === 0 || v[1] !== a[i - 1][1]); }
const anchorAt = n => ANCHORS[n]?.at ?? STREET[n]?.at;
const markFor = (name, shotIndex) => { const c = cast[name], ts = shotIndex; const m = c.marks ? [...c.marks].reverse().find(([t0]) => t0 <= ts)[1] : {at: c.at, offset: c.offset}; return add(anchorAt(m.at), m.offset); };
const camOf = s => s.from ?? (ANCHORS[s.anchor] ?? STREET[s.anchor]).camera;
// anchor-clear corridors: camera → subject (and camera → the anchor point for prop shots) for every eye-level shot
const clear = SHOTS.flatMap((s, i) => { if (s.move === 'topDown' || s.look === 'dawn') return []; const c = camOf(s), at = s.subject ? markFor(s.subject, i) : c.target;
  return corridorClear([c.position[0], c.position[2]], [at[0], at[2]], CLEAR_R, 2.5); });
const rows = [-30, -18, -6, 6, 18, 30].map(x => [x - MODULE.D / 2 - .8, -66, x + MODULE.D / 2 + .8, -10]);
const crowds = [
  {id: 'front', count: 12, area: [40, 14], centre: [0, 8]}, {id: 'candy', count: 8, area: [20, 22], centre: [-52, 18]}, {id: 'tramp', count: 5, area: [7, 7], centre: [56, 22]},
  {id: 'arena', count: 8, area: [14, 20], centre: [-53, -64]}, {id: 'pit', count: 6, area: [11, 11], centre: [51.5, -20.5]}, {id: 'aisles', count: 9, area: [56, 50], centre: [0, -40]},
].map((c, i) => ({...c, seed: 11 + i, mode: 'ambient', scale: .84, clear: [...clear, ...(c.id === 'aisles' ? [] : [])]}));
// aisle kids stand in the aisles only: clear every gondola row (circles every 2.5 along the row)
crowds.find(c => c.id === 'aisles').clear.push(...rows.flatMap(([x0, z0, x1, z1]) => Array.from({length: Math.ceil((z1 - z0) / 2.5) + 1}, (_, k) => [(x0 + x1) / 2, z0 + k * 2.5, (x1 - x0) / 2 + .4])));
const Z = ZONES, avoid = [Z.counter, Z.track, Z.mountain, Z.gadget, ...rows, ...[-54, -42, -30, -18, -6, 6, 18, 30, 42, 54].map(x => [x - 2.4, -146, x + 2.4, -78]), [-75, -175, 75, -156], [-75, -156, -65, -45], [58, -156, 75, -94], [-66, 4, -40, 32].map((v, i) => v)];
const spec = {
  slug: 'toyhouse-set5', fps: F, format: 5, note: 'Phase 3b-R look/scale fixture: hall ×3 + dawn street (composite), cast, 48 animated kids (corridor-clear) + 300 muted fill kids. Not an episode. Written by scripts/v2/toy5-specs.js.',
  world: 'parts/sets4/toyhouse_all.js', look4: 'toy', look: 'toy', labels: false, castFile: 'cast/toyhouse.json', budget: 'v3', crowdCull: true,
  worldState: {clock: [[0, 475]], shutter: [[0, 0]], truck: [[0, .8]]},
  cast, crowds, fill: [{id: 'floor', count: 300, area: [146, 200, 0, -70], avoid, seed: 2, muted: true, lite: true}],
  shots: SHOTS.map(s => { const o = {id: s.id, frames: F, move: s.move ?? 'push', size: s.size, shadowRadius: 16}; if (s.anchor) o.anchor = s.anchor; if (s.from) { o.from = s.from; o.to = {...s.from, position: add(s.from.position, [.25, 0, .5])}; }
    for (const k of ['look', 'subject', 'dof', 'static', 'degrees']) if (s[k] !== undefined) o[k] = s[k]; return o; }),
};
writeFileSync('engine/fixtures/toyhouse/set5.json', JSON.stringify(spec, null, 1));
console.log(JSON.stringify({shots: spec.shots.length, frames: spec.shots.length * F, clearCircles: clear.length, kids: crowds.reduce((a, c) => a + c.count, 0)}));
