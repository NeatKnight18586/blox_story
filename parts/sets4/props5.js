// parts/sets4/props5.js — Toy House E1 fix props (owner): the toys the script promises, chunky, bevelled, saturated, ≤ 800 tris.
// Never realistic guns: a fat foam toy with an orange tip and a drum, toy colours only.
//   foamBlaster(seed) · dartVolley · kart2(seed) · fountain · ballSplash   (registered in props4.js SP)
// Moving parts are pure in t: a prop may carry userData.anim(tl, p) (tl = t − p.animAt), called by engine/episode.js updateProps.
import * as T from 'three';
import {box, cyl, plastic, flat, TOY, setBevel, rnd} from './common.js';

export const PROP5_TRI_MAX = 800;
const BV = .06;
const bev = f => { const p = setBevel(BV); try { return f(); } finally { setBevel(p); } };
// blaster palettes: body / accent (owner: orange, blue, yellow, lime)
const BLASTER = [['#ff8a00', '#3a86ff'], ['#3a86ff', '#ffd542'], ['#ffd542', '#7bd850'], ['#7bd850', '#ff8a00']];
export const BLASTER_TIP = '#ff6a00';

// foam blaster: barrel along +x, top +y, grip at the origin. Oversized: 2.6 long.
export function foamBlaster(seed = 0) {
  const [c, a] = BLASTER[((seed % 4) + 4) % 4], g = new T.Group();
  bev(() => {
    g.add(box(1.9, .8, .7, c, [.55, .55, 0], {cell: 9}));                                   // body
    g.add(box(.5, 1.0, .5, a, [0, -.15, 0], {cell: 9, rot: [0, 0, .28]}));                // grip
    g.add(box(1.2, .28, .5, a, [.6, 1.06, 0], {cell: 9}));                                 // top rail
    const bar = cyl(.3, 1.0, a, [1.9, .55, 0], {seg: 10, cell: 9}); bar.rotation.z = Math.PI / 2; g.add(bar);   // barrel
    const tip = cyl(.42, .34, BLASTER_TIP, [2.5, .55, 0], {seg: 10, cell: 9}); tip.rotation.z = Math.PI / 2; g.add(tip);   // big orange tip
    const drum = cyl(.55, .5, a, [.75, -.05, 0], {seg: 10, cell: 9}); drum.rotation.x = Math.PI / 2; g.add(drum);       // drum mag
  });
  g.add(box(.5, .12, .74, '#ffffff', [-.15, .55, 0], {cell: 9}));   // stripe
  g.name = 'foamBlaster'; g.userData.grip = [0, 0, 0]; return g;
}
// as a hand tool (avatar-style/tools.js 'blaster:<seed>'): barrel along the arm (−y in the shoulder pivot), top +z
export function blasterTool(seed = 0) {
  const outer = new T.Group(), inner = foamBlaster(seed); inner.rotation.z = -Math.PI / 2; inner.position.set(0, 0, 0);
  outer.add(inner); outer.rotation.y = -Math.PI / 2; outer.scale.setScalar(.85); outer.userData.grip = 'extend'; return outer;
}

// foam darts in flight (instanced): p.darts = [{from: [x, y, z], to: [x, y, z], t0, dur = .45, arc = .6}], times in spec seconds
// (tl here = absolute t: set p.animAt = 0). Before t0 hidden; in flight along a shallow arc, nose first, a soft white trail;
// on arrival a 0.12 s pop (scale 1.5 → 1) and the dart stays stuck.
export function dartVolley() {
  const g = new T.Group(), N = 12;
  const dg = new T.CylinderGeometry(.13, .13, .9, 5); dg.rotateZ(-Math.PI / 2);   // along +x
  const tg = new T.CylinderGeometry(.19, .19, .22, 5); tg.rotateZ(-Math.PI / 2); tg.translate(.5, 0, 0);
  const body = new T.InstancedMesh(dg, plastic('#3a86ff'), N), tip = new T.InstancedMesh(tg, plastic(BLASTER_TIP), N);
  const trailM = new T.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .45, depthWrite: false}); trailM.userData.live = true;
  const tr = new T.BoxGeometry(1, .1, .1); tr.translate(-.5, 0, 0); const trail = new T.InstancedMesh(tr, trailM, N);
  for (const m of [body, tip, trail]) { m.count = 0; m.frustumCulled = false; m.userData.live = true; g.add(m); }
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), X = new T.Vector3(1, 0, 0), D = new T.Vector3();
  g.userData.anim = (t, p) => {
    let n = 0, k = 0;
    for (const d of (p.darts ?? []).slice(0, N)) {
      const dur = d.dur ?? .45, u = (t - d.t0) / dur; if (u < 0) continue;
      const v = Math.min(1, u), arc = (d.arc ?? .6) * 4 * v * (1 - v), du = .02;
      const at = w => [0, 1, 2].map(i => d.from[i] + (d.to[i] - d.from[i]) * w + (i === 1 ? (d.arc ?? .6) * 4 * w * (1 - w) : 0));
      const p0 = at(Math.min(v, 1 - du)), p1 = at(Math.min(v, 1 - du) + du); D.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize(); Q.setFromUnitVectors(X, D);
      P.fromArray(at(v)); if (arc < 0) P.y += 0;
      const pop = u >= 1 ? 1 + .5 * Math.max(0, 1 - (u - 1) * dur / .12) : 1.15;   // a little larger in flight to read
      S.setScalar(pop); M.compose(P, Q, S); body.setMatrixAt(n, M); tip.setMatrixAt(n, M); n++;
      if (u < 1) { const len = Math.min(2.6, 6 * v * Math.hypot(...[0, 1, 2].map(i => d.to[i] - d.from[i])) / 12 + .6); S.set(len, 1, 1); M.compose(P, Q, S); trail.setMatrixAt(k++, M); }
    }
    body.count = tip.count = n; trail.count = k; for (const m of [body, tip, trail]) m.instanceMatrix.needsUpdate = true;
  };
  g.name = 'dartVolley'; return g;
}

// go-kart v2: forward = +z, a seated kid (scale .84, pose 'drive') sits at the origin facing +z with hands on the wheel.
// p.smoke: tyre-smoke puffs behind the rear wheels (pure in t, looping 0.6 s).
export const KART_SEAT = {y: .95, z: -.35};   // seat top, local
export function kart2(seed = 0) {
  const g = new T.Group(), c = TOY[((seed % TOY.length) + TOY.length) % TOY.length];
  bev(() => {
    g.add(box(2.2, .55, 3.8, c, [0, .62, .1], {cell: 9}));                  // tub
    g.add(box(1.7, 1.0, .35, '#ffffff', [0, 1.35, -1.25], {cell: 9}));     // seat back
    g.add(box(2.5, .32, .45, '#2b2b2f', [0, .55, 2.15], {cell: 9}));       // bumper
    g.add(box(1.5, .3, .9, '#ffd542', [0, .95, 1.55], {cell: 9}));         // nose
  });
  for (const [x, z] of [[-1.25, 1.25], [1.25, 1.25], [-1.25, -1.15], [1.25, -1.15]]) { const w = cyl(.5, .45, '#222226', [x, .5, z], {seg: 8, cell: 9}); w.rotation.z = Math.PI / 2; g.add(w); }
  const col = box(.14, 1.0, .14, '#2b2b2f', [0, 1.35, 1.1], {cell: 9, rot: [.6, 0, 0]}), wh = new T.Mesh(new T.TorusGeometry(.36, .09, 4, 10), plastic('#2b2b2f'));
  wh.position.set(0, 1.9, .9); wh.rotation.x = -.5; g.add(col, wh);
  const pm = new T.MeshBasicMaterial({color: '#e9edf2', transparent: true, opacity: .55, depthWrite: false}); pm.userData.live = true;
  const puffs = new T.InstancedMesh(new T.IcosahedronGeometry(.45, 0), pm, 6); puffs.count = 0; puffs.frustumCulled = false; puffs.userData.live = true; g.add(puffs);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3();
  g.userData.anim = (t, p) => {
    if (!p.smoke) { puffs.count = 0; return; } let n = 0;
    for (let i = 0; i < 6; i++) { const side = i % 2 ? 1 : -1, u = ((t + i * .1) % .6) / .6, s = .5 + 1.6 * u;
      P.set(side * (1.3 + .5 * u), .4 + 1.0 * u, -1.6 - 1.8 * u); S.setScalar(s); M.compose(P, Q, S); puffs.setMatrixAt(n++, M); }
    puffs.count = n; puffs.instanceMatrix.needsUpdate = true;
  };
  g.name = 'kart2'; return g;
}

// chocolate fountain: three tiers, chocolate curtains whose stripes scroll down, drips falling between tiers (pure in t)
const chocTex = (() => { let tex = null; return () => { if (tex || typeof document === 'undefined') return tex; const cv = document.createElement('canvas'); cv.width = 16; cv.height = 64;
  const x = cv.getContext('2d'); for (let y = 0; y < 64; y++) { const k = .5 + .5 * Math.sin(y / 64 * Math.PI * 4); x.fillStyle = `rgb(${Math.round(96 + 60 * k)},${Math.round(52 + 30 * k)},${Math.round(24 + 14 * k)})`; x.fillRect(0, y, 16, 1); }
  tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.SRGBColorSpace; return tex; }; })();
export function fountain() {
  const g = new T.Group(), choc = '#7a3f1c', gold = '#ffd542';
  bev(() => {
    g.add(cyl(1.6, .5, '#ff7aa8', [0, .25, 0], {seg: 12, cell: 9}));           // base (pink)
  });
  g.add(cyl(.28, 4.2, gold, [0, 2.4, 0], {seg: 8, cell: 9}));                    // column
  for (const [r, y] of [[1.9, 1.3], [1.35, 2.6], [.8, 3.8]]) g.add(cyl(r, .28, gold, [0, y, 0], {seg: 12, cell: 9}));   // tiers
  const cm = new T.MeshBasicMaterial({color: '#ffffff', map: chocTex(), side: T.DoubleSide}); if (!cm.map) cm.color.set(choc); cm.userData.live = true;
  for (const [r, y, h] of [[1.95, .68, .9], [1.4, 1.95, 1.0], [.85, 3.2, 1.0]]) { const cu = new T.Mesh(new T.CylinderGeometry(r * .92, r, h, 12, 1, true), cm); cu.position.y = y; cu.name = 'chocCurtain'; g.add(cu); }
  const dm = new T.InstancedMesh(new T.IcosahedronGeometry(.13, 0), plastic(choc), 10); dm.frustumCulled = false; dm.userData.live = true; g.add(dm);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(1, 1.6, 1), P = new T.Vector3(), R = rnd(7), D = Array.from({length: 10}, () => [R() * Math.PI * 2, R(), R() < .5 ? 0 : 1]);
  g.userData.anim = t => {
    if (cm.map) cm.map.offset.y = (t * 1.4) % 1;   // the chocolate flows down
    D.forEach(([a, ph, tier], i) => { const r = tier ? 1.4 : 1.95, y0 = tier ? 2.45 : 1.15, u = ((t * 1.2 + ph) % 1); P.set(Math.sin(a) * (r + .05), y0 - 1.0 * u * u, Math.cos(a) * (r + .05)); M.compose(P, Q, S); dm.setMatrixAt(i, M); });
    dm.instanceMatrix.needsUpdate = true;
  };
  g.name = 'fountain'; return g;
}

// ball-pit splash burst: 36 coloured balls thrown up and out from the origin at tl = 0, ballistic, bounce once on y = 0 and rest.
export const SPLASH = {n: 36, g: 22, v: [4, 9], up: [7, 12]};
export function splashBall(i, tl) {   // pure: position of ball i at tl seconds after the burst (null before it)
  if (tl < 0) return null; const R = rnd(101 + i * 17), a = R() * Math.PI * 2, v = SPLASH.v[0] + (SPLASH.v[1] - SPLASH.v[0]) * R(), up = SPLASH.up[0] + (SPLASH.up[1] - SPLASH.up[0]) * R();
  const tLand = 2 * up / SPLASH.g, t1 = Math.min(tl, tLand), y1 = up * t1 - SPLASH.g * t1 * t1 / 2, h = v * t1;
  if (tl <= tLand) return [Math.sin(a) * h, y1 + .3, Math.cos(a) * h];
  const up2 = up * .3, t2 = Math.min(tl - tLand, 2 * up2 / SPLASH.g), y2 = up2 * t2 - SPLASH.g * t2 * t2 / 2, h2 = h + v * .3 * t2;
  return [Math.sin(a) * h2, y2 + .3, Math.cos(a) * h2];
}
export function ballSplash() {
  const g = new T.Group(), N = SPLASH.n, m = new T.InstancedMesh(new T.IcosahedronGeometry(.32, 0), plastic('#ffffff'), N);
  for (let i = 0; i < N; i++) m.setColorAt(i, new T.Color(TOY[i % TOY.length]));
  m.frustumCulled = false; m.userData.live = true; m.count = 0; g.add(m);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(1, 1, 1), P = new T.Vector3();
  g.userData.anim = tl => { let n = 0; for (let i = 0; i < N; i++) { const q = splashBall(i, tl); if (!q) continue; P.fromArray(q); M.compose(P, Q, S); m.setMatrixAt(n, M); m.setColorAt(n, new T.Color(TOY[i % TOY.length])); n++; }
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; };
  g.name = 'ballSplash'; return g;
}
export const PROPS5 = {foamBlaster, dartVolley, kart2, fountain, ballSplash};
