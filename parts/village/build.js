// parts/village/build.js — tuft P3 BEAST VILLAGE kit, the three side. Turns parts/village/kit.js primitives into meshes:
//   hero tier  merged per material, world-projected UVs (patterns from parts/materials.js std), static → baked by engine/bake.js
//   mid tier   ONE InstancedMesh per house preset (vertex colours × instanceColor tint, Lambert, live = not baked) + all mid windows
//              in ONE InstancedMesh (instanceColor lit / dark) · far tier: terraced rooftop blocks (1 draw) + window dots (1 draw)
//   streets (B.ribbon cobbles), stone walls with moss caps, lantern strings (catenary rope + 1 instanced lantern draw), props (hay,
//   troughs, barrels, fences, crates), rooms (floor, walls, beams, tall windows), the far hillside and TITAN's mountain (cave mouth).
// Every roof carries an `aRoof` vertex attribute (1 on roof triangles) + userData.roofBase so a gate can count DISTINCT visible rooftops
// with an id pass (roofIdPass). Nothing here reads a clock or Math.random.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as K from './kit.js';

const TEX = {plaster: ['plaster', 3], plaster2: ['plaster', 3], plaster3: ['plaster', 3], timber: ['woodPlanks', 2], roof: ['slate', 2.5], roof2: ['slate', 2.5], roof3: ['slate', 2.5], stone: ['rock', 3],
  moss: ['moss', 3], cobble: ['cobble', 3.5], wood: ['woodPlanks', 2.5], door: ['woodPlanks', 2], dirt: ['dirt', 4], grass: ['grass', 5], hay: ['thatch', 2], slate: ['slate', 2]};
export function createKit({M, night = false, look4 = null}) {
  const cache = new Map(), P = K.PALETTE;
  const mat = key => { if (cache.has(key)) return cache.get(key); let m;
    if (key === 'winLit') { m = new T.MeshBasicMaterial({color: night ? P.winLit : '#2b3542'}); m.userData = night ? {window: 1, live: true} : {live: true}; }
    else if (key === 'winDark') { m = new T.MeshBasicMaterial({color: night ? '#1a2230' : '#2b3542'}); m.userData = {live: true}; }
    else if (key === 'lantern') { m = new T.MeshBasicMaterial({color: night ? '#FFB24E' : '#E8A050'}); m.userData = {live: true, glow: night ? 1 : 0}; }
    else if (key === 'chalk') { m = new T.MeshStandardMaterial({color: P.chalk, roughness: .95}); }
    else { const t = TEX[key]; m = t ? M.std(t[0], P[key] ?? '#ffffff') : M.std('plastic', P[key] ?? key); if (/^roof|^plaster/.test(key)) { m = m.clone(); m.side = T.DoubleSide; } }   // roofs + gable walls seen from below (street cameras)
    m.userData = {...m.userData, vkey: key}; cache.set(key, m); return m; };
  return {mat, night, P, look4}; }

// ---- primitive → BufferGeometry (house-local), then world matrix ---------------------------------------------------------------
function gableGeo(w, d, h, wall) {   // ridge along x: two slopes + two gable triangles (+ wall-coloured gable infill as a 2nd group)
  const x = w / 2, z = d / 2, P = [], roof = [];
  const tri = (a, b, c, r) => { P.push(...a, ...b, ...c); roof.push(r, r, r); };
  tri([-x, 0, z], [x, 0, z], [x, h, 0], 1); tri([-x, 0, z], [x, h, 0], [-x, h, 0], 1); tri([x, 0, -z], [-x, 0, -z], [-x, h, 0], 1); tri([x, 0, -z], [-x, h, 0], [x, h, 0], 1);
  tri([-x, 0, z], [-x, 0, -z], [-x, h, 0], 1); tri([x, 0, -z], [x, 0, z], [x, h, 0], 1);   // undersides of the eaves read as roof from below
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('aRoof', new T.Float32BufferAttribute(roof, 1)); g.computeVertexNormals(); return g; }
function gableWallGeo(w, d, h) { const x = w / 2 - .05, z = d / 2, P = [-x, 0, z - .5, -x, 0, -z + .5, -x, h * .98, 0, x, 0, -z + .5, x, 0, z - .5, x, h * .98, 0];   // the gable triangles (plaster) under the roof
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g; }
export function primGeo(p, seg = 0) {   // seg > 0: tessellate boxes every ~seg studs (baked hero sets: per-vertex light needs vertices)
  let g;
  if (p.k === 'box') { const n = v => seg ? Math.max(1, Math.min(12, Math.ceil(v / seg))) : 1; g = new T.BoxGeometry(...p.size, n(p.size[0]), n(p.size[1]), n(p.size[2])); g = g.toNonIndexed(); }
  else if (p.k === 'disc' && p.ring) { g = new T.TorusGeometry(p.r, p.t / 2, 4, p.n ?? 12).toNonIndexed(); }   // a ring in the xy plane (round window frames)
  else if (p.k === 'disc') { g = new T.CylinderGeometry(p.r, p.r, p.t, p.n ?? 12, 1).toNonIndexed(); g.rotateX(Math.PI / 2); }
  else if (p.k === 'gable') g = gableGeo(p.w, p.d, p.h);
  const m = new T.Matrix4().compose(new T.Vector3(...p.at), new T.Quaternion().setFromEuler(new T.Euler(p.rotX ?? 0, p.rotY ?? 0, p.rotZ ?? 0, 'YXZ')), new T.Vector3(1, 1, 1));
  if (p.k === 'box' || p.k === 'disc') g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(p.rotX ?? 0, 0, p.rotZ ?? 0)));
  if (p.k === 'gable') g.applyMatrix4(new T.Matrix4().makeRotationY(p.rotY ?? 0));
  if (p.k === 'box' || p.k === 'disc') g.applyMatrix4(new T.Matrix4().makeRotationY(p.rotY ?? 0));
  g.translate(...p.at); void m;
  if (!g.attributes.aRoof) g.setAttribute('aRoof', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'aRoof'].includes(k)) g.deleteAttribute(k);
  return g; }
function gableWall(p) { const g = gableWallGeo(p.wallW ?? p.w, p.wallD ?? p.d, p.h).toNonIndexed(); g.applyMatrix4(new T.Matrix4().makeRotationY(p.rotY ?? 0)); g.translate(...p.at);
  g.setAttribute('aRoof', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count), 1)); return g; }
// world-projected UVs (box projection on the dominant normal axis), tile in studs
export function worldUV(g, tile = 3) { const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y]; uv[2 * i] = u / tile; uv[2 * i + 1] = v / tile; }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2)); return g; }

// ---- an accumulator: geometries per material key, merged at the end -------------------------------------------------------------
export function createBatch(kit, name = 'village', {live = false, seg = 2.2} = {}) {
  const per = new Map(), add = (key, g) => { if (!per.has(key)) per.set(key, []); per.get(key).push(g); };
  return {add,
    addParts(parts, M4) { for (const p of parts) { const g = primGeo(p, seg).applyMatrix4(M4); add(p.mat, g); if (p.k === 'gable' && p.wall) add(p.wall, gableWall(p).applyMatrix4(M4)); } },
    finish(roofBase = 0) { const grp = new T.Group(); grp.name = name;
      for (const [key, gs] of per) { const g = mergeGeometries(gs.map(x => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'aRoof'].includes(k)) x.deleteAttribute(k); return x; }));
        worldUV(g, TEX[key]?.[1] ?? 3); const m = new T.Mesh(g, kit.mat(key)); m.name = name + ':' + key; m.castShadow = m.receiveShadow = true;
        if (live || kit.mat(key).userData.live) m.userData.live = true; if (g.attributes.aRoof.array.some(v => v > 0)) m.userData.roofBase = roofBase;
        g.computeBoundingSphere(); grp.add(m); }
      return grp; }}; }
const xf = (at, rotY = 0) => new T.Matrix4().compose(new T.Vector3(...at), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotY), new T.Vector3(1, 1, 1));

// ---- hero houses (full detail, merged per material, baked) ------------------------------------------------------------------------
export function heroHouses(kit, list, groundY, {roofBase = 1} = {}) {
  const b = createBatch(kit, 'heroHouses'), meta = [];
  list.forEach((e, i) => { const h = K.housePreset(e.preset ?? e, e.seed ?? 1), y = groundY(e.at[0], e.at[2]), parts = K.houseParts(h, 'hero', {lit: kit.night ? K.litFn(e.seed ?? i + 1) : null, roofId: roofBase + i});
    // each hero roof is its own id: tag the gable's aRoof with the house index
    for (const p of parts) if (p.k === 'gable') p.roofIx = roofBase + i;
    const M4 = xf([e.at[0], y, e.at[2]], e.rotY ?? 0);
    for (const p of parts) { const g = primGeo(p, 2.2).applyMatrix4(M4); if (p.k === 'gable') g.attributes.aRoof.array.fill(roofBase + i); b.add(p.mat, g); if (p.k === 'gable' && p.wall) b.add(p.wall, gableWall(p).applyMatrix4(M4)); }
    meta.push({id: roofBase + i, top: y + K.roofTop(h), at: e.at, windows: parts.filter(p => p.window).map(p => !!(p.lit || p.mat === 'winLit'))}); });
  const g = b.finish(roofBase); g.userData.roofIds = 'vertex'; return {group: g, meta}; }

// ---- mid houses: one InstancedMesh per preset (vertex colours), all windows in one InstancedMesh ----------------------------------
const hexRGB = h => new T.Color(h);
export function midHouses(kit, list, groundY, {roofBase = 1000, name = 'midHouses'} = {}) {
  const grp = new T.Group(); grp.name = name; const byPreset = new Map(), meta = [], wins = [];
  list.forEach((e, i) => { if (!byPreset.has(e.preset)) byPreset.set(e.preset, []); byPreset.get(e.preset).push({...e, ix: i}); });
  let rid = roofBase;
  for (const [preset, es] of byPreset) {
    const h = K.housePreset(preset, 1), parts = K.houseParts(h, 'mid', {lit: () => true}), gs = [];
    for (const p of parts) { if (p.window) continue; const g = primGeo(p), c = hexRGB(K.PALETTE[p.mat] ?? '#888888'), col = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < col.length; k += 3) col.set([c.r, c.g, c.b], k);
      g.setAttribute('color', new T.BufferAttribute(col, 3)); gs.push(g); if (p.k === 'gable' && p.wall) { const w = gableWall(p), cw = hexRGB(K.PALETTE[p.wall]), c2 = new Float32Array(w.attributes.position.count * 3); for (let k = 0; k < c2.length; k += 3) c2.set([cw.r, cw.g, cw.b], k); w.setAttribute('color', new T.BufferAttribute(c2, 3)); gs.push(w); } }
    const geo = mergeGeometries(gs), m = new T.Mesh(geo, new T.MeshLambertMaterial({vertexColors: true, side: T.DoubleSide})); m.name = 'mid:' + preset;
    const im = new T.InstancedMesh(geo, m.material, es.length), tint = new T.Color(); im.name = 'mid:' + preset; im.userData = {live: true, roofBase: rid};
    es.forEach((e, j) => { const y = groundY(e.at[0], e.at[2]), M4 = xf([e.at[0], y, e.at[2]], e.rotY ?? 0); im.setMatrixAt(j, M4); const r = K.rng(e.seed)(); tint.setRGB(.9 + .1 * r, .9 + .08 * r, .88 + .1 * (1 - r)); im.setColorAt(j, tint);
      const lit = K.litFn(e.seed ?? j + 1), ws = parts.filter(p => p.window); ws.forEach((p, k) => wins.push({p, M4, on: kit.night && lit(k)}));
      meta.push({id: rid + j, top: y + K.roofTop(h), at: e.at, windows: ws.map((_, k) => kit.night && lit(k))}); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; grp.add(im); rid += es.length; }
  if (wins.length) grp.add(windowInstances(kit, wins, name + ':windows'));
  return {group: grp, meta, next: rid}; }
export function windowInstances(kit, wins, name) {   // unit boxes scaled into place: lit (warm, glow at night) and dark glass in two draws
  const grp = new T.Group(); grp.name = name; grp.userData = {window: 1, lit: wins.filter(w => w.on).length, total: wins.length};
  for (const lit of [true, false]) { const ws = wins.filter(w => !!w.on === lit); if (!ws.length) continue;
    const mtl = new T.MeshBasicMaterial({color: lit ? K.PALETTE.winLit : kit.night ? '#1a2230' : '#2b3542'}); mtl.userData = lit ? {window: 1, live: true} : {live: true};
    const im = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mtl, ws.length);
    ws.forEach(({p, M4}, i) => { const s = p.k === 'disc' ? [p.r * 1.6, p.r * 1.6, p.t] : p.size; im.setMatrixAt(i, M4.clone().multiply(new T.Matrix4().compose(new T.Vector3(...p.at), new T.Quaternion(), new T.Vector3(...s)))); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.name = name + (lit ? ':lit' : ':dark'); im.userData = {live: true}; grp.add(im); }
  return grp; }

// ---- far terraces: low-poly rooftop blocks (1 draw) + window dots (1 draw) -------------------------------------------------------
export function farTerraces(kit, list, groundY, {roofBase = 5000} = {}) {
  const grp = new T.Group(); grp.name = 'farTerraces';
  const h0 = K.housePreset('cottage', 1), parts = K.houseParts({...h0, w: 1, d: 1, pitch: .9, storeys: 1}, 'far'), gs = [];
  for (const p of parts) { const g = primGeo(p), c = hexRGB(p.k === 'gable' ? K.PALETTE.roof : K.PALETTE.plaster2), col = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < col.length; k += 3) col.set([c.r, c.g, c.b], k); g.setAttribute('color', new T.BufferAttribute(col, 3)); gs.push(g); }
  const geo = mergeGeometries(gs), im = new T.InstancedMesh(geo, new T.MeshLambertMaterial({vertexColors: true, side: T.DoubleSide, fog: false}), list.length), tint = new T.Color(), meta = [], dots = [];
  const base = K.houseHeight({...h0, storeys: 1});
  list.forEach((e, i) => { const h = K.housePreset(e.preset, e.seed), y = e.at[1] + groundY(e.at[0], e.at[2]), sx = h.w, sz = h.d, sy = K.houseHeight(h) / base, M4 = new T.Matrix4().compose(new T.Vector3(e.at[0], y, e.at[2]), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), e.rotY ?? 0), new T.Vector3(sx, sy, sz));
    im.setMatrixAt(i, M4); const r = K.rng(e.seed)(); tint.setRGB(.82 + .18 * r, .84 + .14 * r, .9 + .1 * (1 - r)); im.setColorAt(i, tint);
    meta.push({id: roofBase + i, top: y + K.houseHeight(h) + h.pitch * h.w / 2, at: [e.at[0], y, e.at[2]]});
    const lit = K.litFn(e.seed); for (let k = 0; k < Math.max(2, Math.round(h.w / 3)) * h.storeys; k++) { const fx = ((k % Math.round(h.w / 3)) + .5) / Math.round(h.w / 3) - .5, fy = FOUNDY(k, h);
      dots.push({p: {k: 'box', size: [.9 / sx, .9 / sy * 1.2, .2 / sz], at: [fx, fy / sy, .505]}, M4, on: kit.night && lit(k)}); } });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.name = 'far:roofs'; im.userData = {live: true, roofBase}; grp.add(im);
  if (kit.night) grp.add(windowInstances(kit, dots, 'far:windows'));
  return {group: grp, meta}; }
const FOUNDY = (k, h) => K.FOUND + 2.2 + (k % h.storeys) * K.STOREY;

// ---- streets, walls, lantern strings, props ----------------------------------------------------------------------------------
export function street(kit, B, pts, width, heightFn, {y = .05, mat = 'cobble'} = {}) {
  const curve = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0, z)), false, 'centripetal');
  const r = B.ribbon(curve, width, (x, z) => heightFn(x, z) + y, {material: kit.mat(mat), tile: 3.5, thick: .25}); r.name = 'street'; return r; }
export function wallRun(kit, batch, a, b, {h = 2.4, t = 1.0, seed = 1} = {}) {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]), rotY = Math.atan2(-(b[2] - a[2]), b[0] - a[0]), n = Math.max(1, Math.round(L / 3)), r = K.rng(seed), parts = [];
  for (let i = 0; i < n; i++) { const u = (i + .5) / n, hh = h * (.92 + .16 * r()); parts.push({k: 'box', size: [L / n + .05, hh, t], at: [-L / 2 + (i + .5) * L / n, hh / 2, 0], mat: 'stone'}); parts.push({k: 'box', size: [L / n + .1, .3, t + .2], at: [-L / 2 + (i + .5) * L / n, hh + .1, 0], mat: 'moss'}); void u; }
  batch.addParts(parts, xf([(a[0] + b[0]) / 2, a[1] ?? 0, (a[2] + b[2]) / 2], rotY)); }
export function lanternStrings(kit, list) {   // list of [a, b, {sag}] → rope lines (1 draw) + lanterns (1 instanced draw)
  const grp = new T.Group(); grp.name = 'lanternStrings'; const ropes = [], lans = [];
  for (const [a, b, o] of list) { const s = K.lanternString(a, b, o ?? {}); for (let i = 0; i < s.pts.length - 1; i++) ropes.push(...s.pts[i], ...s.pts[i + 1]); lans.push(...s.lanterns); }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(ropes, 3)); const line = new T.LineSegments(lg, new T.LineBasicMaterial({color: '#2a2420'})); line.name = 'lanternRopes'; line.userData.live = true; grp.add(line);
  const im = new T.InstancedMesh(new T.CylinderGeometry(.38, .3, .75, 6, 1), kit.mat('lantern'), lans.length), M4 = new T.Matrix4(), c = new T.Color(), cols = ['#FFB24E', '#FF8A3D', '#FFD36B'].map(h => new T.Color(h));
  lans.forEach((p, i) => { M4.compose(new T.Vector3(...p), new T.Quaternion(), new T.Vector3(1, 1, 1)); im.setMatrixAt(i, M4); c.copy(cols[i % 3]); if (!kit.night) c.multiplyScalar(.85); im.setColorAt(i, c); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.name = 'lanterns'; im.userData = {live: true, count: lans.length}; grp.add(im);
  return {group: grp, lanterns: lans}; }
export function props(kit, batch, list, groundY) {   // hay bales, troughs, barrels, crates, fence runs, perch posts, benches, desks, tables, chairs, beds, chalkboards …
  for (const e of list) { const y = groundY(e.at[0], e.at[2]) + (e.at[1] ?? 0), M4 = xf([e.at[0], y, e.at[2]], e.rotY ?? 0), s = e.s ?? 1, P = [], b = (size, at, mat, ex = {}) => P.push({k: 'box', size: size.map(v => v * s), at: at.map(v => v * s), mat, ...ex});
    switch (e.type) {
      case 'hay': b([2.4, 1.2, 1.4], [0, .6, 0], 'hay'); b([2.4, 1.2, 1.4], [.3, 1.8, 0], 'hay', {rotY: .3}); break;
      case 'trough': b([3.2, .2, 1.3], [0, .9, 0], 'wood'); b([3.2, .9, .16], [0, .55, .6], 'wood'); b([3.2, .9, .16], [0, .55, -.6], 'wood'); b([.16, .9, 1.3], [1.55, .55, 0], 'wood'); b([.16, .9, 1.3], [-1.55, .55, 0], 'wood'); b([2.9, .1, 1.0], [0, .85, 0], 'slate'); break;
      case 'barrel': P.push({k: 'disc', r: .6 * s, t: 1.4 * s, at: [0, .7 * s, 0], rotX: Math.PI / 2, mat: 'wood', n: 8}); break;
      case 'crate': b([1.3, 1.3, 1.3], [0, .65, 0], 'wood'); break;
      case 'fence': { const n = e.n ?? 5; for (let i = 0; i < n; i++) b([.25, 1.6, .25], [i * 2 - (n - 1), .8, 0], 'timber'); b([2 * (n - 1) + .4, .2, .15], [0, 1.2, 0], 'timber'); b([2 * (n - 1) + .4, .2, .15], [0, .6, 0], 'timber'); break; }
      case 'bench': b([3.2, .2, .9], [0, 1.0, 0], 'wood'); b([.25, 1.0, .8], [1.3, .5, 0], 'timber'); b([.25, 1.0, .8], [-1.3, .5, 0], 'timber'); break;
      case 'desk': b([2.6, .16, 1.5], [0, 1.9, 0], 'wood'); for (const [x, z] of [[1.15, .6], [-1.15, .6], [1.15, -.6], [-1.15, -.6]]) b([.16, 1.9, .16], [x, .95, z], 'timber'); b([2.0, .12, 1.0], [0, 1.2, -1.5], 'wood'); for (const x of [.8, -.8]) b([.14, 1.2, .14], [x, .6, -1.5], 'timber'); break;
      case 'table': b([e.w ?? 8, .25, e.d ?? 3], [0, 2.3, 0], 'wood'); for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b([.35, 2.3, .35], [x * ((e.w ?? 8) / 2 - .5), 1.15, z * ((e.d ?? 3) / 2 - .4)], 'timber'); break;
      case 'chair': b([1.4, .18, 1.4], [0, 1.4, 0], 'wood'); for (const [x, z] of [[.55, .55], [-.55, .55], [.55, -.55], [-.55, -.55]]) b([.16, 1.4, .16], [x, .7, z], 'timber'); b([1.4, 1.6, .16], [0, 2.3, -.65], 'wood'); break;
      case 'bed': b([4.2, .9, 7.0], [0, .45, 0], 'wood'); b([3.9, .5, 6.6], [0, 1.1, .1], 'plaster3'); b([3.9, .35, 4.0], [0, 1.45, 1.3], 'flowerP'); b([3.0, .45, 1.2], [0, 1.5, -2.6], 'plaster3'); b([4.2, 2.4, .3], [0, 1.2, -3.5], 'wood'); break;
      case 'hook': b([.18, .18, .6], [0, 0, .3], 'iron'); b([.18, .6, .18], [0, .3, .6], 'iron'); break;
      case 'chalkboard': b([e.w ?? 10, e.h ?? 4, .2], [0, 0, 0], 'chalk'); b([(e.w ?? 10) + .4, .3, .45], [0, -(e.h ?? 4) / 2 - .15, .1], 'timber'); b([(e.w ?? 10) + .4, .3, .3], [0, (e.h ?? 4) / 2 + .15, .05], 'timber'); break;
      case 'shelf': b([e.w ?? 4, .15, .8], [0, 0, 0], 'wood'); for (let i = 0; i < (e.n ?? 4); i++) b([.6, .9, .6], [(i - ((e.n ?? 4) - 1) / 2) * 1.0, .5, 0], ['flowerY', 'wood', 'slate', 'flowerR'][i % 4]); break;
      case 'post': b([.5, e.h ?? 7, .5], [0, (e.h ?? 7) / 2, 0], 'timber'); break;
      case 'stage': b([e.w ?? 16, 1.6, e.d ?? 10], [0, .8, 0], 'wood'); b([(e.w ?? 16) + .4, .3, (e.d ?? 10) + .4], [0, 1.65, 0], 'timber'); for (const x of [-1, 1]) b([.6, 9, .6], [x * ((e.w ?? 16) / 2 - .3), 4.5, -(e.d ?? 10) / 2 + .3], 'timber'); b([(e.w ?? 16), .6, .6], [0, 9, -(e.d ?? 10) / 2 + .3], 'timber'); break;
      case 'well': P.push({k: 'disc', r: 1.6 * s, t: 1.6 * s, at: [0, .8 * s, 0], rotX: Math.PI / 2, mat: 'stone', n: 10}); b([.3, 3, .3], [1.4, 2.3, 0], 'timber'); b([.3, 3, .3], [-1.4, 2.3, 0], 'timber'); b([3.4, .3, .4], [0, 3.8, 0], 'timber'); break;
      default: throw Error('unknown village prop ' + e.type); }
    batch.addParts(P, M4); } }
// a room (interior): floor, 4 walls (openings as gaps), ceiling with beams; `openSide` leaves one wall out for the camera
export function room(kit, batch, r) {   // r = {at, w, d, h, floor, wall, openSide?, windows: [{side, x, y, w, h, round?}], door: {side, x, w, h}}
  const P = [], b = (size, at, mat, ex = {}) => P.push({k: 'box', size, at, mat, ...ex}), {w, d, h} = r, T2 = .5;
  b([w, .3, d], [0, -.15, 0], r.floor ?? 'wood');
  if (!r.noCeiling) { b([w, .3, d], [0, h + .15, 0], r.ceiling ?? 'plaster3'); for (let i = 0; i < Math.floor(w / 3.2); i++) b([.45, .55, d], [-w / 2 + 1.6 + i * 3.2, h - .2, 0], 'timber'); }
  const sides = {front: [0, d / 2, w, 0], back: [0, -d / 2, w, 0], left: [-w / 2, 0, d, Math.PI / 2], right: [w / 2, 0, d, Math.PI / 2]};
  for (const [sd, [cx, cz, L, rot]] of Object.entries(sides)) { if (sd === r.openSide) continue;
    const holes = [...(r.windows ?? []).filter(o => o.side === sd), ...(r.door && r.door.side === sd ? [{...r.door, y: r.door.h / 2}] : [])].sort((a, c) => a.x - c.x);
    const strip = (x0, x1, y0, y1) => { if (x1 - x0 < .01 || y1 - y0 < .01) return; const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, sz = [x1 - x0, y1 - y0, T2];
      const at = rot ? [cx, my, cz + (sd === 'left' ? -mx : mx)] : [cx + mx, my, cz]; b(rot ? [T2, sz[1], sz[0]] : sz, at, r.wall ?? 'plaster'); };
    let x = -L / 2; for (const o of holes) { const hx0 = o.x - o.w / 2, hx1 = o.x + o.w / 2, hy0 = o.y - o.h / 2, hy1 = o.y + o.h / 2; strip(x, hx0, 0, h); strip(hx0, hx1, 0, hy0); strip(hx0, hx1, hy1, h); x = hx1;
      if (o.glass !== false && !o.door) { const at = rot ? [cx, o.y, cz + (sd === 'left' ? -o.x : o.x)] : [cx + o.x, o.y, cz]; b(rot ? [.12, .2, o.w] : [o.w, .2, .12], [at[0], o.y - o.h / 2, at[2]], 'timber'); b(rot ? [.12, o.h, .14] : [.14, o.h, .12], at, 'timber'); b(rot ? [.12, .14, o.w] : [o.w, .14, .12], at, 'timber'); } }
    strip(x, L / 2, 0, h);
    for (const fx of [-L / 2 + .3, L / 2 - .3]) b(rot ? [T2 + .1, h, .5] : [.5, h, T2 + .1], rot ? [cx, h / 2, cz + fx] : [cx + fx, h / 2, cz], 'timber');
    b(rot ? [T2 + .1, .45, L] : [L, .45, T2 + .1], rot ? [cx, .22, cz] : [cx, .22, cz], 'timber'); }
  batch.addParts(P, xf(r.at, r.rotY ?? 0)); }

// ---- the far hillside (terrain silhouette behind the town) + TITAN's mountain ----------------------------------------------------
export function hillside(kit, {centre = [0, 0], dir = 0, from = 50, step = 16, rise = 7, rows = 6, span = 300, night = false}) {
  const nx = 40, nz = rows + 4, P = [], C = [], cd = Math.cos(dir), sd = Math.sin(dir), col = new T.Color(night ? '#2f3d33' : '#6f9550'), col2 = new T.Color(night ? '#26302a' : '#5d7f45');
  const pt = (i, j) => { const lx = (i / nx - .5) * span * (1 + j * .1), dist = from - 10 + j * step, y = K.hillY(dist, {from, step, rise}) - .3, lz = -dist; return [centre[0] + lx * cd + lz * sd, y, centre[1] - lx * sd + lz * cd]; };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = pt(i, j), b = pt(i + 1, j), c = pt(i, j + 1), d = pt(i + 1, j + 1), cc = (i + j) % 2 ? col : col2; P.push(...a, ...c, ...b, ...b, ...c, ...d); for (let k = 0; k < 6; k++) C.push(cc.r, cc.g, cc.b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshLambertMaterial({vertexColors: true, fog: false})); m.name = 'hillside'; m.userData.live = true; m.receiveShadow = true; return m; }
export function titanMountain(kit, {at = [0, 0, -300], r = 150, h = 210, rotY = 0, seed = 11, cave = true}) {
  const V = K.mountain({seed, r, h}), P = [], C = [], rock = new T.Color(kit.night ? '#2a3348' : '#3c4250'), rock2 = new T.Color(kit.night ? '#323c55' : '#4a5160'), snow = new T.Color(kit.night ? '#8a9cc0' : '#c9d2de'), R = K.rng(seed + 1);
  for (let i = 0; i < V.length; i += 3) { const yMax = Math.max(V[i][1], V[i + 1][1], V[i + 2][1]), c = yMax > h * .86 ? snow : R() < .5 ? rock : rock2; for (const v of [V[i], V[i + 1], V[i + 2]]) { P.push(...v); C.push(c.r, c.g, c.b); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
  const grp = new T.Group(); grp.name = 'titanMountain'; const m = new T.Mesh(g, new T.MeshLambertMaterial({vertexColors: true, flatShading: true, fog: false})); m.name = 'mountain'; m.userData.live = true; grp.add(m);
  if (cave) { const cy = h * K.CAVE.u, u0 = 1 - (1 - K.CAVE.u) ** (1 / 1.6), rr = r * (1 - u0) ** 1.15 * 1.3, sh = new T.Shape();   // on (just outside) the surface at that height (radius noise ≤ +17.5 %) sh.absarc(0, 0, K.CAVE.w / 2, 0, Math.PI, false); sh.lineTo(-K.CAVE.w / 2, -K.CAVE.h * .45); sh.lineTo(K.CAVE.w / 2, -K.CAVE.h * .45);
    const cm = new T.Mesh(new T.ShapeGeometry(sh, 8), new T.MeshBasicMaterial({color: '#030406'})); cm.position.set(0, cy, rr); cm.rotation.x = -.3; cm.name = 'caveMouth'; cm.userData.live = true; grp.add(cm); grp.userData.cave = {local: [0, cy, rr]}; }
  grp.position.set(...at); grp.rotation.y = rotY; return grp; }

// ---- id pass: count DISTINCT visible rooftops (roof triangles carry aRoof; instanced roofs add gl_InstanceID) ----------------------
export function roofIdPass(renderer, scene, camera, w, h) {
  const black = new T.MeshBasicMaterial({color: '#000000'}), swaps = [], hidden = [];
  const idMat = (base, inst) => new T.ShaderMaterial({uniforms: {uBase: {value: base}}, vertexShader: `attribute float aRoof; varying float vId; uniform float uBase;
    void main() { float id = aRoof > .5 ? (${inst ? 'uBase + float(gl_InstanceID)' : '(aRoof > 1.5 ? aRoof : uBase)'}) : 0.; vId = id; ${inst ? 'gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.);' : 'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);'} }`,
    side: T.DoubleSide, fragmentShader: `varying float vId; void main() { float id = floor(vId + .5); gl_FragColor = vec4(mod(id, 256.) / 255., mod(floor(id / 256.), 256.) / 255., id > 0. ? 1. : 0., 1.); }`});
  scene.traverse(o => { if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite) || !o.visible) return; if (o.isSprite || o.isLine || o.isPoints) { hidden.push(o); o.visible = false; return; }
    swaps.push([o, o.material]); o.material = o.geometry.attributes.aRoof && o.userData.roofBase !== undefined ? idMat(o.userData.roofBase, !!o.isInstancedMesh) : black; });
  const bg = scene.background, fog = scene.fog, rt = new T.WebGLRenderTarget(w, h); scene.background = new T.Color('#000000'); scene.fog = null;
  renderer.setRenderTarget(rt); renderer.render(scene, camera); const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null);
  for (const [o, m] of swaps) o.material = m; for (const o of hidden) o.visible = true; scene.background = bg; scene.fog = fog; rt.dispose();
  if (typeof window !== 'undefined' && window.__roofDbg) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h); for (let y = 0; y < h; y++) for (let k = 0; k < w; k++) { const s = ((h - 1 - y) * w + k) * 4; im.data.set([px[s] * 3 % 256, px[s + 1] * 40 % 256, px[s + 2], 255], (y * w + k) * 4); } x.putImageData(im, 0, 0); window.__roofDbg = c.toDataURL(); }
  const count = new Map(); for (let i = 0; i < w * h; i++) if (px[i * 4 + 2] > 127) { const id = px[i * 4] + 256 * px[i * 4 + 1]; count.set(id, (count.get(id) ?? 0) + 1); }
  return [...count.entries()].map(([id, n]) => ({id, n})); }
// mask pass: objects for which keep(o) is true render white, everything else black (still depth-tested) → share of the frame
export function maskPass(renderer, scene, camera, w, h, keep) {
  const white = new T.MeshBasicMaterial({color: '#ffffff', side: T.DoubleSide}), black = new T.MeshBasicMaterial({color: '#000000'}), swaps = [], hidden = [];
  const kept = o => { for (let p = o; p; p = p.parent) if (keep(p)) return true; return false; };
  scene.traverse(o => { if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite) || !o.visible) return; if (!o.isMesh) { hidden.push(o); o.visible = false; return; } swaps.push([o, o.material]); o.material = kept(o) ? white : black; });
  const bg = scene.background, fog = scene.fog, rt = new T.WebGLRenderTarget(w, h); scene.background = new T.Color('#000000'); scene.fog = null;
  renderer.setRenderTarget(rt); renderer.render(scene, camera); const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null);
  for (const [o, m] of swaps) o.material = m; for (const o of hidden) o.visible = true; scene.background = bg; scene.fog = fog; rt.dispose();
  let n = 0; for (let i = 0; i < w * h; i++) if (px[i * 4] > 127) n++; return n / (w * h); }
