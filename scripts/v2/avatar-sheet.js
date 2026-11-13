// scripts/v2/avatar-sheet.js — Session 2 review sheet (docs/V2_BRIEF.md §12 Session 2).
//   node scripts/v2/avatar-sheet.js [--cast stories/nobody/cast.json] [--out review/nobody]
// Renders every cell natively (portrait cells 1080×1920, lineups 1920×1080) into renders/v2/avatar-sheet/,
// then composes <out>/avatar-sheet.png (≤ 1600 px) and <out>/phone-390.png (a 1080×1920 group shot
// with name tags, downscaled to a 390 px phone width), and prints triangle budgets per character.
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const castFile = arg('cast', 'stories/nobody/cast.json'), out = arg('out', 'review/nobody'), raw = 'renders/v2/avatar-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});

const LINE = ['nobody', 'pip', 'king', 'knight1', 'knight2', 'kidBaker', 'kidKnight', 'kidSmith', 'kidFarmer', 'town:3'];
const SCALE = {pip: .6, king: 1.05, kidBaker: .82, kidKnight: .82, kidSmith: .82, kidFarmer: .82, nobody: .9};
const s = id => SCALE[id] ?? 1;
const lineup = yaw => ({actors: LINE.map((id, i) => ({id, at: [-11.7 + i * 2.6, 0, 0], yaw, pose: 'idle', t: i * .37})), camera: {position: [0, 4.0, 33], target: [0, 3.1, 0], fov: 22}});
// Head close-up on an actor standing at the origin; az = camera azimuth (deg) around it.
const head = (id, face, az = 0, extra = {}) => {
  const k = s(id), y = 4.61 * k, d = 4.4 * k, a = az * Math.PI / 180;
  return {actors: [{id, at: [0, 0, 0], face, tag: false, ...extra}], camera: {position: [Math.sin(a) * d, y + .25 * k, Math.cos(a) * d], target: [0, y - .15 * k, 0], fov: 30}};
};
const body3q = (spec, cam = [7.5, 4.2, 9.5], target = [0, 2.9, 1.2]) => ({actors: [{at: [0, 0, 0], ...spec}], camera: {position: cam, target, fov: 34}, props: spec.props});

const CELLS = [
  {name: 'cast-front', w: 1920, h: 820, label: 'Cast, front', cell: lineup(0)},
  {name: 'cast-3q', w: 1920, h: 820, label: 'Cast, three-quarter', cell: lineup(-35)},
  ...['smile', 'determined', 'terrified', 'sad', 'crying', 'shout'].map(f => ({name: 'face-' + f, w: 1080, h: 1920, label: 'Hero: ' + f, cell: head('nobody', f, 0)})),
  ...[['kidBaker', 'curly blocks', 35], ['kidKnight', 'spiky', 35], ['kidSmith', 'ponytail', 150], ['pip', 'twin buns', 35]].map(([id, l, az]) => ({name: 'hair-' + id, w: 1080, h: 1920, label: 'Hair: ' + l, cell: head(id, undefined, az)})),
  {name: 'tool-sword', w: 1080, h: 1920, label: 'toolHold: sword', cell: body3q({id: 'knight1', pose: 'toolHold', yaw: 0, tag: false}, [11, 4.2, 10], [0, 2.9, 1.8])},
  {name: 'tool-hammer', w: 1080, h: 1920, label: 'toolHold: hammer', cell: body3q({id: 'nobody', with: {tool: {name: 'hammer'}}, pose: 'toolHold', yaw: 0, face: 'determined', tag: false}, [12.5, 4.2, 8], [0, 2.8, 1.8])},
  {name: 'run', w: 1080, h: 1920, label: 'run (mid-stride)', cell: body3q({id: 'nobody', pose: 'run', t: .14, yaw: 90, face: 'determined', tag: false}, [5, 3.6, 10.5], [0, 2.4, 0])},
  {name: 'pull', w: 1080, h: 1920, label: 'pull (strain)', cell: {actors: [{id: 'nobody', at: [0, 0, .1], yaw: 0, pose: 'pull', t: .1, face: 'determined', tag: false}], props: [{kind: 'stone', at: [0, 0, 1.15]}], camera: {position: [13, 3.2, .6], target: [0, 2.2, .6], fov: 34}}},
];
const PHONE = {name: 'phone-group', w: 1080, h: 1920, cell: {actors: [
  {id: 'kidBaker', at: [-1.0, 0, -4.4], yaw: 10}, {id: 'town:8', at: [-4.4, 0, -5.5], yaw: 25}, {id: 'nobody', at: [.3, 0, 0], yaw: -6, face: 'determined'},
  {id: 'pip', at: [2.3, 0, 1.4], yaw: -20}, {id: 'kidSmith', at: [2.9, 0, -2.6], yaw: -18}, {id: 'kidFarmer', at: [-2.6, 0, .9], yaw: 22}], camera: {position: [0, 6.2, 21], target: [0, 3.0, -.6], fov: 38}}};
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(castFile)}`);
  await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  const budget = await page.evaluate(() => window.__studio.budget());
  const shots = [];
  for (const c of [...CELLS, PHONE]) {
    const t0 = Date.now(), r = await page.evaluate(([cell, w, h]) => window.__studio.render(cell, w, h), [c.cell, c.w, c.h]);
    const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
    const file = `${raw}/${c.name}.png`; await writeFile(file, png); shots.push({file, label: c.label ?? c.name, ms: Date.now() - t0, ...r});
  }
  if (errors.length) throw Error(errors.join('; '));
  execFileSync('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw, ImageFont
S = json.loads(sys.argv[1]); out = sys.argv[2]; f = ImageFont.load_default(size=15)
W = 1600; rows = [S[0:2], S[2:8], S[8:16]]
def row(cells):
    w = W // len(cells); ims = []
    for c in cells:
        im = Image.open(c['file']).convert('RGB'); h = round(w * im.height / im.width); ims.append((im.resize((w, h), Image.LANCZOS), c['label']))
    return ims, max(i.height for i, _ in ims)
built = [row(r) for r in rows]; H = sum(h + 22 for _, h in built)
sheet = Image.new('RGB', (W, H), '#111'); d = ImageDraw.Draw(sheet); y = 0
for ims, h in built:
    x = 0
    for im, label in ims:
        d.text((x + 6, y + 3), label, fill='#ffd84a', font=f); sheet.paste(im, (x, y + 22)); x += im.width
    y += h + 22
sheet.save(out + '/avatar-sheet.png')
p = Image.open(S[-1]['file']).convert('RGB'); p.resize((390, round(390 * p.height / p.width)), Image.LANCZOS).save(out + '/phone-390.png')
print(sheet.size)`, JSON.stringify(shots), out], {stdio: 'inherit'});
  console.log(JSON.stringify({budget, cells: shots.map(({file, ms, triangles}) => ({file, ms, triangles}))}, null, 1));
} finally { await browser.close(); await server.close(); }
