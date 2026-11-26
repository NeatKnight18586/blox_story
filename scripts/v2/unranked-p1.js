// scripts/v2/unranked-p1.js — E4 "unranked" Phase 1 (cast only) review + gates → review/unranked/p1/
//   cast-sheet.png   every new costume + 8 STUDENT seeds + mom + dog, front and three-quarter (phone-scale cells)
//   symbols-ecu.png  the five ranks side by side + one darkened (ECU on the right hand)
//   lineup-12.png    12 kids + the hero, one medium-wide frame (phone ratio, 2×)
//   gates.json       G1 symbol read (per symbol, medium shot at 390 px) · G2 rank-colour ΔE2000 · G3 build gates · G4 cost
//   node scripts/v2/unranked-p1.js        (raw frames in renders/unranked-p1/, never committed)
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {resolveTroupe} from '../../engine/troupe.js';
import {outfitRegions} from '../../avatar-style/body5.js';
import {RANKS, RANK_LOOK} from '../../avatar-style/symbol.js';
import {deltaE2000} from '../../avatar-style/deltae.js';

const raw = 'renders/unranked-p1', out = 'review/unranked/p1';
await mkdir(raw, {recursive: true}); await mkdir(out, {recursive: true});
const t6 = JSON.parse(await readFile('cast/troupe6.json', 'utf8')), h6 = JSON.parse(await readFile('cast/hero6.json', 'utf8')), data = {...t6, troupe: {...t6.troupe, HERO: h6.HERO}};
const mk = (troupe, costume, seed) => { const p = resolveTroupe({troupe, costume, seed, faceStyle: 'v6'}, data); p.body = 'v6'; p.faceStyle = 'v6';   // as engine/episode.js presetOf for a format-6 spec
  if (!p.regions && p.outfit) { p.regions = outfitRegions(p.outfit, p.skin); p.outfit = null; } if (p.build !== 'youth' && !(p.age < 18)) p.scale = 1; return p; };
const cast = {HERO: mk('HERO'), LILA: mk('SECOND', 'LILA'), DAX: mk('RIVAL', 'DAX'), DAD: mk('ELDER', 'DAD'), MOM: mk('ADULT_F', 'MOM'), STU_A: mk('DUMMY', 'STUDENT_A'), STU_B: mk('DUMMY', 'STUDENT_B'), STU_C: mk('DUMMY', 'STUDENT_C')};
for (let s = 1; s <= 8; s++) cast['S' + s] = mk('DUMMY', 'STUDENT', s);
cast.DOG = {style: 'dog', scale: 1};
// ECU hands: one kid, one symbol per rank (+ S darkened); the same skin so only the symbol changes
for (const r of RANKS) cast['ECU_' + r] = {...mk('DUMMY', 'STUDENT_A'), skin: '#D49A6A', symbol: {...RANK_LOOK[r], rank: r}};
cast.ECU_dark = {...cast.ECU_S, symbolDark: true};
await writeFile(`${raw}/cast.json`, JSON.stringify({cast}));
const ORDER = ['LILA', 'DAX', 'DAD', 'MOM', 'STU_A', 'STU_B', 'STU_C', ...Array.from({length: 8}, (_, i) => 'S' + (i + 1))], D2R = Math.PI / 180;
const camFor = (H, cy, fov, az = 0) => { const d = H * 1.62 / (2 * Math.tan(fov / 2 * D2R)); return {position: [Math.sin(az * D2R) * d, cy, Math.cos(az * D2R) * d], target: [0, cy, 0], fov}; };
const height = id => (cast[id].scale ?? 1) * 5.45;
const full = (id, yaw) => ({actors: [{id, at: [0, 0, 0], yaw, pose: 'idle', t: .3}], camera: camFor(height(id), height(id) / 2, 30)});
const medium = id => { const k = cast[id].scale ?? 1; return {actors: [{id, at: [0, 0, 0], yaw: -30, pose: 'idle', t: .3}], camera: {position: [0, 3.2 * k, 8 * k], target: [0, 2.9 * k, 0], fov: 35}}; };   // G1: medium shot, hand in frame, 390 × 693
const dogCell = (pose, yaw) => ({actors: [{id: 'DOG', at: [0, 0, 0], yaw, pose, t: .4}], camera: {position: [Math.sin(yaw * D2R + .6) * 7.2, 1.7, Math.cos(yaw * D2R + .6) * 7.2], target: [0, 1.15, 0], fov: 30}});
const ecu = id => { const k = cast[id].scale ?? 1, hx = 1.51 * k, hy = 2.0 * k; return {actors: [{id, at: [0, 0, 0], yaw: 0, pose: 'idle', t: .3}], camera: {position: [hx + 2.1 * k, hy + .45 * k, 2.7 * k], target: [hx + .12 * k, hy + .02 * k, .12 * k], fov: 24}}; };
// lineup: 12 kids + HERO, three staggered rows, medium-wide, phone ratio
const KIDS = ['LILA', 'STU_A', 'STU_B', 'STU_C', ...Array.from({length: 8}, (_, i) => 'S' + (i + 1))], rows = [[4, -5.4, 3.0], [4, -2.7, 3.0], [4, 0, 3.0]];
let ki = 0; const lineActors = []; rows.forEach(([n, z, dx], r) => { for (let i = 0; i < n; i++) { const id = KIDS[ki++], x = (i - (n - 1) / 2) * dx + (r % 2 ? 1.3 : -1.0) - (r === 2 ? 1.2 : 0); lineActors.push({id, at: [x, 0, z], yaw: (r % 2 ? 7 : -7) - x, pose: 'idle', t: .3 + ki * .17}); } });
lineActors.push({id: 'HERO', at: [4.6, 0, 2.8], yaw: -14, pose: 'idle', t: .1, face: 'hero_wink'});
const lineup = {actors: lineActors, camera: {position: [0, 15, 38], target: [0, 0.8, -1.5], fov: 40}};
const server = await startServer(), browser = await launch(); let budget, info;
try {
  const page = await browser.newPage({viewport: {width: 400, height: 400}}); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/hero6.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__hero6, null, {timeout: 120000});
  const grab = async (cell, w, h, f, mode = 'studio') => { const url = await page.evaluate(([c, w, h, m]) => window.__hero6.render(c, w, h, m), [cell, w, h, mode]); await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); };
  for (const id of ['HERO']) { await grab(medium(id), 390, 693, `${raw}/med-${id}.png`); await grab(medium(id), 390, 693, `${raw}/mask-${id}.png`, 'mask'); }   // G3: the hero's bare hands (no green in the mask)
  for (const id of ORDER) { for (const [v, yaw] of [['front', 0], ['3q', -38]]) await grab(full(id, yaw), 390, 693, `${raw}/cell-${id}-${v}.png`);
    await grab(medium(id), 390, 693, `${raw}/med-${id}.png`); await grab(medium(id), 390, 693, `${raw}/mask-${id}.png`, 'mask'); }
  for (const p of ['idle', 'sit', 'bow', 'wag']) await grab(dogCell(p, -40), 780, 693, `${raw}/dog-${p}.png`);
  for (const [v, yaw] of [['front', 0], ['3q', -38]]) await grab({actors: [{id: 'DOG', at: [0, 0, 0], yaw, pose: 'idle', t: .4}], camera: {position: [Math.sin(yaw * D2R) * 8, 1.9, Math.cos(yaw * D2R) * 8], target: [0, 1.5, 0], fov: 30}}, 390, 693, `${raw}/cell-DOG-${v}.png`);
  for (const id of [...RANKS.map(r => 'ECU_' + r), 'ECU_dark']) await grab(ecu(id), 600, 600, `${raw}/${id}.png`);
  await grab(lineup, 780, 1387, `${raw}/lineup.png`);
  budget = await page.evaluate(() => window.__hero6.budget());
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }
await writeFile(`${raw}/budget.json`, JSON.stringify(budget));
const syms = Object.fromEntries(ORDER.map(id => [id, {rank: cast[id].symbol.rank, shape: cast[id].symbol.shape, color: cast[id].symbol.color, skin: cast[id].skin}]));
// G2: pairwise ΔE2000 between the five rank colours
const rankCols = Object.fromEntries(RANKS.map(r => [r, RANK_LOOK[r].color])), g2 = {pairs: {}, min: Infinity};
for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { const v = +deltaE2000(rankCols[RANKS[i]], rankCols[RANKS[j]]).toFixed(1); g2.pairs[RANKS[i] + RANKS[j]] = v; g2.min = Math.min(g2.min, v); }
g2.pass = g2.min >= 20; g2.line = 'pairwise ΔE2000 ≥ 20'; g2.colors = rankCols;
await writeFile(`${raw}/g2.json`, JSON.stringify(g2)); await writeFile(`${raw}/syms.json`, JSON.stringify({ORDER, syms, budget, DOG: ['idle', 'sit', 'bow', 'wag']}));
execFileSync('python3', ['scripts/v2/unranked-p1.py', raw, out], {stdio: 'inherit'});

// ---- G3 (build gates for ADULT_F on the v1 body and on the Actor v6 body; the hero carries no symbol) and G4 (cost) → merged into gates.json
const run = (args) => { try { return {out: execFileSync('node', args, {encoding: 'utf8', maxBuffer: 1 << 26}), ok: true}; } catch (e) { return {out: String(e.stdout ?? ''), ok: false}; } };
const bg = run(['scripts/v2/build-gates.js', '--out', `${raw}/build-gates.json`, '--png', `${raw}/adult_f.png`]), bgj = JSON.parse(await readFile(`${raw}/build-gates.json`, 'utf8')) ?? {};
const gates = JSON.parse(await readFile(`${out}/gates.json`, 'utf8')), heroMask = gates.G3heroMaskPx;
let heroErr = null; try { resolveTroupe({troupe: 'HERO', symbol: {shape: 'leaf', color: '#9BD48A', rank: 'D'}}, data); } catch (e) { heroErr = e.message; }
gates.G3 = {line: 'node scripts/v2/build-gates.js passes for adult_f (v1 body) and adult_f_v6 (the ADULT_F slot body); hero renders with no symbol; a symbol on the hero is a hard error', pass: bg.ok && !(bgj.failures ?? []).length && heroMask === 0 && !!heroErr,
  failures: bgj.failures ?? [], adult_f: {waistRatio: bgj.adult_f?.waist?.ratio, armGap: bgj.adult_f?.armGapAtWaist?.fracOfTop}, adult_f_v6: {waistRatio: bgj.adult_f_v6?.waist?.ratio, waistAtDown: bgj.adult_f_v6?.waist?.atDown, armGap: bgj.adult_f_v6?.armGapAtWaist?.fracOfTop, shoulderGapPx: bgj.adult_f_v6?.shoulderGapPx?.max, hips: bgj.adult_f_v6?.hips}, heroSymbolMaskPx: heroMask, heroSymbolError: heroErr};
// G4: 12 full-detail kids + the hero in one frame (scripts/v2/bench.js; Season 1 budget 90k triangles, 0.62 s/frame). The scratch world is a flat floor so the number is the CAST; testPark is the same shot with a real (heavy) world.
const act = (troupe, off, yaw, extra = {}) => ({style: 'v5', faceStyle: 'v6', troupe, at: 'plaza', offset: off, yaw, keys: [[0, 'idle']], ...extra});
const bcast = {hero: act('HERO', [4.6, 0, 2.8], 166, {faces: [[0, 'neutral']]})}; let q = 0;
const kids = [['SECOND', 'LILA'], ['DUMMY', 'STUDENT_A'], ['DUMMY', 'STUDENT_B'], ['DUMMY', 'STUDENT_C'], ...Array.from({length: 8}, (_, i) => ['DUMMY', 'STUDENT', i + 1])];
[[4, -5.4], [4, -2.7], [4, 0]].forEach(([n, z], r) => { for (let i = 0; i < n; i++) { const [sl, c, seed] = kids[q++], x = (i - (n - 1) / 2) * 3 + (r % 2 ? 1.3 : -1) - (r === 2 ? 1.2 : 0); bcast['k' + q] = act(sl, [x, 0, z], 180 + ((r % 2 ? 7 : -7) - x), {costume: c, ...(seed ? {seed} : {})}); } });
await mkdir('renders/v2/unranked-p1', {recursive: true});
await writeFile('renders/v2/unranked-p1/flat-world.js', `import * as T from 'three';
export const LAYER = {terrain: 0, plaza: .15}; export const groundY = () => 0;
export const LOOK = {fog: {color: '#b9c9d6', near: 120, far: 460, height: {amount: 0}}, envPreset: 'day', envIntensity: .45, cloudCover: .3};
export function build(scene) { const m = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({color: '#8d8f93', roughness: .9})); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m);
  return {anchors: {plaza: {position: [0, 0.15, 8], camera: {position: [0, 9, 40], target: [0, 3, 0], fov: 50}}}, groundY, update() {}}; }
`);
const bench = async (world, name) => { const spec = {slug: 'unranked-p1-bench', fps: 30, format: 6, body: 'v6', faceStyle: 'v6', labels: false, budget: 'v3', world, look: 'day', cast: bcast,
    shots: [{id: 'lineup', size: 'wide', frames: 6, move: 'static-drift', drift: 0, from: {position: [0, 15, -31], target: [0, 2.4, 6.5], fov: 40}, shadowRadius: 60, subject: 'hero'}]};
  await writeFile(`renders/v2/unranked-p1/${name}.json`, JSON.stringify(spec)); const r = run(['scripts/v2/bench.js', '--spec', `renders/v2/unranked-p1/${name}.json`]), j = JSON.parse(r.out.trim().split('\n').filter(l => l.startsWith('{')).at(-1));
  return {world: world.split('/').pop(), triangles: j.maxTriangles, sPerFrame720: j.meanSecondsPerFrame, sPerFrame1080: j.meanSecondsPerFrame1080, pass: j.result === 'PASS'}; };
const flat = await bench('renders/v2/unranked-p1/flat-world.js', 'bench-flat'), park = await bench('parts/sets6/testpark.js', 'bench-testpark');
gates.G4 = {line: '12 full-detail kids + hero in one frame: ≤ 90,000 triangles in the frustum and ≤ 0.62 s/frame (720×1280; owner Decision 4)', kids: 12, hero: 1, cast: flat, pass: flat.pass && flat.triangles <= 90000 && flat.sPerFrame720 <= .62,
  perActorTriangles: Object.fromEntries(ORDER.concat('HERO').map(id => [id, budget[id]])), withTestParkWorld: park, remainingForWorld: 90000 - flat.triangles,
  note: 'the cast alone is ' + flat.triangles + ' triangles; the world in view has ≤ ' + (90000 - flat.triangles) + ' left (testPark in the same shot: ' + park.triangles + ')'};
delete gates.G3heroMaskPx; await writeFile(`${out}/gates.json`, JSON.stringify(gates, null, 1));
console.log(JSON.stringify({G1: gates.G1.pass, G2: gates.G2, G3: gates.G3.pass, G4: gates.G4}, null, 1));
