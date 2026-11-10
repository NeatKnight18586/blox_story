// Native look-gate capture: legacy vs studio look, wide + Leo close-up, at 1080×1920.
// Usage: node scripts/studio-lookdev-capture.js [--width=1080]
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startServer} from './pipeline/server.js';

const width = Number(process.argv.find(a => a.startsWith('--width='))?.split('=')[1] ?? 1080);
const height = Math.round(width * 16 / 9), out = 'evidence/studio-lookdev';
await mkdir(out, {recursive: true});
// Repo pins playwright 1.56.1; use the environment's browser when the pinned build is absent.
const executablePath = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const server = await startServer(process.cwd());
const browser = await chromium.launch({executablePath, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const results = [], errors = [];
try {
  for (const look of [0, 1]) {
    const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
    page.on('pageerror', e => errors.push(e.message));
    // Count real missing assets by URL; the browser's automatic favicon probe is not one.
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
    page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
    const t0 = performance.now();
    await page.goto(`${server.url}/production/studio-lookdev/?look=${look}`);
    await page.waitForFunction(() => window.__lookdev, null, {timeout: 120000});
    const loadMs = performance.now() - t0;
    for (const shot of ['wide', 'leo']) {
      const timings = [];
      let state;
      for (let i = 0; i < 3; i++) { state = await page.evaluate(([s, w]) => __lookdev.render(s, w), [shot, width]); timings.push(state.ms); }
      const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      const png = Buffer.from(dataUrl.split(',')[1], 'base64');
      const name = `${shot}-${look ? 'studio' : 'legacy'}-${width}.png`;
      await writeFile(`${out}/${name}`, png);
      // Determinism: render again and compare.
      await page.evaluate(([s, w]) => __lookdev.render(s, w), [shot, width]);
      const again = Buffer.from((await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).split(',')[1], 'base64');
      const hash = createHash('sha256').update(png).digest('hex');
      results.push({name, shot, look: !!look, width: state.width, height: state.height, loadMs: Math.round(loadMs),
        renderMs: timings.map(Math.round), deterministic: hash === createHash('sha256').update(again).digest('hex'), sha256: hash, camera: state.camera});
      console.log(name, state.width + 'x' + state.height, 'render ms', timings.map(Math.round).join('/'));
    }
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
await writeFile(`${out}/capture-${width}.json`, JSON.stringify({status: errors.length ? 'ERRORS' : 'PASS', renderer: 'Chromium SwiftShader (CPU WebGL)', errors, results}, null, 2));
if (errors.length) { console.error(errors); process.exit(1); }
