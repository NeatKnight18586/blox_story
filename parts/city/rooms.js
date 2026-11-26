// parts/city/rooms.js — Phase 1G CITY INTERIORS (reusable world module, v3 world contract: groundY, LAYER, LOOK, preload, build).
// One room per location JSON (spec `location`: parts/locations/<name>.json, e.g. cityClassroom · cityDining) in the city look B
// (spec look4 cityDay2 + outline classic): bright saturated plastic + the city kit's CC0 planks / plaster when the farm cache has them.
// Location data: {room: {w, d, h, wall, wainscot, trim, floor, ceiling}, windows: [{side: back|left|right, x, y, w, h}], door: {side, x, w, h, color},
//   props: [{type, at: [x, y, z], rotY°, …}], outside: {ground, trees, fence, houses, sky}, practicals: [[x, y, z, colour, intensity]], anchors: {name: {position, camera, keyArt}}}.
// Prop types: desk (student desk + chair), teacherDesk (named drawer `teacherDrawer`, world.setState('drawer', 0…1) slides it out), bookshelf,
//   chalkboard (no text), wallClock (no numbers), globe, rug, cubbies, diningTable, chair, kitchen (base + upper cabinets, fridge, stove,
//   sink under a window), pendant (lamp), plant, picture (plain colour blocks). Everything is LIVE (lit in real time); the shell casts no shadows (an open Roblox set) + a warm ambient fill (location `ambient {color, i}`).
import * as T from 'three';
import {setKitTextures, kitMat} from './kit/mats.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

let LOC = null; const TEX = {};
export const LAYER = {floor: .02};
export const groundY = () => 0;
export const LOOK = {fog: {color: '#cfe8ff', near: 300, far: 900, height: {amount: 0}}, envPreset: 'day', envIntensity: .7, cloudCover: .3, hemiGround: '#b9ab8f', sunColor: '#fff6e6'};
export async function preload(base, {spec} = {}) {
  LOC = await (await fetch(new URL(`parts/locations/${spec?.location ?? 'cityClassroom'}.json`, base))).json(); LOC.name = spec?.location ?? 'cityClassroom';
  try { const man = await (await fetch(new URL('renders/cache/assets/manifest.json', base))).json(), L = new T.TextureLoader();
    for (const slot of ['city_planks', 'city_plaster', 'city_brick']) { const e = man.materials?.[slot]; if (!e) continue; const dir = `renders/cache/assets/${e.id}/`;
      const ld = (f, srgb) => f ? L.loadAsync(new URL(dir + f, base).href).then(t => { t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 4; return t; }) : null;
      const [map, normalMap, roughnessMap] = await Promise.all([ld(e.maps.albedo, true), ld(e.maps.normal), ld(e.maps.rough)]); TEX[slot] = {map, normalMap, roughnessMap}; } } catch { /* procedural / plain fallback */ }
}
const cache = new Map(), C = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const plastic = (col, o = {}) => C('p' + col + JSON.stringify(o), () => new T.MeshStandardMaterial({color: col, roughness: .45, metalness: 0, ...o}));
function boxUV(g, tile) { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
  const [u, v] = ax > .5 ? [p.getZ(i), p.getY(i)] : ay > .5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, u / tile, v / tile); } return g; }
function box(parent, w, h, d, at, m, {rot = 0, tile = 0, name = ''} = {}) { const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); if (tile) { g.translate(at[0], at[1], at[2]); boxUV(g, tile); g.translate(-at[0], -at[1], -at[2]); }
  const x = new T.Mesh(g, m); x.position.set(...at); x.rotation.y = rot; x.castShadow = x.receiveShadow = true; x.userData.live = true; if (name) x.name = name; parent.add(x); return x; }
const PROPS = {
  desk(g, e) { const top = plastic(e.color ?? '#ffcf3f'), leg = plastic('#3b4252', {roughness: .35});
    box(g, 2.6, .18, 1.7, [0, 2.0, 0], top); for (const [x, z] of [[1.1, .65], [-1.1, .65], [1.1, -.65], [-1.1, -.65]]) box(g, .16, 2.0, .16, [x, 0, z], leg);
    box(g, 2.2, .5, .1, [0, 1.45, -.75], top); const ch = plastic(e.seat ?? '#2f9df4'); box(g, 1.5, .16, 1.4, [0, 1.25, 1.35], ch); box(g, 1.5, 1.4, .16, [0, 1.41, 2.0], ch); for (const [x, z] of [[.6, .8], [-.6, .8], [.6, 1.9], [-.6, 1.9]]) box(g, .13, 1.25, .13, [x, 0, z], leg); },
  teacherDesk(g, e) { const w = plastic('#b86a2c'), dk = plastic('#8e4e1e'); box(g, 6, .3, 2.8, [0, 2.6, 0], w); box(g, .3, 2.6, 2.6, [-2.8, 0, 0], dk); box(g, 2.2, 2.6, 2.6, [1.85, 0, 0], dk); box(g, 5.2, 1.4, .15, [0, 1.2, -1.2], dk);
    const dr = new T.Group(); dr.name = 'teacherDrawer'; dr.position.set(1.85, 1.65, 0); g.add(dr); box(dr, 2.0, .8, 2.5, [0, 0, .05], w); box(dr, 1.9, .7, .08, [0, .05, 1.32], plastic('#d9893f')); box(dr, .7, .14, .14, [0, .4, 1.42], plastic('#f2bf3a', {metalness: .5, roughness: .3}));
    box(g, 1.1, .3, .8, [-1.6, 2.9, .2], plastic('#e8402f')); box(g, .9, .22, .7, [-1.6, 3.2, .2], plastic('#3d7fd6')); const ap = new T.Mesh(new T.SphereGeometry(.28, 14, 10), plastic('#e8322f', {roughness: .3})); ap.position.set(1.2, 3.18, .4); ap.castShadow = true; ap.userData.live = true; g.add(ap);
    g.userData.drawer = dr; },
  bookshelf(g, e) { const w = plastic(e.color ?? '#c9733a'), W = e.w ?? 5, H = e.h ?? 7, n = e.n ?? 4; box(g, W, H, .25, [0, 0, -.6], w); for (const s of [-1, 1]) box(g, .25, H, 1.4, [s * (W / 2 - .12), 0, 0], w);
    const cols = ['#e8402f', '#3d7fd6', '#ffcf3f', '#4fb548', '#9b59b6', '#ff8a30', '#2fb7b0', '#ff7eb6'];
    for (let k = 0; k <= n; k++) { const y = k * (H - .25) / n; box(g, W - .3, .2, 1.3, [0, y, 0], w); if (k === n) break; let x = -W / 2 + .35, i = k * 3;
      while (x < W / 2 - .6) { const bw = .28 + .14 * ((i * 7) % 3), bh = (H / n - .45) * (.65 + .3 * ((i * 5) % 4) / 4); box(g, bw, bh, .95, [x + bw / 2, y + .2, 0], plastic(cols[i % cols.length]), {rot: (i % 7 === 3) ? .18 : 0}); x += bw + .04; i++; } } },
  chalkboard(g, e) { const W = e.w ?? 12, H = e.h ?? 4.5; box(g, W, H, .15, [0, 0, 0], plastic('#2f6b4f', {roughness: .9})); const fr = plastic('#b86a2c');
    box(g, W + .5, .3, .5, [0, -.3, .15], fr); box(g, W + .5, .3, .3, [0, H, 0], fr); for (const s of [-1, 1]) box(g, .3, H + .3, .3, [s * (W / 2 + .1), -.05, 0], fr);
    for (const [x, c] of [[-2, '#ffffff'], [-1.4, '#ffcf3f'], [-.9, '#ff7eb6']]) box(g, .35, .1, .1, [x, -.08, .25], plastic(c)); },
  wallClock(g) { const f = new T.Mesh(new T.CylinderGeometry(.9, .9, .2, 28).rotateX(Math.PI / 2), plastic('#ffffff')); f.userData.live = true; g.add(f); const rim = new T.Mesh(new T.TorusGeometry(.92, .1, 8, 28), plastic('#e8402f')); rim.userData.live = true; g.add(rim);
    box(g, .08, .6, .05, [0, 0, .12], plastic('#1b1b22')); const m = box(g, .06, .8, .05, [0, 0, .14], plastic('#1b1b22')); m.rotation.z = -2.1; },
  globe(g) { box(g, .9, .2, .9, [0, 0, 0], plastic('#b86a2c')); box(g, .1, 1.2, .1, [0, .2, 0], plastic('#f2bf3a', {metalness: .5})); const s = new T.Mesh(new T.IcosahedronGeometry(.75, 3), plastic('#3d9df0'));
    s.position.y = 1.9; s.castShadow = true; s.userData.live = true; g.add(s); for (const [a, b] of [[.3, .6], [2.2, -.2], [4, .3]]) { const c = new T.Mesh(new T.SphereGeometry(.32, 10, 6), plastic('#5ccf3c')); c.position.set(Math.cos(a) * .55, 1.9 + b * .5, Math.sin(a) * .55); c.scale.set(1, .7, .5); c.lookAt(0, 1.9, 0); c.userData.live = true; g.add(c); } },
  rug(g, e) { box(g, e.w ?? 8, .04, e.d ?? 5, [0, 0, 0], plastic(e.color ?? '#ff7eb6', {roughness: .95})); box(g, (e.w ?? 8) - 1, .05, (e.d ?? 5) - 1, [0, 0, 0], plastic(e.inner ?? '#ffd1e6', {roughness: .95})); },
  cubbies(g, e) { const w = plastic('#f6f1e4'), n = e.n ?? 5; box(g, n * 1.2 + .2, 2.6, 1.0, [0, 0, 0], w); const cols = ['#e8402f', '#3d7fd6', '#4fb548', '#ffcf3f', '#9b59b6'];
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) box(g, 1.0, .9, .3, [-(n - 1) * .6 + i * 1.2, .3 + k * 1.2, .38], plastic(cols[(i + k * 2) % 5])); },
  diningTable(g, e) { const w = plastic(e.color ?? '#c98a4c'), W = e.w ?? 7, D = e.d ?? 4; box(g, W, .3, D, [0, 2.4, 0], w); for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(g, .35, 2.4, .35, [x * (W / 2 - .5), 0, z * (D / 2 - .5)], plastic('#a86d36'));
    box(g, W - .6, .04, D * .45, [0, 2.71, 0], plastic(e.runner ?? '#e8402f')); },
  chair(g, e) { const w = plastic(e.color ?? '#c98a4c'), cu = plastic(e.cushion ?? '#e8402f'); box(g, 1.5, .18, 1.5, [0, 1.5, 0], w); box(g, 1.3, .14, 1.3, [0, 1.68, 0], cu);
    for (const [x, z] of [[.6, .6], [-.6, .6], [.6, -.6], [-.6, -.6]]) box(g, .16, 1.5, .16, [x, 0, z], w); box(g, 1.5, 2.0, .16, [0, 1.68, -.68], w); for (const x of [-.45, 0, .45]) box(g, .14, 1.6, .18, [x, 1.68, -.66], plastic('#a86d36')); },
  kitchen(g, e) { const W = e.w ?? 16, cab = plastic(e.cabinet ?? '#ffffff'), top = plastic(e.top ?? '#2f3a4a', {roughness: .3}), knob = plastic('#f2bf3a', {metalness: .5, roughness: .3}), red = plastic('#e8402f');
    box(g, W, 2.6, 2.2, [0, 0, 0], cab); box(g, W + .2, .25, 2.4, [0, 2.6, .05], top);
    for (let i = 0; i < Math.floor(W / 2); i++) { const x = -W / 2 + 1 + i * 2; box(g, 1.8, 2.2, .08, [x, .2, 1.1], plastic(i % 2 ? '#e9f6ff' : '#ffffff')); box(g, .5, .1, .1, [x, 1.95, 1.17], knob); }
    for (let i = 0; i < Math.floor(W / 2.5); i++) { const x = -W / 2 + 1.25 + i * 2.5; box(g, 2.3, 2.4, 1.3, [x, 5.6, -.45], cab); box(g, .1, .5, .1, [x + .8, 5.9, .25], knob); }
    for (let i = 0; i < W / .8; i++) for (let k = 0; k < 3; k++) box(g, .78, .78, .05, [-W / 2 + .4 + i * .8, 2.85 + k * .8, -1.08], plastic((i + k) % 2 ? '#ffffff' : '#e8402f'));
    box(g, 2.6, .12, 1.5, [-W / 2 + 4, 2.86, .2], plastic('#cfd6de', {metalness: .6, roughness: .25})); box(g, 2.4, .4, 1.3, [-W / 2 + 4, 2.5, .2], plastic('#9aa3ad', {metalness: .5, roughness: .3}));
    const fr = W / 2 + 1.6; box(g, 3.0, 7.6, 2.4, [fr, 0, .1], plastic('#e8f2ff', {roughness: .3})); box(g, .14, 1.6, .2, [fr - 1.2, 3.6, 1.35], knob); box(g, 3.0, .06, .1, [fr, 5.0, 1.31], plastic('#b8c4d2'));
    box(g, 3.0, .4, 2.0, [W / 2 - 3, 2.86, .1], plastic('#3a3f47')); for (const [x, z] of [[-.7, -.4], [.7, -.4], [-.7, .5], [.7, .5]]) { const b = new T.Mesh(new T.TorusGeometry(.32, .07, 6, 16).rotateX(Math.PI / 2), red); b.position.set(W / 2 - 3 + x, 3.3, .1 + z); b.userData.live = true; g.add(b); }
    const pot = new T.Mesh(new T.CylinderGeometry(.45, .4, .6, 16), red); pot.position.set(W / 2 - 3.7, 3.6, -.3); pot.castShadow = true; pot.userData.live = true; g.add(pot); },
  pendant(g, e) { box(g, .06, e.drop ?? 2.5, .06, [0, -(e.drop ?? 2.5), 0], plastic('#2a2a30')); const sh = new T.Mesh(new T.ConeGeometry(.9, .8, 20, 1, true), plastic(e.color ?? '#e8402f', {side: T.DoubleSide})); sh.position.y = -(e.drop ?? 2.5) - .2; sh.userData.live = true; g.add(sh);
    const b = new T.Mesh(new T.SphereGeometry(.28, 12, 8), new T.MeshBasicMaterial({color: '#fff3c8', toneMapped: false})); b.position.y = -(e.drop ?? 2.5) - .45; b.userData.live = true; g.add(b); },
  plant(g, e) { box(g, 1.0, 1.0, 1.0, [0, 0, 0], plastic(e.pot ?? '#e8402f')); for (let i = 0; i < 7; i++) { const l = new T.Mesh(new T.SphereGeometry(.5, 10, 6), plastic('#3fae3a')); l.position.set(Math.cos(i * 2.4) * .35, 1.5 + (i % 3) * .35, Math.sin(i * 2.4) * .35); l.scale.set(.7, 1.3, .7); l.castShadow = true; l.userData.live = true; g.add(l); } },
  picture(g, e) { const W = e.w ?? 2.4, H = e.h ?? 1.8; box(g, W, H, .1, [0, 0, 0], plastic('#ffffff')); box(g, W - .3, H - .3, .06, [0, .15, .06], plastic(e.color ?? '#7ed957')); box(g, (W - .3) * .5, (H - .3) * .4, .07, [.2, .15, .08], plastic(e.accent ?? '#4fc3f7')); },
};
function room(root, R) {
  const W = R.w, D = R.d, H = R.h, wall = R.wall ?? '#bfe6ff', wain = R.wainscot ?? null, trim = plastic(R.trim ?? '#ffffff');
  const floorM = TEX.city_planks?.map ? (() => { const m = new T.MeshStandardMaterial({color: R.floor ?? '#d9a86a', map: TEX.city_planks.map, normalMap: TEX.city_planks.normalMap ?? null, roughness: .75}); return m; })() : plastic(R.floor ?? '#d9a86a', {roughness: .6});
  const fl = box(root, W, .3, D, [0, -.3, 0], floorM, {tile: 4}); fl.name = 'roomFloor';
  const ceil = box(root, W + 1, .4, D + 1, [0, H, 0], plastic(R.ceiling ?? '#fbfaf5', {emissive: R.ceiling ?? '#fbfaf5', emissiveIntensity: .35})); ceil.name = 'roomCeiling';
  const wm = plastic(wall, {roughness: .7}), wn = wain ? plastic(wain, {roughness: .5}) : null;
  // walls with openings: each wall is cut into boxes around its windows / door (side → [length, axis])
  const sides = {back: {L: W, at: (u, y, h, t) => [u, y, -D / 2 - t / 2], rot: 0}, front: {L: W, at: (u, y, h, t) => [u, y, D / 2 + t / 2], rot: 0}, left: {L: D, at: (u, y, h, t) => [-W / 2 - t / 2, y, u], rot: Math.PI / 2}, right: {L: D, at: (u, y, h, t) => [W / 2 + t / 2, y, u], rot: Math.PI / 2}};
  for (const [side, S] of Object.entries(sides)) { if ((R.open ?? []).includes(side)) continue; const holes = [...(LOC.windows ?? []).filter(w => w.side === side).map(w => ({x0: w.x - w.w / 2, x1: w.x + w.w / 2, y0: w.y, y1: w.y + w.h})),
      ...(LOC.door?.side === side ? [{x0: LOC.door.x - LOC.door.w / 2, x1: LOC.door.x + LOC.door.w / 2, y0: 0, y1: LOC.door.h}] : [])].sort((a, b) => a.x0 - b.x0);
    const t = .5, seg = (u0, u1, y0, y1, m) => { if (u1 - u0 < .01 || y1 - y0 < .01) return; const g = box(root, u1 - u0, y1 - y0, t, S.at((u0 + u1) / 2, y0, 0, t), m, {rot: S.rot}); return g; };
    let u = -S.L / 2; for (const h of holes) { seg(u, h.x0, 0, H, wm); seg(h.x0, h.x1, 0, h.y0, wm); seg(h.x0, h.x1, h.y1, H, wm); u = h.x1; } seg(u, S.L / 2, 0, H, wm);
    if (wn) { let u2 = -S.L / 2; for (const h of holes.filter(q => q.y0 < 3.2)) { seg2(u2, h.x0); u2 = h.x1; } seg2(u2, S.L / 2);
      function seg2(a, b) { if (b - a < .01) return; const g = box(root, b - a, 3.2, .12, S.at((a + b) / 2, 0, 0, -t + .06), wn, {rot: S.rot}); box(root, b - a, .2, .2, S.at((a + b) / 2, 3.2, 0, -t + .14), trim, {rot: S.rot}); } }
    box(root, S.L, .3, .14, S.at(0, 0, 0, -t + .1), trim, {rot: S.rot}); }
  // window frames + glass + mullions (live), door
  for (const w of LOC.windows ?? []) { const S = sides[w.side], fr = plastic(w.frame ?? '#ffffff'), add = (uu, y, ww, hh, dd, m, dz = 0) => box(root, ww, hh, dd, S.at(uu, y, 0, .5 + dz), m, {rot: S.rot});
    add(w.x, w.y - .3, w.w + .6, .3, .9, fr, .15); add(w.x, w.y + w.h, w.w + .6, .3, .7, fr); for (const s of [-1, 1]) add(w.x + s * (w.w / 2 + .15), w.y, .3, w.h, .7, fr); add(w.x, w.y, .15, w.h, .3, fr); add(w.x, w.y + w.h / 2, w.w, .15, .3, fr);
    const gl = add(w.x, w.y, w.w, w.h, .04, new T.MeshStandardMaterial({color: '#d8f0ff', transparent: true, opacity: .12, roughness: .05, depthWrite: false})); gl.castShadow = false; gl.name = 'windowGlass'; }
  if (LOC.door) { const S = sides[LOC.door.side], d = LOC.door; box(root, d.w - .2, d.h - .1, .2, S.at(d.x, 0, 0, .3), plastic(d.color ?? '#e8402f'), {rot: S.rot}); box(root, .3, .3, .3, S.at(d.x + d.w / 2 - .7, d.h * .45, 0, .05), plastic('#f2bf3a', {metalness: .5, roughness: .3}), {rot: S.rot}); }
}
function outside(root, O = {}) {   // what the windows look onto: a sunny lawn, a fence, trees, a few houses (cheap, live)
  const g = new T.Group(); g.name = 'outside'; root.add(g); const grass = plastic(O.ground ?? '#6cc04a', {roughness: .95});
  const gp = new T.Mesh(new T.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), grass); gp.position.y = -.35; gp.receiveShadow = true; gp.userData.live = true; g.add(gp);
  for (const f of O.fence ?? []) for (let i = 0; i <= f.n; i++) { const x = f.from[0] + (f.to[0] - f.from[0]) * i / f.n, z = f.from[1] + (f.to[1] - f.from[1]) * i / f.n; box(g, .3, 2.2, .3, [x, -.3, z], plastic('#ffffff')); }
  for (const [x, z, s] of O.trees ?? []) { box(g, .9 * s, 4 * s, .9 * s, [x, -.3, z], plastic('#8a5a35')); for (let k = 0; k < 4; k++) { const b = new T.Mesh(new T.IcosahedronGeometry(2.4 * s, 1), plastic(k % 2 ? '#46b43c' : '#5fcf4a', {flatShading: true})); b.position.set(x + Math.cos(k * 1.7) * 1.4 * s, (4.6 + (k % 2) * 1.2) * s, z + Math.sin(k * 1.7) * 1.2 * s); b.castShadow = true; b.userData.live = true; g.add(b); } }
  for (const h of O.houses ?? []) { box(g, h.w, h.h, h.d, [h.at[0], -.3, h.at[1]], plastic(h.color)); const r = new T.Mesh(new T.ConeGeometry(Math.hypot(h.w, h.d) / 2 + .4, h.h * .55, 4).rotateY(Math.PI / 4), plastic(h.roof ?? '#c0392b'));
    r.position.set(h.at[0], h.h - .3 + h.h * .27, h.at[1]); r.scale.set(h.w / Math.hypot(h.w, h.d) * 1.42, 1, h.d / Math.hypot(h.w, h.d) * 1.42); r.userData.live = true; g.add(r); }
  for (const b of O.boxes ?? []) box(g, b.size[0], b.size[1], b.size[2], [b.at[0], b.at[1] ?? -.3, b.at[2]], plastic(b.color));
}
// merge every static mesh under root into one mesh per (material, castShadow); meshes under a `keep` group (the drawer) stay live objects
function mergeStatic(root, keep) {
  root.updateMatrixWorld(true); const bins = new Map(), drop = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh) return; for (let p = o; p; p = p.parent) if (keep.has(p)) return; const k = o.material.uuid + ':' + o.castShadow;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); g.applyMatrix4(o.matrixWorld);
    if (!bins.has(k)) bins.set(k, {m: o.material, cast: o.castShadow, gs: [], names: []}); const b = bins.get(k); b.gs.push(g); if (o.name) b.names.push(o.name); drop.push(o); });
  for (const o of drop) o.removeFromParent();
  for (const b of bins.values()) { const m = new T.Mesh(mergeGeometries(b.gs), b.m); m.castShadow = b.cast; m.receiveShadow = true; m.userData.live = true; m.name = b.names.includes('windowGlass') ? 'windowGlass' : 'roomMerged'; root.add(m); }
}
export function build(scene, {M, spec} = {}) {
  setKitTextures({...TEX}, M); const L = LOC, root = new T.Group(); root.name = 'room:' + L.name; scene.add(root);
  const shell = new T.Group(); shell.name = 'roomShell'; root.add(shell); room(shell, L.room); outside(root, L.outside);
  shell.traverse(o => { if (o.isMesh) o.castShadow = false; });   // look B: the shell never shades the room (sun + sky light it like an open set); props still cast
  const amb = new T.AmbientLight(L.ambient?.color ?? '#fff4e6', L.ambient?.i ?? .9); amb.name = 'roomFill'; root.add(amb);
  const named = {};
  for (const e of L.props ?? []) { const g = new T.Group(); g.position.set(...e.at); g.rotation.y = (e.rotY ?? 0) * Math.PI / 180; g.name = 'roomProp:' + e.type + (e.id ? ':' + e.id : ''); PROPS[e.type](g, e); root.add(g); if (e.id) named[e.id] = g; if (g.userData.drawer) named.drawer = g.userData.drawer; }
  mergeStatic(root, new Set([named.drawer].filter(Boolean)));   // one draw per material (+ shadow pass): the bench lever
  const lights = []; for (const [x, y, z, col, i] of L.practicals ?? []) { const p = new T.PointLight(col ?? '#fff1d6', i ?? 30, 40, 1.6); p.position.set(x, y, z); p.name = 'practical'; root.add(p); lights.push(p); }
  const anchors = {}; for (const [n, a] of Object.entries(L.anchors ?? {})) anchors[n] = {position: a.position, facing: a.facing ?? 0, ...(a.camera ? {camera: a.camera} : {})};
  const drawerZ = named.drawer?.position.z ?? 0;
  const setState = (k, v) => { if (k === 'drawer' && named.drawer) { named.drawer.position.z = drawerZ + 2.0 * Math.max(0, Math.min(1, +v)); return true; } return false; };
  let tri = 0; root.traverse(o => { if (o.isMesh) tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  const api = {location: L.name, tris: tri, named, data: L}; if (typeof window !== 'undefined') window.__room = api;
  return {anchors, groundY, lights: [], update() {}, setState, room: api};
}
