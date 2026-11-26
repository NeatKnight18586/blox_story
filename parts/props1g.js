// parts/props1g.js — FEAR BELL props (Phase 1G; reusable). Spec props entry {id, set: 'props1g', prop: <name>, p: {…options}, pos, rot, visible,
// animAt} (engine/episode.js: g.userData.anim(t − animAt, p) when animAt is set). Plastic Roblox-style, no text or brands.
//   burger      cheeseburger; animAt = the SHRINK → slider (pop + squash, 0.45 s)          plate       white plate, blue rim stripe
//   flashlight  torch + visible light CONE (additive, fades along its length) + SpotLight (userData.keep: stays on inside the dome); {on, length, angle}
//   mailBurst   envelope confetti burst at animAt (40 envelopes, gravity + flutter, 2.6 s)  spaghetti   plate + noodle mound + meatballs + sauce
//   plush       Lulu's lavender bunny plush                                                bellRope    the Hall bell rope; {length}, animAt = a yank (0.6 s)
//   donut       pink-frosted donut with sprinkles
// Tools (avatar-style/tools.js): flashlight ('extend': the cone continues the arm), donut ('hold'). Accessory plushHug (Lulu hugs it).
import * as T from 'three';

const cache = new Map(), C = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const mat = (col, o = {}) => C('m' + col + JSON.stringify(o), () => new T.MeshStandardMaterial({color: col, roughness: .42, metalness: 0, ...o}));
const mesh = (g, m, at = [0, 0, 0], rot = [0, 0, 0], sc = null) => { const x = new T.Mesh(g, m); x.position.set(...at); x.rotation.set(...rot); if (sc) x.scale.set(...sc); x.castShadow = true; return x; };
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const outBack = (x, s = 2) => { x = clamp01(x) - 1; return 1 + x * x * ((s + 1) * x + s); };
const lathe = (pts, seg = 28) => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), seg);
const HAS_DOM = typeof document !== 'undefined';

// pure: burger → slider shrink at u (s since animAt): {s: uniform scale, sy: squash}; 1 before, .45 after 0.45 s
export function burgerShrink(u) { if (u == null || u < 0) return {s: 1, sy: 1}; if (u < .08) return {s: 1 + .12 * sm(u / .08), sy: 1 - .15 * sm(u / .08)};
  if (u < .3) return {s: 1.12 - .67 * outBack((u - .08) / .22, 1.4), sy: 1 + .25 * Math.sin(Math.PI * (u - .08) / .22)}; return {s: .45, sy: 1 + .12 * Math.sin((u - .3) * 30) * Math.max(0, 1 - (u - .3) / .2)}; }
export function burger() {
  const g = new T.Group(), body = new T.Group(); body.name = 'burgerBody'; g.add(body); const bun = mat('#e7a24a', {roughness: .5});
  body.add(mesh(new T.CylinderGeometry(.62, .58, .22, 24), bun, [0, .11, 0])); body.add(mesh(new T.CylinderGeometry(.66, .66, .2, 24), mat('#6b3b22', {roughness: .7}), [0, .32, 0]));
  const ch = mesh(new T.BoxGeometry(1.18, .05, 1.18), mat('#ffc928'), [0, .45, 0], [0, .4, 0]); body.add(ch);
  for (const a of [0, 1.6, 3.2, 4.7]) body.add(mesh(new T.ConeGeometry(.09, .22, 4), mat('#ffc928'), [Math.cos(a + .4) * .66, .36, Math.sin(a + .4) * .66], [Math.PI, 0, 0]));
  const let_ = new T.CylinderGeometry(.72, .72, .06, 20), p = let_.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); if (Math.hypot(x, z) > .5) p.setY(i, p.getY(i) + .05 * Math.sin(a * 9)); } let_.computeVertexNormals();
  body.add(mesh(let_, mat('#5ccf3c'), [0, .52, 0])); body.add(mesh(new T.CylinderGeometry(.55, .55, .07, 20), mat('#e8402f'), [0, .58, 0]));
  body.add(mesh(new T.SphereGeometry(.66, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), bun, [0, .6, 0], [0, 0, 0], [1, .72, 1]));
  for (let i = 0; i < 12; i++) { const a = i * 2.4, r = .18 + .3 * ((i * 7) % 5) / 5, y = .6 + .47 * Math.sqrt(1 - (r / .66) ** 2) * .98; body.add(mesh(new T.SphereGeometry(.035, 6, 4), mat('#fff6dc'), [Math.cos(a) * r, y, Math.sin(a) * r], [0, a, 0], [1.6, .7, 1])); }
  g.userData.anim = (u) => { const k = burgerShrink(u); body.scale.set(k.s / Math.sqrt(k.sy), k.s * k.sy, k.s / Math.sqrt(k.sy)); };
  return g;
}
export function plate(o = {}) {
  const g = new T.Group(), R = o.r ?? 1.0; g.add(mesh(lathe([[0, 0], [R * .62, 0], [R * .7, .04], [R, .12], [R * .98, .14], [R * .68, .07], [0, .07]], 36), mat('#fbfbf7', {roughness: .25})));
  g.add(mesh(new T.TorusGeometry(R * .86, .025, 6, 36), mat('#3d7fd6'), [0, .11, 0], [Math.PI / 2, 0, 0])); return g;
}
export function spaghetti(o = {}) {
  const g = plate({r: o.r ?? 1.1}), nm = mat('#f2cf72', {roughness: .55}), tubes = [];
  for (let i = 0; i < 10; i++) { const pts = []; for (let k = 0; k < 9; k++) { const a = k * 1.3 + i * .9, r = .55 * (1 - k / 11) + .05 * Math.sin(k + i); pts.push(new T.Vector3(Math.cos(a) * r, .12 + .05 * k + .03 * Math.sin(i + k), Math.sin(a) * r)); }
    tubes.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 26, .035, 4)); }
  for (const t of tubes) g.add(mesh(t, nm)); g.add(mesh(new T.SphereGeometry(.32, 16, 10), mat('#d8392b', {roughness: .35}), [0, .5, 0], [0, 0, 0], [1.1, .45, 1.1]));
  for (const [x, z] of [[.18, .12], [-.2, .05], [0, -.2]]) g.add(mesh(new T.IcosahedronGeometry(.14, 1), mat('#7a3f22', {roughness: .7}), [x, .56, z]));
  return g;
}
export function plush() {   // lavender bunny, button eyes, pink nose, a stitched heart patch
  const g = new T.Group(), f = mat('#c9b3f2', {roughness: .85}), pk = mat('#ffb3cf', {roughness: .8}), K = mat('#1b1622', {roughness: .3});
  g.add(mesh(new T.SphereGeometry(.42, 16, 12), f, [0, .42, 0], [0, 0, 0], [1, 1.1, .9])); g.add(mesh(new T.SphereGeometry(.36, 16, 12), f, [0, 1.0, 0]));
  for (const s of [-1, 1]) { g.add(mesh(new T.CapsuleGeometry(.09, .5, 4, 8), f, [s * .15, 1.48, -.02], [0, 0, -s * .15])); g.add(mesh(new T.CapsuleGeometry(.05, .4, 4, 8), pk, [s * .15, 1.48, .05], [0, 0, -s * .15]));
    g.add(mesh(new T.CylinderGeometry(.07, .07, .03, 12), K, [s * .13, 1.05, .33], [Math.PI / 2, 0, 0])); g.add(mesh(new T.SphereGeometry(.13, 10, 8), f, [s * .3, .2, .22]));
    g.add(mesh(new T.CapsuleGeometry(.1, .22, 4, 8), f, [s * .4, .55, .12], [0, 0, s * .6])); }
  g.add(mesh(new T.SphereGeometry(.045, 8, 6), pk, [0, .97, .35])); g.add(mesh(new T.CircleGeometry(.12, 16), pk, [0, .45, .385]));
  return g;
}
export function donut() {
  const g = new T.Group(); g.add(mesh(new T.TorusGeometry(.32, .15, 12, 24), mat('#d99a55', {roughness: .6}), [0, 0, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new T.TorusGeometry(.32, .13, 10, 24, Math.PI * 2), mat('#ff86c0', {roughness: .3}), [0, .05, 0], [Math.PI / 2, 0, 0], [1, 1, .85]));
  const cols = ['#ffffff', '#ffd23f', '#4fc3f7', '#7ed957', '#ff5252']; for (let i = 0; i < 16; i++) { const a = i * 2.39, r = .22 + .2 * ((i * 5) % 4) / 4; g.add(mesh(new T.BoxGeometry(.09, .02, .025), mat(cols[i % 5]), [Math.cos(a) * r, .17, Math.sin(a) * r], [0, a, 0])); }
  g.userData.grip = 'hold'; return g;
}
// flashlight: axis along +z (lens at +z); the cone extends from the lens. As a TOOL ('extend') it is re-aimed along −Y (the arm).
export function flashlight(o = {}) {
  const g = new T.Group(), L = o.length ?? 14, ang = (o.angle ?? 17) * Math.PI / 180, R = Math.tan(ang) * L;
  g.add(mesh(new T.CylinderGeometry(.13, .13, .75, 14), mat('#ffcc1a', {roughness: .35}), [0, 0, -.15], [Math.PI / 2, 0, 0])); g.add(mesh(new T.CylinderGeometry(.22, .14, .3, 16), mat('#26272d'), [0, 0, .35], [Math.PI / 2, 0, 0]));
  g.add(mesh(new T.CircleGeometry(.19, 18), new T.MeshBasicMaterial({color: '#fff7d0', toneMapped: false}), [0, 0, .505])); g.add(mesh(new T.BoxGeometry(.08, .06, .2), mat('#e8402f'), [0, .14, -.1]));
  const cg = new T.ConeGeometry(R, L, 32, 8, true), p = cg.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = clamp01((L / 2 - p.getY(i)) / L), a = (1 - k) ** 1.6 * .9 + .1 * (1 - k); col.set([a * 1, a * .95, a * .78], i * 3); }   // bright at the lens → black (= nothing, additive) at the far end
  cg.setAttribute('color', new T.BufferAttribute(col, 3)); cg.rotateX(-Math.PI / 2); cg.translate(0, 0, .5 + L / 2);
  const cone = new T.Mesh(cg, new T.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: .32, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false})); cone.name = 'flashCone'; cone.renderOrder = 9; g.add(cone);
  const spot = new T.SpotLight('#fff4d6', o.intensity ?? 260, L * 2.6, ang * 1.15, .45, 1.4); spot.position.set(0, 0, .5); spot.target.position.set(0, 0, 4); spot.userData.keep = true; spot.castShadow = false; spot.name = 'flashSpot'; g.add(spot, spot.target);
  const on = o.on ?? true; cone.visible = spot.visible = on; g.userData.setOn = v => { cone.visible = spot.visible = !!v; };
  return g;
}
export function flashlightTool(o = {}) { const w = new T.Group(), f = flashlight(o); f.rotation.x = Math.PI / 2 + (o.tilt ?? .3); f.position.y = -.1; w.add(f); w.userData.grip = 'extend'; w.userData.setOn = f.userData.setOn; return w; }   // +z → −Y (along the arm), tilted `tilt` rad toward the floor ahead
// envelope confetti: one InstancedMesh (40), pure in u: launch up/out, gravity, flutter spin; hidden before 0 and after 2.6 s
export function mailBurstAt(i, u, n = 40) {
  if (u < 0 || u > 2.6) return null; const a = i * 2.399, el = .55 + .35 * ((i * 13) % 7) / 7, v = 9 + 4 * ((i * 17) % 5) / 5, drag = 1 - Math.exp(-u * 1.6);
  const h = v * Math.sin(el) * drag / 1.6 - 4.2 * u * u * .5, r = v * Math.cos(el) * drag / 1.6;
  return {p: [Math.cos(a) * r + .3 * Math.sin(u * 5 + i), Math.max(-.2, h + .6), Math.sin(a) * r], rot: [u * (3 + i % 5), u * (2 + i % 3) + i, Math.sin(u * 6 + i) * .8], s: u < .08 ? u / .08 : u > 2.2 ? (2.6 - u) / .4 : 1};
}
const envTex = () => C('envTex', () => { if (!HAS_DOM) return null; const c = document.createElement('canvas'); c.width = 64; c.height = 44; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 44);
  g.strokeStyle = '#9aa3b5'; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 2); g.lineTo(32, 26); g.lineTo(62, 2); g.stroke(); g.fillStyle = '#e8402f'; g.fillRect(48, 28, 11, 11); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; });
export function mailBurst(o = {}) {
  const g = new T.Group(), n = o.n ?? 40, im = new T.InstancedMesh(new T.BoxGeometry(.62, .03, .42), new T.MeshStandardMaterial({color: '#ffffff', map: envTex(), roughness: .5}), n);
  const tint = ['#ffffff', '#fff3d6', '#dff0ff', '#ffe3ee']; for (let i = 0; i < n; i++) im.setColorAt(i, new T.Color(tint[i % 4])); im.castShadow = true; im.frustumCulled = false; g.add(im);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  g.userData.anim = u => { for (let i = 0; i < n; i++) { const k = mailBurstAt(i, u, n); if (!k) { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); continue; } q.setFromEuler(e.set(...k.rot)); m4.compose(new T.Vector3(...k.p), q, new T.Vector3(k.s, k.s, k.s)); im.setMatrixAt(i, m4); } im.instanceMatrix.needsUpdate = true; };
  g.userData.anim(-1); return g;
}
export function bellRope(o = {}) {   // hangs DOWN from its origin (the belfry hook); a braided rope + a red-and-gold grip at the end
  const g = new T.Group(), L = o.length ?? 12, rope = new T.Group(); rope.name = 'bellRope'; g.add(rope);
  const geo = new T.CylinderGeometry(.11, .11, L, 8, 40), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)), r = .11 + .025 * Math.sin(a * 3 + y * 9); p.setX(i, Math.cos(a) * r); p.setZ(i, Math.sin(a) * r); }
  geo.computeVertexNormals(); geo.translate(0, -L / 2, 0); rope.add(mesh(geo, mat('#c79a5a', {roughness: .8})));
  rope.add(mesh(new T.CylinderGeometry(.2, .2, 1.1, 12), mat('#c61f2b'), [0, -L + .2, 0])); rope.add(mesh(new T.SphereGeometry(.26, 12, 8), mat('#f2bf3a', {roughness: .3, metalness: .5}), [0, -L - .45, 0]));
  for (const y of [-L + .8, -L - .35]) rope.add(mesh(new T.TorusGeometry(.21, .05, 6, 16), mat('#f2bf3a', {roughness: .3, metalness: .5}), [0, y, 0], [Math.PI / 2, 0, 0]));
  g.userData.anim = u => { const k = u < 0 ? 0 : u < .15 ? sm(u / .15) : 1 - sm((u - .15) / .45); rope.position.y = -1.1 * k; rope.rotation.z = .04 * Math.sin(u * 9) * (1 - clamp01(u / .8)); };
  return g;
}
export const PROPS1G = {burger, plate, flashlight, mailBurst, spaghetti, plush, bellRope, donut};
export const tris = o => { let n = 0; o.traverse(m => { if (m.isMesh) { const g = m.geometry, k = (g.index ? g.index.count : g.attributes.position.count) / 3; n += k * (m.isInstancedMesh ? m.count : 1); } }); return n; };
