// scripts/v2/troupe-sheet.js — Amendment A4 G2 review sheet: the five troupe actors + AFK, front and three-quarter, three
// expressions each (upper body), plus a 390 px phone line-up. Writes review/season1/troupe-sheet.png and troupe-phone-390.png.
//   node scripts/v2/troupe-sheet.js [--out review/season1]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {resolveTroupe, SLOTS} from '../../engine/troupe.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const out = arg('out', 'review/season1'), raw = 'renders/v2/troupe-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const data = JSON.parse(await readFile('cast/troupe.json', 'utf8')), ids = [...SLOTS, 'AFK'];
const cast = {cast: Object.fromEntries(ids.map(id => [id, resolveTroupe({troupe: id, role: id === 'AFK' ? null : id[0] + id.slice(1).toLowerCase()}, data)]))};
await writeFile(`${raw}/cast.json`, JSON.stringify(cast));
const exprs = id => (id === 'AFK' ? data.AFK : data.troupe[id]).expressions;
const upper = (id, face, az) => { const k = cast.cast[id].scale, y = 4.0 * k, d = 7.2 * k, a = az * Math.PI / 180;
  return {actors: [{id, at: [0, 0, 0], face, tag: false, pose: id === 'AFK' ? 'walk' : 'idle', t: id === 'AFK' ? data.AFK.freeze : .3}], camera: {position: [Math.sin(a) * d, y + .2 * k, Math.cos(a) * d], target: [0, y - .25 * k, 0], fov: 30}}; };
const line = {actors: ids.map((id, i) => ({id, at: [-6.5 + i * 2.6, 0, (i % 2) * -1.4], yaw: 0, pose: id === 'AFK' ? 'walk' : 'idle', t: id === 'AFK' ? data.AFK.freeze : i * .3, tag: true, face: cast.cast[id].face})), camera: {position: [0, 5.6, 30], target: [0, 2.6, -.7], fov: 46}};
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`);
  await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const grab = async f => writeFile(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64'));
  const cells = [];
  for (const id of ids) for (const face of exprs(id)) for (const [v, az] of [['front', 0], ['3q', 35]]) {
    await page.evaluate(([c]) => window.__studio.render(c, 520, 520), [upper(id, face, az)]); const file = `${raw}/${id}-${face}-${v}.png`; await grab(file); cells.push({file, id, face, v});
  }
  await page.evaluate(([c]) => window.__studio.render(c, 1080, 1920), [line]); await grab(`${raw}/line.png`);
  const budget = await page.evaluate(() => window.__studio.budget());
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
C = json.loads(sys.argv[1]); out = sys.argv[2]; f = ImageFont.load_default(size=14)
ids = []; [ids.append(c['id']) for c in C if c['id'] not in ids]
cw = 240; W = cw * 6; H = len(ids) * (cw + 18)
sheet = Image.new('RGB', (W, H), '#1b1d21'); d = ImageDraw.Draw(sheet)
for r, i in enumerate(ids):
    row = [c for c in C if c['id'] == i]
    for k, c in enumerate(row):
        x, y = k * cw, r * (cw + 18)
        sheet.paste(Image.open(c['file']).convert('RGB').resize((cw, cw), Image.LANCZOS), (x, y + 18))
        d.text((x + 4, y + 2), f"{i} · {c['face']} · {c['v']}", fill='#ffd84a', font=f)
sheet.save(out + '/troupe-sheet.png')
g = Image.open(sys.argv[3]).convert('RGB'); g.resize((390, round(390 * g.height / g.width)), Image.LANCZOS).save(out + '/troupe-phone-390.png')
print(sheet.size)`, JSON.stringify(cells), out, `${raw}/line.png`], {stdio: 'inherit'});
  console.log(JSON.stringify(Object.fromEntries(ids.map(i => [i, budget[i]]))));
} finally { await browser.close(); await server.close(); }
