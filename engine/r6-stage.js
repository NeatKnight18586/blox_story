// engine/r6-stage.js — plain set for the R6 key-pose sheet (scripts/v2/r6-sheet.js): HERO + LITTLE + ADULT_F (hourglass) posed by engine/r6.js from acting6 verbs.
//   window.__r6.render({name, t, w, h}) → PNG data URL (three actors side by side, the verb's readable side to the camera)
import * as T from 'three';
import {buildActor} from './actors.js';
import {applyPoseSample} from './poses.js';
import {setFace6} from '../avatar-style/faces6.js';
import {VERBS, sampleVerb} from './acting6.js';
import {sampleVerbR6} from './r6.js';
import {FACE} from './acting6-reel.js';

const load = async u => (await fetch(new URL('../' + u, import.meta.url))).json();
const hero = (await load('cast/hero.json')).HERO, tr = await load('cast/troupe-r6.json');
const preset = p => ({...p, body: 'v5', faceStyle: 'v6', rig: 'r6', tag: null});
const CAST = [['HERO', preset(hero), -5.2], ['LITTLE', preset(tr.troupe.LITTLE), 0], ['ADULT_F', preset(tr.troupe.ADULT_F), 5.2]];
const r = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); r.outputColorSpace = T.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; document.body.appendChild(r.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#c9c7c3');
scene.add(new T.HemisphereLight('#f4f6fa', '#8d8a84', 1.25));
const key = new T.DirectionalLight('#fff3e2', 2.7); key.position.set(8, 14, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -14, right: 14, top: 14, bottom: -6, near: 1, far: 70}); key.shadow.bias = -.0004; scene.add(key);
const fill = new T.DirectionalLight('#dfe8ff', .9); fill.position.set(-10, 6, 8); scene.add(fill);
const floor = new T.Mesh(new T.CircleGeometry(60, 64), new T.MeshStandardMaterial({color: '#a9a59e', roughness: .9})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new T.PerspectiveCamera(30, 1, .3, 300), actors = CAST.map(([id, p, x]) => { const a = buildActor(p, id); scene.add(a.root); return {id, a, x}; });
export function render({name, t, w, h}) {
  const v = VERBS[name], yaw = -(v?.cam ?? 30) * Math.PI / 180;
  for (const {id, a, x} of actors) {
    const s6 = sampleVerbR6(name, t, {build: a.build}).sample;
    applyPoseSample(a, s6, {position: [x, 0, 0], yaw});
    const sq = s6.squash ?? 0; if (sq && a.parts.torso) { a.parts.torso.userData.rest ??= a.parts.torso.scale.clone(); a.parts.torso.scale.set(1 + sq / 2, 1 - sq, 1 - sq); }
    try { setFace6(a, FACE[name] ?? 'smile'); } catch { setFace6(a, 'smile'); }
  }
  r.setPixelRatio(1); r.setSize(w, h, false); camera.aspect = w / h; camera.position.set(0, 4.6, 24); camera.lookAt(0, 3.6, 0); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); r.render(scene, camera); return r.domElement.toDataURL('image/png');
}
window.__r6 = {render};
