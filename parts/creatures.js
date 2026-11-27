// parts/creatures.js — FEAR BELL CREATURE KIT (Phase 1G; reusable). Eight cartoon creatures, each a three.js builder + acts that are
// PURE in t (any frame order), family-safe, ≤ 8k tris each. Opt-in spec `creatures` (engine/episode.js):
//   "creatures": [{"id": "g1", "kind": "ghost" | "trex" | "rat" | "spider" | "vacuum" | "shadowPuff" | "dome" | "pillar",
//                  "pos": [x, y, z] | [[t, [x, y, z]], …], "yaw": deg | [[t, deg], …], "scale": 1,
//                  "acts": [{"act": <name>, "at": s, "dur"?: s, …}], "visible": [[t, bool], …],
//                  "follow": "<actor or creature id>" (shadowPuff), "ride": "<actor>" (pillar: the actor stands on the top)}]
// Acts (kind → act): ghost spawn · boo (shy wave) | trex roar · stomp | rat shrink (→ tiny mouse) | spider wave (all eight legs) |
// vacuum circle {r} · lunge | shadowPuff (follows + blinks; always on) | dome roll {from, to} · shrink {to} (whoosh collapse → 2 quick
// steps → palm puff + cute blink) · inside (near-black, only `keep` lights) | pillar rise (40 studs, dust).
// Pure helpers (tests/v2/creatures.test.js): actAt, ACTS, shrinkRadius, pillarHeight, domeMotion, vacuumMotion, ghostBob.
import * as T from 'three';

export const KINDS = ['ghost', 'trex', 'rat', 'spider', 'vacuum', 'shadowPuff', 'dome', 'pillar'];
export const ACTS = {ghost: {spawn: .5, boo: 1.8}, trex: {roar: 1.5, stomp: .9}, rat: {shrink: .7}, spider: {wave: 1.8}, vacuum: {circle: 2.4, lunge: .7},
  shadowPuff: {}, dome: {roll: 2.0, shrink: 1.7, inside: 2}, pillar: {rise: .6}};
export const INSIDE = {exposure: .08};
export const RIM_IN = {color: '#b4cfff', intensity: 120, distance: 8, decay: 1.2, back: 1.2, side: 1.8, up: 2.6};   // fearbell add-on: inside-dome rim (intensity at normal exposure; boosted like any `keep` light)   // the dome's inside view: frame exposure × this; flashlight (`keep`) lights × 1 / this
export const SIZE = {ghost: 11, trex: 15.5, rat: 1.0, spider: 8.5, vacuum: 9, shadowPuff: 1.7, dome: 34, pillar: 40, palm: .42};
const clamp01 = x => Math.max(0, Math.min(1, x)), lerp = (a, b, k) => a + (b - a) * k, sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const outBack = (x, s = 1.7) => { x = clamp01(x) - 1; return 1 + x * x * ((s + 1) * x + s); }, inCubic = x => clamp01(x) ** 3, outCubic = x => 1 - (1 - clamp01(x)) ** 3;
const band = (u, a, b) => clamp01((u - a) / (b - a));
// the latest act of `name` started at or before t: {u: s since start, k: 0…1 over its duration, e: the act entry} or null
export function actAt(acts, t, name, kind) {
  let e = null; for (const a of acts ?? []) if (a.act === name && t >= a.at && (!e || a.at >= e.at)) e = a;
  if (!e) return null; const dur = e.dur ?? ACTS[kind]?.[name] ?? 1, u = t - e.at; return {u, k: clamp01(u / dur), dur, e};
}
// ---- pure motion pieces ----
export const ghostBob = t => .35 * Math.sin(t * 2 * Math.PI / 2.2);
export const pillarHeight = (u, H = SIZE.pillar, dur = ACTS.pillar.rise) => u <= 0 ? 0 : H * outBack(u / dur, 1.2);
// dome radius through the SHRINK sequence (u = s since the act, R = full radius): anticipation swell → whoosh collapse → two quick steps → palm
export function shrinkRadius(u, R = SIZE.dome, palm = SIZE.palm) {
  if (u <= 0) return R; const S1 = .16 * R, S2 = Math.max(palm * 2.6, .055 * R);
  if (u < .12) return R * (1 + .06 * sm(u / .12));
  if (u < .5) return lerp(R * 1.06, S1, inCubic(band(u, .12, .5)) * .92 + .08 * band(u, .12, .5));
  if (u < .62) return S1;
  if (u < .74) return lerp(S1, S2, outBack(band(u, .62, .74), 2.2));
  if (u < .86) return S2;
  if (u < .98) return lerp(S2, palm, outBack(band(u, .86, .98), 2.2));
  return palm;
}
// dome root at t: roll from → to (inOut), the shrink act lerps toward its `to` during the two quick steps; {pos, lean, squash}
export function domeMotion(c, t, base) {
  let pos = base.slice(), lean = 0, sq = 1; const r = actAt(c.acts, t, 'roll', 'dome');
  if (r) { const k = sm(r.k), f = r.e.from ?? base, to = r.e.to ?? base; pos = f.map((v, i) => lerp(v, to[i], k)); const sp = r.k > 0 && r.k < 1 ? Math.sin(Math.PI * r.k) : 0; lean = .12 * sp; sq = 1 - .07 * sp; }
  const s = actAt(c.acts, t, 'shrink', 'dome'); if (s?.e.to) { const k = sm(band(s.u, .55, 1.0)); pos = pos.map((v, i) => lerp(v, s.e.to[i], k)); }
  return {pos, lean, squash: sq};
}
// vacuum root offset at t (local frame, before the base yaw): a circle of radius r around the point r to its right, then a lunge forward
export function vacuumMotion(c, t) {
  let x = 0, z = 0, yaw = 0, tilt = 0; const ci = actAt(c.acts, t, 'circle', 'vacuum');
  if (ci) { const r = ci.e.r ?? 6, a = 2 * Math.PI * sm(ci.k) * (ci.e.turns ?? 1); x = r - r * Math.cos(a); z = r * Math.sin(a); yaw = -a; }
  const l = actAt(c.acts, t, 'lunge', 'vacuum');
  if (l) { const d = (l.e.dist ?? 6) * (l.u < .35 ? outCubic(l.u / .35) : 1 - .35 * sm((l.u - .35) / .35)), f = [Math.sin(yaw), Math.cos(yaw)];
    x += f[0] * d; z += f[1] * d; tilt = (l.u < .12 ? -.12 * sm(l.u / .12) : .3 * Math.sin(Math.PI * clamp01((l.u - .1) / .6))); }
  return {x, z, yaw, tilt};
}
// ---- shared bits ----
const cache = new Map(), C = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const plastic = (col, o = {}) => C('p' + col + JSON.stringify(o), () => new T.MeshStandardMaterial({color: col, roughness: .42, metalness: 0, ...o}));
const ink = () => plastic('#141218', {roughness: .3});
const mesh = (g, m, at = [0, 0, 0], rot = [0, 0, 0], sc = null) => { const x = new T.Mesh(g, m); x.position.set(...at); x.rotation.set(...rot); if (sc) x.scale.set(...sc); x.castShadow = true; return x; };
const box = (w, h, d) => new T.BoxGeometry(w, h, d), sph = (r, a = 18, b = 12) => new T.SphereGeometry(r, a, b);
const pivot = (parent, at = [0, 0, 0], name = '') => { const p = new T.Group(); p.position.set(...at); p.name = name; parent.add(p); return p; };
const HAS_DOM = typeof document !== 'undefined';
const spriteTex = (kind) => C('tex:' + kind, () => { if (!HAS_DOM) return null; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.translate(32, 32);
  if (kind === 'star') { g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }
  else { const gr = g.createRadialGradient(0, 0, 2, 0, 0, 30); const c0 = kind === 'wisp' ? '10,8,16' : '255,255,255'; gr.addColorStop(0, `rgba(${c0},.95)`); gr.addColorStop(.55, `rgba(${c0},.55)`); gr.addColorStop(1, `rgba(${c0},0)`); g.fillStyle = gr; g.fillRect(-32, -32, 64, 64); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; });
const sprite = (kind, color, o = {}) => { const s = new T.Sprite(new T.SpriteMaterial({map: spriteTex(kind), color, transparent: true, depthWrite: false, fog: false, toneMapped: false, ...o})); s.renderOrder = 8; return s; };
// cute eye: black oval + two white glints (front = +z of the returned group)
function cuteEye(r, {white = false} = {}) {
  const g = new T.Group(); if (white) g.add(mesh(new T.CircleGeometry(r * 1.25, 24), plastic('#ffffff', {emissive: '#ffffff', emissiveIntensity: .25}), [0, 0, -.01]));
  const pupil = mesh(new T.CircleGeometry(r, 24), ink(), [0, 0, 0], [0, 0, 0], [1, 1.22, 1]); pupil.name = 'pupil'; g.add(pupil);
  g.add(mesh(new T.CircleGeometry(r * .34, 14), plastic('#ffffff', {emissive: '#ffffff', emissiveIntensity: .6}), [r * .32, r * .45, .01]));
  g.add(mesh(new T.CircleGeometry(r * .16, 10), plastic('#ffffff', {emissive: '#ffffff', emissiveIntensity: .6}), [-r * .3, -r * .35, .01]));
  return g;
}
const onSurface = (obj, p, n) => { obj.position.copy(p).addScaledVector(n, .03); obj.lookAt(p.clone().add(n)); return obj; };
// a fluffy ink cloud: merged balls (one mesh), used by shadowPuff and the dome's palm puff
function inkCloud(seed = 1, n = 7) {
  const parts = []; let s = seed * 9301; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3, r = i === 0 ? .72 : .36 + .16 * rnd(); const g = new T.IcosahedronGeometry(r, 2);
    g.translate(i === 0 ? 0 : Math.cos(a) * .58, i === 0 ? 0 : Math.sin(a) * .5 + .05, i === 0 ? 0 : -.08 - .12 * rnd()); parts.push(g); }   // a round puffy disc facing +z (balls around the rim)
  return merge(parts);
}
function merge(list) { const g = list.map(x => x.index ? x.toNonIndexed() : x), out = new T.BufferGeometry(); let n = 0; for (const x of g) n += x.attributes.position.count;
  for (const k of ['position', 'normal']) { const a = new Float32Array(n * 3); let o = 0; for (const x of g) { a.set(x.attributes[k].array, o); o += x.attributes[k].array.length; } out.setAttribute(k, new T.BufferAttribute(a, 3)); } return out; }
export const tris = o => { let n = 0; o.traverse(m => { if (m.isMesh) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return n; };

// =============================== 1. GHOST — big glowing white sheet, shy derpy face ===============================
function ghost() {
  const root = new T.Group(), body = pivot(root, [0, 1.2, 0], 'ghostBody'), H = SIZE.ghost - 1.2, R = 3.3, prof = [];
  for (let i = 0; i <= 9; i++) { const a = i / 9 * Math.PI / 2; prof.push(new T.Vector2(Math.max(.001, R * Math.sin(a)), H - R + R * Math.cos(a))); }
  for (const [x, y] of [[1.04, H - R - 1.6], [1.12, 4.0], [1.24, 2.3], [1.34, 1.1], [1.38, .55]]) prof.push(new T.Vector2(R * x, y));
  const geo = new T.LatheGeometry(prof, 44), base = geo.attributes.position.array.slice();
  const sheet = mesh(geo, new T.MeshStandardMaterial({color: '#f8fbff', emissive: '#d6eaff', emissiveIntensity: .42, roughness: .62, side: T.DoubleSide})); sheet.name = 'ghostSheet'; body.add(sheet);
  const halo = new T.Mesh(geo, new T.MeshBasicMaterial({color: '#bfe2ff', transparent: true, opacity: .2, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false}));
  halo.scale.setScalar(1.07); halo.position.y = -.1; halo.name = 'ghostHalo'; halo.castShadow = false; body.add(halo);
  // face on the dome front
  const cy = H - R, rAt = y => y >= cy ? Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)) : R * (1 + .025 * (cy - y)), P = (x, y) => { const r = rAt(y); return new T.Vector3(x, y, Math.sqrt(Math.max(0, r * r - x * x))); },
    N = p => (p.y >= cy ? p.clone().sub(new T.Vector3(0, cy, 0)) : new T.Vector3(p.x, 0, p.z)).normalize();
  const eyes = [-1, 1].map(s => { const p = P(s * 1.08, cy + .3 + (s > 0 ? .12 : 0)), e = onSurface(cuteEye(s > 0 ? .64 : .54), p, N(p)); body.add(e); return e; });   // derpy: one eye bigger + higher
  const wav = new T.CatmullRomCurve3(Array.from({length: 9}, (_, i) => new T.Vector3(-.42 + i * .105, .07 * Math.sin(i * 1.9) - .04 * Math.cos(i * .8), 0)));
  const mouth = new T.Group(), mp = P(.1, cy - .95); onSurface(mouth, mp, N(mp)); mouth.position.addScaledVector(N(mp), .08); mouth.add(new T.Mesh(new T.TubeGeometry(wav, 24, .075, 6), ink())); body.add(mouth);
  const blush = [-1, 1].map(s => { const p = P(s * 1.75, cy - .45), b = onSurface(new T.Mesh(new T.CircleGeometry(.36, 16), plastic('#ff8fb0', {emissive: '#ff7fa5', emissiveIntensity: .35})), p, N(p)); b.scale.set(1, .6, 1); body.add(b); return b; });
  // arm nubs (sheet bumps) on shoulder pivots
  const arms = [-1, 1].map(s => { const pv = pivot(body, [s * R * 1.02, 4.6, .3], 'ghostArm'), m = mesh(sph(.85, 14, 10), sheet.material, [s * .55, -.5, 0], [0, 0, s * .5], [1, 1.45, .8]); pv.add(m); return pv; });
  const sparks = HAS_DOM ? Array.from({length: 16}, () => sprite('star', '#fff6c8')) : [];
  return {root, sparks, apply(t, c) {
    const sp = actAt(c.acts, t, 'spawn', 'ghost'), boo = actAt(c.acts, t, 'boo', 'ghost'), born = sp ? sp.u : 9;
    const pop = sp && born < .5 ? (born < .14 ? outBack(born / .14, 2.4) * 1.05 : 1 + .12 * Math.sin((born - .14) / .36 * Math.PI) * (1 - (born - .14) / .36)) : 1;
    if ((c.acts ?? []).some(a => a.act === 'spawn') && !sp) root.visible = false;   // not there until it spawns root.scale.setScalar((c.scale ?? 1) * Math.max(.001, sp ? (born < 0 ? 0 : pop) : 1));
    body.position.y = 1.2 + ghostBob(t); body.rotation.z = .04 * Math.sin(t * 1.7);
    const a = geo.attributes.position, ph = t * 3.2; for (let i = 0; i < a.count; i++) { const y = base[i * 3 + 1]; if (y > 2.6) continue; const x = base[i * 3], z = base[i * 3 + 2], th = Math.atan2(x, z), w = clamp01((2.6 - y) / 2);
      a.array[i * 3 + 1] = y + w * .42 * Math.sin(th * 6 + ph); const k = 1 + w * .05 * Math.sin(th * 3 - ph); a.array[i * 3] = x * k; a.array[i * 3 + 2] = z * k; }
    a.needsUpdate = true; geo.computeVertexNormals();
    // boo: shy lean back + tuck → right nub up waving (3×) + mouth 'o' wobble; eyes squeeze shut on the wave
    let lean = 0, wave = 0, mo = 1, sq = 1;
    if (boo) { const u = boo.k; lean = u < .18 ? -.12 * sm(u / .18) : u < .85 ? -.12 + .2 * sm((u - .18) / .2) : .08 * (1 - sm((u - .85) / .15));
      wave = u < .2 ? 0 : u < .9 ? 1 : 1 - sm((u - .9) / .1); mo = 1 + 1.1 * Math.sin(Math.PI * band(u, .2, .95)); sq = 1 - .5 * Math.sin(Math.PI * band(u, .3, .55)); }
    body.rotation.x = lean; arms[1].rotation.z = wave * (2.2 + .45 * Math.sin((t - (boo?.e.at ?? 0)) * 2 * Math.PI * 2.4)); arms[0].rotation.z = -.15 * wave;
    mouth.scale.set(1 - .3 * (mo - 1) / 1.1, mo * (1 + .35 * Math.sin(t * 13)), 1); mouth.rotation.z = .08 * Math.sin(t * 7); eyes.forEach(e => e.scale.set(1, sq, 1)); blush.forEach(b => { b.material.emissiveIntensity = .3 + .5 * (boo ? Math.sin(Math.PI * boo.k) : 0); });
  }, trail: true};
}

// =============================== 2. T-REX — blocky bright green, big toothy grin, tiny arms ===============================
function trex() {
  const root = new T.Group(), G = plastic('#47d23b'), B = plastic('#bff27c'), D = plastic('#2a9a2a'), W = plastic('#ffffff'), K = ink(), P = plastic('#ff7393');
  const hips = pivot(root, [0, 7.4, 0], 'hips'), body = pivot(hips, [0, 0, 0], 'body');
  body.add(mesh(box(5.2, 5, 8.4), G, [0, 1.6, .4], [-.16, 0, 0])); body.add(mesh(box(3.8, 3.4, 6.6), B, [0, .9, 1.4], [-.16, 0, 0]));
  for (let i = 0; i < 6; i++) body.add(mesh(box(.9, .9, .9), D, [0, 4.3 - i * .25, 3.2 - i * 1.4], [Math.PI / 4, 0, 0]));
  const neck = pivot(body, [0, 3.6, 3.8], 'neck'); neck.add(mesh(box(3.4, 3.6, 3), G, [0, .8, .6], [-.35, 0, 0]));
  const head = pivot(neck, [0, 2.4, 1.4], 'head'); head.add(mesh(box(4.6, 3.0, 6), G, [0, .9, 2.4])); head.add(mesh(box(4.0, .8, 5.2), G, [0, 2.6, 2.0]));
  for (const s of [-1, 1]) { const e = pivot(head, [s * 1.6, 2.75, 3.6]); e.add(mesh(box(1.3, 1.5, 1.3), W)); const pu = mesh(box(.62, .8, .3), K, [s * .1, -.1, .55]); pu.name = 'pupil'; e.add(pu); e.add(mesh(box(.22, .22, .1), W, [s * .1 + .12, .12, .72]));
    head.add(mesh(box(1.5, .4, .6), D, [s * 1.6, 3.65, 3.9], [0, 0, s * -.22])); head.add(mesh(box(.5, .4, .4), K, [s * 1.1, 1.5, 5.4])); }
  for (let i = 0; i < 9; i++) { const x = -1.9 + i * .475; head.add(mesh(new T.ConeGeometry(.24, .62, 4), W, [x, -.72, 5.05], [Math.PI, Math.PI / 4, 0])); }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) head.add(mesh(new T.ConeGeometry(.22, .55, 4), W, [s * 2.05, -.7, 4.1 - i * .85], [Math.PI, Math.PI / 4, 0]));
  const jaw = pivot(head, [0, -.6, -.1], 'jaw'); jaw.add(mesh(box(4.2, 1.2, 5.4), G, [0, -.6, 2.6])); jaw.add(mesh(box(3.4, .4, 4.4), P, [0, .05, 2.4])); jaw.add(mesh(box(3.6, .9, 4.8), B, [0, -1.05, 2.5]));
  for (let i = 0; i < 8; i++) jaw.add(mesh(new T.ConeGeometry(.22, .55, 4), W, [-1.7 + i * .485, .25, 5.05], [0, Math.PI / 4, 0]));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) jaw.add(mesh(new T.ConeGeometry(.2, .5, 4), W, [s * 1.85, .25, 3.9 - i * .9], [0, Math.PI / 4, 0]));
  const arms = [-1, 1].map(s => { const a = pivot(body, [s * 2.7, 1.2, 3.4], 'arm'); a.add(mesh(box(.7, .7, 1.5), G, [0, -.2, .6], [.5, 0, 0])); a.add(mesh(box(.6, .5, .8), G, [0, -.7, 1.2], [1.2, 0, 0]));
    for (const d of [-.18, .18]) a.add(mesh(new T.ConeGeometry(.1, .3, 4), W, [d, -1.05, 1.55], [Math.PI, 0, 0])); return a; });
  const legs = [-1, 1].map(s => { const th = pivot(hips, [s * 2.4, .3, -.4], 'thigh'); th.add(mesh(box(2.1, 4.2, 3.4), G, [0, -1.6, 0])); const kn = pivot(th, [0, -3.6, .6], 'knee');
    kn.add(mesh(box(1.5, 3.8, 1.7), G, [0, -1.6, -.4], [.25, 0, 0])); const ft = pivot(kn, [0, -3.5, -.6], 'foot'); ft.add(mesh(box(2.2, .9, 3.4), G, [0, -.45, .9]));
    for (const d of [-.7, 0, .7]) ft.add(mesh(new T.ConeGeometry(.22, .55, 4), W, [d, -.6, 2.75], [Math.PI / 2, Math.PI / 4, 0])); return {th, kn, ft}; });
  const tail = []; let par = body; for (let i = 0; i < 4; i++) { const tp = pivot(par, i ? [0, 0, -2.6] : [0, 1.8, -3.8], 'tail'); const w = 3.6 - i * .75; tp.add(mesh(box(w, w * .82, 2.9), G, [0, -.15 * i, -1.3]));
    tp.add(mesh(box(.7, .7, .7), D, [0, w * .41 + .1, -1.3], [Math.PI / 4, 0, 0])); tail.push(tp); par = tp; }
  const dust = HAS_DOM ? Array.from({length: 14}, () => { const s = sprite('soft', '#e9dcc0', {opacity: 0}); s.visible = false; root.add(s); return s; }) : [];
  return {root, apply(t, c) {
    root.scale.setScalar(c.scale ?? 1); const roar = actAt(c.acts, t, 'roar', 'trex'), st = actAt(c.acts, t, 'stomp', 'trex');
    const br = Math.sin(t * 2 * Math.PI / 2.6); body.scale.set(1 + .015 * br, 1 + .02 * br, 1); hips.position.y = 7.4; tail.forEach((p, i) => { p.rotation.y = .12 * Math.sin(t * 2.1 - i * .6); p.rotation.x = .05 * i; });
    let hx = .05, jx = .12, bx = 0, sh = 0; arms.forEach((a, i) => { a.rotation.x = .2 * Math.sin(t * 5 + i * 2); });
    if (roar) { const u = roar.u; hx = u < .25 ? .05 + .3 * sm(u / .25) : u < 1.1 ? lerp(.35, -.65, outCubic((u - .25) / .25)) : lerp(-.65, .05, sm((u - 1.1) / .4));
      jx = u < .25 ? .05 : u < 1.1 ? lerp(.05, .78, outCubic((u - .25) / .2)) : lerp(.78, .12, sm((u - 1.1) / .3)); bx = u < 1.1 ? -.1 * sm((u - .2) / .3) : -.1 * (1 - sm((u - 1.1) / .4));
      sh = u > .45 && u < 1.1 ? .045 * Math.sin(u * 2 * Math.PI * 11) : 0; arms.forEach((a, i) => { a.rotation.x = -.6 * Math.sin(Math.PI * clamp01(u / 1.3)) + .25 * Math.sin(u * 30 + i); }); }
    head.rotation.set(hx, sh * 2, sh); jaw.rotation.x = jx; body.rotation.x = bx;
    let lift = 0, dip = 0, dk = -1; if (st) { const u = st.u; lift = u < .32 ? sm(u / .32) : u < .4 ? 1 - outCubic((u - .32) / .08) : 0; dip = u >= .38 && u < .75 ? Math.sin(Math.PI * (u - .38) / .37) : 0; dk = u >= .38 ? (u - .38) / .5 : -1; }
    const L = legs[1]; L.th.rotation.x = -.9 * lift; L.kn.rotation.x = 1.1 * lift; L.ft.rotation.x = -.3 * lift; legs[0].th.rotation.x = .08 * lift; hips.position.y = 7.4 - .45 * dip + .3 * lift; hips.rotation.z = -.05 * lift;
    dust.forEach((s, i) => { const on = dk >= 0 && dk < 1; s.visible = on; if (!on) return; const a = i / dust.length * Math.PI * 2, r = 1.4 + 5.5 * outCubic(dk);
      s.position.set(2.4 + Math.cos(a) * r, .6 + 1.4 * dk + .3 * Math.sin(i * 3.1), 1 + Math.sin(a) * r); s.scale.setScalar(1.6 + 2.4 * dk); s.material.opacity = .85 * (1 - dk); });
  }};
}

// =============================== 3. RAT → MOUSE (shrink) ===============================
function rat() {
  const root = new T.Group(), body = pivot(root, [0, 0, 0], 'ratBody'), grey = new T.MeshStandardMaterial({color: '#9aa1ab', roughness: .5}), pink = plastic('#ff9fb8'), W = plastic('#ffffff');
  body.add(mesh(sph(.55), grey, [0, .55, 0], [0, 0, 0], [1, .85, 1.45])); body.add(mesh(sph(.34), plastic('#c9ced6'), [0, .42, .2], [0, 0, 0], [1, .7, 1.4]));
  const head = pivot(body, [0, .78, .78], 'head'); head.add(mesh(sph(.4), grey, [0, 0, 0], [0, 0, 0], [1, .9, 1.25])); head.add(mesh(new T.ConeGeometry(.3, .55, 14), grey, [0, -.06, .5], [Math.PI / 2, 0, 0]));
  const nose = mesh(sph(.11, 12, 8), pink, [0, -.04, .8]); head.add(nose);
  const ears = [-1, 1].map(s => { const e = pivot(head, [s * .3, .33, -.05]); e.add(mesh(new T.CylinderGeometry(.24, .24, .06, 16), grey, [0, 0, 0], [Math.PI / 2, 0, 0])); e.add(mesh(new T.CylinderGeometry(.17, .17, .07, 16), pink, [0, 0, .01], [Math.PI / 2, 0, 0])); e.rotation.z = -s * .35; return e; });
  const eyes = [-1, 1].map(s => { const e = pivot(head, [s * .17, .12, .33]); e.add(mesh(sph(.075, 10, 8), ink())); e.add(mesh(sph(.025, 6, 4), W, [.025, .03, .06])); return e; });
  head.add(mesh(box(.12, .14, .04), W, [-.06, -.2, .7])); head.add(mesh(box(.12, .14, .04), W, [.06, -.2, .7]));
  for (const s of [-1, 1]) for (const a of [-.15, .12]) head.add(mesh(box(.5, .015, .015), ink(), [s * .3, -.05, .66], [0, s * .25, a * s]));
  for (const [x, z] of [[-.3, .45], [.3, .45], [-.3, -.4], [.3, -.4]]) body.add(mesh(sph(.12, 8, 6), pink, [x, .08, z], [0, 0, 0], [1, .6, 1.4]));
  const tail = pivot(body, [0, .45, -.75], 'tail'), curve = new T.CatmullRomCurve3([[0, 0, 0], [0, .1, -.5], [.2, .35, -1.0], [.05, .6, -1.35]].map(p => new T.Vector3(...p)));
  tail.add(mesh(new T.TubeGeometry(curve, 16, .05, 6), pink));
  return {root, apply(t, c) {
    const s = actAt(c.acts, t, 'shrink', 'rat'), k = s ? sm(band(s.u, .12, .55)) : 0, pop = s ? (s.u < .12 ? 1 + .25 * sm(s.u / .12) : s.u < .55 ? 1 : 1 + .18 * Math.sin(Math.PI * band(s.u, .55, .7))) : 1;
    root.scale.setScalar((c.scale ?? 1) * lerp(1, .36, k) * pop); body.scale.set(1, s && s.u < .12 ? 1 - .2 * sm(s.u / .12) : 1, 1);
    head.scale.setScalar(1 + .38 * k); eyes.forEach(e => e.scale.setScalar(1 + 1.1 * k)); ears.forEach(e => e.scale.setScalar(1 + .7 * k)); nose.scale.setScalar(1 + .3 * k);
    grey.color.set('#9aa1ab').lerp(new T.Color('#e3dcea'), k);
    nose.position.y = -.04 + .02 * Math.sin(t * 22); head.rotation.y = .18 * Math.sin(t * 1.3); tail.rotation.y = .35 * Math.sin(t * 3.1); tail.rotation.x = .1 * Math.sin(t * 2.3);
  }};
}

// =============================== 4. SPIDER — huge fuzzy purple-black, big cute eyes, waves all eight legs ===============================
function spider() {
  const root = new T.Group(), hips = pivot(root, [0, 4.2, 0], 'spiderBody'), fur = plastic('#2b1a3d', {roughness: .9}), furHi = plastic('#5c3a86', {roughness: .85}), W = plastic('#ffffff');
  const fuzzy = (r, n, seed) => { const g = new T.IcosahedronGeometry(r, 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new T.Vector3().fromBufferAttribute(p, i), k = 1 + .07 * Math.sin(v.x * 7 + seed) * Math.sin(v.y * 6) * Math.sin(v.z * 8 + seed); p.setXYZ(i, v.x * k, v.y * k, v.z * k); } g.computeVertexNormals(); return g; };
  hips.add(mesh(fuzzy(3.0, 3, 1), fur, [0, .6, -3.2], [0, 0, 0], [1, .9, 1.15])); const head = pivot(hips, [0, .2, .6], 'head'); head.add(mesh(fuzzy(2.3, 3, 2), fur, [0, 0, 0]));
  const tufts = []; for (let i = 0; i < 120; i++) { const u = (i * .618) % 1, v = ((i * .382) % 1), th = u * Math.PI * 2, ph = Math.acos(1 - 2 * v), back = i % 3 !== 0;
    const n = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)), base = back ? n.clone().multiply(new T.Vector3(3, 2.7, 3.45)).add(new T.Vector3(0, .6, -3.2)) : n.clone().multiplyScalar(2.3);
    if (!back && n.z > .55) continue; const g = new T.ConeGeometry(.26, .55, 5); g.translate(0, .22, 0); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), n)); g.translate(base.x, base.y, base.z); (back ? tufts : (tufts.h ??= [])).push(g); }
  hips.add(new T.Mesh(merge(tufts), furHi)); head.add(new T.Mesh(merge(tufts.h), furHi));
  const eyes = [-1, 1].map(s => { const e = cuteEye(.62, {white: true}); e.position.set(s * .85, .55, 2.1); e.rotation.set(-.2, s * .3, 0); head.add(e); return e; });
  for (const [x, y] of [[-.5, 1.55], [.5, 1.55], [-1.3, 1.25], [1.3, 1.25]]) head.add(mesh(sph(.24, 10, 8), plastic('#120a1a', {roughness: .15}), [x, y, 1.75]));
  const smile = mesh(new T.TorusGeometry(.42, .09, 8, 16, Math.PI), plastic('#ff86b0'), [0, -.55, 2.15], [0, 0, Math.PI]); head.add(smile);
  for (const s of [-1, 1]) head.add(mesh(new T.ConeGeometry(.13, .4, 6), W, [s * .28, -1.0, 2.0], [Math.PI, 0, 0]));
  const legM = plastic('#24152f', {roughness: .9}), legs = [];
  for (let i = 0; i < 8; i++) { const s = i < 4 ? 1 : -1, j = i % 4, al = [.75, .28, -.2, -.68][j], hip = pivot(hips, [s * 1.4, 0, 1 - j * .9], 'leg' + i);
    hip.rotation.y = s > 0 ? -al : Math.PI + al; const fem = pivot(hip, [0, 0, 0]); const L1 = 5.4, L2 = 9.2;   // fan front → back; +x of the hip = outward
    const g1 = new T.CylinderGeometry(.42, .5, L1, 7); g1.rotateZ(-Math.PI / 2); g1.translate(L1 / 2, 0, 0); fem.add(mesh(g1, legM)); fem.add(mesh(sph(.48, 8, 6), furHi, [L1, 0, 0]));
    const kn = pivot(fem, [L1, 0, 0]); const g2 = new T.CylinderGeometry(.36, .2, L2, 7); g2.rotateZ(-Math.PI / 2); g2.translate(L2 / 2, 0, 0); kn.add(mesh(g2, legM)); kn.add(mesh(sph(.22, 8, 6), furHi, [L2, 0, 0]));
    for (let q = 0; q < 3; q++) { const tg = new T.ConeGeometry(.18, .5, 4); tg.translate(0, .25, 0); fem.add(mesh(tg, furHi, [1.2 + q * 1.3, .28, 0], [0, 0, -.3])); kn.add(mesh(new T.TorusGeometry(.27 - q * .04, .07, 5, 10), furHi, [2.2 + q * 2.2, 0, 0], [0, Math.PI / 2, 0])); }
    legs.push({hip, fem, kn, s, j}); }
  // rest pose: femur up 38°, tibia down to the ground (solve the knee bend for hip height 4.2)
  const restFem = .72, kneeY = 5.4 * Math.sin(restFem), restKn = -(restFem + Math.asin(Math.min(1, (4.2 + kneeY) / 9.2)));
  return {root, apply(t, c) {
    root.scale.setScalar(c.scale ?? 1); const w = actAt(c.acts, t, 'wave', 'spider'), br = Math.sin(t * 2 * Math.PI / 2.4);
    hips.position.y = 4.2 + .12 * br; head.rotation.x = .04 * br; let bounce = 0;
    legs.forEach((L, i) => { let up = 0, wig = 0; if (w) { const ph = (L.j * .07 + (L.s > 0 ? 0 : .035)), u = band(w.k, ph, ph + .2), d = 1 - band(w.k, .82, 1); up = sm(u) * d; wig = Math.sin((w.u - ph * w.dur) * 2 * Math.PI * 2.2 + i) * up; bounce = .4 * Math.sin(Math.PI * w.k); }
      L.fem.rotation.z = restFem + up * (.32 + .06 * L.j) + .12 * wig; L.kn.rotation.z = restKn - restKn * .85 * up + .45 * wig + .03 * Math.sin(t * 2 + i); });   // tips swing up and out, waving
    hips.position.y += bounce; eyes.forEach(e => { const bl = ((t + .3) % 3.1) < .12; e.scale.set(1, bl ? .12 : 1, 1); }); smile.scale.set(1, 1 + (w ? .5 * Math.sin(Math.PI * w.k) : 0), 1);
  }};
}

// =============================== 5. VACUUM — roaring upright with a face, cord whipping ===============================
function vacuum() {
  const root = new T.Group(), rig = pivot(root, [0, 0, 0], 'vacuumRig'), base = pivot(rig, [0, 0, 0], 'base'), Pu = plastic('#7d4dff', {roughness: .3}), Rd = plastic('#e8323a', {roughness: .35}), K = ink(), W = plastic('#ffffff'), Cr = plastic('#d9dee6', {roughness: .25, metalness: .4});
  base.add(mesh(box(6, 1.9, 4), Pu, [0, 1.25, 0])); base.add(mesh(box(6.2, .4, 4.2), Cr, [0, .35, 0]));
  for (const s of [-1, 1]) { base.add(mesh(new T.CylinderGeometry(.75, .75, .5, 14), K, [s * 3.1, .75, -1.1], [0, 0, Math.PI / 2]));
    const eye = pivot(base, [s * 1.6, 1.75, 2.02], 'headlight'); eye.add(mesh(new T.CircleGeometry(.62, 20), new T.MeshBasicMaterial({color: '#fff9d6', toneMapped: false}))); eye.add(mesh(new T.CircleGeometry(.28, 14), K, [0, -.05, .01]));
    eye.add(mesh(new T.TorusGeometry(.66, .1, 6, 20), Cr)); base.add(mesh(box(1.5, .3, .3), K, [s * 1.55, 2.62, 2.05], [0, 0, s * .35])); }
  const mouth = pivot(base, [0, .55, 2.05], 'mouth'); mouth.add(mesh(box(4.6, .7, .2), plastic('#1c0f14'))); for (let i = 0; i < 10; i++) { mouth.add(mesh(box(.28, .3, .12), W, [-2.05 + i * .455, .2, .08])); }
  const lip = pivot(mouth, [0, -.35, .05]); for (let i = 0; i < 9; i++) lip.add(mesh(box(.28, .28, .12), W, [-1.8 + i * .45, .14, .05]));
  const col = pivot(base, [0, 2.0, -1.0], 'column'); col.rotation.x = -.26; col.add(mesh(box(2.4, 5.2, 1.6), Pu, [0, 2.6, 0])); col.add(mesh(sph(1.25, 16, 12), Rd, [0, 3.2, -1.2], [0, 0, 0], [1, 1.7, .75]));
  col.add(mesh(new T.CylinderGeometry(.22, .22, 3.4, 8), Cr, [0, 6.9, 0])); col.add(mesh(box(1.8, .45, .45), K, [0, 8.7, 0])); col.add(mesh(box(.3, 1.0, .4), K, [-.75, 8.4, 0])); col.add(mesh(box(.3, 1.0, .4), K, [.75, 8.4, 0]));
  const cord = []; let par = pivot(col, [0, .6, -.9], 'cord'); const cm = plastic('#2a2a30');
  for (let i = 0; i < 12; i++) { const p = pivot(par, i ? [0, 0, -.75] : [0, 0, 0]); const g = new T.CylinderGeometry(.1, .1, .78, 5); g.rotateX(Math.PI / 2); g.translate(0, 0, -.38); p.add(mesh(g, cm)); cord.push(p); par = p; }
  const plug = pivot(par, [0, 0, -.8]); plug.add(mesh(box(.5, .4, .55), plastic('#f2f2f2'))); plug.add(mesh(box(.06, .06, .35), Cr, [-.12, 0, -.4])); plug.add(mesh(box(.06, .06, .35), Cr, [.12, 0, -.4]));
  return {root, apply(t, c) {
    root.scale.setScalar(c.scale ?? 1); const m = vacuumMotion(c, t), roar = c.roar !== false; rig.position.set(0, 0, 0); rig.rotation.x = m.tilt;
    const j = roar ? 1 : 0; base.rotation.z = j * .025 * Math.sin(t * 2 * Math.PI * 17); base.position.y = j * .06 * Math.abs(Math.sin(t * 2 * Math.PI * 9));
    lip.position.y = -.35 - (roar ? .25 + .2 * Math.abs(Math.sin(t * 2 * Math.PI * 4.5)) : 0) - (m.tilt > .1 ? .35 : 0);
    cord.forEach((p, i) => { p.rotation.y = (.35 + .05 * i) * Math.sin(t * 9 - i * .7); p.rotation.x = .12 + .18 * Math.sin(t * 7.3 - i * .9); });
    root.userData.local = m;
  }};
}

// =============================== 6. SHADOW PUFF — small ink cloud, two big white eyes, follows, blinks ===============================
function shadowPuff(o = {}) {
  const root = new T.Group(), body = pivot(root, [0, 0, 0], 'puffBody'), cloud = mesh(inkCloud(o.seed ?? 3), plastic('#17121f', {roughness: .55, emissive: '#2a1d3d', emissiveIntensity: .25})); body.add(cloud);
  const wisps = HAS_DOM ? Array.from({length: 6}, () => { const s = sprite('wisp', '#ffffff', {opacity: .5, toneMapped: true}); body.add(s); return s; }) : [];
  const eyes = [-1, 1].map(s => { const e = pivot(body, [s * .27, .12, .74]); e.add(mesh(new T.CircleGeometry(.24, 20), new T.MeshBasicMaterial({color: '#ffffff', toneMapped: false}), [0, 0, 0], [0, 0, 0], [1, 1.35, 1]));
    e.add(mesh(new T.CircleGeometry(.1, 12), ink(), [s * -.04, -.06, .01])); e.add(mesh(new T.CircleGeometry(.035, 8), new T.MeshBasicMaterial({color: '#ffffff', toneMapped: false}), [s * -.01, -.02, .02])); e.rotation.y = s * .18; return e; });
  return {root, body, apply(t, c) {
    root.scale.setScalar(c.scale ?? 1); body.position.y = .18 * Math.sin(t * 2 * Math.PI / 1.6); body.rotation.z = .1 * Math.sin(t * 1.9); body.scale.set(1 + .04 * Math.sin(t * 5), 1 - .04 * Math.sin(t * 5), 1);
    const seed = c.seed ?? 3, per = 2.3 + (seed % 3) * .3, bl = c.blink ?? ((t + seed * .37) % per) < .13; eyes.forEach(e => e.scale.set(1, bl ? .1 : 1, 1));
    wisps.forEach((s, i) => { const a = t * .9 + i * 1.05; s.position.set(Math.cos(a) * .9, -.1 + .45 * Math.sin(a * 1.3), Math.sin(a) * .25 - .35); s.scale.setScalar(.38 + .1 * Math.sin(t * 3 + i)); });
  }};
}

// =============================== 7. GIANT DARK DOME — wobbling ink dome, giant glowing eyes; roll · shrink · inside ===============================
function dome(o = {}) {
  const root = new T.Group(), R = o.radius ?? SIZE.dome, shell = pivot(root, [0, 0, 0], 'domeShell');
  const geo = new T.SphereGeometry(1, 56, 22, 0, Math.PI * 2, 0, Math.PI / 2 + .06), base = geo.attributes.position.array.slice();
  const skin = mesh(geo, new T.MeshStandardMaterial({color: '#0d0b13', roughness: .28, metalness: 0, emissive: '#1a1030', emissiveIntensity: .35})); skin.name = 'domeSkin'; skin.position.y = -.04; shell.add(skin);
  const eyeMat = new T.MeshBasicMaterial({color: '#f4fbff', toneMapped: false}), haloMat = new T.MeshBasicMaterial({color: '#cfe9ff', transparent: true, opacity: .28, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false});
  const eyes = [-1, 1].map(s => { const el = .62, az = s * .3, n = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const e = new T.Group(); onSurface(e, n.clone().multiplyScalar(1.06), n);
    e.add(mesh(new T.CircleGeometry(.11, 28), eyeMat, [0, 0, .004], [0, 0, 0], [1, 1.45, 1])); const h = new T.Mesh(new T.CircleGeometry(.2, 28), haloMat); h.scale.set(1, 1.3, 1); e.add(h); shell.add(e); return e; });
  const wisps = HAS_DOM ? Array.from({length: 10}, (_, i) => { const s = sprite('wisp', '#ffffff', {opacity: .85, toneMapped: true}); s.userData.a = i / 10 * Math.PI * 2; root.add(s); return s; }) : [];
  const puff = shadowPuff({seed: 5}); puff.root.visible = false; root.add(puff.root);
  return {root, radius: R, apply(t, c, rt) {
    const s = actAt(c.acts, t, 'shrink', 'dome'), r = s ? shrinkRadius(s.u, R) : R, m = rt?.motion ?? {lean: 0, squash: 1}, small = r < 2.2;
    const stretch = s && s.u > .12 && s.u < .62 ? 1 + .35 * Math.sin(Math.PI * band(s.u, .12, .62)) : s && ((s.u > .62 && s.u < .8) || (s.u > .86 && s.u < 1.04)) ? 1 - .25 * Math.sin(Math.PI * band(s.u, s.u < .8 ? .62 : .86, s.u < .8 ? .8 : 1.04)) : 1;
    shell.visible = !small || (s && s.u < .9); shell.scale.set(r / stretch ** .5, r * stretch * m.squash, r / stretch ** .5); shell.rotation.x = m.lean;
    const a = geo.attributes.position, amp = s ? .05 * (1 - band(s.u, .1, .5)) + .03 : .045 + .03 * Math.abs(m.lean) * 6, ph = t * 2.6;
    for (let i = 0; i < a.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], th = Math.atan2(x, z), k = 1 + amp * Math.sin(th * 5 + ph) * Math.sin(y * 6 - ph * 1.3) + .03 * Math.sin(th * 11 - ph * 2) * (1 - y);
      a.array[i * 3] = x * k; a.array[i * 3 + 1] = y * (1 + .5 * amp * Math.sin(th * 3 + ph)); a.array[i * 3 + 2] = z * k; }
    a.needsUpdate = true; geo.computeVertexNormals();
    const wide = s ? 1 + .5 * Math.sin(Math.PI * band(s.u, 0, .14)) : 1; eyes.forEach(e => e.scale.set(wide, wide * (((t + .7) % 4.3) < .14 ? .12 : 1), 1));
    wisps.forEach((w, i) => { const aa = w.userData.a + .15 * Math.sin(t * .8 + i), rr = r * (1.0 + .05 * Math.sin(t * 2 + i * 1.7)); w.visible = shell.visible; w.position.set(Math.sin(aa) * rr, r * (.03 + .05 * Math.abs(Math.sin(t * 1.6 + i))), Math.cos(aa) * rr); w.scale.setScalar(r * (.15 + .04 * Math.sin(t * 3 + i * 2.3))); });   // Phase 1G bench: 10 small wisps (sprite overdraw)
    puff.root.visible = !!s && r < 2.4; { const k = r / SIZE.palm, bu = s ? s.u - 1.25 : -1; puff.root.position.y = r * .3;   // applied every frame (pure in t), shown below r 2.4; the cute double blink right after landing
      puff.apply(t, {seed: 5, scale: .42 * k, blink: bu > 0 && bu < .5 ? (bu < .09 || (bu > .2 && bu < .28)) : false}); }
  }, wobble: true};
}

// =============================== 8. STONE PILLAR — rises 40 studs under a character, fast, with dust ===============================
function pillar() {
  const root = new T.Group(), H = SIZE.pillar, col = pivot(root, [0, 0, 0], 'pillarCol'), g = new T.CylinderGeometry(3.6, 4.2, H, 9, 12), p = g.attributes.position, cs = new Float32Array(p.count * 3), cc = new T.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), n = 1 + .09 * Math.sin(a * 3 + y * .7) + .05 * Math.sin(y * 1.9 + a * 5);
    p.setXYZ(i, x * n, y, z * n); const band = .5 + .5 * Math.sin(y * .9 + a * 2); cc.setHSL(.07, .08 + .05 * band, .36 + .16 * band); if (y > H / 2 - 1 && Math.sin(a * 4) > .3) cc.set('#6fae4b'); cs.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new T.BufferAttribute(cs, 3)); g.computeVertexNormals(); g.translate(0, -H / 2, 0);
  const rock = mesh(g, new T.MeshStandardMaterial({vertexColors: true, roughness: .9, flatShading: true})); rock.name = 'pillarRock'; col.add(rock);
  col.add(mesh(new T.CylinderGeometry(4.2, 3.9, .8, 9), plastic('#7d7468', {roughness: .9, flatShading: true}), [0, -.4, 0])); col.add(mesh(new T.CylinderGeometry(3.9, 3.9, .1, 9), plastic('#6fae4b', {roughness: .9, flatShading: true}), [0, .02, 0]));
  const dust = HAS_DOM ? Array.from({length: 22}, () => { const s = sprite('soft', '#e8dcc4', {opacity: 0}); root.add(s); return s; }) : [];
  const chunks = Array.from({length: 8}, (_, i) => { const m = mesh(new T.DodecahedronGeometry(.45 + .15 * (i % 3), 0), plastic('#8d877d', {flatShading: true, roughness: .9})); root.add(m); return m; });
  return {root, height: u => pillarHeight(u), apply(t, c) {
    root.scale.setScalar(c.scale ?? 1); const r = actAt(c.acts, t, 'rise', 'pillar'), u = r ? r.u : -1, h = pillarHeight(u); col.position.y = h; col.visible = h > .02;
    const shake = r && u < .7 ? .08 * Math.sin(u * 90) * (1 - u / .7) : 0; col.position.x = shake;
    const dk = r ? u / 1.6 : -1; dust.forEach((s, i) => { const on = dk >= 0 && dk < 1; s.visible = on; if (!on) return; const a = i / dust.length * Math.PI * 2 + i, rr = 4.2 + 8 * outCubic(dk) * (.7 + .3 * ((i * 7) % 3));
      s.position.set(Math.cos(a) * rr, .5 + 2.6 * outCubic(dk) * ((i % 4) / 4 + .3), Math.sin(a) * rr); s.scale.setScalar(2.2 + 4 * dk); s.material.opacity = .9 * (1 - dk) * (dk < .05 ? dk / .05 : 1); });
    chunks.forEach((m, i) => { const ck = r ? u / .9 : -1, on = ck >= 0 && ck < 1; m.visible = on; if (!on) return; const a = i / 8 * Math.PI * 2 + .4, v = 6 + (i % 3) * 2;
      m.position.set(Math.cos(a) * (4.2 + v * .6 * ck), Math.max(.3, v * ck * 1.4 - 9 * ck * ck * 1.4), Math.sin(a) * (4.2 + v * .6 * ck)); m.rotation.set(ck * 7 + i, ck * 5, 0); });
  }};
}

const BUILD = {ghost, trex, rat, spider, vacuum, shadowPuff, dome, pillar};
export function buildCreature(kind, o = {}) { if (!BUILD[kind]) throw Error('unknown creature ' + kind); const c = BUILD[kind](o); c.root.name = 'creature_' + (o.id ?? kind); c.root.userData.creature = kind; return c; }

// =============================== runtime (episode.js opt-in spec.creatures) ===============================
const keysAt = (v, t, d) => { if (v == null) return d; if (!Array.isArray(v) || !Array.isArray(v[0])) return v; let i = 0; while (i + 1 < v.length && v[i + 1][0] <= t) i++; const a = v[i], b = v[i + 1];
  if (!b || t <= a[0]) return a[1]; const k = sm((t - a[0]) / (b[0] - a[0])); return Array.isArray(a[1]) ? a[1].map((x, j) => lerp(x, b[1][j], k)) : lerp(a[1], b[1], k); };
// ctx: {actorPos(name) → [x, y, z] or null, keep(object) → true for scene roots kept inside the dome (cast), dark: the inside view's exposure factor (0 = off)}
export function createCreatures(scene, list, ctx = {}) {
  const grp = new T.Group(); grp.name = 'creatures'; scene.add(grp);
  const items = list.map(c => { const b = buildCreature(c.kind, c); grp.add(b.root); for (const s of b.sparks ?? []) { grp.add(s); s.visible = false; } return {c, b}; });
  const byId = Object.fromEntries(items.map(x => [x.c.id, x]));
  const worldSnap = scene.children.filter(o => o !== grp && !o.isLight && !(ctx.keep?.(o)) && !/^prop_|^clockFx$/.test(o.name));
  let insideOn = false; const inside = new T.Mesh(new T.SphereGeometry(1, 32, 16), new T.MeshBasicMaterial({color: '#050409', side: T.BackSide, fog: false, toneMapped: false})); inside.visible = false; inside.name = 'domeInside'; grp.add(inside);
  const floor = new T.Mesh(new T.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({color: '#2a2a33', roughness: .95})); floor.visible = false; floor.receiveShadow = true; floor.name = 'domeInsideFloor'; grp.add(floor);
  const basePos = (c, t) => keysAt(c.pos, t, [0, 0, 0]);
  // fearbell add-on (opt-in inside {rim: [actor…]}): a soft cool rim light behind each named actor (away from the camera), kept on inside the dome
  const rims = {}; for (const c of list) for (const a of c.acts ?? []) if (a.act === 'inside') for (const n of a.rim ?? []) if (!rims[n]) {
    const L = new T.PointLight(RIM_IN.color, RIM_IN.intensity, RIM_IN.distance, RIM_IN.decay); L.castShadow = false; L.visible = false; L.userData.keep = true; L.name = 'domeRim_' + n; grp.add(L); rims[n] = L; }
  const api = {
    items: byId, dark: 0,
    rideHeight(t) { const out = {}; for (const {c, b} of items) if (c.kind === 'pillar' && c.ride) { const r = actAt(c.acts, t, 'rise', 'pillar'); out[c.ride] = (r ? pillarHeight(r.u) : 0) * (c.scale ?? 1); } return out; },
    update(t) {
      let insideK = null;
      for (const {c, b} of items) {
        const vis = Array.isArray(c.visible) ? (() => { let v = true; for (const [t0, x] of c.visible) if (t >= t0) v = x; return v; })() : true; b.root.visible = vis;
        let p = basePos(c, t), yaw = keysAt(c.yaw, t, 0) * Math.PI / 180, extra = {};
        if (c.kind === 'shadowPuff' && c.follow) { const q = byId[c.follow] ? byId[c.follow].b.root.position.toArray() : ctx.actorPos?.(c.follow); if (q) { const o = c.offset ?? [.9, .6, .5]; p = [q[0] + o[0] + .12 * Math.sin(t * 1.3), q[1] + o[1], q[2] + o[2]]; } }
        if (c.kind === 'dome') { const cc = c.acts?.some(a => a.act === 'shrink' && a.toActor) ? {...c, acts: c.acts.map(a => { if (a.act !== 'shrink' || !a.toActor) return a; const h = ctx.handPos?.(a.toActor, a.hand ?? 'right'); return h ? {...a, to: h} : a; })} : c;   // fearbell add-on (opt-in shrink {toActor, hand}): the palm puff lands on that actor's palm, read from the posed hand every frame (seek-safe: a per-frame copy, the spec act is never mutated)
          extra.motion = domeMotion(cc, t, p); p = extra.motion.pos; const r = actAt(c.acts, t, 'roll', 'dome'); if (r && r.e.from && r.e.to) yaw = Math.atan2(r.e.to[0] - r.e.from[0], r.e.to[2] - r.e.from[2]) + (c.faceYaw ?? 0) * Math.PI / 180;
          const ins = actAt(c.acts, t, 'inside', 'dome'); if (ins && ins.k < 1) insideK = {pos: p, R: (b.radius ?? SIZE.dome) * (c.scale ?? 1), rim: ins.e.rim ?? []}; }
        b.root.position.set(...p); b.root.rotation.set(0, yaw, 0);
        if (c.kind === 'vacuum') { b.apply(t, c); const m = b.root.userData.local; b.root.position.x += Math.cos(yaw) * m.x + Math.sin(yaw) * m.z; b.root.position.z += -Math.sin(yaw) * m.x + Math.cos(yaw) * m.z; b.root.rotation.y = yaw + m.yaw; }
        else b.apply(t, c, extra);
        if (b.sparks) { const back = b.sparks.length; b.sparks.forEach((s, j) => { const age = (j + 1) * .075, q = c.kind === 'ghost' ? basePos(c, t - age) : p, sd = j * 2.39, hem = 3.6 * (c.scale ?? 1);
          s.visible = b.root.visible; s.position.set(q[0] + Math.cos(sd + t * .7) * hem * (.6 + .4 * ((j * 7) % 5) / 5), q[1] + .6 + age * 4 + ((j * 3) % 4) * .5, q[2] + Math.sin(sd + t * .7) * hem * .8);
          const tw = .5 + .5 * Math.sin(t * 9 + j * 1.7); s.scale.setScalar((.55 - .4 * j / back) * (.6 + .6 * tw)); s.material.opacity = (1 - j / back) * (.5 + .5 * tw); }); }
      }
      // inside the dome: everything but the cast, props and creatures goes dark; only `keep` lights (flashlights) stay on
      const on = !!insideK; if (on !== insideOn) { insideOn = on; for (const o of worldSnap) { if (on) { o.userData.vis1g = o.visible; o.visible = false; } else o.visible = o.userData.vis1g ?? true; }
        // exposure drops to INSIDE.exposure (the whole frame goes near-black, whatever lit it); `keep` lights (flashlights) are boosted by 1 / that, so
        // their pools read at full strength; additive cones and glows are not tone-mapped, so they stay as they are
        const all = []; scene.traverse(o => { if (o.isLight) all.push(o); });
        for (const L of all) { if (!L.userData.keep) continue; if (on) { L.userData.i1g = L.intensity; L.intensity /= INSIDE.exposure; } else if (L.userData.i1g != null) L.intensity = L.userData.i1g; }
        api.dark = on ? INSIDE.exposure : 0;   // the renderer multiplies its exposure by this around the frame render (engine/episode.js)
        if (on) { api._bg = scene.background; scene.background = new T.Color('#000000'); } else if ('_bg' in api) { scene.background = api._bg; delete api._bg; }   // seek-safe: restore exactly (a null sky background stayed black after the first inside frame)
      }
      // seek-safe (fearbell ENGINE fix A1): inside the dome the wobbling shells are hidden EVERY frame, on top of their own `visible` keys. The old code
      // only touched them on the inside on/off transition and then set every dome visible, so the frame after a jump showed stale domes.
      if (on) for (const {b} of items) if (b.wobble) b.root.visible = false;
      api._rimOn = on ? insideK.rim : []; for (const [n, L] of Object.entries(rims)) L.visible = api._rimOn.includes(n);
      inside.visible = floor.visible = on; if (on) { inside.position.set(...insideK.pos); inside.scale.setScalar(insideK.R * .98); floor.position.set(insideK.pos[0], insideK.pos[1] + .03, insideK.pos[2]); floor.scale.setScalar(insideK.R * .97); }
    },
    aim(camPos) { for (const n of api._rimOn ?? []) { const L = rims[n], h = ctx.actorPos?.(n); if (!L || !h) continue; const d = [h[0] - camPos[0], h[2] - camPos[2]], l = Math.hypot(...d) || 1;   // behind the head, away from the lens
      const sd = (Object.keys(rims).indexOf(n) % 2 ? -1 : 1) * RIM_IN.side;   // alternate sides so two actors get opposite rims
      L.position.set(h[0] + d[0] / l * RIM_IN.back - d[1] / l * sd, h[1] + RIM_IN.up, h[2] + d[1] / l * RIM_IN.back + d[0] / l * sd); } },
    liveAt(id, t) { const x = byId[id]; if (!x) return null; api.update(t); const bx = new T.Box3().setFromObject(x.b.root); return {centre: bx.getCenter(new T.Vector3()).toArray(), size: bx.getSize(new T.Vector3()).toArray()}; },
  };
  return api;
}
