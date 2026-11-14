// scripts/v2/hair-gates.js — measured gates for hair v4 (Amendment A5 §A5). Exit 1 on any failure.
//   node scripts/v2/hair-gates.js [--out review/season1/hair-gates.json]
// 1. Scalp leak: head magenta, hair black, orthographic, from azimuth 120–240° every 30° and from above. Count magenta
//    pixels in the upper half of the head (screen rows above the head mask's vertical centre; from above, the rear half).
//    Pass: 0 (buzz < 2 % of those head pixels; bald skipped).
// 2. Distinct outlines: hair silhouettes at 128 px, front and side; every pair of styles has IoU ≤ 0.86 on at least one view.
// 3. No thin bits: hair silhouette at phone scale (head 56 px tall), front/side/back; a 1 px opening (erode 3×3, dilate 3×3)
//    may remove ≤ 6 % of the area.
// 4. Budgets (hero ≤ 2,400, mid ≤ 700, crowd ≤ 140) and EYE_LINE for all tiers (geometry, no rendering).
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {HAIR4_STYLES, HAIR4_BUDGET, EYE_LINE, FACE_X, hair4Geometry, hair4Triangles} from '../../avatar-style/hair4.js';

const argv = process.argv.slice(2), out = argv[argv.indexOf('--out') + 1] && argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'review/season1/hair-gates.json';
const LIM = {leak: 0, leakBuzz: .02, leakTight: .03, iou: .86, thin: .06};
const TIGHT = ['quiff', 'fade_textured', 'spiky_crop'];   // owner 2026-11-14: short boy cuts sit tighter above the ears; scalp leak < 3 % allowed for these three
const mask = (buf, px, test) => { const m = new Uint8Array(px * px); for (let i = 0; i < px * px; i++) m[i] = test(buf[i * 4], buf[i * 4 + 1], buf[i * 4 + 2]) ? 1 : 0; return m; };   // row 0 = bottom (GL)
const isMag = (r, g, b) => r > 180 && g < 80 && b > 180, isHair = (r, g, b) => r < 60 && g < 60 && b < 60, isAny = (r, g, b) => !(r > 240 && g > 240 && b > 240);
const morph = (m, px, op) => { const o = new Uint8Array(px * px); for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { let v = op === 'erode' ? 1 : 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx, s = yy < 0 || xx < 0 || yy >= px || xx >= px ? 0 : m[yy * px + xx]; if (op === 'erode') v &= s; else v |= s; } o[y * px + x] = v; } return o; };
const sum = m => m.reduce((a, b) => a + b, 0);

const server = await startServer(), browser = await launch();
const report = {limits: {...LIM, budget: HAIR4_BUDGET, eyeLine: EYE_LINE}, styles: {}, pairs: [], failures: []};
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/hairgate.html`); await page.waitForFunction(() => window.__hg, null, {timeout: 60000});
  const R = o => page.evaluate(o => window.__hg.render(o), o);
  const sil = {};
  for (const style of HAIR4_STYLES) {
    const r = {}; report.styles[style] = r;
    // budgets + eye line (all tiers)
    r.triangles = {}; r.eyeLow = {};
    for (const tier of ['hero', 'mid', 'crowd']) {
      const g = hair4Geometry(style, '#5a3a22', tier); r.triangles[tier] = hair4Triangles(g);
      if (r.triangles[tier] > HAIR4_BUDGET[tier]) report.failures.push(`${style} ${tier} ${r.triangles[tier]} tris > ${HAIR4_BUDGET[tier]}`);
      let low = Infinity; if (g) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0 && Math.abs(p.getX(i)) < FACE_X) low = Math.min(low, p.getY(i)); }
      r.eyeLow[tier] = Number.isFinite(low) ? +low.toFixed(3) : null; if (low < EYE_LINE) report.failures.push(`${style} ${tier} hangs to y ${low.toFixed(3)} in front of the face`);
    }
    if (style === 'bald') { r.skipped = 'bald'; continue; }
    // 1. scalp leak
    const px = 192; r.leak = {};
    for (const view of [...[120, 150, 180, 210, 240].map(az => ({az, key: 'az' + az})), {top: true, key: 'top'}]) {
      const both = await R({style, az: view.az ?? 0, top: !!view.top, px}), headOnly = await R({style, az: view.az ?? 0, top: !!view.top, px, headOnly: true});
      const H = mask(headOnly, px, isMag), Mg = mask(both, px, isMag); let y0 = px, y1 = -1; for (let i = 0; i < px * px; i++) if (H[i]) { const y = Math.floor(i / px); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const mid = (y0 + y1) / 2; let n = 0, tot = 0; for (let i = 0; i < px * px; i++) { const y = Math.floor(i / px); if (H[i] && y > mid) { tot++; if (Mg[i]) n++; } }   // GL row 0 = bottom: y > mid = upper half (top view: up = −z → rear half)
      r.leak[view.key] = +(n / Math.max(1, tot)).toFixed(4);
      const lim = style === 'buzz' ? LIM.leakBuzz : TIGHT.includes(style) ? LIM.leakTight : LIM.leak;
      if (n / Math.max(1, tot) > lim) report.failures.push(`${style} scalp leak ${view.key} ${(100 * n / tot).toFixed(2)} % (${n} px) > ${lim * 100} %`);
    }
    // 2. silhouettes for IoU (hair only, 128 px)
    sil[style] = {front: mask(await R({style, az: 0, px: 128, hairOnly: true}), 128, isHair), side: mask(await R({style, az: 90, px: 128, hairOnly: true}), 128, isHair)};
    // 3. thin bits at phone scale: head 56 px tall → span so that headHeight maps to 56 px in a 96 px frame
    const hh = await page.evaluate(() => window.__hg.headHeight), PX = 96, span = hh * PX / 56; r.thin = {};
    for (const az of [0, 90, 180]) { const m = mask(await R({style, az, px: PX, span, hairOnly: true}), PX, isHair), a0 = sum(m), a1 = sum(morph(morph(m, PX, 'erode'), PX, 'dilate'));
      const lost = a0 ? (a0 - a1) / a0 : 0; r.thin['az' + az] = +lost.toFixed(4); if (lost > LIM.thin) report.failures.push(`${style} thin bits az${az}: ${(lost * 100).toFixed(1)} % lost > 6 %`); }
  }
  // IoU pairs
  const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return u ? i / u : 0; };
  const names = Object.keys(sil);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const f = iou(sil[names[i]].front, sil[names[j]].front), s = iou(sil[names[i]].side, sil[names[j]].side), best = Math.min(f, s);
    report.pairs.push({a: names[i], b: names[j], front: +f.toFixed(3), side: +s.toFixed(3)});
    if (best > LIM.iou) report.failures.push(`${names[i]} vs ${names[j]}: IoU front ${f.toFixed(3)}, side ${s.toFixed(3)} (> 0.86 on both)`);
  }
  report.pairs.sort((a, b) => Math.min(b.front, b.side) - Math.min(a.front, a.side)); report.closestPairs = report.pairs.slice(0, 5); delete report.pairs;
  if (errors.length) report.failures.push(...errors);
  report.result = report.failures.length ? 'FAIL' : 'PASS';
  await mkdir(path.dirname(out), {recursive: true}); await writeFile(out, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({result: report.result, failures: report.failures, closestPairs: report.closestPairs}, null, 1));
  process.exitCode = report.failures.length ? 1 : 0;
} finally { await browser.close(); await server.close(); }
