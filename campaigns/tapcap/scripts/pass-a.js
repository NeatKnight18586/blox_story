// campaigns/tapcap/scripts/pass-a.js — Pass A gate: render the master Slime Guy (turnaround, 9 colours, paints, faces), Clix bust
// + gloved-hand poses, run the measured proportion check (TC-02), compose ONE contact sheet.
//   node campaigns/tapcap/scripts/pass-a.js [--ep campaigns/tapcap/ep01-rarity]
// Writes <ep>/qa/proportions.json (committed) and <ep>/review/pass-a/{panels/, pass-a-sheet.png} (never committed: may embed refs).
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../scripts/v2/server.js';
import {launch} from '../../../scripts/v2/browser.js';
import {classify, measure, judge} from '../assets/slimeguy/measure.js';
import {COLORS} from '../assets/slimeguy/presets.js';
import {TAP} from '../../../engine/tapcap.js';

const argv = process.argv.slice(2), ep = argv.includes('--ep') ? argv[argv.indexOf('--ep') + 1] : 'campaigns/tapcap/ep01-rarity';
const out = `${ep}/review/pass-a`, P = `${out}/panels`; mkdirSync(P, {recursive: true}); mkdirSync(`${ep}/qa`, {recursive: true});
const server = await startServer(), browser = await launch(), panels = [];
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/campaigns/tapcap/assets/lookdev.html`); await page.waitForFunction(() => window.__ld, null, {timeout: 60000});
  const run = async (k, o, name) => { const r = await page.evaluate(([k, o]) => window.__ld[k](o), [k, o]); if (errs.length) throw Error(errs.join('; '));
    if (r.png) { writeFileSync(`${P}/${name}.png`, Buffer.from(r.png.split(',')[1], 'base64')); panels.push(name); } return r; };
  // measured: front ortho flat ID at 1000 px per H, rest pose and full press
  const flat = async tap => { const r = await run('slime', {flat: true, ortho: true, view: 'front', w: 640, h: 1100, span: 1.1, tap}); return classify(Buffer.from(r.b64, 'base64'), r.w, r.h); };
  const m = measure(await flat(0), 1000), j = judge(m);
  const pressed = measure(await flat(-TAP.depth), 1000);
  const report = {asset: 'campaigns/tapcap/assets/slimeguy', method: 'front orthographic flat-ID render, 1000 px per H, row-majority bands', measured: m, ...j,
    tap: {depth: TAP.depth, switchBandPressed: pressed.bands.switch, heightPressed: pressed.heightH},
    notMeasured: ['torso top width 0.30 H sits under the head (set by construction)', 'side/back proportions (no reference yet)'],
    reference: 'campaigns/tapcap/refs/tapcap_turnaround.png: spec numbers only; the side-by-side needs the file'};
  writeFileSync(`${ep}/qa/proportions.json`, JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify({pass: j.pass, bands: m.bands, failures: j.failures, widths: m.widths, eye: m.eye, notch: m.notch, pressedSwitch: pressed.bands.switch}));
  // turnaround: gradient demo unit, ortho, same scale for all six views
  for (const v of ['front', 'back', 'left', 'right', 'top', 'bottom']) await run('slime', {preset: 'demo', ortho: true, view: v, w: 300, h: 420, span: 1.12}, `turn_${v}`);
  // lineup: 9 colours (3/4), then paints
  for (const c of Object.keys(COLORS).filter(k => k !== 'demo')) await run('slime', {preset: c, w: 300, h: 400, orbit: [24, 8, 3.0]}, `col_${c}`);
  await run('slime', {preset: 'banana', paint: 'fake_cosmic', w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_fake_cosmic');
  await run('slime', {preset: 'cosmic', paint: 'fake_banana', w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_fake_banana');
  await run('slime', {preset: 'cosmic', paint: 'fake_banana', w: 300, h: 400, target: 'fleck', dist: .42, fov: 24}, 'paint_fleck_back');
  await run('slime', {preset: 'banana', paint: 'fake_cosmic', run: .5, pool: .5, w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_run_banana');
  await run('slime', {preset: 'cosmic', paint: 'fake_banana', run: .5, pool: .5, w: 300, h: 400, orbit: [24, 8, 3.0]}, 'paint_run_sunny');
  await run('slime', {preset: 'banana', w: 300, h: 400, orbit: [24, 8, 3.0], tap: -TAP.depth}, 'tap_pressed');
  for (const f of ['default', 'hopeful', 'gasp', 'sad', 'joy']) await run('slime', {preset: 'banana', face: f, w: 300, h: 260, orbit: [0, 4, 1.25], target: [0, .83, 0], fov: 24}, `face_${f}`);
  await run('bust', {w: 360, h: 420}, 'clix_bust');
  for (const [pose, rot] of [['reach', [-.5, Math.PI + .5, 0]], ['tap', [0, Math.PI + .35, 0]], ['doubleTap', [0, Math.PI + .2, 0]]]) await run('hand', {pose, rot, w: 300, h: 420}, `hand_${pose}`);
  writeFileSync(`${out}/proportion-overlay.json`, JSON.stringify(m));
} finally { await browser.close(); await server.close(); }
execFileSync('python3', ['campaigns/tapcap/scripts/sheet-a.py', '--ep', ep], {stdio: 'inherit'});
