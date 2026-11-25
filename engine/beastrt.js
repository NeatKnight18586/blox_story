// engine/beastrt.js — tuft 2A BEAST KIT, the renderer side (three). The maths is engine/beast.js (pure); presets are beasts/*.json.
// One draw per hero beast and one per low-tier preset (+ one for that crowd's contact blobs): every beast is ONE merged, flat-shaded
// faceted mesh whose vertices carry their rigid segment index (`aSeg`) + glow (`aGlow` rgb, a = group seam / mouth / eye); the
// vertex shader reads the segment's 3×4 matrix from a float texture (row = instance), so a 40-beast parade is one InstancedMesh.
// Emissive = aGlow × group intensity × HDR (preset glowHDR under post 'cine' → only seams pass the bloom threshold; LDR 1 without).
import * as T from 'three';
import * as B from './beast.js';
import * as PF from './puff.js';   // 2B TUFT puff / glow
import {contactBlob} from './look5b.js';

export async function loadPresets(names, base) {
  const out = {}; for (const n of new Set(names)) out[n] = await (await fetch(new URL(`beasts/${n}.json`, base))).json(); return out; }
const lin = (() => { const c = new T.Color(); return rgb => { c.setRGB(rgb[0], rgb[1], rgb[2], T.SRGBColorSpace); return [c.r, c.g, c.b]; }; })();
export const LOW_LIGHT = {dir: [.38, .82, .43], ambient: .42, diffuse: .58};   // low tier: per-face light baked in the segment frame (flat shading is per face anyway)
function geometryOf(geo, bake = 0) {
  const g = new T.BufferGeometry(), col = new Float32Array(geo.col.length), glow = new Float32Array(geo.glow.length), Ld = LOW_LIGHT.dir, ln = Math.hypot(...Ld);
  for (let i = 0; i < geo.col.length; i += 3) col.set(lin([geo.col[i], geo.col[i + 1], geo.col[i + 2]]), i);
  if (bake) for (let f = 0; f < geo.pos.length; f += 9) { const p = geo.pos, a = [p[f + 3] - p[f], p[f + 4] - p[f + 1], p[f + 5] - p[f + 2]], b = [p[f + 6] - p[f], p[f + 7] - p[f + 1], p[f + 8] - p[f + 2]];
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nl = Math.hypot(...n) || 1, d = Math.max(0, (n[0] * Ld[0] + n[1] * Ld[1] + n[2] * Ld[2]) / nl / ln), k = bake * (LOW_LIGHT.ambient + LOW_LIGHT.diffuse * d);
    for (let v = 0; v < 3; v++) for (let c = 0; c < 3; c++) col[f + v * 3 + c] *= k; }
  for (let i = 0; i < geo.glow.length; i += 4) { const l = lin([geo.glow[i], geo.glow[i + 1], geo.glow[i + 2]]); glow.set([l[0], l[1], l[2], geo.glow[i + 3]], i); }
  g.setAttribute('position', new T.BufferAttribute(geo.pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.setAttribute('aSeg', new T.BufferAttribute(geo.seg, 1)); g.setAttribute('aGlow', new T.BufferAttribute(glow, 4)); return g; }
// satin faceted material, segment matrices from a float texture (nSeg × 3 texels per row, one row per instance)
export const MOON_RIM = [.15, .24, .5];   // P3 moonlit: cool fresnel rim on hero beasts (scene-linear, before the grade)
function beastMaterial(nSeg, rows, low = false, rim = null, mat = null) {   // P3B: mat = preset `material` {roughness, metalness, env} (opt-in; TITAN basalt)   // P3: rim = moon rim colour (look4 'moonlit' only; fresnel, emissive)
   // low tier: unlit (baked per-face light, LOW_LIGHT): the cheapest pixel, one draw per preset
  const data = new Float32Array(nSeg * 3 * rows * 4), tex = new T.DataTexture(data, nSeg * 3, rows, T.RGBAFormat, T.FloatType);
  tex.magFilter = tex.minFilter = T.NearestFilter; tex.needsUpdate = true;
  const m = low ? new T.MeshBasicMaterial({vertexColors: true}) : new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: mat?.roughness ?? .36, metalness: mat?.metalness ?? .18, envMapIntensity: mat?.env ?? .9, fog: mat?.fog ?? true});
  const U = {uSegTex: {value: tex}, uGlowI: {value: new T.Vector3(1, 1, 1)}, uBeastMask: {value: 0}, ...(rim ? {uRim: {value: new T.Vector3(...rim)}} : {})};
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute float aSeg; attribute vec4 aGlow; uniform highp sampler2D uSegTex; varying vec4 vGlow;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed; { int s = int(aSeg + .5) * 3, r = gl_InstanceID; vec4 p = vec4(position, 1.);
  transformed = vec3(dot(texelFetch(uSegTex, ivec2(s, r), 0), p), dot(texelFetch(uSegTex, ivec2(s + 1, r), 0), p), dot(texelFetch(uSegTex, ivec2(s + 2, r), 0), p)); } vGlow = aGlow;`);
    sh.fragmentShader = (rim ? 'uniform vec3 uRim;\n' : '') + 'uniform vec3 uGlowI; uniform float uBeastMask; varying vec4 vGlow;\n' + sh.fragmentShader
      .replace(low ? '#include <color_fragment>' : '#include <emissivemap_fragment>', (low ? '#include <color_fragment>' : '#include <emissivemap_fragment>') + `\n  { int gB = int(vGlow.a + .5); float gi = gB == 0 ? uGlowI.x : gB == 1 ? uGlowI.y : uGlowI.z; ${low ? 'diffuseColor.rgb' : 'totalEmissiveRadiance'} += vGlow.rgb * gi; }${rim && !low ? `\n  totalEmissiveRadiance += uRim * pow(1. - clamp(abs(dot(normal, normalize(vViewPosition))), 0., 1.), 2.2);` : ''}`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  if (uBeastMask > .5) gl_FragColor = vec4(dot(vGlow.rgb, vec3(1.)) > 1e-4 ? 1. : 0., 1., 0., 1.);'); };
  m.customProgramCacheKey = () => 'beast2a' + (low ? 'L' : '') + (rim ? 'R' : ''); m.userData.beast = true;
  return {m, U, tex, data}; }

// spec actors {style: 'beast', preset, tier, at/offset/yaw | marks, state?, orbit?}; shots[].beasts [{actor, state, at, to?, exit?}];
// spec.beastCrowds [{presets, n, at: [x, z] | anchor, dir, length, width, state, speed, seed, from}]
export function createBeasts({scene, spec, presets, hdr, groundY = () => 0, resolveXZ, shots, FPS, markAt, base}) {
  const D = Math.PI / 180, actors = {}, crowds = [], geoCache = {};
  const geoOf = (name, tier, bake = 0) => geoCache[name + '|' + tier + '|' + bake] ??= (g => ({geo: g, sup: B.supportPoints(g), three: geometryOf(g, bake)}))(B.buildGeometry(presets[name], tier));
  const LOWK = spec.look4 === 'moonlit' ? .7 : spec.look4 === 'mystery' || /night/i.test(spec.look ?? '') ? .38 : 1;   // low tier baked light level (night sets are darker)
  let GK = 1; const hdrOf = P => (hdr ? P.glowHDR ?? 3 : 1) * GK;   // GK: gates only (0 = seams dark)
  let gTex = null; const glowTex = () => { if (gTex) return gTex; const n = 64, b = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const r = Math.hypot(x + .5 - n / 2, y + .5 - n / 2) / (n / 2), a = r < 1 ? Math.exp(-r * r / (2 * .16)) * (1 - r) : 0, i = (y * n + x) * 4; b[i] = b[i + 1] = b[i + 2] = 255; b[i + 3] = Math.round(a * 255); }
    gTex = new T.DataTexture(b, n, n, T.RGBAFormat); gTex.magFilter = gTex.minFilter = T.LinearFilter; gTex.needsUpdate = true; return gTex; };
  function create(name, c) {
    const P = presets[c.preset]; if (!P) throw Error(`beast ${name}: unknown preset ${c.preset}`);
    const root = new T.Group(); root.name = 'beast_' + name; root.userData.live = true; scene.add(root);
    const head = new T.Object3D(); scene.add(head);
    if (P.rig === 'blink') {
      const col = new T.Color(P.glow), sp = new T.Sprite(new T.SpriteMaterial({map: glowTex(), color: col.clone().multiplyScalar(hdrOf(P)), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: !hdr}));
      sp.scale.setScalar(P.size * (P.spriteK ?? 2.2)); sp.renderOrder = P.wingCards ? -1 : 0; root.add(sp);   // 2B: the glow sits behind the wings
      const bm = new T.MeshStandardMaterial({color: P.colors.body, roughness: .5, flatShading: true}), body = new T.Mesh(new T.IcosahedronGeometry(P.size * (P.dotK ?? .18), 0), bm); body.scale.set(.8, .8, 1.4); root.add(body);
      const wc = P.wingCards, wm = new T.MeshBasicMaterial({color: P.colors.wing, transparent: true, opacity: wc?.opacity ?? .55, side: T.DoubleSide, depthWrite: false}), wings = [1, -1].map(k => { const w = new T.Mesh(new T.PlaneGeometry(P.size * (wc?.w ?? .5), P.size * (wc?.h ?? .22)), wm); if (wc) { w.geometry.rotateX(-Math.PI / 2); w.renderOrder = 2; } w.geometry.translate(P.size * (wc?.w ?? .5) / 2, 0, 0); w.position.set(0, P.size * .08, 0); w.userData.k = k; if (k < 0) w.rotation.y = Math.PI; root.add(w); return w; });   // 2B wingCards: horizontal cards hinged on the body axis (rotation.z = a real flap), drawn over the glow
      root.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
      const trail = Array.from({length: P.trail?.n ?? 0}, () => { const t2 = new T.Sprite(sp.material.clone()); t2.renderOrder = -1; t2.name = 'blinkTrail'; t2.userData.live = true; scene.add(t2); return t2; });   // P3: short sparkle trail
      return actors[name] = {name, c, P, root, head, blink: {sp, wings, col, trail}, blobR: 0, pivots: {head}}; }
    const tier = c.tier ?? 'hero', G = geoOf(c.preset, tier), {m, U, tex, data} = beastMaterial(G.geo.segNames.length, 1, false, spec.look4 === 'moonlit' && (c.rim ?? P.moonRim ?? true) ? MOON_RIM : null, P.material);   // P3B: preset moonRim / cast rim false = no moon rim (TITAN: its light is its own cracks + eyes)
    const mesh = new T.InstancedMesh(G.three, m, 1); mesh.setMatrixAt(0, new T.Matrix4()); mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false; mesh.name = 'beastMesh_' + name; mesh.userData.live = true; root.add(mesh);
    return actors[name] = {name, c, P, root, head, mesh, U, tex, data, G, tier, blobR: (P.blobR ?? 1.5), pivots: {head}, track: null, start: null, seed: B.hashSeed(name)}; }
  for (const [n, c] of Object.entries(spec.cast ?? {})) if (c.style === 'beast') create(n, c);
  // low-tier crowds: one InstancedMesh per preset (+ one instanced blob mesh)
  for (const [ci, cfg0] of (spec.beastCrowds ?? []).entries()) {
    const at = Array.isArray(cfg0.at) ? cfg0.at : resolveXZ(cfg0.at), cfg = {...cfg0, at}, members = B.crowdMembers(cfg);
    for (const pn of new Set(members.map(m => m.preset))) {
      const ms = members.filter(m => m.preset === pn), G = geoOf(pn, 'low', cfg.light ?? LOWK), {m, U, tex, data} = beastMaterial(G.geo.segNames.length, ms.length, true);
      const mesh = new T.InstancedMesh(G.three, m, ms.length); mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false; mesh.name = `beastCrowd_${ci}_${pn}`; mesh.userData.live = true; scene.add(mesh);
      const b0 = contactBlob(1, .5), blobs = new T.InstancedMesh(b0.geometry, b0.material, ms.length); b0.material.depthTest = true; blobs.frustumCulled = false; blobs.renderOrder = 1; blobs.name = `beastCrowdBlobs_${ci}_${pn}`; blobs.userData.live = true; scene.add(blobs);
      crowds.push({cfg, P: presets[pn], members: ms, G, mesh, blobs, U, tex, data}); } }
  // tracks from shots[].beasts (absolute seconds), start = the actor's mark at 0
  function trackOf(a) {
    if (a.track) return a.track; const c = a.c, k = [{t: 0, state: c.state ?? (a.P.rig === 'bird' ? 'perch' : 'idle')}];
    for (const sh of shots) for (const e of sh.beasts ?? []) if (e.actor === a.name) {
      const cam = sh.from ? {position: sh.from.position, target: sh.from.target} : null, to = e.to == null ? null : Array.isArray(e.to) ? (e.to.length === 3 ? [e.to[0], e.to[2]] : e.to) : resolveXZ(e.to);
      k.push({t: sh.start / FPS + (e.at ?? 0), state: e.state, ...(to ? {to} : {}), ...(e.state === 'flee' ? {exit: B.exitDir(e.exit ?? sh.exit ?? 'right', cam ?? {position: [0, 0, 10], target: [0, 0, 0]})} : {})}); }
    const p0 = markAt(c, 0); a.start = {p: [p0[0], p0[2]], yaw: (c.yaw ?? 0) * D}; return a.track = B.normTrack(k); }
  // 2B: shot `puffs` [{actor, size, at}] / `glows` [{actor, level, at}] → absolute-time events per actor (pure in t)
  const evOf = (key, name) => shots.flatMap(sh => (sh[key] ?? []).filter(e => e.actor === name).map(e => ({...e, t: sh.start / FPS + (e.at ?? 0)}))).sort((x, y) => x.t - y.t);
  const puffK = (a, t) => a.P.rig === 'puff' ? PF.puffAt(a.puffEv ??= evOf('puffs', a.name), t, PF.TUFT_H, 'tuft', a.P.puffK) : {k: 1, phase: 'rest'};
  let spTex = null; const sparkleOf = a => { if (a.spark) return a.spark; const sp = new T.Sprite(new T.SpriteMaterial({map: glowTex(), color: new T.Color('#FFD36B').multiplyScalar(hdr ? 3 : 1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: !hdr})); sp.visible = false; scene.add(sp); void spTex; return a.spark = sp; };
  const puffOf = a => { if (a.airPuff) return a.airPuff; const sp = new T.Sprite(new T.SpriteMaterial({map: glowTex(), color: new T.Color('#e8eef2'), transparent: true, depthWrite: false, fog: false, opacity: .8})); sp.visible = false; scene.add(sp); return a.airPuff = sp; };
  const M4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S1 = new T.Vector3(1, 1, 1), Y = new T.Vector3(0, 1, 0);
  // per frame: tq = the body time (twos), t = glow / light time (ones)
  function drive(name, t, tq) {
    const a = actors[name]; if (!a || a.P.rig === 'blink') return null;
    const pk = puffK(a, t), s = B.sampleBeast(a.P, trackOf(a), tq, {seed: a.seed, groundY, geo: a.G.geo, support: a.G.sup, start: a.start, glowT: t, scale: pk.k});
    a.root.position.fromArray(s.root.p); a.root.rotation.set(0, s.root.yaw, 0); a.root.scale.setScalar(pk.k); a.puff = pk; B.segRows(s, a.data, 0); a.tex.needsUpdate = true; a.sample = s;
    const lv = a.P.rig === 'puff' ? PF.tipGlow(pk.k, PF.glowAt(a.glowEv ??= evOf('glows', a.name), t, a.c.glowLevel ?? .35)) : 1;   // TUFT: quill glow level × size
    const h = hdrOf(a.P); a.U.uGlowI.value.set(s.glow.seam * h * (a.c.glow ?? 1) * lv, s.glow.mouth * h * (a.c.glow ?? 1), s.glow.eye * h * (a.c.glow ?? 1));
    if (a.P.rig === 'puff') { const sp = sparkleOf(a), v = s.glow.sparkle; sp.visible = v > .02; if (sp.visible) { sp.position.fromArray(B.worldOf(s, 'body', [.05, .1, .45])); sp.scale.setScalar(.35 * pk.k * (.6 + v)); sp.material.color.set('#FFD36B').multiplyScalar((hdr ? 3 : 1) * v); }
      const ap = puffOf(a), u = pk.phase === 'deflate' ? pk.tau / .45 : 1; ap.visible = u < 1; if (ap.visible) { ap.position.fromArray(B.worldOf(s, 'body', [0, .2, -.6])); ap.scale.setScalar(pk.from * .6 * (0.5 + 1.5 * u)); ap.material.opacity = .75 * (1 - u); } }
    a.head.position.fromArray(a.P.rig === 'puff' ? B.worldOf(s, 'body', [0, .1, .2]) : B.worldOf(s, 'head', [0, a.P.dims.headH * .3 * (a.P.scale ?? 1), a.P.dims.headL * .45 * (a.P.scale ?? 1)]));
    if (a.c.visible) a.root.visible = valueAtSafe(a.c.visible, t);
    return a.root.position.toArray(); }
  // tuft 2B: the beast's LIVE pose at absolute time t, pure (camera 'cine' follows / frames this, not the mark): root, head centre, yaw, height
  const liveCache = new Map();
  function liveAt(name, t) {
    const a = actors[name]; if (!a || a.P.rig === 'blink') return null; const k = name + '|' + t.toFixed(5); if (liveCache.has(k)) return liveCache.get(k);
    const pk = puffK(a, t), s = B.sampleBeast(a.P, trackOf(a), t, {seed: a.seed, groundY, geo: a.G.geo, support: a.G.sup, start: a.start, scale: pk.k}), K = (a.P.scale ?? 1) * pk.k, d = a.P.dims;
    a.H ??= (() => { const v = B.worldVerts(B.sampleBeast(a.P, [{t: 0, state: 'idle'}], 0, {geo: a.G.geo, support: a.G.sup}), a.G.geo); let y = 0; for (let i = 1; i < v.length; i += 3) y = Math.max(y, v[i]); return y; })();
    const r = {root: s.root.p, yaw: s.root.yaw, head: a.P.rig === 'puff' ? B.worldOf(s, 'body', [0, .1, .2]) : B.worldOf(s, 'head', [0, (d.headH ?? 1) * .3 * K, (d.headL ?? 1) * .45 * K]), H: a.H * pk.k, headH: Math.max(d.headH ?? .6, d.headW ?? .6) * K};
    if (liveCache.size > 4000) liveCache.clear(); liveCache.set(k, r); return r; }
  // BLINK orbit (after every actor is posed) + crowds
  // 2B: cast `ride: {actor, at: 'hood'|'hands', from?, until?}`: the beast sits in the carrier's hood (behind the neck) or cupped hands (posed carrier)
  const RIDE = {hood: {fwd: -.72, up: -1.02}, hands: {fwd: .95, up: -2.05}};
  function rideOf(a, t, frameOf) { const r = a.c.ride; if (!r || !frameOf || t < (r.from ?? -1e9) || t >= (r.until ?? 1e9) || (a.puff && a.puff.k > 1.05)) return false;
    const f = frameOf(r.actor); if (!f) return false; const o = RIDE[r.at ?? 'hood'], k = f.s;
    a.root.position.set(f.head[0] + Math.sin(f.yaw) * o.fwd * k, f.head[1] + o.up * k, f.head[2] + Math.cos(f.yaw) * o.fwd * k); a.root.rotation.y = f.yaw; return true; }
  function post(t, tq, headOf, frameOf) {
    for (const a of Object.values(actors)) if (a.c.ride && a.mesh) a.riding = rideOf(a, t, frameOf);
    for (const a of Object.values(actors)) if (a.P.rig === 'blink') {
      const tgt = a.c.orbit, hp = tgt ? headOf(tgt) : null, base = hp ?? markAt(a.c, t).map((v, i) => i === 1 ? v + 3 : v), b = B.blinkAt(t, base, B.hashSeed(a.name));
      a.root.position.fromArray(b.p); a.root.rotation.set(0, b.yaw, 0); a.head.position.fromArray(b.p);
      a.blink.sp.material.color.copy(a.blink.col).multiplyScalar(hdrOf(a.P) * b.glow);
      for (const w of a.blink.wings) w.rotation.z = (w.userData.k > 0 ? 1 : -1) * (.35 + .55 * b.wing);
      a.blink.trail.forEach((sp, i) => { const u = (i + 1) / (a.blink.trail.length + 1), q = B.blinkAt(t - (i + 1) * a.P.trail.dt, base, B.hashSeed(a.name)); sp.position.fromArray(q.p); sp.scale.setScalar(a.P.size * a.P.spriteK * a.P.trail.k * (1 - u)); sp.material.color.copy(a.blink.col).multiplyScalar(hdrOf(a.P) * .7 * (1 - u)); sp.visible = a.root.visible; }); }
    for (const cr of crowds) cr.members.forEach((mb, i) => {
      const s = B.sampleCrowdMember(cr.P, cr.G.geo, cr.G.sup, cr.cfg, mb, tq, groundY); B.segRows(s, cr.data, i * cr.G.geo.segNames.length * 12);
      Q.setFromAxisAngle(Y, s.root.yaw); M4.compose(V.fromArray(s.root.p), Q, S1); cr.mesh.setMatrixAt(i, M4);
      const r = (cr.P.blobR ?? 1) * 1, gy = groundY(s.root.p[0], s.root.p[2]); Q.setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2); M4.compose(V.set(s.root.p[0], gy + .03, s.root.p[2]), Q, new T.Vector3(r, r, r)); cr.blobs.setMatrixAt(i, M4); });
    for (const cr of crowds) { cr.mesh.instanceMatrix.needsUpdate = true; cr.blobs.instanceMatrix.needsUpdate = true; cr.tex.needsUpdate = true; const h = hdrOf(cr.P); cr.U.uGlowI.value.set(h, h, h); } }
  const valueAtSafe = (keys, t) => { let v = true; for (const [k0, val] of keys) if (t >= k0) v = val; return v; };
  // gates: glow scale (0 = seams dark), mask mode (beast pixels: g = 1, seams: r = 1; everything else hidden by the caller)
  const allU = () => [...Object.values(actors).filter(a => a.U).map(a => a.U), ...crowds.map(c => c.U)];
  const setMask = on => { for (const U of allU()) U.uBeastMask.value = on ? 1 : 0; for (const a of Object.values(actors)) if (a.blink) { a.blink.sp.visible = !on; for (const x of a.blink.trail ?? []) x.visible = !on; } };
  const meshes = () => [...Object.values(actors).flatMap(a => [a.root]), ...crowds.flatMap(c => [c.mesh])];
  // 2B TITAN: footfall times of a beast's stomp / walk keys (absolute s) for the shot `shake` hook
  const ffCache = {}; function footfallsOf(name) { if (ffCache[name]) return ffCache[name]; const a = actors[name]; if (!a?.mesh) return []; const tr = trackOf(a), out = [];
    tr.forEach((k, i) => { if (k.state === 'stomp' || (k.state === 'walk' && a.P.name === 'TITAN')) out.push(...B.footfalls(a.P, k.state, k.t + .05, tr[i + 1]?.t ?? k.t + 60, a.seed)); }); return ffCache[name] = out; }
  return {actors, crowds, create, drive, post, trackOf, liveAt, footfallsOf, setMask, meshes, setGlowScale: k => { GK = k; }, is: n => !!actors[n], blobItems: () => Object.values(actors).filter(a => a.blobR > 0).map(a => ({key: 'beast_' + a.name, x: a.root.position.x, y: a.root.position.y, z: a.root.position.z, r: a.blobR * a.root.scale.x, visible: a.root.visible && !a.riding}))}; }
