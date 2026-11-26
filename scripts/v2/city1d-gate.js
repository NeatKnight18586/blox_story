// scripts/v2/city1d-gate.js — Phase 1D city gate (look B = cityDay2 + outline classic, the city default): every key-art anchor once at
// 270 × 480 with the hero group posed per the STAGING RULE (plan.json keyArtStaging), plus the gate rows (plan.json gate1d) at phone 390
// and the bench at 720 × 1280.
//   node scripts/v2/city1d-gate.js [--out renders/city1d] [--review review/city] [--rows a,b] [--no-bench] [--specs-only]
// Writes engine/fixtures/city/gate1d.json (spec from plan.json; never hand-typed), <out>/all/<anchor>.png (270 × 480), <out>/phone/<anchor>.png
// (390 × 693), <review>/1D-measures.json. Sheets: python3 scripts/v2/city1d-sheet.py --dir <out> --measures <review>/1D-measures.json.
// Measures per anchor (mask passes, characters included as occluders):
//   heroH = hero silhouette height / frame height (≤ maxHeroH); landmark = the anchor's keyArt.landmark slot visible fraction (sightline
//   sampling: in frame and first ray hit, ≥ landmarkMin); kids = each kid's unoccluded share of its own silhouette (≥ kidVisible) and its
//   box overlap with the hero box (beside, not behind); sightlines = slots visible ≥ 2 %; duckFrac = slot-5 pixels / frame (duckClose ≥ 4 %).
// Bench (gate rows, 720 × 1280, look B): frustum tris ≤ 90k, median s/frame ≤ 0.62; outline cost = median(classic) − median(off).
import {mkdirSync, writeFileSync} from 'node:fs';
import {PLAN, keyArt, keyArtGroup, STAGING, ANCHOR_NAMES, screenX} from '../../parts/city/plan.js';
import {blimpAt} from '../../parts/city/living.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/city1d'), REV = arg('review', 'review/city'), GATE = Object.values(PLAN.gate1d);
const ROWS = arg('rows', null)?.split(',') ?? ANCHOR_NAMES, T0 = Object.fromEntries(ROWS.map((r, i) => [r, i * 100]));
const cast = {};
for (const [name, troupe] of keyArtGroup()) {
  const marks = ROWS.map(r => { const k = keyArt(r), [, , side, back, turn] = keyArtGroup(STAGING, k.third).find(m => m[0] === name), F = [Math.sin(k.yaw), Math.cos(k.yaw)], R = [-F[1], F[0]], yaw = Math.atan2(-F[0], -F[1]) * 180 / Math.PI + turn;
    return [T0[r], {at: 'ka_' + r, offset: [+(R[0] * side + F[0] * back).toFixed(3), 0, +(R[1] * side + F[1] * back).toFixed(3)], yaw: +yaw.toFixed(1)}]; });
  cast[name] = {troupe, style: 'v5', faceStyle: 'v6', at: marks[0][1].at, offset: marks[0][1].offset, yaw: marks[0][1].yaw, keys: [[0, 'idle']], marks};
}
const spec = {slug: 'city1d', fps: 24, format: 6, labels: false, world: 'parts/city/world.js', look4: 'cityDay2', rig: 'r6', cityKeyArt: ROWS, cityLiving: true, cast,
  note: 'Phase 1D gate (scripts/v2/city1d-gate.js from plan.json keyArt + keyArtStaging): HERO + LITTLE + SECOND beside each other at every key-art subject, t = 100 × row; look B (cityDay2 + outline classic).',
  shots: ROWS.map((r, i) => { const k = keyArt(r); return {id: 'k' + i, size: 'wide', frames: 6, move: 'static-drift', drift: 0, from: {position: k.position, target: k.target, fov: k.fov}, shadowRadius: 30}; })};
mkdirSync('engine/fixtures/city', {recursive: true}); writeFileSync('engine/fixtures/city/gate1d.json', JSON.stringify(spec, null, 1) + '\n');
if (argv.includes('--specs-only')) process.exit(0);

// blimp drift (pure): screen travel of the blimp over a 4 s window in bayNorth key art, at the first t it is in frame
const KB = keyArt('bayNorth'), proj = p => { const f = KB.target.map((v, i) => v - KB.position[i]), L = Math.hypot(...f), F = f.map(v => v / L), v = p.map((q, i) => q - KB.position[i]), z = v[0] * F[0] + v[1] * F[1] + v[2] * F[2]; return {x: screenX(KB, p), z}; };
let drift = null; for (let t = 0; t < PLAN.living.blimp.period; t += .5) { const a = proj(blimpAt(t).pos), b = proj(blimpAt(t + 4).pos); if (a.z > 0 && b.z > 0 && a.x > .1 && a.x < .9 && b.x > .1 && b.x < .9) { drift = {t0: t, dxFrac: +Math.abs(b.x - a.x).toFixed(3), period: PLAN.living.blimp.period}; break; } }

const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
for (const d of ['all', 'phone', 'bench']) mkdirSync(`${OUT}/${d}`, {recursive: true}); mkdirSync(REV, {recursive: true});
const server = await startServer(process.cwd()), browser = await launch();
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = {rule: `staging: heroH ≤ ${STAGING.maxHeroH}, landmark slot visible ≥ ${STAGING.landmarkMin}, each kid ≥ ${STAGING.kidVisible} of its silhouette unoccluded + its centre outside the hero's screen box; sightlines ≥ 2 slots (harborDock/diner/beach); duckClose slot 5 ≥ 4 % of frame; bench (gate rows, 720 × 1280, look B) ≤ 90k tris, ≤ 0.62 s/frame`,
  staging: STAGING, blimpDrift: drift, rows: {}};
try {
  const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.error('console', m.text().slice(0, 300)); });
  await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent('engine/fixtures/city/gate1d.json')}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 600000});
  out.textures = await p.evaluate(() => { const s = new Set(); window.__episode.debug.scene.traverse(o => { if (o.isMesh) for (const m of [o.material].flat()) if (m?.userData?.source) s.add(m.userData.source); }); return [...s].sort(); });
  for (const r of ROWS) {
    const k = keyArt(r), cam = {position: k.position, target: k.target, fov: k.fov, shadowRadius: 30}, gate = GATE.includes(r);
    const res = await p.evaluate(async ([cam, t, movers, landmark, gate, bench]) => {
      const E = window.__episode, T = await import('three'), {scene, renderer, camera} = E.debug; E.cityLiving?.setFocus(movers);
      const shot = (w, h) => { const st = E.renderCamera(cam, t, w, h, 'cityDay2'); return {url: renderer.domElement.toDataURL('image/png'), st}; };
      const W = 270, H = 480, small = shot(W, H);
      const roots = E.castRoots(), owner = o => { for (let q = o; q; q = q.parent) for (const [n, r] of Object.entries(roots)) if (q === r) return n; return null; };
      // mask pass: every mesh flat-coloured by matFor(o) (null = hidden), sky/sprites/points hidden; returns RGBA bytes (top-down)
      const pass = matFor => { const keep = [], hid = []; scene.traverse(o => { if (!(o.isMesh || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine)) return; if (!o.visible) return;
          const m = o.isSprite || o.isPoints || o.isLine || /^(sky|clouds4|clouds4small|sunRays)$/.test(o.name) || [].concat(o.material).some(x => x?.transparent) ? null : matFor(o);
          if (!m) { hid.push(o); o.visible = false; return; } keep.push([o, o.material]); o.material = m; });
        const bg = scene.background, fog = scene.fog; scene.background = new T.Color(0); scene.fog = null; const ol = E.outline?.mode; E.outline?.set('off');
        renderer.setSize(W, H, false); renderer.render(scene, camera); const px = new Uint8Array(W * H * 4), gl = renderer.getContext(); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        keep.forEach(([o, m]) => { o.material = m; }); hid.forEach(o => { o.visible = true; }); scene.background = bg; scene.fog = fog; if (ol) E.outline.set(ol);
        const top = new Uint8Array(W * H * 4); for (let y = 0; y < H; y++) top.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); return top; };
      const flat = c => new T.MeshBasicMaterial({color: c, fog: false, toneMapped: false, side: T.DoubleSide}), CH = {hero: flat(0xff0000), kidL: flat(0x00ff00), kidS: flat(0x0000ff)}, BLACK = flat(0), WHITE = flat(0xffffff);
      const count = (px, ch) => { let n = 0, x0 = W, x1 = -1, y0 = H, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = px[(y * W + x) * 4 + ch]; if (v > 127 && px[(y * W + x) * 4 + (ch + 1) % 3] < 128) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return {n, box: n ? [x0 / W, y0 / H, (x1 + 1) / W, (y1 + 1) / H] : null}; };
      const vis = pass(o => CH[owner(o)] ?? BLACK), chars = {};
      for (const [n, c] of [['hero', 0], ['kidL', 1], ['kidS', 2]]) { const alone = count(pass(o => owner(o) === n ? CH[n] : null), c), seen = count(vis, c); chars[n] = {alone: alone.n, seen: seen.n, box: alone.box, share: alone.n ? seen.n / alone.n : 0}; }
      const ov = (a, b) => { if (!a || !b) return 0; const w = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); return w * h / Math.max(1e-9, (a[2] - a[0]) * (a[3] - a[1])); };
      for (const n of ['kidL', 'kidS']) { chars[n].overlapHero = ov(chars[n].box, chars.hero.box); const b = chars[n].box, h = chars.hero.box, cx = b ? (b[0] + b[2]) / 2 : -1; chars[n].beside = !!b && !!h && (cx < h[0] || cx > h[2]); }
      // sightlines: every slot (grid samples in its box; in frame + first ray hit, characters included)
      camera.updateMatrixWorld(); const slots = {}; scene.traverse(o => { if (o.isMesh && /^slot:/.test(o.name) && o.visible) { const id = o.name.split(':')[1]; (slots[id] ??= []).push(o); } });
      const ray = new T.Raycaster(), targets = []; scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !/sky|cloud|Foam|catcher|Water|beam|lantern|glass/i.test(o.name) && ![].concat(o.material).some(m => m?.transparent)) { for (let q = o.parent; q; q = q.parent) if (!q.visible) return; targets.push(o); } });
      const sl = {};
      for (const [id, ms] of Object.entries(slots)) { let inF = 0, seen = 0, n = 0; const bb = new T.Box3(); ms.forEach(m => bb.expandByObject(m));
        for (let i = 0; i <= 4; i++) for (let j = 0; j <= 6; j++) for (let kk = 0; kk <= 4; kk++) { const q = new T.Vector3(bb.min.x + (bb.max.x - bb.min.x) * i / 4, bb.min.y + (bb.max.y - bb.min.y) * j / 6, bb.min.z + (bb.max.z - bb.min.z) * kk / 4), ndc = q.clone().project(camera); n++;
          if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1 || ndc.z < -1) continue; inF++; const d = q.clone().sub(camera.position), L = d.length(); ray.set(camera.position, d.normalize()); ray.far = L + .5;
          const hit = ray.intersectObjects(targets, false)[0]; if ((hit && ms.includes(hit.object)) || (hit && hit.distance > L - .6) || !hit) seen++; }
        sl[id] = {inFrame: +(inF / n).toFixed(3), visible: +(seen / n).toFixed(3)}; }
      // landmark + duck pixel share (slot-n meshes white, everything else black, depth-tested)
      const slotPx = id => { const px = pass(o => new RegExp('^slot:' + id + '(:|$)').test(o.name) ? WHITE : BLACK); let n = 0; for (let i = 0; i < W * H; i++) if (px[i * 4] > 127) n++; return n / (W * H); };
      const lmPx = landmark ? slotPx(landmark) : null;
      // movers in frame (living groups with any mesh in the frustum)
      const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)), mv = [];
      scene.getObjectByName('cityLiving')?.children.forEach(g => { if (!g.visible) return; let hit = false; g.traverse(o => { if (hit || !(o.isMesh || o.isInstancedMesh) || !o.visible) return; let s; if (o.isInstancedMesh) { o.computeBoundingSphere(); s = o.boundingSphere.clone().applyMatrix4(o.matrixWorld); } else { o.geometry.boundingSphere ?? o.geometry.computeBoundingSphere(); s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); } if (fr.intersectsSphere(s)) hit = true; }); if (hit) mv.push(g.name.replace('living:', '')); });
      const r = {small: small.url, chars, sight: sl, lmPx, movers: mv, smallTris: small.st.triangles};
      if (gate) { r.phone = shot(390, 693).url;
        if (bench) { const tm = {off: [], classic: []}; for (let i = 0; i < 5; i++) for (const m of ['off', 'classic']) { E.outline.set(m); tm[m].push(E.renderCamera(cam, t, 720, 1280, 'cityDay2').ms); } E.outline.set('classic');
          const st = E.renderCamera(cam, t, 720, 1280, 'cityDay2'); r.bench = {tris: st.triangles, calls: st.calls, tm}; r.big = renderer.domElement.toDataURL('image/png'); } }
      return r;
    }, [cam, T0[r] + .5, k.movers, k.landmark, gate, !argv.includes('--no-bench')]);
    save(`${OUT}/all/${r}.png`, res.small); if (res.phone) save(`${OUT}/phone/${r}.png`, res.phone); if (res.big) save(`${OUT}/bench/${r}.png`, res.big);
    const S = STAGING, ch = res.chars, onScreen = Object.entries(res.sight).filter(([, v]) => v.visible >= .02).map(([id]) => id).sort();
    const lmVis = k.landmark ? res.sight[k.landmark]?.visible ?? 0 : null;
    const checks = {heroH: !!ch.hero.box && ch.hero.box[3] - Math.max(0, ch.hero.box[1]) <= S.maxHeroH, landmark: k.landmark == null || lmVis >= S.landmarkMin,
      kids: ['kidL', 'kidS'].every(n => ch[n].alone > 0 && ch[n].share >= S.kidVisible && ch[n].beside),
      sightlines: !['harborDock', 'diner', 'beach'].includes(r) || onScreen.length >= 2, duck: r !== 'duckClose' || (res.lmPx ?? 0) >= .04, movers: res.movers.length <= 3};
    const row = {gate: GATE.includes(r), landmark: k.landmark, heroH: ch.hero.box ? +(ch.hero.box[3] - ch.hero.box[1]).toFixed(3) : null, landmarkVisible: lmVis, landmarkPx: res.lmPx == null ? null : +res.lmPx.toFixed(4),
      kids: Object.fromEntries(['kidL', 'kidS'].map(n => [n, {share: +ch[n].share.toFixed(3), beside: ch[n].beside, overlapHero: +ch[n].overlapHero.toFixed(3)}])), onScreen, movers: res.movers, checks, pass: Object.values(checks).every(Boolean)};
    if (res.bench) { const b = res.bench, mc = median(b.tm.classic) / 1000, mo = median(b.tm.off) / 1000; row.bench = {tris: b.tris, calls: b.calls, sPerFrame: +mc.toFixed(3), sPerFrameOff: +mo.toFixed(3), outlineCost: +(mc - mo).toFixed(3), pass: b.tris <= 90000 && mc <= .62}; }
    out.rows[r] = row; console.log(r, JSON.stringify(row));
  }
  const R = Object.values(out.rows);
  out.pass = {staging: R.every(x => x.checks.heroH && x.checks.landmark && x.checks.kids), sightlines: R.every(x => x.checks.sightlines), duck: out.rows.duckClose?.checks.duck ?? null,
    bench: R.filter(x => x.bench).every(x => x.bench.pass), movers: R.every(x => x.checks.movers), blimpDrift: (drift?.dxFrac ?? 0) >= .03};
  out.fails = Object.entries(out.rows).filter(([, x]) => !x.pass).map(([n, x]) => n + ': ' + Object.entries(x.checks).filter(([, v]) => !v).map(([c]) => c).join('+'));
  writeFileSync(`${REV}/1D-measures.json`, JSON.stringify(out, null, 1) + '\n'); console.log('PASS', JSON.stringify(out.pass), 'FAILS', JSON.stringify(out.fails));
  await p.close();
} finally { await browser.close(); server.close?.(); }
