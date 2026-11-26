// parts/city/living.js — Look Signature: the LIVING TOWN layer (one-time kit, data in plan.json "living") + key-art foregrounds.
//   livingTown({groundY, slots, roads, kitBuildings, focus}) → {group, movers, update(t), setFocus(names|true), stats}
//     movers: flagsHall (2 roof flags on the Hall), boats (bobbing, each with a mast flag), smoke (chimney puffs on the houses
//     nearest the hero's), gulls (white, over the bay), birds (dark, over town), fountain (droplets riding the plaza jets),
//     walkers (parts/ambient.js walkers: plaza ring, Main St, boardwalk), cars (2 kit sedans on a there-and-back road loop with
//     lanes), blimp (the GOVERNOR BLIMP: a head with top hat, monocle and mustache on a slow closed spline).
//     Every mover is pure in t (frames render in any order); all of it is `live` (never baked).
//   keyArtProps(list) → Group: the foreground elements of plan.json keyArt variants ({kind: lamp|fence|picket|railing|sign|tree, at, yaw, len}).
import * as T from 'three';
import {PLAN} from './plan.js';
import {flag, smoke, birds, walkers} from '../ambient.js';
import {cityProps} from './kit/props.js';
import {rng} from '../build.js';
import {harborLayout} from './harbor.js';
import {cityProps as kitProps} from './kit/props.js';

const LV = PLAN.living;
const live = g => { g.traverse(o => { o.userData.live = true; }); g.userData.live = true; return g; };
void kitProps;
const std = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .5, metalness: 0, ...o});

export const MOVERS = ['flagsHall', 'boats', 'smoke', 'gulls', 'birds', 'fountain', 'walkers', 'cars', 'blimp', 'fishingBoats', 'ferry', 'gullsHarbor'];   // Phase 1D: + harbor movers
// Pure: the blimp's position + heading on its closed spline at time t (period s).
export function blimpAt(t, pts = LV.blimp.pts, period = LV.blimp.period) {
  const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), true, 'centripetal'), u = ((t / period) % 1 + 1) % 1, p = c.getPointAt(u), d = c.getTangentAt(u);
  return {pos: p.toArray(), yaw: Math.atan2(d.x, d.z)};
}
// Pure: a closed there-and-back lane loop along road polylines (drive on the right): [[x, z]...]
export function laneLoop(polys, lane) {
  const pts = polys.flat(), out = [], off = (a, b, s) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [-dz / L * s, dx / L * s]; };
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], o = off(a, b, lane); out.push([pts[i][0] + o[0], pts[i][1] + o[1]]); }
  for (let i = pts.length - 1; i >= 0; i--) { const a = pts[Math.min(pts.length - 1, i + 1)], b = pts[Math.max(0, i - 1)], o = off(a, b, lane); out.push([pts[i][0] + o[0], pts[i][1] + o[1]]); }
  return out.filter((p, i, A) => !i || Math.hypot(p[0] - A[i - 1][0], p[1] - A[i - 1][1]) > .5);
}

export function governorBlimp() {   // ≈ 2.2k tris; nose = +z
  const g = new T.Group(); g.name = 'governorBlimp';
  const skin = std('#f2c79b', {roughness: .55}), black = std('#1d1f24', {roughness: .35}), gold = std('#e3b23c', {metalness: .6, roughness: .3}), white = std('#fbfaf5'), cheek = std('#e89a8a');
  const head = new T.Mesh(new T.SphereGeometry(9, 22, 12), skin); head.scale.set(1, .9, 1.35); g.add(head);   // the envelope: a long round head
  const brim = new T.Mesh(new T.CylinderGeometry(9.5, 9.5, .8, 18, 1), black); brim.position.y = 7.4; g.add(brim);
  const hat = new T.Mesh(new T.CylinderGeometry(6.2, 6.6, 9, 16, 1), black); hat.position.y = 12.1; g.add(hat);
  const band = new T.Mesh(new T.CylinderGeometry(6.7, 6.7, 1.4, 16, 1, true), gold); band.position.y = 8.6; g.add(band);
  const eyeW = new T.SphereGeometry(1.5, 10, 6), pup = new T.SphereGeometry(.7, 8, 4);
  for (const sx of [-1, 1]) { const e = new T.Mesh(eyeW, white); e.position.set(sx * 3.2, 2.6, 11.3); g.add(e); const p = new T.Mesh(pup, black); p.position.set(sx * 3.2, 2.6, 12.6); g.add(p);
    const c = new T.Mesh(new T.SphereGeometry(1.4, 8, 4), cheek); c.scale.set(1, .6, .4); c.position.set(sx * 5.2, -.4, 10.4); g.add(c); }
  const mono = new T.Mesh(new T.TorusGeometry(2.1, .32, 5, 18), gold); mono.position.set(3.2, 2.6, 12.9); g.add(mono);   // monocle on the right eye
  const glass = new T.Mesh(new T.CircleGeometry(2, 20), std('#cfe8ff', {transparent: true, opacity: .35})); glass.position.set(3.2, 2.6, 13.05); g.add(glass);
  const chain = new T.Mesh(new T.TorusGeometry(3.4, .12, 4, 16, Math.PI * .7), gold); chain.rotation.set(0, Math.PI / 2, -Math.PI / 2); chain.position.set(5.3, -.6, 11.4); g.add(chain);
  const nose = new T.Mesh(new T.SphereGeometry(1.4, 8, 6), skin); nose.position.set(0, .6, 12.6); g.add(nose);
  for (const sx of [-1, 1]) { const m = new T.Mesh(new T.TorusGeometry(2.1, .75, 6, 10, Math.PI * 1.1), black); m.rotation.set(0, 0, sx > 0 ? -.35 : Math.PI + .35); m.scale.set(1, .7, .6); m.position.set(sx * 2, -1.1, 12.2); g.add(m); }   // curled mustache
  const gond = new T.Mesh(new T.BoxGeometry(3, 1.8, 6), std('#d8362b')); gond.position.set(0, -9.6, 0); g.add(gond);
  for (const sx of [-1, 1]) { const r = new T.Mesh(new T.CylinderGeometry(.08, .08, 2.4, 4), black); r.position.set(sx * 1.2, -8, 0); g.add(r); }
  for (const [rx, rz] of [[0, 0], [0, Math.PI / 2], [0, Math.PI], [0, -Math.PI / 2]]) { const f = new T.Mesh(new T.BoxGeometry(.5, 4.2, 4.8), std('#2f78d4')); f.position.set(0, 0, -12.4); f.rotation.set(rx, 0, rz); f.translateY(3.2); g.add(f); }
  const prop = new T.Mesh(new T.BoxGeometry(5, .4, .2), black); prop.position.set(0, -9.6, -3.4); prop.name = 'blimpProp'; g.add(prop);
  return g;
}
function boat(o) {
  const g = new T.Group(), hull = std(o.color ?? '#e8483d'), wood = std('#a8774a', {roughness: .8}), white = std('#f6f4ee');
  const h = new T.Mesh(new T.BoxGeometry(2.6, 1.1, 6), hull); h.position.y = .25; g.add(h);
  const bow = new T.Mesh(new T.CylinderGeometry(0, 1.84, 2.2, 4, 1), hull); bow.rotation.set(Math.PI / 2, Math.PI / 4, 0); bow.scale.set(1, 1, .42); bow.position.set(0, .25, 4.05); g.add(bow);
  const deck = new T.Mesh(new T.BoxGeometry(2.3, .12, 5.6), wood); deck.position.y = .84; g.add(deck);
  const cab = new T.Mesh(new T.BoxGeometry(1.7, 1.2, 1.8), white); cab.position.set(0, 1.5, -1.2); g.add(cab);
  const f = flag({w: 1.4, h: .9, color: o.flag ?? '#ffd23f', pole: 4.2, seed: Math.round(o.at[0])}); f.object.position.set(0, .8, .6); g.add(f.object);
  return {g, flag: f};
}
// Phase 1D: a fishing boat (≈ 450 tris): coloured hull + trim stripe, white wheelhouse, mast + boom, a net heap, a mast flag. Bow = +z.
export function fishingBoat(o = {}) {
  const g = new T.Group(), hull = std(o.color ?? '#e8483d', {roughness: .35}), trim = std(o.trim ?? '#ffffff'), white = std('#f6f4ee'), wood = std('#b07a45', {roughness: .8}), dark = std('#2a2d33'), glass = std('#9fd3e6', {roughness: .1, metalness: .2});
  const L = o.len ?? 7.5, W = o.w ?? 2.8, h = new T.Mesh(new T.BoxGeometry(W, 1.3, L - 1.6), hull); h.position.y = .25; g.add(h);
  const bow = new T.Mesh(new T.CylinderGeometry(0, W * .71, 2.4, 4, 1), hull); bow.rotation.set(Math.PI / 2, Math.PI / 4, 0); bow.scale.set(1, 1, .5); bow.position.set(0, .25, L / 2 - .2); g.add(bow);
  const st = new T.Mesh(new T.BoxGeometry(W + .08, .22, L - 1.5), trim); st.position.y = .72; g.add(st);
  const deck = new T.Mesh(new T.BoxGeometry(W - .3, .1, L - 1.9), wood); deck.position.y = .92; g.add(deck);
  if (o.open) { for (let k = 0; k < Math.floor(L / 3); k++) { const b = new T.Mesh(new T.BoxGeometry(W - .4, .22, .5), wood); b.position.set(0, 1.25, -L / 2 + 2 + k * 3); g.add(b); } return {g, flag: {update() {}}}; }   // open boat (key-art foreground): thwarts, no cabin / mast
  const cab = new T.Mesh(new T.BoxGeometry(1.9, 1.5, 1.7), white); cab.position.set(0, 1.7, -L / 2 + 2.1); g.add(cab);
  const roof = new T.Mesh(new T.BoxGeometry(2.2, .18, 2), std(o.trim ?? '#2f78d4')); roof.position.set(0, 2.55, -L / 2 + 2.1); g.add(roof);
  const win = new T.Mesh(new T.BoxGeometry(1.6, .5, .06), glass); win.position.set(0, 2.05, -L / 2 + 2.97); g.add(win);
  const mast = new T.Mesh(new T.CylinderGeometry(.08, .1, 5, 6), wood); mast.position.set(0, 3.4, .6); g.add(mast);
  const boom = new T.Mesh(new T.CylinderGeometry(.06, .06, 3.4, 5), wood); boom.rotation.x = Math.PI / 2.6; boom.position.set(0, 2.6, 1.9); g.add(boom);
  const net = new T.Mesh(new T.SphereGeometry(.9, 8, 5).scale(1.2, .45, 1), std('#3f8f6b')); net.position.set(.4, 1.15, L / 2 - 2.2); g.add(net);
  const buoy = new T.Mesh(new T.SphereGeometry(.28, 6, 4), std('#ff8a30')); buoy.position.set(W / 2 + .1, .8, 0); g.add(buoy);
  for (const z of [-1.2, 1.2]) { const f = new T.Mesh(new T.CylinderGeometry(.22, .22, .5, 6).rotateZ(Math.PI / 2), dark); f.position.set(-W / 2 - .1, .5, z); g.add(f); }
  const fl = flag({w: 1.2, h: .8, color: o.flag ?? o.trim ?? '#ffd23f', pole: .1, seed: Math.round((o.at?.[2] ?? 3) * 7)}); fl.object.position.set(0, 5.6, .6); g.add(fl.object);
  return {g, flag: fl};
}
// Phase 1D: the bay ferry (≈ 600 tris): white hull, blue stripe, two decks, red funnel. Bow = +z.
export function ferryBoat() {
  const g = new T.Group(), white = std('#fbfaf5'), blue = std('#2f78d4'), red = std('#e53935'), dark = std('#2a2d33'), glass = std('#9fd3e6', {roughness: .1});
  const hull = new T.Mesh(new T.BoxGeometry(5.2, 1.8, 12), white); hull.position.y = .5; g.add(hull);
  const bow = new T.Mesh(new T.CylinderGeometry(0, 3.68, 3.4, 4, 1), white); bow.rotation.set(Math.PI / 2, Math.PI / 4, 0); bow.scale.set(1, 1, .5); bow.position.set(0, .5, 7.6); g.add(bow);
  const band = new T.Mesh(new T.BoxGeometry(5.3, .45, 12.1), blue); band.position.y = .3; g.add(band);
  const d1 = new T.Mesh(new T.BoxGeometry(4.4, 1.9, 8), white); d1.position.set(0, 2.35, -.8); g.add(d1);
  const w1 = new T.Mesh(new T.BoxGeometry(4.5, .7, 7.4), glass); w1.position.set(0, 2.6, -.8); g.add(w1);
  const d2 = new T.Mesh(new T.BoxGeometry(3.4, 1.3, 4), white); d2.position.set(0, 3.95, -1.4); g.add(d2);
  const w2 = new T.Mesh(new T.BoxGeometry(3.5, .5, 3.6), glass); w2.position.set(0, 4.1, -1.4); g.add(w2);
  const roof = new T.Mesh(new T.BoxGeometry(4.6, .2, 8.4), blue); roof.position.set(0, 3.35, -.8); g.add(roof);
  const fun = new T.Mesh(new T.CylinderGeometry(.55, .65, 1.8, 10), red); fun.position.set(0, 5.4, -2.4); g.add(fun);
  const ft = new T.Mesh(new T.CylinderGeometry(.58, .58, .3, 10), dark); ft.position.set(0, 6.35, -2.4); g.add(ft);
  for (let k = 0; k < 4; k++) { const r = new T.Mesh(new T.TorusGeometry(.35, .1, 5, 10), red); r.position.set(2.62, 1.2, -3 + k * 2); r.rotation.y = Math.PI / 2; g.add(r); }
  return g;
}
export function keyArtProps(list) {
  const g = new T.Group(); g.name = 'keyArtProps'; const kit = [];
  for (const p of list) {
    if (p.kind === 'lamp' || p.kind === 'fence') { kit.push({kind: p.kind, at: p.at, yaw: p.kind === 'fence' ? p.yaw - Math.PI : 0, len: p.len}); continue; }   // a fence runs from the lens toward the subject (leading line)
    if (p.kind === 'railing') {   // Phase 1D: a short jetty end of REAL planks (kit dock: CC0 wood, gaps, edge trim, piles) + a rail on one side, from the lens toward the subject side
      kit.push({kind: 'dock', at: p.at, yaw: p.yaw - Math.PI / 2, len: p.len ?? 7, w: 2.8, rails: [-1], depth: 5, seed: 3}); continue; }
    if (p.kind === 'mooring') { kit.push({kind: 'mooring', at: p.at}, {kind: 'rope', at: [p.at[0] + Math.sin(p.yaw) * .9, p.at[1], p.at[2] + Math.cos(p.yaw) * .9]}); continue; }
    if (p.kind === 'crate') { kit.push({kind: 'crate', at: p.at, yaw: p.yaw, n: 3}, {kind: 'barrel', at: [p.at[0] + Math.sin(p.yaw) * 1.5, p.at[1], p.at[2] + Math.cos(p.yaw) * 1.5]}); continue; }
    if (p.kind === 'boat') { const b = fishingBoat({color: p.color ?? '#2f78d4', trim: '#ffffff', len: p.len, w: p.w ?? 7.6, at: p.at, open: true}); b.g.position.set(p.at[0], p.at[1] - .92, p.at[2]); b.g.rotation.y = p.yaw; g.add(b.g); continue; }
    if (p.kind === 'picket') {   // a white picket fence (live, lit in real time) running from the lens toward the subject
      const white = std('#fbfaf5', {roughness: .6}), f = new T.Group(), len = p.len ?? 6, n = Math.round(len / .8);
      for (let k = 0; k < n; k++) { const pk = new T.Mesh(new T.BoxGeometry(.12, 1.45, .34), white); pk.position.set(0, .72, -len / 2 + (k + .5) * len / n); f.add(pk); }
      for (const y of [.45, 1.05]) { const rail = new T.Mesh(new T.BoxGeometry(.1, .16, len), white); rail.position.set(.12, y, 0); f.add(rail); }
      f.position.set(...p.at); f.rotation.y = p.yaw - Math.PI / 2; g.add(f); continue; }
    if (p.kind === 'sign') { const s = new T.Group(), post = new T.Mesh(new T.BoxGeometry(.2, 3.2, .2), std('#5b6270')), board = new T.Mesh(new T.BoxGeometry(1.8, 1.1, .12), std(p.color ?? '#2f9e5b'));
      post.position.y = 1.6; board.position.y = 3; s.add(post, board); s.position.set(...p.at); s.rotation.y = p.yaw; g.add(s); continue; }
    if (p.kind === 'tree') { const t = new T.Group(), trunk = new T.Mesh(new T.CylinderGeometry(.35, .45, 4, 7), std('#7a5a3c')), crown = new T.Mesh(new T.IcosahedronGeometry(2.6, 1), std('#4fae45', {flatShading: true}));
      trunk.position.y = 2; crown.position.y = 5.4; t.add(trunk, crown); t.position.set(...p.at); g.add(t); continue; }
  }
  g.children.forEach(live);   // hand-built pieces are live (lit in real time); the kit lamps / fences below are baked with their district
  if (kit.length) g.add(cityProps(kit, {name: 'keyArtKit'}));
  return g;
}

export function livingTown({groundY, slots, roads, kitBuildings = [], focus = true}) {
  const group = new T.Group(); group.name = 'cityLiving'; const movers = {}, upd = {}, R = rng(41);
  const add = (name, obj, fn) => { const g = new T.Group(); g.name = 'living:' + name; g.add(obj); group.add(g); movers[name] = g; upd[name] = fn; };
  // Hall roof flags
  { const S2 = slots.find(s => s.id === '2'), g = new T.Group(), fl = LV.flagsHall.map((p, i) => { const f = flag({w: 3.2, h: 2, color: i ? '#2f78d4' : '#e2483d', pole: 5, seed: 7 + i}); f.object.position.set(p[0], S2.base + S2.h + p[1], p[2]); g.add(f.object); return f; });
    add('flagsHall', g, t => fl.forEach(f => f.update(t))); }
  // boats
  { const g = new T.Group(), bs = LV.boats.map((o, i) => { const b = boat(o); b.g.position.set(...o.at); b.g.rotation.y = o.yaw; g.add(b.g); return {...b, o, ph: i * 1.7}; });
    add('boats', g, t => bs.forEach(b => { b.g.position.y = b.o.at[1] + Math.sin(t * 1.3 + b.ph) * .18; b.g.rotation.x = Math.sin(t * 1.1 + b.ph) * .05; b.g.rotation.z = Math.sin(t * .9 + b.ph * 2) * .07; b.flag.update(t); })); }
  // chimney smoke: brick chimneys of the houses nearest `near`
  { const near = LV.smoke.near, tops = [];
    for (const b of kitBuildings) { if (!b.group) continue; b.group.updateMatrixWorld(true); const bb = new T.Box3();
      b.group.traverse(o => { if (o.isMesh && o.material?.userData?.kit === 'brick' && o.material.color?.getHexString() === 'b8553f' && o.parent?.visible !== false) bb.expandByObject(o); });
      if (!bb.isEmpty() && bb.max.x - bb.min.x < 3) tops.push([(bb.min.x + bb.max.x) / 2, bb.max.y + .2, (bb.min.z + bb.max.z) / 2]); }
    tops.sort((a, b) => Math.hypot(a[0] - near[0], a[2] - near[1]) - Math.hypot(b[0] - near[0], b[2] - near[1]));
    const g = new T.Group(), ss = tops.slice(0, LV.smoke.n).map((p, i) => { const s = smoke({at: p, n: 6, rise: 5, period: 4.5, seed: 3 + i, color: '#eef1f5'}); g.add(s.object); return s; });
    add('smoke', g, t => ss.forEach(s => s.update(t))); }
  // gulls (white) + birds (dark)
  { const gl = birds({centre: LV.gulls.centre, n: LV.gulls.n, r: LV.gulls.r, seed: 5}); gl.object.traverse(o => { if (o.isMesh) o.material = std('#fbfaf5'); });
    add('gulls', gl.object, t => gl.update(t));
    const g = new T.Group(), bs = LV.birds.map((b, i) => { const x = birds({centre: b.centre, n: b.n, r: b.r, seed: 11 + i}); g.add(x.object); return x; }); add('birds', g, t => bs.forEach(b => b.update(t))); }
  // fountain: droplets riding the four plaza jets (the static jets are downtown.js)
  { const S1 = slots.find(s => s.id === '1'), y0 = PLAN.terrain.terrace.y + .06, n = 32, im = new T.InstancedMesh(new T.IcosahedronGeometry(.16, 0), std('#e6f7ff', {roughness: .1}), n); im.frustumCulled = false;
    const M = new T.Matrix4(), cx = S1.at[0], cz = S1.at[1];
    add('fountain', im, t => { for (let i = 0; i < n; i++) { const k = i % 4, a = (k + .5) * Math.PI / 2, u = ((t * .9 + i / n * 2.7) % 1), r = 3.3 + 2.6 * u, y = y0 + 1.6 + 2.2 * u * (1 - u) * 2.2 - u * .9;
      M.makeTranslation(cx + Math.sin(a) * r, y, cz + Math.cos(a) * r); im.setMatrixAt(i, M); } im.instanceMatrix.needsUpdate = true; }); }
  // walkers (ambient kit: townsfolk on curves)
  { const g = new T.Group(), ws = LV.walkers.map((w, i) => { const pts = w.pts.map(p => new T.Vector3(p[0], groundY(p[0], p[2]) + .1, p[2])), c = new T.CatmullRomCurve3(pts, w.closed, 'centripetal');
      const x = walkers(c, w.n, 17 + i, {closed: w.closed}); g.add(x.object); return x; });
    g.traverse(o => { if (o.isMesh) o.userData.olChar = true; }); add('walkers', g, t => ws.forEach(w => w.update(t))); }
  // cars: kit sedans on a there-and-back lane loop
  { const C = LV.cars, poly = C.road.map(k => roads[k].pts), loop = laneLoop(poly, C.lane), curve = new T.CatmullRomCurve3(loop.map(([x, z]) => new T.Vector3(x, 0, z)), true, 'centripetal'), L = curve.getLength();
    const g = new T.Group(), cars = Array.from({length: C.n}, (_, i) => { const c = cityProps([{kind: 'sedan', at: [0, 0, 0], colors: [C.colors[i % C.colors.length]]}], {name: 'livingCar' + i}); g.add(c); return {c, off: i / C.n}; });
    add('cars', g, t => cars.forEach(({c, off}) => { const u = ((off + t * C.speed / L) % 1 + 1) % 1, p = curve.getPointAt(u), d = curve.getTangentAt(u); c.position.set(p.x, groundY(p.x, p.z) + .3, p.z); c.rotation.y = Math.atan2(d.x, d.z); })); }
  // Phase 1D: fishing boats moored at the harbor piers (bobbing), the bay ferry on a slow closed loop, gulls over the harbor + beach
  { const g = new T.Group(), bs = harborLayout().boats.map((o, i) => { const b = fishingBoat(o); b.g.position.set(...o.at); b.g.rotation.y = o.yaw; g.add(b.g); return {...b, o, ph: i * 1.3}; });
    add('fishingBoats', g, t => bs.forEach(b => { b.g.position.y = b.o.at[1] + Math.sin(t * 1.2 + b.ph) * .16; b.g.rotation.x = Math.sin(t * 1.05 + b.ph) * .04; b.g.rotation.z = Math.sin(t * .85 + b.ph * 2) * .06; b.flag.update(t); })); }
  { const F = LV.ferry, f = ferryBoat(), c = new T.CatmullRomCurve3(F.pts.map(p => new T.Vector3(...p)), true, 'centripetal');
    add('ferry', f, t => { const u = ((t / F.period) % 1 + 1) % 1, p = c.getPointAt(u), d = c.getTangentAt(u); f.position.set(p.x, Math.sin(t * .9) * .12, p.z); f.rotation.set(Math.sin(t * .7) * .02, Math.atan2(d.x, d.z), Math.sin(t * .8) * .025); }); }
  { const g = new T.Group(), fs = LV.gullsHarbor.map((b, i) => { const x = birds({centre: b.centre, n: b.n, r: b.r, seed: 31 + i}); x.object.traverse(o => { if (o.isMesh) o.material = std('#fbfaf5'); }); g.add(x.object); return x; });
    add('gullsHarbor', g, t => fs.forEach(x => x.update(t))); }
  // the Governor blimp
  { const b = governorBlimp(); b.scale.setScalar(LV.blimp.scale ?? 1); const prop = b.getObjectByName('blimpProp');
    add('blimp', b, t => { const s = blimpAt(t); b.position.set(...s.pos); b.rotation.set(0, s.yaw, 0); b.position.y += Math.sin(t * .4) * .6; prop.rotation.z = t * 9; }); }
  live(group);
  let on = new Set(MOVERS);
  const setFocus = f => { on = new Set(f === true || f == null ? MOVERS : [].concat(f)); for (const [k, g] of Object.entries(movers)) g.visible = on.has(k); };
  setFocus(focus); void R;
  const tris = {}; for (const [k, g] of Object.entries(movers)) { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); tris[k] = Math.round(n); }
  return {group, movers, setFocus, get focus() { return [...on]; }, stats: {tris, total: Object.values(tris).reduce((a, b) => a + b, 0)},
    update(t) { for (const k of on) upd[k]?.(t); }};
}
