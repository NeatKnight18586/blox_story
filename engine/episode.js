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
import {createLook} from './look.js';
import * as P from '../parts/parts.js';
import * as B from '../parts/build.js';
import * as A from '../parts/ambient.js';
import * as M from '../parts/materials.js';

const q = new URLSearchParams(location.search);
const specUrl = q.get('spec') ? new URL('../' + q.get('spec'), import.meta.url) : new URL(`../stories/${q.get('story')}/episode.json`, import.meta.url);
const spec = await (await fetch(specUrl)).json();
const FPS = spec.fps ?? 30;

// Shots on the frame timeline: each shot owns [start, start + frames).
const shots = []; { let start = 0; for (const s of spec.shots) { shots.push({...s, start, duration: s.frames / FPS}); start += s.frames; } }
const FRAMES = shots.at(-1).start + shots.at(-1).frames;

// ---- Scene: the episode's world.js (Session 3+) or the Session 1 placeholder plate ----
const renderer = new T.WebGLRenderer({antialias: q.get('aa') !== '0', preserveDrawingBuffer: true});
renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(45, 9 / 16, .1, 900);
let world = null, look = null;
if (spec.world) {
  look = createLook(scene, renderer);
  world = (await import(new URL('../' + spec.world, import.meta.url).href)).build(scene, {P, B, A, M});
} else {
  scene.background = new T.Color('#8fc8ff'); scene.fog = new T.Fog('#8fc8ff', 60, 140);
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
}
const anchors = world?.anchors ?? {};
// Anchor-relative vectors: {anchor: 'square', offset: [x, y, z]} → world position.
const resolve = v => (v && !Array.isArray(v) && v.anchor) ? anchors[v.anchor].position.map((x, i) => x + (v.offset?.[i] ?? 0)) : v;
for (const s of shots) {
  if (s.anchor && !s.from) { const c = anchors[s.anchor].camera; s.from = {position: c.position, target: c.target, fov: c.fov}; s.move ??= 'push'; }
  for (const k of ['from', 'to']) if (s[k]) s[k] = {...s[k], position: resolve(s[k].position), target: resolve(s[k].target)};
}

// ---- Cast ----
// Legacy entries (no `style`) use the frozen legacy avatar + legacy samplers. `style: 'v2'` entries
// are v2 actors: `preset` names an entry of `castFile` (or the entry itself is the preset); `keys`
// are timed poses (cross-faded), `faces` timed faces, `origin`/`yaw` the mark, and `travel`
// {dir: [x, z], speed} moves the mark at constant speed (e.g. WALK_SPEED for 'walk').
const presets = spec.castFile ? (await (await fetch(new URL('../' + spec.castFile, import.meta.url))).json()).cast : {};
const cast = {};
for (const [name, c] of Object.entries(spec.cast ?? {})) {
  if (c.at) c.origin = resolve({anchor: c.at, offset: c.offset ?? [0, 0, 0]});
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
  if (look) { look.apply(shot.look ?? spec.look ?? 'day'); look.frame(new T.Vector3(...c.target), camera.position, shot.shadowRadius ?? 34); look.update(t); }
  world?.update(t);
  scene.updateMatrixWorld(true); fitTags(scene, camera);
  renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));   // forces the GPU work to finish, so ms is real
  if (gl.isContextLost()) throw Error('WebGL context lost');
  return {frame: n, shot: shot.id, size: shot.size, triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

// Bench / stills: render a world anchor's establishing camera at time t (no shot needed).
export function renderAnchor(name, t, width = 720, height = 1280, lookName = 'day') {
  const a = anchors[name]; if (!a?.camera) throw Error('no camera on anchor ' + name);
  return {anchor: name, ...renderCamera(a.camera, t, width, height, lookName)};
}
// Any camera {position, target, fov, up?} at time t (lookdev, layout maps, bench).
export function renderCamera(cam, t = 0, width = 720, height = 1280, lookName = 'day') {
  const t0 = performance.now(); renderer.setPixelRatio(1); renderer.setSize(width, height, false); lastSize = '';
  poseCast(t); camera.fov = cam.fov ?? 45; camera.aspect = width / height; camera.position.set(...cam.position); camera.up.set(...(cam.up ?? [0, 1, 0])); camera.lookAt(...cam.target); camera.updateProjectionMatrix();
  if (look) { look.apply(lookName); look.frame(new T.Vector3(...cam.target), camera.position, cam.shadowRadius ?? 34); look.update(t); }
  world?.update(t); scene.updateMatrixWorld(true); fitTags(scene, camera); renderer.render(scene, camera);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return {triangles: frustumTriangles(), drawnTriangles: renderer.info.render.triangles, calls: renderer.info.render.calls, ms: performance.now() - t0};
}

window.__episode = {anchors: Object.fromEntries(Object.entries(anchors).filter(([, a]) => a.camera).map(([k]) => [k, true])), renderAnchor, renderCamera, FPS, FRAMES, shots: shots.map(({id, start, frames, size, move}) => ({id, start, frames, size, move})), renderFrame};
