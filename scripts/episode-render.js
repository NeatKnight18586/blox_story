// Render an episode to native PNG frames with a per-shot cache and self-healing workers.
// Usage: node scripts/episode-render.js --ep=shortwick [--width=1080] [--workers=3] [--from=0] [--to=450] [--max-minutes=110]
//  • Cache: renders/<ep>-<w>/shots/<shot>-<hash>/<n>.png. The hash covers the shot's own spec and
//    stage code, its frame range, the world code above the SHOTS marker, the toolkit and the timing,
//    so editing one shot re-renders only that shot.
//  • Sequence: renders/<ep>-<w>/seq/frame-%05d.png hard-links into the cache, ready for ffmpeg.
//  • A crashed browser is relaunched and the worker carries on; frames already on disk are kept.
//  • --max-minutes stops cleanly before a background-job time limit; rerun to resume.
import {chromium} from 'playwright';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {mkdir, writeFile, link, unlink, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {startServer} from './pipeline/server.js';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ep = arg('ep'), width = Number(arg('width', 1080)), workers = Number(arg('workers', 3));
const deadline = Date.now() + Number(arg('max-minutes', 110)) * 60000;
const root = arg('out', `renders/${ep}-${width}`), seqDir = `${root}/seq`; await mkdir(seqDir, {recursive: true});
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const sha = s => createHash('sha256').update(s).digest('hex');
const walk = d => readdirSync(d).flatMap(f => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });

// World hash: toolkit + runner + episode code above the SHOTS marker + timing files.
const epSrc = readFileSync(`stories/${ep}/episode.js`, 'utf8');
const marker = epSrc.indexOf('// ==== SHOTS ====');
const below = epSrc.slice(marker);
const helpers = below.slice(below.indexOf('];\n') + 3);           // helper functions after the shots array
const world = sha([...walk('studio').sort().map(f => readFileSync(f, 'utf8')), readFileSync('production/episode/runner.js', 'utf8'),
  epSrc.slice(0, marker), helpers, readFileSync(`stories/${ep}/SCRIPT.md`, 'utf8'),
  existsSync(`stories/${ep}/word-timings.json`) ? readFileSync(`stories/${ep}/word-timings.json`, 'utf8') : 'estimated'].join('\n'));

const server = await startServer(process.cwd());
const launch = () => chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
async function openPage(browser) {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/production/episode/?ep=${ep}`);
  await page.waitForFunction(() => window.__sequence, null, {timeout: 300000});
  return {page, errors};
}

// Plan: which frames, which cache folder each belongs to.
const b0 = await launch(); const {page: p0} = await openPage(b0);
const seq = await p0.evaluate(() => ({FRAMES: __sequence.FRAMES, keys: __sequence.keys, timing: __sequence.timingSource}));
await b0.close();
const from = Number(arg('from', 0)), to = Math.min(Number(arg('to', seq.FRAMES)), seq.FRAMES);
const shotOf = f => seq.keys.find(k => f >= k.start && f < k.end);
const dirOf = k => `${root}/shots/${k.id}-${sha(world + k.start + '\n' + k.src).slice(0, 12)}`;
const file = f => { const k = shotOf(f); return `${dirOf(k)}/${String(f - k.start).padStart(4, '0')}.png`; };
for (const k of seq.keys) await mkdir(dirOf(k), {recursive: true});
const todo = []; for (let f = from; f < to; f++) if (!existsSync(file(f))) todo.push(f);
console.log(`${ep}: ${seq.FRAMES} frames (${seq.timing} timing); range ${from}-${to}; ${to - from - todo.length} cached, ${todo.length} to render at ${width}px, ${workers} workers`);

const minBytes = Number(arg('min-bytes', width * 150));   // 162 KB at 1080
const t0 = performance.now(), log = [], errors = []; let next = 0, restarts = 0;
async function worker(k) {
  while (next < todo.length && Date.now() < deadline) {
    let browser, cur = null;
    try {
      browser = await launch(); const {page, errors: pe} = await openPage(browser);
      while (next < todo.length && Date.now() < deadline) {
        const f = cur = todo[next++];
        const s = await page.evaluate(([f, w]) => __sequence.renderFrame(f, w), [f, width]);
        const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
        // Never cache a blank frame: a real 1080p frame is megabytes; a black/empty canvas compresses to ~50 KB.
        if (png.length < minBytes) throw Error(`blank frame ${f} (${png.length} bytes)`);
        await writeFile(file(f), png); cur = null; log.push({frame: f, shot: s.shot, ms: Math.round(s.ms)});
        if (pe.length) throw Error(pe.join('; '));
        if (log.length % 50 === 0) console.log(`${log.length}/${todo.length} frames, ${((performance.now() - t0) / 1000).toFixed(0)}s`);
      }
    } catch (e) {
      if (cur !== null) todo.push(cur);   // retry the frame that was in flight
      errors.push(String(e.message ?? e).slice(0, 300)); restarts++;
      if (restarts > 20) throw Error('too many worker restarts: ' + errors.slice(-3).join(' | '));
      console.log(`worker ${k} restarting: ${String(e.message ?? e).slice(0, 120)}`);
    } finally { await browser?.close().catch(() => {}); }
  }
}
try { await Promise.all(Array.from({length: workers}, (_, k) => worker(k))); } finally { await server.close(); }

// Rebuild the sequence links for the requested range.
for (const f of await readdir(seqDir)) if (f.startsWith('frame-')) { const n = Number(f.slice(6, 11)); if (n >= seq.FRAMES) await unlink(`${seqDir}/${f}`); }
let linked = 0;
for (let f = from; f < to; f++) {
  const dst = `${seqDir}/frame-${String(f).padStart(5, '0')}.png`;
  if (!existsSync(file(f))) continue;
  if (existsSync(dst)) await unlink(dst);
  await link(file(f), dst); linked++;
}
const wall = (performance.now() - t0) / 1000;
const summary = {ep, width, workers, timing: seq.timing, range: [from, to], rendered: log.length, remaining: todo.length - log.length, linked, restarts,
  wallSeconds: Math.round(wall), secondsPerFrameWall: +(wall / Math.max(1, log.length)).toFixed(2), msPerFrameInPage: Math.round(log.reduce((a, r) => a + r.ms, 0) / Math.max(1, log.length)), errors: errors.slice(-5)};
await writeFile(`${root}/render-log-${Date.now()}.json`, JSON.stringify({...summary, log: log.sort((a, b) => a.frame - b.frame)}, null, 1));
console.log(JSON.stringify(summary));
if (summary.remaining) process.exitCode = 3;   // stopped at the time limit: rerun to resume
