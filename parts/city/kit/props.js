// parts/city/kit/props.js — City kit street props (Phase 1B), data in → one merged group per material.
//   cityProps(list, {name}) → Group; list = [{kind, at: [x, y, z], yaw, seed, colors}]. Kinds: lamp, bench, cafe (table + 2 chairs +
//   umbrella), planter, bollard, fountain ({r}). Each is ≤ 400 tris (fountain ≤ 1.6k); everything static is baked by the world.
import * as T from 'three';
import {bins, bevel, pbox} from './building.js';
import {kitMat, liveMat, tileOf} from './mats.js';

const cyl = (rt, rb, h, x, y, z, seg = 8) => new T.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z);
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
};
export const PROP_KINDS = Object.keys(PROPS);
// list → merged group (static parts baked; glow/water live).
export function cityProps(list, {name = 'cityProps'} = {}) {
  const B = bins();
  for (const p of list) {
    const local = bins(), A = local.add; PROPS[p.kind](A, p);
    const g = local.build('tmp'); g.rotation.y = p.yaw ?? 0; g.position.set(...p.at); g.updateMatrixWorld(true);
    for (const m of g.children) B.add(m.material, m.geometry.clone().applyMatrix4(m.matrixWorld));
  }
  const out = B.build(name); out.traverse(o => { if (o.isMesh && o.material.userData?.live) o.userData.live = true; }); return out;
}
