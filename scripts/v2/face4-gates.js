// scripts/v2/face4-gates.js — Faces v4 (Phase 1b) measured checks → review/v4/faces4-gates.json. Pure (no browser).
//   features' box ≥ 55 % of face width and ≥ 40 % of face height (face = the flat front band of the classic head, 0.62 of
//   its height; the share of the whole head height is listed too) · each open eye ≥ 2.2 % of the head front · no stroke
//   thinner than 2 px at the 390 px medium shot (SHOTS4.medium) · blush clear of every mouth and talk shape.
//   node scripts/v2/face4-gates.js [--out review/v4/faces4-gates.json]
import {mkdirSync, writeFileSync} from 'node:fs';
import * as F4 from '../../avatar-style/faces4.js';
import {HEAD_SIZE} from '../../avatar-style/body5.js';
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'review/v4/faces4-gates.json';
const TH = {w: .55, h: .40, eye: .022, strokePx: 2}, px = F4.headPx(F4.SHOTS4.medium) * HEAD_SIZE, minMediumPx = HEAD_SIZE * F4.headPx({d: 5.03 / .30 / 2 / Math.tan(17.5 * Math.PI / 180), fov: 35});
const rows = [], fails = [];
for (const n of [...F4.HERO_PRESETS, ...F4.RESKINNED]) {
  const g = F4.faceGates4(n), sPx = +(g.minStroke * px).toFixed(2), blush = [null, 0, 1, 2, 3].reduce((a, k) => a + F4.blushOverlap(n, k), 0);
  const f = [];
  if (g.w < TH.w) f.push(`width ${g.w}`); if (g.h < TH.h) f.push(`height ${g.h}`);
  for (const [k, e] of [['eyeL', g.eyeL], ['eyeR', g.eyeR]]) if (e !== null && e < TH.eye) f.push(`${k} ${(e * 100).toFixed(2)} %`);
  if (sPx < TH.strokePx) f.push(`stroke ${sPx} px`); if (blush) f.push(`blush overlaps the mouth (${blush})`);
  rows.push({face: n, widthFrac: g.w, heightFrac: g.h, heightOfWholeHead: g.hHead, eyeAreaL: g.eyeL && +(g.eyeL * 100).toFixed(2), eyeAreaR: g.eyeR && +(g.eyeR * 100).toFixed(2), minStrokePx: sPx, blushOverlap: blush, pass: !f.length});
  for (const x of f) fails.push(`${n}: ${x}`);
}
const fangPx = +((F4.FANG.h - F4.GRID4.stroke / 2) * px).toFixed(1), anger = F4.faceItems4('hero_rage').filter(i => i.anger), angerPx = +(Math.min(...anger.map(i => i.w)) * px).toFixed(1);
const bigOpen = +(F4.bbox(F4.faceItems4('hero_rage').find(i => i.interior).pts).reduce((a, v, i) => i === 2 ? v - a : i === 0 ? v : a, 0)).toFixed(3);
if (fangPx < 5) fails.push(`fang ${fangPx} px at medium (≥ 5)`); if (angerPx < 2) fails.push(`anger stroke ${angerPx} px`); if (bigOpen > .40) fails.push(`big open ${bigOpen} > .40`);
const polish = {fangVisiblePxAtMedium: fangPx, angerColours: [...new Set(anger.map(i => i.color))], angerMinStrokePx: angerPx, bigOpenWidth: bigOpen};
const talk = Object.fromEntries(['hero_grin', 'smile', 'neutral'].map(f => [f, [1, 2, 3].map(k => F4.mouthHeight(f, k))]));
const rep = {thresholds: TH, face: {...F4.FACE, note: 'face = the flat front band of the classic head (between the rounded top and bottom rims), full width; eye area is a share of the whole head front (1 × 1)'},
  mediumShot: {...F4.SHOTS4.medium, headPx: +px.toFixed(1)}, atMinimumMedium: {note: 'actor = 30 % of frame height (the framing floor)', headPx: +minMediumPx.toFixed(1), minStrokePx: +(Math.min(...rows.map(r => r.minStrokePx)) / px * minMediumPx).toFixed(2)},
  wobble: F4.GRID4.wobble, polish, talkHeights: talk, rows, failures: fails, result: fails.length ? 'FAIL' : 'PASS'};
mkdirSync('review/v4', {recursive: true}); writeFileSync(out, JSON.stringify(rep, null, 1));
console.log(JSON.stringify({faces: rows.length, minWidth: Math.min(...rows.map(r => r.widthFrac)), minHeight: Math.min(...rows.map(r => r.heightFrac)), minHeightWholeHead: Math.min(...rows.map(r => r.heightOfWholeHead)),
  minEye: Math.min(...rows.flatMap(r => [r.eyeAreaL, r.eyeAreaR]).filter(v => v !== null)), minStrokePx: Math.min(...rows.map(r => r.minStrokePx)), headPx: rep.mediumShot.headPx, polish, atMinimumMedium: rep.atMinimumMedium, talk, result: rep.result, failures: fails}));
process.exitCode = fails.length ? 1 : 0;
