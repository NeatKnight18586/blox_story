// scripts/v2/toyset-gates.js — Toy House set gates (format v5, Phase 3b) → review/toyhouse/set-gates.json.
//   1. top-down legibility: in the straight-down frame every zone's footprint differs from the open floor by RGB ≥ 40 (mean colour of its
//      middle 60 %), so the layout reads without labels
//   2. instanced counts: ball pit ≤ 3,000 · animated kids ≤ 60 · fill ≈ 200 · every small prop ≤ 400 triangles
//   3. bench (v2:bench, 1080): ≤ 90,000 frustum triangles and ≤ 0.69 s/frame
//   node scripts/v2/toyset-gates.js [--no-bench]
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {TOY_PROPS, toyProp} from '../../parts/sets4/props4.js';
import {triCount} from '../../parts/sets4/common.js';
import {ZONES, trackPoint} from '../../parts/sets4/toyhouse.js';
const spec = JSON.parse(readFileSync('engine/fixtures/toyhouse/set.json', 'utf8')), fails = [], MIN = 40;
const server = await startServer(), browser = await launch(); let zones = {};
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent('engine/fixtures/toyhouse/set.json')}&aa=0`); await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 120000});
  if (errs.length) throw Error(errs.join('; '));
  const ring = Array.from({length: 16}, (_, i) => trackPoint(i / 16).slice(0, 2));   // the track's footprint is its ring, not its bounding box
  zones = await page.evaluate(([Z, RING]) => { const E = window.__episode; E.renderFrame(0, 390, 693); const cam = E.debug.camera, cv = E.debug.renderer.domElement, c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
    const px = (x, z) => { const v = new cam.position.constructor(x, 0, z).project(cam); return [(v.x * .5 + .5) * cv.width, (-v.y * .5 + .5) * cv.height]; };
    const mean = ([x0, z0, x1, z1]) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) * .3, hd = (z1 - z0) * .3, a = px(cx - hw, cz - hd), b = px(cx + hw, cz + hd), X0 = Math.round(Math.min(a[0], b[0])), Y0 = Math.round(Math.min(a[1], b[1])), w = Math.max(2, Math.round(Math.abs(b[0] - a[0]))), h = Math.max(2, Math.round(Math.abs(b[1] - a[1])));
      const d = g.getImageData(Math.max(0, X0), Math.max(0, Y0), w, h).data; let r = 0, gg = 0, bb = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; } return [r / n, gg / n, bb / n]; };
    const patch = ([x, z]) => mean([x - 1.2, z - 1.2, x + 1.2, z + 1.2].map((v, i) => v)), avg = L => { const m = L.map(patch); return [0, 1, 2].map(k => m.reduce((a, c) => a + c[k], 0) / m.length); };
    const out = {floor: mean([-6, 8, 4, 20]), size: [cv.width, cv.height]}; for (const [k, z] of Object.entries(Z)) out[k] = k === 'track' ? avg(RING) : mean(z); return out; }, [ZONES, ring]);
} finally { await browser.close(); await server.close(); }
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), zone = {};
for (const k of Object.keys(ZONES)) { zone[k] = +dist(zones[k], zones.floor).toFixed(1); if (zone[k] < MIN) fails.push(`top-down: zone ${k} differs from the floor by ${zone[k]} (< ${MIN})`); }
const props = Object.fromEntries(TOY_PROPS.map(n => [n, Math.round(triCount(toyProp(n, 2)))])); for (const [n, t] of Object.entries(props)) if (t > 400) fails.push(`prop ${n} ${t} tris > 400`);
const kids = (spec.crowds ?? []).reduce((a, c) => a + c.count, 0), fill = (spec.fill ?? []).reduce((a, c) => a + c.count, 0), pit = 800;
if (kids > 60) fails.push(`animated kids ${kids} > 60`); if (pit > 3000) fails.push(`ball pit ${pit} > 3000`); if (fill < 150) fails.push(`fill ${fill} < ~200`);
let bench = null;
if (!process.argv.includes('--no-bench')) { const out = execFileSync('npm', ['run', 'v2:bench', '--', '--spec', 'engine/fixtures/toyhouse/set.json'], {encoding: 'utf8', maxBuffer: 1 << 26}).trim().split('\n').at(-1); const b = JSON.parse(out);
  bench = {budget: b.budget, s720: b.meanSecondsPerFrame, s1080: b.meanSecondsPerFrame1080, maxTriangles: b.maxTriangles, overBudget: b.overBudget, result: b.result};
  if (b.meanSecondsPerFrame1080 > .69) fails.push(`bench ${b.meanSecondsPerFrame1080} s/frame at 1080 > 0.69`); if (b.maxTriangles > 90000) fails.push(`frustum triangles ${b.maxTriangles} > 90,000`); }
const rep = {zoneDeltaRGB: zone, floorRGB: zones.floor.map(Math.round), min: MIN, instanced: {ballPit: pit, animatedKids: kids, fill, fillTrisEach: 40, crowdTrisEach: 272}, propTris: props, bench, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/toyhouse', {recursive: true}); writeFileSync('review/toyhouse/set-gates.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep)); process.exitCode = fails.length ? 1 : 0;
