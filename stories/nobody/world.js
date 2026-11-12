// World: "Nobody" — a walled hill kingdom seen from the field outside it.
// Locations: Field of Stones (south, outside the wall, ~80 stones with sword hilts in loose rings,
//   the hero's big stone near the centre); the gatehouse + curtain wall with round towers; a curved
//   main street of timber-frame houses up to the market square (well, stalls, chapel tower); the
//   castle on a terraced mound to the north, whose south wall is where the dragon lands.
// Unique landmark: the Field of Stones (ringed stones, each with a hilt), seen against the town.
// Ground plan: +z is south. Field centre (0, 70); wall along z = 30 with the gate at x = 0; street
//   curves from the gate to the square (centre (0, -14)); terraces step up north from z = -32;
//   castle mound top y = 18 from z = -70 to -108. World ≈ 180 units across inside a ring of far hills.
// Palette (≤ 5 hues + accent): timber brown, cream plaster, grey-blue stone (walls, roofs), meadow
//   green, sky blue (glass, banners). Accent #ff2e63 is the hero's scarf only.
// Borrowed principle: the stacked hill-town silhouette — each terrace higher than the one in front,
//   so the castle reads from the field AND from the square (three depth planes in every wide).
// Tiers: hero (field, gate, street, square, dragon wall: full craft rules), mid (terrace houses:
//   shapes, roofs, window recesses), far (hills, forest: flat silhouettes, no shadows).
import * as T from 'three';

const C = {stone: '#8d9aae', stoneDk: '#6c7a8f', timber: '#7a5233', timberDk: '#5a3a22', cream: '#f2e6c8', roof: '#5f7898',
  thatch: '#d9b26a', grass: '#7cc36a', grassDk: '#5fa552', path: '#d8c49a', cobble: '#c9c0b0', sky: '#9fd3ff', banner: '#3f6fb5', blade: '#d7dde6', gold: '#f2c230'};

export function build(scene, {P, B, A, M}) {
  const R = B.rng(7), anchors = {}, movers = [], hero = new T.Group(), mid = new T.Group(), far = new T.Group();
  hero.name = 'hero'; mid.name = 'mid'; far.name = 'far';
  const add = (g, o) => { g.add(o); return o; };
  const winMat = new T.MeshPhongMaterial({color: C.sky, map: M.patternTexture('glass'), emissive: '#ffb84a', emissiveIntensity: 0, shininess: 90, specular: '#888888'});
  winMat.userData = {pattern: 'glass', window: 1};

  // ---- prefabs (seeded) ---------------------------------------------------------------------------
  // Timber-frame house facing +z: plinth, plaster walls, corner posts, floor beams, framed windows
  // with sills, door frame + lintel, gable roof with overhang, gable ends, chimney. Storeys 10.5 tall.
  function house(seed, {w = 12, d = 10, storeys = 1, thatched = false, tier = 'hero', chimneyOut = null} = {}) {
    const r = B.rng(seed), g = new T.Group(), H = storeys * 10.5, cast = tier === 'hero', crafted = tier === 'hero';
    const wallC = r() < .3 ? '#efe0bd' : C.cream;
    g.add(P.block([w + .6, 1.2, d + .6], {at: [0, .6, 0], pattern: 'brick', color: C.stone, cast}));
    g.add(P.block([w, H, d], {at: [0, 1.2 + H / 2, 0], color: wallC, cast}));
    if (crafted) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(P.block([.7, H, .7], {at: [sx * (w / 2), 1.2 + H / 2, sz * (d / 2)], pattern: 'woodPlanks', color: C.timber, cast}));
      for (let s = 1; s <= storeys; s++) for (const sz of [-1, 1]) g.add(P.block([w + .5, .5, .4], {at: [0, 1.2 + s * 10.5 - .25, sz * (d / 2 + .1)], pattern: 'woodPlanks', color: C.timber}));
      if (storeys > 1) for (const sx of [-1, 1]) g.add(P.block([.4, 7, .3], {at: [sx * w / 4, 1.2 + 10.5 + 4.5, d / 2 + .12], rot: [0, 0, sx * 32], pattern: 'woodPlanks', color: C.timber}));
    }
    const doorX = (r() - .5) * (w - 8);
    g.add(P.block([4.8, 7.6, .5], {at: [doorX, 1.2 + 3.8, d / 2 + .1], pattern: 'woodPlanks', color: C.timberDk}));
    g.add(P.block([4, 7, .5], {at: [doorX, 1.2 + 3.5, d / 2 + .25], pattern: 'woodPlanks', color: C.timber}));
    g.add(P.block([5.4, .6, .8], {at: [doorX, 1.2 + 7.9, d / 2 + .25], color: C.stone}));
    for (let s = 0; s < storeys; s++) for (const wx of [-1, 1]) {
      const x = s === 0 ? (doorX > 0 ? -1 : 1) * w / 4 * (wx > 0 ? 1 : 1.6) : wx * w / 4, y = 1.2 + s * 10.5 + 5.2;
      if (s === 0 && wx < 0) continue;
      g.add(P.block([3.2, 3.6, .3], {at: [x, y, d / 2 + .12], pattern: 'woodPlanks', color: C.timber}));
      const pane = new T.Mesh(new T.BoxGeometry(2.4, 2.8, .2), winMat); pane.position.set(x, y, d / 2 + .25); g.add(pane);
      if (crafted) g.add(P.block([3.6, .35, .9], {at: [x, y - 2, d / 2 + .4], color: C.stone}));
    }
    if (crafted) for (const sx of [-1, 1]) for (let s = 0; s < storeys; s++) {   // side walls: beam + framed window (no flat wall > 8×8)
      const y = 1.2 + s * 10.5 + 5.2;
      g.add(P.block([.3, 3.6, 3.2], {at: [sx * (w / 2 + .12), y, 0], pattern: 'woodPlanks', color: C.timber}));
      const pane = new T.Mesh(new T.BoxGeometry(.2, 2.8, 2.4), winMat); pane.position.set(sx * (w / 2 + .25), y, 0); g.add(pane);
      g.add(P.block([.9, .35, 3.6], {at: [sx * (w / 2 + .4), y - 2, 0], color: C.stone}));
      g.add(P.block([.4, .5, d + .5], {at: [sx * (w / 2 + .1), 1.2 + s * 10.5 + 9.5, 0], pattern: 'woodPlanks', color: C.timber}));
    }
    const rh = d * .45;
    g.add(P.gableRoof(w, d, rh, {at: [0, 1.2 + H, 0], pattern: thatched ? 'thatch' : 'slate', color: thatched ? C.thatch : C.roof, overhang: .8, cast}));
    for (const sx of [-1, 1]) g.add(P.gableEnd(d, rh, .3, {at: [sx * (w / 2 - .15), 1.2 + H, 0], color: wallC}));
    const chX = (r() < .5 ? -1 : 1) * w / 3;
    g.add(P.block([1.6, rh + 3, 1.6], {at: [chX, 1.2 + H + (rh + 3) / 2, -d / 6], pattern: 'brick', color: C.stoneDk, cast}));
    if (chimneyOut) chimneyOut.push([g, [chX, 1.2 + H + rh + 3.2, -d / 6]]);
    return g;
  }
  // Round tower with a crenellated rim and a cone roof.
  function tower(r = 4, h = 15, {roof = true, cast = true} = {}) {
    const g = new T.Group();
    g.add(P.cylinder(r, h, {at: [0, h / 2, 0], pattern: 'brick', color: C.stone, seg: 14, cast}));
    g.add(P.cylinder(r + .5, 1.2, {at: [0, h + .6, 0], color: C.stoneDk, seg: 14, cast}));
    if (roof) g.add(P.cone(r + 1.2, r * 1.6, {at: [0, h + 1.2 + r * .8, 0], pattern: 'slate', color: C.roof, seg: 14, cast, flat: true}));
    for (const a of [0, 2.1, 4.2]) g.add(P.block([.9, 2, .25], {at: [Math.sin(a) * (r + .05), h * .55, Math.cos(a) * (r + .05)], rot: [0, a * 57.3, 0], color: '#2b2f36'}));   // arrow slits
    return g;
  }
  // Curtain wall run along +x: wall body, plinth, pilasters, string course, merlons (instanced).
  function wallRun(len, h = 10, t = 2.4, {cast = true} = {}) {
    const g = new T.Group();
    g.add(P.block([len, h, t], {at: [0, h / 2, 0], pattern: 'brick', color: C.stone, cast}));
    g.add(P.block([len + .4, 1.4, t + .8], {at: [0, .7, 0], color: C.stoneDk, cast}));
    g.add(P.block([len + .2, .5, t + .5], {at: [0, h - .9, 0], color: C.stoneDk}));
    for (const p of B.row(Math.floor(len / 7), 7, {from: [-len / 2 + 3.5, 0, 0]})) for (const sz of [-1, 1]) g.add(P.block([1.2, h - 1.4, .5], {at: [p.at[0], (h - 1.4) / 2, sz * (t / 2 + .2)], color: C.stoneDk}));
    const merlon = P.block([1.2, 1.4, t], {pattern: 'brick', color: C.stone});
    g.add(B.instance(merlon, B.row(Math.floor(len / 2.4), 2.4, {from: [-len / 2 + 1.2, h + .7, 0]}), {cast}));
    return g;
  }
  // Gatehouse: two square towers, an arch, a raised portcullis, banners.
  function gatehouse() {
    const g = new T.Group();
    for (const sx of [-1, 1]) {
      g.add(P.block([8, 17, 8], {at: [sx * 8, 8.5, 0], pattern: 'brick', color: C.stone, cast: true}));
      g.add(P.block([9, 1.4, 9], {at: [sx * 8, 17.7, 0], color: C.stoneDk, cast: true}));
      g.add(P.cone(6.6, 6, {at: [sx * 8, 21.4, 0], seg: 4, rot: [0, 45, 0], pattern: 'slate', color: C.roof, cast: true, flat: true}));
      for (const z of [-4.05, 4.05]) { g.add(P.block([2.6, 3.6, .5], {at: [sx * 8, 11, z], color: C.stoneDk})); g.add(P.block([2, 3, .3], {at: [sx * 8, 11, z * 1.04], color: '#2b2f36'})); }
      g.add(P.block([8.8, 1.6, 8.8], {at: [sx * 8, .8, 0], color: C.stoneDk, cast: true}));                                    // plinth
      for (const cx of [-1, 1]) for (const cz of [-1, 1]) g.add(P.block([1, 15.4, 1], {at: [sx * 8 + cx * 3.8, 9.3, cz * 3.8], color: C.stoneDk}));   // corner quoins
      g.add(P.block([8.4, .5, 8.4], {at: [sx * 8, 6.5, 0], color: C.stoneDk}));                                              // string course
      const f = A.flag({w: 2.6, h: 1.8, color: C.banner, pole: 5, seed: 30 + sx}); f.object.position.set(sx * 8, 24, 0); movers.push(f); g.add(f.object);
    }
    g.add(P.arch(8, 14, 6, {ow: 6, oh: 10, at: [0, 0, 0], pattern: 'brick', color: C.stone, cast: true}));
    g.add(P.block([9, 1.2, 7], {at: [0, 14.6, 0], color: C.stoneDk, cast: true}));
    const port = P.truss(6, 1.6, {color: '#4a4f57'}); port.position.set(0, 10.2, 0); g.add(port);
    return g;
  }
  // Market stall: four posts, a counter, a striped awning (cream / banner blue), goods.
  function stall(seed) {
    const r = B.rng(seed), g = new T.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(P.block([.4, 6, .4], {at: [sx * 3, 3, sz * 2], pattern: 'woodPlanks', color: C.timber, cast: true}));
    g.add(P.block([6.6, 2.2, 1.6], {at: [0, 1.1, 1.6], pattern: 'woodPlanks', color: C.timber, cast: true}));
    for (let i = 0; i < 6; i++) g.add(P.block([1.1, .25, 5.2], {at: [-2.75 + i * 1.1, 6.3 + (i % 2) * .02, 0], rot: [-10, 0, 0], color: i % 2 ? C.cream : C.banner, cast: true}));
    for (let i = 0; i < 4; i++) g.add(P.sphere(.42, {at: [-2 + i * 1.3, 2.6, 1.6], color: ['#e2483d', C.gold, '#7cc36a', '#f39c34'][Math.floor(r() * 4)]}));
    return g;
  }
  function well() {
    const g = new T.Group();
    g.add(P.cylinder(2.6, 2.2, {at: [0, 1.1, 0], pattern: 'brick', color: C.stone, seg: 12, cast: true}));
    g.add(P.cylinder(2.2, .1, {at: [0, 2.0, 0], pattern: 'water', color: '#5aa7d6', seg: 12}));
    for (const sx of [-1, 1]) g.add(P.block([.4, 5.4, .4], {at: [sx * 2.3, 4.6, 0], pattern: 'woodPlanks', color: C.timber, cast: true}));
    g.add(P.gableRoof(5.6, 3.4, 1.4, {at: [0, 7.2, 0], color: C.roof, overhang: .6, cast: true}));
    g.add(P.cylinder(.3, 4, {at: [0, 6.2, 0], rot: [0, 0, 90], color: C.timber, seg: 6}));
    return g;
  }
  // Tree: trunk + stacked leaf blocks (far tier: no shadows, two blocks).
  function tree(seed, tier = 'mid') {
    const r = B.rng(seed), g = new T.Group(), s = .8 + r() * .5, cast = tier !== 'far';
    g.add(P.block([.9 * s, 4 * s, .9 * s], {at: [0, 2 * s, 0], pattern: 'woodPlanks', color: C.timberDk, cast}));
    const n = tier === 'far' ? 2 : 3;
    for (let i = 0; i < n; i++) g.add(P.block([(4.4 - i) * s, 2.4 * s, (4.4 - i) * s], {at: [(r() - .5) * .6, (4.6 + i * 2) * s, (r() - .5) * .6], rot: [0, r() * 90, 0], color: i ? C.grass : C.grassDk, cast, flat: true}));
    return g;
  }
  // Clutter in a cluster of three: barrel, crate, sack (brief §7.3.5).
  function clutter(seed) {
    const r = B.rng(seed), g = new T.Group();
    g.add(P.cylinder(.8, 1.8, {at: [0, .9, 0], pattern: 'woodPlanks', color: C.timber, seg: 8, cast: true}));
    g.add(P.block([1.6, 1.6, 1.6], {at: [1.7, .8, .3], rot: [0, 8 + r() * 10, 0], pattern: 'woodPlanks', color: '#a97c4a', cast: true}));
    g.add(P.sphere(.75, {at: [.9, .55, 1.4], scale: [1, .75, .9], color: C.thatch, cast: true}));
    g.rotation.y = r() * Math.PI * 2; return g;
  }
  // Chapel: nave with buttresses, a bell tower and spire (≈ 32 tall: the dragon is bigger).
  function chapel() {
    const g = new T.Group();
    g.add(P.block([11, 1.2, 20], {at: [0, .6, 0], color: C.stoneDk, cast: true}));
    g.add(P.block([10, 10, 19], {at: [0, 6.2, 0], color: C.cream, cast: true}));
    for (const sx of [-1, 1]) for (const z of [-6, 0, 6]) g.add(P.wedge(1, 7, 2, {at: [sx * 5.8, 4.7, z], rot: [0, sx * 90, 0], color: C.stone, cast: true}));
    for (const sx of [-1, 1]) for (const z of [-3, 3]) { g.add(P.block([.3, 4.6, 2], {at: [sx * 5.05, 7, z], pattern: 'woodPlanks', color: C.timber})); const p = new T.Mesh(new T.BoxGeometry(.2, 3.8, 1.4), winMat); p.position.set(sx * 5.15, 7, z); g.add(p); }
    g.add(P.gableRoof(10, 19, 5, {at: [0, 11.2, 0], rot: [0, 90, 0], color: C.roof, cast: true}));
    g.add(P.block([7, 22, 7], {at: [0, 11, 12], pattern: 'brick', color: C.stone, cast: true}));
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) g.add(P.block([.9, 21, .9], {at: [cx * 3.3, 11, 12 + cz * 3.3], color: C.stoneDk}));            // corner pilasters
    for (const [x, z, ry] of [[0, 15.55, 0], [0, 8.45, 0], [3.55, 12, 90], [-3.55, 12, 90]]) { g.add(P.arch(3, 4.5, .4, {at: [x, 16.5, z], rot: [0, ry, 0], ow: 1.8, oh: 3.8, color: C.stoneDk})); g.add(P.block([1.8, 3, .1], {at: [x, 18, z], rot: [0, ry, 0], color: '#2b2f36'})); }   // belfry openings
    g.add(P.block([7.6, .5, 7.6], {at: [0, 9, 12], color: C.stoneDk}));                                                       // string course
    g.add(P.block([7.8, 1, 7.8], {at: [0, 22.5, 12], color: C.stoneDk, cast: true}));
    g.add(P.cone(5.4, 9, {at: [0, 27.5, 12], seg: 4, rot: [0, 45, 0], pattern: 'slate', color: C.roof, cast: true, flat: true}));
    g.add(P.arch(4, 6, 1, {at: [0, 1.2, 15.6], ow: 2.8, oh: 5, color: C.timberDk}));
    return g;
  }

  // ---- ground: meadow, field terraces, path with edge stones, verge, patches ----------------------
  far.add(P.plate(420, 420, {at: [0, -.2, 0], pattern: 'grass', color: C.grass}));
  hero.add(P.plate(70, 44, {at: [0, .05, 70], pattern: 'grass', color: '#84c871', thick: .3}));
  hero.add(P.plate(46, 30, {at: [0, .25, 72], pattern: 'grass', color: '#8acd76', thick: .3}));
  const pathC = new T.CatmullRomCurve3([[0, .3, 120], [-4, .3, 96], [4, .3, 70], [0, .3, 46], [0, .3, 31]].map(v => new T.Vector3(...v)));
  const pathX = z => { let best = 0, d = 1e9; for (let i = 0; i <= 60; i++) { const q = pathC.getPointAt(i / 60); if (Math.abs(q.z - z) < d) { d = Math.abs(q.z - z); best = q.x; } } return best; };
  for (const p of B.along(pathC, 30)) hero.add(P.plate(5, 3.4, {at: p.at, rot: [0, p.rotY * 57.3, 0], pattern: 'sand', color: C.path, thick: .2}));
  hero.add(B.instance(P.block([.8, .5, .7], {color: C.stone}), B.along(pathC, 26, {offset: 3.2}).concat(B.along(pathC, 26, {offset: -3.2}))));
  far.add(B.instance(P.plate(6, 4, {pattern: 'grass', color: C.grassDk, thick: .2}), B.scatter({x0: -110, x1: 110, z0: 34, z1: 140, y: .02}, 11, .9, (x, z) => Math.abs(x) < 26 && z > 50 && z < 92)));

  // ---- Field of Stones: ~80 stones in loose rings, each with a sword hilt (instanced) --------------
  const FC = [0, 0, 70], rings = [[6, 8], [11, 16], [16, 24], [21, 32]];
  const HS = [3, .4, 64];   // the hero's stone (no ring stone may crowd it)
  const stones = rings.flatMap(([r, n], k) => B.ringOf(n, r, {centre: FC, phase: k * .37, jitter: .5, seed: 40 + k})).map(p => ({...p, at: [p.at[0], .4, p.at[2]], s: .85 + R() * .3}))
    .filter(p => Math.hypot(p.at[0] - HS[0], p.at[2] - HS[2]) > 4.2 && Math.abs(p.at[0] - pathX(p.at[2])) > 3.4);
  const rockGeo = (() => { const g = new T.Group(); [[1.5, 1.1, 1.3, 0, .55, 0, 0], [1.0, .8, 1.0, .35, .85, .2, .4], [.9, .7, .9, -.4, .4, -.3, -.3]].forEach(([w, h, d, x, y, z, ry]) => g.add(P.block([w, h, d], {at: [x, y, z], rot: [0, ry * 57.3, 0]}))); return g; })();
  for (const [i, m] of rockGeo.children.entries()) {
    const im = B.instance(Object.assign(m.clone(), {material: M.mat('plastic', i ? C.stone : C.stoneDk, {flat: true})}), stones.map(p => ({...p, at: [p.at[0] + Math.cos(p.rotY) * m.position.x * p.s, p.at[1] + m.position.y * p.s, p.at[2] - Math.sin(p.rotY) * m.position.x * p.s]})), {cast: true});
    hero.add(im);
  }
  const hilt = [[P.block([.07, .9, .26], {color: C.blade}), 1.5], [P.block([.16, .14, .8], {color: C.gold}), 1.98], [P.block([.18, .7, .18], {pattern: 'woodPlanks', color: C.timber}), 2.38], [P.block([.26, .22, .26], {color: C.gold}), 2.8]];
  for (const [m, y] of hilt) hero.add(B.instance(m, stones.map(p => ({...p, at: [p.at[0], p.at[1] + (y - .4) * p.s, p.at[2]]})), {cast: true}));
  // The hero's stone: the twist prop. A giant faceted block, sword sunk deep (it is a hammer).
  const heroStone = new T.Group(); heroStone.name = 'heroStone'; heroStone.userData.keep = true; heroStone.position.set(...HS);
  [[2.2, 1.7, 2.0, 0, .85, 0, 0], [1.5, 1.2, 1.4, .55, 1.3, .3, .5], [1.3, 1.1, 1.3, -.6, .6, -.4, -.4], [1.2, .9, 1.1, .2, .5, .8, .2]].forEach(([w, h, d, x, y, z, ry]) => heroStone.add(P.block([w, h, d], {at: [x, y, z], rot: [0, ry * 57.3, 0], color: C.stone, flat: true, cast: true})));
  [[[.07, 1.0, .26], 2.2, C.blade], [[.16, .14, .8], 2.76, C.gold], [[.18, .7, .18], 3.18, C.timber], [[.26, .22, .26], 3.6, C.gold]].forEach(([s, y, c]) => heroStone.add(P.block(s, {at: [0, y, -.2], color: c, cast: true})));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; heroStone.add(P.block([1.6, .08, .12], {at: [Math.sin(a) * 2.1, -.33, Math.cos(a) * 2.1], rot: [0, a * 57.3, 0], color: '#3b3226'})); }   // the cracks (clue)
  hero.add(heroStone);
  B.anchor(anchors, 'heroStone', [HS[0], 0, HS[2] - 1.1], 0, {hilt: [HS[0], 3.4, HS[2] - .2], camera: {position: [HS[0] + 5.5, 4.6, HS[2] + 6], target: [HS[0], 3.4, HS[2]], fov: 40}});
  B.anchor(anchors, 'field', [0, 0, 70], Math.PI, {camera: {position: [-3, 3.2, 104], target: [0, 7, 40], fov: 55}});
  const mill = new T.Group(); mill.position.set(-48, 0, 82);
  mill.add(P.cylinder(3, 12, {rTop: 2.2, at: [0, 6, 0], color: C.cream, seg: 8, cast: true}), P.cone(3.2, 4, {at: [0, 14, 0], seg: 8, pattern: 'thatch', color: C.thatch, cast: true}));
  const sails = new T.Group(); sails.position.set(0, 11, 3.2); for (let i = 0; i < 4; i++) { const s = P.block([1.4, 8, .2], {at: [0, 4.2, 0], pattern: 'woodPlanks', color: C.timber, cast: true}); const arm = new T.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(s); sails.add(arm); }
  mill.add(sails); movers.push(A.spinner(sails, {axis: 'z', speed: .5})); hero.add(mill);
  movers.push(A.birds({centre: [0, 26, 60], n: 5, r: 16, seed: 3}), A.birds({centre: [10, 44, -20], n: 4, r: 20, seed: 9}));

  // ---- Curtain wall, towers, gatehouse ------------------------------------------------------------
  for (const [x0, x1] of [[-74, -8], [8, 74]]) { const w = wallRun(x1 - x0); w.position.set((x0 + x1) / 2, 0, 30); hero.add(w); }
  for (const x of [-74, -46, -20, 20, 46, 74]) { const t = tower(4, 15); t.position.set(x, 0, 30); hero.add(t); }
  for (const z of [0, -28]) for (const sx of [-1, 1]) { const w = wallRun(28, 10, 2.4, {cast: false}); w.rotation.y = Math.PI / 2; w.position.set(sx * 74, 0, z + 16); mid.add(w); }
  const gate = gatehouse(); gate.position.set(0, 0, 30); hero.add(gate);
  B.anchor(anchors, 'gate', [0, 0, 36], Math.PI, {camera: {position: [13, 5.5, 74], target: [0, 11, 30], fov: 46}});

  // ---- Main street: a curve from the gate to the square, houses both sides ------------------------
  const chim = [];
  const street = new T.CatmullRomCurve3([[0, .05, 27], [7, .05, 18], [6, .05, 9], [1, .05, 3]].map(v => new T.Vector3(...v)));
  for (const p of B.along(street, 7)) hero.add(P.plate(13, 4.2, {at: p.at, rot: [0, p.rotY * 57.3, 0], pattern: 'cobble', color: C.cobble, thick: .12}));
  // The street is short and bends, so its four houses are placed by hand, fronts on the street edge.
  [[-5, 19.5, 90], [-5.5, 8, 90], [19, 19.5, -90], [18.5, 8, -90]].forEach(([x, z, ry], i) => {
    const h = house(100 + i, {w: 11, d: 9, storeys: 1 + (i % 2), thatched: i === 2, chimneyOut: i < 2 ? chim : null});
    h.position.set(x, 0, z); h.rotation.y = ry * Math.PI / 180; hero.add(h);
  });
  B.anchor(anchors, 'street', [4, 0, 18], Math.PI, {camera: {position: [-3, 5, 31], target: [6, 5, 6], fov: 50}});

  // ---- Market square: cobbles, well, stalls, clutter clusters, chapel, houses ---------------------
  const S = [0, 0, -14];
  hero.add(P.plate(46, 34, {at: [S[0], .08, S[2]], pattern: 'cobble', color: C.cobble, thick: .1}));
  const wl = well(); wl.position.set(...S); hero.add(wl);
  [[-14, 5, 90], [-14, -8, 90], [-3, -13, 0]].forEach(([x, z, ry], i) => { const s = stall(200 + i); s.position.set(S[0] + x, 0, S[2] + z); s.rotation.y = ry * Math.PI / 180; hero.add(s); });
  [[-19, 11], [9, 11], [-19, -13]].forEach(([x, z], i) => { const c = clutter(300 + i); c.position.set(S[0] + x, 0, S[2] + z); hero.add(c); });
  const ch = chapel(); ch.position.set(S[0] + 19, 0, S[2] - 12); hero.add(ch);   // tower at the square's east edge, clear of the castle sightline
  const fc = A.flag({w: 2.2, h: 1.4, color: C.banner, pole: 4, seed: 41}); fc.object.position.set(S[0] + 19, 32, S[2]); movers.push(fc); hero.add(fc.object);
  [[-28, 3, 90], [-28, -12, 90], [31, 8, -90]].forEach(([x, z, ry], i) => {
    const h = house(400 + i, {w: 12, d: 10, storeys: 2, chimneyOut: i === 1 ? chim : null}); h.position.set(S[0] + x, 0, S[2] + z); h.rotation.y = ry * Math.PI / 180; hero.add(h);
  });
  const sq = new T.CatmullRomCurve3([[-8, .1, 9], [9, .1, 9], [9, .1, -9], [-8, .1, -10]].map(v => new T.Vector3(v[0] + S[0], v[1], v[2] + S[2])), true);
  const sqWalk = A.walkers(sq, 4, 17); movers.push(sqWalk); hero.add(sqWalk.object);
  const stWalk = A.walkers(street, 2, 23, {closed: false}); movers.push(stWalk); hero.add(stWalk.object);
  B.anchor(anchors, 'square', S, Math.PI, {camera: {position: [5, 11, S[2] + 20], target: [1, 12, S[2] - 34], fov: 52}});   // on the street centreline, between the street houses

  // ---- Terraces and the castle (stacked hill-town silhouette) -------------------------------------
  for (const [z0, z1, y, w] of [[-32, -56, 4, 150], [-54, -74, 10, 120], [-70, -108, 18, 70]]) {
    const z = (z0 + z1) / 2, d = Math.abs(z1 - z0);
    mid.add(P.block([w, y, d], {at: [0, y / 2, z], pattern: 'brick', color: C.stone, cast: y > 12}));
    mid.add(P.plate(w, d, {at: [0, y + .2, z], pattern: 'grass', color: C.grass}));
  }
  const stairsUp = P.stairs(8, {w: 6, rise: .5, run: 1.2, pattern: 'cobble', color: C.cobble}); stairsUp.position.set(-30, 0, -36); stairsUp.rotation.y = Math.PI; mid.add(stairsUp);
  [[-50, -40, 4], [-30, -46, 4], [30, -42, 4], [52, -46, 4], [-36, -62, 10], [34, -64, 10], [-12, -50, 4]].forEach(([x, z, y], i) => { const h = house(500 + i, {w: 11, d: 9, storeys: 1, tier: 'mid', thatched: i % 3 === 0}); h.position.set(x, y, z); h.rotation.y = Math.PI * (i % 2 ? .02 : -.04); mid.add(h); });
  // Castle on the top terrace: the south wall (the dragon's perch), corner towers, keep with a flag.
  const cw = wallRun(46, 10, 3); cw.position.set(0, 18, -74); hero.add(cw);
  for (const x of [-25, 25]) { const t = tower(5, 18); t.position.set(x, 18, -74); hero.add(t); }
  for (const sx of [-1, 1]) { const w = wallRun(30, 10, 3, {cast: false}); w.rotation.y = Math.PI / 2; w.position.set(sx * 25, 18, -90); mid.add(w); }
  mid.add(P.block([18, 26, 16], {at: [0, 18 + 13, -92], pattern: 'brick', color: C.stone}));
  mid.add(P.block([19.5, 1.6, 17.5], {at: [0, 18 + 26.8, -92], color: C.stoneDk}));
  for (const sx of [-1, 1]) { const t = tower(3, 30); t.position.set(sx * 9, 18, -84); mid.add(t); }
  const kf = A.flag({w: 4, h: 2.6, color: C.banner, pole: 8, seed: 51}); kf.object.position.set(0, 46, -92); movers.push(kf); hero.add(kf.object);
  B.anchor(anchors, 'dragonWall', [0, 28, -74], 0, {camera: {position: [5, 6, S[2] + 20], target: [0, 26, -72], fov: 52}});

  // ---- Far tier: hills ring and forest (silhouettes, no shadows) ----------------------------------
  for (const p of B.ringOf(18, 210, {jitter: .3, seed: 61})) far.add(P.block([70, 18 + (p.i % 4) * 7, 40], {at: [p.at[0], 4, p.at[2]], rot: [0, p.rotY * 57.3, 0], color: p.i % 2 ? '#78b866' : '#6aa95c', round: 6}));
  for (const p of B.scatter({x0: -120, x1: 120, z0: -150, z1: 150}, 71, .12, (x, z) => (Math.abs(x) < 82 && z < 36 && z > -110) || (Math.abs(x) < 34 && z > 36 && z < 108))) { const t = tree(p.i + 900, Math.hypot(p.at[0], p.at[2] - 60) < 60 ? 'mid' : 'far'); t.position.set(...p.at); t.rotation.y = p.rotY; t.scale.setScalar(p.s); far.add(t); }
  B.anchor(anchors, 'whole', [0, 0, 20], Math.PI, {camera: {position: [95, 72, 150], target: [0, 8, 6], fov: 48}});

  // ---- assemble: merge static geometry per 40-unit district and material ---------------------------
  // Chimney smoke at the chimneys' world positions (houses are placed by now).
  hero.updateMatrixWorld(true);
  chim.forEach(([g, local], i) => { const w = g.localToWorld(new T.Vector3(...local)); const sm = A.smoke({at: w.toArray(), seed: 80 + i}); movers.push(sm); sm.free = true; });
  const world = new T.Group(); world.name = 'world';
  for (const g of [hero, mid, far]) world.add(B.mergeByDistrict(g, 40));
  for (const m of movers) if (m.free) world.add(m.object);
  scene.add(world);
  return {anchors, update(t) { for (const m of movers) m.update(t); }};
}
