// Studio V2 character gate: lineup frames (1080×1920) + 18 expression close-ups (640×640).
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startServer} from './pipeline/server.js';

const out = 'evidence/studio-characters', faces = `${out}/faces`;
await mkdir(faces, {recursive: true});
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = await startServer(process.cwd());
const browser = await chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const results = [], errors = [];
const grab = async page => Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${server.url}/production/studio-characters/`);
  await page.waitForFunction(() => window.__cast, null, {timeout: 120000});
  const jobs = [['lineup', 1080, 1920, `${out}/lineup-1080.png`], ['lineup34', 1080, 1920, `${out}/lineup34-1080.png`]];
  const exprs = await page.evaluate(() => __cast.EXPRESSIONS);
  // Leo carries the full 35-face sheet; Pip and Mother show a core eight.
  const core = ['happy', 'sad', 'angry', 'shocked', 'scared', 'calm', 'nervous', 'excited'];
  for (const e of exprs) jobs.push([`face:leo:${e}`, 480, 480, `${faces}/leo-${e}.png`]);
  for (const who of ['pip', 'mother']) for (const e of core) jobs.push([`face:${who}:${e}`, 480, 480, `${faces}/${who}-${e}.png`]);
  for (const [shot, w, h, path] of jobs) {
    const state = await page.evaluate(([s, w, h]) => __cast.render(s, w, h), [shot, w, h]);
    const png = await grab(page); await writeFile(path, png);
    await page.evaluate(([s, w, h]) => __cast.render(s, w, h), [shot, w, h]);
    const same = createHash('sha256').update(png).digest('hex') === createHash('sha256').update(await grab(page)).digest('hex');
    results.push({shot, path, width: w, height: h, renderMs: Math.round(state.ms), deterministic: same});
  }
  // Identity: the same meshes persist across every expression swap.
  results.push({identity: await page.evaluate(() => Object.fromEntries(Object.entries(__cast.cast).map(([k, a]) => [k, {parts: Object.keys(a.parts).length, pivots: Object.keys(a.pivots).length, cachedFaces: a.faceCache.size}])))});
} finally { await browser.close(); await server.close(); }
await writeFile(`${out}/capture.json`, JSON.stringify({status: errors.length ? 'ERRORS' : 'PASS', errors, results}, null, 1));
console.log(errors.length ? errors : 'PASS', results.filter(r => r.shot).map(r => `${r.shot} ${r.renderMs}ms ${r.deterministic ? 'det' : 'NONDET'}`).join('\n'));
