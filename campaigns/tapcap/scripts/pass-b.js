// campaigns/tapcap/scripts/pass-b.js — Pass B gate: 6 Slime Town stills (Box street, Core Row, Trade Corner, hill wide, plinth close,
// rain-night hill) + measured checks (crowd size/mix/loops, sign cap height ≥ 3 % where a sign is in frame, mood luma gates from
// engine/moods7.json) → <ep>/qa/world.json (committed) + <ep>/review/pass-b/pass-b-sheet.png (gitignored).
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';

const ep = 'campaigns/tapcap/ep01-rarity', out = `${ep}/review/pass-b`, P = `${out}/panels`; mkdirSync(P, {recursive: true});
const STILLS = [['boxStreet', 'dawnHope', 'Box street'], ['coreRow', 'dawnHope', 'Core Row'], ['trade', 'dawnHope', 'Trade Corner'],
  ['hillWide', 'dawnHope', 'Top Shelf Hill wide'], ['plinthClose', 'dawnHope', 'plinth close (empty)'], ['rainHill', 'rainNight', 'rain-night hill']];
const server = await startServer(), browser = await launch(), res = [];
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text().slice(0, 300)); });
  await page.goto(`${server.url}/campaigns/tapcap/world/world.html`); await page.waitForFunction(() => window.__ready, null, {timeout: 120000});
  for (const [cam, mood, label] of STILLS) {
    const r = await page.evaluate(o => window.__w.still(o), {cam, mood, w: 540, h: 960}); if (errs.length) throw Error(errs.join('; '));
    const f = `${P}/${cam}.png`; writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64'));
    if (r.tilt) execFileSync('python3', ['campaigns/tapcap/scripts/tiltshift.py', f]);
    res.push({cam, mood, label, feature: r.feature, signs: r.signs.filter(s => s.inFrame), crowd: r.crowd});
  }
} finally { await browser.close(); await server.close(); }
const lum = JSON.parse(execFileSync('python3', ['campaigns/tapcap/scripts/measure-b.py', P, ...res.map(r => r.cam)], {encoding: 'utf8'}));
const M7 = JSON.parse(readFileSync('engine/moods7.json', 'utf8')), base = {dawnHope: 'dawnHope', rainNight: 'nightMystery'};
const crowd = res[0].crowd, checks = {
  crowdSize: {pass: crowd.n >= 20 && crowd.n <= 40, n: crowd.n},
  crowdMix: {pass: crowd.presets.some(p => ['pumpkin', 'strawberry', 'coffee'].includes(p)) && !crowd.presets.includes('cosmic'), rares: crowd.presets.filter(p => ['pumpkin', 'strawberry', 'coffee'].includes(p)).length},
  loops: {pass: ['sway', 'hop', 'tap'].every(l => crowd.loops.includes(l)), counts: Object.fromEntries(['sway', 'hop', 'tap'].map(l => [l, crowd.loops.filter(x => x === l).length]))},
  // the sign a still is about must read on a phone (cap ≥ 3 % of frame height, R-SIGN-01); background signs are reported, not gated
  signs: res.flatMap(r => r.signs.map(s => ({still: r.cam, ...s, featured: s.text === r.feature, pass: s.text !== r.feature || s.capFrac >= .03}))),
  featured: res.filter(r => r.feature).map(r => { const s = r.signs.find(x => x.text === r.feature); return {still: r.cam, text: r.feature, capFrac: s?.capFrac ?? 0, pass: (s?.capFrac ?? 0) >= .03}; }),
  luma: res.map(r => { const g = M7[base[r.mood]].gate.luma, v = lum[r.cam].luma; return {still: r.cam, mood: r.mood, luma: v, gate: g, pass: v >= g[0] && v <= g[1]}; }),
};
writeFileSync(`${ep}/qa/world.json`, JSON.stringify({stills: res.map(({cam, mood, label}) => ({cam, mood, label})), checks}, null, 1) + '\n');
writeFileSync(`${out}/stills.json`, JSON.stringify({res, checks}));
console.log(JSON.stringify(checks));
execFileSync('python3', ['campaigns/tapcap/scripts/sheet-b.py'], {stdio: 'inherit'});
