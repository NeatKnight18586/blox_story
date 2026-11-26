// scripts/v2/city-gate.js — Phase 1A city gate: specs from the plan's anchors (never hand-typed), phone stills, measured sightlines,
// a top-down ortho of the whole island (district tints + landmark slots) and the plan outline drawn from plan.json.
//   node scripts/v2/city-gate.js [--specs-only] [--out renders/city1a]   → engine/fixtures/city/{gate,overview}.json,
//   <out>/{b,c,d}.png (390 × 693), <out>/overview.png, <out>/plan.png, review/city/1A-sightlines.json
// Sheet: python3 scripts/v2/city-sheet.py (→ review/city/1A-sheet.png, ≤ 1600 px).
import {mkdirSync, writeFileSync} from 'node:fs';
import {PLAN, anchor, landmarkSlots, pathPoints, toWorld, roadPaths} from '../../parts/city/plan.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('out', 'renders/city1a'), W = 390, Hh = 693;
const shot = (id, name) => { const a = anchor(name); return {id, size: 'wide', frames: 6, move: 'static-drift', drift: 0, anchor: name, from: {position: a.position, target: a.target, fov: a.fov}, shadowRadius: 40}; };
const base = {slug: 'city1a', fps: 24, format: 6, labels: false, world: 'parts/city/world.js', look4: 'cityDay', cast: {}};
const gate = {...base, note: 'Phase 1A gate cameras (written by scripts/v2/city-gate.js from parts/city/plan.json anchors).', shots: Object.entries(PLAN.gate).map(([id, n]) => shot(id, n))};
const overview = {...base, slug: 'city1a-overview', cityOverview: true, note: 'Phase 1A overview: terrain tinted by district (spec cityOverview).', shots: [shot('b', 'plazaSouth')]};
mkdirSync('engine/fixtures/city', {recursive: true});
writeFileSync('engine/fixtures/city/gate.json', JSON.stringify(gate, null, 1) + '\n'); writeFileSync('engine/fixtures/city/overview.json', JSON.stringify(overview, null, 1) + '\n');
if (argv.includes('--specs-only')) process.exit(0);

const {startServer} = await import('./server.js'), {launch} = await import('./browser.js');
mkdirSync(OUT, {recursive: true}); mkdirSync('review/city', {recursive: true});
const server = await startServer(process.cwd()), browser = await launch();
const save = (f, url) => writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
const open = async spec => { const p = await browser.newPage(); p.on('pageerror', e => console.error('pageerror', e.message)); await p.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(spec)}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 240000}); return p; };
try {
  const p = await open('engine/fixtures/city/gate.json'), sight = {};
  const bakeInfo = await p.evaluate(() => window.__episode.bake);
  for (const s of gate.shots) {
    const r = await p.evaluate(async ([cam, w, h]) => {
      const E = window.__episode, T = await import('three'), {scene, renderer, camera} = E.debug;
      const st = E.renderCamera(cam, 0, w, h, 'cityDay'); const url = renderer.domElement.toDataURL('image/png');
      // sightlines: sample each slot volume (grid over its box); on screen = inside the frame; seen = first ray hit is that slot
      const slots = {}; scene.traverse(o => { if (o.isMesh && /^slot:/.test(o.name)) { const id = o.name.split(':')[1]; (slots[id] ??= []).push(o); } });
      const ray = new T.Raycaster(), targets = []; scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !/sky|cloud|Foam|catcher|Water/i.test(o.name) && o.type !== 'Sprite') targets.push(o); });
      const res = {};
      for (const [id, ms] of Object.entries(slots)) {
        let inFrame = 0, seen = 0, n = 0; const bb = new T.Box3(); ms.forEach(m => bb.expandByObject(m));
        for (let i = 0; i <= 4; i++) for (let j = 0; j <= 6; j++) for (let k = 0; k <= 4; k++) {
          const q = new T.Vector3(bb.min.x + (bb.max.x - bb.min.x) * i / 4, bb.min.y + (bb.max.y - bb.min.y) * j / 6, bb.min.z + (bb.max.z - bb.min.z) * k / 4), ndc = q.clone().project(camera); n++;
          if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1 || ndc.z < -1) continue; inFrame++;
          const d = q.clone().sub(camera.position), L = d.length(); ray.set(camera.position, d.normalize()); ray.far = L + .5;
          const hit = ray.intersectObjects(targets, false)[0]; if (hit && ms.includes(hit.object) || (hit && hit.distance > L - .6)) seen++;
        }
        const c = bb.getCenter(new T.Vector3()).project(camera);
        res[id] = {inFrame: +(inFrame / n).toFixed(3), visible: +(seen / n).toFixed(3), ndc: [+c.x.toFixed(2), +c.y.toFixed(2)]};
      }
      const groups = {}; const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      scene.traverse(o => { if (!(o.isMesh || o.isInstancedMesh) || !o.visible) return; for (let q = o.parent; q; q = q.parent) if (!q.visible) return; if (o.geometry.boundingSphere == null) o.geometry.computeBoundingSphere(); if (!o.isInstancedMesh && !fr.intersectsObject(o)) return;
        let top = o; while (top.parent && top.parent.name !== 'city' && top.parent !== scene) top = top.parent; const key = (top.name || o.name).split(':')[0] + (top.name.includes(':') ? ':' + top.name.split(':')[1] : '');
        const tri = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); groups[key] = (groups[key] ?? 0) + tri; });
      // composition: re-render with flat class colours (sky = clear colour, water, hill, ground, lots, slots, trees) and count pixels
      const keep = [], rec = (o, m) => { keep.push([o, o.material]); o.material = m; }, flat = c => new T.MeshBasicMaterial({color: c, fog: false, toneMapped: false}), CL = {water: 0x0000ff, hill: 0x00ff00, ground: 0xffffff, build: 0xff0000, slot: 0xffff00, tree: 0x00ffff};
      const hid = [], colr = [], bg = scene.background, fogS = scene.fog, ph = new T.Color();
      scene.traverse(o => { if (!o.isMesh && !o.isInstancedMesh && !o.isPoints && !o.isSprite) return; const names = []; for (let q = o; q; q = q.parent) names.push(q.name || ''); const nm = names.join('/');
        if (/sky|cloud|Foam|catcher/i.test(nm) || o.isPoints || o.isSprite) { if (o.visible) { hid.push(o); o.visible = false; } return; }
        if (/cityWater/.test(nm)) return rec(o, flat(CL.water));
        if (/cityTerrain/.test(nm)) { const a = o.geometry.attributes.position, c = o.geometry.attributes.color, old = c.array.slice(); colr.push([c, old]); for (let i = 0; i < a.count; i++) { ph.setHex(a.getY(i) >= 32 ? CL.hill : CL.ground); c.setXYZ(i, ph.r, ph.g, ph.b); } c.needsUpdate = true; return rec(o, new T.MeshBasicMaterial({vertexColors: true, fog: false, toneMapped: false})); }
        if (/^slot:/.test(o.name)) return rec(o, flat(CL.slot));
        if (/cityVegetation|streetTrees|tree_/.test(nm)) return rec(o, flat(CL.tree));
        if (/district:/.test(nm) && !/roads|plazaPaving|duckRock/.test(nm)) return rec(o, flat(CL.build));
        rec(o, flat(CL.ground)); });
      scene.background = new T.Color(0xff00ff); scene.fog = null; renderer.setSize(w, h, false); renderer.render(scene, camera);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d', {willReadFrequently: true}); cx.drawImage(renderer.domElement, 0, 0, w, h); const px = cx.getImageData(0, 0, w, h).data;
      keep.forEach(([o, m]) => { o.material = m; }); colr.forEach(([c, old]) => { c.array.set(old); c.needsUpdate = true; }); hid.forEach(o => { o.visible = true; }); scene.background = bg; scene.fog = fogS;
      const cnt = {sky: 0, water: 0, hill: 0, ground: 0, build: 0, slot: 0, tree: 0, other: 0}, top = {hill: h, build: h, slot: h, tree: h};
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, code = (px[i] > 127 ? 4 : 0) + (px[i + 1] > 127 ? 2 : 0) + (px[i + 2] > 127 ? 1 : 0), k = ['other', 'water', 'hill', 'tree', 'build', 'sky', 'slot', 'ground'][code]; cnt[k]++; if (top[k] !== undefined && y < top[k]) top[k] = y; }
      const N = w * h, pc = k => +(cnt[k] / N * 100).toFixed(1), crest = Math.min(top.hill, top.tree);
      const comp = {skyPct: pc('sky'), waterPct: pc('water'), otherPct: +(100 - pc('sky') - pc('water')).toFixed(1), hillPct: pc('hill'), hillsAboveRoofLots: +((top.build - crest) / h * 100).toFixed(1), hillsAboveRoofAll: +((Math.min(top.build, top.slot) - crest) / h * 100).toFixed(1), classes: Object.fromEntries(Object.keys(cnt).map(k => [k, pc(k)]))};
      return {url, st, res, groups, comp};
    }, [s.from, W, Hh]);
    save(`${OUT}/${s.id}.png`, r.url);
    const onScreen = Object.entries(r.res).filter(([, v]) => v.visible >= .02).map(([k]) => k);
    sight[s.id] = {anchor: s.anchor, onScreen, pass: onScreen.length >= 2 && (s.id !== 'b' || onScreen.includes('5')) && (s.id !== 'e' || (onScreen.includes('2') && onScreen.includes('8'))), comp: r.comp, triangles: r.st.triangles, calls: r.st.calls, slots: r.res};
    console.log(s.id, s.anchor, 'slots on screen:', onScreen.join(','), JSON.stringify(r.comp), 'tris', r.st.triangles, JSON.stringify(Object.fromEntries(Object.entries(r.groups).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]).slice(0, 8))));
  }
  writeFileSync('review/city/1A-sightlines.json', JSON.stringify({rule: 'slot visible ≥ 2 % of its sampled volume points (in frame and first ray hit)', bake: bakeInfo, shots: sight}, null, 1) + '\n');
  await p.close();
  // top-down ortho + plan outline
  const q = await open('engine/fixtures/city/overview.json');
  const urls = await q.evaluate(async ([plan, slots, roads, coast, hills, bay]) => {
    const E = window.__episode, T = await import('three'), {scene, renderer} = E.debug, S = 760;
    E.renderCamera({position: [0, 600, 20], target: [0, 0, 19.9], fov: 40, up: [0, 0, -1]}, 0, S, S, 'cityDay');
    scene.traverse(o => { if (/cloud/i.test(o.name)) o.visible = false; }); const fog = scene.fog; scene.fog = null;
    const cam = new T.OrthographicCamera(-350, 350, 330, -370, 1, 2000); cam.position.set(0, 800, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.position.z = -20; cam.updateMatrixWorld();
    renderer.setSize(S, S, false); renderer.render(scene, cam); const top = renderer.domElement.toDataURL('image/png'); scene.fog = fog;
    // plan outline (map px space, 2 px per map px)
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), k = S / 700, X = x => (x + 350) * k, Z = z => (z + 350) * k;
    g.fillStyle = '#eaf4fb'; g.fillRect(0, 0, S, S);
    const poly = (pts, close, fill, stroke, lw = 2) => { g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); if (close) g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    poly(coast, true, '#cfe6b8', '#2b4a5a', 2.5);
    const D = plan.districts, w = p => [(p[0] - 191) * 2, (p[1] - 154) * 2];
    for (const [key, d] of Object.entries(D)) { g.globalAlpha = .45; if (d.rect) { const a = w([d.rect[0], d.rect[1]]), b = w([d.rect[2], d.rect[3]]); g.fillStyle = d.tint; g.fillRect(X(a[0]), Z(a[1]), (b[0] - a[0]) * k, (b[1] - a[1]) * k); }
      if (d.circle) { const c0 = w(d.circle); g.fillStyle = d.tint; g.beginPath(); g.arc(X(c0[0]), Z(c0[1]), d.circle[2] * 2 * k, 0, 7); g.fill(); } g.globalAlpha = 1; void key; }
    poly(hills, false, null, '#3f8f4a', 3);
    for (const r of Object.values(roads)) poly(r.pts, false, null, r.kind === 'planks' ? '#a0703a' : '#444', r.w * k);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X(0), Z(0), 32 * k, 0, 7); g.fill(); g.strokeStyle = '#444'; g.lineWidth = 1.5; g.stroke();
    for (const s of slots) { g.fillStyle = '#6b6e73'; g.fillRect(X(s.at[0] - s.fp[0] / 2), Z(s.at[1] - s.fp[1] / 2), s.fp[0] * k, s.fp[1] * k); if (s.tower) g.fillRect(X(s.tower.at[0] - s.tower.fp[0] / 2), Z(s.tower.at[1] - s.tower.fp[1] / 2), s.tower.fp[0] * k, s.tower.fp[1] * k);
      g.fillStyle = '#111'; g.font = 'bold 15px sans-serif'; g.fillText(s.id, X(s.at[0]) + 7, Z(s.at[1]) - 6); }
    for (const a of Object.values(plan.anchors)) { const p = w(a.at), l = w(a.look); g.strokeStyle = '#d0306a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(p[0]), Z(p[1])); const dx = l[0] - p[0], dz = l[1] - p[1], L = Math.hypot(dx, dz); g.lineTo(X(p[0] + dx / L * 40), Z(p[1] + dz / L * 40)); g.stroke(); g.fillStyle = '#d0306a'; g.beginPath(); g.arc(X(p[0]), Z(p[1]), 4, 0, 7); g.fill(); }
    return {top, plan: c.toDataURL('image/png')};
  }, [PLAN, landmarkSlots(), roadPaths(), pathPoints(PLAN.coast).map(toWorld), pathPoints(PLAN.hillsLine).map(toWorld), pathPoints(PLAN.bayShore).map(toWorld)]);
  save(`${OUT}/overview.png`, urls.top); save(`${OUT}/plan.png`, urls.plan);
  await q.close();
} finally { await browser.close(); server.close?.(); }
