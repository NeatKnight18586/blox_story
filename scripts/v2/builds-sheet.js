// scripts/v2/builds-sheet.js — A5 Decision 5 review sheet: the four body builds side by side (front + three-quarter, full body)
// and a mom (adult_f) with Kit (youth) at medium size, every cell 390 × 693 (phone width). → review/season1/builds-390.png
//   node scripts/v2/builds-sheet.js [--out review/season1]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {resolveTroupe} from '../../engine/troupe.js';

const argv = process.argv.slice(2), out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'review/season1', raw = 'renders/v2/builds-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const troupe = JSON.parse(await readFile('cast/troupe.json', 'utf8'));
const cast = {cast: {
  adult_m: {tier: 'hero', build: 'adult_m', age: 38, skin: '#c08457', face: 'smile', hair: {style: 'side_part', color: '#3a2418', v: 4}, outfit: {recipe: 'tee', main: '#3f8fb0', accent: '#ffffff', legs: '#4a5a80', trim: '#e4574a'}},
  adult_f: {tier: 'hero', build: 'adult_f', age: 36, skin: '#f6c9a0', face: 'smile', hair: {style: 'wavy_bob', color: '#6b4428', v: 4}, outfit: {recipe: 'tee', main: '#e2733a', accent: '#ffffff', legs: '#4a5a80', trim: '#2f80d1'}},
  youth: {...resolveTroupe({troupe: 'LEAD'}, troupe), tag: null},
  elder_f: {tier: 'hero', build: 'elder_f', age: 72, skin: '#e0a77a', face: 'smile', hair: {style: 'messy_bun', color: '#c9c9c9', v: 4}, outfit: {recipe: 'hoodie', main: '#8a6be8', accent: '#ffffff', legs: '#7a6048', trim: '#f2d16b'}},
  mom: {tier: 'hero', build: 'adult_f', age: 39, skin: '#f6c9a0', face: 'smile', hair: {style: 'long_layered', color: '#7a4a2a', v: 4}, outfit: {recipe: 'tee', main: '#2e9e78', accent: '#ffffff', legs: '#4a5a80', trim: '#f2b632'}, tag: {name: 'Mom'}},
  kit: {...resolveTroupe({troupe: 'SECOND', role: 'Kit'}, troupe)},
}};
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));
const full = (id, az) => { const a = az * Math.PI / 180, d = 15; return {actors: [{id, at: [0, 0, 0], tag: false, pose: 'idle', t: .3}], camera: {position: [Math.sin(a) * d, 3.2, Math.cos(a) * d], target: [0, 2.75, 0], fov: 28}}; };
const pair = az => { const a = az * Math.PI / 180, d = 13.5; return {actors: [{id: 'mom', at: [-1.35, 0, 0], yaw: 8, pose: 'idle', t: .2}, {id: 'kit', at: [1.25, 0, .3], yaw: -10, pose: 'wave', t: .4}], camera: {position: [Math.sin(a) * d, 3.4, Math.cos(a) * d], target: [0, 3.0, 0], fov: 34}}; };
const CELLS = [['adult_m', 'front', full('adult_m', 0)], ['adult_f', 'front', full('adult_f', 0)], ['youth', 'front', full('youth', 0)], ['elder_f', 'front', full('elder_f', 0)], ['mom + Kit', 'medium front', pair(0)],
  ['adult_m', '3/4', full('adult_m', 38)], ['adult_f', '3/4', full('adult_f', 38)], ['youth', '3/4', full('youth', 38)], ['elder_f', '3/4', full('elder_f', 38)], ['mom + Kit', 'medium 3/4', pair(30)]];
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const files = [];
  for (const [k, [id, view, cell]] of CELLS.entries()) { await page.evaluate(([c]) => window.__studio.render(c, 390, 693), [cell]);
    const f = `${raw}/${k}.png`; await writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); files.push({f, label: `${id} · ${view}`}); }
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
F = json.loads(sys.argv[1]); f = ImageFont.load_default(size=16); W, H = 390, 693
s = Image.new('RGB', (W * 5, 2 * (H + 22)), '#111'); d = ImageDraw.Draw(s)
for k, it in enumerate(F): x, y = (k % 5) * W, (k // 5) * (H + 22); d.text((x + 6, y + 3), it['label'], fill='#ffd84a', font=f); s.paste(Image.open(it['f']).convert('RGB'), (x, y + 22))
s.save(sys.argv[2]); print(s.size)`, JSON.stringify(files), out + '/builds-390.png'], {stdio: 'inherit'});
} finally { await browser.close(); await server.close(); }
