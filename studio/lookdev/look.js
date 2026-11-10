// Studio V2 look: opt-in grade, light, sky and lens layer for existing scenes.
// Nothing here runs unless a page calls applyStudioLook(); legacy renders are untouched.
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// One place to tune the look. Values were chosen against the reference metrics
// (bright, saturated, complementary cyan/yellow, soft plastic sheen).
export const LOOK = {
  exposure: 1.0,
  sky: {zenith: 0x1f74e0, horizon: 0xb8e6ff, sun: 0xfff1c9},
  fog: {color: 0xbfe6ff, near: 70, far: 240},
  grade: {saturationMul: 1.4, saturationAdd: .05, darkSaturationMul: 1.1, lightMul: .95, lightAdd: .05},
  // Named surfaces that carry most of the frame get authored colours, not a grade.
  overrides: {continuous_town_ground: 0xd9b27a, continuous_gate_land: 0xd9b27a, continuous_road: 0xf3ddb0, road_stone_edge: 0xd4a46e,
    inset_radial_paving: 0xefd8ac, paving_joint: 0xcf9f6b, radial_joint: 0xcf9f6b, plaza_foundation: 0xd9b27a},
  material: {roughness: .5, characterRoughness: .42, envIntensity: .22},
  light: {hemiSky: 0xbfe8ff, hemiGround: 0xd9b27e, hemi: 1.0, key: 0xfff0d6, keyMul: 1.12, rim: 0x9fd4ff, rimIntensity: 1.1},
  bloom: {strength: .1, radius: .35, threshold: 1.2},
  lens: {wideAperture: 0, closeAperture: .025, maxblur: .012},
};

const CHARACTER_NAMES = new Set(['head','torso','leftArm','rightArm','leftLeg','rightLeg']);

function gradeColor(c, g) {
  const hsl = {}; c.getHSL(hsl);
  // Dark browns (hair, trousers) turn ginger under a full boost, so they get a gentle one.
  const mul = hsl.l < .3 ? g.darkSaturationMul : g.saturationMul;
  const s = Math.min(1, hsl.s * mul + g.saturationAdd * (hsl.s > .04 && hsl.l >= .3 ? 1 : 0));
  const l = Math.min(.92, hsl.l * g.lightMul + g.lightAdd);
  return new T.Color().setHSL(hsl.h, s, l);
}

function makeSky(L) {
  const geo = new T.SphereGeometry(200, 48, 24);
  const mat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {zenith: {value: new T.Color(L.sky.zenith)}, horizon: {value: new T.Color(L.sky.horizon)}},
    vertexShader: 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 zenith;uniform vec3 horizon;varying vec3 vDir;void main(){float h=clamp(vDir.y,0.,1.);float t=pow(h,.55);gl_FragColor=vec4(mix(horizon,zenith,t),1.);}',
  });
  const sky = new T.Mesh(geo, mat); sky.name = 'studio_sky_gradient'; sky.renderOrder = -1; sky.frustumCulled = false;
  return sky;
}

export function applyStudioLook({scene, camera, renderer}, L = LOOK) {
  const restoreList = [];
  // Grade every standard material once (shared materials are graded once).
  const graded = new Map();
  scene.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m = o.material;
    if (!m.isMeshStandardMaterial) return;
    if (!graded.has(m)) {
      graded.set(m, {color: m.color.clone(), roughness: m.roughness, metalness: m.metalness, envMapIntensity: m.envMapIntensity});
      m.color.copy(L.overrides[o.name] !== undefined ? new T.Color(L.overrides[o.name]) : gradeColor(m.color, L.grade));
      m.roughness = Math.min(m.roughness, L.material.roughness);
      m.envMapIntensity = L.material.envIntensity;
    }
    if (CHARACTER_NAMES.has(o.name)) m.roughness = Math.min(m.roughness, L.material.characterRoughness);
  });
  restoreList.push(() => { for (const [m, v] of graded) Object.assign(m, {roughness: v.roughness, metalness: v.metalness, envMapIntensity: v.envMapIntensity}), m.color.copy(v.color); });

  // Soft studio reflections give the smooth "toy plastic" read without textures.
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const prevEnv = scene.environment, prevEnvI = scene.environmentIntensity, prevBg = scene.background, prevFog = scene.fog;
  // scene.environment ignores material.envMapIntensity; scene.environmentIntensity governs it.
  scene.environment = env; scene.environmentIntensity = L.material.envIntensity; scene.background = null;
  scene.fog = new T.Fog(L.fog.color, L.fog.near, L.fog.far);
  const sky = makeSky(L); scene.add(sky);
  restoreList.push(() => { scene.environment = prevEnv; scene.environmentIntensity = prevEnvI; scene.background = prevBg; scene.fog = prevFog; scene.remove(sky); });

  // Re-balance existing lights instead of replacing them, then add one cool rim.
  const lights = [];
  scene.traverse(o => { if (o.isLight) lights.push([o, o.color.clone(), o.intensity, o.isHemisphereLight ? o.groundColor.clone() : null]); });
  for (const [l] of lights) {
    if (l.isHemisphereLight) { l.color.set(L.light.hemiSky); l.groundColor.set(L.light.hemiGround); l.intensity = L.light.hemi; }
    else if (l.isDirectionalLight && l.castShadow) { l.color.set(L.light.key); l.intensity *= L.light.keyMul; }
  }
  const rim = new T.DirectionalLight(L.light.rim, L.light.rimIntensity); rim.name = 'studio_rim';
  rim.position.set(-14, 16, -22); scene.add(rim);
  restoreList.push(() => { for (const [l, c, i, g] of lights) { l.color.copy(c); l.intensity = i; if (g) l.groundColor.copy(g); } scene.remove(rim); });

  // Clouds and sun read as bright, clean shapes.
  scene.traverse(o => {
    if (!o.isMesh || !o.material?.color) return;
    if (o.name === 'cloud_clump') { o.material.color.set(0xffffff); if (o.material.emissive) { o.material.emissive.set(0xffffff); o.material.emissiveIntensity = .35; } }
  });

  const prev = {toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure};
  renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = L.exposure;
  restoreList.push(() => { renderer.toneMapping = prev.toneMapping; renderer.toneMappingExposure = prev.exposure; });

  let composer = null, size = null, bokeh = null;
  function ensureComposer() {
    const w = renderer.domElement.width, h = renderer.domElement.height;
    if (composer && size === `${w}x${h}`) return;
    composer?.dispose();
    const rt = new T.WebGLRenderTarget(w, h, {type: T.HalfFloatType, samples: 4});
    composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, {focus: 20, aperture: L.lens.wideAperture, maxblur: L.lens.maxblur});
    composer.addPass(bokeh);
    composer.addPass(new UnrealBloomPass(new T.Vector2(w, h), L.bloom.strength, L.bloom.radius, L.bloom.threshold));
    composer.addPass(new OutputPass());
    size = `${w}x${h}`;
  }

  // focus: world point the lens holds sharp; close=true opens the aperture.
  function render(focus, close = false) {
    ensureComposer();
    sky.position.copy(camera.position);
    const u = bokeh.uniforms;
    u.focus.value = focus ? camera.position.distanceTo(focus) : 20;
    u.aperture.value = close ? L.lens.closeAperture : L.lens.wideAperture;
    u.maxblur.value = L.lens.maxblur;
    composer.render();
  }
  function restore() { composer?.dispose(); env.dispose(); pmrem.dispose(); for (const f of restoreList.reverse()) f(); }
  return {render, restore, look: L};
}
