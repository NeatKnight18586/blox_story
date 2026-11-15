// engine/fixtures/v4look/world.js — format v4 Phase 2 test scene: a street, two houses, a glass tower, a lamp post and a
// small plaza pool. One world, two pipelines: `spec.look4` (comedy | mystery) builds it with the v4 surfaces (parts/
// materials4.js), baked static light and the v4 look; without it (today) it builds with today's M.std materials and the
// v3 look, so v2:bench / render compare like for like. Static geometry is tessellated (~1 unit) so the per-vertex bake
// carries shadows and occlusion.
import * as T from 'three';

export const LAYER = {road: .02, walk: .12, plaza: .14, pool: .1};
export const groundY = () => 0;
export const LOOK = spec => ({fog: {color: spec.look === 'night' ? '#141b2a' : '#cfe3f5', near: 60, far: 260, height: {amount: 0}}, envPreset: spec.look === 'night' ? 'night' : 'day', envIntensity: .45, cloudCover: .6});

const seg = v => Math.max(1, Math.ceil(v / 1));
const box = (w, h, d, mat, at, {live = false} = {}) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d, seg(w), seg(h), seg(d)), mat); m.position.set(...at); m.castShadow = m.receiveShadow = true; if (live) m.userData.live = true; return m; };
const plane = (w, d, mat, at, rep) => { const g = new T.PlaneGeometry(w, d, seg(w), seg(d)); g.rotateX(-Math.PI / 2); const m = new T.Mesh(g, mat); m.position.set(...at); m.receiveShadow = true; return m; };
// gable roof prism (two slopes + two gable ends), tessellated
function roof(w, d, h, mat, at) {
  const g = new T.BufferGeometry(), P = [], U = [], s = 6;
  const quad = (a, b, c, e, uw, uh) => { for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) { const p = (u, v) => [0, 1, 2].map(k => a[k] + (b[k] - a[k]) * u + (e[k] - a[k]) * v);
      const u0 = i / s, u1 = (i + 1) / s, v0 = j / s, v1 = (j + 1) / s; for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]]) { P.push(...p(u, v)); U.push(u * uw, v * uh); } } };
  const x = w / 2 + .3, z = d / 2 + .3, sl = Math.hypot(x, h);
  quad([-x, 0, z], [-x, 0, -z], null, [0, h, z], d / 2, sl / 2); quad([x, 0, -z], [x, 0, z], null, [0, h, -z], d / 2, sl / 2);
  const tri = (a, b, c) => { P.push(...a, ...b, ...c); U.push(0, 0, 1, 0, .5, 1); };
  tri([-x, 0, z], [x, 0, z], [0, h, z]); tri([x, 0, -z], [-x, 0, -z], [0, h, -z]);
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.computeVertexNormals();
  const m = new T.Mesh(g, mat); m.position.set(...at); m.castShadow = m.receiveShadow = true; return m;
}

export function build(scene, {M, M4, look4, spec, PR}) {
  const v4 = !!(spec.look4 && M4), night = v4 ? spec.look4 === 'mystery' : spec.look === 'night';
  const S = v4 ? {road: M4.mat4('asphaltLane', '#ffffff', {repeat: [1, 8]}), walk: M4.mat4('polishedFloor', '#d8d2c8', {repeat: [2, 20]}), plaza: M4.mat4('polishedFloor', '#ffffff', {repeat: [5, 5]}),
      plasterA: M4.mat4('plaster', '#f3e2c4', {repeat: [2, 2]}), plasterB: M4.mat4('plaster', '#cfe0d8', {repeat: [2, 2]}), timber: M4.mat4('timber', '#ffffff', {repeat: [1, 1]}),
      tile: M4.mat4('roofTile', '#ffffff', {repeat: [2, 2]}), glass: M4.mat4('glassPanel', '#ffffff', {repeat: [2, 6], live: true}), metal: M4.mat4('polishedFloor', '#3a3f48'), ground: M4.mat4('plaster', '#8fa37a', {repeat: [10, 10]})}
    : {road: M.std('asphalt', '#55585e'), walk: M.std('concrete', '#c9c3b8'), plaza: M.std('concrete', '#e2ddd3'), plasterA: M.std('plaster', '#f3e2c4'), plasterB: M.std('plaster', '#cfe0d8'),
      timber: M.std('woodPlanks', '#8a5a36'), tile: M.std('roofTile', '#b8573a'), glass: M.std('glass', '#9fc4e8'), metal: M.std('metal', '#3a3f48'), ground: M.std('grass', '#7fa35e')};
  if (v4) { const P = look4.preset.v4.glass; S.glass.color.set(P.color); S.glass.roughness = .05; S.glass.metalness = .2; S.glass.envMapIntensity = P.reflect * 2; }
  const g = new T.Group(); g.name = 'v4look';
  g.add(plane(120, 120, S.ground, [0, -.01, 0]));
  g.add(plane(10, 90, S.road, [0, LAYER.road, 0]));
  for (const x of [-7.5, 7.5]) g.add(box(5, .24, 90, S.walk, [x, LAYER.walk - .12 + .12, 0]));
  g.add(plane(16, 16, S.plaza, [-19, LAYER.plaza, -6]));
  // two houses (east side), plaster walls, timber trims, tiled gable roofs, windows
  const winMat = new T.MeshBasicMaterial({color: night ? '#ffc874' : '#2c3644'}); winMat.userData.window = 1;
  const houses = [[14.5, 6, '#plA', S.plasterA], [14.5, -10, '#plB', S.plasterB]], lights = [], haloes = [];
  for (const [x, z, , mat] of houses) {
    g.add(box(9, 6, 9, mat, [x, 3, z]));
    g.add(roof(9, 9, 3.4, S.tile, [x, 6, z]));
    for (const [dz, dy] of [[-2.2, 1.8], [2.2, 1.8], [-2.2, 4.3], [2.2, 4.3]]) {
      const w = box(.12, 1.3, 1.3, winMat, [x - 4.54, dy, z + dz], {live: true}); w.castShadow = false; g.add(w);
      g.add(box(.18, .16, 1.6, S.timber, [x - 4.56, dy - .74, z + dz]));
      if (night) { lights.push({p: [x - 5.2, dy, z + dz], color: [1, .78, .45], i: 1.6, range: 6}); if (v4) haloes.push(look4.halo([x - 4.7, dy, z + dz], '#ffc874', 2.2, .55)); }
    }
    g.add(box(.2, 2.4, 1.4, S.timber, [x - 4.56, 1.2, z + (z > 0 ? 0 : 0) + 0]));   // door
  }
  // glass tower (west, behind the plaza)
  g.add(box(10, 34, 10, S.glass, [-21, 17, -24], {live: v4}));
  g.add(box(10.6, .6, 10.6, S.metal, [-21, 34.3, -24]));
  // lamp post on the west sidewalk
  g.add(box(.25, 5, .25, S.metal, [-6.2, 2.5, 2]));
  g.add(box(1.2, .2, .25, S.metal, [-5.7, 5, 2]));
  const lampMat = new T.MeshBasicMaterial({color: night ? '#ffe1a8' : '#f4f1e8'}), lamp = box(.6, .35, .6, lampMat, [-5.2, 4.8, 2], {live: true}); lamp.castShadow = false; g.add(lamp);
  if (night) { lights.push({p: [-5.2, 4.5, 2], color: [1, .85, .6], i: 3.2, range: 11}); if (v4) haloes.push(look4.halo([-5.2, 4.75, 2], '#ffd9a0', 3.2, .8)); }
  for (const h of haloes) scene.add(h);
  // plaza pool
  const movers = [];
  g.add(box(6.6, .5, 6.6, S.walk, [-19, .25, -6]));
  if (v4) { const w = look4.water4({w: 6, d: 6, at: [-19, .52, -6], color: night ? '#0d2633' : '#1d5a70'}); scene.add(w.mesh); movers.push(w); }
  else { const w = new T.Mesh(new T.PlaneGeometry(6, 6), M.std('water', '#2d7f9a')); w.rotation.x = -Math.PI / 2; w.position.set(-19, .52, -6); scene.add(w); }
  scene.add(g);
  // mystery: one real-time practical for the actors under the lamp (static light from it is baked)
  if (night) { const pl = new T.PointLight('#ffd9a0', 6, 12, 2); pl.position.set(-5.2, 4.4, 2); scene.add(pl); }
  const anchors = {street: {position: [0, 0, 0], camera: {position: [3, 3, 18], target: [0, 2.5, 0], fov: 45}}};
  return {anchors, groundY, lights, update(t) { for (const m of movers) m.update(t); }};
}
