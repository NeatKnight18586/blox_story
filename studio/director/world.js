// Shared world for director-built episodes: renderer, lights, studio look,
// time-of-day/weather presets and ambient life. One per page; an episode's
// build() adds its sets and cast, then finish() applies the look once.
import * as T from 'three';
import {applyStudioLook, LOOK} from '../lookdev/look.js';
import {flatMaterial} from '../town/materials.js';

const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);

// Time-of-day presets. Every value is set on each frame, so shots never leak state.
export const MOODS = Object.freeze({
  day: {zenith: 0x1a62cf, horizon: 0xa6d8f5, fog: 0xa9d6f2, fogNear: 95, fogFar: 300, hemi: .82, hemiSky: 0xbfe8ff, hemiGround: 0xd9b27e, key: 0xfff0d6, keyI: 3.89, fill: 2.0, rim: 1.1, exposure: .86, windows: 0},
  golden: {zenith: 0x3d6fc4, horizon: 0xffc58a, fog: 0xf2c9a0, fogNear: 90, fogFar: 280, hemi: .7, hemiSky: 0xffd9b0, hemiGround: 0xc99a6a, key: 0xffc27a, keyI: 3.6, fill: 1.3, rim: 1.4, exposure: .86, windows: .2},
  dawn: {zenith: 0x5b7fc9, horizon: 0xffd2b0, fog: 0xf0d2c0, fogNear: 90, fogFar: 300, hemi: .75, hemiSky: 0xffe2cc, hemiGround: 0xc9a07a, key: 0xffd9a8, keyI: 3.3, fill: 1.5, rim: 1.2, exposure: .88, windows: 0},
  storm: {zenith: 0x1c2333, horizon: 0x4a5566, fog: 0x3e4756, fogNear: 30, fogFar: 160, hemi: .55, hemiSky: 0x8fa3c0, hemiGround: 0x3a3d44, key: 0xa9c0e0, keyI: 1.3, fill: .6, rim: 1.6, exposure: .9, windows: 1},
  night: {zenith: 0x0b1530, horizon: 0x24375e, fog: 0x1d2a46, fogNear: 40, fogFar: 200, hemi: .5, hemiSky: 0x7f95c8, hemiGround: 0x2a2c36, key: 0x9fb4e8, keyI: 1.2, fill: .5, rim: 1.3, exposure: .92, windows: 1},
  interior: {zenith: 0x1a62cf, horizon: 0xa6d8f5, fog: 0xa9d6f2, fogNear: 200, fogFar: 600, hemi: .95, hemiSky: 0xfff1dc, hemiGround: 0xc8a27c, key: 0xfff0d6, keyI: 3.0, fill: 1.6, rim: .6, exposure: .86, windows: 0},
  interiorNight: {zenith: 0x0b1530, horizon: 0x24375e, fog: 0x1d2a46, fogNear: 200, fogFar: 600, hemi: .55, hemiSky: 0x8f9fd0, hemiGround: 0x5a4636, key: 0xffc98a, keyI: 1.9, fill: .55, rim: .9, exposure: .95, windows: 0},
});

export function createWorld() {
  const renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(1); renderer.setSize(1080, 1920); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  document.body.append(renderer.domElement);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 9 / 16, .05, 400);
  const hemi = new T.HemisphereLight(0xc5e3f1, 0x756a55, 1.7); scene.add(hemi);
  const key = new T.DirectionalLight(0xffd6a0, 3.6); key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096); Object.assign(key.shadow.camera, {left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160});
  key.shadow.bias = -.0005; key.shadow.normalBias = .03; scene.add(key, key.target);
  const fill = new T.DirectionalLight(0xffe8c9, 2.0); fill.position.set(-30, 25, 20); scene.add(fill);
  // Practical lamp for interiors / porch at night (off unless a shot turns it on).
  const lamp = new T.PointLight(0xffc27a, 0, 30, 1.6); scene.add(lamp);
  const flash = new T.DirectionalLight(0xdfe8ff, 0); flash.position.set(-20, 60, 30); scene.add(flash);
  scene.add(camera);
  const W = {scene, camera, renderer, hemi, key, fill, lamp, flash, look: null, sky: null, rim: null, windows: [], ambient: []};

  // Key light follows the set being shot so the shadow map stays tight around it.
  W.lightAt = (c, dir = [30, 50, 36]) => { key.target.position.copy(c); key.position.copy(c).add(V(...dir)); };
  W.finish = () => {
    W.look = applyStudioLook({scene, camera, renderer}, LOOK, {skipIdleBokeh: true});
    scene.traverse(o => { if (o.name === 'studio_sky_gradient') W.sky = o; if (o.name === 'studio_rim') W.rim = o; });
    // Lit-window materials: every glass pane gets an emissive we can turn up at night.
    const seen = new Set();
    scene.traverse(o => { if (o.isMesh && o.name === 'glass' && !seen.has(o.material)) { seen.add(o.material); o.material.emissive = new T.Color(0xffc46b); W.windows.push(o.material); } });
  };
  W.mood = (name, {flashAmt = 0} = {}) => {
    const m = MOODS[name] ?? MOODS.day;
    W.sky.material.uniforms.zenith.value.set(m.zenith); W.sky.material.uniforms.horizon.value.set(m.horizon);
    scene.fog.color.set(m.fog); scene.fog.near = m.fogNear; scene.fog.far = m.fogFar;
    hemi.color.set(m.hemiSky); hemi.groundColor.set(m.hemiGround); hemi.intensity = m.hemi;
    key.color.set(m.key); key.intensity = m.keyI; fill.intensity = m.fill; W.rim.intensity = m.rim;
    renderer.toneMappingExposure = m.exposure * (1 + .55 * flashAmt);
    flash.intensity = 6 * flashAmt;
    for (const mat of W.windows) mat.emissiveIntensity = m.windows * .9;
    lamp.intensity = 0;
  };
  return W;
}

// ---------------- Ambient life (driven by episode time, so it flows across cuts) ----------------
// Clouds: soft white clumps drifting high over the set.
export function clouds(scene, center, {count = 9, radius = 140, seed = 3} = {}) {
  const mat = flatMaterial('#ffffff', {roughness: 1, emissive: '#ffffff', emissiveIntensity: .25, flatShading: true});
  const list = [];
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const g = new T.Group(); g.name = 'cloud';
    for (let k = 0; k < 5; k++) { const m = new T.Mesh(new T.IcosahedronGeometry(4 + r() * 4, 1), mat); m.name = 'cloud_clump'; m.position.set((k - 2) * 5 + r() * 2, r() * 3, r() * 4); m.scale.y = .6; g.add(m); }
    const a = r() * Math.PI * 2, d = radius * (.5 + r() * .5);
    g.userData = {x: center.x + Math.sin(a) * d, z: center.z + Math.cos(a) * d - 40, y: 70 + r() * 30, v: 1.2 + r() * 1.2};
    scene.add(g); list.push(g);
  }
  return t => { for (const g of list) g.position.set(g.userData.x + ((t * g.userData.v + 400) % 260) - 130, g.userData.y, g.userData.z); };
}

// Birds: tiny flapping V shapes circling the set.
export function birds(scene, center, {count = 5, seed = 2} = {}) {
  const mat = flatMaterial('#3a3f4a'); const list = [];
  for (let i = 0; i < count; i++) {
    const g = new T.Group(); g.name = 'bird';
    const wing = side => { const w = new T.Mesh(new T.BoxGeometry(.9, .06, .35), mat); w.position.x = side * .45; const p = new T.Group(); p.add(w); g.add(p); return p; };
    g.userData = {L: wing(-1), R: wing(1), ph: i * 1.7 + seed, r: 18 + i * 4, h: 24 + (i % 3) * 4, v: .18 + (i % 2) * .05};
    scene.add(g); list.push(g);
  }
  return t => {
    for (const g of list) {
      const u = g.userData, a = t * u.v + u.ph;
      g.position.set(center.x + Math.sin(a) * u.r, u.h + Math.sin(t * .7 + u.ph) * 1.5, center.z - 20 + Math.cos(a) * u.r * .6);
      g.rotation.y = a + Math.PI / 2; const f = Math.sin(Math.floor(t * 15) / 15 * 11 + u.ph) * .6;
      u.L.rotation.z = f; u.R.rotation.z = -f;
    }
  };
}

// Rain: instanced streaks in a box that follows the camera; deterministic from time.
export function rain(scene, {count = 1800, size = 36, height = 30} = {}) {
  const mat = new T.MeshBasicMaterial({color: 0xbfd4f0, transparent: true, opacity: .45, depthWrite: false, fog: false});
  const im = new T.InstancedMesh(new T.BoxGeometry(.03, 1.1, .03), mat, count); im.name = 'rain'; im.frustumCulled = false; im.visible = false;
  const seeds = Array.from({length: count}, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12543.21 % 1, Math.sin(i * 39.425) * 9631.7 % 1].map(x => Math.abs(x)));
  scene.add(im);
  const m4 = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(0, 0, .12));
  return (t, camPos, on) => {
    im.visible = !!on; if (!on) return;
    seeds.forEach(([a, b, c], i) => {
      const y = height - ((t * 28 + c * height) % height);
      m4.compose(V(camPos.x + (a - .5) * size, camPos.y - 8 + y, camPos.z + (b - .5) * size - size * .35), q, V(1, 1, 1)); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  };
}
