// engine/cinelook.js — tuft 1B Look Pack (opt-in spec `look: 'cine'`; the base look preset is `look4`). "Made in Blender" on our
// renderer, cheaply: the scene renders into a linear HDR target (+ depth), then
//   1. bloom   three's UnrealBloomPass (half-res mip chain), threshold 1.0 on HDR luminance: only glow surfaces (windows, lamps,
//              glow cubes / beast seams pushed to GLOW_HDR) pass; lit sets and characters stay ≤ 1 and never bloom.
//   2. DOF     ONE half-res gather (12 taps on a golden-angle spiral, scatter-as-gather weights, CoC clamp): focus = the shot's
//              subject head (engine/cine.js focusAt, `rack`), strength by lens (85 mm strongest), off on wides unless shot.dof.
//   3. grade   ONE pass: height fog + horizon haze from depth, AgX (three's chunk) at the frame's exposure (look × mood6 ev),
//              lift / gamma / gain + vignette per mood, corner chromatic fringe (≤ 1 px at 1440 wide), seeded film grain.
//              With ss = 2 (--final) the scene is 2× and this pass downsamples it with a 9-tap tent.
// Plus: no live shadow maps (episode.js turns them off), one soft contact blob per actor / glow cube (look5b.contactBlob),
// shot `fg` foreground element (engine/cine.js fgPlace). Pure helpers at the bottom are tested in tests/cine.js.
import * as T from 'three';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {contactBlob} from './look5b.js';
import {MOODS} from './mood6.js';
import {shotLens, focusAt, fgPlace, project} from './cine.js';

export const GLOW_HDR = 3.2, BLOOM = {threshold: 1.0, strength: .35, radius: .2, edge: .03};
export const DOF = {fNumber: {24: 0, 35: 5.6, 50: 4, 85: 2.4}, unitMM: 300, sensorW: 24, maxCoC: .012, taps: 12};   // maxCoC: fraction of the frame width
export const GRAIN = {amp: .052};   // triangular noise in display space; luma std ≈ 2 % (measured: scripts/v2/cine-gates.js)
export const FOG = {density: .007, falloff: .09, haze: .25, hazeK: 9};
export const GRADE = {
  default: {lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], vig: .28},
  tension: {lift: [0, .004, .014], gamma: [.98, 1, 1.03], gain: [.98, 1, 1.03], vig: .38},
  emotion: {lift: [.010, .005, 0], gamma: [1.02, 1, .98], gain: [1.03, 1, .96], vig: .32},
  awe: {lift: [0, .002, .010], gamma: [1, 1.01, 1.02], gain: [1, 1.01, 1.03], vig: .22},
  comedy: {lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1.01, 1.01, 1], vig: .16},
  fun: {lift: [.004, .002, 0], gamma: [1, 1, 1], gain: [1.02, 1.01, 1], vig: .16},
  payoff: {lift: [.006, .004, 0], gamma: [1.03, 1.02, 1], gain: [1.05, 1.03, 1], vig: .22}};
export const gradeOf = mood => GRADE[mood] ?? GRADE.default;
export const WIDE = ['ews', 'ws', 'wide', 'establishing'];
// CoC scale (fraction of the frame width per |1 − focus/z|) for a lens at a focus distance (world units), thin lens
export const cocScale = (lens, focus) => { const N = DOF.fNumber[lens] ?? 0; return N ? lens * lens / (N * Math.max(.5, focus) * DOF.unitMM * DOF.sensorW) : 0; };
export const dofOn = shot => shot.dof ?? !WIDE.includes(shot.size);
export const moodEV = shot => MOODS[shot?.mood]?.light?.ev ?? 0;

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const DEPTH = `uniform float uNear; uniform float uFar; float linZ(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }`;
const DOF_FS = `uniform sampler2D tColor; uniform sampler2D tDepth; uniform float uFocus; uniform float uK; uniform float uMax; uniform float uAspect; varying vec2 vUv; ${DEPTH}
float coc(float z){ return clamp(uK * abs(1. - uFocus / z) / uMax, 0., 1.); }
void main(){ float z0 = linZ(texture2D(tDepth, vUv).x), c0 = coc(z0); vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.;
  float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * 6.2831853;   // interleaved gradient noise, fixed per pixel
  for (int i = 0; i < ${DOF.taps}; i++) { float fi = float(i), r = sqrt((fi + .5) / ${DOF.taps}.), a = fi * 2.3999632 + rot; vec2 o = vec2(cos(a), sin(a)) * r * uMax * vec2(1., uAspect);
    vec2 uv = vUv + o; float z = linZ(texture2D(tDepth, uv).x), c = coc(z), cc = z > z0 ? min(c, c0) : c, w = clamp((cc - r) * 8. + 1., 0., 1.);
    acc += texture2D(tColor, uv).rgb * w; wsum += w; }
  gl_FragColor = vec4(acc / wsum, c0); }`;
const agx = () => T.ShaderChunk.tonemapping_pars_fragment.replace(/toneMappingExposure/g, 'uExposure');
const FINAL_FS = () => `precision highp float; precision highp int; uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tDof; uniform vec2 uSrc; uniform vec2 uOut; uniform float uSS; uniform float uDofOn;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos; uniform vec3 uFogColor; uniform float uFogD; uniform float uFogK; uniform float uFogY0; uniform float uHaze; uniform float uHazeK;
uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain; uniform float uVig; uniform float uGrain; uniform float uFringe; uniform uint uSeed; varying vec2 vUv; ${DEPTH}
${agx()}
vec3 scene(vec2 uv){ if (uSS < 1.5) return texture2D(tColor, uv).rgb; vec2 t = 1. / uSrc; vec3 s = vec3(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { float w = (i == 0 ? 2. : 1.) * (j == 0 ? 2. : 1.); s += w * texture2D(tColor, uv + vec2(float(i), float(j)) * t).rgb; } return s / 16.; }
vec3 comp(vec2 uv){ vec3 c = scene(uv); if (uDofOn > .5) { vec4 d = texture2D(tDof, uv); c = mix(c, d.rgb, smoothstep(.04, .3, d.a)); }
  float dz = texture2D(tDepth, uv).x; vec4 v = uInvProj * vec4(uv * 2. - 1., dz * 2. - 1., 1.); v /= v.w; vec3 w = (uCamWorld * v).xyz, ray = w - uCamPos; float L = length(ray); vec3 dir = ray / max(L, 1e-4);
  if (dz >= .99999) { float hz = uHaze * exp(-abs(dir.y) * uHazeK); return mix(c, uFogColor, hz); }
  float hy = w.y - uCamPos.y, e0 = exp(-uFogK * (uCamPos.y - uFogY0)), od = abs(hy) < 1e-3 ? uFogD * L * e0 : uFogD * L * e0 * (1. - exp(-uFogK * hy)) / (uFogK * hy);
  return mix(c, uFogColor, 1. - exp(-max(od, 0.))); }
uint hash(uvec3 v){ v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; return v.x ^ v.y ^ v.z; }
vec3 enc(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(vec3(.0031308), c)); }
void main(){ vec2 d = vUv - .5; float r2 = dot(d * vec2(uOut.x / uOut.y, 1.), d * vec2(uOut.x / uOut.y, 1.)) / (.25 * uOut.x / uOut.y * uOut.x / uOut.y + .25);   // 0 centre → 1 corner
  vec3 c; float fr = uFringe * smoothstep(.35, 1., r2);
  if (fr > .02) { vec2 o = normalize(d) * fr / uOut.x; c = vec3(comp(vUv + o).r, comp(vUv).g, comp(vUv - o).b); } else c = comp(vUv);
  c = AgXToneMapping(c);
  c = clamp(uGain * (c + uLift * (1. - c)), 0., 1.); c = pow(c, 1. / uGamma);
  c *= 1. - uVig * smoothstep(.2, 1., r2);
  c = enc(clamp(c, 0., 1.));
  uvec2 p = uvec2(gl_FragCoord.xy); float n = float(hash(uvec3(p, uSeed)) & 65535u) / 65535. + float(hash(uvec3(p + 7u, uSeed ^ 0x9e37u)) & 65535u) / 65535. - 1.;
  float l = dot(c, vec3(.2126, .7152, .0722)); c += n * uGrain * (.55 + 1.8 * l * (1. - l));
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }`;

export function createCineLook({renderer, scene, spec, ss = 1, aa = false}) {
  const quad = (mat) => { const m = new T.Mesh(new T.PlaneGeometry(2, 2), mat); m.frustumCulled = false; const sc = new T.Scene(); sc.add(m); return sc; }, oc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let W = 0, H = 0, rt = null, dofRT = null; const bloom = new UnrealBloomPass(new T.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  // bright pass with an edge fade (outer BLOOM.edge of the frame): a glow source crossing the frame edge ramps in instead of popping
  // (the mip blur clamps to the edge, so one bright edge row would smear along it); same threshold as three's pass
  // + Karis average: 4 bilinear taps (a 4×4 source footprint) weighted 1 / (1 + luma), so a sub-pixel HDR dot (a far window) cannot flicker the bloom
  bloom.highPassUniforms.uTexel = {value: new T.Vector2(1 / 512, 1 / 512)};
  bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader
    .replace('uniform float smoothWidth;', 'uniform float smoothWidth; uniform vec2 uTexel;')
    .replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = vec4(0.); float ws = 0.; for (int k = 0; k < 4; k++) { vec2 o = vec2(k == 0 || k == 2 ? -1. : 1., k < 2 ? -1. : 1.) * uTexel; vec4 c = texture2D( tDiffuse, vUv + o ); float w = 1. / (1. + luminance(c.rgb)); texel += c * w; ws += w; } texel /= ws;')
    .replace('gl_FragColor = mix( outputColor, texel, alpha );', 'vec2 eg = smoothstep(vec2(0.), vec2(' + BLOOM.edge.toFixed(3) + '), min(vUv, 1. - vUv)); gl_FragColor = mix( outputColor, texel, alpha * eg.x * eg.y );');
  bloom.materialHighPassFilter.needsUpdate = true;
  const dofM = new T.ShaderMaterial({uniforms: {tColor: {value: null}, tDepth: {value: null}, uFocus: {value: 10}, uK: {value: 0}, uMax: {value: DOF.maxCoC}, uAspect: {value: 9 / 16}, uNear: {value: .3}, uFar: {value: 900}}, vertexShader: VS, fragmentShader: DOF_FS, depthTest: false, depthWrite: false});
  const U = {tColor: {value: null}, tDepth: {value: null}, tDof: {value: null}, uSrc: {value: new T.Vector2()}, uOut: {value: new T.Vector2()}, uSS: {value: ss}, uDofOn: {value: 0}, uNear: {value: .3}, uFar: {value: 900},
    uInvProj: {value: new T.Matrix4()}, uCamWorld: {value: new T.Matrix4()}, uCamPos: {value: new T.Vector3()}, uFogColor: {value: new T.Color()}, uFogD: {value: FOG.density}, uFogK: {value: FOG.falloff}, uFogY0: {value: 0},
    uHaze: {value: FOG.haze}, uHazeK: {value: FOG.hazeK}, uExposure: {value: 1}, uLift: {value: new T.Vector3()}, uGamma: {value: new T.Vector3(1, 1, 1)}, uGain: {value: new T.Vector3(1, 1, 1)}, uVig: {value: 0}, uGrain: {value: GRAIN.amp}, uFringe: {value: 1}, uSeed: {value: 1}};
  const finalM = new T.ShaderMaterial({uniforms: U, vertexShader: VS, fragmentShader: FINAL_FS(), depthTest: false, depthWrite: false, toneMapped: false, glslVersion: null});
  const dofScene = quad(dofM), finalScene = quad(finalM);
  // glow surfaces → HDR (> 1): windows, bright unlit live parts (lamps), spec.glowCubes; the rest of the set and the cast stay as they are
  const glowMats = new Set();
  const markGlow = (root, skip) => root.traverse(o => { if (!o.isMesh || skip(o)) return; for (const m of [].concat(o.material)) { if (!m?.isMeshBasicMaterial || glowMats.has(m) || m.vertexColors || m.map || m.transparent) continue;
    const l = .2126 * m.color.r + .7152 * m.color.g + .0722 * m.color.b; if (m.userData.window || m.userData.glow || (o.userData.live && l > .55)) { glowMats.add(m); m.userData.ldr = m.color.clone(); m.color.multiplyScalar(m.userData.glowHDR ?? GLOW_HDR); } } });
  const setGlow = on => { for (const m of glowMats) { m.color.copy(m.userData.ldr); if (on) m.color.multiplyScalar(m.userData.glowHDR ?? GLOW_HDR); } };   // gates: glow surfaces back to LDR
  // contact blobs (one per actor / glow cube / story prop root)
  const blobs = new Map();
  function blobsFor(items, groundY) {
    for (const it of items) { let b = blobs.get(it.key); if (!b) { b = contactBlob(1, .55); b.material.depthTest = true; scene.add(b); blobs.set(it.key, b); }
      const h = Math.max(0, it.y - groundY(it.x, it.z)); b.visible = it.visible && h < 3; b.position.set(it.x, groundY(it.x, it.z) + .03, it.z); b.scale.setScalar(it.r); b.material.opacity = .55 * Math.max(0, 1 - h / 3); } }
  // foreground element (shot.fg), world-fixed at the shot's first camera
  const fgMeshes = {}; let fgShot = null;
  function fgBuild(kind) {
    if (fgMeshes[kind]) return fgMeshes[kind];
    const g = new T.Group(), dark = new T.MeshStandardMaterial({color: '#15171c', roughness: .8}), add = (geo, m, p) => { const x = new T.Mesh(geo, m); x.position.set(...p); g.add(x); return x; };
    if (kind === 'lantern') { add(new T.BoxGeometry(.62, .08, .62), dark, [0, .42, 0]); add(new T.BoxGeometry(.62, .08, .62), dark, [0, -.42, 0]); add(new T.CylinderGeometry(.02, .02, .9), dark, [0, .9, 0]);
      for (const [x, z] of [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28]]) add(new T.BoxGeometry(.05, .8, .05), dark, [x, 0, z]);
      add(new T.BoxGeometry(.5, .76, .5), new T.MeshBasicMaterial({color: new T.Color(1, .72, .38).multiplyScalar(1.25)}), [0, 0, 0]); }
    else if (kind === 'post') add(new T.BoxGeometry(.38, 9, .38), dark, [0, 0, 0]);
    else if (kind === 'leaves') { const lm = new T.MeshStandardMaterial({color: '#1d2a1a', roughness: .9, side: T.DoubleSide}); for (let i = 0; i < 9; i++) { const l = add(new T.CircleGeometry(.32, 5), lm, [Math.sin(i * 2.4) * .7, Math.cos(i * 1.7) * .5, (i % 3) * .08]); l.rotation.set(i * .7, i * 1.3, i * .4); l.scale.set(1, 1.7, 1); } }
    else if (kind === 'crowd') for (const [x, s] of [[-.6, 1], [.9, .92]]) { add(new T.BoxGeometry(2 * s, 2 * s, 1 * s), dark, [x, 0, 0]); add(new T.BoxGeometry(1.2 * s, 1.2 * s, 1.2 * s), dark, [x, 1.65 * s, 0]); add(new T.BoxGeometry(.9 * s, 2 * s, .9 * s), dark, [x - 1.5 * s, 0, 0]); }
    g.traverse(o => { o.userData.live = true; o.castShadow = false; }); g.visible = false; scene.add(g); fgMeshes[kind] = g; return g; }
  function fg(shot, cam0, subjectNdcX) {
    for (const g of Object.values(fgMeshes)) g.visible = false;
    if (!shot.fg) return null; const g = fgBuild(shot.fg), p = fgPlace(shot.fg, cam0, subjectNdcX); g.visible = true; g.position.set(...p.position); g.scale.setScalar(p.scale); g.lookAt(...cam0.position); fgShot = {kind: shot.fg, ...p}; return fgShot; }

  function size(w, h) {
    if (w === W && h === H) return; W = w; H = h; rt?.dispose(); dofRT?.dispose();
    const sw = w * ss, sh = h * ss; rt = new T.WebGLRenderTarget(sw, sh, {type: T.HalfFloatType, samples: aa && ss === 1 ? 4 : 0, depthTexture: new T.DepthTexture(sw, sh, T.UnsignedIntType)});
    rt.texture.minFilter = rt.texture.magFilter = T.LinearFilter; dofRT = new T.WebGLRenderTarget(Math.ceil(w / 2), Math.ceil(h / 2), {type: T.HalfFloatType, depthBuffer: false}); dofRT.texture.minFilter = dofRT.texture.magFilter = T.LinearFilter;
    bloom.setSize(sw, sh); bloom.highPassUniforms.uTexel.value.set(1 / sw, 1 / sh); }
  const state = {};
  // one frame: the scene (camera already posed) → canvas at w×h
  function render(camera, {w, h, shot, frame, focus = null, fogColor = null, fogY0 = 0, bloomOn = true, grainOn = true}) {
    size(w, h); const ex = renderer.toneMappingExposure, mood = shot?.mood, gr = gradeOf(mood), lens = shotLens(shot ?? {});
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
    if (bloomOn) bloom.render(renderer, null, rt, 0, false);
    const dOn = !!shot && dofOn(shot) && focus !== null && cocScale(lens, focus) > 0; U.uDofOn.value = dOn ? 1 : 0;
    if (dOn) { dofM.uniforms.tColor.value = rt.texture; dofM.uniforms.tDepth.value = rt.depthTexture; dofM.uniforms.uFocus.value = focus; dofM.uniforms.uK.value = Math.min(cocScale(lens, focus), 1);
      dofM.uniforms.uAspect.value = w / h; dofM.uniforms.uNear.value = camera.near; dofM.uniforms.uFar.value = camera.far; renderer.setRenderTarget(dofRT); renderer.render(dofScene, oc); }
    U.tColor.value = rt.texture; U.tDepth.value = rt.depthTexture; U.tDof.value = dofRT.texture; U.uSrc.value.set(w * ss, h * ss); U.uOut.value.set(w, h); U.uNear.value = camera.near; U.uFar.value = camera.far;
    camera.updateMatrixWorld(); U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld); U.uCamPos.value.copy(camera.position);
    U.uFogColor.value.copy(fogColor ?? scene.fog?.color ?? new T.Color('#141b2a')); U.uFogY0.value = fogY0; U.uExposure.value = ex;
    U.uLift.value.set(...gr.lift); U.uGamma.value.set(...gr.gamma); U.uGain.value.set(...gr.gain); U.uVig.value = gr.vig; U.uGrain.value = grainOn ? GRAIN.amp : 0; U.uFringe.value = w / 1440; U.uSeed.value = (frame * 2654435761 + 12345) >>> 0;
    renderer.setRenderTarget(null); renderer.render(finalScene, oc);
    Object.assign(state, {frame, focus, lens, dof: dOn, coc: dOn ? cocScale(lens, focus) : 0, exposure: ex, mood: mood ?? null, ss, fg: fgShot && shot?.fg ? fgShot : null});
  }
  return {render, markGlow, blobsFor, fg, state, setGlow, glowCount: () => glowMats.size, project, moodEV};
}
