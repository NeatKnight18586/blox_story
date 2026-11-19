// campaigns/tapcap/world/world.js — Pass B stills: Slime Town + a TapCap mood, rendered through the engine's post7 chain
// (AO, shafts, DOF, bloom, grade + AgX). window.__w.still({mood, cam, w, h}) → {png, signs: [{text, capFrac, inFrame}], crowd}
import * as T from 'three';
import {build} from './slimetown.js';
import {MOODS_TC} from './moods.js';
import {createPost} from '../../../engine/post7.js';
import {postFor} from '../../../engine/moods7.js';

const R = new T.WebGLRenderer({antialias: false, preserveDrawingBuffer: true}); R.setPixelRatio(1); R.outputColorSpace = T.SRGBColorSpace;
R.toneMapping = T.AgXToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; document.body.appendChild(R.domElement);
const MOODS7 = await (await fetch('../../../engine/moods7.json')).json();
const fovFor = mm => 2 * Math.atan(18 / mm) * 180 / Math.PI;   // vertical 9:16 frame, full-frame 36 mm on the long side

function skyDome(c) {
  const g = new T.SphereGeometry(400, 48, 24), m = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, uniforms: {a: {value: new T.Color(c[0])}, b: {value: new T.Color(c[1])}, h: {value: new T.Color(c[2])}},
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 a, b, h; varying vec3 vp; void main(){ float y = vp.y; vec3 c = y > .08 ? mix(b, a, smoothstep(.08, .6, y)) : mix(h, b, smoothstep(-.05, .08, y)); gl_FragColor = vec4(c, 1.); }'});
  const s = new T.Mesh(g, m); s.name = 'sky'; return s;
}
function envFrom(M) {   // reflections: PMREM of the mood's sky + a sun blob
  const sc = new T.Scene(); sc.add(skyDome(M.sky)); const sun = new T.Mesh(new T.SphereGeometry(18, 16, 12), new T.MeshBasicMaterial({color: new T.Color(M.sun.color).multiplyScalar(2)}));
  sun.position.set(...M.sun.dir.map(v => v * 300)); sc.add(sun); const p = new T.PMREMGenerator(R), t = p.fromScene(sc, .02).texture; p.dispose(); return t;
}
window.__w = {
  async still({mood = 'dawnHope', cam, w = 540, h = 960, t = .4}) {
    const M = MOODS_TC[mood], m7 = MOODS7[M.base], scene = new T.Scene(), W = build({mood, t}); scene.add(W.root); scene.add(skyDome(M.sky));
    scene.environment = envFrom(M); scene.environmentIntensity = m7.env; scene.fog = new T.Fog(M.fog.color, M.fog.near, M.fog.far);
    scene.add(new T.HemisphereLight(M.hemi[0], M.hemi[1], M.hemi[2]));
    const sun = new T.DirectionalLight(M.sun.color, M.sun.i), sd = new T.Vector3(...M.sun.dir).normalize(); sun.position.copy(sd.clone().multiplyScalar(80)).add(new T.Vector3(-6, 0, -8)); sun.target.position.set(-6, 0, -8);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 220}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(M.fill.color, M.fill.i); fill.position.set(30, 25, 40); scene.add(fill);
    const rim = new T.DirectionalLight(M.rim.color, M.rim.i); rim.position.copy(sd.clone().multiplyScalar(-1).setY(.5).multiplyScalar(60)); scene.add(rim);
    const C = W.cameras[cam], camera = new T.PerspectiveCamera(fovFor(C.mm), w / h, .05, 900); camera.position.set(...C.pos); camera.lookAt(...C.look); camera.updateMatrixWorld();
    R.toneMappingExposure = (m7.exposure ?? 1) * M.exposure; R.setSize(w, h, false);
    const P = createPost(R, scene, camera, {samples: 4}); P.setSize(w, h);
    const focus = C.dof ? camera.position.distanceTo(new T.Vector3(...C.look)) : null;
    const S = postFor(m7, {shot: {size: C.dof ? 'close' : 'wide'}, focus}); if (mood === 'rainNight') S.rain = MOODS7[M.rainFrom].rain; S.seed = 3;
    P.render(S, {sunDir: M.sun.dir});
    // sign legibility: projected cap height (signs6 capH × world scale) as a fraction of frame height
    const signs = W.signs.map(s => { s.updateMatrixWorld(true); const k = new T.Vector3().setFromMatrixScale(s.matrixWorld).y, c = s.getWorldPosition(new T.Vector3()), up = new T.Vector3(0, 1, 0);
      const a = c.clone().addScaledVector(up, s.userData.sign.capH * k / 2).project(camera), b = c.clone().addScaledVector(up, -s.userData.sign.capH * k / 2).project(camera);
      const inFrame = Math.abs(a.x) < 1 && Math.abs(a.y) < 1 && a.z < 1 && camera.getWorldDirection(new T.Vector3()).dot(c.clone().sub(camera.position)) > 0;
      return {text: s.userData.sign.text, capFrac: +(Math.abs(a.y - b.y) / 2).toFixed(4), inFrame}; });
    return {png: R.domElement.toDataURL('image/png'), signs, feature: C.feature ?? null, crowd: {n: W.crowd.length, presets: W.crowd.map(c => c.preset), loops: W.crowd.map(c => c.loop)}, tilt: !!C.tilt};
  },
};
window.__ready = true;
