// scripts/v2/matcap4.js — format v4 2b: writes each look preset's 256 px actor matcap to the disk cache
// (renders/cache/tex4/matcap-<preset>.bin), rendered once in the episode page (look4.matcapBytes).  node scripts/v2/matcap4.js
import {mkdirSync, writeFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
mkdirSync('renders/cache/tex4', {recursive: true});
const server = await startServer(), browser = await launch(), out = {};
try {
  for (const p of ['comedy', 'mystery', 'toy', 'dawn']) {
    const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent((p === 'comedy' || p === 'mystery') ? `engine/fixtures/v4look/${p}-v4.json` : `engine/fixtures/toyhouse/${p === 'toy' ? 'hall' : 'street'}.json`)}&aa=0`);
    await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 120000}); if (errs.length) throw Error(errs.join('; '));
    const b = await page.evaluate(n => window.__episode.matcapBytes(n), p); writeFileSync(`renders/cache/tex4/matcap-${p}.bin`, Buffer.from(b)); out[p] = b.length; await page.close();
  }
} finally { await browser.close(); await server.close(); }
console.log(JSON.stringify(out));
