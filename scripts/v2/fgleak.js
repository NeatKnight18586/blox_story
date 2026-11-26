// npm run v2:fgleak -- --spec <episode.json> [--frames a,b,…] [--out <json>]   (fearbell pass 2, owner A2: NO FOREGROUND LEAK plan check)
// Per checked frame (default: the middle frame of every shot), engine/episode.js leakMeasure: the share of the frame's middle third covered by
// non-subject solid geometry nearer than the subject (0.9 × the camera → target distance). Any frame > LEAK.max (10 %) is an ERROR (exit 1).
// Pure judge `leakJudge` is exported for tests.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {layoutShots} from '../../engine/timeline.js';

export const LEAK_MAX = .10;
export const leakJudge = (rows, max = LEAK_MAX) => rows.map(r => ({...r, ok: r.cover <= max + 1e-9})).map(r => ({...r, msg: `${r.id ?? 'f' + r.frame}: non-subject cover of the middle third ${(r.cover * 100).toFixed(1)} % (≤ ${max * 100} %)${r.hits?.length ? ' — ' + r.hits.join(', ') : ''}`}));

if (import.meta.url === `file://${process.argv[1]}`) {
  const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
  const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const specPath = arg('spec'), spec = JSON.parse(readFileSync(specPath, 'utf8')), shots = layoutShots(spec);
  const frames = arg('frames') ? arg('frames').split(',').map(Number) : shots.map(s => s.start + Math.floor(s.frames / 2));
  const idOf = f => shots.findLast(s => f >= s.start)?.id ?? null;
  const server = await startServer(), browser = await launch(); let rows;
  try {
    const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
    await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 240000});
    if (errs.length) throw Error(errs.join('; '));
    rows = await page.evaluate(fs => fs.map(f => window.__episode.leakMeasure(f)), frames);
  } finally { await browser.close(); await server.close(); }
  const out = leakJudge(rows.map(r => ({...r, id: idOf(r.frame)}))), bad = out.filter(r => !r.ok);
  for (const r of bad) console.log('ERROR ' + r.msg);
  const o = arg('out'); if (o) { mkdirSync(path.dirname(o), {recursive: true}); writeFileSync(o, JSON.stringify({spec: specPath, max: LEAK_MAX, rows: out}, null, 1)); }
  console.log(JSON.stringify({frames: out.length, maxCover: Math.max(0, ...out.map(r => r.cover)), errors: bad.length, result: bad.length ? 'FAIL' : 'PASS'}));
  process.exitCode = bad.length ? 1 : 0;
}
