// scripts/v2/touchgrass-shots.js — Touch Grass E1 shot sheet: the middle frame of every shot rendered by engine/episode.js,
// labelled with the BEATS shot id → review/touchgrass/shots-390.png (cells 390 px wide unless --w), plus page errors.
//   node scripts/v2/touchgrass-shots.js [--spec stories/touchgrass/episode.json] [--w 390] [--only 01,02] [--at mid|first|last] [--out f.png] [--probe]
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const specPath = arg('spec', 'stories/touchgrass/episode.json'), spec = JSON.parse(readFileSync(specPath, 'utf8')), shots = layoutShots(spec);
const w = +arg('w', 390), h = Math.round(w * 16 / 9), only = arg('only', null)?.split(','), where = arg('at', 'mid'), raw = 'renders/touchgrass-shots';
const out = arg('out', 'review/touchgrass/shots-390.png');
await mkdir(raw, {recursive: true});
const server = await startServer(), browser = await launch(), cells = [];
try {
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 300000});
  if (errs.length) console.error('page:', errs.slice(0, 6));
  for (const s of shots) {
    if (only && !only.some(o => s.id.startsWith(o))) continue;
    const n = where === 'first' ? s.start : where === 'last' ? s.start + s.frames - 1 : s.start + Math.floor(s.frames / 2);
    const url = await page.evaluate(([n, w, h]) => { window.__episode.renderFrame(n, w, h); return document.querySelector('canvas').toDataURL('image/png'); }, [n, w, h]);
    const f = `${raw}/${s.id}.png`; await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); cells.push({f, label: `${s.id.split('-')[0]} ${(n / spec.fps).toFixed(2)}s ${s.size}`});
  }
  if (argv.includes('--probe')) console.log(JSON.stringify(await page.evaluate(() => window.__tgSun ?? null)));
} finally { await browser.close(); await server.close(); }
const cols = Math.min(cells.length, +arg('cols', 10));
console.log(execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
cells, cols, dst = json.loads(sys.argv[1]), int(sys.argv[2]), sys.argv[3]; f = ImageFont.load_default(size=max(11, int(sys.argv[4]) // 22))
ims = [Image.open(c['f']).convert('RGB') for c in cells]; cw, ch0 = ims[0].size; ch = ch0 + f.size + 6; rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (cols * cw, rows * ch), '#16171a'); d = ImageDraw.Draw(s)
for k, (c, im) in enumerate(zip(cells, ims)):
    x, y = (k % cols) * cw, (k // cols) * ch; s.paste(im, (x, y + f.size + 6)); d.text((x + 3, y + 2), c['label'], fill='#ffd84a', font=f)
s.save(dst); print(dst, s.size)`, JSON.stringify(cells), String(cols), out, String(w)], {encoding: 'utf8'}).trim());
