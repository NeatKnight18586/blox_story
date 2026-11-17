// parts/sets4/look5.js — format v5 Phase 3b-R look helpers (pure where possible, Node-testable):
//   · value hierarchy: envColor(hex) clamps environment base colours to HSL S ≤ .45, L .35–.75; storyColor(hex) lifts story
//     props to S ≥ .60 (hslOf / hexOf are the conversions);
//   · bevels (RoundedBox family, as body5): bevelBoxGeometry(w, h, d, r, cell) and roundCylGeometry(r, h, b, seg, cell) keep
//     the bake's tessellation (extra vertex rows at r from every edge, smooth normals across the chamfer); geometry.userData.bevel = r;
//   · bevelCensus(root, cams, range): every box/cylinder mesh (and instanced instance) within `range` of a camera → bevelled or sharp;
//   · material classes (data: engine/looks4.json `<preset>.v4.materials`): classMat(M4, classes, cls, color, o);
//   · contact AO: contactBytes(n) (pure gradient), contactDecals(list) (one instanced mesh, multiply blend).
import * as T from 'three';

// ---- colour ---------------------------------------------------------------------------------------------------------------------
export function hslOf(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)), h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function hexOf([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, k = Math.floor(((h % 360) + 360) % 360 / 60);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
  return '#' + [r, g, b].map(v => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, '0')).join('');
}
export const ENV_S = .45, ENV_L = [.35, .75], STORY_S = .60;
export const ZONE_S = .65;   // owner (Look 5b): zone floor plates may reach S .65 (top-down charm); still L .35–.75
export const zoneColor = hex => { const [h, sa, l] = hslOf(hex); const s2 = Math.min(ZONE_S, sa), l2 = Math.min(ENV_L[1], Math.max(ENV_L[0], l)); return s2 === sa && l2 === l ? hex : hexOf([h, s2, l2]); };
export const envColor = hex => { const [h, s, l] = hslOf(hex); return hexOf([h, Math.min(s, ENV_S - .005), Math.min(ENV_L[1] - .005, Math.max(ENV_L[0] + .005, l))]); };
export const storyColor = hex => { const [h, s, l] = hslOf(hex); return s >= STORY_S ? hex : hexOf([h, STORY_S + .02, Math.min(.68, Math.max(.3, l))]); };

// ---- bevelled geometry ----------------------------------------------------------------------------------------------------------
export const BEVEL = .04, BEVEL_RANGE = [.03, .06], THIN = .12;   // thinner than THIN = a plate or a wire (clock hands, cords), not an edged object
// face → [horizontal axis, sign, vertical axis, sign] as seen from outside (art upright on the four sides)
const FACE_UV = {'+x': [2, -1, 1, 1], '-x': [2, 1, 1, 1], '+z': [0, 1, 1, 1], '-z': [0, -1, 1, 1], '+y': [0, 1, 2, -1], '-y': [0, 1, 2, 1]};
const ticks = (a, r, cell) => { const inner = 2 * (a - r), n = Math.max(1, Math.ceil(inner / cell)), t = r > 0 ? [-a] : []; for (let i = 0; i <= n; i++) t.push(-a + r + inner * i / n); if (r > 0) t.push(a); return t; };
// Box with every edge rounded by r (one chamfer row, smooth normals: the RoundedBox look at low cost). cell = tessellation step
// of the flat part (the bake shades per vertex). Faces: +x −x +y −y +z −z; `skip` drops faces nobody sees (e.g. ['-y']).
// uvRects {'+x': [u0, v0, u1, v1], ..., other: rect}: per-face UV remap into an atlas (box art). r = 0 → a plain sharp box (same UVs).
export function bevelBoxGeometry(w, h, d, r = BEVEL, cell = 1.5, {skip = [], uvRects = null} = {}) {
  r = Math.min(r, Math.min(w, h, d) * .45); const A = [w / 2, h / 2, d / 2], tk = A.map(a => ticks(a, r, cell)), pos = [], nrm = [], uv = [], idx = [];
  const faces = [[0, 1, 1, 2, '+x'], [0, -1, 2, 1, '-x'], [1, 1, 2, 0, '+y'], [1, -1, 0, 2, '-y'], [2, 1, 0, 1, '+z'], [2, -1, 1, 0, '-z']];
  for (const [ax, s, u, v, name] of faces) { if (skip.includes(name)) continue; const base = pos.length / 3, U = tk[u], V = tk[v], R = uvRects ? (uvRects[name] ?? uvRects.other ?? [0, 0, 1, 1]) : [0, 0, 1, 1];
    for (let j = 0; j < V.length; j++) for (let i = 0; i < U.length; i++) {
      const p = [0, 0, 0]; p[ax] = s * A[ax]; p[u] = U[i]; p[v] = V[j];
      const c = p.map((x, k) => Math.max(-A[k] + r, Math.min(A[k] - r, x))), dv = p.map((x, k) => x - c[k]), l = Math.hypot(...dv), n = l > 1e-9 ? dv.map(x => x / l) : [0, 0, 0].map((_, k) => k === ax ? s : 0);
      const q = l > 1e-9 ? c.map((x, k) => x + n[k] * r) : p; pos.push(...q); nrm.push(...n); const [ha, hs, va, vs] = FACE_UV[name], uu = (hs * p[ha] + A[ha]) / (2 * A[ha]), vv = (vs * p[va] + A[va]) / (2 * A[va]); uv.push(R[0] + (R[2] - R[0]) * uu, R[1] + (R[3] - R[1]) * vv);
    }
    const nu = U.length; for (let j = 0; j < V.length - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = base + j * nu + i, b = a + 1, c2 = a + nu, e = c2 + 1; if (s > 0) idx.push(a, b, e, a, e, c2); else idx.push(a, e, b, a, c2, e); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData.bevel = r; g.userData.kind = 'box'; return g;
}
// AO-ish vertex colour for instanced modules that the baker never sees (pure per vertex): darker toward the floor and on
// undersides, a little brighter on top faces (overhead strips). k(y, ny) ∈ [~.5, 1.08].
export const moduleAO = (y, ny, base = 0) => { const lift = Math.min(1, Math.max(0, (y - base) / 1.6)), s = lift * lift * (3 - 2 * lift); return (.55 + .45 * s) * (ny < -.5 ? .72 : ny > .5 ? 1.08 : .94); };
// Cylinder with rounded rims (lathe of a chamfered profile): the cylinder member of the same family.
export function roundCylGeometry(r, h, b = BEVEL, seg = 14, cell = 2, rTop = r) {
  b = Math.min(b, h * .45, Math.min(r, rTop) * .45); const P = [new T.Vector2(0, -h / 2), new T.Vector2(r - b, -h / 2), new T.Vector2(r - b * .3, -h / 2 + b * .3), new T.Vector2(r, -h / 2 + b)];
  const n = Math.max(1, Math.ceil((h - 2 * b) / cell)); for (let i = 1; i < n; i++) { const u = i / n; P.push(new T.Vector2(r + (rTop - r) * u, -h / 2 + b + (h - 2 * b) * u)); }
  P.push(new T.Vector2(rTop, h / 2 - b), new T.Vector2(rTop - b * .3, h / 2 - b * .3), new T.Vector2(rTop - b, h / 2), new T.Vector2(0, h / 2));
  const g = new T.LatheGeometry(P, seg); g.computeVertexNormals(); g.userData.bevel = b; g.userData.kind = 'cyl'; return g;
}
// ---- census: near objects must be bevelled --------------------------------------------------------------------------------------
const kindOf = g => g.userData?.kind ?? (g.type === 'BoxGeometry' ? 'box' : g.type === 'CylinderGeometry' ? 'cyl' : null);
// pure: distance from a point to an axis-aligned box
export const boxDist = (p, min, max) => Math.hypot(...[0, 1, 2].map(k => Math.max(min[k] - p[k], 0, p[k] - max[k])));
export function bevelCensus(root, cams, range = 20) {
  root.updateMatrixWorld(true); const out = {near: 0, bevelled: 0, sharp: [], far: 0}, b = new T.Box3(), m4 = new T.Matrix4(), tmp = new T.Mesh();
  const sz = new T.Vector3(); out.thin = 0;
  const test = (box, g, name) => { box.getSize(sz); if (Math.min(sz.x, sz.y, sz.z) < THIN) { out.thin++; return; } const d = Math.min(...cams.map(c => boxDist(c, box.min.toArray(), box.max.toArray()))); if (d > range) { out.far++; return; }
    out.near++; const bv = g.userData?.bevel ?? 0; if (bv >= BEVEL_RANGE[0] - 1e-6 && bv <= BEVEL_RANGE[1] + 1e-6) out.bevelled++; else out.sharp.push(name); };
  const coarse = o => { for (let p = o; p; p = p.parent) if (p.userData?.coarse) return true; return false; };   // LOD twins only show beyond LOD distance
  root.traverse(o => { if (!o.isMesh || !o.geometry || !kindOf(o.geometry) || [].concat(o.material).some(m => m.transparent) || coarse(o)) return;   /* glass and effects are not set objects */ if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); tmp.matrixWorld.multiplyMatrices(o.matrixWorld, m4); b.copy(o.geometry.boundingBox).applyMatrix4(tmp.matrixWorld); test(b, o.geometry, o.name + '#' + i); } return; }
    b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); test(b, o.geometry, o.name || o.parent?.name || 'mesh'); });
  out.fraction = out.near ? out.bevelled / out.near : 1; out.sharp = out.sharp.slice(0, 12); return out;
}
// ---- material classes (data) ----------------------------------------------------------------------------------------------------
// classes: {plastic: {roughness, metalness?, pattern?}, floor: {...}, cardboard, metal, glass}; story: S ≥ .60, otherwise env clamp.
// The baker turns static materials into unlit + env highlight; userData.gloss = 1 − roughness drives that highlight.
const cmCache = new Map(), ANISO5 = 2;   // software rasteriser: 8× anisotropic taps on a floor-filling texture cost ~0.3 s a frame
export function classMat(M4, classes, cls, color, {story = false, zone = false, repeat = [1, 1], map = null, live = false, transparent = false, opacity = 1} = {}) {
  const C = classes?.[cls] ?? {roughness: .5}, col = story ? storyColor(color) : zone ? zoneColor(color) : envColor(color), key = [cls, col, repeat, !!map, live, transparent, opacity, zone ? 'zone' : ''].join('|');
  if (cmCache.has(key)) return cmCache.get(key);
  let m;
  let src = null; if (C.pattern && M4) { src = M4.mat4(C.pattern, col, {repeat, live}); m = src.clone(); m.roughness = Math.min(1, C.roughness / .5);
    for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) { m[k] = m[k].clone(); m[k].anisotropy = ANISO5; m[k].needsUpdate = true; } }   // clone() JSON-copies userData: textures come back from src below   // the roughness map (~.15–.2) × scale
  else m = new T.MeshStandardMaterial({color: col, roughness: C.roughness, metalness: C.metalness ?? 0, map, transparent, opacity, depthWrite: !transparent});
  m.userData = {...(src?.userData ?? m.userData), ...(src?.userData?.glossMap ? {glossMap: Object.assign(src.userData.glossMap.clone(), {anisotropy: ANISO5})} : {}), cls, gloss: C.envHighlight === false ? 0 : 1 - C.roughness, live, story, ...(zone ? {zone: true} : {})}; m.name = 'c5:' + key; cmCache.set(key, m); return m;
}
// ---- contact AO decals ----------------------------------------------------------------------------------------------------------
// n×n alpha mask: a rectangle footprint (inner 60 %) dark, falling off over the outer 20 % → a soft contact shadow (pure).
export function contactBytes(n = 64, inner = .6, dark = .62) {
  const b = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const u = Math.abs((x + .5) / n * 2 - 1), v = Math.abs((y + .5) / n * 2 - 1), d = Math.max(u, v), t = Math.min(1, Math.max(0, (d - inner) / (1 - inner))), k = 1 - dark * (1 - t * t * (3 - 2 * t)) ** 1.5, i = (y * n + x) * 4;
    b[i] = b[i + 1] = b[i + 2] = Math.round(k * 255); b[i + 3] = 255; }
  return b;
}
let contactTex = null;
// list: [{x, z, w, d, y?, yaw?}] footprints (w × d = the object's own footprint; the decal is 1.67× larger so its dark core = footprint)
export function contactDecals(list, {name = 'contactAO', inner = .6} = {}) {
  if (!contactTex) { contactTex = new T.DataTexture(contactBytes(64, inner), 64, 64, T.RGBAFormat); contactTex.magFilter = contactTex.minFilter = T.LinearFilter; contactTex.needsUpdate = true; }
  const g = new T.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
  const m = new T.MeshBasicMaterial({map: contactTex, transparent: true, blending: T.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  const im = new T.InstancedMesh(g, m, Math.max(1, list.length)), M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  list.forEach((f, i) => im.setMatrixAt(i, M.compose(new T.Vector3(f.x, (f.y ?? 0) + .02, f.z), q.setFromEuler(e.set(0, f.yaw ?? 0, 0)), new T.Vector3(f.w / inner, 1, f.d / inner))));
  im.count = list.length; im.name = name; im.userData.live = true; im.renderOrder = 1; im.computeBoundingSphere(); return im;
}
// Distance-to-segment helper for anchor-clear corridors (pure): circles [x, z, r] every `step` along camera → subject.
export function corridorClear(cam, subj, r = 3, step = 3) {
  const dx = subj[0] - cam[0], dz = subj[1] - cam[1], L = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(L / step)), out = [];
  for (let i = 0; i <= n; i++) out.push([+(cam[0] + dx * i / n).toFixed(2), +(cam[1] + dz * i / n).toFixed(2), r]);
  return out;
}
// Material classes (the data lives in engine/looks4.json `toy.v4.materials`; this copy is the fallback for Node and older presets)
export const CLASSES5 = {
  plastic: {roughness: .35}, plush: {roughness: .9, envHighlight: false}, floor: {pattern: 'polishedFloor', roughness: .2}, cardboard: {roughness: .85, envHighlight: false},
  metal: {roughness: .4, metalness: .6}, glass: {roughness: .1}, plaster: {pattern: 'plaster', roughness: .9, envHighlight: false}, asphalt: {pattern: 'asphaltLane', roughness: .85, envHighlight: false}, timber: {pattern: 'timber', roughness: .7, envHighlight: false},
};
// ---- value hierarchy pass + census ---------------------------------------------------------------------------------------------
// Story subtrees (userData.story on any ancestor) get S ≥ .60 on their main colours (L .2–.9; near-black tyres and white accents
// keep their value); everything else that is a plain colour (no map, not a light) is clamped to the environment range. Materials
// are cloned per role, so a material shared by a story prop and the set is split, never desaturated for both.
const isStory = o => { for (let p = o; p; p = p.parent) if (p.userData?.story) return true; return false; };
const isLight = m => m.toneMapped === false || m.blending === T.AdditiveBlending || m.blending === T.MultiplyBlending;
const plain = m => m && m.color && !m.map && !isLight(m);
export function applyHierarchy(root) {
  const envC = new Map(), stC = new Map();
  const fix = (m, st) => { if (!plain(m) || m.userData?.cls && !st && !m.userData.story) return m; const cache = st ? stC : envC; if (cache.has(m)) return cache.get(m);
    const hex = '#' + m.color.getHexString(), [, , l] = hslOf(hex), nh = st ? (l > .2 && l < .9 ? storyColor(hex) : hex) : envColor(hex); if (nh === hex) { cache.set(m, m); return m; }
    const c = m.clone(); c.color.set(nh); c.userData = {...m.userData, role: st ? 'story' : 'env'}; cache.set(m, c); return c; };
  root.traverse(o => { if (!o.isMesh || (o.isInstancedMesh && o.instanceColor)) return; const st = isStory(o); o.material = Array.isArray(o.material) ? o.material.map(m => fix(m, st)) : fix(o.material, st); });
}
// Census of base colours: environment (S ≤ .45, L .35–.75) and story (S ≥ .60 on main colours). Plain colours only.
export function envCensus(root) {
  const seen = new Set(), out = {env: {n: 0, ok: 0, bad: []}, story: {n: 0, ok: 0, bad: []}, zone: {n: 0, ok: 0, bad: []}};
  root.traverse(o => { if (!o.isMesh || (o.isInstancedMesh && o.instanceColor)) return; const st = isStory(o);
    for (const m of [].concat(o.material)) { if (!plain(m) || seen.has(m.uuid + st)) continue; seen.add(m.uuid + st); const hex = '#' + m.color.getHexString(), [, s, l] = hslOf(hex);
      if (st) { if (l <= .2 || l >= .9) continue; out.story.n++; if (s >= STORY_S - 1e-3) out.story.ok++; else out.story.bad.push(hex); }
      else if (m.userData?.zone) { out.zone.n++; if (s <= ZONE_S + 1e-3 && l >= ENV_L[0] - 1e-3 && l <= ENV_L[1] + 1e-3) out.zone.ok++; else out.zone.bad.push(hex); }
      else { out.env.n++; if (s <= ENV_S + 1e-3 && l >= ENV_L[0] - 1e-3 && l <= ENV_L[1] + 1e-3) out.env.ok++; else out.env.bad.push(hex); } } });
  out.env.bad = out.env.bad.slice(0, 10); out.story.bad = out.story.bad.slice(0, 10); return out;
}
