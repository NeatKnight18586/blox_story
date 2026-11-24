// scripts/v2/render.js — render an episode's frames (docs/V2_BRIEF.md §5.4).
//   node scripts/v2/render.js --story <slug> | --spec <path/to/episode.json>
//        [--out <dir>] [--final | --width 1080 --height 1920] [--from N --to M] [--every K] [--workers 1] [--aa 0|1]
// Frames are captured as PNG (toDataURL): measured at 1440, raw readPixels transfer is 2.4× slower (A2 §E).
// Per-shot cache: <out>/cache/<shot>-<hash>/<n>.png, hash = engine + avatar code + the episode's
// non-shot data + that shot's own JSON, so fixing one shot re-renders only that shot.
// <out>/frames/frame-%05d.png are hard links into the cache (ready for ffmpeg); <out>/progress.json
// is rewritten as frames land, so a background job can be watched without polling the renderer.
import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {mkdir, writeFile, link, unlink} from 'node:fs/promises';
import path from 'node:path';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots, totalFrames} from '../../engine/timeline.js';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : (argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d); };
const story = arg('story'), specPath = arg('spec') ?? (story && `stories/${story}/episode.json`);
if (!specPath) { console.error('usage: render.js --story <slug> | --spec <episode.json>'); process.exit(2); }
const out = arg('out') ?? path.join(path.dirname(specPath), 'build');
// --final: the delivery preset (Amendment A2): native 1440×2560, antialiasing on. Without it the default stays 1080×1920.
const final = argv.includes('--final');
const width = Number(arg('width', final ? 1440 : 1080)), height = Number(arg('height', final ? 2560 : 1920)),
      workers = Number(arg('workers', 1)), aa = final ? '1' : arg('aa', '1');
const every = Number(arg('every', 1));

const spec = JSON.parse(readFileSync(specPath, 'utf8')), fps = spec.fps ?? 30;
const shots = layoutShots(spec);            // `at` cut times or `frames` (engine/timeline.js)
const total = totalFrames(shots);
const from = Number(arg('from', 0)), to = Math.min(Number(arg('to', total)), total);

const sha = s => createHash('sha256').update(s).digest('hex');
const walk = d => existsSync(d) ? readdirSync(d).flatMap(f => { const p = path.join(d, f); return statSync(p).isDirectory() ? (f === 'fixtures' ? [] : walk(p)) : /\.(js|json|html)$/.test(f) ? [p] : []; }) : [];
const worldFile = spec.world ?? path.join(path.dirname(specPath), 'world.js');   // A4: fixture worlds live outside stories/
const {shots: _omit, ...rest} = spec;
const castFile = spec.castFile && existsSync(spec.castFile) ? readFileSync(spec.castFile, 'utf8') : '';
const troupeFile = Object.values(spec.cast ?? {}).some(c => c.troupe) ? readFileSync(spec.troupeFile ?? (spec.format === 6 ? 'cast/troupe6.json' : 'cast/troupe.json'), 'utf8') : '';   // A5: troupe slots feed the cache hash
const world = sha([...['engine', 'avatar', 'avatar-style', 'parts'].flatMap(walk).sort().map(f => f + '\n' + readFileSync(f, 'utf8')),
  JSON.stringify(rest), castFile, troupeFile, existsSync(worldFile) ? readFileSync(worldFile, 'utf8') : '', `${width}x${height} aa=${aa}`].join('\n'));
const dirOf = s => path.join(out, 'cache', `${s.id}-${sha(world + JSON.stringify(s)).slice(0, 12)}`);
const shotOf = f => shots.findLast(s => f >= s.start);
const file = f => { const s = shotOf(f); return path.join(dirOf(s), `${String(f - s.start).padStart(4, '0')}.png`); };

const todo = []; for (let f = from; f < to; f += every) if (!existsSync(file(f))) todo.push(f);
for (const s of shots) await mkdir(dirOf(s), {recursive: true});
await mkdir(path.join(out, 'frames'), {recursive: true});
const progress = {spec: specPath, width, height, frames: total, range: [from, to], every, todo: todo.length, done: 0, cached: 0, status: 'running', started: new Date().toISOString(), msPerFrame: null, perShot: {}};
progress.cached = Math.ceil((to - from) / every) - todo.length;
const saveProgress = () => writeFile(path.join(out, 'progress.json'), JSON.stringify(progress, null, 1));
await saveProgress();
console.log(`${specPath}: ${total} frames; ${progress.cached} cached, ${todo.length} to render at ${width}×${height}, ${workers} worker(s)`);

const server = await startServer(process.cwd());
const page = `${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=${aa}`;   // tuft 1B fix: post 'cine' = MSAA 4× on its HDR target when aa (no supersample)
const t0 = Date.now(), times = []; let next = 0;
async function worker() {
  const browser = await launch();
  try {
    const p = await browser.newPage({viewport: {width: 360, height: 640}});
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(page); await p.waitForFunction(() => window.__episode, null, {timeout: 120000});
    while (next < todo.length) {
      const f = todo[next++];
      const r = await p.evaluate(([f, w, h]) => window.__episode.renderFrame(f, w, h), [f, width, height]);
      const png = Buffer.from((await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
      if (errors.length) throw Error(errors.join('; '));
      if (png.length < width * height / 50) throw Error(`blank frame ${f} (${png.length} bytes)`);   // never cache an empty canvas
      await writeFile(file(f), png);
      times.push(r.ms); progress.done++; const ps = progress.perShot[r.shot] ??= {frames: 0, maxTriangles: 0, maxCalls: 0};
      ps.frames++; ps.maxTriangles = Math.max(ps.maxTriangles, r.triangles); ps.maxCalls = Math.max(ps.maxCalls, r.calls);
      if (progress.done % 10 === 0) { progress.msPerFrame = Math.round(times.reduce((a, b) => a + b, 0) / times.length); await saveProgress(); }
    }
  } finally { await browser.close(); }
}
try {
  await Promise.all(Array.from({length: workers}, worker));
  // Rebuild the frame links for the whole requested range.
  for (const f of readdirSync(path.join(out, 'frames'))) await unlink(path.join(out, 'frames', f));
  let linked = 0;
  for (let f = from, k = 0; f < to; f += every, k++) if (existsSync(file(f))) { await link(file(f), path.join(out, 'frames', `frame-${String(every === 1 ? f : k).padStart(5, '0')}.png`)); linked++; }
  Object.assign(progress, {status: 'done', linked, wallSeconds: +((Date.now() - t0) / 1000).toFixed(1), msPerFrame: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    secondsPerFrameWall: todo.length ? +((Date.now() - t0) / 1000 / todo.length).toFixed(3) : 0});
} catch (e) { progress.status = 'failed'; progress.error = String(e.message).slice(0, 300); process.exitCode = 1; }
finally { await saveProgress(); await server.close(); }
console.log(JSON.stringify({status: progress.status, rendered: progress.done, cached: progress.cached, linked: progress.linked, wallSeconds: progress.wallSeconds, msPerFrame: progress.msPerFrame, error: progress.error}));
