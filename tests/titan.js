// tests/titan.js — tuft P3B TITAN gates (pure, node; engine/beast.js + beasts/TITAN.json), owner spec: horns never above the hump's top (front +
//   side, idle / roar / caged / break / stomp poses); the hump is the highest point; body mean value ≤ .35 (area-weighted HSV value of the
//   non-horn, non-bone, non-emissive faces); crack lines are lines (each emissive crack component, rasterised front / side / ¾ at 600 px:
//   aspect P² / 4A ≥ 4); hero pairwise IoU ≤ .6 (tests/beast2.js method); ≤ 6k tris. Also exports `shade()` (flat ortho z-buffer render,
//   used by scripts/v2/titan-sil.js). Usage: node tests/titan.js [beasts/TITAN.json]
import {readFileSync} from 'node:fs';
import * as B from '../engine/beast.js';

// silhouette / raster / iou: copied from tests/beast2.js (importing it runs its gates)
function silhouette(Pn, state = 'idle', N = 96) {
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
const iou = (A, Bm) => { let I = 0, U = 0; for (let q = 0; q < A.length; q++) { I += A[q] & Bm[q]; U += A[q] | Bm[q]; } return I / U; };
const L = f => JSON.parse(readFileSync(f, 'utf8'));
const hexV = h => Math.max(...[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))) / 255;
// per-triangle world verts + tags for a preset in a pose
export function posed(P, state = 'idle', t = 0) {
  const g = B.buildGeometry(P, 'hero'), sup = B.supportPoints(g), s = B.sampleBeast(P, [{t: 0, state}], t, {geo: g, support: sup}), v = B.worldVerts(s, g);
  const tags = []; for (const p of B.partList(P, 'hero')) { const n = buildTris(P, p); for (let i = 0; i < n; i++) tags.push(p.tag ?? (p.glow ? 'glow' : '')); }
  return {g, v, tags}; }
const triCache = new Map(); function buildTris(P, p) { const k = JSON.stringify(p); if (!triCache.has(k)) triCache.set(k, B.buildGeometry({...P, scale: 1, parts: [{...p, mirror: false}]}, 'hero').tris); return triCache.get(k); }
const VIEW = {front: v => [v[0], v[1], v[2]], side: v => [v[2], v[1], -v[0]], q34: v => { const a = -50 * Math.PI / 180; return [v[0] * Math.cos(a) - v[2] * Math.sin(a), v[1], v[0] * Math.sin(a) + v[2] * Math.cos(a)]; }};
// flat ortho z-buffer render: returns {W, H, rgb (Uint8), id (tri index + 1)}; view = front | side | q34; long side = N px
export function shade(P, view = 'side', N = 300, state = 'idle', t = 0) {
  const {g, v} = posed(P, state, t), f = VIEW[view], pv = []; for (let i = 0; i < v.length; i += 3) pv.push(f([v[i], v[i + 1], v[i + 2]]));
  const bb = [Infinity, -Infinity, Infinity, -Infinity]; for (const p of pv) { bb[0] = Math.min(bb[0], p[0]); bb[1] = Math.max(bb[1], p[0]); bb[2] = Math.min(bb[2], p[1]); bb[3] = Math.max(bb[3], p[1]); }
  const S = (N - 4) / Math.max(bb[1] - bb[0], bb[3] - bb[2]), W = Math.ceil((bb[1] - bb[0]) * S) + 4, H = Math.ceil((bb[3] - bb[2]) * S) + 4;
  const zb = new Float32Array(W * H).fill(-Infinity), rgb = new Uint8Array(W * H * 3), id = new Int32Array(W * H), Ld = [.45, .75, .5].map(x => x / Math.hypot(.45, .75, .5));
  for (let tI = 0; tI < pv.length / 3; tI++) { const [A, Bq, C] = [pv[3 * tI], pv[3 * tI + 1], pv[3 * tI + 2]].map(p => [(p[0] - bb[0]) * S + 2, (bb[3] - p[1]) * S + 2, p[2]]);
    const e1 = [pv[3 * tI + 1][0] - pv[3 * tI][0], pv[3 * tI + 1][1] - pv[3 * tI][1], pv[3 * tI + 1][2] - pv[3 * tI][2]], e2 = [pv[3 * tI + 2][0] - pv[3 * tI][0], pv[3 * tI + 2][1] - pv[3 * tI][1], pv[3 * tI + 2][2] - pv[3 * tI][2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const nl = Math.hypot(...n) || 1; n = n.map(x => x / nl); if (n[2] < 0) n = n.map(x => -x);
    const gl = [g.glow[12 * tI], g.glow[12 * tI + 1], g.glow[12 * tI + 2]], isG = gl[0] + gl[1] + gl[2] > 0 && g.glow[12 * tI + 3] !== 2, lam = .28 + .72 * Math.max(0, n[0] * Ld[0] + n[1] * Ld[1] + n[2] * Ld[2]);
    const col = isG ? gl.map(x => Math.min(1, x * 1.0)) : [g.col[9 * tI], g.col[9 * tI + 1], g.col[9 * tI + 2]].map(x => x * lam);
    const x0 = Math.max(0, Math.floor(Math.min(A[0], Bq[0], C[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], Bq[0], C[0]))), y0 = Math.max(0, Math.floor(Math.min(A[1], Bq[1], C[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(A[1], Bq[1], C[1])));
    const ed = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]), ar = ed(A, Bq, C[0], C[1]); if (Math.abs(ar) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const X = x + .5, Y = y + .5, a0 = ed(Bq, C, X, Y) / ar, a1 = ed(C, A, X, Y) / ar, a2 = ed(A, Bq, X, Y) / ar;
      if (a0 < 0 || a1 < 0 || a2 < 0) continue; const z = a0 * A[2] + a1 * Bq[2] + a2 * C[2] + (isG ? .02 * (bb[1] - bb[0]) : 0); const q = y * W + x; if (z <= zb[q]) continue;
      zb[q] = z; id[q] = tI + 1; for (let k = 0; k < 3; k++) rgb[3 * q + k] = Math.round(255 * Math.pow(Math.min(1, col[k]), 1 / 1.0)); } }
  return {W, H, rgb, id, S}; }
// connected components (4-neighbour) of a mask → [{area, perim, aspect}]
export function components(mask, W, H) { const lab = new Int32Array(W * H), out = []; let n = 0;
  for (let q0 = 0; q0 < W * H; q0++) { if (!mask[q0] || lab[q0]) continue; n++; let area = 0, per = 0; const st = [q0]; lab[q0] = n;
    while (st.length) { const q = st.pop(), x = q % W, y = (q / W) | 0; area++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || !mask[Y * W + X]) { per++; continue; } const r = Y * W + X; if (!lab[r]) { lab[r] = n; st.push(r); } } }
    out.push({area, perim: per, aspect: per * per / (4 * area)}); } return out; }
export function titanGates(P, others = {}) {
  const res = [], ok = (name, pass, line) => res.push({name, pass, line});
  // 1. hump highest + horns below the hump top, over poses
  let humpTop = -Infinity, worst = -Infinity, topTag = '', worstPose = '';
  for (const [st, t] of [['idle', 0], ['roar', .5], ['roar', 1.2], ['caged', 1], ['break', .5], ['stomp', .7], ['flinch', .3]]) {
    const {v, tags} = posed(P, st, t); let hT = -Infinity, hornT = -Infinity, allT = -Infinity, allTag = '';
    for (let tI = 0; tI < tags.length; tI++) for (let k = 0; k < 3; k++) { const y = v[9 * tI + 3 * k + 1]; if (tags[tI] === 'hump') hT = Math.max(hT, y); if (tags[tI] === 'horn') hornT = Math.max(hornT, y); if (y > allT) { allT = y; allTag = tags[tI]; } }
    if (st === 'idle') { humpTop = hT; topTag = allTag; } if (hornT - hT > worst) { worst = hornT - hT; worstPose = `${st}@${t}`; } }
  ok('TITAN hump is the highest point (idle)', topTag === 'hump', `highest vertex belongs to "${topTag || 'body'}"; hump top ${humpTop.toFixed(1)} studs`);
  ok('TITAN horns never above the hump top (front + side, 7 poses)', worst < 0, `max (horn top − hump top) ${worst.toFixed(2)} studs at ${worstPose} (< 0)`);
  // 2. body value
  let wv = 0, ww = 0; const g = B.buildGeometry(P, 'hero'), {tags} = posed(P);
  for (let tI = 0; tI < g.tris; tI++) { if (tags[tI] === 'horn' || tags[tI] === 'crack' || tags[tI] === 'glow' || g.glow[12 * tI] + g.glow[12 * tI + 1] + g.glow[12 * tI + 2] > 0) continue;
    const c = [g.col[9 * tI], g.col[9 * tI + 1], g.col[9 * tI + 2]]; if (Math.min(...c) > .5) continue;   // bone (tusks)
    const p = i => [g.pos[9 * tI + 3 * i], g.pos[9 * tI + 3 * i + 1], g.pos[9 * tI + 3 * i + 2]], e1 = p(1).map((x, k) => x - p(0)[k]), e2 = p(2).map((x, k) => x - p(0)[k]);
    const ar = Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2; wv += ar * Math.max(...c); ww += ar; }
  ok('TITAN body mean value ≤ 0.35', wv / ww <= .35, `area-weighted HSV value of the stone/moss faces ${(wv / ww).toFixed(3)}`);
  // 3. crack lines are lines: emissive crack (glow group 0) pixels per view → components, aspect P²/4A ≥ 4 (components ≥ 12 px)
  let minA = Infinity, nC = 0;
  for (const view of ['front', 'side', 'q34']) { const r = shade(P, view, 600), m = new Uint8Array(r.W * r.H);
    for (let q = 0; q < m.length; q++) { const tI = r.id[q] - 1; if (tI >= 0 && tags[tI] === 'crack') m[q] = 1; }
    for (const c of components(m, r.W, r.H)) { if (c.area < 12) continue; nC++; minA = Math.min(minA, c.aspect); } }
  ok('TITAN crack lines are lines (aspect ≥ 4)', minA >= 4, `${nC} emissive crack components (front/side/¾, 600 px), min aspect P²/4A ${minA.toFixed(2)}`);
  // 4. pairwise IoU + tris
  const sT = silhouette(P), pr = Object.entries(others).map(([n, Q]) => [n, +iou(sT, silhouette(Q, Q.rig === 'bird' ? 'perch' : 'idle')).toFixed(3)]), mx = Math.max(...pr.map(p => p[1]));
  ok('TITAN pairwise silhouette IoU ≤ 0.6', mx <= .6, pr.map(p => `${p[0].slice(0, 2)} ${p[1]}`).join(', '));
  const tris = B.beastTris(P, 'hero'); ok('TITAN ≤ 6k tris', tris <= 6000, `${tris} tris`);
  return res; }
if (process.argv[1]?.endsWith('tests/titan.js')) {
  const P = L(process.argv[2] ?? 'beasts/TITAN.json'), others = Object.fromEntries(['NIGHTFANG', 'VOLT', 'CINDER', 'BOULDER', 'TUFT'].map(n => [n, L(`beasts/${n}.json`)]));
  const r = titanGates(P, others); for (const x of r) console.log(`${x.pass ? 'PASS' : 'FAIL'}  ${x.name} — ${x.line}`);
  console.log(`${r.filter(x => x.pass).length}/${r.length} pass`); process.exitCode = r.every(x => x.pass) ? 0 : 1; }
