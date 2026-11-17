// scripts/v2/look6-gates.js — Look 6 gates → review/toyhouse/look6-gates.json (fixture engine/fixtures/toyhouse/set6.json).
// Owner targets (8159612), measured at 1080×1920 on the middle frame of every anchor shot whose subject covers ≥ 0.5 % of the frame:
//   1. values: background mean luma .22–.40, subject mean luma .45–.75
//   2. local contrast (replaces the light-link ratio): |subject − background within 1.5 body widths| / background ≥ .35
//   3. rim: 3 px inner silhouette band ≥ 1.3 × the actor interior
// + haze: same-class (gondola frames) far/near RMS ≤ .50 where both exist · ceiling median luma ≤ .12 (eye-level, ceiling seen) ·
//   top-down (S1-top): every zone's mean colour vs the open floor RGB distance ≥ 40 · bench ≤ 0.69 s/frame at 1080, ≤ 90k triangles.
//   node scripts/v2/look6-gates.js [--spec f] [--no-bench] [--out f] [--w 1080 --h 1920]
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdirSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {ZONES, trackPoint} from '../../parts/sets4/toyhouse.js';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SPEC = arg('--spec', 'engine/fixtures/toyhouse/set6.json'), OUT = arg('--out', 'review/toyhouse/look6-gates.json'), W = +arg('--w', 1080), H = +arg('--h', 1920), fails = [], rep = {spec: SPEC, size: [W, H]};
const server = await startServer(), browser = await launch();
const r3 = v => v === null || v === undefined ? null : +v.toFixed(3);
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(SPEC)}&aa=1`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 400000}); if (errs.length) throw Error(errs.join('; '));
  const ring = Array.from({length: 16}, (_, i) => trackPoint(i / 16).slice(0, 2));
  const m = await page.evaluate(({W, H, Z, RING}) => { const E = window.__episode, out = {sep: {}, haze: {}, ceil: {}, top: null, bake: E.bake}, mid = s => s.start + Math.floor(s.frames / 2);
    for (const s of E.shots) {
      if (s.subject) { const r = E.sepMeasure(mid(s), {w: W, h: H}); if (!r.missing && r.px >= .005 * W * H) out.sep[s.id] = r; }
      if (s.look !== 'dawn' && s.move !== 'topDown') { out.haze[s.id] = E.classHaze(mid(s)); out.ceil[s.id] = E.ceilingLuma(mid(s)); }
      if (s.move === 'topDown') { E.renderFrame(mid(s), 390, 693); const cam = E.debug.camera, cv = E.debug.renderer.domElement, c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
        const px = (x, z) => { const v = new cam.position.constructor(x, 0, z).project(cam); return [(v.x * .5 + .5) * cv.width, (-v.y * .5 + .5) * cv.height]; };
        const mean = ([x0, z0, x1, z1]) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) * .3, hd = (z1 - z0) * .3, a = px(cx - hw, cz - hd), b = px(cx + hw, cz + hd), X0 = Math.round(Math.min(a[0], b[0])), Y0 = Math.round(Math.min(a[1], b[1])), w = Math.max(2, Math.round(Math.abs(b[0] - a[0]))), h = Math.max(2, Math.round(Math.abs(b[1] - a[1])));
          const d = g.getImageData(Math.max(0, X0), Math.max(0, Y0), w, h).data; let r = 0, gg = 0, bb = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; } return [r / n, gg / n, bb / n]; };
        const patch = ([x, z]) => mean([x - 1.2, z - 1.2, x + 1.2, z + 1.2]), avg = L => { const mm = L.map(patch); return [0, 1, 2].map(k => mm.reduce((a, c) => a + c[k], 0) / mm.length); };
        out.top = {floor: mean([-6, 8, 4, 20])}; for (const [k, z] of Object.entries(Z)) out.top[k] = k === 'track' ? avg(RING) : mean(z); }
    }
    return out; }, {W, H, Z: ZONES, RING: ring});
  await page.close();
  rep.bake = m.bake;
  rep.sep = Object.fromEntries(Object.entries(m.sep).map(([k, v]) => [k, {size: v.size, subject: v.subject, subjL: r3(v.subjL), bgL: r3(v.bgL), localBg: r3(v.localBg), contrast: r3(v.contrast), rim: r3(v.rim)}]));
  for (const [k, v] of Object.entries(rep.sep)) {
    if (!(v.bgL >= .22 && v.bgL <= .40)) fails.push(`background ${k}: luma ${v.bgL} outside .22–.40`);
    if (!(v.subjL >= .45 && v.subjL <= .75)) fails.push(`subject ${k}: luma ${v.subjL} outside .45–.75`);
    if (!(v.contrast >= .35)) fails.push(`local contrast ${k}: ${v.contrast} < .35`);
    if (!(v.rim >= 1.3)) fails.push(`rim ${k}: edge/interior ${v.rim} < 1.3`);
  }
  rep.haze = Object.fromEntries(Object.entries(m.haze).map(([k, v]) => [k, v.ratio === null ? 'n/a' : r3(v.ratio)]));
  for (const [k, v] of Object.entries(rep.haze)) if (v !== 'n/a' && v > .5) fails.push(`haze ${k}: same-class far/near ${v} > 0.50`);
  rep.ceiling = Object.fromEntries(Object.entries(m.ceil).map(([k, v]) => [k, v.median === null ? 'n/a' : r3(v.median)]));
  for (const [k, v] of Object.entries(rep.ceiling)) if (v !== 'n/a' && v > .12) fails.push(`ceiling ${k}: median luma ${v} > .12`);
  if (m.top) { const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); rep.topDown = {floorRGB: m.top.floor.map(Math.round), zoneDeltaRGB: {}};
    for (const k of Object.keys(ZONES)) { const v = +d(m.top[k], m.top.floor).toFixed(1); rep.topDown.zoneDeltaRGB[k] = v; if (v < 40) fails.push(`top-down: zone ${k} vs floor ${v} < 40`); } }
} finally { await browser.close(); await server.close(); }
if (!process.argv.includes('--no-bench')) { let raw; try { raw = execFileSync('npm', ['run', 'v2:bench', '--', '--spec', SPEC], {encoding: 'utf8', maxBuffer: 1 << 26}); } catch (e) { raw = String(e.stdout ?? ''); }   // bench exits 1 on its own FAIL
  const b = JSON.parse(raw.trim().split('\n').at(-1));
  rep.bench = {s720: b.meanSecondsPerFrame, s1080: b.meanSecondsPerFrame1080, maxTriangles: b.maxTriangles};
  if (b.meanSecondsPerFrame1080 > .69) fails.push(`bench ${b.meanSecondsPerFrame1080} s/frame at 1080 > 0.69`); if (b.maxTriangles > 90000) fails.push(`frustum triangles ${b.maxTriangles} > 90,000`); }
rep.failures = fails; rep.result = fails.length ? 'FAIL' : 'PASS';
mkdirSync('review/toyhouse', {recursive: true}); writeFileSync(OUT, JSON.stringify(rep, null, 1)); console.log(JSON.stringify({result: rep.result, failures: fails}));
process.exitCode = fails.length ? 1 : 0;
