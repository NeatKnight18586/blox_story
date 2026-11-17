// parts/sets4/toyhouse.js — the Toy House hall (format v5; Phase 3b-R scale + look rework). A reusable location (V4 D4):
// 150 × 210 (x ∈ [−75, 75], z ∈ [−175, 35]; the street side is the front wall z = +35), ceiling 36 (a down-facing plane: the
// top-down camera sees straight through it), three levels: the floor, mezzanine terraces at 12 and 24 with railings and stairs.
// Layout (top-down, front at the bottom): counter + shutter (front centre) · candy zone (front left) · trampoline (front right) ·
// gadget wall + HYPERBOX 9 (left) · foam-blaster arena (left) · ball pit (right) · go-kart track (right) · aisles of 14-tall
// gondolas (centre, full detail) · far half: low-LOD gondola rows around a giant plush mountain · a toy-train loop at 12.5 ·
// a ceiling rollercoaster (its bulbs are the `lightsCascade` practicals) · cool fluorescent strips + warm practicals (baked).
// Look (data: engine/looks4.json toy.v4.materials): environment colours muted (S ≤ .45, L .35–.75), story props saturated
// (S ≥ .60: HYPERBOX 9, key, clock, karts, blasters, chocolate fountain); everything near an anchor camera is bevelled.
// world.setState(k, v): shutter 0..1, clock (minutes after midnight). Statics are merged per district and baked (engine/bake.js).
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HALL, TOY, textPlate, tube, rnd, mergeByMaterial, triCount, setBevel} from './common.js';
import {toyProp} from './props4.js';
import {bevelBoxGeometry, roundCylGeometry, boxDist, classMat, envColor, storyColor, contactDecals, bevelCensus, envCensus, applyHierarchy, BEVEL, CLASSES5} from './look5.js';
import {buildShelves, MODULE} from './shelves.js';
import {cellUV, boxArtTexture, loadBoxArt} from './boxart.js';
export const preload = base => loadBoxArt(base);   // episode.js awaits a world's preload(base) before build (opt-in)

const {x: X, z0: Z0, z1: Z1, h: H, l2: L2, l3: L3} = HALL;
export const ZONES = {   // top-down footprints [x0, z0, x1, z1]
  counter: [-10, 22, 10, 33], candy: [-66, 4, -40, 32], tramp: [48, 12, 64, 32], gadget: [-75, -42, -60, -12], arena: [-62, -77, -44, -51], pit: [44, -28, 59, -13],
  track: [37, -76, 67, -40], aisles: [-32, -66, 32, -10], mountain: [-24, -134, 24, -90], far: [-56, -144, 56, -80], mezz: [-75, -175, 75, -156],
};
export const TRACK = {c: [52, -58], a: 11, b: 14, width: 5};
export const TRAIN = {x: 48, zf: -2, zb: -150, r: 12, y: 12.5};
export const MOUNTAIN = {c: [0, -112], r: 22, h: 26};
const railPts = () => { const P = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = 1 + .06 * Math.sin(a * 3); P.push([Math.sin(a) * 58 * r, 29.5 + 2.4 * Math.sin(a * 2 + .6) + (i % 5 === 0 ? 1.2 : 0), Math.cos(a) * 52 * r - 32]); } return P; };
export const railCurve = () => new T.CatmullRomCurve3(railPts().map(p => new T.Vector3(...p)), true);
// 24 evenly spaced bulbs along the coaster rail across the whole front half: the `lightsCascade` points (parts/sets4/anchors.json)
export const PRACTICALS = (() => { const c = railCurve(); return Array.from({length: 24}, (_, i) => c.getPointAt(i / 24).toArray().map((v, k) => +(k === 1 ? v - .6 : v).toFixed(2))); })();
export const trackPoint = (u, off = 0) => { const a = u * Math.PI * 2, x = TRACK.c[0] + Math.sin(a) * (TRACK.a + off), z = TRACK.c[1] + Math.cos(a) * (TRACK.b + off); return [x, z, a]; };
// The train loop: a rounded rectangle at TRAIN.y (pure). u ∈ [0, 1) → [x, z, yaw]
export function trainPoint(u) {
  const {x, zf, zb, r} = TRAIN, sx = 2 * (x - r), sz = (zf - zb) - 2 * r, arc = Math.PI * r / 2, L = 2 * sx + 2 * sz + 4 * arc; let d = ((u % 1 + 1) % 1) * L;
  const segs = [['l', sx, [-x + r, zf], [1, 0]], ['a', arc, [x - r, zf - r], 0], ['l', sz, [x, zf - r], [0, -1]], ['a', arc, [x - r, zb + r], 1], ['l', sx, [x - r, zb], [-1, 0]], ['a', arc, [-x + r, zb + r], 2], ['l', sz, [-x, zb + r], [0, 1]], ['a', arc, [-x + r, zf - r], 3]];
  for (const [k, len, p, dir] of segs) { if (d > len) { d -= len; continue; }
    if (k === 'l') return [p[0] + dir[0] * d, p[1] + dir[1] * d, Math.atan2(dir[0], dir[1])];
    const a0 = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][dir], a = a0 - d / r; return [p[0] + Math.sin(a) * r, p[1] + Math.cos(a) * r, Math.atan2(Math.cos(a), -Math.sin(a))]; }
  return [-x + r, zf, Math.PI / 2];
}
export const TRAIN_LENGTH = (() => { const {x, zf, zb, r} = TRAIN; return 2 * 2 * (x - r) + 2 * ((zf - zb) - 2 * r) + 2 * Math.PI * r; })();

// Floor height (pure): trampoline bed, ball pit, mezzanine terraces (12, 24) and the two stairs on the right wall.
export function groundY(x, z) {
  if (z < -166) return L3;
  if (x > 66 && z <= -128 && z >= -166) return L3;
  if (x > 66 && z < -104 && z > -128) return L2 + (L3 - L2) * (-104 - z) / 24;   // stair 12 → 24
  if (x > 66 && z <= -70 && z >= -94) return L2 * (-70 - z) / 24;               // stair 0 → 12
  if (z < -156 || (x < -65 && z < -45) || (x > 58 && z < -94)) return L2;
  if (Math.hypot(x - 56, z - 22) < 4.4) return 1.05;
  if (x > 44.6 && x < 58.4 && z > -27.4 && z < -13.6) return .8;
  return 0;
}
const A = (at, cam, tgt, fov, top) => ({at, camera: {position: cam, target: tgt, fov}, top: {position: top[0], target: top[1], fov: top[2] ?? 45}});
export const ANCHORS = {   // camera = eye level, top = a top-down camera over the zone
  hall: A([0, 0, 10], [0, 18, 32], [0, 8, -70], 60, [[0, 300, -70], [0, 0, -70], 50]),
  aisle: A([0, 0, -20], [1.5, 4.6, -5], [0, 6, -90], 50, [[0, 70, -38], [0, 0, -38]]),
  scale: A([0, 0, -2], [-7, 2.4, 9], [3, 11, -60], 66, [[0, 140, -40], [0, 0, -40], 55]),
  counter: A([0, 0, 28], [-4.5, 5.5, 15], [0, 4.6, 31], 42, [[0, 40, 28], [0, 0, 28]]),
  shutter: A([0, 5, 35], [0, 5, 15], [0, 5.5, 35], 52, [[0, 40, 30], [0, 0, 30]]),
  candy: A([-52, 0, 19], [-36, 8, 6], [-52, 3, 19], 56, [[-53, 50, 18], [-53, 0, 18]]),
  tramp: A([56, 0, 22], [43, 8, 11], [56, 2, 22], 52, [[56, 40, 22], [56, 0, 22]]),
  pit: A([51.5, 0, -20.5], [60, 7.5, -1], [51.5, 1, -20.5], 52, [[51.5, 40, -20.5], [51.5, 0, -20.5]]),
  track: A([52, 0, -58], [68, 9, -36], [52, 1, -58], 58, [[52, 56, -58], [52, 0, -58]]),
  arena: A([-53, 0, -64], [-57, 9, -36], [-53, 2, -64], 56, [[-53, 52, -64], [-53, 0, -64]]),
  gadget: A([-70, 0, -27], [-52.5, 6.5, -6], [-66, 4, -27], 52, [[-66, 40, -27], [-66, 0, -27]]),
  hyperbox: A([-66, 2, -27], [-56, 4.2, -20], [-66, 2.4, -27], 36, [[-66, 24, -27], [-66, 0, -27], 40]),
  mezz: A([0, L2, -160], [0, 8, -120], [0, 15, -165], 56, [[0, 70, -162], [0, L2, -162]]),
  overlook: A([-10, L3, -170], [-10, 29, -168], [0, 3, -40], 58, [[0, 90, -150], [0, L2, -150]]),
  mountain: A([0, 0, -112], [18, 6, -72], [0, 12, -112], 56, [[0, 80, -112], [0, 0, -112]]),
  train: A([0, TRAIN.y, -2], [-14, 8, 12], [0, 13, -2], 50, [[0, 60, -2], [0, 0, -2]]),
  coaster: A([0, 29, -30], [0, 6, 30], [0, 26, -30], 62, [[0, 160, -30], [0, 0, -30], 50]),
};
export const ANCHOR_CAMS = Object.values(ANCHORS).flatMap(a => [a.camera.position, a.top.position]);
const NEAR = 20, LOD_DIST = 45;   // census range (bevel) · swap to the coarse twin beyond this distance from a cell's bounds
export const isNear = (min, max, cams = ANCHOR_CAMS, r = NEAR) => cams.some(c => boxDist(c, min, max) <= r);

export function build(scene, {M4, look4, spec, front = true} = {}) {   // front: false = the street module supplies the front wall (composite world)
  const CL = look4?.preset?.v4?.materials ?? CLASSES5, art = boxArtTexture();
  const mat = (cls, color, o = {}) => classMat(M4, CL, cls, color, o), story = (color, o = {}) => classMat(M4, CL, 'plastic', color, {...o, story: true});
  const g = new T.Group(); g.name = 'toyhouse'; const live = new T.Group(); live.name = 'toyhouse_live'; live.userData.live = true; const rand = rnd(7);
  // districts: merged per (name, 50 × 50 cell). A cell with a coarse twin (sharp, untessellated) swaps to it when the camera is
  // more than LOD_DIST away (world.onCamera); a district without `at` is one always-visible group.
  const districts = {}, cellOf = at => at ? Math.floor((at[0] + X) / 50) + ':' + Math.floor((at[2] - Z0) / 50) : '*';
  const D = (name, at, coarse = false) => { const k = name + '@' + cellOf(at) + (coarse ? '#c' : ''); if (!districts[k]) { const d = new T.Group(); d.name = 'district_' + k; if (coarse) d.userData.coarse = true; g.add(d); districts[k] = d; } return districts[k]; };
  // primitives: bevelled when the bounding box is within 20 of any anchor camera (top cameras included), sharp otherwise
  const bx = (dist, w, h, d, m, at, o = {}) => { const e = o.rot ? Math.max(w, h, d) / 2 : 0, hw = [e || w / 2, e || h / 2, e || d / 2], near = isNear(at.map((v, k) => v - hw[k]), at.map((v, k) => v + hw[k]));
    const cell = o.cell ?? 3, geo = near || o.uvRects ? bevelBoxGeometry(w, h, d, near ? BEVEL : 0, cell, {uvRects: o.uvRects ?? null, skip: o.skip ?? []}) : new T.BoxGeometry(w, h, d, Math.max(1, Math.ceil(w / cell)), Math.max(1, Math.ceil(h / cell)), Math.max(1, Math.ceil(d / cell)));
    const M0 = typeof m === 'string' ? mat('plastic', m) : m, mesh = new T.Mesh(geo, M0); mesh.position.set(...at); if (o.rot) mesh.rotation.set(...o.rot); if (o.name) mesh.name = o.name; (o.parent ?? D(dist, at)).add(mesh);
    if (!o.parent && o.top !== false) { const cg = o.uvRects ? bevelBoxGeometry(w, h, d, 0, 1e3, {uvRects: o.uvRects}) : new T.BoxGeometry(w, h, d, Math.max(1, Math.ceil(w / 12)), Math.max(1, Math.ceil(h / 12)), Math.max(1, Math.ceil(d / 12))), c = new T.Mesh(cg, M0); c.position.copy(mesh.position); c.rotation.copy(mesh.rotation); D(dist, at, true).add(c); }
    return mesh; };
  const cl = (dist, r, h, m, at, o = {}) => { const rr = Math.max(r, o.rTop ?? r), near = isNear([at[0] - rr, at[1] - h / 2, at[2] - rr], [at[0] + rr, at[1] + h / 2, at[2] + rr]), seg = o.seg ?? 14, cell = o.cell ?? 3;
    const geo = near ? roundCylGeometry(r, h, BEVEL, seg, cell, o.rTop ?? r) : new T.CylinderGeometry(o.rTop ?? r, r, h, seg, Math.max(1, Math.ceil(h / cell)));
    const M0 = typeof m === 'string' ? mat('plastic', m) : m, mesh = new T.Mesh(geo, M0); mesh.position.set(...at); if (o.name) mesh.name = o.name; (o.parent ?? D(dist, at)).add(mesh);
    if (!o.parent && o.top !== false) { const c = new T.Mesh(new T.CylinderGeometry(o.rTop ?? r, r, h, Math.min(8, seg), 1), M0); c.position.copy(mesh.position); D(dist, at, true).add(c); }
    return mesh; };
  const prop = (dist, name, seed, at, o = {}) => { const p0 = setBevel(BEVEL); const p = toyProp(name, seed); setBevel(p0); p.position.set(...at); if (o.rot) p.rotation.set(...o.rot); if (o.scale) p.scale.setScalar(o.scale); if (o.name) p.name = o.name;
    if (o.story) p.userData.story = true; (o.parent ?? D(dist, at)).add(p); return p; };
  const contact = [];
  const floorM = mat('floor', '#efe2cf', {repeat: [18, 26]}), wallM = mat('plaster', '#e9dccb', {repeat: [18, 5]}), band = mat('plastic', '#8fa3b8'), trim = mat('plastic', '#c98f7a');
  // ---- shell: floor, ceiling (faces down), walls, colour bands, trusses, banners ------------------------------------------------
  { const f = new T.PlaneGeometry(2 * X, Z1 - Z0, 30, 42); f.rotateX(-Math.PI / 2); const fl = new T.Mesh(f, floorM); fl.position.set(0, 0, (Z0 + Z1) / 2); fl.name = 'floor'; D('shell').add(fl);
    const c = new T.PlaneGeometry(2 * X, Z1 - Z0, 6, 8); c.rotateX(Math.PI / 2); const ce = new T.Mesh(c, mat('plaster', '#d8d4cc', {repeat: [10, 14]})); ce.position.set(0, H, (Z0 + Z1) / 2); ce.name = 'ceiling'; D('shell').add(ce); }
  const zc = (Z0 + Z1) / 2, dz = Z1 - Z0;
  bx('shell', .8, H, dz, wallM, [-X - .4, H / 2, zc], {cell: 8}); bx('shell', .8, H, dz, wallM, [X + .4, H / 2, zc], {cell: 8}); bx('shell', 2 * X + 1.6, H, .8, wallM, [0, H / 2, Z0 - .4], {cell: 8});
  if (front) { bx('shell', X - 9, H, .8, wallM, [-(X + 9) / 2, H / 2, Z1 + .4], {cell: 8}); bx('shell', X - 9, H, .8, wallM, [(X + 9) / 2, H / 2, Z1 + .4], {cell: 8}); bx('shell', 18, H - 11, .8, wallM, [0, 11 + (H - 11) / 2, Z1 + .4], {cell: 8}); }
  for (const s of [-1, 1]) bx('shell', .9, 1.4, dz, band, [s * (X + .35), 6.5, zc], {cell: 8});
  bx('shell', 2 * X + 1.6, 1.4, .9, band, [0, 6.5, Z0 - .35], {cell: 8});
  const trussZ = [-160, -130, -100, -70, -40, -10, 20]; for (const z of trussZ) bx('ceiling', 2 * X, 1.2, 1.2, mat('metal', '#8a9099'), [0, H - 1.6, z], {cell: 10});
  for (const x of [-52, -26, 0, 26, 52]) bx('ceiling', .8, .8, dz, mat('metal', '#8a9099'), [x, H - 2.6, zc], {cell: 10});
  { const r = rnd(9); for (let i = 0; i < 10; i++) { const x = -45 + (i % 5) * 22.5, z = i < 5 ? -40 : -100, bn = new T.Mesh(new T.PlaneGeometry(5, 10), new T.MeshBasicMaterial({color: envColor(['#c97b6b', '#7b9cc9', '#c9b46b', '#8fc28a', '#b28ac9'][i % 5]), side: T.DoubleSide})); bn.position.set(x, H - 8.5, z + r() * 6); bn.name = 'banner'; live.add(bn); } }
  // ---- fluorescent strips (cool, unlit emissive; their light is baked) ------------------------------------------------------------
  const STRIPS = []; for (const z of [-145, -115, -85, -55, -25, 5]) for (const x of [-52, -26, 0, 26, 52]) STRIPS.push([x, H - 3.4, z]);
  { const sm = new T.MeshBasicMaterial({color: '#eef5ff', toneMapped: false, fog: false}), M = new T.Matrix4(), nearS = STRIPS.filter(p => isNear([p[0] - 7, p[1] - .15, p[2] - .45], [p[0] + 7, p[1] + .15, p[2] + .45]));
    for (const [list, geo, nm] of [[nearS, bevelBoxGeometry(14, .3, .9, BEVEL, 100), 'stripsNear'], [STRIPS.filter(p => !nearS.includes(p)), new T.BoxGeometry(14, .3, .9), 'strips']]) { if (!list.length) continue;
      const im = new T.InstancedMesh(geo, sm, list.length); list.forEach((p, i) => im.setMatrixAt(i, M.makeTranslation(...p))); im.name = nm; im.userData.live = true; im.computeBoundingSphere(); live.add(im); } }
  // ---- zone floor plates (muted; the top-down view still reads by value and hue) -----------------------------------------------
  const plate = (z, c, y = .06) => bx('plates', z[2] - z[0], .12, z[3] - z[1], mat('plastic', c), [(z[0] + z[2]) / 2, y, (z[1] + z[3]) / 2], {cell: 4});
  plate(ZONES.arena, '#7fb3ad'); plate(ZONES.candy, '#d9a7b8'); plate([-75, -42, -60, -12], '#6f74a8'); plate(ZONES.counter, '#e2c9a1'); plate([46, 10, 66, 34], '#d8c27a'); plate([42, -30, 61, -11], '#8aa6c9');
  // ---- go-kart track (right): elliptical ribbon, kerbs, karts (story) -----------------------------------------------------------
  { const n = 80, pos = [], idx = [], uv = [];
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, nx = Math.sin(a) / TRACK.a, nz = Math.cos(a) / TRACK.b, l = Math.hypot(nx, nz), o = [nx / l, nz / l];
      for (const s of [-1, 1]) { pos.push(TRACK.c[0] + Math.sin(a) * TRACK.a + o[0] * s * TRACK.width / 2, .1, TRACK.c[1] + Math.cos(a) * TRACK.b + o[1] * s * TRACK.width / 2); uv.push(i * .35, s > 0 ? 1 : 0); } }
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals(); D('track').add(new T.Mesh(tg, mat('asphalt', '#9a9aa2', {repeat: [1, 1]})));
    // kerbs: two closed tubes along the track edges, red/white stripes in vertex colours (round: nothing to bevel)
    for (const s of [-1, 1]) { const P = Array.from({length: 48}, (_, i) => { const a = i / 48 * Math.PI * 2, nx = Math.sin(a) / TRACK.a, nz = Math.cos(a) / TRACK.b, l = Math.hypot(nx, nz), r = TRACK.width / 2 + .7;
        return [TRACK.c[0] + Math.sin(a) * TRACK.a + nx / l * s * r, .32, TRACK.c[1] + Math.cos(a) * TRACK.b + nz / l * s * r]; });
      const k = tube(P, .45, mat('plastic', '#ffffff'), {closed: true, step: .9, radial: 6}); k.mesh.material = k.mesh.material.clone(); k.mesh.material.vertexColors = true; k.mesh.material.userData = {...k.mesh.material.userData, cls: 'plastic'};
      const pg = k.mesh.geometry.attributes.position, col = new Float32Array(pg.count * 3), segs = k.mesh.geometry.parameters.tubularSegments, A = new T.Color(envColor('#c27c74')), B = new T.Color(envColor('#e6e0d6'));
      for (let i = 0; i < pg.count; i++) { const c = Math.floor(Math.floor(i / 7) / Math.max(1, segs / 40)) % 2 ? A : B; col.set([c.r, c.g, c.b], i * 3); } k.mesh.geometry.setAttribute('color', new T.BufferAttribute(col, 3)); k.mesh.name = 'kerb'; D('track').add(k.mesh); }
    bx('track', 5, .13, .7, '#e6e0d6', [trackPoint(0)[0], .14, trackPoint(0)[1]]); }
  // ---- foam-blaster arena (left): barriers, inflatable posts, blaster rack + blasters (story) -------------------------------------
  { const [x0, z0, x1, z1] = ZONES.arena, cols = ['#c98b7f', '#8fb0c9', '#c9b37f', '#9fc29a', '#b49ac9'];
    for (let i = 0; i < 16; i++) { const h = 1.6 + rand() * 1.4, at = [x0 + 2 + rand() * (x1 - x0 - 4), h / 2, z0 + 3 + rand() * (z1 - z0 - 6)]; bx('arena', 1.7, h, 1.7, cols[i % 5], at, {rot: [0, rand() * 3, 0]}); contact.push({x: at[0], z: at[2], w: 1.9, d: 1.9}); }
    for (let i = 0; i < 6; i++) cl('arena', .95, 3.6, cols[(i + 2) % 5], [x0 + 2.5 + i * 2.7, 1.8, z1 - 1.6], {seg: 12});
    bx('arena', x1 - x0, 1.1, .5, '#c99a6b', [(x0 + x1) / 2, .55, z1 + .3]); bx('arena', .5, 1.1, z1 - z0, '#c99a6b', [x1 + .3, .55, (z0 + z1) / 2]);
    bx('arena', 5.4, .4, 1.4, '#e6e0d6', [x1 - 4, 1.0, z1 + 1.8]); for (let i = 0; i < 6; i++) prop('arena', 'blaster', i + 1, [x1 - 6.2 + i * .85, 1.45, z1 + 1.8], {rot: [0, 0, 1.2], scale: .7, story: true}); }
  // ---- ball pit (instanced, muted) + trampoline (right front) ---------------------------------------------------------------------
  { const [x0, z0, x1, z1] = ZONES.pit, wc = '#7d93b5'; bx('pit', x1 - x0, 1.5, .5, wc, [(x0 + x1) / 2, .75, z0]); bx('pit', x1 - x0, 1.5, .5, wc, [(x0 + x1) / 2, .75, z1]); bx('pit', .5, 1.5, z1 - z0, wc, [x0, .75, (z0 + z1) / 2]); bx('pit', .5, 1.5, z1 - z0, wc, [x1, .75, (z0 + z1) / 2]);
    bx('pit', x1 - x0 - .6, .1, z1 - z0 - .6, '#e6e0d6', [(x0 + x1) / 2, .08, (z0 + z1) / 2]);
    const N = 800, ballGeo = [new T.OctahedronGeometry(.42, 0), new T.TetrahedronGeometry(.5, 0)], im = new T.InstancedMesh(ballGeo[0], new T.MeshLambertMaterial({color: '#ffffff'}), N), M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), r = rnd(11);
    for (let i = 0; i < N; i++) { const x = x0 + .6 + r() * (x1 - x0 - 1.2), z = z0 + .6 + r() * (z1 - z0 - 1.2), y = .35 + r() * .5; im.setMatrixAt(i, M.compose(new T.Vector3(x, y, z), q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), new T.Vector3(1, 1, 1))); im.setColorAt(i, new T.Color(envColor(TOY[Math.floor(r() * TOY.length)]))); }
    im.name = 'ballPit'; im.userData.live = true; im.userData.lodGeo = ballGeo; im.computeBoundingSphere(); g.add(im);
    const [tx, tz] = [56, 22]; cl('tramp', 5.4, .5, '#c98b86', [tx, .95, tz], {seg: 28}); cl('tramp', 4.4, .3, '#7d93b5', [tx, 1.15, tz], {seg: 28});
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cl('tramp', .28, .95, '#b8bcc4', [tx + Math.sin(a) * 5, .48, tz + Math.cos(a) * 5], {seg: 6}); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .78; cl('tramp', .18, 3.4, '#d1bb78', [tx + Math.sin(a) * 5.6, 1.7, tz + Math.cos(a) * 5.6], {seg: 6}); }
    contact.push({x: tx, z: tz, w: 10, d: 10}); }
  // ---- candy zone (front left): chocolate fountain (story), waterfall wall, gumball tower, lollipop stand, warm pendants ------------
  const PEND = [[-52, 13, 14], [-44, 13, 26]];
  { const [fx, fz] = [-52, 14], ch = new T.Group(); ch.name = 'chocolateFountain'; ch.userData.story = true; D('candy').add(ch);
    for (const [r, h, y, c] of [[3.4, .5, .3, '#ff4fa3'], [2.6, 1.1, 1.2, '#7a3510'], [1.9, 1.0, 2.4, '#86401a'], [1.2, 1.0, 3.5, '#934a22']]) cl('candy', r, h, story(c), [fx, y, fz], {seg: 22, parent: ch});
    cl('candy', .35, 1.6, story('#c9702c'), [fx, 4.6, fz], {seg: 8, parent: ch});
    for (const [r, y] of [[2.6, 1.78], [1.9, 2.94], [1.2, 4.05]]) { const f = new T.Mesh(roundCylGeometry(r + .08, .5, BEVEL, 22, 3), story('#6a2a0c')); f.position.set(fx, y - .3, fz); f.userData.live = true; f.name = 'chocolateFlow'; ch.add(f); }
    contact.push({x: fx, z: fz, w: 6.6, d: 6.6});
    const [wx, wz] = [-63.7, 25]; bx('candy', 7, .8, 3.4, '#7d93b5', [wx + 2, .4, wz]); bx('candy', .5, 10, 6, '#d9a7b8', [wx - 1, 5, wz]);
    let map = null; if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 32; c.height = 256; const x = c.getContext('2d'); for (let i = 0; i < 256; i++) { const a = .55 + .35 * Math.sin(i * .35) * Math.sin(i * .11); x.fillStyle = `rgba(190,215,235,${a})`; x.fillRect(0, i, 32, 1); } map = new T.CanvasTexture(c); map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(1, 2); }
    const wf = new T.Mesh(new T.PlaneGeometry(5.2, 9.4), new T.MeshBasicMaterial({map, color: map ? '#ffffff' : '#9fc0d8', transparent: true, opacity: .8, side: T.DoubleSide})); wf.position.set(wx - .6, 4.9, wz); wf.rotation.y = Math.PI / 2; wf.name = 'waterfall'; live.add(wf); g.userData.waterfallMap = map;
    const [gx, gz] = [-44, 26]; cl('candy', 2.6, .9, '#c98b86', [gx, .45, gz], {seg: 16}); cl('candy', 2.3, .5, '#c98b86', [gx, 10.1, gz], {seg: 16}); cl('candy', .5, 1.2, '#d1bb78', [gx, 10.9, gz], {seg: 8});
    const gl = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 8.6, 18, 1, true), mat('glass', '#d8e6f0', {transparent: true, opacity: .2, live: true})); gl.material.side = T.DoubleSide; gl.position.set(gx, 5.4, gz); gl.name = 'gumballGlass'; gl.userData.live = true; live.add(gl);
    const GN = 300, gumGeo = [new T.OctahedronGeometry(.3, 0), new T.TetrahedronGeometry(.36, 0)], gm = new T.InstancedMesh(gumGeo[0], new T.MeshLambertMaterial({color: '#ffffff'}), GN), r = rnd(5), M = new T.Matrix4();
    for (let i = 0; i < GN; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 1.8; gm.setMatrixAt(i, M.makeTranslation(gx + Math.cos(a) * d, 1.2 + r() * 7.6, gz + Math.sin(a) * d)); gm.setColorAt(i, new T.Color(envColor(TOY[Math.floor(r() * TOY.length)]))); }
    gm.name = 'gumballs'; gm.userData.live = true; gm.userData.lodGeo = gumGeo; gm.computeBoundingSphere(); g.add(gm); contact.push({x: gx, z: gz, w: 5.2, d: 5.2});
    for (let i = 0; i < 5; i++) { cl('candy', .45, 1.5, ['#c98b86', '#d1bb78', '#86b8b3', '#8fa3c9', '#b49ac9'][i], [-62 + i * 1.1, .8, 9.5], {seg: 6}); cl('candy', .7, .25, ['#c98b86', '#d1bb78', '#86b8b3', '#8fa3c9', '#b49ac9'][i], [-62 + i * 1.1, 1.65, 9.5], {seg: 8}); } }
  // ---- gadget wall (left wall) with boxed toys (box art) + HYPERBOX 9 (story) on its pedestal --------------------------------------
  { const x = -73.6, z0 = -40, len = 26, card = mat('cardboard', '#f2ede6', {map: art}), r = rnd(21);
    for (const y of [1.4, 3.6, 5.8, 8.0]) bx('gadget', 2.4, .22, len, mat('timber', '#b08a68', {repeat: [1, 6]}), [x + .4, y, z0 + len / 2]);
    bx('gadget', .3, 9.2, len, '#6f74a8', [-74.8, 4.6, z0 + len / 2]);
    for (const y of [1.4, 3.6, 5.8, 8.0]) for (let i = 0; i < 9; i++) { const h = 1.3 + r() * .6, w = 2.2, c = Math.floor(r() * 16); bx('gadget', 1.4, h, w, card, [x + .3, y + .11 + h / 2, z0 + 1.6 + i * 2.75], {uvRects: {'+x': cellUV(c, 'front'), other: cellUV(c, 'side')}}); }
    cl('gadget', 2.1, 1.3, '#e6e0d6', [-66, .65, -27], {seg: 18}); cl('gadget', 1.7, .15, '#d1bb78', [-66, 1.35, -27], {seg: 18}); contact.push({x: -66, z: -27, w: 4.2, d: 4.2});
    prop('gadget', 'hyperbox', 1, [-66, 1.42, -27], {rot: [0, Math.PI / 2 + .1, 0], name: 'hyperbox', story: true});
    const beam = new T.Mesh(new T.ConeGeometry(2.4, 10, 14, 1, true), new T.MeshBasicMaterial({color: '#fff3c0', transparent: true, opacity: .13, depthWrite: false, side: T.DoubleSide})); beam.position.set(-66, 6.5, -27); beam.rotation.x = Math.PI; beam.name = 'hyperboxBeam'; live.add(beam);
    contact.push({x: -73.6, z: z0 + len / 2, w: 2.6, d: len}); }
  // ---- front: shutter (metal, live), sign, counter, back board with clock (story) / key (story) / photo / register ------------------
  const shutter = new T.Group(); shutter.name = 'shutter'; { const m1 = mat('metal', '#a9b1ba', {live: true}), m2 = mat('metal', '#868e98', {live: true});
    for (let i = 0; i < 22; i++) { const s = new T.Mesh(bevelBoxGeometry(18, .46, .3, BEVEL, 6), i % 2 ? m1 : m2); s.position.set(0, .25 + i * .5, i % 2 ? .06 : 0); shutter.add(s); }
    for (const sx of [-9.2, 9.2]) { const p = new T.Mesh(bevelBoxGeometry(.5, 11, .5, BEVEL, 4), mat('metal', '#5f6670', {live: true})); p.position.set(sx, 5.5, 0); shutter.add(p); }
    const top = new T.Mesh(bevelBoxGeometry(18.8, .8, .8, BEVEL, 4), mat('metal', '#5f6670', {live: true})); top.position.set(0, 11.4, 0); shutter.add(top); }
  shutter.position.set(0, 0, Z1 - .2); if (front) live.add(shutter);   // composite: the street's shutter is the one seen from both sides
  const sign = textPlate('OPENS 8:00 AM', {w: 8.4, h: 2.4, bg: '#d9c27e', fg: '#2b2d33', lines: ['OPENS', '8:00 AM'], border: '#b77a6c', name: 'signOpens'}); sign.position.set(0, 8.4, Z1 - .5); sign.rotation.y = Math.PI; if (front) live.add(sign);
  const cz = 27.5; bx('counter', 12, 3.4, 2.4, '#e8dccb', [0, 1.7, cz]); bx('counter', 12.6, .3, 3.0, '#b8796c', [0, 3.5, cz]); bx('counter', 12, 3.4, .3, '#7d93b5', [0, 1.7, cz + 1.3]); contact.push({x: 0, z: cz, w: 12.2, d: 2.6});
  bx('counter', 17, 10, .4, '#efe6d8', [0, 5, 31.6]); bx('counter', 17.4, .5, .5, '#b8796c', [0, 10.2, 31.6]); bx('counter', .5, 10, .5, '#b8796c', [-8.7, 5, 31.6]); bx('counter', .5, 10, .5, '#b8796c', [8.7, 5, 31.6]);
  prop('counter', 'register', 1, [3.8, 3.65, cz], {rot: [0, Math.PI, 0]});
  prop('counter', 'hook', 1, [-4.4, 5.6, 31.25], {rot: [0, Math.PI, 0]}); prop('counter', 'key', 1, [-4.4, 5.05, 30.95], {rot: [0, Math.PI, 0], scale: 1.15, name: 'key', story: true});
  prop('counter', 'photoFrame', 1, [4.6, 6.0, 31.25], {rot: [0, Math.PI, 0], scale: 1.25});
  const clock = new T.Group(); clock.name = 'clock'; clock.userData.live = true; clock.userData.story = true; { let map = null; if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#ffcc1f'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill(); x.strokeStyle = '#e8332b'; x.lineWidth = 30; x.stroke();
      x.fillStyle = '#2b1d10'; x.font = 'bold 64px Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let h = 1; h <= 12; h++) { const a = h / 12 * Math.PI * 2; x.fillText(String(h), 256 + Math.sin(a) * 185, 256 - Math.cos(a) * 185); } map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8; }
    const face = new T.Mesh(new T.CircleGeometry(2.3, 32), new T.MeshBasicMaterial({map, color: map ? '#ffffff' : '#ffcc1f'})); face.name = 'clockFace'; clock.add(face);
    const rim = new T.Mesh(new T.TorusGeometry(2.35, .16, 6, 32), new T.MeshBasicMaterial({color: '#e8332b'})); rim.name = 'clockRim'; clock.add(rim);
    const hand = (w, l, c, n) => { const p = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(w, l, .06), new T.MeshBasicMaterial({color: c})); m.position.y = l / 2 - .15; p.add(m); p.position.z = .06; p.name = n; clock.add(p); return p; };
    clock.userData.hour = hand(.2, 1.2, '#2b1d10', 'hourHand'); clock.userData.minute = hand(.13, 1.9, '#2b1d10', 'minuteHand'); }
  clock.position.set(0, 7.2, 31.3); clock.rotation.y = Math.PI; live.add(clock);
  const setClock = min => { const h = (min / 60) % 12, m = min % 60; clock.userData.hour.rotation.z = -h / 12 * Math.PI * 2; clock.userData.minute.rotation.z = -m / 60 * Math.PI * 2; }; setClock(7 * 60 + 55);
  // ---- aisles: gondolas (instanced; near = bevelled, mid = sharp, far half = low-LOD) --------------------------------------------
  const rows = [...[-30, -18, -6, 6, 18, 30].map(x => ({x, z0: -66, z1: -10, lod: 'near'})), ...[-54, -42, -30, -18, -6, 6, 18, 30, 42, 54].map(x => ({x, z0: -144, z1: -80, lod: 'far', skip: [[-26, -134, 26, -90]]}))];
  const shelves = buildShelves(rows, {cams: ANCHOR_CAMS, art, frameColor: '#b9ad9c'}); g.add(shelves.group); contact.push(...shelves.contact);
  // ---- plush mountain (far centre): a pile of giant plush blobs + three plush bears on top --------------------------------------------
  { const r = rnd(33), [mx, mz] = MOUNTAIN.c, PL = ['#c7a6a0', '#a6b7c7', '#c7bfa0', '#a8c4a6', '#b7a6c7', '#c4b0a0'], geos = new Map();
    const blob = (x, y, z, s, c, sq = .8) => { const sg = new T.SphereGeometry(1, 10, 7); sg.scale(s, s * sq, s); sg.translate(x, y, z); const k = envColor(c); if (!geos.has(k)) geos.set(k, []); geos.get(k).push(sg); };
    for (let layer = 0; layer < 6; layer++) { const ring = MOUNTAIN.r * (1 - layer / 6.4), n = Math.max(1, Math.round(ring / 3.2)), y = layer * 4.2 + 2;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + layer, d = ring * (.55 + r() * .4); blob(mx + Math.sin(a) * d, y, mz + Math.cos(a) * d, 4.4 - layer * .3 + r() * 1.2, PL[(i + layer) % PL.length]); } }
    for (let b = 0; b < 3; b++) { const a = b / 3 * Math.PI * 2 + .4, x = mx + Math.sin(a) * 5, z = mz + Math.cos(a) * 5, y = 25, c = PL[b * 2];
      blob(x, y, z, 3.4, c, 1); blob(x - 2.4, y + 2.6, z, 1.2, c, 1); blob(x + 2.4, y + 2.6, z, 1.2, c, 1); blob(x + Math.sin(a) * 2.6, y - .4, z + Math.cos(a) * 2.6, 1.4, '#e6e0d6', .8);
      blob(x + Math.sin(a) * 3 - Math.cos(a) * 1.2, y + 1, z + Math.cos(a) * 3 + Math.sin(a) * 1.2, .45, '#3a3a40', 1); blob(x + Math.sin(a) * 3 + Math.cos(a) * 1.2, y + 1, z + Math.cos(a) * 3 - Math.sin(a) * 1.2, .45, '#3a3a40', 1); }
    for (const [c, gs] of geos) { const m = new T.Mesh(mergeGeometries(gs), mat('plush', c)); m.name = 'plushMountain'; D('mountain').add(m); }
    contact.push({x: mx, z: mz, w: 40, d: 40}); }
  // ---- mezzanine terraces (12, 24): decks, fronts, columns, railings (glass panels), stairs ------------------------------------------
  { const deck = mat('plastic', '#cbbfae'), col = mat('metal', '#8a9099'), rail = mat('plastic', '#9a8f80');
    const decks = [[[-X, -166, X, -156], L2], [[-X, -156, -65, -45], L2], [[58, -156, X, -94], L2], [[-X, Z0, X, -166], L3], [[66, -166, X, -128], L3]];
    for (const [[x0, z0, x1, z1], y] of decks) bx('mezz', x1 - x0, .6, z1 - z0, deck, [(x0 + x1) / 2, y - .3, (z0 + z1) / 2], {cell: 8});
    bx('mezz', 2 * X, L3 - L2 - .6, .6, wallM, [0, (L2 + L3) / 2, -166.3], {cell: 8});
    const edges = [[[-X, -156], [X, -156], L2], [[-65, -156], [-65, -45], L2], [[58, -156], [58, -94], L2], [[58, -94], [X, -94], L2], [[-X, -166], [66, -166], L3], [[66, -166], [66, -128], L3]], glass = [];
    for (const [a, b, y] of edges) { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), alongX = Math.abs(b[0] - a[0]) > .1, cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      bx('mezz', alongX ? len : .3, .3, alongX ? .3 : len, rail, [cx, y + 1.35, cz], {cell: 8});
      const n = Math.floor(len / 6); for (let i = 0; i <= n; i++) { const u = i / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u; bx('mezz', .25, 1.3, .25, rail, [x, y + .65, z], {cell: 4}); }
      const pg = new T.PlaneGeometry(len, 1.1); if (!alongX) pg.rotateY(Math.PI / 2); pg.translate(cx, y + .6, cz); glass.push(pg);
      if (y === L2) for (let i = 1; i < Math.floor(len / 16); i++) { const u = i / Math.floor(len / 16); cl('mezz', .7, L2 - .6, col, [a[0] + (b[0] - a[0]) * u, (L2 - .6) / 2, a[1] + (b[1] - a[1]) * u], {seg: 10, cell: 6}); } }
    for (let i = 1; i < 4; i++) cl('mezz', .6, L3 - L2 - .6, col, [66, L2 + (L3 - L2) / 2, -166 + i * 9.5], {seg: 10, cell: 6});
    const gm = new T.Mesh(mergeGeometries(glass), mat('glass', '#cfe0ea', {transparent: true, opacity: .25, live: true})); gm.material.side = T.DoubleSide; gm.name = 'railGlass'; gm.userData.live = true; live.add(gm);
    for (let i = 0; i < 24; i++) bx('mezz', 7, .5, 1, '#b8ab98', [70.5, .25 + i * L2 / 24 + (L2 / 24 - .5), -70.5 - i], {cell: 8});           // stair 0 → 12 (solid steps)
    bx('mezz', 7, L2 - .5, 1, '#a89c8c', [70.5, (L2 - .5) / 2, -94.5], {cell: 8});
    for (let i = 0; i < 24; i++) bx('mezz', 7, .5, 1, '#b8ab98', [70.5, L2 + .25 + i * (L3 - L2) / 24 + .0, -104.5 - i], {cell: 8});        // stair 12 → 24
    contact.push({x: 70.5, z: -82, w: 7, d: 24}); }
  // ---- toy-train loop (12.5): bed + rails (ribbons), posts outside the zones, a train (live) ------------------------------------------
  { const n = 220, bed = [], rl = [], uvs = [];
    const strip = (arr, off, y0, y1, w) => { const P = []; for (let i = 0; i <= n; i++) { const [x, z, yaw] = trainPoint(i / n), nx = Math.cos(yaw), nz = -Math.sin(yaw); for (const s of [-1, 1]) P.push(x + nx * (off + s * w / 2), y1 === null ? y0 : (s < 0 ? y0 : y1), z + nz * (off + s * w / 2)); } arr.push(P); };
    const ribbon = (P, cls, c) => { const idx = []; for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); gg.setIndex(idx); gg.computeVertexNormals(); const m = new T.Mesh(gg, mat(cls, c)); m.material.side = T.DoubleSide; D('train').add(m); };
    const b = []; strip(b, 0, TRAIN.y, null, 3.2); ribbon(b[0], 'plastic', '#9a8f80');
    for (const off of [-.8, .8]) { const r2 = []; const P = []; for (let i = 0; i <= n; i++) { const [x, z, yaw] = trainPoint(i / n), nx = Math.cos(yaw), nz = -Math.sin(yaw); P.push(x + nx * off, TRAIN.y + .05, z + nz * off, x + nx * off, TRAIN.y + .4, z + nz * off); } ribbon(P, 'metal', '#8a9099'); }
    const zoneOf = (x, z) => Object.entries(ZONES).some(([k, [a, b2, c, d]]) => !['aisles', 'far', 'mezz', 'mountain'].includes(k) && x > a - 1 && x < c + 1 && z > b2 - 1 && z < d + 1);
    for (let i = 0; i < 26; i++) { const [x, z] = trainPoint(i / 26); if (zoneOf(x, z) || (Math.abs(x) < 10 && z > -12)) continue; bx('train', .7, TRAIN.y - .1, .7, '#9a8f80', [x, (TRAIN.y - .1) / 2, z], {cell: 6}); contact.push({x, z, w: .8, d: .8}); } }
  const train = new T.Group(); train.name = 'toyTrain'; train.userData.live = true; const cars = [];
  for (let i = 0; i < 6; i++) { const c = new T.Group(), body = new T.Mesh(bevelBoxGeometry(2.2, i ? 1.8 : 2.4, 4.2, BEVEL, 10), mat('plastic', ['#8f6f8f', '#7d93b5', '#c9b37f', '#86b8b3', '#c98b86', '#9fc29a'][i], {live: true})); body.position.y = i ? 1.2 : 1.5; c.add(body);
    if (!i) { const ch = new T.Mesh(roundCylGeometry(.45, 1.4, BEVEL, 10, 4), mat('metal', '#5f6670', {live: true})); ch.position.set(0, 3.2, 1.2); c.add(ch); }
    for (const s of [-1, 1]) for (const zz of [-1.3, 1.3]) { const w = new T.Mesh(roundCylGeometry(.45, .3, BEVEL, 10, 4), mat('metal', '#5f6670', {live: true})); w.rotation.z = Math.PI / 2; w.position.set(s * 1.15, .45, zz); c.add(w); }
    cars.push(c); train.add(c); }
  live.add(train);
  // ---- ceiling rollercoaster: rails hung from the trusses, a cart, bulbs (practicals) -------------------------------------------------
  const rail = tube(railPts(), .32, mat('plastic', '#c9b37f'), {closed: true, step: 1.8}), rail2 = tube(railPts().map(p => [p[0], p[1] - .8, p[2]]), .2, mat('plastic', '#c98b86'), {closed: true, step: 1.8}); D('coaster', [0, 0, -32]).add(rail.mesh, rail2.mesh); D('coaster', [0, 0, -32], true).add(tube(railPts(), .32, rail.mesh.material, {closed: true, step: 6, radial: 4}).mesh, tube(railPts().map(p => [p[0], p[1] - .8, p[2]]), .2, rail2.mesh.material, {closed: true, step: 6, radial: 4}).mesh);
  for (let i = 0; i < 16; i++) { const p = railCurve().getPointAt(i / 16); cl('coaster', .12, H - 1.6 - p.y, mat('metal', '#8a9099'), [p.x, (H - 1.6 + p.y) / 2, p.z], {seg: 6, cell: 6}); }
  const cart = new T.Group(); cart.name = 'coasterCart'; for (let i = 0; i < 3; i++) { const c = new T.Mesh(bevelBoxGeometry(1.8, 1.0, 2.6, BEVEL, 10), mat('plastic', ['#c98b86', '#c9b37f', '#7d93b5'][i], {live: true})); c.position.set(0, -.9, -i * 2.9); cart.add(c); } live.add(cart);
  PRACTICALS.forEach(p => { const b = new T.Mesh(new T.IcosahedronGeometry(.3, 0), new T.MeshBasicMaterial({color: '#ffd68a', toneMapped: false})); b.position.set(...p); b.userData.live = true; b.name = 'railBulb'; live.add(b); });
  // warm practicals (visible): pendant lamps over the counter and the candy zone, with halos
  for (const p of [[-5, 13.5, 27.5], [5, 13.5, 27.5], ...PEND]) { const l = new T.Mesh(roundCylGeometry(1.3, .9, BEVEL, 14, 4, .6), new T.MeshBasicMaterial({color: '#ffcf8a', toneMapped: false})); l.position.set(...p); l.userData.live = true; l.name = 'pendant'; live.add(l);
    const cord = new T.Mesh(new T.CylinderGeometry(.05, .05, H - p[1], 4), new T.MeshBasicMaterial({color: '#4a4f58'})); cord.position.set(p[0], (H + p[1]) / 2, p[2]); cord.userData.live = true; live.add(cord);
    if (look4?.halo) live.add(look4.halo([p[0], p[1] - .6, p[2]], '#ffcf8a', 4.2, .55)); }
  // ---- movers: karts (story), coaster cart, train ------------------------------------------------------------------------------------
  const karts = [0, 1, 2].map(i => { const p0 = setBevel(BEVEL); const k = toyProp('kart', i * 2 + 1); setBevel(p0); k.userData.live = true; k.userData.story = true; k.traverse(o => { o.userData.live = true; }); live.add(k); return k; });
  const rc = railCurve(), RL = rc.getLength(), tmp = new T.Vector3();
  const placeMovers = t => {
    karts.forEach((k, i) => { const u = ((t * .04 + i * .31) % 1 + 1) % 1, [x, z] = trackPoint(u), [x2, z2] = trackPoint(u + .004); k.position.set(x, .12, z); k.rotation.y = Math.atan2(x2 - x, z2 - z) + Math.PI / 2; });
    const u = ((t * 5 / RL) % 1 + 1) % 1; rc.getPointAt(u, tmp); cart.position.copy(tmp); const nx = rc.getPointAt((u + .01) % 1); cart.lookAt(nx.x, tmp.y, nx.z);
    cars.forEach((c, i) => { const [x, z, yaw] = trainPoint(((t * 6 - i * 4.8) / TRAIN_LENGTH % 1 + 1) % 1); c.position.set(x, TRAIN.y + .4, z); c.rotation.y = yaw; });
  };
  placeMovers(0);
  // ---- contact AO, census (before merging), colour hierarchy, merge per district -----------------------------------------------------
  const decals = contactDecals(contact); live.add(decals);
  g.add(live); g.updateMatrixWorld(true);
  applyHierarchy(g); const census = bevelCensus(g, ANCHOR_CAMS, NEAR), colours = envCensus(g);
  const merged = {}; for (const [k, d] of Object.entries(districts)) merged[k] = mergeByMaterial(d);
  // LOD pairs (detailed cell ↔ coarse twin) and instanced swaps, by the camera's distance to their bounds (world.onCamera)
  const sph = o => { const b = new T.Box3().setFromObject(o); return b.isEmpty() ? null : b.getBoundingSphere(new T.Sphere()); };
  const pairs = Object.entries(districts).filter(([k]) => !k.endsWith('#c') && districts[k + '#c']).map(([k, d]) => ({d, c: districts[k + '#c'], s: sph(d)})).filter(p => p.s);
  const swaps = []; g.traverse(o => { if (o.isInstancedMesh && o.userData.lodGeo) { o.computeBoundingSphere(); swaps.push({o, s: o.boundingSphere.clone().applyMatrix4(o.matrixWorld)}); } });
  scene.add(g);
  const lights = [...STRIPS.map(p => ({p: [p[0], p[1] - 1.2, p[2]], color: [.8, .88, 1], i: 1.25, range: 42})),
    {p: [0, 9, 26], color: [1, .72, .42], i: 2.6, range: 16}, ...PEND.map(p => ({p: [p[0], p[1] - 1.5, p[2]], color: [1, .7, .45], i: 2.4, range: 18})), {p: [-66, 8, -27], color: [1, .95, .8], i: 2.0, range: 12},
    ...PRACTICALS.filter((_, i) => i % 3 === 0).map(p => ({p, color: [1, .8, .5], i: .6, range: 8}))];
  const world = {anchors: Object.fromEntries(Object.entries(ANCHORS).map(([k, a]) => [k, {position: a.at, camera: a.camera, top: a.top}])), groundY, lights, practicals: PRACTICALS, zones: ZONES, root: g, ballPit: 800,
    stats: {districts: Object.keys(merged).length, merged: Object.values(merged).reduce((a, m) => a + m.merged, 0), into: Object.values(merged).reduce((a, m) => a + m.into, 0), tris: Math.round(triCount(g)), shelves: shelves.counts, shelfTris: shelves.tris, bevel: census, colours, contact: contact.length},
    lod: {pairs: pairs.length, swaps: swaps.length, dist: LOD_DIST},
    onCamera(cam) { const far = sp => Math.hypot(cam[0] - sp.center.x, cam[1] - sp.center.y, cam[2] - sp.center.z) - sp.radius > LOD_DIST;
      for (const p of pairs) { const f = far(p.s); p.d.visible = !f; p.c.visible = f; }
      for (const w of swaps) { const geo = w.o.userData.lodGeo[far(w.s) ? 1 : 0]; if (w.o.geometry !== geo) w.o.geometry = geo; } },
    setState(k, v) { if (k === 'shutter') shutter.position.y = Math.max(0, Math.min(1, v)) * 11.2; else if (k === 'clock') setClock(v); },
    update(t) { placeMovers(t); const wm = g.userData.waterfallMap; if (wm) wm.offset.y = -t * .9; }};
  return world;
}
