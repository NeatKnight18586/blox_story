// scripts/v2/testpark-gates.js — E1b measured gates on testPark specs (in-page, on the frame the renderer just drew).
//   node scripts/v2/testpark-gates.js --spec <episode.json> --shot <id> [--width 1080 --height 1920]
//        [--actors a,b,…]   torso stats per actor: mask (actorMask) ∩ UpperTorso box → mean luma (Rec.709 on sRGB 0–255), Lab a*, b*, C*
//        [--sign]           letter heights of the painted sign (ink rows inside the projected signFace), scaled to a 390 px frame
//        [--pinch]          pinch gap: thumb-tip to index-tip surface gap (pure handGap) in px on a 390 px frame
// Prints one JSON object.
import {startServer} from './server.js';
import {launch} from './browser.js';
import {readFileSync} from 'node:fs';
import {handGap} from '../../parts/props.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const spec = arg('spec'), shotId = arg('shot'), W = Number(arg('width', 1080)), H = Number(arg('height', 1920));
const actors = arg('actors') ? arg('actors').split(',') : [], doSign = argv.includes('--sign'), doPinch = argv.includes('--pinch');
const J = JSON.parse(readFileSync(spec, 'utf8'));
const server = await startServer(), browser = await launch();
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}}); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`);
  await page.waitForFunction(() => window.__episode, null, {timeout: 180000});
  const r = await page.evaluate(([shotId, W, H, actors, doSign, doPinch]) => {
    const E = window.__episode, s = E.shots.find(x => x.id === shotId); if (!s) throw Error('no shot ' + shotId);
    E.renderFrame(s.start, W, H);
    const gl = document.querySelector('canvas').getContext('webgl2'), px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const at = (x, y) => ((H - 1 - y) * W + x) * 4;   // y down
    const lin = c => { c /= 255; return c > .04045 ? ((c + .055) / 1.055) ** 2.4 : c / 12.92; };
    const lab = (R, G, B) => { const r = lin(R), g = lin(G), b = lin(B), X = (.4124 * r + .3576 * g + .1805 * b) / .95047, Y = .2126 * r + .7152 * g + .0722 * b, Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
      const f = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
    const out = {shot: shotId, size: `${W}x${H}`, actors: {}};
    const meas = E.measureFrame();
    for (const name of actors) {
      const m = meas[name]; if (!m?.torso) { out.actors[name] = null; continue; }
      const mask = E.actorMask(name, W, H), b = m.torso, x0 = Math.max(0, Math.floor(b.x0 * W)), x1 = Math.min(W - 1, Math.ceil(b.x1 * W)), y0 = Math.max(0, Math.floor(b.y0 * H)), y1 = Math.min(H - 1, Math.ceil(b.y1 * H));
      let n = 0, sl = 0, sa = 0, sb = 0, sR = 0, sG = 0, sB = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!mask[y * W + x]) continue; const i = at(x, y), R = px[i], G = px[i + 1], B = px[i + 2]; n++; sl += .2126 * R + .7152 * G + .0722 * B; sR += R; sG += G; sB += B; }
      const [L, a, bb] = n ? lab(sR / n, sG / n, sB / n) : [0, 0, 0];
      out.actors[name] = {pixels: n, luma: +(sl / n).toFixed(1), rgb: [sR / n, sG / n, sB / n].map(v => Math.round(v)), L: +L.toFixed(1), a: +a.toFixed(2), b: +bb.toFixed(2), C: +Math.hypot(a, bb).toFixed(2)};
      E.renderFrame(s.start, W, H); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);   // the mask pass drew over the frame
    }
    const {scene, camera} = E.debug, T = camera.position.constructor;
    if (doSign) {
      const f = scene.getObjectByName('signFace'); f.updateWorldMatrix(true, false); f.geometry.computeBoundingBox(); const bx = f.geometry.boundingBox;
      let x0 = 1, x1 = 0, y0 = 1, y1 = 0; for (let i = 0; i < 8; i++) { const v = new T(i & 1 ? bx.max.x : bx.min.x, i & 2 ? bx.max.y : bx.min.y, i & 4 ? bx.max.z : bx.min.z).applyMatrix4(f.matrixWorld).project(camera); x0 = Math.min(x0, (v.x + 1) / 2); x1 = Math.max(x1, (v.x + 1) / 2); y0 = Math.min(y0, (1 - v.y) / 2); y1 = Math.max(y1, (1 - v.y) / 2); }
      const X0 = Math.floor(x0 * W), X1 = Math.ceil(x1 * W), Y0 = Math.floor(y0 * H), Y1 = Math.ceil(y1 * H), rows = [];
      for (let y = Math.max(0, Y0); y <= Math.min(H - 1, Y1); y++) { let k = 0; for (let x = Math.max(0, X0); x <= Math.min(W - 1, X1); x++) { const i = at(x, y), R = px[i], G = px[i + 1], B = px[i + 2], l = .2126 * R + .7152 * G + .0722 * B; if (l < 110 && Math.abs(R - G) < 20 && Math.abs(G - B) < 20) k++; } rows.push(k); }
      const top = Math.max(...rows), on = rows.map(k => k > .12 * top);   // ink rows: ≥ 12 % of the densest row (the gap between lines drops below it)
      const runs = []; let st = -1; on.forEach((v, i) => { if (v && st < 0) st = i; if (!v && st >= 0) { runs.push(i - st); st = -1; } }); if (st >= 0) runs.push(rows.length - st);
      const k390 = 390 / W; out.sign = {box: [x0, y0, x1, y1].map(v => +v.toFixed(3)), widthPx390: +((X1 - X0) * k390).toFixed(1), lineHeightsPx390: runs.filter(h => h * k390 >= 2).map(h => +(h * k390).toFixed(1))};
    }
    if (doPinch) { const o = scene.getObjectByName('indexB'); const p = o.getWorldPosition(new T()); const d = p.distanceTo(camera.position); out.pinch = {distance: +d.toFixed(2), pxPerStud390: +(390 / W * H / (2 * d * Math.tan(camera.fov * Math.PI / 360))).toFixed(2)}; }
    return out;
  }, [shotId, W, H, actors, doSign, doPinch]);
  if (doPinch) { const sh = J.shots.find(x => x.id === shotId); const ws = J.worldState, tS = (J.shots.slice(0, J.shots.indexOf(sh)).reduce((a, x) => a + x.frames, 0)) / (J.fps ?? 30);
    const pick = k => (ws[k] ?? []).filter(([t]) => t <= tS + 1e-6).at(-1)?.[1]; const g = pick('handGrip'), pose = pick('hand');
    r.pinch = {...r.pinch, pose, grip: g, gapStuds: +handGap(pose, g).toFixed(3), gapPx390: +(handGap(pose, g) * r.pinch.pxPerStud390).toFixed(1)}; }
  r.errors = errors; console.log(JSON.stringify(r));
} finally { await browser.close(); await server.close(); }
