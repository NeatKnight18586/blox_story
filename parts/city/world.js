// parts/city/world.js — Phase 1A: the permanent island city as a reusable world (v3 world contract: groundY, LAYER, LOOK, build,
// preload, onCamera). Source of truth = parts/city/plan.json (pure helpers in plan.js). Use with spec `look4: 'cityDay'`
// (engine/looks4.json): statics bake per district (bakeGroups → contact AO + sun shadow in vertex colours).
// Built here: terrain (south → north slope, soft hills, sea cliffs, a cliff step + cave mouth), bay/sea water (look4 water4),
// sand beach + duck rock, roads / sidewalks / boardwalk as ribbons on groundY, every district BLOCKED OUT at final footprints
// (massing boxes in district colours, roofs implied), procedural forest + street trees (CC0 glTF models replace near trees
// when the farm cache has them), landmark SLOTS as grey placeholder volumes (mesh names `slot:<id>`).
// Detail tiers: lots within NEAR_R of an anchor get a subdivided body + a ground slab (bake → contact AO; shown while the
// camera is within CULL_R of the district), otherwise plain boxes; midground lots are merged per district colour.
// Opt-in spec flags: `cityOverview: true` tints the terrain by district (plan sheets).
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {PLAN, corridors, inCorridor, groundY, terrainY, terraceW, stairY, standY, districtAt, anchor, ANCHOR_NAMES, roadPaths, landmarkSlots, toWorld, coastDist, polyDist, rockY, COAST} from './plan.js';
import {downtown, mainStreetLots, placeBuilding} from './downtown.js';
import {west, westReserves, houseLot, housePicker} from './west.js';
import {setKitTextures, kitMat, recolorMap, LIGHT_WOOD, cityWindows} from './kit/mats.js';
import {cityProps, LAMP_HEADS} from './kit/props.js';
import {livingTown, keyArtProps} from './living.js';
import {keyArt} from './plan.js';
import {harbor, harborDecks, deckAt} from './harbor.js';
import {wild} from './wild.js';
import {preloadTrees, proceduralSpecies, bakeImpostors, treeField} from './trees.js';
import {setLOD, lodFor} from './kit/building.js';
import PRESETS from './kit/presets.json' with {type: 'json'};
export {groundY, PLAN};

const H = PLAN.heights;
export const LAYER = {water: H.waterY, sidewalk: .16, road: .26, plaza: PLAN.terrain.terrace.y + .06, deck: PLAN.roads.boardwalk.deck};
// v3 fallback look (episodes should use spec look4 'cityDay'): bright late morning, no near haze.
export const LOOK = {fog: {color: '#cfe8ff', near: 420, far: 900, height: {amount: 0}}, envPreset: 'day', envIntensity: .55, cloudCover: .35, hemiGround: '#9a8e74', sunColor: '#fff6e6'};
export const NEAR_R = 60, CULL_R = 110, TERRAIN_R = 90, PROPS_R = 150;   // Phase 1D: terrain fine-chunk radius + street-prop draw radius (studs)
const KIT_LOD = {near: 30, mid: 95};   // Phase 1C: kit building LOD radii (studs): near ≤ 3k tris, mid ≤ 600, far a box
const ASSETS = {tex: {}, models: {}, manifest: null};

// CC0 farm cache (renders/cache/assets/manifest.json, written by scripts/v2/fetch-assets.py). Missing → procedural fallback.
export async function preload(base) {
  try { await preloadCity(base); } finally {   // Phase 1E: hero trees (CC0 when cached, else procedural) + cached impostor atlases, always
    try { ASSETS.trees = await preloadTrees(base, ASSETS.manifest); } catch (e) { console.warn('trees', e?.message); }
    try { const r = await fetch(new URL('renders/cache/assets/impostors/manifest.json', base)); if (r.ok) { const m = await r.json(), L = new T.TextureLoader(); ASSETS.impostors = {};
      for (const [n, e] of Object.entries(m)) { if (e.source !== ASSETS.trees?.[n]?.source) continue; const ld = f => L.loadAsync(new URL('renders/cache/assets/impostors/' + f, base).href).then(t => { t.colorSpace = T.NoColorSpace; t.generateMipmaps = true; return t; });
        const [color, normal] = await Promise.all([ld(e.color), ld(e.normal)]); color.colorSpace = T.LinearSRGBColorSpace; ASSETS.impostors[n] = {...e, color, normal}; } } } catch { /* bake at build */ }
  }
}
async function preloadCity(base) {
  try {
    const r = await fetch(new URL('renders/cache/assets/manifest.json', base)); if (!r.ok) return; ASSETS.manifest = await r.json();
  } catch { return; }
  const L = new T.TextureLoader(), man = ASSETS.manifest;
  for (const slot of ['city_asphalt', 'city_sidewalk', 'city_planks', 'city_brick', 'city_sand', 'city_grass', 'city_plaster', 'city_shingles', 'city_terracotta', 'city_stone']) {
    const e = man.materials?.[slot]; if (!e) continue;
    try { const dir = `renders/cache/assets/${e.id}/`, ld = (f, srgb) => f ? L.loadAsync(new URL(dir + f, base).href).then(t => { t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 4; return t; }) : null;
      const [map, normalMap, roughnessMap] = await Promise.all([ld(e.maps.albedo, true), ld(e.maps.normal), ld(e.maps.rough)]); ASSETS.tex[slot] = {map, normalMap, roughnessMap};
    } catch { /* procedural fallback */ }
  }
  if (man.models) {
    const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'), gl = new GLTFLoader();
    for (const [slot, e] of Object.entries(man.models)) {
      try { const g = await gl.loadAsync(new URL(`renders/cache/assets/${e.id}/${e.file}`, base).href); ASSETS.models[slot] = modelParts(g.scene); } catch { /* procedural fallback */ }
    }
  }
}
// A glTF scene → [{geometry, material}] in model space, scaled to 1 stud = 1 m (Poly Haven models are metric), feet at y 0.
function modelParts(root) {
  root.updateMatrixWorld(true); const parts = [], box = new T.Box3().setFromObject(root);
  root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone().applyMatrix4(o.matrixWorld); g.translate(0, -box.min.y, 0); parts.push({geometry: g, material: o.material}); } });
  const tris = parts.reduce((s, p) => s + (p.geometry.index ? p.geometry.index.count : p.geometry.attributes.position.count) / 3, 0);
  return {parts, tris, height: box.max.y - box.min.y};
}

// ---- small geometry helpers ------------------------------------------------------------------------------------------------
const col = c => new T.Color(c);
function boxAt(w, h, d, x, y0, z, yaw, segH = 1) { const g = new T.BoxGeometry(w, h, d, 1, segH, 1); g.translate(0, h / 2, 0); g.rotateY(yaw); g.translate(x, y0, z); return g; }
function gable(w, rh, d, x, y0, z, yaw) {   // triangular prism roof along the lot's depth axis
  const s = new T.Shape([new T.Vector2(-w / 2 - .4, 0), new T.Vector2(w / 2 + .4, 0), new T.Vector2(0, rh)]), g = new T.ExtrudeGeometry(s, {depth: d + .8, bevelEnabled: false});
  g.translate(0, 0, -(d + .8) / 2); g.rotateY(yaw); g.translate(x, y0, z); return g.toNonIndexed();
}
function slab(w, d, x, z, yaw, y, step = 2) {   // ground slab (top at y) subdivided for the contact-AO bake
  const g = new T.BoxGeometry(w, .6, d, Math.max(1, Math.round(w / step)), 1, Math.max(1, Math.round(d / step))); g.translate(0, y - .3, 0);
  g.rotateY(yaw); g.translate(x, 0, z); return g;
}
const footY = (x, z, w, d, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw), ys = [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => groundY(x + (a * w / 2) * c + (b * d / 2) * s, z - (a * w / 2) * s + (b * d / 2) * c)); return [Math.min(...ys), Math.max(...ys)]; };
const nearestAnchor = (x, z, A) => Math.min(...A.map(a => Math.hypot(x - a[0], z - a[1])));
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- district lots (pure: positions, sizes, styles) ---------------------------------------------------------------------------
const STYLE = {   // per district: lot width / depth / height ranges, roof kind
  plaza: {w: [12, 16], d: [11, 14], h: [7, 10], roof: 'flat', gap: 1.5},
  town: {w: [11, 14], d: [10, 12], h: [7, 11], roof: 'flat', gap: 2.5},
  mainSt: {w: [9, 13], d: [11, 13], h: [6, 11], roof: 'flat', gap: 1},
  school: {w: [9, 11], d: [8, 10], h: [4.5, 6], roof: 'gable', gap: 6},
  harbor: {w: [8, 12], d: [9, 13], h: [4.5, 7], roof: 'gable', gap: 4},
};
export function cityLots(seed = 7, {reserve = [], front = {}} = {}) {   // Phase 1C: `front` = {district: extra front-yard studs} (opt-in; the school district gets lawns)   // Phase 1B (opt-in): `reserve` = [{x, z, r}] kept free (Main St kit buildings)
  const R = rng(seed), roads = roadPaths(), slots = landmarkSlots(), lots = reserve.map(r => ({...r, reserved: true})), COR = corridors();
  const clash = (x, z, r) => lots.some(l => Math.hypot(l.x - x, l.z - z) < r + l.r) || slots.some(s => Math.abs(x - s.at[0]) < s.fp[0] / 2 + r + 3 && Math.abs(z - s.at[1]) < s.fp[1] / 2 + r + 3)
    || (slots.find(s => s.tower) && slots.some(s => s.tower && Math.abs(x - s.tower.at[0]) < s.tower.fp[0] / 2 + r + 3 && Math.abs(z - s.tower.at[1]) < s.tower.fp[1] / 2 + r + 3));
  const roadClear = (x, z, r) => Object.entries(roads).every(([, rd]) => polyDist(x, z, rd.pts) > rd.w / 2 + PLAN.sidewalk + r * .7);
  const tryLot = (x, z, yaw, dist, opts = {}) => {
    if (!['plaza', 'town', 'mainSt', 'school', 'harbor'].includes(dist)) return;
    const S = STYLE[dist], w = opts.w ?? S.w[0] + R() * (S.w[1] - S.w[0]), d = opts.d ?? S.d[0] + R() * (S.d[1] - S.d[0]), h = opts.h ?? S.h[0] + R() * (S.h[1] - S.h[0]), r = Math.hypot(w, d) / 2 * .78;
    if (inCorridor(x, z, r * .6, COR) || coastDist(x, z) < r + 3 || Math.hypot(x, z) < PLAN.plaza.r * 2 + r + 4 || clash(x, z, r) || !roadClear(x, z, r)) return;
    const [y0, y1] = footY(x, z, w, d, yaw); if (y1 - y0 > 4) return;
    const pal = PLAN.districts[dist === 'town' ? 'plaza' : dist].palette;
    lots.push({x, z, yaw, w, d, h, r, y0, y1, district: dist, roof: opts.roof ?? S.roof, color: pal[Math.floor(R() * pal.length)], kind: opts.kind ?? 'lot', n: opts.n ?? [0, 1]});
  };
  // frontage rows along every street (not the boardwalk), both sides, facing the street
  for (const [k, rd] of Object.entries(roads)) {
    if (k === 'boardwalk') continue;
    const P = rd.pts, total = P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
    for (const side of [-1, 1]) for (let s = 6; s < total - 4;) {
      let acc = 0, i = 1; for (; i < P.length; i++) { const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc + L >= s) break; acc += L; }
      const a = P[i - 1], b = P[Math.min(i, P.length - 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = (s - acc) / L, tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
      const cx = a[0] + (b[0] - a[0]) * u, cz = a[1] + (b[1] - a[1]) * u, dist = districtAt(cx + tz * side * 14, cz - tx * side * 14), S = STYLE[dist] ?? STYLE.town;
      const d = S.d[0] + 1, off = rd.w / 2 + PLAN.sidewalk + 1.5 + (front[dist] ?? 0) + d / 2, n = [tz * side, -tx * side];
      tryLot(cx + n[0] * off, cz + n[1] * off, Math.atan2(-tz, tx), dist, {d, n});
      s += (S.w[1] + S.gap);
    }
  }
  // brick old town: a ring of 2–3 storey blocks around the plaza (open to the bay in the south and at the three radials)
  const PR = PLAN.plaza.r * 2 - 8;
  for (let a = 0; a < 360; a += 11) {
    const t = a * Math.PI / 180, x = Math.sin(t) * (PR + 14), z = -Math.cos(t) * (PR + 14);
    if (z > 6) continue; tryLot(x, z, -t, 'plaza', {d: 12, n: [Math.sin(t), -Math.cos(t)]});
  }
  // crescent arms: two bay-front rows flanking the Grand Stair, bowed toward the boardwalk, facing the bay
  { const C = PLAN.crescent; for (const side of [-1, 1]) for (let ax = C.x0; ax <= C.x1; ax += C.pitch) { const x = side * ax, z = C.z0 + C.bow * (ax / C.x1) ** 2, slope = 2 * C.bow * x / (C.x1 * C.x1);
      tryLot(x, z, -Math.atan(slope), 'plaza', {d: 12, h: 8 + R() * 3, n: [0, 0]}); } }
  // second rows (density behind the frontage) in the suburbs and Main St
  for (const l of lots.slice()) if (['school', 'mainSt', 'plaza'].includes(l.district) && R() < .8) {
    const bx = l.x + l.n[0] * (l.d + 5), bz = l.z + l.n[1] * (l.d + 5); tryLot(bx, bz, l.yaw, districtAt(bx, bz), {n: l.n});
  }
  // the school (big L block) next to the yard
  const [sx, sz] = toWorld([60, 150]); tryLot(sx - 6, sz, Math.PI / 2, 'school', {w: 40, d: 18, h: 10, roof: 'flat', kind: 'school'});
  tryLot(sx - 6, sz - 22, Math.PI / 2, 'school', {w: 18, d: 14, h: 8, roof: 'flat', kind: 'school'});
  return lots.filter(l => !l.reserved);
}
// harbour piers: from the bay shore of the east arm out into the water (pure)
export function piers() {
  const out = [], [x0, z0] = toWorld([292, 196]), [x1, z1] = toWorld([300, 290]);
  for (let k = 0; k < 5; k++) { const u = (k + .5) / 5, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
    let bx = x; while (coastDist(bx, z) > 0 && bx > x - 60) bx -= 1; out.push({x: bx - 11, z, len: 22, w: 3.2}); }
  return out;
}

// ---- build ------------------------------------------------------------------------------------------------------------------------
export function build(scene, {M, V, TR, look, spec, look4}) {
  const t0 = performance.now(), stats = {}, R = rng(11);
  setKitTextures(ASSETS.tex, M); const DT = !spec?.cityBlockout;   // Phase 1B: Downtown + kit buildings (spec cityBlockout: true = the 1A blockout)
  const A = ANCHOR_NAMES.map(n => anchor(n)), AXZ = A.map(a => [a.position[0], a.position[2]]), slots = landmarkSlots();
  const cityRoot = new T.Group(); cityRoot.name = 'city'; scene.add(cityRoot);
  // -- terrain (live: lit in real time; per-vertex colour = surface class)
  const focus = [...AXZ, ...slots.map(s => s.at), ...COAST.filter((_, i) => i % 12 === 0).filter(p => p[1] > 60)];
  const tMat = new T.MeshStandardMaterial({vertexColors: true, roughness: .95, metalness: 0, map: detailTexture(M), envMapIntensity: .35});
  const terrain = TR.buildTerrain({height: terrainY, size: 880, chunk: 55, fine: 2.75, fullR: 45, focus, centre: [0, 20], skirt: 3, material: tMat, tile: 7, name: 'cityTerrain'});
  const overview = !!spec?.cityOverview, cc = new T.Color(), tint = new T.Color();
  terrain.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position, n = o.geometry.attributes.normal, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); surfaceColour(cc, x, y, z, n.getY(i)); if (overview) { const dn = districtAt(x, z), D = PLAN.districts[dn]; if (D?.tint) cc.lerp(tint.set(D.tint), .55); } c.set([cc.r, cc.g, cc.b], i * 3); }
    o.geometry.setAttribute('color', new T.BufferAttribute(c, 3)); o.userData.live = true; });
  // Phase 1B: chunks wholly under the (opaque) water are never seen: hide them (frees the budget for wide bay shots)
  for (const m of terrain.children) { m.geometry.computeBoundingBox(); if (m.geometry.boundingBox.max.y < H.waterY - .3) m.visible = false; }
  // Phase 1D (opt-in spec.cityTerrainLod, default on for the city): a coarse twin of every chunk; onCamera shows a fine chunk only within TERRAIN_R of the lens
  const tLod = spec?.cityTerrainLod !== false && DT ? TR.buildTerrain({height: terrainY, size: 880, chunk: 55, fine: 2.75, fullR: -1, focus: [[1e9, 1e9]], centre: [0, 20], skirt: 3, material: tMat, tile: 7, name: 'cityTerrainLod'}) : null;
  if (tLod) { tLod.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position, n = o.geometry.attributes.normal, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { surfaceColour(cc, p.getX(i), p.getY(i), p.getZ(i), n.getY(i)); c.set([cc.r, cc.g, cc.b], i * 3); } o.geometry.setAttribute('color', new T.BufferAttribute(c, 3)); o.userData.live = true; });
    tLod.children.forEach((m, i) => { m.geometry.computeBoundingBox(); m.userData.fine = terrain.children[i]; m.visible = false; if (!terrain.children[i]?.name.endsWith('_near')) m.userData.fine = null; }); cityRoot.add(tLod); }
  const terrainLod = p => { if (!tLod) return; const v = new T.Vector3(p[0], p[1], p[2]);
    for (const m of tLod.children) { const f = m.userData.fine; if (!f) continue; const under = f.userData.under ??= (f.geometry.computeBoundingBox(), f.geometry.boundingBox.max.y < H.waterY - .3); if (under) continue;
      const far = m.geometry.boundingBox.distanceToPoint(v) > TERRAIN_R; f.visible = !far; m.visible = far; } };
  cityRoot.add(terrain); stats.terrainTris = terrain.children.filter(m => m.visible).reduce((s, m) => s + m.geometry.index.count / 3, 0);
  // -- water: one big plane (bay + sea), look4 water4 when available
  const WATER = look4?.water4 ? look4.water4({w: 1500, d: 1500, at: [0, H.waterY, 40], color: '#0a86cf', speed: .02}) : null;
  const water = WATER?.mesh ?? (() => { const m = new T.Mesh(new T.PlaneGeometry(1500, 1500), new T.MeshStandardMaterial({color: '#1890c8', roughness: .1})); m.rotation.x = -Math.PI / 2; m.position.set(0, H.waterY, 40); m.userData.live = true; return m; })();
  water.name = 'cityWater'; water.material.envMapIntensity = .45; water.material.roughness = .12; cityRoot.add(water);
  // shore foam ribbon (just seaward of the coast, unlit)
  cityRoot.add(foam());
  // -- district groups (each is a bake group)
  const groups = {}; const G = k => groups[k] ??= (() => { const g = new T.Group(); g.name = 'district:' + k; cityRoot.add(g); return g; })();
  // plaza paving
  const plazaMat = surf(M, 'city_brick', 'brick', '#c8674a', 4), plaza = new T.Mesh(new T.CircleGeometry(PLAN.plaza.r * 2 - .6, 64), plazaMat);
  { const g = new T.RingGeometry(0, PLAN.plaza.r * 2 - .6, 72, 30); g.rotateX(-Math.PI / 2); g.translate(0, LAYER.plaza, 0); planarUV(g, 4); plaza.geometry = g; }
  plaza.name = 'plazaPaving'; if (!DT) G('plaza').add(plaza);
  // -- roads / sidewalks / boardwalk (live ribbons on groundY)
  const roads = roadPaths(), roadMat = surf(M, 'city_asphalt', 'asphalt', '#55585f', 8), walkMat = surf(M, 'city_sidewalk', 'concrete', '#dedad2', 4), deckMat = surf(M, 'city_planks', 'woodPlanks', '#b98d5f', 4, '#d8c6a4');
  const roadGroup = new T.Group(); roadGroup.name = 'roads'; cityRoot.add(roadGroup); let roadTris = 0;
  for (const [k, rd] of Object.entries(roads)) {
    const pts = rd.pts.filter(p => Math.hypot(p[0], p[1]) > PLAN.plaza.r * 2 - 1 || k === 'boardwalk');
    if (k !== 'boardwalk' && Math.hypot(rd.pts[0][0], rd.pts[0][1]) < 1) { const d = rd.pts[1], L = Math.hypot(d[0], d[1]); pts.unshift([d[0] / L * (PLAN.plaza.r * 2 - 1), d[1] / L * (PLAN.plaza.r * 2 - 1)]); }
    const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0);
    if (k === 'boardwalk') {
      const deckY = (x, z) => Math.max(groundY(x, z) + .2, rd.deck);
      const m = ribbon(curve, rd.w, deckY, deckMat, .5, 2); m.name = 'boardwalk'; roadGroup.add(m); roadTris += triCount(m.geometry);
      roadGroup.add(posts(curve, rd.w, deckY)); if (DT) roadGroup.add(rails(curve, rd.w, deckY)); continue;
    }
    const side = ribbon(curve, rd.w + 2 * PLAN.sidewalk, (x, z) => groundY(x, z) + LAYER.sidewalk, walkMat, .6, 3); side.name = 'sidewalk_' + k;
    const road = ribbon(curve, rd.w, (x, z) => groundY(x, z) + LAYER.road, roadMat, .4, 3); road.name = 'road_' + k;
    roadGroup.add(side, road); roadTris += triCount(side.geometry) + triCount(road.geometry);
  }
  if (DT && PLAN.west?.lane) {   // Phase 1C: the school lane (asphalt ribbon + sidewalks, plan.json west.lane)
    const ln = PLAN.west.lane, curve = new T.CatmullRomCurve3(ln.pts.map(p => new T.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0);
    const side = ribbon(curve, ln.w + 2 * PLAN.sidewalk, (x, z) => groundY(x, z) + LAYER.sidewalk, walkMat, .6, 3), road = ribbon(curve, ln.w, (x, z) => groundY(x, z) + LAYER.road, roadMat, .4, 3);
    side.name = 'sidewalk_schoolLane'; road.name = 'road_schoolLane'; roadGroup.add(side, road); roadTris += triCount(side.geometry) + triCount(road.geometry);
  }
  roadGroup.traverse(o => { if (o.isMesh) o.userData.live = true; });
  stats.roadTris = roadTris;
  // -- district blockout
  const msLots = DT ? mainStreetLots() : [], lots = cityLots(7, {reserve: [...msLots.map(l => ({x: l.x, z: l.z, r: l.r * .85})), ...(DT ? westReserves() : [])], front: DT ? {school: PLAN.west.front} : {}}), houses = [], kitB = [], KR = rng(23), mats = new Map(), M0 = c => { if (!mats.has(c)) mats.set(c, new T.MeshStandardMaterial({color: c, roughness: .7, metalness: 0})); return mats.get(c); };
  let pickHouse = null;   // Phase 1E: no-repeat suburb picker (plan.json west.variety)
  const tiers = {};   // district → {hi: Group, lo: Group, mid: {colour: [geo]}}
  const tierOf = k => tiers[k] ??= {hi: new T.Group(), lo: new T.Group(), mid: new Map(), bounds: new T.Box3()};
  const pushMid = (k, c, g) => { const t = tierOf(k); if (!t.mid.has(c)) t.mid.set(c, []); t.mid.get(c).push(g); };
  for (const l of lots) {
    if (DT && l.district === 'school') { const b = houseLot(l, KR, {pick: PLAN.west.variety ? (pickHouse ??= housePicker(rng(PLAN.west.variety.seed ?? 5))) : null}); b.lot = l; G('school').add(b.group); kitB.push(b); houses.push(b); continue; }   // Phase 1C: pastel suburb houses
    if (DT && l.district === 'harbor') continue;   // Phase 1D: the east arm is curated (parts/city/harbor.js)
    if (DT && ['plaza', 'town', 'mainSt'].includes(l.district)) { const b = lotBuilding(l, KR); b.lot = l; G(l.district).add(b.group); kitB.push(b); continue; }
    const t = tierOf(l.district), near = nearestAnchor(l.x, l.z, AXZ) < NEAR_R, roofC = PLAN.districts[l.district === 'town' ? 'plaza' : l.district].roof;
    const base = l.y0 - .6, hBody = l.y1 - l.y0 + .6 + l.h;
    t.bounds.expandByPoint(new T.Vector3(l.x, l.y0, l.z));
    const body = segH => boxAt(l.w, hBody, l.d, l.x, base, l.z, l.yaw, segH);
    const roof = () => l.roof === 'gable' ? gable(l.w, Math.min(l.w, l.d) * .42, l.d, l.x, base + hBody, l.z, l.yaw) : boxAt(l.w + .5, .7, l.d + .5, l.x, base + hBody, l.z, l.yaw);
    if (near) {
      const hi = new T.Mesh(body(Math.max(2, Math.round(hBody / 3))), M0(l.color)); hi.name = 'lot'; t.hi.add(hi);
      t.hi.add(new T.Mesh(roof(), M0(roofC)));
      t.hi.add(new T.Mesh(slab(l.w + 6, l.d + 6, l.x, l.z, l.yaw, l.y1 + .12), M0(l.district === 'school' || l.district === 'harbor' ? '#cfcac0' : '#d8d2c8')));
      t.lo.add(new T.Mesh(body(1), M0(l.color)), new T.Mesh(roof(), M0(roofC)));
    } else { pushMid(l.district, l.color, body(1)); pushMid(l.district, roofC, roof()); }
  }
  // harbour piers (wood) + the duck rock (bay)
  if (!DT) for (const p of piers()) { const g = boxAt(p.len, 1.6, p.w, p.x, H.waterY - .2, p.z, 0); pushMid('harbor', '#9c7650', g); for (let k = -1; k <= 1; k += 2) pushMid('harbor', '#7a5a3c', boxAt(.6, 3.5, .6, p.x - p.len / 2 + 1, -2.5, p.z + k * (p.w / 2 - .3), 0)); }
  { const [dx, dz] = toWorld(PLAN.landmarks['5'].at), g = new T.SphereGeometry(1, 20, 10); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = .88 + .24 * Math.abs(Math.sin(x * 5.1 + z * 3.3 + y * 2.7)); p.setXYZ(i, x * k, y * k, z * k); }
    g.computeVertexNormals(); g.scale(PLAN.landmarks['5'].rock.rx * 2, (PLAN.landmarks['5'].rock.h - H.seaFloor), PLAN.landmarks['5'].rock.ry * 2); g.translate(dx, H.seaFloor, dz);
    const rock = new T.Mesh(g, M0('#8a8378')); rock.name = 'duckRock'; G('bay').add(rock); }
  for (const [k, t] of Object.entries(tiers)) {
    const g = G(k); t.hi.name = k + ':near'; t.lo.name = k + ':nearLo'; g.add(t.hi, t.lo);
    for (const [c, list] of t.mid) { const m = new T.Mesh(mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x)), M0(c)); m.name = k + ':mid'; g.add(m); }
  }
  // -- landmark slots (grey placeholder volumes, footprint + reserved height)
  const grey = new T.MeshStandardMaterial({color: '#a3a6ab', roughness: .8}), slotMeshes = [];
  for (const s of slots) {
    if (s.shape === 'stair') continue;   // built below as the real Grand Stair blockout
    if (DT && ['1', '2', '3'].includes(s.id)) continue;   // Phase 1B: built by parts/city/downtown.js
    if (DT && s.id === '4') continue;   // Phase 1C: the upside-down house (parts/city/west.js)
    if (DT && ['5', '6'].includes(s.id)) continue;
    if (DT && s.id === '7') continue;   // Phase 1E: the stone giant's head (parts/city/wild.js)   // Phase 1D: rubber-duck lighthouse, diner + burger tower (parts/city/harbor.js)
    const g = G(s.district === 'bay' ? 'bay' : s.district === 'wild' ? 'wild' : s.district), add = (geo, tag = '') => { const m = new T.Mesh(geo, grey); m.name = `slot:${s.id}${tag}`; g.add(m); slotMeshes.push(m); };
    if (s.shape === 'cyl') add(new T.CylinderGeometry(s.fp[0] / 2, s.fp[0] / 2 * 1.15, s.h, 20, 3).translate(s.at[0], s.base + s.h / 2, s.at[1]));
    else add(boxAt(s.fp[0], s.h + (s.base - Math.min(s.base, groundY(...s.at))) + .6, s.fp[1], s.at[0], s.base - .6, s.at[1], 0, Math.max(2, Math.round(s.h / 3))));
    if (s.tower) { const tb = Math.min(groundY(...s.tower.at), s.base); add(boxAt(s.tower.fp[0], s.tower.h + s.base - tb, s.tower.fp[1], s.tower.at[0], tb, s.tower.at[1], 0, Math.max(2, Math.round(s.tower.h / 4))), ':tower'); }
  }
  // -- Downtown (Phase 1B): Hall + bell tower + top hat, statue + fountain, backwards clock tower, plaza rings + props, Main St
  const dt = DT ? downtown({slots, layerPlaza: LAYER.plaza, statuePose: spec?.statuePose}) : null;
  if (dt) { G('plaza').add(dt.plaza); G('mainSt').add(dt.mainSt); kitB.push(...dt.buildings); stats.downtown = dt.stats; }
  const wst = DT ? west({houses, anchors: AXZ, R: rng(31)}) : null;   // Phase 1C: school + yard + bus, hero house + treehouse, upside-down house, lot dressing
  if (wst) { G('school').add(wst.group); kitB.push(...wst.buildings); stats.west = wst.stats; }
  const CITY = look4?.preset?.v4?.city ?? {};   // Phase 1E time-of-day: {beam, lamps, windows, stars, blimpLit} from the look4 preset (cityDay / cityDay2: none)
  const hb = DT ? harbor({slots, beam: !!CITY.beam}) : null;   // Phase 1D: fishing harbor, diner + burger tower, beach + pier + Ferris wheel, rubber-duck lighthouse
  if (hb) { G('harbor').add(hb.groups.harbor); G('beach').add(hb.groups.beach); G('bay').add(hb.groups.bay); kitB.push(...hb.buildings); stats.harbor = hb.stats; }
  for (const b of kitB) b.near.visible = b.mid.visible = b.far.visible = true;   // every LOD is baked; onCamera picks one
  // Phase 1C: bake near / mid / far as separate groups. The coplanar LOD boxes of a building that is not grid-aligned voxelise (conservative bbox voxels)
  // into a wedge in front of its own walls and shade the near walls black; each LOD alone bakes clean (same material, same colours, no new meshes).
  if (DT) for (const b of kitB) { let k = null; for (let q = b.group.parent; q; q = q.parent) if (/^district:/.test(q.name)) { k = q.name.slice(9); break; }
    if (k && !k.includes(':')) { G(k + ':mid').attach(b.mid); G(k + ':far').attach(b.far); } }
  // -- Grand Stair (slot 8) + the terrace's brick retaining wall (Phase 1B: light stone + coping + lamps from downtown.js)
  { const TRC = PLAN.terrain.terrace, ST = PLAN.terrain.stair, brick = surf(M, 'city_brick', 'brick', '#b5513c', 4), stone = DT ? kitMat('stone', '#efe6d2') : M0('#e3d6bb'), cap = DT ? kitMat('stone', '#fbf5e8') : M0('#f3ead6');
    const sx = g => { if (!DT) return g; g.computeBoundingBox(); const b = g.boundingBox, w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z, n = Math.max(1, Math.round(w / 4));   // Phase 1B: baked (cheap) + tessellated
      return new T.BoxGeometry(w, h, d, n, 1, 1).translate((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2); };
    const run = (ST.z1 - ST.z0 - ST.landing) / ST.steps, half = ST.steps / 2, base = PLAN.terrain.promenade - .5, tr = [];
    for (let k = 0; k < ST.steps; k++) { const z0 = ST.z0 + k * run + (k >= half ? ST.landing : 0); tr.push([z0, z0 + run, stairY(z0 + run / 2)]); }
    tr.push([ST.z0 + half * run, ST.z0 + half * run + ST.landing, stairY(ST.z0 + half * run + ST.landing / 2)]);
    const mass = [], caps = [], walls = [], hw = ST.w / 2;
    for (const [a, b, y] of tr) { const zc = (a + b) / 2, d = b - a;
      mass.push(sx(boxAt(ST.w, y - base - .15, d, ST.x, base, zc, 0))); caps.push(sx(boxAt(ST.w, .15, d, ST.x, y - .15, zc, 0)));
      for (const sd of [-1, 1]) { walls.push(boxAt(1.2, y + 1 - base, d, ST.x + sd * (hw + .6), base, zc, 0)); if (DT) caps.push(boxAt(1.6, .28, d + .02, ST.x + sd * (hw + .6), y + 1, zc, 0)); } }
    const part = (geos, mat, tag) => { const m = new T.Mesh(mergeGeometries(geos.map(g => { g = g.toNonIndexed(); boxUV(g, 4); return g; })), mat); m.name = 'slot:8' + tag; m.userData.live = !DT; G('plaza').add(m); slotMeshes.push(m); };
    part(mass, stone, ''); part(caps, cap, ':treads'); part(walls, brick, ':walls');
    // retaining wall along the terrace's south edge (stair gap in the middle) + coping
    const wz = TRC.rect[3], wl = [], cp = [], seg = (x0, x1) => { const w = x1 - x0; wl.push(sx(boxAt(w, TRC.y - base, 1.2, (x0 + x1) / 2, base, wz + .6, 0))); cp.push(boxAt(w, .4, TRC.coping, (x0 + x1) / 2, TRC.y, wz + .6 - .1, 0)); };
    seg(TRC.rect[0], ST.x - hw - 1.2); seg(ST.x + hw + 1.2, TRC.rect[2]);
    for (const [geos, mat, nm] of [[wl, brick, 'terraceWall'], [cp, cap, 'terraceCoping']]) { const m = new T.Mesh(mergeGeometries(geos.map(g => { g = g.toNonIndexed(); boxUV(g, 4); return g; })), mat); m.name = nm; m.userData.live = !DT; G('plaza').add(m); } }
  const wd = DT ? wild({groundY}) : null;   // Phase 1E: the wild edge (stone head + waterfall, trail + signposts, rope bridge, campsite, lookout, cave + cart)
  if (wd) { G('wild').add(wd.group); stats.wild = wd.stats; }
  // -- cave mouth (wild edge): dark recess at the cliff foot, facing south (Phase 1E: the rocky arch of wild.js replaces it)
  if (!wd) { const [cx, cz] = PLAN.cliff.cave, y = groundY(cx, cz + 3), cave = new T.Mesh(boxAt(9, 7, 4, cx, y - .5, cz - 1, Math.atan2(PLAN.cliff.to[1] - PLAN.cliff.from[1], PLAN.cliff.to[0] - PLAN.cliff.from[0]) * -1), new T.MeshBasicMaterial({color: '#17130f'}));
    cave.name = 'caveMouth'; cave.userData.live = true; cityRoot.add(cave); }
  // -- vegetation: forest on the wild edge, street trees, beach palms (procedural kit; CC0 models near anchors when cached)
  const vegGroup = new T.Group(); vegGroup.name = 'cityVegetation'; cityRoot.add(vegGroup);
  const slot7 = slots.find(s => s.id === '7'), cave = PLAN.cliff.cave;
  const HERO = DT && PLAN.trees;   // Phase 1E: hero trees + impostors replace the procedural lollipop trees city-wide (wild edge, streets, yards, treehouse)
  const forest = V.vegetation({height: groundY, veg: {trees: HERO ? [] : ['conifer', 'broadleaf', 'conifer'], treeDensity: .22, bushes: .06, rocks: .08, grass: 0, flowers: 0}, area: {x0: -330, x1: 335, z0: -275, z1: -95},
    avoid: (x, z) => districtAt(x, z) !== 'wild' || wd?.clear(x, z) || Math.hypot(x - slot7.at[0], z - slot7.at[1]) < 22 || Math.hypot(x - cave[0], z - cave[1]) < 14 || polyDist(x, z, roads.radialNorth.pts) < 8,
    focus: AXZ, nearR: 20, shadowR: 40, waterY: .5, maxSlope: 1.2, seed: 5, cell: 80});
  vegGroup.add(forest.group);
  const streetT = streetTrees(roads, lots, R);
  const town = V.vegetation({height: groundY, veg: {trees: [], bushes: .05, rocks: 0, grass: 0, flowers: 0}, area: {x0: -300, x1: 300, z0: -90, z1: 290},
    avoid: (x, z) => !['school', 'harbor', 'mainSt', 'town'].includes(districtAt(x, z)) || lots.some(l => Math.hypot(l.x - x, l.z - z) < l.r + 2) || Object.values(roads).some(r => polyDist(x, z, r.pts) < r.w / 2 + 4),
    focus: AXZ, nearR: 10, shadowR: 30, waterY: 1, seed: 9});
  vegGroup.add(town.group);
  if (dt) streetT.push(...dt.trees); if (wst) streetT.push(...wst.trees); if (hb) streetT.push(...hb.trees);   // Phase 1C: Main St + west arm trees (plan.json data)
  if (DT) for (let i = streetT.length - 1; i >= 0; i--) if (!streetT[i].keep && AXZ.some(a => Math.hypot(streetT[i].x - a[0], streetT[i].z - a[1]) < 8)) streetT.splice(i, 1);   // no trunk in a camera anchor's face
  let field = null;
  if (HERO) {
    const species = ASSETS.trees ?? proceduralSpecies(), atlases = bakeImpostors(species, {cached: ASSETS.impostors ?? {}}), KA = ANCHOR_NAMES.map(n => keyArt(n));
    const pts = [...forestPoints(wd, KA), ...streetT.filter(p => !p.palm).map((p, i) => ({...p, kind: p.kind ?? (i % 3 === 2 ? 'round' : 'leafy'), h: p.h ?? TREES.heights.street * p.s, s: 1})), ...(wd?.trees ?? []).map(p => ({...p, h: TREES.heights.onHead}))];
    field = treeField(pts, {species, atlases}); vegGroup.add(field.group);
    vegGroup.add(instTrees(V, streetT.filter(p => p.palm), 'palm', 23, AXZ));
    stats.trees = pts.length + streetT.filter(p => p.palm).length; stats.trees4 = {...field.stats, species: Object.fromEntries(Object.entries(species).map(([k, v]) => [k, {source: v.source, tris: v.tris, rawTris: v.rawTris ?? null, height: +v.height.toFixed(2)}])), atlases: Object.fromEntries(Object.entries(atlases).map(([k, a]) => [k, {w: a.w, h: a.h, views: a.views, baked: !!a.baked}]))};
    if (typeof window !== 'undefined') window.__impostorAtlases = atlases;
  } else {
  vegGroup.add(instTrees(V, streetT.filter(p => !p.palm), 'broadleaf', 21, AXZ), instTrees(V, streetT.filter(p => p.palm), 'palm', 23, AXZ));
  stats.trees = (forest.stats.trees ?? 0) + streetT.length; }
  // -- detail tiers per district: hi (near) vs lo; onCamera swaps by distance
  for (const t of Object.values(tiers)) t.bounds.expandByScalar(20);
  const cull = p => { for (const t of Object.values(tiers)) { const d = t.bounds.isEmpty() ? Infinity : t.bounds.distanceToPoint(new T.Vector3(p[0], t.bounds.min.y, p[2])); t.hi.visible = d < CULL_R; t.lo.visible = !t.hi.visible; } };
  // bake both tiers (bake runs once after build, before the first onCamera), so the lo tier is visible now too
  const anchors = Object.fromEntries(A.map(a => [a.name, {position: [a.position[0], standY(a.position[0], a.position[2]), a.position[2]], facing: a.facing, target: a.target, fov: a.fov, eye: a.position, district: a.district}]));
  // Look Signature (opt-in): key-art anchors `ka_<name>` (position = the subject's feet, camera = the key-art lens), their foreground
  // props (spec cityKeyArt: true = every hand-tuned variant | [names]) and the living town (spec cityLiving: true | [mover names])
  for (const n of ANCHOR_NAMES) { const k = keyArt(n); anchors['ka_' + n] = {position: k.subject, facing: k.yaw * 180 / Math.PI, camera: {position: k.position, target: k.target, fov: k.fov}, keyArt: k, district: PLAN.anchors[n].district}; }
  if (spec?.cityKeyArt) { const names = spec.cityKeyArt === true ? ANCHOR_NAMES.filter(n => !keyArt(n).auto) : spec.cityKeyArt, kap = names.flatMap(n => [[n, keyArt(n).fg], [n, keyArt(n).fgEdge]]).filter(([, f]) => f); for (const [n, f] of kap) { const kg = keyArtProps([f]); kg.userData.anchor = n; kg.userData.role = f.kind === 'boat' ? 'deck' : 'fg'; G(PLAN.anchors[n].district === 'bay' ? 'plaza' : PLAN.anchors[n].district).add(kg); }   /* Phase 1E: + the edge element; a boat is the stage deck, not a foreground element */ stats.keyArtProps = names.length; }
  const LIV = spec?.cityLiving ? livingTown({groundY, slots, roads, kitBuildings: kitB, focus: spec.cityLiving, lit: !!CITY.blimpLit, extra: wd?.movers ?? []}) : null;
  if (LIV) { cityRoot.add(LIV.group); stats.living = LIV.stats; }
  const wildMovers = !LIV && wd ? wd.movers : [];   // Phase 1E: without the living town the wild movers still run (waterfall, camp smoke, birds)
  for (const x of wildMovers) cityRoot.add(x.obj);
  // Phase 1E: street lamps along the roads (always built; lit with halos in dusk / night looks), stars, lit windows
  if (DT) G('town').add(cityProps(streetLamps(roads), {name: 'streetLampProps'}));
  cityWindows(CITY.windows ?? 0);
  const halos = []; if (CITY.lamps && look4?.halo) { cityRoot.updateMatrixWorld(true); const hg = new T.Group(); hg.name = 'lampHalos'; for (const h of LAMP_HEADS) { if (!h.group.parent) continue; const v = h.group.localToWorld(new T.Vector3(...h.at)), s = look4.halo(v.toArray(), '#ffd89a', 5, .7 * CITY.lamps); s.name = 'lampHalo'; hg.add(s); halos.push(s); } cityRoot.add(hg); stats.lampHalos = halos.length; }
  const stars = CITY.stars ? starDome(CITY.stars) : null; if (stars) cityRoot.add(stars);
  // Phase 1D: merged street-prop groups (lamps, benches, cafés, docks…) are not drawn beyond PROPS_R (a few pixels there; saves ~10k tris in wide harbor shots)
  const propGroups = []; cityRoot.traverse(o => { if (o.isGroup && /Props$/.test(o.name) && o.name !== 'keyArtProps') { const b = new T.Box3().setFromObject(o); if (!b.isEmpty()) propGroups.push([o, b]); } });
  const propCull = p => { const v = new T.Vector3(...p); for (const [o, b] of propGroups) o.visible = b.distanceToPoint(v) <= PROPS_R; };
  stats.lots = lots.length; stats.ms = Math.round(performance.now() - t0);
  const bakeGroups = Object.entries(groups).map(([k, root]) => ({root, preset: spec?.look4 ?? 'cityDay', name: k}));
  // Phase 1D: actors stand on decks (quay, piers, beach pier, key-art boats), not on the sea floor under them
  const decks = DT ? [...harborDecks(), ...wd.decks] : []; for (const n of (spec?.cityKeyArt ? (spec.cityKeyArt === true ? ANCHOR_NAMES.filter(n => !keyArt(n).auto) : spec.cityKeyArt) : [])) { const f = keyArt(n).fg; if (f?.kind === 'boat') decks.push({x: f.at[0], z: f.at[2], len: f.len - 3, w: (f.w ?? 7.6) - .6, yaw: f.yaw, y: f.y}); }
  const groundYD = decks.length ? (x, z) => { const d = deckAt(decks, x, z); return d ?? groundY(x, z); } : groundY;
  return {anchors, groundY: groundYD, decks, places: Object.fromEntries(slots.map(s => ['slot' + s.id, {at: [s.at[0], s.base, s.at[1]]}])), slots, stats, bakeGroups: spec?.look4 ? bakeGroups : undefined,
    onCamera(p, camera) { field?.onCamera(p, camera); cull(p); terrainLod(p); propCull(p); if (stars) stars.position.set(p[0], 0, p[2]); for (const h of halos) h.visible = h.position.distanceTo(new T.Vector3(...p)) < PROPS_R + 40; if (look?.sky) look.sky.position.set(p[0], 0, p[2]); for (const b of kitB) setLOD(b, lodFor(Math.hypot(p[0] - b.at[0], p[2] - b.at[2]) / (b.lodScale ?? 1), KIT_LOD)); },
    update(t) { WATER?.update(t); for (const x of wildMovers) x.update(t); forest.update?.(t); dt?.update(t); hb?.update(t); LIV?.update(t); }, living: LIV, harbor: hb,
    setState(k, v) { return (dt?.setState(k, v) || hb?.setState(k, v)) ?? false; }, downtown: dt, kitBuildings: kitB};
}

// Phase 1B: a district lot as a kit building (rows of brick / plaster / mansard around the plaza, candy fill on Main St).
function lotBuilding(l, R) {
  const r = R(), key = l.district === 'mainSt' ? 'rowCandy' : r < .45 ? 'rowBrick' : r < .75 ? 'rowPlaster' : 'mansardBrick', pre = PRESETS[key];
  const floors = Math.max(2, Math.min(3, Math.round(l.h / 3.6))), body = key === 'rowCandy' ? l.color : key === 'rowPlaster' ? ['#efe4cf', '#f3d9c4', '#e8eef2', '#f6e7b6'][Math.floor(R() * 4)] : ['#b9533d', '#a94a39', '#c0643f'][Math.floor(R() * 3)];
  const yaw = l.n[0] || l.n[1] ? Math.atan2(-l.n[0], -l.n[1]) : l.yaw, f = [l.x - Math.sin(yaw) * -l.d / 2, l.z - Math.cos(yaw) * -l.d / 2];
  return placeBuilding({...pre, footprint: [l.w, l.d], floors, palette: {...pre.palette, body}, seed: Math.floor(R() * 1e6), id: key}, l.x, l.z, yaw, f);
}
// ---- surfaces -------------------------------------------------------------------------------------------------------------------
// CC0 maps from the farm cache when present, else the procedural pattern (parts/materials.js std).
function surf(M, slot, pattern, color, tile, light = null) {   // Phase 1E (opt-in light): the CC0 map re-tinted by luminance to `light` (boardwalk planks)
  const c = ASSETS.tex[slot];
  if (c?.map) { for (const t of Object.values(c)) t && t.repeat.set(1, 1); const m = new T.MeshStandardMaterial({color: '#ffffff', map: (light && recolorMap(c.map, light, LIGHT_WOOD)) || c.map, normalMap: c.normalMap, roughnessMap: c.roughnessMap, roughness: 1}); m.userData.source = 'cc0:' + slot; m.userData.tile = tile; if (light) m.userData.lightWood = true; return m; }
  const m = M.std(pattern, color).clone(); m.userData.source = 'procedural:' + pattern; if (light) m.userData.lightWood = true; return m;
}
function boxUV(g, tile) {   // world-projected UVs per face direction (brick/stone read the same size on every wall)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), az = Math.abs(n.getZ(i)); if (ax > .5) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile); else if (az > .5) uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile); else uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); }
}
function planarUV(g, tile) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile); }
function detailTexture(M) {   // neutral grey detail noise (vertex colours carry the hue)
  const n = 128, f = M.noiseField ? M.noiseField(n, 16, 3) : new Float32Array(n * n).fill(.5), b = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) { const v = Math.round(255 * (.82 + .18 * f[i])); b.set([v, v, v, 255], i * 4); }
  const t = new T.DataTexture(b, n, n); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.needsUpdate = true; return t;
}
// Surface class colour (bright candy palette): sand at the shore/beach, town grass, forest floor, rock on steep slopes.
const C = {sand: col('#f2dca0'), wetSand: col('#d9c088'), grass: col('#6cc24a'), grass2: col('#8fd35a'), forest: col('#3f7d34'), forest2: col('#56913d'), rock: col('#8e877c'), rock2: col('#a59d90'), seabed: col('#c7b88a'), paving: col('#d6c3a5'), paving2: col('#cdb592')};
function surfaceColour(out, x, y, z, ny) {
  const w = .5 + .5 * Math.sin(x * .071 + Math.sin(z * .053) * 2) * Math.sin(z * .067 - x * .021);
  if (y < H.waterY - .2) return out.copy(C.seabed);
  const dist = districtAt(x, z), steep = ny < (dist === 'wild' && PLAN.wild ? .5 : .82);   // Phase 1E: the wild hills stay green (bright mixed forest) up to ~60°; only cliffs read as rock
  if (steep) return out.copy(C.rock).lerp(C.rock2, w);
  if (dist === 'wild' && PLAN.wild) return out.copy(C.grass).lerp(C.forest2, .35 + .4 * w).lerp(C.rock, ny < .62 ? .35 : 0);
  if (terraceW(x, z) > .98) return out.copy(C.paving).lerp(C.paving2, w);
  if (dist === 'beach' || (y < 1.6 && coastDist(x, z) < 9)) return out.copy(y < .7 ? C.wetSand : C.sand);
  if (dist === 'wild') return out.copy(C.forest).lerp(C.forest2, w).lerp(C.rock, ny < .85 ? .45 : 0);
  return out.copy(C.grass).lerp(C.grass2, w);
}
function foam() {
  const pts = COAST, pos = [], idx = []; let k = 0;
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = dz / L, nz = -dx / L;
    const s = coastDist(a[0] + nx * 2, a[1] + nz * 2) < 0 ? 1 : -1;   // outward = seaward
    for (const [p, q] of [[a, 0], [b, 0]]) void q, pos.push(p[0], H.waterY + .05, p[1], p[0] + nx * s * 2.2, H.waterY + .05, p[1] + nz * s * 2.2);
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); k += 4; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new T.Mesh(g, new T.MeshBasicMaterial({color: '#f4fbff', transparent: true, opacity: .55, depthWrite: false, side: T.DoubleSide})); m.name = 'shoreFoam'; m.userData.live = true; return m;
}
function ribbon(curve, width, heightFn, material, thick, step) {
  const L = curve.getLength(), n = Math.max(2, Math.ceil(L / step)), pos = [], uv = [], idx = [], tile = material.userData?.tile ?? 4;
  for (let i = 0; i <= n; i++) { const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u), sx = t.z * width / 2, sz = -t.x * width / 2;
    for (const k of [-1, 1]) { const x = p.x + sx * k, z = p.z + sz * k; pos.push(x, Math.max(heightFn(x, z), heightFn(p.x, p.z)), z); uv.push((k + 1) / 2 * width / tile, u * L / tile); } }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const base = pos.length / 3;   // skirts
  for (let i = 0; i <= n; i++) for (const k of [0, 1]) { const j = (i * 2 + k) * 3; pos.push(pos[j], pos[j + 1] - thick, pos[j + 2]); uv.push(uv[(i * 2 + k) * 2], uv[(i * 2 + k) * 2 + 1] + thick / tile); }
  for (let i = 0; i < n; i++) for (const k of [0, 1]) { const a = i * 2 + k, b = a + 2, c = base + a, d = base + b; if (k) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new T.Mesh(g, material); m.receiveShadow = true; return m;
}
function posts(curve, width, deckY) {
  const list = [], L = curve.getLength(), g = new T.CylinderGeometry(.25, .25, 1, 6); g.translate(0, .5, 0);
  for (let s = 2; s < L; s += 6) { const p = curve.getPointAt(s / L), t = curve.getTangentAt(s / L); for (const k of [-1, 1]) { const x = p.x + t.z * width / 2 * k * .9, z = p.z - t.x * width / 2 * k * .9, gy = groundY(x, z), top = deckY(x, z); if (top - gy > .5) list.push([x, gy, z, top - gy]); } }
  const im = new T.InstancedMesh(g, new T.MeshStandardMaterial({color: '#7a5a3c', roughness: .9}), Math.max(1, list.length)), m = new T.Matrix4();
  list.forEach(([x, y, z, h], i) => im.setMatrixAt(i, m.makeScale(1, h, 1).setPosition(x, y, z))); im.count = list.length; im.name = 'boardwalkPosts'; im.userData.live = true; im.computeBoundingSphere(); return im;
}
// Phase 1C: boardwalk railing (top rail + posts on both edges), merged per ~26-stud chunk so only the chunks in frame count (live): the boardwalk's leading lines.
function rails(curve, width, deckY) {
  const L = curve.getLength(), out = new T.Group(), step = 6.5, per = 4, mat = new T.MeshStandardMaterial({color: '#f4efe4', roughness: .6}), mk = (w, h, d, x, y, z, ry = 0) => { const g = new T.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x, y + h / 2, z); return g.toNonIndexed(); };
  out.name = 'boardwalkRail';
  for (const k of [-1, 1]) { let prev = null, geos = [], n = 0;
    const flush = () => { if (geos.length) { const m = new T.Mesh(mergeGeometries(geos), mat); m.name = 'boardwalkRail'; m.userData.live = true; out.add(m); } geos = []; };
    for (let s = 0; s <= L + step; s += step) { const u = Math.min(1, s / L), p = curve.getPointAt(u), t = curve.getTangentAt(u), x = p.x + t.z * width / 2 * k * .96, z = p.z - t.x * width / 2 * k * .96, y = deckY(x, z);
      geos.push(mk(.32, 1.9, .32, x, y, z)); if (prev) { const dx = x - prev[0], dz = z - prev[2], len = Math.hypot(dx, dz); geos.push(mk(.24, .26, len + .05, (x + prev[0]) / 2, (y + prev[1]) / 2 + 1.5, (z + prev[2]) / 2, Math.atan2(dx, dz))); }
      prev = [x, y, z]; if (++n % per === 0) flush(); }
    flush(); }
  return out;
}
const triCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
// street trees: both sides of every street in the sidewalk verge, skipping lots and the plaza; palms on the harbour/beach
function streetTrees(roads, lots, R) {
  const out = [];
  for (const [k, rd] of Object.entries(roads)) {
    if (k === 'boardwalk') continue; const P = rd.pts;
    for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
      for (let s = 10; s < L; s += 17) for (const side of [-1, 1]) { const off = rd.w / 2 + PLAN.sidewalk - .6, x = a[0] + tx * s + tz * off * side, z = a[1] + tz * s - tx * off * side, d = districtAt(x, z);
        if (MS_SKIP(k, x, z) || Math.hypot(x, z) < PLAN.plaza.r * 2 + 4 || d === 'wild' || inCorridor(x, z, 3) || coastDist(x, z) < 3 || lots.some(l => Math.hypot(l.x - x, l.z - z) < l.r * .6)) continue;
        out.push({x, z, y: groundY(x, z) + LAYER.sidewalk, s: .75 + R() * .3, r: R() * 6.28, palm: d === 'harbor' || d === 'beach'}); } }
  }
  const [bx, bz] = toWorld([308, 300]); for (let i = 0; i < 6; i++) { const x = bx - 30 + i * 11, z = bz - 10 + (i % 2) * 6; if (groundY(x, z) > .8) out.push({x, z, y: groundY(x, z), s: .9, r: i, palm: true}); }
  return out;
}
// Phase 1E: the wild-edge forest: a jittered grid over the wild district (plan.json trees.forest), sunny clearings from a smooth noise mask,
// never on the trail / features / steep rock / key-art lenses + subjects; pines up high and on the north slope, leafy + round lower down.
const TREES = PLAN.trees ?? {heights: {}};
function forestPoints(wd, KA) {
  const F = TREES.forest, R = rng(F.seed), out = [], nz = (x, z) => { const a = Math.sin(x * .021 + 1.3) * Math.cos(z * .027 - .4), b = Math.sin(x * .053 + z * .031 + 2.1); return .5 + .32 * a + .18 * b; };
  for (let x = F.area[0]; x <= F.area[2]; x += F.spacing) for (let z = F.area[1]; z <= F.area[3]; z += F.spacing) {
    const px = x + (R() - .5) * F.spacing * .9, pz = z + (R() - .5) * F.spacing * .9;
    if (districtAt(px, pz) !== 'wild' || coastDist(px, pz) < 5 || wd?.clear(px, pz) || nz(px, pz) > F.clearing) continue;
    const y = groundY(px, pz), sl = Math.hypot(groundY(px + 1, pz) - groundY(px - 1, pz), groundY(px, pz + 1) - groundY(px, pz - 1)) / 2; if (sl > F.maxSlope || y < 3) continue;
    if (KA.some(k => Math.hypot(k.position[0] - px, k.position[2] - pz) < 6 || Math.hypot(k.subject[0] - px, k.subject[2] - pz) < 10)) continue;
    const pine = y > F.pineAbove || R() < F.pineShare, kind = pine ? 'pine' : R() < .3 ? 'round' : 'leafy';
    out.push({x: px, y: y - .1, z: pz, r: R() * 6.28, kind, h: TREES.heights[kind] * (.8 + .4 * R()), s: 1}); }
  return out;
}
// Phase 1E: street lamps every ~34 studs along the asphalt roads, alternating sides, between the street trees (sidewalk edge)
function streetLamps(roads) {
  const out = [];
  for (const [k, rd] of Object.entries(roads)) {
    if (k === 'boardwalk') continue; const P = rd.pts; let n = 0;
    for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
      for (let s = 18.5; s < L; s += 34) { const side = n++ % 2 ? 1 : -1, off = rd.w / 2 + PLAN.sidewalk - .4, x = a[0] + tx * s + tz * off * side, z = a[1] + tz * s - tx * off * side;
        if (Math.hypot(x, z) < PLAN.plaza.r * 2 + 4 || districtAt(x, z) === 'wild' || inCorridor(x, z, 2) || coastDist(x, z) < 3 || ANCHOR_NAMES.some(nm => { const q = anchor(nm).position; return Math.hypot(q[0] - x, q[2] - z) < 9; })) continue;
        out.push({kind: 'lamp', at: [x, groundY(x, z) + LAYER.sidewalk, z]}); } }
  }
  return out;
}
// Phase 1E: a starry night sky (unlit points on a dome that follows the lens; never in masks or the bake)
function starDome(k = 1) {
  const R = rng(77), n = 1400, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = R(), a = R() * Math.PI * 2, el = Math.asin(.06 + .94 * u * u * 0 + .94 * u), r = 640; p.set([Math.cos(el) * Math.sin(a) * r, Math.sin(el) * r, Math.cos(el) * Math.cos(a) * r], i * 3); const b = (.45 + .55 * R()) * k, w = R(); c.set([b * (.85 + .15 * w), b * .92, b], i * 3); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3));
  const m = new T.Points(g, new T.PointsMaterial({size: 1.8, sizeAttenuation: false, vertexColors: true, fog: false, toneMapped: false, transparent: true, depthWrite: false})); m.name = 'stars'; m.userData.live = true; m.renderOrder = -1; m.frustumCulled = false; return m;
}
// Phase 1B: no street trees in front of the Main St shop signs (the kit storefront stretch of plan.json mainStreet).
const MS_SKIP = (k, x) => k === PLAN.mainStreet?.road && x < Math.max(...PLAN.mainStreet.shops.map(s => s.s)) + 14;
// Instanced street trees: procedural kit near + far LOD, or a CC0 glTF model (farm cache) for trees within NEAR_R of an anchor.
function instTrees(V, list, species, seed, AXZ) {
  const g = new T.Group(); g.name = 'streetTrees_' + species; if (!list.length) return g;
  const NR = 22, near = list.filter(p => nearestAnchor(p.x, p.z, AXZ) < NR), far = list.filter(p => nearestAnchor(p.x, p.z, AXZ) >= NR);   // Phase 1B: near-LOD street trees within 35 of an anchor
  const model = ASSETS.models[species === 'palm' ? 'city_palm' : 'city_tree'];
  const useModel = model && model.tris <= 12000 && near.length * model.tris <= 60000;
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  const cells = pts => { const m = new Map(); for (const p of pts) { const k = Math.floor(p.x / 90) + ',' + Math.floor(p.z / 90); (m.get(k) ?? m.set(k, []).get(k)).push(p); } return [...m.values()]; };   // Phase 1C: per-cell instanced meshes (frustum-culled per cell)
  const inst0 = (geo, mat, pts, scale, name) => { const im = new T.InstancedMesh(geo, mat, pts.length); pts.forEach((p, i) => { e.set(0, p.r, 0); q.setFromEuler(e); im.setMatrixAt(i, m4.compose(new T.Vector3(p.x, p.y - .05, p.z), q, new T.Vector3(p.s * scale, p.s * scale, p.s * scale))); }); im.name = name; im.computeBoundingSphere(); im.userData.live = true; g.add(im); };
  const inst = (geo, mat, pts, scale, name) => { for (const c of cells(pts)) inst0(geo, mat, c, scale, name); };
  const kit = (pts, lod) => { if (!pts.length) return; const tg = V.treeGeometry(species, seed, {lod}); const bark = new T.MeshPhongMaterial({vertexColors: true, color: '#ffffff', shininess: 6}), leaf = new T.MeshPhongMaterial({vertexColors: true, color: '#ffffff', shininess: 10});
    inst(tg.trunk, bark, pts, 1, `tree_${species}_trunk_${lod}`); inst(tg.leaves, leaf, pts, 1, `tree_${species}_leaves_${lod}`); };
  if (useModel) { const k = 7 / Math.max(1, model.height); for (const p of model.parts) inst(p.geometry, p.material, near, k, `cc0_${species}`); } else kit(near, 'near');
  kit(far, 'far'); return g;
}
