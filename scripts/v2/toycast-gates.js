// scripts/v2/toycast-gates.js — Toy House cast gates (format v5, Phase 3b) → review/toyhouse/cast-gates.json. No browser.
//   head / shoulder width 0.58–0.62 on every build (incl. elder_m) · adults within 1 % of each other (the elder's stoop ≤ 3 %) ·
//   kids shorter than every adult · every outfit ≥ 90 RGB from the hero colours · the taped hero waddles (hip + roll swing).
import * as T from 'three';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createActor5, headShoulderRatio, heroColours, heroColourCheck} from '../../avatar-style/body5.js';
import {BUILDS} from '../../avatar-style/body.js';
import {samplePose, applyPoseSample} from '../../engine/poses.js';
const cast = JSON.parse(readFileSync('cast/toyhouse.json', 'utf8')).cast, hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO, fails = [], rows = {};
const dataHero = {...hero, regions: hero.regions};
for (const [k, c] of Object.entries(cast)) {
  const adult = !c.build || c.build !== 'youth', scale = adult ? 1 : c.scale ?? 1, a = createActor5({skin: c.skin, build: c.build ?? 'adult_m', scale, regions: c.regions});
  applyPoseSample(a, samplePose('idle', 0), {position: [0, 0, 0], yaw: 0}); const st = BUILDS[c.build ?? 'adult_m']?.stoop; if (st) { a.root.rotation.x += st; a.pivots.head.rotation.x -= st * .6; }
  a.root.updateMatrixWorld(true); const b = new T.Box3().setFromObject(a.parts.head.parent === a.root ? a.root : a.root, true);
  const body = new T.Box3(); for (const [pn, m] of Object.entries(a.parts)) body.union(new T.Box3().setFromObject(m, true));
  rows[k] = {build: c.build ?? 'adult_m', adult, height: +(body.max.y - Math.min(0, body.min.y)).toFixed(3), headShoulder: headShoulderRatio(createActor5({skin: c.skin, build: c.build ?? 'adult_m', regions: c.regions}))};
  if (rows[k].headShoulder < .58 || rows[k].headShoulder > .62) fails.push(`${k}: head/shoulder ${rows[k].headShoulder}`);
}
const adults = Object.entries(rows).filter(([, r]) => r.adult && r.build !== 'elder_m'), ref = adults[0][1].height;
for (const [k, r] of Object.entries(rows)) if (r.adult) { const d = Math.abs(r.height / ref - 1), lim = r.build === 'elder_m' ? .03 : .01; r.diffPct = +(d * 100).toFixed(2); if (d > lim) fails.push(`${k}: height ${r.height} vs ${ref} (${r.diffPct} % > ${lim * 100} %)`); }
const minAdult = Math.min(...Object.values(rows).filter(r => r.adult).map(r => r.height)); for (const [k, r] of Object.entries(rows)) if (!r.adult && r.height >= minAdult) fails.push(`${k}: kid ${r.height} not shorter than adults ${minAdult}`);
const colour = heroColourCheck(dataHero, Object.fromEntries(Object.entries(cast).filter(([k]) => !k.startsWith('HERO')).map(([k, c]) => [k, {outfit: c.safeOutfit}]))); for (const x of colour) fails.push(`${x.slot}.${x.key} ${x.troupe} vs ${x.hero}: ${x.d}`);
const sw = t => samplePose('waddle', t), sp = [0, .075, .15, .225, .3, .45].map(t => sw(t)), roll = Math.max(...sp.map(p => Math.abs(p.root.roll))), hop = Math.max(...sp.map(p => p.root.dy)), hip = Math.max(...sp.map(p => Math.abs(p.pivots.leftHip[0])));
if (roll < .1 || hop < .1 || hip < .05) fails.push(`waddle too weak: roll ${roll.toFixed(2)}, hop ${hop.toFixed(2)}, hip ${hip.toFixed(2)}`);
const rep = {cast: rows, heroColourClashes: colour.length, waddle: {roll: +roll.toFixed(3), hop: +hop.toFixed(3), hip: +hip.toFixed(3)}, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/toyhouse', {recursive: true}); writeFileSync('review/toyhouse/cast-gates.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep)); process.exitCode = fails.length ? 1 : 0;
