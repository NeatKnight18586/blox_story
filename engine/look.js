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
  // A5 §E: a night bright enough for a phone: strong cool moon key, teal-blue ambient, raised exposure (episode 1 is all night)
  nightBright: {skyTop: '#123a6a', skyHorizon: '#4a86b8', fog: '#2f5a86', fogNear: 90, fogFar: 340, hemiSky: '#8fd0e0', hemiGround: '#35566e', hemi: 1.9,
    sun: '#cfe0ff', sunI: 2.3, sunEl: 38, sunAz: 168, rim: '#b8dcff', rimI: 1.5, cloud: '#5a76a8', exposure: 1.5, windows: 1.5},
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
    // Fixed per-shot fit (A1): the shadow box never moves within a shot, and its centre is snapped to whole
    // shadow-map texels in light space so edges cannot crawl. Rim light and sky still follow the camera.
    frameFixed(centre, r, camPos) {
      const p = current ?? PRESETS.day, el = p.sunEl * Math.PI / 180, az = p.sunAz * Math.PI / 180;
      const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      const zA = dir.clone().negate(), xA = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), zA).normalize(), yA = new T.Vector3().crossVectors(zA, xA);
      const texel = 2 * r / sun.shadow.mapSize.x, c = centre.clone();
      for (const ax of [xA, yA]) { const d = c.dot(ax); c.addScaledVector(ax, Math.round(d / texel) * texel - d); }
      sun.target.position.copy(c); sun.position.copy(c).addScaledVector(dir, 120);
      Object.assign(sun.shadow.camera, {left: -r, right: r, top: r, bottom: -r, near: 20, far: 260}); sun.shadow.camera.updateProjectionMatrix();
      const back = new T.Vector3().subVectors(c, camPos).setY(0).normalize();
      rim.target.position.copy(c); rim.position.copy(c).addScaledVector(back, 30).add(new T.Vector3(0, 18, 0));
      sky.position.copy(camPos); clouds.position.set(camPos.x * .9, 0, camPos.z * .9);
    },
    update(t) { clouds.rotation.y = t * .004; },
  };
}

// ---- A4 (Format v3) sky and air: opt-in createLookV3; "Nobody" keeps createLook unchanged -------------------------
// Adds to the base look: a sky shader with sun disc + glow (day) or moon disc + stars (presets with a dark top), two
// cloud layers (canvas-drawn soft clouds on far planes, parallax + drift pure in t), height fog on top of the distance
// haze (ShaderChunk patched ONCE before anything compiles, constants baked in), a small generated environment map
// (PMREM of the sky gradient) for hero-tier environment materials, and optional light-shaft sprites.
import {ShaderChunk} from 'three';
let fogPatched = null;
export function patchHeightFog({base = 0, falloff = 8, amount = .3, near = 40} = {}) {
  const key = [base, falloff, amount, near].join('|'); if (fogPatched === key) return; if (fogPatched) throw Error('height fog already patched with other constants');
  const f = v => Number(v).toFixed(4);
  ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth; varying float vFogWorldY;\n#endif\n';
  ShaderChunk.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogWorldY = (transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz)).y;\n#endif\n';
  ShaderChunk.fog_pars_fragment = ShaderChunk.fog_pars_fragment.replace('varying float vFogDepth;', 'varying float vFogDepth; varying float vFogWorldY;');
  ShaderChunk.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	float hFog = ${f(amount)} * exp( - max( vFogWorldY - (${f(base)}), 0.0 ) / ${f(falloff)} ) * ( 1.0 - exp( - vFogDepth / ${f(near)} ) );
	fogFactor = 1.0 - ( 1.0 - fogFactor ) * ( 1.0 - hFog );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;
  fogPatched = key;
}
// v3 extras per preset (stars/moon on dark skies, sun disc size and glow)
export const SKY_V3 = {
  day: {disc: 1, glow: .35, stars: 0, moon: 0}, goldenHour: {disc: 1.4, glow: .6, stars: 0, moon: 0}, storm: {disc: 0, glow: .1, stars: 0, moon: 0, cloudLit: '#e2e6ec', cloudShade: '#353c48', cloudOp: 1.5},   // A5: storm clouds read as shapes
  night: {disc: 0, glow: .18, stars: 1, moon: 1}, nightBright: {disc: 0, glow: .25, stars: 1, moon: 1}, fireNight: {disc: 0, glow: .3, stars: .4, moon: 0},
};
export const sunDir = (el, az) => [Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180), Math.cos(az * Math.PI / 180) * Math.cos(el * Math.PI / 180)];

function cloudTexture(seed, soft) {
  if (typeof document === 'undefined') return null;
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  const h = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7 + seed * 74.7) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 26; i++) {   // clusters of overlapping soft puffs, wrapped so the layer tiles
    const cx = h(i, 1) * n, cy = h(i, 2) * n, puffs = 5 + (h(i, 3) * 6 | 0), sc = 22 + h(i, 4) * 40;
    for (let k = 0; k < puffs; k++) {
      const x = cx + (h(i, k + 9) - .5) * sc * 3, y = cy + (h(i, k + 19) - .5) * sc * 1.1, r = sc * (.6 + h(i, k + 29) * .8);
      for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { const gr = g.createRadialGradient(x + dx, y + dy, r * (soft ? .1 : .45), x + dx, y + dy, r); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r); }
    }
  }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; return t;
}

export function createLookV3(scene, renderer, {radius = 820, fog = {}, clouds = true, cloudCover = .7, envPreset = 'day', onEnv = null, moon = null, starDensity = 1} = {}) {
  patchHeightFog(fog.height ?? {amount: 0});
  const L = createLook(scene, renderer, {radius});
  L.clouds.visible = false;   // the block clouds of v2 are replaced by soft layers
  const su = {top: {value: new T.Color()}, horizon: {value: new T.Color()}, ground: {value: new T.Color('#55606e')}, sunDir: {value: new T.Vector3(0, 1, 0)}, sunCol: {value: new T.Color()},
    disc: {value: 1}, glow: {value: .3}, stars: {value: 0}, moon: {value: 0}, moonDir: {value: new T.Vector3(...(moon ? sunDir(moon.el, moon.az) : [0, 1, 0]))}, moonSize: {value: moon?.size ?? 1}, starTh: {value: 1 - .0045 * starDensity}};
  L.sky.material = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false, uniforms: su,
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunCol; uniform float disc; uniform float glow; uniform float stars; uniform float moon; uniform vec3 moonDir; uniform float moonSize; uniform float starTh; varying vec3 vd;
      float hsh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vd); float h = d.y;
        vec3 c = h > 0. ? mix(horizon, top, pow(clamp(h, 0., 1.), .5)) : mix(horizon, ground, clamp(-h * 6., 0., 1.));
        float sd = max(dot(d, normalize(sunDir)), 0.);
        c += sunCol * glow * (pow(sd, 18.) * .7 + pow(sd, 4.) * .25);
        c = mix(c, sunCol * 1.6 + .4, disc * smoothstep(.99955, .99975, sd));
        vec3 md = normalize(moonDir); float mdd = dot(d, md), mr = 1. - .00065 * moonSize * moonSize;
        float mdisc = smoothstep(mr - .00012, mr, mdd); vec3 mcol = vec3(.95, .96, 1.) - .08 * hsh(floor(d * 900.)) ;
        c = mix(c, mcol, moon * mdisc); c += vec3(.55, .65, .95) * moon * (pow(max(mdd, 0.), 90.) * .35 + pow(max(mdd, 0.), 12.) * .08);
        if (stars > 0. && h > .02) { vec3 g = floor(d * 260.); float s = hsh(g); float tw = step(starTh, s) * smoothstep(.02, .3, h) * (1. - mdisc); c += vec3(tw) * stars * (.5 + .5 * hsh(g + 3.)); }
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`});
  // two cloud layers: big textured planes high above, moving with the camera at different parallax factors
  const layers = [];
  if (clouds) for (const [k, y, size, par, speed, soft, op] of [[0, 120, 2400, .7, .6, true, .55 * cloudCover], [1, 190, 3400, .85, .25, false, .8 * cloudCover]]) {
    const tex = cloudTexture(11 + k * 7, soft);
    const m = new T.ShaderMaterial({transparent: true, depthWrite: false, fog: false, uniforms: {map: {value: tex}, col: {value: new T.Color('#ffffff')}, shade: {value: new T.Color('#c9d3e0')}, off: {value: new T.Vector2()}, rep: {value: size / 520}, op: {value: op}},
      vertexShader: 'varying vec2 vUv; varying float vR; void main(){ vUv = uv; vR = length(position.xy) / ' + (size / 2).toFixed(1) + '; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform sampler2D map; uniform vec3 col; uniform vec3 shade; uniform vec2 off; uniform float rep; uniform float op; varying vec2 vUv; varying float vR;
        void main(){ vec4 t = texture2D(map, vUv * rep + off); float a = t.a * op * (1. - smoothstep(.55, 1., vR)); vec3 c = mix(shade, col, smoothstep(.2, .8, t.a)); gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
        }`});
    const p = new T.Mesh(new T.PlaneGeometry(size, size), m); p.rotation.x = Math.PI / 2; p.position.y = y; p.renderOrder = -1; p.name = 'cloudLayer' + k; p.frustumCulled = false;
    scene.add(p); layers.push({p, m, par, speed, y, op0: op});
  }
  // generated environment map (PMREM of a gradient sky scene) for hero environment materials
  let envTex = null;
  const makeEnv = presetName => {
    const P = PRESETS[presetName] ?? presetName, es = new T.Scene(), sk = new T.Mesh(new T.SphereGeometry(10, 16, 8), new T.ShaderMaterial({side: T.BackSide, uniforms: {a: {value: new T.Color(P.skyTop)}, b: {value: new T.Color(P.skyHorizon)}, c: {value: new T.Color(P.hemiGround)}},
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying float h; void main(){ gl_FragColor = vec4(h > 0. ? mix(b, a, pow(h, .6)) : mix(b, c, min(1., -h * 3.)), 1.); }'}));
    es.add(sk); const pm = new T.PMREMGenerator(renderer); envTex = pm.fromScene(es, 0, .1, 100).texture; pm.dispose(); return envTex;
  };
  makeEnv(envPreset); onEnv?.(envTex);
  // light shafts: additive gradient quads (screen-facing around their own axis), placed by the world
  let shaftMat = null; const shafts = new T.Group(); shafts.name = 'shafts'; scene.add(shafts);
  const base = {apply: L.apply, frameFixed: L.frameFixed, frame: L.frame, update: L.update};
  const followCam = camPos => { for (const l of layers) l.p.position.set(camPos.x * l.par, l.y, camPos.z * l.par); };
  return Object.assign(L, {
    v3: true, layers, envMap: () => envTex, shafts,
    addShaft({at, height = 60, width = 6, color = '#fff1c8', opacity = .18, tilt = [0, 0]}) {
      if (!shaftMat && typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(.25, 'rgba(0,0,0,0)'); v.addColorStop(.8, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, 64, 256); shaftMat = new T.CanvasTexture(c); shaftMat.colorSpace = T.SRGBColorSpace; }
      const m = new T.MeshBasicMaterial({map: shaftMat, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide});
      const s = new T.Mesh(new T.PlaneGeometry(width, height), m); s.position.set(at[0], at[1] + height / 2, at[2]); s.rotation.set(tilt[0], 0, tilt[1]); s.userData.billboardY = true; shafts.add(s); return s;
    },
    apply(name, b = null, w = 0) {
      const p = base.apply(name, b, w), x = SKY_V3[typeof name === 'string' ? name : 'day'] ?? SKY_V3.day, xb = b ? (SKY_V3[b] ?? x) : x, mix = k => x[k] + (xb[k] - x[k]) * (b ? w : 0);
      su.top.value.set(p.skyTop); su.horizon.value.set(p.skyHorizon); su.ground.value.set(p.fog); su.sunCol.value.set(p.sun);
      su.sunDir.value.set(...sunDir(p.sunEl, p.sunAz)); su.disc.value = mix('disc'); su.glow.value = mix('glow'); su.stars.value = mix('stars'); su.moon.value = mix('moon');
      for (const l of layers) { l.m.uniforms.col.value.set(x.cloudLit ?? p.cloud); if (!x.cloudLit) l.m.uniforms.col.value.lerp(new T.Color('#ffffff'), .35); l.m.uniforms.shade.value.set(x.cloudShade ?? p.cloud); if (!x.cloudShade) l.m.uniforms.shade.value.lerp(new T.Color(p.skyTop), .45); l.m.uniforms.op.value = l.op0 * (x.cloudOp ?? 1); }
      if (fog.color) scene.fog.color.set(fog.color);
      if (fog.near) scene.fog.near = fog.near; if (fog.far) scene.fog.far = fog.far;
      return p;
    },
    frameFixed(centre, r, camPos) { base.frameFixed(centre, r, camPos); followCam(camPos); shafts.children.forEach(s => { s.rotation.y = Math.atan2(camPos.x - s.position.x, camPos.z - s.position.z); }); },
    frame(target, camPos, r) { base.frame(target, camPos, r); followCam(camPos); shafts.children.forEach(s => { s.rotation.y = Math.atan2(camPos.x - s.position.x, camPos.z - s.position.z); }); },
    update(t) { for (const l of layers) l.m.uniforms.off.value.set(t * .0016 * l.speed, t * .0007 * l.speed); },
  });
}
