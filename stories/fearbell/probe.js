// stories/fearbell/probe.js <loc> <frame,…> [actor,…] — FINAL staging debug: renders each frame (city/room previs spec) and prints the camera
// (position, look direction) + each named actor's root position, visibility and screen box (objectBox) at that frame. No files written.
import {startServer} from '../../scripts/v2/server.js';
import {launch} from '../../scripts/v2/browser.js';
const [loc, fr, names = ''] = process.argv.slice(2), server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage();
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(`stories/fearbell/build/previs-${loc}.json`)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 240000});
  for (const f of fr.split(',').map(Number)) {
    await page.evaluate(f => window.__episode.renderFrame(f, 180, 320), f);
    console.log(f, JSON.stringify(await page.evaluate(ns => { const E = window.__episode, c = E.debug.camera, d = c.getWorldDirection(new c.position.constructor()), R = E.castRoots();
      const r3 = v => v.toArray().map(x => +x.toFixed(2)), P2 = o => { o.updateWorldMatrix(true, false); return r3(o.getWorldPosition(new c.position.constructor())); }, P = n => { const o = E.debug.scene.getObjectByName(n); return o ? r3(o.getWorldPosition(new c.position.constructor())) : null; };
      const parts = {}; for (const n of ns.filter(n => n.includes('/'))) { const [a, q] = n.split('/'), o = R[a]; let hit = null; o?.traverse(x => { if (!hit && x.name && x.name.toLowerCase().includes(q.toLowerCase()) && x.isMesh !== undefined) hit = x; }); if (hit) { const b = new E.debug.camera.constructor().constructor; const bb = new (Object.getPrototypeOf(hit.geometry?.boundingBox ?? {}).constructor ?? Object)(); } parts[n] = hit ? {name: hit.name, pos: P2(hit)} : null; }
      return {parts, props: Object.fromEntries(ns.filter(n => n.startsWith('prop_')).map(n => [n, P(n)])), cam: r3(c.position), dir: r3(d), fov: c.fov, actors: Object.fromEntries(ns.filter(n => n && !n.startsWith('prop_') && !n.includes('/')).map(n => { let b = null; try { b = E.objectBox(n); } catch {} return [n, R[n] ? {pos: r3(R[n].position), vis: R[n].visible, yaw: +(R[n].rotation.y * 180 / Math.PI).toFixed(1), box: b} : 'none']; }))}; }, names.split(','))));
  }
} finally { await browser.close(); await server.close(); }
