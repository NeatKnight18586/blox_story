// engine/fill.js — format v5 (Phase 3b) instanced FILL crowd: ~200 tiny kids that read as people from above, one draw call.
// Each kid is a merged torso + head + two legs (≤ 60 triangles); a pure bob + sway per kid in t (no pose library, no actors).
//   fillMembers({count, area:[w,d,cx,cz], avoid:[[x0,z0,x1,z1]...], seed}) → [{x,z,yaw,colour,scale,phase}]   (pure)
//   fillMatrix(m, t, y, out) → Matrix4        createFill(scene, list, {groundY, material}) → {meshes, update(t), count}
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rnd} from '../parts/sets4/common.js';
const SHIRTS = ['#ff5a5f', '#ffb400', '#2ec4b6', '#3a86ff', '#9b5de5', '#ff7aa8', '#7bd850', '#ff8a00', '#4f7cc4', '#e2733a'];
export const FILL_TRIS = 60;   // body (4 boxes: torso, legs block, two arms) + head box = 60 tris
// two geometries, one matrix: the body (torso, arms, legs; shirt colour) and the head (skin colour)
const part = (w, h, d, x, y, z) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); g.deleteAttribute('uv'); return g; };
export function fillGeometry() {
  const g = mergeGeometries([part(2, 2, 1, 0, 3, 0), part(1.9, 2, 1, 0, 1, 0), part(.9, 1.8, .9, -1.45, 3.1, 0), part(.9, 1.8, .9, 1.45, 3.1, 0)]); g.computeVertexNormals(); return g;
}
export function fillHeadGeometry() { const g = part(1.2, 1.2, 1.2, 0, 4.6, 0); g.computeVertexNormals(); return g; }
// from above only (owner: "~200 from above"): the fill shows when the camera is high (≥ 20 units) unless the shot says `fill: false|true`
export const fillVisible = (camY, shotFill) => shotFill === undefined ? camY >= 20 : !!shotFill;
export function fillMembers({count = 200, area = [40, 50, 0, 0], avoid = [], seed = 1, scale = .8} = {}) {
  const r = rnd(seed), out = [], [w, d, cx, cz] = area; let tries = 0;
  while (out.length < count && tries++ < count * 40) {
    const x = cx + (r() - .5) * w, z = cz + (r() - .5) * d; if (avoid.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) continue;
    out.push({x, z, yaw: r() * Math.PI * 2, colour: SHIRTS[Math.floor(r() * SHIRTS.length)], scale: scale * (.85 + r() * .3), phase: r() * 6.283, skin: ['#f5cd30', '#f6c9a0', '#e0a77a', '#c08457', '#8d5a3b'][Math.floor(r() * 5)]});
  }
  return out;
}
const _p = new T.Vector3(), _q = new T.Quaternion(), _s = new T.Vector3(), _e = new T.Euler();
export function fillMatrix(m, t, y = 0, out = new T.Matrix4()) {
  const bob = Math.abs(Math.sin(t * 5.5 + m.phase)) * .35 * m.scale, sway = Math.sin(t * 2 + m.phase) * .08;
  return out.compose(_p.set(m.x, y + bob, m.z), _q.setFromEuler(_e.set(0, m.yaw, sway)), _s.setScalar(m.scale));
}
export function createFill(scene, list = [], {groundY = () => 0} = {}) {
  const geo = fillGeometry(), hgeo = fillHeadGeometry(), mat = () => new T.MeshLambertMaterial({color: '#ffffff'});
  const groups = list.map(c => { const mem = fillMembers(c), body = new T.InstancedMesh(geo, mat(), mem.length), head = new T.InstancedMesh(hgeo, mat(), mem.length);
    for (const im of [body, head]) { im.frustumCulled = false; im.userData.live = true; scene.add(im); } body.name = 'fill_' + (c.id ?? 'x'); head.name = 'fillHead_' + (c.id ?? 'x');
    mem.forEach((m, i) => { body.setColorAt(i, new T.Color(m.colour)); head.setColorAt(i, new T.Color(m.skin)); }); body.instanceColor.needsUpdate = head.instanceColor.needsUpdate = true; return {c, mem, body, head}; });
  const M4 = new T.Matrix4();
  return {groups, count: groups.reduce((a, g) => a + g.mem.length, 0), update(t, {camY = 0, shotFill} = {}) { for (const {mem, body, head, c} of groups) { let vis = true; for (const [t0, v] of c.visible ?? []) if (t >= t0) vis = v;
    vis = vis && fillVisible(camY, shotFill); body.visible = head.visible = vis; if (!vis) continue;
    mem.forEach((m, i) => { fillMatrix(m, t * (c.speed ?? 1), groundY(m.x, m.z), M4); body.setMatrixAt(i, M4); head.setMatrixAt(i, M4); }); body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true; } }};
}
