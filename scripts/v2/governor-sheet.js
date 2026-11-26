// scripts/v2/governor-sheet.js — Phase 1F: THE GOVERNOR's review cells (engine/governor.html): turntable (front, ¾, side, back),
// the 4 faces as head close-ups, and the 3 acts at their key frame. Cells → <out>/cells/*.png; compose with
//   python3 scripts/v2/governor-sheet.py --dir <out> [--balcony <png>] --out review/city/1F-governor.png
//   node scripts/v2/governor-sheet.js [--out renders/governor]
import {mkdirSync, writeFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/governor'); mkdirSync(`${OUT}/cells`, {recursive: true});
const CELLS = [
  ...[['turn-front', 0], ['turn-3q', 35], ['turn-side', 90], ['turn-back', 180]].map(([n, yaw]) => ({n, yaw, w: 540, h: 960})),
  ...['gov_smug', 'gov_announce', 'gov_panic', 'gov_oops'].map(f => ({n: 'face-' + f, face: f, cam: 'head', w: 540, h: 540})),
  ...[['rope_pull', .9, 'gov_announce'], ['announce', .8, 'gov_announce'], ['panic_up', .7, 'gov_panic']].map(([act, t, face]) => ({n: 'act-' + act, act, t, face, yaw: 25, w: 540, h: 960})),
];
const server = await startServer(process.cwd()), browser = await launch();
try {
  const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error') console.error(m.text().slice(0, 300)); });
  await p.goto(`${server.url}/engine/governor.html`); await p.waitForFunction(() => window.__gov, null, {timeout: 120000});
  const tris = await p.evaluate(() => window.__gov.tris);
  for (const c of CELLS) { const url = await p.evaluate(o => window.__gov.render(o), c); writeFileSync(`${OUT}/cells/${c.n}.png`, Buffer.from(url.split(',')[1], 'base64')); }
  writeFileSync(`${OUT}/governor.json`, JSON.stringify({tris, cells: CELLS.map(c => c.n)}, null, 1)); console.log('governor tris', tris);
} finally { await browser.close(); server.close?.(); }
