// Measured proportion check (pure): front orthographic flat-ID render of the master asset → bands, widths, eyes, notch vs spec.
// Classes by exact flat colour (presets FLAT): head red (+ eyes black, mouth magenta), torso green, switch blue, base yellow, bg white.
// Rows are classified by majority; a band = rows whose majority class is that part, as a fraction of the silhouette height.
import {BANDS, WIDTHS, LAYOUT} from './presets.js';
const CLS = {'255,0,0': 'head', '0,0,0': 'eye', '255,0,255': 'mouth', '0,255,0': 'torso', '0,0,255': 'switch', '255,255,0': 'base'};
// TOL: bands ± 2 % of H (prompt); the other shape numbers use the tolerances written next to them (not given by the prompt).
export const CHECKS = {bandTol: BANDS.tol, widthTol: .02, eyeHTol: .02, eyeRatioTol: .05, eyeSepTol: .03, notchTol: .03};
export function classify(buf, w, h) {   // buf row 0 = bottom (GL order) → grid[y][x] with y 0 = top
  const g = []; for (let y = 0; y < h; y++) { const r = [], src = (h - 1 - y) * w; for (let x = 0; x < w; x++) { const i = (src + x) * 4; r.push(CLS[`${buf[i]},${buf[i + 1]},${buf[i + 2]}`] ?? null); } g.push(r); } return g;
}
export function measure(grid, pxPerH) {
  const h = grid.length, w = grid[0].length, part = c => c === 'eye' || c === 'mouth' ? 'head' : c;
  const rows = grid.map(r => { const n = {}; for (const c of r) if (c) n[part(c)] = (n[part(c)] ?? 0) + 1; const k = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; return k ?? null; });
  const ys = rows.map((k, y) => k ? y : -1).filter(y => y >= 0), y0 = ys[0], y1 = ys.at(-1), Hpx = y1 - y0 + 1;
  const band = {}; for (let y = y0; y <= y1; y++) if (rows[y]) band[rows[y]] = (band[rows[y]] ?? 0) + 1;
  const frac = Object.fromEntries(['head', 'torso', 'switch', 'base'].map(k => [k, +((band[k] ?? 0) / Hpx).toFixed(4)]));
  const span = (y, want) => { const xs = []; grid[y].forEach((c, x) => { if (c && want.includes(part(c))) xs.push(x); }); return xs.length ? {x0: xs[0], x1: xs.at(-1), n: xs.at(-1) - xs[0] + 1} : null; };
  const bandRows = k => ys.filter(y => rows[y] === k), maxW = (yy, want) => Math.max(0, ...yy.map(y => span(y, want)?.n ?? 0)) / pxPerH;
  const hr = bandRows('head'), br = bandRows('base'), tr = bandRows('torso');
  const pick = (a, f0, f1) => a.slice(Math.floor(a.length * f0), Math.max(Math.floor(a.length * f0) + 1, Math.floor(a.length * f1)));
  const widths = {headTop: +maxW(pick(hr, .03, .10), ['head']).toFixed(4), headBottom: +maxW(pick(hr, .80, 1), ['head']).toFixed(4),
    torsoBottom: +maxW(pick(tr, .9, 1), ['torso']).toFixed(4), baseTop: +maxW(pick(br, .02, .08), ['base']).toFixed(4), baseBottom: +maxW(pick(br, .80, .86), ['base']).toFixed(4)};
  // eyes: connected black runs → two blobs (left/right of centre)
  const eyes = [-1, 1].map(s => { let yy0 = Infinity, yy1 = -1, xx0 = Infinity, xx1 = -1;
    grid.forEach((r, y) => r.forEach((c, x) => { if (c === 'eye' && Math.sign(x - w / 2) === s) { yy0 = Math.min(yy0, y); yy1 = Math.max(yy1, y); xx0 = Math.min(xx0, x); xx1 = Math.max(xx1, x); } }));
    return yy1 < 0 ? null : {h: yy1 - yy0 + 1, w: xx1 - xx0 + 1, cx: (xx0 + xx1) / 2, cy: (yy0 + yy1) / 2}; });
  const headH = hr.length, eyeRow = eyes[0] ? Math.round(eyes[0].cy) : null, headWAtEye = eyeRow !== null ? span(eyeRow, ['head']).n : null;
  const eye = eyes.every(Boolean) ? {hOfHead: +(eyes[0].h / headH).toFixed(4), wOverH: +(eyes[0].w / eyes[0].h).toFixed(4), sepOfHeadW: +((eyes[1].cx - eyes[0].cx) / headWAtEye).toFixed(4),
    aboveMid: +(((hr[0] + hr.at(-1)) / 2 - eyes[0].cy) / headH).toFixed(4)} : null;
  // notch: bottom rows of the base where the centre column is background
  let notchRows = 0; for (let y = y1; y >= y0 && !grid[y][Math.floor(w / 2)]; y--) notchRows++;
  const ny = y1 - Math.floor(notchRows / 2), nr = grid[ny]; let gx0 = Math.floor(w / 2), gx1 = gx0; while (gx0 > 0 && !nr[gx0 - 1]) gx0--; while (gx1 < w - 1 && !nr[gx1 + 1]) gx1++;
  const notch = {wOfBase: +((gx1 - gx0 + 1) / (widths.baseBottom * pxPerH)).toFixed(4), hOfBase: +(notchRows / br.length).toFixed(4)};
  return {heightH: +(Hpx / pxPerH).toFixed(4), bands: frac, boundaries: {headBottom: +((y1 - hr.at(-1)) / Hpx).toFixed(4)}, widths, eye, notch};
}
export function judge(m) {
  const F = [], C = CHECKS, chk = (name, got, want, tol) => { const ok = got !== null && got !== undefined && Math.abs(got - want) <= tol + 1e-9; if (!ok) F.push(`${name} ${got} vs ${want} ± ${tol}`); return {got, want, tol, pass: ok}; };
  const r = {
    bands: Object.fromEntries(['head', 'torso', 'switch', 'base'].map(k => [k, chk(`${k} band`, m.bands[k], BANDS[k], C.bandTol)])),
    widths: {headTop: chk('head top width', m.widths.headTop, WIDTHS.headTop, C.widthTol), headBottom: chk('head bottom width', m.widths.headBottom, WIDTHS.headBottom, C.widthTol),
      torsoBottom: chk('torso bottom width', m.widths.torsoBottom, WIDTHS.torsoBottom, C.widthTol),
      baseTop: chk('base top width', m.widths.baseTop, WIDTHS.baseTop, C.widthTol)},
    eye: {hOfHead: chk('eye height / head', m.eye?.hOfHead, LAYOUT.eye.hOfHead, C.eyeHTol), wOverH: chk('eye w/h', m.eye?.wOverH, 1 / 3, C.eyeRatioTol),
      sepOfHeadW: chk('eye separation / head width', m.eye?.sepOfHeadW, .5, C.eyeSepTol)},
    notch: {wOfBase: chk('notch width / base', m.notch.wOfBase, .30, C.notchTol), hOfBase: chk('notch height / base', m.notch.hOfBase, .12, C.notchTol)},
  };
  if (!(m.eye?.aboveMid > 0)) F.push(`eye centres not above head mid-height (${m.eye?.aboveMid})`);
  return {pass: F.length === 0, failures: F, checks: r};
}
