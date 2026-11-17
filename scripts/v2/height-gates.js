// scripts/v2/height-gates.js — format v5 (Phase 3a) equal adult heights → review/v4/height-gates.json. No browser.
// Standing height = head top − feet in the idle pose, body only (hair excluded), at the format-5 scale (adults 1.0).
// Pass: every adult within 1 % of the hero; the elder stoop costs ≤ 3 %; kids stay shorter than every adult.
import * as T from 'three';
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {createActor5} from '../../avatar-style/body5.js';
import {BUILDS} from '../../avatar-style/body.js';
import {samplePose, applyPoseSample} from '../../engine/poses.js';
const troupe = JSON.parse(readFileSync('cast/troupe.json', 'utf8')).troupe;
export function standingHeight({build = 'adult_m', scale = 1, stoop = true} = {}) {
  const a = createActor5({skin: '#f6c9a0', build, scale}); applyPoseSample(a, samplePose('idle', 0), {position: [0, 0, 0], yaw: 0});
  const st = BUILDS[build]?.stoop; if (stoop && st) { a.root.rotation.x += st; a.pivots.head.rotation.x -= st * .6; }
  a.root.updateMatrixWorld(true); const b = new T.Box3().setFromObject(a.root, true); return +(b.max.y - Math.min(0, b.min.y)).toFixed(4);
}
const ref = standingHeight({build: 'adult_m'}), rows = {
  'HERO adult_m': standingHeight({build: 'adult_m'}), 'ELDER (troupe) adult_m': standingHeight({build: troupe.ELDER.build, scale: 1}),
  'adult_f': standingHeight({build: 'adult_f'}), 'elder_f (stooped)': standingHeight({build: 'elder_f'}), 'elder_f (upright)': standingHeight({build: 'elder_f', stoop: false})};
const kids = Object.fromEntries(['LEAD', 'SECOND', 'LITTLE', 'RIVAL'].map(k => [`${k} youth ×${troupe[k].scale}`, standingHeight({build: 'youth', scale: troupe[k].scale})]));
const fails = [];
for (const [k, h] of Object.entries(rows)) { const d = Math.abs(h / ref - 1), lim = k.includes('stooped') ? .03 : .01; if (d > lim) fails.push(`${k}: ${h} vs ${ref} (${(d * 100).toFixed(2)} % > ${lim * 100} %)`); }
for (const [k, h] of Object.entries(kids)) if (h >= Math.min(...Object.values(rows))) fails.push(`${k}: ${h} not shorter than the adults`);
const rep = {reference: ref, adults: Object.fromEntries(Object.entries(rows).map(([k, h]) => [k, {h, diffPct: +((h / ref - 1) * 100).toFixed(2)}])), kids, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/v4', {recursive: true}); writeFileSync('review/v4/height-gates.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep)); process.exitCode = fails.length ? 1 : 0;
// --sheet: review/v4/heights-390.png — the line-up at format-5 scale (adults 1.0), front view, a level camera at chest height
if (process.argv.includes('--sheet')) {
  const {mkdir, writeFile} = await import('node:fs/promises'), {execFileSync} = await import('node:child_process');
  const {startServer} = await import('./server.js'), {launch} = await import('./browser.js'), {resolveTroupe} = await import('../../engine/troupe.js');
  const raw = 'renders/v4/heights'; await mkdir(raw, {recursive: true});
  const T5 = JSON.parse(readFileSync('cast/troupe.json', 'utf8')), hero = JSON.parse(readFileSync('cast/hero.json', 'utf8')).HERO, data = {...T5, troupe: {...T5.troupe, HERO: hero}};
  const v5 = p => ({...p, body: 'v5', faceStyle: 'v4'}), cast = {HERO: resolveTroupe({troupe: 'HERO'}, data), ELDER: {...v5(resolveTroupe({troupe: 'ELDER'}, data)), scale: 1},
    ADULT_F: {...v5(resolveTroupe({troupe: 'ELDER'}, data)), build: 'adult_f', age: 35, scale: 1, hair: {style: 'long_layered', color: '#5a3a22', v: 4}},
    ELDER_F: {...v5(resolveTroupe({troupe: 'ELDER'}, data)), build: 'elder_f', age: 72, scale: 1}, RIVAL: v5(resolveTroupe({troupe: 'RIVAL'}, data)), LEAD: v5(resolveTroupe({troupe: 'LEAD'}, data)), LITTLE: v5(resolveTroupe({troupe: 'LITTLE'}, data))};
  await writeFile(`${raw}/cast.json`, JSON.stringify({cast}));
  const ids = Object.keys(cast), server = await startServer(), browser = await launch();
  try {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${server.url}/engine/studio.html?cast=${encodeURIComponent(raw + '/cast.json')}`); await page.waitForFunction(() => window.__studio, null, {timeout: 120000});
    await page.evaluate(([ids]) => window.__studio.render({actors: ids.map((id, i) => ({id, at: [-10.2 + i * 3.4, 0, 0], pose: 'idle', t: 0, tag: false})), camera: {position: [0, 2.8, 62], target: [0, 2.8, 0], fov: 24}}, 1560, 900), [ids]);
    await writeFile(`${raw}/line.png`, Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64'));
    if (errs.length) throw Error(errs.join('; '));
  } finally { await browser.close(); await server.close(); }
  execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw, ImageFont
im = Image.open(sys.argv[1]).convert('RGB'); d = ImageDraw.Draw(im); f = ImageFont.load_default(size=18)
for i, n in enumerate(sys.argv[2].split(',')): d.text((780 - 7 * 1560 / 2 / 7 + i * 1560 / 7 * .985 + 10, 860), n, fill='#ffd84a', font=f)
im.save('review/v4/heights-390.png'); print(im.size)`, `${raw}/line.png`, ids.join(',')], {stdio: 'inherit'});
}
