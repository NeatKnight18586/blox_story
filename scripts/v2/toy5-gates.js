// scripts/v2/toy5-gates.js — Toy House Phase 3b-R gates → review/toyhouse/look5-gates.json (fixture engine/fixtures/toyhouse/set5.json).
//   1. value hierarchy: environment base colours S ≤ .45, L .35–.75; story props S ≥ .60 (census of plain colours, Node build) and, in every
//      anchor shot whose subject covers ≥ 0.5 % of the frame, mean saturation of subject pixels (cast + story props, silhouette mask) ≥ 1.6 × background pixels
//   2. bevels: every box/cylinder object within 20 of an anchor camera is bevelled (r .03–.06): 100 %
//   3. contact AO: floor luma 0.15 from a gondola's base ≥ 15 % darker than 2.0 away (aisle shot, three probes averaged)
//   4. haze: RMS luma contrast of pixels > 60 away ≤ 50 % of pixels < 15 away (wide hall anchors; N/A when a band has < 50 px; the dawn street is outside)
//   5. anchor-clear: no animated kid nearer than the subject overlaps the subject's box (every shot with a subject)
//   7. bench (v2:bench, 1080): ≤ 90,000 frustum triangles, mean ≤ 0.69 s/frame
//   node scripts/v2/toy5-gates.js [--no-bench]
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import * as T from 'three';
import {startServer} from './server.js';
import {launch} from './browser.js';
import * as A from '../../parts/sets4/toyhouse_all.js';
const SPEC = 'engine/fixtures/toyhouse/set5.json', spec = JSON.parse(readFileSync(SPEC, 'utf8')), fails = [], rep = {};
// ---- Node: census of the built world (pure geometry / materials) ----
const w = A.build(new T.Scene(), {}); rep.bevel = w.stats.hall.bevel; rep.colours = w.stats.hall.colours; rep.shelves = w.stats.hall.shelves;
if (rep.bevel.fraction < 1) fails.push(`bevel: ${rep.bevel.bevelled}/${rep.bevel.near} near objects bevelled`);
if (rep.colours.env.ok < rep.colours.env.n) fails.push(`env colours out of range: ${rep.colours.env.bad.join(' ')}`);
if (rep.colours.story.ok < rep.colours.story.n) fails.push(`story colours below S .60: ${rep.colours.story.bad.join(' ')}`);
// ---- browser measures ----
const server = await startServer(), browser = await launch();
const open = async sp => { const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message)); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(sp)}&aa=1`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 300000}); if (errs.length) throw Error(errs.join('; ')); return page; };
try {
  const page = await open(SPEC);
  const m = await page.evaluate(() => { const E = window.__episode, out = {sat: {}, haze: {}, clear: {}, ao: null};
    const mid = s => s.start + Math.floor(s.frames / 2);
    for (const s of E.shots) {
      const r = E.satMeasure(mid(s)); if (r.subjPx >= .005 * 390 * 693) out.sat[s.id] = {subj: +r.subj.toFixed(3), bg: +r.bg.toFixed(3), ratio: +r.ratio.toFixed(2), subjPx: r.subjPx};
      if (s.size === 'wide' && s.look !== 'dawn') { const h = E.depthLuma(mid(s)); out.haze[s.id] = {nearRms: h.nearRms && +h.nearRms.toFixed(4), farRms: h.farRms && +h.farRms.toFixed(4), nearPx: h.nearPx, farPx: h.farPx, ratio: h.ratio && +h.ratio.toFixed(3)}; }
      if (s.subject) { E.renderFrame(mid(s), 360, 640); const f = E.seasonMeasure(mid(s)), a = f.actors[s.subject], d = f.dist[s.subject]; if (a) { const over = f.crowdBoxes.filter(b => b.dist < d && b.x0 < a.box.x1 && b.x1 > a.box.x0 && b.y0 < a.box.y1 && b.y1 > a.box.y0); out.clear[s.id] = {kidsInFront: over.length, crowdInView: f.crowdBoxes.length}; } }
    }
    // contact AO: the x = 6 gondola row (aisle face at x = 4.4), floor at 0.15 vs 2.0 from the base, three depths
    const aisle = E.shots.find(s => s.id === 'S2-aisle'), zs = [-24, -30, -36], P = zs.flatMap(z => [[4.4 - .15, .01, z], [4.4 - 2.0, .01, z]]);
    const pr = E.lumaProbe(mid(aisle), P, {w: 1080, h: 1920}); out.ao = zs.map((z, i) => ({z, near: +pr[2 * i].luma.toFixed(4), ref: +pr[2 * i + 1].luma.toFixed(4)}));
    return out; });
  await page.close();
  rep.sat = m.sat; rep.haze = m.haze; rep.clear = m.clear;
  for (const [k, v] of Object.entries(m.sat)) if (v.ratio < 1.6) fails.push(`saturation ${k}: subject/background ${v.ratio} < 1.6`);
  let hz = 0; for (const [k, v] of Object.entries(m.haze)) { if (v.ratio === null) continue; hz++; if (v.ratio > .5) fails.push(`haze ${k}: far/near contrast ${v.ratio} > 0.50`); } if (hz < 2) fails.push(`haze: only ${hz} wide shots measurable`);
  for (const [k, v] of Object.entries(m.clear)) if (v.kidsInFront) fails.push(`anchor-clear ${k}: ${v.kidsInFront} kids in front of the subject`);
  const near = m.ao.reduce((a, x) => a + x.near, 0) / 3, ref = m.ao.reduce((a, x) => a + x.ref, 0) / 3; rep.ao = {probes: m.ao, drop: +(1 - near / ref).toFixed(3)}; if (rep.ao.drop < .15) fails.push(`contact AO drop ${rep.ao.drop} < 0.15`);

} finally { await browser.close(); await server.close(); }
if (!process.argv.includes('--no-bench')) { const out = execFileSync('npm', ['run', 'v2:bench', '--', '--spec', SPEC], {encoding: 'utf8', maxBuffer: 1 << 26}).trim().split('\n').at(-1); const b = JSON.parse(out);
  rep.bench = {s720: b.meanSecondsPerFrame, s1080: b.meanSecondsPerFrame1080, maxTriangles: b.maxTriangles, overBudget: b.overBudget};
  if (b.meanSecondsPerFrame1080 > .69) fails.push(`bench ${b.meanSecondsPerFrame1080} s/frame at 1080 > 0.69`); if (b.maxTriangles > 90000) fails.push(`frustum triangles ${b.maxTriangles} > 90,000`); }
rep.failures = fails; rep.result = fails.length ? 'FAIL' : 'PASS';
mkdirSync('review/toyhouse', {recursive: true}); writeFileSync('review/toyhouse/look5-gates.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep)); process.exitCode = fails.length ? 1 : 0;
