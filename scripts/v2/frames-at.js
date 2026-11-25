// scripts/v2/frames-at.js — render a list of (spec, frame) pairs at one size to PNGs (any checkout: run it with that checkout as cwd).
//   Usage: node <path>/frames-at.js <out dir> <W> <H> <spec>:<frame>:<name> ...
import {mkdirSync, writeFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
const [out, W, H, ...items] = process.argv.slice(2); mkdirSync(out, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch(), errors = []; let page = null, cur = null;
try { for (const it of items) { const [spec, f, name] = it.split(':');
    if (spec !== cur) { await page?.close(); page = await browser.newPage(); page.on('pageerror', e => { errors.push(String(e).slice(0, 300)); if (process.env.FA_DEBUG) console.log('pageerror:', String(e).slice(0, 400)); }); if (process.env.FA_DEBUG) page.on('console', m => console.log('console:', m.text().slice(0, 300))); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 300000}).catch(e => { throw Error(errors.join('\n') || e.message); }); cur = spec; }
    const url = await page.evaluate(([f, W, H]) => { const E = window.__episode; E.renderFrame(f, W, H); return E.debug.renderer.domElement.toDataURL('image/png'); }, [+f, +W, +H]);
    writeFileSync(`${out}/${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log(name); } }
finally { await browser.close(); await server.close(); }
