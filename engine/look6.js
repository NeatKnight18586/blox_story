// engine/look6.js — Look 6: after-hours light states (opt-in: spec `look6`; data: looks4.json `<preset>.v6`).
// The hall bakes its light in layers (engine/bake.js `layers`: pendants A, pendants B, zone colour lights, shutter slats); a light
// state is a set of layer weights + emissive levels, mixed per frame by uniforms (no re-bake). lightsCascade drives the pendants and
// zone signs on, one after another from the shutter.
//   pure: cascadeFrac(t, e, n) · lightState6(v6, frac) · lampOn(rank, n, frac) · cascadeOrder(points, from) · localContrast(s, b) ·
//         clampLen(v, max) · shelfLight(p, layers, w, base)
//   three: patchShelf(m, U) (gondola materials: top-shelf fall-off)
import {lightsInto} from './bake.js';

// Fraction of a cascade's n lights that are on at t (cascadeOn semantics: light i at at + i·step; on = false switches off).
export function cascadeFrac(t, {at = 0, step = .12, on = true} = {}, n = 1) {
  const k = t < at ? 0 : Math.min(n, Math.floor((t - at) / step + 1e-9) + 1), f = k / n; return on ? f : 1 - f;
}
// A light state at cascade fraction frac (1 = fully on): pendant / sign layers ramp with the cascade, the slats layer fades from
// the pre-cascade dusk spill to the state's own weight.
export function lightState6(v6, frac = 1) {
  const c = v6.cascade ? Math.min(1, Math.max(0, frac)) : 1, pre = v6.pre ?? [0, 0, 0, 0], L = v6.layers;
  const layers = [0, 1, 2].map(i => pre[i] + (L[i] - pre[i]) * c).concat(pre[3] + (L[3] - pre[3]) * c);
  return {layers, base: v6.base ?? 1, strips: v6.strips ?? 0, signs: v6.signs ?? 1, shelfGlow: (v6.shelfGlow ?? 1) * c, banners: v6.banners ?? 1, shelfTop: v6.shelfTop ?? 1,
    pendants: v6.pendants ?? [1, 1], frac: c};   // pendant groups on/off; the cascade order switches the lamps (lampOn)
}
// Lamp of cascade rank r (0 = first) of n is on at fraction frac.
export const lampOn = (rank, n, frac) => frac >= 1 || rank < Math.round(frac * n);
// Cascade order: indices of points sorted by distance from `from` in the floor plane (front to back from the shutter).
export const cascadeOrder = (points, from = [0, 0, 35]) => points.map((p, i) => [Math.hypot(p[0] - from[0], p[2] - from[2]), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[1]);
// Owner gate (8159612): local contrast in either direction, |subject − background| / background.
export const localContrast = (s, b) => b > 1e-6 ? Math.abs(s - b) / b : null;
// Clamp a displacement vector to length ≤ max (the pompom stays within .15 of the beanie).
export function clampLen(v, max) { const l = Math.hypot(...v); return l <= max || l < 1e-12 ? v : v.map(x => x * max / l); }
// Light at a point from the baked layers (no occlusion): base ambient + Σ w_i × layer i (point/pool lights, engine/bake.js maths).
export function shelfLight(p, layers, w, base = [0, 0, 0], n = [0, 1, 0]) {
  const out = [...base]; layers.forEach((ls, i) => { if (!w[i]) return; const c = lightsInto([0, 0, 0], p, n, null, null, ls); for (let k = 0; k < 3; k++) out[k] += w[i] * c[k]; }); return out;
}
// Actor gain from the light at the actor (RGB, the baked layers' maths): base + k × luminance, capped — an actor in a pool reads brighter
// than one in the dark (matcap actors take no scene light). cfg {base, k, max} from looks4 <preset>.v6.actorPool.
export function actorPool(rgb, {base = .6, k = 1.2, max = 2.2} = {}) { const y = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; return Math.min(max, base + k * y); }
// Gondola materials (instanced, unbaked): colour falls off toward the top shelf (uShelfTop at y = 14, object space).
export function patchShelf(m, U) {
  if (!m || m.userData?.shelf6) return m; m.userData = {...m.userData, shelf6: true};
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey?.call(m) ?? '';
  m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r); sh.uniforms.uShelfTop = U.uShelfTop;
    sh.vertexShader = 'uniform float uShelfTop;\n' + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  vColor.rgb *= mix(1.0, uShelfTop, smoothstep(2.0, 14.0, position.y));
#endif`); };
  m.customProgramCacheKey = () => 'shelf6|' + prevKey; m.needsUpdate = true; return m;
}
