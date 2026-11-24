// scripts/v2/beast-sheet.js — tuft 2A BEAST KIT look-dev sheet → review/beasts/kit.png (≤ 1600 px), kit-390.png, demo.mp4.
//   kit.png  row 1: turnaround (front ¾, side, back ¾) of NIGHTFANG, VOLT, CINDER, BOULDER at night, post 'cine', beside an R6 kid
//            row 2: a state strip per beast (idle, run | fly, roar, flinch, flee)   row 3: the 40-beast parade at dawn + BLINK orbiting LITTLE
//   kit-390.png  the four side views as 9:16 phone frames, 2 × 2 at 390 px width (the silhouette read)
//   demo.mp4  540×960, each hero 2 states (engine/fixtures/beasts/demo.json) then the parade wide (parade.json), ≤ 5 MB
// Fixtures: node scripts/v2/beast-fixtures.js. Usage: node scripts/v2/beast-sheet.js [--no-demo]
import {mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const out = 'review/beasts', raw = 'renders/beasts'; mkdirSync(out, {recursive: true}); mkdirSync(raw, {recursive: true});
const picks = JSON.parse(readFileSync('engine/fixtures/beasts/kit-picks.json', 'utf8')), demo = !process.argv.includes('--no-demo');
const server = await startServer(process.cwd()), browser = await launch(), errors = [];
async function open(spec) { const page = await browser.newPage(); page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000}); return page; }
const shot = async (page, f, w, h, file) => { const url = await page.evaluate(([f, w, h]) => { const E = window.__episode; E.renderFrame(f, w, h); return E.debug.renderer.domElement.toDataURL('image/png'); }, [f, w, h]);
  writeFileSync(`${raw}/${file}`, Buffer.from(url.split(',')[1], 'base64')); };
const R1 = [266, 210], R2 = [320, 200], R3 = [800, 380], PH = [195, 347];
try {
  const kit = await open('engine/fixtures/beasts/kit.json');
  for (const [i, p] of picks.entries()) await shot(kit, p.frame, ...(p.row === 1 ? R1 : R2), `kit-${i}.png`);
  for (const [i, p] of picks.filter(p => p.row === 1 && p.label === 'side').entries()) await shot(kit, p.frame, ...PH, `phone-${i}.png`);
  await kit.close();
  const par = await open('engine/fixtures/beasts/parade.json');
  await shot(par, 40, ...R3, 'parade.png'); await shot(par, 72 + 30, ...R3, 'blink.png');
  if (demo) { rmSync(`${raw}/demo`, {recursive: true, force: true}); mkdirSync(`${raw}/demo`, {recursive: true});
    const F = await par.evaluate(() => window.__episode.FRAMES); let k = 0;
    const dm = await open('engine/fixtures/beasts/demo.json'), DF = await dm.evaluate(() => window.__episode.FRAMES);
    for (let f = 0; f < DF; f++) await shot(dm, f, 540, 960, `demo/f-${String(k++).padStart(4, '0')}.png`);
    for (let f = 0; f < Math.min(72, F); f++) await shot(par, f, 540, 960, `demo/f-${String(k++).padStart(4, '0')}.png`);
    await dm.close(); }
  await par.close();
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
raw, out, picks = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
f = ImageFont.load_default(size=13); fb = ImageFont.load_default(size=15)
W = 1600; r1 = [p for p in picks if p['row'] == 1]; r2 = [p for p in picks if p['row'] == 2]
H = 2 * 210 + 4 * 200 + 380
s = Image.new('RGB', (W, H), '#15171b'); d = ImageDraw.Draw(s)
for i, p in enumerate(r1):
    x, y = (i % 6) * 266, (i // 6) * 210; s.paste(Image.open(f"{raw}/kit-{picks.index(p)}.png").convert('RGB'), (x, y)); d.text((x + 6, y + 4), p['beast'] + ' · ' + p['label'], fill='#f2f2f2', font=f)
for i, p in enumerate(r2):
    x, y = (i % 5) * 320, 420 + (i // 5) * 200; s.paste(Image.open(f"{raw}/kit-{picks.index(p)}.png").convert('RGB'), (x, y)); d.text((x + 6, y + 4), p['beast'] + ' · ' + p['label'], fill='#f2f2f2', font=f)
y3 = 420 + 800
s.paste(Image.open(f'{raw}/parade.png').convert('RGB'), (0, y3)); d.text((6, y3 + 4), 'parade · 40 low-tier (FOX / DEER / BOAR) · dawn', fill='#f2f2f2', font=fb)
s.paste(Image.open(f'{raw}/blink.png').convert('RGB'), (800, y3)); d.text((806, y3 + 4), 'BLINK orbiting LITTLE', fill='#f2f2f2', font=fb)
s.save(out + '/kit.png')
p = Image.new('RGB', (390, 2 * 347), '#15171b'); q = ImageDraw.Draw(p)
names = [x['beast'] for x in r1 if x['label'] == 'side']
for i, n in enumerate(names):
    x, y = (i % 2) * 195, (i // 2) * 347; p.paste(Image.open(f'{raw}/phone-{i}.png').convert('RGB'), (x, y)); q.text((x + 4, y + 3), n, fill='#f2f2f2', font=ImageFont.load_default(size=11))
p.save(out + '/kit-390.png')
print(s.size, p.size)
`, raw, out, JSON.stringify(picks)], {stdio: 'inherit'});
if (demo) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', `${raw}/demo/f-%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', `${out}/demo.mp4`]);
  console.log('demo', (readFileSync(`${out}/demo.mp4`).length / 1e6).toFixed(2), 'MB'); }
