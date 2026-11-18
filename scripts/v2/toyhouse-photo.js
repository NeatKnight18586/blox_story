// node scripts/v2/toyhouse-photo.js : renders the T34 memory shot (young Pip with the key) at 384×480 into
// stories/toyhouse/photo34.png — the picture inside the T33 photo frame (props6 photoFrame2 applies the sepia).
import {writeFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=stories/toyhouse/episode.json&aa=1`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  const url = await page.evaluate(() => { const E = window.__episode, s = E.shots.find(x => x.id.startsWith('T34')), n = s.start + Math.floor(s.frames * .6), w = 384, h = 480;
    E.renderFrame(n, w, h); const gl = document.querySelector('canvas').getContext('webgl2'), px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h);
    for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); x.putImageData(im, 0, 0); return c.toDataURL('image/png'); });
  writeFileSync('stories/toyhouse/photo34.png', Buffer.from(url.split(',')[1], 'base64')); console.log('stories/toyhouse/photo34.png');
} finally { await browser.close(); await server.close(); }
