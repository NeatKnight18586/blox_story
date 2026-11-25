// tests/village.js — tuft P3 BEAST VILLAGE pure gates (node; parts/village/kit.js + parts/locations/*.json): LAYER rules (≥ 0.05 and pairwise
//   ≥ 0.05 apart), groundY finite + ≥ 0 + flat over every hero zone, kit determinism, night windows ≥ 60 % lit (seeded rule), rows never
//   overlap, house tris per tier, every location's data valid (presets, props, views). Writes review/village/tests.json.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as K from '../parts/village/kit.js';

const res = [], ok = (name, pass, line) => { res.push({name, pass, line}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const LOCS = ['beastYard', 'beastClass', 'homeDining', 'homeBedroom', 'villageStreet', 'festivalPlaza', 'titanCave'], J = n => JSON.parse(readFileSync(`parts/locations/${n}.json`, 'utf8'));
const LAYER = {yard: .05, street: .1, plaza: .15};   // = parts/village/world.js (that module imports three; this copy is checked against its source text)
{ const src = readFileSync('parts/village/world.js', 'utf8'), m = src.match(/export const LAYER = (\{[^}]+\})/), W = Function('return ' + m[1])(), vals = Object.values(W);
  const pair = vals.every((a, i) => vals.every((b, j) => i === j || Math.abs(a - b) >= .05 - 1e-9)), floor = vals.every(v => v >= .05);
  ok('LAYER: ≥ 0.05 and every pair ≥ 0.05 apart', pair && floor && JSON.stringify(W) === JSON.stringify(LAYER), JSON.stringify(W)); }
// groundY = the location's hill ramp (parts/village/world.js groundY, re-implemented here from the same kit function)
const gY = (L, x, z) => { const h = L.hill; if (!h) return 0; const c = Math.cos(h.dir ?? 0), s = Math.sin(h.dir ?? 0), dist = -((x - (h.centre?.[0] ?? 0)) * s + (z - (h.centre?.[1] ?? 0)) * c); return K.hillY(dist, h); };
{ let bad = 0, n = 0, flat = 0; for (const loc of LOCS) { const L = J(loc);
    for (let i = 0; i < 2000; i++) { const x = (i * 37 % 800) - 400, z = (i * 53 % 800) - 400, y = gY(L, x, z); n++; if (!Number.isFinite(y) || y < 0) bad++; }
    for (const a of Object.values(L.anchors ?? {})) if (Math.abs(gY(L, a.position[0], a.position[2])) > 1e-9) flat++;
    for (const h of L.houses ?? []) if (Math.abs(gY(L, h.at[0], h.at[2])) > 1e-9) flat++; }
  ok('groundY finite + ≥ 0 everywhere; hero zones (anchors, hero houses) on flat ground', !bad && !flat, `${n} samples, ${bad} bad; ${flat} anchors / hero houses off the flat`); }
{ const a = JSON.stringify(K.houseParts(K.housePreset('hero', 7), 'hero', {lit: K.litFn(7)})), b = JSON.stringify(K.houseParts(K.housePreset('hero', 7), 'hero', {lit: K.litFn(7)}));
  const r1 = JSON.stringify(K.rowAlong([[0, 0], [0, -100]], 1, {seed: 3})), r2 = JSON.stringify(K.rowAlong([[0, 0], [0, -100]], 1, {seed: 3})), t1 = JSON.stringify(K.terraces({seed: 5})), t2 = JSON.stringify(K.terraces({seed: 5}));
  ok('kit deterministic (house, row, terraces)', a === b && r1 === r2 && t1 === t2, `${a.length + r1.length + t1.length} bytes identical twice`); }
{ let lit = 0, tot = 0; for (let s = 1; s <= 200; s++) for (const p of Object.keys(K.HOUSES)) { const w = K.houseParts(K.housePreset(p, s), 'hero', {lit: K.litFn(s)}).filter(q => q.window); tot += w.length; lit += w.filter(q => q.mat === 'winLit').length; }
  ok('night windows ≥ 60 % lit (seeded rule, 200 seeds × every preset)', lit / tot >= .6, `${lit}/${tot} = ${(100 * lit / tot).toFixed(1)} % (LIT_SHARE ${K.LIT_SHARE})`); }
{ let over = 0, n = 0; for (const loc of LOCS) for (const r of J(loc).rows ?? []) { const hs = K.rowAlong(r.line, r.side, {seed: r.seed, setback: r.setback, skip: r.skip ?? []}); n += hs.length;
    for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) { const A = K.housePreset(hs[i].preset, hs[i].seed), Bh = K.housePreset(hs[j].preset, hs[j].seed); if (Math.hypot(hs[i].at[0] - hs[j].at[0], hs[i].at[2] - hs[j].at[2]) < (A.w + Bh.w) / 2 - .01 && Math.abs(hs[i].rotY - hs[j].rotY) < 1e-6) over++; } }
  ok('mid rows: no two houses overlap along a row', !over, `${n} row houses, ${over} overlaps`); }
{ const t = Object.fromEntries(Object.keys(K.HOUSES).map(p => [p, ['hero', 'mid', 'far'].map(tier => K.flatten(K.houseParts(K.housePreset(p, 1), tier)))]));
  ok('house tris per tier (hero ≤ 2.5k, mid presets ≤ 1.2k, far ≤ 30; boxes untessellated)', Object.entries(t).every(([p, [h, m, f]]) => h <= 2500 && (!K.MID_PRESETS.includes(p) || m <= 1200) && f <= 30), Object.entries(t).map(([p, v]) => `${p} ${v.join('/')}`).join(', ')); }
{ const PROPS = ['hay', 'trough', 'barrel', 'crate', 'fence', 'bench', 'desk', 'table', 'chair', 'bed', 'hook', 'chalkboard', 'shelf', 'post', 'stage', 'well'], errs = [];
  for (const loc of LOCS) { const L = J(loc); for (const h of L.houses ?? []) if (!K.HOUSES[h.preset]) errs.push(`${loc}: house ${h.preset}`); for (const p of L.props ?? []) if (!PROPS.includes(p.type)) errs.push(`${loc}: prop ${p.type}`);
    if (!L.views?.establish || !L.views?.hero) errs.push(`${loc}: views`); if (!L.anchors?.street) errs.push(`${loc}: anchor street`); if (!/\S/.test(L.note ?? '')) errs.push(`${loc}: note`); }
  ok('every location: valid presets / props, an establishing + hero view, a street anchor', !errs.length, errs.join('; ') || `${LOCS.length} locations`); }
mkdirSync('review/village', {recursive: true}); writeFileSync('review/village/tests.json', JSON.stringify(res, null, 1));
const f = res.filter(r => !r.pass).length; console.log(`${res.length - f}/${res.length} pass`); if (f) process.exitCode = 1;
