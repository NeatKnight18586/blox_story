// scripts/v2/cine-gates.js — tuft 1B (+ 1B fix) Look Pack gates (browser) → review/cine/gates.json:
//   1B: bloom (white DUMMY under the street lamp: luma delta on its silhouette ≤ 0.5 %; HDR glow cube halo present ≥ 3 %),
//       grain (same frame = same bytes; luma std 1.5–2.5 %), DOF focus = the focused head's distance ± 2 % (rack: from → to).
//   1B fix, measured on the 12 sheet frames, before (before.json) vs after (episode.json), grain off, 540×960:
//       contrast (mean per-frame luma std) after ≥ before × 1.15; separation (|mean luma on the hero mask − a 12 px ring around it|)
//       after ≥ before × 1.3; rim (CU/MCU frames: ≥ 3 % of the hero's edge pixels > 1.4 × its interior mean); no milk (mean of the
//       darkest 10 % of pixels) after ≤ before + 0.02.
//   camera (every 2nd frame of every shot, 270×480): every listed subject's whole head inside the frame (100 %); the main subject's
//       size v (frame height at its head / body height) inside its band (engine/cine.js SIZE_BAND) on ≥ 95 % of a framed shot's frames.
//   fg: max luma of the fg lantern glow ≤ the subject's brightest pixel. dollyZoom: subject size ± 3 %, fov ≥ 28 → ≥ 70°, background
//       frame width 20 studs behind the subject (= angular stretch at the frame edge) ≥ 2× start.
//   cost: ms/frame at 270×480 before / after; est. --final s/frame at 1440×2560 with MSAA 4× ≤ 3.0 (this sandbox, swiftshader);
//   edges (RETIRED tuft 2A, owner ruling: the residual is head-mesh facets, not aliasing; 0.47 px at 1440 ≈ 0.13 px on a phone): reported only, edge-390.png kept;
//       max stair-step (px) on the hero's head outline in the --final frame (sub-pixel edge vs the chord of its 2 neighbours)
//       (a hard 1-px step reads 0.5).
// Usage: node scripts/v2/cine-gates.js [--no-final]
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {subjectsOf, SIZE_BAND} from '../../engine/cine.js';
import {layoutShots} from '../../engine/timeline.js';

const gates = [], gate = (name, pass, line, data = {}) => { gates.push({name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const server = await startServer(process.cwd()), browser = await launch();
async function open(spec, extra = '&aa=0') { const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 200)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}${extra}`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000}); return page; }
const stats = a => { const m = a.reduce((s, x) => s + x, 0) / a.length; return {mean: m, std: Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length)}; };
const SPEC = JSON.parse(readFileSync('engine/fixtures/cine/episode.json', 'utf8')), SHOTS = layoutShots(SPEC);
const PICKS = SHOTS.flatMap(s => [s.start + Math.round(s.frames * .3), s.start + Math.round(s.frames * .82)]);
const CLOSE = new Set(SHOTS.filter(s => ['cu', 'mcu', 'close'].includes(s.size)).flatMap(s => [s.start + Math.round(s.frames * .3), s.start + Math.round(s.frames * .82)]));
// in-page helpers (string-injected): luma of the canvas, the hero mask, ring / edge / interior statistics
const LOOKFN = `window.__look = (f, W, H, who) => { const E = window.__episode, gl = E.debug.renderer.getContext(); if (E.cine) E.cine.opts.grain = false; E.renderFrame(f, W, H);
  const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); const L = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; }
  const m = E.actorMask(who, W, H); if (E.cine) E.cine.opts.grain = true;
  let s = 0, s2 = 0; for (const v of L) { s += v; s2 += v * v; } const mean = s / L.length, std = Math.sqrt(Math.max(0, s2 / L.length - mean * mean));
  const sorted = Float32Array.from(L).sort(), n10 = Math.floor(L.length / 10); let d10 = 0; for (let i = 0; i < n10; i++) d10 += sorted[i]; d10 /= n10;
  // distance-to-mask (chamfer, 2 passes) for the ring; distance-inside for edge / interior
  const dist = (inside) => { const D = new Float32Array(W * H).fill(1e9); for (let i = 0; i < W * H; i++) if ((m[i] === 1) === inside) D[i] = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - W] + 1); if (x && y) D[i] = Math.min(D[i], D[i - W - 1] + 1.414); if (y && x < W - 1) D[i] = Math.min(D[i], D[i - W + 1] + 1.414); }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < H - 1) D[i] = Math.min(D[i], D[i + W] + 1); if (x < W - 1 && y < H - 1) D[i] = Math.min(D[i], D[i + W + 1] + 1.414); if (y < H - 1 && x) D[i] = Math.min(D[i], D[i + W - 1] + 1.414); } return D; };
  const out = dist(true), inn = dist(false); let ms = 0, mn = 0, rs = 0, rn = 0, is = 0, inN = 0; const edge = [];
  for (let i = 0; i < W * H; i++) { if (m[i]) { ms += L[i]; mn++; if (inn[i] <= 2) edge.push(L[i]); else if (inn[i] >= 5) { is += L[i]; inN++; } } else if (out[i] <= 12) { rs += L[i]; rn++; } }
  const im = inN ? is / inN : 0, rim = edge.length ? edge.filter(v => v > 1.4 * im).length / edge.length : 0;
  return {mean, std, d10, maskPx: mn, inMask: mn ? ms / mn : 0, ring: rn ? rs / rn : 0, sep: mn && rn ? Math.abs(ms / mn - rs / rn) : 0, rim, interior: im, edgePx: edge.length}; };`;
try {
  // ---- 1B gates ---------------------------------------------------------------------------------------------------------
  { const page = await open('engine/fixtures/cine/bloomgate.json'), W = 540, H = 960;
    const r = await page.evaluate(([W, H]) => { const E = window.__episode, {scene, camera, renderer} = E.debug, gl = renderer.getContext();
      const luma = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); const L = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; } return L; };
      E.cine.opts.grain = false; E.cine.opts.bloom = true; E.renderFrame(1, W, H); const on = luma(); E.cine.opts.bloom = false; E.renderFrame(1, W, H); const off = luma(); const mask = E.actorMask('dummy', W, H);
      E.cine.setGlow(false); E.cine.opts.bloom = true; E.renderFrame(1, W, H); const onL = luma(); E.cine.opts.bloom = false; E.renderFrame(1, W, H); const offL = luma(); E.cine.setGlow(true);
      const er = new Uint8Array(W * H); for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { let k = 1; for (let d = -3; d <= 3 && k; d++) if (!mask[y * W + x + d] || !mask[(y + d) * W + x]) k = 0; er[y * W + x] = k; }
      let so = 0, sf = 0, n = 0, lo = 0, lf = 0; for (let i = 0; i < W * H; i++) if (er[i]) { so += on[i]; sf += off[i]; lo += onL[i]; lf += offL[i]; n++; }
      const cube = scene.getObjectByName('glowCube_0'); cube.geometry.computeBoundingBox(); const b = cube.geometry.boundingBox.clone().applyMatrix4(cube.matrixWorld); let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
      for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) { const v = cube.position.clone().set(cx, cy, cz).project(camera); x0 = Math.min(x0, (v.x + 1) / 2); x1 = Math.max(x1, (v.x + 1) / 2); y0 = Math.min(y0, (1 - v.y) / 2); y1 = Math.max(y1, (1 - v.y) / 2); }
      const pw = (x1 - x0) * .5, ph = (y1 - y0) * .5; let ro = 0, rf = 0, rn = 0;
      for (let y = Math.max(0, Math.floor((y0 - ph) * H)); y < Math.min(H, (y1 + ph) * H); y++) for (let x = Math.max(0, Math.floor((x0 - pw) * W)); x < Math.min(W, (x1 + pw) * W); x++) { const inside = x >= x0 * W && x <= x1 * W && y >= y0 * H && y <= y1 * H; if (inside || mask[y * W + x]) continue; ro += on[y * W + x]; rf += off[y * W + x]; rn++; }
      return {actor: {on: lo / n, off: lf / n, px: n}, spill: {on: so / n, off: sf / n}, ring: {on: ro / rn, off: rf / rn, px: rn}, glow: E.cine.glowCount()}; }, [W, H]);
    const dA = Math.abs(r.actor.on - r.actor.off) / r.actor.off * 100, dC = (r.ring.on - r.ring.off) / r.ring.off * 100, dS = (r.spill.on - r.spill.off) / r.spill.off * 100;
    gate('bloom: non-emissive actor luma delta ≤ 0.5 %', dA <= .5, `white DUMMY under the lamp, its own bloom (glow surfaces at LDR, actor rim on): ${dA.toFixed(3)} % (${r.actor.px} px, luma ${r.actor.off.toFixed(3)} → ${r.actor.on.toFixed(3)}); halo spill from the lamp + cube beside it (not the gate): +${dS.toFixed(1)} %`, {value: dA, spill: dS});
    gate('bloom: present around the HDR glow cube (≥ 3 %)', dC >= 3, `ring around the cube +${dC.toFixed(1)} % (${r.ring.off.toFixed(3)} → ${r.ring.on.toFixed(3)}), ${r.glow} glow materials`, {value: dC});
    await page.close(); }
  const page = await open('engine/fixtures/cine/episode.json');
  { const r = await page.evaluate(() => { const E = window.__episode, gl = E.debug.renderer.getContext(), W = 540, H = 960, grab = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
      E.cine.opts.grain = true; E.renderFrame(120, W, H); const a = grab(); E.renderFrame(200, W, H); E.renderFrame(120, W, H); const b = grab(); E.renderFrame(121, W, H); const c1 = grab(); E.cine.opts.grain = false; E.renderFrame(120, W, H); const c = grab(); E.cine.opts.grain = true;
      let same = a.length === b.length; for (let i = 0; i < a.length && same; i++) if (a[i] !== b[i]) same = false;
      const d = [], L = (p, i) => (.2126 * p[i] + .7152 * p[i + 1] + .0722 * p[i + 2]) / 255; for (let i = 0; i < a.length; i += 4) d.push(L(a, i) - L(c, i));
      let diff121 = 0; for (let i = 0; i < a.length; i++) if (a[i] !== c1[i]) diff121++;
      return {same, d, diff121}; });
    const s = stats(r.d), sd = s.std * 100;
    gate('grain deterministic (same frame = same bytes)', r.same, `frame 120 rendered twice (frame 200 between): ${r.same ? 'identical' : 'DIFFERENT'} bytes; frame 121 differs in ${r.diff121} bytes`);
    gate('grain 1.5–2.5 % luma', sd >= 1.5 && sd <= 2.5, `luma std ${sd.toFixed(2)} % (mean shift ${(s.mean * 100).toFixed(2)} %)`, {value: sd}); }
  { const D = SHOTS.find(s => s.rack), fr = [0, 4, 12, 20, 26, 40, 46].map(k => D.start + k);
    const rows = await page.evaluate(fr => { const E = window.__episode, out = []; for (const f of fr) { E.renderFrame(f, 270, 480); const s = E.cine.state; out.push({f, focus: s.focus, from: s.rackFromDist, to: s.rackDist, lt: s.lt}); } return out; }, fr);
    let worst = 0; const lines = [];
    for (const r of rows) { const a = D.rack.at, b = a + (D.rack.dur ?? .6); if (r.lt > a && r.lt < b) { lines.push(`${r.f} racking ${r.focus.toFixed(2)}`); continue; }
      const tgt = r.lt >= b ? r.to : r.from, e = Math.abs(r.focus / tgt - 1) * 100; worst = Math.max(worst, e); lines.push(`${r.f} ${e.toFixed(2)} %`); }
    gate('DOF focus = focused head distance ± 2 % (rack kid → hero)', worst <= 2, `max ${worst.toFixed(3)} % (${lines.join(', ')})`, {value: worst}); }
  // ---- 1B fix: camera respects staging -----------------------------------------------------------------------------------
  { const rows = []; for (const s of SHOTS) { const subs = subjectsOf(s), frames = []; for (let k = 0; k < s.frames; k += 2) frames.push(s.start + k);
      const m = await page.evaluate(([fr, subs, main]) => { const E = window.__episode; return fr.map(f => { E.renderFrame(f, 270, 480); const m = E.cine.measure([...new Set([...subs, main].filter(Boolean))]); return {f, m}; }); }, [frames, subs, s.subject]);
      let inF = 0, n = 0, inB = 0, nb = 0, capHit = 0; const band = SIZE_BAND[s.size], vs = [];
      let worst = 0, wf = null; for (const {f, m: mm} of m) { for (const a of subs) { const h = mm[a]; n++; if (h && !h.behind && h.x0 >= -1 && h.x1 <= 1 && h.y0 >= -1 && h.y1 <= 1) inF++; if (h && h.y0 < -.16 && h.y1 > -.48) capHit++;
          const o = h ? Math.max(-1 - h.x0, h.x1 - 1, -1 - h.y0, h.y1 - 1) : 9; if (o > worst) { worst = o; wf = f; } }
        if (band && s.move !== 'dollyZoom' || band && s.move === 'dollyZoom') { const v = mm[s.subject]?.v; if (v != null) { nb++; vs.push(v); if (v >= band[0] && v <= band[1]) inB++; } } }
      rows.push({id: s.id, subs, inF, n, capHit, worst, wf, band, inB, nb, vmin: vs.length ? Math.min(...vs) : null, vmax: vs.length ? Math.max(...vs) : null}); }
    const headsOk = rows.every(r => r.inF === r.n), sizeOk = rows.every(r => !r.band || r.inB / r.nb >= .95);
    gate('camera: every listed subject\'s whole head in frame (100 % of sampled frames)', headsOk, rows.map(r => `${r.id} [${r.subs.join('+')}] ${r.inF}/${r.n}${r.worst > 0 ? ` (worst ${(r.worst * 50).toFixed(1)} % of the frame out, f${r.wf})` : ''}${r.capHit ? ` (caption band ${r.capHit})` : ''}`).join('; '), {rows});
    gate('camera: main subject size in its band on ≥ 95 % of frames', sizeOk, rows.filter(r => r.band).map(r => `${r.id} ${r.inB}/${r.nb} v ${r.vmin.toFixed(2)}–${r.vmax.toFixed(2)} (band ${r.band.join('–')})`).join('; '), {rows}); }
  // ---- 1B fix: dolly zoom + fg ---------------------------------------------------------------------------------------------
  { const E5 = SHOTS.find(s => s.move === 'dollyZoom'), fr = Array.from({length: E5.frames}, (_, k) => E5.start + k);
    const r = await page.evaluate(([fr, who]) => { const E = window.__episode, cam = E.debug.camera; return fr.map(f => { E.renderFrame(f, 270, 480); const m = E.cine.measure([who])[who]; return {f, v: m.v, z: m.z, fov: cam.fov, aspect: cam.aspect}; }); }, [fr, E5.subject]);
    const v0 = r[0].v, dev = Math.max(...r.map(x => Math.abs(x.v / v0 - 1))), bgW = x => 2 * (x.z + 20) * Math.tan(Math.atan(Math.tan(x.fov * Math.PI / 360) * x.aspect)), stretch = bgW(r.at(-1)) / bgW(r[0]);
    gate('dollyZoom: subject size ± 3 % (frames)', dev <= .03, `max deviation ${(dev * 100).toFixed(2)} % over ${r.length} frames, fov ${r[0].fov.toFixed(1)}° → ${r.at(-1).fov.toFixed(1)}°`, {value: dev});
    gate('dollyZoom: background stretch at the frame edges ≥ 2×', stretch >= 2 && r[0].fov <= 28.5 && r.at(-1).fov >= 69.5, `frame width 20 studs behind the subject ${bgW(r[0]).toFixed(2)} → ${bgW(r.at(-1)).toFixed(2)} studs = ×${stretch.toFixed(2)}`, {value: stretch}); }
  { const F = SHOTS.find(s => s.fg), fr = [0, .3, .6, .82, .95].map(k => F.start + Math.round(k * (F.frames - 1)));
    const r = await page.evaluate(([fr, who]) => { const E = window.__episode, gl = E.debug.renderer.getContext(), W = 540, H = 960; E.cine.opts.grain = false;
      const luma = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); const L = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; } return L; };
      const out = []; for (const f of fr) { E.cine.opts.fg = true; E.renderFrame(f, W, H); const a = luma(); const m = E.actorMask(who, W, H); E.cine.opts.fg = false; E.renderFrame(f, W, H); const b = luma(); E.cine.opts.fg = true;
        let fgMax = 0, fgPx = 0, sMax = 0, edge = 0; for (let i = 0; i < W * H; i++) { if (a[i] - b[i] > .02 && !m[i]) { fgPx++; fgMax = Math.max(fgMax, a[i]); } if (m[i]) sMax = Math.max(sMax, a[i]); }
        out.push({f, fgMax, fgPx, sMax}); } E.cine.opts.grain = true; return out; }, [fr, F.subject]);
    const ok = r.every(x => x.fgPx > 0 && x.fgMax <= x.sMax);
    gate('fg: soft lantern glow never the brightest thing (fg max ≤ subject max)', ok, r.map(x => `${x.f} fg ${x.fgMax.toFixed(3)} (${x.fgPx} px) ≤ subject ${x.sMax.toFixed(3)}`).join('; '), {rows: r}); }
  // ---- 1B fix: the look, before vs after --------------------------------------------------------------------------------
  await page.evaluate(LOOKFN); const pbL = await open('engine/fixtures/cine/before.json'); await pbL.evaluate(LOOKFN);
  const after = [], before = []; for (const f of PICKS) { after.push({f, ...await page.evaluate(f => window.__look(f, 540, 960, 'hero'), f)}); before.push({f, ...await pbL.evaluate(f => window.__look(f, 540, 960, 'hero'), f)}); }
  await pbL.close();
  { const mb = stats(before.map(x => x.std)).mean, ma = stats(after.map(x => x.std)).mean;
    gate('look: frame contrast (luma std) after ≥ before × 1.15', ma >= mb * 1.15, `mean luma std ${mb.toFixed(4)} → ${ma.toFixed(4)} (×${(ma / mb).toFixed(2)}); per frame ${after.map((x, i) => `${x.f} ${before[i].std.toFixed(3)}→${x.std.toFixed(3)}`).join(', ')}`, {before: mb, after: ma}); }
  { const ok = (a, b) => a.maskPx > 200 && b.maskPx > 200, pairs = after.map((x, i) => [before[i], x]).filter(([b, a]) => ok(a, b)), mb = stats(pairs.map(p => p[0].sep)).mean, ma = stats(pairs.map(p => p[1].sep)).mean;
    gate('look: subject separation (hero vs 12 px ring) after ≥ before × 1.3', ma >= mb * 1.3, `mean |mask − ring| ${mb.toFixed(4)} → ${ma.toFixed(4)} (×${(ma / mb).toFixed(2)}) over ${pairs.length} frames`, {before: mb, after: ma}); }
  { const cl = after.filter(x => CLOSE.has(x.f) && x.maskPx > 200), mn = Math.min(...cl.map(x => x.rim)), mb = Math.min(...before.filter(x => CLOSE.has(x.f) && x.maskPx > 200).map(x => x.rim));
    gate('look: rim present on CU/MCU (≥ 3 % of the hero\'s edge px > 1.4 × interior mean)', mn >= .03, `min ${(mn * 100).toFixed(1)} % over ${cl.length} frames (${cl.map(x => `${x.f} ${(x.rim * 100).toFixed(1)} %`).join(', ')}); before min ${(mb * 100).toFixed(1)} %`, {value: mn}); }
  { const mb = stats(before.map(x => x.d10)).mean, ma = stats(after.map(x => x.d10)).mean;
    gate('look: no milk (darkest 10 % mean) after ≤ before + 0.02', ma <= mb + .02, `${mb.toFixed(4)} → ${ma.toFixed(4)} (Δ ${(ma - mb >= 0 ? '+' : '')}${(ma - mb).toFixed(4)})`, {before: mb, after: ma}); }
  // ---- cost ---------------------------------------------------------------------------------------------------------------
  const msOf = async (pg, frames, w, h) => pg.evaluate(([fr, w, h]) => { const E = window.__episode; E.renderFrame(fr[0], w, h); const ms = []; for (const f of fr) ms.push(E.renderFrame(f, w, h).ms); return ms; }, [frames, w, h]);
  const F = Array.from({length: 30}, (_, i) => 3 + i * 10);
  const aft = stats(await msOf(page, F, 270, 480)).mean, after720 = stats(await msOf(page, F.filter((_, i) => i % 3 === 0), 720, 1280)).mean; await page.close();
  const pb = await open('engine/fixtures/cine/before.json'), bef = stats(await msOf(pb, F, 270, 480)).mean, before720 = stats(await msOf(pb, F.filter((_, i) => i % 3 === 0), 720, 1280)).mean; await pb.close();
  let fin = null, edge = null;
  if (!process.argv.includes('--no-final')) {
    const pf = await open('engine/fixtures/cine/episode.json', '&aa=1'); fin = stats(await msOf(pf, [120, 141, 270], 1440, 2560)).mean;
    // edge: the --final frame of the MCU (C, late) — hero head outline, sub-pixel edge per row (sides) and per column (top)
    const C = SHOTS.find(s => s.size === 'mcu'), f = C.start + Math.round(C.frames * .82);
    const edgeOf = async (pg) => pg.evaluate(f => { const E = window.__episode, gl = E.debug.renderer.getContext(), W = 1440, H = 2560; E.cine.opts.grain = false; E.renderFrame(f, W, H);
      const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); const url = E.debug.renderer.domElement.toDataURL('image/png'); const L = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; }
      const h = E.cine.measure(['hero']).hero, X0 = Math.max(2, Math.floor((h.x0 + 1) / 2 * W) - 14), X1 = Math.min(W - 3, Math.ceil((h.x1 + 1) / 2 * W) + 14), Y0 = Math.max(2, Math.floor((1 - h.y1) / 2 * H) - 14), Y1 = Math.min(H - 3, Math.ceil((1 - h.y0) / 2 * H) + 14);
      const m = E.actorMask('hero', W, H); E.cine.opts.grain = true;
      // the head is the top part of the hero mask inside the head box; edge = luma crossing at the mid level between 4 px in / 4 px out
      // sub-pixel edge = coverage area: from the last outside pixel k, the window k−3 … k+4 counts (1 − coverage), coverage = (L − bg) / (rim − bg)
      // with bg = the background 4–5 px out and rim = the brightest of the first 3 head pixels (the rim makes the head edge its brightest part)
      // (the outline is found in the image: the first jump from the dark background onto the lit head — the actor mask also holds
      // invisible head extras, ~15 px above the visible top)
      const cross = (get, n) => { let k = -1; for (let i = 5; i < n - 1; i++) if (get.m(i + 1) || get.m(i + 8)) { if (get.l(i + 1) - get.l(i - 3) > .15) { k = i; break; } } if (k < 6 || k > n - 6) return null;
        const bg = (get.l(k - 4) + get.l(k - 5)) / 2, fg = Math.max(get.l(k + 1), get.l(k + 2), get.l(k + 3)); if (fg - bg < .05) return null;
        let pos = k - 3; for (let j = k - 3; j <= k + 4; j++) pos += 1 - Math.min(1, Math.max(0, (get.l(j) - bg) / (fg - bg))); return pos; };
      const series = []; const rows = [], cols = [];
      for (let y = Y0 + Math.round((Y1 - Y0) * .25); y < Y0 + Math.round((Y1 - Y0) * .75); y++) { const g = {m: i => m[y * W + X0 + i], l: i => L[y * W + X0 + i]}; const c = cross(g, X1 - X0); if (c !== null) rows.push(c); }
      for (let x = X0 + Math.round((X1 - X0) * .2); x < X0 + Math.round((X1 - X0) * .8); x++) { const g = {m: i => m[(Y0 + i) * W + x], l: i => L[(Y0 + i) * W + x]}; const c = cross(g, Y1 - Y0); if (c !== null) cols.push(c); }
      // stair-step = deviation of each edge sample from the chord of its two neighbours (pixel-scale jaggies; curvature of a 20 px radius ≈ 0.03 px)
      const steps = a => { let w = 0; for (let i = 1; i < a.length - 1; i++) { if (Math.abs(a[i + 1] - a[i - 1]) > 4) continue; w = Math.max(w, Math.abs(a[i] - (a[i - 1] + a[i + 1]) / 2)); } return w; };
      return { url, box: [X0, Y0, X1, Y1], rows: rows.length, cols: cols.length, step: Math.max(steps(rows), steps(cols)), stepRows: steps(rows), stepCols: steps(cols)}; }, f);
    edge = await edgeOf(pf); await pf.close();
    const p0 = await open('engine/fixtures/cine/episode.json', '&aa=0'), e0 = await edgeOf(p0); await p0.close();
    mkdirSync('renders/cine', {recursive: true}); writeFileSync('renders/cine/edge-aa1.png', Buffer.from(edge.url.split(',')[1], 'base64')); writeFileSync('renders/cine/edge-aa0.png', Buffer.from(e0.url.split(',')[1], 'base64'));   // → cine-sheet.py edge-390.png
    edge.noAA = {step: e0.step, rows: e0.stepRows, top: e0.stepCols}; delete edge.url;
    gate('cost: est. --final s/frame ≤ 3.0 (1440×2560, MSAA 4×, this sandbox)', fin / 1000 <= 3.0, `270×480 before ${bef.toFixed(0)} ms → after ${aft.toFixed(0)} ms; 720×1280 before ${(before720 / 1000).toFixed(3)} s → after ${(after720 / 1000).toFixed(3)} s; final 1440×2560 MSAA 4× ${(fin / 1000).toFixed(2)} s/frame (swiftshader CPU; 1B: 5.15 with ss 2×)`,
      {before270: bef, after270: aft, before720, after720, final: fin});
    gate('edges (RETIRED 2A, owner: head-mesh facets, not aliasing; report only)', true, `max step ${edge.step.toFixed(2)} px (rows ${edge.stepRows.toFixed(2)}, top ${edge.stepCols.toFixed(2)}; ${edge.rows} + ${edge.cols} samples); without AA ${e0.step.toFixed(2)} px (rows ${e0.stepRows.toFixed(2)}, top ${e0.stepCols.toFixed(2)}) — crops: review/cine/edge-390.png`, {edge});
  } else gate('cost: ms/frame (no final run)', true, `270×480 before ${bef.toFixed(0)} ms → after ${aft.toFixed(0)} ms; 720×1280 ${(before720 / 1000).toFixed(3)} → ${(after720 / 1000).toFixed(3)} s`, {before270: bef, after270: aft});
  writeFileSync('review/cine/look-frames.json', JSON.stringify({before, after}, null, 1));
} finally { await browser.close(); await server.close(); }
mkdirSync('review/cine', {recursive: true}); writeFileSync('review/cine/gates.json', JSON.stringify(gates, null, 1));
console.log(`\n${gates.every(g => g.pass) ? 'PASS' : 'FAIL'}: ${gates.filter(g => g.pass).length}/${gates.length} gates → review/cine/gates.json`);
process.exit(gates.every(g => g.pass) ? 0 : 1);
