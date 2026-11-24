// scripts/v2/cine-gates.js — tuft 1B Look Pack gates (browser) → review/cine/gates.json:
//   bloom (white DUMMY under the street lamp: luma delta on its silhouette ≤ 0.5 %; HDR glow cube halo present ≥ 3 %),
//   grain (same frame = same bytes; luma std 1.5–2.5 %), DOF focus = subject head distance ± 2 % (rack: the target's after it),
//   ms/frame at 270×480 before / after, est. s/frame at 720×1280 (bench size, ≤ 0.62 Season 1) and at --final (1440×2560, ss 2×).
// Usage: node scripts/v2/cine-gates.js [--no-final]
import {writeFileSync, mkdirSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';

const gates = [], gate = (name, pass, line, data = {}) => { gates.push({name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const server = await startServer(process.cwd()), browser = await launch();
async function open(spec, extra = '') { const page = await browser.newPage(); page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 200)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=0${extra}`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000}); return page; }
const stats = a => { const m = a.reduce((s, x) => s + x, 0) / a.length; return {mean: m, std: Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length)}; };
try {
  // 1. bloom only on HDR glow
  { const page = await open('engine/fixtures/cine/bloomgate.json'), W = 540, H = 960;
    const r = await page.evaluate(([W, H]) => { const E = window.__episode, {scene, camera, renderer} = E.debug, gl = renderer.getContext();
      const luma = () => { const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); const L = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; } return L; };
      E.cine.opts.grain = false; E.cine.opts.bloom = true; E.renderFrame(1, W, H); const on = luma(); E.cine.opts.bloom = false; E.renderFrame(1, W, H); const off = luma(); const mask = E.actorMask('dummy', W, H);
      E.cine.setGlow(false); E.cine.opts.bloom = true; E.renderFrame(1, W, H); const onL = luma(); E.cine.opts.bloom = false; E.renderFrame(1, W, H); const offL = luma(); E.cine.setGlow(true);   // glow surfaces at LDR: what the actor and the lit set bloom by themselves
      // erode the silhouette 3 px (edge pixels mix with the background)
      const er = new Uint8Array(W * H); for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { let k = 1; for (let d = -3; d <= 3 && k; d++) if (!mask[y * W + x + d] || !mask[(y + d) * W + x]) k = 0; er[y * W + x] = k; }
      let so = 0, sf = 0, n = 0, lo = 0, lf = 0; for (let i = 0; i < W * H; i++) if (er[i]) { so += on[i]; sf += off[i]; lo += onL[i]; lf += offL[i]; n++; }
      const cube = scene.getObjectByName('glowCube_0'); cube.geometry.computeBoundingBox(); const b = cube.geometry.boundingBox.clone().applyMatrix4(cube.matrixWorld); let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
      for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) { const v = cube.position.clone().set(cx, cy, cz).project(camera); x0 = Math.min(x0, (v.x + 1) / 2); x1 = Math.max(x1, (v.x + 1) / 2); y0 = Math.min(y0, (1 - v.y) / 2); y1 = Math.max(y1, (1 - v.y) / 2); }
      const pw = (x1 - x0) * .5, ph = (y1 - y0) * .5; let ro = 0, rf = 0, rn = 0;
      for (let y = Math.max(0, Math.floor((y0 - ph) * H)); y < Math.min(H, (y1 + ph) * H); y++) for (let x = Math.max(0, Math.floor((x0 - pw) * W)); x < Math.min(W, (x1 + pw) * W); x++) { const inside = x >= x0 * W && x <= x1 * W && y >= y0 * H && y <= y1 * H; if (inside || mask[y * W + x]) continue; ro += on[y * W + x]; rf += off[y * W + x]; rn++; }
      return {actor: {on: lo / n, off: lf / n, px: n}, spill: {on: so / n, off: sf / n}, ring: {on: ro / rn, off: rf / rn, px: rn}, glow: E.cine.glowCount()}; }, [W, H]);
    const dA = Math.abs(r.actor.on - r.actor.off) / r.actor.off * 100, dC = (r.ring.on - r.ring.off) / r.ring.off * 100;
    const dS = (r.spill.on - r.spill.off) / r.spill.off * 100;
    gate('bloom: non-emissive actor luma delta ≤ 0.5 %', dA <= .5, `white DUMMY under the lamp, its own bloom (glow surfaces at LDR): ${dA.toFixed(3)} % (${r.actor.px} px, luma ${r.actor.off.toFixed(3)} → ${r.actor.on.toFixed(3)}); halo spill from the lamp + cube beside it (not the gate): +${dS.toFixed(1)} %`, {value: dA, spill: dS});
    gate('bloom: present around the HDR glow cube (≥ 3 %)', dC >= 3, `ring around the cube +${dC.toFixed(1)} % (${r.ring.off.toFixed(3)} → ${r.ring.on.toFixed(3)}), ${r.glow} glow materials`, {value: dC});
    await page.close(); }
  // 2. grain + 3. DOF focus + 4. ms/frame (after)
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
  { const rows = await page.evaluate(() => { const E = window.__episode, out = []; for (const f of [110, 130, 152, 160, 190, 196, 255, 270, 292]) { E.renderFrame(f, 270, 480); const s = E.cine.state; out.push({f, shot: E.shots.findLast(x => f >= x.start).id, focus: s.focus, subj: s.subjectDist, rack: s.rackDist, lt: s.lt, dof: s.dof}); } return out; });
    let worst = 0; const lines = [];
    for (const r of rows) { const rk = r.shot === 'D-cu-rack', tgt = rk && r.lt >= .7 + .8 ? r.rack : r.subj; if (rk && r.lt > .7 && r.lt < 1.5) { lines.push(`${r.f} racking ${r.focus.toFixed(2)}`); continue; }
      const e = Math.abs(r.focus / tgt - 1) * 100; worst = Math.max(worst, e); lines.push(`${r.f} ${e.toFixed(2)} %`); }
    gate('DOF focus = subject head distance ± 2 % (rack target after the rack)', worst <= 2, `max ${worst.toFixed(3)} % (${lines.join(', ')})`, {value: worst}); }
  const msOf = async (pg, frames, w, h) => pg.evaluate(([fr, w, h]) => { const E = window.__episode; E.renderFrame(fr[0], w, h); const ms = []; for (const f of fr) ms.push(E.renderFrame(f, w, h).ms); return ms; }, [frames, w, h]);
  const F = Array.from({length: 30}, (_, i) => 3 + i * 10);
  const after = stats(await msOf(page, F, 270, 480)).mean, after720 = stats(await msOf(page, F.filter((_, i) => i % 3 === 0), 720, 1280)).mean; await page.close();
  const pb = await open('engine/fixtures/cine/before.json'), before = stats(await msOf(pb, F, 270, 480)).mean, before720 = stats(await msOf(pb, F.filter((_, i) => i % 3 === 0), 720, 1280)).mean; await pb.close();
  let fin = null; if (!process.argv.includes('--no-final')) { const pf = await open('engine/fixtures/cine/episode.json', '&ss=2'); fin = stats(await msOf(pf, [120, 270], 1440, 2560)).mean; await pf.close(); }
  gate('cost: ms/frame at 270×480 and s/frame at 720×1280 ≤ 0.62 (Season 1 bench)', after720 / 1000 <= .62, `270×480 before ${before.toFixed(0)} ms → after ${after.toFixed(0)} ms; 720×1280 before ${(before720 / 1000).toFixed(3)} s → after ${(after720 / 1000).toFixed(3)} s; final 1440×2560 ss 2× (2880×5120) ${fin ? (fin / 1000).toFixed(2) + ' s/frame (this sandbox, swiftshader CPU)' : 'not run'}`,
    {before270: before, after270: after, before720, after720, final: fin});
} finally { await browser.close(); await server.close(); }
mkdirSync('review/cine', {recursive: true}); writeFileSync('review/cine/gates.json', JSON.stringify(gates, null, 1));
console.log(`\n${gates.every(g => g.pass) ? 'PASS' : 'FAIL'}: ${gates.filter(g => g.pass).length}/${gates.length} gates → review/cine/gates.json`);
process.exit(gates.every(g => g.pass) ? 0 : 1);
