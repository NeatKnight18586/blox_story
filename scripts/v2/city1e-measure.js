// scripts/v2/city1e-measure.js — Phase 1E: the in-page key-art measures shared by city1e-gate.js (the gate) and city1e-tune.js (the data tuner).
//   measure(page, row, t, look, {gate, bench, small, cam}) → raw measures · verdict(row, keyArt, raw) → checks + row summary
import {keyArt, keyArtGroup, STAGING} from '../../parts/city/plan.js';
export const castFor = rows => { const T0 = Object.fromEntries(rows.map((r, i) => [r, i * 100])), cast = {};
  for (const [name, troupe] of keyArtGroup()) {
    const marks = rows.map(r => { const k = keyArt(r), [, , side, back, turn] = keyArtGroup(STAGING, k.third).find(m => m[0] === name), F = [Math.sin(k.yaw), Math.cos(k.yaw)], R = [-F[1], F[0]], yaw = Math.atan2(-F[0], -F[1]) * 180 / Math.PI + turn;
      return [T0[r], {at: 'ka_' + r, offset: [+(R[0] * side + F[0] * back).toFixed(3), 0, +(R[1] * side + F[1] * back).toFixed(3)], yaw: +yaw.toFixed(1)}]; });
    cast[name] = {troupe, style: 'v5', faceStyle: 'v6', at: marks[0][1].at, offset: marks[0][1].offset, yaw: marks[0][1].yaw, keys: [[0, 'idle']], marks};
  } return {cast, T0}; };
export const specFor = (rows, look) => { const {cast} = castFor(rows); return {slug: 'city1e', fps: 24, format: 6, labels: false, world: 'parts/city/world.js', look4: look, rig: 'r6', cityKeyArt: rows, cityLiving: true, cast,
  note: `Phase 1E gate (scripts/v2/city1e-gate.js from plan.json keyArt + keyArtStaging): HERO + LITTLE + SECOND beside each other at every key-art subject, t = 100 × row; look ${look} + outline classic.`,
  shots: rows.map((r, i) => { const k = keyArt(r); return {id: 'k' + i, size: 'wide', frames: 6, move: 'static-drift', drift: 0, from: {position: k.position, target: k.target, fov: k.fov}, shadowRadius: 30}; })}; };
export const GROUND_MAX = STAGING.groundMax ?? .25, FG = STAGING.fg ?? {min: .05, max: .15, edge: .01};
// in-page measure of one key-art row (look name, small + optional phone + bench)
export async function measure(p, r, t, look, {gate, bench, small = true, cam: camIn = null}) {
  const k = keyArt(r), cam = camIn ?? {position: k.position, target: k.target, fov: k.fov, shadowRadius: 30};
  return p.evaluate(async ([cam, t, movers, landmark, gate, bench, look, anchorName, small]) => {
    const E = window.__episode, T = await import('three'), {scene, renderer, camera} = E.debug; E.cityLiving?.setFocus(movers);
    const shot = (w, h) => { const st = E.renderCamera(cam, t, w, h, look); return {url: renderer.domElement.toDataURL('image/png'), st}; };
    const W = 270, H = 480, sm = shot(W, H);
    const img = await (async () => { const b = await (await fetch(sm.url)).blob(), bm = await createImageBitmap(b), c = new OffscreenCanvas(W, H), g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, W, H).data; })();
    const roots = E.castRoots(), owner = o => { for (let q = o; q; q = q.parent) for (const [n, rr] of Object.entries(roots)) if (q === rr) return n; return null; };
    const under = (o, test) => { for (let q = o; q; q = q.parent) if (test(q)) return true; return false; };
    const pass = (matFor, force = () => false) => { const keep = [], hid = []; scene.traverse(o => { if (!(o.isMesh || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine)) return; if (!o.visible) return;
        const m = o.isMesh && force(o) ? matFor(o) : o.isSprite || o.isPoints || o.isLine || /^(sky|clouds4|clouds4small|sunRays)$/.test(o.name) || [].concat(o.material).some(x => x?.transparent && !x.alphaTest) ? null : matFor(o);
        if (!m) { hid.push(o); o.visible = false; return; } keep.push([o, o.material]); o.material = m; });
      const bg = scene.background, fog = scene.fog; scene.background = new T.Color(0); scene.fog = null; const ol = E.outline?.mode; E.outline?.set('off');
      renderer.setSize(W, H, false); renderer.render(scene, camera); const px = new Uint8Array(W * H * 4), gl = renderer.getContext(); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      keep.forEach(([o, m]) => { o.material = m; }); hid.forEach(o => { o.visible = true; }); scene.background = bg; scene.fog = fog; if (ol) E.outline.set(ol);
      const top = new Uint8Array(W * H * 4); for (let y = 0; y < H; y++) top.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); return top; };
    const flat = c => new T.MeshBasicMaterial({color: c, fog: false, toneMapped: false, side: T.DoubleSide}), CH = {hero: flat(0xff0000), kidL: flat(0x00ff00), kidS: flat(0x0000ff)}, BLACK = flat(0), WHITE = flat(0xffffff);
    // alpha-tested foliage (impostor cards, leaf cards) keeps its cut-out in masks
    const cut = (o, base) => { const m0 = [].concat(o.material)[0]; if (!m0?.alphaTest || !m0.map) return base; const k = base.userData.cut ??= new Map(); if (!k.has(m0.map)) { const m = base.clone(); m.map = m0.map; m.alphaTest = m0.alphaTest; m.color = base.color; k.set(m0.map, m); } return k.get(m0.map); };
    const count = (px, ch) => { let n = 0, x0 = W, x1 = -1, y0 = H, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = px[(y * W + x) * 4 + ch]; if (v > 127 && px[(y * W + x) * 4 + (ch + 1) % 3] < 128) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return {n, box: n ? [x0 / W, y0 / H, (x1 + 1) / W, (y1 + 1) / H] : null}; };
    const vis = pass(o => CH[owner(o)] ?? cut(o, BLACK)), chars = {};
    for (const [n, c] of [['hero', 0], ['kidL', 1], ['kidS', 2]]) { const alone = count(pass(o => owner(o) === n ? CH[n] : null), c), seen = count(vis, c); chars[n] = {alone: alone.n, seen: seen.n, box: alone.box, share: alone.n ? seen.n / alone.n : 0}; }
    const ov = (a, b) => { if (!a || !b) return 0; const w = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); return w * h / Math.max(1e-9, (a[2] - a[0]) * (a[3] - a[1])); };
    for (const n of ['kidL', 'kidS']) { chars[n].overlapHero = ov(chars[n].box, chars.hero.box); const b = chars[n].box, h = chars.hero.box, cx = b ? (b[0] + b[2]) / 2 : -1; chars[n].beside = !!b && !!h && (cx < h[0] || cx > h[2]); }
    // sightlines (1D method)
    camera.updateMatrixWorld(); const slots = {}; scene.traverse(o => { if (o.isMesh && /^slot:/.test(o.name) && o.visible) { const id = o.name.split(':')[1]; (slots[id] ??= []).push(o); } });
    const ray = new T.Raycaster(), targets = []; scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !/sky|cloud|Foam|catcher|Water|beam|lantern|glass|impostor|waterfall|smoke/i.test(o.name) && ![].concat(o.material).some(m => m?.transparent)) { for (let q = o.parent; q; q = q.parent) if (!q.visible) return; targets.push(o); } });
    const sl = {};
    for (const [id, ms] of Object.entries(slots)) { let inF = 0, seen = 0, n = 0; const bb = new T.Box3(); ms.forEach(m => bb.expandByObject(m));
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 6; j++) for (let kk = 0; kk <= 4; kk++) { const q = new T.Vector3(bb.min.x + (bb.max.x - bb.min.x) * i / 4, bb.min.y + (bb.max.y - bb.min.y) * j / 6, bb.min.z + (bb.max.z - bb.min.z) * kk / 4), ndc = q.clone().project(camera); n++;
        if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1 || ndc.z < -1) continue; inF++; const d = q.clone().sub(camera.position), L = d.length(); ray.set(camera.position, d.normalize()); ray.far = L + .5;
        const hit = ray.intersectObjects(targets, false)[0]; if ((hit && ms.includes(hit.object)) || (hit && hit.distance > L - .6) || !hit) seen++; }
      sl[id] = {inFrame: +(inF / n).toFixed(3), visible: +(seen / n).toFixed(3)}; }
    const share = px => { let n = 0; for (let i = 0; i < W * H; i++) if (px[i * 4] > 127) n++; return n / (W * H); };
    const slotPx = id => share(pass(o => new RegExp('^slot:' + id + '(:|$)').test(o.name) ? WHITE : cut(o, BLACK)));
    const lmPx = landmark ? slotPx(landmark) : null;
    // ground: up-facing world normals (shader with instancing), water + people black
    const UP = new T.ShaderMaterial({side: T.DoubleSide, vertexShader: `varying vec3 vN;\nvoid main(){ vec3 n = normal; vec4 p = vec4(position, 1.);\n#ifdef USE_INSTANCING\n n = mat3(instanceMatrix) * n; p = instanceMatrix * p;\n#endif\n vN = normalize(mat3(modelMatrix) * n); gl_Position = projectionMatrix * modelViewMatrix * p; }`,
      fragmentShader: 'varying vec3 vN;\nvoid main(){ gl_FragColor = vec4(vN.y > .75 ? 1. : 0., 0., 0., 1.); }'});
    const ground = share(pass(o => owner(o) || /cityWater|duckBeam|beam/.test(o.name) || [].concat(o.material)[0]?.alphaTest ? cut(o, BLACK) : UP));
    // foreground prop of THIS anchor: column coverage
    let fg = null; const kg = []; scene.traverse(o => { if (o.name === 'keyArtProps' && o.userData.anchor === anchorName && o.userData.role !== 'deck') kg.push(o); });
    if (kg.length) { const px = pass(o => under(o, q => kg.includes(q)) ? WHITE : CH[owner(o)] ? BLACK : cut(o, BLACK)), cols = new Array(W).fill(0); let n = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4] > 127) { cols[x]++; n++; }
      const used = cols.map(c => c >= 2), xs = used.flatMap((u, i) => u ? [i] : []), x0 = xs.length ? xs[0] / W : null, x1 = xs.length ? (xs[xs.length - 1] + 1) / W : null;
      fg = {px: +(n / (W * H)).toFixed(4), x0, x1, width: xs.length ? +((x1 - x0)).toFixed(3) : 0, cover: +(used.filter(Boolean).length / W).toFixed(3), middle: used.slice(Math.floor(W / 3), Math.ceil(2 * W / 3)).some(Boolean)}; }
    // pixel stats of a mask on the beauty render (sRGB 0..1): mean luma, hue (circular mean, deg), sat, clipped share
    const stats = mask => { let n = 0, L = 0, sx = 0, sy = 0, S = 0, clip = 0, y0 = H, y1 = -1;
      for (let i = 0; i < W * H; i++) { if (mask[i * 4] < 128) continue; const r = img[i * 4] / 255, g = img[i * 4 + 1] / 255, b = img[i * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), y = Math.floor(i / W);
        n++; L += .2126 * r + .7152 * g + .0722 * b; if (mx >= 250 / 255) clip++; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const s = mx ? (mx - mn) / mx : 0; S += s; if (mx > mn) { let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn); h *= 60; sx += Math.cos(h * Math.PI / 180) * s; sy += Math.sin(h * Math.PI / 180) * s; } }
      return n ? {n, luma: +(L / n).toFixed(3), hue: +((Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360).toFixed(1), sat: +(S / n).toFixed(3), clipped: +(clip / n).toFixed(4), hFrac: +((y1 + 1 - y0) / H).toFixed(4)} : {n: 0}; };
    const lw = o => [].concat(o.material)[0]?.userData?.lightWood;
    const planks = stats(pass(o => lw(o) ? WHITE : cut(o, BLACK)));
    const gold = stats(pass(o => /^kit:gold/.test([].concat(o.material)[0]?.name ?? '') && under(o, q => /^slot:1(:|$)/.test(q.name)) ? WHITE : cut(o, BLACK)));
    const isSign = o => /(^|:)neonSign$/.test(o.name), sign = stats(pass(o => isSign(o) ? WHITE : cut(o, BLACK), isSign)); let signMesh = null; scene.traverse(o => { if (isSign(o)) signMesh = o; });
    if (signMesh && sign.n) { signMesh.geometry.computeBoundingBox(); const bb = signMesh.geometry.boundingBox; sign.capFrac = +(sign.hFrac * (signMesh.userData.capH ?? 0) / Math.max(1e-6, bb.max.y - bb.min.y)).toFixed(4); }
    const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)), mv = [];
    scene.getObjectByName('cityLiving')?.children.forEach(g => { if (!g.visible) return; let hit = false; g.traverse(o => { if (hit || !(o.isMesh || o.isInstancedMesh || o.isPoints) || !o.visible) return; let s; if (o.isInstancedMesh) { o.computeBoundingSphere(); s = o.boundingSphere.clone().applyMatrix4(o.matrixWorld); } else { o.geometry.boundingSphere ?? o.geometry.computeBoundingSphere(); s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); } if (fr.intersectsSphere(s)) hit = true; }); if (hit) mv.push(g.name.replace('living:', '')); });
    const res = {small: small ? sm.url : null, chars, sight: sl, lmPx, movers: mv, ground, fg, planks, gold, sign, beam: E.world?.harbor?.duck?.beam?.visible ?? null, smallTris: sm.st.triangles};
    if (gate) { res.phone = shot(390, 693).url;
      if (bench) { const tm = []; for (let i = 0; i < 5; i++) tm.push(E.renderCamera(cam, t, 720, 1280, look).ms);
        const st = E.renderCamera(cam, t, 720, 1280, look); res.bench = {tris: st.triangles, calls: st.calls, tm}; res.big = renderer.domElement.toDataURL('image/png'); } }
    return res;
  }, [cam, t, k.movers, k.landmark, gate, bench, look, r, small]);
}
export const verdict = (r, k, res) => {
  const S = STAGING, ch = res.chars, onScreen = Object.entries(res.sight).filter(([, v]) => v.visible >= .02).map(([id]) => id).sort(), lmVis = k.landmark ? res.sight[k.landmark]?.visible ?? 0 : null, f = res.fg;
  const checks = {heroH: !!ch.hero.box && ch.hero.box[3] - Math.max(0, ch.hero.box[1]) <= S.maxHeroH, landmark: k.landmark == null || lmVis >= S.landmarkMin,
    kids: ['kidL', 'kidS'].every(n => ch[n].alone > 0 && ch[n].share >= S.kidVisible && ch[n].beside),
    sightlines: !['harborDock', 'diner', 'beach'].includes(r) || onScreen.length >= 2, movers: res.movers.length <= 3, ground: res.ground <= GROUND_MAX,
    fg: !f || (!f.middle && (f.x0 <= FG.edge || f.x1 >= 1 - FG.edge) && f.width >= FG.min && f.width <= FG.max),
    planks: !['harborDock', 'beach'].includes(r) || (res.planks.n > 0 && res.planks.luma >= .40),
    gold: r !== 'plazaWide' || (res.gold.n > 0 && res.gold.hue >= 35 && res.gold.hue <= 55 && res.gold.sat >= .45 && res.gold.clipped <= .02),
    sign: r !== 'diner' || (res.sign.capFrac ?? 0) >= .03, beam: res.beam !== true};
  return {landmark: k.landmark, heroH: ch.hero.box ? +(ch.hero.box[3] - ch.hero.box[1]).toFixed(3) : null, landmarkVisible: lmVis, ground: +res.ground.toFixed(3), fg: f,
    planks: ['harborDock', 'beach'].includes(r) ? res.planks : undefined, gold: r === 'plazaWide' ? res.gold : undefined, sign: r === 'diner' ? res.sign : undefined,
    kids: Object.fromEntries(['kidL', 'kidS'].map(n => [n, {share: +ch[n].share.toFixed(3), beside: ch[n].beside}])), onScreen, movers: res.movers, checks, pass: Object.values(checks).every(Boolean)};
};
