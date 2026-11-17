// engine/look5b.js — Look 5b: separate the characters from the world (opt-in: spec `look5b`; data: looks4.json `<preset>.v5b`).
//   params(preset)                  the preset's v5b block over DEFAULTS (night presets carry exposureEV 0)
//   ev(x)                           2^x
//   envGrade(hex|[r,g,b], p)        environment colour after the −0.15 EV / 5 % cooler grade (pure)
//   patchActor(material, U)         fresnel rim (cool #BFD8FF) + actor exposure lift as a shader patch on an actor material
//                                   (MeshMatcap or MeshStandard), driven by shared uniforms U
//   contactBlob(radius, opacity)    soft radial floor blob (unlit, multiply-dark, depthWrite off) for one actor
//   gradeWorld(root, p, skip)       applies envGrade in place to every world material (lights and actor roots skipped)
import * as T from 'three';
export const DEFAULTS = {rim: {color: '#BFD8FF', strength: .5, power: 2.2, away: 0}, shade: 1, knee: 10, relief: 0, actorEV: .3, envEV: -.15, envCool: .05, exposureEV: 0,
  blob: {opacity: .45, radius: .6}, camNoiseDeg: .15, overshoot: .12, breathe: true, springs: 2, motionBlur: true};
export const ev = x => Math.pow(2, x);
export function params(preset) {
  const v = preset?.v5b ?? {}; return {...DEFAULTS, ...v, rim: {...DEFAULTS.rim, ...(v.rim ?? {})}, blob: {...DEFAULTS.blob, ...(v.blob ?? {})}};
}
// "5 % cooler": red down 5 %, green down 2 %, blue unchanged, then the EV scale.
export const coolTint = c => [1 - c, 1 - .4 * c, 1];
export function envGrade(rgb, p = DEFAULTS) {
  const k = ev(p.envEV), t = coolTint(p.envCool); return rgb.map((v, i) => v * k * t[i]);
}
export function makeUniforms(p = DEFAULTS) {
  return {uRimColor: {value: new T.Color(p.rim.color)}, uRim: {value: p.rim.strength}, uRimPow: {value: p.rim.power}, uRimAway: {value: p.rim.away ?? 0}, uPool: {value: 1}, uLift: {value: ev(p.actorEV)}, uShade: {value: p.shade}, uKnee: {value: p.knee}};
}
// uPool (Look 6): the light pool the actor stands in scales the actor before the rim (1 = off).
// The rim is added after the lift, so it reads as light from behind regardless of the surface colour (dark jackets too).
export function patchActor(m, U) {
  if (!m || m.userData?.look5b || m.isMeshBasicMaterial || m.isSpriteMaterial) return m;
  m.userData = {...m.userData, look5b: true};
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform vec3 uRimColor; uniform float uRim; uniform float uRimPow; uniform float uLift; uniform float uShade; uniform float uKnee; uniform float uRimAway; uniform float uPool;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      `{ vec3 nV5 = normalize(normal); vec3 vV5 = normalize(vViewPosition); float fr5 = pow(1.0 - clamp(abs(dot(nV5, vV5)), 0.0, 1.0), uRimPow);
  float kd5 = dot(nV5, normalize(vec3(-0.45, 0.55, 0.70))); float key5 = smoothstep(-0.15, 0.55, kd5);   // a screen-fixed key from the upper left: the shadow side gets uShade
  fr5 *= mix(1.0, 1.0 - smoothstep(-0.08, 0.0, kd5), uRimAway);   // Look 6 (owner): rim only where the surface faces away from the key
  outgoingLight = outgoingLight * uPool * uLift * mix(uShade, 1.0, key5) + uRimColor * uRim * fr5; outgoingLight -= 0.6 * max(outgoingLight - vec3(uKnee), 0.0); }   // highlight knee after the rim: no clipped yellow heads
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'look5b-actor'; m.needsUpdate = true; return m;
}
let blobTex = null;
function radialTexture() {
  if (blobTex) return blobTex; const n = 64, b = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const r = Math.hypot(x + .5 - n / 2, y + .5 - n / 2) / (n / 2), a = blobAlpha(r), i = (y * n + x) * 4; b[i] = b[i + 1] = b[i + 2] = Math.round(a * 255); b[i + 3] = 255; }   // alphaMap reads green
  blobTex = new T.DataTexture(b, n, n, T.RGBAFormat); blobTex.magFilter = blobTex.minFilter = T.LinearFilter; blobTex.needsUpdate = true; return blobTex;
}
// Pure: blob profile (alpha 0..1 at normalised radius r), the radial texture's falloff.
export const blobAlpha = r => r >= 1 ? 0 : r <= .45 ? 1 : (u => 1 - u * u * (3 - 2 * u))((r - .45) / .55);   // a dark core to .45, smooth falloff to the rim
export function contactBlob(radius, opacity = DEFAULTS.blob.opacity) {
  const m = new T.Mesh(new T.PlaneGeometry(2 * radius, 2 * radius), new T.MeshBasicMaterial({color: '#000000', alphaMap: radialTexture(), transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
  m.rotation.x = -Math.PI / 2; m.name = 'contactBlob'; m.userData.live = true; m.renderOrder = 1; m.material.alphaMap.colorSpace = T.NoColorSpace; return m;
}
const isLight = m => m.toneMapped === false || m.blending === T.AdditiveBlending;
export function gradeWorld(root, p, skip = () => false) {
  const seen = new Set(), k = ev(p.envEV), t = coolTint(p.envCool); let n = 0;
  root.traverse(o => { if (skip(o) || !(o.isMesh || o.isInstancedMesh)) return;
    for (const m of [].concat(o.material)) { if (!m || seen.has(m) || !m.color || isLight(m) || m.isShadowMaterial || m.name === 'contactBlob') continue; seen.add(m); m.color.setRGB(m.color.r * k * t[0], m.color.g * k * t[1], m.color.b * k * t[2]); n++; } });
  return n;
}

// Set relief (close / medium shots): baked set materials are unlit, so their pattern's normal map (materials4) is lost; this
// patch brings it back as a fixed-direction emboss on the baked colour (uRelief per shot, 0 = off). Surfaces without a pattern
// use the generic plaster relief. Only materials with a uv attribute show it (vUv is forced on).
export function patchRelief(m, map, repeat, U) {
  if (!m || m.userData?.relief5b || !map) return m;
  m.userData = {...m.userData, relief5b: true}; m.defines = {...(m.defines ?? {}), USE_UV: ''};
  const rm = {value: map}, rr = {value: new T.Vector2(...repeat)}, prev = m.onBeforeCompile, prevKey = m.userData.layers6 || m.userData.shelf6 ? m.customProgramCacheKey() + '|' : '';   // Look 6: chains the bake-layer / shelf patch
  m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r); sh.uniforms.uReliefMap = rm; sh.uniforms.uRelRep = rr; sh.uniforms.uRelief = U.uRelief;
    sh.fragmentShader = 'uniform sampler2D uReliefMap; uniform vec2 uRelRep; uniform float uRelief;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      `if (uRelief > 0.0) { vec3 nr5 = texture2D(uReliefMap, vUv * uRelRep).xyz * 2.0 - 1.0; outgoingLight *= 1.0 + uRelief * (0.7 * nr5.x + 0.7 * nr5.y); }
#include <opaque_fragment>`); };
  m.customProgramCacheKey = () => prevKey + 'look5b-relief'; m.needsUpdate = true; return m;
}
// The face decal (unlit MeshBasic, faces v4) keeps its drawing; only the actor lift and the highlight knee are applied, so the
// painted face sits at the same exposure as the head around it and yellow faces do not clip.
export function patchDecal(m, U) {
  if (!m || m.userData?.look5b) return m; m.userData = {...m.userData, look5b: true};
  m.onBeforeCompile = sh => { sh.uniforms.uLift = U.uLift; sh.uniforms.uKnee = U.uKnee;
    sh.fragmentShader = 'uniform float uLift; uniform float uKnee;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      `outgoingLight *= uLift; outgoingLight -= 0.6 * max(outgoingLight - vec3(uKnee), 0.0);
#include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'look5b-decal'; m.needsUpdate = true; return m;
}
// Per-actor shadow depth (pure): darker skins need a lighter shade factor so the shadow side lands in the same luma band.
const lum = hex => { const c = new T.Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b; };   // linear
export const actorShade = (skin, base) => Math.min(1, Math.max(.3, base * Math.pow(lum('#FFD542') / Math.max(.05, lum(skin ?? '#FFD542')), .5)));
