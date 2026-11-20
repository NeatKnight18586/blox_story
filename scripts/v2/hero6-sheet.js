// scripts/v2/hero6-sheet.js — P1 review sheets for Actor v6 (R15) and the hero variants (cast/hero6.json) → review/hero6/:
//   turnaround.png   A, B, C × front, 3/4, side, back (neutral studio)
//   poses.png        variant B in the 12 R15 key poses (engine/poses6.js SHEET6)
//   silhouettes.png  the same 12 poses as solid black on white (from the magenta renders: everything not background)
//   phone-390.png    R6 v5 hero | R15 A | B | C at true 390 px phone width (full body + medium)
//   seam.json        seam test: each pose on flat magenta (no AA) from 3 views; magenta pixels enclosed by the body (not
//                    reachable from the frame border through background) must be 0
//   node scripts/v2/hero6-sheet.js        (raw frames in renders/hero6/, never committed)
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {SHEET6} from '../../engine/poses6.js';

const out = 'review/hero6', raw = 'renders/hero6';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const h6 = JSON.parse(await readFile('cast/hero6.json', 'utf8')), hero = JSON.parse(await readFile('cast/hero.json', 'utf8')).HERO;
await writeFile(`${raw}/cast.json`, JSON.stringify({cast: {R6: hero, A: h6.HERO_A, B: h6.HERO_B, C: h6.HERO_C}}));
const LABEL = {idle6: 'idle', walkContact: 'walk contact', walkPassing: 'walk passing', run6: 'run', point6: 'point', cheer6: 'cheer (arms up)', crouch6: 'crouch', sit6: 'sit',
  kneel6: 'kneel', reachHug: 'reach to hug', flinch6: 'flinch', jumpApex: 'jump apex'};
const VIEW = {walkContact: 62, walkPassing: -62, run6: -72, sit6: 52, kneel6: 50, crouch6: 44, jumpApex: 34};   // sheet yaw: the angle that shows each line of action
const sheetYaw = n => VIEW[n] ?? 26, CHAINS = ['spine', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
const full = (id, yaw, pose = 'idle6', d = 12.8) => ({actors: [{id, at: [0, 0, 0], yaw, pose, t: .3, face: 'hero_wink'}], camera: {position: [0, 3.3, d], target: [0, 2.75, 0], fov: 30}});
const poseCell = (id, n, yaw) => { const ty = n === 'jumpApex' ? 4.3 : n === 'cheer6' ? 3.4 : ['sit6', 'kneel6', 'crouch6'].includes(n) ? 2.2 : 3.0;
  return {actors: [{id, at: [0, 0, 0], yaw, pose: n, face: n === 'flinch6' ? 'hero_shock' : n === 'cheer6' || n === 'jumpApex' ? 'hero_grin' : n === 'reachHug' ? 'hero_soft' : 'hero_wink'}], camera: {position: [0, ty + .9, 15.5], target: [0, ty, 0], fov: 31}}; };
const medium = id => ({actors: [{id, at: [0, 0, 0], yaw: 18, pose: 'idle', t: .3, face: 'hero_wink'}], camera: {position: [0, 4.0, 9.5], target: [0, 3.55, 0], fov: 35}});

const server = await startServer(), browser = await launch();
let budget;
try {
  const page = await browser.newPage({viewport: {width: 400, height: 400}}); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/hero6.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__hero6, null, {timeout: 120000});
  const grab = async (cell, w, h, f, mode = 'studio') => { const url = await page.evaluate(([c, w, h, m]) => window.__hero6.render(c, w, h, m), [cell, w, h, mode]);
    await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); };
  for (const id of ['A', 'B', 'C']) for (const [v, yaw] of [['front', 0], ['34', -38], ['side', -90], ['back', 180]]) await grab(full(id, yaw, 'idle'), 760, 1000, `${raw}/turn-${id}-${v}.png`);
  for (const n of SHEET6) { await grab(poseCell('B', n, sheetYaw(n)), 780, 780, `${raw}/pose-${n}.png`);
    for (const [v, yaw] of [['sheet', sheetYaw(n)], ['front', 0], ['side', 90], ['back', 200]]) { await grab(poseCell('B', n, yaw), 600, 600, `${raw}/mag-${n}-${v}.png`, 'magenta');
      for (const ch of CHAINS) await grab({...poseCell('B', n, yaw), chain: ch}, 600, 600, `${raw}/seam-${n}-${v}-${ch}.png`, 'magenta'); } }
  for (const id of ['R6', 'A', 'B', 'C']) { await grab(full(id, 18, 'idle', 21), 1080, 1920, `${raw}/phone-${id}-full.png`); await grab(medium(id), 1080, 1920, `${raw}/phone-${id}-med.png`); }
  budget = await page.evaluate(() => window.__hero6.budget());
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }

execFileSync('python3', ['-c', `
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
raw, out, names, labels = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]), json.loads(sys.argv[4]); f = ImageFont.load_default(size=16); BG = '#1b1d21'; Y = '#ffd84a'
def fit(p, w, h): g = Image.open(p).convert('RGB'); return g.resize((w, h), Image.LANCZOS)
# turnaround: 3 rows × 4 views, 380 × 500 cells
cw, ch = 380, 500; s = Image.new('RGB', (4 * cw, 3 * (ch + 24)), BG); d = ImageDraw.Draw(s)
for r, id in enumerate(['A', 'B', 'C']):
    for c, v in enumerate(['front', '34', 'side', 'back']):
        x, y = c * cw, r * (ch + 24); s.paste(fit(f'{raw}/turn-{id}-{v}.png', cw, ch), (x, y + 24)); d.text((x + 6, y + 4), f"{id} · {v.replace('34', '3/4')}", fill=Y, font=f)
s.save(out + '/turnaround.png')
# poses + silhouettes: 4 × 3, 390 cells
c = 390; P = Image.new('RGB', (4 * c, 3 * (c + 24)), BG); dp = ImageDraw.Draw(P); S = Image.new('RGB', (4 * c, 3 * (c + 24)), '#ffffff'); ds = ImageDraw.Draw(S)
seam, pinch, chains = {}, {}, json.loads(sys.argv[5])
def enclosed(p):
    m = magmask(p); bg = Image.fromarray(np.where(m, 0, 255).astype('uint8'))
    big = Image.new('L', (bg.width + 2, bg.height + 2), 255); big.paste(bg, (1, 1)); ImageDraw.floodfill(big, (0, 0), 128)
    return int((np.asarray(big)[1:-1, 1:-1] == 255).sum())
def magmask(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(int); return ~((a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255))
for i, n in enumerate(names):
    x, y = (i % 4) * c, (i // 4) * (c + 24)
    P.paste(fit(f'{raw}/pose-{n}.png', c, c), (x, y + 24)); dp.text((x + 6, y + 4), labels[n], fill=Y, font=f)
    m = magmask(f'{raw}/mag-{n}-sheet.png'); sil = Image.fromarray(np.where(m, 0, 255).astype('uint8')).resize((c, c), Image.LANCZOS).convert('RGB')
    S.paste(sil, (x, y + 24)); ds.text((x + 6, y + 4), labels[n], fill='#333333', font=f)
    seam[n] = {}; pinch[n] = {}
    for v in ['sheet', 'front', 'side', 'back']:
        pinch[n][v] = enclosed(f'{raw}/mag-{n}-{v}.png')
        for ch in chains: seam[n][f'{v}/{ch}'] = enclosed(f'{raw}/seam-{n}-{v}-{ch}.png')
P.save(out + '/poses.png'); S.save(out + '/silhouettes.png')
# phone: 4 heroes × (full, medium) at 390 px
W = 4 * 390 + 3 * 8; Ph = Image.new('RGB', (W, 2 * 693 + 2 * 24), BG); dd = ImageDraw.Draw(Ph)
for i, (id, lab) in enumerate([('R6', 'R6 v5 (today)'), ('A', 'R15 A'), ('B', 'R15 B'), ('C', 'R15 C')]):
    for j, k in enumerate(['full', 'med']):
        x, y = i * 398, j * (693 + 24); Ph.paste(fit(f'{raw}/phone-{id}-{k}.png', 390, 693), (x, y + 24)); dd.text((x + 6, y + 4), f'{lab} · {"full body" if k == "full" else "medium"}', fill=Y, font=f)
Ph.save(out + '/phone-390.png')
tot = sum(sum(v.values()) for v in seam.values()); bad = {n: {k: x for k, x in v.items() if x} for n, v in seam.items() if sum(v.values())}
json.dump({'method': 'each limb chain (spine, arms, legs, with the parent torso piece) rendered alone on flat magenta, no AA, 600 px, 4 views; enclosed = magenta not reachable from the frame border', 'views': ['sheet', 'front', 'side', 'back'], 'chains': chains,
  'total': tot, 'failing': bad, 'pass': tot == 0, 'wholeBodyPinchesInfo': {'note': 'whole body: background enclosed between separate limbs (leg-to-leg bevel groove, arm against head); not joint seams', 'px': pinch}}, open(out + '/seam.json', 'w'), indent=1)
print('seam total', tot, bad)
for p in ['turnaround', 'poses', 'silhouettes', 'phone-390']: print(p, Image.open(f'{out}/{p}.png').size)
`, raw, out, JSON.stringify(SHEET6), JSON.stringify(LABEL), JSON.stringify(CHAINS)], {stdio: 'inherit'});
await writeFile(`${raw}/budget.json`, JSON.stringify(budget)); console.log(JSON.stringify({triangles: budget}));
