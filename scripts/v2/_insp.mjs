import {startServer} from './server.js';
import {launch} from './browser.js';
const frames = process.argv.slice(2).map(Number);
const server = await startServer(), browser = await launch();
const page = await browser.newPage({viewport: {width: 270, height: 480}});
await page.goto(`${server.url}/engine/episode.html?spec=stories/nobody/episode.json&aa=0`);
await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 120000});
for (const f of frames) {
  const r = await page.evaluate(f => window.__episode.inspectFrame(f), f);
  console.log(f, JSON.stringify(r.camera), Object.entries(r.heads).filter(([, h]) => h.inFront && h.x > -.2 && h.x < 1.2 && h.y > -.2 && h.y < 1.2).map(([n, h]) => `${n}@${h.x.toFixed(2)},${h.y.toFixed(2)} d${h.dist.toFixed(1)}`).join(' '), JSON.stringify(r.cards.map(c => [c.cls, +c.rect.x0.toFixed(2), +c.rect.y0.toFixed(2), +c.rect.x1.toFixed(2), +c.rect.y1.toFixed(2)])));
}
await browser.close(); await server.close();
