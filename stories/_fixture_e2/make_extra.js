// node stories/_fixture_e2/make_extra.js — the E2 review specs beside the fixture:
//   drainbloom.json  the hero beside a white dummy (dummyA), front key light: drains legs → shoes → stripe → jacket → hands, then bloom all
//   bench.json       120 crowd dummies + the giant hand (enter, grab dummyA, throw) + bloom crowd random (gate: ≤ 0.30 s/frame at 270×480)
import {writeFileSync} from 'node:fs';
const base = {fps: 30, format: 6, body: 'v6', faceStyle: 'v6', labels: false, world: 'parts/sets6/testpark.js', look: 'day', hero: 'hero'};
const A = (troupe, offset, yaw = 0, extra = {}) => ({style: 'v5', troupe, at: 'plaza', offset, yaw, keys: [[0, 'idle']], ...extra});
export const DRAINS = ['legs', 'shoes', 'stripe', 'jacket', 'hands'], DT = .6, T0 = .3;
const drains = DRAINS.map((r, i) => ({actor: 'hero', region: r, t: +(T0 + DT * i).toFixed(2)})), bloomT = +(T0 + DT * DRAINS.length).toFixed(2);
writeFileSync('stories/_fixture_e2/drainbloom.json', JSON.stringify({slug: '_fixture_e2', ...base, note: 'E2 drainbloom sheet: frames at the end of each drain (+0.45 s), then the full bloom.',
  cast: {hero: A('HERO', [0, 0, 20], 0, {faces: [[0, 'neutral']]}), dummyA: A('DUMMY', [4.6, 0, 20], 0, {faces: [[0, 'neutral']]})},
  story6: {drains, blooms: [{actor: 'hero', region: 'all', t: bloomT}]},
  shots: [{id: 'DB', size: 'medium', frames: Math.round((bloomT + 1) * 30), move: 'static-drift', drift: 0, from: {position: [2.3, 3.2, 46], target: [2.3, 2.6, 28], fov: 46}, shadowRadius: 12, key: {el: 35, offset: 20}}],
  sheetTimes: [...drains.map(d => +(d.t + .45).toFixed(2)), +(bloomT + .6).toFixed(2)]}, null, 1) + '\n');
const names = Array.from({length: 120}, (_, k) => 'crowd' + String(k + 1).padStart(3, '0')), cast = {hero: A('HERO', [0, 0, 26]), dummyA: A('DUMMY', [3, 0, 24])};
for (const n of names) cast[n] = A('DUMMY', [0, 0, 0], 0, {costume: 'CROWD', lod: true});
writeFileSync('stories/_fixture_e2/bench.json', JSON.stringify({slug: '_fixture_e2', ...base, lod: {near: 18, max: 24}, note: 'E2 gate: 120 dummies + hand + bloom ≤ 0.30 s/frame at 270×480.', cast,
  story6: {crowd: {names, seed: 9, start: [0, 8], area: {x0: -30, x1: 30, z0: -20, z1: 40}, steps: [{t: 0, behaviour: 'wander'}]},
    hand: [{t: 0, act: 'enter'}, {t: .9, act: 'grab', actor: 'dummyA'}, {t: 1.7, act: 'throw', actor: 'dummyA'}], blooms: [{crowd: true, t: 1.0}, {actor: 'hero', region: 'all', colour: '#FF5FA2', t: 1.2}]},
  shots: [{id: 'B1_all', size: 'wide', frames: 90, move: 'static-drift', drift: 0, from: {position: [0, 26, 70], target: [0, 4, 14], fov: 55}, shadowRadius: 60}]}, null, 1) + '\n');
console.log('drainbloom + bench written');
