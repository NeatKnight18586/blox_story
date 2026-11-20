// scripts/v2/faces6-sheet.js — P2 Faces v6 review sheets on the R15 hero (cast/hero6.json HERO, faceStyle v6) → review/faces6/:
//   sheet.png      the 24 faces, large, on the yellow hero head (close-up)
//   phone-390.png  8 key faces (smile, grin, laugh, shock, cry, determined, awe, scheme): the 390 px close shot and medium shot,
//                  heads cropped 1:1 (true phone pixels)
//   talk.png       both talk sets (standard on `neutral`, grin on `smile`) × closed, small, open, wide
//   ab.png         faces5 vs faces6 for the same 8 expressions (close shot, 1:1)
//   node scripts/v2/faces6-sheet.js
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {FACE_NAMES6} from '../../avatar-style/faces6.js';
import {SHOTS5} from '../../avatar-style/faces5.js';

const out = 'review/faces6', raw = 'renders/faces6';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const h6 = JSON.parse(await readFile('cast/hero6.json', 'utf8'));
await writeFile(`${raw}/cast.json`, JSON.stringify({cast: {B6: {...h6.HERO, faceStyle: 'v6'}, B5: h6.HERO}}));
export const KEY8 = ['smile', 'grin', 'laugh', 'shock', 'cry', 'determined', 'awe', 'scheme'];
const V5 = {smile: 'smile', grin: 'grin', laugh: 'laugh_xd', shock: 'shock', cry: 'cry', determined: 'flat_brows', awe: 'sparkle', scheme: 'hero_scheme'};   // faces5 nearest (its own alias map)
const HY = 4.66;   // head centre (world) of the adult v6 hero in the ref stance
const head = (id, face, d, fov = 35, extra = {}) => ({actors: [{id, at: [0, 0, 0], yaw: 0, pose: 'ref6', face, ...extra}], camera: {position: [0, HY, d], target: [0, HY, 0], fov}});
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 400, height: 400}}); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/hero6.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__hero6, null, {timeout: 120000});
  const grab = async (cell, w, h, f) => { const url = await page.evaluate(([c, w, h]) => window.__hero6.render(c, w, h, 'studio'), [cell, w, h]); await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); };
  for (const n of FACE_NAMES6) await grab(head('B6', n, 3.0, 30), 520, 520, `${raw}/big-${n}.png`);
  for (const n of KEY8) { for (const [k, s] of Object.entries(SHOTS5)) await grab(head('B6', n, s.d, s.fov), 390, 693, `${raw}/phone-${k}-${n}.png`); await grab(head('B5', V5[n], SHOTS5.close.d, 35), 390, 693, `${raw}/v5-${n}.png`); }
  for (const [set, face] of [['standard', 'neutral'], ['grin', 'smile']]) for (const t of [0, 1, 2, 3]) await grab(head('B6', face, 3.0, 30, {talk: t}), 520, 520, `${raw}/talk-${set}-${t}.png`);
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
raw, out = sys.argv[1], sys.argv[2]; names, key8, v5 = json.loads(sys.argv[3]), json.loads(sys.argv[4]), json.loads(sys.argv[5])
f = ImageFont.load_default(size=16); BG = '#1b1d21'; Y = '#ffd84a'
c = 260; s = Image.new('RGB', (6 * c, 4 * (c + 24)), BG); d = ImageDraw.Draw(s)
for i, n in enumerate(names):
    x, y = (i % 6) * c, (i // 6) * (c + 24); s.paste(Image.open(f'{raw}/big-{n}.png').convert('RGB').resize((c, c), Image.LANCZOS), (x, y + 24)); d.text((x + 6, y + 4), n, fill=Y, font=f)
s.save(out + '/sheet.png')
def crop(p, half):   # true phone pixels: a 1:1 crop around the frame centre (the head)
    im = Image.open(p).convert('RGB'); cx, cy = im.width // 2, im.height // 2; return im.crop((cx - half, cy - half, cx + half, cy + half))
c = 195; s = Image.new('RGB', (8 * c, 2 * (c + 24) + 24), BG); d = ImageDraw.Draw(s)
for i, n in enumerate(key8):
    for j, k in enumerate(['close', 'medium']):
        x, y = i * c, j * (c + 24); s.paste(crop(f'{raw}/phone-{k}-{n}.png', c // 2), (x, y + 24)); d.text((x + 4, y + 4), f'{n} · {k}', fill=Y, font=f)
d.text((6, s.height - 20), 'v6 faces on the R15 hero at 390 px phone width (1:1 crops; close d 5, medium d 7, fov 35)', fill='#cccccc', font=f); s.save(out + '/phone-390.png')
c = 390; s = Image.new('RGB', (4 * c, 2 * (c + 24)), BG); d = ImageDraw.Draw(s)
for j, (st, face) in enumerate([('standard', 'neutral'), ('grin', 'smile')]):
    for t, lab in enumerate(['closed', 'small', 'open', 'wide']):
        x, y = t * c, j * (c + 24); s.paste(Image.open(f'{raw}/talk-{st}-{t}.png').convert('RGB').resize((c, c), Image.LANCZOS), (x, y + 24)); d.text((x + 6, y + 4), f'{st} talk ({face}) · {lab}', fill=Y, font=f)
s.save(out + '/talk.png')
c = 195; s = Image.new('RGB', (8 * c, 2 * (c + 24)), BG); d = ImageDraw.Draw(s)
for i, n in enumerate(key8):
    for j, (p, lab) in enumerate([(f'{raw}/v5-{n}.png', 'v5 ' + v5[n]), (f'{raw}/phone-close-{n}.png', 'v6 ' + n)]):
        x, y = i * c, j * (c + 24); s.paste(crop(p, c // 2), (x, y + 24)); d.text((x + 4, y + 4), lab, fill=Y, font=f)
s.save(out + '/ab.png')
for p in ['sheet', 'phone-390', 'talk', 'ab']: print(p, Image.open(f'{out}/{p}.png').size)
`, raw, out, JSON.stringify(FACE_NAMES6), JSON.stringify(KEY8), JSON.stringify(V5)], {stdio: 'inherit'});
