// scripts/v2/look-gate.js — Look Signature gate (city): cityDay2 × outline off / classic / classicPlus on the four key-art cameras,
// HERO + 2 troupe kids posed (idle) at each key-art subject point, the living town on (each anchor's keyArt.movers), measures + bench.
//   node scripts/v2/look-gate.js [--out renders/look] [--review review/city] [--prefix LOOK] [--no-motion] [--no-bench] [--rows a,b]
// Writes engine/fixtures/city/look.json (spec, from plan.json keyArt: never hand-typed), <out>/<row>_<A|B|C>.png (720 × 1280),
// <out>/motion/*.png (bayNorth, 4 s, 270 × 480, look C) → <review>/<prefix>-motion.mp4, <review>/<prefix>-measures.json.
// Sheets: python3 scripts/v2/look-sheet.py --dir <out> --measures <review>/<prefix>-measures.json --out <review>/<prefix>-sheet.png
// Key-art measures (pass on all 4): near layer ≥ 8 % of pixels closer than 8 studs; the hero group's centre ≤ 12 % of the frame width
// from a third line. Bench (look C, 720 × 1280): ≤ 90k tris, ≤ 0.62 s/frame; outline cost = median(C) − median(off) ≤ 0.06 s;
// living movers ≤ 8k tris in frame, ≤ 3 movers in frame.
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {keyArt, screenX} from '../../parts/city/plan.js';
import {blimpAt} from '../../parts/city/living.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/look'), REV = arg('review', 'review/city'), PRE = arg('prefix', 'LOOK');
const ROWS = (arg('rows', 'bayNorth,plazaWide,mainSt,heroHouse')).split(','), COLS = {A: 'off', B: 'classic', C: 'classicPlus'}, W = 720, H = 1280;
const T0 = Object.fromEntries(ROWS.map((r, i) => [r, i * 100]));
// the blimp in frame for the motion clip (bayNorth key art): first t whose 4 s window keeps the blimp inside the upper frame
const KB = keyArt('bayNorth'), inFrame = t => { const p = blimpAt(t).pos, x = screenX(KB, p), v = p.map((q, i) => q - KB.position[i]), f = KB.target.map((q, i) => q - KB.position[i]), fl = Math.hypot(...f);
  const z = (v[0] * f[0] + v[1] * f[1] + v[2] * f[2]) / fl, ya = Math.atan2(v[1], Math.hypot(v[0], v[2])) - Math.asin(f[1] / fl), ny = Math.tan(ya) / Math.tan(KB.fov * Math.PI / 360);
  return z > 0 && x > .12 && x < .88 && ny < .8 && ny > .1; };
let TM = 0; for (let t = 0; t < 360; t += .5) if (inFrame(t) && inFrame(t + 4)) { TM = t; break; }
// the group: HERO on the subject point facing the lens, two kids either side and a little behind
const cast = {}, members = [['hero', 'HERO', 0, 0, 0], ['kidL', 'LITTLE', -1.55, 1.1, 18], ['kidS', 'SECOND', 1.55, 1.3, -14]];
for (const [name, troupe, side, back, turn] of members) {
  const marks = ROWS.map(r => { const k = keyArt(r), F = [Math.sin(k.yaw), Math.cos(k.yaw)], R = [-F[1], F[0]], yaw = Math.atan2(-F[0], -F[1]) * 180 / Math.PI + turn;
    return [T0[r], {at: 'ka_' + r, offset: [R[0] * side + F[0] * back, 0, R[1] * side + F[1] * back], yaw: +yaw.toFixed(1)}]; });
  cast[name] = {troupe, style: 'v5', faceStyle: 'v6', at: marks[0][1].at, offset: marks[0][1].offset, yaw: marks[0][1].yaw, keys: [[0, 'idle']], marks};
}
const spec = {slug: 'citylook', fps: 24, format: 6, labels: false, world: 'parts/city/world.js', look4: 'cityDay2', outline: 'off', rig: 'r6', cityKeyArt: ROWS, cityLiving: true, cast,
  note: 'Look Signature gate (scripts/v2/look-gate.js from plan.json keyArt anchors): HERO + LITTLE + SECOND at each key-art subject, t = 100 × row.',
  shots: ROWS.map((r, i) => { const k = keyArt(r); return {id: 'k' + i, size: 'wide', frames: 6, move: 'static-drift', drift: 0, from: {position: k.position, target: k.target, fov: k.fov}, shadowRadius: 30}; })};
mkdirSync('engine/fixtures/city', {recursive: true}); writeFileSync('engine/fixtures/city/look.json', JSON.stringify(spec, null, 1) + '\n');
if (argv.includes('--specs-only')) process.exit(0);

const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
mkdirSync(OUT, {recursive: true}); mkdirSync(REV, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch();
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = {rule: 'near ≥ 8 % px < 8 studs; group centre ≤ 0.12 W from a third line; look C ≤ 90k tris, ≤ 0.62 s/frame; outline ≤ +0.06 s; living ≤ 8k tris + ≤ 3 movers in frame', motionT0: TM, rows: {}};
try {
  const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent('engine/fixtures/city/look.json')}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 300000});
  for (const r of ROWS) {
    const k = keyArt(r), cam = {position: k.position, target: k.target, fov: k.fov, shadowRadius: 30};
    const res = await p.evaluate(async ([cam, t, w, h, cols, movers, bench]) => {
      const E = window.__episode, T = await import('three'), {scene, renderer, camera} = E.debug; E.cityLiving?.setFocus(movers);
      const shots = {}; for (const [c, mode] of Object.entries(cols)) { E.outline.set(mode); const st = E.renderCamera(cam, t, w, h, 'cityDay2'); shots[c] = {url: renderer.domElement.toDataURL('image/png'), triangles: st.triangles, calls: st.calls}; }
      E.outline.set('off'); E.renderCamera(cam, t, w, h, 'cityDay2');
      // pass helper: every mesh drawn with material m (sky / clouds / sprites / points hidden), read back as floats
      const pass = (matFor, clear) => { const hid = [], keep = []; scene.traverse(o => { if (!o.visible) return; if (o.isSprite || o.isPoints || o.isLine || /^(sky|clouds4|clouds4small|sunRays)$/.test(o.name)) { hid.push(o); o.visible = false; return; } if (o.isMesh || o.isInstancedMesh) { keep.push([o, o.material]); o.material = matFor(o); } });
        const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; const rt = new T.WebGLRenderTarget(w, h, {type: T.FloatType}); renderer.setRenderTarget(rt); renderer.setClearColor(new T.Color(clear, 0, 0), 1); renderer.clear(); renderer.render(scene, camera);
        const b = new Float32Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, b); renderer.setRenderTarget(null); rt.dispose(); keep.forEach(([o, m]) => { o.material = m; }); hid.forEach(o => { o.visible = true; }); scene.background = bg; scene.fog = fog; return b; };
      const VS = 'varying float vD;\n#include <common>\nvoid main(){\n#include <begin_vertex>\n#include <project_vertex>\n vD = length(mvPosition.xyz); }';
      const dist = new T.ShaderMaterial({vertexShader: VS, fragmentShader: 'varying float vD; void main(){ gl_FragColor = vec4(vD, 0., 0., 1.); }', side: T.DoubleSide});
      const one = new T.MeshBasicMaterial({color: 0xffffff, side: T.DoubleSide}), zero = new T.MeshBasicMaterial({color: 0x000000, side: T.DoubleSide});
      const inLiving = o => { for (let q = o; q; q = q.parent) if (q.name === 'cityLiving') return true; return false; };
      const db = pass(() => dist, 1e6); let near = 0; for (let i = 0; i < w * h; i++) if (db[i * 4] < 8) near++;
      const mb = pass(o => o.userData.olChar && !inLiving(o) ? one : zero, 0); let n = 0, sx = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mb[(y * w + x) * 4] > .5) { const yy = h - 1 - y; n++; sx += x; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }   // GL rows are bottom-up
      // living movers in frame: triangles of visible living meshes inside the frustum, and how many movers that is
      camera.updateMatrixWorld(); const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)), mv = {};
      scene.getObjectByName('cityLiving')?.children.forEach(g => { if (!g.visible) return; let tri = 0; g.traverse(o => { if (!(o.isMesh || o.isInstancedMesh) || !o.visible) return; for (let q = o; q; q = q.parent) if (!q.visible) return;
        let s; if (o.isInstancedMesh) { o.computeBoundingSphere(); s = o.boundingSphere.clone().applyMatrix4(o.matrixWorld); } else { o.geometry.boundingSphere ?? o.geometry.computeBoundingSphere(); s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); } if (!fr.intersectsSphere(s)) return;
        tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); if (tri) mv[g.name.replace('living:', '')] = Math.round(tri); });
      const timing = {};
      if (bench) { for (const m of ['off', 'classic', 'classicPlus']) timing[m] = []; for (let i = 0; i < 7; i++) for (const mode of ['off', 'classic', 'classicPlus']) { E.outline.set(mode); timing[mode].push(E.renderCamera(cam, t, w, h, 'cityDay2').ms); } }   // interleaved: drift hits every mode alike
      E.outline.set('off');
      return {shots, nearFrac: near / (w * h), group: n ? {px: n, cx: sx / n / w, box: [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h]} : null, movers: mv, timing};
    }, [cam, T0[r] + .5, W, H, COLS, k.movers, !argv.includes('--no-bench')]);
    for (const [c, s] of Object.entries(res.shots)) save(`${OUT}/${r}_${c}.png`, s.url);
    const cx = res.group?.cx ?? -1, thirdErr = Math.min(Math.abs(cx - 1 / 3), Math.abs(cx - 2 / 3)), tC = res.timing.classicPlus ? median(res.timing.classicPlus) / 1000 : null, tOff = res.timing.off ? median(res.timing.off) / 1000 : null;
    const moverTris = Object.values(res.movers).reduce((a, b) => a + b, 0);
    const row = {keyArt: {position: k.position.map(v => +v.toFixed(2)), target: k.target.map(v => +v.toFixed(2)), fov: k.fov, third: k.third, fg: k.fg.kind, fgDist: k.fg.d, movers: k.movers},
      nearFrac: +res.nearFrac.toFixed(4), groupCentreX: +cx.toFixed(4), thirdErr: +thirdErr.toFixed(4), groupBox: res.group?.box.map(v => +v.toFixed(3)),
      keyArtPass: res.nearFrac >= .08 && thirdErr <= .12, triangles: res.shots.C.triangles, calls: res.shots.C.calls,
      sPerFrameC: tC && +tC.toFixed(3), sPerFrameOff: tOff && +tOff.toFixed(3), outlineCost: {classic: res.timing.classic ? +((median(res.timing.classic) - median(res.timing.off)) / 1000).toFixed(3) : null, classicPlus: tC && +(tC - tOff).toFixed(3)},
      moversInFrame: res.movers, moverTris, benchPass: res.shots.C.triangles <= 90000 && (tC == null || tC <= .62), livingPass: moverTris <= 8000 && Object.keys(res.movers).length <= 3};
    out.rows[r] = row; console.log(r, JSON.stringify(row));
  }
  if (!argv.includes('--no-motion')) {
    const k = KB, cam = {position: k.position, target: k.target, fov: k.fov, shadowRadius: 30}, md = `${OUT}/motion`; rmSync(md, {recursive: true, force: true}); mkdirSync(md, {recursive: true});
    await p.evaluate(m => { window.__episode.outline.set('classicPlus'); window.__episode.cityLiving?.setFocus(m); }, k.movers);
    const ms = [];
    for (let f = 0; f < 96; f++) { const r = await p.evaluate(async ([cam, t]) => { const st = window.__episode.renderCamera(cam, t, 270, 480, 'cityDay2'); return {url: window.__episode.debug.renderer.domElement.toDataURL('image/png'), ms: st.ms}; }, [cam, TM + f / 24]);
      save(`${md}/f${String(f).padStart(3, '0')}.png`, r.url); ms.push(r.ms); }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', `${md}/f%03d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', `${REV}/${PRE}-motion.mp4`]);
    out.motion = {anchor: 'bayNorth', t0: TM, frames: 96, size: [270, 480], outline: 'classicPlus', movers: k.movers, msMedian: Math.round(median(ms))};
  }
  out.pass = {keyArt: ROWS.every(r => out.rows[r].keyArtPass), bench: ROWS.every(r => out.rows[r].benchPass), living: ROWS.every(r => out.rows[r].livingPass),
    outline: ROWS.every(r => (out.rows[r].outlineCost.classicPlus ?? 0) <= .06)};
  writeFileSync(`${REV}/${PRE}-measures.json`, JSON.stringify(out, null, 1) + '\n'); console.log('PASS', JSON.stringify(out.pass));
  await p.close();
} finally { await browser.close(); server.close?.(); }
