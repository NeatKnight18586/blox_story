// parts/city/trees.js — Phase 1E: HERO TREES + IMPOSTORS (owner-approved approach). Data: plan.json "trees".
//   preloadTrees(base, manifest, models) → {species: {name: {parts, tris, height, width, source}}} (CC0 glTF from the farm cache when present,
//     decimated for near use ≤ nearTris each; procedural hero trees otherwise — never the old lollipop)
//   bakeImpostors(species, {views, cell, cache}) → {name: {color: DataTexture, normal: DataTexture, w, h, views}} (multi-view albedo + view-space
//     normal atlas, rendered once in a private WebGLRenderer; cached as PNGs in renders/cache/assets/impostors/ by the farm gate)
//   treeField(points, {species, atlases, near, band, name}) → {group, onCamera(p, camera), stats}: every tree is a camera-facing CARD (2 tris;
//     view picked by angle, lit through the normal atlas) beyond `near`, and the real 3D tree inside it; the two crossfade over `band` studs with a
//     complementary screen-door dither (no holes, no double draw). Near 3D trees are re-picked per camera (in front of the lens only).
// Pure helpers (node-testable): decimateLeaves, clusterDecimate, pickView.
import * as T from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {PLAN} from './plan.js';

const TP = PLAN.trees ?? {};
const fract = v => v - Math.floor(v), h3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
export const triCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

// ---- pure: view index for a camera direction (rad, relative to the tree's yaw) with `n` views around the tree ----
export const pickView = (a, n) => ((Math.round(a / (Math.PI * 2 / n)) % n) + n) % n;

// ---- pure-ish: keep every k-th connected leaf card (components by shared index), scaled up about its centre to keep the canopy's coverage ----
export function decimateLeaves(g, keepFrac) {
  if (keepFrac >= 1) return g; g = g.index ? g : mergeVertices(g); const ix = g.index.array, n = g.attributes.position.count, par = new Int32Array(n).map((_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let t = 0; t < ix.length; t += 3) { const a = find(ix[t]), b = find(ix[t + 1]), c = find(ix[t + 2]); par[b] = a; par[c] = a; }
  const comps = new Map(); for (let t = 0; t < ix.length; t += 3) { const r = find(ix[t]); (comps.get(r) ?? comps.set(r, []).get(r)).push(t); }
  if (comps.size < 40) return null;   // not a leaf-card mesh
  const P = g.attributes.position, s = Math.min(2.2, 1 / Math.sqrt(keepFrac)), keep = [], moved = new Uint8Array(n), C = new T.Vector3(), v = new T.Vector3(); let k = 0;
  for (const tris of comps.values()) { if (h3(k++, 3, 7) > keepFrac) continue; C.set(0, 0, 0); let m = 0;
    for (const t of tris) for (let j = 0; j < 3; j++) { C.add(v.fromBufferAttribute(P, ix[t + j])); m++; } C.multiplyScalar(1 / m);
    for (const t of tris) { keep.push(ix[t], ix[t + 1], ix[t + 2]); for (let j = 0; j < 3; j++) { const i = ix[t + j]; if (moved[i]) continue; moved[i] = 1; v.fromBufferAttribute(P, i).sub(C).multiplyScalar(s).add(C); P.setXYZ(i, v.x, v.y, v.z); } } }
  const o = g.clone(); o.setIndex(keep); return o;
}
// ---- pure-ish: vertex clustering (grid snap + drop degenerate triangles) until ≤ target triangles; keeps uv/normal of the first vertex per cell ----
export function clusterDecimate(g, target) {
  g = g.index ? g : mergeVertices(g); if (triCount(g) <= target) return g;
  g.computeBoundingBox(); const b = g.boundingBox, size = b.getSize(new T.Vector3()), P = g.attributes.position, ix = g.index.array;
  for (let cells = 64; cells >= 4; cells = Math.floor(cells * .8)) {
    const cs = Math.max(size.x, size.y, size.z) / cells, map = new Map(), rep = new Int32Array(P.count);
    for (let i = 0; i < P.count; i++) { const key = Math.floor((P.getX(i) - b.min.x) / cs) + ',' + Math.floor((P.getY(i) - b.min.y) / cs) + ',' + Math.floor((P.getZ(i) - b.min.z) / cs); if (!map.has(key)) map.set(key, i); rep[i] = map.get(key); }
    const out = []; for (let t = 0; t < ix.length; t += 3) { const a = rep[ix[t]], c = rep[ix[t + 1]], d = rep[ix[t + 2]]; if (a !== c && c !== d && a !== d) out.push(a, c, d); }
    if (out.length / 3 <= target) { const o = g.clone(); o.setIndex(out); o.computeVertexNormals(); return o; }
  }
  return g;
}

// ---- procedural hero trees (fallback when no CC0 model is cached): clumped canopies with a leaf-cluster card texture, not a single ball ----
let LEAF = null;
function leafTexture() {
  if (LEAF || typeof document === 'undefined') return LEAF; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 70; i++) { const a = h3(i, 1, 2) * Math.PI * 2, r = 54 * Math.sqrt(h3(i, 2, 2)), x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r * .9, s = 9 + 7 * h3(i, 3, 2), l = 34 + 26 * h3(i, 4, 2);
    g.fillStyle = `hsl(${100 + 20 * h3(i, 5, 2)}, 55%, ${l}%)`; g.beginPath(); g.ellipse(x, y, s, s * .62, a, 0, 7); g.fill(); }
  LEAF = new T.CanvasTexture(c); LEAF.colorSpace = T.SRGBColorSpace; LEAF.anisotropy = 4; return LEAF;
}
const card = (w, h, x, y, z, ry, rx = 0) => { const p = new T.PlaneGeometry(w, h); p.rotateX(rx); p.rotateY(ry); p.translate(x, y, z); return p; };
const nonIdx = g => { g = g.index ? g.toNonIndexed() : g; return g; };
function proceduralTree(kind, seed = 1) {
  const R = (k) => h3(seed, k, 11), bark = new T.MeshStandardMaterial({color: kind === 'pine' ? '#6b4a33' : '#7a5a3c', roughness: .9}), leaf = new T.MeshStandardMaterial({color: '#ffffff', map: leafTexture(), alphaTest: .5, side: T.DoubleSide, roughness: .85});
  const trunk = [], leaves = [];
  if (kind === 'pine') {
    const H = 11; trunk.push(new T.CylinderGeometry(.22, .45, H * .9, 7).translate(0, H * .45, 0));
    for (let i = 0; i < 6; i++) { const y = 2.4 + i * 1.45, r = 3.1 * (1 - i / 7) + .4; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + i, tilt = -.55;
      leaves.push(card(r * 1.15, 1.7, Math.sin(a) * r * .45, y, Math.cos(a) * r * .45, a, tilt)); } leaves.push(card(r * 1.6, 1.4, 0, y + .4, 0, i * .7, -Math.PI / 2)); }
    leaves.push(card(1.4, 2.2, 0, H - .2, 0, 0), card(1.4, 2.2, 0, H - .2, 0, Math.PI / 2));
    const lm = leaf.clone(); lm.color.set('#3f8a3a'); return finish([[trunk, bark], [leaves, lm]], 'pine');
  }
  const H = kind === 'round' ? 6.5 : 9, cr = kind === 'round' ? 3 : 3.6;
  trunk.push(new T.CylinderGeometry(.28, .5, H * .62, 7).translate(0, H * .31, 0));
  for (let b = 0; b < 4; b++) { const a = b * 1.7 + R(b), L = 2.2 + R(b + 4); trunk.push(new T.CylinderGeometry(.1, .2, L, 5).translate(0, L / 2, 0).rotateZ(.75).rotateY(a).translate(0, H * .45 + b * .5, 0)); }
  const clumps = kind === 'round' ? 7 : 11;
  for (let c = 0; c < clumps; c++) { const a = c * 2.39996, u = (c + .5) / clumps, r = cr * Math.sqrt(1 - (2 * u - 1) ** 2) * .85, x = Math.cos(a) * r, z = Math.sin(a) * r, y = H * .62 + (2 * u - 1) * cr * .7 + cr * .35, s = 2.6 + 1.2 * R(c + 9);
    for (let k = 0; k < 3; k++) leaves.push(card(s, s * .9, x, y, z, k * Math.PI / 3 + a, (k - 1) * .5)); }
  const lm = leaf.clone(); lm.color.set(kind === 'round' ? '#78c050' : '#5fb04a'); return finish([[trunk, bark], [leaves, lm]], kind);
}
function finish(list, kind) {
  const parts = list.map(([geos, material]) => ({geometry: mergeGeometries(geos.map(g => { g = nonIdx(g); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })), material}));
  const box = new T.Box3(); parts.forEach(p => { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); });
  return {parts, tris: parts.reduce((s, p) => s + triCount(p.geometry), 0), height: box.max.y - box.min.y, width: Math.max(box.max.x - box.min.x, box.max.z - box.min.z), source: 'procedural:' + kind};
}
// a CC0 glTF → near-LOD parts ≤ target tris (leaf-card thinning for alpha-tested canopies, vertex clustering for the rest), feet at y 0, metric
export function prepModel(root, target) {
  root.updateMatrixWorld(true); const box = new T.Box3().setFromObject(root), parts = [];
  root.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone().applyMatrix4(o.matrixWorld); g.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    const m = [].concat(o.material)[0].clone(); const cut = m.alphaTest > 0 || m.transparent || /leaf|leaves|foliage|needle|branch/i.test(m.name + o.name);
    if (cut) { m.alphaTest = Math.max(.5, m.alphaTest); m.transparent = false; m.side = T.DoubleSide; m.depthWrite = true; }
    parts.push({geometry: g, material: m, cut}); });
  const total = parts.reduce((s, p) => s + triCount(p.geometry), 0), out = [];
  for (const p of parts) { const share = Math.max(200, Math.floor(target * triCount(p.geometry) / Math.max(1, total)));
    let g = p.geometry; if (triCount(g) > share) g = (p.cut ? decimateLeaves(g, share / triCount(g)) : null) ?? clusterDecimate(g, share);
    out.push({geometry: g, material: p.material}); }
  const tris = out.reduce((s, p) => s + triCount(p.geometry), 0);
  return {parts: out, tris, height: box.max.y - box.min.y, width: Math.max(box.max.x - box.min.x, box.max.z - box.min.z), rawTris: total};
}

export const proceduralSpecies = () => Object.fromEntries(Object.entries(TP.species ?? {leafy: {}, pine: {}, round: {}}).filter(([, s]) => s && typeof s === 'object').map(([n, s]) => [n, proceduralTree(s.fallback ?? n, s.seed ?? 3)]));
// ---- preload: hero species from the CC0 cache (manifest models) or procedural ----
export async function preloadTrees(base, manifest) {
  const out = {}, SP = TP.species ?? {leafy: {model: 'city_tree_leafy'}, pine: {model: 'city_tree_pine'}, round: {model: 'city_bush_round'}};
  let gl = null;
  for (const [name, s] of Object.entries(SP).filter(([, s]) => s && typeof s === 'object')) {
    const e = manifest?.models?.[s.model];
    if (e && typeof document !== 'undefined') try {
      gl ??= new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader();
      const g = await gl.loadAsync(new URL(`renders/cache/assets/${e.id}/${e.file}`, base).href), m = prepModel(g.scene, TP.nearTris ?? 6000);
      out[name] = {...m, source: 'cc0:' + e.id, bytes: e.bytes}; continue;
    } catch (err) { console.error("tree model " + s.model + ": " + (err?.stack ?? err)); }
    out[name] = proceduralTree(s.fallback ?? name, s.seed ?? 3);
  }
  return out;
}

// ---- impostor atlas: n views around y (orthographic, horizontal), albedo + view-space normal, in a private renderer ----
const NORMAL_MAT = (src) => { const m = new T.ShaderMaterial({side: T.DoubleSide, uniforms: {map: {value: src.map ?? null}, hasMap: {value: src.map ? 1 : 0}, alphaTest: {value: src.alphaTest || 0}},
  vertexShader: 'varying vec3 vN; varying vec2 vUv;\nvoid main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform sampler2D map; uniform float hasMap; uniform float alphaTest; varying vec3 vN; varying vec2 vUv;\nvoid main(){ float a = hasMap > .5 ? texture2D(map, vUv).a : 1.; if (a < max(alphaTest, .01)) discard; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * .5 + .5, 1.); }'});
  return m; };
export function bakeImpostors(species, {views = TP.impostor?.views ?? 8, cell = TP.impostor?.cell ?? 256, cached = {}} = {}) {
  if (typeof document === 'undefined') return {};
  const out = {}, need = Object.entries(species).filter(([n]) => !cached[n]);
  for (const [n, c] of Object.entries(cached)) out[n] = c;
  if (!need.length) return out;
  const canvas = document.createElement('canvas'), r = new T.WebGLRenderer({canvas, antialias: false, alpha: true, preserveDrawingBuffer: true}); r.setPixelRatio(1); r.outputColorSpace = T.LinearSRGBColorSpace;
  for (const [name, sp] of need) {
    const W = cell * views, H = cell, scene = new T.Scene(), grp = new T.Group(); scene.add(grp);
    const albedo = sp.parts.map(p => { const m = p.material; return new T.MeshBasicMaterial({color: m.color ?? 0xffffff, map: m.map ?? null, vertexColors: !!m.vertexColors, alphaTest: m.alphaTest || 0, side: T.DoubleSide}); });
    const normal = sp.parts.map(p => NORMAL_MAT(p.material)), meshes = sp.parts.map((p, i) => { const m = new T.Mesh(p.geometry, albedo[i]); grp.add(m); return m; });
    const half = Math.max(sp.height, sp.width) / 2 * 1.04, cam = new T.OrthographicCamera(-half, half, half, -half, .1, 400), rt = new T.WebGLRenderTarget(W, H, {samples: 0});
    const read = mats => { meshes.forEach((m, i) => { m.material = mats[i]; }); r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear();
      for (let k = 0; k < views; k++) { const a = k / views * Math.PI * 2; cam.position.set(Math.sin(a) * 200, sp.height / 2, Math.cos(a) * 200); cam.up.set(0, 1, 0); cam.lookAt(0, sp.height / 2, 0); cam.updateMatrixWorld(); r.setViewport(k * cell, 0, cell, H); r.setScissor(k * cell, 0, cell, H); r.setScissorTest(true); r.render(scene, cam); }
      r.setScissorTest(false); const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, px); r.setRenderTarget(null); return px; };
    const ca = read(albedo), na = read(normal);
    for (let i = 0; i < W * H; i++) { na[i * 4 + 3] = ca[i * 4 + 3]; if (ca[i * 4 + 3] < 128) { na[i * 4] = 128; na[i * 4 + 1] = 128; na[i * 4 + 2] = 255; } }   // normal alpha = albedo alpha
    dilate(ca, W, H);
    const tex = (px, srgb) => { const t = new T.DataTexture(px, W, H, T.RGBAFormat); t.colorSpace = srgb ? T.LinearSRGBColorSpace : T.NoColorSpace; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; };
    out[name] = {color: tex(ca, true), normal: tex(na, false), w: W, h: H, views, half, height: sp.height, colorPx: ca, normalPx: na, baked: true};
    rt.dispose(); albedo.forEach(m => m.dispose()); normal.forEach(m => m.dispose());
  }
  r.dispose(); return out;
}
// bleed opaque colours into transparent texels (no dark fringes once mip-mapped)
function dilate(px, W, H) { for (let pass = 0; pass < 4; pass++) { const src = px.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (src[i + 3] >= 128) continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = (yy * W + xx) * 4; if (src[j + 3] >= 128 || (pass && src[j] + src[j + 1] + src[j + 2] > 0)) { px[i] = src[j]; px[i + 1] = src[j + 1]; px[i + 2] = src[j + 2]; break; } } } } }

// ---- the field: impostor cards (all trees, faded in beyond `near`) + near 3D trees (inside, faded out), complementary dither ----
const DITHER = 'float bxDither(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }';
function cardMaterial(at, near, band) {
  const m = new T.MeshStandardMaterial({color: '#ffffff', map: at.color, normalMap: at.normal, alphaTest: .5, side: T.DoubleSide, roughness: .9, metalness: 0, envMapIntensity: .5});
  m.userData.uniforms = {uViews: {value: at.views}, uNear: {value: near}, uBand: {value: band}};
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, m.userData.uniforms);
    sh.vertexShader = 'attribute float aYaw; attribute float aNear;\nuniform float uViews; uniform float uNear; uniform float uBand;\nvarying vec2 vAtlasUv; varying float vFade;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `vec3 bxO = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz; vec3 bxC = cameraPosition - bxO; bxC.y = 0.; float bxD = length(bxC); bxC = bxD > 1e-4 ? bxC / bxD : vec3(0., 0., 1.);
        vec3 bxR = vec3(bxC.z, 0., -bxC.x); float bxA = atan(bxC.x, bxC.z) - aYaw; float bxK = mod(floor(bxA / (6.28318530718 / uViews) + .5), uViews);
        vAtlasUv = vec2((bxK + uv.x) / uViews, uv.y); vMapUv = vAtlasUv; vNormalMapUv = vAtlasUv; vFade = aNear > .5 ? smoothstep(uNear - uBand * .5, uNear + uBand * .5, length(cameraPosition - bxO)) : 1.;
        vec3 objectNormal = bxC;
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = bxR * position.x + vec3(0., position.y, 0.) + bxC * position.z;');
    sh.fragmentShader = 'varying vec2 vAtlasUv; varying float vFade;\n' + DITHER + '\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (bxDither(gl_FragCoord.xy) >= vFade) discard;'); };
  m.customProgramCacheKey = () => 'bxImpostor'; m.userData.live = true; m.name = 'treeImpostor'; return m;
}
function nearMaterial(src, near, band) {
  const m = src.clone(); m.userData = {...src.userData, uniforms: {uNear: {value: near}, uBand: {value: band}}, live: true};
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, m.userData.uniforms);
    sh.vertexShader = 'uniform float uNear; uniform float uBand; varying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec3 bxO = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz; vFade = smoothstep(uNear - uBand * .5, uNear + uBand * .5, length(cameraPosition - bxO));');
    sh.fragmentShader = 'varying float vFade;\n' + DITHER + '\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (bxDither(gl_FragCoord.xy) < vFade) discard;'); };
  m.customProgramCacheKey = () => 'bxNear' + (src.alphaTest ? 'a' : '') + (src.vertexColors ? 'v' : '') + (src.map ? 'm' : ''); return m;
}
export function treeField(points, {species, atlases, near = TP.near ?? 25, band = TP.band ?? 6, name = 'trees', cell = 90, maxNear = TP.maxNear ?? 14, nearBudget = TP.nearBudget ?? 40000} = {}) {   // nearBudget: 3D tris near the lens; trees past it stay whole cards
  const group = new T.Group(); group.name = name; group.userData.live = true; const stats = {trees: points.length, cards: 0, bySpecies: {}};
  const m4 = new T.Matrix4(), q = new T.Quaternion(), byKind = {};
  for (const p of points) (byKind[p.kind] ??= []).push(p);
  const nearSets = [];
  for (const [kind, list] of Object.entries(byKind)) {
    const sp = species[kind], at = atlases[kind]; if (!sp) continue; stats.bySpecies[kind] = {n: list.length, nearTris: sp.tris, source: sp.source};
    const scaleOf = p => (p.h ?? TP.heights?.[kind] ?? sp.height) / sp.height * (p.s ?? 1);
    if (at) {   // cards, one InstancedMesh per cell (culled per cell)
      const w = at.half * 2, geo = new T.PlaneGeometry(w, w).translate(0, sp.height / 2, 0), mat = cardMaterial(at, near, band), cells = new Map();
      for (const p of list) { const k = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell); (cells.get(k) ?? cells.set(k, []).get(k)).push(p); }
      for (const cl of cells.values()) { const im = new T.InstancedMesh(geo, mat, cl.length), yaw = new Float32Array(cl.length), nearA = new T.InstancedBufferAttribute(new Float32Array(cl.length), 1);
        cl.forEach((p, i) => { const s = scaleOf(p); im.setMatrixAt(i, m4.compose(new T.Vector3(p.x, p.y, p.z), q.identity(), new T.Vector3(s, s, s))); yaw[i] = p.r ?? 0; });
        im.geometry = geo.clone(); im.geometry.setAttribute('aYaw', new T.InstancedBufferAttribute(yaw, 1)); im.geometry.setAttribute('aNear', nearA); cl.forEach((p, i) => { p._card = [nearA, i]; });
        im.computeBoundingSphere(); im.name = 'treeImpostors_' + kind; im.userData.live = true; im.castShadow = false; group.add(im); stats.cards += cl.length; } }
    // near 3D: one InstancedMesh per part, capacity maxNear, re-filled per camera
    const mats = sp.parts.map(p => nearMaterial(p.material, near, band)), ims = sp.parts.map((p, i) => { const im = new T.InstancedMesh(p.geometry, mats[i], maxNear); im.count = 0; im.name = `tree3d_${kind}_${i}`; im.userData.live = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; group.add(im); return im; });
    nearSets.push({kind, list, ims, scaleOf, r: sp.width / 2, h: sp.height, tris: sp.tris});
  }
  const fr = new T.Frustum(), pv = new T.Matrix4(), sph = new T.Sphere(), cp = new T.Vector3();
  let lastNear = [];
  const onCamera = (p, camera) => { cp.set(p[0], p[1], p[2]); if (camera) { camera.updateMatrixWorld(); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pv); }
    const pick = [];   // every species together, nearest first, until the 3D budget is spent
    for (const S of nearSets) for (const t of S.list) { const d = Math.hypot(t.x - p[0], t.y - p[1], t.z - p[2]); if (d > near + band * .5 + S.r) continue; const s = S.scaleOf(t); sph.center.set(t.x, t.y + S.h * s / 2, t.z); sph.radius = Math.max(S.h, S.r * 2) * s * .6; if (camera && !fr.intersectsSphere(sph)) continue; pick.push([d, t, s, S]); }
    pick.sort((a, b) => a[0] - b[0]); let tri = 0; const use = new Map(nearSets.map(S => [S, []]));
    for (const x of pick) { const S = x[3], n = S.tris; if (use.get(S).length >= maxNear || tri + n > nearBudget) continue; tri += n; use.get(S).push(x); }
    for (const [a, i] of lastNear) { a.array[i] = 0; a.needsUpdate = true; } lastNear = [];
    for (const S of nearSets) { const u = use.get(S);
      for (const im of S.ims) { u.forEach(([, t, s], i) => { q.setFromAxisAngle(new T.Vector3(0, 1, 0), t.r ?? 0); im.setMatrixAt(i, m4.compose(new T.Vector3(t.x, t.y, t.z), q, new T.Vector3(s, s, s))); }); im.count = u.length; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
      for (const [, t] of u) if (t._card) { const [a, i] = t._card; a.array[i] = 1; a.needsUpdate = true; lastNear.push(t._card); } }
    stats.near3d = lastNear.length; stats.near3dTris = tri; };
  return {group, onCamera, stats};
}
