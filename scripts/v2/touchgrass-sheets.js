// scripts/v2/touchgrass-sheets.js — Touch Grass E0 gate material: cast, props and world sheets at true 390 px phone pixels,
// plus the measured numbers → review/touchgrass/{cast,props,worlds}-390.png + e0.json.
//   node scripts/v2/touchgrass-sheets.js [--only cast,props,worlds] [--timing 3]
// Measures (E0b, docs/season1/V4.md D5/D6): dustGray non-NOVA mean saturation (≤ .15), NOVA raincoat saturation (≥ .5), pure-black
// pixels per still (≤ .5 %; max channel ≤ 2), dustGold ground R/B (≥ 1.25) + ground luma ÷ dustGray (≥ 1.2), zombie local contrast vs the
// ring around them (|Lz − Lb| / max, ≥ .35), LEO_VR trim hue (180–200°), headset gap (≥ .02); s/frame + triangles at 1440×2560 per
// world with its cast (reported) → projected farm minutes = 5406 × shot-weighted mean s/frame / 18 shards (≤ 150, the gate).
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
      ['giantFinger poke', {name: 'giantFinger', view: [1, -.2, 1.2], fill: .55, focus: ['hand', 'cuff', 'finger1', 'finger2']}], ['giantFinger flick (poke pose, side)', {name: 'giantFinger', view: [1.4, -.1, .4], fill: .55, focus: ['hand', 'cuff', 'finger1', 'finger2']}],
      ['wateringCan', {name: 'wateringCan', view: [.4, .45, 1]}], ['grassBlade', {name: 'grassBlade', view: [.3, .25, 1], fill: .55}], ['spaceship', {name: 'spaceship', view: [1, .5, 1.2]}],
      ['sunSphere', {name: 'sunSphere', view: [0, 0, 1], fill: .45}], ['swordStone', {name: 'swordStone', view: [.6, .3, 1]}], ['crate', {name: 'crate'}], ['deadTree', {name: 'deadTree', view: [1, .2, 1.4]}],
      ['birdhouse', {name: 'birdhouse', view: [.5, .1, 1]}], ['powerLine', {name: 'powerLine', view: [0, .15, 1], fill: .7}], ['porch', {name: 'porch', view: [.7, .4, 1]}], ['shack', {name: 'shack', view: [.6, .3, 1]}],
      ['rockPeak', {name: 'rockPeak', p: {h: 100, seed: 6}, view: [.3, .25, 1], fill: .6}], ['rockMesa', {name: 'rockMesa', view: [.3, .6, 1], fill: .6}], ['ringPlanet', {name: 'ringPlanet', view: [0, .2, 1], fill: .6}],
      ['streetLamp', {name: 'streetLamp', view: [.5, .1, 1], fill: .6}], ['brokenBuilding', {name: 'brokenBuilding', view: [.4, .2, 1], fill: .6}]];
    const cells = [], ptris = {};
    for (const [label, c] of P) { const r = await page.evaluate(c => window.__tg.prop(c), {w: 390, h: 390, ...c}); ptris[label] = r.tris; cells.push({f: await save(`${raw}/prop-${label.replace(/\W+/g, '_')}.png`, r.png), label: `${label} · ${r.tris} tris`}); }
    console.log(py(SHEET, JSON.stringify(cells), '5', `${out}/props-390.png`).trim()); E.propTriangles = ptris;
  }
  if (only.includes('worlds')) {
    const CAM = {   // E0b: dustTown wide 20° down so full bodies read
      dustTown: {wide: {position: [0, 17, 30], target: [0, 1, -14], fov: 42, fit: [0, 0, -8], r: 30}, lowWide: {position: [3, 1.0, 25], target: [0, 3.4, -4], fov: 46, fit: [0, 0, 4], r: 26}},
      zombieCity: {wide: {position: [0, 5.5, 12], target: [0, 2.8, -14], fov: 44, fit: [0, 0, -10], r: 20}, lowWide: {position: [1.2, .9, 3.5], target: [0, 4, -10], fov: 48, fit: [0, 0, -8], r: 16}},
      dragonPeaks: {wide: {position: [0, 30, 70], target: [0, 20, -200], fov: 46, fit: [0, 0, 0], r: 30}, lowWide: {position: [6, 1.4, 31], target: [0, 9, -40], fov: 48, fit: [0, 0, 0], r: 30}},
      space: {wide: {position: [-24, 9, 34], target: [40, 6, -70], fov: 50, fit: [0, 0, 0], r: 16}, lowWide: {position: [11, .2, 30], target: [0, 4.5, -3], fov: 46, fit: [0, 0, 0], r: 16}},
    };
    const runs = [['dustTown', 'dustGray'], ['dustTown', 'dustGold'], ['zombieCity'], ['dragonPeaks'], ['space']], cells = [], stills = [];
    E.worlds = {};
    for (const [name, look] of runs) for (const v of ['wide', 'lowWide']) {
      const key = look ? `${name}.${look}` : name, cam = CAM[name][v], W = (o = {}) => page.evaluate(c => window.__tg.world(c), {name, look, cam, w: 390, h: 693, ...o});
      const r = await W(); const f = await save(`${raw}/world-${key}-${v}.png`, r.png); cells.push({f, label: `${key} · ${v}`}); const st = {f, key, v};
      if (name === 'dustTown') { st.mask = await save(`${raw}/mask-${key}-${v}.png`, (await W({mask: true})).png); st.ground = await save(`${raw}/mask-ground-${key}-${v}.png`, (await W({mask: 'ground'})).png); }
      if (name === 'zombieCity') { st.zombie = await save(`${raw}/mask-zombie-${v}.png`, (await W({mask: 'zombie'})).png); st.trim = await save(`${raw}/mask-trim-${v}.png`, (await W({mask: 'trim'})).png); }
      stills.push(st);
      if (v === 'wide' && TIMING) { const b = await page.evaluate(c => window.__tg.world(c), {name, look, cam, w: 1440, h: 2560, timing: TIMING});
        E.worlds[key] = {triangles: b.tris, calls: b.calls, sPerFrame1440: +(b.ms / 1000).toFixed(3), fallbacks: b.stats.fallbacks, prims: b.stats.prims, bakeMs: b.stats.bakeMs, note: 'location + props + cast placed (crowds merged), wide camera, 1440x2560 AA; reported, not gated'}; }
    }
    console.log(py(SHEET, JSON.stringify(cells), '5', `${out}/worlds-390.png`).trim());
    const M = JSON.parse(py(`
import json, sys
import numpy as np
from PIL import Image
def dil(m, n):   # square binary dilation (numpy only)
    o = m.copy()
    for _ in range(n):
        q = o.copy(); q[1:] |= o[:-1]; q[:-1] |= o[1:]; q[:, 1:] |= o[:, :-1]; q[:, :-1] |= o[:, 1:]; o = q
    return o
ero = lambda m, n: ~dil(~m, n)
S = json.loads(sys.argv[1]); out = {}
rgb = lambda f: np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255
luma = lambda a: .2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]
for s in S:
    a = rgb(s['f']); mx = a.max(2); mn = a.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r = {'pureBlackPct': round(float((mx <= 2 / 255).mean() * 100), 3)}
    if s.get('mask'):
        m = np.asarray(Image.open(s['mask']).convert('RGB')).astype(np.int32); nova = (m[..., 0] > 60); coat = (m[..., 0] > 150) & (m[..., 1] < 90)
        can = (m[..., 2] > 150) & (m[..., 0] < 90); r['nonNovaMeanSat'] = round(float(sat[~(nova | can)].mean()), 4); r['nonNovaMeanSatStrict'] = round(float(sat[~nova].mean()), 4); r['novaCoatSat'] = round(float(sat[coat].mean()), 4) if coat.any() else None; r['novaPx'] = int(nova.sum()); r['coatPx'] = int(coat.sum())
    if s.get('ground'):
        g = rgb(s['ground'])[..., 0] > .5; r['groundPx'] = int(g.sum()); r['groundRB'] = round(float(a[g][:, 0].mean() / max(1e-6, a[g][:, 2].mean())), 3); r['groundLuma'] = round(float(luma(a)[g].mean()), 4); r['frameLuma'] = round(float(luma(a).mean()), 4)
    if s.get('zombie'):
        z = rgb(s['zombie'])[..., 0] > .5; ring = dil(z, 10) & ~z; L = luma(a); lz, lb = float(L[z].mean()), float(L[ring].mean())
        r['zombiePx'] = int(z.sum()); r['zombieLuma'] = round(lz, 4); r['zombieRingLuma'] = round(lb, 4); r['zombieContrast'] = round(abs(lz - lb) / max(lz, lb, 1e-6), 4)
    if s.get('trim'):
        t = ero(rgb(s['trim'])[..., 0] > .5, 1); r['trimPx'] = int(t.sum())
        if t.any():
            c = a[t].mean(0); mx_, mn_ = c.max(), c.min(); d = max(mx_ - mn_, 1e-6)
            h = (60 * ((c[1] - c[2]) / d % 6) if mx_ == c[0] else 60 * ((c[2] - c[0]) / d + 2) if mx_ == c[1] else 60 * ((c[0] - c[1]) / d + 4))
            r['trimHue'] = round(float(h), 1); r['trimRGB'] = [round(float(x) * 255) for x in c]
    out[s['key'] + '.' + s['v']] = r
print(json.dumps(out))`, JSON.stringify(stills)));
    E.stills = M;
    const gray = Object.entries(M).filter(([k]) => k.startsWith('dustTown.dustGray'));
    E.dustGrayNonNovaSat = {max: Math.max(...gray.map(([, r]) => r.nonNovaMeanSat)), target: '<= 0.15 (dustGray only, V4 D6)', pass: gray.every(([, r]) => r.nonNovaMeanSat <= .15), per: Object.fromEntries(gray.map(([k, r]) => [k, r.nonNovaMeanSat]))};
    delete E.dustTownNonNovaSat;
    const dt = Object.entries(M).filter(([k]) => k.startsWith('dustTown')), coats = dt.map(([, r]) => r.novaCoatSat).filter(v => v !== null);
    E.novaCoatSat = {min: Math.min(...coats), target: '>= 0.5', pass: coats.every(v => v >= .5), per: Object.fromEntries(dt.map(([k, r]) => [k, r.novaCoatSat]))};
    const gold = {}; for (const v of ['wide', 'lowWide']) { const G = M[`dustTown.dustGold.${v}`], Y = M[`dustTown.dustGray.${v}`]; gold[v] = {groundRB: G.groundRB, lumaRatio: +(G.groundLuma / Y.groundLuma).toFixed(3), goldLuma: G.groundLuma, grayLuma: Y.groundLuma}; }
    E.dustGold = {per: gold, minRB: Math.min(...Object.values(gold).map(g => g.groundRB)), minLumaRatio: Math.min(...Object.values(gold).map(g => g.lumaRatio)), target: 'ground R/B >= 1.25, ground luma >= 1.2 x dustGray (same camera)'};
    E.dustGold.pass = E.dustGold.minRB >= 1.25 && E.dustGold.minLumaRatio >= 1.2;
    const zs = ['wide', 'lowWide'].map(v => M[`zombieCity.${v}`]);
    E.zombieContrast = {min: Math.min(...zs.map(z => z.zombieContrast)), per: {wide: zs[0].zombieContrast, lowWide: zs[1].zombieContrast}, target: '>= 0.35 (|Lz - Lring| / max, ring = 10 px dilation at 390 px)'}; E.zombieContrast.pass = E.zombieContrast.min >= .35;
    E.leoTrimHue = {per: {wide: zs[0].trimHue, lowWide: zs[1].trimHue}, rgb: {wide: zs[0].trimRGB, lowWide: zs[1].trimRGB}, target: '180-200 deg (zombieCity)'}; E.leoTrimHue.pass = zs.every(z => z.trimHue >= 180 && z.trimHue <= 200);
    E.pureBlack = {max: Math.max(...Object.values(M).map(r => r.pureBlackPct)), target: '<= 0.5 %', pass: Object.values(M).every(r => r.pureBlackPct <= .5)};
    if (TIMING) { const A = JSON.parse(await readFile('parts/locations/anchors-touchgrass.json', 'utf8')).shots, wts = {'dustTown.dustGray': A.dustTown.length, zombieCity: A.zombieCity.length, dragonPeaks: A.dragonPeaks.length, space: A.space.length};
      const tot = Object.values(wts).reduce((a, b) => a + b, 0), mean = Object.entries(wts).reduce((a, [k, n]) => a + E.worlds[k].sPerFrame1440 * n, 0) / tot, plain = ['dustTown.dustGray', 'dustTown.dustGold', 'zombieCity', 'dragonPeaks', 'space'].reduce((a, k) => a + E.worlds[k].sPerFrame1440, 0) / 5;
      E.farm = {frames: 5406, shards: 18, meanSPerFrame1440: +mean.toFixed(3), weights: 'BEATS shot count per world (dustGold timed, weighted with dustGray)', plainMeanSPerFrame1440: +plain.toFixed(3),
        projectedMinutes: +(5406 * mean / 18 / 60).toFixed(1), target: '<= 150 min (V4 D5)'}; E.farm.pass = E.farm.projectedMinutes <= 150; }
  }
  if (errors.length) console.error('page errors:', errors.slice(0, 5));
  await writeFile(`${out}/e0.json`, JSON.stringify(E, null, 1)); console.log(JSON.stringify(E, null, 1).slice(0, 2500));
} finally { await browser.close(); await server.close(); }
