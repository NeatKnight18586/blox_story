// scripts/v2/grab.js — render chosen frames of a spec to PNGs (one browser load): look-dev / before-after captures for sheets and gates.
// Usage: node scripts/v2/grab.js --spec <episode.json> --frames 12,40 --out <dir> [--w 540 --h 960] [--aa 0] [--nograin] [--prefix f]
//   --nograin also writes <prefix>-<frame>-ng.png with post 'cine' grain off (grain std = luma(grain) − luma(no grain)).
import {mkdirSync, writeFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';

const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const spec = arg('spec'), out = arg('out'), W = +arg('w', 540), H = +arg('h', 960), pre = arg('prefix', 'f'), frames = arg('frames', '0').split(',').map(Number);
mkdirSync(out, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch(), errors = [];
try {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=${arg('aa', '0')}`); await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  for (const f of frames) for (const ng of a.includes('--nograin') ? [false, true] : [false]) {
    const url = await page.evaluate(([f, W, H, ng]) => { const E = window.__episode; if (E.cine) E.cine.opts.grain = !ng; E.renderFrame(f, W, H); if (E.cine) E.cine.opts.grain = true; return E.debug.renderer.domElement.toDataURL('image/png'); }, [f, W, H, ng]);
    writeFileSync(`${out}/${pre}-${f}${ng ? '-ng' : ''}.png`, Buffer.from(url.split(',')[1], 'base64')); }
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); await server.close(); }
console.log('wrote', frames.length, 'frames →', out);
