// npm run v2:bench -- --story <slug> | --spec <episode.json>   (docs/V2_BRIEF.md §5.4)
// Renders 8 evenly spaced frames of every shot at 720×1280 and prints triangles, draw calls and s/frame.
// PASS = every shot ≤ 50,000 triangles in the frustum and the mean ≤ 0.45 s/frame. Exit code 1 on FAIL.
// (Session 3 adds the world's anchors; until then every shot of the spec is benched.)
import {startServer} from '../pipeline/server.js';
import {launch} from './browser.js';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const spec = arg('spec') ?? (arg('story') && `stories/${arg('story')}/episode.json`);
if (!spec) { console.error('usage: bench.js --story <slug> | --spec <episode.json>'); process.exit(2); }
const W = Number(arg('width', 720)), H = Number(arg('height', 1280)), N = Number(arg('frames', 8));
const MAX_TRI = 50000, MAX_S = .45;

const server = await startServer(process.cwd()), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 120000});
  const shots = await page.evaluate(() => window.__episode.shots);
  await page.evaluate(([w, h]) => window.__episode.renderFrame(0, w, h), [W, H]);   // warm-up: shader compile, texture upload
  const rows = [];
  for (const s of shots) {
    const fr = Array.from({length: N}, (_, i) => s.start + Math.min(s.frames - 1, Math.round(i * (s.frames - 1) / Math.max(1, N - 1))));
    const r = await page.evaluate(([fr, w, h]) => fr.map(f => window.__episode.renderFrame(f, w, h)), [fr, W, H]);
    rows.push({shot: s.id, size: s.size, triangles: Math.max(...r.map(x => x.triangles)), calls: Math.max(...r.map(x => x.calls)), sPerFrame: +(r.reduce((a, x) => a + x.ms, 0) / r.length / 1000).toFixed(3)});
  }
  const mean = +(rows.reduce((a, r) => a + r.sPerFrame, 0) / rows.length).toFixed(3);
  const over = rows.filter(r => r.triangles > MAX_TRI).map(r => r.shot);
  const pass = !over.length && mean <= MAX_S && !errors.length;
  console.table(rows);
  console.log(JSON.stringify({spec, size: `${W}x${H}`, browser: browser.resolved.executablePath ?? 'playwright', maxTriangles: Math.max(...rows.map(r => r.triangles)), meanSecondsPerFrame: mean, overBudget: over, errors, result: pass ? 'PASS' : 'FAIL'}));
  process.exitCode = pass ? 0 : 1;
} finally { await browser.close(); await server.close(); }
