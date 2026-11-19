// campaigns/tapcap/assets/lookdev.js — Pass A lookdev page: renders one panel per call (PNG data URL) or the flat ID buffer
// for the measured proportion check. Driven by campaigns/tapcap/scripts/pass-a.js.
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {CopyShader} from 'three/addons/shaders/CopyShader.js';
import {createSlimeGuy, paintPool} from './slimeguy/index.js';
import {createClix, CLIX, clixHairGeometries, hairMeasure} from './clix/index.js';

const mk = aa => { const r = new T.WebGLRenderer({antialias: aa, preserveDrawingBuffer: true}); r.setPixelRatio(1); r.outputColorSpace = T.SRGBColorSpace; document.body.appendChild(r.domElement); return r; };
const RB = mk(true), RF = mk(false);
RB.toneMapping = T.NeutralToneMapping; RB.toneMappingExposure = .92; RB.shadowMap.enabled = true; RB.shadowMap.type = T.PCFShadowMap;
const pmrem = new T.PMREMGenerator(RB), ENV = pmrem.fromScene(new RoomEnvironment(), .04).texture;

function lights(scene, {target = new T.Vector3(0, .5, 0), scale = 1} = {}) {
  scene.add(new T.HemisphereLight('#ffffff', '#c9c2b8', .55));
  const key = new T.DirectionalLight('#fff6ec', 2.4); key.position.set(1.4 * scale, 2.6 * scale, 2.2 * scale); key.target.position.copy(target); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, {left: -scale, right: scale, top: scale, bottom: -scale, near: .1, far: 10 * scale}); key.shadow.bias = -.0005; key.shadow.normalBias = .01;
  scene.add(key, key.target);
  for (const [x, y, z, i, c] of [[-1.8, 1.4, -2, 2.6, '#e8f0ff'], [1.9, 1.1, -1.8, 2.2, '#fff1e2'], [-2, .6, 1, .6, '#dfe8ff']]) { const l = new T.DirectionalLight(c, i); l.position.set(x * scale, y * scale, z * scale); l.target.position.copy(target); scene.add(l, l.target); }
}
const VIEWS = {front: [0, 0, 1], back: [0, 0, -1], left: [-1, 0, 0], right: [1, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0]};

function slimeScene(o) {
  const scene = new T.Scene(), sg = createSlimeGuy({preset: o.preset, paint: o.paint, run: o.run ?? 0, face: o.face ?? 'default', flat: !!o.flat, flatMask: !!o.flatMask});
  scene.add(sg.root); if (o.tap) sg.setTap(o.tap);
  if (!o.flat) { scene.background = new T.Color(o.bg ?? '#E6E9F0'); scene.environment = ENV; lights(scene);
    const catcher = new T.Mesh(new T.PlaneGeometry(6, 6), new T.ShadowMaterial({opacity: .2})); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; if (!['top', 'bottom'].includes(o.view)) scene.add(catcher);
    if (o.pool) scene.add(paintPool(o.paint, o.pool)); }
  else scene.background = new T.Color('#ffffff');
  return {scene, sg};
}
function camFor(o, w, h) {
  const asp = w / h;
  if (o.ortho) { const v = VIEWS[o.view ?? 'front'], vert = Math.abs(v[1]) > .5, span = o.span ?? (vert ? .62 : 1.1);
    const c = new T.OrthographicCamera(-span * asp / 2, span * asp / 2, span / 2, -span / 2, .01, 20);
    if (vert) c.up.set(0, 0, v[1] > 0 ? -1 : 1);
    c.position.set(v[0] * 5, .5 + v[1] * 5, v[2] * 5); c.lookAt(0, .5, 0); c.updateProjectionMatrix(); return c; }
  const c = new T.PerspectiveCamera(o.fov ?? 26, asp, .01, 50), [az, el, dist] = o.orbit ?? [28, 8, 2.9], a = az * Math.PI / 180, e = el * Math.PI / 180, t = new T.Vector3(...(o.target ?? [0, .5, 0]));
  c.position.set(t.x + Math.sin(a) * Math.cos(e) * dist, t.y + Math.sin(e) * dist, t.z + Math.cos(a) * Math.cos(e) * dist); c.lookAt(t); return c;
}
export const BLOOM = {threshold: .85, strength: .25, radius: .4};   // Pass A revision §3
function shot(renderer, scene, cam, w, h, {bloom = false} = {}) {   // bloom: applied after render by scripts/bloom.py (display-referred)
 renderer.setSize(w, h, false);
  if (!bloom) { renderer.render(scene, cam); return renderer.domElement.toDataURL('image/png'); }
  const c = new EffectComposer(renderer); c.setPixelRatio(1); c.setSize(w, h); c.addPass(new RenderPass(scene, cam));
  c.addPass(new OutputPass());   // tone map + sRGB first: the 0.85 bloom threshold applies to display values (highlights, glints), not linear HDR
  c.addPass(new UnrealBloomPass(new T.Vector2(w, h), BLOOM.strength, BLOOM.radius, BLOOM.threshold)); c.addPass(new ShaderPass(CopyShader)); c.render(); c.dispose();
  return renderer.domElement.toDataURL('image/png'); }

window.__ld = {
  slime(o) { const w = o.w ?? 360, h = o.h ?? 480, {scene, sg} = slimeScene(o);
    if (o.target === 'fleck') { const f = sg.fleck; o = {...o, target: [f.x, f.y + .015, f.z], orbit: [Math.atan2(f.x, f.z) * 180 / Math.PI, 6, o.dist ?? .45]}; }
    const cam = camFor(o, w, h);
    if (o.flat) { RF.setSize(w, h, false); RF.render(scene, cam); const gl = RF.getContext(), buf = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192)); return {b64: btoa(s), w, h, span: o.span ?? 1.1}; }
    if (o.flatMask) { scene.background = new T.Color('#ffffff'); return {png: shot(RB, scene, cam, w, h, {bloom: false}), drips: sg.drips}; }
    return {png: shot(RB, scene, cam, w, h), drips: sg.drips}; },
  clix(o) { const w = o.w ?? 300, h = o.h ?? 420, scene = new T.Scene(); scene.background = new T.Color('#8FA3B8'); /* mid sky grey-blue: the white coat must read */ scene.environment = ENV; lights(scene, {target: new T.Vector3(0, 20, 0), scale: 40});
    const c = createClix({face: o.face}); c.root.rotation.y = (o.az ?? 0) * Math.PI / 180; scene.add(c.root);
    const cam = o.head ? camFor({orbit: [0, 3, 30], target: [0, 4.68 * c.clix.scale, 0], fov: 30}, w, h)
      : (() => { const span = 50, asp = w / h, k = new T.OrthographicCamera(-span * asp / 2, span * asp / 2, span / 2, -span / 2, .1, 400); k.position.set(0, 20.5, 150); k.lookAt(0, 20.5, 0); k.updateProjectionMatrix(); return k; })();
    const maps = [], colours = new Set(); c.root.traverse(n => { if (!n.material) return; for (const m of [n.material].flat()) { if (m.map) maps.push(`${n.name}:${m.name || m.type}`); if (m.color) colours.add('#' + m.color.getHexString()); } });
    return {png: shot(RB, scene, cam, w, h), hair: hairMeasure(clixHairGeometries()), audit: {texturedMeshes: [...new Set(maps)], colours: [...colours].sort()}}; },
  clixTap(o) { const w = o.w ?? 300, h = o.h ?? 420, scene = new T.Scene(); scene.background = new T.Color('#E6E9F0'); scene.environment = ENV; lights(scene, {target: new T.Vector3(0, 1, 0), scale: 6});
    const sg = createSlimeGuy({preset: 'banana', face: 'gasp'}); sg.setTap(-(o.press ?? .03)); scene.add(sg.root);
    scene.background = new T.Color('#8FA3B8');
    const c = createClix({face: 'grin'}); c.root.rotation.x = Math.PI / 2; c.pivots.rightShoulder.rotation.x = -Math.PI / 2;   // giant over the town, face down, right arm straight down
    scene.add(c.root); c.root.updateMatrixWorld(true);
    const arm = new T.Box3().setFromObject(c.parts.rightArm), ctr = arm.getCenter(new T.Vector3());
    let headTop = 0; sg.keycap.updateMatrixWorld(true); headTop = new T.Box3().setFromObject(sg.keycap).max.y;
    c.root.position.add(new T.Vector3(-ctr.x, headTop - arm.min.y, -ctr.z)); c.root.updateMatrixWorld(true);
    const end = new T.Box3().setFromObject(c.parts.rightArm);
    const catcher = new T.Mesh(new T.PlaneGeometry(80, 80), new T.ShadowMaterial({opacity: .2})); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
    return {png: shot(RB, scene, camFor({orbit: o.orbit ?? [35, -1.5, o.dist ?? 20], target: o.target ?? [0, 1.4, 0], fov: o.fov ?? 40}, w, h), w, h),
      contact: {armBottom: +end.min.y.toFixed(4), slimeHeadTop: +headTop.toFixed(4), armEndWidthH: +(end.max.x - end.min.x).toFixed(3)}}; },
};
