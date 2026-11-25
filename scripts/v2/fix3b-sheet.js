// scripts/v2/fix3b-sheet.js — tuft P3B: ONE before / after sheet + phone read + demo → review/village/fix.png (≤ 1600 px), fix-390.png, demo2.mp4.
//   before = renders/fix3b/before (rendered from the pre-fix commit 5a4a43d in a worktree with scripts/v2/frames-at.js), after = this tree.
//   pairs: TITAN front / side / ¾ night, colossal Tuft hook + payoff, plaza lanterns, hillside dusk, titanCave, room puff, Boulder door.
//   demo2.mp4 540×960 24 fps ~12 s: Titan roar in the cave + chains, colossal Tuft reveal over the roofs, plaza night (silent).
// Usage: node scripts/v2/fix3b-sheet.js [--no-render] [--no-demo]
import {mkdirSync, statSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out = 'review/village', raw = 'renders/fix3b/after', F = 'engine/fixtures/village', X = 'engine/fixtures/fix3b'; mkdirSync(out, {recursive: true}); mkdirSync(raw, {recursive: true});
const fa = (W, H, items, dir = raw) => execFileSync('node', ['scripts/v2/frames-at.js', dir, String(W), String(H), ...items], {stdio: ['ignore', 'ignore', 'inherit']});
export const PAIRS = [[`${X}/titan-hero.json:29`, 't-side', 'TITAN side'], [`${X}/titan-hero.json:5`, 't-front', 'TITAN front'], [`${X}/titan-hero.json:53`, 't-34', 'TITAN 3/4 night'],
  [`${F}/festivalPlaza-colossal.json:40`, 'col-wide', 'colossal hook'], [`${F}/festivalPlaza-colossal.json:80`, 'col-low', 'colossal payoff'], [`${F}/demo-pl.json:40`, 'demo-pl', 'plaza lanterns'],
  [`${F}/festivalPlaza-dusk.json:6`, 'dusk-est', 'hillside dusk'], [`${F}/titanCave-night.json:30`, 'cave-hero', 'titanCave'], [`${F}/homeBedroom-night.json:6`, 'room-est', 'room puff'],
  [`${F}/homeBedroom-night.json:30`, 'room-hero', 'room puff hero'], [`${F}/homeDining-night.json:30`, 'din-hero', 'Boulder door']];
if (!process.argv.includes('--no-render')) fa(540, 960, PAIRS.map(([s, n]) => `${s}:${n}`));
writeFileSync('renders/fix3b/pairs.json', JSON.stringify(PAIRS.map(([, n, l]) => ({n, l}))));
execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw, ImageFont
P = json.load(open('renders/fix3b/pairs.json')); f = ImageFont.load_default(size=12); W = 1600; n = len(P); w = W // n; h = int(w * 16 / 9)
s = Image.new('RGB', (W, 26 + 2 * (h + 18) + 20 + 300), '#14161a'); d = ImageDraw.Draw(s)
d.text((6, 6), 'tuft P3B fix: BEFORE (top, pre-fix 5a4a43d) / AFTER (bottom); TITAN silhouettes below (front / side / 3/4, before / after)', fill='#f0f0f0', font=ImageFont.load_default(size=13))
for r, k in enumerate(['before', 'after']):
    y = 26 + r * (h + 18)
    for i, p in enumerate(P):
        try: im = Image.open(f'renders/fix3b/{k}/{p["n"]}.png').convert('RGB').resize((w, h))
        except FileNotFoundError: im = Image.new('RGB', (w, h), '#30333a')
        s.paste(im, (i * w, y + 16)); d.text((i * w + 3, y + 2), (p['l'] if r == 0 else 'after')[:22], fill='#ffffff', font=f)
sil = Image.open('review/village/titan-sil.png').convert('RGB'); sil = sil.resize((int(sil.width * 300 / sil.height), 300)); s.paste(sil, (0, 26 + 2 * (h + 18) + 20))
s.save('review/village/fix.png'); print('fix.png', s.size)
ph = ['col-wide', 'demo-pl', 't-34', 'room-est']; p = Image.new('RGB', (390, 2 * 347), '#14161a'); q = ImageDraw.Draw(p)
for i, k in enumerate(ph):
    x, yy = (i % 2) * 195, (i // 2) * 347; p.paste(Image.open(f'renders/fix3b/after/{k}.png').convert('RGB').resize((195, 347)), (x, yy)); q.text((x + 4, yy + 3), k, fill='#ffffff', font=ImageFont.load_default(size=11))
p.save('review/village/fix-390.png'); print('fix-390.png', p.size)`], {stdio: 'inherit'});
if (!process.argv.includes('--no-demo')) { const d = 'renders/fix3b/demo', k0 = {k: 0}; rmSync(d, {recursive: true, force: true}); mkdirSync(d, {recursive: true});
  for (const name of ['demo-cv', 'demo-tb', 'demo-co', 'demo-pl']) { const dir = name === 'demo-tb' ? X : F, S = JSON.parse(readFileSync(`${dir}/${name}.json`, 'utf8')), n = S.shots.reduce((a, s) => a + s.frames, 0), tmp = `renders/fix3b/d-${name}`; rmSync(tmp, {recursive: true, force: true});
    fa(540, 960, Array.from({length: n}, (_, i) => `${dir}/${name}.json:${i}:f${String(i).padStart(4, '0')}`), tmp);
    for (let i = 0; i < n; i++) execFileSync('cp', [`${tmp}/f${String(i).padStart(4, '0')}.png`, `${d}/f-${String(k0.k++).padStart(4, '0')}.png`]); }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', `${d}/f-%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', `${out}/demo2.mp4`]);
  console.log('demo2.mp4', (statSync(`${out}/demo2.mp4`).size / 1e6).toFixed(2), 'MB', k0.k, 'frames'); }
