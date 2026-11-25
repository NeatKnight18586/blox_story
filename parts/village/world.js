// parts/village/world.js — tuft P3: ONE world module for every BEAST VILLAGE location. The spec names the location
// (`spec.location`: beastYard | beastClass | homeDining | homeBedroom | villageStreet | festivalPlaza | titanCave); its DATA is
// parts/locations/<name>.json, built with the village kit (parts/village/kit.js + build.js): hero zone full detail (merged, baked),
// midground instanced, far terraced rooftops + window dots, hillside silhouette, TITAN's mountain on every exterior.
// Day / night / dusk = spec.look4 comedy | moonlit (or mystery) | dawn. Exports groundY + LAYER + LOOK (A1 / A4 world rules).
import * as T from 'three';
import * as K from './kit.js';
import * as VB from './build.js';

export const LAYER = {yard: .05, street: .1, plaza: .15};
let LOC = null;
export const hill = () => LOC?.hill ?? null;
export function groundY(x, z) { const h = LOC?.hill; if (!h) return 0; const c = Math.cos(h.dir ?? 0), s = Math.sin(h.dir ?? 0), dx = x - (h.centre?.[0] ?? 0), dz = z - (h.centre?.[1] ?? 0), dist = -(dx * s + dz * c);
  return K.hillY(dist, h); }
export const LOOK = spec => ({fog: {color: /moonlit|mystery/.test(spec.look4 ?? '') ? '#1b2944' : '#cfe3f5', near: 120, far: 600, height: {amount: 0}}, envPreset: 'day', envIntensity: .45, cloudCover: .5});
export async function preload(base, {spec}) { const name = spec.location ?? 'villageStreet'; LOC = await (await fetch(new URL(`parts/locations/${name}.json`, base))).json(); LOC.name = name; }
export const isNight = spec => /^(moonlit|mystery)$/.test(spec.look4 ?? '') || /night/.test(spec.look ?? '');

export function build(scene, {M, B, spec, look4}) {
  const L = LOC, night = isNight(spec), kit = VB.createKit({M, night, look4}), root = new T.Group(); root.name = 'village:' + L.name;
  const hero = VB.createBatch(kit, 'hero'), metaAll = [], lights = [], anchors = {};
  // ground: hero ground plane (baked) + a wide outer ground (live, cheap)
  const gw = L.ground?.size ?? [160, 160], gc = L.ground?.at ?? [0, 0];
  if (!L.interior || L.ground) { hero.addParts([{k: 'box', size: [gw[0], .2, gw[1]], at: [gc[0], L.interior ? -.2 : -.1, gc[1]], mat: L.ground?.mat ?? 'grass'}], new T.Matrix4());   // interiors: the outside ground sits under the room floor
    if (!L.interior) { const og = new T.Mesh(new T.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({color: night ? '#243026' : '#6f9550'})); og.position.y = -.25; og.name = 'outerGround'; og.userData.live = true; root.add(og); } }
  // yards / plazas as flat ribbons on their LAYER, streets as cobble ribbons (B.ribbon)
  for (const s of L.streets ?? []) root.add(VB.street(kit, B, s.path, s.width, groundY, {y: LAYER[s.layer ?? 'street'], mat: s.mat ?? 'cobble'}));
  // hero houses (full detail, each its own roof id), mid rows (instanced), far terraces + hillside
  let rid = 1;
  if (L.houses?.length) { const h = VB.heroHouses(kit, L.houses, groundY, {roofBase: rid}); root.add(h.group); metaAll.push(...h.meta); rid += L.houses.length; }
  const mids = (L.rows ?? []).flatMap(r => K.rowAlong(r.line, r.side, {seed: r.seed ?? 1, setback: r.setback ?? 2, gap: r.gap ?? [1.2, 3.0], skip: r.skip ?? []}));
  mids.push(...(L.midHouses ?? []));
  if (mids.length) { const m = VB.midHouses(kit, mids, groundY, {roofBase: 1000}); root.add(m.group); metaAll.push(...m.meta); }
  if (L.terraces) { const tl = K.terraces(L.terraces); const f = VB.farTerraces(kit, tl.map(e => ({...e, at: [e.at[0], 0, e.at[2]]})), groundY, {roofBase: 5000}); root.add(f.group); metaAll.push(...f.meta); }
  if (L.hill) root.add(VB.hillside(kit, {...L.hill, ...(L.terraces ? {rows: L.terraces.rows, span: (L.terraces.span ?? 220) * 1.6} : {}), night}));
  // walls, props, rooms (merged into the hero batch), lantern strings (2 draws), the mountain
  for (const w of L.walls ?? []) VB.wallRun(kit, hero, w.from, w.to, w);
  VB.props(kit, hero, L.props ?? [], groundY);
  for (const r of L.rooms ?? []) VB.room(kit, hero, r);
  for (const b of L.boxes ?? []) hero.addParts([{k: 'box', ...b}], new T.Matrix4());
  for (const d of L.discs ?? []) hero.addParts([{k: 'disc', ...d}], new T.Matrix4());   // round window frames   // free boxes (hatch frames, barn doors, stage backs …)
  let lanterns = [];
  if (L.lanternStrings?.length) { const ls = VB.lanternStrings(kit, L.lanternStrings.map(x => [x.from, x.to, {sag: x.sag ?? 1.4, every: x.every ?? 2.4}])); root.add(ls.group); lanterns = ls.lanterns; }
  if (L.mountain) root.add(VB.titanMountain(kit, L.mountain));
  root.add(hero.finish(0));
  // night practicals (baked into the static sets): lanterns + lit windows near the hero zone, capped (bake cost)
  if (night) { const pts = [...(L.lights ?? []), ...lanterns.filter((_, i) => i % (L.lightEvery ?? 6) === 0).map(p => ({p, color: [1, .72, .4], i: 1.4, range: 8}))].slice(0, L.maxLights ?? 14); lights.push(...pts); }
  else for (const l of L.dayLights ?? []) lights.push(l);
  for (const [n, a] of Object.entries(L.anchors ?? {})) anchors[n] = {position: [a.position[0], groundY(a.position[0], a.position[2]) + (a.position[1] ?? 0), a.position[2]], ...(a.camera ? {camera: a.camera} : {}), facing: a.facing ?? 0};
  if (!anchors.street) anchors.street = {position: [0, 0, 0], camera: L.views?.establish ?? {position: [0, 6, 30], target: [0, 4, 0], fov: 45}};
  scene.add(root);
  const roofs = new Map(metaAll.map(m => [m.id, m])), windows = metaAll.flatMap(m => m.windows ?? []);
  const api = {location: L.name, night, roofs, windows: {lit: windows.filter(Boolean).length, total: windows.length}, lanterns: lanterns.length, mountain: L.mountain ?? null,
    roofIdPass: (renderer, camera, w, h) => VB.roofIdPass(renderer, scene, camera, w, h), maskShare: (renderer, camera, w, h, name) => VB.maskPass(renderer, scene, camera, w, h, o => o.name === name), views: L.views ?? {}, data: L,
    tris: () => { let n = 0; scene.traverse(o => { if (!o.isMesh || !o.visible) return; let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (!v) return; const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3; n += t * (o.isInstancedMesh ? o.count : 1); }); return n; }};
  if (typeof window !== 'undefined') window.__village = api;
  return {anchors, groundY, lights, update() {}, village: api}; }
