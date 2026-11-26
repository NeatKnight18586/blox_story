// parts/city/kit/props.js — City kit street props (Phase 1B), data in → one merged group per material.
//   cityProps(list, {name}) → Group; list = [{kind, at: [x, y, z], yaw, roll, seed, colors}]. Kinds: lamp, bench, cafe (table + 2 chairs +
//   umbrella), planter, bollard, fountain ({r}). Phase 1C (street + west arm): sedan, van (blocky, brand-free; colors[0] body), hydrant, trash, mailbox ({tilt} crooked),
//   stripe ({len, w} one crosswalk bar), fence ({len} white picket), hoop, court ({w, d}), swings, slide, sandbox, bus (yellow school bus; plates are added by west.js), treehouse, drive ({w, d}). Each is ≤ 400 tris (fountain ≤ 1.6k); everything static is baked by the world.
import * as T from 'three';
import {bins, bevel, pbox, prism} from './building.js';
import {kitMat, liveMat, tileOf, goldMat, textureSource} from './mats.js';

// Phase 1D: docks are LIVE (lit in real time, never baked): .07-stud plank gaps voxelise shut in the bake and turn the deck black
const liveCache = new Map();
function liveKit(kind, color, o) { const k = kind + color + (o?.light ? ':light' : ''); if (!liveCache.has(k)) { const m = kitMat(kind, color, o).clone(); m.userData = {...m.userData, live: true}; liveCache.set(k, m); } return liveCache.get(k); }
// a deck plank: top face + the two edge faces across the deck (the gaps read), no bottom / ends (never seen): 6 tris
function plank(w, h, d, x, y, z) { const g = new T.BoxGeometry(w, h, d).toNonIndexed(), n = g.attributes.normal, keep = []; for (let i = 0; i < n.count; i += 3) if (n.getY(i) > .5 || Math.abs(n.getZ(i)) > .5) keep.push(i);
  const p = g.attributes.position, uv = g.attributes.uv, P = [], N = [], U = []; for (const i of keep) for (let j = i; j < i + 3; j++) { P.push(p.getX(j), p.getY(j), p.getZ(j)); N.push(n.getX(j), n.getY(j), n.getZ(j)); U.push(uv.getX(j), uv.getY(j)); }
  const o = new T.BufferGeometry(); o.setAttribute('position', new T.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); o.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); return o.translate(x, y + h / 2, z); }
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
  // Phase 1E yard variety: bike (lying on its side or on its kickstand), flower bed ({len}), mailbox styles ({style: post | brick | barrel})
  bike(A, o) { const fr = kitMat('gloss', o.colors?.[0] ?? '#e53935'), tyre = kitMat('plastic', '#25272c'), s = .55, lean = o.down ? Math.PI / 2 - .12 : .12, B = [];
    for (const z of [-.7, .7]) B.push([tyre, new T.CylinderGeometry(s, s, .1, 8, 1, true).rotateZ(Math.PI / 2).translate(0, s, z)]);
    B.push([fr, pbox(.08, .08, 1.3, 0, s + .35, 0)], [fr, pbox(.08, .7, .08, 0, s, -.25).rotateX(-.35)], [fr, pbox(.08, .75, .08, 0, s, .55).rotateX(.25)], [kitMat('plastic', '#2b2f3a'), pbox(.28, .1, .42, 0, s + .75, -.35)], [kitMat('metal', '#9aa1a8'), pbox(.7, .07, .07, 0, s + .95, .65)]);
    for (const [m, g] of B) A(m, g.rotateY(Math.PI / 2).rotateX(lean).translate(0, o.down ? .08 : 0, 0)); },
  flowerBed(A, o) { const len = o.len ?? 3, soil = kitMat('plastic', '#6b4a33'), edge = kitMat('plastic', o.edge ?? '#f4f1ea'), cols = o.colors ?? ['#ff5f8f', '#ffd23f', '#ffffff', '#b06ad9'];
    A(edge, pbox(len + .3, .35, 1.3, 0, 0, 0)); A(soil, pbox(len, .38, 1, 0, .02, 0));
    for (let i = 0, n = Math.max(2, Math.round(len * 1.4)); i < n; i++) { const x = -len / 2 + .3 + i * (len - .6) / Math.max(1, n - 1), z = i % 2 ? -.2 : .2; A(kitMat('plastic', cols[i % cols.length]), new T.OctahedronGeometry(.24, 0).translate(x, .5 + (i % 3) * .06, z)); } },
  mailbox(A, o) { if (o.style === 'brick') { const b = kitMat('brick', '#b8553f'); A(b, pbox(1, 3, 1, 0, 0, 0), tileOf('brick')); A(kitMat('plastic', '#fbfaf5'), pbox(1.2, .2, 1.2, 0, 3, 0)); A(kitMat('plastic', o.colors?.[0] ?? '#2b2f3a'), pbox(.6, .5, .1, 0, 2.1, .51)); return; }
    if (o.style === 'barrel') { const w = kitMat('wood', '#7a5a3c'); A(w, pbox(.25, 2.6, .25, 0, 0, 0)); A(kitMat('plastic', o.colors?.[0] ?? '#3aa860'), new T.CylinderGeometry(.45, .45, 1.4, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, 2.6, .1)); A(kitMat('plastic', o.colors?.[0] ?? '#3aa860'), pbox(.9, .05, 1.4, 0, 2.58, .1)); A(kitMat('plastic', '#e53935'), pbox(.08, .6, .2, .5, 2.8, .4)); return; }
    const tilt = o.tilt ?? 0, wood = kitMat('wood', '#8a6a44'), blue = kitMat('plastic', o.colors?.[0] ?? '#2f6fd6'), flag = kitMat('plastic', '#e53935'), T3 = [];
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
    if (o.canopy !== false) blobs.forEach(([x, y, z, r], i) => A(i % 2 ? leaf2 : leaf, new T.IcosahedronGeometry(r, 1).translate(x, y, z)));   // Phase 1E (opt-in canopy: false): a hero tree supplies the canopy
    A(plank, pbox(7.4, .4, 7.4, 0, PY, 0)); for (let k = 0; k < 7; k++) A(dk, pbox(7.5, .05, .06, 0, PY + .4, -3.3 + k * 1.1));
    for (const [x, z] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) A(dk, pbox(.3, 1.9, .3, x, PY + .4, z)); for (const y of [PY + 1.5]) { A(dk, pbox(7.1, .22, .2, 0, y, 3.4)); A(dk, pbox(7.1, .22, .2, 0, y, -3.4)); A(dk, pbox(.2, .22, 7.1, -3.4, y, 0)); A(dk, pbox(.2, .22, 7.1, 3.4, y, 0)); }
    const wall = (cx, cz, along, n, len, off = 0) => { for (let k = 0; k < n; k++) { const u = (k + .5) / n * len - len / 2 + off; A(plank, along === 'x' ? pbox(len / n - .04, 3.4, .14, cx + u, PY + .4, cz) : pbox(.14, 3.4, len / n - .04, cx, PY + .4, cz + u)); } };
    wall(0, -3.1, 'x', 6, 5.2); wall(-2.6, -.5, 'z', 6, 5.2); wall(2.6, -.5, 'z', 6, 5.2); wall(-1.5, 2.1, 'x', 2, 2.2); wall(1.9, 2.1, 'x', 1, 1.2);   // door gap at the front (+z)
    A(red, prism(6.2, 2.4, 6).rotateY(Math.PI / 2).translate(0, PY + 3.8, -.5)); A(kitMat('plastic', '#fff2c0'), pbox(1.2, 1, .06, -1.6, PY + 1.6, -3.2));
    const Ln = Math.hypot(PY + .4, 2.4), an = Math.atan2(2.4, PY + .4);   // ladder: bottom (x, 0, 5.8) → top edge of the deck (x, PY + .4, 3.4)
    for (const sx of [-.5, .5]) A(dk, pbox(.14, Ln, .14, 0, 0, 0).rotateX(-an).translate(.9 + sx, 0, 5.8));
    for (let k = 1; k < 10; k++) { const t = k / 10; A(dk, pbox(1.1, .1, .14, .9, (PY + .4) * t, 5.8 - 2.4 * t)); } },
  // ---- Phase 1D harbor + beach kinds (front = +z, ground at y 0 unless noted) ----
  // dock: a plank deck (len along z, w across) on piles: real planks (CC0 wood, .06 gaps, slight tone jitter), an edge trim board on both
  // sides + the far end, piles every `pile` studs down to `depth` below the deck; deck top at y 0 (place `at` on the deck height).
  dock(A, o0) { const o = o0, kitMat = liveKit, len = o.len ?? 10, w = o.w ?? 3.2, pw = .5, gap = .07, n = Math.max(1, Math.round(len / (pw + gap))), step = len / n, cc0 = textureSource('wood').startsWith('cc0'), tones = o.colors ?? (cc0 ? ['#dccbab', '#d0bd9b', '#e6d8bc'] : ['#c99a66', '#b98a58', '#d4a874']), LW = {light: true};   // Phase 1E: the CC0 grain re-tinted to LIGHT weathered wood (kit/mats.js LIGHT_WOOD)
    for (let k = 0; k < n; k++) A(kitMat('wood', tones[(k * 7 + (o.seed ?? 0)) % tones.length], LW), plank(w - .1, .18, step - gap, ((k * 13) % 5 - 2) * .02, -.18, -len / 2 + (k + .5) * step), tileOf('wood'));   // top + 2 edges (6 tris)
    const trim = kitMat('wood', o.trim ?? (cc0 ? '#b8a283' : '#7a5536'), LW);
    for (const sx of [-1, 1]) A(trim, pbox(.22, .42, len + .1, sx * (w / 2 + .06), -.5, 0), tileOf('wood'));
    if (o.endTrim !== false) A(trim, pbox(w + .34, .42, .22, 0, -.5, len / 2 + .06), tileOf('wood'));
    for (const sx of [-1, 1]) A(trim, pbox(.3, .2, len, sx * (w / 2 - .5), -.42, 0));   // joists under the planks
    const pile = kitMat('wood', '#6e4c32'), pd = o.pile ?? 5, depth = o.depth ?? 4;
    for (let z = -len / 2 + .4; z <= len / 2 - .2; z += pd) for (const sx of [-1, 1]) A(pile, new T.CylinderGeometry(.2, .22, depth + .2, 5, 1, true).translate(sx * (w / 2 + .05), -depth + (depth + .2) / 2, z));
    if (o.rails) for (const sx of [].concat(o.rails === true ? [-1, 1] : o.rails)) { for (let z = -len / 2 + .2; z <= len / 2; z += len / Math.max(1, Math.round(len / 3))) A(trim, pbox(.2, 1.3, .2, sx * (w / 2 - .1), 0, z));
      for (const y of [.65, 1.2]) A(trim, pbox(.12, .14, len, sx * (w / 2 - .1), y, 0)); } },
  crate(A, o) { const n = o.n ?? 1, cols = o.colors ?? ['#c9925a', '#b07a45'];
    for (let i = 0; i < n; i++) { const x = (i % 2) * 1.25 - (n > 1 ? .62 : 0), y = Math.floor(i / 2) * 1.12, c = kitMat('wood', cols[i % cols.length]), s = 1.1, r = ((i * 37) % 9 - 4) * .03;
      A(c, pbox(s, s, s, x, y, 0).rotateY(r), tileOf('wood')); A(kitMat('wood', '#7a5536'), pbox(s + .04, .12, s + .04, x, y + s * .45, 0).rotateY(r)); } },
  barrel(A, o) { const c = kitMat('wood', o.colors?.[0] ?? '#a86d3c'), band = kitMat('metal', '#3a3f47');
    A(c, new T.CylinderGeometry(.5, .45, 1.3, 10, 2).translate(0, .65, 0)); for (const y of [.18, 1.1]) A(band, cyl(.52, .52, .08, 0, y, 0, 10)); A(kitMat('wood', '#8a5530'), cyl(.46, .46, .04, 0, 1.3, 0, 10)); },
  net(A, o) { const g = new T.PlaneGeometry(o.len ?? 3, 1.6, 8, 4), p = g.attributes.position;   // a fishing net draped over a rail / heap
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x, .55 + y * .3 + .12 * Math.sin(x * 3.1) * Math.cos(y * 2), .25 * Math.cos(x * 2.3 + y)); }
    g.computeVertexNormals(); A(kitMat('plastic', o.colors?.[0] ?? '#3f8f6b'), g); A(kitMat('plastic', '#f2b02c'), cyl(.16, .16, .14, -(o.len ?? 3) / 2 + .3, .9, .2, 6)); A(kitMat('plastic', '#f2b02c'), cyl(.16, .16, .14, (o.len ?? 3) / 2 - .3, .9, .2, 6)); },
  rope(A, o) { A(kitMat('plastic', '#d9c38c'), new T.TorusGeometry(.42, .1, 5, 12).rotateX(Math.PI / 2).translate(0, .1, 0)); A(kitMat('plastic', '#d9c38c'), new T.TorusGeometry(.32, .1, 5, 12).rotateX(Math.PI / 2).translate(0, .28, 0)); },
  mooring(A) { const iron = kitMat('metal', '#2f3a36'); A(iron, cyl(.28, .34, .55, 0, 0, 0, 8)); A(iron, cyl(.4, .3, .2, 0, .55, 0, 8)); },
  buoy(A, o) { A(kitMat('gloss', o.colors?.[0] ?? '#e53935'), new T.SphereGeometry(.55, 10, 6).translate(0, .25, 0)); A(kitMat('gloss', '#ffffff'), cyl(.57, .57, .25, 0, .2, 0, 10)); },
  beachUmbrella(A, o) { const c = o.colors ?? ['#ffffff', '#e53935'], tilt = o.tilt ?? .18, n = 10, pole = kitMat('plastic', '#f6f4ee'), G = [];
    A(pole, cyl(.06, .06, 3, 0, 0, 0, 5).rotateZ(tilt)); for (let i = 0; i < n; i++) A(kitMat('plastic', c[i % c.length]), new T.ConeGeometry(2, .8, 2, 1, true, i * 2 * Math.PI / n, 2 * Math.PI / n).translate(0, 3.1, 0).rotateZ(tilt)); void G; },
  towel(A, o) { const c = o.colors ?? ['#4fc3f7', '#ffffff']; for (let i = 0; i < 5; i++) A(kitMat('plastic', c[i % c.length]), pbox(1.2, .05, .36, 0, 0, -.72 + i * .36)); },
  lifeguard(A) { const white = kitMat('plastic', '#fbfaf5'), red = kitMat('gloss', '#e53935'), wood = kitMat('wood', '#c99a66');
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A(white, pbox(.22, 3.6, .22, x * 1.1, 0, z * 1.1).rotateX(z * .06).rotateZ(-x * .06));
    A(wood, pbox(3, .2, 3, 0, 3.5, 0), tileOf('wood')); A(red, pbox(2.8, 1.8, .14, 0, 3.7, -1.3)); for (const sx of [-1, 1]) A(red, pbox(.14, 1.1, 2.6, sx * 1.33, 3.7, -.1));
    A(white, pbox(2.6, .5, .14, 0, 4.3, 1.33)); A(red, prism(3.4, 1, 3.4).translate(0, 5.5, 0)); A(white, pbox(3.2, .12, 3.2, 0, 5.5, 0));
    for (let k = 0; k < 6; k++) A(white, pbox(1.2, .1, .3, 0, .5 + k * .55, 1.6 + k * .25)); A(kitMat('metal', '#5a5f66'), cyl(.05, .05, 2.4, 1.3, 5.5, -1.3, 5)); A(red, pbox(.9, .6, .05, 1.75, 7.3, -1.3)); },
  iceCart(A, o) { const c = o.colors ?? ['#ff8fb1', '#ffffff'], body = kitMat('gloss', c[0]), white = kitMat('plastic', c[1]), blk = kitMat('plastic', '#2a2d33');
    A(body, pbox(2.6, 1.2, 1.4, 0, .5, 0)); A(white, pbox(2.7, .14, 1.5, 0, 1.7, 0)); for (const sx of [-1, 1]) A(blk, cyl(.42, .42, .2, sx * .9, .42, .8, 10).rotateX(Math.PI / 2).translate(0, .42, -.4));
    A(kitMat('metal', '#cfd4da'), cyl(.05, .05, 2, .8, 1.8, 0, 5)); for (let i = 0; i < 8; i++) A(kitMat('plastic', c[i % 2]), new T.ConeGeometry(1.5, .6, 2, 1, true, i * Math.PI / 4, Math.PI / 4).translate(.8, 4.05, 0));
    for (const [x, col] of [[-.7, '#ffd23f'], [-.2, '#8fd35a'], [.3, '#ff8fb1']]) { A(kitMat('plastic', '#e8b872'), new T.ConeGeometry(.2, .5, 6).rotateX(Math.PI).translate(x, 2.05, 0)); A(kitMat('plastic', col), new T.SphereGeometry(.24, 6, 4).translate(x, 2.38, 0)); } },
};
export const PROP_KINDS = Object.keys(PROPS);
// list → merged group (static parts baked; glow/water live).
// Phase 1E: every street-lamp head built by cityProps (group + local point), so a night look can add halos (world.js)
export const LAMP_HEADS = [];
export function cityProps(list, {name = 'cityProps'} = {}) {
  const B = bins(), heads = [];
  for (const p of list) {
    const local = bins(), A = local.add; PROPS[p.kind](A, p); if (p.kind === 'lamp') heads.push([p.at[0], p.at[1] + 5.85, p.at[2]]);
    const g = local.build('tmp'); g.quaternion.setFromEuler(new T.Euler(0, p.yaw ?? 0, 0)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), p.roll ?? 0)); g.position.set(...p.at); g.updateMatrixWorld(true);
    for (const m of g.children) B.add(m.material, m.geometry.clone().applyMatrix4(m.matrixWorld));
  }
  const out = B.build(name); out.traverse(o => { if (o.isMesh && o.material.userData?.live) o.userData.live = true; }); for (const h of heads) LAMP_HEADS.push({group: out, at: h}); return out;
}
