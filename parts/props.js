// parts/props.js — shared hero props (Amendment A1 B2; brief §14.3 props library). The stories' key objects
// get modelled detail; background copies stay cheap. One builder serves the field AND the hand-held tool, so the
// stone-hammer is visibly the same stone and the same sword as the hero's stone in the field.
//   sword({tier})        hero ≤ 250 tris: tapered ridged blade + point, flared crossguard, wrapped grip with three
//                        rings, faceted pommel. ring ≤ 40 tris. Origin = crossguard centre; blade points −Y.
//   ringStone(variant)   ≤ 80 tris: chiselled rock (cut corners), chips at the base, dark socket, optional moss cap.
//   heroStone()          ≤ 600 tris (without the sword): big chisel facets, carved band, socket, dirt disc and
//                        modelled cracks in three stages (setCracks(0..3)); .rock = the stone alone (for the hammer).
//   instanceGroup(group, transforms, {jitter}) → one InstancedMesh per part, transforms [{at, rotY, s, i}].
import * as T from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mat} from './materials.js';

export const PROP_COLORS = {rock: '#8d9aae', rockDk: '#77849a', blade: '#d7dde6', gold: '#f2c230', grip: '#5a3a22', socket: '#262a30', moss: '#6fa85a', dirt: '#a88c66', crack: '#3b3226'};
const C = PROP_COLORS;
const rnd = s => { let x = (Math.floor(s) >>> 0) || 1; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mesh = (g, m, at = [0, 0, 0], name = 'prop', cast = true) => { const x = new T.Mesh(g, m); x.position.set(...at); x.name = name; x.castShadow = cast; x.receiveShadow = true; return x; };
const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
// World-ish UVs for convex hulls (box projection, like parts.js) so the rock pattern sits right.
function boxUV(g, tile = 3) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]; uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile; }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2)); return g;
}

// Chiselled block: bottom corners square (they sit in the ground), top corners cut by k with seeded jitter.
export function chisel(a, b, c, k, seed = 1) {
  const r = rnd(seed), pts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push(new T.Vector3(sx * a, -b, sz * c));
    const j = () => k * (.7 + r() * .6);
    pts.push(new T.Vector3(sx * (a - j()), b, sz * c * (.9 + r() * .1)), new T.Vector3(sx * a, b - j(), sz * c * (.85 + r() * .15)), new T.Vector3(sx * a * (.9 + r() * .1), b * (.9 + r() * .1), sz * (c - j())));
  }
  const g = new ConvexGeometry(pts); g.computeVertexNormals(); return boxUV(g);
}

// ---- sword ------------------------------------------------------------------------------------------------
function bladeGeometry(L, w, t) {
  // Diamond cross-section (edges along ±z, ridge along ±x); straight to 80 % of the length, then a point.
  const y1 = -L * .8, s = .82, pos = [];
  const ring = (y, k) => [[0, y, w * k], [t * k, y, 0], [0, y, -w * k], [-t * k, y, 0]];
  const r0 = ring(0, 1), r1 = ring(y1, s), tip = [0, -L, 0];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; pos.push(...r0[i], ...r1[i], ...r1[j], ...r0[i], ...r1[j], ...r0[j]); pos.push(...r1[i], ...tip, ...r1[j]); }
  pos.push(...r0[0], ...r0[2], ...r0[1], ...r0[0], ...r0[3], ...r0[2]);   // cap under the guard
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return boxUV(g, 2);
}
export function sword({tier = 'hero', blade = 2.6} = {}) {
  const g = new T.Group(); g.name = 'sword';
  const steel = mat('metal', C.blade), gold = mat('metal', C.gold), grip = mat('plastic', C.grip);
  if (tier === 'hero') {
    g.add(mesh(bladeGeometry(blade, .13, .04), steel, [0, -.06, 0], 'blade'));
    g.add(mesh(boxUV(new T.BoxGeometry(.13, .11, .62)), gold, [0, 0, 0], 'guard'));
    for (const s of [-1, 1]) { const e = new T.BoxGeometry(.15, .2, .12), p = e.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) * s > 0) p.setY(i, p.getY(i) * 1.6); e.computeVertexNormals(); g.add(mesh(boxUV(e), gold, [0, 0, s * .36], 'guardEnd')); }
    g.add(mesh(boxUV(new T.CylinderGeometry(.065, .07, .55, 6)), grip, [0, .33, 0], 'grip'));
    for (const y of [.15, .33, .51]) g.add(mesh(boxUV(new T.CylinderGeometry(.085, .085, .045, 6)), gold, [0, y, 0], 'gripRing'));
    g.add(mesh(boxUV(new T.IcosahedronGeometry(.11, 0)), gold, [0, .7, 0], 'pommel'));
  } else {
    const b = new T.BoxGeometry(.05, blade, .2), p = b.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setZ(i, p.getZ(i) * .35);   // tapered
    b.computeVertexNormals(); g.add(mesh(boxUV(b, 2), steel, [0, -blade / 2 - .05, 0], 'blade'));
    g.add(mesh(boxUV(new T.BoxGeometry(.12, .1, .6)), gold, [0, 0, 0], 'guard'));
    g.add(mesh(boxUV(new T.BoxGeometry(.12, .5, .12)), grip, [0, .3, 0], 'grip'));
    g.add(mesh(boxUV(new T.TetrahedronGeometry(.12)), gold, [0, .62, 0], 'pommel'));
  }
  return g;
}

// ---- stones -----------------------------------------------------------------------------------------------
// Ring stone variants: top of the body at y ≈ 1.05 (socket there); the sword stands in it.
export const RING_TOP = 1.04;
export function ringStone(variant = 0, {moss = false} = {}) {
  const g = new T.Group(), rock = mat('rock', '#ffffff', {flat: true}), r = rnd(70 + variant);
  const dims = [[.72, .52, .62, .24], [.62, .52, .7, .2], [.8, .5, .55, .26]][variant % 3];
  g.add(mesh(chisel(...dims, 71 + variant), rock, [0, .52, 0], 'rock'));
  g.add(mesh(chisel(.36, .22, .32, .12, 81 + variant), rock, [(r() < .5 ? -1 : 1) * .48, .95, (r() - .5) * .4], 'rock'));
  for (let i = 0; i < 2; i++) { const t = new T.TetrahedronGeometry(.16 + r() * .06); t.computeVertexNormals(); g.add(mesh(boxUV(t), rock, [(r() - .5) * 1.4, .08, (r() < .5 ? -1 : 1) * (.55 + r() * .2)], 'rock', false)); }   // chips: no shadow (cost)
  const sk = new T.PlaneGeometry(.16, .36); sk.rotateX(-Math.PI / 2); g.add(mesh(sk, mat('plastic', C.socket), [0, RING_TOP + .05, 0], 'socket', false));   // ≥ 0.05 above the top face
  if (moss) g.add(mesh(boxUV(new T.BoxGeometry(.5, .07, .6)), mat('moss', C.moss), [-.36, RING_TOP + .04, .05], 'moss', false));
  return mergeParts(g);
}
// Merge a prop's meshes per (material, shadow) into one mesh each: same pixels, far fewer draw calls when instanced.
export function mergeParts(g) {
  g.updateMatrixWorld(true); const buckets = new Map();
  g.traverse(m => { if (!m.isMesh) return; const k = m.material.uuid + '|' + m.castShadow; if (!buckets.has(k)) buckets.set(k, {m, geos: []});
    const q = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld); for (const a of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(a)) q.deleteAttribute(a); buckets.get(k).geos.push(q); });
  const out = new T.Group(); out.name = g.name;
  for (const {m, geos} of buckets.values()) out.add(mesh(mergeGeometries(geos), m.material, [0, 0, 0], m.name, m.castShadow));
  return out;
}
export function heroStone({cracks = 1, dirt = true, dirtY = .09} = {}) {
  const g = new T.Group(), rockG = new T.Group(), rock = mat('rock', C.rock, {flat: true}), rockDk = mat('rock', C.rockDk, {flat: true});
  g.name = 'heroStone'; rockG.name = 'heroRock';
  rockG.add(mesh(chisel(1.15, .8, 1.0, .38, 91), rock, [0, .8, 0], 'rock'));
  rockG.add(mesh(chisel(.7, .45, .65, .25, 92), rock, [.35, 1.55, .15], 'rock'));
  rockG.add(mesh(chisel(.6, .5, .55, .22, 93), rockDk, [-.75, .5, -.45], 'rock'));
  for (const [x, z, ry] of [[0, 1.02, 0], [0, -1.02, 0], [1.17, 0, 90], [-1.17, 0, 90]]) { const b = mesh(boxUV(new T.BoxGeometry(1.5, .16, .08)), rockDk, [x, 1.0, z], 'band'); b.rotation.y = ry * Math.PI / 180; rockG.add(b); }   // carved band
  const sk = new T.PlaneGeometry(.22, .5); sk.rotateX(-Math.PI / 2); rockG.add(mesh(sk, mat('plastic', C.socket), [0, 2.01, -.2], 'socket', false));
  g.add(rockG);
  const stages = [];
  if (dirt) {
    g.add(mesh(boxUV(new T.CylinderGeometry(2.7, 2.7, .04, 14)), mat('dirt', C.dirt), [0, dirtY, 0], 'dirt', false));
    // Modelled crack grooves on the dirt, three stages (hairline → wider → split), shown one at a time.
    const crackMat = mat('plastic', C.crack);
    for (const [n, w, len, jag] of [[5, .05, 1.5, .1], [7, .1, 2.2, .18], [8, .2, 2.5, .3]]) {
      const s = new T.Group(); s.name = 'cracks' + (stages.length + 1); const r = rnd(95 + stages.length);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r() * .4, l = len * (.7 + r() * .3), b = mesh(new T.BoxGeometry(w, .03, l), crackMat, [Math.sin(a) * (1.25 + l / 2), dirtY + .035, Math.cos(a) * (1.25 + l / 2)], 'crack', false); b.rotation.y = a + (r() - .5) * jag; s.add(b); }
      s.visible = false; stages.push(s); g.add(s);
    }
  }
  const api = {group: g, rock: rockG, socketTop: 2.01, setCracks(k) { stages.forEach((s, i) => { s.visible = i === k - 1; }); }};
  api.setCracks(cracks); g.userData.setCracks = api.setCracks; return api;
}

// ---- instancing ---------------------------------------------------------------------------------------------
// One InstancedMesh per part of `group` (part local transform × instance transform). jitter: ± tone on parts whose
// material is a rock pattern (instanceColor), seeded per instance.
export function instanceGroup(group, list, {jitter = .05, cast = true, tone = '#ffffff'} = {}) {
  const out = new T.Group(); group.updateMatrixWorld(true);
  const M = new T.Matrix4(), I = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
  group.traverse(m => {
    if (!m.isMesh) return;
    const im = new T.InstancedMesh(m.geometry, m.material, list.length); im.name = m.name + '_x' + list.length; im.castShadow = cast && m.castShadow; im.receiveShadow = true;
    const rock = m.material.userData?.pattern === 'rock';
    list.forEach((p, i) => {
      e.set(0, p.rotY ?? 0, 0); q.setFromEuler(e); const s = p.s ?? 1;
      I.compose(new T.Vector3(...p.at), q, new T.Vector3(s, s, s)); M.multiplyMatrices(I, m.matrixWorld); im.setMatrixAt(i, M);
      if (rock) { const k = 1 + (((Math.sin((p.i ?? i) * 91.7) * 43758.5) % 1 + 1) % 1 - .5) * 2 * jitter; im.setColorAt(i, c.set(tone).multiplyScalar(k)); }
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); out.add(im);
  });
  return out;
}
export const triangleCount = obj => { let n = 0; obj.traverse(o => { if (o.isMesh) n += tris(o.geometry); }); return n; };

// ---- Small-props library (brief §14.3): generic clutter shared by every episode; grows each episode. ---------
// Buildings, landmarks, layouts and palettes stay bespoke per world. Every builder: (seed, colours) → Group,
// origin at the ground contact, merged per material (mergeParts) so it instances cheaply; ≤ 400 triangles each.
// Seeded from the Nobody world's clutter cluster, trees and well-roof styles.
export const SMALL_COLORS = {wood: '#7a5233', woodDk: '#5a3a22', woodLt: '#a97c4a', sack: '#d9b26a', iron: '#4a4f57', leaf: '#7cc36a', leafDk: '#5fa552',
  rock: '#8d9aae', cloud: '#f7f9fc', cream: '#f2e6c8', banner: '#3f6fb5', flame: '#ffb02e'};
const S = SMALL_COLORS;
const g0 = () => new T.Group();
const box = (grp, size, at, color, {pattern = 'plastic', rot = [0, 0, 0], cast = true, flat = false} = {}) => {
  const m = mesh(boxUV(new T.BoxGeometry(...size)), mat(pattern, color, {flat}), at, 'part', cast); m.rotation.set(...rot.map(d => d * Math.PI / 180)); grp.add(m); return m; };
const cyl = (grp, r, h, at, color, {pattern = 'plastic', seg = 8, rTop = r, rot = [0, 0, 0], cast = true} = {}) => {
  const m = mesh(boxUV(new T.CylinderGeometry(rTop, r, h, seg)), mat(pattern, color), at, 'part', cast); m.rotation.set(...rot.map(d => d * Math.PI / 180)); grp.add(m); return m; };
const lump = (grp, r, at, color, {pattern = 'plastic', scale = [1, 1, 1], detail = 0, cast = true, flat = true} = {}) => {
  const g = new T.IcosahedronGeometry(r, detail); g.scale(...scale); const m = mesh(boxUV(g), mat(pattern, color, {flat}), at, 'part', cast); grp.add(m); return m; };
const done = (g, name) => { g.name = name; return mergeParts(g); };
const grounded = (g, name) => { const y = new T.Box3().setFromObject(g).min.y; g.position.y -= y; const w = g0(); w.add(g); return done(w, name); };   // lumpy props: lowest point on y = 0

export const SMALL_PROPS = {
  barrel: (seed = 1, {color = S.wood} = {}) => { const g = g0(); cyl(g, .8, 1.8, [0, .9, 0], color, {pattern: 'woodPlanks', seg: 10}); for (const y of [.35, 1.45]) cyl(g, .84, .14, [0, y, 0], S.iron, {seg: 10}); return done(g, 'barrel'); },
  crate: (seed = 1, {color = S.woodLt, size = 1.6} = {}) => { const g = g0(), k = size; box(g, [k, k, k], [0, k / 2, 0], color, {pattern: 'woodPlanks'}); for (const s of [-1, 1]) box(g, [k * 1.02, .14, .14], [0, k / 2, s * k * .51], S.woodDk, {rot: [0, 0, 38]}); return done(g, 'crate'); },
  sack: (seed = 1, {color = S.sack} = {}) => { const r = rnd(seed), g = g0(), sy = .8 + r() * .2; lump(g, .75, [0, .75 * sy, 0], color, {scale: [1, sy, .9]}); cyl(g, .18, .3, [0, 1.5 * sy, 0], S.woodDk, {seg: 6}); return grounded(g, 'sack'); },
  lantern: (seed = 1, {glow = S.flame} = {}) => { const g = g0(); box(g, [.6, .1, .6], [0, .05, 0], S.iron); box(g, [.42, .6, .42], [0, .4, 0], glow, {cast: false}); box(g, [.6, .1, .6], [0, .75, 0], S.iron); cyl(g, .32, .3, [0, .95, 0], S.iron, {rTop: .02, seg: 4}); return done(g, 'lantern'); },
  torch: (seed = 1) => { const g = g0(); box(g, [.2, 2.6, .2], [0, 1.3, 0], S.woodDk, {pattern: 'woodPlanks'}); cyl(g, .26, .3, [0, 2.7, 0], S.iron, {rTop: .3, seg: 6}); cyl(g, .26, .7, [0, 3.2, 0], S.flame, {rTop: .02, seg: 5, cast: false}); return done(g, 'torch'); },
  bench: (seed = 1, {color = S.wood, len = 3} = {}) => { const g = g0(); box(g, [len, .2, .8], [0, .9, 0], color, {pattern: 'woodPlanks'}); for (const s of [-1, 1]) box(g, [.2, .9, .7], [s * (len / 2 - .3), .45, 0], S.woodDk); box(g, [len, .5, .15], [0, 1.4, -.35], color, {pattern: 'woodPlanks'}); return done(g, 'bench'); },
  fence: (seed = 1, {color = S.woodLt, len = 4, posts = 3} = {}) => { const g = g0(); for (let i = 0; i < posts; i++) box(g, [.25, 1.5, .25], [-len / 2 + i * len / (posts - 1), .75, 0], S.woodDk); for (const y of [.55, 1.15]) box(g, [len + .2, .18, .12], [0, y, .14], color, {pattern: 'woodPlanks'}); return done(g, 'fence'); },
  cart: (seed = 1, {color = S.woodLt} = {}) => { const g = g0(); box(g, [2.4, .25, 1.6], [0, 1.1, 0], color, {pattern: 'woodPlanks'}); for (const s of [-1, 1]) { box(g, [2.4, .5, .12], [0, 1.45, s * .8], color, {pattern: 'woodPlanks'}); cyl(g, .55, .2, [0, .55, s * .95], S.woodDk, {seg: 10, rot: [90, 0, 0]}); } box(g, [1.8, .12, .12], [2, 1, -.4], S.woodDk); box(g, [1.8, .12, .12], [2, 1, .4], S.woodDk); return done(g, 'cart'); },
  sign: (seed = 1, {color = S.cream} = {}) => { const g = g0(); box(g, [.22, 2.4, .22], [0, 1.2, 0], S.woodDk); box(g, [1.6, .8, .12], [0, 2.1, .16], color, {pattern: 'woodPlanks'}); return done(g, 'sign'); },
  tree: (seed = 1, {kind = seed % 3} = {}) => {   // kind 0 stacked blocks · 1 round lumps · 2 tall pine cones
    const r = rnd(seed), g = g0(), s = .85 + r() * .4;
    box(g, [.9 * s, 4 * s, .9 * s], [0, 2 * s, 0], S.woodDk, {pattern: 'woodPlanks'});
    if (kind === 0) for (let i = 0; i < 3; i++) box(g, [(4.4 - i) * s, 2.4 * s, (4.4 - i) * s], [(r() - .5) * .6, (4.6 + i * 2) * s, (r() - .5) * .6], i ? S.leaf : S.leafDk, {rot: [0, r() * 90, 0], flat: true});
    else if (kind === 1) for (let i = 0; i < 3; i++) lump(g, (2 - i * .3) * s, [(r() - .5) * 1.4, (5 + i * 1.3) * s, (r() - .5) * 1.4], i % 2 ? S.leaf : S.leafDk);
    else for (let i = 0; i < 3; i++) cyl(g, (2.6 - i * .7) * s, 2.6 * s, [0, (4.2 + i * 1.7) * s, 0], i % 2 ? S.leaf : S.leafDk, {rTop: .2, seg: 6});
    return done(g, 'tree' + kind);
  },
  bush: (seed = 1) => { const r = rnd(seed), g = g0(); for (let i = 0; i < 3; i++) lump(g, .7 + r() * .4, [(r() - .5) * 1.4, .55, (r() - .5) * 1.2], i % 2 ? S.leaf : S.leafDk); return grounded(g, 'bush'); },
  rock: (seed = 1, {size = [1.4, .9, 1.1][seed % 3]} = {}) => { const g = g0(), k = size; g.add(mesh(chisel(k * .7, k * .55, k * .6, k * .22, 300 + seed), mat('rock', S.rock, {flat: true}), [0, k * .55, 0], 'rock')); return done(g, 'rock' + (seed % 3)); },
  cloud: (seed = 1) => { const r = rnd(seed), g = g0(); for (let i = 0; i < 4; i++) box(g, [3 + r() * 3, 1.2 + r(), 2.5 + r() * 2], [(i - 1.5) * 2.2, r() * .8, (r() - .5) * 1.5], S.cloud, {cast: false, flat: true}); return done(g, 'cloud'); },
  banner: (seed = 1, {color = S.banner, h = 4} = {}) => { const g = g0(); box(g, [.2, h + 1, .2], [0, (h + 1) / 2, 0], S.woodDk); box(g, [1.6, .14, .14], [0, h + .8, .1], S.woodDk); box(g, [1.4, h * .6, .06], [0, h + .7 - h * .3, .12], color, {cast: false}); return done(g, 'banner'); },
};
export const SMALL_PROP_NAMES = Object.keys(SMALL_PROPS);
// The brief's list: tree ×3 and rock ×3 are seeds/kinds 0–2 of `tree` and `rock`.
export const smallProp = (name, seed = 1, opts = {}) => { if (!SMALL_PROPS[name]) throw Error('unknown small prop ' + name); return SMALL_PROPS[name](seed, opts); };

// ---- Class swords (Amendment A3): six original class blades, one silhouette each, block-toy style ----------
// classSword(cls, tier): origin = crossguard centre, blade along −Y, grip +Y (same as sword()). Blade width runs
// along z (the flat faces ±x), so a held sword reads in profile like the plain one. Glow is emissive only (the A2
// grade blooms highlights). hero ≤ 700 tris, bg ≤ 120. CLASSES holds each class's colour, icon, accessory and FX.
export const CLASSES = {
  baker:  {name: 'Baker',  sword: 'Goldcrust Saber',    color: '#f5a623', dark: '#7a3f0c', icon: 'loaf',    accessory: 'chefHat',   fx: ['steam', 'flour']},
  knight: {name: 'Knight', sword: 'Bastion Blade',      color: '#3d8bf0', dark: '#123a74', icon: 'shield',  accessory: 'helmet',    fx: ['rays']},
  king:   {name: 'King',   sword: 'Sunfire Regalia',    color: '#f7c82c', dark: '#5a2a7a', icon: 'crown',   accessory: 'crown',     fx: ['goldConfetti', 'halo']},
  archer: {name: 'Archer', sword: 'Galeleaf Edge',      color: '#37c45a', dark: '#145a28', icon: 'leafbow', accessory: 'featherCap', fx: ['leaves']},
  smith:  {name: 'Smith',  sword: 'Forgeheart Cleaver', color: '#ff6a1f', dark: '#5a1a08', icon: 'anvil',   accessory: 'goggles',   fx: ['embers']},
  farmer: {name: 'Farmer', sword: 'Harvest Crescent',   color: '#a8d43a', dark: '#3f5a12', icon: 'wheat',   accessory: 'strawHat',  fx: ['petals']},
};
export const CLASS_NAMES = Object.keys(CLASSES);
const classMats = new Map(), cachedMat = (k, f) => { if (!classMats.has(k)) classMats.set(k, f()); return classMats.get(k); };   // shared, so parts merge
const glowMat = (color, intensity = 1.2, base = color) => cachedMat(`g:${color}:${intensity}:${base}`, () => { const m = new T.MeshPhongMaterial({color: base, emissive: new T.Color(color), emissiveIntensity: intensity, shininess: 60, specular: '#ffffff', flatShading: true}); m.userData = {pattern: 'glow'}; return m; });
const toyMat = (color, shininess = 70) => cachedMat(`t:${color}:${shininess}`, () => new T.MeshPhongMaterial({color, shininess, specular: '#cfcfcf', flatShading: true}));
// A flat profile in the (z, y) plane, extruded `t` thick along x and centred on it.
function profile(points, t, curveSeg = 1) {
  const s = new T.Shape(); points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  const g = new T.ExtrudeGeometry(s, {depth: t, bevelEnabled: false, curveSegments: curveSeg});
  g.translate(0, 0, -t / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return boxUV(g, 2);
}
const bx = (grp, size, at, m, rot = [0, 0, 0], cast = true) => { const x = mesh(boxUV(new T.BoxGeometry(...size)), m, at, 'part', cast); x.rotation.set(...rot); grp.add(x); return x; };
const arc = (n, f) => Array.from({length: n + 1}, (_, i) => f(i / n));

const CLASS_BUILD = {
  // Goldcrust Saber: wide curved golden blade with baguette scoring, glowing ember seam, wheat-sheaf guard, loaf pommel.
  baker(g, hero) {
    const gold = toyMat('#e8a93a'), crust = toyMat('#a8621c'), L = 2.5;
    // saber curve sweeping forward, widening, ending in a rounded loaf-end tip
    const cz = u => .72 * u * u, back = arc(7, u => [-.2 + cz(u), -u * L]);
    const tip = arc(4, v => [cz(1) + .1 + .24 * Math.cos(Math.PI * v) * -1, -L - .14 * Math.sin(Math.PI * v)]);
    const edge = arc(7, u => [.28 + .1 * u + cz(u), -u * L]).reverse();
    g.add(mesh(profile([...back, ...tip.reverse(), ...edge], .09), gold, [0, -.05, 0], 'blade'));
    if (hero) {
      for (let i = 0; i < 5; i++) { const u = .15 + i * .16; bx(g, [.11, .05, .34], [0, -.05 - u * L, .05 + .05 * u + cz(u)], crust, [-.6, 0, 0], false); }
      g.add(mesh(profile([...arc(6, u => [.0 + cz(u), -.15 - u * (L - .4)]), ...arc(6, u => [.08 + cz(u), -.15 - u * (L - .4)]).reverse()], .1), glowMat('#ff7a1a', 1.4), [0, -.05, 0], 'seam'));
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) bx(g, [.1, .32, .08], [0, .08 + k * .03, s * (.18 + k * .1)], gold, [s * (.5 + k * .35), 0, 0]);
      bx(g, [.14, .12, .3], [0, 0, 0], crust);
      bx(g, [.12, .5, .12], [0, .32, 0], toyMat('#6b4428', 20));
      g.add(mesh(boxUV(new T.CapsuleGeometry(.12, .22, 2, 6).rotateX(Math.PI / 2)), gold, [0, .66, 0], 'pommel'));
    } else { bx(g, [.12, .1, .5], [0, 0, 0], crust); bx(g, [.1, .5, .1], [0, .3, 0], toyMat('#6b4428', 20)); }
  },
  // Bastion Blade: tall broad silver longsword, winged guard with a blue gem, shield pommel.
  knight(g, hero) {
    const steel = toyMat('#dfe6f0', 110), blue = glowMat('#5aaaff', 1.3, '#3d8bf0'), L = 3.0, w = .21;
    g.add(mesh(profile([[-w, 0], [w, 0], [w * .9, -L * .82], [0, -L], [-w * .9, -L * .82]], .1), steel, [0, -.05, 0], 'blade'));
    if (hero) {
      bx(g, [.12, L * .7, .05], [0, -.1 - L * .35, 0], toyMat('#a9b6c8', 90), [0, 0, 0], false);   // fuller
      // winged guard as blocky shield-plates that fold DOWN along the blade (a bastion's flanking walls)
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) bx(g, [.12, .3 - k * .05, .16], [0, -.05 - k * .2, s * (.36 - k * .07)], k ? steel : blue, [-s * .35, 0, 0]);
      bx(g, [.16, .16, .62], [0, 0, 0], steel);
      for (const z of [-.24, 0, .24]) bx(g, [.16, .1, .1], [0, .12, z], steel);   // battlement teeth on top of the guard
      g.add(mesh(boxUV(new T.OctahedronGeometry(.13)), blue, [0, .02, 0], 'gem', false));
      bx(g, [.12, .5, .12], [0, .32, 0], toyMat('#2a3a5a', 20));
      g.add(mesh(profile([[-.18, .12], [.18, .12], [.18, -.02], [0, -.2], [-.18, -.02]], .1), blue, [0, .68, 0], 'pommel'));
    } else { bx(g, [.12, .12, .62], [0, 0, 0], steel); bx(g, [.1, .5, .1], [0, .3, 0], toyMat('#2a3a5a', 20)); }
  },
  // Sunfire Regalia: white-gold blade, crown-shaped guard with a ruby, sun-ray spikes fanned behind the guard.
  king(g, hero) {
    const wg = glowMat('#fff3c0', .35, '#fff1c4'), gold = toyMat('#f2c230', 90), L = 2.7, w = .18;
    g.add(mesh(profile([[-w, 0], [w, 0], [w * .55, -L * .9], [0, -L], [-w * .55, -L * .9]], .09), wg, [0, -.05, 0], 'blade'));
    if (hero) {
      for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * Math.PI * .95; bx(g, [.05, .5, .07], [-.05, .2 + Math.cos(a) * .32, Math.sin(a) * .42], glowMat('#ffd84a', .9), [-a, 0, 0], false); }
      bx(g, [.16, .16, .58], [0, 0, 0], gold);
      for (let i = 0; i < 5; i++) { const z = (i - 2) * .13; g.add(mesh(boxUV(new T.ConeGeometry(.055, .22, 4)), gold, [0, .18, z], 'spike')); }
      g.add(mesh(boxUV(new T.OctahedronGeometry(.14)), glowMat('#ff2240', 1.1, '#d0102c'), [.08, .02, 0], 'ruby', false));
      bx(g, [.12, .5, .12], [0, .32, 0], toyMat('#5a2a7a', 30));
      g.add(mesh(boxUV(new T.OctahedronGeometry(.12)), gold, [0, .66, 0], 'pommel'));
    } else { bx(g, [.14, .14, .5], [0, 0, 0], gold); bx(g, [.1, .5, .1], [0, .3, 0], toyMat('#5a2a7a', 30)); }
  },
  // Galeleaf Edge: slim leaf blade with a light rib; the guard curls down like bow limbs with a glowing string.
  archer(g, hero) {
    const leaf = toyMat('#3fbf5a', 60), L = 2.5;
    const half = arc(6, u => [.17 * Math.sin(Math.PI * Math.pow(u, .8)) + .02, -u * L]);
    g.add(mesh(profile([...half, ...half.slice(0, -1).reverse().map(([z, y]) => [-z, y])], .07), leaf, [0, -.05, 0], 'blade'));
    if (hero) {
      bx(g, [.09, L * .85, .035], [0, -.05 - L * .43, 0], toyMat('#b6f07a', 40), [0, 0, 0], false);
      const limb = arc(5, u => [.08 + .52 * Math.sin(u * 1.9), .12 - .7 * u * u]);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
        const [z0, y0] = limb[i], [z1, y1] = limb[i + 1], len = Math.hypot(z1 - z0, y1 - y0);
        bx(g, [.09, .09, len + .02], [0, (y0 + y1) / 2, s * (z0 + z1) / 2], toyMat('#8a5a2a', 30), [-s * Math.atan2(y1 - y0, z1 - z0), 0, 0]);
      }
      const tip = limb.at(-1); bx(g, [.03, .03, tip[0] * 2], [0, tip[1], 0], glowMat('#d8ffb0', 1.5), [0, 0, 0], false);
      bx(g, [.1, .5, .1], [0, .32, 0], toyMat('#2a5a2a', 20));
      g.add(mesh(profile([[0, .14], [.1, 0], [0, -.12], [-.1, 0]], .08), leaf, [0, .66, 0], 'pommel'));
    } else { bx(g, [.1, .1, .5], [0, 0, 0], toyMat('#8a5a2a', 30)); bx(g, [.08, .5, .08], [0, .3, 0], toyMat('#2a5a2a', 20)); }
  },
  // Forgeheart Cleaver: thick dark-iron cleaver, glowing lava cracks on both faces, anvil pommel.
  smith(g, hero) {
    // a true cleaver: short neck, then a wide square head with a flat tip and a hanging hole
    const iron = toyMat('#3a3f48', 50), lava = glowMat('#ff5a10', 1.5, '#ff7a20'), L = 1.9;
    g.add(mesh(profile([[-.1, 0], [.12, 0], [.12, -.3], [.78, -.36], [.78, -L], [-.16, -L], [-.16, -.36], [-.1, -.3]], .16), iron, [0, -.05, 0], 'blade'));
    if (hero) {
      g.add(mesh(boxUV(new T.CylinderGeometry(.11, .11, .18, 8).rotateZ(Math.PI / 2)), toyMat('#0d0f12', 10), [0, -.62, .56], 'hole', false));
      bx(g, [.18, .08, .94], [0, -.05 - L + .04, .31], toyMat('#9aa3ad', 90), [0, 0, 0], false);   // honed edge
      const crack = [[.05, -.5], [.3, -.8], [.12, -1.1], [.42, -1.4], [.2, -1.7]];
      for (const s of [-1, 1]) for (let i = 0; i < crack.length - 1; i++) {
        const [z0, y0] = crack[i], [z1, y1] = crack[i + 1], len = Math.hypot(z1 - z0, y1 - y0);
        bx(g, [.02, .06, len], [s * .085, -.05 + (y0 + y1) / 2, (z0 + z1) / 2], lava, [-Math.atan2(y1 - y0, z1 - z0), 0, 0], false);
      }
      bx(g, [.22, .16, .5], [0, 0, .05], iron);
      bx(g, [.14, .5, .14], [0, .32, 0], toyMat('#5a3a22', 20));
      bx(g, [.24, .16, .42], [0, .66, 0], iron); bx(g, [.18, .12, .22], [0, .58, 0], iron);
      g.add(mesh(boxUV(new T.ConeGeometry(.08, .26, 4).rotateX(Math.PI / 2)), iron, [0, .66, .3], 'horn'));
    } else { bx(g, [.2, .14, .4], [0, 0, .05], iron); bx(g, [.12, .5, .12], [0, .3, 0], toyMat('#5a3a22', 20)); }
  },
  // Harvest Crescent: a crescent sickle-curve blade, green-gold, vines round the grip, a sprout on the pommel.
  farmer(g, hero) {
    const blade = toyMat('#c8d24a', 80), vine = toyMat('#3f8a2a', 20), L = 2.3;
    const outer = arc(8, u => [.55 * Math.sin(Math.PI * u) - .08 * u, -u * L]);
    const inner = arc(8, u => [.32 * Math.sin(Math.PI * u) + .02 - .06 * u, -u * L * .97]).reverse();
    g.add(mesh(profile([...outer, ...inner], .08), blade, [0, -.05, 0], 'blade'));
    if (hero) {
      g.add(mesh(profile([...arc(6, u => [.5 * Math.sin(Math.PI * u) - .06 * u, -.1 - u * (L - .2)]), ...arc(6, u => [.45 * Math.sin(Math.PI * u) - .05 * u, -.1 - u * (L - .2)]).reverse()], .09), glowMat('#e8ff7a', 1.1), [0, -.05, 0], 'edge'));
      bx(g, [.14, .12, .46], [0, 0, 0], toyMat('#8a6a2a', 40));
      bx(g, [.11, .52, .11], [0, .32, 0], toyMat('#6b4428', 20));
      for (let i = 0; i < 4; i++) bx(g, [.14, .05, .14], [0, .12 + i * .12, 0], vine, [0, i * .7, .35]);
      bx(g, [.04, .2, .04], [0, .68, 0], vine);
      for (const s of [-1, 1]) bx(g, [.05, .07, .18], [0, .76, s * .08], toyMat('#6fd04a', 30), [s * .5, 0, 0]);
    } else { bx(g, [.12, .1, .4], [0, 0, 0], toyMat('#8a6a2a', 40)); bx(g, [.1, .5, .1], [0, .3, 0], toyMat('#6b4428', 20)); }
  },
};

export function classSword(cls, {tier = 'hero'} = {}) {
  if (!CLASS_BUILD[cls]) throw Error('unknown class ' + cls);
  const g = new T.Group(); g.name = 'classSword_' + cls; CLASS_BUILD[cls](g, tier === 'hero');
  g.userData = {cls, tier}; return mergeParts(g);
}

// ---- E1 test park props (PROPS6) ---------------------------------------------------------------------------------
// Our own open "ragdoll test park" kit: every builder is deterministic in its options, origin at the ground contact,
// +z = front. Animated props carry `userData.set(p)` (the same params as the builder) so a world's setState drives them;
// the pose maths is pure and exported (coasterPoint / coasterFrame, handCurl, fanAngle) for node tests. No game names,
// logos, UI or weapons. nameTag is a floating label: Season 1 specs never show it (no labels, SEASON_1.md §2c).
import {ENV} from './materials.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const PARK = {concrete: '#D9D9D4', grid: '#BDBDB8', sage: '#8FB38A', sky: '#C9D8E4', fan: '#4F6B4A', steel: '#8A9099', steelDk: '#5E646C',
  mat: '#E8E2D6', apron: '#3A3E46', post: '#D2383A', rope: '#F6F6F4', water: '#4FA3D9', rim: '#F7F7F5', crate: '#B98A55', crateDk: '#8C6439',
  barrel: '#C8372D', barrelRing: '#7E2420', bench: '#9C6B43', benchLeg: '#3A3E46', stone: '#D8C7A3', stoneDk: '#C2AE88', stoneLt: '#E6D8B8',
  pad: '#F4F4F2', glow: '#4FE3F0', signInk: '#2B2D33', signPaper: '#F2F2EE', glove: '#F7F7F5', seam: '#C9C9CE', heal: '#3CC46A', healPad: '#2A2D33',
  track: '#E2563E', cart: '#2F80D1', seat: '#26292F'};
const pmCache = new Map();
// Park material: satin MeshStandard with the world's env map (A4 look), cached per colour + options.
export function pm(color, {rough = .55, metal = 0, emissive = null, ei = 1, side = T.FrontSide, opacity = 1} = {}) {
  const k = [color, rough, metal, emissive, ei, side, opacity].join('|'); if (pmCache.has(k)) return pmCache.get(k);
  const m = new T.MeshStandardMaterial({color, roughness: rough, metalness: metal, envMap: ENV.map, envMapIntensity: ENV.intensity, side, transparent: opacity < 1, opacity});
  if (emissive) { m.emissive = new T.Color(emissive); m.emissiveIntensity = ei; }
  m.name = 'park:' + k; pmCache.set(k, m); return m;
}
const pbx = (w, h, d, m, at, name = 'part', cast = true) => mesh(new T.BoxGeometry(w, h, d), m, at, name, cast);
const pcy = (r0, r1, h, m, at, name = 'part', seg = 16, cast = true) => mesh(new T.CylinderGeometry(r0, r1, h, seg), m, at, name, cast);
// A beam between two points (box w × w, or a cylinder when round).
function beam(a, b, w, m, {round = false, name = 'beam', cast = true} = {}) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B), g = round ? new T.CylinderGeometry(w / 2, w / 2, L, 8) : new T.BoxGeometry(w, L, w);
  const x = mesh(g, m, A.clone().add(B).multiplyScalar(.5).toArray(), name, cast); x.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return x;
}
const rot = (o, k, v) => { o.rotation[k] = v; return o; };
const canvasOk = () => typeof document !== 'undefined';
function rrect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }

// giantFan: green steel frame, an 18-stud ring (outer diameter) on two A-frame legs, 6 blades on a hub. Rotor spins about
// the ring axis (+z = the wind direction). spin = rotor angle in radians. fanAngle(t, rpm) = pure angle for a world clock.
export const fanAngle = (t, rpm = 40) => t * rpm / 60 * Math.PI * 2;
export function giantFan({spin = 0, ring = 18, color = PARK.fan} = {}) {
  const g = new T.Group(); g.name = 'giantFan'; const steel = pm(color, {rough: .45, metal: .35}), dark = pm('#2E3A2C', {rough: .5, metal: .3}), R = ring / 2, cyH = R + 2.2;
  const rim = mesh(new T.TorusGeometry(R - .45, .45, 10, 48), steel, [0, cyH, 0], 'fanRing'); g.add(rim);
  const back = mesh(new T.TorusGeometry(R - .45, .3, 8, 48), steel, [0, cyH, -1.2], 'fanRingBack'); g.add(back);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, p = [Math.cos(a) * (R - .45), cyH + Math.sin(a) * (R - .45)]; g.add(beam([p[0], p[1], 0], [p[0], p[1], -1.2], .3, steel, {round: true})); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(beam([0, cyH, -1.2], [Math.cos(a) * (R - .5), cyH + Math.sin(a) * (R - .5), -1.2], .22, dark, {round: true})); }   // rear guard spokes
  g.add(rot(pcy(.9, 1.1, 1.6, dark, [0, cyH, -1.6], 'motor'), 'x', Math.PI / 2));
  for (const s of [-1, 1]) { g.add(beam([s * (R - 1), cyH - R * .7, -.6], [s * (R + 1.6), 0, -.6], .7, steel)); g.add(beam([s * (R - 1), cyH - R * .7, -.6], [s * (R + .4), 0, -3.4], .5, steel)); }
  g.add(pbx(ring + 5, .4, 4.4, dark, [0, .2, -1.6], 'fanBase'));
  const rotor = new T.Group(); rotor.name = 'fanRotor'; rotor.position.set(0, cyH, -.4); g.add(rotor);
  rotor.add(rot(pcy(1, 1, .9, dark, [0, 0, 0], 'hub'), 'x', Math.PI / 2));
  const bladeG = new T.BoxGeometry(1.9, R - 1.6, .14); bladeG.translate(0, (R - 1.6) / 2 + .8, 0);
  for (let i = 0; i < 6; i++) { const b = mesh(bladeG, steel, [0, 0, 0], 'blade'); b.rotation.z = i / 6 * Math.PI * 2; b.rotateY(.35); rotor.add(b); }
  const set = ({spin: s = 0} = {}) => { rotor.rotation.z = s; };
  set({spin}); g.userData.set = set; g.userData.keep = true; g.userData.anchors = {hub: [0, cyH, 0], front: [0, 0, 3]}; return g;
}

// launchTower: grey steel lattice 6 × 6 × 40 (four posts, X-braces every 5), switchback stairs up the +x face, a 6 × 6 top
// platform with rails (anchor towerTop = [0, 40, 0]) and a side slide from the platform's −x edge curving down to +z.
export const TOWER_H = 40;
export function slideCurve(h = TOWER_H) {
  return new T.CatmullRomCurve3([[-3.4, h + .2, 0], [-6, h - 6, 2], [-8.5, h * .55, 9], [-7.5, h * .3, 19], [-4.5, h * .1, 28], [-3.5, 1.1, 34], [-3.5, .7, 37]].map(p => new T.Vector3(...p)));
}
function uTrough(curve, {width = 2.2, wall = .9, n = 120, m}) {   // swept U profile (floor + two walls), one mesh
  const pos = [], idx = [], prof = [[-width / 2, wall], [-width / 2, 0], [width / 2, 0], [width / 2, wall]];
  for (let i = 0; i <= n; i++) { const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u), side = new T.Vector3(t.z, 0, -t.x).normalize(), up = new T.Vector3().crossVectors(side, t).normalize().multiplyScalar(-1);
    if (up.y < 0) up.negate(); for (const [s, h] of prof) pos.push(p.x + side.x * s + up.x * h, p.y + side.y * s + up.y * h, p.z + side.z * s + up.z * h); }
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const a = i * 4 + k, b = a + 1, c = a + 4, d = a + 5; idx.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return mesh(g, m, [0, 0, 0], 'slide');
}
export function launchTower({h = TOWER_H, w = 6} = {}) {
  const g = new T.Group(); g.name = 'launchTower'; const steel = pm(PARK.steel, {rough: .45, metal: .45}), dk = pm(PARK.steelDk, {rough: .5, metal: .4}), hw = w / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(pbx(.5, h, .5, steel, [sx * hw, h / 2, sz * hw], 'post'));
  for (let y = 0; y < h; y += 5) {
    const y1 = Math.min(h, y + 5);
    for (const [a, b] of [[[-hw, -hw], [hw, -hw]], [[hw, -hw], [hw, hw]], [[hw, hw], [-hw, hw]], [[-hw, hw], [-hw, -hw]]]) {
      g.add(beam([a[0], y1, a[1]], [b[0], y1, b[1]], .3, dk)); g.add(beam([a[0], y, a[1]], [b[0], y1, b[1]], .22, steel, {round: true})); g.add(beam([b[0], y, b[1]], [a[0], y1, a[1]], .22, steel, {round: true}));
    }
  }
  // switchback stairs on the +x face: flights of 5 up, 8 long, alternating direction along z, landings at the ends
  const stairM = pm('#6B7079', {rough: .6, metal: .3}), flights = Math.round(h / 5);
  for (let f = 0; f < flights; f++) {
    const dir = f % 2 ? -1 : 1, z0 = -dir * 4, y0 = f * 5;
    for (let s = 0; s < 10; s++) g.add(pbx(2, .18, .8, stairM, [hw + 1.4, y0 + (s + 1) * .5 - .09, z0 + dir * (s + .5) * .8], 'step'));
    g.add(beam([hw + 2.45, y0 + 1.2, z0], [hw + 2.45, y0 + 6.2, z0 + dir * 8], .14, dk, {round: true, cast: false}));
    g.add(pbx(2, .2, 2, stairM, [hw + 1.4, y0 + 5 - .1, z0 + dir * 9], 'landing'));
  }
  // top platform + rails (open on the −x side for the slide)
  g.add(pbx(w + 1, .4, w + 1, dk, [0, h - .2, 0], 'platform'));
  for (const [a, b] of [[[hw + .5, -hw - .5], [hw + .5, hw + .5]], [[-hw - .5, hw + .5], [hw + .5, hw + .5]], [[-hw - .5, -hw - .5], [hw + .5, -hw - .5]]]) { g.add(beam([a[0], h + 1.1, a[1]], [b[0], h + 1.1, b[1]], .16, steel, {round: true})); g.add(beam([a[0], h, a[1]], [a[0], h + 1.1, a[1]], .14, steel, {round: true})); }
  // the slide: swept U trough + supports to the ground
  const c = slideCurve(h); g.add(uTrough(c, {m: pm('#F2B632', {rough: .35})}));
  for (const u of [.25, .45, .62, .78, .9]) { const p = c.getPointAt(u); if (p.y > 1.5) g.add(beam([p.x, 0, p.z], [p.x, p.y - .1, p.z], .3, dk, {round: true})); }
  g.userData.anchors = {towerBase: [hw + 1.4, 0, -4.6], towerTop: [0, h, 0], slideEnd: [-3.5, 0, 37]}; return g;
}

// coaster: a closed circuit (track-local, ground y 0, rails at y ≥ 1.2): station straight, a hill, the 14-stud vertical
// loop (diameter 14, it shifts 3 sideways so the rails clear), a U-turn, the return straight, a U-turn home.
// coasterPoint(u) is pure (u 0..1 by arc length; returns position, tangent, up, inLoop); the cart flips through the loop.
const CR = 1.2, LOOP_R = 7, LOOP_X = 42, LOOP_DZ = 3, hillY = x => 8 * Math.sin(Math.PI * x / 24) ** 2;
const HILL_LEN = (() => { let L = 0; for (let i = 0; i < 2400; i++) L += Math.hypot(.01, hillY((i + 1) * .01) - hillY(i * .01)); return L; })();   // arc length of the hill (studs)
const SEGS = [
  {len: 12, f: s => [s, CR, 0]},
  {len: HILL_LEN, f: s => { const x = s / HILL_LEN * 24; return [12 + x, CR + hillY(x), 0]; }},
  {len: 6, f: s => [36 + s, CR, 0]},
  {len: 2 * Math.PI * LOOP_R, loop: true, f: s => { const th = s / LOOP_R; return [LOOP_X + LOOP_R * Math.sin(th), CR + LOOP_R - LOOP_R * Math.cos(th), LOOP_DZ * th / (2 * Math.PI)]; }},
  {len: 14, f: s => [LOOP_X + s, CR, LOOP_DZ]},
  {len: Math.PI * 7.5, f: s => { const p = s / 7.5; return [56 + 7.5 * Math.sin(p), CR, -4.5 + 7.5 * Math.cos(p)]; }},
  {len: 56, f: s => [56 - s, CR, -12]},
  {len: Math.PI * 6, f: s => { const p = s / 6; return [-6 * Math.sin(p), CR, -6 - 6 * Math.cos(p)]; }},
];
export const COASTER_LEN = SEGS.reduce((a, s) => a + s.len, 0);
export const COASTER_LOOP = {x: LOOP_X, r: LOOP_R, diameter: 2 * LOOP_R, u0: SEGS.slice(0, 3).reduce((a, s) => a + s.len, 0) / COASTER_LEN, u1: SEGS.slice(0, 4).reduce((a, s) => a + s.len, 0) / COASTER_LEN};
const segAt = u => { let s = ((u % 1) + 1) % 1 * COASTER_LEN; for (const g of SEGS) { if (s <= g.len) return [g, s]; s -= g.len; } return [SEGS.at(-1), SEGS.at(-1).len]; };
export function coasterPoint(u) {
  const [g, s] = segAt(u), p = g.f(s), e = 1e-3, q = g.f(Math.min(g.len, s + e)), o = g.f(Math.max(0, s - e));
  let t = q.map((v, i) => v - o[i]); const n = Math.hypot(...t); t = t.map(v => v / n);
  let up = [0, 1, 0];
  if (g.loop) { const th = s / LOOP_R; up = [-Math.sin(th), Math.cos(th), 0]; }   // towards the loop centre: the cart rides the inside
  return {p, t, up, inLoop: !!g.loop};
}
// Cart frame (pure): position on the rails and a basis (forward t, up, side) as a 4×4 column-major array.
export function coasterFrame(u, lift = .45) {
  const {p, t, up: u0} = coasterPoint(u), side = [t[1] * u0[2] - t[2] * u0[1], t[2] * u0[0] - t[0] * u0[2], t[0] * u0[1] - t[1] * u0[0]], sn = Math.hypot(...side) || 1, S = side.map(v => v / sn);
  const up = [S[1] * t[2] - S[2] * t[1], S[2] * t[0] - S[0] * t[2], S[0] * t[1] - S[1] * t[0]];
  const at = p.map((v, i) => v + up[i] * lift);
  return {at, forward: t, up, side: S, matrix: [S[0], S[1], S[2], 0, up[0], up[1], up[2], 0, t[0], t[1], t[2], 0, at[0], at[1], at[2], 1]};
}
class CoasterCurve extends T.Curve { constructor(off = 0, upOff = 0) { super(); this.off = off; this.upOff = upOff; }
  getPoint(u, v = new T.Vector3()) { const f = coasterFrame(u, this.upOff); return v.set(...f.at.map((x, i) => x + f.side[i] * this.off)); } }
export function coasterTrack({color = PARK.track} = {}) {
  const g = new T.Group(); g.name = 'coasterTrack'; const rail = pm(color, {rough: .35, metal: .3}), tie = pm('#5E646C', {rough: .6}), sup = pm('#9AA0A8', {rough: .45, metal: .4});
  const n = Math.round(COASTER_LEN * .8);
  for (const s of [-.6, .6]) g.add(mesh(new T.TubeGeometry(new CoasterCurve(s, 0), n, .16, 5, true), rail, [0, 0, 0], 'rail'));
  g.add(mesh(new T.TubeGeometry(new CoasterCurve(0, -.35), n, .2, 5, true), rail, [0, 0, 0], 'spine'));
  const tieG = new T.BoxGeometry(1.5, .12, .25), ties = [];
  for (let i = 0; i < Math.round(COASTER_LEN / 1.2); i++) { const f = coasterFrame(i * 1.2 / COASTER_LEN, -.18), m = new T.Matrix4().fromArray(f.matrix); ties.push(tieG.clone().applyMatrix4(m)); }
  g.add(mesh(mergeGeometries(ties), tie, [0, 0, 0], 'ties'));
  for (let i = 0; i < 40; i++) { const u = i / 40, {p, inLoop} = coasterPoint(u); if (p[1] > CR + .6 && !inLoop) g.add(beam([p[0], 0, p[2]], [p[0], p[1] - .5, p[2]], .3, sup, {round: true})); }
  for (const s of [-1, 1]) g.add(beam([LOOP_X + s * LOOP_R, 0, LOOP_DZ / 2 + (s < 0 ? .75 : -.75) * LOOP_DZ / 2], [LOOP_X + s * LOOP_R, CR + LOOP_R, LOOP_DZ / 2 + (s < 0 ? .75 : -.75) * LOOP_DZ / 2], .35, sup, {round: true}));   // loop side legs
  g.add(pbx(14, .35, 4, pm('#B9BDC2', {rough: .7}), [6, .17, 0], 'station'));
  g.userData.anchors = {station: [4, 0, 2.6], loop: [LOOP_X, 0, LOOP_DZ / 2], loopTop: [LOOP_X, CR + 2 * LOOP_R, LOOP_DZ / 2]}; return g;
}
export function coasterCart({pathT = 0, color = PARK.cart} = {}) {
  const g = new T.Group(); g.name = 'coasterCart'; const body = pm(color, {rough: .35}), seat = pm(PARK.seat, {rough: .7}), steel = pm('#C9CDD3', {rough: .3, metal: .6});
  const inner = new T.Group(); inner.name = 'cartBody'; g.add(inner);
  inner.add(pbx(2.3, .5, 3.4, body, [0, .35, 0], 'cartFloor'));
  for (const s of [-1, 1]) inner.add(pbx(.2, .9, 3.4, body, [s * 1.05, .9, 0], 'cartSide'));
  inner.add(pbx(2.3, 1.2, .3, body, [0, 1.05, 1.6], 'cartNose')); inner.add(pbx(2.3, .9, .2, body, [0, .9, -1.6], 'cartBack'));
  for (const s of [-.5, .5]) { inner.add(pbx(.9, .25, 1.1, seat, [s, .72, -.2], 'seat')); inner.add(pbx(.9, 1.1, .2, seat, [s, 1.25, -.8], 'seatBack')); }   // seats 2, side by side
  inner.add(beam([-1, 1.4, .6], [1, 1.4, .6], .14, steel, {round: true}));   // lap bar
  for (const sx of [-.6, .6]) for (const sz of [-1.1, 1.1]) inner.add(rot(pcy(.22, .22, .2, steel, [sx, .02, sz], 'wheel', 10), 'z', Math.PI / 2));
  const set = ({pathT: u = 0} = {}) => { const f = coasterFrame(u); g.matrixAutoUpdate = false; g.matrix.fromArray(f.matrix); g.matrixWorldNeedsUpdate = true; g.userData.pathT = u; };
  set({pathT}); g.userData.set = set; g.userData.keep = true; g.userData.seats = [[-.5, .85, -.2], [.5, .85, -.2]]; return g;
}

// boxingRing: raised 16 × 16 mat (#E8E2D6) on a dark apron 1.2 high, red corner posts, 3 white ropes per side, corner steps.
export function boxingRing({size = 16, h = 1.2} = {}) {
  const g = new T.Group(); g.name = 'boxingRing'; const hs = size / 2, post = pm(PARK.post, {rough: .4}), rope = pm(PARK.rope, {rough: .5}), pad = pm('#B8282B', {rough: .6});
  g.add(pbx(size + .4, h - .1, size + .4, pm(PARK.apron, {rough: .8}), [0, (h - .1) / 2, 0], 'apron'));
  g.add(pbx(size + .8, .2, size + .8, pm(PARK.mat, {rough: .9}), [0, h, 0], 'ringMat'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.add(pcy(.28, .28, 3.6, post, [sx * hs, h + 1.8, sz * hs], 'cornerPost', 12)); g.add(pbx(.7, 2.6, .7, pad, [sx * (hs - .35), h + 1.6, sz * (hs - .35)], 'cornerPad')); }
  for (const y of [1.0, 1.9, 2.8]) for (const [a, b] of [[[-hs, -hs], [hs, -hs]], [[hs, -hs], [hs, hs]], [[hs, hs], [-hs, hs]], [[-hs, hs], [-hs, -hs]]]) g.add(beam([a[0], h + y, a[1]], [b[0], h + y, b[1]], .14, rope, {round: true}));
  for (let s = 0; s < 3; s++) g.add(pbx(2.2, .4 * (s + 1), .8, pm(PARK.apron, {rough: .8}), [hs - 2, .2 * (s + 1), hs + 1.6 - s * .8], 'ringStep'));
  g.userData.anchors = {centre: [0, h + .1, 0], corner: [hs - 1.4, h + .1, hs - 1.4]}; g.userData.top = h + .1; return g;
}

// pool: two pools, white rim 0.5 high (rim top y 0.5), blue water 0.1 under the rim top, floor 0.4 under the water.
export function pool({pools = [[14, 9, 0, 0], [9, 9, 0, 13]], rimW = .8} = {}) {
  const g = new T.Group(); g.name = 'pool'; const rim = pm(PARK.rim, {rough: .7}), floor = pm('#8FD0F0', {rough: .8}), water = pm(PARK.water, {rough: .08, opacity: .82});
  for (const [w, d, x, z] of pools) {
    for (const [sx, sz, ww, dd] of [[0, -1, w + 2 * rimW, rimW], [0, 1, w + 2 * rimW, rimW], [-1, 0, rimW, d], [1, 0, rimW, d]]) g.add(pbx(ww, .5, dd, rim, [x + sx * (w + rimW) / 2, .25, z + sz * (d + rimW) / 2], 'poolRim'));
    g.add(pbx(w, .02, d, floor, [x, .01, z], 'poolFloor', false));
    const wm = mesh(new T.PlaneGeometry(w, d), water, [x, .4, z], 'poolWater', false); wm.rotation.x = -Math.PI / 2; wm.userData.live = true; g.add(wm);
  }
  g.userData.waterY = .4; g.userData.depth = .4; return g;
}

// crates (stacked pyramid, plank frames), redBarrels (cluster, rings), benches (row of park benches).
function crate(m, mk, s = 2) { const c = new T.Group(); c.add(pbx(s, s, s, m, [0, s / 2, 0], 'crate')); for (const y of [.08, s - .08]) for (const [w, d, x, z] of [[s + .04, .16, 0, s / 2], [s + .04, .16, 0, -s / 2], [.16, s + .04, s / 2, 0], [.16, s + .04, -s / 2, 0]]) c.add(pbx(w, .16, d, mk, [x, y, z], 'crateTrim'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(pbx(.16, s, .16, mk, [sx * s / 2, s / 2, sz * s / 2], 'crateEdge')); return c; }
export function crates({rows = [4, 3, 1], s = 2, seed = 3} = {}) {
  const g = new T.Group(); g.name = 'crates'; const r = rnd(seed), m = pm(PARK.crate, {rough: .85}), mk = pm(PARK.crateDk, {rough: .85});
  rows.forEach((n, k) => { for (let i = 0; i < n; i++) { const c = crate(m, mk, s); c.position.set((i - (n - 1) / 2) * (s + .05) + (r() - .5) * .2, k * s, (r() - .5) * .3); c.rotation.y = (r() - .5) * .25; g.add(c); } });
  return mergeParts(g);
}
export function redBarrels({n = 7, seed = 5} = {}) {
  const g = new T.Group(); g.name = 'redBarrels'; const r = rnd(seed), m = pm(PARK.barrel, {rough: .45}), ring = pm(PARK.barrelRing, {rough: .4, metal: .3});
  for (let i = 0; i < n; i++) { const a = i * 2.4 + r(), d = i ? 1.2 + Math.floor((i - 1) / 6) * 1.2 + r() * .3 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d;
    g.add(pcy(.6, .6, 1.8, m, [x, .9, z], 'barrel', 14)); for (const y of [.35, 1.45]) g.add(pcy(.63, .63, .12, ring, [x, y, z], 'barrelRing', 14)); g.add(pcy(.5, .5, .02, ring, [x, 1.81, z], 'barrelLid', 14)); }
  return mergeParts(g);
}
export function benches({n = 3, step = 5} = {}) {
  const g = new T.Group(); g.name = 'benches'; const wood = pm(PARK.bench, {rough: .8}), leg = pm(PARK.benchLeg, {rough: .5, metal: .3});
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * step;
    for (let k = 0; k < 3; k++) g.add(pbx(3.6, .12, .36, wood, [x, .95, -.45 + k * .42], 'benchSlat'));
    for (let k = 0; k < 2; k++) g.add(rot(pbx(3.6, .34, .1, wood, [x, 1.35 + k * .42, -.68], 'benchBack'), 'x', -.12));
    for (const s of [-1.5, 1.5]) { g.add(pbx(.14, .95, 1.2, leg, [x + s, .47, -.05], 'benchLeg')); g.add(pbx(.14, 1.1, .14, leg, [x + s, 1.4, -.7], 'benchLeg')); } }
  return mergeParts(g);
}

// watchTower: beige stone blocks (three tones, staggered courses), 6 × 6 × 15, a door, a window band and crenellations.
export function watchTower({w = 6, h = 15, seed = 7} = {}) {
  const g = new T.Group(); g.name = 'watchTower'; const r = rnd(seed), ms = [pm(PARK.stone, {rough: .9}), pm(PARK.stoneDk, {rough: .9}), pm(PARK.stoneLt, {rough: .9})], dark = pm('#4A4038', {rough: .9});
  const bh = 1, hw = w / 2;
  for (let c = 0; c < h / bh; c++) { const y = c * bh + bh / 2, off = c % 2 ? .75 : 0;
    for (const side of [0, 1, 2, 3]) for (let x = -hw + off; x < hw - .01; x += 1.5) { const len = Math.min(1.5, hw - x), m = ms[Math.floor(r() * 3)];
      const at = side === 0 ? [x + len / 2, y, hw - .3] : side === 1 ? [x + len / 2, y, -hw + .3] : side === 2 ? [hw - .3, y, x + len / 2] : [-hw + .3, y, x + len / 2];
      const b = side < 2 ? pbx(len - .06, bh - .06, .6, m, at, 'stone') : pbx(.6, bh - .06, len - .06, m, at, 'stone'); g.add(b); } }
  g.add(pbx(w - 1.2, h, w - 1.2, ms[1], [0, h / 2, 0], 'core', false));
  g.add(pbx(2, 3.2, .1, dark, [0, 1.6, hw + .01], 'door', false));
  for (const x of [-1.5, 1.5]) g.add(pbx(.8, 1.4, .1, dark, [x, h - 4, hw + .01], 'window', false));
  g.add(pbx(w + 1, .6, w + 1, ms[2], [0, h + .3, 0], 'cap'));
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const k = -hw + .5 + i * (w - 1) / 3; g.add(pbx(.9, 1, .9, ms[i % 3], [k, h + 1.1, s * hw], 'merlon')); g.add(pbx(.9, 1, .9, ms[(i + 1) % 3], [s * hw, h + 1.1, k], 'merlon')); }
  return mergeParts(g);
}

// spawnPad: a big round white disc (r 6, 0.3 high), an inset cyan ring that glows; flash 0..1 brightens the ring and
// raises a soft light column (additive, no shadow).
export function spawnPad({r = 6, flash = 0} = {}) {
  const g = new T.Group(); g.name = 'spawnPad'; g.add(pcy(r, r + .15, .3, pm(PARK.pad, {rough: .55}), [0, .15, 0], 'padDisc', 48));
  const glowM = new T.MeshBasicMaterial({color: PARK.glow, toneMapped: false}), colM = new T.MeshBasicMaterial({color: PARK.glow, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false});
  const ring = mesh(new T.RingGeometry(r - 1, r - .45, 64), glowM, [0, .31, 0], 'padRing', false); ring.rotation.x = -Math.PI / 2; ring.userData.live = true; g.add(ring);
  g.add(pcy(r - 1.6, r - 1.6, .02, pm('#E4E8EA', {rough: .6}), [0, .31, 0], 'padCentre', 48, false));
  const col = mesh(new T.CylinderGeometry(r - .7, r - .7, 9, 48, 1, true), colM, [0, 4.8, 0], 'padColumn', false); col.userData.live = true; col.visible = false; g.add(col);
  const base = new T.Color(PARK.glow), hot = new T.Color('#E8FFFF');
  const set = ({flash: f = 0} = {}) => { glowM.color.copy(base).lerp(hot, f); col.visible = f > .01; colM.opacity = .35 * f; };
  set({flash}); g.userData.set = set; g.userData.keep = true; g.userData.anchors = {centre: [0, .3, 0]}; g.userData.top = .3; return g;
}

// wallSign: a 14 × 3 plaza wall (0.6 thick on a 0.4 plinth) painted with text, bold sans #2B2D33 on #F2F2EE (canvas
// texture, two lines when they read bigger). signLayout is pure: the font size (px) that fits the lines in the panel.
export const SIGN_TEXT = 'DUMMIES HELP EACH OTHER';
export function signLayout(text = SIGN_TEXT, {W = 2048, H = 440, pad = .06, charW = .64, lineH = 1.08} = {}) {
  const words = text.split(' '), one = [text], two = [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')];
  const fit = lines => Math.min(W * (1 - 2 * pad) / (Math.max(...lines.map(l => l.length)) * charW), H * (1 - 2 * pad) / (lines.length * lineH));
  const a = fit(one), b = fit(two); return b > a * 1.1 ? {lines: two, px: Math.floor(b)} : {lines: one, px: Math.floor(a)};
}
export function wallSign({text = SIGN_TEXT, w = 14, h = 3, base = .4, ink = PARK.signInk, paper = PARK.signPaper} = {}) {   // base: height of the panel's bottom edge (a tall wall reads over a ring's ropes)
  const g = new T.Group(); g.name = 'wallSign'; const wall = pm('#E4E4DF', {rough: .85}), plinth = pm('#B9B9B4', {rough: .9});
  g.add(pbx(w + .6, .4, 1, plinth, [0, .2, 0], 'signPlinth')); g.add(pbx(w, base + h - .4, .6, wall, [0, .4 + (base + h - .4) / 2, 0], 'signWall')); g.add(pbx(w + .3, .2, .8, plinth, [0, base + h + .1, 0], 'signCap'));
  let face;
  if (canvasOk()) { const W = 2048, H = Math.round(W * (h - .3) / (w - .3)), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), L = signLayout(text, {W, H});
    x.fillStyle = paper; x.fillRect(0, 0, W, H); x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 ${L.px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    L.lines.forEach((l, i) => { x.fillText(l, W / 2, H / 2 + (i - (L.lines.length - 1) / 2) * L.px * 1.08, W * .92); });
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;
    face = new T.MeshStandardMaterial({map: tex, roughness: .9, envMap: ENV.map, envMapIntensity: ENV.intensity * .5}); }
  else face = pm(paper, {rough: .9});
  const sf = mesh(new T.PlaneGeometry(w - .3, h - .3), face, [0, base + h / 2, .31], 'signFace', false); sf.userData.keep = true; g.add(sf);   // kept out of district merges: gates find it by name
  g.userData.text = text; g.userData.anchors = {front: [0, 0, 3]}; return g;
}

// giantHand (E1b): a puffy cartoon white glove (#FFFFFF), 14 studs from the cuff band to the middle fingertip. Hand space:
// wrist at the origin, fingers along +z, palm facing −y (back +y), thumb on the −x side. A rounded palm, four thick rounded
// fingers (two capsules each) and a clear thumb, three dark stitch lines on the back, a SHORT cuff band (0.15 of the length)
// and a soft ink outline (#2B2D33 back-face shell pushed out along the normals). The rig is pure: handRig(pose, grip) →
// per digit [{from, to, r}] segments; pinch = the thumb tip IK-solved to `pinchGap(grip)` studs from the index tip.
export const HAND_POSES = ['open', 'pinch', 'fist', 'point'];
export const HAND_LEN = 14, HAND = {cuff: .15 * 14, palm: {w: 6.6, h: 3, d: 6.6, r: 1.45}, knuckleZ: 5.6, fingerR: .85, thumbR: .95,
  fingers: {index: [-2.4, 2.85, 2.4], middle: [-.8, 3.2, 2.55], ring: [.8, 3.0, 2.4], pinky: [2.4, 2.5, 2.0]},   // x, proximal, distal
  thumb: {base: [-2.9, -.7, 2.0], a: 3.0, b: 2.6}};
const CURL6 = {open: {index: [0, 0], middle: [0, 0], ring: [0, 0], pinky: [0, 0]}, pinch: {index: [1.0, 1.1], middle: [1.35, 1.5], ring: [1.45, 1.55], pinky: [1.5, 1.6]},
  fist: {index: [1.55, 1.75], middle: [1.55, 1.75], ring: [1.55, 1.75], pinky: [1.55, 1.75]}, point: {index: [0, 0], middle: [1.55, 1.75], ring: [1.55, 1.75], pinky: [1.55, 1.75]}};
const SPREAD = {index: -.2, middle: -.07, ring: .07, pinky: .2};
export const pinchGap = grip => 2.4 * (1 - Math.max(0, Math.min(1, grip)));   // studs between the thumb and index surfaces
// handCurl (kept for callers): per finger [knuckle, middle] curl, grip 0..1 blends open → pose.
export function handCurl(pose = 'open', grip = 1) {
  const P = CURL6[pose] ?? CURL6.open, k = Math.max(0, Math.min(1, grip)), out = {};
  for (const d of Object.keys(P)) out[d] = P[d].map(a => a * k);
  return out;
}
const v3 = {add: (a, b) => a.map((x, i) => x + b[i]), sub: (a, b) => a.map((x, i) => x - b[i]), mul: (a, k) => a.map(x => x * k), len: a => Math.hypot(...a),
  norm: a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); }, cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]};
const rotAxis = (v, ax, a) => { const c = Math.cos(a), s = Math.sin(a), k = v3.norm(ax); return v3.add(v3.add(v3.mul(v, c), v3.mul(v3.cross(k, v), s)), v3.mul(k, v3.dot(k, v) * (1 - c))); };
// finger chain: yaw (spread, about y) then curl about the finger's x (tip toward −y, the palm)
function fingerSegs(x, L0, L1, [c0, c1], yaw) {
  const K = [x, 0, HAND.knuckleZ], dir0 = [Math.sin(yaw) * Math.cos(c0), -Math.sin(c0), Math.cos(yaw) * Math.cos(c0)], dir1 = [Math.sin(yaw) * Math.cos(c0 + c1), -Math.sin(c0 + c1), Math.cos(yaw) * Math.cos(c0 + c1)];
  const M = v3.add(K, v3.mul(dir0, L0)), tip = v3.add(M, v3.mul(dir1, L1));
  return [{from: K, to: M, r: HAND.fingerR}, {from: M, to: tip, r: HAND.fingerR * .97}];
}
// two-bone IK (pure): base B → target P with lengths a, b, bending toward `hint`
function ik2(B, P, a, b, hint) {
  const d0 = v3.sub(P, B), d = Math.min(v3.len(d0), a + b - 1e-6), dir = v3.norm(d0), n = v3.norm(v3.cross(dir, hint));
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))), u = rotAxis(dir, n, al), M = v3.add(B, v3.mul(u, a));
  return [M, v3.add(M, v3.mul(v3.norm(v3.sub(v3.add(B, v3.mul(dir, d)), M)), b))];
}
export function handRig(pose = 'open', grip = 1) {
  const c = handCurl(pose, grip), F = HAND.fingers, open = pose === 'open', k = Math.max(0, Math.min(1, grip)), out = {};
  for (const [d, [x, L0, L1]] of Object.entries(F)) out[d] = fingerSegs(x, L0, L1, c[d], open ? SPREAD[d] * k : SPREAD[d] * .25);
  const B = HAND.thumb.base, {a, b} = HAND.thumb, rr = HAND.fingerR + HAND.thumbR;
  let target;
  if (pose === 'pinch') { const it = out.index[1].to, away = v3.norm(v3.sub(B, it)); target = v3.add(it, v3.mul(away, rr + pinchGap(grip))); }
  else if (pose === 'fist' || pose === 'point') target = v3.add([-1.2, -2.6, 5.4], v3.mul([-1.8, 1.2, -2.6], 1 - k));   // across the curled fingers
  else target = v3.add(B, v3.mul(v3.norm([-.75 - .25 * k, -.15, .65]), a + b - .2));   // open: out to the side
  const [M, tip] = ik2(B, target, a, b, [0, -1, -.3]);
  out.thumb = [{from: B, to: M, r: HAND.thumbR}, {from: M, to: tip, r: HAND.thumbR * .95}];
  return out;
}
// pinch gap (pure, studs): thumb-tip surface to index-tip surface.
export const handGap = (pose, grip) => { const R = handRig(pose, grip); return v3.len(v3.sub(R.thumb[1].to, R.index[1].to)) - R.thumb[1].r - R.index[1].r; };
const INK = '#2B2D33', inkMats = new Map();
function inkShell(w) {   // back faces pushed out along the normals: a soft outline that follows the puffy shapes
  if (inkMats.has(w)) return inkMats.get(w);
  const m = new T.MeshBasicMaterial({color: INK, side: T.BackSide}); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = vec3(position) + normal * ${w.toFixed(3)};`); };
  m.customProgramCacheKey = () => 'ink' + w; inkMats.set(w, m); return m;
}
function withInk(m, w = .13) { const sh = new T.Mesh(m.geometry, inkShell(w)); sh.name = m.name + 'Ink'; sh.castShadow = false; m.add(sh); return m; }
export function giantHand({pose = 'open', grip = 1, ink = .13} = {}) {
  const g = new T.Group(); g.name = 'giantHand'; const glove = pm('#FFFFFF', {rough: .7}), stitch = pm(INK, {rough: .8}), P = HAND.palm;
  const cuff = mesh(new T.CylinderGeometry(3.05, 3.05, HAND.cuff, 20), pm('#F4F4F6', {rough: .75}), [0, 0, -HAND.cuff / 2 + .2], 'cuffBand'); cuff.rotation.x = Math.PI / 2; cuff.scale.set(1, 1, .62); g.add(withInk(cuff, ink));
  const palm = mesh(new RoundedBoxGeometry(P.w, P.h, P.d, 3, P.r), glove, [0, 0, P.d / 2 - .1], 'palm'); g.add(withInk(palm, ink));
  for (const x of [-1.3, 0, 1.3]) g.add(pbx(.16, .06, 3.2, stitch, [x, P.h / 2 + .02, 3.1], 'stitch', false));   // three stitch lines on the back
  const segs = {}; const rig0 = handRig(pose, grip);
  for (const [d, list] of Object.entries(rig0)) segs[d] = list.map((sgm, i) => { const L = v3.len(v3.sub(sgm.to, sgm.from)), m = mesh(new T.CapsuleGeometry(sgm.r, L, 4, 10), glove, [0, 0, 0], d + (i ? 'B' : 'A'), false); g.add(withInk(m, ink)); return m; });   // fingers cast no shadow (the palm + cuff shadow carries the hand; 10 fewer shadow draws)
  const Y = new T.Vector3(0, 1, 0), q = new T.Vector3();
  const set = ({pose: p = 'open', grip: k = 1} = {}) => { const R = handRig(p, k);
    for (const [d, list] of Object.entries(R)) list.forEach((sgm, i) => { const m = segs[d][i]; m.position.set(...v3.mul(v3.add(sgm.from, sgm.to), .5)); m.quaternion.setFromUnitVectors(Y, q.set(...v3.norm(v3.sub(sgm.to, sgm.from)))); });
    g.userData.pose = p; g.userData.grip = k; };
  set({pose, grip}); g.userData.set = set; g.userData.keep = true; g.userData.length = HAND_LEN; return g;
}

// healButton: a big round green button (#3CC46A) on a dark rounded pad, a white cross on top. press 0..1 sinks it.
export function healButton({press = 0} = {}) {
  const g = new T.Group(); g.name = 'healButton'; g.add(pcy(2.3, 2.5, .5, pm(PARK.healPad, {rough: .6}), [0, .25, 0], 'healPad', 32));
  const cap = new T.Group(); cap.name = 'healCap'; g.add(cap); const white = pm('#FFFFFF', {rough: .5});
  cap.add(pcy(1.6, 1.7, .7, pm(PARK.heal, {rough: .35}), [0, .85, 0], 'healTop', 32));
  cap.add(pbx(1.9, .08, .6, white, [0, 1.24, 0], 'healCross', false)); cap.add(pbx(.6, .08, 1.9, white, [0, 1.24, 0], 'healCross', false));
  const set = ({press: p = 0} = {}) => { cap.position.y = -.4 * Math.max(0, Math.min(1, p)); };
  set({press}); g.userData.set = set; g.userData.keep = true; return g;
}

// nameTag: floating billboard text (white bold on a dark rounded backing at 60 %), a Sprite so it always faces the
// camera; height in studs, sits `lift` above its parent's origin. Not for Season 1 (no labels).
export function nameTag({text = 'Name', height = .7, lift = 6.2} = {}) {
  const g = new T.Group(); g.name = 'nameTag'; if (!canvasOk()) return g;
  const H = 128, c = document.createElement('canvas'), x = c.getContext('2d'); x.font = `800 ${H * .58}px "Helvetica Neue", Arial, sans-serif`;
  const W = Math.ceil(x.measureText(text).width + H * .7); c.width = W; c.height = H; x.font = `800 ${H * .58}px "Helvetica Neue", Arial, sans-serif`;
  x.fillStyle = 'rgba(20,22,28,.6)'; rrect(x, 0, 0, W, H, H * .32); x.fill(); x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H * .54);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false})); s.scale.set(height * W / H, height, 1); s.position.y = lift; s.renderOrder = 5; s.name = 'nameTagSprite'; g.add(s);
  g.userData.text = text; return g;
}

export const PROPS6 = {giantFan, launchTower, coasterTrack, coasterCart, boxingRing, pool, crates, redBarrels, benches, watchTower, spawnPad, wallSign, giantHand, healButton, nameTag};
export const PROP6_NAMES = Object.keys(PROPS6);
