// Render the studio sequence as native PNG frames (resumable, sharded across workers).
// Usage: node scripts/studio-sequence-render.js [--width=1440] [--workers=3] [--frames=0,60,135] [--out=renders/studio-sequence-1440]
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {startServer} from './pipeline/server.js';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const width = Number(arg('width', 1440)), workers = Number(arg('workers', 3)), PAGE = arg('page', 'production/studio-sequence/');
const out = arg('out', `renders/studio-sequence-${width}`); await mkdir(out, {recursive: true});
const only = arg('frames', null)?.split(',').map(Number);
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = await startServer(process.cwd());
const name = f => `${out}/frame-${String(f).padStart(5, '0')}.png`;
const total = Number(arg('total', 360)), all = only ?? Array.from({length: total}, (_, i) => i);
const todo = all.filter(f => only || !existsSync(name(f)));
console.log(`rendering ${todo.length}/${all.length} frames at ${width}px with ${workers} workers`);
const t0 = performance.now(), log = [], errors = [];
async function worker(k) {
  const browser = await chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport: {width: 360, height: 640}, deviceScaleFactor: 1});
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${server.url}/${PAGE}`);
    await page.waitForFunction(() => window.__sequence, null, {timeout: 180000});
    for (const f of todo.filter((_, i) => i % workers === k)) {
      const s = await page.evaluate(([f, w]) => __sequence.renderFrame(f, w), [f, width]);
      const png = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
      await writeFile(name(f), png); log.push({...s, ms: Math.round(s.ms)});
      if (log.length % 20 === 0) console.log(`${log.length}/${todo.length} frames, ${((performance.now() - t0) / 1000).toFixed(0)}s`);
    }
  } finally { await browser.close(); }
}
try { await Promise.all(Array.from({length: workers}, (_, k) => worker(k))); } finally { await server.close(); }
const wall = (performance.now() - t0) / 1000;
await writeFile(`${out}/render-log-${Date.now()}.json`, JSON.stringify({width, workers, wallSeconds: wall, frames: log.length, errors, log: log.sort((a, b) => a.frame - b.frame)}, null, 1));
console.log(`done ${log.length} frames in ${wall.toFixed(1)}s (${(wall / Math.max(1, log.length)).toFixed(2)}s/frame wall)`, errors.length ? errors : '');
if (errors.length) process.exit(1);
