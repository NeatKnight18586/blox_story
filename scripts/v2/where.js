// node scripts/v2/where.js --spec <episode.json> [--shots S01,S05] [--at .5] [--who hero,bitsy]
// E3b staging helper: at a shot's frame (default the middle) prints where the named actors are (feet, head centre, facing yaw in
// degrees, 0 = +z), the giant hand and the camera — the numbers hand-written `cam:` notes are solved against.
import {readFileSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {layoutShots} from '../../engine/timeline.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const specPath = arg('spec'), at = +arg('at', .5), spec = JSON.parse(readFileSync(specPath, 'utf8')), shots = layoutShots(spec), want = arg('shots') ? new Set(arg('shots').split(',')) : null;
const who = arg('who', 'hero,bitsy,kid,dummya,dummyb,dummyc,dummyd,dummye').split(',');
const list = shots.filter(s => !want || want.has(s.id)).map(s => ({id: s.id, n: s.start + Math.min(s.frames - 1, Math.floor(s.frames * at))}));
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 240000});
  for (const s of list) {
    const r = await page.evaluate(([s, who]) => { const E = window.__episode, sc = E.debug.scene; E.renderFrame(s.n, 36, 64); sc.updateMatrixWorld(true); const out = {cam: E.debug.camera.position.toArray().map(v => +v.toFixed(2))}; const V = sc.position.constructor;
      for (const n of who) { const o = sc.getObjectByName(n); if (!o || !o.visible) continue; let h = null; o.traverse(q => { if (!h && /^head$/i.test(q.name)) h = q; }); const hp = (h ?? o).getWorldPosition(new V()); const d = new V(0, 0, 1).transformDirection(o.matrixWorld);
        const hf = new V(0, 0, 1).transformDirection((h ?? o).matrixWorld); out[n] = {feet: o.position.toArray().map(v => +v.toFixed(2)), head: hp.toArray().map(v => +v.toFixed(2)), yaw: +(Math.atan2(d.x, d.z) * 180 / Math.PI).toFixed(0), face: hf.toArray().map(v => +v.toFixed(2))}; }
      const hd = sc.getObjectByName('giantHand'); if (hd?.visible) out.hand = hd.position.toArray().map(v => +v.toFixed(1)); return out; }, [s, who]);
    console.log(s.id, 'n=' + s.n, JSON.stringify(r));
  }
} finally { await browser.close(); await server.close(); }
