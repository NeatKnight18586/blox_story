// parts/city/west.js — Phase 1C: the west arm (School + homes) from the City Building Kit; everything is data in plan.json `west` + kit presets.
//   westReserves() → [{x, z, r}] circles kept free of fill lots (pure, node-testable) · heroLot() · houseLot(l, R) → placed pastel house for a district lot
//   west({houses, anchors, R}) → {group, buildings, trees, stats, hero, school, upside}; world.js adds `group` to the school bake group.
// SCHOOL: classic brick (kit preset `school`: pavilion + gable pediment, round clock over the double door, six big steps), yellow bus out front
//   ("SCHOOL BUS" plates only), fenced yard with a painted court + hoops + swings, slide, sandbox. SUBURB: 10 seeded pastel presets (house*),
//   per-lot dressing (picket fence, walk, drive, mailbox) near the anchors. HERO'S HOUSE (location heroHouse): sky-blue, red door, attached garage,
//   crooked mailbox, a big backyard TREEHOUSE over the roofline. UPSIDE-DOWN HOUSE (slot 4): the whole yard package (house + lawn slab + fence +
//   mailbox) flipped about z, resting on its chimney in the grass; the window cards flip with it. Meshes of slot 4 are named `slot:4:…`.
import * as T from 'three';
import {building, setLOD, lodFor, bins, pbox} from './kit/building.js';
import {cityProps} from './kit/props.js';
import {kitMat} from './kit/mats.js';
import {textPlate} from '../sets4/common.js';
import PRESETS from './kit/presets.json' with {type: 'json'};
import {PLAN, groundY, roadPaths, landmarkSlots} from './plan.js';
import {placeBuilding, roadFrame} from './downtown.js';

const W = PLAN.west, SW = PLAN.sidewalk;
export const HOUSES = Object.keys(PRESETS).filter(k => /^house[A-Z]/.test(k));   // the ten pastel suburb presets
const fwd = yaw => [Math.sin(yaw), Math.cos(yaw)], rgt = yaw => [Math.cos(yaw), -Math.sin(yaw)];
// point at (u across, v toward the street) in a house's frame
const at = (c, yaw, u, v) => { const r = rgt(yaw), f = fwd(yaw); return [c[0] + r[0] * u + f[0] * v, c[1] + r[1] * u + f[1] * v]; };

// The hero's lot: on `side` of the road, `front` studs of lawn behind the sidewalk; yaw faces the street.
export function heroLot() {
  const H = W.hero, rd = roadPaths()[H.road], {p, t} = roadFrame(rd, H.s), n = [t[1] * H.side, -t[0] * H.side], pre = PRESETS[H.preset], [w, d] = pre.footprint;
  const off = rd.w / 2 + SW + H.front, yaw = Math.atan2(-n[0], -n[1]), front = [p[0] + n[0] * off, p[1] + n[1] * off];
  return {x: front[0] + n[0] * d / 2, z: front[1] + n[1] * d / 2, yaw, front, n, w, d, road: p, treeAt: [front[0] + n[0] * (d + H.tree.back) + Math.cos(yaw) * (H.tree.side ?? 0), front[1] + n[1] * (d + H.tree.back) - Math.sin(yaw) * (H.tree.side ?? 0)]};
}
export function westReserves() {
  const out = [], sc = W.school, H = heroLot(), roads = roadPaths();
  out.push({x: sc.at[0], z: sc.at[1], r: 32}, {x: W.yard.court.at[0], z: W.yard.court.at[1], r: 30}, {x: sc.bus.at[0], z: sc.bus.at[1], r: 10});
  const lane = W.lane.pts; for (let i = 1; i < lane.length; i++) { const a = lane[i - 1], b = lane[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s <= L; s += 10) out.push({x: a[0] + (b[0] - a[0]) * s / L, z: a[1] + (b[1] - a[1]) * s / L, r: 9}); }
  out.push({x: H.x + 3, z: H.z, r: 17}, {x: H.treeAt[0], z: H.treeAt[1], r: 13}); void roads;
  const U = landmarkSlots().find(s => s.id === '4'); out.push({x: U.at[0], z: U.at[1], r: 15}); for (const [x, z, r] of W.upsideDown.clear) out.push({x, z, r});
  return out;
}

// ---- suburb fill ---------------------------------------------------------------------------------------------------------------
// A district lot (parts/city/world.js cityLots: x, z, w, d, n = street→lot normal) as a seeded pastel house.
// Phase 1E (opt-in): a no-repeat house picker: walks a seeded shuffle of the house presets and skips a preset whose roof shape, storeys
// or body colour equals either of the last two picked (neighbours never look alike at distance).
export function housePicker(R, keys = HOUSES) {
  const order = [...keys]; for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const last = []; let i = 0, sig = k => { const p = PRESETS[k]; return [p.roof, p.floors, p.palette?.body]; };
  return () => { for (let n = 0; n < order.length; n++) { const k = order[(i + n) % order.length], s = sig(k); if (last.every(q => q.every((v, j) => v !== s[j]))) { i = (i + n + 1) % order.length; last.unshift(s); last.length = Math.min(2, last.length); return k; } }
    const k = order[i++ % order.length]; last.unshift(sig(k)); last.length = Math.min(2, last.length); return k; };
}
export function houseLot(l, R, {pick = null} = {}) {
  const key = pick ? pick() : HOUSES[Math.floor(R() * HOUSES.length)], pre = PRESETS[key], yaw = l.n[0] || l.n[1] ? Math.atan2(-l.n[0], -l.n[1]) : l.yaw;
  const fp = [Math.min(pre.footprint[0], l.w + 1), Math.min(pre.footprint[1], l.d)], c = [l.x, l.z], f = at(c, yaw, 0, fp[1] / 2);
  const b = placeBuilding({...pre, footprint: fp, seed: Math.floor(R() * 1e6), id: key}, l.x, l.z, yaw, f); b.yaw = yaw; b.key = key; return b;
}
// Front-yard dressing for one placed house: white picket fence (two runs, gap at the walk), walk, driveway, mailbox; returns kit prop items.
export function lotDress(b, R, {variety = false} = {}) {   // Phase 1E (opt-in variety): + flower beds, a swing set, bikes, mailbox styles
  const yaw = b.yaw, c = [b.at[0], b.at[2]], w = b.w, d = b.d, fy = 1.5 + (W.front ?? 0), items = [], g = (x, z) => groundY(x, z) + .03, P = (u, v, y = null) => { const p = at(c, yaw, u, v); return [p[0], y ?? g(...p), p[1]]; };
  const vF = d / 2 + fy - .7, half = w / 2 + 2.4, run = half - 1.6;
  for (const sx of [-1, 1]) items.push({kind: 'fence', at: P(sx * (1.6 + run / 2), vF), yaw, len: run});
  items.push({kind: 'drive', at: P(0, d / 2 + (fy - .7) / 2), yaw, w: 1.8, d: fy - .7});
  const ds = R() < .5 ? 1 : -1; items.push({kind: 'drive', at: P(ds * (w / 2 + 2.6), (d / 2 + fy + .5 - d * .25) / 2 + d * .125 - .25), yaw, w: 3.2, d: d / 2 + fy + .5 + d * .25});
  items.push({kind: 'mailbox', at: P(-ds * (w / 2 + 3.6), d / 2 + fy - .4), yaw, colors: [['#2f6fd6', '#d8362b', '#3aa860', '#f6c630'][Math.floor(R() * 4)]], ...(variety ? {style: ['post', 'brick', 'barrel'][Math.floor(R() * 3)]} : {})});
  if (variety) {
    const pal = [['#ff5f8f', '#ffd23f', '#ffffff'], ['#b06ad9', '#ff9ec4', '#fff1a0'], ['#ff7a30', '#ffd23f', '#e53935'], ['#7ec8ff', '#ffffff', '#ff5f8f']][Math.floor(R() * 4)];
    if (R() < .75) for (const sx of [-1, 1]) items.push({kind: 'flowerBed', at: P(sx * (w / 4 + .9), d / 2 + 1.2), yaw, len: Math.max(1.6, w / 2 - 2.6), colors: pal});
    const r = R(); if (r < .3) items.push({kind: 'swings', at: P(-ds * (w / 2 + 1), -d / 2 - 3.5), yaw: yaw + Math.PI / 2});
    else if (r < .65) { items.push({kind: 'bike', at: P(ds * (w / 2 + 2.6), d / 2 + fy - 1.8), yaw: yaw + .3, colors: [['#e53935', '#2f78d4', '#3aa860', '#ff9f1c'][Math.floor(R() * 4)]]});
      if (R() < .5) items.push({kind: 'bike', at: P(-ds * (w / 4), d / 2 + fy - 2.4), yaw: yaw + 1.2, down: true, colors: ['#b06ad9']}); }
  }
  return items;
}

// ---- the west arm -----------------------------------------------------------------------------------------------------------------
export function west({houses = [], anchors = [], R = Math.random} = {}) {
  const group = new T.Group(); group.name = 'west'; const buildings = [], trees = [], stats = {};
  const g = (x, z) => groundY(x, z), Y = (x, z, o = .03) => g(x, z) + o, add = (items, name) => { if (items.length) { const m = cityProps(items, {name}); group.add(m); return m; } };
  const keep = b => { b.lodScale = 1.9; group.add(b.group); buildings.push(b); return b; };   // the hero buildings keep their near LOD out to ~65 studs

  // ---- school + bus + walk + court + playground ----
  const sc = W.school, pre = PRESETS[sc.preset], [sx, sz] = sc.at, f = at([sx, sz], sc.yaw, 0, pre.footprint[1] / 2);
  const school = keep(placeBuilding({...pre, id: 'school', seed: 5}, sx, sz, sc.yaw, f)); school.yaw = sc.yaw;
  for (const t of sc.trees) trees.push({x: t[0], z: t[1], y: g(...t) + .16, s: 1.05, r: t[0] * .1});
  const items = [], [bx, bz] = sc.bus.at;
  items.push({kind: 'bus', at: [bx, Y(bx, bz, .26), bz], yaw: sc.bus.yaw});
  { const {from, to, w} = sc.walk, L = Math.abs(to[0] - from[0]), cx = (from[0] + to[0]) / 2; items.push({kind: 'drive', at: [cx, Y(cx, from[1], .02), from[1]], yaw: 0, w: L, d: w}); }   // the walk runs east–west
  const Yd = W.yard, [x0, z0, x1, z1] = Yd.rect, C = Yd.court, cw = C.w / 2 + 1.5, cd = C.d / 2 + 1.5;
  const cy = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => g(C.at[0] + a * cw, C.at[1] + b * cd)), top = Math.max(...cy) + .1;   // level court slab on a skirt over the slope
  items.push({kind: 'court', at: [C.at[0], top, C.at[1]], w: C.w, d: C.d, depth: top - Math.min(...cy) + .3});
  for (const [x, z, yaw] of Yd.hoops) items.push({kind: 'hoop', at: [x, top + .02, z], yaw});
  items.push({kind: 'swings', at: [Yd.swings[0], Y(Yd.swings[0], Yd.swings[1]), Yd.swings[1]], yaw: Yd.swings[2]}, {kind: 'slide', at: [Yd.slide[0], Y(Yd.slide[0], Yd.slide[1]), Yd.slide[1]], yaw: Yd.slide[2]}, {kind: 'sandbox', at: [Yd.sandbox[0], Y(Yd.sandbox[0], Yd.sandbox[1]), Yd.sandbox[1]]});
  const fence = (a, b, yaw) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; items.push({kind: 'fence', style: 'wire', at: [m[0], Y(m[0], m[1]), m[1]], yaw, len: L}); };
  fence([x0, z0], [x1, z0], 0); fence([x0, z1], [x1, z1], 0); fence([x0, z0], [x0, z1], Math.PI / 2);
  fence([x1, z0], [x1, z0 + Yd.gate[0]], Math.PI / 2); fence([x1, z0 + Yd.gate[1]], [x1, z1], Math.PI / 2);
  add(items, 'schoolProps');
  // "SCHOOL BUS" plates (live text, never branded): both sides + the front band
  const bus = new T.Group(); bus.name = 'schoolBusText'; bus.position.set(bx, Y(bx, bz, .26), bz); bus.rotation.y = sc.bus.yaw;
  for (const sxn of [-1, 1]) { const p = textPlate('SCHOOL BUS', {w: 6.4, h: .55, bg: '#f7c21b', fg: '#1b1d22', maxFont: 400, name: 'schoolBusPlate'}); p.position.set(sxn * 1.7, 2.0, -1.1); p.rotation.y = sxn * Math.PI / 2; bus.add(p); }
  { const p = textPlate('SCHOOL BUS', {w: 2.7, h: .45, bg: '#f7c21b', fg: '#1b1d22', maxFont: 400, name: 'schoolBusPlate'}); p.position.set(0, 3.8, 4.03); bus.add(p); }
  group.add(bus);

  // ---- the hero's house (named location heroHouse) ----
  const H = heroLot(), hp = PRESETS[W.hero.preset];
  const hero = keep(placeBuilding({...hp, id: 'heroHouse', seed: 11}, H.x, H.z, H.yaw, H.front)); hero.yaw = H.yaw;
  const hi = [], [tx, tz] = H.treeAt, deck = W.hero.tree.deck;
  hi.push({kind: 'treehouse', at: [tx, Y(tx, tz, 0), tz], yaw: H.yaw, deck, ...(PLAN.trees ? {canopy: false} : {})});
  if (PLAN.trees) trees.push({x: tx, z: tz, y: Y(tx, tz, 0), s: 1, r: .4, kind: 'leafy', h: PLAN.trees.heights.treehouse, keep: true});   // Phase 1E: the treehouse sits in a hero tree
  const mb = at([H.x, H.z], H.yaw, -4.4, hp.footprint[1] / 2 + 1.5 + W.hero.front + .4);   // at the kerb, left of the walk: the crooked mailbox hi.push({kind: 'mailbox', at: [mb[0], Y(mb[0], mb[1], 0), mb[1]], yaw: H.yaw + .35, tilt: W.hero.mailboxTilt, colors: ['#e53935']});
  const lotC = [H.x, H.z], fy = 1.5 + W.hero.front, vF = hp.footprint[1] / 2 + fy - .7;
  for (const sxn of [-1, 1]) { const u0 = sxn < 0 ? -hp.footprint[0] / 2 - 1.2 : 1.6, u1 = sxn < 0 ? -1.6 : hp.footprint[0] / 2 + hp.garage.w + 2.2, p = at(lotC, H.yaw, (u0 + u1) / 2, vF); hi.push({kind: 'fence', at: [p[0], Y(p[0], p[1]), p[1]], yaw: H.yaw, len: u1 - u0 - .2}); }
  { const p = at(lotC, H.yaw, 0, hp.footprint[1] / 2 + (fy - .7) / 2); hi.push({kind: 'drive', at: [p[0], Y(p[0], p[1], .02), p[1]], yaw: H.yaw, w: 2, d: fy - .7});
    const q = at(lotC, H.yaw, hp.footprint[0] / 2 + hp.garage.w / 2, hp.footprint[1] / 2 - .75 + (fy + 4) / 2 - 3); hi.push({kind: 'drive', at: [q[0], Y(q[0], q[1], .02), q[1]], yaw: H.yaw, w: hp.garage.w - 1.2, d: fy + 4}); }
  add(hi, 'heroHouseProps');

  // ---- the upside-down house (slot 4) ----
  const U = landmarkSlots().find(s => s.id === '4'), UD = W.upsideDown, up = PRESETS[UD.preset], T0 = U.base;
  const ub = building({...up, id: 'upsideHouse', seed: 17});
  const pkg = new T.Group(); pkg.add(ub.group);
  { // yard package in the house frame (house on a lawn slab, fence round the slab, walk, mailbox), flipped with the house
    const [lw, ld] = UD.lawn, B = bins(), A = B.add, grass = kitMat('plastic', '#6cc24a'), soil = kitMat('plastic', '#8a6a44');
    A(grass, pbox(lw, .25, ld, 0, -.25, 0)); A(soil, pbox(lw - .3, .9, ld - .3, 0, -1.15, 0));
    const lg = B.build('lawn'); pkg.add(lg);
    const pi = [], hw = lw / 2, hd = ld / 2, F2 = (x, z, yaw, len) => pi.push({kind: 'fence', at: [x, 0, z], yaw, len});
    F2(0, -hd + .3, 0, lw - .6); F2(-hw + .3, 0, Math.PI / 2, ld - .6); F2(hw - .3, 0, Math.PI / 2, ld - .6); F2(-hw / 2 - 1.4, hd - .3, 0, hw - 2.4); F2(hw / 2 + 1.4, hd - .3, 0, hw - 2.4);
    pi.push({kind: 'drive', at: [0, .02, hd - 2.5], w: 1.8, d: 4}); pi.push({kind: 'mailbox', at: [hw - 1.4, 0, hd + .2], yaw: .2, colors: ['#2f6fd6']});
    pkg.add(cityProps(pi, {name: 'upsideYard'}));
  }
  const Tk = ub.h + .1 + Math.min(...up.footprint) * .38 + 1.2 + .25;   // chimney tip above the floor (kit chimney: h + .1 + rh + 1.2, cap .25)
  pkg.rotation.z = Math.PI; pkg.position.y = Tk - .8;   // flipped: the chimney tip is the lowest point, .8 into the grass
  const upside = new T.Group(); upside.name = 'upsideDownHouse'; upside.add(pkg); upside.position.set(U.at[0], T0, U.at[1]); upside.rotation.y = UD.yaw;
  upside.traverse(o => { if (o.isMesh) o.name = 'slot:4:' + o.name.split(':').pop(); });
  group.add(upside); ub.at = [U.at[0], T0, U.at[1]]; ub.lodScale = 1.9; ub.group.userData.flipped = true; buildings.push(ub);
  const hov = {top: T0 + Tk - .8 + .9, floor: T0 + Tk - .8};

  // ---- dressing (picket fence, walk, drive, mailbox) for the fill houses within dressR of an anchor ----
  let dressed = 0;
  for (const b of houses) {
    if (!anchors.some(a => Math.hypot(a[0] - b.at[0], a[1] - b.at[2]) < (W.dressR ?? 75))) continue;
    const items = lotDress(b, R, {variety: !!W.variety}).filter(it => !anchors.some(a => Math.hypot(a[0] - it.at[0], a[1] - it.at[2]) < 9)); const m = add(items, 'lotProps');   // nothing in a camera anchor's face if (m) dressed++;
    if (R() < .6) { const ds = R() < .5 ? -1 : 1, p = at([b.at[0], b.at[2]], b.yaw, ds * (b.w / 2 + 4), b.d / 2 + 3.5); trees.push({x: p[0], z: p[1], y: g(...p) + .05, s: .7 + R() * .25, r: R() * 6.28}); }
  }
  stats.dressedLots = dressed; stats.houses = houses.length;
  return {group, buildings, trees, stats, school, hero, hov, houseTris: houses.map(b => b.tris.near),
    onCamera(p) { for (const b of buildings) setLOD(b, lodFor(Math.hypot(p[0] - b.at[0], p[2] - b.at[2]) / (b.lodScale ?? 1))); }};
}
