// npm run v2:seek -- --story <slug> | --spec <episode.json> [--shots S38,S49] [--frames 1200,1300] [--fresh]
// fearbell ENGINE fix A1 SEEK-SAFE MOTION: renderFrame(n) must be a pure function of n. For each probe frame (first / mid / last of the
// chosen shots, or --frames) the frame is rendered COLD (first render after the page loads, or after a far jump), then again after a
// sequence of other frames (the previous probe, a far frame, the frame before it). Two checks per probe:
//   state: a scene fingerprint (every object's visibility + world matrix, light intensity, material opacity / colour, deformed geometry,
//          background, exposure) must be identical → lists the objects that differ (the stateful culprits);
//   pixels: the % of pixels that differ by > 40/255 (flicker.js raw metric) must be ≤ --limit (default 0.05 %).
// FAIL (exit 1) on any differing object or pixel share above the limit. Writes review/<slug>/seek.json.
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {flickerCount} from './flicker.js';
import {segmentPlan} from './segments.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const story = arg('story');
const spec = arg('spec') ?? (story && `stories/${story}/episode.json`);
if (!spec || !existsSync(spec)) { console.error('usage: seekcheck.js --story <slug> | --spec <episode.json> [--shots S38,S49] [--frames a,b]'); process.exit(2); }
const slug = story ?? spec.split(path.sep).at(-2) ?? 'misc';
const W = Number(arg('width', 270)), H = Number(arg('height', 480)), LIMIT = Number(arg('limit', .05));
const out = arg('out') ?? `review/${slug}/seek${arg('spec') ? '-' + path.basename(spec, '.json') : ''}.json`;
const only = arg('shots')?.split(','), fixed = arg('frames')?.split(',').map(Number);

// in-page: a fingerprint of everything renderFrame may change (names are paths; numbers rounded to 1e-4)
function installFingerprint() {
  const r4 = v => Math.round(v * 1e4) / 1e4;
  window.__fp = () => { const E = window.__episode, {scene, renderer} = E.debug, m = new Map(), gh = new Map();
    const walk = (o, p) => { const key = p + '/' + (o.name || o.type) + '#' + o.parent?.children.indexOf(o); let s = (o.visible ? 'V' : 'h');
      if (o.visible) { s += o.matrixWorld.elements.map(r4).join(',');
        if (o.isLight) s += '|L' + r4(o.intensity) + o.color?.getHexString();
        for (const mt of [].concat(o.material ?? [])) s += '|M' + r4(mt.opacity ?? 1) + (mt.color?.getHexString() ?? '') + r4(mt.emissiveIntensity ?? 0) + (mt.visible ? '' : 'x');
        if (o.isMesh && o.geometry?.attributes?.position) { const g = o.geometry; if (!gh.has(g.uuid)) { const a = g.attributes.position.array; let h = 0; for (let i = 0; i < a.length; i += 7) h = (h * 31 + Math.round(a[i] * 1e3)) | 0; gh.set(g.uuid, h); } s += '|G' + gh.get(g.uuid); }
        if (o.isInstancedMesh) { const a = o.instanceMatrix.array; let h = o.count; for (let i = 0; i < o.count * 16; i += 5) h = (h * 31 + Math.round(a[i] * 1e3)) | 0; s += '|I' + h; } }
      if (!o.visible) return; m.set(key, s); for (const c of o.children) walk(c, key); };   // only what can reach the frame: hidden subtrees are skipped (a lazily built hidden child is not a difference)
    walk(scene, ''); m.set('@background', scene.background?.isColor ? scene.background.getHexString() : String(scene.background?.uuid ?? null)); m.set('@exposure', String(r4(renderer.toneMappingExposure))); m.set('@fog', scene.fog ? scene.fog.color.getHexString() + ' ' + r4(scene.fog.near ?? 0) + '-' + r4(scene.fog.far ?? 0) + ' ' + r4(scene.fog.density ?? 0) : 'null');
    return Object.fromEntries(m); };
  const gl = document.querySelector('canvas').getContext('webgl2');
  window.__grab = () => { const b = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
  window.__probe = (n, w, h) => { window.__episode.renderFrame(n, w, h); return {fp: window.__fp(), px: window.__grab()}; };
}

const {segments} = segmentPlan(spec);
const fresh = argv.includes('--fresh');   // cold = the first render on a FRESH page per probe (exact; slower). Default: a far jump (frame 0 / the last frame) before the probe
const server = await startServer(), browser = await launch();
const open = async (seg, errors) => { const page = await browser.newPage({viewport: {width: 360, height: 640}}); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(seg.specPath)}&aa=0`); await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
  await page.evaluate(installFingerprint); return page; };
const probe = (page, f) => page.evaluate(([f, w, h]) => { const r = window.__probe(f, w, h); let b = ''; for (let i = 0; i < r.px.length; i += 0x8000) b += String.fromCharCode.apply(null, r.px.subarray(i, i + 0x8000)); return {fp: r.fp, px: btoa(b)}; }, [f, W, H]);
const unpack = r => ({fp: r.fp, px: new Uint8Array(Buffer.from(r.px, 'base64'))});
try {
  const rows = [], errors = [];
  for (const seg of segments) {
    let page = await open(seg, errors);
    const E = await page.evaluate(() => ({shots: window.__episode.shots, FRAMES: window.__episode.FRAMES}));
    const mine = E.shots.filter(s => (!seg.shotIds || seg.shotIds.has(s.id)) && (!only || only.some(o => s.id.startsWith(o))));
    const probes = fixed ? fixed.filter(f => !seg.shotIds || mine.some(s => f >= s.start && f < s.start + s.frames)) : mine.flatMap(s => [s.start, s.start + Math.floor(s.frames / 2), s.start + s.frames - 1]);
    if (!probes.length) { await page.close(); continue; }
    // pass 1: each probe COLD
    const cold = {};
    for (const [i, f] of probes.entries()) {
      if (fresh && i > 0) { await page.close(); page = await open(seg, errors); }
      if (!fresh) await page.evaluate(([g, w, h]) => window.__episode.renderFrame(g, w, h), [f > E.FRAMES / 2 ? 0 : E.FRAMES - 1, W, H]);
      cold[f] = unpack(await probe(page, f)); }
    // pass 2: IN SEQUENCE on one page: every other probe first (far jumps), then the 6 frames before it in order, then the probe
    if (fresh) { await page.close(); page = await open(seg, errors); }
    for (const f of probes) {
      await page.evaluate(([list, w, h]) => { for (const g of list) window.__episode.renderFrame(g, w, h); }, [[...probes.filter(g => g !== f), ...Array.from({length: Math.min(6, f)}, (_, k) => f - Math.min(6, f) + k)], W, H]);
      const b = unpack(await probe(page, f)), a = cold[f], diff = Object.keys({...a.fp, ...b.fp}).filter(k => a.fp[k] !== b.fp[k]), fl = flickerCount(a.px, b.px, W, H, 40);
      const shot = mine.findLast(s => f >= s.start)?.id;
      rows.push({view: `${shot}@${f}`, frame: f, objects: diff.length, pct: +fl.raw.toFixed(3), culprits: diff.slice(0, 12).map(k => k[0] === '@' ? `${k} ${a.fp[k]}→${b.fp[k]}` : k.replace(/#\d+/g, '').split('/').slice(-3).join('/')).join(' ; ')});
    }
    await page.close();
  }
  const fail = rows.filter(r => r.objects || r.pct > LIMIT);
  console.table(rows.map(({culprits, ...r}) => r));
  for (const r of fail) console.log('  ' + r.view + ': ' + r.culprits);
  const report = {spec, size: `${W}x${H}`, limit: LIMIT, probes: rows.length, failing: fail.map(r => r.view), errors, result: fail.length || errors.length ? 'FAIL' : 'PASS', rows};
  await mkdir(path.dirname(out), {recursive: true}); await writeFile(out, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({spec, probes: rows.length, failing: report.failing.length, out, result: report.result}));
  process.exitCode = report.result === 'PASS' ? 0 : 1;
} finally { await browser.close(); await server.close(); }
