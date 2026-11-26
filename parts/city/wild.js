// parts/city/wild.js — Phase 1E: the WILD EDGE (north hills). Data: plan.json "wild" (world studs, +z south) + terrain.ravine.
//   wild({M, groundY}) → {group, decks, clear(x, z), trees: [{x, z, y, s, kind}], movers: [{name, obj, update(t)}], stats}
// Owner decisions (do not change): STONE GIANT'S HEAD (slot 7, the hill knoll): a huge weathered stone head half-buried, eyes CLOSED
// (sleeping), moss on the brow and cheeks, a tree growing on top, a small WATERFALL pouring from its ear into a pool; bright mixed
// forest with sunny clearings + wildflowers; a dirt trail with wooden signposts (arrows, no text); CAVE MOUTH (rocky arch, a mine-cart
// track + one cart); CLIFF LOOKOUT (wooden viewing deck on the north sea cliff, a bench + a coin telescope); CAMPSITE (two tents, a fire
// ring with live flames + smoke, log seats); ROPE BRIDGE (plank deck on a catenary over the ravine; actors stand on it via `decks`).
// Static parts are merged per material and baked by the world; the waterfall, flames, smoke and birds are live movers.
import * as T from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {PLAN} from './plan.js';
import {bins, pbox} from './kit/building.js';
import {kitMat, liveMat} from './kit/mats.js';
import {smoke, birds} from '../ambient.js';
import {rng} from '../build.js';

const WD = PLAN.wild, D2R = Math.PI / 180;
const fract = v => v - Math.floor(v), h3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
const sm3 = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
const s3 = (x, y, z) => { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = sm3(x - X), v = sm3(y - Y), w = sm3(z - Z), H = (i, j, k) => h3(X + i, Y + j, Z + k);   // smooth value noise 0..1
  return lerp(lerp(lerp(H(0, 0, 0), H(1, 0, 0), u), lerp(H(0, 1, 0), H(1, 1, 0), u), v), lerp(lerp(H(0, 0, 1), H(1, 0, 1), u), lerp(H(0, 1, 1), H(1, 1, 1), u), v), w); };
const named = (g, n) => { g.traverse(o => { if (o.isMesh) o.name = n + ':' + (o.name || 'part'); }); return g; };
const tris = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); return Math.round(n); };
const weld = g => { g = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); return mergeVertices(g, 1e-4); };
const lumpy = (g, amp, seed, f = 1.3, smooth = false) => { g = weld(g); const p = g.attributes.position;   // welded: one offset per position (no cracks)
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), s = 1 + amp * (h3(Math.round(x * f * 7), Math.round(y * f * 7), Math.round(z * f * 7) + seed) - .5); p.setXYZ(i, x * s, y * s, z * s); }
  if (smooth) { g.computeVertexNormals(); return g; } const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
// a rock: lumpy squashed dodecahedron (12–36 tris)
const rock = (r, x, y, z, seed = 1, sq = .7, det = 0) => lumpy(new T.DodecahedronGeometry(r, det), .35, seed).scale(1, sq, 1).rotateY(seed).translate(x, y, z);

// ---------------- the stone giant's head (slot 7) ----------------
export function stoneHead() {
  const H = WD.head, R = H.r, g = new T.Group(), B = bins(), A = B.add;
  const L = (c, r = .92) => liveMat('std', c, {roughness: r, metalness: 0, envMapIntensity: .45});   // live (lit in real time): a smooth weathered head shades softly; never baked
  const stone = L('#b9b3a6'), stone2 = L('#a39d91'), crack = L('#7d776d'), moss = L('#5fb246', .95), moss2 = L('#83cc58', .95);
  // ONE sculpted skull: an egg (taller than wide) with the face displaced into it (brow, closed lids, nose, cheeks, lips, chin) and moss +
  // weathering painted as vertex colours (live material, lit in real time: soft shading, no seams). zs(x, y) = front surface z (units of R).
  const SX = .86, SY = 1.08, SZ = .92, zs = (x, y) => SZ * Math.sqrt(Math.max(0, 1 - (x / SX) ** 2 - (y / SY) ** 2));
  const g2 = (x, y, cx, cy, rx, ry) => Math.exp(-(((x - cx) / rx) ** 2) - (((y - cy) / ry) ** 2));
  const face = (x, y) => .11 * g2(x, y, 0, .37, .5, .075) + .045 * (g2(x, y, -.31, .17, .13, .075) + g2(x, y, .31, .17, .13, .075)) - .05 * (g2(x, y, -.31, .27, .15, .05) + g2(x, y, .31, .27, .15, .05))
    + .24 * g2(x, y, 0, .0, .09, .2) + .1 * g2(x, y, 0, -.18, .1, .075) + .06 * (g2(x, y, -.44, -.13, .15, .13) + g2(x, y, .44, -.13, .15, .13))
    + .07 * g2(x, y, 0, -.37, .21, .05) + .05 * g2(x, y, 0, -.5, .18, .055) + .1 * g2(x, y, 0, -.72, .22, .12) - .04 * g2(x, y, 0, -.6, .14, .04);
  const cav = (x, y) => { const e = .05, f0 = face(x, y); return f0 - (face(x + e, y) + face(x - e, y) + face(x, y + e) + face(x, y - e)) / 4; };   // > 0 ridge (lighter), < 0 hollow (darker)
  const MOSS = [[0, .46, .9, .2], [-.52, -.08, .85, .13], [.54, -.12, .84, .12], [0, 1, .05, .42], [-.45, .78, -.45, .26], [.42, .7, .55, .16], [.75, .3, -.5, .14]].map(([x, y, z, r]) => [new T.Vector3(x, y, z).normalize(), Math.cos(r * 1.7)]);
  const skullGeo = det => { const skull = weld(new T.IcosahedronGeometry(1, det)), P = skull.attributes.position, col = new Float32Array(P.count * 3), v = new T.Vector3(), cS = new T.Color('#b8b0a0'), cD = new T.Color('#7d766a'), cM = new T.Color('#5daf45'), cM2 = new T.Color('#86cf5a'), c = new T.Color();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const n = .65 * s3(v.x * 3 + 7, v.y * 3, v.z * 3) + .35 * s3(v.x * 7, v.y * 7 + 3, v.z * 7), front = Math.max(0, Math.min(1, (v.z - .2) / .35));
    let k = 1 + .05 * (n - .5); const fz = front * face(v.x / 1, v.y / 1); k += fz;
    let moss = 0; for (const [d, th] of MOSS) moss = Math.max(moss, Math.min(1, (v.dot(d) - th + .12 * (n - .5)) / .06));
    k += .02 * Math.max(0, moss); P.setXYZ(i, v.x * k, v.y * k, v.z * k);
    const n2 = s3(v.x * 2.5, v.y * 2.5 + 9, v.z * 2.5); c.copy(cS).lerp(cD, Math.max(0, Math.min(1, .25 * n2 + .2 * (n - .5) - front * cav(v.x, v.y) * 14))); if (moss > 0) c.lerp(cM.clone().lerp(cM2, n), moss); col.set([c.r, c.g, c.b], i * 3); }
  skull.setAttribute('color', new T.BufferAttribute(col, 3)); skull.scale(R * SX, R * SY, R * SZ); skull.computeVertexNormals(); return skull; };
  const skullMat = liveMat('std', '#ffffff', {roughness: .93, metalness: 0, envMapIntensity: .45, vertexColors: true}); const sm = new T.Mesh(skullGeo(22), skullMat), sf = new T.Mesh(skullGeo(8), skullMat); sm.name = 'skull'; sf.name = 'skullFar'; sf.visible = false; sm.userData.live = sf.userData.live = true; g.add(sm, sf);   // Phase 1E: ~10k near, ~1.6k far
  const surf = (x, y) => zs(x, y) * (1 + face(x, y)) + .01;
  A(crack, new T.CapsuleGeometry(R * .02, R * .3, 3, 8).rotateZ(Math.PI / 2).translate(0, -R * .44, R * surf(0, -.44)));   // closed mouth line
  for (const sx of [-1, 1]) { A(stone, lumpy(new T.CylinderGeometry(R * .18, R * .24, R * .14, 12, 1), .08, 13 + sx, 1.3, true).scale(1, 1.7, 1).rotateZ(sx * Math.PI / 2).translate(sx * R * .84, R * .02, -R * .06));
    A(crack, new T.CylinderGeometry(R * .08, R * .1, R * .06, 10, 1).scale(1, 1.6, 1).rotateZ(sx * Math.PI / 2).translate(sx * R * .92, R * .02, -R * .03)); }    // ears + ear holes
  // CLOSED eyes (sleeping): a dark crescent (‿) along the lower edge of each lid + short lashes hanging from it
  for (const sx of [-1, 1]) { const ex = sx * .31, ey = .17;
    const arc = []; for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12 - .5) * 2.3, x = ex + Math.sin(a + Math.PI / 2) * 0 + Math.cos(a) * 0 + (k / 12 - .5) * .26, y = ey - .055 * Math.cos((k / 12 - .5) * Math.PI) ; arc.push(new T.Vector3(R * x, R * y, R * surf(x, y))); }
    A(crack, new T.TubeGeometry(new T.CatmullRomCurve3(arc), 14, R * .022, 5, false));
    for (let k = -2; k <= 2; k++) { const u = k / 5, lx = ex + u * .22, ly = ey - .055 * Math.cos(u * Math.PI) - .035; A(crack, pbox(R * .018, R * .055, R * .016, 0, -R * .0275, 0).rotateZ(-u * 1.1).translate(R * lx, R * (ly + .02), R * surf(lx, ly))); } }
  // a few boulders around the buried base
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + .3, rr = R * (.95 + .12 * h3(i, 1, 2)); A(i % 3 ? stone2 : stone, rock(R * (.14 + .08 * h3(i, 2, 3)), Math.sin(a) * rr, -R * .62 + H.sink * .2, Math.cos(a) * rr, i + 1)); }
  const m = B.build('stoneHead'); g.add(m); return {group: g, R, near: sm, far: sf};
}

// ---------------- waterfall (live): a scrolling ribbon from the ear down the head's side into the pool ----------------
function waterfall(top, bottom, w) {
  const c = document?.createElement?.('canvas'); let map = null;
  if (c) { c.width = 32; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, 32, 128); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${.4 + .6 * h3(i, 3, 5)})`; g.fillRect(Math.floor(h3(i, 1, 5) * 30), Math.floor(h3(i, 2, 5) * 128), 2 + Math.floor(h3(i, 4, 5) * 3), 14 + Math.floor(h3(i, 6, 5) * 30)); }
    map = new T.CanvasTexture(c); map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; }
  const pts = [], n = 10; for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new T.Vector3(top.x + (bottom.x - top.x) * u, top.y + (bottom.y - top.y) * (u * u * .6 + u * .4), top.z + (bottom.z - top.z) * Math.min(1, u * 1.4))); }
  const P = [], U = [], I = [], side = new T.Vector3(bottom.z - top.z, 0, -(bottom.x - top.x)).normalize();
  pts.forEach((p, i) => { const ww = w * (1 + i / n * .5); for (const s of [-1, 1]) { P.push(p.x + side.x * ww / 2 * s, p.y, p.z + side.z * ww / 2 * s); U.push(s < 0 ? 0 : 1, i / n * 3); } if (i) { const a = (i - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const mat = new T.MeshBasicMaterial({color: '#ffffff', map, transparent: true, opacity: .92, side: T.DoubleSide, depthWrite: false}), m = new T.Mesh(geo, mat); m.name = 'waterfall';
  const foam = new T.Group(), fm = new T.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .85, depthWrite: false});
  for (let i = 0; i < 7; i++) { const b = new T.Mesh(new T.IcosahedronGeometry(.5 + .4 * h3(i, 7, 1), 1), fm); b.position.set(bottom.x + (h3(i, 1, 9) - .5) * 2.4, bottom.y + .2, bottom.z + (h3(i, 2, 9) - .5) * 2.4); foam.add(b); }
  const g = new T.Group(); g.add(m, foam); g.traverse(o => { o.userData.live = true; });
  return {object: g, update(t) { if (map) map.offset.y = t * 1.6; foam.children.forEach((b, i) => { const k = 1 + .25 * Math.sin(t * 5 + i * 1.7); b.scale.setScalar(k); }); }};
}

// ---------------- signposts, cart track, bridge, lookout, campsite ----------------
const arrow = (A, mat, y, yaw, len = 2.2) => { const s = new T.Shape([new T.Vector2(0, -.32), new T.Vector2(len - .5, -.32), new T.Vector2(len - .5, -.5), new T.Vector2(len, 0), new T.Vector2(len - .5, .5), new T.Vector2(len - .5, .32), new T.Vector2(0, .32)]);
  const g = new T.ExtrudeGeometry(s, {depth: .12, bevelEnabled: false}); g.translate(.1, 0, -.06); g.rotateY(yaw); g.translate(0, y, 0); A(mat, g.toNonIndexed()); };
export function signpost(A, at, yaw, cols = ['#e8b04a', '#d98a3a']) { const post = kitMat('wood', '#7a5a3c'), [x, y, z] = at, B = bins(), a = B.add;
  a(post, pbox(.32, 3.4, .32, 0, -.3, 0)); a(post, new T.ConeGeometry(.3, .4, 4).rotateY(Math.PI / 4).translate(0, 3.3, 0));
  arrow(a, kitMat('wood', cols[0]), 2.6, yaw); arrow(a, kitMat('wood', cols[1]), 1.85, yaw + 2.4, 1.9);
  const g = B.build('sign'); g.position.set(x, y, z); g.updateMatrixWorld(true); for (const m of g.children) A(m.material, m.geometry.clone().applyMatrix4(m.matrixWorld)); }

export function wild({groundY}) {
  const group = new T.Group(); group.name = 'wildEdge'; let B = bins(), A = B.add; const stats = {}, sections = [['wildHead', B]], sect = n => { B = bins(); A = B.add; sections.push([n, B]); }, decks = [], trees = [], movers = [], R = rng(57);
  const dirt = kitMat('plastic', '#c79a62'), wood = kitMat('wood', '#a8774a'), dk = kitMat('wood', '#7a5a3c'), rope = kitMat('plastic', '#d9c38c'), iron = kitMat('metal', '#4a4f57'), rockM = kitMat('plastic', '#9a958a'), rockD = kitMat('plastic', '#7d786f');
  // -- stone head (slot 7) + pool + waterfall from the ear
  const S7 = PLAN.landmarks['7'], [hx, hz] = [(S7.at[0] - PLAN.origin[0]) * PLAN.scale, (S7.at[1] - PLAN.origin[1]) * PLAN.scale], H = WD.head, hy = groundY(hx, hz) - H.sink, yaw = H.yaw * D2R;
  const head = stoneHead(); head.group.position.set(hx, hy + H.r * 1.08 - H.sink * .2, hz); head.group.rotation.y = yaw; named(head.group, 'slot:7'); group.add(head.group); stats.head = tris(head.group);
  head.group.updateMatrixWorld(true);
  const crown = new T.Vector3(0, H.r * 1.08, -H.r * .1).applyMatrix4(head.group.matrixWorld); trees.push({x: crown.x, z: crown.z, y: crown.y - .6, s: 1.15, r: 1.1, kind: 'leafy', onHead: true});
  const earL = new T.Vector3(H.ear * H.r * .96, H.r * .02, -H.r * .02).applyMatrix4(head.group.matrixWorld);
  const [px, pz] = [hx + Math.cos(yaw) * H.pool.off[0] + Math.sin(yaw) * H.pool.off[1], hz - Math.sin(yaw) * H.pool.off[0] + Math.cos(yaw) * H.pool.off[1]], py = groundY(px, pz) + .25;
  const pool = new T.Mesh(new T.CircleGeometry(H.pool.r, 28).rotateX(-Math.PI / 2).translate(px, py, pz), new T.MeshStandardMaterial({color: '#2aa6d8', roughness: .08, metalness: .1, envMapIntensity: 1.2}));
  pool.name = 'wildPool'; pool.userData.live = true; group.add(pool);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; A(i % 2 ? rockM : rockD, rock(.9 + .5 * h3(i, 5, 5), px + Math.sin(a) * (H.pool.r + .4), py - .1, pz + Math.cos(a) * (H.pool.r + .4), i + 30)); }
  const wf = waterfall(earL, new T.Vector3(px + (earL.x - px) * .18, py + .1, pz + (earL.z - pz) * .18), 1.4); movers.push({name: 'waterfall', obj: wf.object, update: wf.update});
  sect('wildTrail');
  // -- dirt trail (ribbon on the terrain) + signposts
  const TRL = WD.trail; let trailTris = 0; const P = [], I = [];
  for (const path of TRL.paths) { const c = new T.CatmullRomCurve3(path.map(([x, z]) => new T.Vector3(x, 0, z)), false, 'catmullrom', .3), L = c.getLength(), n = Math.max(2, Math.ceil(L / 1.6)), base = P.length / 3;
    for (let i = 0; i <= n; i++) { const p = c.getPointAt(i / n), d = c.getTangentAt(i / n), nx = -d.z, nz = d.x, ww = TRL.w * (.85 + .3 * h3(i, path.length, 3));
      for (const s of [-1, 1]) { const x = p.x + nx * ww / 2 * s, z = p.z + nz * ww / 2 * s; P.push(x, groundY(x, z) + .14, z); } if (i) { const a = base + (i - 1) * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } }
  { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); const m = new T.Mesh(g, dirt); m.name = 'wildTrail'; group.add(m); trailTris = I.length / 3; }
  for (const [x, z, a] of WD.signs) signpost(A, [x, groundY(x, z), z], a * D2R);
  sect('wildBridge');
  // -- rope bridge over the ravine: two post pairs, a plank deck on a catenary, hand ropes + suspenders; deck strips are `decks`
  { const Bd = WD.bridge, [x0, z0] = Bd.from, [x1, z1] = Bd.to, y0 = groundY(x0, z0) + .35, y1 = groundY(x1, z1) + .35, L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = -uz, nz = ux, by = Math.atan2(ux, uz);
    const yAt = u => y0 + (y1 - y0) * u - Bd.sag * 4 * u * (1 - u), n = Math.round(L / .62);
    for (let k = 0; k < n; k++) { const u = (k + .5) / n, x = x0 + ux * L * u, z = z0 + uz * L * u, y = yAt(u), tilt = Math.atan2(yAt(Math.min(1, u + .02)) - yAt(Math.max(0, u - .02)), L * .04);
      A(k % 3 ? wood : kitMat('wood', '#c08a55'), pbox(Bd.w, .14, .5, 0, -.14, 0).rotateX(-tilt).rotateY(by).translate(x, y, z)); }
    for (let k = 0; k < 8; k++) { const u = (k + .5) / 8, x = x0 + ux * L * u, z = z0 + uz * L * u; decks.push({x, z, len: L / 8, w: Bd.w - .2, yaw: by, y: yAt(u)}); }
    for (const [x, z, y] of [[x0, z0, y0], [x1, z1, y1]]) for (const s of [-1, 1]) { const px2 = x + nx * (Bd.w / 2 + .25) * s, pz2 = z + nz * (Bd.w / 2 + .25) * s; A(dk, pbox(.4, Bd.post + 2, .4, px2, y - 2, pz2)); A(dk, new T.ConeGeometry(.3, .4, 4).rotateY(Math.PI / 4).translate(px2, y + Bd.post + .2, pz2)); }
    for (const s of [-1, 1]) { for (const [hy2, sag] of [[Bd.post - .3, Bd.sag * .55], [-.05, Bd.sag]]) { const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new T.Vector3(x0 + ux * L * u + nx * (Bd.w / 2 + .25) * s, y0 + (y1 - y0) * u + hy2 - sag * 4 * u * (1 - u) + (hy2 > 0 ? 0 : 0), z0 + uz * L * u + nz * (Bd.w / 2 + .25) * s)); }
        A(rope, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .07, 4, false)); }
      for (let k = 1; k < 10; k++) { const u = k / 10, x = x0 + ux * L * u + nx * (Bd.w / 2 + .25) * s, z = z0 + uz * L * u + nz * (Bd.w / 2 + .25) * s, ylo = yAt(u), yhi = y0 + (y1 - y0) * u + Bd.post - .3 - Bd.sag * .55 * 4 * u * (1 - u); A(rope, pbox(.06, yhi - ylo, .06, x, ylo, z)); } }
    stats.bridge = {len: +L.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1)}; }
  sect('wildCamp');
  // -- campsite: two A-frame tents, a stone fire ring with live flames + smoke, log seats
  { const C = WD.camp;
    for (const [x, z, a, c] of C.tents) { const y = groundY(x, z), s = new T.Shape([new T.Vector2(-1.9, 0), new T.Vector2(1.9, 0), new T.Vector2(0, 2.6)]), gg = new T.ExtrudeGeometry(s, {depth: 3.8, bevelEnabled: false}).translate(0, 0, -1.9).toNonIndexed();
      A(kitMat('plastic', c), gg.rotateY(a * D2R).translate(x, y - .05, z)); A(kitMat('plastic', '#3a2f28'), new T.PlaneGeometry(1.4, 1.8).translate(0, .9, 1.93).rotateY(a * D2R).translate(x, y, z));
      for (const s2 of [-1, 1]) A(dk, pbox(.12, 2.9, .12, 0, 0, s2 * 1.95).rotateY(a * D2R).translate(x, y, z)); }
    const [fx, fz] = C.fire, fy = groundY(fx, fz);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; A(i % 2 ? rockM : rockD, rock(.34, fx + Math.sin(a) * 1.25, fy + .1, fz + Math.cos(a) * 1.25, 40 + i, .75)); }
    for (let i = 0; i < 4; i++) A(dk, new T.CylinderGeometry(.13, .13, 1.6, 6).rotateZ(Math.PI / 2).rotateY(i * Math.PI / 4).translate(fx, fy + .22 + (i % 2) * .12, fz));
    for (const [x, z, a] of C.logs) { const y = groundY(x, z); A(kitMat('wood', '#8a6038'), new T.CylinderGeometry(.42, .42, 3, 9).rotateZ(Math.PI / 2).rotateY(a * D2R).translate(x, y + .38, z)); A(kitMat('plastic', '#e8c48a'), new T.CircleGeometry(.36, 9).rotateY(Math.PI / 2).translate(1.51, 0, 0).rotateY(a * D2R).translate(x, y + .38, z)); }
    const fire = new T.Group(), fm = [new T.MeshBasicMaterial({color: '#ff7a1a', toneMapped: false}), new T.MeshBasicMaterial({color: '#ffd23f', toneMapped: false})];
    const fl = [0, 1, 2, 3].map(i => { const m = new T.Mesh(new T.ConeGeometry(.35 - i * .05, 1.1 - i * .12, 5), fm[i % 2]); m.position.set(fx + (i % 2 - .5) * .3, fy + .75, fz + (i > 1 ? .2 : -.2)); fire.add(m); return m; });
    const sm = smoke({at: [fx, fy + 1.5, fz], n: 8, rise: 7, period: 4, seed: 3, color: '#e4e6ea'}); fire.add(sm.object); fire.traverse(o => { o.userData.live = true; });
    movers.push({name: 'campSmoke', obj: fire, update(t) { sm.update(t); fl.forEach((m, i) => { m.scale.y = 1 + .25 * Math.sin(t * 9 + i * 2); m.rotation.y = t * 2 + i; }); }}); }
  sect('wildLookout');
  // -- cliff lookout: deck on posts over the north slope, railing (3 sides), a bench, a coin telescope
  { const Lk = WD.lookout, [lx, lz] = Lk.at, a = Lk.yaw * D2R, F = [Math.sin(a), Math.cos(a)], Rt = [Math.cos(a), -Math.sin(a)], bx = lx - F[0] * Lk.d / 2, bz = lz - F[1] * Lk.d / 2, ly = groundY(bx, bz) + .45;
    const P2 = (u, v) => [lx + Rt[0] * u + F[0] * v, lz + Rt[1] * u + F[1] * v], n = Math.round(Lk.w / .55);
    for (let k = 0; k < n; k++) { const u = -Lk.w / 2 + (k + .5) * Lk.w / n, [x, z] = P2(u, 0); A(k % 4 ? kitMat('wood', '#c79a66') : kitMat('wood', '#b78a58'), pbox(.5, .16, Lk.d, 0, -.16, 0).rotateY(a).translate(x, ly, z)); }
    for (const u of [-Lk.w / 2 + .2, 0, Lk.w / 2 - .2]) for (const v of [-Lk.d / 2 + .2, Lk.d / 2 - .2]) { const [x, z] = P2(u, v), gy = groundY(x, z); A(dk, pbox(.36, ly - gy + .4, .36, x, gy - .4, z)); }
    const rail = (u0, v0, u1, v1) => { const [x0, z0] = P2(u0, v0), [x1, z1] = P2(u1, v1), L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
      for (const y of [.55, 1.15]) A(wood, pbox(.12, .14, L, 0, 0, 0).rotateY(ry).translate((x0 + x1) / 2, ly + y, (z0 + z1) / 2)); for (let k = 0; k <= Math.round(L / 1.5); k++) { const t = k / Math.round(L / 1.5); A(dk, pbox(.16, 1.3, .16, x0 + (x1 - x0) * t, ly, z0 + (z1 - z0) * t)); } };
    rail(-Lk.w / 2, Lk.d / 2, Lk.w / 2, Lk.d / 2); rail(-Lk.w / 2, -Lk.d / 2 + .8, -Lk.w / 2, Lk.d / 2); rail(Lk.w / 2, -Lk.d / 2 + .8, Lk.w / 2, Lk.d / 2);
    { const [x, z] = P2(-2.2, -1.6); for (let k = 0; k < 3; k++) A(wood, pbox(2.8, .12, .3, 0, .85, -.35 + k * .34).rotateY(a).translate(x, ly, z)); for (const s of [-1.2, 1.2]) A(dk, pbox(.2, .85, .9, s, 0, 0).rotateY(a).translate(x, ly, z)); }
    { const [x, z] = P2(2.6, 1.9); A(iron, pbox(.22, 1.3, .22, x, ly, z)); A(kitMat('gloss', '#2f78d4'), new T.CylinderGeometry(.22, .3, 1.2, 10).rotateX(Math.PI / 2 - .25).rotateY(a).translate(x, ly + 1.55, z)); A(iron, pbox(.5, .35, .4, x, ly + 1.2, z)); }
    decks.push({x: lx, z: lz, len: Lk.d, w: Lk.w, yaw: a, y: ly}); stats.lookoutY = +ly.toFixed(1); }
  sect('wildCave');
  // -- cave mouth: a rocky arch of boulders on the cliff step around a dark recess, a mine-cart track out of it + one cart
  { const Cv = WD.cave, [cx, cz] = Cv.at, cy = groundY(cx, cz + 4), dkM = new T.MeshBasicMaterial({color: '#140f0c'});
    const hole = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 5, 16, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 1.25, 1).translate(cx, cy + .2, cz - 2), dkM); hole.material.side = T.DoubleSide; hole.name = 'caveMouth'; hole.userData.live = true; group.add(hole);
    const back = new T.Mesh(new T.PlaneGeometry(7, 5.4).translate(cx, cy + 2.4, cz - 4.4), dkM); back.userData.live = true; back.name = 'caveBack'; group.add(back);
    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI, r = 4.3 + .4 * h3(i, 3, 3); A(i % 3 ? rockM : rockD, rock(1.15 + .45 * h3(i, 1, 4), cx + Math.sin(a) * r, cy + .2 + Math.cos(a) * r * 1.18, cz - .8 + .6 * h3(i, 2, 4), 60 + i, .85, 1)); }
    for (let i = 0; i < 6; i++) A(rockD, rock(.8 + .6 * h3(i, 6, 6), cx + (i - 2.5) * 2.4, cy + 6.6 + h3(i, 7, 7), cz - 2.5, 80 + i, .7));
    const [tx0, tz0] = Cv.track.from, [tx1, tz1] = Cv.track.to, TL = Math.hypot(tx1 - tx0, tz1 - tz0), tux = (tx1 - tx0) / TL, tuz = (tz1 - tz0) / TL, ty = Math.atan2(tux, tuz);
    for (let s = 0; s < TL; s += .9) { const x = tx0 + tux * s, z = tz0 + tuz * s; A(dk, pbox(1.9, .14, .34, 0, 0, 0).rotateY(ty).translate(x, groundY(x, z) + .02, z)); }
    for (const sd of [-.55, .55]) for (let s = 0; s < TL; s += 2) { const s1 = Math.min(TL, s + 2), x = tx0 + tux * (s + s1) / 2 + Math.cos(ty) * sd, z = tz0 + tuz * (s + s1) / 2 - Math.sin(ty) * sd; A(iron, pbox(.1, .14, s1 - s, 0, 0, 0).rotateY(ty).translate(x, groundY(x, z) + .16, z)); }
    { const [kx, kz] = Cv.cart, ky = groundY(kx, kz) + .3, cart = bins(), a2 = cart.add; a2(kitMat('metal', '#8a5a3a'), pbox(1.5, 1.1, 2.3, 0, .35, 0)); a2(kitMat('metal', '#5a3a28'), pbox(1.66, .14, 2.46, 0, 1.4, 0));
      for (const [x, z] of [[-.62, -.7], [.62, -.7], [-.62, .7], [.62, .7]]) a2(iron, new T.CylinderGeometry(.3, .3, .16, 10).rotateZ(Math.PI / 2).translate(x, .3, z));
      for (let i = 0; i < 6; i++) a2(i % 2 ? kitMat('gloss', '#f1bd2c') : rockD, rock(.32, (i % 3 - 1) * .4, 1.55, (i > 2 ? .4 : -.4), 90 + i, .8));
      const cg = cart.build('cart'); cg.position.set(kx, ky, kz); cg.rotation.y = ty; cg.updateMatrixWorld(true); for (const m of cg.children) A(m.material, m.geometry.clone().applyMatrix4(m.matrixWorld)); } }
  // -- wildflowers in the clearings + along the trail (instanced, per-cell meshes; live, tiny)
  { const Fw = WD.flowers, Rf = rng(Fw.seed), pts = [];
    for (let i = 0; i < Fw.n; i++) { const c = WD.clearings[i % WD.clearings.length], a = Rf() * Math.PI * 2, r = Math.sqrt(Rf()) * c[2], x = c[0] + Math.sin(a) * r, z = c[1] + Math.cos(a) * r;
      if (onTrail(x, z, 1.2) || nearFeature(x, z, 1)) continue; pts.push([x, groundY(x, z), z, Fw.colors[Math.floor(Rf() * Fw.colors.length)], .6 + .5 * Rf()]); }
    const geo = new T.OctahedronGeometry(.2, 0).scale(1, .55, 1).translate(0, .12, 0), mat = new T.MeshStandardMaterial({color: '#ffffff', roughness: .6});
    const cells = new Map(); for (const p of pts) { const k = Math.floor(p[0] / 40) + ',' + Math.floor(p[2] / 40); (cells.get(k) ?? cells.set(k, []).get(k)).push(p); }
    const m4 = new T.Matrix4(), col = new T.Color(); let fl = 0;
    for (const list of cells.values()) { const im = new T.InstancedMesh(geo, mat, list.length); list.forEach((p, i) => { im.setMatrixAt(i, m4.makeScale(p[4], p[4], p[4]).setPosition(p[0], p[1], p[2])); im.setColorAt(i, col.set(p[3])); }); im.name = 'wildflowers'; im.userData.live = true; im.computeBoundingSphere(); group.add(im); fl += list.length; }
    stats.flowers = fl; }
  // -- birds over the forest
  { const g = new T.Group(), bs = WD.birds.map(([x, y, z, n, r], i) => { const b = birds({centre: [x, y, z], n, r, seed: 71 + i}); g.add(b.object); return b; }); movers.push({name: 'forestBirds', obj: g, update(t) { bs.forEach(b => b.update(t)); }}); }
  let st = 0; for (const [n, b] of sections) { const gr = b.build(n + 'Props'); group.add(gr); st += tris(gr); }   // *Props: the world's prop cull (PROPS_R) drops each feature at range
  const flowers = group.children.filter(o => o.name === 'wildflowers');
  stats.static = st; stats.trail = trailTris; stats.total = tris(group);
  const onCamera = p => { const d = Math.hypot(p[0] - head.group.position.x, p[2] - head.group.position.z); head.near.visible = d < 110; head.far.visible = !head.near.visible;
    for (const f of flowers) { f.computeBoundingSphere(); f.visible = f.boundingSphere.center.distanceTo(new T.Vector3(...p)) < 90; } };
  return {group, decks, trees, movers, stats, onCamera, clear: (x, z) => nearFeature(x, z, 2.5) || onTrail(x, z, 2.4)};
}
// pure: inside a feature footprint (head + pool, camp, lookout, cave apron, bridge ends) or on a trail (studs of margin)
export function nearFeature(x, z, m = 0) {
  const S7 = PLAN.landmarks['7'], hx = (S7.at[0] - PLAN.origin[0]) * PLAN.scale, hz = (S7.at[1] - PLAN.origin[1]) * PLAN.scale;
  if (Math.hypot(x - hx, z - hz) < WD.head.r * 1.35 + m) return true;
  const yaw = WD.head.yaw * D2R, px = hx + Math.cos(yaw) * WD.head.pool.off[0] + Math.sin(yaw) * WD.head.pool.off[1], pz = hz - Math.sin(yaw) * WD.head.pool.off[0] + Math.cos(yaw) * WD.head.pool.off[1];
  if (Math.hypot(x - px, z - pz) < WD.head.pool.r + 1.5 + m) return true;
  if (Math.hypot(x - WD.camp.at[0], z - WD.camp.at[1]) < WD.camp.r + m) return true;
  if (Math.hypot(x - WD.lookout.at[0], z - WD.lookout.at[1]) < WD.lookout.w * .75 + m) return true;
  if (Math.hypot(x - WD.cave.at[0], z - (WD.cave.at[1] + 10)) < 12 + m) return true;
  const B = WD.bridge; for (const [bx, bz] of [B.from, B.to]) if (Math.hypot(x - bx, z - bz) < 4 + m) return true;
  return false;
}
export function onTrail(x, z, m = 0) {
  for (const p of WD.trail.paths) for (let i = 1; i < p.length; i++) { const [ax, az] = p[i - 1], [bx, bz] = p[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    if (Math.hypot(x - ax - dx * u, z - az - dz * u) < WD.trail.w / 2 + m) return true; }
  const B = WD.bridge, dx = B.to[0] - B.from[0], dz = B.to[1] - B.from[1], L2 = dx * dx + dz * dz, u = Math.max(0, Math.min(1, ((x - B.from[0]) * dx + (z - B.from[1]) * dz) / L2));
  return Math.hypot(x - B.from[0] - dx * u, z - B.from[1] - dz * u) < B.w / 2 + m;
}
