// parts/sets4/common.js — format v5 set helpers (Phase 3b). A reusable set library (V4 D4): each location is a module that
// returns {anchors, groundY, lights, practicals, update}. Static geometry is tessellated (~1.5 units) so the per-vertex bake
// (engine/bake.js) carries shading; anything that moves is marked userData.live and stays real-time.
import * as T from 'three';
import * as M from '../materials.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bevelBoxGeometry, roundCylGeometry} from './look5.js';
// Phase 3b-R (opt-in): while setBevel(r) is on, box() and cyl() build the bevelled RoundedBox-family geometry (look5.js).
let BEV = 0; export const setBevel = r => { const p = BEV; BEV = r || 0; return p; };

export const HALL = {w: 150, d: 210, h: 36, x: 75, z0: -175, z1: 35, l2: 12, l3: 24, front: 35};   // Phase 3b-R: x ∈ [−75, 75], z ∈ [−175, 35] (front wall, street side, z = +35); levels: floor, 12, 24
export const TOY = ['#ff5a5f', '#ffb400', '#2ec4b6', '#3a86ff', '#9b5de5', '#ff7aa8', '#7bd850', '#ff8a00'];   // toy palette
export const seg = (v, cell = 1.5) => Math.max(1, Math.ceil(v / cell));
const matCache = new Map();
export const plastic = (color, o = {}) => { const k = color + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, M.mat(o.pattern ?? 'plastic', color)); return matCache.get(k); };
export const flat = color => { const k = 'flat' + color; if (!matCache.has(k)) { const m = new T.MeshBasicMaterial({color}); m.userData.live = true; matCache.set(k, m); } return matCache.get(k); };

export function box(w, h, d, mat, at, o = {}) {
  const m = new T.Mesh(BEV && !o.sharp ? bevelBoxGeometry(w, h, d, BEV, o.cell ?? 1.5) : new T.BoxGeometry(w, h, d, seg(w, o.cell), seg(h, o.cell), seg(d, o.cell)), typeof mat === 'string' ? plastic(mat) : mat);
  m.position.set(...at); if (o.rot) m.rotation.set(...o.rot); m.castShadow = m.receiveShadow = false; if (o.live) m.userData.live = true; if (o.name) m.name = o.name; return m;
}
export function plane(w, d, mat, at, o = {}) {
  const g = new T.PlaneGeometry(w, d, seg(w, o.cell), seg(d, o.cell)); g.rotateX(-Math.PI / 2); const m = new T.Mesh(g, typeof mat === 'string' ? plastic(mat) : mat); m.position.set(...at); if (o.live) m.userData.live = true; return m;
}
export function cyl(r, h, mat, at, o = {}) {
  const m = new T.Mesh(BEV && !o.sharp ? roundCylGeometry(r, h, BEV, o.seg ?? 14, o.cell ?? 2, o.rTop ?? r) : new T.CylinderGeometry(o.rTop ?? r, r, h, o.seg ?? 14, seg(h, o.cell ?? 2)), typeof mat === 'string' ? plastic(mat) : mat); m.position.set(...at); if (o.live) m.userData.live = true; if (o.name) m.name = o.name; return m;
}
// Text plate (a real in-world sign, owner rule §2c: text only on real objects). Canvas texture; a plain colour in node.
export function textPlate(text, {w = 6, h = 1.6, bg = '#ffffff', fg = '#222222', font = 'bold 120px Lilita One, Arial Black, sans-serif', border = null, name = 'sign', lines = null} = {}) {
  let map = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); if (border) { g.strokeStyle = border; g.lineWidth = 22; g.strokeRect(11, 11, c.width - 22, c.height - 22); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const L = lines ?? [text]; let fs = Math.min(c.height * .72 / L.length, 150); g.font = font.replace(/\d+px/, `${fs}px`);
    while (L.some(s => g.measureText(s).width > c.width * .9) && fs > 20) { fs -= 4; g.font = font.replace(/\d+px/, `${fs}px`); }
    L.forEach((s, i) => g.fillText(s, c.width / 2, c.height * (i + .5) / L.length + 3)); map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  }
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({map, color: map ? '#ffffff' : bg})); m.name = name; m.userData.live = true; m.userData.text = text; return m;
}
// Tube along a curve (rails, tracks): constant radius, low radial segments.
export function tube(points, r, mat, {closed = false, step = 1.2, radial = 6} = {}) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), closed), g = new T.TubeGeometry(curve, Math.max(8, Math.ceil(curve.getLength() / step)), r, radial, closed);
  return {mesh: new T.Mesh(g, typeof mat === 'string' ? plastic(mat) : mat), curve};
}
// Seeded rng (pure).
export const rnd = (seed = 1) => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
// Triangle count of an object tree (pure-ish).
export function triCount(o) { let n = 0; o.traverse(m => { if (m.isMesh) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); } }); return n; }

// Merge every static mesh of a group that shares a material into one mesh (draw calls: a 600-mesh hall becomes ~40).
// Static = not live (self or any ancestor), not instanced, visible. Geometry is baked to world space under `root`.
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), kill = [];
  const live = o => { for (let p = o; p && p !== root.parent; p = p.parent) if (p.userData?.live || !p.visible) return true; return false; };
  const story = o => { for (let p = o; p; p = p.parent) if (p.userData?.story) return true; return false; };   // 3b-R: a merged mesh of story props only keeps the tag
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || live(o) || Array.isArray(o.material) || !o.geometry.attributes.position) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)); const k = o.material.uuid; if (!groups.has(k)) groups.set(k, {mat: o.material, geos: [], story: true}); const gr = groups.get(k); gr.geos.push(g); gr.story &&= story(o); kill.push(o); });
  for (const o of kill) o.removeFromParent();
  let n = 0; for (const {mat, geos, story} of groups.values()) { const m = new T.Mesh(mergeGeometries(geos, false), mat); m.name = 'merged_' + (mat.name || n); if (story) m.userData.story = true; root.add(m); n++; }
  return {merged: kill.length, into: n};
}
