// engine/outline.js — Look Signature outline pass (opt-in: looks4.json `<preset>.v4.outline` or spec `outline`: off | classic | classicPlus).
// Edges from a SURFACE-ID buffer (one id per mesh, per instance) + view normals + depth, not a depth-only Sobel:
//   · id differs, or the normals turn ≥ ~37°, or the inverse depth is not locally planar (a silhouette; planes are affine in 1/z,
//     so grazing ground never self-edges);
//   · the line sits on the NEARER side only (1 px, not 2), colour = the pixel under it darkened by `dark` (never pure black:
//     a multiply overlay drawn after the frame, so the look path itself is untouched);
//   · width 1 px at 720 × 1280, scaled by resolution (below 1 px the line keeps 1 px and fades by the ratio);
//   · fades with distance: full < fadeNear (40 studs), gone by fadeFar (250);
//   · classicPlus: characters (cast + crowd roots, userData.olChar) get 2× width and full strength at any distance.
// MRT (Phase 1D, classic only): the main pass itself writes a second attachment (id, view normal xy, 1/z) through patched shader
// chunks (common / project_vertex / dithering_fragment), into a multisampled 2-attachment target rendered as if to the canvas
// (tone mapping + output colour space per material); one fullscreen pass copies it and darkens the edges straight onto the canvas: no second geometry pass. Ids hash the object (+ instance)
// translation. Shaders without those chunks write nothing to attachment 1 (only the cleared sky value / far fade applies there).
// classicPlus keeps the two-pass path below (characters need the per-object char flag).
// Cost (two-pass path): one extra geometry pass with a trivial shader (sky, sprites, points, lines, transparent surfaces and anything beyond the
// fade skipped) + one fullscreen pass (5 taps per pixel; classicPlus character pixels 9).
import * as T from 'three';
export const MODES = ['off', 'classic', 'classicPlus'];
export const DEFAULTS = {dark: .55, fadeNear: 40, fadeFar: 250, charScale: 2, refH: 1280, normalDot: .8, depthK: .03};
// Pure: the line parameters for a mode at an output height.
export function outlineParams(mode, height, o = {}) {
  const p = {...DEFAULTS, ...o}, w = height / p.refH;
  if (!MODES.includes(mode)) throw Error('outline mode ' + mode);
  return {on: mode !== 'off', plus: mode === 'classicPlus', radius: Math.max(1, w), alpha: Math.min(1, w), charRadius: Math.max(1, w * p.charScale), ...p};
}
// Pure: distance fade (1 near → 0 far), smoothstep.
export function fadeAt(d, near = DEFAULTS.fadeNear, far = DEFAULTS.fadeFar) { const u = Math.min(1, Math.max(0, (d - near) / (far - near))); return 1 - u * u * (3 - 2 * u); }
// Pure: a mesh / instance id → the float written to the id buffer (distinct neighbours ≥ 1/1024 apart; half-float exact).
export const idValue = (objId, inst = 0, char = false) => ((((objId * 37) % 1009 + inst * 101) % 1009) + 1) / 1024 * (char ? -1 : 1);

const ID_VS = `uniform float uId; uniform float uChar; varying vec3 vN; varying float vId; varying float vZ;
#include <common>
void main() {
#include <beginnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <project_vertex>
  vN = normalize(transformedNormal); vZ = -mvPosition.z;
  float inst = 0.0;
#ifdef USE_INSTANCING
  inst = float(gl_InstanceID);
#endif
  vId = (mod(uId + inst * 101.0, 1009.0) + 1.0) / 1024.0 * (uChar > 0.5 ? -1.0 : 1.0);   // characters: negative ids
}`;
// id buffer (RGBA half float): x = signed surface id (sky 2.0), yz = view normal xy, w = 1 / view depth (planes are affine in it)
const ID_FS = `varying vec3 vN; varying float vId; varying float vZ;
void main() { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(vId, n.x, n.y, 1.0 / max(vZ, 1e-3)); }`;
const EDGE_FS = `uniform sampler2D tId; uniform float uR; uniform float uCR; uniform float uPlus; uniform float uAlpha;
uniform float uDark; uniform float uFadeN; uniform float uFadeF; uniform float uNDot; uniform float uDK;
vec4 at(ivec2 p) { return texelFetch(tId, p, 0); }   // nearest texel (the quad never samples outside: offsets are clamped by the caller)
// 1 = an edge on this pixel's (nearer) side against neighbour q: another surface id, a normal turn (|Δn.xy|² > uNDot), ties → larger id
float side(vec4 c, vec4 q) { vec2 dn = c.yz - q.yz; bool diff = abs(abs(c.x) - abs(q.x)) > 0.0004 || dot(dn, dn) > uNDot;
  return diff && (c.w > q.w * 1.002 || (c.w >= q.w * 0.998 && abs(c.x) > abs(q.x))) ? 1.0 : 0.0; }
float edgeAt(vec4 c, int r, ivec2 p, ivec2 hi) {
  vec4 a = at(min(p + ivec2(r, 0), hi)), b = at(max(p - ivec2(r, 0), ivec2(0))), u = at(min(p + ivec2(0, r), hi)), d = at(max(p - ivec2(0, r), ivec2(0)));
  float e = max(max(side(c, a), side(c, b)), max(side(c, u), side(c, d)));
  float lap = abs(a.w + b.w - 2.0 * c.w) + abs(u.w + d.w - 2.0 * c.w), mx = max(max(a.w, b.w), max(u.w, d.w)), mn = min(min(a.w, b.w), min(u.w, d.w));
  return lap > uDK * c.w && c.w >= 0.5 * (mx + mn) ? 1.0 : e;   // silhouette: 1/z not planar here, and this pixel is the near side
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), hi = textureSize(tId, 0) - 1; vec4 c = at(p); if (c.w <= 0.0) discard;   // sky
  bool ch = uPlus > 0.5 && c.x < 0.0;   // classicPlus character pixel: the wide test (only these pixels pay for it)
  float e = edgeAt(c, int(uR + 0.5), p, hi); if (ch && e <= 0.0) e = edgeAt(c, int(uCR + 0.5), p, hi);
  if (e <= 0.0) discard;
  float u = clamp((1.0 / c.w - uFadeN) / (uFadeF - uFadeN), 0.0, 1.0), f = ch ? 1.0 : (1.0 - u * u * (3.0 - 2.0 * u)) * uAlpha;
  gl_FragColor = vec4(0.0, 0.0, 0.0, uDark * f);
}`;

// ---- MRT path ------------------------------------------------------------------------------------------------------------------
const MRT_COMMON = `
#ifdef gl_FragColor
#ifndef OL_OUT
#define OL_OUT
layout(location = 1) out highp vec4 olOut;
#endif
#endif
varying vec3 olV; varying vec3 olN; flat varying float olId;`;
const MRT_PROJECT = `
olV = mvPosition.xyz; { vec3 olNo = normal; vec3 olT = modelMatrix[3].xyz;
#ifdef USE_INSTANCING
olNo = mat3(instanceMatrix) * olNo; olT += instanceMatrix[3].xyz * 1.37;
#endif
olN = normalMatrix * olNo; olId = (floor(fract(sin(dot(olT, vec3(12.9898, 78.233, 37.719))) * 43758.5453) * 1009.0) + 1.0) / 1024.0; }`;
const MRT_WRITE = `
#if defined(OL_OUT) && !defined(OL_ZERO)
#ifdef OPAQUE
{ vec3 olNf = normalize(olN); if (!gl_FrontFacing) olNf = -olNf; olOut = vec4(olId, olNf.xy, 1.0 / max(-olV.z, 1e-3)); }
#else
olOut = vec4(0.0);
#endif
#endif`;
let chunksPatched = false;
export function patchChunks() {
  if (chunksPatched) return false; chunksPatched = true; const C = T.ShaderChunk;
  C.common += MRT_COMMON; C.project_vertex += MRT_PROJECT; C.colorspace_fragment += MRT_WRITE; C.dithering_fragment += MRT_WRITE; return true;   // colorspace too: an output never written is optimised out (ANGLE then skips the draw)
}
// custom ShaderMaterials (sky, clouds, water…) never include the chunks: give them the output (zero = "no surface") so ANGLE draws them
const OL_DECL = '#define OL_ZERO\n#ifndef OL_OUT\n#define OL_OUT\nlayout(location = 1) out highp vec4 olOut;\n#endif\n';
export function patchShaderMaterial(m) {
  if (!m?.isShaderMaterial || m.userData.olMrt || m.glslVersion) return false; m.userData.olMrt = true;
  const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = function (sh, r) { prev?.call(this, sh, r); if (sh.fragmentShader.includes('olOut = vec4(0.0); /*ol*/')) return;
    sh.fragmentShader = OL_DECL + sh.fragmentShader.replace(/void\s+main\s*\(\s*(void)?\s*\)\s*\{/, m => m + ' olOut = vec4(0.0); /*ol*/'); };
  m.customProgramCacheKey = () => (key0 ? key0() : '') + '|olMrt'; m.needsUpdate = true; return true;
}
// FXAA (lite, luma-edge directional blur; Lottes' FXAA 3.11 PC "quality 10" subset) for the non-multisampled MRT target
const FXAA = `uniform float uFxaa; uniform vec2 uTexel;
float fxL(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 fxS(vec2 uv) { return texture2D(tCol, uv).rgb; }
vec3 fxaa(ivec2 p, vec3 rgbM) {
  vec2 uv = (vec2(p) + 0.5) * uTexel;
  float lNW = fxL(fxS(uv + vec2(-1., -1.) * uTexel)), lNE = fxL(fxS(uv + vec2(1., -1.) * uTexel)), lSW = fxL(fxS(uv + vec2(-1., 1.) * uTexel)), lSE = fxL(fxS(uv + vec2(1., 1.) * uTexel)), lM = fxL(rgbM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (lMax - lMin < max(0.0312, lMax * 0.125)) return rgbM;
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0), rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, -8.0, 8.0) * uTexel;
  vec3 a = 0.5 * (fxS(uv + dir * (1.0 / 3.0 - 0.5)) + fxS(uv + dir * (2.0 / 3.0 - 0.5))), b = a * 0.5 + 0.25 * (fxS(uv - dir * 0.5) + fxS(uv + dir * 0.5));
  float lB = fxL(b); return (lB < lMin || lB > lMax) ? a : b;
}`;
const BLIT_FS = EDGE_FS.replace('uniform sampler2D tId;', 'uniform sampler2D tId; uniform sampler2D tCol;').replace('vec4 at(ivec2 p)', FXAA + '\nvec4 at(ivec2 p)')
  .replace(/void main\(\) \{[\s\S]*$/, `void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), hi = textureSize(tId, 0) - 1; vec4 c = at(p); gl_FragColor = vec4(texelFetch(tCol, p, 0).rgb, 1.0);   // already tone-mapped + display-encoded by the main pass
  if (uFxaa > 0.5) gl_FragColor.rgb = fxaa(p, gl_FragColor.rgb);
  if (c.w <= 0.0) return;
  float e = edgeAt(c, int(uR + 0.5), p, hi); if (e <= 0.0) return;
  float u = clamp((1.0 / c.w - uFadeN) / (uFadeF - uFadeN), 0.0, 1.0), f = (1.0 - u * u * (3.0 - 2.0 * u)) * uAlpha;
  gl_FragColor.rgb *= 1.0 - uDark * f;
}`);

export function createOutline(renderer, scene, opts = {}) {
  let MRT = opts.mrt !== false; if (MRT) patchChunks();   // chunks are global: patch before the first compile (createOutline runs before the first render)
  if (MRT) scene.traverse(o => { for (const m of [].concat(o.material ?? [])) if (m) m.needsUpdate = true; });
  let mrt = null; const BU = {tId: {value: null}, tCol: {value: null}, uFxaa: {value: 0}, uTexel: {value: new T.Vector2()}};
  const blit = new T.ShaderMaterial({uniforms: BU, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: BLIT_FS, depthTest: false, depthWrite: false, toneMapped: false});
  let bs2 = null;
  function mrtTarget(w, h) {
    if (mrt && mrt.width === w && mrt.height === h) return mrt; mrt?.dispose();
    const aa = renderer.getContextAttributes?.().antialias ? (opts.mrtSamples ?? 0) : 0;   // 0 + FXAA: multisampled MRT costs ~+70 ms on SwiftShader
    mrt = new T.WebGLRenderTarget(w, h, {count: 2, type: T.HalfFloatType, minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, samples: aa});
    // render "as if to the canvas": tone mapping + output colour space per material (three treats an XR target that way), 8-bit colour
    mrt.isXRRenderTarget = true; mrt.textures[0].type = T.UnsignedByteType; mrt.textures[0].minFilter = mrt.textures[0].magFilter = T.LinearFilter;   // 8-bit colour (allocated linear RGBA8, then labelled
    const prev = renderer.getRenderTarget(); renderer.setRenderTarget(mrt); renderer.setRenderTarget(prev); mrt.textures[0].colorSpace = renderer.outputColorSpace;   // sRGB so materials encode)
    return mrt;
  }
  let mode = MODES.includes(opts.mode) ? opts.mode : 'off', rt = null;
  const idMat = new T.ShaderMaterial({uniforms: {uId: {value: 0}, uChar: {value: 0}}, vertexShader: ID_VS, fragmentShader: ID_FS, side: T.DoubleSide});
  const U = {tId: {value: null}, uR: {value: 1}, uCR: {value: 2}, uPlus: {value: 0}, uAlpha: {value: 1},
    uDark: {value: DEFAULTS.dark}, uFadeN: {value: DEFAULTS.fadeNear}, uFadeF: {value: DEFAULTS.fadeFar}, uNDot: {value: 2 - 2 * DEFAULTS.normalDot}, uDK: {value: DEFAULTS.depthK}};
  const edge = new T.ShaderMaterial({uniforms: U, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: EDGE_FS,
    transparent: true, depthTest: false, depthWrite: false, blending: T.NormalBlending, toneMapped: false});
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), edge); quad.frustumCulled = false; const qs = new T.Scene(); qs.add(quad); const qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  Object.assign(BU, U); { const bq = new T.Mesh(new T.PlaneGeometry(2, 2), blit); bq.frustumCulled = false; bs2 = new T.Scene(); bs2.add(bq); }
  const hook = function () { idMat.uniforms.uId.value = (this.id * 37) % 1009; idMat.uniforms.uChar.value = this.userData.olCharLive ? 1 : 0; idMat.uniformsNeedUpdate = true; };
  const skipped = o => o.isSprite || o.isPoints || o.isLine || /^(sky|clouds4|clouds4small|sunRays)$/.test(o.name) || [].concat(o.material).some(m => !m || m.transparent || m.isShadowMaterial || m.isSpriteMaterial);
  function target(w, h) {
    if (rt && rt.width === w && rt.height === h) return rt; rt?.dispose();
    rt = new T.WebGLRenderTarget(w, h, {type: T.HalfFloatType, minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true});
    return rt;
  }
  // the whole frame (main pass + outline) onto the canvas; returns the outline's share in ms (MRT: the extra cost is the blit)
  function frame(camera, w, h) {
    if (mode === 'off' || !MRT || mode === 'classicPlus') { renderer.render(scene, camera); return api.draw(camera, w, h); }
    scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) if (m?.isShaderMaterial && !m.userData.olMrt) patchShaderMaterial(m); });
    const P = outlineParams(mode, h), r = mrtTarget(w, h), prev = renderer.getRenderTarget(), ac = renderer.autoClear, gl = renderer.getContext();
    const cc = renderer.getClearColor(new T.Color()), ca = renderer.getClearAlpha(), bg = scene.background;
    renderer.setRenderTarget(r); if (bg?.isColor) renderer.setClearColor(bg, 1); renderer.clear(); gl.clearBufferfv(gl.COLOR, 1, [2, 0, 0, 0]);   // attachment 1: sky (w = 0)
    renderer.autoClear = false; renderer.render(scene, camera); renderer.setClearColor(cc, ca);
    const t0 = performance.now();
    BU.tId.value = r.textures[1]; BU.tCol.value = r.textures[0]; BU.uFxaa.value = r.samples ? 0 : renderer.getContextAttributes?.().antialias ? 1 : 0; BU.uTexel.value.set(1 / w, 1 / h); U.uR.value = P.radius; U.uAlpha.value = P.alpha; U.uDark.value = P.dark; U.uFadeN.value = P.fadeNear; U.uFadeF.value = P.fadeFar;
    renderer.setRenderTarget(prev); const info = renderer.info.autoReset; renderer.info.autoReset = false; renderer.render(bs2, qc); renderer.autoClear = ac; renderer.info.autoReset = info;
    return performance.now() - t0;
  }
  const api = {
    frame, get mrt() { return MRT; }, setMrt(b) { MRT = !!b && chunksPatched; },
    get mode() { return mode; },
    set(m) { if (!MODES.includes(m)) throw Error('outline mode ' + m); mode = m; },
    // characters: every mesh under these roots (cast, crowds) is a character surface (classicPlus width / strength)
    markChars(roots) { let n = 0; for (const r of roots) r?.traverse(o => { if (o.isMesh || o.isInstancedMesh) { o.userData.olChar = true; n++; } }); return n; },
    // after the frame is on screen: id pass into the target, then the multiply overlay onto the default framebuffer
    draw(camera, w, h) {
      if (mode === 'off') return 0;
      const t0 = performance.now(), P = outlineParams(mode, h), r = target(w, h), saved = [], hidden = [];
      const cp = camera.getWorldPosition(new T.Vector3()), far = P.fadeFar + 20, bs = new T.Sphere();
      scene.traverse(o => { if (!o.visible) return; if (o.isMesh || o.isInstancedMesh || o.isSprite || o.isPoints || o.isLine) {
        if (skipped(o)) { hidden.push(o); return; }
        if (!o.isInstancedMesh && !o.userData.olChar && o.geometry) { o.geometry.boundingSphere ?? o.geometry.computeBoundingSphere(); bs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); if (bs.distanceToPoint(cp) > far) { hidden.push(o); return; } }   // beyond the fade: no line, not drawn
        saved.push([o, o.onBeforeRender]); o.onBeforeRender = hook; o.userData.olCharLive = P.plus && !!o.userData.olChar; } });
      hidden.forEach(o => { o.visible = false; });
      const bg = scene.background, fog = scene.fog, om = scene.overrideMaterial, prev = renderer.getRenderTarget(), cc = renderer.getClearColor(new T.Color()), ca = renderer.getClearAlpha(), info = renderer.info.autoReset;
      renderer.info.autoReset = false;
      scene.background = null; scene.fog = null; scene.overrideMaterial = idMat;
      renderer.setRenderTarget(r); renderer.setClearColor(new T.Color(2, 0, 0), 0); renderer.clear(); renderer.render(scene, camera);
      scene.overrideMaterial = om; scene.background = bg; scene.fog = fog; hidden.forEach(o => { o.visible = true; }); saved.forEach(([o, f]) => { o.onBeforeRender = f; });
      renderer.setRenderTarget(prev); renderer.setClearColor(cc, ca);
      U.tId.value = r.texture; U.uR.value = P.radius; U.uCR.value = P.charRadius; U.uPlus.value = P.plus ? 1 : 0; U.uAlpha.value = P.alpha;
      U.uDark.value = P.dark; U.uFadeN.value = P.fadeNear; U.uFadeF.value = P.fadeFar;
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(qs, qc); renderer.autoClear = ac; renderer.info.autoReset = info;
      return performance.now() - t0;
    },
  };
  return api;
}
