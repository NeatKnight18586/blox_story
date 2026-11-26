// engine/stage1g.js — plain studio stage for the Phase 1G review cells (scripts/v2/fearbell1g-gate.js): creatures (parts/creatures.js),
// props (parts/props1g.js + city kit busStop / dinerCounter) on a soft floor, camera fitted to the object's bounds at any yaw.
//   window.__s1g.show({creature: kind} | {prop: name, p} | {kit: kind}) → tris;  .render({yaw, t, acts, u, w, h, elev, pad, look}) → PNG data URL
import * as T from 'three';
import {buildCreature, tris as ctris} from '../parts/creatures.js';
import {PROPS1G, tris as ptris} from '../parts/props1g.js';
import {cityProps} from '../parts/city/kit/props.js';

const r = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); r.outputColorSpace = T.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.toneMapping = T.AgXToneMapping; document.body.appendChild(r.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#bcd3ea');
scene.add(new T.HemisphereLight('#f4f8ff', '#9a9080', 1.7));
const key = new T.DirectionalLight('#fff3e2', 3.0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; scene.add(key, key.target);
const fill = new T.DirectionalLight('#dfe8ff', 1.1); scene.add(fill); const rim = new T.DirectionalLight('#ffffff', 1.3); scene.add(rim);
const floor = new T.Mesh(new T.CircleGeometry(400, 64), new T.MeshStandardMaterial({color: '#b9c4ae', roughness: .9})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new T.PerspectiveCamera(30, 1, .05, 2000); let cur = null;
export function show(o) {
  if (cur) scene.remove(cur.root); let root, apply = () => {}, n;
  if (o.creature) { const c = buildCreature(o.creature, {id: 'stage'}); root = c.root; if (o.creature === 'shadowPuff') { const w = new T.Group(); w.add(root); root.position.y = 1.4; root = w; } for (const s of c.sparks ?? []) root.add(s); apply = (t, acts) => c.apply(t, {acts: acts ?? [], scale: 1}, {}); n = ctris(root); cur = {root, apply, c}; }
  else if (o.prop) { root = new T.Group(); const g = PROPS1G[o.prop](o.p ?? {}); root.add(g); apply = (t, acts, u) => g.userData.anim?.(u ?? -1); n = ptris(root); cur = {root, apply}; }
  else { root = cityProps([{kind: o.kit, at: [0, 0, 0], yaw: 0}]); n = ptris(root); cur = {root, apply}; }
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(root); return n;
}
export function render({yaw = 30, t = 1, acts = null, u = null, w = 540, h = 540, elev = 12, pad = 1.18, fov = 30, aim = null, restFrame = false}) {
  if (restFrame) { cur.apply(t, [], -1); cur.root.updateMatrixWorld(true); }   // frame on the rest state (a shrink reads as smaller)
  const b = new T.Box3(); cur.root.traverse(m => { if (m.isMesh && m.visible && !m.material.transparent) b.expandByObject(m); });
  cur.apply(t, acts, u); cur.root.updateMatrixWorld(true); if (!restFrame) { b.makeEmpty(); cur.root.traverse(m => { if (m.isMesh && m.visible && !m.material.transparent) b.expandByObject(m); }); } if (b.isEmpty()) b.setFromCenterAndSize(new T.Vector3(0, .5, 0), new T.Vector3(1, 1, 1));
  const c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3()), R = Math.max(s.x, s.y * 1.05, s.z) * .5 * pad, a = yaw * Math.PI / 180, e = elev * Math.PI / 180;
  camera.fov = fov; camera.aspect = w / h; const vf = fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * camera.aspect), d = R / Math.sin(Math.min(vf, hf)) ;
  if (aim) c.fromArray(aim);
  camera.position.set(c.x + Math.sin(a) * Math.cos(e) * d, c.y + Math.sin(e) * d, c.z + Math.cos(a) * Math.cos(e) * d); camera.lookAt(c); camera.near = d / 50; camera.far = d * 20; camera.updateProjectionMatrix();
  key.position.set(c.x + d * .5, c.y + d * .9, c.z + d * .7); key.target.position.copy(c); const sc = key.shadow.camera; Object.assign(sc, {left: -R * 2, right: R * 2, top: R * 2, bottom: -R * 2, near: .1, far: d * 4}); sc.updateProjectionMatrix();
  fill.position.set(c.x - d, c.y + d * .3, c.z + d * .5); rim.position.set(c.x, c.y + d * .5, c.z - d);
  r.setPixelRatio(1); r.setSize(w, h, false); r.render(scene, camera); return r.domElement.toDataURL('image/png');
}
window.__s1g = {show, render};
