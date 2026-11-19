// campaigns/tapcap/scripts/pass-a.js — Pass A gate: render the master Slime Guy (turnaround, 9 colours, paints, faces), Clix bust
// + gloved-hand poses, run the measured proportion check (TC-02), compose ONE contact sheet.
//   node campaigns/tapcap/scripts/pass-a.js [--ep campaigns/tapcap/ep01-rarity]
// Writes <ep>/qa/proportions.json (committed) and <ep>/review/pass-a/{panels/, pass-a-sheet.png} (never committed: may embed refs).
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';
import {classify, measure, judge} from '../assets/slimeguy/measure.js';
import {COLORS, BANDS, WIDTHS, SPEC_V1} from '../assets/slimeguy/presets.js';
import {armBendDeg} from '../assets/slimeguy/index.js';
import {readFileSync} from 'node:fs';
import {TAP} from '../../../engine/tapcap.js';

const argv = process.argv.slice(2), ep = argv.includes('--ep') ? argv[argv.indexOf('--ep') + 1] : 'campaigns/tapcap/ep01-rarity';
const out = `${ep}/review/pass-a`, P = `${out}/panels`; mkdirSync(P, {recursive: true}); mkdirSync(`${ep}/qa`, {recursive: true});
const server = await startServer(), browser = await launch(), panels = [];
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/campaigns/tapcap/assets/lookdev.html`); await page.waitForFunction(() => window.__ld, null, {timeout: 60000});
  const run = async (k, o, name) => { const r = await page.evaluate(([k, o]) => window.__ld[k](o), [k, o]); if (errs.length) throw Error(errs.join('; '));
    if (r.png) { writeFileSync(`${P}/${name}.png`, Buffer.from(r.png.split(',')[1], 'base64')); panels.push(name);
      if (!o.flat && !o.flatMask) execFileSync('python3', ['campaigns/tapcap/scripts/bloom.py', `${P}/${name}.png`]); } return r; };
  // measured: front ortho flat ID at 1000 px per H, rest pose and full press
  const flat = async tap => { const r = await run('slime', {flat: true, ortho: true, view: 'front', w: 640, h: 1100, span: 1.1, tap}); return classify(Buffer.from(r.b64, 'base64'), r.w, r.h); };
  const m = measure(await flat(0), 1000), j = judge(m);
  const pressed = measure(await flat(-TAP.depth), 1000);
  const ref = JSON.parse(execFileSync('python3', ['campaigns/tapcap/scripts/ref_measure.py'], {encoding: 'utf8'}));
  // §3 measured checks
  const mask = await run('slime', {preset: 'banana', paint: 'fake_cosmic', flatMask: true, ortho: true, view: 'front', w: 640, h: 1100, span: 1.1}, 'mask_fake_cosmic');
  const drips = mask.drips, frontMax = Math.max(...drips.filter(d => d.side === 0).map(d => d.len)), sideMax = Math.max(...drips.filter(d => d.side % 2 === 1).map(d => d.len));
  await run('slime', {preset: 'cosmic', w: 120, h: 160, orbit: [24, 8, 3.0]}, 'small_cosmic');
  await run('slime', {preset: 'grape', w: 120, h: 160, orbit: [24, 8, 3.0]}, 'small_grape');
  const px = JSON.parse(execFileSync('python3', ['campaigns/tapcap/scripts/measure-a.py', '--panels', P], {encoding: 'utf8'}));
  const acceptance = {
    A2: {pass: j.pass, ref: ref.bands, model: m.bands, failures: j.failures},
    A3: {pass: px.cosmic.sparkles >= 3 && px.cosmic.hues >= 3, ...px},
    A4: {pass: px.mask.yellow >= .10, ...px.mask},
    A5: {pass: armBendDeg() >= 25, deg: +armBendDeg().toFixed(1)},
    A6: {pass: frontMax <= .6 * sideMax && !drips.some(d => d.side === 0 && Math.abs(d.u) < .1), frontMax, sideMax, ratio: +(frontMax / sideMax).toFixed(3), frontU: drips.filter(d => d.side === 0).map(d => d.u)},
  };
  const report = {asset: 'campaigns/tapcap/assets/slimeguy', method: 'front orthographic flat-ID render, 1000 px per H, row-majority bands', measured: m, ...j,
    reference: {file: 'campaigns/tapcap/refs/tapcap_turnaround.png (front view)', measured: ref}, specV1: SPEC_V1, targets: {bands: BANDS, widths: WIDTHS},
    tap: {depth: TAP.depth, switchBandPressed: pressed.bands.switch, heightPressed: pressed.heightH}, acceptance,
    notMeasured: ['torso top width sits under the head (set by construction)', 'side/back proportions vs the ref']};
  writeFileSync(`${ep}/qa/proportions.json`, JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify({bands: m.bands, ref: ref.bands, widths: m.widths, failures: j.failures, pressedSwitch: pressed.bands.switch, acceptance}));
  // ref overlay: flat-ID front at the ref's pixel height (1 px per ref px)
  { const k = ref.pxHeight / 1000, r = await page.evaluate(o => window.__ld.slime(o), {flat: true, ortho: true, view: 'front', w: Math.round(640 * k), h: Math.round(1100 * k), span: 1.1});
    writeFileSync(`${out}/flat_refscale.rgba`, Buffer.from(r.b64, 'base64')); writeFileSync(`${out}/flat_refscale.json`, JSON.stringify({w: r.w, h: r.h, pxPerH: ref.pxHeight})); }
  // lineup: 9 colours (3/4), paints
  for (const c of Object.keys(COLORS).filter(k => k !== 'demo')) await run('slime', {preset: c, w: 300, h: 400, orbit: [24, 8, 3.0]}, `col_${c}`);
  await run('slime', {preset: 'banana', paint: 'fake_cosmic', w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_fake_cosmic');
  await run('slime', {preset: 'cosmic', paint: 'fake_banana', w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_fake_banana');
  await run('slime', {preset: 'banana', paint: 'fake_cosmic', run: .5, pool: .5, w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_run_banana');
  await run('slime', {preset: 'cosmic', paint: 'fake_banana', run: .5, pool: .5, w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_run_sunny');
  for (const f of ['default', 'hopeful', 'gasp', 'sad', 'joy']) await run('slime', {preset: 'banana', face: f, w: 300, h: 260, orbit: [0, 4, 1.25], target: [0, .82, 0], fov: 24}, `face_${f}`);
  // Clix: turnaround (front, 3/4, side, back), 3 face candidates, tap pose
  let hair = null;
  let audit = null; for (const [v, az] of [['front', 0], ['34', -35], ['side', -90], ['back', 180]]) ({hair, audit} = await run('clix', {az, w: 300, h: 420}, `clix_${v}`));
  for (const f of ['grin', 'content', 'calm']) await run('clix', {face: f, head: true, w: 300, h: 300}, `clixface_${f}`);
  const tap = (await run('clixTap', {w: 300, h: 420}, 'clix_tap')).contact;
  report.clix = {hair, tap, audit}; writeFileSync(`${ep}/qa/proportions.json`, JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify({hair, tap, audit}));
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['campaigns/tapcap/scripts/sheet-a.py', '--ep', ep], {stdio: 'inherit'});
