// parts/location.js — Phase R: one generic loader for a data-defined location (no per-location code).
// A location is JSON: {backdrop (HDRI or sky), env, exposure, fog, sun, bake, materials palette, modules, layout}.
//   pure (Node-testable): mergeLocation(base, over) · expandLayout(loc) → flat primitive list · worldUV(pos, nrm, tile) · sunFromEquirect(rgb, w, h)
//                         · horizonColor(rgb, w, h) · texBytes(w, h) · materialFiles(set, manifest)
//   browser: buildLocation(scene, renderer, loc, {base, manifest}) → {root, stats, sun, fit(centre, r)}
// Materials: {set: '<asset id slot>'} = CC0 photo-scan maps from the asset cache (renders/cache/assets/<id>/), or
// {procedural: '<pattern>'} = today's generated pattern (parts/materials.js std), or {color, roughness} plain.
// A missing CC0 set falls back to its `fallback` procedural pattern and is reported in stats.fallbacks.

const deg = Math.PI / 180;
const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// Expand modules + layout into primitives in world space: {kind: 'box'|'cyl'|'plane', size, at, rotY, mat, name}.
// A module part may carry `grid: {n: [nu, nv], u: [x, y, z], v: [x, y, z]}` (repeat along two local step vectors).
export function expandLayout(loc) {
  const out = [];
  for (const [i, item] of (loc.layout ?? []).entries()) {
    const mod = loc.modules?.[item.module]; if (!mod) throw Error(`layout ${i}: unknown module ${item.module}`);
    const a = (item.rotY ?? 0) * deg, sc = item.scale ?? [1, 1, 1], mats = item.mats ?? {};
    for (const [j, p] of mod.parts.entries()) {
      const [nu, nv] = p.grid?.n ?? [1, 1], U = p.grid?.u ?? [0, 0, 0], V = p.grid?.v ?? [0, 0, 0];
      for (let gv = 0; gv < nv; gv++) for (let gu = 0; gu < nu; gu++) {
        const local = [0, 1, 2].map(k => (p.at[k] + gu * U[k] + gv * V[k]) * sc[k]);
        const kind = p.box ? 'box' : p.cyl ? 'cyl' : p.plane ? 'plane' : null; if (!kind) throw Error(`module ${item.module} part ${j}: no shape`);
        const size = p.box ? [p.box[0] * sc[0], p.box[1] * sc[1], p.box[2] * sc[2]] : p.cyl ? [p.cyl[0] * sc[0], p.cyl[1] * sc[1]] : [p.plane[0] * sc[0], p.plane[1] * sc[2]];
        out.push({kind, size, at: add(item.at, rotY(local, a)), rotY: a + (p.rotY ?? 0) * deg, mat: mats[p.mat] ?? p.mat, name: `${item.module}_${i}_${j}`, live: !!p.live, bake: p.bake !== false});
      }
    }
  }
  return out;
}
// A location may `extends` a shared layout file: the child's keys win, `materials` and `modules` merge by key.
export function mergeLocation(base, over) {
  const out = {...base, ...over}; for (const k of ['materials', 'modules']) out[k] = {...(base[k] ?? {}), ...(over[k] ?? {})};
  out.layout = [...(base.layout ?? []), ...(over.layout ?? [])]; delete out.extends; return out;
}
// World-space planar UV by the dominant normal axis (textures tile per world unit; no stretching on any box size).
export function worldUV(p, n, tile) {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  return ay >= ax && ay >= az ? [p[0] / tile, p[2] / tile] : ax >= az ? [p[2] / tile, p[1] / tile] : [p[0] / tile, p[1] / tile];
}
// Brightest direction of an equirect (rgb Float32, row 0 = top): the sun for the shadow light, {az, el} in degrees.
export function sunFromEquirect(rgb, w, h) {
  let best = -1, bi = 0; for (let i = 0; i < w * h; i++) { const l = .2126 * rgb[i * 3] + .7152 * rgb[i * 3 + 1] + .0722 * rgb[i * 3 + 2]; if (l > best) { best = l; bi = i; } }
  const x = bi % w, y = (bi / w) | 0, u = (x + .5) / w, v = (y + .5) / h, phi = (u - .5) * 2 * Math.PI, el = (.5 - v) * Math.PI;
  // three.js equirect: direction (x, y, z) ↦ u = atan2(z, x) / 2π + .5, v = asin(y) / π + .5 (flipY) → invert
  const dir = [Math.cos(el) * Math.cos(phi), Math.sin(el), Math.cos(el) * Math.sin(phi)];
  return {dir, el: el / deg, luma: best, px: [x, y]};
}
// Mean colour of the band just above the horizon (fog colour that matches the backdrop), linear rgb.
export function horizonColor(rgb, w, h, {from = .02, to = .1} = {}) {
  const y0 = Math.floor(h * (.5 - to)), y1 = Math.floor(h * (.5 - from)), s = [0, 0, 0]; let k = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; for (let c = 0; c < 3; c++) s[c] += Math.min(rgb[i + c], 4); k++; }
  return s.map(v => v / Math.max(1, k));
}
// GPU bytes of an RGBA8 texture with its mip chain.
export const texBytes = (w, h, bpp = 4, mips = true) => Math.round(w * h * bpp * (mips ? 4 / 3 : 1));
// File names of a CC0 set in the asset cache (assets/realism.json lists what the farm job downloaded).
export function materialFiles(set, manifest) {
  const e = manifest?.materials?.[set]; if (!e) return null;
  const dir = `renders/cache/assets/${e.id}/`;
  return Object.fromEntries(Object.entries(e.maps).map(([k, f]) => [k, dir + f]));
}

// Kit 1 (browser): the grounded photo-sky mesh of a backdrop {height, radius, intensity, rotation (deg)} from an equirect .hdr url → {sky, hdr}.
// Same construction as buildLocation's 'groundedSkybox' backdrop (kept in step by hand: that path stays untouched so existing specs render as before).
export async function groundedSky(T, renderer, url, bd = {}) {
  const {GroundedSkybox} = await import('three/addons/objects/GroundedSkybox.js'), {HDRLoader} = await import('three/addons/loaders/HDRLoader.js');
  const hdr = await new HDRLoader().setDataType(T.FloatType).loadAsync(url); hdr.mapping = T.EquirectangularReflectionMapping;
  const sky = new GroundedSkybox(hdr, bd.height ?? 5, bd.radius ?? 300); sky.rotation.y = (bd.rotation ?? 0) * deg; sky.material.fog = false; sky.material.toneMapped = true; sky.material.color.setScalar(bd.intensity ?? 1);
  sky.position.y = (bd.height ?? 5) + (bd.y ?? 0) - .02; sky.userData.live = true; sky.name = 'groundedSkybox'; return {sky, hdr};
}
// ---- browser ------------------------------------------------------------------------------------------------------------------
export async function buildLocation(scene, renderer, loc, {base, manifest}) {
  const T = await import('three');
  const {GroundedSkybox} = await import('three/addons/objects/GroundedSkybox.js');
  const {HDRLoader} = await import('three/addons/loaders/HDRLoader.js');
  const {voxelize, occluded, hemiDirs} = await import('../engine/bake.js');
  const M = await import('./materials.js');
  const t0 = performance.now(), stats = {fallbacks: [], textures: 0, textureBytes: 0, hdriBytes: 0};
  const root = new T.Group(); root.name = 'location:' + (loc.name ?? ''); scene.add(root);
  renderer.toneMapping = loc.toneMapping === 'Neutral' ? T.NeutralToneMapping : T.AgXToneMapping; renderer.toneMappingExposure = loc.exposure ?? 1;
  // backdrop + env
  const bd = loc.backdrop ?? {type: 'sky'}, pm = new T.PMREMGenerator(renderer); let hdr = null, horizon = null, sunAuto = null;
  if (bd.type === 'groundedSkybox' || bd.type === 'hdri') {
    const f = manifest?.hdri?.[bd.hdri]; if (!f) throw Error('hdri not in manifest: ' + bd.hdri);
    hdr = await new HDRLoader().setDataType(T.FloatType).loadAsync(new URL(`renders/cache/assets/${f.id}/${f.file}`, base).href);
    hdr.mapping = T.EquirectangularReflectionMapping; stats.hdriBytes = hdr.image.width * hdr.image.height * 16;
    if (bd.saturation !== undefined) { const d = hdr.image.data, k = bd.saturation, tint = bd.tint ?? [1, 1, 1];   // opt-in (Touch Grass dust haze): desaturate the HDRI (sky + env) toward its luma
      for (let i = 0; i < d.length; i += 4) { const l = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; for (let c = 0; c < 3; c++) d[i + c] = (l + (d[i + c] - l) * k) * tint[c]; } hdr.needsUpdate = true; }
    const {width: w, height: h, data} = hdr.image, rgb = new Float32Array(w * h * 3); for (let i = 0; i < w * h; i++) { rgb[i * 3] = data[i * 4]; rgb[i * 3 + 1] = data[i * 4 + 1]; rgb[i * 3 + 2] = data[i * 4 + 2]; }
    sunAuto = sunFromEquirect(rgb, w, h); horizon = horizonColor(rgb, w, h);   // HDR rows are top-first (flipY texture)
    const rot = (bd.rotation ?? 0) * deg;
    if (rot) { const d = sunAuto.dir; sunAuto.dir = [d[0] * Math.cos(rot) + d[2] * Math.sin(rot), d[1], -d[0] * Math.sin(rot) + d[2] * Math.cos(rot)]; }
    if (bd.type === 'groundedSkybox') { const sky = new GroundedSkybox(hdr, bd.height ?? 5, bd.radius ?? 300); sky.rotation.y = rot; sky.material.fog = false; sky.material.toneMapped = true; sky.material.color.setScalar(bd.intensity ?? 1); sky.position.y = (bd.height ?? 5) + (bd.y ?? 0) - .02; sky.userData.live = true; sky.name = 'groundedSkybox'; root.add(sky); }
    else { scene.background = hdr; scene.backgroundRotation.y = rot; }
    scene.environment = pm.fromEquirectangular(hdr).texture; scene.environmentRotation.y = rot;
  } else {
    const top = new T.Color(bd.top ?? '#5d9be0'), hor = new T.Color(bd.horizon ?? '#d8e6f2'), es = new T.Scene();
    const skyM = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false, uniforms: {top: {value: top}, hor: {value: hor}},
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float k = pow(clamp(vP.y, 0., 1.), .55); gl_FragColor = vec4(mix(hor, top, k), 1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    const sky = new T.Mesh(new T.SphereGeometry(bd.radius ?? 400, 32, 16), skyM); sky.userData.live = true; sky.name = 'skyDome'; root.add(sky);
    const s2 = sky.clone(); es.add(s2); const g = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshBasicMaterial({color: bd.ground ?? '#6e6a60'})); g.rotation.x = -Math.PI / 2; g.position.y = -2; es.add(g);
    scene.environment = pm.fromScene(es, 0, 1, 1500).texture; horizon = [hor.r, hor.g, hor.b];
  }
  scene.environmentIntensity = loc.env?.intensity ?? 1;
  // fog
  if (loc.fog) { const c = loc.fog.color === 'auto' && horizon ? new T.Color(...horizon.map(v => Math.min(1, v * (loc.fog.k ?? 1)))) : new T.Color(loc.fog.color ?? '#c8c8c8'); scene.fog = new T.Fog(c, loc.fog.near ?? 40, loc.fog.far ?? 300); stats.fog = '#' + c.getHexString(); }
  // sun (real-time only for actors: shadow map fitted to the subject; statics bake its visibility)
  const S = loc.sun ?? {}, sd = S.dir ?? (S.az !== undefined ? [Math.cos(S.el * deg) * Math.sin(S.az * deg), Math.sin(S.el * deg), Math.cos(S.el * deg) * Math.cos(S.az * deg)] : sunAuto?.dir ?? [.4, .7, .3]);
  const sunDir = new T.Vector3(...sd).normalize(); if (S.minEl) { const el = Math.asin(sunDir.y); if (el < S.minEl * deg) { const k = Math.cos(S.minEl * deg) / Math.cos(el); sunDir.set(sunDir.x * k, Math.sin(S.minEl * deg), sunDir.z * k).normalize(); } }
  const sun = new T.DirectionalLight(S.color ?? '#fff1dc', S.intensity ?? 2); sun.castShadow = true; sun.shadow.mapSize.set(S.shadow?.size ?? 1024, S.shadow?.size ?? 1024);
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .04; scene.add(sun, sun.target); stats.sunDir = sunDir.toArray().map(v => +v.toFixed(3));
  if (S.hemi) scene.add(new T.HemisphereLight(S.hemi.sky, S.hemi.ground, S.hemi.i ?? .4));
  // materials palette
  const texLoader = new T.TextureLoader(), mats = {}, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const loadTex = async (url, srgb) => { const t = await texLoader.loadAsync(new URL(url, base).href); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = aniso;
    stats.textures++; stats.textureBytes += texBytes(t.image.width, t.image.height); return t; };
  for (const [key, m] of Object.entries(loc.materials ?? {})) {
    let mat = null, tile = m.tile ?? 4; const files = m.set ? materialFiles(m.set, manifest) : null;
    if (files) {
      try {
        const [map, normalMap, roughnessMap, aoMap] = await Promise.all([files.albedo && loadTex(files.albedo, true), files.normal && loadTex(files.normal, false), files.rough && loadTex(files.rough, false), files.ao && loadTex(files.ao, false)]);
        mat = new T.MeshStandardMaterial({color: m.color ?? '#ffffff', map, normalMap, roughnessMap, roughness: roughnessMap ? 1 : (m.roughness ?? .85), metalness: 0, aoMap: aoMap ?? null, aoMapIntensity: m.ao ?? 1, vertexColors: true});
        if (normalMap) mat.normalScale = new T.Vector2(m.normalScale ?? 1, m.normalScale ?? 1); mat.userData.source = 'cc0:' + m.set;
      } catch (e) { stats.fallbacks.push(`${key}: ${m.set} (${e.message ?? e})`); }
    } else if (m.set) stats.fallbacks.push(`${key}: ${m.set} not downloaded`);
    if (!mat && (m.procedural || m.fallback)) { const p = m.procedural ?? m.fallback; mat = M.std(p, m.procColor ?? m.color ?? '#ffffff', {vertexColors: true}).clone(); mat.envMap = null; tile = m.procTile ?? M.TILE[p] ?? tile; mat.userData.source = 'procedural:' + p; }
    if (!mat) mat = new T.MeshStandardMaterial({color: m.color ?? '#888888', roughness: m.roughness ?? .8, metalness: m.metalness ?? 0, vertexColors: true, emissive: m.emissive ?? '#000000', emissiveIntensity: m.emissive ? 1 : 0});
    mats[key] = {mat, tile};
  }
  // geometry from the layout
  const prims = expandLayout(loc), seg = loc.bake?.seg ?? 1.5, statics = [];
  for (const p of prims) {
    const {mat, tile} = mats[p.mat] ?? (() => { throw Error('unknown material ' + p.mat); })();
    let g = p.kind === 'box' ? new T.BoxGeometry(p.size[0], p.size[1], p.size[2], Math.max(1, Math.ceil(p.size[0] / seg)), Math.max(1, Math.ceil(p.size[1] / seg)), Math.max(1, Math.ceil(p.size[2] / seg)))
      : p.kind === 'cyl' ? new T.CylinderGeometry(p.size[0], p.size[0], p.size[1], 16, Math.max(1, Math.ceil(p.size[1] / seg)))
      : new T.PlaneGeometry(p.size[0], p.size[1], Math.max(1, Math.ceil(p.size[0] / seg)), Math.max(1, Math.ceil(p.size[1] / seg))).rotateX(-Math.PI / 2);
    g.rotateY(p.rotY); g.translate(...p.at);
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) { const [u, v] = worldUV([pos.getX(i), pos.getY(i), pos.getZ(i)], [nrm.getX(i), nrm.getY(i), nrm.getZ(i)], tile); uv.setXY(i, u, v); }
    g.setAttribute('color', new T.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
    const mesh = new T.Mesh(g, mat); mesh.name = p.name; mesh.userData.live = p.live; root.add(mesh); if (p.bake) statics.push(mesh);
  }
  // bake: sky AO (12 hemisphere rays) × sun visibility into vertex colours (static-on-static shadows are baked, as today)
  const B = loc.bake ?? {}, tb = performance.now();
  const tri = []; for (const m of statics) { const p = m.geometry.attributes.position, ix = m.geometry.index; for (let i = 0; i < ix.count; i++) { const k = ix.getX(i); tri.push(p.getX(k), p.getY(k), p.getZ(k)); } }
  const G = voxelize(tri, B.cell ?? .5), HEMI = hemiDirs(12), sdv = sunDir.toArray(), aoMin = B.aoMin ?? .35, shadowK = B.shadow ?? .4, aoDist = B.aoDist ?? 4;
  let verts = 0; const cheap = B.material === 'basic';
  const skyC = new T.Color(B.sky ?? '#ffffff').toArray(), sunC = new T.Color(S.color ?? '#fff1dc').toArray();
  if (!B.sky && horizon) { const mx = Math.max(...horizon); for (let j = 0; j < 3; j++) skyC[j] = horizon[j] / mx; }
  for (const m of statics) {
    const p = m.geometry.attributes.position, n = m.geometry.attributes.normal, c = m.geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const P = [p.getX(i), p.getY(i), p.getZ(i)], N = [n.getX(i), n.getY(i), n.getZ(i)], off = G.cell * 1.05, o = [P[0] + N[0] * off, P[1] + N[1] * off, P[2] + N[2] * off];
      const up = Math.abs(N[1]) < .99 ? [0, 1, 0] : [1, 0, 0], tx = [up[1] * N[2] - up[2] * N[1], up[2] * N[0] - up[0] * N[2], up[0] * N[1] - up[1] * N[0]], tl = Math.hypot(...tx), t = tx.map(v => v / tl), b = [N[1] * t[2] - N[2] * t[1], N[2] * t[0] - N[0] * t[2], N[0] * t[1] - N[1] * t[0]];
      let open = 0; for (const h of HEMI) { const d = [0, 1, 2].map(k => t[k] * h[0] + b[k] * h[1] + N[k] * h[2]); if (!occluded(G, o, d, aoDist)) open++; }
      const ndl = N[0] * sdv[0] + N[1] * sdv[1] + N[2] * sdv[2], lit = ndl > 0 && !occluded(G, o, sdv, 80) ? 1 : 0;
      if (cheap) {   // full baked light (as engine/bake.js): sky × AO + sun × n·l × visibility + a little bounce; unlit material
        const ao = open / HEMI.length, dl = Math.max(0, ndl) * lit, gb = B.bounce ?? .12;
        c.setXYZ(i, ...[0, 1, 2].map(j => skyC[j] * (B.skyI ?? .55) * (aoMin + (1 - aoMin) * ao) + sunC[j] * (B.sunI ?? .75) * dl + gb * ao * Math.max(0, -N[1] + .3)));
      } else { const k = (aoMin + (1 - aoMin) * open / HEMI.length) * (shadowK + (1 - shadowK) * (ndl > 0 ? lit : 1)); c.setXYZ(i, k, k, k); }
    }
    verts += p.count;
  }
  stats.bake = {meshes: statics.length, vertices: verts, ms: Math.round(performance.now() - tb)};
  // statics: 'standard' = lit by env + sun (no shadow map), baked colour = AO × sun visibility (normal + roughness maps live);
  // 'basic' = unlit map × AO map × baked light (today's cost model, engine/bake.js; normal/roughness maps dropped).
  // Glass, metal and emissive parts stay Standard (env reflection).
  // Emissive = a non-black emissive colour with intensity > 0 (procedural std materials carry the default intensity 1 on black: they swap).
  const glows = o => o.emissiveIntensity > 0 && !!o.emissive && (o.emissive.r + o.emissive.g + o.emissive.b) > 0;
  if (cheap) { const swap = new Map(); for (const m of statics) { const o = m.material; if (o.metalness > .3 || o.roughness < .2 || glows(o)) continue;
    if (!swap.has(o)) { const n = new T.MeshBasicMaterial({map: o.map, aoMap: o.aoMap, aoMapIntensity: o.aoMapIntensity, color: o.color, vertexColors: true});
      n.name = 'static:' + B.material; swap.set(o, n); } m.material = swap.get(o); } }
  stats.prims = prims.length; stats.ms = Math.round(performance.now() - t0); stats.horizon = horizon?.map(v => +v.toFixed(3));
  // actors' shadow catcher (statics never receive the real-time map)
  const catcher = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShadowMaterial({opacity: S.shadowOpacity ?? .45})); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; catcher.name = 'shadowCatcher'; root.add(catcher);
  return {root, stats, sun, sunDir, mats,
    fit(centre, r = 8) { sun.position.copy(centre).addScaledVector(sunDir, 60); sun.target.position.copy(centre); const c = sun.shadow.camera; c.left = c.bottom = -r; c.right = c.top = r; c.near = 1; c.far = 140; c.updateProjectionMatrix();
      catcher.position.set(centre.x, (loc.groundY ?? 0) + .015, centre.z); catcher.scale.setScalar(r * 2); }};
}
