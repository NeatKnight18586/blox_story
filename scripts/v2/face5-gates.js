// scripts/v2/face5-gates.js — Faces v5 gate → review/v4/faces5-gates.json (+ review/v4/faces5-compare.png).
//   Renders the 48 faces of avatar-style/faces5.js into the owner's 6 × 8 grid at the sheet's size (cell content = 80 % of the head
//   front, head front = cell / 0.8) and compares each cell with docs/season1/refs/faces-v5/sheet.png (ink = luma < 128, cell
//   interior inset 6 px): IoU of the ink after centre alignment (ink centroids matched, sub-pixel: each cell is re-rendered shifted by the
//   centroid difference) ≥ 0.80, and stroke width within 10 % (stroke = mean ridge width of the Euclidean distance transform: local
//   maxima over the 3 × 3 neighbourhood, ridges thinner than 8 % of the cell).
//   node scripts/v2/face5-gates.js [--out review/v4/faces5-gates.json] [--png review/v4/faces5-compare.png]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const out = arg('out', 'review/v4/faces5-gates.json'), png = arg('png', 'review/v4/faces5-compare.png'), raw = 'renders/v4/faces5';
await mkdir(dirname(out), {recursive: true}); await mkdir(raw, {recursive: true});
const sheet = (await readFile('docs/season1/refs/faces-v5/sheet.png')).toString('base64');
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/scripts/v2/face5-gates.html`); await page.waitForFunction(() => window.F5, null, {timeout: 60000});
  const res = await page.evaluate(async b64 => {
    const F5 = window.F5, names = F5.CELL_NAMES, THIN = .08, INSET = 6;
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight, CW = W / 8, CH = H / 6;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const A = mk(), a = A.getContext('2d', {willReadFrequently: true}); a.fillStyle = '#fff'; a.fillRect(0, 0, W, H); a.drawImage(img, 0, 0);
    const B = mk(), b = B.getContext('2d', {willReadFrequently: true}); b.fillStyle = '#fff'; b.fillRect(0, 0, W, H);
    const headPx = CW / .8;
    const drawAll = off => { b.fillStyle = '#fff'; b.fillRect(0, 0, W, H); names.forEach((n, i) => { const r = Math.floor(i / 8), c = i % 8, [ox, oy] = off ? off[i] : [0, 0]; b.save(); b.beginPath(); b.rect(c * CW + 1, r * CH + 1, CW - 2, CH - 2); b.clip();
      b.translate((c + .5) * CW - headPx / 2 + ox, (r + .5) * CH - headPx / 2 + oy); F5.drawFace5(b, n, {px: headPx, tier: 'hero', skin: '#ffffff'}); b.restore(); }); };
    drawAll(null);
    const da = a.getImageData(0, 0, W, H).data; let db = b.getImageData(0, 0, W, H).data;
    const edt = (m, w, h) => {   // exact squared EDT (Felzenszwalb), m = 1 on ink
      const INF = 1e12, g = new Float64Array(w * h), f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1);
      const pass = (n, get, set) => { for (let q = 0; q < n; q++) f[q] = get(q); let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
        for (let q = 1; q < n; q++) { let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); } k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
        k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + f[v[k]]; } for (let q = 0; q < n; q++) set(q, d[q]); };
      for (let i = 0; i < w * h; i++) g[i] = m[i] ? INF : 0;   // distance of ink pixels to the nearest background
      for (let x = 0; x < w; x++) pass(h, q => g[q * w + x], (q, val) => { g[q * w + x] = val; });
      for (let y = 0; y < h; y++) pass(w, q => g[y * w + q], (q, val) => { g[y * w + q] = val; });
      return g.map(Math.sqrt);
    };
    const cellInk = (data, r, c) => { const x0 = Math.round(c * CW) + INSET, x1 = Math.round((c + 1) * CW) - INSET, y0 = Math.round(r * CH) + INSET, y1 = Math.round((r + 1) * CH) - INSET, w = x1 - x0, h = y1 - y0, m = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = ((y0 + y) * W + x0 + x) * 4; m[y * w + x] = (data[p] * .299 + data[p + 1] * .587 + data[p + 2] * .114) < 128 ? 1 : 0; } return {m, w, h}; };
    const centroid = ({m, w, h}) => { let sx = 0, sy = 0, n = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { sx += x; sy += y; n++; } return [sx / n, sy / n]; };
    const offs = []; for (let i = 0; i < 48; i++) { const r = Math.floor(i / 8), c = i % 8, cs = centroid(cellInk(da, r, c)), cm = centroid(cellInk(db, r, c)); offs.push([cs[0] - cm[0], cs[1] - cm[1]]); }
    drawAll(offs); db = b.getImageData(0, 0, W, H).data;
    const bbox = ({m, w, h}) => { let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
    const stroke = ({m, w, h}) => { const e = edt(m, w, h), vals = []; const E = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : e[y * w + x];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const c = e[y * w + x]; if (!m[y * w + x] || c < 2) continue; let ridge = true;
        for (let dy = -1; dy <= 1 && ridge; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && E(x + dx, y + dy) > c) { ridge = false; break; }
        if (ridge && 2 * c < THIN * CW) vals.push(2 * c); }
      vals.sort((p, q) => p - q); return vals.length ? vals.reduce((p, q) => p + q, 0) / vals.length : 0; };
    const rows = [];
    for (let i = 0; i < 48; i++) { const r = Math.floor(i / 8), c = i % 8, S = cellInk(da, r, c), M = cellInk(db, r, c), bs = bbox(S), bm = bbox(M);
      const dx = 0, dy = 0; let inter = 0, uni = 0;
      for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const sv = S.m[y * S.w + x], mm = M.m[y * M.w + x]; inter += sv & mm; uni += sv | mm; }
      const ss = stroke(S), sm = stroke(M);
      rows.push({cell: i, name: names[i], iou: +(inter / uni).toFixed(4), shift: offs[i].map(v => +v.toFixed(2)), strokeSheetPct: +(ss / CW * 100).toFixed(2), strokeMinePct: +(sm / CW * 100).toFixed(2), strokeRatio: ss && sm ? +(sm / ss).toFixed(3) : null, inkRatio: +(M.m.reduce((p, q) => p + q, 0) / S.m.reduce((p, q) => p + q, 0)).toFixed(3)}); }
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W * 2, H); g.drawImage(A, 0, 0); g.drawImage(B, W, 0);
    g.strokeStyle = '#111'; g.lineWidth = 2; for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(W + k * CW, 0); g.lineTo(W + k * CW, H); g.stroke(); } for (let k = 0; k <= 6; k++) { g.beginPath(); g.moveTo(W, k * CH); g.lineTo(2 * W, k * CH); g.stroke(); }
    return {rows, W, H, compare: cv.toDataURL('image/png').split(',')[1]};
  }, sheet);
  if (errors.length) throw Error(errors.join('; '));
  await writeFile(`${raw}/compare-full.png`, Buffer.from(res.compare, 'base64'));
  const iou = res.rows.map(r => r.iou), below = res.rows.filter(r => r.iou < .8), badStroke = res.rows.filter(r => r.strokeRatio !== null && Math.abs(r.strokeRatio - 1) > .10);
  const rep = {thresholds: {iou: .8, strokeTol: .10}, minIoU: Math.min(...iou), meanIoU: +(iou.reduce((a, b) => a + b, 0) / iou.length).toFixed(4), cellsBelow: below.map(r => `${r.name} ${r.iou}`),
    strokeOutOfTolerance: badStroke.map(r => `${r.name} ${r.strokeRatio}`), rows: res.rows, result: below.length || badStroke.length ? 'FAIL' : 'PASS'};
  await writeFile(out, JSON.stringify(rep, null, 1));
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); w = 1600; im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS); im.save(sys.argv[2]); print(im.size)`, `${raw}/compare-full.png`, png], {stdio: 'inherit'});
  console.log(JSON.stringify({minIoU: rep.minIoU, meanIoU: rep.meanIoU, below80: below.length, strokeOut: badStroke.length, result: rep.result}));
} finally { await browser.close(); await server.close(); }
