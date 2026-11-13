// Look test (Amendment A4, Session 8): the `egg` base town at night — the first episode world, built so it carries over.
// Locations: a round square (clock tower at 11:59 + town hall with a dragon weathervane = clue 1) ringed by 12
//   colour-coded bases (lock ring on every door pad), a ring road, a pond to the south-east, houses' gardens; the
//   cloudtop bank rises beyond the town to the north (where the nest will be).
// Unique landmark: the clock tower against the cloudtop. Ground plan: square centre (0,0) r 18, ring road r 33,
//   bases on r 47, pond (52, 44); north = −z. Palette: plaster cream, slate blue roofs, 12 team colours used only on
//   doors, roof trims, pads and eggs; story accent = egg gold.
// Borrowed principle: a base-raiding map reads at a glance because every team colour sits on the same building shape.
// Two kits from one layout (spec.kit): 'old' = the v2 kit (flat plates, Phong, block clouds), 'new' = A4 (terrain,
// suburb biome, Standard hero materials with the env map, vegetation, water, v3 sky with stars and moon, height fog).
import * as T from 'three';

export const TEAM = ['#e4574a', '#f2b632', '#2f80d1', '#9b59b6', '#1fb5a8', '#ff7aa8', '#7fc241', '#ff8c2e', '#4ad8ff', '#c0392b', '#f2e14a', '#8a6be8'];
export const LOOK = spec => spec.kit === 'old' ? null : {fog: {color: '#2a3a66', near: 80, far: 340, height: {base: 0, falloff: 5, amount: .32, near: 30}}, envPreset: 'night', envIntensity: .5, cloudCover: .55, moon: {az: 168, el: 24, size: 2.6}, starDensity: 1.6};
export const LAYER = {plaza: .14, road: .1};
const SQ = 18, ROAD = 33, BASE_R = 47, POND = [52, 44];

const OLD = {asphalt: ['plastic', '#55585f'], concrete: ['plastic'], plaster: ['plastic'], roofTile: ['slate']};   // the v2 kit had no such patterns
export function build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec}) {
  const NEW = spec.kit !== 'old', R = B.rng(11), anchors = {}, movers = [], hero = new T.Group(); hero.name = 'hero';
  const mt = (pattern, color, o = {}) => NEW ? M.std(pattern, color, o) : M.mat(OLD[pattern]?.[0] ?? pattern, OLD[pattern]?.[1] ?? color, o);
  const add = o => { hero.add(o); return o; };
  // ---- ground --------------------------------------------------------------------------------------------
  const bases = Array.from({length: 12}, (_, i) => { const a = (i + .5) / 12 * Math.PI * 2; return {i, a, x: Math.sin(a) * BASE_R, z: Math.cos(a) * BASE_R, yaw: a + Math.PI}; });
  let groundY = () => 0;
  if (NEW) {
    const bio = BI.biome('suburb');
    const controls = [{type: 'noise', amp: 1.2, scale: 45, octaves: 3}, {type: 'hill', at: [-120, -60], r: 90, h: 22}, {type: 'hill', at: [130, -40], r: 80, h: 18}, {type: 'ridge', from: [-200, -170], to: [200, -150], w: 70, h: 26},
      {type: 'hill', at: [-90, 110], r: 70, h: 12}, {type: 'pad', x0: -SQ - 2, x1: SQ + 2, z0: -SQ - 8, z1: SQ + 2, y: 0, blend: 14},
      ...bases.map(b => ({type: 'pad', x0: b.x - 8, x1: b.x + 8, z0: b.z - 8, z1: b.z + 8, y: .4 + (b.i % 3) * .3, blend: 8})),
      {type: 'valley', from: [POND[0] - 8, POND[1]], to: [POND[0] + 10, POND[1] + 6], w: 16, depth: 3.2}];
    const height = TR.heightFn({seed: 5, controls}); groundY = height;
    const terr = TR.buildTerrain({height, size: 640, chunk: 40, fine: 2, fullR: 70, focus: [[0, 10], [30, 40], [0, -30]], material: M.splatMaterial(bio.terrain.layers), splat: bio.terrain});
    scene.add(terr);
    const wat = W.water({height, x0: POND[0] - 22, x1: POND[0] + 24, z0: POND[1] - 14, z1: POND[1] + 18, y: -1.1, ...bio.water, sky: '#3a5aa0', foam: .1, envMap: look.envMap?.()});
    scene.add(wat.mesh); movers.push(wat);
    const avoid = (x, z) => Math.hypot(x, z) < ROAD + 6 || (Math.abs(x) < 26 && z > 30 && z < 90) || bases.some(b => Math.hypot(x - b.x, z - b.z) < 11) || Math.hypot(x - POND[0], z - POND[1]) < 16;
    const veg = V.vegetation({height, veg: {...bio.vegetation, flowerColors: ['#ffffff', '#9fc2ff', '#ffd23f']}, area: {x0: -150, x1: 150, z0: -150, z1: 130}, seed: 9, avoid, focus: [[0, 30], [36, 36]], nearR: 26, waterY: -1.1});
    scene.add(veg.group); movers.push(veg);
    // cloudtop bank beyond the town (the nest's world): soft white mounds lit by the moon
    const cm = new T.MeshLambertMaterial({color: '#e8ecf8', emissive: '#4a5a88', emissiveIntensity: .55, flatShading: true}), cg = [];
    for (let i = 0; i < 46; i++) { const g = new T.IcosahedronGeometry(16 + R() * 26, 1); g.scale(1.6, .7 + R() * .3, 1); g.translate(-300 + i * 13 + R() * 10, 52 + R() * 40 + Math.sin(i * .7) * 14, -330 - R() * 60); cg.push(g); }
    const bank = new T.Mesh(merge(cg), cm); bank.name = 'cloudtop'; scene.add(bank);
  } else {
    scene.add(P.plate(420, 420, {at: [0, -.2, 0], pattern: 'grass', color: '#79a85a'}));
    scene.add(P.plate(46, 32, {at: [POND[0], -.15, POND[1]], pattern: 'water', color: '#4f8fae', thick: .2}));
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 70 + R() * 80, t = PR.smallProp('tree', i); t.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); scene.add(t); }
  }
  // plaza disc and ring road (ribbons follow the ground)
  const plaza = P.cylinder(SQ, .4, {seg: 40, mat: mt('cobble', '#b9b2a6'), name: 'plaza'}); plaza.position.set(0, groundY(0, 0) + LAYER.plaza - .2, 0); scene.add(plaza);
  const ring = new T.EllipseCurve(0, 0, ROAD, ROAD, 0, Math.PI * 2), rp = ring.getPoints(64).map(p => new T.Vector3(p.x, 0, p.y)), road = new T.CatmullRomCurve3(rp, true);
  scene.add(B.ribbon(road, 8, (x, z) => groundY(x, z) + LAYER.road, {material: mt('asphalt', '#5a5d66'), tile: 6}));
  for (const k of [0, 3, 6, 9]) { const a = (k + .5) / 12 * Math.PI * 2, c = new T.LineCurve3(new T.Vector3(Math.sin(a) * (SQ - 1), 0, Math.cos(a) * (SQ - 1)), new T.Vector3(Math.sin(a) * (ROAD - 3), 0, Math.cos(a) * (ROAD - 3))); scene.add(B.ribbon(c, 5, (x, z) => groundY(x, z) + LAYER.road + .02, {material: mt('concrete', '#a8a49a')})); }
  // ---- prefabs -------------------------------------------------------------------------------------------
  const win = new T.MeshPhongMaterial({color: '#2a3550', emissive: '#ffc46b', emissiveIntensity: 0, shininess: 80}); win.userData = {window: 1};
  function base(b) {
    const g = new T.Group(), c = TEAM[b.i], w = 10 + (b.i % 3), d = 8, h = 6.5 + (b.i % 2) * 2;
    g.add(P.block([w + .6, .8, d + .6], {at: [0, .4, 0], mat: mt('concrete', '#9a978f'), cast: true}));
    g.add(P.block([w, h, d], {at: [0, .8 + h / 2, 0], mat: mt('plaster', '#efe4cf'), cast: true}));
    for (const sx of [-1, 1]) g.add(P.block([.6, h, .6], {at: [sx * w / 2, .8 + h / 2, d / 2], mat: mt('plastic', c)}));
    const roof = P.gableRoof(w, d, 3, {mat: mt('roofTile', '#5f7898'), cast: true}); roof.position.y = .8 + h; g.add(roof);
    g.add(P.block([w + 1.6, .35, .5], {at: [0, .8 + h + .1, d / 2 + .5], mat: mt('plastic', c)}));                       // team trim under the eave
    g.add(P.block([3.6, 5, .3], {at: [0, 3.3, d / 2 + .1], mat: mt('woodPlanks', c), cast: true}));                      // door
    for (const sx of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(2, 2, .2), win); m.position.set(sx * (w / 2 - 2.2), 4.2, d / 2 + .12); g.add(m); }
    const pad = new T.Mesh(new T.RingGeometry(1.6, 2.3, 32), new T.MeshBasicMaterial({color: c, fog: true})); pad.rotation.x = -Math.PI / 2; pad.position.set(0, .06, d / 2 + 3.2); g.add(pad);   // lock ring
    const egg = new T.Mesh(new T.SphereGeometry(.45, 12, 8), new T.MeshPhongMaterial({color: '#fff3c8', emissive: '#ffcf6b', emissiveIntensity: .9})); egg.scale.set(1, 1.3, 1); egg.position.set(2.6, 1.2, d / 2 + 1.6); g.add(egg);
    g.position.set(b.x, groundY(b.x, b.z), b.z); g.rotation.y = b.yaw; return g;
  }
  function clockTower() {
    const g = new T.Group(), H = 30;
    g.add(P.block([8, 1.4, 8], {at: [0, .7, 0], mat: mt('concrete', '#8f8a82'), cast: true}));
    g.add(P.block([6.4, H, 6.4], {at: [0, 1.4 + H / 2, 0], mat: mt('brick', '#a86b55'), cast: true}));
    for (const y of [10, 20]) g.add(P.block([7, .6, 7], {at: [0, y, 0], mat: mt('concrete', '#c9c2b4')}));
    g.add(P.block([7.4, 6, 7.4], {at: [0, H - 1, 0], mat: mt('plaster', '#e9dfc9'), cast: true}));
    const face = new T.MeshPhongMaterial({color: '#fff6dc', emissive: '#ffe7a8', emissiveIntensity: .8}), hand = new T.MeshBasicMaterial({color: '#1c1c22'});
    for (let k = 0; k < 4; k++) {
      const f = new T.Group(), disc = new T.Mesh(new T.CircleGeometry(2.4, 32), face); f.add(disc);
      const hh = new T.Mesh(new T.BoxGeometry(.3, 1.4, .05), hand); hh.position.set(-.04, .7, .05); hh.rotation.z = .02; f.add(hh);   // hour hand: just before twelve
      const mh = new T.Mesh(new T.BoxGeometry(.2, 2.1, .05), hand); mh.geometry.translate(0, 1.05, 0); mh.rotation.z = 2 * Math.PI / 60; mh.position.z = .07; f.add(mh);   // 11:59
      f.position.set(Math.sin(k * Math.PI / 2) * 3.75, H - 1, Math.cos(k * Math.PI / 2) * 3.75); f.rotation.y = k * Math.PI / 2; g.add(f);
    }
    const roof = P.cone(5.6, 9, {seg: 4, mat: mt('roofTile', '#4f6688'), cast: true}); roof.position.y = H + 6.5; roof.rotation.y = Math.PI / 4; g.add(roof);
    for (const [x, z] of [[1.8, -3.25], [2.4, -3.25], [3, -3.25]]) g.add(P.block([.18, 2.6, .1], {at: [x, H + 3.6, z], rot: [0, 0, 20], mat: mt('plastic', '#3a2e2a')}));   // clue 2: claw marks
    return g;
  }
  function townHall() {
    const g = new T.Group(), w = 24, d = 12, h = 10;
    g.add(P.block([w + 2, 1.2, d + 2], {at: [0, .6, 0], mat: mt('concrete', '#a7a299'), cast: true}));
    g.add(P.block([w, h, d], {at: [0, 1.2 + h / 2, 0], mat: mt('plaster', '#e6dcc6'), cast: true}));
    for (let i = 0; i < 6; i++) g.add(P.cylinder(.7, h, {at: [-w / 2 + 2 + i * (w - 4) / 5, 1.2 + h / 2, d / 2 + 1.2], seg: 10, mat: mt('concrete', '#f0e9da'), cast: true}));
    const roof = P.gableRoof(w + 2, d + 3, 4, {mat: mt('roofTile', '#5f7898'), cast: true}); roof.position.set(0, 1.2 + h, .6); g.add(roof);
    const vane = new T.Shape([[0, 0], [1.2, .5], [2.2, 0], [2.6, .9], [1.9, 1.1], [2.2, 1.8], [1.2, 1.1], [.5, 1.6], [.7, .8], [-.6, .7]].map(p => new T.Vector2(...p)));   // clue 1: a little dragon
    const vm = new T.Mesh(new T.ExtrudeGeometry(vane, {depth: .12, bevelEnabled: false}), mt('metal', '#3c3f46')); vm.position.set(-1.2, 1.2 + h + 6.3, .6); g.add(vm);
    g.add(P.cylinder(.08, 2.4, {at: [0, 1.2 + h + 5.2, .6], mat: mt('metal', '#3c3f46')}));
    return g;
  }
  const lamp = () => { const g = new T.Group(); g.add(P.cylinder(.16, 5, {at: [0, 2.5, 0], seg: 6, mat: mt('metal', '#2e3138')})); const l = new T.Mesh(new T.BoxGeometry(.7, .9, .7), new T.MeshPhongMaterial({color: '#fff1c8', emissive: '#ffc46b', emissiveIntensity: 1.4})); l.position.y = 5.3; g.add(l); return g; };
  // warm light pools under lamps and doors (additive ground decals: cheap practical light at night)
  let poolTex = null;
  const pool = (x, z, r = 5, c = '#ffb45a', o = .55) => {
    if (!poolTex && typeof document !== 'undefined') { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); poolTex = new T.CanvasTexture(cv); }
    const m = new T.Mesh(new T.PlaneGeometry(2 * r, 2 * r), new T.MeshBasicMaterial({map: poolTex, color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, fog: true}));
    m.rotation.x = -Math.PI / 2; m.position.set(x, groundY(x, z) + .3, z); m.renderOrder = 2; scene.add(m); return m; };
  // ---- placement -----------------------------------------------------------------------------------------
  for (const b of bases) add(base(b));
  const ct = clockTower(); ct.position.set(0, groundY(0, -SQ - 4), -SQ - 4); add(ct);
  const th = townHall(); th.position.set(-22, groundY(-22, -SQ - 10), -SQ - 12); th.rotation.y = .5; add(th);
  for (let i = 0; i < 8; i++) { const a = (i + .25) / 8 * Math.PI * 2, l = lamp(); l.position.set(Math.sin(a) * (SQ + 1), groundY(Math.sin(a) * (SQ + 1), Math.cos(a) * (SQ + 1)), Math.cos(a) * (SQ + 1)); add(l); if (NEW) pool(l.position.x, l.position.z, 6); }
  if (NEW) for (const b of bases) { const dx = -Math.sin(b.a), dz = -Math.cos(b.a); pool(b.x + dx * 8, b.z + dz * 8, 5, TEAM[b.i], .35); }
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4, bch = benchOf(P, mt); bch.position.set(Math.sin(a) * (SQ - 3), groundY(0, 0) + .1, Math.cos(a) * (SQ - 3)); bch.rotation.y = a; add(bch); }
  scene.add(hero);
  movers.push(A.birds({centre: [10, 46, -40], n: 4, r: 30, seed: 3}));
  for (const m of movers) if (m.group || m.object) scene.add(m.group ?? m.object);
  anchors.square = {position: [0, 0, 0], camera: {position: [0, 24, 76], target: [0, 9, -12], fov: 50}};
  anchors.street = {position: [22, 0, 24], camera: {position: [11, 4.6, 32], target: [31, 4, 11], fov: 48}};
  anchors.wide = {position: [0, 0, 0], camera: {position: [-60, 60, 150], target: [0, 10, -40], fov: 50}};
  return {anchors, groundY, update(t) { for (const m of movers) m.update?.(t); }};
}
function merge(geos) { const pos = []; for (const g of geos) { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); } const out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); return out; }
function benchOf(P, mt) { const g = new T.Group(); g.add(P.block([3.2, .2, .8], {at: [0, .9, 0], mat: mt('woodPlanks', '#8a5a36')})); for (const s of [-1, 1]) g.add(P.block([.2, .9, .7], {at: [s * 1.3, .45, 0], mat: mt('metal', '#3a3d44')})); return g; }
