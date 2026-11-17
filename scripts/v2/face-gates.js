// scripts/v2/face-gates.js — measured gates for Faces v3 (owner, 2026-11-14). Exit 1 on any failure.
//   node scripts/v2/face-gates.js [--out review/season1/face-gates.json]
// 1. Style table (PROGRESS.md "Faces v3"): every preset's eye width/height, eye spacing, eye line, mouth line, mouth size and
//    main stroke are inside the ranges measured from the owner's references (face units, face = 1.0 wide).
// 2. Main stroke ≥ 1.5 px at medium size on a 390 px frame (head ≈ 60 px wide → face 48 px): the smile's mouth stroke is
//    measured in pixels (thickest ink run in the centre column) and the grid stroke is checked as stroke × 48.
// 3. Distinct: any two presets differ on ≥ 8 % of their face pixels at 128 px (crowd tier: no highlights, no lashes);
//    differing pixels / pixels drawn in either face.
// 4. Dark skin (luma < 0.35): sclera white, ink carries a light edge with contrast ≥ 3:1 against every dark skin used.
// 5. Age rule: adult-only parts (lip colour; g_lips, g_glam) are refused on youth builds; no troupe kid's face is adult-only.
import {writeFile, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {PRESETS, GRID, faceMeasure, faceError, contrast, darkSkin, EDGE, WHITE, luma} from '../../avatar-style/faces3.js';
import {SKINS} from '../../avatar-style/body.js';

const argv = process.argv.slice(2), out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'review/season1/face-gates.json';
export const RANGES = {eyeW: [.08, .27], eyeH: [.03, .30], spacing: [.34, .52], eyeY: [0, .12], mouthY: [-.26, -.10], mouthH: [.02, .30], mouthW: [.08, .56], stroke: [.035, .065]};
const LIM = {strokePx: 1.5, distinct: .08, contrast: 3, facePx390: 48};
const rep = {limits: {ranges: RANGES, ...LIM}, ranges: {}, failures: []}, F = rep.failures, names = Object.keys(PRESETS);
// 1
for (const n of names) { const m = faceMeasure(n); rep.ranges[n] = m; for (const [k, [a, b]] of Object.entries(RANGES)) if (!(m[k] >= a - 1e-9 && m[k] <= b + 1e-9)) F.push(`${n}: ${k} ${m[k]} outside ${a}–${b}`); }
// 4 + 5 (pure)
const darks = [...SKINS, '#5a3826', '#4a2c1d'].filter(darkSkin);
rep.darkSkin = darks.map(s => ({skin: s, luma: +luma(s).toFixed(3), edgeContrast: +contrast(EDGE, s).toFixed(2), sclera: WHITE}));
for (const d of rep.darkSkin) if (d.edgeContrast < LIM.contrast) F.push(`dark skin ${d.skin}: edge contrast ${d.edgeContrast} < ${LIM.contrast}`);
rep.age = {g_lips: faceError('g_lips', 'youth'), g_glam: faceError('g_glam', 'youth'), smile: faceError('smile', 'youth'), custom: faceError({eyes: 'oval', mouth: 'smile', extras: ['lip colour']}, 'youth')};
if (!rep.age.g_lips || !rep.age.g_glam || !rep.age.custom || rep.age.smile) F.push('age rule: adult-only parts not refused on youth (or a plain face refused)');
const troupe = JSON.parse(await readFile('cast/troupe.json', 'utf8')).troupe;
for (const [slot, t] of Object.entries(troupe)) if (t.build === 'youth' && t.face && faceError(t.face, 'youth')) F.push(`troupe ${slot}: face ${t.face} is adult-only`);
// 2 + 3 (pixels)
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/facepage.html`); await page.waitForFunction(() => window.__faces, null, {timeout: 60000});
  const px = async (n, o) => page.evaluate(([n, o]) => window.__faces.pixels(n, o), [n, o]);
  const s = await px('smile', {px: LIM.facePx390, tier: 'mid'}), cx = s.w >> 1; let run = 0, best = 0;
  for (let y = 0; y < s.h; y++) { const a = s.data[(y * s.w + cx) * 4 + 3], v = s.data[(y * s.w + cx) * 4]; if (a > 128 && v < 90) { run++; best = Math.max(best, run); } else run = 0; }
  rep.stroke = {gridPx: +(GRID.stroke * LIM.facePx390).toFixed(2), smileMouthPx: best};
  if (rep.stroke.gridPx < LIM.strokePx || best < LIM.strokePx) F.push(`main stroke ${rep.stroke.gridPx} / ${best} px < ${LIM.strokePx} at 390`);
  const P = {}; for (const n of names) P[n] = await px(n, {px: 128, tier: 'crowd'});
  const drawn = (d, i) => d[i + 3] > 100;
  let min = {d: 1}; const close = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = P[names[i]].data, b = P[names[j]].data; let diff = 0, uni = 0;
    for (let k = 0; k < a.length; k += 4) { const da = drawn(a, k), db = drawn(b, k); if (!da && !db) continue; uni++; if (da !== db || Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]) > 90) diff++; }
    const d = diff / Math.max(1, uni); if (d < min.d) min = {d: +d.toFixed(4), a: names[i], b: names[j]}; if (d < LIM.distinct) close.push(`${names[i]}~${names[j]} ${(d * 100).toFixed(1)} %`);
  }
  rep.distinct = {min, pairs: names.length * (names.length - 1) / 2, under: close};
  for (const c of close) F.push(`presets too alike at 128 px: ${c}`);
  if (errors.length) throw Error(errors.join('; '));
} finally { await browser.close(); await server.close(); }
rep.pass = !F.length;
await mkdir(path.dirname(out), {recursive: true}); await writeFile(out, JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify({pass: rep.pass, stroke: rep.stroke, distinctMin: rep.distinct.min, darkSkin: rep.darkSkin.map(d => d.edgeContrast), failures: F.slice(0, 20), nFail: F.length}));
console.log(rep.pass ? 'PASS face gates' : 'FAIL face gates'); process.exit(rep.pass ? 0 : 1);
