// scripts/v2/build-gates.js — measured gate for the adult_f torso (owner 2026-11-14). Exit 1 on any failure.
//   node scripts/v2/build-gates.js [--out review/season1/build-gates.json] [--png renders/v2/build-gates/adult_f.png]
// adult_f, front, orthographic, 390 × 693 (phone width), flat colours (torso red, arms blue, legs green, background white),
// full body in frame. Torso width is measured per pixel row (the red run). PASS if all of:
//   1. waist/top = 0.66–0.70 at 60–66 % down from the shoulders (narrowest row in that band; top = median of rows 5–20 %);
//   2. at the waist row, the gap between each arm's inner edge and the torso is ≥ 12 % of the top width;
//   3. at the shoulders (rows 5–15 % down), each arm's inner edge touches the torso: ≤ 1 px of background between them;
//   4. hips: the bottom torso row's width matches the legs' outer span (0.1 unit below their bevelled top) within 1 px a side,
//      with ≤ 1 px of background rows between them.
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const out = arg('--out', 'review/season1/build-gates.json'), png = arg('--png', 'renders/v2/build-gates/adult_f.png');
const LIM = {waist: [.66, .70], band: [.60, .66], armGap: .12, shoulderGap: 1, hipMatch: 1};
const W = 390, H = 693;
const cls = (b, i) => { const r = b[i * 4], g = b[i * 4 + 1], bl = b[i * 4 + 2]; return r > 200 && g < 60 && bl < 60 ? 'T' : r < 60 && g < 60 && bl > 200 ? 'A' : r < 60 && g > 200 && bl < 60 ? 'L' : r > 200 && g > 200 && bl < 60 ? 'H' : r > 240 && g > 240 && bl > 240 ? '.' : '?'; };
export function measure(buf, w, h) {
  const row = y => { const r = []; for (let x = 0; x < w; x++) r.push(cls(buf, ((h - 1 - y) * w + x))); return r; };   // y 0 = top of image
  const rows = Array.from({length: h}, (_, y) => row(y)), run = r => { const xs = r.map((c, x) => c === 'T' ? x : -1).filter(x => x >= 0); return xs.length ? {x0: xs[0], x1: xs[xs.length - 1], n: xs.length} : null; };
  const tr = rows.map(run), ys = tr.map((t, y) => t ? y : -1).filter(y => y >= 0), y0 = ys[0], y1 = ys[ys.length - 1], th = y1 - y0 + 1;
  const at = f => y0 + Math.round(f * (th - 1)), med = a => [...a].sort((p, q) => p - q)[a.length >> 1];
  const topW = med(Array.from({length: at(.2) - at(.05) + 1}, (_, k) => tr[at(.05) + k].n));
  let waist = {n: Infinity}; for (let y = at(LIM.band[0]); y <= at(LIM.band[1]); y++) if (tr[y].n < waist.n) waist = {n: tr[y].n, y};
  let narrow = {n: Infinity}; for (let y = at(.05); y <= at(.95); y++) if (tr[y].n < narrow.n) narrow = {n: tr[y].n, y};
  const armGap = y => { const r = rows[y], t = tr[y]; let l = t.x0 - 1, g1 = 0, g2 = 0; while (l >= 0 && r[l] !== 'A') { g1++; l--; } let q = t.x1 + 1; while (q < w && r[q] !== 'A') { g2++; q++; } return [l < 0 ? Infinity : g1, q >= w ? Infinity : g2]; };
  const wg = armGap(waist.y), sh = []; for (let y = at(.05); y <= at(.15); y++) sh.push(Math.max(...armGap(y)));
  const legRow = rows.findIndex((r, y) => y > y1 && r.includes('L')), lr = rows[legRow + Math.round(.1 * w / 4.4)],   // 0.1 unit below the leg top: past the hero bevel (same as adult_m)
    lx = lr.map((c, x) => c === 'L' ? x : -1).filter(x => x >= 0);
  const hip = tr[y1], hipGapRows = legRow - y1 - 1;
  return {torsoPx: {top: y0, bottom: y1, height: th}, topWidthPx: topW, waist: {px: waist.n, ratio: +(waist.n / topW).toFixed(4), atDown: +((waist.y - y0) / (th - 1)).toFixed(4)},
    narrowest: {ratio: +(narrow.n / topW).toFixed(4), atDown: +((narrow.y - y0) / (th - 1)).toFixed(4)},
    armGapAtWaist: {px: wg, fracOfTop: wg.map(g => +(g / topW).toFixed(4))}, shoulderGapPx: {max: Math.max(...sh), rows: sh.length},
    hips: {torsoPx: [hip.x0, hip.x1], legsPx: [lx[0], lx[lx.length - 1]], rowsBetween: hipGapRows}};
}
const server = await startServer(), browser = await launch();
const report = {limits: LIM, frame: [W, H], failures: []};
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/buildgate.html`); await page.waitForFunction(() => window.__bg, null, {timeout: 60000});
  for (const [key, build, body] of [['adult_f', 'adult_f', 'v1'], ['adult_m', 'adult_m', 'v1'], ['adult_f_v6', 'adult_f', 'v6']]) {   // E4: adult_f_v6 = the ADULT_F slot's Actor v6 body, same limits
    const {px, unitPx} = await page.evaluate(o => window.__bg.render(o), {build, w: W, h: H, body}), buf = Uint8Array.from(px), m = measure(buf, W, H);
    report[key] = {pxPerUnit: +unitPx.toFixed(2), ...m};
    if (key !== 'adult_m') {
      const F = key === 'adult_f' ? report.failures : {push: x => report.failures.push(`${key}: ${x}`)};
      if (m.waist.ratio < LIM.waist[0] || m.waist.ratio > LIM.waist[1]) F.push(`waist/top ${m.waist.ratio} outside ${LIM.waist}`);
      if (m.narrowest.atDown < LIM.band[0] || m.narrowest.atDown > LIM.band[1]) F.push(`narrowest row at ${m.narrowest.atDown} down, outside ${LIM.band}`);
      for (const f of m.armGapAtWaist.fracOfTop) if (f < LIM.armGap) F.push(`arm gap at waist ${f} of top < ${LIM.armGap}`);
      if (m.shoulderGapPx.max > LIM.shoulderGap) F.push(`shoulder gap ${m.shoulderGapPx.max} px > ${LIM.shoulderGap}`);
      if (Math.abs(m.hips.torsoPx[0] - m.hips.legsPx[0]) > LIM.hipMatch || Math.abs(m.hips.torsoPx[1] - m.hips.legsPx[1]) > LIM.hipMatch) F.push(`hips ${m.hips.torsoPx} vs legs ${m.hips.legsPx}`);
      if (m.hips.rowsBetween > LIM.hipMatch) F.push(`${m.hips.rowsBetween} background rows between hips and legs`);
      const pngK = key === 'adult_f' ? png : png.replace(/\.png$/, `-${key}.png`); await mkdir(path.dirname(pngK), {recursive: true});
      const {execFileSync} = await import('node:child_process'); const raw = pngK.replace(/\.png$/, '.rgba'); await writeFile(raw, buf);
      execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.frombytes("RGBA",(int(sys.argv[2]),int(sys.argv[3])),open(sys.argv[1],"rb").read()).transpose(Image.FLIP_TOP_BOTTOM).save(sys.argv[4])', raw, String(W), String(H), pngK]);
    }
  }
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }
report.pass = report.failures.length === 0;
await mkdir(path.dirname(out), {recursive: true}); await writeFile(out, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({pass: report.pass, failures: report.failures, adult_f: {waist: report.adult_f.waist, narrowest: report.adult_f.narrowest, armGap: report.adult_f.armGapAtWaist, shoulder: report.adult_f.shoulderGapPx, hips: report.adult_f.hips, pxPerUnit: report.adult_f.pxPerUnit}}));
console.log(report.pass ? 'PASS build gates' : 'FAIL build gates'); process.exit(report.pass ? 0 : 1);
