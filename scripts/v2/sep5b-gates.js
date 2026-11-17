// scripts/v2/sep5b-gates.js — Look 5b gates → review/toyhouse/sep5b-gates.json (fixture engine/fixtures/toyhouse/set5b.json).
// Every anchor shot whose subject (a cast actor) covers ≥ 0.5 % of the frame, measured at 1080×1920 on the middle frame:
//   1. rim: mean luma of the 3 px inner silhouette band ≥ 1.3 × the actor interior
//   2. light linking: subject mean luma / background mean luma in 1.15–1.6
//   3. brightness: head block 20th-percentile luma (shadow side) .35–.45, 99th percentile (highlight) ≤ .92
//   4. texture: Laplacian variance background ≥ 2 × actor interior (close / medium shots)
//   5. contact: floor luma beside the feet (inside the blob, off the silhouette) ≥ 20 % darker than 1 unit further out
// + owner method (07d3fa3 decision): haze = same-class objects (gondola frames) nearer than 15 vs farther than 60, RMS far/near
//   ≤ 0.50 in every non-dawn shot that has both (else n/a); saturation subject/bg ≥ 1.6 (track re-run with the yellow/blue tape);
//   bench ≤ 0.69 s/frame at 1080, ≤ 90k frustum triangles.        node scripts/v2/sep5b-gates.js [--spec f] [--no-bench] [--out f]
import {execFileSync} from 'node:child_process';
import {writeFileSync, mkdirSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SPEC = arg('--spec', 'engine/fixtures/toyhouse/set5b.json'), OUT = arg('--out', 'review/toyhouse/sep5b-gates.json'), W = 1080, H = 1920, fails = [], rep = {spec: SPEC};
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(SPEC)}&aa=1`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 300000}); if (errs.length) throw Error(errs.join('; '));
  const m = await page.evaluate(({W, H}) => { const E = window.__episode, out = {sep: {}, haze: {}, sat: {}}, mid = s => s.start + Math.floor(s.frames / 2);
    for (const s of E.shots) {
      if (s.subject) { const r = E.sepMeasure(mid(s), {w: W, h: H}); if (!r.missing && r.px >= .005 * W * H) out.sep[s.id] = r; }
      const sat = E.satMeasure(mid(s)); if (sat.subjPx >= .005 * 390 * 693) out.sat[s.id] = {ratio: +sat.ratio.toFixed(2), subj: +sat.subj.toFixed(3), bg: +sat.bg.toFixed(3)};
      if (s.look !== 'dawn') { const h = E.classHaze(mid(s)); out.haze[s.id] = h; }
    }
    return out; }, {W, H});
  await page.close();
  const r3 = v => v === null || v === undefined ? null : +v.toFixed(3);
  rep.sep = Object.fromEntries(Object.entries(m.sep).map(([k, v]) => [k, {size: v.size, subject: v.subject, px: v.px, rim: r3(v.rim), link: r3(v.link), headShadow: r3(v.head?.shadow), headHigh: r3(v.head?.high), lap: r3(v.lap), lapActor: v.lapActor && +v.lapActor.toExponential(2), lapBg: v.lapBg && +v.lapBg.toExponential(2), contact: v.contact ? {under: r3(v.contact.under), floor: r3(v.contact.floor), drop: r3(v.contact.drop)} : null}]));
  for (const [k, v] of Object.entries(rep.sep)) {
    if (!(v.rim >= 1.3)) fails.push(`rim ${k}: edge/interior ${v.rim} < 1.3`);
    if (!(v.link >= 1.15 && v.link <= 1.6)) fails.push(`light link ${k}: subject/background ${v.link} outside 1.15–1.6`);
    if (v.headShadow !== null && !(v.headShadow >= .35 && v.headShadow <= .45)) fails.push(`head shadow ${k}: ${v.headShadow} outside .35–.45`);
    if (v.headHigh !== null && v.headHigh > .92) fails.push(`head highlight ${k}: ${v.headHigh} > .92`);
    if (['close', 'medium'].includes(v.size) && !(v.lap >= 2)) fails.push(`texture ${k}: Laplacian bg/actor ${v.lap} < 2`);
    if (v.contact && !(v.contact.drop >= .2)) fails.push(`contact ${k}: drop ${v.contact.drop} < 0.20`);   // n/a when the feet are off-frame (close-ups)
  }
  rep.haze = Object.fromEntries(Object.entries(m.haze).map(([k, v]) => [k, v.ratio === null ? {result: 'n/a', nearPx: v.nearPx, farPx: v.farPx} : {nearRms: r3(v.nearRms), farRms: r3(v.farRms), nearPx: v.nearPx, farPx: v.farPx, ratio: r3(v.ratio)}]));
  for (const [k, v] of Object.entries(rep.haze)) if (v.ratio !== undefined && v.ratio > .5) fails.push(`haze ${k}: same-class far/near ${v.ratio} > 0.50`);
  if (Object.values(rep.haze).filter(v => v.ratio !== undefined).length < 1) fails.push('haze: no shot has gondola frames both near and far');
  rep.sat = m.sat; for (const [k, v] of Object.entries(m.sat)) if (v.ratio < 1.6) fails.push(`saturation ${k}: ${v.ratio} < 1.6`);
} finally { await browser.close(); await server.close(); }
if (!process.argv.includes('--no-bench')) { const out = execFileSync('npm', ['run', 'v2:bench', '--', '--spec', SPEC], {encoding: 'utf8', maxBuffer: 1 << 26}).trim().split('\n').at(-1); const b = JSON.parse(out);
  rep.bench = {s720: b.meanSecondsPerFrame, s1080: b.meanSecondsPerFrame1080, maxTriangles: b.maxTriangles};
  if (b.meanSecondsPerFrame1080 > .69) fails.push(`bench ${b.meanSecondsPerFrame1080} s/frame at 1080 > 0.69`); if (b.maxTriangles > 90000) fails.push(`frustum triangles ${b.maxTriangles} > 90,000`); }
rep.failures = fails; rep.result = fails.length ? 'FAIL' : 'PASS';
mkdirSync('review/toyhouse', {recursive: true}); writeFileSync(OUT, JSON.stringify(rep, null, 1)); console.log(JSON.stringify({result: rep.result, failures: fails})); process.exitCode = fails.length ? 1 : 0;
