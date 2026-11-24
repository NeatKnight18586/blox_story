// scripts/v2/kit2-sheet.js — tuft 2B: ONE sheet + phone read + demo → review/beasts/kit2.png (≤ 1600 px), kit2-390.png, demo2.mp4.
//   row 1  before / after Task 0 (the 2A kit fixture, same 4 frames; renders/kit2/look-*.png from `kit2-gates.js --only look`)
//   row 2  NIGHTFANG, VOLT, BOULDER, BLINK fixed — low heroic moving cine cameras, day and night (engine/fixtures/beasts2/heroes-*.json)
//   row 3  TUFT: hook ECU, idle, tremble, sneeze, run, hood ride + puff ball / room / colossal + hero ball (tuft.json)
//   row 4  TITAN caged / roar / chains snap / stomp + titanCave eyes + cyanFire, lightning, fly, NIGHTFANG breath, lantern sea
//   demo2.mp4  540×960, 24 fps, beasts + FX on ones, moving cine cameras, ~15 s, ≤ 6 MB.   Usage: node scripts/v2/kit2-sheet.js [--no-demo]
import {mkdirSync, writeFileSync, readFileSync, rmSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const out = 'review/beasts', raw = 'renders/kit2/sheet'; mkdirSync(out, {recursive: true}); rmSync(raw, {recursive: true, force: true}); mkdirSync(raw, {recursive: true});
const picks = JSON.parse(readFileSync('engine/fixtures/beasts2/picks.json', 'utf8')), F = 'engine/fixtures/beasts2/';
const server = await startServer(process.cwd()), browser = await launch(), errors = [];
async function open(spec) { const page = await browser.newPage(); page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000}).catch(e => { throw Error(errors.join('\n') || e.message); }); return page; }
const shot = async (page, f, w, h, file) => { const url = await page.evaluate(([f, w, h]) => { const E = window.__episode; E.renderFrame(f, w, h); return E.debug.renderer.domElement.toDataURL('image/png'); }, [f, w, h]); writeFileSync(`${raw}/${file}`, Buffer.from(url.split(',')[1], 'base64')); return file; };
const tiles = {r2: [], r3: [], r4: [], phone: []}, pk = (set, label, look) => picks.find(p => p.set === set && p.label === label && (!look || p.look === look)) ?? picks.find(p => p.set === set && p.beast === label && (!look || p.look === look));
try {
  for (const look of ['day', 'night']) { const p = await open(F + `heroes-${look}.json`); for (const b of ['NIGHTFANG', 'VOLT', 'BOULDER', 'BLINK']) { const q = pk('heroes', b, look); tiles.r2.push({f: await shot(p, q.frame, 400, 711, `h-${look}-${b}.png`), label: `${b} · ${look}`}); }
    if (look === 'night') tiles.phone.push({f: await shot(p, pk('heroes', 'NIGHTFANG', 'night').frame, 390, 693, 'ph-nf.png'), label: 'NIGHTFANG'}); await p.close(); }
  { const p = await open(F + 'tuft.json'); for (const l of ['hook', 'idle', 'tremble', 'sneeze', 'run', 'hood', 'puff ball', 'puff room', 'puff colossal', 'hero ball']) tiles.r3.push({f: await shot(p, pk('tuft', l).frame, 320, 569, `t-${l.replace(/ /g, '_')}.png`), label: l === 'hook' ? 'TUFT hook (frame 0)' : l});
    tiles.phone.unshift({f: await shot(p, 0, 390, 693, 'ph-hook.png'), label: 'TUFT hook'}); tiles.phone.push({f: await shot(p, pk('tuft', 'puff colossal').frame, 390, 693, 'ph-col.png'), label: 'TUFT colossal'}); await p.close(); }
  { const p = await open(F + 'titan.json'); for (const l of ['caged', 'roar', 'chains snap', 'stomp']) tiles.r4.push({f: await shot(p, pk('titan', l).frame, 320, 569, `ti-${l.replace(/ /g, '_')}.png`), label: `TITAN ${l}`});
    tiles.phone.push({f: await shot(p, pk('titan', 'stomp').frame, 390, 693, 'ph-titan.png'), label: 'TITAN stomp'}); await p.close(); }
  { const p = await open(F + 'titancave.json'); tiles.r4.push({f: await shot(p, 40, 320, 569, 'cave.png'), label: 'titanCave eyes'}); await p.close(); }
  { const p = await open(F + 'powers.json'); for (const l of ['cyanFire', 'lightning', 'fly', 'breathe', 'lanternSea']) tiles.r4.push({f: await shot(p, pk('powers', l).frame, 320, 569, `pw-${l}.png`), label: l === 'breathe' ? 'NIGHTFANG breath' : l}); await p.close(); }
  // demo: the moving shots, beasts + FX on ones
  if (!process.argv.includes('--no-demo')) { mkdirSync(`${raw}/demo`, {recursive: true}); let k = 0;
    const plan = [['heroes-night', 0, 60], ['heroes-night', 60, 120], ['tuft', 0, 30], ['tuft', 54, 84], ['tuft', 258, 306], ['tuft', 318, 354], ['titan', 108, 168], ['powers', 0, 48], ['powers', 48, 72]];
    let cur = null, page = null; for (const [spec, a, b] of plan) { if (cur !== spec) { await page?.close(); page = await open(F + spec + '.json'); cur = spec; }
      for (let f = a; f < b; f++) { const url = await page.evaluate(([f]) => { const E = window.__episode; E.renderFrame(f, 540, 960); return E.debug.renderer.domElement.toDataURL('image/jpeg', .92); }, [f]); writeFileSync(`${raw}/demo/f-${String(k++).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64')); } }
    await page?.close(); }
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
const look = [48, 234, 400, 600].flatMap(f => [{f: `../look-before-${f}.png`, label: `before · ${f}`}, {f: `../look-after-${f}.png`, label: `after · ${f}`}]);
execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
raw, out, T = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
f = ImageFont.load_default(size=13); W = 1600
rows = [('1 · Task 0 look: before / after (2A kit, same frames)', T['look'], 8), ('2 · fixed beasts, low heroic moving cameras: day / night', T['r2'], 8), ('3 · TUFT states + puff ball / room / colossal + hero ball', T['r3'], 10), ('4 · TITAN + titanCave + powers + lantern sea', T['r4'], 10)]
hs = [int(W / n * 16 / 9) for _, _, n in rows]; H = sum(hs) + 22 * len(rows)
s = Image.new('RGB', (W, H), '#14161a'); d = ImageDraw.Draw(s); y = 0
for (title, tl, n), h in zip(rows, hs):
    d.text((6, y + 4), title, fill='#f0f0f0', font=f); y += 22; w = W // n
    for i, t in enumerate(tl[:n]):
        im = Image.open(raw + '/' + t['f']).convert('RGB').resize((w, h)); s.paste(im, (i * w, y)); d.rectangle([i * w, y, i * w + len(t['label']) * 7 + 8, y + 16], fill='#000000'); d.text((i * w + 4, y + 2), t['label'], fill='#ffffff', font=f)
    y += h
s.save(out + '/kit2.png'); print('kit2.png', s.size)
p = Image.new('RGB', (390, 2 * 347), '#14161a'); q = ImageDraw.Draw(p)
for i, t in enumerate(T['phone'][:4]):
    x, yy = (i % 2) * 195, (i // 2) * 347; p.paste(Image.open(raw + '/' + t['f']).convert('RGB').resize((195, 347)), (x, yy)); q.text((x + 4, yy + 3), t['label'], fill='#ffffff', font=ImageFont.load_default(size=11))
p.save(out + '/kit2-390.png'); print('kit2-390.png', p.size)
`, raw, out, JSON.stringify({...tiles, look})], {stdio: 'inherit'});
if (!process.argv.includes('--no-demo')) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', `${raw}/demo/f-%04d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', `${out}/demo2.mp4`]);
  console.log('demo2.mp4', (statSync(`${out}/demo2.mp4`).size / 1e6).toFixed(2), 'MB'); }
