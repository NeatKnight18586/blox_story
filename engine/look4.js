// engine/look4.js — format v4 Phase 2 look (opt-in: a world exporting LOOK4 or a spec `look4`; older specs never load it).
// "Blocky shapes, realistic surfaces, cinematic light" at the same or lower cost:
//   · AgX tone mapping, exposure per preset (engine/looks4.json: comedy, mystery);
//   · one sky env map per look: PMREM of the sky dome, built once per episode and cached, used for satin highlights,
//     glass and the baked materials' env highlight (scene.environment);
//   · real-time light only for actors and moving props: one sun, shadow map 1024 fitted to the shot subject (the base
//     look's frameFixed), plus a ShadowMaterial catcher on the ground under the subject; static light is baked (bake.js);
//   · comedy: puffy blob clouds (baked vertex shading, unlit); mystery: height fog (fog shader patch, no volumetrics);
//   · glow without a bloom pass: halo() = camera-facing additive soft sprite; water4(): flat, env reflection + fresnel
//     (MeshStandard), scrolling normal map, no mirror pass.
import * as T from 'three';
import {createLook, patchHeightFog, sunDir} from './look.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadLooks4(base) { return (await fetch(new URL('looks4.json', base))).json(); }

export function createLookV4(scene, renderer, presets, {initial = 'comedy', fogStart = 0} = {}) {   // tuft 1B fix (opt-in fogStart): no height fog within fogStart of the camera
  const first = presets[initial];
  patchHeightFog({...(first.v4.heightFog ?? {amount: 0}), ...(fogStart ? {start: fogStart} : {})});   // ShaderChunk patch before anything compiles (one fog model per episode)
  const L = createLook(scene, renderer, {radius: 700});
  renderer.toneMapping = T.AgXToneMapping;
  renderer.shadowMap.type = T.PCFShadowMap;   // pass 2 (cost): hardware-filtered PCF, not the many-tap soft PCF
  L.rim.visible = false;                      // pass 2 (cost): no rim light (an invisible light leaves every shader); env gives the edge
  L.clouds.visible = false; L.clouds.userData.live = true; L.sky.userData.live = true;
  L.sun.shadow.mapSize.set(1024, 1024); L.sun.shadow.bias = -.0004; L.sun.shadow.normalBias = .04;
  // puffy blob clouds: merged icosahedra, top-lit by a baked vertex gradient, unlit material (no light cost)
  const clouds = new T.Group(); clouds.name = 'clouds4';
  const blobs = [];
  for (let i = 0; i < 9; i++) {
    const a = .25 + i / 9 * Math.PI * 1.5, r = 330 + (i % 3) * 40, cx = Math.sin(a) * r, cz = -Math.abs(Math.cos(a) * r) - 80, cy = 95 + (i % 4) * 14;
    for (let k = 0; k < 6; k++) { const s = 14 + ((k * 7 + i * 5) % 10), g = new T.IcosahedronGeometry(s, 2); g.translate(cx + (k - 2.5) * 13, cy + (k % 2) * 7 + (k === 2 || k === 3 ? 6 : 0), cz + ((k * 5) % 3) * 6); blobs.push(g); }
  }
  const cg = mergeGeometries(blobs.map(g => { g.deleteAttribute('uv'); return g; })), cp = cg.attributes.position, cn = cg.attributes.normal, cc = new Float32Array(cp.count * 3);
  // 2b cloud shading (owner): white sunlit top, soft blue-grey underside, a gentle bright rim where the surface turns away
  // from the camera side; unlit and not tone mapped, so the colours land as drawn
  const TOP = [1, 1, 1], UNDER = [.68, .74, .84];
  for (let i = 0; i < cp.count; i++) { const ny = cn.getY(i), u = Math.min(1, Math.max(0, (ny + .35) / .95)), k = u * u * (3 - 2 * u), rim = .07 * Math.pow(1 - Math.abs(cn.getZ(i)), 3);
    cc.set([0, 1, 2].map(j => Math.min(1, UNDER[j] + (TOP[j] - UNDER[j]) * k + rim)), i * 3); }
  cg.setAttribute('color', new T.BufferAttribute(cc, 3));
  const cloudMesh = new T.Mesh(cg, new T.MeshBasicMaterial({vertexColors: true, fog: false, toneMapped: false})); cloudMesh.userData.live = true; clouds.add(cloudMesh); scene.add(clouds);
  // shadow catcher: actors' shadows on the (baked, unlit) ground
  const catcher = new T.Mesh(new T.PlaneGeometry(24, 24), new T.ShadowMaterial({opacity: .4})   /* pass 1: only around the subject (soft-shadow sampling is per pixel) */); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; catcher.userData.live = true; catcher.name = 'shadowCatcher';
  scene.add(catcher);
  let groundY = () => 0, cur = null;
  const pm = new T.PMREMGenerator(renderer), envs = new Map();
  const MC = 256, mcaps = new Map(), MC_LIGHT = .5, MC_CHROMA = .25;
  const mcTex = b => { const t = new T.DataTexture(b, MC, MC, T.RGBAFormat); t.colorSpace = T.SRGBColorSpace; t.magFilter = t.minFilter = T.LinearFilter; t.needsUpdate = true; return t; };
  function matcapBytes(name) {
    const P = presets[name], ms = new T.Scene(), k = MC_LIGHT;
    ms.add(new T.HemisphereLight(P.base.hemiSky, P.base.hemiGround, P.base.hemi * k));
    const sun = new T.DirectionalLight(P.base.sun, P.base.sunI * k); sun.position.set(...sunDir(P.base.sunEl, P.base.sunAz)); ms.add(sun);
    ms.environment = envFor(name); ms.environmentIntensity = P.v4.envIntensity * k;
    ms.add(new T.Mesh(new T.SphereGeometry(1, 96, 48), new T.MeshStandardMaterial({color: '#ffffff', roughness: .45, metalness: 0})));
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, .1, 10); cam.position.set(0, 0, 3); cam.lookAt(0, 0, 0);
    const rt = new T.WebGLRenderTarget(MC, MC); rt.texture.colorSpace = T.SRGBColorSpace;
    const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setClearColor('#000000', 1); renderer.clear(); renderer.render(ms, cam);
    const b = new Uint8Array(MC * MC * 4); renderer.readRenderTargetPixels(rt, 0, 0, MC, MC, b); renderer.setRenderTarget(prev); rt.dispose();
    for (let i = 0; i < MC * MC; i++) { const r = b[i * 4], g = b[i * 4 + 1], bl = b[i * 4 + 2], y = .2126 * r + .7152 * g + .0722 * bl;
      b[i * 4] = Math.round(y + (r - y) * MC_CHROMA); b[i * 4 + 1] = Math.round(y + (g - y) * MC_CHROMA); b[i * 4 + 2] = Math.round(y + (bl - y) * MC_CHROMA); b[i * 4 + 3] = 255; }
    return b;
  }
  function envFor(name) {   // PMREM of the sky dome for this preset, once per episode
    if (envs.has(name)) return envs.get(name);
    const p = presets[name].base, es = new T.Scene(), sky = L.sky.clone(); sky.material = L.sky.material.clone();
    sky.material.uniforms.top.value.set(p.skyTop); sky.material.uniforms.horizon.value.set(p.skyHorizon); sky.position.set(0, 0, 0); es.add(sky);
    if (presets[name].v4.clouds === 'puffy') { const c = cloudMesh.clone(); es.add(c); }
    const ground = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshBasicMaterial({color: p.hemiGround})); ground.rotation.x = -Math.PI / 2; ground.position.y = -2; es.add(ground);
    const t = pm.fromScene(es, 0, 1, 1500).texture; envs.set(name, t); return t;
  }
  return {
    v4: true, MC_LIGHT, presets, sky: L.sky, sun: L.sun, clouds, catcher,
    get preset() { return cur; },
    setGround(fn) { groundY = fn; },
    envMap: () => envFor(cur ?? initial),
    // 2b baked actor light: one 256 px satin-sphere matcap per preset (lights + env at half strength, chroma kept 25 % so skin
    // and outfit hues survive coloured light), from the disk cache when present (scripts/v2/matcap4.js writes it).
    async preloadMatcap(base, name) { if (mcaps.has(name)) return 'memory';
      try { const r = await fetch(new URL(`renders/cache/tex4/matcap-${name}.bin`, base)); if (r.ok) { const b = new Uint8Array(await r.arrayBuffer()); if (b.length === MC * MC * 4) { mcaps.set(name, mcTex(b)); return 'disk'; } } } catch {}
      return 'generate'; },
    matcap(name) { if (!mcaps.has(name)) mcaps.set(name, mcTex(matcapBytes(name))); return mcaps.get(name); },
    matcapBytes,
    apply(name) {
      const P = presets[name] ?? presets[initial]; cur = presets[name] ? name : initial;
      L.apply(P.base); renderer.toneMappingExposure = P.base.exposure; renderer.toneMapping = P.v4.toneMapping === 'Neutral' ? T.NeutralToneMapping : T.AgXToneMapping;   // 2b: comedy Khronos PBR Neutral
      clouds.visible = P.v4.clouds === 'puffy'; catcher.material.opacity = P.v4.shadowCatcher;
      scene.environment = envFor(cur); scene.environmentIntensity = P.v4.envIntensity;
      return P;
    },
    frame(target, camPos, r) { L.frame(target, camPos, Math.min(r, 14)); },
    frameFixed(centre, r, camPos) {
      L.frameFixed(centre, Math.min(r, 14), camPos);   // shadows only for actors and moving props: a tight box on the subject
      catcher.position.set(centre.x, groundY(centre.x, centre.z) + .02, centre.z);
      clouds.position.set(camPos.x * .9, 0, camPos.z * .9);
    },
    update(t) { clouds.rotation.y = t * .002; },
  };
}

// Camera-facing soft halo (additive): windows and lamps glow without a bloom pass.
let haloTex = null;
export function halo(position, color = '#ffd28a', size = 2, opacity = .8) {
  if (!haloTex && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); haloTex = new T.CanvasTexture(c); haloTex.colorSpace = T.SRGBColorSpace;
  }
  const s = new T.Sprite(new T.SpriteMaterial({map: haloTex, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, fog: false}));
  s.position.set(...position); s.scale.setScalar(size); s.userData.live = true; s.renderOrder = 5; return s;
}
// Flat water: env reflection + fresnel (physically based), scrolling normal map; never a mirror pass.
export function water4({w = 10, d = 10, at = [0, 0, 0], color = '#1d4f63', speed = .03} = {}) {
  const n = 128, h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = .5 + .25 * Math.sin((x / n) * Math.PI * 6 + Math.sin(y / n * Math.PI * 4) * 1.5) + .25 * Math.sin((y / n) * Math.PI * 8 + x / n * 3);
  const nb = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const a = (xx, yy) => h[((yy + n) % n) * n + ((xx + n) % n)], dx = a(x + 1, y) - a(x - 1, y), dy = a(x, y + 1) - a(x, y - 1), l = Math.hypot(dx * 1.5, dy * 1.5, 1), i = (y * n + x) * 4;
    nb[i] = (-dx * 1.5 / l * .5 + .5) * 255; nb[i + 1] = (-dy * 1.5 / l * .5 + .5) * 255; nb[i + 2] = (1 / l * .5 + .5) * 255; nb[i + 3] = 255; }
  const nt = new T.DataTexture(nb, n, n, T.RGBAFormat); nt.wrapS = nt.wrapT = T.RepeatWrapping; nt.repeat.set(w / 4, d / 4); nt.needsUpdate = true; nt.generateMipmaps = true; nt.minFilter = T.LinearMipmapLinearFilter;
  const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({color, roughness: .06, metalness: 0, normalMap: nt, normalScale: new T.Vector2(.35, .35), envMapIntensity: 1.2}));
  m.rotation.x = -Math.PI / 2; m.position.set(...at); m.userData.live = true;
  return {mesh: m, update(t) { nt.offset.set(t * speed, t * speed * .6); }};
}
