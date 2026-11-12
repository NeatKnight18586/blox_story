// engine/look.js — lighting/sky presets (docs/V2_BRIEF.md §7.2, §7.3.8): day, goldenHour, night, storm,
// plus fireNight (orange firelit sky for the dragon). Gradient sky dome, block clouds, horizon-matched
// fog for depth haze, ambient colour matched to the sky, one sun with a 2048 shadow map fitted to the
// shot, and a rim light on characters at night (blue ambient ≥ 0.9). Presets blend (timeOfDay).
// Warm key, cool fill, visible shadows, a little haze; bloom and grade happen later in FFmpeg.
import * as T from 'three';

export const PRESETS = {
  day: {skyTop: '#4f9fe8', skyHorizon: '#cfe9ff', fog: '#cfe4f5', fogNear: 90, fogFar: 330, hemiSky: '#e3f1ff', hemiGround: '#8fae6a', hemi: 1.4,
    sun: '#fff1d6', sunI: 2.6, sunEl: 52, sunAz: 35, rim: '#ffffff', rimI: 0, cloud: '#ffffff', exposure: 1.08, windows: 0},
  goldenHour: {skyTop: '#6a8fd0', skyHorizon: '#ffc58a', fog: '#f2c79a', fogNear: 70, fogFar: 300, hemiSky: '#ffe2c2', hemiGround: '#8a7a55', hemi: 1.42,
    sun: '#ffb466', sunI: 2.9, sunEl: 16, sunAz: 325, rim: '#ffd9a8', rimI: .5, cloud: '#ffd6b0', exposure: 1.12, windows: .5},
  night: {skyTop: '#0b1430', skyHorizon: '#2f4c8a', fog: '#2a3d6e', fogNear: 60, fogFar: 260, hemiSky: '#6f93e6', hemiGround: '#2a3a58', hemi: 1.3,
    sun: '#a9c4ff', sunI: .7, sunEl: 48, sunAz: 140, rim: '#9fc2ff', rimI: 1.2, cloud: '#33456e', exposure: 1.3, windows: 1.2},
  storm: {skyTop: '#4a5566', skyHorizon: '#8a96a6', fog: '#8a96a6', fogNear: 40, fogFar: 200, hemiSky: '#b8c2d0', hemiGround: '#55604a', hemi: 1.0,
    sun: '#dfe6f0', sunI: 1.0, sunEl: 60, sunAz: 20, rim: '#cfd8e6', rimI: .3, cloud: '#7d8796', exposure: 1.05, windows: .3},
  fireNight: {skyTop: '#3a2244', skyHorizon: '#ff9a5a', fog: '#8a4a42', fogNear: 60, fogFar: 260, hemiSky: '#ffb487', hemiGround: '#4a3a5a', hemi: 1.5,
    sun: '#ff9a4a', sunI: 1.6, sunEl: 26, sunAz: 300, rim: '#9fc2ff', rimI: 1.2, cloud: '#6a3a48', exposure: 1.35, windows: 1.2},
};
export const LOOKS = Object.keys(PRESETS);

const lerp = (a, b, w) => a + (b - a) * w, col = (a, b, w) => '#' + new T.Color(a).lerp(new T.Color(b), w).getHexString();
export function blendPreset(a, b, w) {
  const A = PRESETS[a] ?? a, B = PRESETS[b] ?? b, out = {};
  for (const k of Object.keys(A)) out[k] = typeof A[k] === 'string' ? col(A[k], B[k], w) : lerp(A[k], B[k], w);
  return out;
}

export function createLook(scene, renderer, {radius = 420} = {}) {
  renderer.toneMapping = T.NeutralToneMapping;
  // Sky dome: a big inward-facing sphere coloured by height (no texture, no lighting).
  const sky = new T.Mesh(new T.SphereGeometry(radius, 24, 12), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: {top: {value: new T.Color()}, horizon: {value: new T.Color()}},
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying float h;\nvoid main(){ float k = pow(clamp(h,0.,1.), .55); gl_FragColor = vec4(mix(horizon, top, k), 1.);\n#include <colorspace_fragment>\n}',
  }));
  sky.name = 'sky'; sky.renderOrder = -1; scene.add(sky);
  const hemi = new T.HemisphereLight(); scene.add(hemi);
  const sun = new T.DirectionalLight(); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const rim = new T.DirectionalLight(); scene.add(rim, rim.target);
  scene.fog = new T.Fog('#ffffff', 100, 300);
  // Block clouds: a few clusters of flat boxes on a ring, drifting slowly (pure in t).
  const clouds = new T.Group(); clouds.name = 'clouds'; const cloudMat = new T.MeshLambertMaterial({color: '#ffffff', fog: false});
  const cg = new T.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 14; i++) {
    const c = new T.Group(), a = i / 14 * Math.PI * 2, r = 200 + (i % 3) * 40;
    for (let k = 0; k < 4; k++) { const b = new T.Mesh(cg, cloudMat); b.scale.set(14 + (k * 7 + i * 3) % 12, 4 + (k + i) % 3, 9 + (k * 5 + i) % 8); b.position.set((k - 1.5) * 8, (k % 2) * 2.5, ((k * 3 + i) % 5) - 2); c.add(b); }
    c.position.set(Math.sin(a) * r, 70 + (i % 4) * 9, Math.cos(a) * r); c.rotation.y = a; clouds.add(c);
  }
  scene.add(clouds);
  let current = null;

  return {
    sky, hemi, sun, rim, clouds,
    get preset() { return current; },
    apply(nameOrPreset, b = null, w = 0) {
      const p = b ? blendPreset(nameOrPreset, b, w) : (PRESETS[nameOrPreset] ?? nameOrPreset); current = p;
      sky.material.uniforms.top.value.set(p.skyTop); sky.material.uniforms.horizon.value.set(p.skyHorizon);
      scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
      hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemi;
      sun.color.set(p.sun); sun.intensity = p.sunI; rim.color.set(p.rim); rim.intensity = p.rimI;
      cloudMat.color.set(p.cloud); renderer.toneMappingExposure = p.exposure;
      scene.traverse(o => { if (o.material?.userData?.window) o.material.emissiveIntensity = p.windows * (o.material.userData.window ?? 1); });
      return p;
    },
    // Fit the sun's shadow box to the shot region and aim the rim light from behind the subject.
    frame(target, camPos, r = 30) {
      const p = current ?? PRESETS.day, el = p.sunEl * Math.PI / 180, az = p.sunAz * Math.PI / 180;
      const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      sun.target.position.copy(target); sun.position.copy(target).addScaledVector(dir, 120);
      Object.assign(sun.shadow.camera, {left: -r, right: r, top: r, bottom: -r, near: 20, far: 260}); sun.shadow.camera.updateProjectionMatrix();
      const back = new T.Vector3().subVectors(target, camPos).setY(0).normalize();
      rim.target.position.copy(target); rim.position.copy(target).addScaledVector(back, 30).add(new T.Vector3(0, 18, 0));
      sky.position.copy(camPos); clouds.position.set(camPos.x * .9, 0, camPos.z * .9);
    },
    update(t) { clouds.rotation.y = t * .004; },
  };
}
