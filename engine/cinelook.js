// engine/cinelook.js — tuft 1B Look Pack (opt-in spec `post: 'cine'`; spec.look / look4 stay the look preset). "Made in Blender" on our
// renderer, cheaply: the scene renders into a linear HDR target (+ depth), then
//   1. bloom   three's UnrealBloomPass (half-res mip chain), threshold 1.0 on HDR luminance: only glow surfaces (windows, lamps,
//              glow cubes / beast seams pushed to GLOW_HDR) pass; lit sets and characters stay ≤ 1 and never bloom.
//   2. DOF     ONE half-res gather (12 taps on a golden-angle spiral, scatter-as-gather weights, CoC clamp): focus = the shot's
//              subject head (engine/cine.js focusAt, `rack`), strength by lens (85 mm strongest), off on wides unless shot.dof.
//   3. grade   ONE pass: height fog + horizon haze from depth (1B fix: nothing within FOG.start = 25 studs of the camera, haze
//              ≤ .08: fog only separates the far layers), AgX (three's chunk) at the frame's exposure (look × mood6 ev),
//              lift / gamma / gain per mood, then (1B fix) an S-curve on display luma (black point ~2 %), a night colour script
//              (teal shadows / warm highlights), +10 % saturation in the mids, vignette ≤ .25, corner chromatic fringe, seeded grain.
//   AA         1B fix: no supersample; with aa the HDR target is a WebGL2 multisampled target (MSAA 4×), resolved before the passes.
//   actors     1B fix: an actors-only shader light (cast materials patched in place, sets keep their baked light): a cool moon RIM
//              from behind-above on the far side from the camera (follows the shot) + a soft warm KEY from the nearest lantern.
// Plus: no live shadow maps (episode.js turns them off), one soft contact blob per actor / glow cube (look5b.contactBlob),
// shot `fg` foreground element (engine/cine.js fgPlace; 1B fix: the lantern is a pre-blurred gaussian warm sprite, dimmer than the subject). Pure helpers at the bottom are tested in tests/cine.js.
import * as T from 'three';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {contactBlob} from './look5b.js';
import {MOODS} from './mood6.js';
import {shotLens, focusAt, fgPlace, project} from './cine.js';

export const GLOW_HDR = 3.2, BLOOM = {threshold: 1.0, strength: .35, radius: .2, edge: .03};
export const DOF = {fNumber: {24: 0, 35: 5.6, 50: 4, 85: 2.4}, unitMM: 300, sensorW: 24, maxCoC: .012, taps: 12};   // maxCoC: fraction of the frame width
export const GRAIN = {amp: .058};   // 1B fix: .052 → .058 (the darker grade lowered the measured std)   // triangular noise in display space; luma std ≈ 2 % (measured: scripts/v2/cine-gates.js)
export const FOG = {density: .007, falloff: .09, haze: .08, hazeK: 9, start: 25};
export const BG = {dim: .62, near: 1.5, far: 12};   // 1B fix: the set behind the subject falls off (× dim from subject + near to subject + far studs): the lit subject reads in front   // start: studs from the camera with no fog at all
export const BG_SIZE = {ews: 0, ws: 0, wide: 0, establishing: 0, ms: .5, medium: .5, mcu: 1, cu: 1, ecu: 1, close: 1};   // tuft 2A (owner ruling): background falloff strength per shot size (0 on wides, full on close sizes)
export const bgDimOf = shot => 1 - (1 - BG.dim) * (BG_SIZE[shot?.size] ?? 1);
export const CURVE = {pivot: .42, k: 1.4, black: .02, inBlack: .05, exposure: -.35, sat: .10, shadow: [-.014, .004, .024], high: [.030, .008, -.026], vigMax: .25};   // display-space grade after AgX
export const ACTOR_LIGHT = {lift: .6, rim: {color: '#a9c8ff', i: .9, pow: 2.4, side: .5, up: .7}, key: {color: '#ffb36e', i: .45, far: .25, range: 16}, fill: .25};   // tuft 2A (owner ruling): fill = .25 of the key, opposite side, so dark jackets keep torso shape
// tuft 2B (opt-in spec `grade: 'clear'`, owner "looks like cctv footage"): fine luma-only 1 px grain (std ≤ .8 %), no fringe, vignette ≤ .12
// (multiply only), +20 % mid saturation, black point 1 % with no lift, the teal / warm split at half strength, a brighter exposure, and no
// fog / haze within 60 studs (the far skyline only). Without `grade: 'clear'` every constant above stays as it was (1B fixture byte-identical).
export const CLEAR = {grain: .018, vigMax: .12, sat: .20, black: .01, split: .5, exposure: -.3, fogStart: 60, haze: .03, fogTint: .55, sky: [.55, .74, .95], skyFrom: -.06, skyTo: .3, skyK: .85, inBlack: .11, skyDist: 380, preSat: 1.15, k: 1.6};   // skyDist: the sky dome (engine/look.js radius 420) counts as sky
export const isClear = spec => spec?.grade === 'clear';
export const curveOf = clear => clear ? {...CURVE, k: CLEAR.k, black: CLEAR.black, inBlack: CLEAR.inBlack, sat: CLEAR.sat, exposure: CLEAR.exposure, shadow: CURVE.shadow.map(v => v * CLEAR.split), high: CURVE.high.map(v => v * CLEAR.split), vigMax: CLEAR.vigMax} : CURVE;
export const FGGLOW = {color: [1, .62, .3], i: .5, size: 1.7, sigma: .2};   // lantern sprite: HDR colour × i (below the subject's highlights), gaussian sigma (of the half-size)
export const GRADE = {
  default: {lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], vig: .28},
  tension: {lift: [0, .004, .014], gamma: [.98, 1, 1.03], gain: [.98, 1, 1.03], vig: .38},
  emotion: {lift: [.010, .005, 0], gamma: [1.02, 1, .98], gain: [1.03, 1, .96], vig: .32},
  awe: {lift: [0, .002, .010], gamma: [1, 1.01, 1.02], gain: [1, 1.01, 1.03], vig: .22},
  comedy: {lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1.01, 1.01, 1], vig: .16},
  fun: {lift: [.004, .002, 0], gamma: [1, 1, 1], gain: [1.02, 1.01, 1], vig: .16},
  payoff: {lift: [.006, .004, 0], gamma: [1.03, 1.02, 1], gain: [1.05, 1.03, 1], vig: .22}};
export const gradeOf = (mood, clear = false) => { const g = GRADE[mood] ?? GRADE.default; return clear ? {...g, lift: [0, 0, 0], vig: Math.min(g.vig, CLEAR.vigMax)} : {...g, vig: Math.min(g.vig, CURVE.vigMax)}; };   // clear: no milky lift
// pure: display-luma S-curve (pivot, slope k at the pivot), black point lifted to CURVE.black
export const sCurve = (x, clear = false) => { const {pivot: p, k, black: b, inBlack: ib} = curveOf(clear); x = Math.max(0, Math.min(1, x) - ib) / (1 - ib); const y = x < p ? p * (x / p) ** k : 1 - (1 - p) * ((1 - x) / (1 - p)) ** k; return b + (1 - b) * y; };
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
const FINAL_FS = (CV = CURVE, clear = false) => `precision highp float; precision highp int; uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tDof; uniform vec2 uOut; uniform float uDofOn; uniform float uFogStart; uniform float uSubZ; uniform float uBgDim; uniform float uEdgeAA;
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos; uniform vec3 uFogColor; uniform float uFogD; uniform float uFogK; uniform float uFogY0; uniform float uHaze; uniform float uHazeK;
uniform vec3 uLift; uniform vec3 uGamma; uniform vec3 uGain; uniform float uVig; uniform float uGrain; uniform float uFringe; uniform uint uSeed; varying vec2 vUv; ${DEPTH}
${agx()}
float lumL(vec3 c){ return log2(1. + 8. * dot(c, vec3(.2126, .7152, .0722))); }
vec3 sceneAA(vec2 uv){ vec3 c = texture2D(tColor, uv).rgb; if (uEdgeAA < .5) return c;   // 1B fix: cheap edge AA on top of MSAA (FXAA-lite: blend toward the steeper neighbour pair)
  vec2 t = 1. / uOut; vec3 n = texture2D(tColor, uv + vec2(0., t.y)).rgb, s = texture2D(tColor, uv - vec2(0., t.y)).rgb, e = texture2D(tColor, uv + vec2(t.x, 0.)).rgb, w = texture2D(tColor, uv - vec2(t.x, 0.)).rgb;
  float lm = lumL(c), ln = lumL(n), ls = lumL(s), le = lumL(e), lw = lumL(w), mn = min(lm, min(min(ln, ls), min(le, lw))), mx = max(lm, max(max(ln, ls), max(le, lw))), rg = mx - mn;
  if (rg < max(.06, .15 * mx)) return c;
  float sub = clamp(abs((ln + ls + le + lw) * .25 - lm) / rg, 0., 1.), b = smoothstep(0., 1., sub); b = b * b * .6;
  bool hz = abs(ln + ls - 2. * lm) >= abs(le + lw - 2. * lm);
  vec3 o = hz ? (abs(ln - lm) >= abs(ls - lm) ? n : s) : (abs(le - lm) >= abs(lw - lm) ? e : w); return mix(c, o, b * .5); }
vec3 comp(vec2 uv){ vec3 c = sceneAA(uv); if (uDofOn > .5) { vec4 d = texture2D(tDof, uv); c = mix(c, d.rgb, smoothstep(.04, .3, d.a)); }
  float dz = texture2D(tDepth, uv).x; vec4 v = uInvProj * vec4(uv * 2. - 1., dz * 2. - 1., 1.); v /= v.w; vec3 w = (uCamWorld * v).xyz, ray = w - uCamPos; float L = length(ray); vec3 dir = ray / max(L, 1e-4);
  if (uSubZ > 0.) c *= mix(1., uBgDim, smoothstep(uSubZ + ${BG.near.toFixed(2)}, uSubZ + ${BG.far.toFixed(2)}, dz >= .99999 ? 1e4 : dot(ray, normalize((uCamWorld * vec4(0., 0., -1., 0.)).xyz))));   // background falloff behind the subject (view depth)
  if (dz >= .99999${clear ? ` || L > ${CLEAR.skyDist.toFixed(1)}` : ''}) { float hz = uHaze * exp(-abs(dir.y) * uHazeK);${clear ? ` { float sl = dot(c, vec3(.2126, .7152, .0722)), up = smoothstep(${CLEAR.skyFrom.toFixed(3)}, ${CLEAR.skyTo.toFixed(3)}, dir.y); c = mix(c, sl * vec3(${CLEAR.sky.map(v => v.toFixed(3)).join(', ')}) / ${(.2126 * CLEAR.sky[0] + .7152 * CLEAR.sky[1] + .0722 * CLEAR.sky[2]).toFixed(4)}, up * ${CLEAR.skyK.toFixed(3)}); }` : ''} return mix(c, uFogColor, hz); }   // 2B clear: the zenith toward a clean blue at the same brightness (the horizon keeps its warmth)
  float Lf = max(L - uFogStart, 0.), hy = w.y - uCamPos.y, e0 = exp(-uFogK * (uCamPos.y - uFogY0)), od = abs(hy) < 1e-3 ? uFogD * Lf * e0 : uFogD * Lf * e0 * (1. - exp(-uFogK * hy)) / (uFogK * hy);
  return mix(c, uFogColor, 1. - exp(-max(od, 0.))); }
uint hash(uvec3 v){ v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; return v.x ^ v.y ^ v.z; }
vec3 enc(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(vec3(.0031308), c)); }
void main(){ vec2 d = vUv - .5; float r2 = dot(d * vec2(uOut.x / uOut.y, 1.), d * vec2(uOut.x / uOut.y, 1.)) / (.25 * uOut.x / uOut.y * uOut.x / uOut.y + .25);   // 0 centre → 1 corner
  vec3 c; float fr = uFringe * smoothstep(.35, 1., r2);
  if (${clear ? 'false' : 'fr > .02'}) { vec2 o = normalize(d) * fr / uOut.x; c = vec3(comp(vUv + o).r, comp(vUv).g, comp(vUv - o).b); } else c = comp(vUv);
${clear ? `  { float lL = dot(c, vec3(.2126, .7152, .0722)); c = max(vec3(0.), mix(vec3(lL), c, ${CLEAR.preSat.toFixed(3)})); }   // 2B clear: restore the chroma AgX takes out (linear, before the curve)
` : ''}  c = AgXToneMapping(c);
  c = clamp(uGain * (c + uLift * (1. - c)), 0., 1.); c = pow(c, 1. / uGamma);
  c *= 1. - uVig * smoothstep(.2, 1., r2);
  c = enc(clamp(c, 0., 1.));
  { float L0 = max(dot(c, vec3(.2126, .7152, .0722)), 1e-4), p = ${CV.pivot.toFixed(3)}, k = ${CV.k.toFixed(3)}, b = ${CV.black.toFixed(3)}, ib = ${CV.inBlack.toFixed(3)};   // S-curve on luma (hue kept): input black ib → output black point b
    float Li = max(L0 - ib, 0.) / (1. - ib), L1 = Li < p ? p * pow(Li / p, k) : 1. - (1. - p) * pow((1. - Li) / (1. - p), k); L1 = b + (1. - b) * L1;
    c = c * (L1 / L0); float ws = 1. - smoothstep(0., .45, L1), wh = smoothstep(.35, .9, L1);
    c += ws * vec3(${CV.shadow.map(v => v.toFixed(3)).join(', ')}) + wh * vec3(${CV.high.map(v => v.toFixed(3)).join(', ')});   // night colour script: teal shadows, warm pools
    float Lc = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(Lc), c, 1. + ${CV.sat.toFixed(3)} * ${clear ? 'clamp(25. * Lc * (1. - Lc), 0., 1.)' : '4. * Lc * (1. - Lc)'}); c = clamp(c, 0., 1.); }
  uvec2 p = uvec2(gl_FragCoord.xy); float n = float(hash(uvec3(p, uSeed)) & 65535u) / 65535. + float(hash(uvec3(p + 7u, uSeed ^ 0x9e37u)) & 65535u) / 65535. - 1.;
  float l = dot(c, vec3(.2126, .7152, .0722)); c += n * uGrain${clear ? '' : ' * (.55 + 1.8 * l * (1. - l))'};
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }`;

export function createCineLook({renderer, scene, spec, aa = false}) {
  const clear = isClear(spec), CV = curveOf(clear), FG0 = clear ? {...FOG, start: CLEAR.fogStart, haze: CLEAR.haze} : FOG;   // tuft 2B: grade 'clear'
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
  const U = {tColor: {value: null}, tDepth: {value: null}, tDof: {value: null}, uOut: {value: new T.Vector2()}, uDofOn: {value: 0}, uFogStart: {value: FG0.start}, uSubZ: {value: 0}, uBgDim: {value: BG.dim}, uEdgeAA: {value: aa ? 1 : 0}, uNear: {value: .3}, uFar: {value: 900},
    uInvProj: {value: new T.Matrix4()}, uCamWorld: {value: new T.Matrix4()}, uCamPos: {value: new T.Vector3()}, uFogColor: {value: new T.Color()}, uFogD: {value: FOG.density}, uFogK: {value: FOG.falloff}, uFogY0: {value: 0},
    uHaze: {value: FG0.haze}, uHazeK: {value: FOG.hazeK}, uExposure: {value: 1}, uLift: {value: new T.Vector3()}, uGamma: {value: new T.Vector3(1, 1, 1)}, uGain: {value: new T.Vector3(1, 1, 1)}, uVig: {value: 0}, uGrain: {value: clear ? CLEAR.grain : GRAIN.amp}, uFringe: {value: 1}, uSeed: {value: 1}};
  const finalM = new T.ShaderMaterial({uniforms: U, vertexShader: VS, fragmentShader: FINAL_FS(CV, clear), depthTest: false, depthWrite: false, toneMapped: false, glslVersion: null});
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
  let gTex = null; const glowTex = () => { if (gTex) return gTex; const n = 128, b = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const r = Math.hypot(x + .5 - n / 2, y + .5 - n / 2) / (n / 2), a = Math.exp(-r * r / (2 * FGGLOW.sigma * FGGLOW.sigma)) * (r < 1 ? 1 : 0), i = (y * n + x) * 4; b[i] = b[i + 1] = b[i + 2] = 255; b[i + 3] = Math.round(a * 255); }
    gTex = new T.DataTexture(b, n, n, T.RGBAFormat); gTex.magFilter = gTex.minFilter = T.LinearFilter; gTex.needsUpdate = true; return gTex; };
  const fgMeshes = {}; let fgShot = null;
  function fgBuild(kind) {
    if (fgMeshes[kind]) return fgMeshes[kind];
    const g = new T.Group(), dark = new T.MeshStandardMaterial({color: '#15171c', roughness: .8}), add = (geo, m, p) => { const x = new T.Mesh(geo, m); x.position.set(...p); g.add(x); return x; };
    if (kind === 'lantern') { const sp = new T.Sprite(new T.SpriteMaterial({map: glowTex(), color: new T.Color(...FGGLOW.color).multiplyScalar(FGGLOW.i), transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, fog: false, toneMapped: false}));
      sp.scale.set(FGGLOW.size, FGGLOW.size, 1); sp.name = 'fgGlow'; sp.renderOrder = 10; g.add(sp); }   // 1B fix: out-of-focus lantern = a pre-blurred soft glow (no hard edges, no bloom)
    else if (kind === 'post') add(new T.BoxGeometry(.38, 9, .38), dark, [0, 0, 0]);
    else if (kind === 'leaves') { const lm = new T.MeshStandardMaterial({color: '#1d2a1a', roughness: .9, side: T.DoubleSide}); for (let i = 0; i < 9; i++) { const l = add(new T.CircleGeometry(.32, 5), lm, [Math.sin(i * 2.4) * .7, Math.cos(i * 1.7) * .5, (i % 3) * .08]); l.rotation.set(i * .7, i * 1.3, i * .4); l.scale.set(1, 1.7, 1); } }
    else if (kind === 'crowd') for (const [x, s] of [[-.6, 1], [.9, .92]]) { add(new T.BoxGeometry(2 * s, 2 * s, 1 * s), dark, [x, 0, 0]); add(new T.BoxGeometry(1.2 * s, 1.2 * s, 1.2 * s), dark, [x, 1.65 * s, 0]); add(new T.BoxGeometry(.9 * s, 2 * s, .9 * s), dark, [x - 1.5 * s, 0, 0]); }
    g.traverse(o => { o.userData.live = true; o.castShadow = false; }); g.visible = false; scene.add(g); fgMeshes[kind] = g; return g; }
  function fg(shot, cam0, subjectNdcX) {
    for (const g of Object.values(fgMeshes)) g.visible = false;
    if (!shot.fg) return null; const g = fgBuild(shot.fg), p = fgPlace(shot.fg, cam0, subjectNdcX); g.visible = true; g.position.set(...p.position); g.scale.setScalar(p.scale); g.lookAt(...cam0.position); fgShot = {kind: shot.fg, ...p}; return fgShot; }

  function size(w, h) {
    if (w === W && h === H) return; W = w; H = h; rt?.dispose(); dofRT?.dispose();
    const sw = w, sh = h; rt = new T.WebGLRenderTarget(sw, sh, {type: T.HalfFloatType, samples: aa ? 4 : 0, depthTexture: new T.DepthTexture(sw, sh, T.UnsignedIntType)});   // MSAA 4× (WebGL2), resolved by three before sampling
    rt.texture.minFilter = rt.texture.magFilter = T.LinearFilter; dofRT = new T.WebGLRenderTarget(Math.ceil(w / 2), Math.ceil(h / 2), {type: T.HalfFloatType, depthBuffer: false}); dofRT.texture.minFilter = dofRT.texture.magFilter = T.LinearFilter;
    bloom.setSize(sw, sh); bloom.highPassUniforms.uTexel.value.set(1 / sw, 1 / sh); }
  // actors-only light (1B fix): every cast material (not decals / basic) patched in place; one shared set of world-space directions
  const AL = {uCRimDir: {value: new T.Vector3(0, 1, 0)}, uCRimCol: {value: new T.Color(ACTOR_LIGHT.rim.color)}, uCRimI: {value: 0}, uCRimPow: {value: ACTOR_LIGHT.rim.pow},
    uCKeyDir: {value: new T.Vector3(0, 1, 0)}, uCKeyCol: {value: new T.Color(ACTOR_LIGHT.key.color)}, uCKeyI: {value: 0}, uCLift: {value: 1}, uCFillDir: {value: new T.Vector3(0, 1, 0)}}, litMats = new Set();
  function lightActors(roots) {
    for (const r of roots) r.traverse(o => { if (!o.isMesh || o.name === 'face_decal') return; for (const m of [].concat(o.material)) {
      if (!m || litMats.has(m) || m.isMeshBasicMaterial || m.isSpriteMaterial || m.isShaderMaterial) continue; litMats.add(m);
      const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey?.bind(m);
      m.onBeforeCompile = (sh, rr) => { prev?.call(m, sh, rr); Object.assign(sh.uniforms, AL);
        sh.fragmentShader = 'uniform vec3 uCRimDir; uniform vec3 uCRimCol; uniform float uCRimI; uniform float uCRimPow; uniform vec3 uCKeyDir; uniform vec3 uCKeyCol; uniform float uCKeyI; uniform float uCLift; uniform vec3 uCFillDir;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
          `{ vec3 nC = normalize(normal), vC = normalize(vViewPosition), rdC = normalize((viewMatrix * vec4(uCRimDir, 0.)).xyz), kdC = normalize((viewMatrix * vec4(uCKeyDir, 0.)).xyz);
  float frC = pow(1. - clamp(dot(nC, vC), 0., 1.), uCRimPow), rlC = smoothstep(-.15, .55, dot(nC, rdC)), kwC = clamp(dot(nC, kdC) * .5 + .5, 0., 1.); kwC *= kwC;
  outgoingLight *= uCLift * ((1. - .35 * uCKeyI) + 1.3 * uCKeyI * kwC * uCKeyCol);   // actor lift over the darker set + soft warm key (wrap), the far side a touch darker
  outgoingLight += uCRimCol * uCRimI * frC * rlC;
  { vec3 fdC = normalize((viewMatrix * vec4(uCFillDir, 0.)).xyz); float fwC = clamp(dot(nC, fdC) * .5 + .5, 0., 1.); outgoingLight += uCLift * diffuseColor.rgb * (1.3 * ${ACTOR_LIGHT.fill.toFixed(3)} * uCKeyI) * fwC * fwC * uCKeyCol; } }   // tuft 2A: soft fill opposite the key   // cool moon rim from behind-above
#include <opaque_fragment>`); };
      m.customProgramCacheKey = () => (key0 ? key0() : '') + '|cineActor'; m.needsUpdate = true; } });
    return litMats.size; }
  // per frame: subject S, camera C, the nearest warm practical (world light) → rim + key directions (world space)
  function aimActorLight(S, C, face, lights = []) {
    const cd = new T.Vector3(C[0] - S[0], 0, C[2] - S[2]); if (cd.lengthSq() < 1e-6) cd.set(0, 0, 1); cd.normalize();
    const f = new T.Vector3(face?.[0] ?? 0, 0, face?.[1] ?? 1).normalize(), cp = cd.clone().addScaledVector(f, -cd.dot(f)); if (cp.lengthSq() < .01) cp.set(-cd.z, 0, cd.x); cp.normalize();
    AL.uCRimDir.value.copy(cd).multiplyScalar(-1).addScaledVector(cp, -ACTOR_LIGHT.rim.side).add(new T.Vector3(0, ACTOR_LIGHT.rim.up, 0)).normalize(); AL.uCRimI.value = ACTOR_LIGHT.rim.i; AL.uCLift.value = 2 ** ACTOR_LIGHT.lift;
    let best = null, bd = Infinity; for (const l of lights) { const d = Math.hypot(l.p[0] - S[0], l.p[2] - S[2]); if (d < bd) { bd = d; best = l; } }
    if (best && bd <= ACTOR_LIGHT.key.range) { AL.uCKeyDir.value.set(best.p[0] - S[0], Math.max(.5, best.p[1] - S[1] - 3), best.p[2] - S[2]).normalize(); AL.uCKeyI.value = ACTOR_LIGHT.key.i; }
    else { AL.uCKeyDir.value.copy(cd).addScaledVector(cp, .8).add(new T.Vector3(0, .7, 0)).normalize(); AL.uCKeyI.value = ACTOR_LIGHT.key.i * ACTOR_LIGHT.key.far; }
    { const k = AL.uCKeyDir.value; AL.uCFillDir.value.set(-k.x, .3, -k.z).normalize(); }
    return {rim: AL.uCRimDir.value.toArray(), key: AL.uCKeyDir.value.toArray(), keyI: AL.uCKeyI.value, lantern: best && bd <= ACTOR_LIGHT.key.range ? best.p : null}; }
  const setActorLight = on => { AL.uCRimI.value = on ? ACTOR_LIGHT.rim.i : 0; AL.uCLift.value = on ? 2 ** ACTOR_LIGHT.lift : 1; if (!on) AL.uCKeyI.value = 0; };
  const state = {};
  // one frame: the scene (camera already posed) → canvas at w×h
  function render(camera, {w, h, shot, frame, focus = null, subjectZ = null, fogColor = null, fogY0 = 0, bloomOn = true, grainOn = true, bgOn = true}) {
    size(w, h); const ex = renderer.toneMappingExposure, mood = shot?.mood, gr = gradeOf(mood, clear), lens = shotLens(shot ?? {});
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
    if (bloomOn) bloom.render(renderer, null, rt, 0, false);
    const dOn = !!shot && dofOn(shot) && focus !== null && cocScale(lens, focus) > 0; U.uDofOn.value = dOn ? 1 : 0;
    if (dOn) { dofM.uniforms.tColor.value = rt.texture; dofM.uniforms.tDepth.value = rt.depthTexture; dofM.uniforms.uFocus.value = focus; dofM.uniforms.uK.value = Math.min(cocScale(lens, focus), 1);
      dofM.uniforms.uAspect.value = w / h; dofM.uniforms.uNear.value = camera.near; dofM.uniforms.uFar.value = camera.far; renderer.setRenderTarget(dofRT); renderer.render(dofScene, oc); }
    U.tColor.value = rt.texture; U.tDepth.value = rt.depthTexture; U.tDof.value = dofRT.texture; U.uOut.value.set(w, h); U.uNear.value = camera.near; U.uFar.value = camera.far;
    camera.updateMatrixWorld(); U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld); U.uCamPos.value.copy(camera.position);
    U.uFogColor.value.copy(fogColor ?? scene.fog?.color ?? new T.Color('#141b2a')); if (clear) U.uFogColor.value.lerp(new T.Color().setRGB(...CLEAR.sky), CLEAR.fogTint); U.uFogY0.value = fogY0; U.uSubZ.value = bgOn && subjectZ && bgDimOf(shot) < 1 ? subjectZ : 0; U.uBgDim.value = bgDimOf(shot); U.uExposure.value = ex * 2 ** CV.exposure;   // 2B clear: the far skyline haze toward clean sky (no sepia)
    U.uLift.value.set(...gr.lift); U.uGamma.value.set(...gr.gamma); U.uGain.value.set(...gr.gain); U.uVig.value = gr.vig; U.uGrain.value = grainOn ? (clear ? CLEAR.grain : GRAIN.amp) : 0; U.uFringe.value = clear ? 0 : w / 1440; U.uSeed.value = (frame * 2654435761 + 12345) >>> 0;
    renderer.setRenderTarget(null); renderer.render(finalScene, oc);
    Object.assign(state, {frame, focus, lens, dof: dOn, coc: dOn ? cocScale(lens, focus) : 0, exposure: ex, mood: mood ?? null, aa, fg: fgShot && shot?.fg ? fgShot : null});
  }
  return {render, markGlow, blobsFor, fg, state, setGlow, glowCount: () => glowMats.size, project, moodEV, lightActors, aimActorLight, setActorLight, FOG: FG0, clear, clearFog: c => { if (clear && c) c.lerp(new T.Color().setRGB(...CLEAR.sky), CLEAR.fogTint); }};
}
