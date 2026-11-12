// engine/episode.js — story-agnostic v2 renderer (docs/V2_BRIEF.md §5.1).
// Everything arrives as data (episode.json); renderFrame(n) is a pure function of n: no clock, no
// requestAnimationFrame, no unseeded randomness. Session 1: one legacy avatar on a ground plate;
// cast, worlds (world.js), faces, effects and overlays plug in from later sessions.
import * as T from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction, applyActionSample} from '../avatar/actions.js';
import {sampleCamera} from './camera.js';
import {buildActor, driveActor, townsperson} from './actors.js';
import {loadFont, fitTags} from './overhead.js';

const q = new URLSearchParams(location.search);
const specUrl = q.get('spec') ? new URL('../' + q.get('spec'), import.meta.url) : new URL(`../stories/${q.get('story')}/episode.json`, import.meta.url);
const spec = await (await fetch(specUrl)).json();
const FPS = spec.fps ?? 30;

// Shots on the frame timeline: each shot owns [start, start + frames).
const shots = []; { let start = 0; for (const s of spec.shots) { shots.push({...s, start, duration: s.frames / FPS}); start += s.frames; } }
const FRAMES = shots.at(-1).start + shots.at(-1).frames;

// ---- Scene (Session 1 placeholder world: ground plate + scale markers so camera moves read) ----
const renderer = new T.WebGLRenderer({antialias: q.get('aa') !== '0', preserveDrawingBuffer: true});
renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#8fc8ff'); scene.fog = new T.Fog('#8fc8ff', 60, 140);
const camera = new T.PerspectiveCamera(45, 9 / 16, .1, 400);
scene.add(new T.HemisphereLight('#dfefff', '#6b8f4e', 1.1));
const sun = new T.DirectionalLight('#fff3dc', 2.4); sun.position.set(14, 26, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80}); scene.add(sun);
const phong = c => new T.MeshPhongMaterial({color: c, shininess: 35, specular: '#333333'});
const plate = new T.Mesh(new T.BoxGeometry(40, .4, 40), phong('#7cc36a')); plate.position.y = -.2; plate.receiveShadow = true; scene.add(plate);
const palette = ['#e4574a', '#f2b632', '#2f80d1', '#9b59b6', '#1fb5a8', '#ff7aa8'];
for (let i = 0; i < 12; i++) {            // a ring of coloured posts: parallax for every camera move
  const a = i / 12 * Math.PI * 2, h = 2 + (i % 3) * 1.5, m = new T.Mesh(new T.BoxGeometry(1.2, h, 1.2), phong(palette[i % palette.length]));
  m.position.set(Math.sin(a) * 11, h / 2, Math.cos(a) * 11); m.castShadow = m.receiveShadow = true; scene.add(m);
}

// ---- Cast ----
// Legacy entries (no `style`) use the frozen legacy avatar + legacy samplers. `style: 'v2'` entries
// are v2 actors: `preset` names an entry of `castFile` (or the entry itself is the preset); `keys`
// are timed poses (cross-faded), `faces` timed faces, `origin`/`yaw` the mark, and `travel`
// {dir: [x, z], speed} moves the mark at constant speed (e.g. WALK_SPEED for 'walk').
const presets = spec.castFile ? (await (await fetch(new URL('../' + spec.castFile, import.meta.url))).json()).cast : {};
const cast = {};
for (const [name, c] of Object.entries(spec.cast ?? {})) {
  if (c.style === 'v2') { const a = buildActor(c.town ? townsperson(c.town) : c.preset ? {...presets[c.preset], ...(c.with ?? {})} : c, name); scene.add(a.root); cast[name] = {a, c, v2: true}; }
  else { const a = createBaseAvatar({color: c.color ?? 0xf2c94c}); scene.add(a.root); cast[name] = {a, c}; }
}
if (Object.values(cast).some(x => x.v2)) await loadFont();
function poseCast(t) {
  const out = {};
  for (const [name, {a, c, v2}] of Object.entries(cast)) {
    const yaw = (c.yaw ?? 0) * Math.PI / 180;
    if (v2) {
      const o = c.origin ?? [0, 0, 0], tr = c.travel, d = tr ? tr.speed * t : 0;
      driveActor(a, t, {keys: c.keys ?? [[0, c.action ?? 'idle']], faces: c.faces, ambient: !!c.ambient,
        origin: {position: tr ? [o[0] + tr.dir[0] * d, o[1], o[2] + tr.dir[1] * d] : o, yaw}});
    } else {
      const s = sampleAction(c.action ?? 'idle', t, c.action === 'walk' ? {gait: c.gait ?? 'readable'} : {});
      applyActionSample(a, s, {position: c.origin ?? [0, 0, 0], yaw});
    }
    out[name] = a.root.position.toArray();
  }
  return out;
}

// Triangles of visible meshes whose bounds touch the camera frustum (the brief's §5.4 budget). The
// renderer's own counter also includes the shadow pass, so both are reported.
const frustum = new T.Frustum(), pv = new T.Matrix4(), sphere = new T.Sphere();
function frustumTriangles() {
  pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
  let n = 0;
  scene.traverseVisible(o => {
    if (!o.isMesh) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    sphere.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); if (!frustum.intersectsSphere(sphere)) return;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
  });
  return n;
}

let lastSize = '';
export function renderFrame(n, width = 720, height = 1280) {
  if (!Number.isInteger(n) || n < 0 || n >= FRAMES) throw Error(`frame out of range: ${n}`);
  const t0 = performance.now();
  if (lastSize !== `${width}x${height}`) { renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = `${width}x${height}`; }
  const shot = shots.findLast(s => n >= s.start), t = n / FPS;
  const actors = poseCast(t);
  const c = sampleCamera({...shot, fps: FPS}, (n - shot.start) / FPS, actors);
  camera.fov = c.fov; camera.aspect = width / height; camera.position.fromArray(c.position);
  camera.up.set(0, 1, 0); camera.lookAt(...c.target); camera.rotateZ(c.roll); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true); fitTags(scene, camera);
  renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // forces the GPU work to finish, so ms is real
  if (gl.isContextLost()) throw Error('WebGL context lost');
  return {frame: n, shot: shot.id, size: shot.size, triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

window.__episode = {FPS, FRAMES, shots: shots.map(({id, start, frames, size, move}) => ({id, start, frames, size, move})), renderFrame};
