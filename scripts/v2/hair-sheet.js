// scripts/v2/hair-sheet.js — Amendment A4 G1 review sheet: all 20 hair v3 styles on a grey head (front, three-quarter,
// back) + a 390 px phone crop of six styles on bodies. Writes review/season1/hair-sheet.png and hair-phone-390.png.
//   node scripts/v2/hair-sheet.js [--out review/season1]
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {HAIR3_STYLES, HAIR3_BOYS} from '../../avatar-style/hair3.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const out = arg('out', 'review/season1'), raw = 'renders/v2/hair-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const COLORS = ['#4a2e1e', '#7a4a2a', '#c8692a', '#e2b84e', '#1f1a1a', '#8a5a3a', '#a33f2a', '#3a2418', '#d9a35a', '#5a3a22'];
const cast = {cast: Object.fromEntries(HAIR3_STYLES.map((s, i) => [s, {tier: 'hero', skin: '#c9c9c9', outfit: {recipe: 'tunic', main: '#8f969e', legs: '#5b6068', accent: '#d0d3d6'}, face: 'neutral', hair: {style: s, color: COLORS[i % COLORS.length], v: 3}}]))};
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));
const head = (id, az) => { const y = 4.61, d = 4.6, a = az * Math.PI / 180; return {actors: [{id, at: [0, 0, 0], tag: false}], camera: {position: [Math.sin(a) * d, y + .35, Math.cos(a) * d], target: [0, y - .05, 0], fov: 30}}; };
const SIX = ['messy_fringe', 'quiff', 'long_layered', 'space_buns', 'wavy_bob', 'wolf_cut'];
const group = {actors: SIX.map((id, i) => ({id, at: [-7.5 + i * 3, 0, (i % 2) * -1.4], yaw: (i - 2.5) * -6, pose: 'idle', t: i * .4, tag: false, face: 'smile'})), camera: {position: [0, 6, 34], target: [0, 3, -.7], fov: 46}};
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
  await page.evaluate(([c]) => window.__studio.render(c, 1080, 1920), [group]);
  const gfile = `${raw}/group.png`; await writeFile(gfile, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64'));
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
g = Image.open(sys.argv[3]).convert('RGB'); g.resize((390, round(390 * g.height / g.width)), Image.LANCZOS).save(out + '/hair-phone-390.png')
print(sheet.size)`, JSON.stringify(cells), out, gfile, JSON.stringify(HAIR3_BOYS)], {stdio: 'inherit'});
} finally { await browser.close(); await server.close(); }
