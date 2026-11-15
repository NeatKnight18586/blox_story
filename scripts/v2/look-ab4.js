// scripts/v2/look-ab4.js — format v4 Phase 2 sheet: review/v4/look-ab-390.png. The v4look fixture, today vs v4, comedy and
// mystery, wide + medium frames at 1080×1920, graded exactly as assemble.py grades a final (A2 grade; + the preset LUT and
// light vignette for v4 specs), shown at 390 px phone width.   node scripts/v2/look-ab4.js
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
// --set cast (2b): the whole troupe + a crowd on v5, comedy and mystery → review/v4/cast-v5-390.png
const CAST = process.argv.includes('--set') && process.argv[process.argv.indexOf('--set') + 1] === 'cast';
const specs = CAST ? ['cast-comedy', 'cast-mystery'] : ['comedy-today', 'comedy-v4', 'mystery-today', 'mystery-v4'], frames = CAST ? [10, 40] : [30, 90], raw = CAST ? 'renders/v4/cast-v5' : 'renders/v4/look-ab', probes = {};
const SHEET = CAST ? 'review/v4/cast-v5-390.png' : 'review/v4/look-ab-390.png', HUE = CAST ? 'review/v4/cast-hue.json' : 'review/v4/hero-hue.json';
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
      // 2b hue probe: the hero's forehead (above the face drawing) projected to pixels → python reads the graded colour there
      probes[`${s}-${f}`] = await page.evaluate(() => { const E = window.__episode, hero = E.debug.scene.getObjectByName('hero'); let h = null;
        hero?.traverse(o => { if (o.isMesh && o.name === 'head') h = o; }); if (!h) return null;
        const p = h.position.clone(); h.localToWorld(p.set(0, 0, 0)); const up = h.position.clone().set(0, .38, 0); p.add(up);   // forehead: above the brows
        const v = p.project(E.debug.camera); return [Math.round((v.x * .5 + .5) * 1080), Math.round((-v.y * .5 + .5) * 1920)]; });
      await writeFile(`${raw}/${s}-${f}.png`, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64'));
    }
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
await writeFile(`${raw}/probes.json`, JSON.stringify(probes));
execFileSync('python3', ['-c', `
import sys, os, subprocess, json, colorsys
sys.path.insert(0, 'scripts/v2'); import assemble as A, lut4 as L
from PIL import Image, ImageDraw, ImageFont
raw, specs, frames = sys.argv[1], json.loads(sys.argv[2]), json.loads(sys.argv[3]); f = ImageFont.load_default(size=15)
cells = []
for s in specs:
    lut = None
    pre = s.split('-')[1] if s.startswith('cast-') else s.split('-')[0]
    if s.endswith('-v4') or s.startswith('cast-'): lut = os.path.abspath(f'{raw}/{pre}.cube'); open(lut, 'w').write(L.cube(pre))
    for fr in frames:
        g, _ = A.final_graph((1080, 1920), None, 0, outputs=('graded',), lut=lut)
        out = f'{raw}/{s}-{fr}-graded.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{raw}/{s}-{fr}.png', '-filter_complex', g, '-map', '[graded]', '-frames:v', '1', '-pix_fmt', 'rgb24', out], check=True)
        cells.append((s, fr, Image.open(out).convert('RGB').resize((390, 693), Image.LANCZOS)))
one = len(specs) < 4; W = 4 * 390; sh = Image.new('RGB', (W, (1 if one else len(frames)) * (693 + 22)), '#1b1d21'); d = ImageDraw.Draw(sh)
for i, (s, fr, im) in enumerate(cells):
    col, row = (i, 0) if one else (i // len(frames), i % len(frames)); x, y = col * 390, row * (693 + 22)
    sh.paste(im, (x, y + 22)); d.text((x + 4, y + 3), f"{s} · {'wide' if fr == frames[0] else 'medium'} · graded", fill='#ffd84a', font=f)
sh.save(sys.argv[4]); print(sh.size)
pr = json.load(open(f'{raw}/probes.json')); hue = {}
for k, xy in pr.items():
    if not xy: continue
    im = Image.open(f'{raw}/{k}-graded.png').convert('RGB').resize((1080, 1920)); x, y = xy
    px = [im.getpixel((x + dx, y + dy)) for dx in range(-6, 7, 2) for dy in range(-6, 7, 2) if 0 <= x + dx < 1080 and 0 <= y + dy < 1920]
    r, g, b = (sum(p[i] for p in px) / len(px) / 255 for i in range(3)); h, l, s_ = colorsys.rgb_to_hls(r, g, b); hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
    hue[k] = {'xy': xy, 'rgb': [round(r * 255), round(g * 255), round(b * 255)], 'hueDeg': round(hh * 360, 1), 'satHSV': round(ss, 3), 'value': round(vv, 3)}
json.dump(hue, open(sys.argv[5], 'w'), indent=1); print(json.dumps({k: (v['hueDeg'], v['satHSV']) for k, v in hue.items()}))`, raw, JSON.stringify(specs), JSON.stringify(frames), SHEET, HUE], {stdio: 'inherit'});
