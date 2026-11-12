// engine/studio.js — lookdev page for avatar/cast sheets (Session 2). A neutral daylight stage:
// meadow plate, sky backdrop, warm key + cool fill, sun shadows. window.__studio.render(cell, w, h)
// builds (and caches) the actors a cell names, poses them, places the camera and renders.
import * as T from 'three';
import {buildActor, townsperson, driveActor} from './actors.js';
import {loadFont, setTag, fitTags} from './overhead.js';
import {setFace} from '../avatar-style/faces2.js';
import {triangles} from '../avatar-style/body.js';

await loadFont();
const cast = await (await fetch(new URL('../' + (new URLSearchParams(location.search).get('cast') ?? 'stories/nobody/cast.json'), import.meta.url))).json();

const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#9fd3ff');
scene.add(new T.HemisphereLight('#eef6ff', '#8ab26a', 1.5));
const key = new T.DirectionalLight('#fff1d6', 2.6); key.position.set(10, 18, 14); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, {left: -22, right: 22, top: 14, bottom: -6, near: 1, far: 70}); key.shadow.bias = -.0004; scene.add(key);
const rim = new T.DirectionalLight('#bcd8ff', .7); rim.position.set(-12, 10, -10); scene.add(rim);
const plate = new T.Mesh(new T.BoxGeometry(80, .4, 40), new T.MeshPhongMaterial({color: '#86c76d', shininess: 8})); plate.position.y = -.2; plate.receiveShadow = true; scene.add(plate);
const camera = new T.PerspectiveCamera(35, 9 / 16, .1, 300);

const built = new Map();   // one instance per (preset id + slot) so a cell can show the same character twice
function actorFor(id, slot, over = null) {
  const k = id + '#' + slot + (over ? JSON.stringify(over) : '');
  if (!built.has(k)) {
    const base = id.startsWith('town:') ? townsperson(Number(id.slice(5))) : cast.cast[id];
    if (!base) throw Error('unknown cast id ' + id);
    const preset = over ? {...base, ...over} : base;
    const a = buildActor(preset, id); scene.add(a.root); built.set(k, a);
  }
  return built.get(k);
}

// cell: {actors: [{id, at:[x,y,z], yaw, pose, t, opts, face, tag:false}], camera: {position, target, fov}, props: [...]}
const propMeshes = [];
function addProps(list = []) {
  for (const m of propMeshes) m.removeFromParent(); propMeshes.length = 0;
  for (const p of list) {
    if (p.kind === 'stone') {   // sword-in-stone placeholder for the pull pose (the real prop is Session 3 work)
      const g = new T.Group(), m = c => new T.MeshPhongMaterial({color: c, flatShading: true});
      const add = (geo, mat, y) => { const x = new T.Mesh(geo, mat); x.position.y = y; x.castShadow = x.receiveShadow = true; g.add(x); };
      const add2 = (geo, mat, y, z = -.2) => { add(geo, mat, y); g.children.at(-1).position.z = z; };
      add(new T.BoxGeometry(1.1, .8, 1.1), m('#7f8a99'), .4); g.children[0].position.z = 0;
      add2(new T.BoxGeometry(.06, 1.4, .26), m('#d7dde6'), 1.5);          // exposed blade
      add2(new T.BoxGeometry(.16, .13, .8), m('#f2c230'), 2.26);         // guard
      add2(new T.BoxGeometry(.18, .7, .18), m('#6b4428'), 2.65);         // hilt, gripped at its top
      g.position.set(...p.at); scene.add(g); propMeshes.push(g);
    }
  }
}

export function render(cell, w, h) {
  for (const a of built.values()) a.root.visible = false;
  const used = new Map();
  for (const spec of cell.actors) {
    const slot = used.get(spec.id) ?? 0; used.set(spec.id, slot + 1);
    const a = actorFor(spec.id, slot, spec.with ?? null); a.root.visible = true;
    driveActor(a, spec.t ?? 0, {keys: [[0, spec.pose ?? 'idle', spec.opts ?? {}]], origin: {position: spec.at ?? [0, 0, 0], yaw: (spec.yaw ?? 0) * Math.PI / 180}, ambient: false});
    setFace(a, spec.face ?? a.preset.face ?? 'smile');
    if (a.tag) a.tag.userData.show = spec.tag !== false;
  }
  addProps(cell.props);
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = cell.camera.fov ?? 35; camera.position.set(...cell.camera.position); camera.lookAt(...cell.camera.target); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); fitTags(scene, camera); renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {triangles: renderer.info.render.triangles, calls: renderer.info.render.calls};
}

// Triangle counts per cast id (hero tier with everything attached).
export function budget() {
  const out = {};
  for (const id of [...Object.keys(cast.cast), 'town:3', 'town:8']) out[id] = triangles(actorFor(id, 99).root);
  return out;
}
window.__studio = {render, budget, castIds: Object.keys(cast.cast)};
