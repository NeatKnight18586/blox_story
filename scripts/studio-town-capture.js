// Town kit gate: native 1080×1920 street and plaza frames, timings, determinism.
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startServer} from './pipeline/server.js';

const out = 'evidence/studio-town'; await mkdir(out, {recursive: true});
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = await startServer(process.cwd());
const browser = await chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const results = [], errors = [];
const grab = async page => Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
  const t0 = performance.now();
  await page.goto(`${server.url}/production/studio-town/`);
  await page.waitForFunction(() => window.__town, null, {timeout: 180000});
  const loadMs = Math.round(performance.now() - t0);
  for (const shot of await page.evaluate(() => __town.shots)) {
    const timings = []; let state;
    for (let i = 0; i < 2; i++) { state = await page.evaluate(s => __town.render(s), shot); timings.push(Math.round(state.ms)); }
    const png = await grab(page); await writeFile(`${out}/${shot}-1080.png`, png);
    await page.evaluate(s => __town.render(s), shot);
    const same = createHash('sha256').update(png).digest('hex') === createHash('sha256').update(await grab(page)).digest('hex');
    results.push({shot, renderMs: timings, deterministic: same, sceneTriangles: state.sceneTriangles});
    console.log(shot, timings.join('/'), 'ms', same ? 'det' : 'NONDET', state.sceneTriangles, 'tris');
  }
  results.push({loadMs});
} finally { await browser.close(); await server.close(); }
await writeFile(`${out}/capture.json`, JSON.stringify({status: errors.length ? 'ERRORS' : 'PASS', renderer: 'Chromium SwiftShader (CPU WebGL)', errors, results}, null, 1));
if (errors.length) { console.error(errors); process.exit(1); }
