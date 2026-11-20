// campaigns/tapcap/previz/previz.js — Pass C blocking previz page. window.__p:
//   setup({mood, cams, shots, seed}) builds Slime Town once for a mood; frame({id, u|frame, w, h, post}) poses the shot and renders it;
//   ids({id, u, w, h, kind}) flat-ID passes ('layers' | 'buildings' | 'hill' | 'slime' | 'void'); clixInfo().
import * as T from 'three';
import {build} from '../world/slimetown.js';
import {MOODS_TC, SKY_EV} from '../world/moods.js';
import {fovFor, pathPoints, hillY} from '../world/town.js';
import {createSlimeGuy, paintPool} from '../assets/slimeguy/index.js';
import {createClix} from '../assets/clix/index.js';
import {tapOffset} from '../../../engine/tapcap.js';
import {createPost} from '../../../engine/post7.js';
import {postFor} from '../../../engine/moods7.js';
import {sampleCam} from './blocking.js';

const FONT = '../../../node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf';
const R = new T.WebGLRenderer({antialias: false, preserveDrawingBuffer: true}); R.setPixelRatio(1); R.outputColorSpace = T.SRGBColorSpace;
R.toneMapping = T.AgXToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; document.body.appendChild(R.domElement);
const MOODS7 = await (await fetch('../../../engine/moods7.json')).json();
const f = new FontFace('Lilita One', `url(${FONT})`); await f.load(); document.fonts.add(f);
let S = null;   // {scene, W, mood, M, m7, sky, shots, cast: Group, clix}

function skyDome(c) { const k = Math.pow(2, SKY_EV), m = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {a: {value: new T.Color(c[0]).multiplyScalar(k)}, b: {value: new T.Color(c[1]).multiplyScalar(k)}, h: {value: new T.Color(c[2]).multiplyScalar(k)}},
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 a, b, h; varying vec3 vp; void main(){ float y = vp.y; vec3 c = y > .02 ? mix(b, a, smoothstep(.02, .55, y)) : mix(h, b, smoothstep(-.05, .02, y)); gl_FragColor = vec4(c, 1.); }'});
  const s = new T.Mesh(new T.SphereGeometry(420, 48, 24), m); s.name = 'sky'; return s; }
function envFrom(M) { const sc = new T.Scene(); sc.add(skyDome(M.sky)); const sun = new T.Mesh(new T.SphereGeometry(18, 16, 12), new T.MeshBasicMaterial({color: new T.Color(M.sun.color).multiplyScalar(2)}));
  sun.position.set(...M.sun.dir.map(v => v * 300)); sc.add(sun); const p = new T.PMREMGenerator(R), t = p.fromScene(sc, .02).texture; p.dispose(); return t; }
const camOf = (c, w, h) => { const k = new T.PerspectiveCamera(fovFor(c.mm) * 180 / Math.PI, w / h, .03, 1000); k.position.set(...c.pos); k.lookAt(...c.look); k.updateMatrixWorld(); k.updateProjectionMatrix(); return k; };

// ---------- cast ----------
const guyCache = new Map();
function guy(c) {   // banana / sunny with preset, paint, run, face
  const preset = c.preset ?? (c.who === 'banana' ? 'banana' : 'cosmic'), paint = c.preset === 'cosmic' && !c.paint ? null : (c.paint ?? (c.who === 'sunny' ? 'fake_banana' : null));
  const key = [c.who, preset, paint, c.run ?? 0, c.face ?? 'default'].join('|');
  if (!guyCache.has(key)) { const g = createSlimeGuy({preset, paint, run: c.run ?? 0, face: c.face ?? 'default'}); g.root.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; } n.userData.slime = true; n.userData.layer = 'fg'; }); guyCache.set(key, g); }
  return guyCache.get(key);
}
function placeCast(shot, frame, camPos) {
  S.cast.clear(); const placed = [];
  for (let c of shot.cast ?? []) {
    const g = guy(c); let at = c.at ? [...c.at] : null, dy = 0;
    if (c.path) { const pts = pathPoints(), u = frame / Math.max(1, shot.frames - 1), t = c.path[0] + (c.path[1] - c.path[0]) * u, p = pts[Math.round(t * (pts.length - 1))]; at = [p[0], p[1], p[2]];
      if (c.hop) dy = .35 * Math.abs(Math.sin(u * Math.PI * 5)); }
    if (at[1] === 0) at[1] = hillY(at[0], at[2]);
    g.root.position.set(at[0], at[1] + dy, at[2]); g.root.rotation.set(0, c.yaw ?? Math.atan2(camPos[0] - at[0], camPos[2] - at[2]), 0);
    g.setTap(c.tapStart !== undefined ? tapOffset(shot.f0 + frame - c.tapStart) : 0); S.cast.add(g.root); placed.push({c, g, at});
    if (c.pool) { const p = paintPool(g.root.userData.paint, c.pool); p.position.set(at[0], at[1] + .01, at[2]); S.cast.add(p); }
    if (S.mood === 'rainNight' && ['banana', 'sunny'].includes(c.who)) { const k = new T.SpotLight('#E8EEFF', 3, 6, .45, .6, 1.2), v = new T.Vector3(camPos[0] - at[0], 0, camPos[2] - at[2]).normalize().applyAxisAngle(new T.Vector3(0, 1, 0), .5);   /* D3: soft front key so the cast separates in the rain */
      k.position.set(at[0] + v.x * 2.2, at[1] + 1.4, at[2] + v.z * 2.2); k.target.position.set(at[0], at[1] + .55, at[2]); S.cast.add(k, k.target); c = {...c, rim: true}; }
    if (c.rim) { const l = new T.SpotLight('#9EC2FF', 14, 6, .5, .5, 1.2), d = new T.Vector3(at[0] - camPos[0], 0, at[2] - camPos[2]).normalize(); l.position.set(at[0] + d.x * 1.6, at[1] + 1.5, at[2] + d.z * 1.6); l.target.position.set(at[0], at[1] + .5, at[2]); S.cast.add(l, l.target); }
  }
  for (const p of shot.props ?? []) {
    if (p.lamp) { const g = new T.Group(), post = new T.Mesh(new T.CylinderGeometry(.06, .08, 2.4, 10), new T.MeshStandardMaterial({color: '#3E4552', roughness: .4, metalness: .5})); post.position.y = 1.2; g.add(post);
      const bulb = new T.Mesh(new T.SphereGeometry(.2, 14, 10), new T.MeshStandardMaterial({color: '#FFF1D6', emissive: '#FFD9A0', emissiveIntensity: 2.5})); bulb.position.y = 2.5; g.add(bulb);
      g.position.set(p.lamp[0], hillY(p.lamp[0], p.lamp[1]), p.lamp[1]); g.traverse(n => { n.userData.layer = 'fg'; }); S.cast.add(g); continue; }   /* a single foreground lamp (S33) */
    if (p === 'pots') ['#7B3FD0', '#FF8A2A', '#2F7BEA'].forEach((col, i) => { const pot = new T.Mesh(new T.CylinderGeometry(.13, .11, .2, 20), new T.MeshPhysicalMaterial({color: '#EDE6DA', roughness: .4}));
      const paint = new T.Mesh(new T.CircleGeometry(.115, 20), new T.MeshStandardMaterial({color: col, roughness: .6})); paint.rotation.x = -Math.PI / 2; paint.position.y = .095; pot.add(paint);
      pot.position.set(-.55 + i * .3, .1, -1.05 + (i % 2) * .12); pot.traverse(n => { n.userData.layer = 'fg'; }); S.cast.add(pot); });
    if (p === 'puddle') { const pd = new T.Mesh(new T.CircleGeometry(.7, 40), new T.MeshPhysicalMaterial({color: '#1E2430', roughness: .02, metalness: .2, clearcoat: 1})); pd.rotation.x = -Math.PI / 2; pd.position.set(0, .02, -1.6); pd.userData.layer = 'fg'; S.cast.add(pd); }
  }
  // the crowd: hide members standing where the cast stands; S25 brings 12 of them to the hill base
  S.W.crowd.forEach((m, i) => { if (!m.object) return; m.object.visible = !placed.some(p => Math.hypot(p.at[0] - m.x, p.at[2] - m.z) < .8) && (!camPos || Math.hypot(camPos[0] - m.x, camPos[2] - m.z) > 1.2);   /* lens clearance for the crowd */
    const hb = shot.crowd === 'hillbase' && i >= 12 && i < 24; m.object.position.x = hb ? -15.6 - (i % 4) * 1.1 : m.x; m.object.position.z = hb ? -5.2 - Math.floor((i - 12) / 4) * 1.2 - (i % 2) * .4 : m.z;
    if (hb) m.object.rotation.y = Math.atan2(-24 - m.object.position.x, -16 - m.object.position.z); });
  return placed;
}
// ---------- Clix ----------
function placeClix(shot, frame, placed, cam) {
  const C = S.clix, mode = shot.clix?.mode; C.root.visible = !!mode; if (!mode) return null;
  const u = frame / Math.max(1, shot.frames - 1); C.root.rotation.set(0, 0, 0); for (const p of Object.values(C.pivots)) p.rotation.set(0, 0, 0);
  C.root.traverse(n => { if (n.isMesh) n.visible = true; });
  if (mode === 'arm' || mode === 'arms2') {   // giant over the town, face down; the blue arm end(s) straight down; arm-only for S18–S21
    C.root.rotation.x = Math.PI / 2; C.pivots.rightShoulder.rotation.x = -Math.PI / 2; if (mode === 'arms2') C.pivots.leftShoulder.rotation.x = -Math.PI / 2;
    if (mode === 'arm') C.root.traverse(n => { if (n.isMesh) n.visible = false; }), C.parts.rightArm.traverse(n => { if (n.isMesh) n.visible = true; });
    C.root.position.set(0, 0, 0); C.root.updateMatrixWorld(true);
    const arm = new T.Box3().setFromObject(mode === 'arms2' ? C.root : C.parts.rightArm), ctr = arm.getCenter(new T.Vector3());
    let target;
    if (shot.clix.press !== undefined) { const who = shot.clix.onto ?? 'banana', p = placed.find(x => x.c.who === who) ?? placed[0]; const head = new T.Box3().setFromObject(p.g.keycap).max.y; target = [p.at[0], head, p.at[2]]; }
    else if (shot.clix.endY) { const PTy = placed[0]?.at[1] ?? 10; target = [(placed[0].at[0] + placed[1].at[0]) / 2, PTy + shot.clix.endY[0] + (shot.clix.endY[1] - shot.clix.endY[0]) * u, (placed[0].at[2] + placed[1].at[2]) / 2]; }
    else { const e = shot.clix.end, e2 = shot.clix.endTo ?? e; target = e.map((v, i) => v + (e2[i] - v) * u); }
    C.root.position.set(target[0] - ctr.x, target[1] - arm.min.y, target[2] - ctr.z); C.root.updateMatrixWorld(true); return null;
  }
  // reveal: upright giant beyond the parted clouds, centred in the S36 frame, facing the camera
  const s36 = S.shots.find(s => s.id === 'S36a'), c0 = sampleCam(s36, 1), d = c0.look.map((v, i) => v - c0.pos[i]), l = Math.hypot(d[0], d[2]);
  const headH = 4.63 * C.clix.scale, f = new T.Vector3(...d).normalize(), r = new T.Vector3().crossVectors(f, new T.Vector3(0, 1, 0)).normalize(), up = new T.Vector3().crossVectors(r, f);
  const tv = Math.tan(fovFor(c0.mm) / 2), hp = new T.Vector3(...c0.pos).addScaledVector(f.clone().addScaledVector(up, .3 * tv).normalize(), 55);   /* D4: head on the ray 30 % above frame centre */
  const at = [hp.x, 0, hp.z]; C.root.position.set(at[0], hp.y - headH, at[2]); C.root.rotation.y = Math.atan2(c0.pos[0] - at[0], c0.pos[2] - at[2]);
  C.pivots.rightShoulder.rotation.x = C.pivots.leftShoulder.rotation.x = -1.0; C.root.updateMatrixWorld(true);
  const head = [hp.x, hp.y, hp.z], fwd = [-d[0] / l, 0, -d[2] / l], right = [fwd[2], 0, -fwd[0]];
  return {head, fwd, right};
}

window.__p = {
  async setup({mood, cams, shots, seed = 1102}) {
    const M = MOODS_TC[mood], m7 = MOODS7[M.base], scene = new T.Scene(), skyCam = cams.find(c => c.id === 'S36a'), fillCam = cams.find(c => c.id === 'S23');
    const W = build({mood, cams, seed, skyCam, fillCam}); scene.add(W.root); const sky = skyDome(M.sky); scene.add(sky);
    scene.environment = envFrom(M); scene.environmentIntensity = M.envK ?? m7.env; scene.fog = new T.Fog(M.fog.color, M.fog.near, M.fog.far);
    scene.add(new T.HemisphereLight(M.hemi[0], M.hemi[1], M.hemi[2]));
    const sd = new T.Vector3(...M.sun.dir).normalize(), sun = new T.DirectionalLight(M.sun.color, M.sun.i); sun.position.copy(sd.clone().multiplyScalar(90)).add(new T.Vector3(-4, 0, 4)); sun.target.position.set(-4, 0, 4);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 240}); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(M.fill.color, M.fill.i); fill.position.set(30, 25, 40); scene.add(fill);
    const rim = new T.DirectionalLight(M.rim.color, M.rim.i); rim.position.copy(sd.clone().multiplyScalar(-1).setY(.5).multiplyScalar(60)); scene.add(rim);
    const cast = new T.Group(); scene.add(cast); const clix = createClix({face: 'grin'}); clix.root.traverse(n => { n.userData.layer = 'far'; n.userData.clix = true; }); scene.add(clix.root);
    S = {scene, W, mood, M, m7, sky, shots, cast, clix, rain: scene.getObjectsByProperty('type', 'LineSegments').filter(o => o.userData.fx)};
    return {counts: W.plan.counts, crowd: W.crowd.length};
  },
  pose(id, u) {   // place everything for shot id at u (0…1); returns the camera sample
    const shot = S.shots.find(s => s.id === id), frame = Math.round(u * Math.max(1, shot.frames - 1));
    const c0 = sampleCam(shot, u), placed = placeCast(shot, frame, c0.pos), head = placeClix(shot, frame, placed, c0);
    const c = shot.cam.clixHead ? sampleCam(shot, u, {clixHead: head}) : c0;
    if (shot.jolt && frame < 4) c.pos = c.pos.map((v, i) => v + [.03, -.02, .025][i] * [1, -.6, .3, 0][frame]);   // N-JOLT-01: one subtle shake at 0:00
    for (const r of S.rain) r.material.opacity = .32 * (shot.rainK ?? 1);
    return {shot, c, frame};
  },
  frame({id, u = .5, w = 360, h = 640, post = true, ev = 0}) {
    const {shot, c} = this.pose(id, u), k = camOf(c, w, h), t0 = performance.now(), M = S.M, m7 = S.m7;
    R.toneMappingExposure = (m7.exposure ?? 1) * M.exposure * Math.pow(2, ev); R.setSize(w, h, false);   /* per-shot grade (previz/grade.json) */
    if (post) { const P = createPost(R, S.scene, k, {samples: 4}); P.setSize(w, h); const close = ['close', 'insert'].includes(shot.size);
      const focus = c.focus ?? (close ? Math.hypot(...c.pos.map((v, i) => v - c.look[i])) : null), st = postFor(m7, {shot: {size: close ? 'close' : 'wide'}, focus});
      if (S.mood === 'rainNight') st.rain = {...MOODS7[M.rainFrom].rain, amount: MOODS7[M.rainFrom].rain.amount * (shot.rainK ?? 1)};
      if (st.ao) st.ao = {...st.ao, radius: .35}; if (shot.grade === 'memory') st.grade = {...st.grade, saturation: .35, vignette: .5};
      if (shot.bloom && st.bloom) st.bloom = {...st.bloom, strength: st.bloom.strength * 1.6}; st.seed = 3;
      P.render(st, {sunDir: M.sun.dir}); } else R.render(S.scene, k);
    return {png: R.domElement.toDataURL('image/png'), ms: Math.round(performance.now() - t0), cam: c};
  },
  ids({id, u = .5, w = 270, h = 480, kind = 'layers'}) {
    const {c} = this.pose(id, u), k = camOf(c, w, h), LC = {fg: '#ff0000', mid: '#00ff00', bg: '#0000ff', far: '#ffff00'}, saved = [], basic = col => new T.MeshBasicMaterial({color: col});
    const split = Math.max(25, Math.hypot(...c.pos.map((v, i) => v - c.look[i]))), enc = id2 => new T.Color(((id2 + 1) & 255) / 255, (((id2 + 1) >> 8) & 255) / 255, 1);
    const far = (near, farc, d) => { const m = basic(near); m.onBeforeCompile = s => { s.uniforms.uFar = {value: new T.Color(farc)}; s.uniforms.uD = {value: d};
      s.vertexShader = 'varying float vD;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvD = length(mvPosition.xyz);');
      s.fragmentShader = 'varying float vD; uniform vec3 uFar; uniform float uD;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (vD > uD) diffuseColor.rgb = uFar;'); }; m.customProgramCacheKey = () => 'far' + d; return m; };
    if (kind === 'void') { R.setSize(w, h, false); R.setClearColor('#ff00ff', 1); const tm = R.toneMapping; R.toneMapping = T.NoToneMapping; R.render(S.scene, k); R.toneMapping = tm; R.setClearColor('#000000', 1); }
    else {
      S.scene.traverse(n => { if (!(n.isMesh || n.isPoints || n.isLine)) return; if (!n.visible) return; saved.push([n, n.material, n.visible, n.instanceColor ?? null]); const L = n.userData.layer;
        if (n.userData.fx || n.isPoints || n.isLine || n.name === 'sky' || (n.material?.transparent && !n.userData.slime && L === 'far' && n.geometry?.type === 'CylinderGeometry')) { n.visible = false; return; }
        if (kind === 'layers') n.material = n.userData.cloud ? basic('#ff00ff') : L === 'mid' ? far(LC.mid, LC.bg, split) : basic(LC[L] ?? '#00ff00');
        else if (kind === 'hill') n.material = basic(n.userData.hillPlinth ? '#ffffff' : '#000000');
        else if (kind === 'slime') n.material = basic(n.userData.slime ? '#ffffff' : '#000000');
        else if (kind === 'buildings' && n.isInstancedMesh && n.userData.buildingIds) { const ids = n.userData.buildingIds; n.instanceColor = new T.InstancedBufferAttribute(new Float32Array(ids.length * 3), 3); ids.forEach((b, i) => n.setColorAt(i, enc(b))); n.material = basic('#ffffff'); return; }
        else n.material = basic('#000000');
        if (n.isInstancedMesh) n.instanceColor = null; });
      const fog = S.scene.fog; S.scene.fog = null; R.setSize(w, h, false); R.setClearColor('#000000', 1); const tm = R.toneMapping, cs = R.outputColorSpace; R.toneMapping = T.NoToneMapping; R.outputColorSpace = T.LinearSRGBColorSpace;
      R.render(S.scene, k); R.toneMapping = tm; R.outputColorSpace = cs; S.scene.fog = fog;
      for (const [n, m, v, ic] of saved) { n.material = m; n.visible = v; if (n.isInstancedMesh) n.instanceColor = ic; } }
    const gl = R.getContext(), b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    const fdir = new T.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(), hz = k.position.clone().addScaledVector(fdir, 2000).project(k);
    return {b64: btoa(s), w, h, horizonY: +hz.y.toFixed(4), ids: kind === 'buildings' ? S.W.plan.buildings.map(x => ({id: x.id, arch: x.arch})) : null};
  },
};
window.__ready = true;
