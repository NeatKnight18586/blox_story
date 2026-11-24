// scripts/v2/kit2-gates.js — tuft 2B gates (browser + numbers) → review/beasts/kit2-gates.json (sections merged by --only).
//   look   (Task 0) the 2A kit fixture (engine/fixtures/beasts/kit.json) BEFORE vs the same spec + grade 'clear' AFTER, 4 even frames
//          (even = beast poses identical on twos and ones), 540×960: grain luma std ≤ 0.8 % (grain on − off), mean HSV saturation
//          after ≥ before × 1.2 (per frame), darkest-10 % luma ≤ 0.03 (per frame).
//   camera (Task 0) every frame of the 2B fixtures on camera 'cine': no shot holds a static camera pitched < −20° for > 1.0 s unless
//          it authors angle 'high' (engine/cine.js highHeld); the 2A kit fixture is reported as the before.
//   ones   (Task 0) beast pose (segment matrices) differs between consecutive frames whenever the beast is moving (heroes-night).
// Usage: node scripts/v2/kit2-gates.js [--only look,camera,ones,...]
import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {highHeld} from '../../engine/cine.js';

const argv = process.argv.slice(2), only = (argv[argv.indexOf('--only') + 1] ?? '').split(',').filter(Boolean), on = k => !argv.includes('--only') || only.includes(k);
const FILE = 'review/beasts/kit2-gates.json', prev = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
const gates = [], gate = (sec, name, pass, line, data = {}) => { gates.push({sec, name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const server = await startServer(process.cwd()), browser = await launch(), errors = [];
export async function open(spec, extra = '&aa=0') { const page = await browser.newPage(); page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}${extra}`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000}); return page; }
const raw = 'renders/kit2'; mkdirSync(raw, {recursive: true});
const png = async (page, f, W, H, file, grain = true) => { const url = await page.evaluate(([f, W, H, g]) => { const E = window.__episode; if (E.cine) E.cine.opts.grain = g; E.renderFrame(f, W, H); if (E.cine) E.cine.opts.grain = true; return E.debug.renderer.domElement.toDataURL('image/png'); }, [f, W, H, grain]);
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); return file; };
const stats = files => JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'scripts/v2'); import lookstats as L; a = sys.argv[1:]; print(json.dumps([L.stats(a[i], a[i + 1]) for i in range(0, len(a), 2)]))`, ...files]).toString());
// per-frame camera (after a render at a tiny size): position + unit view direction
const camFrames = async (page, step = 1) => page.evaluate(([step]) => { const E = window.__episode, c = E.debug.camera, out = []; for (let f = 0; f < E.FRAMES; f += step) { const r = E.renderFrame(f, 54, 96); const d = c.getWorldDirection(new c.position.constructor());
  const sh = E.shots ? null : null; out.push({f, shot: r.shot, position: c.position.toArray(), dir: d.toArray()}); } return out; }, [step]);
export const LOOK_FRAMES = [48, 234, 400, 600];
try {
  if (on('look')) {
    const kit = JSON.parse(readFileSync('engine/fixtures/beasts/kit.json', 'utf8')); writeFileSync(`${raw}/kit-clear.json`, JSON.stringify({...kit, grade: 'clear'}));
    const files = { before: [], after: [] };
    for (const [k, spec] of [['before', 'engine/fixtures/beasts/kit.json'], ['after', `${raw}/kit-clear.json`]]) { const p = await open(spec);
      for (const f of LOOK_FRAMES) { files[k].push(await png(p, f, 540, 960, `${raw}/look-${k}-${f}.png`), await png(p, f, 540, 960, `${raw}/look-${k}-${f}-ng.png`, false)); } await p.close(); }
    const b = stats(files.before), a = stats(files.after), rows = LOOK_FRAMES.map((f, i) => ({frame: f, before: b[i], after: a[i], satX: +(a[i].sat / b[i].sat).toFixed(3)}));
    const gmax = Math.max(...a.map(x => x.grainStd)), smin = Math.min(...rows.map(r => r.satX)), dmax = Math.max(...a.map(x => x.dark10));
    gate('look', 'grain luma std ≤ 0.8 %', gmax <= .8, `after ${a.map(x => x.grainStd.toFixed(2)).join(' / ')} % (before ${b.map(x => x.grainStd.toFixed(2)).join(' / ')} %)`, {rows});
    gate('look', 'mean saturation after ≥ before × 1.2 (per frame)', smin >= 1.2, `× ${rows.map(r => r.satX.toFixed(2)).join(' / ')} (HSV S ${rows.map(r => `${r.before.sat.toFixed(3)}→${r.after.sat.toFixed(3)}`).join(', ')}); 4-frame mean × ${(a.reduce((s, x) => s + x.sat, 0) / b.reduce((s, x) => s + x.sat, 0)).toFixed(2)}`);
    gate('look', 'darkest-10 % luma ≤ 0.03 (per frame)', dmax <= .03, `after ${a.map(x => x.dark10.toFixed(3)).join(' / ')} (before ${b.map(x => x.dark10.toFixed(3)).join(' / ')})`); }
  if (on('camera')) {
    const specs = ['engine/fixtures/beasts2/heroes-day.json', 'engine/fixtures/beasts2/heroes-night.json', ...['tuft', 'titan', 'powers', 'demo2'].map(n => `engine/fixtures/beasts2/${n}.json`).filter(existsSync)], rows = [];
    for (const spec of [...specs, 'engine/fixtures/beasts/kit.json']) { const p = await open(spec), S = JSON.parse(readFileSync(spec, 'utf8')), fr = await camFrames(p), fps = S.fps ?? 24;
      const shotsHigh = new Set(S.shots.filter(s => s.angle === 'high').map(s => s.id)), per = {};
      for (const f of fr) (per[f.shot] ??= []).push({...f, high: shotsHigh.has(f.shot)});
      const worst = Object.entries(per).map(([id, fs]) => ({id, ...highHeld(fs, fps)})).sort((x, y) => y.maxHeld - x.maxHeld)[0];
      rows.push({spec, before: spec.includes('/beasts/'), worst}); await p.close(); }
    const after = rows.filter(r => !r.before), bad = after.filter(r => !r.worst.ok);
    gate('camera', 'no static high angle (pitch < −20°) held > 1.0 s', !bad.length, `2B fixtures: worst ${Math.max(...after.map(r => r.worst.maxHeld)).toFixed(2)} s (${after.map(r => `${r.spec.split('/').pop()} ${r.worst.maxHeld.toFixed(2)}`).join(', ')}); 2A kit before: ${rows.find(r => r.before).worst.maxHeld.toFixed(2)} s (${rows.find(r => r.before).worst.id})`, {rows}); }
  if (on('ones')) {
    const p = await open('engine/fixtures/beasts2/heroes-night.json');
    const r = await p.evaluate(() => { const E = window.__episode, A = E.beasts.actors, MOV = new Set(['walk', 'run', 'flee', 'fly', 'roar', 'breathe', 'stomp', 'puff', 'tremble']); let pairs = 0, same = 0, prev = {};
      for (let f = 0; f < E.FRAMES; f++) { E.renderFrame(f, 54, 96); for (const [n, a] of Object.entries(A)) { if (!a.data) continue; const d = Array.from(a.data).join(','), st = a.sample?.state;
        if (prev[n] && MOV.has(st) && MOV.has(prev[n].st)) { pairs++; if (d === prev[n].d) same++; } prev[n] = {d, st}; } }
      return {pairs, same}; });
    gate('ones', 'beast pose changes every frame while moving (on ones)', r.same === 0 && r.pairs > 0, `${r.pairs - r.same}/${r.pairs} consecutive moving pairs differ (heroes-night); 2A kit VOLT run before: 13/27 (twos)`, r); await p.close(); }
  if (on('tuft')) {   // Task 2: hook frame read at 390 px · blue-gold nowhere else (colour histogram) · hero face decal on the puffed head · hero ball Ø
    // Tuft's blue-gold as DISPLAYED (glow tips after bloom + grade): blue hue 200–225° S ≥ .15 V ≥ .85 next to (≤ 8 px) gold hue 38–52° S ≥ .4 V ≥ .85 — the pair, not either colour alone (the hero's yellow head is gold-ish on its own)
    const BG = `import sys, json, colorsys; from PIL import Image; import numpy as np
def bg(f):
    a = np.asarray(Image.open(f).convert('RGB'), dtype=float) / 255; mx, mn = a.max(-1), a.min(-1); c = mx - mn; S = np.where(mx > 0, c / np.maximum(mx, 1e-6), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; h = np.where(c == 0, 0, np.where(mx == r, ((g - b) / np.maximum(c, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(c, 1e-6) + 2, (r - g) / np.maximum(c, 1e-6) + 4))) * 60
    blue = (h >= 200) & (h <= 225) & (S >= .15) & (mx >= .85); gold = (h >= 38) & (h <= 52) & (S >= .4) & (mx >= .85)
    def binary_dilation(m, _k, r=8):
        p = np.pad(m, r); o = np.zeros_like(m)
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1): o |= p[r + dy: r + dy + m.shape[0], r + dx: r + dx + m.shape[1]]
        return o
    k = None; pair = (blue & binary_dilation(gold, k)) | (gold & binary_dilation(blue, k))   # the PAIR: blue next to gold (≤ 8 px), Tuft's tip gradient
    return float(pair.mean())
print(json.dumps([bg(f) for f in sys.argv[1:]]))`, bgOf = files => JSON.parse(execFileSync('python3', ['-c', BG, ...files]).toString());
    const p = await open('engine/fixtures/beasts2/tuft.json'), W = 390, H = 693;
    const eye = await p.evaluate(([W, H]) => { const E = window.__episode, a = E.beasts.actors.tuft; E.renderFrame(0, W, H); const c = E.debug.camera, V = c.position.constructor, s = a.sample, yaw = a.root.rotation.y;
      const best = [1, -1].map(k => { const l = [k * .115, .05 + .38, .3], w = new V(a.root.position.x + Math.cos(yaw) * l[0] + Math.sin(yaw) * l[2], a.root.position.y + l[1], a.root.position.z - Math.sin(yaw) * l[0] + Math.cos(yaw) * l[2]); const q = w.clone().project(c); return {x: (q.x + 1) / 2, y: (1 - q.y) / 2, d: w.distanceTo(c.position)}; }).sort((u, v) => u.d - v.d)[0]; void s; return best; }, [W, H]);
    await png(p, 0, W, H, `${raw}/hook.png`);
    await p.evaluate(() => { for (const [n, a] of Object.entries(window.__episode.beasts.actors)) if (a.P.name === 'TUFT') { a.root.visible = false; a.hidden2b = true; } });
    const hid = []; for (const f of [0, 60, 155, 199, 286, 349, 385]) hid.push(await png(p, f, 270, 480, `${raw}/tufthid-${f}.png`));
    await p.evaluate(() => { for (const a of Object.values(window.__episode.beasts.actors)) if (a.hidden2b) a.root.visible = true; });
    const face = await p.evaluate(() => { const E = window.__episode, out = []; for (const f of [349, 385, 400]) { E.renderFrame(f, 90, 160); const sc = E.debug.scene; let ball = null; sc.traverse(o => { if (o.name === 'puffBall' && o.visible) ball = o; }); if (!ball) { out.push({f, ball: false}); continue; }
      const V = ball.position.constructor, bc = ball.getWorldPosition(new V()), R = ball.getWorldScale(new V()).x, root = ball.parent; let dec = null; root.traverse(o => { if (o.name === 'face_decal') dec = o; });
      const dp = dec.getWorldPosition(new V()), fw = new V(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y)), rel = dp.clone().sub(bc); out.push({f, ball: true, D: 2 * R, dist: rel.length() / R, front: rel.dot(fw) / R, vis: dec.visible}); } return out; });
    await p.close();
    const fr = []; for (const spec of ['heroes-day', 'heroes-night', ...['titan', 'powers'].filter(n => existsSync(`engine/fixtures/beasts2/${n}.json`))]) { const q = await open(`engine/fixtures/beasts2/${spec}.json`), F = await q.evaluate(() => window.__episode.FRAMES);
      for (let f = 6; f < F; f += 24) fr.push(await png(q, f, 270, 480, `${raw}/bg-${spec}-${f}.png`)); await q.close(); }
    const [hk] = bgOf([`${raw}/hook.png`]), hb = bgOf(hid), ob = bgOf(fr), worst = Math.max(...hb, ...ob), cen = Math.hypot(eye.x - .5, eye.y - .45);
    gate('tuft', 'hook frame 0 reads at 390 px (eye centred, quills blooming)', cen <= .2 && hk >= .01, `eye at (${eye.x.toFixed(2)}, ${eye.y.toFixed(2)}) — ${cen.toFixed(3)} from (.5, .45) ≤ .2; blue-next-to-gold (tip) pixels ${(100 * hk).toFixed(2)} % ≥ 1 %`);
    gate('tuft', 'Tuft blue-gold nowhere else (colour histogram)', worst <= .001, `blue-next-to-gold pixels with every Tuft hidden: max ${(100 * worst).toFixed(3)} % ≤ 0.1 % over ${hb.length + ob.length} frames (tuft fixture ${(100 * Math.max(...hb)).toFixed(3)} %, other 2B fixtures ${(100 * Math.max(...ob)).toFixed(3)} %)`, {hb, ob});
    const fb = face.filter(x => x.ball), fok = fb.length === 3 && fb.every(x => x.vis && x.dist <= 1.0 && x.front >= .5);
    gate('tuft', 'hero face decal stays on the puffed head', fok, face.map(x => x.ball ? `f${x.f}: Ø ${x.D.toFixed(2)}, decal ${x.dist.toFixed(2)} R from the centre, ${x.front.toFixed(2)} R forward` : `f${x.f}: no ball`).join(' · ')); }
  if (on('powers')) {   // Task 4: lantern sea one draw · FX deterministic (any order) · FX on ones · tris (Tuft / Titan in tests/beast2.js)
    const p = await open('engine/fixtures/beasts2/powers.json');
    const ls = await p.evaluate(() => { const E = window.__episode, sc = E.debug.scene; let g = null; sc.traverse(o => { if (o.name === 'lanternSea') g = o; }); const on = E.renderFrame(372, 270, 480).calls; g.visible = false; const P = E.debug.renderer; P.info.reset();
      const r = E.renderFrame(372, 270, 480).calls; g.visible = true; let n = 0; g.traverse(o => { if (o.isInstancedMesh) n += o.count; }); return {on, off: r, n}; });
    gate('powers', 'lanternSea = one draw call', ls.on - ls.off === 1 && ls.n >= 1500, `${ls.n} lanterns: calls ${ls.off} → ${ls.on} (+${ls.on - ls.off})`, ls);
    const fr = [24, 66, 115, 144, 190, 272], h = async order => { const o = {}; for (const f of order) o[f] = await p.evaluate(([f]) => { const E = window.__episode; E.renderFrame(f, 270, 480); return E.debug.renderer.domElement.toDataURL('image/png'); }, [f]); return o; };
    const A = await h(fr), Bo = await h([...fr].reverse()), same = fr.filter(f => A[f] === Bo[f]).length;
    gate('powers', 'FX deterministic (6 powers frames, reverse order)', same === fr.length, `${same}/${fr.length} identical PNGs (cyanFire, lightning, fly, fizzle, breathe, chains snap)`);
    const ones = await p.evaluate(() => { const E = window.__episode, sc = E.debug.scene, M = {}; sc.traverse(o => { if (/^fx(Fire|Bolts|Fly|ChainPieces)$/.test(o.name)) M[o.name] = o; }); const out = {};
      for (const [nm, [a, b]] of Object.entries({fxFire: [20, 40], fxBolts: [58, 74], fxFly: [108, 124], fxChainPieces: [262, 280]})) { let pairs = 0, same = 0, prev = null;
        for (let f = a; f < b; f++) { E.renderFrame(f, 54, 96); const m = M[nm]; if (!m || !m.count) { prev = null; continue; } const d = Array.from(m.instanceMatrix.array.slice(0, m.count * 16)).join(','); if (prev !== null) { pairs++; if (d === prev) same++; } prev = d; } out[nm] = {pairs, same}; }
      return out; });
    const okOnes = Object.values(ones).every(o => o.pairs > 0 && o.same === 0);
    gate('powers', 'FX on ones (instances change every frame)', okOnes, Object.entries(ones).map(([k, o]) => `${k} ${o.pairs - o.same}/${o.pairs}`).join(' · '), {ones});
    await p.close(); }
  if (on('cost')) {   // est. final s/frame (1440×2560, MSAA 4×) on the heaviest 2B frames
    const rows = []; for (const [spec, frs] of [['powers', [190, 272, 372]], ['tuft', [286, 349]], ['titan', [144, 244]], ['heroes-night', [17, 94]]]) { const p = await open(`engine/fixtures/beasts2/${spec}.json`, '&aa=1');
      const r = await p.evaluate(([frs]) => { const E = window.__episode; E.renderFrame(frs[0], 1440, 2560); return frs.map(f => E.renderFrame(f, 1440, 2560).ms / 1000); }, [frs]); rows.push({spec, s: r}); await p.close();
      const q = await open(`engine/fixtures/beasts2/${spec}.json`); const lo = await q.evaluate(([frs]) => { const E = window.__episode; E.renderFrame(frs[0], 270, 480); return frs.map(f => E.renderFrame(f, 270, 480).ms); }, [frs]); rows.at(-1).ms = lo; await q.close(); }
    const all = rows.flatMap(r => r.s), mx = Math.max(...all), mn = Math.min(...all), ms = rows.flatMap(r => r.ms);
    gate('cost', 'est. final s/frame ≤ 3.0', mx <= 3.0, `1440×2560 MSAA 4× (this sandbox): ${mn.toFixed(2)}–${mx.toFixed(2)} s/frame (${rows.map(r => `${r.spec} ${r.s.map(x => x.toFixed(2)).join('/')}`).join(', ')}); 270×480 ${Math.min(...ms).toFixed(0)}–${Math.max(...ms).toFixed(0)} ms/frame`, {rows}); }
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
mkdirSync('review/beasts', {recursive: true});
const secs = new Set(gates.map(g => g.sec)), all = [...prev.filter(g => !secs.has(g.sec)), ...gates]; writeFileSync(FILE, JSON.stringify(all, null, 1));
const fails = gates.filter(g => !g.pass).length; console.log(`${gates.length - fails}/${gates.length} pass (this run); file ${all.filter(g => g.pass).length}/${all.length}`);
