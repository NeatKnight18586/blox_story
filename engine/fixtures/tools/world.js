// Tools demo (Amendment A4, Session 8): a meadow valley whose far hillside is the landform giant (test rig for card 11's
// mountain). A small stone square at the valley floor holds the crowd; a path runs from the square toward the giant.
// Palette: meadow greens, warm grey rock, cream stone square; accents = the giant's amber eye and the hero's trail (cyan).
// Used by engine/fixtures/tools/demo.json: drone → snap → heroLow → tiltUp, rain + lightning, a trail, a wrist stat, 40 crowd.
import * as T from 'three';
import {landformRig, driveLandform} from '../../../parts/landform.js';

export const LOOK = {fog: {color: '#b9c9d6', near: 110, far: 460, height: {base: 0, falloff: 10, amount: .3, near: 40}}, envPreset: 'storm', envIntensity: .45, cloudCover: 1};
export const GIANT = [0, -95];
export function build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec}) {
  const bio = BI.biome('meadow'), anchors = {}, movers = [];
  const controls = [{type: 'noise', amp: 1.2, scale: 30}, {type: 'ridge', from: [-260, -150], to: [260, -140], w: 80, h: 30}, {type: 'hill', at: [-110, 0], r: 80, h: 22}, {type: 'hill', at: [120, 20], r: 80, h: 18},
    {type: 'pad', x0: -14, x1: 14, z0: 10, z1: 34, y: 0, blend: 8}, {type: 'river', points: [[-200, 70], [0, 62], [200, 74]], w: 12, depth: 2.4, bank: 6}];
  const height = TR.heightFn({seed: 31, controls});
  const mat = M.splatMaterial(bio.terrain.layers);   // per-vertex: the landform giant keeps its Session 8 material (out of scope in 8b)
  scene.add(TR.buildTerrain({height, size: 570, chunk: 30, fine: 1.5, fullR: 60, focus: [[0, 50], [4, 43], [10, 23], [8, 58]], material: M.splatMaterial(bio.terrain.layers, {splat: bio.terrain, wetY: -1.2}), splat: bio.terrain}));   // A5: per-pixel blend
  const wat = W.water({height, x0: -220, x1: 220, z0: 52, z1: 84, y: -1.2, ...bio.water, sky: '#b9c9d6', flow: [1, 0], speed: .06, envMap: look.envMap?.()}); scene.add(wat.mesh); movers.push(wat);
  const veg = V.vegetation({height, veg: bio.vegetation, area: {x0: -180, x1: 180, z0: -160, z1: 140}, seed: 6, focus: [[0, 26]], nearR: 22, waterY: -1.2,
    avoid: (x, z) => (Math.abs(x) < 20 && z > 0 && z < 40) || Math.hypot(x - GIANT[0], (z - GIANT[1]) * .8) < 90 || (Math.abs(x) < 4 && z < 10 && z > -20)});
  scene.add(veg.group); movers.push(veg);
  // the giant: same splat material as the ground, half sunk into the hillside
  const giant = landformRig({material: mat, splat: {...bio.terrain, rockSlope: .62}, groundY: height(...GIANT) - 8, scale: 1.6});
  giant.root.position.set(GIANT[0], height(...GIANT) - 8, GIANT[1]); scene.add(giant.root);
  // stone square + path
  scene.add(P.cylinder(13, .4, {seg: 32, mat: M.std('cobble', '#c9c0b0'), at: [0, height(0, 22) + .02, 22]}));
  scene.add(B.ribbon(new T.CatmullRomCurve3([[0, 0, 10], [1, 0, -4], [-1, 0, -14]].map(p => new T.Vector3(...p))), 3.5, (x, z) => height(x, z) + .1, {material: M.std('dirt', '#a88c66'), tile: 4}));
  for (const [x, z, k] of [[-9, 30, 'barrel'], [-10.5, 28.5, 'crate'], [-8.6, 27.4, 'sack'], [9, 35.5, 'bench'], [10, 14, 'lantern']]) { const o = PR.smallProp(k, 3); o.position.set(x, height(x, z), z); scene.add(o); }
  movers.push(A.birds({centre: [0, 50, -20], n: 6, r: 40, seed: 2}));
  for (const m of movers) if (m.group || m.object) scene.add(m.group ?? m.object);
  anchors.square = {position: [0, 0, 22], camera: {position: [0, 9, 60], target: [0, 4, 0], fov: 50}};
  anchors.giant = {position: [GIANT[0], height(...GIANT), GIANT[1]], camera: {position: [30, 30, 50], target: [0, 18, -60], fov: 50}};
  const lkeys = spec.landform?.keys ?? [[0, 'sleep']];
  return {anchors, groundY: height, giant, update(t) { for (const m of movers) m.update?.(t); driveLandform(giant, lkeys, t); }};
}
