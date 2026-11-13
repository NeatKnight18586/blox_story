// parts/vegetation.js — instanced trees, bushes, near-camera grass cards, rocks, flowers (Amendment A4 A4).
// Four tree species (trunk + leaf clusters, each ≤ 220 triangles, flat-shaded low-poly, three leaf tones by vertex colour).
// Every set is ONE InstancedMesh per (species, part, near|far): near instances cast shadows, far ones never do.
// Wind sway is in the vertex shader from a shared uniform uTime set by update(t): a pure function of the frame.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rng} from './build.js';

// ---- geometry (pure, Node-safe) -------------------------------------------------------------------------
const nonIdx = g => (g.index ? g.toNonIndexed() : g);
const tone = (g, cols, seed) => {   // per-face colour from a 3-tone set: shadow / base / highlight by face height + seed
  g = nonIdx(g); g.computeBoundingBox(); const p = g.attributes.position, c = new Float32Array(p.count * 3), R = rng(seed), {min, max} = g.boundingBox;
  for (let f = 0; f < p.count; f += 3) {
    const y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, h = (y - min.y) / Math.max(1e-6, max.y - min.y), r = R();
    const k = h < .3 ? 0 : h > .7 && r < .7 ? 2 : r < .2 ? 0 : 1, col = new T.Color(cols[k]);
    for (let v = 0; v < 3; v++) c.set([col.r, col.g, col.b], (f + v) * 3);
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
};
const at = (g, x, y, z, s = [1, 1, 1], r = [0, 0, 0]) => { g.scale(...s); g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(x, y, z); return g; };
const LEAF = {conifer: ['#2f5a3a', '#3f7448', '#5a8c56'], broadleaf: ['#3f6f2f', '#5c8f3c', '#86b052'], poplar: ['#4a7a34', '#6a9a42', '#93b85a'], palm: ['#3f7a3a', '#5e9a46', '#8cbf5a']};
const BARK = {conifer: '#5a4232', broadleaf: '#6a5038', poplar: '#8a7a64', palm: '#9a7f5c'};

export function treeGeometry(species, seed = 1) {
  const R = rng(seed * 7 + species.length), trunk = [], leaves = [];
  if (species === 'conifer') {
    trunk.push(at(new T.CylinderGeometry(.28, .42, 3.2, 5, 1, true), 0, 1.6, 0));
    for (let i = 0; i < 4; i++) leaves.push(at(new T.ConeGeometry(2.8 - i * .58, 3.4 - i * .3, 7), (R() - .5) * .2, 3.2 + i * 2.05, (R() - .5) * .2, [1, 1, 1], [0, R() * 3, 0]));
  } else if (species === 'broadleaf') {
    trunk.push(at(new T.CylinderGeometry(.32, .5, 4.2, 6, 1, true), 0, 2.1, 0));
    for (const s of [-1, 1]) trunk.push(at(new T.CylinderGeometry(.14, .22, 2.2, 4, 1, true), s * .7, 4.2, 0, [1, 1, 1], [0, 0, -s * .7]));
    const blobs = [[0, 6.4, 0, 2.6], [1.7, 5.6, .4, 1.9], [-1.6, 5.7, -.3, 2], [.3, 5.4, 1.6, 1.8], [-.4, 5.5, -1.6, 1.8]];
    for (const [x, y, z, r] of blobs) leaves.push(at(new T.IcosahedronGeometry(r, 0), x + (R() - .5) * .4, y + (R() - .5) * .4, z, [1, .82, 1], [R(), R(), 0]));
  } else if (species === 'poplar') {
    trunk.push(at(new T.CylinderGeometry(.22, .36, 3, 5, 1, true), 0, 1.5, 0));
    leaves.push(at(new T.IcosahedronGeometry(1.5, 0), 0, 4.2, 0, [1, 1.7, 1], [0, R(), 0]), at(new T.IcosahedronGeometry(1.25, 0), .1, 6.6, -.1, [1, 1.6, 1], [0, R(), 0]), at(new T.IcosahedronGeometry(.9, 0), 0, 8.6, .05, [1, 1.5, 1]));
  } else if (species === 'palm') {
    let x = 0, y = 0; for (let i = 0; i < 5; i++) { const dx = .18 + i * .06; trunk.push(at(new T.CylinderGeometry(.24, .3, 1.5, 5, 1, true), x + dx / 2, y + .75, 0, [1, 1, 1], [0, 0, -Math.atan2(dx, 1.5)])); x += dx; y += 1.45; }
    for (let i = 0; i < 7; i++) {   // fronds: a bent 3-segment strip each
      const a = i / 7 * Math.PI * 2 + R() * .3, g = new T.PlaneGeometry(.9, 3.6, 1, 3), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const v = p.getY(k) + 1.8; p.setXYZ(k, p.getX(k) * (1 - v / 4.2), -.12 * v * v, v); }
      g.computeVertexNormals(); leaves.push(at(g, x, y + .2, 0, [1, 1, 1], [0, a, 0]));
    }
    leaves.push(at(new T.IcosahedronGeometry(.45, 0), x, y, 0));
  } else throw Error('unknown tree ' + species);
  const tg = tone(mergeGeometries(trunk.map(nonIdx)), [BARK[species], BARK[species], new T.Color(BARK[species]).offsetHSL(0, 0, .06).getStyle()], seed);
  const lg = tone(mergeGeometries(leaves.map(nonIdx)), LEAF[species], seed + 3);
  tg.computeVertexNormals(); lg.computeVertexNormals();
  return {trunk: tg, leaves: lg};
}
export const bushGeometry = seed => { const R = rng(seed), parts = [0, 1, 2].map(i => at(new T.IcosahedronGeometry(.9 - i * .15, 0), (i - 1) * .7, .6 + R() * .2, (R() - .5) * .6, [1, .8, 1], [R(), R(), 0])); const g = tone(mergeGeometries(parts.map(nonIdx)), ['#3f6a32', '#5a8a40', '#7fae55'], seed); g.computeVertexNormals(); return g; };
export const rockGeometry = seed => { const R = rng(seed), g = nonIdx(new T.DodecahedronGeometry(1, 0)), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = .85 + R() * .3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .7, p.getZ(i) * k); } const out = tone(g, ['#7c7a76', '#9a968e', '#b5b0a6'], seed); out.computeVertexNormals(); return out; };
// crossed quads for grass/flowers (alpha-tested texture, uv.y = height for the sway)
export function cardGeometry(w = 1.6, h = .9) { const a = new T.PlaneGeometry(w, h); a.translate(0, h / 2, 0); const b = a.clone(); b.rotateY(Math.PI / 2); return mergeGeometries([a, b]); }
export const triCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

// ---- textures (browser only) ------------------------------------------------------------------------------
let grassTex = null, flowerTex = null;
function cardTexture(kind) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'), R = rng(kind === 'grass' ? 5 : 9);
  if (kind === 'grass') for (let i = 0; i < 22; i++) { const x = 4 + R() * 120, h = 26 + R() * 36, l = 150 + R() * 90 | 0; g.fillStyle = `rgb(${l * .55 | 0},${l},${l * .4 | 0})`; g.beginPath(); g.moveTo(x - 3, 64); g.quadraticCurveTo(x + (R() - .5) * 8, 64 - h * .6, x + (R() - .5) * 10, 64 - h); g.lineTo(x + 3, 64); g.fill(); }
  else { for (let i = 0; i < 6; i++) { const x = 10 + i * 20 + R() * 6, y = 20 + R() * 18; g.strokeStyle = '#4f8a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 64); g.lineTo(x, y); g.stroke(); g.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, 0, 7); g.fill(); } g.fillStyle = '#f2c230'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); } }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

// Wind (shader): sway ∝ local height, phase from the instance position; leaves add a small flutter.
const WIND = {uTime: {value: 0}, uWind: {value: 1}};
function windMaterial(m, {amp = .03, flutter = 0, byUv = false} = {}) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uWind = WIND.uWind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(instanceMatrix[3]); float ph = ip.x * .13 + ip.z * .17;
      float hh = ${byUv ? 'uv.y' : 'max(0., position.y)'};
      float sw = sin(uTime * 1.3 + ph) * .7 + sin(uTime * 2.9 + ph * 1.7) * .3;
      transformed.x += sw * ${amp.toFixed(4)} * hh * hh * uWind; transformed.z += cos(uTime * 1.1 + ph) * ${(amp * .5).toFixed(4)} * hh * hh * uWind;
      ${flutter ? `transformed += normal * sin(uTime * 6. + ph + position.y * 3.) * ${flutter.toFixed(4)} * uWind;` : ''}`);
  };
  m.customProgramCacheKey = () => `wind${amp}|${flutter}|${byUv}`;
  return m;
}
const mats = {};
const vMat = (key, make) => (mats[key] ??= make());

// ---- placement -----------------------------------------------------------------------------------------
// Scatter a biome's vegetation over `area` {x0,x1,z0,z1} on height(x,z). avoid(x,z) keeps paths/pads clear; trees skip
// slopes steeper than maxSlope and anything under waterY. Grass cards and flowers only inside `nearR` of a focus point.
export function vegetation({height, veg, area, seed = 1, avoid = () => false, focus = [[0, 0]], nearR = 30, shadowR = 45, waterY = -Infinity, density = 1, maxSlope = .45}) {
  const group = new T.Group(); group.name = 'vegetation'; const R = rng(seed), stats = {trees: 0, bushes: 0, rocks: 0, grass: 0, flowers: 0, triangles: 0};
  const slope = (x, z) => Math.hypot(height(x + 1, z) - height(x - 1, z), height(x, z + 1) - height(x, z - 1)) / 2;
  const nearest = (x, z) => Math.min(...focus.map(f => Math.hypot(x - f[0], z - f[1])));
  const sample = (perHundred, ok) => { const n = Math.round((area.x1 - area.x0) * (area.z1 - area.z0) / 100 * perHundred * density), out = []; for (let i = 0, tries = 0; out.length < n && tries < n * 12; tries++) { const x = area.x0 + R() * (area.x1 - area.x0), z = area.z0 + R() * (area.z1 - area.z0); if (avoid(x, z) || height(x, z) < waterY + .3 || !ok(x, z)) continue; out.push({x, z, y: height(x, z), r: R() * 6.283, s: .75 + R() * .5, k: R()}); i++; } return out; };
  const inst = (geo, mat, list, {cast, name, sx = p => [p.s, p.s, p.s], tint = null}) => {
    if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    list.forEach((p, i) => { e.set(0, p.r, 0); q.setFromEuler(e); m.compose(new T.Vector3(p.x, p.y - .05, p.z), q, new T.Vector3(...sx(p))); im.setMatrixAt(i, m); if (tint) im.setColorAt(i, tint(p)); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true; im.name = name; group.add(im); stats.triangles += triCount(geo) * list.length;
  };
  const split = list => [list.filter(p => nearest(p.x, p.z) <= shadowR), list.filter(p => nearest(p.x, p.z) > shadowR)];
  const tw = new T.Color();
  // trees: each species gets an even share of the biome's density
  const species = veg.trees ?? [];
  species.forEach((sp, si) => {
    const list = sample((veg.treeDensity ?? 0) / Math.max(1, species.length), (x, z) => slope(x, z) < maxSlope), geo = treeGeometry(sp, seed + si);
    const bark = vMat('bark', () => windMaterial(new T.MeshPhongMaterial({vertexColors: true, flatShading: true, shininess: 6}), {amp: .0025}));
    const leaf = vMat('leaf' + sp, () => windMaterial(new T.MeshPhongMaterial({vertexColors: true, flatShading: true, shininess: 10, specular: '#1a1a1a'}), {amp: sp === 'palm' ? .004 : .0035, flutter: .03}));
    for (const [part, near] of split(list).map((l, k) => [l, k === 0])) {
      inst(geo.trunk, bark, part, {cast: near, name: `tree_${sp}_trunk_${near ? 'near' : 'far'}`});
      inst(geo.leaves, leaf, part, {cast: near, name: `tree_${sp}_leaves_${near ? 'near' : 'far'}`, tint: p => tw.setHSL(0, 0, .9 + p.k * .2)});
    }
    stats.trees += list.length;
  });
  const bushes = sample(veg.bushes ?? 0, (x, z) => slope(x, z) < .6), rocks = sample(veg.rocks ?? 0, () => true);
  const bushMat = vMat('bush', () => windMaterial(new T.MeshPhongMaterial({vertexColors: true, flatShading: true, shininess: 8}), {amp: .02, flutter: .02}));
  const rockMat = vMat('rock', () => new T.MeshPhongMaterial({vertexColors: true, flatShading: true, shininess: 14}));
  for (const [part, near] of split(bushes).map((l, k) => [l, k === 0])) inst(bushGeometry(seed + 41), bushMat, part, {cast: near, name: 'bushes_' + (near ? 'near' : 'far'), tint: p => tw.setHSL(0, 0, .85 + p.k * .3)});
  for (const [part, near] of split(rocks).map((l, k) => [l, k === 0])) inst(rockGeometry(seed + 43), rockMat, part, {cast: near, name: 'rocks_' + (near ? 'near' : 'far'), sx: p => [p.s * (1 + p.k), p.s * (.6 + p.k * .8), p.s * (1.3 - p.k * .4)]});
  stats.bushes = bushes.length; stats.rocks = rocks.length;
  // near-camera grass cards and flowers
  // per focus disc: perHundred per 100 sq units inside nearR (never the whole area, so cards stay where the camera is)
  const nearSample = perHundred => { const out = []; for (const f of focus) { const n = Math.round(Math.PI * nearR * nearR / 100 * perHundred * density); for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) { const a = R() * 6.283, d = Math.sqrt(R()) * nearR, x = f[0] + Math.sin(a) * d, z = f[1] + Math.cos(a) * d; if (avoid(x, z) || height(x, z) < waterY + .2 || slope(x, z) > .8) continue; out.push({x, z, y: height(x, z), r: R() * 6.283, s: .7 + R() * .6, k: R()}); i++; } } return out; };
  if (veg.grass) {
    grassTex ??= cardTexture('grass');
    const gm = vMat('grass', () => windMaterial(new T.MeshPhongMaterial({map: grassTex, alphaTest: .5, side: T.DoubleSide, shininess: 4, color: '#ffffff'}), {amp: .14, byUv: true}));
    const list = nearSample(veg.grass * 6);
    inst(cardGeometry(), gm, list, {cast: false, name: 'grass_cards', tint: p => tw.set(veg.grassColor ?? '#9ccf6a').offsetHSL(0, 0, (p.k - .5) * .12)}); stats.grass = list.length;
  }
  if (veg.flowers) {
    flowerTex ??= cardTexture('flower');
    const fm = vMat('flower', () => windMaterial(new T.MeshPhongMaterial({map: flowerTex, alphaTest: .5, side: T.DoubleSide, shininess: 4}), {amp: .12, byUv: true}));
    const cols = veg.flowerColors ?? ['#ffffff', '#ffd23f', '#ff8fb1', '#9fc2ff'];
    const list = nearSample(veg.flowers * 1.5);
    inst(cardGeometry(1.2, .7), fm, list, {cast: false, name: 'flowers', tint: p => tw.set(cols[Math.floor(p.k * cols.length)])}); stats.flowers = list.length;
  }
  group.userData.stats = stats;
  return {group, stats, update: t => { WIND.uTime.value = t; }};
}
export const setWind = k => { WIND.uWind.value = k; };
