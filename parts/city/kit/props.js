// parts/city/kit/props.js — City kit street props (Phase 1B), data in → one merged group per material.
//   cityProps(list, {name}) → Group; list = [{kind, at: [x, y, z], yaw, roll, seed, colors}]. Kinds: lamp, bench, cafe (table + 2 chairs +
//   umbrella), planter, bollard, fountain ({r}). Phase 1C (street + west arm): sedan, van (blocky, brand-free; colors[0] body), hydrant, trash, mailbox ({tilt} crooked),
//   stripe ({len, w} one crosswalk bar), fence ({len} white picket), hoop, court ({w, d}), swings, slide, sandbox, bus (yellow school bus; plates are added by west.js), treehouse, drive ({w, d}). Each is ≤ 400 tris (fountain ≤ 1.6k); everything static is baked by the world.
import * as T from 'three';
import {bins, bevel, pbox, prism} from './building.js';
import {kitMat, liveMat, tileOf, goldMat} from './mats.js';

const cyl = (rt, rb, h, x, y, z, seg = 8) => new T.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z);
// Blocky Roblox-style car (≈ 300 tris): body + cabin + side-window band + wheels + lamps. Front = +z; colors[0] = body.
function car(A, o, {len, cab, cabLen, cabZ}) { const W = 2.6, col = o.colors?.[0] ?? '#d8362b', body = kitMat('gloss', col), blk = kitMat('plastic', '#23262c'), glass = kitMat('glass', '#ffffff');
  A(body, bevel(W, .95, len, 0, .45, 0, 99)); A(body, bevel(W - .3, cab, len * cabLen, 0, 1.4, cabZ * len, 99)); A(glass, pbox(W - .18, cab * .6, len * cabLen * .86, 0, 1.4 + cab * .22, cabZ * len)); A(glass, pbox(W - .8, cab * .55, len * cabLen + .08, 0, 1.4 + cab * .22, cabZ * len));
  A(blk, pbox(W + .02, .22, .3, 0, .5, len / 2)); A(blk, pbox(W + .02, .22, .3, 0, .5, -len / 2));
  for (const sx of [-1, 1]) { A(kitMat('plastic', '#fff6c8'), pbox(.5, .26, .1, sx * .8, .95, len / 2 + .01)); A(kitMat('plastic', '#e53935'), pbox(.5, .26, .1, sx * .8, .95, -len / 2 - .01));
    for (const sz of [-1, 1]) A(blk, cyl(.45, .45, .32, sx * (W / 2 - .05), .45, sz * len * .3, 6).rotateZ(Math.PI / 2)); } }
const PROPS = {
  lamp(A, o) { const iron = kitMat('metal', o.colors?.[0] ?? '#2f3a36'), glow = liveMat('basic', '#fff3c8');
    A(iron, cyl(.32, .4, .6, 0, 0, 0)); A(iron, cyl(.1, .13, 4.6, 0, .6, 0, 6)); A(iron, cyl(.3, .18, .3, 0, 5.1, 0, 8));
    A(glow, new T.IcosahedronGeometry(.42, 0).scale(1, 1.15, 1).translate(0, 5.85, 0)); A(iron, cyl(.08, .34, .35, 0, 6.3, 0, 8)); },
  bench(A, o) { const wood = kitMat('wood', o.colors?.[0] ?? '#b0773f'), iron = kitMat('metal', '#2f3a36');
    for (let k = 0; k < 3; k++) A(wood, pbox(3.2, .12, .3, 0, .85, -.4 + k * .36)); for (let k = 0; k < 2; k++) A(wood, pbox(3.2, .3, .1, 0, 1.2 + k * .4, -.6));
    for (const x of [-1.3, 1.3]) { A(iron, pbox(.12, .85, 1.1, x, 0, -.05)); A(iron, pbox(.12, 1, .12, x, .85, -.62)); } },
  cafe(A, o) { const c = o.colors ?? ['#ffffff', '#e94f4f'], white = kitMat('plastic', '#f6f4ee'), iron = kitMat('metal', '#3a3f47');
    A(white, cyl(.75, .75, .08, 0, 1.05, 0, 12)); A(iron, cyl(.06, .06, 1.05, 0, 0, 0, 6)); A(iron, cyl(.35, .35, .05, 0, 0, 0, 8));
    for (const a of [0, Math.PI]) { const x = Math.sin(a) * 1.25, z = Math.cos(a) * 1.25; A(kitMat('plastic', c[1]), pbox(.8, .1, .8, x, .62, z)); A(kitMat('plastic', c[1]), pbox(.8, .8, .1, x, .72, z + Math.cos(a) * .35));
      for (const [dx, dz] of [[-.32, -.32], [.32, -.32], [-.32, .32], [.32, .32]]) A(iron, pbox(.06, .62, .06, x + dx, 0, z + dz)); }
    A(iron, cyl(.05, .05, 2.6, 0, 1.1, 0, 5)); const n = 8;
    for (let i = 0; i < n; i++) { const g = new T.ConeGeometry(2.1, .75, n, 1, true, i * 2 * Math.PI / n, 2 * Math.PI / n).translate(0, 3.5, 0); A(kitMat('plastic', c[i % 2]), g); } },
  planter(A, o) { const box = kitMat('brick', o.colors?.[0] ?? '#b85a43'), soil = kitMat('plastic', '#5a4632'), leaf = kitMat('plastic', '#4fae45');
    A(box, bevel(2.4, .9, 1.2, 0, 0, 0, 99), tileOf('brick')); A(kitMat('plastic', '#efe6d4'), pbox(2.6, .14, 1.4, 0, .9, 0)); A(soil, pbox(2.2, .05, 1, 0, 1, 0));
    const fl = o.colors?.slice(1) ?? ['#ff5fa2', '#ffd23f', '#ffffff', '#b28dff'];
    for (let i = 0; i < 4; i++) { const x = -.8 + i * .53; A(leaf, new T.IcosahedronGeometry(.38, 0).scale(1, .8, 1).translate(x, 1.25, (i % 2 - .5) * .3)); A(kitMat('plastic', fl[i % fl.length]), new T.IcosahedronGeometry(.18, 0).translate(x + .1, 1.55, (i % 2 - .5) * .3)); } },
  bollard(A) { A(kitMat('plastic', '#efe6d4'), cyl(.22, .25, .9, 0, 0, 0, 8)); },
  fountain(A, o) { const r = o.r ?? 7, stone = kitMat('stone', '#eee4cf'), n = 28;
    // basin wall (ring of bevelled blocks) + coping
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r, len = 2 * Math.PI * r / n + .05;
      A(stone, pbox(len, .9, .7, 0, 0, 0).rotateY(a).translate(x, 0, z)); A(kitMat('plastic', '#fbf6ea'), pbox(len + .02, .16, 1, 0, .9, 0).rotateY(a).translate(x, 0, z)); }
    A(kitMat('plastic', '#7fb8c8'), cyl(r - .3, r - .3, .1, 0, .05, 0, 28)); },

  // ---- Phase 1C ----
  sedan(A, o) { car(A, o, {len: 5.4, cab: .95, cabLen: .5, cabZ: -.25}); },
  van(A, o) { car(A, o, {len: 5.8, cab: 1.35, cabLen: .8, cabZ: -.15}); },
  hydrant(A) { const red = kitMat('plastic', '#d8362b'), cap = kitMat('plastic', '#f3d34a');
    A(red, cyl(.42, .5, .25, 0, 0, 0, 8)); A(red, cyl(.34, .38, 1.2, 0, .25, 0, 8)); A(cap, cyl(.4, .4, .16, 0, 1.45, 0, 8)); A(red, new T.SphereGeometry(.34, 8, 5, 0, 6.3, 0, 1.6).translate(0, 1.55, 0));
    for (const sx of [-1, 1]) A(red, cyl(.17, .17, .42, sx * .4, .75, 0, 6).rotateZ(sx * Math.PI / 2).translate(0, 0, 0)); },
  trash(A, o) { A(kitMat('plastic', o.colors?.[0] ?? '#3e8f5a'), cyl(.55, .48, 1.5, 0, 0, 0, 10)); A(kitMat('plastic', '#d9ded9'), cyl(.6, .6, .16, 0, 1.5, 0, 10)); A(kitMat('plastic', '#2f3a36'), cyl(.5, .5, .1, 0, .7, 0, 10)); },
  mailbox(A, o) { const tilt = o.tilt ?? 0, wood = kitMat('wood', '#8a6a44'), blue = kitMat('plastic', o.colors?.[0] ?? '#2f6fd6'), flag = kitMat('plastic', '#e53935'), T3 = [];
    const add = (m, g) => A(m, g.rotateZ(tilt));
    add(wood, pbox(.28, 3.1, .28, 0, 0, 0)); add(blue, bevel(.95, .8, 1.7, 0, 3.0, .1, 99)); add(flag, pbox(.1, .6, .22, .52, 3.4, .5)); add(kitMat('plastic', '#f6f6f2'), pbox(.8, .06, .6, 0, 3.78, .1)); void T3; },
  stripe(A, o) { A(kitMat('plastic', '#f6f6f2'), pbox(o.w ?? .9, .07, o.len ?? 9, 0, 0, 0)); },
  fence(A, o) { const len = o.len ?? 8;
    if (o.style === 'wire') { const green = kitMat('metal', '#2f6f4a'), n = Math.max(2, Math.round(len / 3)); for (let i = 0; i <= n; i++) A(green, pbox(.22, 3.6, .22, -len / 2 + i * len / n, -.4, 0));
      for (const y of [.3, 1.2, 2.1, 3.0]) A(green, pbox(len, .12, .1, 0, y, 0)); const nb = Math.round(len / 1.2); for (let i = 0; i < nb; i++) A(green, pbox(.05, 2.7, .05, -len / 2 + (i + .5) * len / nb, .3, 0)); return; }
    const white = kitMat('plastic', '#fbfaf5'), n = Math.max(2, Math.round(len / .8));
    for (let i = 0; i < n; i++) A(white, pbox(.34, 1.45, .12, -len / 2 + (i + .5) * len / n, -.35, 0));
    for (const y of [.4, 1.0]) A(white, pbox(len, .16, .1, 0, y, -.1)); A(white, pbox(.22, 1.7, .22, -len / 2, -.35, 0)); A(white, pbox(.22, 1.7, .22, len / 2, -.35, 0)); },
  drive(A, o) { A(kitMat('concrete', '#cfcac0'), pbox(o.w ?? 6, .14, o.d ?? 12, 0, 0, 0), tileOf('concrete')); },
  hoop(A) { const iron = kitMat('metal', '#4b535c'), white = kitMat('plastic', '#f6f6f2');
    A(iron, cyl(.16, .2, 9.4, 0, 0, 0, 6)); A(iron, pbox(.2, .2, 1.8, 0, 8.6, .9)); A(white, pbox(3.4, 2.3, .15, 0, 8.4, 1.8)); A(kitMat('plastic', '#e53935'), pbox(1.4, 1, .17, 0, 8.7, 1.8));
    A(kitMat('plastic', '#ff7a1a'), new T.TorusGeometry(.7, .06, 5, 14).rotateX(Math.PI / 2).translate(0, 8.6, 2.65)); A(kitMat('plastic', '#f1f1f1'), new T.CylinderGeometry(.62, .4, .8, 8, 1, true).translate(0, 8.2, 2.65)); },
  court(A, o) { const w = o.w ?? 15, d = o.d ?? 28, l = kitMat('plastic', '#fbfaf2'), sk = o.depth ?? 0;   // depth = skirt below the slab (the slab is level, the ground under it slopes)
    if (sk > .01) A(kitMat('concrete', '#cfcac0'), pbox(w + 3, sk, d + 3, 0, -sk, 0), tileOf('concrete'));
    A(kitMat('plastic', '#d65a3a'), pbox(w + 3, .1, d + 3, 0, 0, 0)); A(kitMat('plastic', '#2f78d4'), pbox(w, .14, d, 0, 0, 0));
    for (const sz of [-1, 1]) A(l, pbox(w, .17, .24, 0, 0, sz * d / 2)); for (const sx of [-1, 1]) A(l, pbox(.24, .17, d, sx * w / 2, 0, 0));
    A(l, pbox(w, .17, .24, 0, 0, 0)); A(l, new T.RingGeometry(2.6, 2.85, 24).rotateX(-Math.PI / 2).translate(0, .16, 0));
    for (const sz of [-1, 1]) { A(l, pbox(5, .17, .24, 0, 0, sz * (d / 2 - 5.5))); A(l, pbox(.24, .17, 5.5, -2.5, 0, sz * (d / 2 - 2.75))); A(l, pbox(.24, .17, 5.5, 2.5, 0, sz * (d / 2 - 2.75))); } },
  swings(A) { const iron = kitMat('metal', '#d8362b'), seat = kitMat('plastic', '#2f78d4'), chain = kitMat('metal', '#6b727a');
    for (const sx of [-3, 3]) for (const sz of [-1.2, 1.2]) A(iron, cyl(.14, .14, 4.7, sx + (sx > 0 ? -.55 : .55), 0, sz, 5).rotateZ(0)), A(iron, cyl(.14, .14, 4.7, sx, 0, sz, 5));
    A(iron, new T.CylinderGeometry(.16, .16, 6.4, 6).rotateZ(Math.PI / 2).translate(0, 4.6, 0));
    for (const x of [-1.2, 1.2]) { for (const dz of [-.35, .35]) A(chain, pbox(.06, 3.2, .06, x, 1.35, dz)); A(seat, pbox(1.1, .14, .8, x, 1.25, 0)); } },
  slide(A) { const red = kitMat('plastic', '#d8362b'), yel = kitMat('plastic', '#f6c630'), iron = kitMat('metal', '#6b727a');
    A(yel, pbox(2.4, .2, 2.4, 0, 3.2, 0)); for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) A(iron, pbox(.2, 3.3, .2, x, 0, z));
    const L = 5.6, ang = Math.atan2(3, 5.2); A(red, pbox(1.3, .16, L, 0, 0, 0).rotateX(ang).translate(0, 1.75, 4.1)); for (const sx of [-1, 1]) A(red, pbox(.14, .4, L, 0, 0, 0).rotateX(ang).translate(sx * .72, 1.95, 4.1));
    for (let k = 0; k < 6; k++) A(iron, pbox(1.1, .12, .2, 0, .5 + k * .5, -1.45 - .12 * k)); for (const sx of [-1, 1]) A(iron, pbox(.1, 3.2, .1, sx * .6, 0, -1.5)); },
  sandbox(A) { const wood = kitMat('wood', '#a8774a'); A(kitMat('plastic', '#f0d89a'), pbox(5.6, .5, 5.6, 0, 0, 0));
    for (const sz of [-1, 1]) A(wood, pbox(6.2, .7, .4, 0, 0, sz * 3)); for (const sx of [-1, 1]) A(wood, pbox(.4, .7, 5.6, sx * 3, 0, 0)); A(kitMat('plastic', '#d8362b'), cyl(.5, .6, .5, 1, .5, 1, 8)); },
  bus(A) { const yel = kitMat('gloss', '#f7c21b'), blk = kitMat('plastic', '#22262c'), glass = kitMat('glass', '#ffffff'), W = 3.3;
    A(yel, bevel(W, 3.1, 10.2, 0, .95, -1.1, 99)); A(yel, bevel(W - .3, 1.5, 2.3, 0, .95, 5.1, 99));
    for (const y of [1.5, 3.3]) A(blk, pbox(W + .04, .22, 10.2, 0, y, -1.1)); A(blk, pbox(W - .2, .3, .2, 0, 1.0, 6.3));
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) A(glass, pbox(.08, .85, 1.2, sx * (W / 2 + .01), 2.35, -5 + i * 1.65 + .2));
    A(glass, pbox(W - .5, 1.1, .1, 0, 2.2, 4.02)); for (const sx of [-1, 1]) { A(kitMat('plastic', '#fff7c2'), pbox(.55, .4, .1, sx * 1, 1.35, 6.3)); A(kitMat('plastic', '#e53935'), pbox(.4, .3, .3, sx * 1.35, 4.1, 4.2)); A(kitMat('plastic', '#e53935'), pbox(.4, .3, .3, sx * 1.35, 4.1, -6.1)); }
    for (const sz of [-3.7, 3.7]) for (const sx of [-1, 1]) { A(blk, cyl(.6, .6, .45, sx * (W / 2 - .1), .6, sz, 10).rotateZ(Math.PI / 2).translate(0, 0, 0)); A(kitMat('metal', '#b8bcc2'), cyl(.28, .28, .1, sx * (W / 2 + .12), .6, sz, 8).rotateZ(Math.PI / 2)); }
    A(kitMat('plastic', '#e53935'), pbox(.9, .9, .06, W / 2 + .12, 2.9, 2.2)); },
  treehouse(A, o) { const bark = kitMat('wood', '#7a5a3c'), leaf = kitMat('plastic', '#4fae45'), leaf2 = kitMat('plastic', '#6cc24a'), plank = kitMat('wood', '#c58a52'), dk = kitMat('wood', '#9a6a3c'), red = kitMat('plastic', '#d8362b'), PY = o.deck ?? 13;
    A(bark, cyl(.8, 1.25, PY + 6, 0, -.6, 0, 8), tileOf('wood')); for (const [dx, dz, dy] of [[1.6, .6, 9.2], [-1.4, -.8, 10.4]]) A(bark, cyl(.35, .5, 4.5, dx, dy, dz, 6).rotateZ(dx > 0 ? -.7 : .7).translate(0, 0, 0));
    const blobs = [[0, PY + 8.2, 0, 4.6], [-3.4, PY + 5.4, 1.2, 3.4], [3.3, PY + 5, -.8, 3.5], [.6, PY + 4.6, -3.2, 3.2], [-.8, PY + 4.8, 3.4, 3]];
    blobs.forEach(([x, y, z, r], i) => A(i % 2 ? leaf2 : leaf, new T.IcosahedronGeometry(r, 1).translate(x, y, z)));
    A(plank, pbox(7.4, .4, 7.4, 0, PY, 0)); for (let k = 0; k < 7; k++) A(dk, pbox(7.5, .05, .06, 0, PY + .4, -3.3 + k * 1.1));
    for (const [x, z] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) A(dk, pbox(.3, 1.9, .3, x, PY + .4, z)); for (const y of [PY + 1.5]) { A(dk, pbox(7.1, .22, .2, 0, y, 3.4)); A(dk, pbox(7.1, .22, .2, 0, y, -3.4)); A(dk, pbox(.2, .22, 7.1, -3.4, y, 0)); A(dk, pbox(.2, .22, 7.1, 3.4, y, 0)); }
    const wall = (cx, cz, along, n, len, off = 0) => { for (let k = 0; k < n; k++) { const u = (k + .5) / n * len - len / 2 + off; A(plank, along === 'x' ? pbox(len / n - .04, 3.4, .14, cx + u, PY + .4, cz) : pbox(.14, 3.4, len / n - .04, cx, PY + .4, cz + u)); } };
    wall(0, -3.1, 'x', 6, 5.2); wall(-2.6, -.5, 'z', 6, 5.2); wall(2.6, -.5, 'z', 6, 5.2); wall(-1.5, 2.1, 'x', 2, 2.2); wall(1.9, 2.1, 'x', 1, 1.2);   // door gap at the front (+z)
    A(red, prism(6.2, 2.4, 6).rotateY(Math.PI / 2).translate(0, PY + 3.8, -.5)); A(kitMat('plastic', '#fff2c0'), pbox(1.2, 1, .06, -1.6, PY + 1.6, -3.2));
    const Ln = Math.hypot(PY + .4, 2.4), an = Math.atan2(2.4, PY + .4);   // ladder: bottom (x, 0, 5.8) → top edge of the deck (x, PY + .4, 3.4)
    for (const sx of [-.5, .5]) A(dk, pbox(.14, Ln, .14, 0, 0, 0).rotateX(-an).translate(.9 + sx, 0, 5.8));
    for (let k = 1; k < 10; k++) { const t = k / 10; A(dk, pbox(1.1, .1, .14, .9, (PY + .4) * t, 5.8 - 2.4 * t)); } },
};
export const PROP_KINDS = Object.keys(PROPS);
// list → merged group (static parts baked; glow/water live).
export function cityProps(list, {name = 'cityProps'} = {}) {
  const B = bins();
  for (const p of list) {
    const local = bins(), A = local.add; PROPS[p.kind](A, p);
    const g = local.build('tmp'); g.quaternion.setFromEuler(new T.Euler(0, p.yaw ?? 0, 0)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), p.roll ?? 0)); g.position.set(...p.at); g.updateMatrixWorld(true);
    for (const m of g.children) B.add(m.material, m.geometry.clone().applyMatrix4(m.matrixWorld));
  }
  const out = B.build(name); out.traverse(o => { if (o.isMesh && o.material.userData?.live) o.userData.live = true; }); return out;
}
