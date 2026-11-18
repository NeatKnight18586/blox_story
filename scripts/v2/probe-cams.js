// node scripts/v2/probe-cams.js --spec <episode.json> --in probes.json : for each {n, cam?: {position, target, fov}} renders frame n
// (or frame n's state seen from cam) at 270×480 and prints actor face/box, prop and tool boxes, background luma (gateMeasure).
import {readFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const spec = arg('spec', 'stories/toyhouse/episode.json'), probes = JSON.parse(readFileSync(arg('in'), 'utf8'));
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=0`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  for (const p of probes) {
    const r = await page.evaluate(p => { const E = window.__episode; E.renderFrame(p.n, 270, 480); if (p.cam) E.renderCamera(p.cam, p.n / E.FPS, 270, 480, p.look ?? 'toyParty');
      const g = E.gateMeasure(p.n, {w: 270, h: 480, render: false}); delete g.luma; return g; }, p);
    const f = b => b ? `[${[b.x0, b.y0, b.x1, b.y1].map(v => v.toFixed(2)).join(',')}]` : '-';
    console.log(`#${p.tag ?? ''} n=${p.n} bg=${r.bgLuma.toFixed(3)}`);
    for (const [k, a] of Object.entries(r.actors)) console.log(`  ${k} box=${f(a.box)} sh=${a.shoulder.toFixed(2)} face=${a.face ? a.face.h.toFixed(3) : '-'} ${f(a.face)}`);
    for (const [k, b] of Object.entries(r.props)) console.log(`  prop ${k} ${f(b)} h=${(b.y1 - b.y0).toFixed(3)}`);
    for (const [k, b] of Object.entries(r.tools)) console.log(`  tool ${k} ${f(b)} h=${(b.y1 - b.y0).toFixed(3)}`);
  }
} finally { await browser.close(); await server.close(); }
