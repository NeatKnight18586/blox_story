// scripts/v2/face-sheets.js — Faces v3 review sheets → review/season1/
//   node scripts/v2/face-sheets.js [--tag pass1] [--out review/season1]
//   faces-sheet.png (+ -2, -3): all presets, labelled, on light, tan and dark skin (one page per skin, ≤ 1600 px)
//   faces-vs-ref[-<tag>].png: one row per group, left a crop of the owner's reference sheet (style only), right ours, same size
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {PRESETS, PRESET_GROUPS} from '../../avatar-style/faces3.js';

const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const out = arg('--out', 'review/season1'), tag = arg('--tag', ''), raw = 'renders/v2/face-sheets';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const SKINS = {light: '#f6c9a0', tan: '#c08457', dark: '#5a3826'};
const server = await startServer(), browser = await launch();
const cells = [];
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/facepage.html`); await page.waitForFunction(() => window.__faces, null, {timeout: 60000});
  const shot = async (name, o, file) => { const d = await page.evaluate(([n, o]) => window.__faces.png(n, o), [name, o]); await writeFile(file, Buffer.from(d.split(',')[1], 'base64')); return file; };
  for (const [skin, col] of Object.entries(SKINS)) for (const n of Object.keys(PRESETS)) cells.push({skin, name: n, file: await shot(n, {px: 150, skin: col, tier: 'mid'}, `${raw}/${skin}-${n}.png`)});
  const groups = {};
  for (const [gname, list] of Object.entries(PRESET_GROUPS)) { groups[gname] = []; for (const n of list) groups[gname].push(await shot(n, {px: 96, skin: SKINS.light, tier: 'mid', bg: '#e8eaee'}, `${raw}/ref-${n}.png`)); }
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
cells, groups, out, tag = json.loads(sys.argv[1]), json.loads(sys.argv[2]), sys.argv[3], sys.argv[4]
f = ImageFont.load_default(size=14); F = ImageFont.load_default(size=16)
# faces-sheet: one page per skin, 8 columns
for k, skin in enumerate(['light', 'tan', 'dark']):
    cs = [c for c in cells if c['skin'] == skin]; cols = 8; cw, ch = 196, 196; rows = (len(cs) + cols - 1) // cols
    s = Image.new('RGB', (cols * cw, rows * ch + 30), '#1a1c20'); d = ImageDraw.Draw(s); d.text((8, 6), f'Faces v3 presets on {skin} skin', fill='#ffd84a', font=F)
    for i, c in enumerate(cs):
        x, y = (i % cols) * cw, 30 + (i // cols) * ch; im = Image.open(c['file']).convert('RGB'); s.paste(im, (x + (cw - im.width) // 2, y + 4)); d.text((x + 6, y + ch - 20), c['name'], fill='#ffffff', font=f)
    s.save(f'{out}/faces-sheet' + ('' if k == 0 else f'-{k + 1}') + '.png')
# faces-vs-ref: one row per group; left a crop of the reference (style only), right ours at the same cell size
R = 'docs/season1/refs/faces/'
crops = {'base': (R + 'ref1-expressive-pack.jpg', (235, 230, 690, 300)), 'girl': (R + 'ref2-3d-faces.jpg', (40, 120, 565, 380)),
         'men': (R + 'ref3-heads.jpg', (430, 170, 862, 360)), 'reactions': (R + 'ref1-expressive-pack.jpg', (235, 15, 690, 175)), 'story': (R + 'ref2-3d-faces.jpg', (40, 385, 565, 650))}
H = 180; rows = []
for g, files in groups.items():
    src, box = crops[g]; ref = Image.open(src).convert('RGB').crop(box); ref = ref.resize((int(ref.width * H / ref.height), H))
    ours = [Image.open(p).convert('RGB') for p in files][:9]; cw = ours[0].width + 6
    row = Image.new('RGB', (min(1600, ref.width + 20 + cw * len(ours)), H + 26), '#1a1c20'); d = ImageDraw.Draw(row)
    d.text((6, 4), f'{g}: reference style (left) vs ours', fill='#ffd84a', font=F); row.paste(ref, (0, 26))
    for i, im in enumerate(ours):
        x = ref.width + 20 + i * cw
        if x + im.width > row.width: break
        row.paste(im, (x, 26 + (H - im.height) // 2))
    rows.append(row)
W = max(r.width for r in rows); s = Image.new('RGB', (W, sum(r.height for r in rows)), '#1a1c20'); y = 0
for r in rows: s.paste(r, (0, y)); y += r.height
s.save(f'{out}/faces-vs-ref' + (f'-{tag}' if tag else '') + '.png'); print(s.size)`, JSON.stringify(cells), JSON.stringify(groups), out, tag], {stdio: 'inherit'});
} finally { await browser.close(); await server.close(); }
