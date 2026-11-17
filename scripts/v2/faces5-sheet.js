// scripts/v2/faces5-sheet.js — Faces v5 at phone size: the hero, Mo and Pip (Toy House cast, Actor v5) at the 390 px close shot,
// six faces (two each), heads cropped 1:1 (true phone pixels) → review/v4/faces5-390.png
//   node scripts/v2/faces5-sheet.js [--out review/v4]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {SHOTS5} from '../../avatar-style/faces5.js';

const argv = process.argv.slice(2), out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'review/v4', raw = 'renders/v4/faces5-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const toy = JSON.parse(await readFile('cast/toyhouse.json', 'utf8'));
await writeFile(`${raw}/cast.json`, JSON.stringify({cast: {HERO: toy.cast.HERO, MO: toy.cast.MO, PIP: toy.cast.PIP}}));
const CELLS = [['HERO', 'hero_wink'], ['HERO', 'shock'], ['MO', 'grin'], ['MO', 'worried'], ['PIP', 'content'], ['PIP', 'side_eye_frown']];
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}}); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const files = [], d = SHOTS5.close.d, cell = (id, face, ty) => ({actors: [{id, at: [0, 0, 0], pose: 'idle', t: .3, face, tag: false}], camera: {position: [0, ty, d], target: [0, ty, 0], fov: 35}});
  for (const [k, [id, face]] of CELLS.entries()) {
    await page.evaluate(([c]) => window.__studio.render(c, 390, 693), [cell(id, face, 4)]);
    const hy = (await page.evaluate(id => window.__studio.headWorld(id)[1], id)) + .5 * (toy.cast[id].scale ?? 1);   // pivot = neck; head centre half a head up
    await page.evaluate(([c]) => window.__studio.render(c, 390, 693), [cell(id, face, hy)]);   // head centred on the camera axis
    const f = `${raw}/${k}.png`; await writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); files.push({f, label: `${id} · ${face}`});
  }
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
F = json.loads(sys.argv[1]); f = ImageFont.load_default(size=15); cw = 260
s = Image.new('RGB', (3 * cw, 2 * (cw + 22)), '#1b1d21'); d = ImageDraw.Draw(s)
for k, it in enumerate(F):
    x, y = (k // 2) * cw, (k % 2) * (cw + 22); im = Image.open(it['f']).convert('RGB'); cy = im.height // 2
    s.paste(im.crop((65, cy - 130, 325, cy + 130)), (x, y + 22)); d.text((x + 4, y + 3), it['label'] + ' · close 390 px', fill='#ffd84a', font=f)
s.save(sys.argv[2]); print(s.size)`, JSON.stringify(files), out + '/faces5-390.png'], {stdio: 'inherit'});
} finally { await browser.close(); await server.close(); }
