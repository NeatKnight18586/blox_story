// engine/post7.js — Retention Engine post chain (browser; Phase 5, docs/bible/LOOK.md): scene → HDR target (MSAA) → GTAO (ambient
// occlusion) → light shafts from the sun ("volumetric" look: screen-space radial scattering of bright sky) → Bokeh DOF (emotion/close
// shots) → Unreal bloom → grade (white balance, saturation, contrast, lift, vignette, rain streaks) + AgX tone map + sRGB.
//   const P = createPost(renderer, scene, camera, {samples: 4}); P.setSize(w, h); P.render(settings, {sunDir}) → draws into the
//   renderer's current target (screen or a sub-frame target). settings = engine/moods7.js postFor(...).
import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const RAYS = {uniforms: {tDiffuse: {value: null}, sun: {value: new T.Vector2(.5, .8)}, strength: {value: 0}, decay: {value: .96}, threshold: {value: .9}, onScreen: {value: 1}},
  vertexShader: VS, fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 sun; uniform float strength, decay, threshold, onScreen; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tDiffuse, vUv); if (strength <= 0.) { gl_FragColor = c; return; }
    vec2 d = (vUv - sun) / 48.; vec2 p = vUv; float w = 1.; vec3 acc = vec3(0.);
    for (int i = 0; i < 48; i++) { p -= d; vec3 s = texture2D(tDiffuse, clamp(p, 0., 1.)).rgb; float l = dot(s, vec3(.2126, .7152, .0722));
      acc += s * smoothstep(threshold, threshold * 1.6, l) * w; w *= decay; }
    gl_FragColor = vec4(c.rgb + acc / 48. * strength * onScreen, c.a); }`};
const GRADE = {uniforms: {tDiffuse: {value: null}, gains: {value: new T.Vector3(1, 1, 1)}, saturation: {value: 1}, contrast: {value: 1}, lift: {value: new T.Vector3()},
  vignette: {value: 0}, toneMappingExposure: {value: 1}, rain: {value: 0}, rainAngle: {value: .15}, seed: {value: 0}, aspect: {value: 9 / 16}},
  vertexShader: VS, fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 gains, lift; uniform float saturation, contrast, vignette, rain, rainAngle, seed, aspect; varying vec2 vUv;
  ${T.ShaderChunk.tonemapping_pars_fragment}
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * gains + lift;
    if (rain > 0.) { vec2 q = vec2(vUv.x * aspect + vUv.y * rainAngle, vUv.y); vec2 g = vec2(q.x * 140., q.y * 7. + seed); vec2 id = floor(g); float r = h21(id);
      float streak = step(.88, r) * smoothstep(.0, .25, fract(g.y)) * (1. - smoothstep(.25, .9, fract(g.y))) * (1. - smoothstep(.04, .14, abs(fract(g.x) - .5)));
      c += vec3(.55, .6, .65) * streak * rain * .35; }
    float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, saturation); c = max(vec3(0.), (c - .18) * contrast + .18);
    c = AgXToneMapping(c);
    vec2 v = vUv - .5; c *= 1. - vignette * smoothstep(.25, .85, length(v * vec2(1., 1.25)));
    gl_FragColor = sRGBTransferOETF(vec4(clamp(c, 0., 1.), 1.)); }`};
const COPY = new T.ShaderMaterial({uniforms: {t: {value: null}}, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }', depthTest: false, depthWrite: false, toneMapped: false});

export function createPost(renderer, scene, camera, {samples = 4} = {}) {
  const rt = new T.WebGLRenderTarget(4, 4, {type: T.HalfFloatType, samples});
  const composer = new EffectComposer(renderer, rt); composer.renderToScreen = false;
  const render = new RenderPass(scene, camera), ao = new GTAOPass(scene, camera, 4, 4), rays = new ShaderPass(RAYS), dof = new BokehPass(scene, camera, {focus: 10, aperture: .003, maxblur: .01});
  const bloom = new UnrealBloomPass(new T.Vector2(4, 4), .3, .5, 1), grade = new ShaderPass(GRADE);
  for (const p of [render, ao, rays, dof, bloom, grade]) composer.addPass(p);
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), COPY); quad.frustumCulled = false; const qs = new T.Scene(); qs.add(quad); const qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let W = 4, H = 4, frame = 0;
  const sunUv = new T.Vector3(), clipBox = new T.Box3();
  return {
    composer, passes: {ao, rays, dof, bloom, grade},
    setSize(w, h) { if (w === W && h === H) return; W = w; H = h; composer.setSize(w, h); },
    render(S, {sunDir = null} = {}) {
      const out = renderer.getRenderTarget(), tm = renderer.toneMapping;
      ao.enabled = !!S.ao && S.ao.intensity > 0; if (ao.enabled) { ao.blendIntensity = S.ao.intensity; ao.updateGtaoMaterial({radius: S.ao.radius, distanceExponent: 1, thickness: 1, scale: 1});
        // AO only near the camera: a far sky dome (GroundedSkybox, r 420) otherwise reads as fully occluded and turns black at 1440 (Phase 5 fix)
        const r = S.ao.clip ?? 150; clipBox.min.copy(camera.position).addScalar(-r); clipBox.max.copy(camera.position).addScalar(r); ao.setSceneClipBox(clipBox); }
      rays.enabled = !!S.rays && S.rays.strength > 0 && !!sunDir;
      if (rays.enabled) { sunUv.copy(camera.position).addScaledVector(new T.Vector3(...sunDir), 500).project(camera); const on = sunUv.z < 1 ? Math.max(0, 1 - Math.max(0, Math.abs(sunUv.x) - 1) * 2) : 0;
        rays.uniforms.sun.value.set(sunUv.x * .5 + .5, sunUv.y * .5 + .5); rays.uniforms.strength.value = S.rays.strength; rays.uniforms.decay.value = S.rays.decay; rays.uniforms.threshold.value = S.rays.threshold; rays.uniforms.onScreen.value = on; }
      dof.enabled = !!S.dof; if (dof.enabled) { const u = dof.uniforms; u.focus.value = S.dof.focus; u.aperture.value = S.dof.aperture; u.maxblur.value = S.dof.maxblur; }
      bloom.enabled = !!S.bloom && S.bloom.strength > 0; if (bloom.enabled) { bloom.strength = S.bloom.strength; bloom.radius = S.bloom.radius; bloom.threshold = S.bloom.threshold; }
      const g = grade.uniforms, G = S.grade ?? {}; g.gains.value.set(...(G.gains ?? [1, 1, 1])); g.saturation.value = G.saturation ?? 1; g.contrast.value = G.contrast ?? 1;
      g.lift.value.set(...(G.lift ?? [0, 0, 0])); g.vignette.value = G.vignette ?? 0; g.toneMappingExposure.value = renderer.toneMappingExposure;
      g.rain.value = S.rain?.amount ?? 0; g.rainAngle.value = S.rain?.angle ?? .15; g.seed.value = (S.seed ?? frame++) * 1.37; g.aspect.value = W / H;
      renderer.toneMapping = T.NoToneMapping; composer.render(); renderer.toneMapping = tm;
      COPY.uniforms.t.value = composer.readBuffer.texture; renderer.setRenderTarget(out); renderer.render(qs, qc);
    }};
}
