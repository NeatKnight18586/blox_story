// parts/parts.js — theme-neutral building parts (docs/V2_BRIEF.md §7.2): block, wedge, cylinder, cone,
// sphere, arch, truss, stairs(n), gableRoof(w,d,h), plate. Every part gets world-scaled UVs (box
// projection by face normal, `tile` world units per texture repeat), so patterns keep one size on
// any block and survive district merging. Options: {at, rot (deg), mat | pattern+color, neon, cast,
// receive, name}. Plain boxes/wedges by default; bevels only where a caller asks (hero props).
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mat, TILE} from './materials.js';

// Box-projected UVs from local positions and normals: u/v in world units / tile.
export function worldUV(g, tile = 4) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2)); return g;
}

function material(o) {
  if (o.mat) return o.mat;
  if (o.neon) return mat('neon', o.neon);
  return mat(o.pattern ?? 'plastic', o.color ?? '#cccccc', {flat: !!o.flat});
}
// Wrap a geometry as a placed mesh. Geometry is made non-indexed-safe and given world UVs.
export function place(g, o = {}) {
  const m = material(o);
  if (!g.attributes.normal) g.computeVertexNormals();
  worldUV(g, TILE[m.userData.pattern] ?? 4);
  const mesh = new T.Mesh(g, m); mesh.name = o.name ?? 'part';
  if (o.at) mesh.position.set(...o.at);
  if (o.rot) mesh.rotation.set(...o.rot.map(d => d * Math.PI / 180));
  if (o.scale) mesh.scale.set(...(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]));
  mesh.castShadow = o.cast ?? false; mesh.receiveShadow = o.receive ?? true;
  if (o.gradient) mesh.userData.gradient = true;   // baked contact shading when merged (build.mergeByDistrict)
  return mesh;
}

export const block = (size, o = {}) => place(o.round ? new RoundedBoxGeometry(...size, 1, o.round) : new T.BoxGeometry(...size), o);
export const plate = (w, d, o = {}) => block([w, o.thick ?? .4, d], o);
export const cylinder = (r, h, o = {}) => place(new T.CylinderGeometry(o.rTop ?? r, r, h, o.seg ?? 10, 1, !!o.open), o);
export const cone = (r, h, o = {}) => place(new T.ConeGeometry(r, h, o.seg ?? 8), o);
export const sphere = (r, o = {}) => place(o.seg ? new T.SphereGeometry(r, o.seg, Math.max(3, o.seg >> 1)) : new T.IcosahedronGeometry(r, o.detail ?? 0), {flat: true, ...o});

// Wedge (ramp): full height at +z, zero at -z. Used for roofs on sheds, buttresses, slopes.
export function wedge(w, h, d, o = {}) {
  const g = new T.BoxGeometry(w, h, d), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getZ(i) < 0) p.setY(i, -h / 2);
  g.computeVertexNormals(); return place(g.toNonIndexed(), {flat: true, ...o});
}

// Arch: a w × h × d slab with a round-topped opening of width ow (default w − 2·t) and height oh.
export function arch(w, h, d, o = {}) {
  const t = o.thickness ?? 1, ow = o.ow ?? w - 2 * t, oh = o.oh ?? h - t, r = ow / 2;
  const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  const hole = new T.Path(); hole.moveTo(-r, 0); hole.lineTo(-r, oh - r); hole.absarc(0, oh - r, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.lineTo(-r, 0);
  s.holes.push(hole);
  const g = new T.ExtrudeGeometry(s, {depth: d, bevelEnabled: false, curveSegments: o.seg ?? 8}); g.translate(0, 0, -d / 2);
  return place(g.toNonIndexed(), o);
}

// Gable roof along x over a w × d footprint, ridge h above the wall tops (local y = 0), overhanging
// every side by `overhang` (≥ 0.6, brief §7.3). Two slabs meet at the ridge.
export function gableRoof(w, d, h, o = {}) {
  const ov = o.overhang ?? .7, th = o.thick ?? .35, th2 = Math.atan2(h, d / 2), run = d / 2 + ov, L = run / Math.cos(th2) + th;
  const slabs = [-1, 1].map(sd => {
    const b = new T.BoxGeometry(w + 2 * ov, th, L); b.rotateX(sd * th2);
    b.translate(0, h - (L / 2 - th) * Math.sin(th2) + th / 2, sd * (L / 2 - th) * Math.cos(th2)); return b.toNonIndexed();
  });
  return place(mergeGeometries(slabs), {pattern: 'slate', flat: true, ...o});
}

// Gable-end triangle (wall infill under a gable roof), thickness t, base w along z, height h.
export function gableEnd(base, h, t, o = {}) {
  const s = new T.Shape(); s.moveTo(-base / 2, 0); s.lineTo(base / 2, 0); s.lineTo(0, h); s.lineTo(-base / 2, 0);
  const g = new T.ExtrudeGeometry(s, {depth: t, bevelEnabled: false}); g.translate(0, 0, -t / 2); g.rotateY(Math.PI / 2);
  return place(g.toNonIndexed(), o);
}

// Truss: two chords and alternating diagonal braces (bridges, beams, scaffolds).
export function truss(len, h, o = {}) {
  const g = new T.Group(), b = o.beam ?? .3, n = Math.max(1, Math.round(len / h));
  for (const y of [0, h]) g.add(block([len, b, b], {...o, at: [0, y, 0]}));
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * len / n, dx = len / n, a = Math.atan2(h, dx) * (i % 2 ? -1 : 1);
    g.add(block([Math.hypot(dx, h), b, b], {...o, at: [x0 + dx / 2, h / 2, 0], rot: [0, 0, a * 180 / Math.PI]}));
  }
  return g;
}

// Stairs: n steps of rise × run, width w, rising toward +z from the origin.
export function stairs(n, o = {}) {
  const g = new T.Group(), rise = o.rise ?? .5, run = o.run ?? 1, w = o.w ?? 4;
  for (let i = 0; i < n; i++) g.add(block([w, rise * (i + 1), run], {...o, at: [0, rise * (i + 1) / 2, run * (i + .5)]}));
  return g;
}
