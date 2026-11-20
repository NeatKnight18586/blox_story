// scripts/v2/hero6-sheet.js — P1b review sheets for Actor v6 (iconic blocky R15), the hero (cast/hero6.json HERO = variant B)
// and the troupe on v6 (cast/troupe6.json) → review/hero6/:
//   turnaround.png   hero B × front, 3/4, side, back (neutral studio)
//   ref-compare.png  hero B front | the bare v6 body in neutral grey with the classic smile, straight-on long lens, arms down,
//                    part boundaries marked (the owner reference's camera)
//   poses.png        hero B in the 12 R15 key poses (engine/poses6.js SHEET6) · silhouettes.png (solid black, from magenta)
//   phone-390.png    R6 v5 hero | R15 B at true 390 px phone width (full body + medium)
//   cast.png         the hero and every troupe slot on v6, one line-up, same scale, front · cast-390.png: the same on a phone
//   seam.json        seam test: each limb chain alone on flat magenta (no AA), 4 views; enclosed magenta must be 0 —
//                    hero B: all 12 poses; every troupe slot: run, crouch, sit, kneel (AFK is see-through by design: skipped)
//   node scripts/v2/hero6-sheet.js        (raw frames in renders/hero6/, never committed)
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {SHEET6} from '../../engine/poses6.js';
import {layout6, SEG6, slotPreset6} from '../../avatar-style/body6.js';

const out = 'review/hero6', raw = 'renders/hero6';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const h6 = JSON.parse(await readFile('cast/hero6.json', 'utf8')), hero = JSON.parse(await readFile('cast/hero.json', 'utf8')).HERO, t6 = JSON.parse(await readFile('cast/troupe6.json', 'utf8'));
const SLOTS6 = ['LEAD', 'SECOND', 'LITTLE', 'RIVAL', 'ELDER', 'AFK'];
const cast = {R6: hero, B: h6.HERO, A: h6.HERO_A_REF, REF: {tier: 'hero', body: 'v6', scale: 1, skin: '#a9a9a9', hair: null, faceStyle: 'v5', face: 'smile', build: 'adult_m'},
  ...Object.fromEntries(SLOTS6.map(k => [k, slotPreset6(k, t6)]))};
await writeFile(`${raw}/cast.json`, JSON.stringify({cast}));
const LABEL = {idle6: 'idle', walkContact: 'walk contact', walkPassing: 'walk passing', run6: 'run', point6: 'point', cheer6: 'cheer (arms up)', crouch6: 'crouch', sit6: 'sit',
  kneel6: 'kneel', reachHug: 'reach to hug', flinch6: 'flinch', jumpApex: 'jump apex'};
const VIEW = {walkContact: 62, walkPassing: 58, run6: -76, sit6: 52, kneel6: 50, crouch6: 34, jumpApex: 34};   // sheet yaw: the angle that shows each line of action
const sheetYaw = n => VIEW[n] ?? 26, CHAINS = ['spine', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], SLOT_POSES = ['run6', 'crouch6', 'sit6', 'kneel6'];
const full = (id, yaw, pose = 'idle', d = 12.8) => ({actors: [{id, at: [0, 0, 0], yaw, pose, t: .3, face: 'hero_wink'}], camera: {position: [0, 3.3, d], target: [0, 2.75, 0], fov: 30}});
const poseCell = (id, n, yaw) => { const ty = n === 'jumpApex' ? 4.3 : n === 'cheer6' ? 3.4 : ['sit6', 'kneel6', 'crouch6'].includes(n) ? 2.2 : 3.0;
  return {actors: [{id, at: [0, 0, 0], yaw, pose: n, face: n === 'flinch6' ? 'hero_shock' : n === 'cheer6' || n === 'jumpApex' ? 'hero_grin' : n === 'reachHug' ? 'hero_soft' : 'hero_wink'}], camera: {position: [0, ty + .9, 15.5], target: [0, ty, 0], fov: 31}}; };
const medium = id => ({actors: [{id, at: [0, 0, 0], yaw: 18, pose: 'idle', t: .3, face: 'hero_wink'}], camera: {position: [0, 4.0, 9.5], target: [0, 3.55, 0], fov: 35}});
// owner-reference camera: straight-on, long lens (fov 8 at 46 studs ≈ orthographic), centred on the body
const REFCAM = {position: [0, 2.75, 46], target: [0, 2.75, 0], fov: 8};
const ids = ['B', ...SLOTS6], X = i => (i - (ids.length - 1) / 2) * 3.3;
const lineup = {actors: ids.map((id, i) => ({id, at: [X(i), 0, 0], yaw: 0, pose: 'idle', t: .3 + i * .2, face: id === 'B' ? 'hero_wink' : cast[id].face})), camera: {position: [0, 3.0, 34], target: [0, 2.6, 0], fov: 30}};

const server = await startServer(), browser = await launch();
let budget;
try {
  const page = await browser.newPage({viewport: {width: 400, height: 400}}); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/hero6.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__hero6, null, {timeout: 120000});
  const grab = async (cell, w, h, f, mode = 'studio') => { const url = await page.evaluate(([c, w, h, m]) => window.__hero6.render(c, w, h, m), [cell, w, h, mode]);
    await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); };
  for (const [v, yaw] of [['front', 0], ['34', -38], ['side', -90], ['back', 180]]) await grab(full('B', yaw), 760, 1000, `${raw}/turn-B-${v}.png`);
  await grab({actors: [{id: 'B', at: [0, 0, 0], yaw: 0, pose: 'ref6', face: 'hero_wink'}], camera: REFCAM}, 900, 1100, `${raw}/ref-B.png`);
  await grab({actors: [{id: 'REF', at: [0, 0, 0], yaw: 0, pose: 'ref6', face: 'smile'}], camera: REFCAM}, 900, 1100, `${raw}/ref-grey.png`);
  for (const n of SHEET6) { await grab(poseCell('B', n, sheetYaw(n)), 780, 780, `${raw}/pose-${n}.png`);
    for (const [v, yaw] of [['sheet', sheetYaw(n)], ['front', 0], ['side', 90], ['back', 200]]) { await grab(poseCell('B', n, yaw), 600, 600, `${raw}/mag-B-${n}-${v}.png`, 'magenta');
      for (const ch of CHAINS) await grab({...poseCell('B', n, yaw), chain: ch}, 600, 600, `${raw}/seam-B-${n}-${v}-${ch}.png`, 'magenta'); } }
  for (const k of SLOTS6.filter(k => k !== 'AFK')) for (const n of SLOT_POSES) for (const [v, yaw] of [['sheet', sheetYaw(n)], ['front', 0], ['side', 90], ['back', 200]])
    for (const ch of CHAINS) await grab({...poseCell(k, n, yaw), chain: ch}, 600, 600, `${raw}/seam-${k}-${n}-${v}-${ch}.png`, 'magenta');
  for (const id of ['R6', 'B']) { await grab(full(id, 18, 'idle', 21), 1080, 1920, `${raw}/phone-${id}-full.png`); await grab(medium(id), 1080, 1920, `${raw}/phone-${id}-med.png`); }
  await grab(lineup, 1560, 640, `${raw}/cast.png`); await grab({...lineup, camera: {position: [0, 3.0, 62], target: [0, 2.6, 0], fov: 30}}, 1080, 1920, `${raw}/cast-phone.png`);
  budget = await page.evaluate(() => window.__hero6.budget());
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }

// ref-compare annotation: world y → pixel y on the reference camera (z = 0.5 plane, the front faces)
const L = layout6('adult_m'), [, hu] = SEG6.upperArm, [, hl] = SEG6.lowerArm, [, lu] = SEG6.upperLeg, [, ll] = SEG6.lowerLeg;
const marks = [['shoulder top', L.top], ['waist line', L.waistY], ['LowerTorso / hand bottom', L.bottom], ['wrist line', L.top - hu - hl], ['ankle line', 2 - lu - ll], ['ground', 0]];
execFileSync('python3', ['-c', `
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
raw, out = sys.argv[1], sys.argv[2]; names, labels, chains, slots, slotPoses, marks, cam = [json.loads(a) for a in sys.argv[3:]]
f = ImageFont.load_default(size=16); BG = '#1b1d21'; Y = '#ffd84a'
def fit(p, w, h): g = Image.open(p).convert('RGB'); return g.resize((w, h), Image.LANCZOS)
cw, ch = 380, 500; s = Image.new('RGB', (4 * cw, ch + 24), BG); d = ImageDraw.Draw(s)
for c, v in enumerate(['front', '34', 'side', 'back']): s.paste(fit(f'{raw}/turn-B-{v}.png', cw, ch), (c * cw, 24)); d.text((c * cw + 6, 4), f"hero B · {v.replace('34', '3/4')}", fill=Y, font=f)
s.save(out + '/turnaround.png')
W, H = 900, 1100; s = Image.new('RGB', (2 * 640 + 16, 782 + 24), BG); d = ImageDraw.Draw(s)
def py(y, z=.5): return H / 2 - (y - cam['ty']) / (2 * (cam['d'] - z) * math.tan(math.radians(cam['fov'] / 2))) * H
for i, (p, lab) in enumerate([('ref-B', 'hero B · reference camera'), ('ref-grey', 'v6 body · neutral grey · classic smile')]):
    im = Image.open(f'{raw}/{p}.png').convert('RGB')
    if i == 1:
        dd = ImageDraw.Draw(im)
        for name, y in marks:
            yy = py(y); dd.line([(30, yy), (130, yy)], fill='#e4574a', width=2); dd.line([(W - 130, yy), (W - 30, yy)], fill='#e4574a', width=2); dd.text((W - 330, yy - 20), f'{name} {y:.2f}', fill='#e4574a', font=f)
    s.paste(im.resize((640, 782), Image.LANCZOS), (i * 656, 24)); d.text((i * 656 + 6, 4), lab, fill=Y, font=f)
s.save(out + '/ref-compare.png')
c = 390; P = Image.new('RGB', (4 * c, 3 * (c + 24)), BG); dp = ImageDraw.Draw(P); S = Image.new('RGB', (4 * c, 3 * (c + 24)), '#ffffff'); ds = ImageDraw.Draw(S)
def magmask(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(int); return ~((a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255))
def enclosed(p):
    m = magmask(p); bg = Image.fromarray(np.where(m, 0, 255).astype('uint8'))
    big = Image.new('L', (bg.width + 2, bg.height + 2), 255); big.paste(bg, (1, 1)); ImageDraw.floodfill(big, (0, 0), 128)
    return int((np.asarray(big)[1:-1, 1:-1] == 255).sum())
seam, pinch = {}, {}
for i, n in enumerate(names):
    x, y = (i % 4) * c, (i // 4) * (c + 24)
    P.paste(fit(f'{raw}/pose-{n}.png', c, c), (x, y + 24)); dp.text((x + 6, y + 4), labels[n], fill=Y, font=f)
    m = magmask(f'{raw}/mag-B-{n}-sheet.png'); S.paste(Image.fromarray(np.where(m, 0, 255).astype('uint8')).resize((c, c), Image.LANCZOS).convert('RGB'), (x, y + 24)); ds.text((x + 6, y + 4), labels[n], fill='#333333', font=f)
    seam['B.' + n] = {}; pinch[n] = {}
    for v in ['sheet', 'front', 'side', 'back']:
        pinch[n][v] = enclosed(f'{raw}/mag-B-{n}-{v}.png')
        for chn in chains: seam['B.' + n][f'{v}/{chn}'] = enclosed(f'{raw}/seam-B-{n}-{v}-{chn}.png')
for k in slots:
    for n in slotPoses: seam[f'{k}.{n}'] = {f'{v}/{chn}': enclosed(f'{raw}/seam-{k}-{n}-{v}-{chn}.png') for v in ['sheet', 'front', 'side', 'back'] for chn in chains}
P.save(out + '/poses.png'); S.save(out + '/silhouettes.png')
Ph = Image.new('RGB', (2 * 390 + 8, 2 * 693 + 2 * 24), BG); dd = ImageDraw.Draw(Ph)
for i, (id, lab) in enumerate([('R6', 'R6 v5 (today)'), ('B', 'R15 B (v6)')]):
    for j, kk in enumerate(['full', 'med']):
        x, y = i * 398, j * (693 + 24); Ph.paste(fit(f'{raw}/phone-{id}-{kk}.png', 390, 693), (x, y + 24)); dd.text((x + 6, y + 4), f'{lab} · {"full body" if kk == "full" else "medium"}', fill=Y, font=f)
Ph.save(out + '/phone-390.png')
im = Image.open(f'{raw}/cast.png').convert('RGB'); s = Image.new('RGB', (im.width, im.height + 24), BG); s.paste(im, (0, 24)); d = ImageDraw.Draw(s)
for i, lab in enumerate(['HERO (B)'] + slots + ['AFK']): d.text((int((i + .5) * im.width / 7) - 30, 4), lab, fill=Y, font=f)
s.save(out + '/cast.png'); fit(f'{raw}/cast-phone.png', 390, 693).save(out + '/cast-390.png')
tot = sum(sum(v.values()) for v in seam.values()); bad = {n: {k: x for k, x in v.items() if x} for n, v in seam.items() if sum(v.values())}
json.dump({'method': 'each limb chain (spine incl. head; arms alone: the R6-style shoulder has no overlap; legs with the LowerTorso) rendered alone on flat magenta, no AA, 600 px, 4 views; enclosed = magenta not reachable from the frame border',
  'renders': sum(len(v) for v in seam.values()), 'total': tot, 'failing': bad, 'pass': tot == 0, 'wholeBodyPinchesInfo': {'note': 'hero B whole body: background enclosed between separate limbs (leg split groove, arm against head/torso); not joint seams', 'px': pinch}}, open(out + '/seam.json', 'w'), indent=1)
print('seam total', tot, bad)
for p in ['turnaround', 'ref-compare', 'poses', 'silhouettes', 'phone-390', 'cast', 'cast-390']: print(p, Image.open(f'{out}/{p}.png').size)
`, raw, out, JSON.stringify(SHEET6), JSON.stringify(LABEL), JSON.stringify(CHAINS), JSON.stringify(SLOTS6.filter(k => k !== 'AFK')), JSON.stringify(SLOT_POSES), JSON.stringify(marks),
  JSON.stringify({d: REFCAM.position[2], ty: REFCAM.target[1], fov: REFCAM.fov})], {stdio: 'inherit'});
await writeFile(`${raw}/budget.json`, JSON.stringify(budget)); console.log(JSON.stringify({triangles: budget}));
