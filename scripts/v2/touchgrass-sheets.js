// scripts/v2/touchgrass-sheets.js — Touch Grass E0 gate material: cast, props and world sheets at true 390 px phone pixels,
// plus the measured numbers → review/touchgrass/{cast,props,worlds}-390.png + e0.json.
//   node scripts/v2/touchgrass-sheets.js [--only cast,props,worlds] [--timing 3]
// Measures: Dust Town non-NOVA mean saturation (≤ .15, both looks), NOVA raincoat saturation (≥ .5), pure-black pixels per world
// still (≤ .5 %; pure black = max channel ≤ 2), triangles + s/frame at 1080×1920 per world (≤ .69 s gated), headset gap (≥ .02).
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const only = arg('--only', 'cast,props,worlds').split(','), TIMING = +arg('--timing', 3), out = 'review/touchgrass', raw = 'renders/touchgrass-e0';
await mkdir(out, {recursive: true}); await mkdir(raw, {recursive: true});
const save = async (f, url) => { await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); return f; };
const py = (code, ...a) => execFileSync('python3', ['-c', code, ...a], {encoding: 'utf8'});
const SHEET = `
import json, sys
from PIL import Image, ImageDraw, ImageFont
cells, cols, dst = json.loads(sys.argv[1]), int(sys.argv[2]), sys.argv[3]; f = ImageFont.load_default(size=13)
ims = [Image.open(c['f']).convert('RGB') for c in cells]; cw = max(i.width for i in ims); ch = max(i.height for i in ims) + 16; rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (cols * cw, rows * ch), '#16171a'); d = ImageDraw.Draw(s)
for k, (c, im) in enumerate(zip(cells, ims)):
    x, y = (k % cols) * cw, (k // cols) * ch; s.paste(im, (x, y + 16)); d.text((x + 3, y + 1), c['label'], fill='#ffd84a', font=f)
s.save(dst); print(s.size)`;
const prev = JSON.parse(await readFile(`${out}/e0.json`, 'utf8').catch(() => '{}')), E = {...prev, generated: new Date().toISOString().slice(0, 10)};
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}}); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${server.url}/engine/fixtures/touchgrass/index.html`); await page.waitForFunction(() => window.__tgReady, null, {timeout: 180000});
  if (only.includes('cast')) {
    const ids = await page.evaluate(() => window.__tg.ids), cells = [], gaps = {};
    for (const id of [...ids, 'BOSS']) for (const [yaw, v] of [[0, 'front'], [-.75, '3/4']]) {
      if (id === 'LEO_NOHEADSET' && v === '3/4') continue;
      const r = await page.evaluate(c => window.__tg.cast(c), {id, yaw, pose: id.startsWith('ZOMBIE') ? 'zombie' : 'idle'});
      if (r.gap !== null && r.gap !== undefined) gaps[id] = r.gap;
      cells.push({f: await save(`${raw}/cast-${id}-${v === 'front' ? 'f' : 'q'}.png`, r.png), label: `${id.replace('FRIEND_', 'F_')} ${v}${id === 'LEO' ? ' HS on' : id === 'LEO_NOHEADSET' ? ' no HS' : ''}`});
    }
    for (const [id, hs, face] of [['LEO', 'on', 'grin'], ['LEO', 'off', 'unimpressed'], ['LEO_NOHEADSET', 'none', 'angry'], ['TOWN_1', 'on', null], ['NOVA', null, 'calm']]) {
      const r = await page.evaluate(c => window.__tg.cast(c), {id, headset: hs, face, close: true, yaw: -.35});
      cells.push({f: await save(`${raw}/cast-close-${id}-${hs}.png`, r.png), label: `${id.replace('_NOHEADSET', '')} close ${hs ? 'HS ' + hs : ''}`});
    }
    console.log(py(SHEET, JSON.stringify(cells), '8', `${out}/cast-390.png`).trim());
    const g = Object.values(gaps); E.headsetGap = {min: Math.min(...g), target: '>= 0.02', pass: Math.min(...g) >= .02 - 1e-4, per: gaps};
  }
  if (only.includes('props')) {
    const P = [['headset', {name: 'headset', set: 'on'}], ['headset off', {name: 'headset', set: 'off'}], ['visor: off', {name: 'visorScreen', p: {state: 'off'}, view: [0, 0, 1], fill: .55}],
      ['visor: ACHIEVEMENT', {name: 'visorScreen', p: {state: 'achievement'}, view: [0, 0, 1], fill: .55}], ['visor: TOUCHED', {name: 'visorScreen', p: {state: 'touched'}, view: [0, 0, 1], fill: .55}],
      ['headset on LEO + screen', {head: 'LEO', p: {screen: 'achievement'}, view: [.35, .1, 1], fill: .5}],
      ['giantFinger poke', {name: 'giantFinger', bend: 0, view: [1, -.2, 1.2], fill: .55, focus: ['hand', 'cuff', 'finger1', 'finger2']}], ['giantFinger flick', {name: 'giantFinger', bend: -1, view: [1.4, -.1, .4], fill: .55, focus: ['hand', 'cuff', 'finger1', 'finger2']}], ['giantFinger flick release', {name: 'giantFinger', bend: 1, view: [1.4, -.1, .4], fill: .55, focus: ['hand', 'cuff', 'finger1', 'finger2']}],
      ['wateringCan', {name: 'wateringCan', view: [.4, .45, 1]}], ['grassBlade', {name: 'grassBlade', view: [.3, .25, 1], fill: .55}], ['spaceship', {name: 'spaceship', view: [1, .5, 1.2]}],
      ['sunSphere', {name: 'sunSphere', view: [0, 0, 1], fill: .45}], ['swordStone', {name: 'swordStone', view: [.6, .3, 1]}], ['crate', {name: 'crate'}], ['deadTree', {name: 'deadTree', view: [1, .2, 1.4]}],
      ['birdhouse', {name: 'birdhouse', view: [.5, .1, 1]}], ['powerLine', {name: 'powerLine', view: [0, .15, 1], fill: .7}], ['porch', {name: 'porch', view: [.7, .4, 1]}], ['shack', {name: 'shack', view: [.6, .3, 1]}]];
    const cells = [], ptris = {};
    for (const [label, c] of P) { const r = await page.evaluate(c => window.__tg.prop(c), {w: 390, h: 390, ...c}); ptris[label] = r.tris; cells.push({f: await save(`${raw}/prop-${label.replace(/\W+/g, '_')}.png`, r.png), label: `${label} · ${r.tris} tris`}); }
    console.log(py(SHEET, JSON.stringify(cells), '5', `${out}/props-390.png`).trim()); E.propTriangles = ptris;
  }
  if (only.includes('worlds')) {
    const CAM = {
      dustTown: {wide: {position: [0, 9, 36], target: [0, 3, -10], fov: 42, fit: [0, 0, -4], r: 34}, lowWide: {position: [3, 1.0, 25], target: [0, 3.4, -4], fov: 46, fit: [0, 0, 4], r: 26}},
      zombieCity: {wide: {position: [0, 5.5, 12], target: [0, 2.8, -14], fov: 44, fit: [0, 0, -10], r: 20}, lowWide: {position: [1.2, .9, 3.5], target: [0, 4, -10], fov: 48, fit: [0, 0, -8], r: 16}},
      dragonPeaks: {wide: {position: [0, 30, 70], target: [0, 20, -200], fov: 46, fit: [0, 0, 0], r: 30}, lowWide: {position: [6, 1.4, 31], target: [0, 9, -40], fov: 48, fit: [0, 0, 0], r: 30}},
      space: {wide: {position: [-12, 5, 22], target: [40, 6, -70], fov: 50, fit: [0, 0, 0], r: 12}, lowWide: {position: [3, -1.2, 10.5], target: [0, 2.6, 1], fov: 48, fit: [0, 0, 0], r: 12}},
    };
    const runs = [['dustTown', 'dustGray'], ['dustTown', 'dustGold'], ['zombieCity'], ['dragonPeaks'], ['space']], cells = [], stills = [];
    E.worlds = {};
    for (const [name, look] of runs) for (const v of ['wide', 'lowWide']) {
      const key = look ? `${name}.${look}` : name, cam = CAM[name][v], timed = v === 'wide' && look !== 'dustGold';
      const r = await page.evaluate(c => window.__tg.world(c), {name, look, cam, w: 390, h: 693});
      const f = await save(`${raw}/world-${key}-${v}.png`, r.png); cells.push({f, label: `${key} · ${v}`}); const st = {f, key, v};
      if (name === 'dustTown') { const m = await page.evaluate(c => window.__tg.world(c), {name, look, cam, w: 390, h: 693, mask: true}); st.mask = await save(`${raw}/mask-${key}-${v}.png`, m.png); }
      stills.push(st);
      if (timed) { const b = await page.evaluate(c => window.__tg.world(c), {name, look, cam, w: 1080, h: 1920, timing: TIMING, cast: false}), bc = await page.evaluate(c => window.__tg.world(c), {name, look, cam, w: 1080, h: 1920, timing: TIMING});
        E.worlds[name] = {triangles: b.tris, calls: b.calls, sPerFrame1080: +(b.ms / 1000).toFixed(3), gate: '<= 0.69 s (location + props, wide camera)', pass: b.ms / 1000 <= .69, fallbacks: b.stats.fallbacks, prims: b.stats.prims, bakeMs: b.stats.bakeMs,
          withStillCast: {triangles: bc.tris, calls: bc.calls, sPerFrame1080: +(bc.ms / 1000).toFixed(3), note: 'info: the sheet still with its cast placed (E1 crowd instancing not applied)'}}; }
    }
    console.log(py(SHEET, JSON.stringify(cells), '5', `${out}/worlds-390.png`).trim());
    const M = JSON.parse(py(`
import json, sys
import numpy as np
from PIL import Image
S = json.loads(sys.argv[1]); out = {}
for s in S:
    a = np.asarray(Image.open(s['f']).convert('RGB')).astype(np.float32) / 255; mx = a.max(2); mn = a.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r = {'pureBlackPct': round(float((mx <= 2 / 255).mean() * 100), 3)}
    if s.get('mask'):
        m = np.asarray(Image.open(s['mask']).convert('RGB')).astype(np.int32); nova = (m[..., 0] > 60); coat = (m[..., 0] > 150) & (m[..., 1] < 90)
        can = (m[..., 2] > 150) & (m[..., 0] < 90); r['nonNovaMeanSat'] = round(float(sat[~(nova | can)].mean()), 4); r['nonNovaMeanSatStrict'] = round(float(sat[~nova].mean()), 4); r['novaCoatSat'] = round(float(sat[coat].mean()), 4) if coat.any() else None; r['novaPx'] = int(nova.sum()); r['coatPx'] = int(coat.sum())
    out[s['key'] + '.' + s['v']] = r
print(json.dumps(out))`, JSON.stringify(stills)));
    E.stills = M;
    const dt = Object.entries(M).filter(([k]) => k.startsWith('dustTown'));
    E.dustTownNonNovaSat = {max: Math.max(...dt.map(([, r]) => r.nonNovaMeanSat)), target: '<= 0.15', pass: dt.every(([, r]) => r.nonNovaMeanSat <= .15), per: Object.fromEntries(dt.map(([k, r]) => [k, r.nonNovaMeanSat]))};
    const coats = dt.map(([, r]) => r.novaCoatSat).filter(v => v !== null);
    E.novaCoatSat = {min: Math.min(...coats), target: '>= 0.5', pass: coats.every(v => v >= .5), per: Object.fromEntries(dt.map(([k, r]) => [k, r.novaCoatSat]))};
    E.pureBlack = {max: Math.max(...Object.values(M).map(r => r.pureBlackPct)), target: '<= 0.5 %', pass: Object.values(M).every(r => r.pureBlackPct <= .5)};
  }
  if (errors.length) console.error('page errors:', errors.slice(0, 5));
  await writeFile(`${out}/e0.json`, JSON.stringify(E, null, 1)); console.log(JSON.stringify(E, null, 1).slice(0, 2500));
} finally { await browser.close(); await server.close(); }
