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
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
mkdirSync('review/beasts', {recursive: true});
const secs = new Set(gates.map(g => g.sec)), all = [...prev.filter(g => !secs.has(g.sec)), ...gates]; writeFileSync(FILE, JSON.stringify(all, null, 1));
const fails = gates.filter(g => !g.pass).length; console.log(`${gates.length - fails}/${gates.length} pass (this run); file ${all.filter(g => g.pass).length}/${all.length}`);
