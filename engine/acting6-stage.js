// engine/acting6-stage.js — P3 plain set for the acting v6 review (verbs.png, cycles.png, silhouettes, demo.mp4). Actors are
// built with engine/actors.js buildActor and posed with poses6.applyPose6 from engine/acting6-reel.js shots (pure samples).
//   window.__act6.render({kind: 'verb'|'demo', name, t, f, camera?, aspect}, w, h, 'studio'|'magenta') → PNG data URL
import * as T from 'three';
import {buildActor} from './actors.js';
import {applyPose6} from './poses6.js';
import {setFace6} from '../avatar-style/faces6.js';
import * as R from './acting6-reel.js';

const cast = await (await fetch(new URL('../' + new URLSearchParams(location.search).get('cast'), import.meta.url))).json();
const mk = aa => { const r = new T.WebGLRenderer({antialias: aa, preserveDrawingBuffer: true}); r.outputColorSpace = T.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; document.body.appendChild(r.domElement); return r; };
const RR = {studio: mk(true), magenta: mk(false)};
const scene = new T.Scene(), BG = new T.Color('#c9c7c3'), MAG = new T.Color('#ff00ff');
scene.add(new T.HemisphereLight('#f4f6fa', '#8d8a84', 1.25));
const key = new T.DirectionalLight('#fff3e2', 2.7); key.position.set(8, 14, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -14, right: 14, top: 14, bottom: -6, near: 1, far: 70}); key.shadow.bias = -.0004; key.shadow.radius = 4; scene.add(key);
const fill = new T.DirectionalLight('#dfe8ff', .9); fill.position.set(-10, 6, 8); scene.add(fill);
const rim = new T.DirectionalLight('#ffffff', 1.1); rim.position.set(-4, 9, -12); scene.add(rim);
const floor = new T.Mesh(new T.CircleGeometry(60, 64), new T.MeshStandardMaterial({color: '#a9a59e', roughness: .9})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const back = new T.Mesh(new T.PlaneGeometry(160, 70), new T.MeshStandardMaterial({color: '#bdbab4', roughness: 1})); back.position.set(0, 25, -30); scene.add(back);
const camera = new T.PerspectiveCamera(30, 1, .3, 300);
const actors = {}; for (const id of Object.keys(cast.cast)) { const a = buildActor(cast.cast[id], id); scene.add(a.root); actors[id] = a; }
const sat = c => new T.MeshStandardMaterial({color: c, roughness: .55});
const propMesh = {ball: new T.Mesh(new T.SphereGeometry(.32, 20, 14), sat('#e8692a')), box: new T.Mesh(new T.BoxGeometry(2.0, 1.0, 1.0), sat('#b98a4e')), crate: new T.Mesh(new T.BoxGeometry(1.1, 1, 1.1), sat('#8a6a46')),
  rope: (() => { const g = new T.Mesh(new T.CylinderGeometry(.07, .07, 9, 8), sat('#d9c08a')); g.geometry.rotateX(Math.PI / 2); g.geometry.translate(0, 0, 4.5); return g; })()};
for (const m of Object.values(propMesh)) { m.castShadow = true; m.visible = false; scene.add(m); }

export function render(desc, w, h, mode = 'studio') {
  const aspect = w / h, fr = desc.kind === 'demo' ? R.demoFrame(desc.f) : null;
  const shot = fr ? fr.shot : desc.name === 'carry2' ? R.carryShot(desc.t) : R.verbShot(desc.name, desc.t, {yaw: desc.yaw ?? null});
  for (const a of Object.values(actors)) a.root.visible = false;
  for (const s of shot.actors) { const a = actors[s.id]; a.root.visible = true; applyPose6(a, s.sample, {position: s.origin, yaw: s.yaw * Math.PI / 180}); if (a.faceStyle === 'v6') setFace6(a, s.face ?? 'smile'); }
  for (const m of Object.values(propMesh)) m.visible = false;
  for (const p of shot.props) { const m = propMesh[p.kind]; m.visible = true; m.position.set(...p.p); m.rotation.set(0, (p.yaw ?? 0) * Math.PI / 180, 0); m.scale.set(1, p.h ?? 1, 1); }
  const cam = desc.camera ?? (fr ? R.demoCamera(fr.clip, aspect) : R.fitCamera([shot], aspect));
  const mag = mode === 'magenta', r = RR[mag ? 'magenta' : 'studio'];
  scene.background = mag ? MAG : BG; floor.visible = back.visible = !mag;
  r.setPixelRatio(1); r.setSize(w, h, false);
  camera.aspect = aspect; camera.fov = cam.fov ?? 30; camera.position.set(...cam.position); camera.lookAt(...cam.target); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); r.render(scene, camera); return r.domElement.toDataURL('image/png');
}
window.__act6 = {render, camera: (name, ts, aspect, yaw) => R.fitCamera((Array.isArray(ts) ? ts : [0, ...R.keyTimes(name)]).map(tt => name === 'carry2' ? R.carryShot(tt) : R.verbShot(name, tt, {yaw})), aspect)};   // one camera for every pose of a verb (sheets, silhouettes)
