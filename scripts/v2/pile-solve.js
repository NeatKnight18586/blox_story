// node scripts/v2/pile-solve.js → engine/pile6.json (frozen; engine/story6.js reads it). E2b: the pile is ONE soft mound — a dome (radius ≈ 5,
// height ≈ 3.5): an outer ring lying on their backs along the rim (arms folded, faces turned out), a middle ring slumped sitting, legs out over the
// rim bodies, leaning back toward the centre, and a top layer lying across. Built like a real pile: the ring is laid on the ground, then each body is
// dropped straight down at its spot until it touches (every pair ≤ 0.085 interpenetration of R15 segment boxes, acting6 penetration; limit 0.1).
// A small grid search over the ring radius, sitter radius / lean / spacing and the top body's turn keeps the best dome
// (score: radius near 5.5, height near 3.5, ground hidden inside radius 5). Deterministic.
import {writeFileSync} from 'node:fs';
import * as A from '../../engine/acting6.js';
import {pileBodyBoxes, pileCoverage, pileShape} from '../../engine/story6.js';

const TARGET = .085, LIMIT = .1;
// projected height / width of the mound from 20 studs away, 25° up (the gate's camera), over the box corners
function pileRatio(placed) {   // the gate's perspective camera: 20 studs from the aim point (1.8 up), 25° up
  const e = 25 * Math.PI / 180, aim = [0, 1.8, 0], cam = [0, 1.8 + 20 * Math.sin(e), 20 * Math.cos(e)], f = [0, -Math.sin(e), -Math.cos(e)], r = [1, 0, 0], up = [0, Math.cos(e), -Math.sin(e)];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const bs of placed) for (const q of bs) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) { const p = q.c.map((c, i) => c + q.R[i][0] * x * q.h[0] + q.R[i][1] * y * q.h[1] + q.R[i][2] * z * q.h[2]), d = p.map((v, i) => v - cam[i]), w = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
    const u = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / w, v = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / w; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  return (v1 - v0) / (u1 - u0); }
const worstAgainst = (bx, others) => others.reduce((w, o) => Math.max(w, A.penetration(bx, o).depth), 0);
function drop(b, placed, top = 7) { for (let y = top; y >= 0; y -= .05) { b.y = +y.toFixed(3); if (worstAgainst(pileBodyBoxes(b), placed) > TARGET) { b.y = +(y + .05).toFixed(3); return b; } } b.y = 0; return b; }
function build({R1, n1, rs, ns, tilt, sitOff, topYo, tops, sp = 'sit'}) {
  const bodies = [], placed = [];
  for (let i = 0; i < n1; i++) { const b = {pose: 'lieT', a: i * 360 / n1, r: R1, yo: 0, tilt: -90, roll: 0, y: 0}; const bx = pileBodyBoxes(b); if (worstAgainst(bx, placed) > TARGET) return null; bodies.push(b); placed.push(bx); }
  for (let i = 0; i < ns; i++) { const b = drop({pose: sp, a: sitOff + i * 360 / ns, r: rs, yo: 0, tilt, roll: 0, y: 0}, placed); bodies.push(b); placed.push(pileBodyBoxes(b)); }
  for (let i = 0; i < tops; i++) { const b = drop({pose: 'top', a: 30 + i * 180, r: tops > 1 ? .8 : .2, yo: topYo + i * 90, tilt: -90, roll: 0, y: 0}, placed, 9); bodies.push(b); placed.push(pileBodyBoxes(b)); }
  let worst = 0; for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) worst = Math.max(worst, A.penetration(placed[i], placed[j]).depth);
  const sh = pileShape(placed), cover = pileCoverage(placed, 5), ratio = pileRatio(placed), score = 10 * Math.abs(ratio - .48) + 40 * Math.max(0, ratio - .57) + 12 * (1 - cover) + 2 * Math.max(0, sh.radius - 6) + Math.abs(sh.height - 3.5);
  return {bodies, worst, ...sh, cover, ratio, score};
}
let best = null, tried = 0;
for (const n1 of [4, 5]) for (const R1 of [3.8, 4.4, 5.0]) for (const ns of (process.env.NS ? process.env.NS.split(',').map(Number) : [0, 2, 3])) for (const rs of (ns ? (process.env.RS ? process.env.RS.split(',').map(Number) : [2.6, 3.2]) : [0])) for (const sp of (process.env.SP ? [process.env.SP] : ['sit'])) for (const tilt of (ns ? (sp === 'slump' ? [10, 25] : [-70, -80]) : [0])) for (const sitOff of (ns ? [0, 360 / n1 / 2] : [0])) for (const topYo of [0, 50]) for (const tops of (process.env.TOPS ? process.env.TOPS.split(',').map(Number) : [1, 2])) {
  const r = build({R1, n1, rs, ns, tilt, sitOff, topYo, tops, sp}); tried++; if (!r || r.worst > LIMIT) continue;
  if (!best || r.score < best.score) best = {...r, cfg: {n1, R1, ns, rs, tilt, sitOff, topYo, tops, sp}};
}
const out = {note: 'E2b frozen pile (scripts/v2/pile-solve.js): one soft mound of R15 bodies dropped into place; every pair ≤ 0.1 interpenetration.', limit: LIMIT,
  worst: +best.worst.toFixed(4), ratio390: +best.ratio.toFixed(3), radius: +best.radius.toFixed(2), height: +best.height.toFixed(2), coverage5: +best.cover.toFixed(3), cfg: best.cfg, tried,
  slots: best.bodies.map(b => ({pose: b.pose, a: +b.a.toFixed(2), r: b.r, yo: b.yo, tilt: b.tilt, roll: b.roll, y: b.y}))};
writeFileSync('engine/pile6.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({bodies: out.slots.length, worst: out.worst, ratio: out.ratio390, radius: out.radius, height: out.height, coverage5: out.coverage5, cfg: out.cfg, tried}));
