// parts/city/harbor.js — Phase 1D: the east arm, fully detailed (data: plan.json "harbor"; owner decisions, do not change):
//   RUBBER-DUCK LIGHTHOUSE (slot 5, the bay rock): giant glossy yellow duck, navy captain's hat + gold badge, red-and-white life ring,
//     a glass lantern room in the head whose beam rotates (setState('duckBeam', on|off));
//   RETRO 50s DINER (slot 6): chrome + teal, big windows, neon DINER sign, red stools through the glass; behind it the CHEESEBURGER
//     WATER TOWER on legs (bun, patty, cheese drip, lettuce, sesame top bun);
//   BUSY FISHING HARBOR: plank quay + piers on piles (kit `dock`, CC0 wood), crates, nets, barrels, mooring bollards + rope coils,
//     FISH MARKET (striped awning) + wood warehouses (kit presets); boats + ferry are living-town movers (parts/city/living.js);
//   CLASSIC BOARDWALK BEACH: striped umbrellas, towels, lifeguard tower, ice-cream cart, a small pier with a FERRIS WHEEL (rotates in update).
//   harbor({slots}) → {groups: {harbor, beach, bay}, buildings, trees, stats, update(t), setState(k, v)}; harborLayout() is pure (node).
// Meshes of slot n are named `slot:<n>:…` (sightline measures). Glossy duck, glass, neon, beam and the wheel are live; the rest is baked.
import * as T from 'three';
import {bins, bevel, pbox} from './kit/building.js';
import {cityProps} from './kit/props.js';
import {kitMat, liveMat, tileOf} from './kit/mats.js';
import {textPlate} from '../sets4/common.js';
import PRESETS from './kit/presets.json' with {type: 'json'};
import {PLAN, groundY, toWorld} from './plan.js';
import {placeBuilding} from './downtown.js';

const HB = PLAN.harbor;
const std = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .45, metalness: 0, ...o});
const live = g => { g.traverse(o => { o.userData.live = true; }); return g; };
const named = (g, prefix) => { g.traverse(o => { if (o.isMesh) o.name = prefix + (o.name ? ':' + o.name.split(':').pop() : ''); }); return g; };
const tris = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); return Math.round(n); };

// Pure: x of the bay shore (first land, ground ≥ .25) scanning east at z.
export function shoreX(z, x0 = 120, x1 = 260) { for (let x = x0; x <= x1; x += .5) if (groundY(x, z) >= .25) return x; return x1; }
// Pure: every placement of the east arm in world studs (+x east, +z south).
export function harborLayout() {
  const Q = HB.quay, quay = [], piers = [];
  const qp = []; for (let z = Q.z0; z <= Q.z1 + 1e-6; z += Q.seg) qp.push([shoreX(z) - Q.w / 2 + Q.inset, z]);   // the quay follows the shore: one rotated plank run per segment
  for (let i = 1; i < qp.length; i++) { const [a, b] = [qp[i - 1], qp[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]); quay.push({x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, len: len + Q.w * .5, w: Q.w, yaw: Math.atan2(b[0] - a[0], b[1] - a[1])}); }
  const quayX = z => { for (let i = 1; i < qp.length; i++) if (z <= qp[i][1]) { const u = (z - qp[i - 1][1]) / (qp[i][1] - qp[i - 1][1]); return qp[i - 1][0] + (qp[i][0] - qp[i - 1][0]) * u; } return qp[qp.length - 1][0]; };
  for (const p of HB.piers) { const sx = quayX(p.z) - Q.w / 2 + .2; piers.push({x: sx - p.len / 2, z: p.z, len: p.len, w: p.w}); }
  const onShore = (dz, off) => [shoreX(dz) + off, dz];
  const buildings = HB.buildings.map(b => { const [x, z] = b.at ?? onShore(b.z, b.off); return {...b, x, z, yaw: (b.yaw ?? -90) * Math.PI / 180}; });
  const boats = HB.boats.map((b, i) => { if (b.quay != null) return {at: [quayX(b.quay) - Q.w / 2 - 2, 0, b.quay], yaw: Math.PI + ((i * 7) % 5 - 2) * .03, color: b.color, trim: b.trim};   // moored along the quay, bow north
    const p = piers[b.pier]; return {at: [p.x + p.len / 2 * b.u, 0, p.z + b.side * (p.w / 2 + 2.1)], yaw: Math.PI / 2 + (b.side < 0 ? 0 : Math.PI) + ((i * 7) % 5 - 2) * .04, color: b.color, trim: b.trim}; });
  const pier = HB.beach.pier, [bx, bz] = pier.root;
  return {quay, quayX, piers, buildings, boats, beachPier: {x: bx, z: bz + pier.len / 2, len: pier.len, w: pier.w, deck: pier.deck}, ferris: (F => ({...F, at: [F.wheel[0], Math.max(groundY(...F.wheel), .3), F.wheel[1]]}))(HB.beach.ferris)};
}

// Pure: walkable decks of the east arm [{x, z, len (along yaw), w, yaw, y}] (quay, piers, beach pier) for the world's groundY.
export function harborDecks(LY = harborLayout()) {
  const y = HB.quay.deck, out = [];
  for (const q of LY.quay) out.push({x: q.x, z: q.z, len: q.len, w: q.w, yaw: q.yaw, y});
  for (const p of LY.piers) out.push({x: p.x, z: p.z, len: p.len, w: p.w, yaw: Math.PI / 2, y});
  const b = LY.beachPier; out.push({x: b.x, z: b.z, len: b.len, w: b.w, yaw: 0, y: b.deck});
  return out;
}
// Pure: the deck height at (x, z) or null (rectangles, local frame: len along (sin yaw, cos yaw)).
export function deckAt(decks, x, z) { let best = null;
  for (const d of decks) { const dx = x - d.x, dz = z - d.z, s = Math.sin(d.yaw), c = Math.cos(d.yaw), u = dx * s + dz * c, v = dx * c - dz * s; if (Math.abs(u) <= d.len / 2 && Math.abs(v) <= d.w / 2 && (best === null || d.y > best)) best = d.y; }
  return best; }
// ---------------- rubber-duck lighthouse (slot 5) ----------------
export function rubberDuck() {
  const g = new T.Group(), S = HB.duck.scale, yellow = new T.MeshPhysicalMaterial({color: '#ffd21f', roughness: .16, clearcoat: 1, clearcoatRoughness: .08, metalness: 0});
  const orange = new T.MeshPhysicalMaterial({color: '#ff8a1c', roughness: .22, clearcoat: .8}), black = std('#16181d', {roughness: .2}), white = std('#ffffff', {roughness: .3});
  const navy = std('#1d2d5c', {roughness: .55}), gold = std('#e8b923', {roughness: .25, metalness: .7}), red = std('#e53935', {roughness: .35}), ringW = std('#fbfaf5', {roughness: .35});
  const add = (geo, m, name) => { const o = new T.Mesh(geo, m); o.name = name; g.add(o); return o; };
  // body: a plump ellipsoid with a raised tail, wings on the sides
  const body = new T.SphereGeometry(1, 36, 20), bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), tail = Math.max(0, z) ** 3 * Math.max(0, y + .2) * .9; bp.setXYZ(i, x * 7 * (1 - .12 * Math.max(0, z)), y * 5 * (y < 0 ? .7 : 1) + tail * 4, z * 9.5); }
  body.computeVertexNormals(); add(body.translate(0, 4.6, 1.2), yellow, 'body');
  for (const sx of [-1, 1]) add(new T.SphereGeometry(1, 16, 10).scale(1.1, 2.6, 4.6).rotateX(-.25).translate(sx * 6.4, 5.8, 2.2), yellow, 'wing');
  // head with the lantern room (glass band) between the face and the hat
  const HY = 13.4, HZ = -4.2, HR = 5.2;
  add(new T.SphereGeometry(HR, 32, 18, 0, Math.PI * 2, Math.PI * .42, Math.PI * .58).translate(0, HY, HZ), yellow, 'head');
  add(new T.CylinderGeometry(HR * .985, HR * .985, .5, 32, 1, true).translate(0, HY + HR * Math.cos(Math.PI * .42) - .2, HZ), yellow, 'headRim');
  const glass = liveMat('std', '#cfefff', {transparent: true, opacity: .3, depthWrite: false, roughness: .05, metalness: .2});
  const gy = HY + HR * Math.cos(Math.PI * .42), gH = 2.4, gR = HR * Math.sin(Math.PI * .42) * .97;
  add(new T.CylinderGeometry(gR * .92, gR, gH, 24, 1, true).translate(0, gy + gH / 2, HZ), glass, 'lantern');
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; add(new T.BoxGeometry(.22, gH, .22).translate(Math.sin(a) * gR * .96, gy + gH / 2, HZ + Math.cos(a) * gR * .96), navy, 'mullion'); }
  add(new T.CylinderGeometry(gR * .95, gR * .95, .3, 24).translate(0, gy + gH + .15, HZ), navy, 'lanternCap');
  const lamp = add(new T.SphereGeometry(.9, 12, 8).translate(0, gy + gH / 2, HZ), new T.MeshBasicMaterial({color: '#fff2b0', toneMapped: false}), 'lamp');
  // beam: two soft cones from the lamp (additive, unlit), rotating about y
  const beam = new T.Group(); beam.position.set(0, gy + gH / 2, HZ); beam.name = 'duckBeam'; g.add(beam);
  const bm = new T.MeshBasicMaterial({color: '#fff1b8', transparent: true, opacity: .12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false});
  for (const s of [-1, 1]) { const c = new T.Mesh(new T.ConeGeometry(4.2, 46, 16, 1, true).translate(0, -23, 0).rotateZ(s * Math.PI / 2), bm); c.name = 'beam'; beam.add(c); }
  // face: beak, eyes (white highlight), cheeks
  add(new T.SphereGeometry(1, 18, 10).scale(3, .95, 2.9).translate(0, HY - 1.3, HZ - HR - .9), orange, 'beak');
  add(new T.SphereGeometry(1, 14, 8).scale(2.6, .55, 2.4).translate(0, HY - 2.2, HZ - HR - .4), orange, 'beakLow');
  for (const sx of [-1, 1]) { add(new T.SphereGeometry(.95, 14, 10).translate(sx * 2.3, HY + .9, HZ - HR + .75), black, 'eye'); add(new T.SphereGeometry(.3, 8, 6).translate(sx * 2.05, HY + 1.25, HZ - HR + .02), white, 'eyeHi'); }
  // captain's hat: navy crown on the lantern cap, black visor, white band, gold badge + cord
  const capY = gy + gH + .3;
  add(new T.CylinderGeometry(4.6, 4.1, 2.6, 28).translate(0, capY + 1.3, HZ), navy, 'hat');
  add(new T.CylinderGeometry(4.9, 4.9, .5, 28).translate(0, capY + 2.75, HZ), navy, 'hatTop');
  add(new T.CylinderGeometry(4.18, 4.18, .7, 28, 1, true).translate(0, capY + .45, HZ), ringW, 'hatBand');
  add(new T.CylinderGeometry(3.2, 3.2, .22, 20, 1, false, -Math.PI * .5, Math.PI).scale(1, 1, .8).translate(0, capY + .12, HZ - 3.7), black, 'visor');
  add(new T.CylinderGeometry(1, 1, .25, 16).rotateX(Math.PI / 2).translate(0, capY + 1.5, HZ - 4.45), gold, 'badge');
  add(new T.TorusGeometry(4.3, .1, 4, 28, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI).translate(0, capY + .85, HZ - .1), gold, 'cord');
  // life ring around the neck (8 alternating red / white arcs)
  for (let k = 0; k < 8; k++) { const t = new T.TorusGeometry(5.6, 1.15, 8, 6, Math.PI / 4).rotateZ(k * Math.PI / 4).rotateX(Math.PI / 2).scale(1, 1, .92).translate(0, HY - 4.6, HZ + .4); add(t, k % 2 ? ringW : red, 'lifeRing'); }
  g.scale.setScalar(S); live(g);
  return {group: g, beam, lamp, tris: tris(g)};
}

// ---------------- retro diner + cheeseburger water tower (slot 6) ----------------
function stadium(w, d, r) { const s = new T.Shape(), x = w / 2 - r, z = d / 2 - r; s.moveTo(-x, -d / 2); s.lineTo(x, -d / 2); s.absarc(x, -z, r, -Math.PI / 2, 0); s.lineTo(w / 2, z); s.absarc(x, z, r, 0, Math.PI / 2); s.lineTo(-x, d / 2); s.absarc(-x, z, r, Math.PI / 2, Math.PI); s.lineTo(-w / 2, -z); s.absarc(-x, -z, r, Math.PI, Math.PI * 1.5); return s; }
const ring = (shape, y0, h, inset = 0) => { const g = new T.ExtrudeGeometry(shape, {depth: h, bevelEnabled: false, curveSegments: 6}); g.rotateX(-Math.PI / 2); if (inset) { g.computeBoundingBox(); } g.translate(0, y0, 0); return g; };
export function diner() {
  const D = HB.diner, w = D.w, d = D.d, r = 2.6, g = new T.Group(), B = bins(), A = B.add;
  const teal = kitMat('gloss', '#2fb7b0'), chrome = kitMat('metal', '#dfe6ec'), white = kitMat('plastic', '#fbfaf5'), red = kitMat('gloss', '#e0322f'), pink = kitMat('gloss', '#ff7eb6');
  A(kitMat('concrete', '#d9d4c8'), pbox(w + 2, .5, d + 2, 0, -.45, 0), tileOf('concrete'));
  A(teal, ring(stadium(w, d, r), 0, 1.3)); A(chrome, ring(stadium(w + .16, d + .16, r + .08), 1.3, .28)); A(chrome, ring(stadium(w + .16, d + .16, r + .08), 4.35, .35));
  A(teal, ring(stadium(w + .3, d + .3, r + .15), 4.7, .9)); A(pink, ring(stadium(w + .34, d + .34, r + .17), 5.0, .18)); A(white, ring(stadium(w + .6, d + .6, r + .3), 5.6, .3));
  for (let i = 0; i < 12; i++) { const x = -w / 2 + r + (i + .5) * (w - 2 * r) / 12; A(chrome, pbox(.14, 2.8, .14, x, 1.55, d / 2 - .02)); A(chrome, pbox(.14, 2.8, .14, x, 1.55, -d / 2 + .02)); }   // window mullions
  // interior: checker floor, counter, red stools, back wall, menu board (seen through the glass)
  for (let i = 0; i < 10; i++) for (let k = 0; k < 4; k++) if ((i + k) % 2) A(kitMat('plastic', '#1d1f24'), pbox((w - 2) / 10, .04, (d - 2) / 4, -w / 2 + 1 + (i + .5) * (w - 2) / 10, .02, -d / 2 + 1 + (k + .5) * (d - 2) / 4));
  A(white, pbox(w - 2, .02, d - 2, 0, 0, 0));
  A(white, pbox(w - 6, 1.1, 1.1, 0, 0, -1)); A(red, pbox(w - 5.8, .14, 1.4, 0, 1.1, -1)); A(chrome, pbox(w - 6, .12, .12, 0, .35, -.4));
  for (let i = 0; i < 8; i++) { const x = -w / 2 + 4 + i * (w - 8) / 7; A(chrome, new T.CylinderGeometry(.1, .14, .9, 6).translate(x, .45, .6)); A(red, new T.CylinderGeometry(.48, .48, .26, 12).translate(x, 1, .6)); }
  A(kitMat('plastic', '#fff1d6'), pbox(w - 3, 3.4, .1, 0, .9, -d / 2 + 1.1));
  for (let i = 0; i < 4; i++) A(kitMat('plastic', ['#ff7eb6', '#ffd23f', '#4fc3f7', '#7ed957'][i]), pbox(1.6, .9, .06, -4.5 + i * 3, 2.9, -d / 2 + 1.2));
  // door (front centre), chrome frame + steps
  A(chrome, pbox(2.6, 3.4, .25, 0, 0, d / 2 + .05)); A(red, pbox(2.1, 3, .2, 0, 0, d / 2 + .12)); A(kitMat('glass', '#fff'), pbox(1.4, 1.6, .06, 0, 1.2, d / 2 + .24));
  for (let k = 0; k < 2; k++) A(kitMat('concrete', '#e6e1d6'), pbox(4 - k, .25, 1.2 - k * .4, 0, -.25 - k * .25 + .25, d / 2 + .9 - k * .2));
  const body = B.build('diner'); g.add(body);
  // glass band: live, faint so the stools read
  const glass = new T.Mesh(ring(stadium(w - .06, d - .06, r - .03), 1.58, 2.77), liveMat('std', '#bfe6ff', {transparent: true, opacity: .2, depthWrite: false})); glass.name = 'glass'; g.add(glass);
  // neon DINER sign on the roof (unlit, toneMapped off = it glows) on a chrome frame
  const sw = 9, sh = 2.6, sy = 6.4, sign = textPlate('DINER', {w: sw, h: sh, bg: '#173a57', fg: '#ff4fa3', name: 'neonSign', maxFont: 1000});
  sign.material.toneMapped = false; sign.position.set(-1, sy + sh / 2 + .3, d / 2 - 1.2); g.add(sign);
  const neon = new T.MeshBasicMaterial({color: '#5ef2ff', toneMapped: false}), fr = [];
  for (const [x, y, ww, hh] of [[0, -sh / 2 - .1, sw + .4, .18], [0, sh / 2 + .1, sw + .4, .18], [-sw / 2 - .1, 0, .18, sh + .4], [sw / 2 + .1, 0, .18, sh + .4]]) fr.push(new T.BoxGeometry(ww, hh, .12).translate(-1 + x, sy + sh / 2 + .3 + y, d / 2 - 1.15));
  const nf = new T.Mesh(mergeG(fr), neon); nf.name = 'neonFrame'; g.add(nf);
  const posts = []; for (const x of [-4.5, 2.5]) posts.push(new T.CylinderGeometry(.12, .12, 1.2, 6).translate(x, 6.3, d / 2 - 1.3));
  const pm = new T.Mesh(mergeG(posts), kitMat('metal', '#dfe6ec')); g.add(pm);
  const arrow = new T.Mesh(new T.ConeGeometry(.9, 1.8, 3).rotateZ(-Math.PI / 2).translate(5.6, sy + 1.6, d / 2 - 1.15), new T.MeshBasicMaterial({color: '#ffd23f', toneMapped: false})); arrow.name = 'neonArrow'; g.add(arrow);
  [glass, sign, nf, arrow].forEach(o => { o.userData.live = true; });
  return {group: g, tris: tris(g), signs: [sign]};
}
function mergeG(list) { const g = list.map(x => x.index ? x.toNonIndexed() : x), out = new T.BufferGeometry(); let n = 0; for (const x of g) n += x.attributes.position.count;
  for (const k of ['position', 'normal']) { const a = new Float32Array(n * 3); let o = 0; for (const x of g) { a.set(x.attributes[k].array, o); o += x.attributes[k].array.length; } out.setAttribute(k, new T.BufferAttribute(a, 3)); } return out; }
const lathe = (pts, seg = 28) => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), seg);
export function burgerTower() {
  const B = bins(), A = B.add, BT = HB.burger, L = BT.legH, R = BT.r;
  const steel = kitMat('metal', '#c9ced4'), bun = kitMat('gloss', '#e9a24a'), bunTop = kitMat('gloss', '#e29a3e'), patty = kitMat('plastic', '#6b3a22'), cheese = kitMat('gloss', '#ffc928'), lettuce = kitMat('plastic', '#5cbf3c'), tomato = kitMat('gloss', '#e0402f'), seed = kitMat('plastic', '#fff6dc');
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, x0 = Math.sin(a) * R * .95, z0 = Math.cos(a) * R * .95, x1 = Math.sin(a) * R * .62, z1 = Math.cos(a) * R * .62;
    const v = new T.Vector3(x1 - x0, L, z1 - z0), len = v.length(), leg = new T.CylinderGeometry(.32, .38, len, 8); leg.translate(0, len / 2, 0); leg.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize())); A(steel, leg.translate(x0, -1, z0)); }
  for (const y of [L * .35, L * .7]) for (let k = 0; k < 4; k++) { const a0 = Math.PI / 4 + k * Math.PI / 2, a1 = a0 + Math.PI / 2, rr = R * (.95 - .33 * y / L), p0 = [Math.sin(a0) * rr, Math.cos(a0) * rr], p1 = [Math.sin(a1) * rr, Math.cos(a1) * rr];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), b = new T.CylinderGeometry(.14, .14, len, 5).rotateZ(Math.PI / 2).rotateY(-Math.atan2(p1[1] - p0[1], p1[0] - p0[0])).translate((p0[0] + p1[0]) / 2, y, (p0[1] + p1[1]) / 2); A(steel, b); }
  A(steel, new T.CylinderGeometry(.35, .35, L - 1, 8).translate(0, (L - 1) / 2, 0));   // riser pipe
  let y = L;
  A(bun, lathe([[0, 0], [R * .9, 0], [R, .5], [R * 1.02, 1.4], [R * .98, 2.1], [0, 2.1]]).translate(0, y, 0)); y += 2.1;
  const pg = lathe([[0, 0], [R * 1.06, 0], [R * 1.1, .8], [R * 1.06, 1.6], [0, 1.6]], 22), pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), a = Math.atan2(z, x), k = 1 + .025 * Math.sin(a * 9) + .02 * Math.sin(a * 5 + 1); pp.setX(i, x * k); pp.setZ(i, z * k); } pg.computeVertexNormals();
  A(patty, pg.translate(0, y, 0)); y += 1.6;
  A(cheese, pbox(R * 2.05, .32, R * 2.05, 0, y, 0).rotateY(Math.PI / 4));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, rr = R * 1.42, drip = new T.ConeGeometry(.75, 2.2, 4).rotateX(Math.PI).translate(Math.sin(a) * rr * .98, y - .9, Math.cos(a) * rr * .98); A(cheese, drip); }
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .4, rr = R * 1.02; A(cheese, new T.SphereGeometry(.45, 6, 4).scale(1, 1.8, .6).rotateY(-a).translate(Math.sin(a) * rr, y - .5 - (k % 2) * .5, Math.cos(a) * rr)); }
  y += .32;
  const lg = new T.CylinderGeometry(R * 1.12, R * 1.12, .5, 48, 1), lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), z = lp.getZ(i), a = Math.atan2(z, x), k = 1 + .06 * Math.sin(a * 16); lp.setX(i, x * k); lp.setZ(i, z * k); lp.setY(i, lp.getY(i) + .18 * Math.sin(a * 16 + 1)); } lg.computeVertexNormals();
  A(lettuce, lg.translate(0, y + .25, 0)); y += .5;
  A(tomato, new T.CylinderGeometry(R * .96, R * .96, .45, 24).translate(0, y + .22, 0)); y += .45;
  const top = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; top.push([Math.cos(a) * R * 1.04, Math.sin(a) * R * .78]); } top.push([0, R * .78]);
  A(bunTop, lathe([[0, 0], ...top]).translate(0, y, 0));
  for (let i = 0; i < 22; i++) { const a = i * 2.399, u = .25 + .7 * ((i * 0.618) % 1), rr = R * 1.04 * u, hh = R * .78 * Math.sqrt(Math.max(0, 1 - u * u)); A(seed, new T.SphereGeometry(.26, 6, 4).scale(1, .5, 1.6).rotateY(a).translate(Math.cos(a) * rr, y + hh + .02, Math.sin(a) * rr)); }
  const g = B.build('burgerTower'); g.userData.top = y + R * .78; return {group: g, tris: g.userData.tris, top: y + R * .78};
}

// ---------------- Ferris wheel (beach pier) ----------------
export function ferrisWheel(o = {}) {
  const R = o.r ?? 9, n = o.cars ?? 10, axle = o.axle ?? R + 2.2, g = new T.Group(), rim = new T.Group(); g.name = 'ferrisWheel';
  const white = std('#fbfaf5'), red = std('#e53935'), steel = std('#9aa3ad', {metalness: .4}), cols = ['#e53935', '#ffd23f', '#2f78d4', '#7ed957', '#ff7eb6'];
  const sup = []; for (const sz of [-1, 1]) for (const sx of [-1, 1]) { const v = new T.Vector3(-sx * 4.2, axle, 0), len = v.length(), leg = new T.CylinderGeometry(.22, .28, len, 6).translate(0, len / 2, 0); leg.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize())); sup.push(leg.translate(sx * 4.2, 0, sz * 1.4)); }
  sup.push(new T.CylinderGeometry(.35, .35, 3.4, 8).rotateX(Math.PI / 2).translate(0, axle, 0)); const s = new T.Mesh(mergeG(sup), white); s.name = 'ferrisFrame'; g.add(s);
  for (const sz of [-.9, .9]) { const t = new T.Mesh(new T.TorusGeometry(R, .18, 6, 40), red); t.position.z = sz; rim.add(t); const t2 = new T.Mesh(new T.TorusGeometry(R * .55, .12, 5, 28), white); t2.position.z = sz; rim.add(t2); }
  const sp = []; for (let k = 0; k < n; k++) { const a = k * 2 * Math.PI / n; for (const sz of [-.9, .9]) sp.push(new T.CylinderGeometry(.08, .08, R, 4).translate(0, R / 2, 0).rotateZ(a).translate(0, 0, sz)); } const spm = new T.Mesh(mergeG(sp), steel); rim.add(spm);
  const bulbs = new T.Mesh(mergeG(Array.from({length: n * 2}, (_, k) => new T.SphereGeometry(.22, 5, 4).translate(Math.cos(k * Math.PI / n) * R, Math.sin(k * Math.PI / n) * R, -1.05))), new T.MeshBasicMaterial({color: '#fff3b0', toneMapped: false})); rim.add(bulbs);
  const cars = [];
  for (let k = 0; k < n; k++) { const c = new T.Group(), body = new T.Mesh(new T.BoxGeometry(1.5, 1.2, 1.4).translate(0, -1.5, 0), std(cols[k % cols.length])), roof = new T.Mesh(new T.CylinderGeometry(.2, 1.1, .5, 6).translate(0, -.55, 0), white);
    const hang = new T.Mesh(new T.CylinderGeometry(.06, .06, .9, 4).translate(0, -.45, 0), steel); c.add(body, roof, hang); const a = k * 2 * Math.PI / n; c.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); rim.add(c); cars.push(c); }
  rim.position.y = axle; g.add(rim); live(g);
  return {group: g, rim, cars, tris: tris(g), set(t, period = o.period ?? 40) { const a = -t / period * Math.PI * 2; rim.rotation.z = a; for (const c of cars) c.rotation.z = -a; }};
}

// ---------------- assemble the east arm ----------------
export function harbor({slots} = {}) {
  const S = Object.fromEntries(slots.map(s => [s.id, s])), LY = harborLayout(), groups = {harbor: new T.Group(), beach: new T.Group(), bay: new T.Group()}, stats = {}, buildings = [];
  groups.harbor.name = 'harborDetail'; groups.beach.name = 'beachDetail'; groups.bay.name = 'duckLighthouse';
  // duck (slot 5) on the rock
  const duck = rubberDuck(); duck.group.position.set(S['5'].at[0], S['5'].base - .6, S['5'].at[1]); duck.group.rotation.y = (HB.duck.yaw ?? 180) * Math.PI / 180; named(duck.group, 'slot:5'); groups.bay.add(duck.group); stats.duck = duck.tris;
  let beamOn = HB.duck.beam !== false; duck.beam.visible = beamOn;
  // diner + burger tower (slot 6)
  const dn = diner(), [dx, dz] = S['6'].at, dyaw = (HB.diner.yaw ?? -90) * Math.PI / 180; dn.group.position.set(dx, groundY(dx, dz) + .45, dz); dn.group.rotation.y = dyaw; named(dn.group, 'slot:6'); groups.harbor.add(dn.group); stats.diner = dn.tris;
  const bt = burgerTower(), [tx, tz] = S['6'].tower.at; bt.group.position.set(tx, groundY(tx, tz), tz); named(bt.group, 'slot:6:tower'); groups.harbor.add(bt.group); stats.burger = bt.tris;
  // docks (kit `dock`: real planks on piles), harbor props
  const P = [], dkY = HB.quay.deck;
  for (const q of LY.quay) P.push({kind: 'dock', at: [q.x, dkY, q.z], yaw: q.yaw, len: q.len, w: q.w, endTrim: false, seed: Math.round(q.z)});
  for (const p of LY.piers) P.push({kind: 'dock', at: [p.x, dkY, p.z], yaw: -Math.PI / 2, len: p.len, w: p.w, seed: Math.round(p.z), rails: false});
  for (const p of LY.piers) { for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) P.push({kind: 'mooring', at: [p.x - p.len / 2 + 2 + k * (p.len - 4) / 2, dkY, p.z + sd * (p.w / 2 - .4)]});
    P.push({kind: 'rope', at: [p.x - p.len / 2 + 3.2, dkY, p.z - p.w / 2 + .9]}); }
  for (const [kind, i, u, side, extra] of HB.props) { const p = kind.startsWith('q') ? null : LY.piers[i]; const k = kind.replace(/^q/, '');
    if (p) P.push({kind: k, at: [p.x + p.len / 2 * u, dkY, p.z + side * (p.w / 2 - .9)], yaw: (u * 2.3 + side) % 3, ...(extra ?? {})});
    else P.push({kind: k, at: [LY.quayX(i) + side * (HB.quay.w / 2 - .9) + u, dkY, i], yaw: (i * .37) % 3, ...(extra ?? {})}); }
  const props = cityProps(P, {name: 'harborProps'}); groups.harbor.add(props);
  for (const b of LY.buildings) { const pre = PRESETS[b.preset], f = [b.x - Math.sin(b.yaw) * -pre.footprint[1] / 2, b.z - Math.cos(b.yaw) * -pre.footprint[1] / 2];
    const kb = placeBuilding({...pre, id: b.preset, seed: b.seed ?? 3, ...(b.sign ? {sign: b.sign} : {})}, b.x, b.z, b.yaw, f); kb.lot = b; groups.harbor.add(kb.group); buildings.push(kb); }
  // beach: umbrellas, towels, lifeguard tower, ice-cream cart, buoys; the pier + Ferris wheel
  const BE = HB.beach, Q = [];
  for (const [kind, x, z, yaw, colors] of BE.props) Q.push({kind, at: [x, Math.max(groundY(x, z), 0) + (kind === 'towel' ? .03 : 0), z], yaw: (yaw ?? 0) * Math.PI / 180, ...(colors ? {colors} : {})});
  const bp = LY.beachPier; Q.push({kind: 'dock', at: [bp.x, bp.deck, bp.z], yaw: 0, len: bp.len, w: bp.w, rails: true, depth: 6, seed: 5});
  groups.beach.add(cityProps(Q, {name: 'beachProps'}));
  const fw = ferrisWheel(LY.ferris); fw.group.position.set(...LY.ferris.at); fw.group.rotation.y = (LY.ferris.yaw ?? 0) * Math.PI / 180; groups.beach.add(fw.group); stats.ferris = fw.tris;
  stats.props = tris(props); stats.buildings = buildings.map(b => b.tris);
  const setState = (k, v) => { if (k === 'duckBeam') { beamOn = v === true || v === 'on' || v === 1; duck.beam.visible = beamOn; return true; } return false; };
  return {groups, buildings, duck, diner: dn, burger: bt, ferris: fw, stats, trees: (HB.palms ?? []).map(([x, z]) => ({x, z, y: groundY(x, z) + .1, s: .9, r: x, palm: true})), setState,
    update(t) { fw.set(t); if (beamOn) duck.beam.rotation.y = t * Math.PI * 2 / (HB.duck.beamPeriod ?? 8); }};
}
