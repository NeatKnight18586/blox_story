// scripts/v2/hair-sheet.js — Amendment A5 §A review sheet (A4 G1 originally): all 20 hair v4 styles on a grey head (front, three-quarter,
// back) + a 390 px phone crop of six styles on bodies. Writes review/season1/hair-sheet.png and hair-phone-390.png.
//   node scripts/v2/hair-sheet.js [--out review/season1]
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {HAIR4_STYLES as HAIR3_STYLES, HAIR4_BOYS as HAIR3_BOYS} from '../../avatar-style/hair4.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const out = arg('out', 'review/season1'), raw = 'renders/v2/hair-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const COLORS = ['#4a2e1e', '#7a4a2a', '#c8692a', '#e2b84e', '#1f1a1a', '#8a5a3a', '#a33f2a', '#3a2418', '#d9a35a', '#5a3a22'];
const SKIN = ['#f6c9a0', '#e0a77a', '#8d5a3b', '#fbdcc0', '#c08457', '#f5cd30'], SHIRT = ['#2f80d1', '#ff7aa8', '#7fc241', '#26262c', '#f2b632', '#9b59b6'];
const cast = {cast: Object.fromEntries([...HAIR3_STYLES.map((s, i) => [s, {tier: 'hero', skin: '#c9c9c9', outfit: {recipe: 'tunic', main: '#8f969e', legs: '#5b6068', accent: '#d0d3d6'}, face: 'neutral', hair: {style: s, color: COLORS[i % COLORS.length], v: 4}}]),
  ...HAIR3_STYLES.map((s, i) => ['p_' + s, {tier: 'hero', skin: SKIN[i % 6], outfit: {recipe: 'tee', main: SHIRT[i % 6], accent: '#ffffff', legs: '#2f3b52', trim: '#e4574a'}, face: 'smile', hair: {style: s, color: COLORS[i % COLORS.length], v: 4}}])])};
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));
const head = (id, az) => { const y = 4.61, d = 4.6, a = az * Math.PI / 180; return {actors: [{id, at: [0, 0, 0], tag: false}], camera: {position: [Math.sin(a) * d, y + .35, Math.cos(a) * d], target: [0, y - .05, 0], fov: 30}}; };
const SIX = ['messy_fringe', 'quiff', 'long_layered', 'space_buns', 'wavy_bob', 'wolf_cut'];
// medium shot (waist up, the size it is watched at on a phone), one per style, three-quarter-ish
const medium = id => ({actors: [{id: 'p_' + id, at: [0, 0, 0], yaw: -18, pose: 'idle', t: .4, tag: false, face: 'smile'}], camera: {position: [2.2, 4.3, 9.5], target: [0, 3.55, 0], fov: 34}});
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const cells = [];
  for (const s of HAIR3_STYLES) for (const [v, az] of [['front', 0], ['3q', 38], ['back', 180]]) {
    await page.evaluate(([c]) => window.__studio.render(c, 480, 480), [head(s, az)]);
    const file = `${raw}/${s}-${v}.png`; await writeFile(file, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); cells.push({file, s, v});
  }
  const gfiles = [];
  for (const id of SIX) { await page.evaluate(([c]) => window.__studio.render(c, 1080, 1920), [medium(id)]); const f = `${raw}/medium-${id}.png`; await writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); gfiles.push(f); }
  const gfile = JSON.stringify(gfiles);
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
C = json.loads(sys.argv[1]); out = sys.argv[2]; boys = set(json.loads(sys.argv[4])); f = ImageFont.load_default(size=13)
styles = []; [styles.append(c['s']) for c in C if c['s'] not in styles]
cw = 160; W = cw * 10; H = 2 * (3 * cw + 20)
sheet = Image.new('RGB', (W, H), '#1b1d21'); d = ImageDraw.Draw(sheet)
for k, s in enumerate(styles):
    bx, by = (k % 10) * cw, (k // 10) * (3 * cw + 20)
    tag = 'boy' if s in boys else ('neutral' if s in ('buzz', 'bald') else 'girl')
    d.text((bx + 4, by + 3), f'{k + 1}. {s} ({tag})', fill='#ffd84a', font=f)
    for j, v in enumerate(('front', '3q', 'back')):
        im = Image.open(next(c['file'] for c in C if c['s'] == s and c['v'] == v)).convert('RGB').resize((cw, cw), Image.LANCZOS)
        sheet.paste(im, (bx, by + 20 + j * cw))
sheet.save(out + '/hair-sheet.png')
G = json.loads(sys.argv[3]); ph = Image.new('RGB', (390 * 3, 693 * 2), '#111')
for k, fn in enumerate(G): ph.paste(Image.open(fn).convert('RGB').resize((390, 693), Image.LANCZOS), ((k % 3) * 390, (k // 3) * 693))
ph.save(out + '/hair-phone-390.png')
print(sheet.size)`, JSON.stringify(cells), out, gfile, JSON.stringify(HAIR3_BOYS)], {stdio: 'inherit'});
} finally { await browser.close(); await server.close(); }
