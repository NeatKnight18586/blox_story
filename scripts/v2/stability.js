// npm run v2:stability -- --story <slug> | --spec <episode.json>     (docs/V2_BRIEF.md Amendment A1, Part A)
// Camera-nudge test: every view is rendered twice at 540×960, the second time with the camera moved 4 mm along
// its right+up+back diagonal (a sideways-only move hides ground-plane z-fighting). A stable frame only changes at
// edges; z-fighting, crawling shadows or swimming textures change whole areas. `raw` = % of pixels whose colour
// changes by more than 40/255 on any channel (the literal A1 metric); `pct` (the gate) excuses pixels whose new
// colour exists in their 5×5 neighbourhood (edges sliding ≤ 2 px, which dominate close-ups) — see flicker.js.
// Views: every world anchor camera, plus the first, middle and last frame of every shot of the spec.
// FAIL (exit 1) if any view exceeds 0.30 %. Prints a table; writes review/<slug>/stability[-<spec>].json.
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {flickerCount} from './flicker.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const story = arg('story');
const spec = arg('spec') ?? (story && (existsSync(`stories/${story}/episode.json`) ? `stories/${story}/episode.json` : `stories/${story}/stills.json`));
if (!spec) { console.error('usage: stability.js --story <slug> | --spec <episode.json>'); process.exit(2); }
const slug = story ?? spec.split(path.sep).at(-2) ?? 'misc';
const W = Number(arg('width', 540)), H = Number(arg('height', 960)), NUDGE = Number(arg('nudge', .004)), LIMIT = Number(arg('limit', .30)), THRESH = 40;
const out = arg('out') ?? `review/${slug}/stability${arg('spec') ? '-' + path.basename(spec, '.json') : ''}.json`;

const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
  // In-page: render a view twice (as-is, then nudged 4 mm along the camera's right+up+back diagonal) and compare.
  await page.evaluate(([src, thresh]) => {
    const flicker = new Function('return ' + src)();
    const gl = document.querySelector('canvas').getContext('webgl2');
    const grab = () => { const b = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
    window.__nudgeDiff = render => { render(0); const a = grab(); render(1); const b = grab(); return flicker(a, b, gl.drawingBufferWidth, gl.drawingBufferHeight, thresh); };
  }, [flickerCount.toString(), THRESH]);
  const E = await page.evaluate(() => ({anchors: Object.keys(window.__episode.anchors ?? {}), shots: window.__episode.shots}));
  const rows = [];
  for (const a of E.anchors) {
    const r = await page.evaluate(([a, w, h, d]) => window.__nudgeDiff(k => window.__episode.renderAnchorNudged(a, 0, w, h, k * d)), [a, W, H, NUDGE]);
    rows.push({view: '@' + a, frame: null, pct: +r.gate.toFixed(3), raw: +r.raw.toFixed(3)});
  }
  for (const s of E.shots) for (const [label, f] of [['first', s.start], ['mid', s.start + Math.floor(s.frames / 2)], ['last', s.start + s.frames - 1]]) {
    const r = await page.evaluate(([f, w, h, d]) => window.__nudgeDiff(k => window.__episode.renderFrame(f, w, h, k * d)), [f, W, H, NUDGE]);
    rows.push({view: `${s.id}:${label}`, frame: f, pct: +r.gate.toFixed(3), raw: +r.raw.toFixed(3)});
  }
  const worst = rows.reduce((m, r) => r.pct > m.pct ? r : m, {pct: -1});
  const fail = rows.filter(r => r.pct > LIMIT);
  console.table(rows);
  const report = {spec, size: `${W}x${H}`, nudge: NUDGE, threshold: THRESH, limit: LIMIT, views: rows.length, worst, failing: fail.map(r => r.view), errors, result: fail.length || errors.length ? 'FAIL' : 'PASS', rows};
  await mkdir(path.dirname(out), {recursive: true}); await writeFile(out, JSON.stringify(report, null, 1));
  console.log(JSON.stringify({spec, views: rows.length, worst: worst.view + ' ' + worst.pct + ' %', failing: report.failing, out, result: report.result}));
  process.exitCode = report.result === 'PASS' ? 0 : 1;
} finally { await browser.close(); await server.close(); }
