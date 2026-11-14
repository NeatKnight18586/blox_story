// Look test (Amendment A4, Session 8): the `ragdoll` hill street — the second episode world, built so it carries over.
// Locations: one steep main street climbing north from the bottom plaza (catch-net on its south edge, a sheer cliff
//   under it, the river far below), terraced houses on pads either side (ramps, never stairs; doorknobs and hooks at
//   standing height = clue 2), a black cable on short posts running up the street (clue 3) to the summit, where a
//   glowing cog sits inside a ring of cloud (clue 1). Alpine terrain: snow ridges east, west and north.
// Unique landmark: the summit cog in its cloud ring, visible from the bottom of the street.
// Ground plan: street centre x = 0 from z = +80 (plaza) to z = −95 (summit); grade 0.3 (≈ 52 units of climb); cliff
//   at z ≈ 88; valley floor y = −44 with the river along z = 150. Palette: cream/peach plaster, red-brown roof tiles,
//   timber, grey rock + snow; story accents: the cable (black) and the cog (cyan glow).
// Borrowed principle: Mediterranean hill towns stack every house on its own level, so a single street reads as a
//   staircase of roofs from below.
// Two kits from one layout (spec.kit): 'old' = v2 kit (stepped plates + Phong + block clouds), 'new' = A4 (alpine terrain,
// Standard hero materials, conifers, river, v3 day sky, height fog, light shafts).
import * as T from 'three';

export const LOOK = spec => spec.kit === 'old' ? null : {fog: {color: '#c9d9ea', near: 120, far: 520, height: {base: -40, falloff: 16, amount: .38, near: 50}}, envPreset: 'day', envIntensity: .55, cloudCover: .8};
export const LAYER = {street: .12, plaza: .14};
const PLAZA = {z0: 52, z1: 84}, VALLEY_Y = -44, SUMMIT = [0, -98];
// the town hill: one broad cosine mound peaking at the summit (≈ 0.3 grade along the street), plus far snow ridges
const HILL = [{type: 'hill', at: [0, -130], r: 230, h: 64}, {type: 'noise', amp: 1.4, scale: 30, octaves: 3},
  {type: 'ridge', from: [-330, -120], to: [-260, -420], w: 110, h: 120}, {type: 'ridge', from: [320, -60], to: [250, -420], w: 120, h: 135}, {type: 'ridge', from: [-300, -430], to: [320, -400], w: 120, h: 150},
  {type: 'hill', at: [-120, -70], r: 70, h: 18}, {type: 'hill', at: [120, -40], r: 60, h: 14}];
const hillAt = z => { const d = Math.abs(z + 130); return d >= 230 ? 0 : 64 * (.5 + .5 * Math.cos(Math.PI * d / 230)); }, BASE = -hillAt(68);   // plaza (z 68) sits at y 0
const slopeY = z => hillAt(z) + BASE;
const OLD = {asphalt: ['cobble'], concrete: ['plastic'], plaster: ['plastic'], roofTile: ['slate'], cliff: ['rock'], bark: ['woodPlanks']};

export function build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec}) {
  const NEW = spec.kit !== 'old', R = B.rng(23), anchors = {}, movers = [], hero = new T.Group(); hero.name = 'hero';
  const mt = (pattern, color, o = {}) => NEW ? M.std(pattern, color, o) : M.mat(OLD[pattern]?.[0] ?? pattern, color, o);
  const add = o => { hero.add(o); return o; };
  // terraced house lots: both sides of the street every 17 units
  const lots = []; for (let z = 40; z >= -76; z -= 17) for (const s of [-1, 1]) lots.push({x: s * (14 + R() * 2), z: z + (s > 0 ? 6 : 0), s, i: lots.length});
  for (const l of lots) l.y = Math.round(slopeY(l.z) * 2) / 2 + .4;
  let groundY;
  if (NEW) {
    const bio = BI.biome('alpine', {terrain: {highY: 82, highSoft: 10}});
    const controls = [...HILL,
      {type: 'plateau', at: SUMMIT, r: 12, h: slopeY(SUMMIT[1]) + 8, edge: 6},
      ...lots.map(l => ({type: 'pad', x0: l.x - 6.5, x1: l.x + 6.5, z0: l.z - 6, z1: l.z + 6, y: l.y - .4, blend: 4})),
      {type: 'pad', x0: -600, x1: 600, z0: 94, z1: 700, y: VALLEY_Y, blend: 6}, {type: 'pad', x0: -30, x1: 30, z0: PLAZA.z0, z1: PLAZA.z1, y: 0, blend: 3},
      {type: 'river', points: [[-400, 150], [-100, 156], [100, 146], [400, 152]], w: 16, depth: 3, bank: 8}];
    const height = TR.heightFn({seed: 17, base: BASE, controls}); groundY = height;

    scene.add(TR.buildTerrain({height, size: 720, chunk: 30, fine: 1.5, fullR: 60, focus: [[0, 60], [0, 0], [0, -60], [3, 96], [-5, 30]], centre: [0, -20], material: M.splatMaterial(bio.terrain.layers, {splat: bio.terrain, wetY: VALLEY_Y - 1.4}), splat: bio.terrain}));   // A5: per-pixel blend, 1.5-unit cells
    const wat = W.water({height, x0: -300, x1: 300, z0: 128, z1: 172, y: VALLEY_Y - 1.4, ...bio.water, sky: '#cfe4f5', flow: [1, .1], speed: .08, envMap: look.envMap?.()});
    scene.add(wat.mesh); movers.push(wat);
    const avoid = (x, z) => (Math.abs(x) < 24 && z > -110 && z < 92) || lots.some(l => Math.abs(x - l.x) < 8 && Math.abs(z - l.z) < 8);
    const veg = V.vegetation({height, veg: {...bio.vegetation, treeDensity: .55}, area: {x0: -200, x1: 200, z0: -220, z1: 200}, seed: 4, avoid, focus: [[0, 70], [0, 20]], nearR: 26, waterY: VALLEY_Y - 1});
    scene.add(veg.group); movers.push(veg);
    look.addShaft?.({at: [-30, 10, -40], height: 90, width: 12, opacity: .12, tilt: [0, .35]}); look.addShaft?.({at: [26, 18, -70], height: 90, width: 9, opacity: .1, tilt: [0, .35]});
  } else {
    groundY = (x, z) => z > 92 ? VALLEY_Y : z >= PLAZA.z0 ? 0 : Math.round(slopeY(z) / 3) * 3;
    for (let z = PLAZA.z0; z > -110; z -= 10) scene.add(P.plate(320, 10, {at: [0, groundY(0, z - 5) - .2, z - 5], pattern: 'grass', color: '#7fa35a'}));
    scene.add(P.plate(320, 40, {at: [0, -.2, 70], pattern: 'grass', color: '#7fa35a'}), P.plate(600, 500, {at: [0, VALLEY_Y - .2, 340], pattern: 'grass', color: '#6f9450'}));
    scene.add(P.plate(600, 30, {at: [0, VALLEY_Y + .05, 150], pattern: 'water', color: '#4f8fae', thick: .2}));
    for (let i = 0; i < 40; i++) { const x = (R() < .5 ? -1 : 1) * (30 + R() * 90), z = -100 + R() * 180, t = PR.smallProp('tree', i); t.position.set(x, groundY(x, z), z); scene.add(t); }
  }
  // street ribbon + bottom plaza
  const street = new T.CatmullRomCurve3([[0, 0, 84], [0, 0, 40], [2, 0, 0], [-2, 0, -40], [0, 0, -86]].map(p => new T.Vector3(...p)));
  scene.add(B.ribbon(street, 10, (x, z) => groundY(x, z) + LAYER.street, {material: mt('cobble', '#b4aa9a'), tile: 4, step: .7, thick: 3}));
  // ---- prefabs -------------------------------------------------------------------------------------------
  const win = new T.MeshPhongMaterial({color: '#7fb0d8', emissive: '#ffc46b', emissiveIntensity: 0, shininess: 90}); win.userData = {window: 1};
  function house(l) {
    const r = B.rng(100 + l.i), g = new T.Group(), w = 9 + r() * 3, d = 8, h = 6 + (r() < .4 ? 4 : 0), wall = ['#efe0c4', '#f2d2b6', '#e9e2d0', '#f0d9a8'][l.i % 4];
    g.add(P.block([w + .6, 1, d + .6], {at: [0, .5, 0], mat: mt('cliff', '#9a948a'), cast: true}));
    g.add(P.block([w, h, d], {at: [0, 1 + h / 2, 0], mat: mt('plaster', wall), cast: true}));
    for (const sx of [-1, 1]) g.add(P.block([.5, h, .5], {at: [sx * w / 2, 1 + h / 2, d / 2], mat: mt('woodPlanks', '#7a5233')}));
    const roof = P.gableRoof(w, d, 2.6 + r(), {mat: mt('roofTile', ['#b0553a', '#9c4a36', '#c0683f'][l.i % 3]), cast: true}); roof.position.y = 1 + h; g.add(roof);
    g.add(P.block([2.4, 4.4, .25], {at: [-w / 4, 3.2, d / 2 + .08], mat: mt('woodPlanks', '#6a4430')}));
    g.add(P.sphere(.16, {at: [-w / 4 + .8, 3.6, d / 2 + .3], mat: mt('metal', '#d9b24a')}));                                  // doorknob at standing height
    for (const k of [0, 1]) { const m = new T.Mesh(new T.BoxGeometry(1.6, 1.6, .2), win); m.position.set(w / 4, 3.6 + k * 4.5, d / 2 + .1); if (k && h < 8) continue; g.add(m); }
    const ramp = P.wedge(2.6, 1.2, 3.4, {mat: mt('concrete', '#b9b2a6')}); ramp.position.set(-w / 4, .6, d / 2 + 1.7); ramp.rotation.y = Math.PI; g.add(ramp);   // ramps, never stairs
    g.position.set(l.x, l.y - .4, l.z); g.rotation.y = l.s > 0 ? -Math.PI / 2 : Math.PI / 2; return g;
  }
  function net() {
    const g = new T.Group(), cm = mt('metal', '#3a3d44'), rope = new T.MeshPhongMaterial({color: '#e8dcc0'});
    for (const x of [-26, -13, 0, 13, 26]) g.add(P.cylinder(.35, 9, {at: [x, 4.5, 0], seg: 6, mat: cm}));
    for (let k = 0; k < 7; k++) { const y = 1.2 + k * 1.2; const sag = new T.CatmullRomCurve3([[-26, y, 0], [0, y - .8, 1.2], [26, y, 0]].map(p => new T.Vector3(...p))); g.add(new T.Mesh(new T.TubeGeometry(sag, 24, .07, 4), rope)); }
    for (let x = -26; x <= 26; x += 2.6) g.add(new T.Mesh(new T.CylinderGeometry(.06, .06, 8.4, 4), rope).translateX(x).translateY(5).translateZ(.6 * Math.cos(x / 26 * 1.57)));
    return g;
  }
  function cog() {
    const s = new T.Shape(), n = 10; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 4 : 5.2, a2 = a + Math.PI / (n * 2); s.lineTo(Math.cos(a) * r, Math.sin(a) * r); s.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); }
    const hole = new T.Path(); hole.absarc(0, 0, 1.6, 0, Math.PI * 2, true); s.holes.push(hole);
    const m = new T.Mesh(new T.ExtrudeGeometry(s, {depth: .8, bevelEnabled: false}), new T.MeshPhongMaterial({color: '#7fe8ff', emissive: '#3fd6ff', emissiveIntensity: 1.3})); m.name = 'cog'; return m;
  }
  // ---- placement -----------------------------------------------------------------------------------------
  for (const l of lots) add(house(l));
  const nt = net(); nt.position.set(0, groundY(0, PLAZA.z1), PLAZA.z1 - 1); add(nt);
  const sy = groundY(...SUMMIT); const cg = cog(); cg.position.set(SUMMIT[0], sy + 10, SUMMIT[1]); add(cg); movers.push(A.spinner(cg, {axis: 'z', speed: .25}));
  add(P.block([6, 6, 6], {at: [SUMMIT[0], sy + 3, SUMMIT[1]], mat: mt('cliff', '#8f8a84'), cast: true}));
  const cablePts = []; for (let z = PLAZA.z1 - 6; z >= SUMMIT[1] + 4; z -= 6) { const x = 6.2 + Math.sin(z * .05) * .6; cablePts.push(new T.Vector3(x, groundY(x, z) + 1.1, z)); }
  add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cablePts), 160, .22, 5), new T.MeshPhongMaterial({color: '#141418', shininess: 60})));
  for (let k = 0; k < cablePts.length; k += 2) add(P.cylinder(.12, 1.1, {at: [cablePts[k].x, cablePts[k].y - .55, cablePts[k].z], seg: 5, mat: mt('metal', '#3a3d44')}));
  const puff = new T.MeshLambertMaterial({color: '#ffffff', transparent: true, opacity: .92, emissive: '#cfd8e6', emissiveIntensity: .25});
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, m = new T.Mesh(new T.IcosahedronGeometry(6 + R() * 5, 1), puff); m.scale.set(1.5, .55, 1); m.position.set(SUMMIT[0] + Math.sin(a) * 18, sy + 5 + R() * 9, SUMMIT[1] + Math.cos(a) * 14); hero.add(m); }
  for (let i = 0; i < 8; i++) { const l = lots[i * 2 % lots.length], b = PR.smallProp(['barrel', 'crate', 'bench', 'fence'][i % 4], i); b.position.set(l.x - l.s * 6.5, l.y - .4, l.z + 4); add(b); }
  scene.add(hero);
  movers.push(A.birds({centre: [0, 70, -30], n: 5, r: 30, seed: 5}), A.flag({w: 3, h: 2, color: '#e2483d', pole: 7, seed: 2}));
  const fl = movers[movers.length - 1]; (fl.group ?? fl.object)?.position.set(-8, groundY(-8, 70), 70);
  for (const m of movers) if (m.group || m.object) scene.add(m.group ?? m.object);
  anchors.bottom = {position: [0, 0, 70], camera: {position: [3, 7, 96], target: [0, 18, 20], fov: 52}};
  anchors.street = {position: [0, 0, 10], camera: {position: [-5, slopeY(30) + 4.2, 30], target: [2, slopeY(-10) + 4, -10], fov: 50}};
  anchors.wide = {position: [0, 0, 0], camera: {position: [150, 40, 170], target: [0, 4, 10], fov: 46}};
  return {anchors, groundY, update(t) { for (const m of movers) m.update?.(t); }};
}
