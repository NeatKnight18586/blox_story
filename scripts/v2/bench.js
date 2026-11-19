// npm run v2:bench -- --story <slug> | --spec <episode.json>   (docs/V2_BRIEF.md §5.4)
// Renders 8 evenly spaced frames of every shot at 720×1280 and prints triangles, draw calls and s/frame.
// PASS = every shot ≤ 50,000 triangles in the frustum and the mean ≤ 0.45 s/frame. Exit code 1 on FAIL.
// Also reports s/frame at native 1080×1920 (finals; target ≤ 1.0). `triangles` = meshes in the camera
// frustum (the gate); `withShadowPass` = what the renderer drew including shadow-map passes.
// (Session 3 adds the world's anchors; until then every shot of the spec is benched.)
import {startServer} from './server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
import {existsSync} from 'node:fs';
const story = arg('story');
const spec = arg('spec') ?? (story && (existsSync(`stories/${story}/episode.json`) ? `stories/${story}/episode.json` : `stories/${story}/stills.json`));
if (!spec) { console.error('usage: bench.js --story <slug> | --spec <episode.json>'); process.exit(2); }
const W = Number(arg('width', 720)), H = Number(arg('height', 1280)), N = Number(arg('frames', 8));
// A4 A7 + owner Decision 4: Season 1 (v3) worlds (spec.world exports LOOK, or spec.budget === 'v3') ≤ 90,000 triangles, ≤ 0.62 s/frame.
import {readFileSync} from 'node:fs';
const specJson = JSON.parse(readFileSync(spec, 'utf8')), worldSrc = specJson.world ? readFileSync(specJson.world, 'utf8') : '';
const V3 = specJson.budget === 'v3' || /export const LOOK\b/.test(worldSrc);
const MAX_TRI = V3 ? 90000 : 50000, MAX_S = V3 ? .62 : .45;   // owner Decision 4 (A5): Season 1 worlds ≤ 90k, ≤ 0.62 s at 720

const server = await startServer(process.cwd()), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 120000});
  const shots = await page.evaluate(() => window.__episode.shots);
  await page.evaluate(([w, h]) => window.__episode.renderFrame(0, w, h), [W, H]);   // warm-up: shader compile, texture upload
  const rows = [];
  // World anchors (Session 3+): 8 frames at every anchor's establishing camera, movers at 8 times.
  const anchorNames = Object.keys(await page.evaluate(() => window.__episode.anchors ?? {}));
  for (const name of anchorNames) {
    const r = await page.evaluate(([n, w, h, N]) => Array.from({length: N}, (_, i) => window.__episode.renderAnchor(n, i * .5, w, h)), [name, W, H, N]);
    const r1080 = await page.evaluate(([n, N]) => Array.from({length: N}, (_, i) => window.__episode.renderAnchor(n, i * .5, 1080, 1920)), [name, 2]);
    rows.push({shot: '@' + name, size: 'anchor', triangles: Math.max(...r.map(x => x.triangles)), withShadowPass: Math.max(...r.map(x => x.drawnTriangles)), calls: Math.max(...r.map(x => x.calls)),
      sPerFrame: +(r.reduce((a, x) => a + x.ms, 0) / r.length / 1000).toFixed(3), sPerFrame1080: +(r1080.reduce((a, x) => a + x.ms, 0) / r1080.length / 1000).toFixed(3)});
  }
  for (const s of shots) {
    const fr = Array.from({length: N}, (_, i) => s.start + Math.min(s.frames - 1, Math.round(i * (s.frames - 1) / Math.max(1, N - 1))));
    const r = await page.evaluate(([fr, w, h]) => fr.map(f => window.__episode.renderFrame(f, w, h)), [fr, W, H]);
    rows.push({shot: s.id, size: s.size, triangles: Math.max(...r.map(x => x.triangles)), withShadowPass: Math.max(...r.map(x => x.drawnTriangles)), calls: Math.max(...r.map(x => x.calls)), sPerFrame: +(r.reduce((a, x) => a + x.ms, 0) / r.length / 1000).toFixed(3)});
  }
  // Native 1080×1920 finals (owner decision): same frames again at full size; target ≤ 1.0 s/frame.
  if (W === 720) for (const [k, s] of shots.entries()) { const i = anchorNames.length + k;
    const fr = Array.from({length: Math.min(N, 4)}, (_, k) => s.start + Math.min(s.frames - 1, Math.round(k * (s.frames - 1) / 3)));
    const r = await page.evaluate(fr => fr.map(f => window.__episode.renderFrame(f, 1080, 1920)), fr);
    rows[i].sPerFrame1080 = +(r.reduce((a, x) => a + x.ms, 0) / r.length / 1000).toFixed(3);
  }
  const mean = +(rows.reduce((a, r) => a + r.sPerFrame, 0) / rows.length).toFixed(3);
  const mean1080 = rows[0].sPerFrame1080 === undefined ? null : +(rows.reduce((a, r) => a + r.sPerFrame1080, 0) / rows.length).toFixed(3);
  const over = rows.filter(r => r.triangles > MAX_TRI).map(r => r.shot);
  const BACKDROP = !!specJson.backdrop, pass = BACKDROP ? (mean1080 ?? mean) <= .69 && !errors.length : !over.length && mean <= MAX_S && !errors.length;   // owner Kit 1c: backdrop specs gate on time (≤ 0.69 s/frame at 1080), triangles are only reported
  console.table(rows);
  console.log(JSON.stringify({spec, budget: V3 ? 'Season 1 (90k, 0.62 s)' : 'v2 (50k, 0.45 s)', size: `${W}x${H}`, browser: browser.resolved.executablePath ?? 'playwright', maxTriangles: Math.max(...rows.map(r => r.triangles)), meanSecondsPerFrame: mean, meanSecondsPerFrame1080: mean1080, target1080: 1.0, overBudget: BACKDROP ? [] : over, trianglesOver90k: BACKDROP ? over : undefined, errors, result: pass ? 'PASS' : 'FAIL'}));
  process.exitCode = pass ? 0 : 1;
} finally { await browser.close(); await server.close(); }
