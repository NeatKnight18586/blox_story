// scripts/v2/acting6-sheet.js — P3 acting v6 review material → review/acting6/ (raw frames in renders/acting6/, never committed):
//   verbs.png    one row per verb (24 + tumble): anticipation · KEY (action / apex / contact) · settle, hero B (cast/hero6.json)
//   cycles.png   walk, sad_walk, sneak, run, sprint, skid_stop × 8 frames (one period; skid over its stop)
//   demo.mp4     20 s silent motion demo at 270×480, every verb once + tumble, hard cuts (engine/acting6-reel.js DEMO)
//   render.json  silhouette XOR (rest vs KEY, magenta, no AA) per verb + 10-frame re-render byte identity (read by acting6-gates.js)
//   node scripts/v2/acting6-sheet.js [--no-demo]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {slotPreset6} from '../../avatar-style/body6.js';
import {VERB_NAMES, CYCLE_NAMES, CYCLES, SKID} from '../../engine/acting6.js';
import {keyTimes, DEMO} from '../../engine/acting6-reel.js';

const out = 'review/acting6', raw = 'renders/acting6', noDemo = process.argv.includes('--no-demo');
await mkdir(out, {recursive: true}); await mkdir(`${raw}/demo`, {recursive: true});
const h6 = JSON.parse(await readFile('cast/hero6.json', 'utf8')), t6 = JSON.parse(await readFile('cast/troupe6.json', 'utf8'));
const cast = {B: {...h6.HERO, faceStyle: 'v6'}, P: {...slotPreset6('SECOND', t6), faceStyle: 'v6', face: 'smile'}};
await writeFile(`${raw}/cast.json`, JSON.stringify({cast}));
const ROWS = [...VERB_NAMES, 'tumble'], CW = 240, CH = 300;
const server = await startServer(), browser = await launch(), result = {silhouette: {}, determinism: null};
try {
  const open = async () => { const page = await browser.newPage({viewport: {width: 400, height: 400}}), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${server.url}/engine/acting6.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__act6, null, {timeout: 120000}); return {page, errors}; };
  const {page, errors} = await open();
  const grab = async (pg, desc, w, h, f, mode = 'studio') => { const url = await pg.evaluate(([d, w, h, m]) => window.__act6.render(d, w, h, m), [desc, w, h, mode]); const b = Buffer.from(url.split(',')[1], 'base64'); if (f) await writeFile(f, b); return b; };
  for (const n of ROWS) {
    const camera = await page.evaluate(([n, a]) => { const c = window.__act6.camera(n, 0, a); return c; }, [n, CW / CH]);
    const ts = keyTimes(n);
    for (const [i, t] of ts.entries()) await grab(page, {kind: 'verb', name: n, t, camera}, CW, CH, `${raw}/verb-${n}-${i}.png`);
    await grab(page, {kind: 'verb', name: n, t: 0, camera}, 300, 375, `${raw}/sil-${n}-rest.png`, 'magenta');
    await grab(page, {kind: 'verb', name: n, t: ts[1], camera}, 300, 375, `${raw}/sil-${n}-key.png`, 'magenta');
  }
  for (const n of CYCLE_NAMES) {
    const T = n === 'skid_stop' ? SKID.end : CYCLES[n].T, ts = Array.from({length: 8}, (_, i) => n === 'skid_stop' ? i * T / 7 : i * T / 8);
    const camera = await page.evaluate(([n, ts, a]) => window.__act6.camera(n, ts, a), [n, ts, 180 / 240]);
    for (const [i, t] of ts.entries()) await grab(page, {kind: 'verb', name: n, t, camera}, 180, 240, `${raw}/cyc-${n}-${i}.png`);
  }
  const F = DEMO.seconds * DEMO.fps;
  if (!noDemo) for (let f = 0; f < F; f++) await grab(page, {kind: 'demo', f}, 270, 480, `${raw}/demo/f-${String(f).padStart(4, '0')}.png`);
  // determinism: 10 demo frames re-rendered on a fresh page, byte-identical
  const pick = Array.from({length: 10}, (_, i) => Math.round(i * (F - 1) / 9)), first = [];
  for (const f of pick) first.push(noDemo ? await grab(page, {kind: 'demo', f}, 270, 480, null) : await readFile(`${raw}/demo/f-${String(f).padStart(4, '0')}.png`));
  const p2 = await open(), same = [];
  for (const [i, f] of pick.entries()) same.push((await grab(p2.page, {kind: 'demo', f}, 270, 480, null)).equals(first[i]));
  result.determinism = {frames: pick, identical: same.filter(Boolean).length, of: pick.length};
  if (errors.length || p2.errors.length) throw Error([...errors, ...p2.errors].join('; '));
} finally { await browser.close(); await server.close(); }

if (!noDemo) execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(DEMO.fps), '-i', `${raw}/demo/f-%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', `${out}/demo.mp4`]);
const sil = JSON.parse(execFileSync('python3', ['-c', `
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
raw, out = sys.argv[1], sys.argv[2]; rows, cycles = json.loads(sys.argv[3]), json.loads(sys.argv[4])
f = ImageFont.load_default(size=16); fs = ImageFont.load_default(size=13); BG = '#1b1d21'; Y = '#ffd84a'
CW, CH, LW = 240, 300, 150
def mask(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(int); return ~((a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255))
s = Image.new('RGB', (LW + 3 * CW, len(rows) * (CH + 4) + 26), BG); d = ImageDraw.Draw(s)
for c, lab in enumerate(['anticipation', 'KEY (action / apex / contact)', 'settle']): d.text((LW + c * CW + 6, 5), lab, fill=Y, font=fs)
res = {}
for r, n in enumerate(rows):
    y = 26 + r * (CH + 4); d.text((8, y + CH // 2 - 8), n.replace('_', ' '), fill=Y, font=f)
    for c in range(3): s.paste(Image.open(f'{raw}/verb-{n}-{c}.png').convert('RGB'), (LW + c * CW, y))
    a, b = mask(f'{raw}/sil-{n}-rest.png'), mask(f'{raw}/sil-{n}-key.png')
    res[n] = {'restPx': int(a.sum()), 'keyPx': int(b.sum()), 'xor': round(float((a ^ b).sum()) / float(a.sum()), 4), 'area': round(float(b.sum()) / float(a.sum()) - 1, 4)}
s.save(out + '/verbs.png')
for i in range(0, len(rows), 5):   # viewing pages (<= 1600 px tall), not deliverables
    s.crop((0, 0 if i == 0 else 26 + i * (CH + 4), s.width, min(s.height, 26 + (i + 5) * (CH + 4)))).save(raw + f"/verbs-page{i // 5}.png")
cw, ch = 180, 240; c = Image.new('RGB', (130 + 8 * cw, len(cycles) * (ch + 4) + 26), BG); d = ImageDraw.Draw(c)
for i in range(8): d.text((130 + i * cw + 6, 5), f'frame {i + 1}/8', fill=Y, font=fs)
for r, n in enumerate(cycles):
    y = 26 + r * (ch + 4); d.text((8, y + ch // 2 - 8), n.replace('_', ' '), fill=Y, font=f)
    for i in range(8): c.paste(Image.open(f'{raw}/cyc-{n}-{i}.png').convert('RGB'), (130 + i * cw, y))
c.save(out + '/cycles.png')
# silhouette sheet for the reader: rest (grey) vs KEY (black)
k = 150; S = Image.new('RGB', (5 * (k + 4), ((len(rows) + 4) // 5) * (k + 22)), '#ffffff'); ds = ImageDraw.Draw(S)
for i, n in enumerate(rows):
    a, b = mask(f'{raw}/sil-{n}-rest.png'), mask(f'{raw}/sil-{n}-key.png'); im = np.full(a.shape + (3,), 255, 'uint8'); im[a] = (200, 200, 200); im[b] = (20, 20, 20)
    x, y = (i % 5) * (k + 4), (i // 5) * (k + 22); S.paste(Image.fromarray(im).resize((k, int(k * 375 / 300)), Image.LANCZOS).crop((0, 0, k, k)), (x, y + 20)); ds.text((x + 4, y + 3), n.replace('_', ' ') + f"  {res[n]['xor']:.2f}", fill='#333333', font=fs)
S.save(out + '/silhouettes.png')
print(json.dumps(res))
`, raw, out, JSON.stringify(ROWS), JSON.stringify(CYCLE_NAMES)], {encoding: 'utf8'}));
result.silhouette = sil;
await writeFile(`${raw}/render.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify({determinism: result.determinism, silhouetteMinXor: Math.min(...Object.values(sil).map(s => s.xor)).toFixed(3)}));
