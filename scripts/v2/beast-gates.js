// scripts/v2/beast-gates.js — tuft 2A BEAST KIT browser gates → review/beasts/gates.json (pure gates: node tests/beast.js).
//   draw calls: the 40-beast parade (engine/fixtures/beasts/parade.json) costs ≤ 3 draw calls per low-tier preset (calls with the
//       crowd shown − hidden, ÷ presets).
//   glow only on seams (kit.json side views, 540×960, post 'cine', grain off): masks from the beast shader (seam = aGlow > 0, body);
//       non-seam body = body pixels ≥ 4 px from any seam: mean luma (bloom on − off) ≤ 0.005 (0.5 %); seams bloom: the 1–6 px ring
//       outside the seams gains ≥ +100 % luma with bloom on. Also reported: the body's own bloom with the seams dark (glow × 0).
//       The world's glow surfaces (windows, lamps) are set to LDR while measuring (as cine-gates.js does): only the beast's HDR blooms.
//   determinism: 10 kit frames rendered out of order = the same bytes as in order.
//   byte-identity: the 1B fixture (engine/fixtures/cine/episode.json, every 30th frame at 270×480) = the pre-2A baseline frames.
//   cost: ms/frame at 270×480 with 4 hero beasts + 40 low (+ BLINK, LITTLE): report; est. --final s/frame (1440×2560, MSAA 4×) ≤ 3.0.
// Usage: node scripts/v2/beast-gates.js --baseline <dir of pre-2A 1B frames> [--no-final]
import {writeFileSync, mkdirSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), arg = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const gates = [], gate = (name, pass, line, data = {}) => { gates.push({name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const server = await startServer(process.cwd()), browser = await launch(), errors = [];
async function open(spec, extra = '&aa=0') { const page = await browser.newPage(); page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}${extra}`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000}); return page; }
const picks = JSON.parse(readFileSync('engine/fixtures/beasts/kit-picks.json', 'utf8'));
try {
  // ---- draw calls (parade) --------------------------------------------------------------------------------------------------
  { const p = await open('engine/fixtures/beasts/parade.json');
    const r = await p.evaluate(() => { const E = window.__episode, B = E.beasts, crowd = B.crowds.flatMap(c => [c.mesh, c.blobs]), presets = new Set(B.crowds.map(c => c.P.name)).size, n = B.crowds.reduce((a, c) => a + c.members.length, 0);
      const on = E.renderFrame(40, 270, 480).calls; crowd.forEach(m => { m.visible = false; }); const off = E.renderFrame(40, 270, 480).calls; crowd.forEach(m => { m.visible = true; });
      return {on, off, presets, n, perPreset: (on - off) / presets}; });
    gate('parade draw calls ≤ 3 per preset', r.perPreset <= 3 && r.n === 40, `${r.n} low-tier beasts, ${r.presets} presets: calls ${r.off} → ${r.on} = ${r.perPreset.toFixed(2)} per preset (mesh + contact blobs)`, r);
    // cost with 4 hero + 40 low at 270×480
    const ms = await p.evaluate(() => { const E = window.__episode, a = []; for (let f = 0; f < 72; f += 3) a.push(E.renderFrame(f, 270, 480).ms); a.sort((x, y) => x - y); return {median: a[a.length >> 1], mean: a.reduce((s, x) => s + x, 0) / a.length}; });
    const base = await (async () => { const q = await open('engine/fixtures/cine/episode.json'); const v = await q.evaluate(() => { const E = window.__episode, a = []; for (let f = 0; f < 72; f += 3) a.push(E.renderFrame(f, 270, 480).ms); a.sort((x, y) => x - y); return a[a.length >> 1]; }); await q.close(); return v; })();
    gate('cost: ms/frame at 270×480 (4 hero + 40 low)', true, `median ${ms.median.toFixed(0)} ms (mean ${ms.mean.toFixed(0)}); the 1B fixture without beasts ${base.toFixed(0)} ms`, {ms, base});
    await p.close(); }
  if (!argv.includes('--no-final')) { const p = await open('engine/fixtures/beasts/parade.json', '&aa=1');
    const s = await p.evaluate(() => { const E = window.__episode; E.renderFrame(10, 1440, 2560); const a = []; for (const f of [16, 28, 40, 52, 64]) a.push(E.renderFrame(f, 1440, 2560).ms); return a.reduce((x, y) => x + y, 0) / a.length / 1000; });
    gate('cost: est. --final s/frame ≤ 3.0', s <= 3.0, `1440×2560 MSAA 4× (this sandbox, swiftshader): ${s.toFixed(2)} s/frame (1B fix fixture 2.88)`, {sPerFrame: s}); await p.close(); }
  // ---- glow only on seams (kit side views) -------------------------------------------------------------------------------------
  { const p = await open('engine/fixtures/beasts/kit.json'), W = 540, H = 960, rows = [];
    await p.evaluate(() => { window.__lum = (f, W, H) => { const E = window.__episode, gl = E.debug.renderer.getContext(); E.cine.opts.grain = false; E.renderFrame(f, W, H); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const L = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]) / 255; } E.cine.opts.grain = true; return L; };
      window.__mask = (f, W, H) => { const E = window.__episode, R = E.debug.renderer, sc = E.debug.scene, B = E.beasts, gl = R.getContext(); E.renderFrame(f, W, H);
        const keep = new Set(); for (const m of B.meshes()) m.traverse(o => keep.add(o)); const hid = []; sc.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine || o.isInstancedMesh) && !keep.has(o) && o.visible) { o.visible = false; hid.push(o); } });
        const bg = sc.background, fog = sc.fog; sc.background = null; sc.fog = null; R.setRenderTarget(null); R.setClearColor(0x000000, 1); R.clear(); B.setMask(true); R.render(sc, E.debug.camera); B.setMask(false);
        const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); for (const o of hid) o.visible = true; sc.background = bg; sc.fog = fog;
        const M = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; M[y * W + x] = px[i + 1] > 127 ? (px[i] > 127 ? 2 : 1) : 0; } return M; }; });
    for (const pk of picks.filter(q => q.row === 1 && q.label === 'side')) {
      const r = await p.evaluate(([f, W, H]) => { const E = window.__episode, M = window.__mask(f, W, H);
        const lum = (bloom, gk) => { E.cine.opts.bloom = bloom; E.beasts.setGlowScale(gk); E.cine.setGlow(false); const L = window.__lum(f, W, H); E.cine.setGlow(true); E.cine.opts.bloom = true; E.beasts.setGlowScale(1); return L; };   // world glow (windows, lamps) at LDR: only the beast's own HDR is measured
        const on = lum(true, 1), off = lum(false, 1), on0 = lum(true, 0), off0 = lum(false, 0);
        // distance (px) to the nearest seam pixel, 2-pass chamfer
        const D = new Float32Array(W * H).fill(1e9); for (let i = 0; i < W * H; i++) if (M[i] === 2) D[i] = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - W] + 1); if (x && y) D[i] = Math.min(D[i], D[i - W - 1] + 1.414); if (y && x < W - 1) D[i] = Math.min(D[i], D[i - W + 1] + 1.414); }
        for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < H - 1) D[i] = Math.min(D[i], D[i + W] + 1); if (x < W - 1 && y < H - 1) D[i] = Math.min(D[i], D[i + W + 1] + 1.414); if (y < H - 1 && x) D[i] = Math.min(D[i], D[i + W - 1] + 1.414); }
        let bn = 0, bd = 0, rn = 0, rOn = 0, rOff = 0, on0n = 0, od = 0, seamPx = 0, bodyPx = 0;
        for (let i = 0; i < W * H; i++) { if (M[i] === 2) seamPx++; if (M[i] === 1) { bodyPx++; od += on0[i] - off0[i]; on0n++; if (D[i] >= 4) { bd += on[i] - off[i]; bn++; } }
          if (M[i] !== 2 && D[i] >= 1 && D[i] <= 6) { rOn += on[i]; rOff += off[i]; rn++; } }
        return {body: bn ? bd / bn : 0, bodyPx: bn, own: on0n ? od / on0n : 0, ring: rOff > 0 ? rOn / rOff - 1 : 0, ringOn: rn ? rOn / rn : 0, ringOff: rn ? rOff / rn : 0, seamPx, allBody: bodyPx}; }, [pk.frame, W, H]);
      rows.push({beast: pk.beast, ...r}); }
    const worst = Math.max(...rows.map(r => r.body)), ring = Math.min(...rows.map(r => r.ring)), own = Math.max(...rows.map(r => r.own));
    gate('glow only on seams: non-seam body bloom ≤ 0.5 %', worst <= .005, `body ≥ 4 px from a seam, seams on: Δluma max ${(100 * worst).toFixed(2)} % (${rows.map(r => `${r.beast} ${(100 * r.body).toFixed(2)}`).join(', ')}); own bloom with seams dark max ${(100 * own).toFixed(3)} %`, {rows});
    gate('seams bloom ≥ +100 % around them', ring >= 1, `1–6 px ring outside the seams: luma +${(100 * ring).toFixed(0)} % min (${rows.map(r => `${r.beast} ${r.ringOff.toFixed(3)} → ${r.ringOn.toFixed(3)}`).join(', ')})`);
    // determinism: 10 frames out of order = in order
    const fr = picks.slice(0, 10).map(q => q.frame), h = async order => { const o = {}; for (const f of order) o[f] = await p.evaluate(([f]) => { const E = window.__episode; E.renderFrame(f, 270, 480); return E.debug.renderer.domElement.toDataURL('image/png'); }, [f]); return o; };
    const A = await h(fr), Bo = await h([...fr].reverse()), same = fr.filter(f => A[f] === Bo[f]).length;
    gate('render determinism (10 kit frames, reverse order)', same === fr.length, `${same}/${fr.length} identical PNGs`);
    await p.close(); }
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
// ---- byte-identity: 1B fixture without beasts vs the pre-2A baseline ------------------------------------------------------------
{ const base = arg('baseline');
  if (base) { const out = 'renders/beasts/byte1b'; rmSync(out, {recursive: true, force: true});
    execFileSync('node', ['scripts/v2/render.js', '--spec', 'engine/fixtures/cine/episode.json', '--out', out, '--width', '270', '--height', '480', '--every', '30', '--aa', '0'], {stdio: 'ignore'});
    const md5 = f => createHash('md5').update(readFileSync(f)).digest('hex'), fs = readdirSync(`${base}/frames`).filter(f => f.endsWith('.png'));
    const same = fs.filter(f => md5(`${base}/frames/${f}`) === md5(`${out}/frames/${f}`)).length;
    gate('byte-identical 1B fixture without beasts', same === fs.length && fs.length > 0, `${same}/${fs.length} frames (every 30th, 270×480) identical to the pre-2A render`); }
  else gate('byte-identical 1B fixture without beasts', false, 'no --baseline given'); }
mkdirSync('review/beasts', {recursive: true}); writeFileSync('review/beasts/gates.json', JSON.stringify(gates, null, 1));
const fails = gates.filter(g => !g.pass).length; console.log(`${gates.length - fails}/${gates.length} pass`); process.exit(fails ? 1 : 0);
