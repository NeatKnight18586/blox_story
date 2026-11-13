// scripts/v2/class-sheet.js — Amendment A3 review sheet: the six class swords.
//   node scripts/v2/class-sheet.js [--out review/nobody]
// Row 1: each hero sword large (flat face to camera). Row 2: the same as grey-fill silhouettes (shape-alone check).
// Row 3: each sword held in toolHold by its class kid, at 390 px phone width. Writes <out>/class-swords.png.
import {mkdir} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'review/nobody', raw = 'renders/v2/class-sheet';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const CLS = [['baker', 'kidBaker'], ['knight', 'kidKnight'], ['king', 'kidFarmer'], ['archer', 'kidKnight'], ['smith', 'kidSmith'], ['farmer', 'kidFarmer']];
const swordCell = (cls, silhouette) => ({actors: [], silhouette, props: [{kind: 'classSword', cls, at: [0, 4.4, 0], rot: [0, 0, 0], scale: 1.3}], camera: {position: [9, 2.6, 0], target: [0, 2.6, 0], fov: 30}});
const heldCell = (cls, id) => ({actors: [{id, at: [0, 0, 0], yaw: 0, pose: 'raise', t: .3, with: {tool: 'class:' + cls}, tag: false, face: 'smile'}], camera: {position: [7.5, 4.6, 9.5], target: [0, 4.4, .4], fov: 40}});
const server = await startServer(), browser = await launch();
const files = [];
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}}); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/engine/studio.html`); await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
  for (const [row, make] of [['sword', c => swordCell(c[0], false)], ['sil', c => swordCell(c[0], true)], ['held', c => heldCell(c[0], c[1])]]) for (const c of CLS) {
    await page.evaluate(([cell]) => window.__studio.render(cell, 720, 1280), [make(c)]);
    const f = `${raw}/${row}-${c[0]}.png`;
    writeFileSync(f, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64')); files.push(f);
  }
  if (errs.length) throw Error(errs.join('; '));
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw, ImageFont
names = ['Goldcrust Saber (Baker)', 'Bastion Blade (Knight)', 'Sunfire Regalia (King)', 'Galeleaf Edge (Archer)', 'Forgeheart Cleaver (Smith)', 'Harvest Crescent (Farmer)']
cls = ['baker', 'knight', 'king', 'archer', 'smith', 'farmer']
W, H, P = 260, 462, 24
sheet = Image.new('RGB', (6 * W, 3 * (H + P) + 30), '#111'); d = ImageDraw.Draw(sheet); f = ImageFont.load_default(size=14)
d.text((6, 6), 'Row 1: hero swords  |  Row 2: grey-fill silhouettes (shape alone)  |  Row 3: held in toolHold, downscaled from 390 px phone width', fill='#ffd84a', font=f)
for r, row in enumerate(['sword', 'sil', 'held']):
    for i, c in enumerate(cls):
        im = Image.open(f'${raw}/{row}-{c}.png').convert('RGB')
        if row == 'held': im = im.resize((390, 693), Image.LANCZOS)
        im = im.resize((W, H), Image.LANCZOS); y = 30 + r * (H + P)
        sheet.paste(im, (i * W, y + P)); d.text((i * W + 6, y + 5), names[i], fill='#ffffff', font=f)
sheet.save('${out}/class-swords.png'); print(sheet.size)
`], {stdio: 'inherit'});
