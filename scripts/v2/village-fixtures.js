// scripts/v2/village-fixtures.js — tuft P3 village look-dev fixtures → engine/fixtures/village/<loc>-<look>.json: per location the
// establishing view + the hero-angle view (parts/locations/<loc>.json `views`), static cine cameras, grade 'clear', no cast unless the
// location lists `fixtureCast`. Usage: node scripts/v2/village-fixtures.js [loc ...]
import {readFileSync, writeFileSync, mkdirSync, readdirSync} from 'node:fs';
import {HEAD} from './kit2-fixtures.js';
export const LOOKS = {day: 'comedy', night: 'moonlit', dusk: 'dawn'};
export const VILLAGE = ['beastYard', 'beastClass', 'homeDining', 'homeBedroom', 'villageStreet', 'festivalPlaza', 'titanCave'];
const want = process.argv.slice(2).filter(a => !a.startsWith('--')), out = 'engine/fixtures/village'; mkdirSync(out, {recursive: true});
export function fixture(loc, look, {cast = null, extraShots = []} = {}) {
  const L = JSON.parse(readFileSync(`parts/locations/${loc}.json`, 'utf8')), shots = [];
  for (const [id, v] of Object.entries(L.views ?? {})) shots.push({id: `${loc}-${id}`, frames: 24, duration: 1, size: 'ws', mood: 'awe', move: 'static-drift', angle: 'eye', from: v, to: v, ...(L.fixturePuff ? {puffs: [L.fixturePuff]} : {}), ...(loc === 'titanCave' ? {beasts: [{actor: 'titan', state: 'ignite', at: 0}]} : {})});
  return {note: `tuft P3 village look-dev fixture (scripts/v2/village-fixtures.js): ${loc}, ${look}; one 1 s static shot per location view.`, slug: 'village', ...HEAD, world: 'parts/village/world.js', location: loc,
    look4: L.lookMap?.[look] ?? LOOKS[look], look: LOOKS[look] === 'moonlit' ? 'mystery' : LOOKS[look] === 'dawn' ? 'dawn' : 'comedy', skyDist: L.skyDist ?? 650, twos: false, cast: cast ?? L.fixtureCast ?? {}, shots: [...shots, ...extraShots]}; }
if (process.argv[1]?.endsWith('village-fixtures.js')) for (const loc of (want.length ? want : VILLAGE.filter(l => readdirSync('parts/locations').includes(l + '.json')))) {
  const L = JSON.parse(readFileSync(`parts/locations/${loc}.json`, 'utf8'));
  for (const look of L.looks ?? ['day', 'night']) { writeFileSync(`${out}/${loc}-${look}.json`, JSON.stringify(fixture(loc, look), null, 1) + '\n'); console.log('wrote', `${loc}-${look}.json`); } }
// festivalPlaza night + lanternSea + the giant cage on the stage + colossal Tuft towering over the roofs (row 4 of the sheet, the colossal gate)
export function colossal() {
  const f = fixture('festivalPlaza', 'night'), L = JSON.parse(readFileSync('parts/locations/festivalPlaza.json', 'utf8'));
  f.note = 'tuft P3 village fixture: festivalPlaza night, lanternSea + giant cage on the stage, kids + parade beasts, colossal Tuft (puff colossal) towering over the roofs.';
  f.cast = {...L.fixtureCast, tuft: {style: 'beast', preset: 'TUFT', tier: 'hero', at: 'street', offset: [0, 0, -14], yaw: 0, glowLevel: .8}};
  f.props2b = [{kind: 'lanternSea', at: [0, 0, -10], r: 80, n: 1500}, {kind: 'giantCage', at: [0, 1.6, -24], scale: .3}];
  const wide = {position: [0, 6, 92], target: [0, 30, -20], fov: 58}, low = {position: [-22, 3.5, 40], target: [0, 34, -14], fov: 60};
  f.shots = [{id: 'plaza-colossal-wide', frames: 48, duration: 2, size: 'ews', mood: 'awe', move: 'push', angle: 'low', from: wide, to: {...wide, position: [0, 6, 86]}, puffs: [{actor: 'tuft', size: 'colossal', at: 0}]},
    {id: 'plaza-colossal-low', frames: 48, duration: 2, size: 'ws', mood: 'awe', move: 'push', angle: 'low', from: low, to: {...low, position: [-20, 3.5, 36]}, puffs: [{actor: 'tuft', size: 'colossal', at: 0}]}];
  return f; }
if (process.argv[1]?.endsWith('village-fixtures.js') && !want.length) { writeFileSync(`${out}/festivalPlaza-colossal.json`, JSON.stringify(colossal(), null, 1) + '\n'); console.log('wrote festivalPlaza-colossal.json'); }
// demo.mp4 pieces (540×960, 24 fps, on ones): night street push · plaza fly-through · titanCave ignite → roar · colossal Tuft reveal
export function demos() {
  const st = fixture('villageStreet', 'night'), pl = fixture('festivalPlaza', 'night'), cv = fixture('titanCave', 'night'), co = colossal();
  st.shots = [{id: 'demo-street', frames: 96, duration: 4, size: 'ews', mood: 'awe', move: 'push', angle: 'eye', from: {position: [2.5, 5.5, 46], target: [0, 9, -60], fov: 50}, to: {position: [1.5, 4.5, 22], target: [0, 10, -60], fov: 50},
    beasts: [{actor: 'volt', state: 'run', at: 1.0, to: [-2, 0, -40]}, {actor: 'fox', state: 'flee', at: 1.4, exit: 'away'}, {actor: 'boar', state: 'flee', at: 1.7, exit: 'away'}]}];
  pl.props2b = [{kind: 'lanternSea', at: [0, 0, -10], r: 80, n: 1500}, {kind: 'giantCage', at: [0, 1.6, -24], scale: .3}];
  pl.shots = [{id: 'demo-plaza', frames: 96, duration: 4, size: 'ews', mood: 'awe', move: 'push', angle: 'low', from: {position: [-30, 14, 60], target: [0, 16, -30], fov: 52}, to: {position: [14, 7, 34], target: [0, 14, -30], fov: 52}}];
  cv.shots = [{id: 'demo-cave', frames: 72, duration: 3, size: 'ws', mood: 'tension', move: 'push', angle: 'eye', from: {position: [0, 36, 190], target: [0, 36, 124], fov: 46}, to: {position: [0, 35, 168], target: [0, 35, 124], fov: 46},
    beasts: [{actor: 'titan', state: 'ignite', at: 0}, {actor: 'titan', state: 'roar', at: 1.6}], shake: true}];
  co.shots = [{...co.shots[0], id: 'demo-colossal', frames: 96, duration: 4, from: {position: [0, 5, 100], target: [0, 12, -20], fov: 58}, to: {position: [0, 6, 88], target: [0, 32, -20], fov: 58}, puffs: [{actor: 'tuft', size: 'colossal', at: .6}]}];
  return {st, pl, cv, co}; }
if (process.argv[1]?.endsWith('village-fixtures.js') && !want.length) for (const [k, f] of Object.entries(demos())) { writeFileSync(`${out}/demo-${k}.json`, JSON.stringify(f, null, 1) + '\n'); console.log('wrote demo-' + k); }
