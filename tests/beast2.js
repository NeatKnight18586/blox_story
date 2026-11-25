// tests/beast2.js — tuft 2B pure gates (node; engine/beast.js + beasts/*.json): silhouettes at phone size (NIGHTFANG vs a horse-proportion
//   reference ≤ 0.5; all hero presets pairwise ≤ 0.6, the 2A method: idle, side ¾, long side 300 px, normalised 96 × 96). Later 2B tasks
//   append their pure gates here (TUFT / TITAN tris, puff sizes, deflate timing, FX determinism, vocab). Writes review/beasts/tests2.json.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import * as B from '../engine/beast.js';

const res = [], ok = (name, pass, line, data = {}) => { res.push({name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const L = f => JSON.parse(readFileSync(f, 'utf8')), P = n => L(`beasts/${n}.json`);
export function silhouette(Pn, state = 'idle', N = 96) {
  const g = B.buildGeometry(Pn, 'hero'), s = B.sampleBeast(Pn, [{t: 0, state}], 1, {geo: g}), v = B.worldVerts(s, g), a = -60 * Math.PI / 180, rx = [Math.cos(a), 0, -Math.sin(a)], pts = [];
  for (let i = 0; i < v.length; i += 3) pts.push([v[i] * rx[0] + v[i + 2] * rx[2], v[i + 1]]);
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1])), S = 300 / Math.max(x1 - x0, y1 - y0);
  const W = Math.ceil((x1 - x0) * S) + 1, H = Math.ceil((y1 - y0) * S) + 1, img = new Uint8Array(W * H), px = pts.map(([x, y]) => [(x - x0) * S, (y1 - y) * S]);
  for (let i = 0; i < px.length; i += 3) raster(img, W, H, px[i], px[i + 1], px[i + 2]);
  const m = new Float32Array(N * N), k = N / Math.max(W, H), ox = (N - W * k) / 2, oy = (N - H * k) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img[y * W + x]) { const X = Math.floor(ox + x * k), Y = Math.floor(oy + y * k); m[Y * N + X] += 1; }
  const cell = 1 / (k * k); return Uint8Array.from(m, c => c >= cell * .5 ? 1 : 0); }
function raster(img, W, H, a, b, c) { const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
  const e = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]), ar = e(a, b, c[0], c[1]); if (Math.abs(ar) < 1e-9) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const X = x + .5, Y = y + .5, w0 = e(b, c, X, Y) / ar, w1 = e(c, a, X, Y) / ar, w2 = e(a, b, X, Y) / ar; if (w0 >= 0 && w1 >= 0 && w2 >= 0) img[y * W + x] = 1; } }
export const iou = (A, Bm) => { let I = 0, U = 0; for (let q = 0; q < A.length; q++) { I += A[q] & Bm[q]; U += A[q] | Bm[q]; } return I / U; };
export const GATES = [];   // [name, fn] appended by later sections
// 1. silhouettes
{ const horse = silhouette(L('engine/fixtures/beasts2/HORSE_REF.json')), heroes = ['NIGHTFANG', 'VOLT', 'CINDER', 'BOULDER', ...['TUFT', 'TITAN'].filter(n => existsSync(`beasts/${n}.json`))];
  const sil = Object.fromEntries(heroes.map(n => [n, silhouette(P(n), P(n).rig === 'bird' ? 'perch' : 'idle')])), h = iou(sil.NIGHTFANG, horse);
  ok('NIGHTFANG reads as a dragon, not a horse', h <= .5, `idle side ¾ silhouette vs a horse-proportion reference: IoU ${h.toFixed(3)} ≤ 0.5`);
  const pairs = []; for (let i = 0; i < heroes.length; i++) for (let j = i + 1; j < heroes.length; j++) pairs.push([heroes[i], heroes[j], +iou(sil[heroes[i]], sil[heroes[j]]).toFixed(3)]);
  const mx = Math.max(...pairs.map(p => p[2])); ok('hero silhouettes pairwise IoU ≤ 0.6', mx <= .6, `max ${mx.toFixed(3)} (${pairs.map(p => `${p[0].slice(0, 2)}${p[1].slice(0, 2)} ${p[2]}`).join(', ')})`, {pairs}); }
const sections = await Promise.all([]); void sections;
// P3. TITAN horns read in silhouette: orthographic FRONT and SIDE views, long side 300 px (phone size); horn pixels = pixels the horn
//     triangles add OUTSIDE the rest of the body's silhouette, as a share of the whole silhouette (≥ 6 % each view)
export function hornShare(Pn, view, state = 'idle') {
  const g = B.buildGeometry(Pn, 'hero'), sup = B.supportPoints(g), hp = {...Pn, parts: Pn.parts.filter(p => p.tag === 'horn')}, bp = {...Pn, parts: Pn.parts.filter(p => p.tag !== 'horn')};
  const vs = q => { const gq = B.buildGeometry(q, 'hero'); return B.worldVerts(B.sampleBeast(q, [{t: 0, state}], 1, {geo: gq, support: sup}), gq); };
  const all = vs(Pn), ax = view === 'front' ? 0 : 2, bb = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i < all.length; i += 3) { bb[0] = Math.min(bb[0], all[i + ax]); bb[1] = Math.max(bb[1], all[i + ax]); bb[2] = Math.min(bb[2], all[i + 1]); bb[3] = Math.max(bb[3], all[i + 1]); }
  const S = 300 / Math.max(bb[1] - bb[0], bb[3] - bb[2]), W = Math.ceil((bb[1] - bb[0]) * S) + 1, H = Math.ceil((bb[3] - bb[2]) * S) + 1;
  const ras = v => { const img = new Uint8Array(W * H); for (let i = 0; i < v.length; i += 9) raster(img, W, H, ...[0, 3, 6].map(o => [(v[i + o + ax] - bb[0]) * S, (bb[3] - v[i + o + 1]) * S])); return img; };
  const A = ras(all), Hn = ras(vs(hp)), Bd = ras(vs(bp)); let n = 0, h = 0; for (let q = 0; q < A.length; q++) { n += A[q]; h += Hn[q] && !Bd[q] ? 1 : 0; }
  return {share: h / n, W, H, A, Hn}; }
{ const T = P('TITAN'), f = hornShare(T, 'front'), sd = hornShare(T, 'side');
  // P3B (owner FIX 1): the horns curl round the ears (never up), so the P3 "≥ 6 % outside the body" gate is superseded by the owner's gates (tests/titan.js); share kept as info
  console.log(`info  TITAN horn pixels outside the body silhouette: front ${(100 * f.share).toFixed(1)} %, side ${(100 * sd.share).toFixed(1)} %`);
  const {titanGates} = await import('./titan.js'); for (const r of titanGates(T, Object.fromEntries(['NIGHTFANG', 'VOLT', 'CINDER', 'BOULDER', 'TUFT'].map(n => [n, P(n)])))) ok(r.name, r.pass, r.line); }
for (const f of (await import('./beast2-more.js').catch(() => ({GATES: []}))).GATES ?? []) await f(ok, {P, L, B});
mkdirSync('review/beasts', {recursive: true}); writeFileSync('review/beasts/tests2.json', JSON.stringify(res, null, 1));
const fails = res.filter(r => !r.pass).length; console.log(`${res.length - fails}/${res.length} pass`); process.exitCode = fails ? 1 : 0;
