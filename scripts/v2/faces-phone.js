// scripts/v2/faces-phone.js — Faces v3 at phone size: twelve presets on troupe bodies at medium size, two per 390 × 693 cell
// (heads ≈ 60 px, the size the face gates use). → review/season1/faces-phone-390.png
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {resolveTroupe} from '../../engine/troupe.js';

const out = 'review/season1', raw = 'renders/v2/faces-phone';
await mkdir(raw, {recursive: true});
const troupe = JSON.parse(await readFile('cast/troupe.json', 'utf8'));
const cast = {cast: {lead: resolveTroupe({troupe: 'LEAD'}, troupe), second: resolveTroupe({troupe: 'SECOND'}, troupe), rival: resolveTroupe({troupe: 'RIVAL'}, troupe),
  little: resolveTroupe({troupe: 'LITTLE'}, troupe), elder: resolveTroupe({troupe: 'ELDER'}, troupe),
  mom: {tier: 'hero', build: 'adult_f', age: 36, skin: '#8d5a3b', face: 'g_lips', faceStyle: 'v3', hair: {style: 'long_layered', color: '#2a1a12', v: 4}, outfit: {recipe: 'tee', main: '#2e9e78', accent: '#ffffff', legs: '#4a5a80', trim: '#f2b632'}}}};
for (const c of Object.values(cast.cast)) c.tag = null;
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));
const PAIRS = [['lead', 'laugh', 'second', 'g_glossy'], ['rival', 'smug', 'little', 'shock'], ['second', 'g_teary', 'lead', 'determined'], ['elder', 'elder_glasses', 'mom', 'g_lips'],
  ['lead', 'terrified', 'rival', 'angry'], ['little', 'love', 'second', 'sheepish']];
const cell = ([a, fa, b, fb]) => ({actors: [{id: a, at: [-1.45, 0, 0], yaw: 8, pose: 'idle', t: .3, face: fa, tag: false}, {id: b, at: [1.45, 0, .2], yaw: -8, pose: 'idle', t: .5, face: fb, tag: false}],
  camera: {position: [0, 3.6, 12.5], target: [0, 3.2, 0], fov: 34}});
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const files = [];
  for (const [k, p] of PAIRS.entries()) { await page.evaluate(([c]) => window.__studio.render(c, 390, 693), [cell(p)]);
    const f = `${raw}/${k}.png`; await writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); files.push({f, label: `${p[1]} · ${p[3]}`}); }
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
F = json.loads(sys.argv[1]); f = ImageFont.load_default(size=16); W, H = 390, 693
s = Image.new('RGB', (W * 3, 2 * (H + 24)), '#111'); d = ImageDraw.Draw(s)
for k, it in enumerate(F): x, y = (k % 3) * W, (k // 3) * (H + 24); d.text((x + 6, y + 4), it['label'], fill='#ffd84a', font=f); s.paste(Image.open(it['f']).convert('RGB'), (x, y + 24))
s.save(sys.argv[2]); print(s.size)`, JSON.stringify(files), out + '/faces-phone-390.png'], {stdio: 'inherit'});
} finally { await browser.close(); await server.close(); }
