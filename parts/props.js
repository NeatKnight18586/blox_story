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
