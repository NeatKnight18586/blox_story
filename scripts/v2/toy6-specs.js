// scripts/v2/toy6-specs.js — Look 6 fixtures (not episodes), from the Look 5b fixture (engine/fixtures/toyhouse/set5b.json):
//   set6.json         the same 14 shots after hours: look6 + toyNight (top-down toyNightTop, street dawn), counter close reframed
//   lightstates6.json the aisle wide three times: toyNight / toyLate / toyDawn
//   node scripts/v2/toy6-specs.js
import {readFileSync, writeFileSync} from 'node:fs';
const base = JSON.parse(readFileSync('engine/fixtures/toyhouse/set5b.json', 'utf8'));
const COUNTER = {position: [-.6, 4.4, 21], target: [0, 5.2, 30.6], fov: 52};   // key on its hook + photo either side of Pip's face; clock small above
const shots = base.shots.map(s => { const o = {...s};
  if (o.look === 'toyTop') o.look = 'toyNightTop'; else if (o.look !== 'dawn') delete o.look;
  if (o.id === 'S3-counter') { o.from = COUNTER; o.to = {...COUNTER, position: COUNTER.position.map((v, i) => v + [.2, 0, .4][i])}; }
  return o; });
const set6 = {...base, slug: 'toyhouse-set6', look4: 'toyNight', look: 'toyNight', look6: true, note: 'Look 6 after-hours fixture (toyNight). Not an episode. Written by scripts/v2/toy6-specs.js.', shots};
writeFileSync('engine/fixtures/toyhouse/set6.json', JSON.stringify(set6, null, 1));
const aisle = shots.find(s => s.id === 'S2-aisle'), F = aisle.frames;
const vis = name => (name === 'hero' ? [[0, true]] : [[0, false]]);
const hero = {...base.cast.hero, marks: [[0, {at: 'aisle', offset: [0, 0, 0], yaw: 4}]], keys: [[0, 'heroPose', {snap: true}]], visible: vis('hero')};
const ls = {...set6, slug: 'toyhouse-lightstates6', note: 'Look 6 light states: the aisle in toyNight / toyLate / toyDawn. Written by scripts/v2/toy6-specs.js.',
  cast: {hero}, shots: ['toyNight', 'toyLate', 'toyDawn'].map(l => ({...aisle, id: 'aisle-' + l, look: l}))};
writeFileSync('engine/fixtures/toyhouse/lightstates6.json', JSON.stringify(ls, null, 1));
console.log(JSON.stringify({set6: shots.length, lightstates: ls.shots.length, frames: F}));
