// engine/hero6.js — P1 lookdev stage for Actor v6 (R15): a neutral studio (warm-grey floor, soft grey backdrop, key + fill +
// rim, soft shadows) and a seam-test mode (flat magenta background, no floor, no antialiasing). Actors are built and driven
// through engine/actors.js (buildActor / driveActor), the same path as an episode.
//   window.__hero6.render({actors: [{id, at, yaw, pose, t, face}], camera: {position, target, fov}}, w, h, 'studio'|'magenta') → PNG data URL
import * as T from 'three';
import {buildActor, driveActor} from './actors.js';
import {setFace5} from '../avatar-style/faces5.js';
import {triangles} from '../avatar-style/body.js';

const cast = await (await fetch(new URL('../' + new URLSearchParams(location.search).get('cast'), import.meta.url))).json();
const mk = aa => { const r = new T.WebGLRenderer({antialias: aa, preserveDrawingBuffer: true}); r.outputColorSpace = T.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; document.body.appendChild(r.domElement); return r; };
const R = {studio: mk(true), magenta: mk(false)};
const scene = new T.Scene(), BG = new T.Color('#c9c7c3'), MAG = new T.Color('#ff00ff');
scene.add(new T.HemisphereLight('#f4f6fa', '#8d8a84', 1.25));
const key = new T.DirectionalLight('#fff3e2', 2.7); key.position.set(8, 14, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -12, right: 12, top: 12, bottom: -4, near: 1, far: 60}); key.shadow.bias = -.0004; key.shadow.radius = 4; scene.add(key);
const fill = new T.DirectionalLight('#dfe8ff', .9); fill.position.set(-10, 6, 8); scene.add(fill);
const rim = new T.DirectionalLight('#ffffff', 1.1); rim.position.set(-4, 9, -12); scene.add(rim);
const floor = new T.Mesh(new T.CircleGeometry(30, 64), new T.MeshStandardMaterial({color: '#a9a59e', roughness: .9})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const back = new T.Mesh(new T.PlaneGeometry(120, 60), new T.MeshStandardMaterial({color: '#bdbab4', roughness: 1})); back.position.set(0, 20, -25); scene.add(back);
const camera = new T.PerspectiveCamera(35, 1, .3, 300);
const built = new Map();
function actorFor(id, slot) { const k = id + '#' + slot; if (!built.has(k)) { const p = cast.cast[id]; if (!p) throw Error('unknown cast id ' + id); const a = buildActor(p, id); scene.add(a.root); built.set(k, a); } return built.get(k); }
export function render(cell, w, h, mode = 'studio') {
  for (const a of built.values()) a.root.visible = false;
  const used = new Map();
  for (const s of cell.actors) { const slot = used.get(s.id) ?? 0; used.set(s.id, slot + 1); const a = actorFor(s.id, slot); a.root.visible = true;
    driveActor(a, s.t ?? 0, {keys: [[0, s.pose ?? 'idle']], origin: {position: s.at ?? [0, 0, 0], yaw: (s.yaw ?? 0) * Math.PI / 180}});
    setFace5(a, s.face ?? a.preset.face ?? 'smile');
    if (a.body !== 'v6') continue;
    for (const n of ['head', 'waist', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip']) a.pivots[n].visible = true; a.parts.lowerTorso.visible = a.parts.waistCap.visible = a.parts.torso.visible = true;
    // seam chains (P1 gate): one limb chain with its parent piece, everything else hidden, so only joint seams can enclose background
    const hide = {spine: ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'], leftArm: ['head', 'rightShoulder', 'leftHip', 'rightHip'], rightArm: ['head', 'leftShoulder', 'leftHip', 'rightHip'],
      leftLeg: ['waist', 'rightHip'], rightLeg: ['waist', 'leftHip']}[cell.chain];
    for (const ch of a.pivots.head.children) if (ch !== a.parts.head && ch.name !== 'face_decal' && ch.name !== 'neck') ch.visible = !cell.chain;   // seam chains measure the body: hair and hats are their own shapes
    if (hide) { for (const n of hide) a.pivots[n].visible = false; if (cell.chain.endsWith('Arm')) a.parts.lowerTorso.visible = a.parts.waistCap.visible = a.parts.torso.visible = false; } }   // arms: R6-style floating shoulder (no overlap, not a seam): the arm segments alone
  const mag = mode === 'magenta', r = R[mag ? 'magenta' : 'studio'];
  scene.background = mag ? MAG : BG; floor.visible = back.visible = !mag;
  r.setPixelRatio(1); r.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = cell.camera.fov ?? 35; camera.position.set(...cell.camera.position); camera.lookAt(...cell.camera.target); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); r.render(scene, camera); return r.domElement.toDataURL('image/png');
}
export const budget = () => Object.fromEntries(Object.keys(cast.cast).map(id => [id, triangles(actorFor(id, 99).root)]));
window.__hero6 = {render, budget};
