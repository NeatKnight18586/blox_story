// scripts/v2/r6-sheet.js — R6 rig key-pose sheet → review/r6/verbs.png (≤ 1600 px) + verbs-390.png (390 px phone width): the 24 acting6 verbs at their KEY on HERO, LITTLE and ADULT_F (hourglass). Raw cells in renders/r6/ (never committed).
//   node scripts/v2/r6-sheet.js
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {VERB_NAMES, VERBS, timing} from '../../engine/acting6.js';

const out = 'review/r6', raw = 'renders/r6', CW = 400, CH = 266;
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const server = await startServer(), browser = await launch(), errors = [];
try {
  const page = await browser.newPage({viewport: {width: 400, height: 400}}); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/r6.html`); await page.waitForFunction(() => window.__r6, null, {timeout: 120000});
  for (const n of VERB_NAMES) { const url = await page.evaluate(([n, t, w, h]) => window.__r6.render({name: n, t, w, h}), [n, timing(VERBS[n]).key, CW, CH]); await writeFile(`${raw}/key-${n}.png`, Buffer.from(url.split(',')[1], 'base64')); }
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
raw, out, rows = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]); CW, CH = 400, 266
f = ImageFont.load_default(size=15)
s = Image.new('RGB', (4 * CW, 6 * CH), '#1b1d21'); d = ImageDraw.Draw(s)
for i, n in enumerate(rows):
    x, y = (i % 4) * CW, (i // 4) * CH; s.paste(Image.open(f'{raw}/key-{n}.png').convert('RGB'), (x, y)); d.text((x + 8, y + 6), n.replace('_', ' '), fill='#ffd84a', font=f)
s.save(out + '/verbs.png')
p = Image.new('RGB', (390, 12 * 130), '#1b1d21'); q = ImageDraw.Draw(p); fs = ImageFont.load_default(size=11)
for i, n in enumerate(rows):
    x, y = (i % 2) * 195, (i // 2) * 130; p.paste(Image.open(f'{raw}/key-{n}.png').convert('RGB').resize((195, 130), Image.LANCZOS), (x, y)); q.text((x + 4, y + 3), n.replace('_', ' '), fill='#ffd84a', font=fs)
p.save(out + '/verbs-390.png')
`, raw, out, JSON.stringify(VERB_NAMES)]);
console.log(JSON.stringify({verbs: VERB_NAMES.length, sheet: `${out}/verbs.png`, phone: `${out}/verbs-390.png`}));
