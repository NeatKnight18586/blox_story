// scripts/v2/hero-gates.js — format v4 Phase 1b hero checks → review/v4/hero-gates.json (pure, no browser):
//   heroColourCheck on the troupe before and after heroSafeOutfit (RGB ≥ 90 from every hero colour) · jacket edge width in
//   px at the 390 px sheet shots (≥ 2 px at the full-body shot).
import {readFileSync, writeFileSync} from 'node:fs';
import {heroColours, heroSafeOutfit, heroColourCheck, regionBlocks, createActor5, headTorsoRatio} from '../../avatar-style/body5.js';
const hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO, t = JSON.parse(readFileSync('cast/troupe.json', 'utf8'));
const all = {...t.troupe, AFK: t.AFK}, cols = heroColours(hero);
const fixed = Object.fromEntries(Object.entries(all).map(([k, p]) => [k, {...p, outfit: heroSafeOutfit(p.outfit, cols)}]));
const swaps = Object.entries(all).flatMap(([k, p]) => ['main', 'legs'].filter(x => p.outfit[x] !== fixed[k].outfit[x]).map(x => ({slot: k, key: x, from: p.outfit[x], to: fixed[k].outfit[x]})));
const pxPerUnit = d => 693 / (2 * d * Math.tan(17.5 * Math.PI / 180)), edge = regionBlocks('torso', hero.regions).find(b => b.edge && !b.collar).size[0];
const ratio = headTorsoRatio(createActor5({skin: hero.skin, regions: hero.regions}));
const shots = {fullBody: Math.hypot(1.5, .7, 12.5), medium: 7}, edgePx = Object.fromEntries(Object.entries(shots).map(([k, d]) => [k, +(edge * pxPerUnit(d)).toFixed(2)]));
const before = heroColourCheck(hero, all), after = heroColourCheck(hero, fixed), fails = [...after.map(x => `${x.slot}.${x.key} ${x.troupe} vs ${x.hero}: ${x.d}`), ...(edgePx.fullBody < 4 ? [`lapel trim ${edgePx.fullBody} px at full body (≥ 4)`] : []), ...(ratio < .58 || ratio > .62 ? [`head/torso ${ratio}`] : [])];
const rep = {heroColours: cols, before: before.length, after: after.length, swaps, edgeUnits: edge, edgePx, headTorsoRatio: ratio, collar: 'raised rim around the neck (back, sides, front tips)', failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
writeFileSync('review/v4/hero-gates.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep)); process.exitCode = fails.length ? 1 : 0;
