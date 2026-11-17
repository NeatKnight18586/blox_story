// scripts/v2/hero-sheet.js — format v4 review sheets (390 px phone width; Phase 1b redo):
//   review/v4/hero-390.png    the hero next to the troupe (outfits swapped clear of the hero colours): troupe on today's
//                             body | troupe on Actor v5 | hero full body | hero medium (jacket edges)
//   review/v4/faces4-390.png  the 8 hero presets + the 4 talk shapes, each at the 390 px medium shot and close shot, cropped
//                             1:1 (true phone pixels, never scaled)
//   review/v4/hero-key.png    key art (channel icon/thumbnails only): low three-quarter, white 4 px outline, warm rim right
//   node scripts/v2/hero-sheet.js [--out review/v4]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {resolveTroupe, SLOTS} from '../../engine/troupe.js';
import {HERO_PRESETS, SHOTS4} from '../../avatar-style/faces4.js';
import {heroColours, heroSafeOutfit} from '../../avatar-style/body5.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const out = arg('out', 'review/v4'), raw = 'renders/v4/hero-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const troupe = JSON.parse(await readFile('cast/troupe.json', 'utf8')), hero = JSON.parse(await readFile('cast/hero.json', 'utf8')).HERO;
const data = {...troupe, troupe: {...troupe.troupe, HERO: hero}}, ids = ['HERO', ...SLOTS, 'AFK'];
const HC = heroColours(hero), cast = {cast: Object.fromEntries(ids.map(id => { const p = resolveTroupe({troupe: id}, data); return [id, id === 'HERO' ? p : {...p, outfit: heroSafeOutfit(p.outfit, HC)}]; }))};
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));

const X = i => i < 4 ? [-6.3 + i * 4.2, 0, 3] : [-4.2 + (i - 4) * 4.2, 0, -3], line = v5 => ({actors: ids.map((id, i) => ({id, at: X(i), pose: id === 'AFK' ? 'walk' : 'idle', t: id === 'AFK' ? troupe.AFK.freeze : i * .3,
  face: cast.cast[id].face, with: v5 && id !== 'HERO' ? {body: 'v5'} : null})), camera: {position: [0, 9, 44], target: [0, 4.2, 0], fov: 40}});
const full = {actors: [{id: 'HERO', at: [0, 0, 0], pose: 'idle', t: .3, face: 'hero_wink'}], camera: {position: [1.5, 3.6, 12.5], target: [0, 2.9, 0], fov: 35}};
// face shots: head centre (y 4.53) on the camera axis's frame line; medium puts it 35 % down the frame, close 45 % down
const HEAD_Y = 4.63, frameH = d => 2 * d * Math.tan(17.5 * Math.PI / 180);
const shot = (kind, face, talk = null) => { const d = SHOTS4[kind].d, ty = HEAD_Y - (kind === 'medium' ? .15 : .05) * frameH(d);
  return {actors: [{id: 'HERO', at: [0, 0, 0], pose: 'idle', t: .3, face, talk}], camera: {position: [0, ty, d], target: [0, ty, 0], fov: 35}}; };
const key = sil => ({keyArt: !sil, silhouette: sil, actors: [{id: 'HERO', at: [0, 0, 0], yaw: -28, pose: 'cheer', t: .45, face: 'hero_wink'}], camera: {position: [3.6, 1.9, 12.6], target: [0, 3.7, 0], fov: 38}});

const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const grab = async (cell, w, h, f) => { await page.evaluate(([c, w, h]) => window.__studio.render(c, w, h), [cell, w, h]);
    await writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); };
  await grab(line(false), 1080, 1920, `${raw}/line-v4.png`); await grab(line(true), 1080, 1920, `${raw}/line-v5.png`); await grab(full, 1080, 1920, `${raw}/full.png`); await grab(shot('medium', 'hero_wink'), 1080, 1920, `${raw}/medium.png`);
  const faces = [...HERO_PRESETS.map(f => [f, null]), ...[0, 1, 2, 3].map(k => ['hero_grin', k])];
  for (const [f, k] of faces) for (const kind of ['medium', 'close']) await grab(shot(kind, f, k), 390, 693, `${raw}/face-${f}-${k}-${kind}.png`);
  await grab(key(false), 2048, 2048, `${raw}/key.png`); await grab(key(true), 2048, 2048, `${raw}/key-sil.png`);
  const budget = await page.evaluate(() => window.__studio.budget());
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
raw, out, faces = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]); f = ImageFont.load_default(size=15)
def phone(p): g = Image.open(p).convert('RGB'); return g.resize((390, round(390 * g.height / g.width)), Image.LANCZOS)
cells = [('troupe on today\\'s body (v2) + hero v5', phone(raw + '/line-v4.png')), ('troupe on Actor v5 + hero v5', phone(raw + '/line-v5.png')), ('hero full body', phone(raw + '/full.png')), ('hero medium (jacket edges)', phone(raw + '/medium.png'))]
W = 4 * 390 + 3 * 12; s = Image.new('RGB', (W, 693 + 24), '#1b1d21'); d = ImageDraw.Draw(s)
for i, (t, im) in enumerate(cells): s.paste(im, (i * 402, 24)); d.text((i * 402 + 4, 4), t, fill='#ffd84a', font=f)
s.save(out + '/hero-390.png')
cw = 260; s = Image.new('RGB', (6 * cw, 4 * (cw + 22)), '#1b1d21'); d = ImageDraw.Draw(s)
for i, (n, k) in enumerate(faces):
    for j, kind in enumerate(['medium', 'close']):
        im = Image.open(f"{raw}/face-{n}-{'null' if k is None else k}-{kind}.png").convert('RGB'); cy = round(693 * (.35 if kind == 'medium' else .45))
        x, y = ((i % 3) * 2 + j) * cw, (i // 3) * (cw + 22); s.paste(im.crop((65, cy - 130, 325, cy + 130)), (x, y + 22))
        d.text((x + 4, y + 3), (n if k is None else f"talk {['closed', 'small', 'open', 'wide'][k]}") + f" · {kind}", fill='#ffd84a', font=f)
s.save(out + '/faces4-390.png')
k = Image.open(raw + '/key.png').convert('RGB'); m = Image.open(raw + '/key-sil.png').convert('L').point(lambda v: 255 if v < 200 else 0)
k = k.resize((1024, 1024), Image.LANCZOS); m = m.resize((1024, 1024), Image.NEAREST); ring = m.filter(ImageFilter.MaxFilter(9))   # 4 px white outline at the delivered 1024 px
white = Image.new('RGB', k.size, '#ffffff'); base = k.copy(); base.paste(white, (0, 0), ring); base.paste(k, (0, 0), m)
base.save(out + '/hero-key.png')
bb = ring.getbbox(); margin = min(bb[0], bb[1], 1024 - bb[2], 1024 - bb[3])
json.dump({'outlineBox': bb, 'minMarginPx': margin, 'pass': margin >= 24}, open(out + '/hero-key.json', 'w')); print(s.size, base.size, 'key margin', margin)`, raw, out, JSON.stringify(faces)], {stdio: 'inherit'});
  console.log(JSON.stringify({triangles: {HERO: budget.HERO, LEAD: budget.LEAD}}));
} finally { await browser.close(); await server.close(); }
