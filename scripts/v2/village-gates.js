// scripts/v2/village-gates.js — tuft P3 gates (browser + numbers) → review/village/gates.json (sections merged by --only).
//   night  (Task 0b) night frames: darkest-10 % luma in 0.012–0.03; every beast / actor in frame separates from its ring (mean luma or
//          chroma difference ≥ 0.06, scripts/v2/nightstats.py); VOLT: body separation AND seam pixels (≥ 1.5 % of its mask brighter
//          than its ring + .25). Before = the 2B heroes-night fixture (look4 mystery), after = the same on look4 'moonlit'.
//   more sections are appended below (fx, decal, loc, …).
// Usage: node scripts/v2/village-gates.js [--only night,fx,...]
import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2), only = (argv[argv.indexOf('--only') + 1] ?? '').split(',').filter(Boolean), on = k => !argv.includes('--only') || only.includes(k);
const FILE = 'review/village/gates.json', prev = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
const gates = [], gate = (sec, name, pass, line, data = {}) => { gates.push({sec, name, pass, line, ...data}); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${line}`); };
const server = await startServer(process.cwd()), browser = await launch(), errors = [];
export async function open(spec, extra = '&aa=0') { const page = await browser.newPage(); page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}${extra}`); await page.waitForFunction(() => window.__episode, null, {timeout: 300000}).catch(e => { throw Error(errors.join('\n') || e.message); }); return page; }
const raw = 'renders/village/gates'; mkdirSync(raw, {recursive: true});
const save = (file, url) => { writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); return file; };
export const png = async (page, f, W, H, file) => save(file, await page.evaluate(([f, W, H]) => { const E = window.__episode; E.renderFrame(f, W, H); return E.debug.renderer.domElement.toDataURL('image/png'); }, [f, W, H]));
// subject masks of the frame left by the last renderFrame: beasts (their root) and v5/R6 actors (episode actorMask) → PNG files
export async function masks(page, names, W, H, prefix) {
  const urls = await page.evaluate(async ([names, W, H]) => { const T = await import('three'), E = window.__episode, sc = E.debug.scene, r = E.debug.renderer, cam = E.debug.camera, out = {};
    const toURL = m => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H); for (let i = 0; i < W * H; i++) { const v = m[i] ? 255 : 0; im.data.set([v, v, v, 255], i * 4); } x.putImageData(im, 0, 0); return c.toDataURL('image/png'); };
    for (const n of names) { const b = E.beasts?.actors?.[n];
      if (!b) { try { out[n] = toURL(E.actorMask(n, W, H)); } catch (e) { out[n] = null; } continue; }
      const keep = b.root, hid = [], white = new T.MeshBasicMaterial({color: '#ffffff'}), swaps = [];
      sc.traverse(o => { if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine) || !o.visible) return; let p = o, inside = false; while (p) { if (p === keep) { inside = true; break; } p = p.parent; }
        if (!inside) { hid.push(o); o.visible = false; } else if (o.isMesh && !b.U) { swaps.push([o, o.material]); o.material = white; } else if (o.isSprite) { hid.push(o); o.visible = false; } });
      if (b.U) b.U.uBeastMask.value = 1;   // hero beasts: their own mask mode (segment transforms live in the shader; g = 1 on every beast pixel)
      const bg = sc.background, fog = sc.fog, rt = new T.WebGLRenderTarget(W, H); sc.background = new T.Color('#000000'); sc.fog = null;
      r.setRenderTarget(rt); r.render(sc, cam); const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, px); r.setRenderTarget(null);
      for (const [o, m] of swaps) o.material = m; for (const o of hid) o.visible = true; sc.background = bg; sc.fog = fog; rt.dispose(); if (b.U) b.U.uBeastMask.value = 0;
      const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = px[((H - 1 - y) * W + x) * 4 + 1] > 127 ? 1 : 0; out[n] = toURL(m); }
    return out; }, [names, W, H]);
  return Object.fromEntries(Object.entries(urls).filter(([, u]) => u).map(([n, u]) => [n, save(`${prefix}-mask-${n}.png`, u)])); }
export const nightStats = (frame, mk) => JSON.parse(execFileSync('python3', ['scripts/v2/nightstats.py', frame, ...Object.entries(mk).map(([n, f]) => `${n}=${f}`)]).toString());
// one night frame: render, masks of every listed subject, stats
export async function nightFrame(page, f, names, tag, W = 270, H = 480) { const fr = await png(page, f, W, H, `${raw}/${tag}-${f}.png`), mk = await masks(page, names, W, H, `${raw}/${tag}-${f}`); return nightStats(fr, mk); }
export function nightGates(sec, label, rows, {volt = null} = {}) {
  const d10 = rows.map(r => r.dark10), dOK = d10.every(v => v >= .012 && v <= .03);
  gate(sec, `${label}: darkest-10 % luma in 0.012–0.03 (not crushed, not milky)`, dOK, d10.map(v => v.toFixed(3)).join(' / '));
  const subs = rows.flatMap(r => Object.entries(r.subjects).filter(([, s]) => s.px >= 20).map(([n, s]) => ({n, f: r.frame.split('-').pop().replace('.png', ''), ...s}))), worst = subs.sort((a, b) => a.sep - b.sep);
  gate(sec, `${label}: every beast / actor separates from its background (≥ 0.06)`, subs.length > 0 && worst[0].sep >= .06, `min ${worst[0]?.sep.toFixed(3)} (${worst.slice(0, 4).map(s => `${s.n}@${s.f} ΔL ${s.dL.toFixed(3)} ΔC ${s.dC.toFixed(3)}`).join(', ')}); ${subs.length} subject-frames`, {subs});
  if (volt) { const v = subs.filter(s => s.n === volt); const ok = v.length && v.every(s => s.sep >= .06 && s.seam >= .015);
    gate(sec, `${label}: VOLT at night readable (body separation + seams)`, !!ok, v.map(s => `f${s.f}: body sep ${s.sep.toFixed(3)} (≥ .06), seam px ${(100 * s.seam).toFixed(1)} % of its mask (≥ 1.5 %)`).join(' · ') || 'VOLT not in frame'); } }
const NIGHT_FRAMES = [[17, ['nightfang', 'kid_nf']], [40, ['nightfang', 'kid_nf']], [94, ['volt']], [110, ['volt']], [158, ['boulder']], [209, ['little', 'blink']]];
try {
  if (on('night')) {
    for (const [tag, spec] of [['before', 'engine/fixtures/beasts2/heroes-night.json'], ['after', 'engine/fixtures/village/moon-heroes.json']]) { const p = await open(spec), rows = [];
      for (const [f, names] of NIGHT_FRAMES) rows.push(await nightFrame(p, f, names, `night-${tag}`)); await p.close();
      nightGates('night', `night (${tag === 'before' ? '2B mystery, before' : 'moonlit, after'})`, rows, {volt: 'volt'}); } }
  for (const f of (await import('./village-gates-more.js').catch(e => { if (!/Cannot find module|ERR_MODULE_NOT_FOUND/.test(String(e))) throw e; return {SECTIONS: []}; })).SECTIONS ?? []) if (on(f.sec)) await f.run({open, png, masks, nightFrame, nightGates, gate, raw, browser, server});
  for (const f of (await import('./fix3b-gates.js')).SECTIONS) if (argv.includes('--only') && on(f.sec)) await f.run({open, png, masks, nightFrame, nightGates, gate, raw, browser, server});   // P3B sections (only when named)
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
mkdirSync('review/village', {recursive: true});
const secs = new Set(gates.map(g => g.sec)), all = [...prev.filter(g => !secs.has(g.sec)), ...gates]; writeFileSync(FILE, JSON.stringify(all, null, 1));
const fails = gates.filter(g => !g.pass).length; console.log(`${gates.length - fails}/${gates.length} pass (this run); file ${all.filter(g => g.pass).length}/${all.length}`);
