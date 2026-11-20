// campaigns/tapcap/world/world.js — Pass B (revision) page. window.__w:
//   setup({mood, cams, seed}) builds Slime Town once for a mood (fonts first: the captions' Lilita One file)
//   still({cam, w, h}) → {png, ms, signs}: post7 beauty (AO, shafts, DOF, bloom, grade + AgX)
//   raw({cam, w, h}) → {voidPx, ms}: no post, clear colour = sentinel magenta (B2: any sentinel pixel = void)
//   ids({cam, w, h, kind: 'layers' | 'buildings' | 'plinth'}) → flat-ID RGBA (base64) for the measured passes
import * as T from 'three';
import {build} from './slimetown.js';
import {MOODS_TC, SKY_EV} from './moods.js';
import {resolveCam, fovFor} from './town.js';
import {createPost} from '../../../engine/post7.js';
import {postFor} from '../../../engine/moods7.js';

const FONT_URL = '../../../node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf';
const R = new T.WebGLRenderer({antialias: false, preserveDrawingBuffer: true}); R.setPixelRatio(1); R.outputColorSpace = T.SRGBColorSpace;
R.toneMapping = T.AgXToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; document.body.appendChild(R.domElement);
const MOODS7 = await (await fetch('../../../engine/moods7.json')).json();
const font = new FontFace('Lilita One', `url(${FONT_URL})`); await font.load(); document.fonts.add(font);
let W = null, scene = null, mood = null;

function skyDome(c) {   // zenith → horizon gradient, sky-only exposure SKY_EV
  const k = Math.pow(2, SKY_EV), g = new T.SphereGeometry(420, 48, 24), m = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {a: {value: new T.Color(c[0]).multiplyScalar(k)}, b: {value: new T.Color(c[1]).multiplyScalar(k)}, h: {value: new T.Color(c[2]).multiplyScalar(k)}},
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 a, b, h; varying vec3 vp; void main(){ float y = vp.y; vec3 c = y > .02 ? mix(b, a, smoothstep(.02, .55, y)) : mix(h, b, smoothstep(-.05, .02, y)); gl_FragColor = vec4(c, 1.); }'});
  const s = new T.Mesh(g, m); s.name = 'sky'; s.userData.layer = 'sky'; return s;
}
function envFrom(M) { const sc = new T.Scene(); sc.add(skyDome(M.sky)); const sun = new T.Mesh(new T.SphereGeometry(18, 16, 12), new T.MeshBasicMaterial({color: new T.Color(M.sun.color).multiplyScalar(2)}));
  sun.position.set(...M.sun.dir.map(v => v * 300)); sc.add(sun); const p = new T.PMREMGenerator(R), t = p.fromScene(sc, .02).texture; p.dispose(); return t; }
const camOf = (c, w, h) => { const r = resolveCam(c), k = new T.PerspectiveCamera(fovFor(r.mm) * 180 / Math.PI, w / h, .05, 1000); k.position.set(...r.pos); k.lookAt(...r.look); k.updateMatrixWorld(); k.updateProjectionMatrix(); return k; };
function farSplit(near, far, d = 25) {   // flat colour, switched to the background colour beyond d (view distance)
  const m = new T.MeshBasicMaterial({color: near}); m.onBeforeCompile = s => { s.uniforms.uFar = {value: new T.Color(far)}; s.uniforms.uD = {value: d};
    s.vertexShader = 'varying float vD;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvD = length(mvPosition.xyz);');
    s.fragmentShader = 'varying float vD; uniform vec3 uFar; uniform float uD;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (vD > uD) diffuseColor.rgb = uFar;'); };
  m.customProgramCacheKey = () => 'farSplit' + d; return m; }
const pixels = (w, h) => { const gl = R.getContext(), b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); };

window.__w = {
  async setup({mood: md, cams, seed = 1102, cloudGap = null}) {
    mood = md; const M = MOODS_TC[md], m7 = MOODS7[M.base]; scene = new T.Scene(); W = build({mood: md, cams, seed, cloudGap}); scene.add(W.root); scene.add(skyDome(M.sky));
    scene.environment = envFrom(M); scene.environmentIntensity = m7.env; scene.fog = new T.Fog(M.fog.color, M.fog.near, M.fog.far);
    scene.add(new T.HemisphereLight(M.hemi[0], M.hemi[1], M.hemi[2]));
    const sun = new T.DirectionalLight(M.sun.color, M.sun.i), sd = new T.Vector3(...M.sun.dir).normalize(); sun.position.copy(sd.clone().multiplyScalar(90)).add(new T.Vector3(-4, 0, 4)); sun.target.position.set(-4, 0, 4);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 240}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(M.fill.color, M.fill.i); fill.position.set(30, 25, 40); scene.add(fill);
    const rim = new T.DirectionalLight(M.rim.color, M.rim.i); rim.position.copy(sd.clone().multiplyScalar(-1).setY(.5).multiplyScalar(60)); scene.add(rim);
    return {counts: W.plan.counts, crowd: {n: W.crowd.length, presets: W.crowd.map(c => c.preset), loops: W.crowd.map(c => c.loop)}, font: {loaded: document.fonts.check(`100px "Lilita One"`), file: FONT_URL},
      text: (() => { const t = []; scene.traverse(n => { const m = n.material; for (const x of [m].flat()) if (x?.map?.image?.tagName === 'CANVAS') t.push(n.userData.sign ? 'sign:' + n.userData.sign.text : x.map.userData?.stripes ? 'awning stripes (no text)' : n.name === 'print' ? 'TapCap chest print (product art)' : (n.name || 'canvas')); }); return t; })()};
  },
  still({cam, w = 540, h = 960, dof = false}) {
    const M = MOODS_TC[mood], m7 = MOODS7[M.base], k = camOf(cam, w, h), t0 = performance.now();
    R.toneMappingExposure = (m7.exposure ?? 1) * M.exposure; R.setSize(w, h, false);
    const P = createPost(R, scene, k, {samples: 4}); P.setSize(w, h); const r = resolveCam(cam);
    const S = postFor(m7, {shot: {size: dof ? 'close' : 'wide'}, focus: dof ? Math.hypot(...r.pos.map((v, i) => v - r.look[i])) : null}); if (mood === 'rainNight') S.rain = MOODS7[M.rainFrom].rain; S.seed = 3;
    P.render(S, {sunDir: M.sun.dir}); const png = R.domElement.toDataURL('image/png');
    const signs = W.signs.map(s => { s.updateMatrixWorld(true); const sc = new T.Vector3().setFromMatrixScale(s.matrixWorld).y, c = s.getWorldPosition(new T.Vector3());
      const a = c.clone().add(new T.Vector3(0, s.userData.sign.capH * sc / 2, 0)).project(k), b = c.clone().add(new T.Vector3(0, -s.userData.sign.capH * sc / 2, 0)).project(k);
      return {text: s.userData.sign.text, capFrac: +(Math.abs(a.y - b.y) / 2).toFixed(4), inFrame: Math.abs(a.x) < 1 && Math.abs(a.y) < 1 && a.z < 1 && a.z > -1}; });
    return {png, ms: Math.round(performance.now() - t0), signs};
  },
  raw({cam, w = 160, h = 284}) {   // B2: sky dome on, no post; void = clear-colour (sentinel) pixels
    const k = camOf(cam, w, h), t0 = performance.now(); R.setSize(w, h, false); R.setClearColor('#ff00ff', 1); const tm = R.toneMapping; R.toneMapping = T.NoToneMapping;
    R.render(scene, k); const gl = R.getContext(), b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); R.toneMapping = tm; R.setClearColor('#000000', 1);
    let v = 0; for (let i = 0; i < b.length; i += 4) if (b[i] === 255 && b[i + 1] === 0 && b[i + 2] === 255) v++;
    return {voidPx: v, ms: Math.round(performance.now() - t0), png: R.domElement.toDataURL('image/png')};
  },
  ids({cam, w = 270, h = 480, kind = 'layers'}) {
    const k = camOf(cam, w, h), rc = resolveCam(cam), split = Math.max(25, Math.hypot(...rc.pos.map((v, i) => v - rc.look[i]))), LC = {fg: '#ff0000', mid: '#00ff00', bg: '#0000ff', far: '#ffff00'}, saved = [], basic = c => new T.MeshBasicMaterial({color: c});
    const enc = id => new T.Color(((id + 1) & 255) / 255, (((id + 1) >> 8) & 255) / 255, 1);
    scene.traverse(n => { if (!(n.isMesh || n.isPoints || n.isLine)) return; const L = n.userData.layer;
      saved.push([n, n.material, n.visible, n.instanceColor ?? null]);
      if (n.userData.fx || n.isPoints || n.isLine || n.name === 'sky' || (n.material?.transparent && L === 'far' && !n.isInstancedMesh && n.geometry.type === 'CylinderGeometry')) { n.visible = false; return; }
      if (kind === 'layers') { n.material = L === 'mid' ? farSplit(LC.mid, LC.bg, split) : basic(LC[L] ?? '#00ff00'); if (n.isInstancedMesh) n.instanceColor = null; }
      else if (kind === 'plinth') { n.material = basic(n.userData.plinth ? '#ffffff' : '#000000'); if (n.isInstancedMesh) n.instanceColor = null; }
      else { if (n.isInstancedMesh && n.userData.buildingIds) { const ids = n.userData.buildingIds; n.instanceColor = new T.InstancedBufferAttribute(new Float32Array(ids.length * 3), 3); ids.forEach((id, i) => n.setColorAt(i, enc(id))); n.material = basic('#ffffff'); }
        else { n.material = basic('#000000'); if (n.isInstancedMesh) n.instanceColor = null; } } });
    const fog = scene.fog, bg = scene.background; scene.fog = null; R.setSize(w, h, false); R.setClearColor('#000000', 1); const tm = R.toneMapping, cs = R.outputColorSpace; R.toneMapping = T.NoToneMapping; R.outputColorSpace = T.LinearSRGBColorSpace;
    R.render(scene, k); const px = pixels(w, h); R.toneMapping = tm; R.outputColorSpace = cs; scene.fog = fog;
    for (const [n, m, v, ic] of saved) { n.material = m; n.visible = v; if (n.isInstancedMesh) n.instanceColor = ic; }
    const f = new T.Vector3().subVectors(new T.Vector3(...resolveCam(cam).look), k.position).setY(0).normalize(), hz = k.position.clone().addScaledVector(f, 2000).project(k);   // horizon row
    const ids = kind === 'buildings' ? W.plan.buildings.map(b => ({id: b.id, arch: b.arch, color: b.color})) : null;
    return {b64: px, w, h, horizonY: +(hz.y).toFixed(4), ids};
  },
};
window.__ready = true;
