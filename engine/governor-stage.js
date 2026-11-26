// engine/governor-stage.js — plain studio set for THE GOVERNOR's review sheet (scripts/v2/governor-sheet.js; Phase 1F).
//   window.__gov.render({yaw, face, act, t, w, h, cam: 'body' | 'head'}) → PNG data URL; window.__gov.tris → triangle count.
import * as T from 'three';
import {buildActor} from './actors.js';
import {triangles} from '../avatar-style/body.js';
import {applyPoseSample} from './poses.js';
import {setFace6} from '../avatar-style/faces6.js';
import {sampleVerbR6} from './r6.js';

const gov = (await (await fetch(new URL('../cast/governor.json', import.meta.url))).json()).GOVERNOR;
const r = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); r.outputColorSpace = T.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.toneMapping = T.AgXToneMapping; document.body.appendChild(r.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#c9d4e2');
scene.add(new T.HemisphereLight('#f4f6fa', '#8d8a84', 1.6));
const key = new T.DirectionalLight('#fff3e2', 3.2); key.position.set(8, 14, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -8, right: 8, top: 10, bottom: -2, near: 1, far: 60}); key.shadow.bias = -.0004; scene.add(key);
const fill = new T.DirectionalLight('#dfe8ff', 1.2); fill.position.set(-10, 6, 8); scene.add(fill);
const rim = new T.DirectionalLight('#ffffff', 1.4); rim.position.set(0, 8, -12); scene.add(rim);
const floor = new T.Mesh(new T.CircleGeometry(40, 64), new T.MeshStandardMaterial({color: '#a9b3a0', roughness: .9})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new T.PerspectiveCamera(30, 1, .1, 200), a = buildActor({...gov, tag: null}, 'GOVERNOR'); scene.add(a.root);
export function render({yaw = 0, face = 'gov_smug', act = null, t = .8, w = 540, h = 960, cam = 'body'}) {
  const s = sampleVerbR6(act ?? 'idle_alive', act ? t : 0, {build: a.build}).sample;
  applyPoseSample(a, s, {position: [0, 0, 0], yaw: yaw * Math.PI / 180});
  setFace6(a, face); a.attachments.monocle?.userData.setPop(face === 'gov_panic' ? 1 : 0);
  r.setPixelRatio(1); r.setSize(w, h, false); camera.aspect = w / h;
  if (cam === 'head') { camera.fov = 24; camera.position.set(0, 5.0, 6.2); camera.lookAt(0, 4.95, 0); }
  else { camera.fov = 30; camera.position.set(0, 4.2, 17); camera.lookAt(0, 3.55, 0); }
  camera.updateProjectionMatrix(); scene.updateMatrixWorld(true); r.render(scene, camera); return r.domElement.toDataURL('image/png');
}
window.__gov = {render, tris: triangles(a.root)};
