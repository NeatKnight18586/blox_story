// scripts/v2/look-ab4.js — format v4 Phase 2 sheet: review/v4/look-ab-390.png. The v4look fixture, today vs v4, comedy and
// mystery, wide + medium frames at 1080×1920, graded exactly as assemble.py grades a final (A2 grade; + the preset LUT and
// light vignette for v4 specs), shown at 390 px phone width.   node scripts/v2/look-ab4.js
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
const specs = ['comedy-today', 'comedy-v4', 'mystery-today', 'mystery-v4'], frames = [30, 90], raw = 'renders/v4/look-ab';
await mkdir(raw, {recursive: true}); await mkdir('review/v4', {recursive: true});
const server = await startServer(), browser = await launch();
try {
  for (const s of specs) {
    const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(`engine/fixtures/v4look/${s}.json`)}`);
    await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 300000});
    if (errs.length) throw Error(s + ': ' + errs.join('; '));
    for (const f of frames) {
      await page.evaluate(n => window.__episode.renderFrame(n, 1080, 1920), f);
      await writeFile(`${raw}/${s}-${f}.png`, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64'));
    }
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['-c', `
import sys, os, subprocess, json
sys.path.insert(0, 'scripts/v2'); import assemble as A, lut4 as L
from PIL import Image, ImageDraw, ImageFont
raw, specs, frames = sys.argv[1], json.loads(sys.argv[2]), json.loads(sys.argv[3]); f = ImageFont.load_default(size=15)
cells = []
for s in specs:
    lut = None
    if s.endswith('-v4'): lut = os.path.abspath(f'{raw}/{s.split("-")[0]}.cube'); open(lut, 'w').write(L.cube(s.split('-')[0]))
    for fr in frames:
        g, _ = A.final_graph((1080, 1920), None, 0, outputs=('graded',), lut=lut)
        out = f'{raw}/{s}-{fr}-graded.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{raw}/{s}-{fr}.png', '-filter_complex', g, '-map', '[graded]', '-frames:v', '1', '-pix_fmt', 'rgb24', out], check=True)
        cells.append((s, fr, Image.open(out).convert('RGB').resize((390, 693), Image.LANCZOS)))
W = 4 * 390; sh = Image.new('RGB', (W, len(frames) * (693 + 22)), '#1b1d21'); d = ImageDraw.Draw(sh)
for i, (s, fr, im) in enumerate(cells):
    col, row = i // len(frames), i % len(frames); x, y = col * 390, row * (693 + 22)
    sh.paste(im, (x, y + 22)); d.text((x + 4, y + 3), f"{s} · {'wide' if fr == 30 else 'medium'} · graded", fill='#ffd84a', font=f)
sh.save('review/v4/look-ab-390.png'); print(sh.size)`, raw, JSON.stringify(specs), JSON.stringify(frames)], {stdio: 'inherit'});
