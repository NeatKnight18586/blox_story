// parts/city/downtown.js — Phase 1B: Downtown, fully detailed, built from the City Building Kit (parts/city/kit/).
//   downtown({slots, layerPlaza, statuePose}) → {plaza: Group, mainSt: Group, buildings: [kit building], signs, update(t), setState(k, v), onCamera(p)}
// Owner decisions (do not change): brick plaza terrace in rings + central fountain around the Governor statue (slot 1), café tables,
// lamp posts, benches, planters; GOVERNOR'S HALL (slot 2: red brick, white columns, double doors, central balcony with a red carpet
// and gold railings) + BELL TOWER (open belfry, bronze bell → setState('bell', {swing: deg}), giant golden TOP HAT cap, red band);
// BACKWARDS CLOCK TOWER (slot 3: mirrored numerals, hands run backwards, driven by time); Grand Stair dressed in light stone with
// lamp posts; MAIN ST storefronts + civic buildings from kit presets (plan.json mainStreet). Meshes of slot n are named `slot:<n>:…`.
import * as T from 'three';
import {bins, bevel, pbox, prism, pyramid, window1, building, setLOD, lodFor} from './kit/building.js';
import {cityProps} from './kit/props.js';
import {kitMat, liveMat, tileOf} from './kit/mats.js';
import {textPlate} from '../sets4/common.js';
import {roundCylGeometry} from '../sets4/look5.js';
import PRESETS from './kit/presets.json' with {type: 'json'};
import STATUE from './statue.json' with {type: 'json'};
import {PLAN, groundY, stairY, roadPaths} from './plan.js';

const D2R = Math.PI / 180;
const named = (grp, prefix) => { grp.traverse(o => { if (o.isMesh) o.name = prefix + ':' + o.name.split(':').pop(); }); return grp; };
const tile = k => tileOf(k);

// ---------------- Governor's Hall + bell tower + golden top hat (slot 2) ----------------
export const HALL = {W: 44, D: 22, Hw: 15, Wp: 16, Hp: 17.5, proj: 2.5, tower: {s: 9, shaft: 33, belfry: 7, z: -4}, hat: {brim: 7.2, r: 4.6, rTop: 4.9, h: 9.5, band: 1.8}};
export function governorsHall() {
  const {W, D, Hw, Wp, Hp, proj} = HALL, F = D / 2, Fp = F + proj, B = bins(), A = B.add;
  const brick = kitMat('brick', '#b4442f'), stone = kitMat('stone', '#efe5d0'), white = kitMat('plastic', '#fbf8f1'), glass = kitMat('glass', '#2b4566'), gold = kitMat('gold', '#f1bd2c');
  const wood = kitMat('gloss', '#5b2a1b'), red = kitMat('plastic', '#c8102e'), slate = kitMat('shingle', '#59606e');
  // masses
  A(brick, bevel(W, Hw + 1, D, 0, -1, 0, 5), tile('brick'));
  A(brick, bevel(Wp, Hp + 1, D + proj, 0, -1, proj / 2, 5), tile('brick'));
  A(stone, pbox(W + .3, 1.4, D + .3, 0, -1, 0), tile('stone')); A(stone, pbox(Wp + .3, 1.4, D + proj + .3, 0, -1, proj / 2), tile('stone'));
  for (const [x, z, h] of [[-W / 2, F, Hw], [W / 2, F, Hw], [-W / 2, -F, Hw], [W / 2, -F, Hw], [-Wp / 2, Fp, Hp], [Wp / 2, Fp, Hp]]) A(white, pbox(.9, h - .4, .9, x, .4, z));
  A(white, bevel(W + 1, .7, D + 1, 0, Hw - .3, 0, 99)); A(white, bevel(Wp + 1, .8, D + proj + 1, 0, Hp - .3, proj / 2, 99));
  for (const [w, d, x, z] of [[W + .6, .5, 0, F], [W + .6, .5, 0, -F], [.5, D, -W / 2, 0], [.5, D, W / 2, 0]]) A(white, pbox(w, .9, d, x, Hw + .4, z));
  A(slate, pbox(W - .6, .15, D - .6, 0, Hw + .3, 0), tile('shingle'));
  A(white, prism(Wp + 1, 4, 1.2).translate(0, Hp + .5, Fp - .5)); A(gold, roundCylGeometry(1.1, .3, .08, 20).rotateX(Math.PI / 2).translate(0, Hp + 1.9, Fp + .15));
  A(white, pbox(W + .2, .3, .2, 0, 7.6, F + .05)); A(white, pbox(Wp + .2, .3, .2, 0, 7.6, Fp + .05));
  // windows: wings (front), pavilion sides of the doors, side faces
  for (const sx of [-1, 1]) for (const ax of [10.6, 14.6, 18.6]) { window1(A, sx * ax, 1.9, F, 1.9, 4.2, 'sash', white, glass); window1(A, sx * ax, 9, F, 1.9, 4.2, 'arch', white, glass); }
  for (const sx of [-1, 1]) { window1(A, sx * 5.7, 1.9, Fp, 1.7, 4.2, 'sash', white, glass); window1(A, sx * 5.7, 9, Fp, 1.7, 4.2, 'arch', white, glass); }
  for (const sx of [-1, 1]) { const rot = (mat, g) => A(mat, g.rotateY(sx * Math.PI / 2).translate(sx * W / 2, 0, 0)); for (const u of [-6, 0, 6]) { window1(rot, u, 1.9, 0, 1.9, 4.2, 'sash', white, glass); window1(rot, u, 9, 0, 1.9, 4.2, 'arch', white, glass); } }
  // portico: platform + step, four white columns, balcony slab
  const PZ = Fp + 2.75;
  A(stone, bevel(17, .6, 5.5, 0, 0, PZ, 99)); A(stone, bevel(17.5, .3, 1.2, 0, 0, PZ + 3.2, 99));
  for (const x of [-5.4, -1.8, 1.8, 5.4]) { A(white, pbox(1.4, .5, 1.4, x, .6, PZ + 1.2)); A(white, new T.CylinderGeometry(.52, .6, 6.2, 12).translate(x, 1.1 + 3.1, PZ + 1.2)); A(white, pbox(1.5, .45, 1.5, x, 7.3, PZ + 1.2)); }
  A(white, bevel(15, .7, 5, 0, 7.6, Fp + 2.5, 99));
  // red carpet on the balcony floor, draped over the front edge, gold fringe
  A(red, pbox(4.6, .06, 4.5, 0, 8.3, Fp + 2.4)); A(red, pbox(4.6, 2.6, .08, 0, 5.75, Fp + 5.06)); A(gold, pbox(4.7, .2, .12, 0, 5.6, Fp + 5.06));
  // gold railings (balusters + rails) on three sides
  const posts = []; for (let x = -7.1; x <= 7.11; x += .71) posts.push([x, Fp + 4.7]); for (let z = Fp + .3; z < Fp + 4.6; z += .71) posts.push([-7.1, z], [7.1, z]);
  for (const [x, z] of posts) A(gold, new T.CylinderGeometry(.08, .1, 1.1, 5, 1, true).translate(x, 8.3 + .55, z));
  A(gold, pbox(14.5, .18, .22, 0, 9.4, Fp + 4.7)); A(gold, pbox(14.5, .12, .16, 0, 8.4, Fp + 4.7));
  for (const sx of [-1, 1]) { A(gold, pbox(.22, .18, 4.6, sx * 7.1, 9.4, Fp + 2.4)); A(gold, new T.SphereGeometry(.2, 8, 6).translate(sx * 7.1, 9.7, Fp + 4.7)); }
  // balcony double doors (upper) + main double doors (ground)
  A(white, pbox(3.8, 4.9, .3, 0, 8.3, Fp + .1)); for (const sx of [-1, 1]) { A(wood, pbox(1.55, 4.4, .3, sx * .82, 8.3, Fp + .2)); A(glass, pbox(1.05, 2.6, .1, sx * .82, 9.8, Fp + .37)); }
  A(white, new T.CylinderGeometry(1.9, 1.9, .3, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, 13.2, Fp + .1)); A(glass, new T.CylinderGeometry(1.55, 1.55, .3, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, 13.2, Fp + .18));
  A(white, pbox(5, 6.6, .3, 0, .6, Fp + .1)); for (const sx of [-1, 1]) { A(wood, pbox(2.05, 5.9, .3, sx * 1.07, .6, Fp + .2)); A(wood, pbox(1.5, 2.2, .1, sx * 1.07, 3.6, Fp + .37)); A(gold, pbox(.16, .7, .16, sx * .3, 3.1, Fp + .42)); }
  // ---- bell tower (shaft from the terrace, open belfry, golden top hat) ----
  const TW = HALL.tower, s = TW.s, tz = TW.z, top = TW.shaft;
  A(brick, bevel(s, top + 1, s, 0, -1, tz, 5), tile('brick'));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A(white, pbox(.8, top - Hp, .8, x * s / 2, Hp, tz + z * s / 2));
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const ry = Math.atan2(nx, nz), at = (g, o) => g.rotateX(Math.PI / 2).rotateY(ry).translate(nx * (s / 2 + o), 26.5, tz + nz * (s / 2 + o));
    A(white, at(new T.CylinderGeometry(1.25, 1.25, .3, 16), .05)); A(glass, at(new T.CylinderGeometry(.95, .95, .3, 16), .12)); }
  A(white, bevel(s + 1.2, .9, s + 1.2, 0, top, tz, 99));
  const yb = top + .9, bh = TW.belfry;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A(white, bevel(1.8, bh, 1.8, x * (s / 2 - .9), yb, tz + z * (s / 2 - .9), 99));
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const ry = Math.atan2(nx, nz);
    A(white, new T.TorusGeometry(2.75, .4, 6, 12, Math.PI).rotateY(ry).translate(nx * (s / 2 - .5), yb + bh - 3.1, tz + nz * (s / 2 - .5)));
    A(white, pbox(s - 1, 1.1, .9, 0, yb + bh - 1.1, 0).rotateY(ry).translate(nx * (s / 2 - .45), 0, tz + nz * (s / 2 - .45))); }
  A(kitMat('wood', '#6b4a2e'), pbox(s - 2.6, .5, .5, 0, yb + bh - 1.6, tz), tile('wood'));
  const yr = yb + bh; A(white, bevel(s + 1.6, 1, s + 1.6, 0, yr, tz, 99));
  // golden top hat: brim, flared crown, red band
  const Ht = HALL.hat, yh = yr + 1;
  A(gold, roundCylGeometry(Ht.brim, .8, .3, 32, 99).translate(0, yh + .4, tz));
  A(gold, roundCylGeometry(Ht.r, Ht.h, .4, 28, 3, Ht.rTop).translate(0, yh + .8 + Ht.h / 2, tz));
  A(red, new T.CylinderGeometry(Ht.r + .12 + (Ht.rTop - Ht.r) * Ht.band / Ht.h, Ht.r + .1, Ht.band, 28, 1, true).translate(0, yh + .8 + .1 + Ht.band / 2, tz));
  const grp = B.build('hall');
  named(grp, 'slot:2');
  // bronze bell (live: swings about the yoke)
  const bell = new T.Group(); bell.name = 'bellPivot'; bell.position.set(0, yb + bh - 1.75, tz);
  const prof = [[0, 0], [.55, 0], [.85, -.25], [.95, -.9], [1.1, -1.9], [1.45, -2.55], [1.95, -2.9], [1.9, -3.05], [1.55, -3.05]].map(([r, y]) => new T.Vector2(r, y));
  const bronze = new T.MeshStandardMaterial({color: '#b5793a', metalness: .75, roughness: .32, side: T.DoubleSide}); bronze.userData.live = true;
  const bm = new T.Mesh(new T.LatheGeometry(prof, 22), bronze); bm.name = 'slot:2:bell'; bm.userData.live = true;
  const clap = new T.Mesh(new T.SphereGeometry(.38, 10, 8).translate(0, -2.75, 0), bronze); clap.name = 'slot:2:clapper'; clap.userData.live = true;
  const loop = new T.Mesh(new T.TorusGeometry(.35, .1, 6, 12).translate(0, .25, 0), bronze); loop.name = 'slot:2:bellLoop'; loop.userData.live = true;
  bell.add(bm, clap, loop); bell.userData.live = true; grp.add(bell);
  const hatTop = yh + .8 + Ht.h;
  return {group: grp, bell, hatTop, balcony: [0, 9.4, Fp + 4.7], tris: grp.userData.tris};
}

// ---------------- Governor statue (slot 1) ----------------
export function governorStatue(poseName = STATUE.default) {
  const S = STATUE, P = S.poses[poseName] ?? S.poses[S.default], k = S.scale, B = bins(), A = B.add;
  const gold = kitMat('gold', S.gold), band = kitMat('plastic', S.band), stone = kitMat('stone', S.plinth.color);
  const [bw, bh, bd] = S.plinth.base, [mw, mh, md] = S.plinth.body, [cw, ch, cd] = S.plinth.cap;
  A(stone, bevel(bw, bh + .6, bd, 0, -.6, 0, 99), tile('stone')); A(stone, bevel(mw, mh, md, 0, bh, 0, 99), tile('stone')); A(kitMat('plastic', '#fbf6ea'), bevel(cw, ch, cd, 0, bh + mh, 0, 99));
  const y0 = bh + mh + ch;
  // figure in R6 units (feet at 0, facing +z), then scaled by k onto the plinth
  const F = bins(), G = F.add, q = new T.Quaternion(), down = new T.Vector3(0, -1, 0), e = new T.Euler();
  const limb = (pivot, dir, len, above, extra) => { const d = new T.Vector3(...dir).normalize(); q.setFromUnitVectors(down, d);
    const g = bevelBox(1, len + above, 1).translate(0, -(len - above) / 2, 0).applyQuaternion(q).translate(...pivot); G(gold, g);
    if (extra) G(gold, bevelBox(.24, .6, .24).translate(0, -len - .25, .15).applyQuaternion(q).translate(...pivot)); return d; };
  const torsoQ = new T.Quaternion().setFromEuler(e.set(...P.torso.map(v => v * D2R)));
  const hip = new T.Vector3(0, 2, 0), rot = v => new T.Vector3(...v).sub(hip).applyQuaternion(torsoQ).add(hip).toArray();
  limb([-.5, 2, 0], P.legR.dir, 2, 0); limb([.5, 2, 0], P.legL.dir, 2, 0);
  G(gold, bevelBox(2, 2, 1).translate(0, 1, 0).applyQuaternion(torsoQ).translate(0, 2, 0));
  limb(rot([-1.5, 3.5, 0]), P.armR.dir, 1.5, .5, P.armR.point); limb(rot([1.5, 3.5, 0]), P.armL.dir, 1.5, .5, P.armL.point);
  // head + hat + monocle + mustache (head frame: neck pivot)
  const headQ = torsoQ.clone().multiply(new T.Quaternion().setFromEuler(e.set(...P.head.map(v => v * D2R)))), neck = rot([0, 4, 0]);
  const H = (mat, g) => G(mat, g.applyQuaternion(headQ).translate(...neck));
  H(gold, roundCylGeometry(.62, 1.2, .18, 18, 99).translate(0, .6, 0));
  H(gold, new T.CylinderGeometry(.98, .98, .1, 20).translate(0, 1.25, 0)); H(gold, roundCylGeometry(.58, 1.2, .06, 18, 99, .62).translate(0, 1.9, 0));
  H(band, new T.CylinderGeometry(.6, .6, .28, 18, 1, true).translate(0, 1.45, 0));
  H(gold, new T.TorusGeometry(.18, .045, 6, 14).translate(.24, .7, .63)); H(gold, new T.CylinderGeometry(.025, .025, .8, 4).rotateZ(-.45).translate(.42, .32, .63));
  for (const sx of [-1, 1]) { H(gold, bevelBox(.62, .2, .16).rotateZ(-sx * .28).translate(sx * .3, .36, .64)); H(gold, new T.SphereGeometry(.12, 8, 6).translate(sx * .62, .5, .62)); }
  H(gold, new T.SphereGeometry(.12, 8, 6).translate(0, .5, .66));
  // chain + medallion (torso frame)
  G(gold, new T.TorusGeometry(.62, .045, 5, 18, Math.PI).rotateZ(Math.PI).rotateX(-.2).applyQuaternion(torsoQ).translate(...rot([0, 3.95, .52])));
  G(gold, new T.CylinderGeometry(.32, .32, .08, 16).rotateX(Math.PI / 2).applyQuaternion(torsoQ).translate(...rot([0, 3.3, .56])));
  // megaphone (cone mouth → bell)
  if (P.megaphone) { const [a, b] = P.megaphone.map(v => new T.Vector3(...v)), dv = b.clone().sub(a), L = dv.length();
    const g = new T.CylinderGeometry(.6, .16, L, 16, 1, false).translate(0, L / 2, 0).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dv.normalize())).translate(a.x, a.y, a.z); G(gold, g); }
  const fig = F.build('fig'); fig.scale.setScalar(k); fig.position.y = y0; fig.updateMatrixWorld(true);
  for (const m of fig.children) A(m.material, m.geometry.clone().applyMatrix4(m.matrixWorld));
  const grp = B.build('statue'); named(grp, 'slot:1');
  // plaque (front of the plinth body)
  const pl = textPlate(S.plaque.text, {w: S.plaque.size[0], h: S.plaque.size[1], bg: '#b8862a', fg: '#fff3c4', maxFont: 400, name: 'slot:1:plaque'}); pl.position.set(0, bh + mh * .55, md / 2 + .03); grp.add(pl);
  return {group: grp, top: y0 + 7.4 * k, tris: grp.userData.tris + 2};
}
const bevelBox = (w, h, d) => bevel(w, h, d, 0, -h / 2, 0, 99, []);

// ---------------- Backwards clock tower (slot 3) ----------------
export const CLOCK = {s: 7, stage: 8.2, y0: 2.5, shaft: 17, stageH: 6.5, dial: 2.75, minutePeriod: 60};
export function clockTower() {
  const C = CLOCK, B = bins(), A = B.add, brick = kitMat('brick', '#b84a35'), stone = kitMat('stone', '#e9dec7'), white = kitMat('plastic', '#fbf8f1'), slate = kitMat('shingle', '#4a5060'), gold = kitMat('gold', '#f1bd2c');
  A(stone, bevel(9, 3.5, 9, 0, -1, 0, 3), tile('stone'));
  A(brick, bevel(C.s, C.shaft + .2, C.s, 0, C.y0, 0, 3), tile('brick'));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A(white, pbox(.6, C.shaft, .6, x * C.s / 2, C.y0, z * C.s / 2));
  A(white, bevel(C.s + .8, .6, C.s + .8, 0, C.y0 + C.shaft * .55, 0, 99));
  const ys = C.y0 + C.shaft; A(white, bevel(C.stage + .6, .6, C.stage + .6, 0, ys - .3, 0, 99));
  A(brick, bevel(C.stage, C.stageH, C.stage, 0, ys, 0, 3), tile('brick'));
  A(white, bevel(C.stage + 1, .8, C.stage + 1, 0, ys + C.stageH, 0, 99));
  const yr = ys + C.stageH + .8; A(slate, pyramid(C.stage + 1.2, C.stage + 1.2, 5.5, .12).translate(0, yr, 0), tile('shingle'));
  A(gold, new T.CylinderGeometry(.12, .16, 2, 6).translate(0, yr + 5.4 + 1, 0)); A(gold, new T.SphereGeometry(.42, 10, 8).translate(0, yr + 5.6, 0));
  const yc = ys + C.stageH / 2, hands = [];
  const faces = [];
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const ry = Math.atan2(nx, nz), o = C.stage / 2;
    A(kitMat('plastic', '#2b2f3a'), new T.CylinderGeometry(C.dial + .25, C.dial + .25, .3, 32).rotateX(Math.PI / 2).rotateY(ry).translate(nx * (o + .1), yc, nz * (o + .1)));
    faces.push({ry, at: [nx * (o + .27), yc, nz * (o + .27)]}); }
  const grp = B.build('clock'); named(grp, 'slot:3');
  const dialMat = new T.MeshBasicMaterial({map: mirroredDial(), color: '#ffffff'}); dialMat.userData.live = true;
  const handMat = new T.MeshBasicMaterial({color: '#1d1f24'}); handMat.userData.live = true;
  for (const f of faces) { const g = new T.Group(); g.rotation.y = f.ry; g.position.set(...f.at); grp.add(g);
    const dial = new T.Mesh(new T.CircleGeometry(C.dial, 40), dialMat); dial.name = 'slot:3:dial'; dial.userData.live = true; g.add(dial);
    const mk = (w, l, z) => { const p = new T.Group(); p.position.z = z; const m = new T.Mesh(new T.BoxGeometry(w, l, .06).translate(0, l / 2 - .3, 0), handMat); m.name = 'slot:3:hand'; m.userData.live = true; p.add(m); g.add(p); return p; };
    hands.push({min: mk(.16, C.dial * .9, .06), hr: mk(.26, C.dial * .58, .1)});
    const hub = new T.Mesh(new T.CircleGeometry(.22, 12).translate(0, 0, .14), handMat); hub.name = 'slot:3:hub'; hub.userData.live = true; g.add(hub); }
  // hands run BACKWARDS: positive rotation about the dial normal = counter-clockwise as seen from the front
  const setTime = t => { const m = t / C.minutePeriod * Math.PI * 2 + 2 * Math.PI * 10 / 60; for (const h of hands) { h.min.rotation.z = m; h.hr.rotation.z = m / 12 + 2 * Math.PI * 2 / 12; } };
  setTime(0);
  return {group: grp, setTime, hands, top: yr + 6.8, tris: grp.userData.tris};
}
// Clock dial texture: a normal face drawn, then mirrored left↔right (numerals read backwards and run counter-clockwise).
function mirroredDial() {
  if (typeof document === 'undefined') return null;
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  g.translate(n, 0); g.scale(-1, 1);
  g.fillStyle = '#fbf8ee'; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 2, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = '#1d1f24'; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 10, 0, 7); g.stroke();
  g.fillStyle = '#1d1f24'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = n / 2 - 22, r1 = r0 - (i % 5 ? 10 : 26), w = i % 5 ? 3 : 8; g.save(); g.translate(n / 2, n / 2); g.rotate(a); g.fillRect(-w / 2, -r0, w, r0 - r1); g.restore(); }
  g.font = 'bold 64px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) { const a = h / 12 * Math.PI * 2, r = n / 2 - 92; g.fillText(String(h), n / 2 + Math.sin(a) * r, n / 2 - Math.cos(a) * r + 3); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------------- plaza paving (brick rings, polar UVs so bricks run around the rings) ----------------
export function plazaRings(r0, r1, y) {
  const bands = [], out = new T.Group(); out.name = 'plazaPaving'; let r = r0, i = 0;
  const kinds = [['paving', '#c4553c', 2.6], ['paving', '#d9785a', 2.6], ['stone', '#efe3cc', .7]];
  while (r < r1 - .1) { const [kind, color, w] = kinds[i % 3], ro = Math.min(r1, r + w); bands.push([kind, color, r, ro]); r = ro; i++; }
  const B = bins();
  for (const [kind, color, a, b] of bands) { const segs = 64, g = new T.RingGeometry(a, b, segs, 1); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
    const p = g.attributes.position, uv = g.attributes.uv, t = tileOf(kind);
    for (let k = 0; k < p.count; k++) { const col = k % (segs + 1), rr = Math.hypot(p.getX(k), p.getZ(k)); uv.setXY(k, col / segs * 2 * Math.PI * (a + b) / 2 / t, rr / t); }
    B.add(kitMat(kind, color), g); }
  const m = B.build('plazaPaving'); for (const c of m.children) { c.name = 'plazaPaving'; c.userData.live = false; } return m;
}

// ---------------- Main St (plan.json mainStreet) ----------------
export function mainStreetLots() {
  const MS = PLAN.mainStreet, rd = roadPaths()[MS.road], P = rd.pts, out = [];
  for (const sh of MS.shops) {
    const pre = PRESETS[sh.preset], [w, d] = sh.footprint ?? pre.footprint;
    let acc = 0, i = 1; for (; i < P.length - 1; i++) { const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc + L >= sh.s) break; acc += L; }
    const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = (sh.s - acc) / L, tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
    const side = sh.side === 'north' ? 1 : -1, n = [tz * side, -tx * side], off = rd.w / 2 + PLAN.sidewalk + (MS.setback ?? 1), px = a[0] + (b[0] - a[0]) * u, pz = a[1] + (b[1] - a[1]) * u;
    const x = px + n[0] * (off + d / 2), z = pz + n[1] * (off + d / 2), yaw = Math.atan2(-n[0], -n[1]);
    out.push({id: sh.preset, preset: sh.preset, x, z, yaw, w, d, r: Math.hypot(w, d) / 2, front: [px + n[0] * off, pz + n[1] * off], seed: sh.seed ?? out.length + 3});
  }
  return out;
}
// Place a kit building on the ground: base = ground at the front centre, sink down to the lowest footprint corner.
export function placeBuilding(spec, x, z, yaw, front) {
  const [w, d] = spec.footprint, c = Math.cos(yaw), s = Math.sin(yaw);
  const ys = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([a, b]) => groundY(x + a * w / 2 * c + b * d / 2 * s, z - a * w / 2 * s + b * d / 2 * c));
  const base = front ? groundY(...front) : Math.max(...ys), sink = base - Math.min(...ys) + .8;
  const b = building({...spec, sink}); b.group.position.set(x, base, z); b.group.rotation.y = yaw; b.at = [x, base, z]; return b;
}

// ---------------- assemble Downtown ----------------
export function downtown({slots, layerPlaza, statuePose} = {}) {
  const S = Object.fromEntries(slots.map(s => [s.id, s])), plaza = new T.Group(), mainSt = new T.Group(); plaza.name = 'downtown'; mainSt.name = 'mainStreet';
  const stats = {};
  // Hall + tower (slot 2)
  const hall = governorsHall(); hall.group.position.set(S['2'].at[0], S['2'].base, S['2'].at[1]); plaza.add(hall.group); stats.hall = hall.tris;
  // statue + fountain (slot 1)
  const st = governorStatue(statuePose); st.group.position.set(S['1'].at[0], layerPlaza, S['1'].at[1]); plaza.add(st.group); stats.statue = st.tris;
  // clock tower (slot 3)
  const ck = clockTower(); ck.group.position.set(S['3'].at[0], S['3'].base, S['3'].at[1]); ck.group.rotation.y = Math.atan2(-S['3'].at[0], -S['3'].at[1]) - Math.PI / 4; plaza.add(ck.group); stats.clock = ck.tris;
  // paving rings
  const R = PLAN.plaza.r * 2 - .6, ring = plazaRings(7.5, R, layerPlaza); plaza.add(ring);
  // props: fountain, lamps, benches, café, planters (plaza) + stair lamps
  const P = [], ap = (r, deg) => [Math.sin(deg * D2R) * r, layerPlaza, -Math.cos(deg * D2R) * r], face = (at, tx = 0, tz = 0) => Math.atan2(tx - at[0], tz - at[2]);
  P.push({kind: 'fountain', at: [0, layerPlaza, 0], r: 7.2});
  for (const a of [28, 60, 120, 152, 208, 240, 300, 332]) P.push({kind: 'lamp', at: ap(R - 1.5, a)});
  for (const a of [215, 250, 290, 325]) { const at = ap(12.5, a); P.push({kind: 'bench', at, yaw: face(at)}); }
  for (const a of [36, 52, 68, 84]) { const at = ap(23, a); P.push({kind: 'cafe', at, yaw: a * D2R, colors: a % 32 ? ['#ffffff', '#e94f4f'] : ['#ffffff', '#2f8fd8']}); }
  for (const a of [44, 76]) { const at = ap(17.5, a); P.push({kind: 'cafe', at, yaw: a * D2R, colors: ['#fff6d6', '#2f8fd8']}); }
  for (const a of [165, 195, 235, 275, 315, 345, 15]) { const at = ap(19, a); P.push({kind: 'planter', at, yaw: a * D2R}); }
  const ST = PLAN.terrain.stair, hw = ST.w / 2 + .6, run = (ST.z1 - ST.z0 - ST.landing) / ST.steps, zl = ST.z0 + ST.steps / 2 * run + ST.landing / 2;
  for (const z of [zl]) for (const sx of [-1, 1]) P.push({kind: 'lamp', at: [ST.x + sx * hw, stairY(z) + 1.15, z]});
  for (const sx of [-1, 1]) P.push({kind: 'lamp', at: [sx * 6.5, S['2'].base + .6, S['2'].at[1] + HALL.D / 2 + HALL.proj + 4.6]});
  const props = cityProps(P, {name: 'plazaProps'}); plaza.add(props);
  // fountain water (live): basin surface + four arcing jets from the plinth
  const water = new T.Mesh(new T.CircleGeometry(6.9, 40).rotateX(-Math.PI / 2).translate(0, layerPlaza + .72, 0), liveMat('std', '#4fb3d9', {transparent: true, opacity: .82})); water.name = 'fountainWater'; water.userData.live = true; plaza.add(water);
  const jetMat = liveMat('std', '#e6f7ff', {transparent: true, opacity: .6, depthWrite: false}), jets = [];
  for (let k = 0; k < 4; k++) { const a = (k + .5) * Math.PI / 2, dx = Math.sin(a), dz = Math.cos(a), pts = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new T.Vector3(dx * (3.3 + 2.6 * u), layerPlaza + 1.6 + 2.2 * u * (1 - u) * 2.2 - u * .9, dz * (3.3 + 2.6 * u))); }
    jets.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, .16, 5)); }
  const jm = new T.Mesh(mergeAll(jets), jetMat); jm.name = 'fountainJets'; jm.userData.live = true; plaza.add(jm);
  // Main St storefronts + civic buildings
  const buildings = [];
  for (const L of mainStreetLots()) { const pre = PRESETS[L.preset]; const b = placeBuilding({...pre, id: L.id, seed: L.seed}, L.x, L.z, L.yaw, L.front); b.lot = L; mainSt.add(b.group); buildings.push(b); }
  stats.mainStTris = buildings.map(b => b.tris);
  const signs = []; for (const b of buildings) for (const sg of b.signs) signs.push(sg);
  const setState = (k, v) => { if (k === 'bell') { const a = typeof v === 'number' ? v : v?.swing ?? 0; hall.bell.rotation.x = a * D2R; return true; } if (k === 'statue') return false; return false; };
  return {plaza, mainSt, buildings, signs, hall, statue: st, clock: ck, stats, update(t) { ck.setTime(t); }, setState,
    onCamera(p) { for (const b of buildings) setLOD(b, lodFor(Math.hypot(p[0] - b.at[0], p[2] - b.at[2]))); }};
}
function mergeAll(list) { const g = list.map(x => x.index ? x.toNonIndexed() : x); const out = new T.BufferGeometry(); let n = 0; for (const x of g) n += x.attributes.position.count;
  for (const k of ['position', 'normal']) { const a = new Float32Array(n * 3); let o = 0; for (const x of g) { a.set(x.attributes[k].array, o); o += x.attributes[k].array.length; } out.setAttribute(k, new T.BufferAttribute(a, 3)); } return out; }
