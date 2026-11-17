// parts/water.js — one water plane (Amendment A4 A5): two scrolled normal layers (pure in t), fresnel tint toward
// the sky colour, depth tint (shallow → deep from a baked depth map of the terrain under the plane), a soft
// shoreline foam band, optional river flow direction. MeshStandardMaterial so it takes the sun, env map and fog.
import * as T from 'three';
import {heightToNormal, blurWrap} from './materials.js';

// Depth under the plane, 0 (shore) .. 1 (≥ maxDepth), as a Float array res×res, row 0 = −z edge. Pure.
export function depthMap(height, {x0, x1, z0, z1, y, res = 128, maxDepth = 4}) {
  const out = new Float32Array(res * res);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = x0 + (i + .5) / res * (x1 - x0), z = z0 + (j + .5) / res * (z1 - z0);
    out[j * res + i] = Math.max(0, Math.min(1, (y - height(x, z)) / maxDepth));
  }
  return out;
}
// Ripple height field (seeded sines, tiling) → normal map bytes. Pure.
export function rippleHeight(n = 128, seed = 3) {
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = 0; for (let k = 1; k <= 4; k++) { const a = Math.sin(seed * 9.1 + k * 2.3) * 3, fx = k + (seed + k) % 3, fy = k * 2 - 1; v += Math.sin((x * fx + y * fy) / n * Math.PI * 2 + a) / k; }
    h[y * n + x] = .5 + v * .18;
  }
  return blurWrap(h, n, n, 1);
}

export function water({height, x0, x1, z0, z1, y = 0, deep = '#1f6f93', shallow = '#5fc2c9', sky = '#cfe9ff', flow = [1, .3], speed = .03, tile = 14,
  foam = .12, envMap = null, name = 'water'}) {
  const w = x1 - x0, d = z1 - z0, g = new T.PlaneGeometry(w, d, 1, 1); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  // plane uv: 0..1 over the extent (depth map); the normal layers use uv × extent / tile
  let nrm = null, dep = null;
  if (typeof document !== 'undefined') {
    const n = 128; nrm = new T.DataTexture(heightToNormal(rippleHeight(n), n, n, 5.5), n, n, T.RGBAFormat);   // A5: stronger ripples nrm.wrapS = nrm.wrapT = T.RepeatWrapping; nrm.magFilter = T.LinearFilter; nrm.minFilter = T.LinearMipmapLinearFilter; nrm.generateMipmaps = true; nrm.needsUpdate = true;
    const r = 128, dm = height ? depthMap(height, {x0, x1, z0, z1, y, res: r}) : new Float32Array(r * r).fill(1), px = new Uint8Array(r * r * 4);
    for (let i = 0; i < r * r; i++) { const v = Math.round(dm[i] * 255); px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255; }
    dep = new T.DataTexture(px, r, r, T.RGBAFormat); dep.magFilter = dep.minFilter = T.LinearFilter; dep.flipY = false; dep.needsUpdate = true;
  }
  const U = {wTime: {value: 0}, wDeep: {value: new T.Color(deep)}, wShallow: {value: new T.Color(shallow)}, wSky: {value: new T.Color(sky)}, wDepth: {value: dep}, wNrm: {value: nrm},
    wFlow: {value: new T.Vector2(...flow).normalize().multiplyScalar(speed)}, wRep: {value: new T.Vector2(w / tile, d / tile)}, wFoam: {value: foam}};
  const m = new T.MeshStandardMaterial({color: '#ffffff', roughness: .12, metalness: 0, envMap, envMapIntensity: .9, normalMap: nrm, transparent: false});
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vWUv; uniform float wTime; uniform vec3 wDeep; uniform vec3 wShallow; uniform vec3 wSky; uniform sampler2D wDepth; uniform sampler2D wNrm; uniform vec2 wFlow; uniform vec2 wRep; uniform float wFoam;`)
      .replace('#include <map_fragment>', `float dp = texture2D(wDepth, vec2(vWUv.x, 1. - vWUv.y)).r;
        vec3 wcol = mix(wShallow, wDeep * .8, smoothstep(0., .65, dp));   // A5: light shallows → deep centre
        vec2 q = vWUv * wRep; float fn = texture2D(wNrm, q * 2.3 - wFlow * wTime * 1.7).r;
        float band = 1. - smoothstep(0., wFoam, dp); float foamK = band * smoothstep(.35, .7, fn + band * .4 + .25 * sin(wTime * 1.6 + dp * 40.));
        diffuseColor.rgb = mix(wcol, vec3(.96, .98, 1.), foamK * .9); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.), smoothstep(.06, 0., dp) * .7);`)   // + a crisp foam line at the shore
      .replace('#include <normal_fragment_maps>', `vec3 nA = texture2D(wNrm, q + wFlow * wTime).xyz * 2. - 1.; vec3 nB = texture2D(wNrm, q * 1.7 + vec2(-wFlow.y, wFlow.x) * wTime * 1.3 + .37).xyz * 2. - 1.;
        vec3 mapN = normalize(vec3((nA.xy + nB.xy) * .5, 1.)); normal = normalize(tbn * mapN);`)
      .replace('#include <opaque_fragment>', `float fres = pow(1. - saturate(dot(normal, normalize(vViewPosition))), 4.);
        outgoingLight = mix(outgoingLight, wSky, fres * .32 * (1. - foamK));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'water3';
  const mesh = new T.Mesh(g, m); mesh.name = name; mesh.receiveShadow = true; mesh.renderOrder = 1;
  return {mesh, update: t => { U.wTime.value = t; }, uniforms: U};
}
