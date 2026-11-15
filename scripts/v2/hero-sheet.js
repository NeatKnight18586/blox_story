// scripts/v2/hero-sheet.js — format v4 Phase 1 review sheets (390 px phone width):
//   review/v4/hero-390.png    the hero next to the troupe: troupe on today's body | troupe on Actor v5 | hero medium shot
//   review/v4/faces4-390.png  the 8 hero presets + the grin talking mouths (closed/small/open/wide) as phone close-ups
//   review/v4/hero-key.png    key art (channel icon/thumbnails only): low three-quarter, white 4 px outline, warm rim right
//   node scripts/v2/hero-sheet.js [--out review/v4]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {resolveTroupe, SLOTS} from '../../engine/troupe.js';
import {HERO_PRESETS} from '../../avatar-style/faces4.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const out = arg('out', 'review/v4'), raw = 'renders/v4/hero-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const troupe = JSON.parse(await readFile('cast/troupe.json', 'utf8')), hero = JSON.parse(await readFile('cast/hero.json', 'utf8')).HERO;
const data = {...troupe, troupe: {...troupe.troupe, HERO: hero}}, ids = ['HERO', ...SLOTS, 'AFK'];
const cast = {cast: Object.fromEntries(ids.map(id => [id, resolveTroupe({troupe: id}, data)]))};
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));

const X = i => i < 4 ? [-6.3 + i * 4.2, 0, 3] : [-4.2 + (i - 4) * 4.2, 0, -3], line = v5 => ({actors: ids.map((id, i) => ({id, at: X(i), pose: id === 'AFK' ? 'walk' : 'idle', t: id === 'AFK' ? troupe.AFK.freeze : i * .3,
  face: cast.cast[id].face, with: v5 && id !== 'HERO' ? {body: 'v5'} : null})), camera: {position: [0, 9, 44], target: [0, 4.2, 0], fov: 40}});
const medium = {actors: [{id: 'HERO', at: [0, 0, 0], pose: 'idle', t: .3, face: 'hero_wink'}], camera: {position: [1.5, 3.6, 12.5], target: [0, 2.9, 0], fov: 35}};
const pair = {actors: [{id: 'LEAD', at: [-2.1, 0, 0], pose: 'idle', t: .3}, {id: 'LEAD', at: [2.1, 0, 0], pose: 'idle', t: .3, with: {body: 'v5'}}], camera: {position: [0, 3, 16.5], target: [0, 2.6, 0], fov: 35}};
const close = (face, talk = null) => ({actors: [{id: 'HERO', at: [0, 0, 0], pose: 'idle', t: .3, face, talk}], camera: {position: [.55, 4.75, 3.3], target: [0, 4.45, 0], fov: 35}});
const key = sil => ({keyArt: !sil, silhouette: sil, actors: [{id: 'HERO', at: [0, 0, 0], yaw: -28, pose: 'cheer', t: .45, face: 'hero_wink'}], camera: {position: [3.6, 1.9, 12.6], target: [0, 3.7, 0], fov: 38}});

const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const grab = async (cell, w, h, f) => { await page.evaluate(([c, w, h]) => window.__studio.render(c, w, h), [cell, w, h]);
    await writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); };
  await grab(line(false), 1080, 1920, `${raw}/line-v4.png`); await grab(line(true), 1080, 1920, `${raw}/line-v5.png`); await grab(medium, 1080, 1920, `${raw}/medium.png`); await grab(pair, 1080, 1920, `${raw}/pair.png`);
  const faces = [...HERO_PRESETS.map(f => [f, null]), ...[0, 1, 2, 3].map(k => ['hero_grin', k])];
  for (const [f, k] of faces) await grab(close(f, k), 780, 780, `${raw}/face-${f}-${k}.png`);
  await grab(key(false), 2048, 2048, `${raw}/key.png`); await grab(key(true), 2048, 2048, `${raw}/key-sil.png`);
  const budget = await page.evaluate(() => window.__studio.budget());
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
raw, out, faces = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]); f = ImageFont.load_default(size=15)
def phone(p): g = Image.open(p).convert('RGB'); return g.resize((390, round(390 * g.height / g.width)), Image.LANCZOS)
cells = [('troupe on today\\'s body (v2) + hero v5', phone(raw + '/line-v4.png')), ('troupe on Actor v5 + hero v5', phone(raw + '/line-v5.png')), ('hero full body (390 px)', phone(raw + '/medium.png')), ('LEAD: v2 left | v5 right', phone(raw + '/pair.png'))]
W = 4 * 390 + 3 * 12; s = Image.new('RGB', (W, 693 + 24), '#1b1d21'); d = ImageDraw.Draw(s)
for i, (t, im) in enumerate(cells): s.paste(im, (i * 402, 24)); d.text((i * 402 + 4, 4), t, fill='#ffd84a', font=f)
s.save(out + '/hero-390.png')
cw = 390; s = Image.new('RGB', (4 * cw, 3 * (cw // 1 + 22)), '#1b1d21'); d = ImageDraw.Draw(s)
for i, (n, k) in enumerate(faces):
    im = Image.open(f"{raw}/face-{n}-{'null' if k is None else k}.png").convert('RGB').resize((cw, cw), Image.LANCZOS); x, y = (i % 4) * cw, (i // 4) * (cw + 22)
    s.paste(im, (x, y + 22)); d.text((x + 4, y + 3), n if k is None else f"{n} talk {['closed', 'small', 'open', 'wide'][k]}", fill='#ffd84a', font=f)
s.save(out + '/faces4-390.png')
k = Image.open(raw + '/key.png').convert('RGB'); m = Image.open(raw + '/key-sil.png').convert('L').point(lambda v: 255 if v < 200 else 0)
k = k.resize((1024, 1024), Image.LANCZOS); m = m.resize((1024, 1024), Image.NEAREST); ring = m.filter(ImageFilter.MaxFilter(9))   # 4 px white outline at the delivered 1024 px
white = Image.new('RGB', k.size, '#ffffff'); base = k.copy(); base.paste(white, (0, 0), ring); base.paste(k, (0, 0), m)
base.save(out + '/hero-key.png')
bb = ring.getbbox(); margin = min(bb[0], bb[1], 1024 - bb[2], 1024 - bb[3])
json.dump({'outlineBox': bb, 'minMarginPx': margin, 'pass': margin >= 24}, open(out + '/hero-key.json', 'w')); print(s.size, base.size, 'key margin', margin)`, raw, out, JSON.stringify(faces)], {stdio: 'inherit'});
  console.log(JSON.stringify({triangles: {HERO: budget.HERO, LEAD: budget.LEAD}}));
} finally { await browser.close(); await server.close(); }
