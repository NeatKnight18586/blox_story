// parts/sets4/shelves.js — format v5 Phase 3b-R: aisles of tall toy-shop gondolas. One merged module (frame + 16 boxed
// toys with box art) repeated by instancing; three levels of detail chosen per placement:
//   near (bbox within NEAR of an anchor camera): bevelled frame and boxes (RoundedBox family, r .04)  ≈ 2,000 tris
//   mid  (the near half of the hall):              the same module, sharp                            ≈   224 tris
//   far  (the far half of the hall):               one box, box-art atlas on both long sides         =    12 tris
// Instances are chunked by aisle row (one InstancedMesh per row and LOD, culled by its own bounds), so a shot only pays for
// the rows it sees. Not baked (instanced): the module carries its own AO in vertex colours (look5 moduleAO) and every
// gondola gets a contact-AO decal on the floor. Pure layout: gondolaLayout(rows) → [{x, z, lod}].
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bevelBoxGeometry, moduleAO, boxDist, envColor, BEVEL} from './look5.js';
import {cellUV} from './boxart.js';

export const MODULE = {L: 8, D: 3.2, H: 14, boards: [3.4, 6.8, 10.2], NEAR: 20};
const shade = (g, base = 0, tint = [1, 1, 1]) => { const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = moduleAO(p.getY(i), n.getY(i), base); c[i * 3] = k * tint[0]; c[i * 3 + 1] = k * tint[1]; c[i * 3 + 2] = k * tint[2]; }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); return g; };
const place = (g, x, y, z) => { g.translate(x, y, z); return g; };
// The gondola module (double sided, along z): frame (group 0) + products (group 1). variant picks the box-art cells.
export function moduleGeometry({bevel = true, variant = 0} = {}) {
  const {L, D, H, boards} = MODULE, r = bevel ? BEVEL : 0, BIG = 100, frame = [], prod = [];
  const fb = (w, h, d, x, y, z, skip = ['-y']) => frame.push(shade(place(bevelBoxGeometry(w, h, d, r, BIG, {skip}), x, y, z), 0));   // nobody sees the undersides from eye level… except boards: keep theirs
  fb(D, .5, L, 0, .25, 0); fb(D, H, .35, 0, H / 2, L / 2 - .175); fb(D, H, .35, 0, H / 2, -L / 2 + .175); fb(.2, H - .5, L - .7, 0, (H + .5) / 2, 0, ['-y', '+y', '+z', '-z']);
  for (const y of boards) fb(D, .22, L - .7, 0, y, 0, ['+z', '-z']); fb(D + .3, .5, L + .1, 0, H + .25, 0);
  const levels = [.5, ...boards.map(y => y + .11)], bw = (L - .7) / 2 - .25;
  let k = variant * 5;
  for (const [li, y0] of levels.entries()) for (const sx of [1, -1]) for (const zz of (li % 2 ? [0] : [-1, 1])) {   // wide single boxes on odd shelves: 12 boxes, not 16
    const cell = (k++ * 7 + li * 3) % 16, h = 2.2 + ((cell * 5) % 4) * .12, front = sx > 0 ? '+x' : '-x';
    const g = bevelBoxGeometry(1.3, h, zz ? bw : 2 * bw + .2, r, BIG, {skip: ['-y', sx > 0 ? '-x' : '+x'], uvRects: {[front]: cellUV(cell, 'front'), other: cellUV(cell, 'side')}});
    prod.push(shade(place(g, sx * .85, y0 + h / 2, zz * (bw / 2 + .12)), y0));
  }
  const fm = mergeGeometries(frame), pm = mergeGeometries(prod), g = mergeGeometries([fm, pm], true);
  g.userData = {bevel: r, kind: 'box', lod: bevel ? 'near' : 'mid'}; g.computeBoundingBox(); return g;
}
// Far LOD: one box; the long sides show the whole atlas (4 × 4 boxed toys), the rest is frame colour. Groups: art, frame.
export function lodGeometry() {
  const {L, D, H} = MODULE, g = new T.BoxGeometry(D, H, L); g.translate(0, H / 2, 0);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));   // ±x faces map 0..1: the whole atlas
  g.clearGroups(); g.addGroup(0, 12, 0); g.addGroup(12, 24, 1); shade(g, 0); g.userData = {bevel: 0, kind: 'box', lod: 'far'}; g.computeBoundingBox(); return g;
}
// Pure: rows [{x, z0, z1, lod: 'near'|'far', skip?: [[x0, z0, x1, z1]]}] → module centres with LOD (near/mid by camera distance).
export function gondolaLayout(rows, cams = [], near = MODULE.NEAR) {
  const out = [], {L, D, H} = MODULE;
  rows.forEach((r, ri) => { const n = Math.floor((r.z1 - r.z0) / L);
    for (let i = 0; i < n; i++) { const z = r.z1 - L / 2 - i * L, x = r.x; if ((r.skip ?? []).some(([a, b, c, d]) => x > a && x < c && z > b && z < d)) continue;
      const ci = cams.findIndex(c => boxDist(c, [x - D / 2, 0, z - L / 2], [x + D / 2, H + .5, z + L / 2]) <= near), lod = ci >= 0 ? 'near' : r.lod === 'far' ? 'far' : 'mid';
      out.push({x, z, lod, row: ri, cam: ci}); } });   // near wins in both halves: whatever a camera sees up close is bevelled
  return out;
}
// Build: one InstancedMesh per (row, LOD); returns {group, contact: [{x, z, w, d}], counts}
export function buildShelves(rows, {cams = [], art = null, frameColor = '#b9ad9c', env = null, reflect = .12} = {}) {
  const list = gondolaLayout(rows, cams), group = new T.Group(); group.name = 'shelves'; group.userData.live = true;
  const fc = envColor(frameColor), frameMat = new T.MeshBasicMaterial({color: fc, vertexColors: true, ...(env ? {envMap: env, combine: T.AddOperation, reflectivity: reflect} : {})});
  const artMat = new T.MeshBasicMaterial({map: art, color: art ? '#f2ede6' : '#a89c8c', vertexColors: true});
  const geos = {near: [0, 1, 2, 3].map(v => moduleGeometry({bevel: true, variant: v})), mid: [0, 1, 2, 3].map(v => moduleGeometry({bevel: false, variant: v})), far: [lodGeometry()]};
  const M = new T.Matrix4(), byKey = new Map(), counts = {near: 0, mid: 0, far: 0};
  for (const m of list) { const k = m.row + '|' + m.lod + '|' + (m.lod === 'near' ? m.cam : '');   /* near chunks per camera: a shot pays only for its own close-ups */ if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(m); counts[m.lod]++; }
  for (const [k, ms] of byKey) { const [row, lod, cam] = k.split('|'), geo = geos[lod][Number(row) % geos[lod].length];
    const im = new T.InstancedMesh(geo, lod === 'far' ? [artMat, frameMat] : [frameMat, artMat], ms.length); im.name = `gondola_${lod}_${row}${cam ? '_c' + cam : ''}`;
    if (lod === 'near') im.userData.lodGeo = [geo, geos.mid[Number(row) % geos.mid.length]];   // seen from far away, a near chunk shows the sharp module
    ms.forEach((m, i) => { im.setMatrixAt(i, M.makeTranslation(m.x, 0, m.z)); const t = .93 + ((i * 37 + Number(row) * 11) % 8) / 100; im.setColorAt(i, new T.Color(t, t, t)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.frustumCulled = true; group.add(im); }
  const contact = list.map(m => ({x: m.x, z: m.z, w: MODULE.D, d: MODULE.L}));
  return {group, contact, counts, list, tris: {near: geos.near[0].index.count / 3, mid: geos.mid[0].index.count / 3, far: 12}};
}
