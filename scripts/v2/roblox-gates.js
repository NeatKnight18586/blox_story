// scripts/v2/roblox-gates.js — tuft 4C gates for `grade: 'roblox'` (engine/cinelook.js ROBLOX) → review/tuft/roblox-gates.json.
// Measured on the 6 look-ab frames of tuft (mid-frame of shots 1 3 9 21 31 59, the 4B cameras: the grade is the only change),
// 'clear' (stories/tuft/episode.json as is) vs the same spec with grade 'roblox', 540×960, aa on, as shipped (grain on):
//   grain     luma std of (grain on − grain off) on the same frame: roblox = 0
//   sat       day frames: mean HSV S, roblox ≥ clear × 1.25
//   night     night frames (look4 moonlit): mean of the darkest 10 % of luma (display 0–1) in 0.015–0.04
//   sharp     variance of the 4-neighbour Laplacian of luma (0–255): roblox ≥ clear × 1.3 (mean over the 6 frames)
//   bloom     pixels the bloom changes by > 2/255 luma, outside the emissive mask (glow surfaces + display luma ≥ .97 in the bloom-off frame,
//             dilated 8 px at 540 wide): ≤ 0.5 % of the frame
// Usage: node scripts/v2/roblox-gates.js [--spec stories/tuft/episode.json] [--frames 17,117,...] [--out review/tuft/roblox-gates.json]
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';
import {segmentPlan} from './segments.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const SPEC = arg('spec', 'stories/tuft/episode.json'), OUT = arg('out', 'review/tuft/roblox-gates.json'), W = 540, H = 960;
const base = JSON.parse(readFileSync(SPEC, 'utf8')), shots = layoutShots(base);
const FR = arg('frames', null)?.split(',').map(Number) ?? [1, 3, 9, 21, 31, 59].map(n => shots[n - 1]).map(s => Math.round(s.start + s.frames / 2));
const tmp = path.join(path.dirname(SPEC), 'build'); mkdirSync(tmp, {recursive: true});
const variant = (grade) => { const p = path.join(tmp, `gates-${grade}.json`); writeFileSync(p, JSON.stringify({...base, grade})); return p; };
const nightOf = f => { const s = shots.findLast(x => f >= x.start); return (base.locationLook4?.[s.loc] ?? s.look ?? base.look4) === 'moonlit'; };   // a location bakes one look4 (4A)
const MEASURE = `window.__rbm = (f, W, H) => { const E = window.__episode, gl = E.debug.renderer.getContext(), O = E.cine.opts;
  const grab = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const luma = px => { const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = (.2126 * px[i * 4] + .7152 * px[i * 4 + 1] + .0722 * px[i * 4 + 2]) / 255; return L; };
  O.grain = true; O.bloom = true; E.renderFrame(f, W, H); const A = grab(), LA = luma(A);
  O.grain = false; E.renderFrame(f, W, H); const LG = luma(grab());
  O.bloom = false; E.renderFrame(f, W, H); const NB = grab(), LN = luma(NB);
  E.cine.setGlow(false); E.renderFrame(f, W, H); const LGo = luma(grab()); E.cine.setGlow(true); O.grain = true; O.bloom = true;
  let gs = 0, gs2 = 0; for (let i = 0; i < W * H; i++) { const d = LA[i] - LG[i]; gs += d; gs2 += d * d; } const grainStd = Math.sqrt(Math.max(0, gs2 / (W * H) - (gs / (W * H)) ** 2));
  let S = 0; for (let i = 0; i < W * H; i++) { const r = A[i * 4], g = A[i * 4 + 1], b = A[i * 4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); S += mx ? (mx - mn) / mx : 0; } S /= W * H;
  const so = Float32Array.from(LA).sort(), n10 = Math.floor(W * H / 10); let d10 = 0; for (let i = 0; i < n10; i++) d10 += so[i]; d10 /= n10;
  let ls = 0, ls2 = 0, ln = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, v = 255 * (4 * LA[i] - LA[i - 1] - LA[i + 1] - LA[i - W] - LA[i + W]); ls += v; ls2 += v * v; ln++; }
  const lap = ls2 / ln - (ls / ln) ** 2;
  const em = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (LN[i] >= .97 || Math.abs(LN[i] - LGo[i]) > 2 / 255) em[i] = 1;
  const R = Math.round(8 * W / 540), dil = new Uint8Array(W * H);   // separable box dilation
  const tmp = new Uint8Array(W * H); for (let y = 0; y < H; y++) { let run = -1e9; for (let x = 0; x < W; x++) { if (em[y * W + x]) run = x; tmp[y * W + x] = x - run <= R ? 1 : 0; } run = 1e9; for (let x = W - 1; x >= 0; x--) { if (em[y * W + x]) run = x; if (run - x <= R) tmp[y * W + x] = 1; } }
  for (let x = 0; x < W; x++) { let run = -1e9; for (let y = 0; y < H; y++) { if (tmp[y * W + x]) run = y; dil[y * W + x] = y - run <= R ? 1 : 0; } run = 1e9; for (let y = H - 1; y >= 0; y--) { if (tmp[y * W + x]) run = y; if (run - y <= R) dil[y * W + x] = 1; } }
  let bl = 0, blAll = 0, emN = 0; for (let i = 0; i < W * H; i++) { const d = Math.abs(LG[i] - LN[i]) > 2 / 255; if (d) blAll++; if (d && !dil[i]) bl++; if (em[i]) emN++; }
  let mean = 0; for (const v of LA) mean += v; mean /= W * H;
  return {frame: f, grainStd, sat: S, dark10: d10, lap, bloomNonEmissive: bl / (W * H), bloomAll: blAll / (W * H), emissive: emN / (W * H), mean, state: {grade: E.cine.state.grade, dof: E.cine.state.dof}}; };`;

const server = await startServer(process.cwd()), browser = await launch(), res = {};
for (const grade of ['clear', 'roblox']) {
  const {segments} = segmentPlan(variant(grade)); res[grade] = [];
  for (const seg of segments) {
    const mine = FR.filter(f => !seg.shotIds || seg.shotIds.has(shots.findLast(x => f >= x.start).id)); if (!mine.length) continue;
    const page = await browser.newPage({viewport: {width: 360, height: 640}}); page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 200)));
    await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(seg.specPath)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
    await page.evaluate(MEASURE);
    for (const f of mine) { const m = await page.evaluate(([f, W, H]) => window.__rbm(f, W, H), [f, W, H]); m.night = nightOf(f); res[grade].push(m); }
    await page.close();
  }
  res[grade].sort((a, b) => a.frame - b.frame);
}
await browser.close(); server.close?.();
const gates = [], gate = (name, pass, line, data = {}) => { gates.push({name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const C = res.clear, Rb = res.roblox, mean = a => a.reduce((s, x) => s + x, 0) / a.length, day = r => r.filter(m => !m.night), night = r => r.filter(m => m.night);
const g = Math.max(...Rb.map(m => m.grainStd)); gate('grain', g === 0, `roblox grain std ${g.toFixed(5)} (= 0); clear ${mean(C.map(m => m.grainStd)).toFixed(4)}`);
const sC = mean(day(C).map(m => m.sat)), sR = mean(day(Rb).map(m => m.sat)); gate('saturation', sR >= sC * 1.25, `day mean HSV S roblox ${sR.toFixed(3)} vs clear ${sC.toFixed(3)} = ×${(sR / sC).toFixed(2)} (≥ 1.25)`);
const nd = night(Rb).map(m => m.dark10); gate('night', nd.every(v => v >= .015 && v <= .04), `darkest-10 % luma per night frame ${nd.map(v => v.toFixed(4)).join(' ')} (0.015–0.04); clear ${night(C).map(m => m.dark10.toFixed(4)).join(' ')}`);
const lC = mean(C.map(m => m.lap)), lR = mean(Rb.map(m => m.lap)); gate('sharpness', lR >= lC * 1.3, `Laplacian variance roblox ${lR.toFixed(1)} vs clear ${lC.toFixed(1)} = ×${(lR / lC).toFixed(2)} (≥ 1.3)`);
const bm = Math.max(...Rb.map(m => m.bloomNonEmissive)); gate('bloom', bm <= .005, `bloom on non-emissive pixels, worst frame ${(100 * bm).toFixed(3)} % (≤ 0.5 %)`);
writeFileSync(OUT, JSON.stringify({spec: SPEC, frames: FR, size: [W, H], gates, clear: C, roblox: Rb}, null, 1) + '\n');
console.log(`→ ${OUT}: ${gates.filter(x => x.pass).length}/${gates.length} PASS`);
process.exit(0);
